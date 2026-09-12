/* DBV247 — Kho dữ liệu cộng tác viên (Netlify Blobs)
   ---------------------------------------------------------------------------
   Bước 1 của cổng CTV: chỉ có tài khoản (đăng ký / đăng nhập / hồ sơ).
   Chưa có đơn hàng, chưa có sổ cái, chưa có tiền.

   VÌ SAO DÙNG NETLIFY BLOBS, KHÔNG PHẢI POSTGRES
   Site này đã dùng @netlify/blobs cho lead-status.js, tức là kho đã hoạt động,
   không cần tạo project mới, không thêm chi phí, không thêm mật khẩu phải giữ.
   Với dữ liệu tài khoản thuần (không tiền) thì như vậy là đủ.

   GIỚI HẠN PHẢI BIẾT — đọc trước khi thêm hoa hồng vào đây:
   Blobs là kho khoá–giá trị, KHÔNG có transaction, KHÔNG có ràng buộc UNIQUE ở
   tầng lưu trữ, KHÔNG có SELECT FOR UPDATE. Sổ cái hoa hồng không được đặt ở
   đây — hai lượt ghi đồng thời sẽ mất một lượt mà không báo gì. Khi tới bước
   ghi nhận đơn và trả hoa hồng, chuyển sang Postgres (Supabase) theo đặc tả
   DacTa_He_Thong_CTV_Link_DBV247.md. Tên trường dưới đây đã đặt trùng tên cột
   của schema đó, nên lúc chuyển chỉ là đổi phần đọc/ghi trong FILE NÀY.

   Khoá trong kho:
     ctv/<sdt>      → bản ghi cộng tác viên
     ma/<MACTV>     → { sdt }  (tra ngược từ mã 4 ký tự, và giữ mã không trùng)
*/

'use strict';

const crypto = require('node:crypto');
const { getStore } = require('@netlify/blobs');

const TEN_KHO = 'dbv247-ctv';
const SITE_ID = 'df7ffacd-8e52-4769-b95b-23c978b36e29'; // site "dbv247" trên Netlify

const PHIEN_BAN_QUY_CHE = '1.0';
const HAN_TOKEN_NGAY = 30;

/* Bỏ I, O, 0, 1 — bốn ký tự này bị đọc nhầm nhau khi CTV đọc mã qua điện thoại.
   Cùng bộ ký tự mà maDon() trên trang tnds đang dùng, để mã đơn và mã CTV
   không bao giờ lẫn loại ký tự với nhau. */
const BANG_MA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DO_DAI_MA = 4;

const SAI_TOI_DA = 10;      // số lần nhập mật khẩu sai trước khi khoá
const KHOA_PHUT = 15;       // thời gian khoá

/* ── Mở kho ────────────────────────────────────────────────────────────────
   Bình thường Netlify tự cấp thông tin kết nối cho function. Nếu runtime chưa
   cấp (MissingBlobsEnvironmentError) thì truyền tay siteID + token, giống
   cách lead-status.js đang làm. */
function moKho() {
  try {
    return getStore({ name: TEN_KHO, consistency: 'strong' });
  } catch (err) {
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        'Netlify Blobs chưa sẵn sàng và thiếu NETLIFY_ACCESS_TOKEN để kết nối thủ công.'
      );
    }
    return getStore({
      name: TEN_KHO,
      siteID: process.env.SITE_ID || SITE_ID,
      token: token,
      consistency: 'strong',
    });
  }
}

/* ── Số điện thoại ─────────────────────────────────────────────────────────
   Phải chuẩn hoá TRƯỚC khi lưu. Cùng một người sẽ nhập 0912345678,
   +84912345678, 84912345678, 0912 345 678 — không quy về một dạng thì họ đăng
   ký được nhiều lần và đến lúc chia hoa hồng mới phát hiện ra. */
function chuanHoaSdt(tho) {
  let s = String(tho || '').trim().replace(/[^\d+]/g, '');
  if (s.indexOf('+84') === 0) s = '0' + s.slice(3);
  else if (s.indexOf('0084') === 0) s = '0' + s.slice(4);
  else if (s.indexOf('84') === 0 && s.length === 11) s = '0' + s.slice(2);
  return s.replace(/\D/g, '');
}

/* Chỉ nhận đầu số di động Việt Nam. Số cố định và đầu số dịch vụ (1900...)
   không nhận được tin nhắn nên không dùng làm tài khoản được. */
function sdtHopLe(s) {
  return /^0[35789]\d{8}$/.test(s);
}

function anSdt(s) {
  return s ? s.slice(0, 4) + '***' + s.slice(-3) : '';
}

/* ── Mật khẩu ──────────────────────────────────────────────────────────────
   scrypt có muối riêng từng người. Không bao giờ lưu mật khẩu dạng rõ, không
   bao giờ gửi lại mật khẩu cho người dùng qua bất kỳ kênh nào. */
function taoMuoi() {
  return crypto.randomBytes(16).toString('hex');
}

function bamMatKhau(matKhau, muoi) {
  return crypto.scryptSync(String(matKhau), String(muoi), 64).toString('hex');
}

function soSanhBam(a, b) {
  try {
    const A = Buffer.from(String(a || ''), 'hex');
    const B = Buffer.from(String(b || ''), 'hex');
    if (A.length === 0 || A.length !== B.length) return false;
    return crypto.timingSafeEqual(A, B);
  } catch (err) {
    return false;
  }
}

/* ── Token phiên ───────────────────────────────────────────────────────────
   Token tự chứa và có chữ ký HMAC, nên không phải lưu bảng phiên. Đổi
   CTV_TOKEN_SECRET là mọi phiên đang mở bị vô hiệu — đó cũng là cách đăng
   xuất toàn hệ thống khi cần. */
function b64u(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tuB64u(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function biMat() {
  const s = process.env.CTV_TOKEN_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      'Thiếu biến môi trường CTV_TOKEN_SECRET trên Netlify (chuỗi ngẫu nhiên tối thiểu 16 ký tự).'
    );
  }
  return s;
}

function kyToken(sdt, maCtv) {
  const than = b64u(JSON.stringify({
    sdt: sdt,
    ma: maCtv,
    het: Date.now() + HAN_TOKEN_NGAY * 86400000,
  }));
  const sig = b64u(crypto.createHmac('sha256', biMat()).update(than).digest());
  return than + '.' + sig;
}

function giaiToken(token) {
  const phan = String(token || '').split('.');
  if (phan.length !== 2 || !phan[0] || !phan[1]) return null;

  const mong = crypto.createHmac('sha256', biMat()).update(phan[0]).digest();
  const thuc = tuB64u(phan[1]);
  if (mong.length !== thuc.length || !crypto.timingSafeEqual(mong, thuc)) return null;

  let tt;
  try {
    tt = JSON.parse(tuB64u(phan[0]).toString('utf8'));
  } catch (err) {
    return null;
  }
  if (!tt || !tt.sdt || !tt.het || Date.now() > Number(tt.het)) return null;
  return tt;
}

/* Đọc token từ header Authorization: Bearer <token> */
function layToken(event) {
  const h = event.headers || {};
  const raw = h.authorization || h.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return m ? m[1] : '';
}

/* ── Mã CTV ────────────────────────────────────────────────────────────────
   4 ký tự từ BANG_MA = hơn một triệu tổ hợp. Mã này là bí danh công khai:
   nó vào link giới thiệu và vào nội dung chuyển khoản, nên phải ngắn.
   Số điện thoại KHÔNG dùng làm mã — 10 chữ số chiếm gần hết 25 ký tự mà
   trường nội dung VietQR cho phép, và làm số của CTV hiện trong sao kê ngân
   hàng của mọi khách hàng họ giới thiệu. */
function maNgauNhien() {
  const b = crypto.randomBytes(DO_DAI_MA);
  let s = '';
  for (let i = 0; i < DO_DAI_MA; i++) s += BANG_MA[b[i] % BANG_MA.length];
  return s;
}

async function sinhMaChuaDung(kho) {
  for (let i = 0; i < 12; i++) {
    const ma = maNgauNhien();
    const daCo = await kho.get('ma/' + ma, { type: 'json' });
    if (!daCo) return ma;
  }
  throw new Error('Không sinh được mã CTV mới, thử lại sau.');
}

/* ── Đọc / ghi bản ghi ─────────────────────────────────────────────────── */
async function docCtv(kho, sdt) {
  if (!sdt) return null;
  return (await kho.get('ctv/' + sdt, { type: 'json' })) || null;
}

async function ghiCtv(kho, ban) {
  await kho.setJSON('ctv/' + ban.sdt, ban);
}

async function docTheoMa(kho, ma) {
  const tro = await kho.get('ma/' + String(ma || '').toUpperCase(), { type: 'json' });
  if (!tro || !tro.sdt) return null;
  return docCtv(kho, tro.sdt);
}

function banGhiMoi(sdt, hoTen, matKhau, maCtv) {
  const muoi = taoMuoi();
  const bayGio = new Date().toISOString();
  return {
    sdt: sdt,
    ho_ten: String(hoTen).trim().slice(0, 120),
    email: null,
    ma_ctv: maCtv,
    mat_khau_bam: bamMatKhau(matKhau, muoi),
    muoi: muoi,
    trang_thai: 'hoat_dong',            // hoat_dong | tam_khoa
    quy_che_phien_ban: PHIEN_BAN_QUY_CHE,
    /* Thông tin nhận tiền — để trống ở bước 1, khai khi mở chức năng rút.
       Đổi các trường này về sau PHẢI qua xác thực OTP: đây là cửa duy nhất
       tiền đi ra khỏi hệ thống. */
    ngan_hang: null,
    so_tai_khoan: null,
    chu_tai_khoan: null,
    /* Xác thực số điện thoại — bước 1 chưa bật, giữ cột để không phải đổi
       hình dạng dữ liệu khi bật OTP. */
    sdt_da_xac_thuc: false,
    ngay_tao: bayGio,
    ngay_cap_nhat: bayGio,
    dang_nhap_cuoi: null,
    sai_lien_tiep: 0,
    khoa_den: null,
  };
}

/* Bản gửi ra trình duyệt — bỏ mọi thứ liên quan mật khẩu. */
function hoSoCongKhai(ban) {
  if (!ban) return null;
  return {
    sdt: ban.sdt,
    ho_ten: ban.ho_ten,
    email: ban.email,
    ma_ctv: ban.ma_ctv,
    trang_thai: ban.trang_thai,
    quy_che_phien_ban: ban.quy_che_phien_ban,
    ngan_hang: ban.ngan_hang,
    so_tai_khoan: ban.so_tai_khoan,
    chu_tai_khoan: ban.chu_tai_khoan,
    sdt_da_xac_thuc: ban.sdt_da_xac_thuc === true,
    ngay_tao: ban.ngay_tao,
    dang_nhap_cuoi: ban.dang_nhap_cuoi,
  };
}

function dangBiKhoa(ban) {
  if (!ban || !ban.khoa_den) return 0;
  const conLai = new Date(ban.khoa_den).getTime() - Date.now();
  return conLai > 0 ? Math.ceil(conLai / 60000) : 0;
}

/* ── Trả lời HTTP ─────────────────────────────────────────────────────────
   Không đặt header CORS: cả hai trang gọi hàm này đều cùng tên miền. Mở CORS
   ở đây là cho phép mọi website khác gọi thẳng vào cổng đăng nhập. */
function json(statusCode, payload) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

function docThan(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch (err) {
    return null;
  }
}

module.exports = {
  PHIEN_BAN_QUY_CHE,
  SAI_TOI_DA,
  KHOA_PHUT,
  moKho,
  chuanHoaSdt,
  sdtHopLe,
  anSdt,
  taoMuoi,
  bamMatKhau,
  soSanhBam,
  kyToken,
  giaiToken,
  layToken,
  sinhMaChuaDung,
  docCtv,
  ghiCtv,
  docTheoMa,
  banGhiMoi,
  hoSoCongKhai,
  dangBiKhoa,
  json,
  docThan,
};
