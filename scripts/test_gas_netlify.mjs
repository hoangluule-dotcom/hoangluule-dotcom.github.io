/* Kiểm thử hai hàm Netlify nối trang web với Apps Script.
   Chạy: node scripts/test_gas_netlify.mjs

   Apps Script thật không gọi được từ hộp cát, nên dựng một máy chủ giả đóng
   vai Web App: nó ghi lại mọi request nhận được, để soát xem hàm Netlify gửi
   đúng những gì.

   Phép thử quan trọng nhất trong tệp này là cái cuối cùng: đổi ma_ctv trên URL
   KHÔNG được làm đổi dữ liệu trả về. Đó là toàn bộ nội dung mục 13 của đặc tả,
   và nó là loại lỗi mà nhìn mã bằng mắt rất dễ tin là đã đúng. */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

process.env.CTV_TOKEN_SECRET = 'chuoi-bi-mat-dai-hon-16-ky-tu-de-test';
process.env.GAS_KHOA_NOI_BO = 'khoa-noi-bo-rat-dai-de-test-0123456789';
process.env.TELEGRAM_BOT_TOKEN = '';   // tắt Telegram trong kiểm thử

let dat = 0, truot = 0;
const kiemTra = (t, dk, ct) => {
  if (dk) { dat++; console.log('  đạt   ' + t); }
  else { truot++; console.log('  TRƯỢT ' + t + (ct !== undefined ? '  → ' + ct : '')); }
};

/* ── Apps Script giả ───────────────────────────────────────────────────── */
const NHAN = [];            // mọi request đã nhận
let CHE_DO = 'ok';          // 'ok' | 'hong' | 'html'

const may = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let than = '';
  for await (const c of req) than += c;
  const p = Object.fromEntries(
    new URLSearchParams(req.method === 'POST' ? than : u.search)
  );
  NHAN.push({ method: req.method, action: p.action, p });

  if (CHE_DO === 'hong') { res.writeHead(500); res.end('{"ok":false,"error":"hỏng"}'); return; }
  if (CHE_DO === 'html') { res.writeHead(200, {'Content-Type':'text/html'});
                           res.end('<html>Google login page</html>'); return; }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (p.action === 'createOrder') {
    res.end(JSON.stringify({ ok: true, orderId: p.orderId || 'DBV260917000001',
      ctvId: p.affiliateId || '', phi_goc: 437000, vat: 43700, tong_phi: 480700 }));
  } else if (p.action === 'dangKyCtv' || p.action === 'capNhatCtv') {
    res.end(JSON.stringify({ ok: true, ctvId: p.ctvId, da_doi: ['Số tài khoản'] }));
  } else if (p.action === 'dashboard') {
    res.end(JSON.stringify({ ok: true, cap_nhat: '2026-09-17 10:00:00',
      tong_quan: { so_don: 3, so_don_da_tra: 2, doanh_thu: 1354100,
                   hoa_hong_phat_sinh: 492400, hoa_hong_cho_duyet: 317600,
                   hoa_hong_da_tra: 174800 },
      don: [{ order_id: 'D1-' + p.ma_ctv, ngay_tao: '2026-09-15', bien_so: '30A-1',
              san_pham: 'TNDS ô tô 5 chỗ', nhom_xe: 'oto', tong_phi: 480700,
              payment_status: 'PAID', gcn_status: 'ISSUED', commission: 174800,
              commission_status: 'COMMISSION_APPROVED', nguon_ghi_nhan: 'cookie_link' }] }));
  } else {
    res.end(JSON.stringify({ ok: false, error: 'không rõ hành động' }));
  }
});
await new Promise((ok) => may.listen(8901, ok));
process.env.GAS_URL = 'http://127.0.0.1:8901/exec';

const gasDon = require(path.join(GOC, 'netlify/functions/gas-don.js'));
const gasCtv = require(path.join(GOC, 'netlify/functions/gas-ctv.js'));
const auth   = require(path.join(GOC, 'netlify/functions/ctv-auth.js'));

const goiDon = (than) => gasDon.handler({
  httpMethod: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(than).toString(),
});

try {

console.log('\n── Ghi đơn: gas-don ──');
{
  NHAN.length = 0;
  const r = await goiDon({
    'ma-don':'DBV260917000123', 'ma-ctv':'K7X2', 'ho-ten':'Nguyễn Văn A',
    'sdt':'0912345678', 'bien-so':'30A12345', 'san-pham':'TNDS ô tô 5 chỗ',
    'loai-xe':'Ô tô', 'tong-phi':'480700', 'phi-goc':'437000',
    'nguon-ghi-nhan':'cookie_link',
  });
  const d = JSON.parse(r.body);
  kiemTra('trả 200 và mã đơn', r.statusCode === 200 && d.orderId === 'DBV260917000123', r.body);

  const g = NHAN.find((x) => x.action === 'createOrder');
  kiemTra('gửi sang Apps Script bằng POST', g && g.method === 'POST');
  kiemTra('có kèm khoá nội bộ', g && g.p.khoa === process.env.GAS_KHOA_NOI_BO);
  kiemTra('đổi tên trường tiếng Việt sang tên đặc tả',
    g && g.p.customerName === 'Nguyễn Văn A' && g.p.plate === '30A12345', JSON.stringify(g && g.p));
  kiemTra('suy ra nhóm xe "oto" từ loại xe "Ô tô"', g && g.p.nhomXe === 'oto', g && g.p.nhomXe);
  kiemTra('KHÔNG trả khoá nội bộ về trình duyệt',
    r.body.indexOf(process.env.GAS_KHOA_NOI_BO) < 0);
}
{
  NHAN.length = 0;
  const r = await goiDon({ 'loai-xe':'Xe máy / mô tô', 'tong-phi':'66000',
    'ho-ten':'B','sdt':'0912345678','bien-so':'29X1','san-pham':'TNDS xe máy' });
  const g = NHAN.find((x) => x.action === 'createOrder');
  kiemTra('suy ra nhóm xe "moto" từ "Xe máy / mô tô"', g && g.p.nhomXe === 'moto', g && g.p.nhomXe);
  kiemTra('vẫn trả 200', r.statusCode === 200);
}
{
  CHE_DO = 'hong';
  const r = await goiDon({ 'ho-ten':'C','sdt':'0912345678','bien-so':'30A2',
    'san-pham':'TNDS','tong-phi':'480700' });
  const d = JSON.parse(r.body);
  kiemTra('Apps Script hỏng → trả 502 kèm cờ dự phòng',
    r.statusCode === 502 && d.du_phong === true, r.body);
  kiemTra('KHÔNG lộ chi tiết hệ thống ra trình duyệt',
    r.body.indexOf('127.0.0.1') < 0 && r.body.indexOf('khoa') < 0, r.body);
  CHE_DO = 'ok';
}
{
  CHE_DO = 'html';
  const r = await goiDon({ 'ho-ten':'D','sdt':'0912345678','bien-so':'30A3',
    'san-pham':'TNDS','tong-phi':'480700' });
  kiemTra('Apps Script trả HTML (chưa deploy / sai quyền) → 502, không vỡ',
    r.statusCode === 502, r.body);
  CHE_DO = 'ok';
}
{
  const r = await gasDon.handler({ httpMethod: 'GET', headers: {}, body: '' });
  kiemTra('GET vào gas-don → 405', r.statusCode === 405);
}

console.log('\n── Đăng ký CTV có được ghi sang sheet không ──');
let TOKEN = '', MA = '';
{
  NHAN.length = 0;
  const r = await auth.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({
    hanh_dong: 'dang-ky', ho_ten: 'Lưu Lê Hoàng', sdt: '0904753830', mat_khau: 'matkhau123',
  })});
  const d = JSON.parse(r.body);
  kiemTra('đăng ký thành công', r.statusCode === 201 && !!d.token, r.body.slice(0, 150));
  TOKEN = d.token; MA = d.ctv.ma_ctv;

  const g = NHAN.find((x) => x.action === 'dangKyCtv');
  kiemTra('có gọi Apps Script thêm CTV vào sheet', !!g);
  kiemTra('gửi đúng mã và số điện thoại',
    g && g.p.ctvId === MA && g.p.phone === '0904753830', g && JSON.stringify(g.p));
}
{
  /* Apps Script hỏng thì tài khoản VẪN phải tạo được — nếu không, một trục
     trặc của Google chặn hẳn việc tuyển cộng tác viên. */
  CHE_DO = 'hong';
  const r = await auth.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({
    hanh_dong: 'dang-ky', ho_ten: 'Trần B', sdt: '0912000999', mat_khau: 'matkhau123',
  })});
  kiemTra('Apps Script hỏng vẫn đăng ký được tài khoản', r.statusCode === 201, r.body.slice(0,120));
  CHE_DO = 'ok';
}

console.log('\n── Bảng điều khiển: gas-ctv ──');
{
  NHAN.length = 0;
  const r = await gasCtv.handler({
    httpMethod: 'GET', headers: { authorization: 'Bearer ' + TOKEN },
    queryStringParameters: { viec: 'dashboard' },
  });
  const d = JSON.parse(r.body);
  kiemTra('trả 200', r.statusCode === 200, r.body.slice(0, 200));
  kiemTra('có hồ sơ cộng tác viên', d.ctv && d.ctv.ma_ctv === MA);
  kiemTra('KHÔNG trả mật khẩu băm hay muối',
    !/mat_khau_bam|muoi/.test(r.body), r.body.slice(0, 200));
  kiemTra('quy đổi doanh thu từ tổng quan Sheets',
    d.thong_ke.doanh_thu_ghi_nhan === 1354100, d.thong_ke.doanh_thu_ghi_nhan);
  kiemTra('hoa hồng khả dụng = phần đã chốt chưa trả',
    d.thong_ke.hoa_hong_kha_dung === 317600, d.thong_ke.hoa_hong_kha_dung);
  kiemTra('đã rút = phần đã trả', d.thong_ke.hoa_hong_da_rut === 174800);
  kiemTra('đơn chờ = tổng trừ đã thu', d.thong_ke.don_cho_thanh_toan === 1);
  kiemTra('đổi tên trường đơn sang tên bảng điều khiển đang dùng',
    d.don_hang[0] && d.don_hang[0].ma_don && d.don_hang[0].tong_phi === 480700,
    JSON.stringify(d.don_hang[0]));
  kiemTra('đơn có kèm hoa hồng', d.don_hang[0].hoa_hong === 174800);
  kiemTra('cờ hoa hồng đã bật', d.hoa_hong_dang_bat === true);
}
{
  const r = await gasCtv.handler({ httpMethod: 'GET', headers: {},
    queryStringParameters: { viec: 'dashboard' } });
  kiemTra('không có token → 401', r.statusCode === 401);
}
{
  const r = await gasCtv.handler({ httpMethod: 'GET',
    headers: { authorization: 'Bearer token-bia-dat' },
    queryStringParameters: { viec: 'dashboard' } });
  kiemTra('token bịa → 401', r.statusCode === 401);
}
{
  const r = await gasCtv.handler({ httpMethod: 'GET',
    headers: { authorization: 'Bearer ' + TOKEN },
    queryStringParameters: { viec: 'xoa-het' } });
  kiemTra('việc không hợp lệ → 400, KHÔNG phải 401 (401 làm tự đăng xuất)',
    r.statusCode === 400, r.statusCode);
}
{
  CHE_DO = 'hong';
  const r = await gasCtv.handler({ httpMethod: 'GET',
    headers: { authorization: 'Bearer ' + TOKEN },
    queryStringParameters: { viec: 'dashboard' } });
  const d = JSON.parse(r.body);
  kiemTra('Apps Script hỏng → vẫn 200 kèm cảnh báo, không phải trang lỗi trắng',
    r.statusCode === 200 && !!d.canh_bao, r.body.slice(0, 160));
  kiemTra('cảnh báo nói rõ là lỗi hệ thống, không phải CTV chưa có đơn',
    /lỗi phía hệ thống/.test(d.canh_bao), d.canh_bao);
  kiemTra('không bịa ra số liệu khi chưa đọc được', d.thong_ke === null);
  CHE_DO = 'ok';
}

console.log('\n── Đổi tài khoản nhận tiền phải đẩy sang sheet ──');
{
  const toi = require(path.join(GOC, 'netlify/functions/ctv-toi.js'));
  NHAN.length = 0;
  const r = await toi.handler({
    httpMethod: 'POST', headers: { authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ ngan_hang: 'Techcombank', so_tai_khoan: '19036512345',
                           chu_tai_khoan: 'LUU LE HOANG' }),
  });
  kiemTra('lưu hồ sơ thành công', r.statusCode === 200, r.body.slice(0, 120));
  const g = NHAN.find((x) => x.action === 'capNhatCtv');
  kiemTra('CÓ đẩy sang sheet CTV (nếu không, chi trả sẽ vào tài khoản cũ)', !!g);
  kiemTra('gửi đúng số tài khoản mới',
    g && g.p.soTaiKhoan === '19036512345', g && g.p.soTaiKhoan);
  kiemTra('gửi đúng mã CTV', g && g.p.ctvId === MA, g && g.p.ctvId);

  CHE_DO = 'hong';
  const r2 = await toi.handler({
    httpMethod: 'POST', headers: { authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ ngan_hang: 'MB Bank' }),
  });
  kiemTra('Apps Script hỏng vẫn lưu được hồ sơ', r2.statusCode === 200, r2.body.slice(0,120));
  CHE_DO = 'ok';
}

console.log('\n── Mục 13 của đặc tả: không đổi URL để xem dữ liệu người khác ──');
{
  NHAN.length = 0;
  const r = await gasCtv.handler({
    httpMethod: 'GET', headers: { authorization: 'Bearer ' + TOKEN },
    /* Cố tình nhét mã của người khác vào URL */
    queryStringParameters: { viec: 'dashboard', ma_ctv: 'XXXX', ctv_id: 'XXXX' },
  });
  const d = JSON.parse(r.body);
  const g = NHAN.find((x) => x.action === 'dashboard');

  kiemTra('mã gửi sang Apps Script lấy từ TOKEN, không lấy từ URL',
    g && g.p.ma_ctv === MA, g && g.p.ma_ctv);
  kiemTra('mã XXXX trên URL bị bỏ qua hoàn toàn',
    g && g.p.ma_ctv !== 'XXXX');
  kiemTra('dữ liệu trả về là của đúng người đăng nhập',
    d.ctv.ma_ctv === MA && d.don_hang[0].ma_don === 'D1-' + MA,
    d.don_hang[0] && d.don_hang[0].ma_don);
}

} finally {
  may.close();
}

console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
