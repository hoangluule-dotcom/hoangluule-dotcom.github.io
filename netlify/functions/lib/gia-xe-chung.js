/* DBV247 — BỘ TRA GIÁ TRỊ XE DÙNG CHUNG
   ===========================================================================
   Một nguồn giá duy nhất cho: chatbot web (chat.js), 2 bot Zalo, và nút
   "Tra giá xe qua Google" trên trang tinh-phi-vat-chat-oto.html
   (gia-xe-cong-khai.js). Cùng xe, cùng năm → cùng con số ở mọi nơi.

   Thứ tự lấy giá cho một cặp (hãng, dòng, năm):
     1. Kết quả tra Google (Gemini + Google Search) còn hạn 48 giờ trong
        Blobs "dbv247-gia-xe-cong-khai" — dùng chung bộ nhớ với trang web.
     2. Chưa có → tra mới:
          - nơi chờ được (bot Zalo chạy nền): tra ngay;
          - nơi phải trả lời dưới 10 giây (chatbot web): KHÔNG chờ, dùng CSDL
            ngay lần này và gọi hàm nền gia-xe-lam-moi-background tra hộ,
            lần hỏi sau đã có giá mới.
     3. Kiểm dịch trước khi dùng: giá Google phải nằm trong 60%–140% giá CSDL
        cùng năm và không vượt 110% giá niêm yết. Lệch thì bỏ, dùng CSDL.
     4. Không có giá Google hợp lệ → CSDL gia-xe-db.json như trước.

   Google trả MỘT mức giá giữa cho cả năm (không theo phiên bản). Để vẫn báo
   được theo phiên bản, lấy tỷ lệ (giá Google / giá giữa CSDL năm đó) nhân
   vào giá từng phiên bản trong CSDL — giữ đúng chênh lệch giữa các bản.

   Chi phí: mỗi lượt tra mới là một lượt tìm kiếm Google qua Gemini. Trần
   riêng cho bot/hàm nền: GIA_XE_NOI_BO_MAX_PER_DAY (mặc định 150/ngày).
   Trang web vẫn giữ trần theo IP của gia-xe-cong-khai.js.
*/
'use strict';

const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const SITE_ID = 'df7ffacd-8e52-4769-b95b-23c978b36e29';
const STORE_NAME = 'dbv247-gia-xe-cong-khai';
const CACHE_GIO = 48;
const KHOA_DEM = 'rate-noi-bo';

/* ── Kho lưu ─────────────────────────────────────────────────────────────── */
function openStore() {
  try { return getStore({ name: STORE_NAME, consistency: 'strong' }); }
  catch (err) {
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!token) return null;
    try { return getStore({ name: STORE_NAME, siteID: process.env.SITE_ID || SITE_ID, token, consistency: 'strong' }); }
    catch (e) { return null; }
  }
}
function khoaCache(hang, dong, nam) {
  return `${hang}|${dong}|${nam}`.toLowerCase().replace(/[^a-z0-9|._-]/g, '_');
}
function conHan(b, gio) {
  return !!(b && b.doc_luc && Date.now() - new Date(b.doc_luc).getTime() < gio * 3600e3);
}
const goc = () => (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');

/* Khoá cho hàm nền — suy ra từ GEMINI_API_KEY, không cần khai biến mới */
function khoaNoiBo() {
  return crypto.createHash('sha256').update('gia-xe|' + (process.env.GEMINI_API_KEY || '')).digest('hex').slice(0, 32);
}

/* ── CSDL giá xe tĩnh ────────────────────────────────────────────────────── */
let DB = null, DB_LUC = 0;
async function dbXe() {
  if (DB && Date.now() - DB_LUC < 30 * 60e3) return DB;
  let s;
  if (process.env.TINH_PHI_ROOT) {
    s = require('fs').readFileSync(require('path').join(process.env.TINH_PHI_ROOT, 'data/gia-xe-db.json'), 'utf8');
  } else {
    const r = await fetch(goc() + '/data/gia-xe-db.json', { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error('Không tải được gia-xe-db.json: ' + r.status);
    s = await r.text();
  }
  DB = JSON.parse(s); DB_LUC = Date.now();
  return DB;
}
function boDau(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}
const chuanXe = (s) => boDau(s).toUpperCase().replace(/[^A-Z0-9]/g, '');

/* Tìm dòng xe trong CSDL. Trả { hang, dong, rows, khac } hoặc null */
async function timDongXe(hangHoi, dongHoi) {
  const db = await dbXe();
  const H = chuanXe(hangHoi), D = chuanXe(dongHoi);
  if (!D) return null;
  const ung = [];
  Object.keys(db.data).forEach((hang) => {
    const hk = chuanXe(hang);
    if (H && !(hk.includes(H) || H.includes(hk))) return;
    Object.keys(db.data[hang]).forEach((dong) => {
      const dk = chuanXe(dong);
      if (dk === D) ung.push({ hang, dong, d: 3 });
      else if (dk.startsWith(D) || D.startsWith(dk)) ung.push({ hang, dong, d: 2 });
      else if (dk.includes(D)) ung.push({ hang, dong, d: 1 });
    });
  });
  if (!ung.length) return null;
  ung.sort((x, y) => y.d - x.d);
  const { hang, dong } = ung[0];
  return { hang, dong, rows: db.data[hang][dong], meta: db.meta, khac: ung.slice(1, 4).map((u) => u.hang + ' ' + u.dong) };
}

const trungVi = (a) => {
  const b = a.filter((x) => x > 0).sort((x, y) => x - y);
  if (!b.length) return 0;
  const g = Math.floor(b.length / 2);
  return b.length % 2 ? b[g] : (b[g - 1] + b[g]) / 2;
};

/* Kiểm dịch giá Google so với CSDL cùng năm. rowsNam: các dòng CSDL của năm đó */
function kiemDich(giaGoogle, rowsNam) {
  const s = trungVi((rowsNam || []).map((r) => r[2]));
  const L = Math.max(0, ...(rowsNam || []).map((r) => r[7] || 0));
  if (s && (giaGoogle < 0.6 * s || giaGoogle > 1.4 * s)) {
    return { hop_le: false, ly_do: 'lech_csdl', ty_le: giaGoogle / s, gia_csdl: s };
  }
  if (L && giaGoogle > 1.1 * L) return { hop_le: false, ly_do: 'vuot_gia_niem_yet', gia_niem_yet: L };
  return { hop_le: true, ty_le: s ? giaGoogle / s : null, gia_csdl: s || null };
}

/* ── Tra Google (Gemini + Google Search) ─────────────────────────────────── */
const CHI_DAN = `Bạn là công cụ tra giá xe ô tô cũ tại thị trường Việt Nam cho một trang bảo hiểm.

Dùng công cụ tìm kiếm Google được cấp để tìm CÁC TIN RAO BÁN hoặc bài định giá
đang có thật trên mạng, đúng hãng xe, đúng dòng xe, đúng năm sản xuất được hỏi
(sai lệch năm ±1 năm chỉ dùng khi không tìm được đúng năm, phải nêu rõ trong
ghi_chu). Ưu tiên các nguồn Việt Nam: bonbanh.com, chotot.com, oto.com.vn,
carmudi.vn, các sàn/diễn đàn mua bán xe cũ uy tín.

QUY TẮC BẮT BUỘC:
1. CHỈ dùng số liệu tìm thấy qua tìm kiếm thật. Tuyệt đối không suy đoán,
   không lấy từ kiến thức có sẵn không kèm nguồn.
2. Nếu không tìm thấy tin rao nào phù hợp, trả tim_thay=false — thà không có
   kết quả còn hơn đưa số sai, vì số này ảnh hưởng tới số tiền bảo hiểm của
   khách hàng thật.
3. Đơn vị VNĐ nguyên (không viết tắt). "650 triệu" → 650000000.
4. Bỏ qua giá bất thường (dưới 30 triệu hoặc trên 60 tỷ) — tin câu view/gõ nhầm.
5. trung_vi là giá Ở GIỮA dãy giá tìm được, không phải trung bình cộng.
6. Trả lời DUY NHẤT một object JSON hợp lệ, không kèm lời dẫn, không dùng
   markdown code fence, đúng các khoá sau:
   {"tim_thay":boolean,"trung_vi":number,"thap_nhat":number,"cao_nhat":number,
    "so_tin_tham_khao":number,"ghi_chu":string}`;

/* Một lượt gọi, không thinking, tự bỏ cuộc ở hetGioMs (mặc định 7 giây — để
   gia-xe-cong-khai.js còn kịp trả JSON trước ngưỡng 10 giây của Netlify). */
async function timGiaBangGoogleSearch({ hang, dong, nam, phienBan }, hetGioMs) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, ly_do: 'thieu_GEMINI_API_KEY' };
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const cauHoi = `Xe cần tra giá thị trường xe cũ: ${hang} ${dong}` + (phienBan ? ` (phiên bản ${phienBan})` : '') +
    `, năm sản xuất ${nam}. Tìm kiếm Google ngay bây giờ rồi trả JSON theo đúng quy tắc.`;
  const payload = JSON.stringify({
    system_instruction: { parts: [{ text: CHI_DAN }] },
    contents: [{ role: 'user', parts: [{ text: cauHoi }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0, maxOutputTokens: 1200, topP: 0.9 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  });
  const ctrl = new AbortController();
  const hetGio = setTimeout(() => ctrl.abort(), hetGioMs || 7000);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: payload, signal: ctrl.signal });
    if (!r.ok) { const t = await r.text(); return { ok: false, ly_do: r.status === 400 ? 'gemini_400' : 'gemini_loi_' + r.status, chi_tiet: t.slice(0, 300) }; }
    const data = await r.json();
    const cand = data.candidates && data.candidates[0];
    const parts = cand && cand.content && cand.content.parts;
    let text = parts ? parts.filter((p) => !p.thought).map((p) => p.text || '').join('').trim() : '';
    if (!text) return { ok: false, ly_do: 'gemini_khong_tra_loi', finish: cand && cand.finishReason };
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, ly_do: 'khong_doc_duoc_json', chi_tiet: text.slice(0, 300) };
    let kq;
    try { kq = JSON.parse(m[0]); } catch (e) { return { ok: false, ly_do: 'json_khong_hop_le', chi_tiet: text.slice(0, 300) }; }
    if (!kq.tim_thay) return { ok: false, ly_do: 'khong_tim_thay', ghi_chu: kq.ghi_chu || '' };
    const hopLe = (x) => typeof x === 'number' && x >= 30e6 && x <= 60e9;
    if (!hopLe(kq.trung_vi)) return { ok: false, ly_do: 'so_vo_ly', ghi_chu: kq.ghi_chu || '' };
    const lamTron = (x) => (hopLe(x) ? Math.round(x / 1e6) * 1e6 : 0);
    const soNguonThat = (cand.groundingMetadata && cand.groundingMetadata.groundingChunks &&
      cand.groundingMetadata.groundingChunks.length) || 0;
    return {
      ok: true,
      nguon: 'Gemini + Google Search (thời gian thực)',
      do_tin_cay: soNguonThat >= 3 ? 'trung_binh' : 'thap',
      trung_vi: lamTron(kq.trung_vi),
      thap_nhat: lamTron(kq.thap_nhat) || lamTron(kq.trung_vi * 0.9),
      cao_nhat: lamTron(kq.cao_nhat) || lamTron(kq.trung_vi * 1.1),
      so_tin: Math.max(0, Math.round(kq.so_tin_tham_khao || 0)),
      so_nguon_tim_kiem: soNguonThat,
      ghi_chu: kq.ghi_chu || '',
      doc_luc: new Date().toISOString(),
    };
  } catch (e) {
    const het = e && (e.name === 'AbortError' || /abort/i.test(String(e.message)));
    return { ok: false, ly_do: het ? 'het_gio_cho' : 'ngoai_le', chi_tiet: String(e && e.message) };
  } finally { clearTimeout(hetGio); }
}

/* Tra Google + kiểm dịch + ghi cache. Dùng bởi cả trang web lẫn bot.
   Trả về bản ghi đã ghi cache (ok=false nếu không tìm thấy hoặc bị kiểm dịch loại). */
async function traMoiVaLuu(hang, dong, nam, phienBan, hetGioMs) {
  const store = openStore();
  let kq = await timGiaBangGoogleSearch({ hang, dong, nam, phienBan }, hetGioMs);
  if (kq.ok) {
    let rowsNam = [];
    try {
      const x = await timDongXe(hang, dong);
      if (x) {
        const gan = x.rows.reduce((mm, r) => Math.min(mm, Math.abs(r[0] - nam)), 99);
        if (gan <= 1) rowsNam = x.rows.filter((r) => Math.abs(r[0] - nam) === gan);
      }
    } catch (e) { /* không có CSDL thì chỉ kiểm khoảng 30tr–60 tỷ như cũ */ }
    const kd = kiemDich(kq.trung_vi, rowsNam);
    if (!kd.hop_le) {
      console.warn('gia-xe-chung: loại giá Google', hang, dong, nam, kq.trung_vi, kd);
      kq = { ok: false, ly_do: 'so_vo_ly', kiem_dich: kd, gia_google_bi_loai: kq.trung_vi, doc_luc: new Date().toISOString() };
    } else {
      kq.kiem_dich = kd;
    }
  }
  if (store && kq.ly_do !== 'het_gio_cho' && kq.ly_do !== 'ngoai_le') {
    try { await store.setJSON(khoaCache(hang, dong, nam), kq); } catch (e) { /* bỏ qua */ }
  }
  return kq;
}

/* Trần lượt tra mới cho bot / hàm nền (trang web có trần riêng theo IP) */
async function conLuotNoiBo() {
  const store = openStore();
  if (!store) return true;
  const tran = parseInt(process.env.GIA_XE_NOI_BO_MAX_PER_DAY || '150', 10);
  const ngay = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  try {
    const d = (await store.get(KHOA_DEM, { type: 'json' })) || {};
    const n = d.ngay === ngay ? d.n : 0;
    if (n >= tran) return false;
    await store.setJSON(KHOA_DEM, { ngay, n: n + 1 });
    return true;
  } catch (e) { return true; }
}

/* Đọc cache 48 giờ; không có thì tùy cheDo:
     'ngay' — tra Google luôn (bot Zalo chạy nền, chờ được ~7 giây)
     'nen'  — nhờ hàm nền tra hộ, lần này trả null (chatbot web, phải nhanh) */
async function giaThiTruong(hang, dong, nam, cheDo) {
  const store = openStore();
  const key = khoaCache(hang, dong, nam);
  if (store) {
    try {
      const c = await store.get(key, { type: 'json' });
      if (c && conHan(c, CACHE_GIO)) return c.ok ? c : null;   // kể cả "không tìm thấy" cũng nhớ 48h, khỏi tra lại tốn tiền
    } catch (e) { /* tra mới */ }
  }
  if (cheDo === 'ngay') {
    if (!(await conLuotNoiBo())) return null;
    const kq = await traMoiVaLuu(hang, dong, nam, '', 9000);
    return kq.ok ? kq : null;
  }
  try {
    await fetch(goc() + '/.netlify/functions/gia-xe-lam-moi-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-noi-bo': khoaNoiBo() },
      body: JSON.stringify({ hang, dong, nam }),
    });
  } catch (e) { /* không sao, lần sau thử lại */ }
  return null;
}

module.exports = { dbXe, timDongXe, trungVi, kiemDich, giaThiTruong, traMoiVaLuu, timGiaBangGoogleSearch,
  conLuotNoiBo, khoaNoiBo, khoaCache, conHan, openStore, CACHE_GIO, STORE_NAME };
