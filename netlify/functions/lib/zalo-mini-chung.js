/* DBV247 — Dùng chung cho mọi hàm phục vụ Zalo Mini App "Bảo hiểm DBV247"
   ===========================================================================
   Biến môi trường (Netlify → Site configuration → Environment variables):

     ZALO_MINIAPP_SECRET_KEY   Secret Key của Zalo App "Bảo hiểm DBV"
                               (developers.zalo.me) — đổi token SĐT ra số thật.
     ZALO_CHECKOUT_PRIVATE_KEY Private key của Checkout SDK
                               (Mini App Center → Checkout SDK → Cấu hình chung).
     ZALO_MINIAPP_ID           3220948822985492685 (có giá trị mặc định bên dưới).
     CTV_TOKEN_SECRET          ĐÃ CÓ — dùng lại để ký link tải file. Không cần
                               khai biến mới.

   KHO DỮ LIỆU: Netlify Blobs, kho "dbv247-miniapp".
     kh/<zaloId>/don/<maDon>   bản tóm tắt đơn của khách (để hiện "Đơn của tôi")
     kh/<zaloId>/tep/<maTep>   thông tin một file PDF của khách
     don/<maDon>               đơn đầy đủ + zaloId (tra ngược từ mã đơn)
     zdon/<maDonZalo>          → maDon (Checkout SDK chỉ trả mã đơn của Zalo)
     tep/<maTep>               nội dung file (nhị phân)

   Đơn TNDS VẪN GHI VÀO SỔ CHÍNH (Google Sheets qua gas-don.js) — kho này chỉ
   là lớp phục vụ Mini App. Hoa hồng, đối soát sao kê, dashboard CTV đều đọc từ
   Sheets như đơn trên website, không có sổ thứ hai.
*/

'use strict';

const crypto = require('node:crypto');

const MINI_APP_ID = process.env.ZALO_MINIAPP_ID || '3220948822985492685';
const TEN_KHO = 'dbv247-miniapp';
const SITE_ID = 'df7ffacd-8e52-4769-b95b-23c978b36e29';
const HOTLINE = '0869 656 561';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS),
    body: JSON.stringify(payload),
  };
}

/* ── Kho ──────────────────────────────────────────────────────────────── */
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
function datKhoThu(kho) { _kho = kho; } // cho bài kiểm thử

/* ── Chuẩn hoá ────────────────────────────────────────────────────────── */
function chuanHoaSdt(tho) {
  let s = String(tho || '').replace(/[^\d+]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  return /^0\d{9}$/.test(s) ? s : null;
}
const BO_KY_TU = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function chuanHoaMaCtv(v) {
  return String(v || '').toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 4);
}
function ngauNhien(n) {
  const b = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += BO_KY_TU[b[i] % BO_KY_TU.length];
  return s;
}
/* Cùng định dạng maDon() của trang cấp đơn website: TNDS + yymmdd + 4 ký tự. */
function maDonMoi() {
  const d = new Date(Date.now() + 7 * 3600000); // giờ Việt Nam
  const p = (x) => String(x).padStart(2, '0');
  return 'TNDS' + String(d.getUTCFullYear()).slice(2) + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + ngauNhien(4);
}

/* ── Người dùng Zalo ──────────────────────────────────────────────────────
   Mini App gửi access token của người dùng (getAccessToken). Máy chủ tự hỏi
   Zalo đó là ai — KHÔNG tin ID do Mini App tự khai, vì ai cũng gửi được một
   ID bất kỳ để xem đơn và file của người khác. */
/* Lý do lần xác minh gần nhất thất bại — trả về cho app (mã lỗi Zalo, không có
   dữ liệu cá nhân) để biết phải sửa ở đâu: thiếu khoá, khoá sai, token hết hạn… */
let _loiXacMinh = '';
function loiXacMinhGanNhat() { return _loiXacMinh; }

async function layNguoiDung(accessToken) {
  _loiXacMinh = '';
  if (!accessToken) { _loiXacMinh = 'thieu-token'; return null; }
  const ctrl = new AbortController();
  const hen = setTimeout(() => ctrl.abort(), 8000);
  try {
    const headers = { access_token: String(accessToken) };
    /* Graph API của Zalo đòi appsecret_proof = HMAC-SHA256(access_token, khoá bí mật của app) */
    const secret = process.env.ZALO_MINIAPP_SECRET_KEY;
    if (secret) headers.appsecret_proof = crypto.createHmac('sha256', secret).update(String(accessToken)).digest('hex');
    const r = await fetch('https://graph.zalo.me/v2.0/me?fields=id', { headers, signal: ctrl.signal });
    const kq = await r.json().catch(() => ({}));
    if (!kq || !kq.id || (kq.error && kq.error !== 0)) {
      _loiXacMinh = (secret ? '' : 'thieu-ZALO_MINIAPP_SECRET_KEY ') + 'zalo ' + (kq && kq.error) + ' ' + String((kq && kq.message) || r.status).slice(0, 80);
      console.error('zalo-mini: Zalo không xác minh người dùng:', r.status, JSON.stringify(kq).slice(0, 300));
      return null;
    }
    return { id: String(kq.id), ten: String(kq.name || '') };
  } catch (err) {
    _loiXacMinh = 'mang ' + String(err.message).slice(0, 60);
    console.error('zalo-mini: không xác minh được người dùng:', err.message);
    return null;
  } finally {
    clearTimeout(hen);
  }
}

/* ── Khoá thiết bị (thay cho xác minh qua Graph API) ─────────────────────
   Zalo chặn Graph API trả thông tin người dùng cho máy chủ ngoài Việt Nam
   (lỗi -501 "IP address not inside Vietnam") — Netlify Functions chạy ở Mỹ.
   Nên Mini App tự sinh một KHOÁ BÍ MẬT ngẫu nhiên (32+ ký tự) lưu trong
   nativeStorage của Zalo trên máy khách, gửi kèm mọi yêu cầu. Máy chủ chỉ lưu
   mã băm của khoá làm "ID khách". Không ai đoán được khoá của người khác;
   đổi máy/xoá Zalo thì mất khoá → nhân viên cấp lại mã liên kết.
   Khi có máy chủ trung chuyển đặt tại VN thì quay lại dùng layNguoiDung(). */
function idTuKhoaThietBi(k) {
  k = String(k || '');
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(k)) return null;
  return 'tb_' + crypto.createHash('sha256').update('dbv247-thiet-bi:' + k).digest('hex').slice(0, 32);
}
async function xacMinhNguoiDung(p) {
  _loiXacMinh = '';
  const id = idTuKhoaThietBi(p && p.khoaThietBi);
  if (id) return { id, ten: '' };
  _loiXacMinh = 'thieu-khoa-thiet-bi';
  return null;
}

/* Token getPhoneNumber → số điện thoại (dùng một lần, hết hạn 2 phút). */
async function doiTokenRaSdt(accessToken, token) {
  const secret = process.env.ZALO_MINIAPP_SECRET_KEY;
  if (!secret) {
    console.error('zalo-mini: thiếu ZALO_MINIAPP_SECRET_KEY');
    return null;
  }
  const ctrl = new AbortController();
  const hen = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://graph.zalo.me/v2.0/me/info', {
      headers: { access_token: String(accessToken), code: String(token), secret_key: secret },
      signal: ctrl.signal,
    });
    const kq = await r.json().catch(() => ({}));
    if (kq.error !== 0 || !kq.data || !kq.data.number) {
      console.error('zalo-mini: Graph API trả lỗi', kq.error, kq.message);
      return null;
    }
    return chuanHoaSdt(kq.data.number);
  } catch (err) {
    console.error('zalo-mini: không gọi được Graph API:', err.message);
    return null;
  } finally {
    clearTimeout(hen);
  }
}

/* ── Link ký sẵn (tải file, tải lên) ──────────────────────────────────────
   openDocument / downloadFile / openMediaPicker cần một URL, không gắn được
   header. Nên quyền nằm trong chính URL: chữ ký HMAC + hạn dùng ngắn. */
function biMat() {
  const s = process.env.CTV_TOKEN_SECRET;
  if (!s || s.length < 16) throw new Error('Thiếu CTV_TOKEN_SECRET trên Netlify.');
  return s;
}
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const tuB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function kyVe(noiDung, phut) {
  const than = b64u(JSON.stringify(Object.assign({}, noiDung, { het: Date.now() + phut * 60000 })));
  return than + '.' + b64u(crypto.createHmac('sha256', biMat()).update(than).digest());
}
function giaiVe(ve) {
  const p = String(ve || '').split('.');
  if (p.length !== 2) return null;
  const mong = crypto.createHmac('sha256', biMat()).update(p[0]).digest();
  const thuc = tuB64u(p[1]);
  if (mong.length !== thuc.length || !crypto.timingSafeEqual(mong, thuc)) return null;
  try {
    const tt = JSON.parse(tuB64u(p[0]).toString('utf8'));
    return tt && Date.now() <= Number(tt.het) ? tt : null;
  } catch (e) {
    return null;
  }
}

/* ── Checkout SDK ─────────────────────────────────────────────────────────
   MAC = HmacSHA256(privateKey, "amount=..&desc=..&extradata=..&item=..&method=..")
   khoá sắp xếp tăng dần, giá trị object/mảng đưa về chuỗi JSON. Ra dạng hex. */
function khoaCheckout() {
  const k = process.env.ZALO_CHECKOUT_PRIVATE_KEY;
  if (!k) throw new Error('Thiếu ZALO_CHECKOUT_PRIVATE_KEY trên Netlify.');
  return k;
}
function hmacHex(chuoi) {
  return crypto.createHmac('sha256', khoaCheckout()).update(chuoi).digest('hex');
}
function macDonHang(thamSo) {
  const chuoi = Object.keys(thamSo)
    .sort()
    .map((k) => k + '=' + (typeof thamSo[k] === 'object' ? JSON.stringify(thamSo[k]) : thamSo[k]))
    .join('&');
  return hmacHex(chuoi);
}
function soSanhMac(chuoi, mac) {
  if (!mac) return false;
  const hex = hmacHex(chuoi);
  const b64 = crypto.createHmac('sha256', khoaCheckout()).update(chuoi).digest('base64');
  return String(mac) === hex || String(mac).toLowerCase() === hex || String(mac) === b64;
}

/* Báo Zalo một đơn chuyển khoản đã nhận đủ tiền (resultCode 1). */
async function baoZaloDaThanhToan(maDonZalo, resultCode) {
  const rc = resultCode == null ? 1 : resultCode;
  const k = khoaCheckout();
  const mac = crypto
    .createHmac('sha256', k)
    .update('appId=' + MINI_APP_ID + '&orderId=' + maDonZalo + '&resultCode=' + rc + '&privateKey=' + k)
    .digest('hex');
  const r = await fetch('https://payment-mini.zalo.me/api/transaction/' + MINI_APP_ID + '/bank-callback-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: MINI_APP_ID, orderId: maDonZalo, resultCode: rc, mac }),
  });
  const kq = await r.json().catch(() => ({}));
  return { ok: kq.err === 0 || kq.error === 0, kq };
}

module.exports = {
  MINI_APP_ID, HOTLINE, CORS, json, moKho, datKhoThu,
  chuanHoaSdt, chuanHoaMaCtv, maDonMoi, ngauNhien,
  layNguoiDung, xacMinhNguoiDung, idTuKhoaThietBi, loiXacMinhGanNhat, doiTokenRaSdt, kyVe, giaiVe,
  macDonHang, soSanhMac, baoZaloDaThanhToan,
};
