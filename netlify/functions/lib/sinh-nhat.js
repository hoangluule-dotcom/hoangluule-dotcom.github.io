/* DBV247 — Sinh nhật cho Bot em gái DBV (nhóm giải trí)
   ===========================================================================
   Danh sách ngày sinh lưu RIÊNG trong Netlify Blobs ("dbv247-day-bot", khoá
   "sinh-nhat") — KHÔNG để trong mã nguồn (kho GitHub đang công khai).

   Lệnh quản trị (ZALO_GT_ADMIN_ID), nhắn cho Bot em gái DBV:
     sinh nhật: <dán danh sách>     thêm/cập nhật. Bot tự nhặt mọi cặp "Họ Tên dd/mm/yyyy"
                                    (hoặc dd/mm), vd: "Vũ Thị Mây 01/01/1983, Lê Văn A 06/01"
     ds sinh nhật                   xem danh sách (chỉ ngày/tháng)
     xoá sinh nhật: Họ Tên          bỏ một người
     thử chúc sinh nhật             gửi thử lời chúc hôm nay vào CHÍNH cuộc trò chuyện này
   Ai cũng hỏi được: "sinh nhật hôm nay", "tháng này ai sinh nhật" (bot trả lời qua AI).

   Tự động (zalo-sinh-nhat-cron.js, 8:00 sáng giờ VN mỗi ngày):
     - Ngày có người sinh nhật → lời chúc riêng, vui, KHÔNG nhắc tuổi.
     - Ngày 1 hằng tháng → điểm danh các "thọ tinh" trong tháng (chỉ ngày/tháng).
   Tắt: biến môi trường ZALO_GT_SINH_NHAT=off.
*/
'use strict';

const DAY = require('./day-bot');
const KHOA = 'sinh-nhat';

const homNayVN = () => {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
  return { d: +p.day, m: +p.month, y: +p.year };
};
const dd = (n) => String(n).padStart(2, '0');

async function docDs() {
  const k = DAY.kho(); if (!k) return [];
  try { return (await k.get(KHOA, { type: 'json' })) || []; } catch (e) { return []; }
}
async function ghiDs(ds) {
  const k = DAY.kho(); if (!k) throw new Error('Không mở được kho lưu');
  await k.setJSON(KHOA, ds);
}

/* Nhặt mọi "Họ Tên dd/mm[/yyyy]" trong một đoạn chữ */
function nhat(text) {
  const re = /((?:\p{Lu}[\p{L}]*)(?:\s+\p{Lu}[\p{L}]*){1,4})\s*[:\-–]?\s*(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{4}))?/gu;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const ten = m[1].replace(/^(Tháng|Thang|Ngày|Ngay|Sinh|Nhật)\s+/i, '').trim();
    const d = +m[2], th = +m[3], y = m[4] ? +m[4] : null;
    if (d >= 1 && d <= 31 && th >= 1 && th <= 12 && ten.split(/\s+/).length >= 2) out.push({ ten, d, m: th, y });
  }
  return out;
}
const chuan = (s) => DAY.boDau(s).replace(/[^a-z]/g, '');

function trongNgay(ds, d, m) { return ds.filter((x) => x.d === d && x.m === m); }
function trongThang(ds, m) { return ds.filter((x) => x.m === m).sort((a, b) => a.d - b.d); }

/* Lời chúc: nhờ AI viết cho tươi, lỗi thì dùng mẫu sẵn */
async function viet(loai, nguoi, thang, hetGioMs) {
  const mau = loai === 'ngay'
    ? '🎂🎉 Hôm nay là sinh nhật của ' + nguoi.map((x) => x.ten).join(', ') +
      '! Em thay mặt cả nhà chúc ' + (nguoi.length > 1 ? 'các anh chị' : 'anh/chị') +
      ' tuổi mới thật nhiều sức khỏe, vui vẻ, công việc thuận buồm xuôi gió và ví lúc nào cũng dày 💰. Cả nhà vào thả tim chúc mừng nào! 🥳'
    : '📅 Tháng ' + thang + ' này nhà mình có ' + nguoi.length + ' thọ tinh: ' +
      nguoi.map((x) => x.ten + ' (' + dd(x.d) + '/' + dd(x.m) + ')').join(', ') + '. Cả nhà nhớ chuẩn bị bánh kem nha 🎂';
  const key = process.env.GEMINI_GT_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return mau;
  const yeuCau = loai === 'ngay'
    ? 'Viết lời chúc mừng sinh nhật hôm nay cho: ' + nguoi.map((x) => x.ten).join(', ') + '.'
    : 'Viết lời điểm danh vui các người có sinh nhật trong tháng ' + thang + ': ' +
      nguoi.map((x) => x.ten + ' ngày ' + dd(x.d) + '/' + dd(x.m)).join('; ') + '. Liệt kê đủ tên kèm ngày/tháng.';
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), hetGioMs || 15000);
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text:
          'Bạn là "Bot em gái DBV" — cô em út lém lỉnh trong nhóm Zalo của cán bộ Chi nhánh DBV Thành Đô. ' +
          'Viết tiếng Việt, xưng "em", gọi "anh/chị"; vui, ấm áp, hài nhẹ kiểu dân văn phòng, 2–4 emoji. ' +
          'Tối đa 5 câu. KHÔNG nhắc tuổi, năm sinh, già/trẻ; không đùa ngoại hình, tình cảm. ' +
          'Không dùng markdown (**, #). Kết bằng một câu rủ cả nhóm vào chúc mừng.' }] },
        contents: [{ role: 'user', parts: [{ text: yeuCau }] }],
        generationConfig: { temperature: 1, maxOutputTokens: 600 },
      }),
    });
    clearTimeout(t);
    if (!r.ok) return mau;
    const j = await r.json();
    const p = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    const s = p ? p.filter((x) => !x.thought).map((x) => x.text || '').join('').trim() : '';
    // AI phải nhắc đủ tên; thiếu ai thì dùng mẫu cho chắc
    if (!s || !nguoi.every((x) => s.includes(x.ten.split(/\s+/).pop()))) return mau;
    return s;
  } catch (e) { return mau; }
}

/* Lệnh quản trị. Trả về chuỗi trả lời, hoặc { thuChuc: true }, hoặc null nếu không phải lệnh */
async function xuLyLenh(cau, { laAdmin }) {
  const c = String(cau || '').trim();
  const kd = DAY.boDau(c);
  const laThem = /^sinh nhat\s*:/.test(kd);
  const laXem = /^(ds|danh sach) sinh nhat\s*$/.test(kd);
  const laXoa = /^(xoa|bo) sinh nhat\s*:/.test(kd);
  const laThu = /^thu chuc sinh nhat\s*$/.test(kd);
  if (!laThem && !laXem && !laXoa && !laThu) return null;
  if (!laAdmin) return 'Chỉ quản trị viên mới sửa được danh sách sinh nhật ạ 🎂';

  if (laThu) return { thuChuc: true };

  const ds = await docDs();
  if (laXem) {
    if (!ds.length) return 'Chưa có danh sách sinh nhật. Gửi: sinh nhật: Họ Tên dd/mm/yyyy, Họ Tên dd/mm/yyyy...';
    const theoThang = [];
    for (let m = 1; m <= 12; m++) {
      const l = trongThang(ds, m);
      if (l.length) theoThang.push('Tháng ' + m + ': ' + l.map((x) => x.ten + ' ' + dd(x.d) + '/' + dd(x.m)).join(', '));
    }
    return '🎂 ' + ds.length + ' người:\n' + theoThang.join('\n');
  }
  if (laXoa) {
    const ten = c.replace(/^[^:]*:/, '').trim();
    const i = ds.findIndex((x) => chuan(x.ten) === chuan(ten));
    if (i < 0) return 'Không thấy "' + ten + '" trong danh sách. Nhắn "ds sinh nhật" để xem tên chính xác.';
    ds.splice(i, 1); await ghiDs(ds);
    return 'Đã bỏ ' + ten + ' khỏi danh sách sinh nhật.';
  }
  // thêm / cập nhật
  const moi = nhat(c.replace(/^[^:]*:/, ''));
  if (!moi.length) return 'Em không nhặt được ai. Viết dạng: sinh nhật: Nguyễn Văn A 05/07/1990, Trần Thị B 12/10';
  let them = 0, sua = 0;
  for (const x of moi) {
    const cu = ds.find((y) => chuan(y.ten) === chuan(x.ten));
    if (cu) { Object.assign(cu, x); sua++; } else { ds.push(x); them++; }
  }
  await ghiDs(ds);
  return 'Đã ghi ✓ ' + them + ' người mới' + (sua ? ', cập nhật ' + sua + ' người' : '') + ' (tổng ' + ds.length + ').\n' +
    moi.map((x) => '- ' + x.ten + ' ' + dd(x.d) + '/' + dd(x.m)).join('\n') +
    '\n\nMỗi sáng 8:00 em sẽ tự chúc trong nhóm. Thử ngay: "thử chúc sinh nhật".';
}

/* Soạn lời chúc cho hôm nay (và điểm danh nếu là ngày 1). Trả về mảng tin nhắn. */
async function tinHomNay(baoCaKhiTrong, hetGioMs) {
  const ds = await docDs();
  const h = homNayVN();
  const tin = [];
  if (h.d === 1) {
    const l = trongThang(ds, h.m);
    if (l.length) tin.push(await viet('thang', l, h.m, hetGioMs));
  }
  const nay = trongNgay(ds, h.d, h.m);
  if (nay.length) tin.push(await viet('ngay', nay, null, hetGioMs));
  if (!tin.length && baoCaKhiTrong) {
    tin.push('Hôm nay (' + dd(h.d) + '/' + dd(h.m) + ') không có ai sinh nhật. ' +
      (ds.length ? 'Danh sách có ' + ds.length + ' người, sáng ngày sinh nhật em sẽ tự chúc 🎂' : 'Danh sách sinh nhật đang trống.'));
  }
  return tin;
}

module.exports = { xuLyLenh, tinHomNay, docDs, nhat, homNayVN };
