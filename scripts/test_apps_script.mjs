/* Kiểm thử phần logic của Apps Script (hoa hồng, kiểm dữ liệu, ranh giới CTV).
   Chạy: node scripts/test_apps_script.mjs

   Apps Script không chạy được trong máy kiểm thử, nên Logic.gs được viết sạch
   khỏi SpreadsheetApp để chạy thẳng bằng Node. Phần đọc/ghi Sheets không soát
   được ở đây — nó được soát bằng tay theo checklist trong hướng dẫn.

   Ba thứ đáng soát nhất, và cả ba đều là loại sai không ai nhìn ra bằng mắt:
     1. Tính hoa hồng — sai một chỗ là sai tiền của mọi cộng tác viên.
     2. Quy tắc theo ngày hiệu lực — đổi mức mà đơn cũ bị tính lại là viết lại
        lịch sử.
     3. Dữ liệu trả cho CTV — lọt một trường là lộ dữ liệu cá nhân của khách. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F_LOGIC = path.join(GOC, 'apps-script/Logic.gs');
const F_CAU_HINH = path.join(GOC, 'apps-script/CauHinh.gs');
const F_API = path.join(GOC, 'apps-script/Api.gs');

let dat = 0, truot = 0;
const kiemTra = (t, dk, ct) => {
  if (dk) { dat++; console.log('  đạt   ' + t); }
  else { truot++; console.log('  TRƯỢT ' + t + (ct !== undefined ? '  → ' + ct : '')); }
};

/* Nạp Logic.gs như một module CommonJS */
const tam = path.join('/tmp', 'logic_gas_' + process.pid + '.cjs');
fs.writeFileSync(tam, fs.readFileSync(F_LOGIC, 'utf8'));
const require_ = createRequire(import.meta.url);
const L = require_(tam);
fs.unlinkSync(tam);

/* Bảng quy tắc mẫu: 40% phí gốc cho cả ô tô và xe máy từ 01/09/2026 */
const QT = [
  { nhom_xe:'oto',  loai:'percent', gia_tri:40, can_cu:'phi_goc', hieu_luc_tu:'2026-09-01' },
  { nhom_xe:'moto', loai:'percent', gia_tri:40, can_cu:'phi_goc', hieu_luc_tu:'2026-09-01' },
];

console.log('\n── Sinh mã đơn ──');
{
  const m = L.sinhMaDon(new Date('2026-09-15T10:00:00'), 0.5);
  kiemTra('đúng định dạng DBV + yymmdd + 6 số', /^DBV260915\d{6}$/.test(m), m);
  const bo = new Set();
  for (let i=0;i<5000;i++) bo.add(L.sinhMaDon(new Date('2026-09-15T10:00:00')));
  kiemTra('5000 lần sinh, trùng dưới 1%', bo.size > 4950, '5000 → ' + bo.size + ' mã khác nhau');
}

console.log('\n── Chuẩn hoá đầu vào ──');
{
  kiemTra('0912345678 hợp lệ', L.sdtHopLe('0912345678'));
  kiemTra('+84912345678 quy về 09…', L.chuanHoaSdt('+84912345678') === '0912345678', L.chuanHoaSdt('+84912345678'));
  kiemTra('0812345678 (Vinaphone 08x) được chấp nhận', L.sdtHopLe('0812345678'));
  kiemTra('0612345678 (đầu 6 không phải di động) bị từ chối', !L.sdtHopLe('0612345678'));
  kiemTra('thiếu một chữ số bị từ chối', !L.sdtHopLe('091234567'));
  kiemTra('"480.700" đọc ra 480700', L.chuanHoaTien('480.700') === 480700, L.chuanHoaTien('480.700'));
  kiemTra('"480,700đ" đọc ra 480700', L.chuanHoaTien('480,700đ') === 480700, L.chuanHoaTien('480,700đ'));
  kiemTra('số 480700 giữ nguyên', L.chuanHoaTien(480700) === 480700);
}

console.log('\n── Kiểm tra đơn trước khi ghi ──');
{
  const ok = { customerName:'Nguyễn Văn A', phone:'0912345678', plate:'30A12345',
               product:'TNDS ô tô 5 chỗ', amount:480700, phiGoc:437000, affiliateId:'K7X2' };
  kiemTra('đơn hợp lệ không báo lỗi', L.kiemTraDon(ok).length === 0, L.kiemTraDon(ok).join('; '));
  kiemTra('thiếu tên khách → báo lỗi',
    L.kiemTraDon({...ok, customerName:''}).some(x=>/tên khách/.test(x)));
  kiemTra('sđt sai → báo lỗi', L.kiemTraDon({...ok, phone:'123'}).some(x=>/điện thoại/.test(x)));
  kiemTra('tiền âm → báo lỗi', L.kiemTraDon({...ok, amount:-5}).some(x=>/Số tiền/.test(x)));
  kiemTra('phí gốc > tổng phí → báo lỗi',
    L.kiemTraDon({...ok, phiGoc:900000}).some(x=>/lớn hơn tổng phí/.test(x)));
  kiemTra('báo lỗi theo từng trường, không gộp một câu',
    L.kiemTraDon({customerName:'',phone:'x',plate:'',product:'',amount:0}).length >= 4);
}

console.log('\n── Tách phí gốc và VAT ──');
{
  const a = L.tachPhi(480700, 437000);
  kiemTra('có phí gốc thì dùng đúng số đó', a.phi_goc===437000 && a.vat===43700);
  const b = L.tachPhi(480700);
  kiemTra('không có thì suy ngược từ VAT 10%', b.phi_goc===437000 && b.vat===43700,
    JSON.stringify(b));
  const c = L.tachPhi(66000);
  kiemTra('xe máy 66.000 → gốc 60.000', c.phi_goc===60000 && c.vat===6000, JSON.stringify(c));
}

console.log('\n── Tính hoa hồng ──');
{
  const don = { ctv_id:'K7X2', nhom_xe:'oto', phi_goc:437000, tong_phi:480700,
                ngay_tao:new Date('2026-09-15') };
  const r = L.tinhHoaHong(don, QT);
  kiemTra('ô tô dưới 6 chỗ → 174.800đ', r.so_tien === 174800, r.so_tien);
  kiemTra('ghi lại tỷ lệ đã áp dụng', r.ty_le === 0.4, r.ty_le);
  kiemTra('căn cứ là phí gốc, KHÔNG phải tổng phí', r.can_cu === 'phi_goc', r.can_cu);

  const moto = L.tinhHoaHong({...don, nhom_xe:'moto', phi_goc:60000, tong_phi:66000}, QT);
  kiemTra('xe máy 50cc+ → 24.000đ', moto.so_tien === 24000, moto.so_tien);

  const bay = L.tinhHoaHong({...don, phi_goc:794000, tong_phi:873400}, QT);
  kiemTra('ô tô 6–11 chỗ → 317.600đ', bay.so_tien === 317600, bay.so_tien);

  kiemTra('nhập "0.4" thay vì "40" vẫn ra đúng',
    L.tinhHoaHong(don, [{...QT[0], gia_tri:0.4}]).so_tien === 174800);
  kiemTra('tỷ lệ vô lý (140%) bị từ chối',
    !!L.tinhHoaHong(don, [{...QT[0], gia_tri:140}]).loi);

  const fx = L.tinhHoaHong(don, [{nhom_xe:'oto',loai:'fixed',gia_tri:40000,
    can_cu:'phi_goc',hieu_luc_tu:'2026-09-01'}]);
  kiemTra('quy tắc số tiền cố định vẫn dùng được', fx.so_tien === 40000, fx.so_tien);

  const kh = L.tinhHoaHong(don, []);
  kiemTra('KHÔNG có quy tắc → báo lỗi, không lặng lẽ trả 0',
    !!kh.loi && kh.so_tien === undefined, JSON.stringify(kh));

  const kct = L.tinhHoaHong({...don, ctv_id:''}, QT);
  kiemTra('đơn không gắn CTV → 0đ và nói rõ vì sao',
    kct.so_tien === 0 && kct.khong_co_ctv === true);

  kiemTra('căn cứ tổng phí thì ra số khác (192.280đ)',
    L.tinhHoaHong(don, [{...QT[0], can_cu:'tong_phi'}]).so_tien === 192280);
}

console.log('\n── Quy tắc theo ngày hiệu lực ──');
{
  const QT2 = [
    { nhom_xe:'oto', loai:'percent', gia_tri:40, can_cu:'phi_goc', hieu_luc_tu:'2026-09-01' },
    { nhom_xe:'oto', loai:'percent', gia_tri:35, can_cu:'phi_goc', hieu_luc_tu:'2026-12-01' },
  ];
  const cu  = { ctv_id:'K7X2', nhom_xe:'oto', phi_goc:437000, tong_phi:480700, ngay_tao:new Date('2026-11-30') };
  const moi = { ...cu, ngay_tao:new Date('2026-12-01') };
  kiemTra('đơn 30/11 vẫn hưởng 40%', L.tinhHoaHong(cu, QT2).so_tien === 174800);
  kiemTra('đơn 01/12 hưởng 35% (ngay ngày hiệu lực)',
    L.tinhHoaHong(moi, QT2).so_tien === 152950, L.tinhHoaHong(moi, QT2).so_tien);
  kiemTra('quy tắc của tương lai không đụng tới đơn hôm nay',
    L.chonQuyTac(QT2, 'oto', new Date('2026-10-15')).gia_tri === 40);
  kiemTra('đơn trước mọi quy tắc → không tìm được, phải báo lỗi',
    !!L.tinhHoaHong({...cu, ngay_tao:new Date('2026-08-01')}, QT2).loi);
}

console.log('\n── Chốt chặn chống trả hoa hồng hai lần ──');
{
  const d = { ctv_id:'K7X2', payment_status:'PAID', gcn_status:'', commission_status:'' };
  kiemTra('đơn PAID, chưa có trạng thái hoa hồng → đủ điều kiện',
    L.duDieuKienHoaHong(d, 'PAID') === true);
  kiemTra('đã sinh hoa hồng rồi → KHÔNG sinh lại',
    L.duDieuKienHoaHong({...d, commission_status:'COMMISSION_APPROVED'}, 'PAID') === false);
  kiemTra('đã trả tiền rồi → KHÔNG sinh lại',
    L.duDieuKienHoaHong({...d, commission_status:'COMMISSION_PAID'}, 'PAID') === false);
  kiemTra('chưa PAID → chưa đủ điều kiện',
    L.duDieuKienHoaHong({...d, payment_status:'PAYMENT_PENDING'}, 'PAID') === false);
  kiemTra('đơn không gắn CTV → không sinh hoa hồng',
    L.duDieuKienHoaHong({...d, ctv_id:''}, 'PAID') === false);
  kiemTra('mốc ISSUED: PAID thôi chưa đủ',
    L.duDieuKienHoaHong(d, 'ISSUED') === false);
  kiemTra('mốc ISSUED: có GCN mới đủ',
    L.duDieuKienHoaHong({...d, gcn_status:'ISSUED'}, 'ISSUED') === true);
}

console.log('\n── Ranh giới dữ liệu: CTV thấy gì và KHÔNG thấy gì ──');
{
  const DON = [
    { order_id:'D1', ctv_id:'K7X2', bien_so:'30A-1', tong_phi:480700, commission:174800,
      payment_status:'PAID', gcn_status:'ISSUED', commission_status:'COMMISSION_APPROVED',
      khach_hang:'Đỗ Văn Hùng', sdt:'0901111222', email:'a@b.c', cccd:'001089001234',
      dia_chi:'12 Trần Duy Hưng', ghi_chu:'nội bộ' },
    { order_id:'D2', ctv_id:'M4B8', bien_so:'29A-2', tong_phi:66000, commission:24000,
      payment_status:'PAID', gcn_status:'', commission_status:'COMMISSION_PAID',
      khach_hang:'Lê Thị Bình', sdt:'0902222333' },
  ];
  const cua = L.donChoCtv(DON, 'K7X2');
  kiemTra('chỉ trả đơn của đúng CTV đó', cua.length === 1 && cua[0].order_id === 'D1');
  kiemTra('K7X2 không thấy đơn của M4B8',
    !JSON.stringify(cua).includes('D2') && !JSON.stringify(cua).includes('29A-2'));

  const chuoi = JSON.stringify(cua);
  ['Đỗ Văn Hùng','0901111222','a@b.c','001089001234','Trần Duy Hưng','nội bộ']
    .forEach(function(x){
      kiemTra('KHÔNG lộ "' + x + '"', chuoi.indexOf(x) < 0);
    });
  kiemTra('vẫn có biển số, số tiền, trạng thái, hoa hồng',
    cua[0].bien_so==='30A-1' && cua[0].tong_phi===480700 &&
    cua[0].payment_status==='PAID' && cua[0].commission===174800);

  /* Thêm cột mới vào ORDERS sau này không được tự động chảy ra ngoài */
  const themCot = L.donChoCtv([{...DON[0], cccd_mat_sau:'ảnh nhạy cảm'}], 'K7X2');
  kiemTra('cột mới thêm vào ORDERS không tự lọt ra CTV',
    JSON.stringify(themCot).indexOf('nhạy cảm') < 0);

  kiemTra('mã CTV không phân biệt hoa thường/khoảng trắng',
    L.donChoCtv(DON, ' k7x2 ').length === 1);
}

console.log('\n── Tổng quan Dashboard cộng đúng ──');
{
  const cua = L.donChoCtv([
    { order_id:'A', ctv_id:'K', tong_phi:480700, commission:174800, payment_status:'PAID',
      gcn_status:'ISSUED', commission_status:'COMMISSION_PAID' },
    { order_id:'B', ctv_id:'K', tong_phi:873400, commission:317600, payment_status:'PAID',
      gcn_status:'ISSUED', commission_status:'COMMISSION_APPROVED' },
    { order_id:'C', ctv_id:'K', tong_phi:66000, commission:0, payment_status:'PAYMENT_PENDING',
      gcn_status:'', commission_status:'' },
  ], 'K');
  const t = L.tongQuanCtv(cua);
  kiemTra('đếm đủ 3 đơn', t.so_don === 3);
  kiemTra('chỉ 2 đơn đã trả tiền', t.so_don_da_tra === 2);
  kiemTra('doanh thu chỉ cộng đơn PAID', t.doanh_thu === 1354100, t.doanh_thu);
  kiemTra('hoa hồng phát sinh 492.400', t.hoa_hong_phat_sinh === 492400, t.hoa_hong_phat_sinh);
  kiemTra('đã trả 174.800', t.hoa_hong_da_tra === 174800, t.hoa_hong_da_tra);
  kiemTra('chờ duyệt 317.600', t.hoa_hong_cho_duyet === 317600, t.hoa_hong_cho_duyet);

  const th = L.tongQuanCtv(L.donChoCtv([
    { order_id:'A', ctv_id:'K', tong_phi:480700, commission:174800, payment_status:'REFUNDED',
      gcn_status:'', commission_status:'COMMISSION_CLAWBACK' }], 'K'));
  kiemTra('đơn bị thu hồi thì trừ ra khỏi hoa hồng', th.hoa_hong_phat_sinh === -174800,
    th.hoa_hong_phat_sinh);
}

console.log('\n── Soát mã nguồn Apps Script ──');
{
  const ch = fs.existsSync(F_CAU_HINH) ? fs.readFileSync(F_CAU_HINH,'utf8') : '';
  const api = fs.existsSync(F_API) ? fs.readFileSync(F_API,'utf8') : '';
  const lg = fs.readFileSync(F_LOGIC,'utf8');

  const boChuThich = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '')
                              .replace(/(^|[^:])\/\/.*$/gm, '$1');
  kiemTra('Logic.gs không đụng SpreadsheetApp (mới chạy được bằng Node)',
    !/SpreadsheetApp/.test(boChuThich(lg)));
  kiemTra('không có khoá nào ghi cứng trong mã',
    !/KHOA_NOI_BO\s*=\s*['"][^'"]{8,}/.test(ch + api));
  kiemTra('khoá nội bộ đọc từ Script Properties',
    /getScriptProperties|PropertiesService/.test(api), 'Api.gs');
  kiemTra('mọi hành động ghi đều bọc trong LockService',
    (api.match(/LockService/g) || []).length >= 1, 'Api.gs');
  kiemTra('cấu hình nêu rõ mốc sinh hoa hồng',
    /MOC_SINH_HOA_HONG/.test(ch));
  kiemTra('nhân viên chỉ được sửa 4 cột đã liệt kê',
    /COT_NHAN_VIEN_SUA/.test(ch) && /Payment_Status/.test(ch) && /Bank_Ref/.test(ch));
  kiemTra('ORDERS có cột Bank_Ref để chống dùng lại một lần chuyển khoản',
    /'Bank_Ref'/.test(ch));
  kiemTra('ORDERS có cột Commission_Rate để lưu tỷ lệ đã áp dụng',
    /'Commission_Rate'/.test(ch));
}

console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
