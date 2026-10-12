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
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), o.hetGio || 20000);
  try {
    const gen = { temperature: o.nhiet != null ? o.nhiet : 1, maxOutputTokens: o.json ? 2000 : 900 };
    if (o.json) gen.responseMimeType = 'application/json';
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: VAI + (o.them ? '\n' + o.them : '') }] },
        contents: [{ role: 'user', parts: [{ text: yeuCau }] }],
        generationConfig: gen,
      }),
    });
    if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + (await r.text()).slice(0, 200));
    const j = await r.json();
    const p = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    const s = p ? p.filter((x) => !x.thought).map((x) => x.text || '').join('').trim() : '';
    if (!s) throw new Error('AI trả rỗng');
    if (!o.json) return s.replace(/\*\*/g, '');
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI không trả JSON');
    return JSON.parse(m[0]);
  } finally { clearTimeout(t); }
}
module.exports = { vietAI };
