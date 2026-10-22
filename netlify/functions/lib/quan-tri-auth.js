/* DBV247 — Tài khoản nhân viên & phân quyền cho cổng quản trị /quan-tri
   ===========================================================================
   MỖI NHÂN VIÊN MỘT TÀI KHOẢN. Đăng nhập ở /quan-tri → nhận "vé phiên" (ký
   HMAC, hạn 12 giờ). Mọi hàm quản trị cũ (leads, lead-status, gas-admin,
   ctv-admin, gia-thi-truong, zalo-mini-admin) gọi kiemQuyen() ở đây.

   Vé đi trong đúng header cũ `x-dashboard-key`, nên các trang quản trị cũ
   không phải sửa cách gọi: cổng /quan-tri ghi vé vào chỗ các trang đó vẫn đọc
   khoá (localStorage dbv247_key, sessionStorage dbv_key).

   VAI TRÒ
     quan-ly    thấy và làm mọi thứ, tạo/khoá tài khoản
     van-hanh   khách hàng (lead), đơn hàng, cấp giấy chứng nhận, công cụ tra giá/tính phí
     ke-toan    đơn hàng (xem), xác nhận đã nhận tiền, CTV & hoa hồng, công cụ tra giá/tính phí

   KHOÁ CHUNG CŨ (DASHBOARD_KEY)
     Vẫn dùng được, với quyền quản lý, cho tới khi quản lý bấm "Tắt khoá chung"
     ở /quan-tri → Nhân viên. Để chuyển đổi không làm ai bị chặn giữa chừng.
     Khoá chung LUÔN dùng được để tạo tài khoản quản lý đầu tiên.

   KHO: Netlify Blobs "dbv247-quantri"
     nv/<tenDangNhap>   hồ sơ nhân viên (mật khẩu băm scrypt, không lưu bản rõ)
     cau-hinh           { tatKhoaChung }
     nhat-ky/<thời điểm> nhật ký tài khoản: đăng nhập, tạo, khoá, đổi quyền
*/

'use strict';

const crypto = require('node:crypto');

const TEN_KHO = 'dbv247-quantri';
const SITE_ID = 'df7ffacd-8e52-4769-b95b-23c978b36e29';
const HAN_VE_GIO = 12;
const SAI_TOI_DA = 5;
const KHOA_PHUT = 15;

const VAI_TRO = {
  'quan-ly': 'Quản lý',
  'van-hanh': 'Vận hành',
  'ke-toan': 'Kế toán',
};

let _kho = null;
function moKho() {
  if (_kho) return _kho;
  const { getStore } = require('@netlify/blobs');
  try {
    _kho = getStore({ name: TEN_KHO, consistency: 'strong' });
  } catch (err) {
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!token) throw new Error('Netlify Blobs chưa sẵn sàng và thiếu NETLIFY_ACCESS_TOKEN.');
    _kho = getStore({ name: TEN_KHO, siteID: process.env.SITE_ID || SITE_ID, token, consistency: 'strong' });
  }
  return _kho;
}

/* Khoá ký vé: dùng lại CTV_TOKEN_SECRET (đã có trên Netlify) nhưng tách miền
   bằng tiền tố, để vé CTV không bao giờ dùng được làm vé nhân viên. */
function biMat() {
  const s = process.env.QUAN_TRI_SECRET || process.env.CTV_TOKEN_SECRET;
  if (!s || s.length < 16) throw new Error('Thiếu CTV_TOKEN_SECRET trên Netlify.');
  return 'quan-tri-v1:' + s;
}

const b64u = (b) => Buffer.from(b).toString('base64url');

function chuanHoaTen(v) {
  return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9._-]/g, '').slice(0, 32);
}

/* ── Mật khẩu ─────────────────────────────────────────────────────────── */
function bamMatKhau(mk) {
  const muoi = crypto.randomBytes(16);
  const bam = crypto.scryptSync(String(mk), muoi, 32, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + muoi.toString('base64') + '$' + bam.toString('base64');
}
function dungMatKhau(mk, luu) {
  const p = String(luu || '').split('$');
  if (p.length !== 3 || p[0] !== 'scrypt') return false;
  const bam = crypto.scryptSync(String(mk), Buffer.from(p[1], 'base64'), 32, { N: 16384, r: 8, p: 1 });
  const mong = Buffer.from(p[2], 'base64');
  return mong.length === bam.length && crypto.timingSafeEqual(mong, bam);
}
function matKhauHopLe(mk) {
  mk = String(mk || '');
  if (mk.length < 8) return 'Mật khẩu cần ít nhất 8 ký tự.';
  if (!/[0-9]/.test(mk) || !/[a-zA-Z]/.test(mk)) return 'Mật khẩu cần có cả chữ và số.';
  return null;
}

/* ── Vé phiên ─────────────────────────────────────────────────────────── */
function kyVe(nv) {
  const than = b64u(JSON.stringify({ u: nv.ten, p: nv.phien, het: Date.now() + HAN_VE_GIO * 3600000 }));
  return 'nv1.' + than + '.' + crypto.createHmac('sha256', biMat()).update(than).digest('base64url');
}
function docVe(ve) {
  const p = String(ve || '').split('.');
  if (p.length !== 3 || p[0] !== 'nv1') return null;
  const mong = crypto.createHmac('sha256', biMat()).update(p[1]).digest();
  const thuc = Buffer.from(p[2], 'base64url');
  if (mong.length !== thuc.length || !crypto.timingSafeEqual(mong, thuc)) return null;
  try {
    const tt = JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8'));
    return tt && Date.now() <= Number(tt.het) ? tt : null;
  } catch (e) {
    return null;
  }
}

/* ── Hồ sơ ────────────────────────────────────────────────────────────── */
async function layNv(ten) {
  ten = chuanHoaTen(ten);
  return ten ? await moKho().get('nv/' + ten, { type: 'json' }) : null;
}
async function luuNv(nv) {
  await moKho().setJSON('nv/' + nv.ten, nv);
}
async function dsNv() {
  const kho = moKho();
  const { blobs } = await kho.list({ prefix: 'nv/' });
  const ds = await Promise.all(blobs.map((b) => kho.get(b.key, { type: 'json' })));
  return ds.filter(Boolean);
}
function congKhai(nv) {
  return {
    ten: nv.ten, hoTen: nv.hoTen, vaiTro: nv.vaiTro, tenVaiTro: VAI_TRO[nv.vaiTro] || nv.vaiTro,
    biKhoa: !!nv.biKhoa, phaiDoiMatKhau: !!nv.phaiDoiMatKhau,
    taoLuc: nv.taoLuc, dangNhapLuc: nv.dangNhapLuc || null,
  };
}
async function cauHinh() {
  return (await moKho().get('cau-hinh', { type: 'json' })) || {};
}
async function ghiNhatKy(nguoi, viec, chiTiet) {
  try {
    const luc = new Date().toISOString();
    await moKho().setJSON('nhat-ky/' + luc + '-' + crypto.randomBytes(3).toString('hex'), { luc, nguoi, viec, chiTiet: chiTiet || '' });
  } catch (e) {
    console.error('quan-tri: không ghi được nhật ký', e.message);
  }
}

/* ── Kiểm quyền — các hàm quản trị gọi cái này ───────────────────────────
   Trả { nv } nếu được phép; { loi, ma } nếu không (ma = 401 chưa đăng nhập /
   403 không đủ quyền). `cho` là danh sách vai trò được phép; bỏ trống = mọi
   nhân viên đã đăng nhập. */
async function kiemQuyen(event, cho) {
  const h = event.headers || {};
  const gui = String(h['x-dashboard-key'] || h['X-Dashboard-Key'] || '').trim();
  if (!gui) return { loi: 'Chưa đăng nhập. Vào /quan-tri để đăng nhập.', ma: 401 };

  let nv = null;
  if (gui.startsWith('nv1.')) {
    const ve = docVe(gui);
    if (!ve) return { loi: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại ở /quan-tri.', ma: 401 };
    const hs = await layNv(ve.u);
    if (!hs || hs.biKhoa || hs.phien !== ve.p) return { loi: 'Tài khoản đã bị khoá hoặc đổi mật khẩu. Đăng nhập lại ở /quan-tri.', ma: 401 };
    nv = { ten: hs.ten, hoTen: hs.hoTen, vaiTro: hs.vaiTro };
  } else {
    const mong = process.env.DASHBOARD_KEY || '';
    if (!mong || gui !== mong) return { loi: 'Sai hoặc thiếu khoá truy cập.', ma: 401 };
    if ((await cauHinh()).tatKhoaChung) {
      return { loi: 'Khoá chung đã tắt. Mỗi nhân viên đăng nhập bằng tài khoản riêng ở /quan-tri.', ma: 401 };
    }
    nv = { ten: '', hoTen: 'Khoá chung', vaiTro: 'quan-ly', khoaChung: true };
  }
  if (cho && cho.length && cho.indexOf(nv.vaiTro) < 0) {
    return { loi: 'Tài khoản ' + (VAI_TRO[nv.vaiTro] || nv.vaiTro) + ' không có quyền làm việc này.', ma: 403, nv };
  }
  return { nv };
}

module.exports = {
  VAI_TRO, SAI_TOI_DA, KHOA_PHUT, HAN_VE_GIO,
  moKho, chuanHoaTen, bamMatKhau, dungMatKhau, matKhauHopLe,
  kyVe, docVe, layNv, luuNv, dsNv, congKhai, cauHinh, ghiNhatKy, kiemQuyen,
  _datKho: (k) => { _kho = k; },
};
