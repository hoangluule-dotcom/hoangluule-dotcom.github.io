/* Kiểm thử cổng CTV bước 1 — chạy: node scripts/test_ctv_auth.js
   Dùng bản giả lập @netlify/blobs trong node_modules (chỉ có trên máy test).
   Không cần mạng, không cần Netlify. */

'use strict';

process.env.CTV_TOKEN_SECRET = 'chuoi-bi-mat-dai-hon-16-ky-tu-de-test';

const auth = require('../netlify/functions/ctv-auth');
const toi = require('../netlify/functions/ctv-toi');
const K = require('../netlify/functions/lib/ctv-kho');

let dat = 0, truot = 0;

function kiemTra(ten, dieuKien, chiTiet) {
  if (dieuKien) { dat++; console.log('  đạt   ' + ten); }
  else { truot++; console.log('  TRƯỢT ' + ten + (chiTiet ? '  → ' + chiTiet : '')); }
}

function goiAuth(than) {
  return auth.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(than) });
}
function goiToi(method, token, than) {
  return toi.handler({
    httpMethod: method,
    headers: token ? { authorization: 'Bearer ' + token } : {},
    body: than ? JSON.stringify(than) : '',
  });
}
const than = (r) => JSON.parse(r.body);

(async function () {
  console.log('\n── Chuẩn hoá số điện thoại ──');
  const dangSo = ['0912345678', '+84912345678', '84912345678', '0912 345 678',
                  '0912.345.678', '  0912-345-678 ', '0084912345678'];
  dangSo.forEach(function (s) {
    kiemTra('"' + s + '" → 0912345678', K.chuanHoaSdt(s) === '0912345678', K.chuanHoaSdt(s));
  });
  kiemTra('số cố định 02812345678 bị loại', !K.sdtHopLe(K.chuanHoaSdt('02812345678')));
  kiemTra('đầu số 1900 bị loại', !K.sdtHopLe(K.chuanHoaSdt('19001234')));
  kiemTra('thiếu chữ số bị loại', !K.sdtHopLe('091234567'));
  kiemTra('đầu số 03 hợp lệ', K.sdtHopLe('0312345678'));

  console.log('\n── Đăng ký ──');
  let r = await goiAuth({ hanh_dong: 'dang-ky', ho_ten: 'Nguyễn Văn A', sdt: '0912345678', mat_khau: 'matkhau123' });
  kiemTra('đăng ký trả 201', r.statusCode === 201, r.statusCode + ' ' + r.body);
  const b1 = than(r);
  kiemTra('có token', typeof b1.token === 'string' && b1.token.indexOf('.') > 0);
  kiemTra('mã CTV 4 ký tự', /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(b1.ctv.ma_ctv), b1.ctv.ma_ctv);
  kiemTra('không trả mật khẩu băm ra ngoài', b1.ctv.mat_khau_bam === undefined && b1.ctv.muoi === undefined);
  kiemTra('sdt_da_xac_thuc = false ở bước 1', b1.ctv.sdt_da_xac_thuc === false);

  r = await goiAuth({ hanh_dong: 'dang-ky', ho_ten: 'Người khác', sdt: '+84912345678', mat_khau: 'khac123' });
  kiemTra('đăng ký lại cùng số (dạng +84) bị chặn 409', r.statusCode === 409, r.statusCode + ' ' + r.body);

  r = await goiAuth({ hanh_dong: 'dang-ky', ho_ten: 'B', sdt: '0987654321', mat_khau: '123' });
  kiemTra('mật khẩu ngắn bị chặn 400', r.statusCode === 400 && than(r).truong === 'mat_khau');

  r = await goiAuth({ hanh_dong: 'dang-ky', ho_ten: '', sdt: '0987654321', mat_khau: 'dung123' });
  kiemTra('thiếu họ tên bị chặn 400', r.statusCode === 400 && than(r).truong === 'ho_ten');

  r = await goiAuth({ hanh_dong: 'dang-ky', ho_ten: 'Trần Thị B', sdt: '0987654321', mat_khau: 'dung123456' });
  kiemTra('CTV thứ hai đăng ký được', r.statusCode === 201);
  const b2 = than(r);
  kiemTra('hai CTV có mã khác nhau', b2.ctv.ma_ctv !== b1.ctv.ma_ctv, b1.ctv.ma_ctv + ' / ' + b2.ctv.ma_ctv);

  console.log('\n── Đăng nhập ──');
  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0912345678', mat_khau: 'matkhau123' });
  kiemTra('đăng nhập đúng trả 200', r.statusCode === 200, r.statusCode + ' ' + r.body);
  const token1 = than(r).token;

  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '84912345678', mat_khau: 'matkhau123' });
  kiemTra('đăng nhập bằng dạng 84... vẫn vào được', r.statusCode === 200);

  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0912345678', mat_khau: 'sai-be-bet' });
  kiemTra('sai mật khẩu trả 401', r.statusCode === 401);
  kiemTra('không tiết lộ số đã tồn tại', /không đúng/.test(than(r).error), than(r).error);

  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0911111111', mat_khau: 'gi-cung-duoc' });
  kiemTra('số chưa đăng ký trả cùng câu 401', r.statusCode === 401 && /không đúng/.test(than(r).error));

  console.log('\n── Khoá sau nhiều lần sai ──');
  for (let i = 0; i < 9; i++) {
    await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0987654321', mat_khau: 'sai' + i + 'xxx' });
  }
  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0987654321', mat_khau: 'dung123456' });
  kiemTra('sai 9 lần rồi nhập đúng thì vẫn vào được (chưa tới ngưỡng)',
    r.statusCode === 200, r.statusCode + ' ' + r.body);

  for (let i = 0; i < 10; i++) {
    await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0987654321', mat_khau: 'sai' + i + 'yyy' });
  }
  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0987654321', mat_khau: 'dung123456' });
  kiemTra('sai 10 lần thì bị khoá (429) dù lần sau nhập đúng',
    r.statusCode === 429, r.statusCode + ' ' + r.body);
  kiemTra('câu báo khoá có nói số phút', /\d+ phút/.test(than(r).error), than(r).error);

  console.log('\n── Token ──');
  kiemTra('token hợp lệ giải được', K.giaiToken(token1) !== null);
  /* Phép thử cũ ở đây đổi KÝ TỰ CUỐI của chữ ký rồi đòi token phải hỏng — và
     nó chập chờn, khoảng 1/4 số lần chạy là trượt. Nguyên nhân không phải mã
     sai: chữ ký 32 byte mã hoá base64url thành 43 ký tự, nên ký tự cuối chỉ
     mang 2 bit có nghĩa, 4 bit còn lại là đệm. Cả dải A–P giải mã ra ĐÚNG MỘT
     chuỗi byte. Đổi ký tự cuối trong dải đó là không đổi gì cả, và giaiToken()
     so sánh theo BYTE nên vẫn nhận — đúng như phải thế.

     Thay bằng ba phép thử chắc chắn: lật từng bit thật của chữ ký, sửa phần
     thân, và cắt cụt. */
  {
    const [than0, sig0] = token1.split('.');
    const sigByte = Buffer.from(sig0.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    let moiViTri = true;
    for (const vt of [0, 7, 15, 31]) {
      const hong = Buffer.from(sigByte);
      hong[vt] ^= 0x01;                       // lật đúng 1 bit
      const sigHong = hong.toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      if (K.giaiToken(than0 + '.' + sigHong) !== null) moiViTri = false;
    }
    kiemTra('lật 1 bit bất kỳ của chữ ký thì token hỏng', moiViTri);

    const thanHong = Buffer.from(JSON.stringify({ sdt: '0999999999', ma: 'XXXX',
      het: Date.now() + 86400000 })).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    kiemTra('đổi phần thân (giả mạo số điện thoại) thì token hỏng',
      K.giaiToken(thanHong + '.' + sig0) === null);

    kiemTra('cắt cụt chữ ký thì token hỏng',
      K.giaiToken(than0 + '.' + sig0.slice(0, 20)) === null);
  }
  kiemTra('token rỗng thì hỏng', K.giaiToken('') === null);
  kiemTra('token không có dấu chấm thì hỏng', K.giaiToken('abcdef') === null);
  const hetHan = (function () {
    const crypto = require('node:crypto');
    const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const p = b64u(JSON.stringify({ sdt: '0912345678', ma: 'AAAA', het: Date.now() - 1000 }));
    return p + '.' + b64u(crypto.createHmac('sha256', process.env.CTV_TOKEN_SECRET).update(p).digest());
  })();
  kiemTra('token đã hết hạn bị từ chối dù chữ ký đúng', K.giaiToken(hetHan) === null);

  console.log('\n── Bảng điều khiển ──');
  r = await goiToi('GET', token1);
  kiemTra('GET có token trả 200', r.statusCode === 200, r.statusCode + ' ' + r.body);
  const bd = than(r);
  kiemTra('trả đủ 8 chỉ số', Object.keys(bd.thong_ke).length === 8, Object.keys(bd.thong_ke).join(','));
  kiemTra('CTV mới thì mọi chỉ số bằng 0', Object.values(bd.thong_ke).every((v) => v === 0));
  kiemTra('ghi nhận đơn đã bật', bd.ghi_nhan_dang_bat === true);
  kiemTra('hoa hồng CHƯA bật (chờ đối soát sao kê)', bd.hoa_hong_dang_bat === false);
  kiemTra('không lộ mật khẩu băm', bd.ctv.mat_khau_bam === undefined);

  r = await goiToi('GET', null);
  kiemTra('GET không token trả 401', r.statusCode === 401);
  r = await goiToi('GET', 'rac.rac');
  kiemTra('GET token rác trả 401', r.statusCode === 401);

  console.log('\n── Cập nhật hồ sơ ──');
  r = await goiToi('POST', token1, { ho_ten: 'Nguyễn Văn An', email: 'an@example.com', ngan_hang: 'Techcombank', so_tai_khoan: '1903 1234 5678', chu_tai_khoan: 'NGUYEN VAN AN' });
  kiemTra('cập nhật trả 200', r.statusCode === 200, r.body);
  kiemTra('số tài khoản đã bỏ khoảng trắng', than(r).ctv.so_tai_khoan === '190312345678', than(r).ctv.so_tai_khoan);
  kiemTra('tên đã đổi', than(r).ctv.ho_ten === 'Nguyễn Văn An');

  r = await goiToi('POST', token1, { email: 'khong-phai-email' });
  kiemTra('email sai bị chặn 400', r.statusCode === 400 && than(r).truong === 'email');

  r = await goiToi('POST', token1, { mat_khau_moi: 'moi123456', mat_khau_cu: 'sai-roi' });
  kiemTra('đổi mật khẩu sai mật khẩu cũ bị chặn 400 (KHÔNG phải 401 — 401 làm trình duyệt tự đăng xuất)',
    r.statusCode === 400 && than(r).truong === 'mat_khau_cu', r.statusCode + ' ' + r.body);

  r = await goiToi('POST', token1, { mat_khau_moi: 'moi123456', mat_khau_cu: 'matkhau123' });
  kiemTra('đổi mật khẩu đúng thì được', r.statusCode === 200, r.body);

  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0912345678', mat_khau: 'moi123456' });
  kiemTra('đăng nhập bằng mật khẩu mới', r.statusCode === 200);
  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0912345678', mat_khau: 'matkhau123' });
  kiemTra('mật khẩu cũ không còn dùng được', r.statusCode === 401);

  console.log('\n── Thiếu cấu hình ──');
  const luu = process.env.CTV_TOKEN_SECRET;
  delete process.env.CTV_TOKEN_SECRET;
  r = await goiAuth({ hanh_dong: 'dang-nhap', sdt: '0912345678', mat_khau: 'moi123456' });
  kiemTra('thiếu CTV_TOKEN_SECRET thì báo 500 nói rõ tên biến',
    r.statusCode === 500 && /CTV_TOKEN_SECRET/.test(than(r).error), r.body);
  process.env.CTV_TOKEN_SECRET = luu;

  console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
  process.exit(truot === 0 ? 0 : 1);
})();
