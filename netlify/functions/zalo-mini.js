/* DBV247 — Cổng máy chủ cho Zalo Mini App "Bảo hiểm DBV"
   ---------------------------------------------------------------------------
   POST /.netlify/functions/zalo-mini?hanh-dong=<việc>     (JSON)

   lead            khách để lại SĐT nhận báo giá (mọi sản phẩm)
   ctv             tra tên rút gọn của CTV theo mã
   bao-phi         báo phí TNDS từ biểu phí gốc (bước "Thông tin" của luồng mua)
   tao-don-tnds    khách tự nhập thông tin xe → ghi đơn vào sổ chính (gas-don)
                   → trả tham số + MAC cho Checkout SDK (chuyển khoản)
   gan-don-zalo    lưu mã đơn Checkout SDK của một đơn (để webhook tra ngược)
   don             "Đơn của tôi": đơn + file PDF của chính người dùng
   ve-tai-len      link ký sẵn để openMediaPicker tải PDF lên
   xoa-tep         khách xoá file do chính mình tải lên
   ctv-dang-nhap   CTV đăng nhập (dùng lại ctv-auth.js — cùng tài khoản với dbv247.com.vn/ctv)
   ctv-dang-ky     CTV đăng ký mới (dùng lại ctv-auth.js)
   ctv-du-lieu     dashboard CTV (dùng lại gas-ctv.js)
   ctv-nhan-tien   CTV khai/đổi nơi nhận hoa hồng: ví ZaloPay hoặc ngân hàng
                   (dùng lại ctv-toi.js — bắt nhập lại mật khẩu)
   lien-ket-sdt    khách xác minh SĐT Zalo → nhận các hợp đồng mua NGOÀI Zalo
                   mà nhân viên đã gắn PDF theo đúng số đó (zalo-mini-admin gan-ngoai)
   nhap-ma-lien-ket  khách nhập mã liên kết 8 ký tự nhân viên gửi → nhận hợp đồng mua
                   ngoài Zalo (dùng khi chưa xác minh được SĐT)
   dang-ky-oa      lưu ID của khách theo OA (idByOA) để OA nhắn khi có giấy
                   chứng nhận — gọi sau khi khách bấm Quan tâm OA

   NGUYÊN TẮC
   • Người dùng là ai do MÁY CHỦ hỏi Zalo bằng access token — không tin ID do
     Mini App khai. Thiếu điều này là ai cũng đọc được đơn của người khác.
   • Phí do MÁY CHỦ tính từ biểu phí gốc của website (assets/cap-don-tnds.js)
     rồi Apps Script tính lại lần nữa. Số tiền Mini App gửi lên bị bỏ qua.
   • Đơn đi vào đúng sổ chính của website: hoa hồng, đối soát, dashboard CTV
     không phải sửa gì.
*/

'use strict';

const C = require('./lib/zalo-mini-chung');

const BANK = {
  nganHang: 'Techcombank',
  soTaiKhoan: '123568568',
  chuTaiKhoan: 'Công ty cổ phần Tập đoàn Bảo hiểm DBV - Chi nhánh DBV Thành Đô',
};
const API_GOC = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '') + '/.netlify/functions';
const dinhDang = (n) => (Math.round(Number(n)) || 0).toLocaleString('vi-VN');

/* ═════════════ LEAD ═════════════ */
async function xuLyLead(p) {
  const sanPham = String(p.sanPham || '').trim().slice(0, 160);
  const phi = Number(p.phi) || 0;
  let sdt = null;
  let cachLay = '';
  if (p.token && p.accessToken) {
    sdt = await C.doiTokenRaSdt(p.accessToken, p.token);
    cachLay = 'Zalo chia sẻ';
    if (!sdt) {
      return C.json(502, {
        error: 'Chưa lấy được số điện thoại từ Zalo. Anh/chị bấm "Nhập số điện thoại khác" hoặc gọi ' + C.HOTLINE + '.',
      });
    }
  } else {
    sdt = C.chuanHoaSdt(p.soDienThoai);
    cachLay = 'Khách tự nhập';
    if (!sdt) return C.json(400, { error: 'Số điện thoại chưa đúng (10 số, bắt đầu bằng 0).' });
  }
  const maCtv = C.chuanHoaMaCtv(p.ctv);
  const nhuCau = sanPham + (phi ? ' · phí tham khảo ' + dinhDang(phi) + ' đ' : '');
  /* Màn hình "Tư vấn bảo hiểm" gửi thêm vài câu trả lời ngắn — đưa vào
     transcript để tư vấn viên đọc trước khi gọi. Không nhận thông tin sức khoẻ. */
  const cat = (v) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const them = [
    p.doiTuong && 'Muốn bảo vệ: ' + cat(p.doiTuong),
    p.nganSach && 'Ngân sách dự kiến: ' + cat(p.nganSach),
    p.thoiGian && 'Giờ tiện liên hệ: ' + cat(p.thoiGian),
    p.ghiChu && 'Khách ghi: ' + String(p.ghiChu).trim().slice(0, 300),
  ].filter(Boolean);

  const form = new URLSearchParams();
  form.set('form-name', 'chatbot-lead');
  form.set('name', '(khách Zalo Mini App)');
  form.set('phone', sdt);
  form.set('need', nhuCau.slice(0, 200) || '(chưa rõ)');
  form.set('page', 'Zalo Mini App');
  form.set('transcript',
    'Nguồn: Zalo Mini App Bảo hiểm DBV247\nSố điện thoại: ' + cachLay + '\nSản phẩm: ' + (sanPham || '(chưa rõ)') +
    (phi ? '\nPhí tham khảo khách đã xem: ' + dinhDang(phi) + ' đ (đã gồm VAT)' : '') +
    (them.length ? '\n' + them.join('\n') : ''));
  form.set('utm_source', 'zalo-mini-app');
  form.set('phieu-ai', 'khong');
  if (maCtv.length === 4) {
    form.set('ma-ctv', maCtv);
    form.set('nguon-ghi-nhan', 'zalo_mini_app');
  }
  try {
    const res = await fetch((process.env.URL || 'https://dbv247.com.vn'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!res.ok && res.status !== 303) {
      console.error('zalo-mini lead: Netlify Forms trả', res.status);
      return C.json(502, { error: 'Chưa gửi được thông tin. Anh/chị gọi giúp ' + C.HOTLINE + ' nhé.' });
    }
  } catch (err) {
    console.error('zalo-mini lead:', err);
    return C.json(502, { error: 'Chưa gửi được thông tin. Anh/chị gọi giúp ' + C.HOTLINE + ' nhé.' });
  }
  return C.json(200, { ok: true });
}

/* ═════════════ CTV: tên theo mã ═════════════ */
async function xuLyTenCtv(p) {
  const ma = C.chuanHoaMaCtv(p.ma);
  const kq = await require('./ctv-ten.js').handler({ httpMethod: 'GET', queryStringParameters: { ma } });
  return { statusCode: kq.statusCode, headers: Object.assign({}, kq.headers, C.CORS), body: kq.body };
}

/* ═════════════ ĐƠN TNDS ═════════════ */

/* Phí năm (chưa VAT) theo đúng biểu phí gốc trên website. */
async function phiNam(xe) {
  const B = await require('./lib/bieu-phi-tnds.js')._taiBieuPhi();
  if (xe.loai === 'moto') {
    const m = B.MOTO[xe.muc];
    return m ? { phi: m.f, nhan: m.t } : null;
  }
  if (xe.nhom === 'kd') {
    const n = parseInt(xe.soCho, 10);
    const phi = B.phiKD(n);
    return phi ? { phi, nhan: 'Xe kinh doanh vận tải ' + n + ' chỗ' } : null;
  }
  const bang = xe.nhom === 'tai' ? B.TAI : B.NKD;
  const m = bang[xe.muc];
  return m ? { phi: m.f, nhan: m.t } : null;
}

function ngayVN(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}
function ngayHetHan(iso, soNam) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  return m[3] + '/' + m[2] + '/' + (Number(m[1]) + soNam);
}

function kiemTraDon(p) {
  const loi = {};
  const re8 = /^[A-Za-z0-9]{6,8}$/;
  const sk = String(p.soKhung || '').replace(/[\s.\-]/g, '');
  const sm = String(p.soMay || '').replace(/[\s.\-]/g, '');
  if (!re8.test(sk)) loi.soKhung = 'Nhập 6–8 ký tự cuối của số khung.';
  if (!re8.test(sm)) loi.soMay = 'Nhập 6–8 ký tự cuối của số máy.';
  if (String(p.hoTen || '').trim().length < 3) loi.hoTen = 'Nhập họ tên chủ xe như trên đăng ký xe.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(p.email || '').trim())) loi.email = 'Email chưa đúng — giấy chứng nhận gửi về email này.';
  const hl = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(p.ngayHieuLuc || ''));
  if (!hl) loi.ngayHieuLuc = 'Chọn ngày bắt đầu hiệu lực.';
  else {
    const homNay = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    if (p.ngayHieuLuc < homNay) loi.ngayHieuLuc = 'Ngày hiệu lực không được trước hôm nay.';
  }
  return loi;
}

async function ghiSoChinh(goi) {
  /* Đường chính: gas-don.js → Apps Script → Google Sheets (cùng hàm website dùng). */
  try {
    const kq = await require('./gas-don.js').handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(goi),
    });
    const than = JSON.parse(kq.body || '{}');
    if (kq.statusCode === 200 && than.ok) return { ok: true, kq: than };
    console.error('zalo-mini tao-don: gas-don trả', kq.statusCode, than.error);
  } catch (err) {
    console.error('zalo-mini tao-don: gas-don lỗi', err.message);
  }
  /* Đường dự phòng giống website: Netlify Forms. Thà đơn nằm hai nơi còn hơn mất. */
  try {
    await fetch((process.env.URL || 'https://dbv247.com.vn'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(Object.assign({ 'form-name': 'dbv-capdon-tnds' }, goi)).toString(),
    });
  } catch (e) { /* đã ghi log ở trên */ }
  return { ok: false };
}

/* Báo phí cho bước "Thông tin" — cùng hàm phiNam() mà tạo đơn dùng, nên số
   khách thấy ở bước Kiểm tra trùng với số ghi vào đơn. */
async function xuLyBaoPhi(p) {
  const xe = p.xe || {};
  xe.loai = xe.loai === 'moto' ? 'moto' : 'oto';
  const soNam = xe.loai === 'moto' ? Math.min(Math.max(parseInt(xe.soNam, 10) || 1, 1), 3) : 1;
  let gia;
  try {
    gia = await phiNam(xe);
  } catch (err) {
    console.error('zalo-mini bao-phi:', err.message);
    return C.json(502, { error: 'Chưa tính được phí lúc này. Anh/chị thử lại sau ít phút.' });
  }
  if (!gia) return C.json(400, { error: 'Loại xe chưa hợp lệ, anh/chị chọn lại giúp.' });
  const phiGoc = Math.round(gia.phi * soNam);
  const vat = Math.round(phiGoc * 0.1);
  return C.json(200, { ok: true, nhan: gia.nhan, soNam, phiGoc, vat, tong: phiGoc + vat });
}

async function xuLyTaoDon(p) {
  /* Không xác minh được Zalo ID thì VẪN nhận đơn — mất đơn của khách tệ hơn
     nhiều so với việc đơn đó tạm không hiện trong "Đơn của tôi". */
  const nd = (await C.layNguoiDung(p.accessToken)) || { id: '', ten: '' };

  const xe = p.xe || {};
  xe.loai = xe.loai === 'moto' ? 'moto' : 'oto';
  const soNam = xe.loai === 'moto' ? Math.min(Math.max(parseInt(xe.soNam, 10) || 1, 1), 3) : 1;

  let gia;
  try {
    gia = await phiNam(xe);
  } catch (err) {
    console.error('zalo-mini tao-don: không tải được biểu phí', err.message);
    return C.json(502, { error: 'Chưa tính được phí lúc này. Anh/chị thử lại sau ít phút hoặc gọi ' + C.HOTLINE + '.' });
  }
  if (!gia) return C.json(400, { error: 'Loại xe chưa hợp lệ.' });

  const loi = kiemTraDon(p);
  let sdt = null;
  if (p.tokenSdt) sdt = await C.doiTokenRaSdt(p.accessToken, p.tokenSdt);
  if (!sdt) sdt = C.chuanHoaSdt(p.sdt);
  if (!sdt) loi.sdt = 'Số điện thoại chưa đúng (10 số, bắt đầu bằng 0).';
  if (Object.keys(loi).length) return C.json(400, { error: 'Thông tin chưa đủ, anh/chị kiểm tra lại giúp.', loi });

  const phiGoc = Math.round(gia.phi * soNam);
  const vat = Math.round(phiGoc * 0.1);
  let tong = phiGoc + vat;

  const maDon = C.maDonMoi();
  const maCtv = C.chuanHoaMaCtv(p.ctv);
  const bienSo = String(p.bienSo || '').toUpperCase().replace(/\s+/g, '').slice(0, 15);
  const hd = p.hoaDon || {};

  const goi = {
    'ma-don': maDon,
    'san-pham': 'Bảo hiểm bắt buộc TNDS chủ xe cơ giới',
    'loai-xe': xe.loai === 'moto' ? 'Xe máy / mô tô' : 'Ô tô',
    'nhom-xe': xe.loai === 'moto' ? 'moto' : (xe.nhom || 'nkd'),
    'chi-tiet-xe': gia.nhan,
    'so-cho': xe.nhom === 'kd' ? String(parseInt(xe.soCho, 10) || '') : '',
    'thoi-han': soNam + ' năm',
    'phi-goc': String(phiGoc),
    'vat': String(vat),
    'tong-phi': String(tong),
    'bien-so': bienSo,
    'so-khung': String(p.soKhung || '').replace(/[\s.\-]/g, '').toUpperCase(),
    'so-may': String(p.soMay || '').replace(/[\s.\-]/g, '').toUpperCase(),
    'hieu-xe': String(p.hieuXe || '').slice(0, 60),
    'nam-sx': String(p.namSx || '').replace(/\D/g, '').slice(0, 4),
    'ngay-hieu-luc': ngayVN(p.ngayHieuLuc),
    'ngay-het-han': ngayHetHan(p.ngayHieuLuc, soNam),
    'ho-ten': String(p.hoTen || '').trim().slice(0, 100),
    'sdt': sdt,
    'email': String(p.email || '').trim().slice(0, 120),
    'dia-chi': String(p.diaChi || '').trim().slice(0, 200),
    'xuat-hoa-don': hd.tenCty ? 'Có' : 'Không',
    'ten-cty': String(hd.tenCty || '').slice(0, 160),
    'mst': String(hd.mst || '').replace(/[^\d-]/g, '').slice(0, 14),
    'dia-chi-cty': String(hd.diaChiCty || '').slice(0, 200),
    'email-hd': String(hd.emailHd || '').slice(0, 120),
    'trang-thai': 'Chờ thanh toán',
    'ma-ctv': maCtv.length === 4 ? maCtv : '',
    'nguon-ghi-nhan': maCtv.length === 4 ? 'zalo_mini_app' : '',
    'ghi-chu': ('[Zalo Mini App] ' + String(p.ghiChu || '')).trim().slice(0, 300),
  };

  const so = await ghiSoChinh(goi);
  /* Apps Script tính phí lại lần nữa — nếu nó ra số khác thì tin sổ chính. */
  if (so.ok && Number(so.kq.tong_phi) > 0 && Number(so.kq.tong_phi) !== tong) {
    console.error('zalo-mini tao-don: phí lệch sổ chính', tong, so.kq.tong_phi);
    tong = Number(so.kq.tong_phi);
  }

  /* Nội dung chuyển khoản — cùng quy tắc với trang cấp đơn website:
     có biển số:  "TNDS <BIỂN SỐ> <MÃ CTV>"   vd TNDS 30A12345 K7X2
     xe chưa biển: "<MÃ ĐƠN> <MÃ CTV>"        vd TNDS261022XY7K K7X2
     (mã đơn đã có sẵn tiền tố TNDS — không thêm lần nữa)
     Chỉ chữ in hoa + số, mã CTV đứng cuối vì app ngân hàng cắt chuỗi từ cuối. */
  const bienGon = bienSo.replace(/[^A-Z0-9]/g, '');
  const noiDungCk = ((bienGon ? 'TNDS ' + bienGon : maDon) + (goi['ma-ctv'] ? ' ' + goi['ma-ctv'] : '')).slice(0, 25);

  const kho = C.moKho();
  const banGhi = {
    maDon, zaloId: nd.id, tenZalo: nd.ten, taoLuc: new Date().toISOString(),
    sanPham: 'TNDS ' + (xe.loai === 'moto' ? 'xe máy' : 'ô tô') + ' · ' + gia.nhan,
    bienSo, phi: tong, phiGoc, vat, soNam,
    hieuLucTu: goi['ngay-hieu-luc'], hieuLucDen: goi['ngay-het-han'],
    hoTen: goi['ho-ten'], sdt, email: goi.email, maCtv: goi['ma-ctv'],
    noiDungCk, trangThai: 'cho_thanh_toan', soChinh: so.ok ? 'da_ghi' : 'du_phong_forms',
    maDonZalo: '', gcn: [], idOA: idOaHopLe(p.idOA),
  };
  await kho.setJSON('don/' + maDon, banGhi);
  if (nd.id) await kho.setJSON('kh/' + nd.id + '/don/' + maDon, { maDon, taoLuc: banGhi.taoLuc });
  if (nd.id && banGhi.idOA) await kho.setJSON('kh/' + nd.id + '/oa', { idOA: banGhi.idOA, luc: banGhi.taoLuc });

  /* Tham số Checkout SDK — kênh chuyển khoản ngân hàng (BANK). */
  let thanhToan = null;
  if (process.env.ZALO_CHECKOUT_PRIVATE_KEY) {
    const thamSo = {
      amount: tong,
      desc: ('Bảo hiểm TNDS ' + (bienSo || maDon)).slice(0, 100),
      item: [{ id: maDon, amount: tong }],
      extradata: JSON.stringify({ maDon, ctv: goi['ma-ctv'] || '' }),
      method: JSON.stringify({ id: process.env.ZALO_CHECKOUT_METHOD || 'BANK', isCustom: false }),
    };
    thanhToan = Object.assign({}, thamSo, { mac: C.macDonHang(thamSo) });
  }

  return C.json(200, {
    ok: true, maDon, tong, phiGoc, vat, noiDungCk,
    nganHang: BANK, thanhToan,
  });
}

async function layDonCuaToi(kho, zaloId, maDon) {
  const d = await kho.get('don/' + maDon, { type: 'json' });
  return d && d.zaloId === zaloId ? d : null;
}

async function xuLyGanDonZalo(p) {
  const nd = await C.layNguoiDung(p.accessToken);
  const kho = C.moKho();
  const d = await kho.get('don/' + String(p.maDon || ''), { type: 'json' });
  /* Đơn có chủ thì chỉ chủ đơn gắn được; đơn chưa xác minh được chủ thì cho gắn
     (chỉ là mã đơn Zalo để webhook tra ngược, không lộ dữ liệu gì). */
  if (!d || (d.zaloId && (!nd || nd.id !== d.zaloId))) return C.json(404, { error: 'Không tìm thấy đơn.' });
  const z = String(p.maDonZalo || '').slice(0, 64);
  if (!z) return C.json(400, { error: 'Thiếu mã đơn Zalo.' });
  d.maDonZalo = z;
  /* Webhook notify có thể tới trước — lấy lại kênh khách đã chọn. */
  const cho = await kho.get('zcho/' + z, { type: 'json' });
  if (cho && cho.method) d.kenhThanhToan = cho.method;
  await kho.setJSON('don/' + d.maDon, d);
  await kho.setJSON('zdon/' + z, { maDon: d.maDon });
  return C.json(200, { ok: true });
}

/* ═════════════ ID KHÁCH THEO OA ═════════════
   idByOA (getUserInfo) chỉ có khi khách đang Quan tâm OA DBV247. OA dùng nó để
   nhắn "giấy chứng nhận đã sẵn sàng". Tin nhắn KHÔNG chứa tên, biển số hay
   thông tin cá nhân — chỉ mã đơn và link mở Mini App — nên kể cả ID bị khai
   sai thì người nhận nhầm cũng không thấy dữ liệu của ai. */
function idOaHopLe(v) {
  const s = String(v || '').replace(/\D/g, '');
  return s.length >= 6 && s.length <= 32 ? s : '';
}

async function xuLyDangKyOa(p) {
  const idOA = idOaHopLe(p.idOA);
  if (!idOA) return C.json(400, { error: 'Thiếu ID theo OA.' });
  const nd = await C.layNguoiDung(p.accessToken);
  const kho = C.moKho();
  if (nd) await kho.setJSON('kh/' + nd.id + '/oa', { idOA, luc: new Date().toISOString() });
  const maDon = String(p.maDon || '');
  if (maDon) {
    const d = await kho.get('don/' + maDon, { type: 'json' });
    /* Đơn có chủ: chỉ chủ đơn sửa. Đơn chưa xác minh được chủ: chỉ điền khi còn trống. */
    const duocSua = d && (d.zaloId ? nd && nd.id === d.zaloId : !d.idOA);
    if (duocSua) {
      d.idOA = idOA;
      await kho.setJSON('don/' + maDon, d);
    }
  }
  return C.json(200, { ok: true });
}

/* ═════════════ HỢP ĐỒNG MUA NGOÀI ZALO ═════════════
   Nhân viên gắn PDF theo SĐT khách (zalo-mini-admin ?viec=gan-ngoai). Đơn nằm ở
   "cho/<sdt>/<maDon>" tới khi khách mở Mini App và XÁC MINH SĐT bằng Zalo
   (getPhoneNumber → máy chủ đổi token ra số qua Graph API). Chỉ số do Zalo
   xác nhận mới mở được đơn — khách KHÔNG tự gõ số, nên không ai nhận nhầm
   hợp đồng của người khác. */
function anSdt(sdt) {
  const s = String(sdt || '');
  return s.length >= 10 ? s.slice(0, 3) + '****' + s.slice(-3) : '';
}

/** Gắn đơn (chưa có chủ) vào tài khoản Zalo: chỉ mục đơn + mọi file GCN. */
async function nhanDonVeTaiKhoan(kho, d, zaloId) {
  d.zaloId = zaloId;
  d.lienKetLuc = new Date().toISOString();
  if (d.maLienKet) await kho.delete('ma/' + d.maLienKet);
  if (d.sdt) await kho.delete('cho/' + d.sdt + '/' + d.maDon);
  delete d.maLienKet;
  await kho.setJSON('kh/' + zaloId + '/don/' + d.maDon, { maDon: d.maDon, taoLuc: d.taoLuc });
  for (const g of d.gcn || []) {
    await kho.setJSON('kh/' + zaloId + '/tep/' + g.maTep, {
      maTep: g.maTep, ten: g.ten, kich: g.kich || 0, mime: 'application/pdf', luc: g.luc, nguon: 'dbv', maDon: d.maDon,
    });
  }
  await kho.setJSON('don/' + d.maDon, d);
}

async function xuLyLienKetSdt(p) {
  const nd = await C.layNguoiDung(p.accessToken);
  if (!nd) return C.json(401, { error: 'Chưa xác minh được tài khoản Zalo.' });
  const sdt = p.tokenSdt ? await C.doiTokenRaSdt(p.accessToken, p.tokenSdt) : null;
  if (!sdt) return C.json(400, { error: 'Chưa xác minh được số điện thoại. Anh/chị thử lại hoặc nhắn DBV.' });

  const kho = C.moKho();
  const luc = new Date().toISOString();
  await kho.setJSON('sdt/' + sdt, { zaloId: nd.id, luc });
  await kho.setJSON('kh/' + nd.id + '/sdt', { sdt, luc });

  const { blobs } = await kho.list({ prefix: 'cho/' + sdt + '/' });
  let soDon = 0;
  for (const b of blobs) {
    const d = await kho.get('don/' + b.key.split('/').pop(), { type: 'json' });
    if (d && !d.zaloId && d.sdt === sdt) {
      await nhanDonVeTaiKhoan(kho, d, nd.id);
      soDon++;
    }
    await kho.delete(b.key);
  }
  return C.json(200, { ok: true, soDon, sdt: anSdt(sdt) });
}

/* Mã liên kết: 8 ký tự ngẫu nhiên (32^8 ≈ 10^12 khả năng), một lần, hạn 30 ngày.
   Chỉ cần biết ai đang mở app (access token) — KHÔNG cần quyền số điện thoại. */
async function xuLyNhapMaLienKet(p) {
  const nd = await C.layNguoiDung(p.accessToken);
  if (!nd) return C.json(401, { error: 'Chưa xác minh được tài khoản Zalo.' });
  const ma = String(p.ma || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sai = C.json(404, { error: 'Mã liên kết chưa đúng hoặc đã hết hạn. Anh/chị kiểm tra lại hoặc nhắn DBV.' });
  if (ma.length !== 8) return sai;
  const kho = C.moKho();
  const m = await kho.get('ma/' + ma, { type: 'json' });
  if (!m || m.het < Date.now()) return sai;
  const d = await kho.get('don/' + m.maDon, { type: 'json' });
  if (!d) return sai;
  if (d.zaloId && d.zaloId !== nd.id) return C.json(409, { error: 'Mã này đã được dùng cho một tài khoản Zalo khác.' });
  if (!d.zaloId) await nhanDonVeTaiKhoan(kho, d, nd.id);
  return C.json(200, { ok: true, soDon: 1, sanPham: d.sanPham });
}

/* ═════════════ ĐƠN CỦA TÔI ═════════════ */
function urlTep(maTep, zaloId) {
  return API_GOC + '/zalo-mini-tep?ve=' + encodeURIComponent(C.kyVe({ t: maTep, z: zaloId, k: 'xem' }, 120));
}

async function xuLyDon(p) {
  const nd = await C.layNguoiDung(p.accessToken);
  if (!nd) return C.json(401, { error: 'Chưa xác minh được tài khoản Zalo.' });
  const kho = C.moKho();

  const { blobs: dsDon } = await kho.list({ prefix: 'kh/' + nd.id + '/don/' });
  const don = [];
  for (const b of dsDon) {
    const d = await kho.get('don/' + b.key.split('/').pop(), { type: 'json' });
    if (!d || d.zaloId !== nd.id) continue;
    don.push({
      id: d.maDon, sanPham: d.sanPham, bienSo: d.bienSo, phi: d.phi,
      hieuLucTu: d.hieuLucTu, hieuLucDen: d.hieuLucDen, taoLuc: d.taoLuc,
      trangThai: d.trangThai, noiDungCk: d.noiDungCk, nguon: d.nguon || 'zalo',
      gcn: (d.gcn || []).map((g) => ({ id: g.maTep, ten: g.ten, url: urlTep(g.maTep, nd.id) })),
    });
  }
  don.sort((a, b) => String(b.taoLuc).localeCompare(String(a.taoLuc)));

  const { blobs: dsTep } = await kho.list({ prefix: 'kh/' + nd.id + '/tep/' });
  const tep = [];
  for (const b of dsTep) {
    const t = await kho.get(b.key, { type: 'json' });
    if (!t) continue;
    tep.push({ id: t.maTep, ten: t.ten, kich: t.kich, luc: t.luc, nguon: t.nguon, maDon: t.maDon || '', url: urlTep(t.maTep, nd.id) });
  }
  tep.sort((a, b) => String(b.luc).localeCompare(String(a.luc)));

  const lk = await kho.get('kh/' + nd.id + '/sdt', { type: 'json' });
  return C.json(200, { ok: true, don, tep, ganBaoGia: { nganHang: BANK }, sdtLienKet: lk ? anSdt(lk.sdt) : '' });
}

async function xuLyVeTaiLen(p) {
  const nd = await C.layNguoiDung(p.accessToken);
  if (!nd) return C.json(401, { error: 'Chưa xác minh được tài khoản Zalo.' });
  const ve = C.kyVe({ z: nd.id, k: 'len' }, 15);
  return C.json(200, { ok: true, url: API_GOC + '/zalo-mini-tep?ve=' + encodeURIComponent(ve) });
}

async function xuLyXoaTep(p) {
  const nd = await C.layNguoiDung(p.accessToken);
  if (!nd) return C.json(401, { error: 'Chưa xác minh được tài khoản Zalo.' });
  const kho = C.moKho();
  const ma = String(p.maTep || '').replace(/[^A-Z0-9]/g, '');
  const t = await kho.get('kh/' + nd.id + '/tep/' + ma, { type: 'json' });
  if (!t) return C.json(404, { error: 'Không tìm thấy file.' });
  /* Giấy chứng nhận do DBV cấp thì khách không xoá được — đó là bản gốc. */
  if (t.nguon !== 'khach') return C.json(400, { error: 'Giấy chứng nhận do DBV cấp không xoá được.' });
  await kho.delete('tep/' + ma);
  await kho.delete('kh/' + nd.id + '/tep/' + ma);
  return C.json(200, { ok: true });
}

/* ═════════════ CTV ═════════════ */
async function goiCtvAuth(than) {
  const kq = await require('./ctv-auth.js').handler({
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(than),
  });
  return { statusCode: kq.statusCode, headers: Object.assign({}, kq.headers, C.CORS), body: kq.body };
}
const xuLyCtvDangNhap = (p) => goiCtvAuth({ hanh_dong: 'dang-nhap', sdt: p.sdt, mat_khau: p.matKhau });
const xuLyCtvDangKy = (p) => goiCtvAuth({ hanh_dong: 'dang-ky', ho_ten: p.hoTen, sdt: p.sdt, mat_khau: p.matKhau });

async function xuLyCtvDuLieu(p) {
  const kq = await require('./gas-ctv.js').handler({
    httpMethod: 'GET',
    headers: { authorization: 'Bearer ' + String(p.token || '') },
    queryStringParameters: { viec: 'dashboard' },
  });
  return { statusCode: kq.statusCode, headers: Object.assign({}, kq.headers, C.CORS), body: kq.body };
}

async function xuLyCtvNhanTien(p) {
  const than = {
    phuong_thuc_nhan: p.phuongThuc === 'zalopay' ? 'zalopay' : 'ngan_hang',
    vi_sdt: p.viSdt, ngan_hang: p.nganHang, so_tai_khoan: p.soTaiKhoan,
    chu_tai_khoan: p.chuTaiKhoan, mat_khau_xac_nhan: p.matKhau, kenh: 'zalo-mini-app',
  };
  if (than.phuong_thuc_nhan === 'zalopay') { delete than.ngan_hang; delete than.so_tai_khoan; }
  const kq = await require('./ctv-toi.js').handler({
    httpMethod: 'POST',
    headers: { authorization: 'Bearer ' + String(p.token || ''), 'content-type': 'application/json' },
    body: JSON.stringify(than),
  });
  return { statusCode: kq.statusCode, headers: Object.assign({}, kq.headers, C.CORS), body: kq.body };
}

/* ═════════════ ĐIỀU PHỐI ═════════════ */
const VIEC = {
  lead: xuLyLead,
  ctv: xuLyTenCtv,
  'bao-phi': xuLyBaoPhi,
  'tao-don-tnds': xuLyTaoDon,
  'gan-don-zalo': xuLyGanDonZalo,
  don: xuLyDon,
  've-tai-len': xuLyVeTaiLen,
  'xoa-tep': xuLyXoaTep,
  'ctv-dang-nhap': xuLyCtvDangNhap,
  'ctv-dang-ky': xuLyCtvDangKy,
  'ctv-du-lieu': xuLyCtvDuLieu,
  'ctv-nhan-tien': xuLyCtvNhanTien,
  'dang-ky-oa': xuLyDangKyOa,
  'lien-ket-sdt': xuLyLienKetSdt,
  'nhap-ma-lien-ket': xuLyNhapMaLienKet,
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: C.CORS, body: '' };
  if (event.httpMethod !== 'POST') return C.json(405, { error: 'Chỉ nhận POST.' });
  let p;
  try {
    p = JSON.parse(event.body || '{}');
  } catch (err) {
    return C.json(400, { error: 'Body không phải JSON hợp lệ.' });
  }
  const viec = VIEC[(event.queryStringParameters || {})['hanh-dong']];
  if (!viec) return C.json(400, { error: 'Thiếu hoặc sai hanh-dong.' });
  try {
    return await viec(p);
  } catch (err) {
    console.error('zalo-mini:', err);
    return C.json(500, { error: 'Hệ thống đang bận. Anh/chị thử lại sau ít phút hoặc gọi ' + C.HOTLINE + '.' });
  }
};
