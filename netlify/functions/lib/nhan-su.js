/* Danh sách nhân sự cho bot giải trí: họ tên, phòng ban, ngày vào DBV.
   Lưu RIÊNG trong Netlify Blobs ("dbv247-day-bot", khoá "nhan-su") — không để
   trong mã nguồn (kho GitHub công khai). Chỉ 3 trường này, KHÔNG nạp CCCD,
   lương, địa chỉ, số điện thoại...
   Lệnh quản trị:  nhân sự: Họ Tên | Phòng | dd/mm/yyyy ; Họ Tên | Phòng | dd/mm/yyyy ...
                   ds nhân sự   ·   xoá nhân sự: Họ Tên */
'use strict';
const DAY = require('./day-bot');
const KHOA = 'nhan-su';
const chuan = (s) => DAY.boDau(s).replace(/[^a-z]/g, '');

async function docNs() { const k = DAY.kho(); if (!k) return []; try { return (await k.get(KHOA, { type: 'json' })) || []; } catch (e) { return []; } }
async function ghiNs(ds) { const k = DAY.kho(); if (!k) throw new Error('Không mở được kho lưu'); await k.setJSON(KHOA, ds); }

function nhat(text) {
  return String(text).split(/[;\n]+/).map((dong) => {
    const p = dong.split('|').map((x) => x.trim());
    if (p.length < 2 || p[0].split(/\s+/).length < 2) return null;
    const m = (p[2] || '').match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
    return { ten: p[0], phong: p[1], vao: m ? { d: +m[1], m: +m[2], y: +m[3] } : null };
  }).filter(Boolean);
}

/* Tìm người theo tên gõ (đủ họ tên, hoặc tên gọi cuối nếu chỉ một người trùng) */
function tim(ds, tenNhap) {
  const c = chuan(tenNhap);
  if (!c) return null;
  const dung = ds.find((x) => chuan(x.ten) === c);
  if (dung) return dung;
  const cuoi = ds.filter((x) => chuan(x.ten).endsWith(c));
  return cuoi.length === 1 ? cuoi[0] : null;
}

async function xuLyLenh(cau, { laAdmin }) {
  const c = String(cau || '').trim(), kd = DAY.boDau(c);
  const laThem = /^nhan su\s*:/.test(kd), laXem = /^(ds|danh sach) nhan su\s*$/.test(kd), laXoa = /^(xoa|bo) nhan su\s*:/.test(kd);
  if (!laThem && !laXem && !laXoa) return null;
  if (!laAdmin) return 'Chỉ quản trị viên mới sửa danh sách nhân sự ạ.';
  const ds = await docNs();
  if (laXem) {
    if (!ds.length) return 'Chưa có danh sách. Gửi: nhân sự: Họ Tên | Phòng | dd/mm/yyyy ; ...';
    const nhom = {};
    ds.forEach((x) => (nhom[x.phong] = nhom[x.phong] || []).push(x.ten));
    return '👥 ' + ds.length + ' người:\n' + Object.keys(nhom).map((p) => p + ': ' + nhom[p].join(', ')).join('\n');
  }
  if (laXoa) {
    const t = c.replace(/^[^:]*:/, '').trim();
    const i = ds.findIndex((x) => chuan(x.ten) === chuan(t));
    if (i < 0) return 'Không thấy "' + t + '".';
    ds.splice(i, 1); await ghiNs(ds); return 'Đã bỏ ' + t + ' khỏi danh sách nhân sự.';
  }
  const moi = nhat(c.replace(/^[^:]*:/, ''));
  if (!moi.length) return 'Sai cú pháp. Viết: nhân sự: Nguyễn Văn A | Phòng Xe cơ giới | 06/06/2025 ; Trần Thị B | Kế toán | 01/07/2025';
  let them = 0, sua = 0;
  moi.forEach((x) => { const cu = ds.find((y) => chuan(y.ten) === chuan(x.ten)); if (cu) { Object.assign(cu, x); sua++; } else { ds.push(x); them++; } });
  await ghiNs(ds);
  return 'Đã ghi ✓ ' + them + ' người mới' + (sua ? ', cập nhật ' + sua : '') + ' (tổng ' + ds.length + '). Nhắn "ds nhân sự" để xem.';
}
module.exports = { docNs, ghiNs, tim, xuLyLenh, nhat, chuan };
