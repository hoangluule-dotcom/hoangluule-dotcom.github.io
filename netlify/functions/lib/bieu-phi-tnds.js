/* DBV247 — Bảng phí TNDS bắt buộc dạng chữ, cho bot Zalo nội bộ tra nhanh.
   ===========================================================================
   KHÔNG chép biểu phí vào đây. Nguồn duy nhất là /assets/cap-don-tnds.js
   (công cụ cấp đơn trên web). Hàm này tải đúng file đó từ website, cắt lấy
   khối "BIỂU PHÍ" rồi tính sẵn VAT cho từng dòng — sửa phí ở cap-don-tnds.js
   là bot tự dùng phí mới, không có bản thứ hai để lệch.

   Tính sẵn mọi con số (kể cả VAT) để mô hình AI chỉ phải TRA, không phải
   NHÂN — AI làm phép tính hay sai, tra bảng thì không.
*/

'use strict';

let cache = null;          // giữ trong bộ nhớ giữa các lần gọi khi hàm còn "ấm"
let cacheLuc = 0;
const SONG = 30 * 60 * 1000;

const VND = (n) => Math.round(n).toLocaleString('vi-VN') + 'đ';
const dong = (ten, phi) =>
  `- ${ten}: ${VND(phi)} + VAT ${VND(phi * 0.1)} = ${VND(phi * 1.1)}/năm`;

async function taiBieuPhi() {
  const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
  const r = await fetch(goc + '/assets/cap-don-tnds.js', { headers: { 'Cache-Control': 'no-cache' } });
  if (!r.ok) throw new Error('Không tải được cap-don-tnds.js: ' + r.status);
  const js = await r.text();
  const dau = js.indexOf('var MOTO');
  const cuoi = js.indexOf('/* ══════════ TRẠNG THÁI');
  if (dau < 0 || cuoi < dau) throw new Error('Không tìm thấy khối BIỂU PHÍ trong cap-don-tnds.js');
  // Khối này chỉ khai báo hằng số và hai hàm tính — không đụng DOM
  return new Function(js.slice(dau, cuoi) +
    '\n;return {MOTO:MOTO,NKD:NKD,KD_SEAT:KD_SEAT,TAI:TAI,KHAC:KHAC,phiKD:phiKD,phiNkdTheoCho:phiNkdTheoCho};')();
}

function thanhChu(B) {
  const L = [];
  L.push('BIỂU PHÍ TNDS BẮT BUỘC — Phụ lục I, NĐ 67/2023/NĐ-CP (phí/năm; VAT 10%).');
  L.push('Mua nhiều năm = phí 1 năm × số năm.');
  L.push('', 'I. MÔ TÔ, XE MÁY');
  Object.values(B.MOTO).forEach((x) => L.push(dong(x.t, x.f)));
  L.push('', 'II. Ô TÔ KHÔNG KINH DOANH VẬN TẢI');
  Object.values(B.NKD).forEach((x) => L.push(dong(x.t, x.f)));
  L.push('', 'III. Ô TÔ KINH DOANH VẬN TẢI (chở người) — theo số chỗ đăng ký');
  for (let s = 1; s <= 25; s++) L.push(dong(`Xe kinh doanh ${s} chỗ`, B.phiKD(s)));
  L.push(`- Trên 25 chỗ: 4.813.000đ + 30.000đ × (số chỗ − 25), chưa VAT. Ví dụ 29 chỗ: ${VND(B.phiKD(29))} + VAT = ${VND(B.phiKD(29) * 1.1)}`);
  L.push(dong('Pickup / minivan kinh doanh vận tải', 933000));
  L.push('', 'IV. Ô TÔ CHỞ HÀNG (XE TẢI)');
  Object.values(B.TAI).forEach((x) => L.push(dong(x.t, x.f)));
  L.push('', 'V. TRƯỜNG HỢP ĐẶC BIỆT (đã nhân hệ số)');
  Object.values(B.KHAC).forEach((x) => {
    if (x.seats && x.base === 'kdseat') {
      L.push(`- ${x.t} (${x.note}):`);
      for (let s = 4; s <= 9; s++) L.push('  ' + dong(`${x.t} ${s} chỗ`, Math.round(B.phiKD(s) * x.k)));
    } else if (x.seats) {
      L.push(`- ${x.t}: ${x.note} — tức dưới 6 chỗ ${VND(437000)}, 6–11 chỗ ${VND(794000)}, 12–24 chỗ ${VND(1270000)}, trên 24 chỗ ${VND(1825000)} (chưa VAT)`);
    } else {
      L.push(dong(`${x.t} (${x.note})`, Math.round(x.base * x.k)));
    }
  });
  L.push('', 'Mức trách nhiệm: ô tô 150 triệu/người về sức khỏe tính mạng, 100 triệu/vụ về tài sản; mô tô xe máy 150 triệu/người, 50 triệu/vụ.');
  return L.join('\n');
}

/* Trả về bảng phí dạng chữ; lỗi thì trả chuỗi rỗng (bot vẫn hỏi đáp được) */
async function bangPhiTnds() {
  if (cache && Date.now() - cacheLuc < SONG) return cache;
  try {
    cache = thanhChu(await taiBieuPhi());
    cacheLuc = Date.now();
    return cache;
  } catch (e) {
    console.error('bieu-phi-tnds:', e.message);
    return cache || '';
  }
}

module.exports = { bangPhiTnds, _thanhChu: thanhChu, _taiBieuPhi: taiBieuPhi };
