/* Gọi Gemini cho Bot em gái DBV (khoá GEMINI_GT_API_KEY, thiếu thì dùng chung). */
'use strict';
const VAI = 'Bạn là "' + (process.env.ZALO_GT_BOT_NAME || 'Bot em gái DBV') + '" — cô em út lém lỉnh, vui tính trong nhóm Zalo ' +
  'của cán bộ Chi nhánh DBV Thành Đô (Tập đoàn Bảo hiểm DBV). Xưng "em", gọi "anh/chị" hoặc "cả nhà". Tiếng Việt tự nhiên, trẻ trung, ' +
  '2–4 emoji. KHÔNG dùng markdown (**, #, bảng). Không chính trị, tôn giáo, vùng miền; không nhắc tuổi, lương, ngoại hình, chuyện tình cảm; ' +
  'không nói xấu ai. Không dùng "số 1", "tốt nhất".';

async function vietAI(yeuCau, o) {
  o = o || {};
  const key = process.env.GEMINI_GT_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('thiếu khoá Gemini');
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), o.hetGio || 45000);
  try {
    /* Gemini 3 mặc định BẬT "suy nghĩ" và token suy nghĩ tính chung vào
       maxOutputTokens — ngân sách nhỏ là nghĩ hết, trả về RỖNG (lỗi đã gặp:
       đố vui 15:00 không đăng). Nên: hạ suy nghĩ xuống "low" + nới ngân sách. */
    const body = (nghi) => {
      const gen = { temperature: o.nhiet != null ? o.nhiet : 1, maxOutputTokens: o.json ? 6000 : 3000 };
      if (o.json) gen.responseMimeType = 'application/json';
      if (nghi) gen.thinkingConfig = { thinkingLevel: 'low' };
      return JSON.stringify({
        system_instruction: { parts: [{ text: VAI + (o.them ? '\n' + o.them : '') }] },
        contents: [{ role: 'user', parts: [{ text: yeuCau }] }],
        generationConfig: gen,
      });
    };
    /* Google hay báo 503 "high demand" / 429 lúc đông. Thử lại sau vài giây,
       vẫn lỗi thì chuyển sang model dự phòng (GEMINI_GT_MODEL_DU_PHONG). */
    const h = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
    const cacModel = [model, process.env.GEMINI_GT_MODEL_DU_PHONG || 'gemini-3.5-flash-lite'].filter((m, i, a) => m && a.indexOf(m) === i);
    const ngu = (ms) => new Promise((ok) => setTimeout(ok, ms));
    let r = null, loiCuoi = '';
    vong: for (const md of cacModel) {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(md) + ':generateContent';
      for (let lan = 0; lan < 2; lan++) {
        r = await fetch(url, { method: 'POST', signal: ctrl.signal, headers: h, body: body(true) });
        if (r.status === 400) {   // model cũ không hiểu thinkingLevel → gọi lại không kèm
          const t1 = await r.text();
          if (!/thinking/i.test(t1)) throw new Error('Gemini 400: ' + t1.slice(0, 200));
          r = await fetch(url, { method: 'POST', signal: ctrl.signal, headers: h, body: body(false) });
        }
        if (r.ok) break vong;
        loiCuoi = 'Gemini ' + r.status + ' (' + md + '): ' + (await r.text()).slice(0, 150);
        if (![429, 500, 502, 503, 504].includes(r.status)) throw new Error(loiCuoi);
        console.warn('gt-ai: ' + loiCuoi + ' → thử lại');
        await ngu(lan === 0 ? 2000 : 0);
      }
    }
    if (!r || !r.ok) throw new Error('Google AI đang quá tải, thử lại sau ít phút. (' + loiCuoi.slice(0, 80) + ')');
    const j = await r.json();
    const c = j.candidates && j.candidates[0];
    const p = c && c.content && c.content.parts;
    const s = p ? p.filter((x) => !x.thought).map((x) => x.text || '').join('').trim() : '';
    if (!s) throw new Error('AI trả rỗng (finishReason: ' + (c && c.finishReason) + ')');
    if (!o.json) return s.replace(/\*\*/g, '');
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI không trả JSON');
    return JSON.parse(m[0]);
  } finally { clearTimeout(t); }
}
module.exports = { vietAI };
