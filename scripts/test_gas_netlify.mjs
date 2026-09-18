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
    /* Mã bắt đầu bằng LAP giả lập trường hợp trang web gửi lại một đơn đã có:
       Apps Script trả về chính đơn cũ kèm cờ trung_lap thay vì tạo dòng mới. */
    if (String(p.orderId || '').indexOf('LAP') === 0) {
      res.end(JSON.stringify({ ok: true, orderId: p.orderId, ctvId: p.affiliateId || '',
        phi_goc: 437000, vat: 43700, tong_phi: 480700,
        trung_lap: true, trang_thai_khach: p.trangThaiKhach || '' }));
      return;
    }
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
  } else if (p.action === 'adminDon') {
    res.end(JSON.stringify({ ok: true, cap_nhat: '2026-09-18 09:00:00',
      don: [{ order_id: 'DBV260918000001', ctv_id: '2X84', ngay_tao: '2026-09-18',
              khach_hang: 'Đỗ Văn Hùng', sdt: '0901111222', dia_chi: '12 Trần Duy Hưng',
              bien_so: '30H12345', so_khung: 'RL4MC1234N5006789', so_may: 'K7MA812Q054321',
              phi_goc: 437000, vat: 43700, tong_phi: 480700,
              payment_status: 'PAYMENT_PENDING', gcn_status: '' }] }));
  } else if (p.action === 'adminCtv') {
    res.end(JSON.stringify({ ok: true, cap_nhat: '2026-09-18 09:00:00',
      ctv: [{ ma_ctv: '2X84', ho_ten: 'Lê Văn Cường', sdt: '0909000111',
              trang_thai: 'ACTIVE', ngan_hang: 'Techcombank', so_tai_khoan: '19001234',
              chu_tai_khoan: 'LE VAN CUONG', so_don: 2, so_don_da_tra: 1,
              doanh_thu: 480700, hoa_hong_cho_duyet: 174800, hoa_hong_da_tra: 0 }],
      don_theo_ctv: { '2X84': [{ order_id: 'DBV260918000001', ngay_tao: '2026-09-18',
              bien_so: '30H12345', phi_goc: 437000, tong_phi: 480700,
              commission: 174800, payment_status: 'PAID' }] } }));
  } else if (p.action === 'capNhatDon') {
    res.end(JSON.stringify({ ok: true, orderId: p.orderId,
      da_doi: Object.keys(JSON.parse(p.truong || '{}')), tu_choi: [] }));
  } else if (p.action === 'updateOrderStatus') {
    res.end(JSON.stringify({ ok: true, orderId: p.orderId,
      hoa_hong: { sinh: true, so_tien: 174800 } }));
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

/* Lỗi thật ngày 17/09/2026: trang web gửi 'nhom-xe' theo NHÓM TÍNH PHÍ
   (nkd / kd / tai / khac), hàm này lấy thẳng, nên đơn ô tô vào sổ với nhóm
   "nkd". COMMISSION_RULES chỉ có oto và moto → không khớp quy tắc nào → không
   tính được hoa hồng. Bốn nhóm phí của ô tô đều phải quy về 'oto'. */
{
  for (const nhom of ['nkd', 'kd', 'tai', 'khac']) {
    NHAN.length = 0;
    await goiDon({ 'nhom-xe':nhom, 'loai-xe':'Ô tô', 'tong-phi':'480700',
      'phi-goc':'437000', 'ho-ten':'E','sdt':'0912345678','bien-so':'30A9',
      'san-pham':'TNDS' });
    const g = NHAN.find((x) => x.action === 'createOrder');
    kiemTra('nhóm phí "' + nhom + '" vẫn quy về nhóm hoa hồng "oto"',
      g && g.p.nhomXe === 'oto', g && g.p.nhomXe);
  }
}
{
  NHAN.length = 0;
  await goiDon({ 'nhom-xe':'moto', 'loai-xe':'Xe máy / mô tô', 'tong-phi':'66000',
    'ho-ten':'F','sdt':'0912345678','bien-so':'29X2','san-pham':'TNDS xe máy' });
  const g = NHAN.find((x) => x.action === 'createOrder');
  kiemTra('nhóm "moto" do trang web gửi thì giữ nguyên',
    g && g.p.nhomXe === 'moto', g && g.p.nhomXe);
}
/* Hồ sơ cấp giấy chứng nhận: trang web vẫn luôn gửi, nhưng trước 18/09/2026
   hàm này không chuyển tiếp nên số khung / số máy / ngày hiệu lực / địa chỉ
   giao giấy rơi mất — nhân viên phát hành không cấp nổi giấy. */
{
  NHAN.length = 0;
  await goiDon({ 'loai-xe':'Ô tô', 'nhom-xe':'nkd', 'chi-tiet-xe':'Xe dưới 6 chỗ không KDVT',
    'san-pham':'Bảo hiểm bắt buộc TNDS chủ xe cơ giới', 'tong-phi':'480700',
    'phi-goc':'437000', 'ho-ten':'G','sdt':'0912345678','bien-so':'30A8',
    'so-khung':'RL4MC1234N5006789', 'so-may':'K7MA812Q054321',
    'hieu-xe':'Toyota', 'nam-sx':'2021', 'so-cho':'5', 'thoi-han':'1 năm',
    'ngay-hieu-luc':'19/09/2026', 'ngay-het-han':'19/09/2027',
    'dia-chi':'12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    'xuat-hoa-don':'Có', 'ten-cty':'Công ty TNHH ABC', 'mst':'0101234567',
    'dia-chi-cty':'99 Láng Hạ', 'email-hd':'ketoan@abc.vn',
    'dia-chi-giao':'12 Nguyễn Trãi', 'nguoi-nhan':'Trần Thị B', 'sdt-nhan':'0987654321' });
  const g = NHAN.find((x) => x.action === 'createOrder');
  kiemTra('số khung được chuyển tiếp', g && g.p.soKhung === 'RL4MC1234N5006789', g && g.p.soKhung);
  kiemTra('số máy được chuyển tiếp', g && g.p.soMay === 'K7MA812Q054321', g && g.p.soMay);
  kiemTra('ngày hiệu lực được chuyển tiếp', g && g.p.ngayHieuLuc === '19/09/2026', g && g.p.ngayHieuLuc);
  kiemTra('địa chỉ khách được chuyển tiếp',
    g && g.p.diaChi === '12 Nguyễn Trãi, Thanh Xuân, Hà Nội', g && g.p.diaChi);
  kiemTra('thông tin xuất hoá đơn được chuyển tiếp',
    g && g.p.xuatHoaDon === 'Có' && g.p.mst === '0101234567', g && g.p.mst);
  kiemTra('địa chỉ giao giấy và người nhận được chuyển tiếp',
    g && g.p.nguoiNhan === 'Trần Thị B' && g.p.sdtNhan === '0987654321', g && g.p.nguoiNhan);
  kiemTra('chi tiết xe đi riêng, KHÔNG dính vào tên sản phẩm',
    g && g.p.chiTietXe === 'Xe dưới 6 chỗ không KDVT' &&
    g.p.product === 'Bảo hiểm bắt buộc TNDS chủ xe cơ giới', g && g.p.product);
}

/* Trang cấp đơn gửi CÙNG MỘT MÃ ĐƠN nhiều lần (lúc sinh QR, lúc khách báo đã
   chuyển khoản, lúc đăng ký nhận bản giấy). Sổ cái chỉ được có một dòng. */
{
  NHAN.length = 0;
  const r = await goiDon({ 'ma-don':'LAP260917000999', 'trang-thai':'Khách báo đã chuyển khoản',
    'loai-xe':'Ô tô', 'tong-phi':'480700', 'phi-goc':'437000',
    'ho-ten':'H','sdt':'0912345678','bien-so':'30A7','san-pham':'TNDS' });
  const g = NHAN.find((x) => x.action === 'createOrder');
  const d = JSON.parse(r.body);
  kiemTra('trạng thái khách được chuyển tiếp sang Apps Script',
    g && g.p.trangThaiKhach === 'Khách báo đã chuyển khoản', g && g.p.trangThaiKhach);
  kiemTra('đơn gửi lại → 200 kèm cờ trung_lap',
    r.statusCode === 200 && d.trung_lap === true, r.body);
  kiemTra('đơn gửi lại giữ nguyên mã cũ, không sinh mã mới',
    d.orderId === 'LAP260917000999', d.orderId);
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

console.log('\n── Màn hình quản trị: gas-admin ──');
{
  process.env.DASHBOARD_KEY = 'khoa-quan-tri-de-test';
  const admin = require(path.join(GOC, 'netlify/functions/gas-admin.js'));
  const goi = (ev) => admin.handler(Object.assign(
    { httpMethod: 'GET', headers: { 'x-dashboard-key': 'khoa-quan-tri-de-test' },
      queryStringParameters: {}, body: '' }, ev));

  {
    const r = await goi({ headers: {} });
    kiemTra('không có khoá quản trị → 401', r.statusCode === 401, r.statusCode);
    kiemTra('KHÔNG lộ khoá nội bộ Apps Script trong lỗi',
      r.body.indexOf(process.env.GAS_KHOA_NOI_BO) < 0);
  }
  {
    const r = await goi({ headers: { 'x-dashboard-key': 'sai-khoa' } });
    kiemTra('sai khoá quản trị → 401', r.statusCode === 401, r.statusCode);
  }
  {
    NHAN.length = 0;
    const r = await goi({ queryStringParameters: { view: 'don' } });
    const d = JSON.parse(r.body);
    const g = NHAN.find((x) => x.action === 'adminDon');
    kiemTra('view=don gọi adminDon kèm khoá nội bộ',
      g && g.p.khoa === process.env.GAS_KHOA_NOI_BO);
    kiemTra('trả về đơn đầy đủ cho nhân viên nhập liệu',
      r.statusCode === 200 && d.don[0].so_khung === 'RL4MC1234N5006789', r.body.slice(0, 200));
    kiemTra('KHÔNG trả khoá nội bộ về trình duyệt',
      r.body.indexOf(process.env.GAS_KHOA_NOI_BO) < 0);
  }
  {
    NHAN.length = 0;
    const r = await goi({ queryStringParameters: { view: 'ctv' } });
    const d = JSON.parse(r.body);
    kiemTra('view=ctv trả hồ sơ CTV kèm danh sách đơn',
      r.statusCode === 200 && d.ctv[0].ma_ctv === '2X84' &&
      d.don_theo_ctv['2X84'].length === 1, r.body.slice(0, 200));
    /* Màn hình CTV dùng để quản lý hoa hồng, không phải để tra khách hàng.
       Dữ liệu cá nhân của khách không được đi qua đường này. */
    kiemTra('màn hình CTV KHÔNG mang tên/SĐT/địa chỉ khách',
      r.body.indexOf('Đỗ Văn Hùng') < 0 && r.body.indexOf('0901111222') < 0 &&
      r.body.indexOf('Trần Duy Hưng') < 0);
  }
  {
    const r = await goi({ queryStringParameters: { view: 'linh-tinh' } });
    kiemTra('view lạ → 400', r.statusCode === 400, r.statusCode);
  }
  {
    NHAN.length = 0;
    const r = await goi({ httpMethod: 'POST',
      headers: { 'x-dashboard-key': 'khoa-quan-tri-de-test', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'hoSo', orderId: 'DBV260918000001',
        truong: { 'Số khung': 'ABC123', 'Ghi chú': 'sửa tay' } }) });
    const d = JSON.parse(r.body);
    const g = NHAN.find((x) => x.action === 'capNhatDon');
    kiemTra('sửa hồ sơ đơn đi qua capNhatDon', !!g);
    kiemTra('danh sách trường gửi đi dạng JSON',
      g && JSON.parse(g.p.truong)['Số khung'] === 'ABC123', g && g.p.truong);
    kiemTra('trả về danh sách trường đã đổi',
      r.statusCode === 200 && d.da_doi.length === 2, r.body);
  }
  {
    NHAN.length = 0;
    const r = await goi({ httpMethod: 'POST',
      headers: { 'x-dashboard-key': 'khoa-quan-tri-de-test', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'trangThai', orderId: 'DBV260918000001',
        paymentStatus: 'PAID', bankRef: 'FT26091812345' }) });
    const d = JSON.parse(r.body);
    const g = NHAN.find((x) => x.action === 'updateOrderStatus');
    kiemTra('xác nhận tiền đi qua updateOrderStatus (có chốt chặn Bank_Ref)',
      g && g.p.bankRef === 'FT26091812345', g && g.p.bankRef);
    kiemTra('trả lại kết quả sinh hoa hồng cho màn hình',
      r.statusCode === 200 && d.hoa_hong.so_tien === 174800, r.body);
  }
  {
    const r = await goi({ httpMethod: 'POST',
      headers: { 'x-dashboard-key': 'khoa-quan-tri-de-test', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'linh-tinh', orderId: 'X' }) });
    kiemTra('action lạ → 400', r.statusCode === 400, r.statusCode);
  }
  {
    const r = await goi({ httpMethod: 'POST',
      headers: { 'x-dashboard-key': 'khoa-quan-tri-de-test', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'hoSo' }) });
    kiemTra('thiếu mã đơn → 400', r.statusCode === 400, r.statusCode);
  }
}

} finally {
  may.close();
}

console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
