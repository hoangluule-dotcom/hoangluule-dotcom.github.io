/**
 * DBV247 — Affiliate TNDS · LOGIC THUẦN
 * ===========================================================================
 * Tệp này KHÔNG chạm vào SpreadsheetApp, không đọc thuộc tính, không gọi mạng.
 * Chỉ nhận dữ liệu vào, trả dữ liệu ra.
 *
 * Vì sao tách riêng: Apps Script không chạy được trong máy kiểm thử, nên phần
 * quan trọng nhất — tính hoa hồng và kiểm tra dữ liệu — sẽ không bao giờ được
 * soát nếu nó nằm lẫn với mã đọc/ghi Sheets. Tách ra thế này thì
 * scripts/test_apps_script.mjs chạy được chính những hàm này bằng Node.
 */

/* ── Sinh mã đơn (đặc tả mục 6) ─────────────────────────────────────────
   DBV + yymmdd + 6 số ngẫu nhiên. Trùng thì tầng ghi sẽ phát hiện và sinh lại
   — xác suất trùng thấp, nhưng "thấp" không phải "không", nên vẫn phải kiểm. */
function sinhMaDon(khiNao, ngauNhien) {
  var d = khiNao || new Date();
  var y = String(d.getFullYear()).slice(-2);
  var m = String(d.getMonth() + 1);
  var ng = String(d.getDate());
  if (m.length < 2) m = '0' + m;
  if (ng.length < 2) ng = '0' + ng;
  var r = ngauNhien == null ? Math.random() : ngauNhien;
  return 'DBV' + y + m + ng + String(Math.floor(100000 + r * 900000));
}

/* ── Chuẩn hoá ────────────────────────────────────────────────────────── */
function chuanHoaSdt(v) {
  var s = String(v == null ? '' : v).replace(/[^0-9+]/g, '');
  if (s.indexOf('+84') === 0) s = '0' + s.slice(3);
  else if (s.indexOf('84') === 0 && s.length >= 11) s = '0' + s.slice(2);
  return s;
}
function sdtHopLe(v) { return /^0[35789][0-9]{8}$/.test(chuanHoaSdt(v)); }

function chuanHoaMaCtv(v) {
  return String(v == null ? '' : v).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Chuẩn hoá tiền về SỐ NGUYÊN ĐỒNG.
 * Sheets trả về số thật, nhưng dữ liệu từ web có thể là "480.700" hoặc
 * "480,700" hoặc "480700đ". Một dấu chấm hiểu nhầm thành dấu thập phân là
 * sai số 1000 lần — đúng loại lỗi phải chặn ngay ở cửa.
 */
function chuanHoaTien(v) {
  if (typeof v === 'number') return Math.round(v);
  var s = String(v == null ? '' : v).replace(/[^0-9]/g, '');
  return s === '' ? NaN : parseInt(s, 10);
}

/* ── Kiểm tra dữ liệu đơn trước khi ghi (đặc tả mục 18) ──────────────────
   Trả về mảng lỗi rỗng nếu hợp lệ. Trả lỗi theo TỪNG TRƯỜNG, không gộp thành
   một câu "dữ liệu không hợp lệ" — người sửa cần biết sửa ô nào. */
function kiemTraDon(d) {
  var loi = [];
  if (!d || typeof d !== 'object') return ['Không có dữ liệu đơn.'];

  if (!String(d.customerName || '').trim()) loi.push('Thiếu tên khách hàng.');
  if (!sdtHopLe(d.phone)) loi.push('Số điện thoại khách không hợp lệ.');
  if (!String(d.plate || '').trim()) loi.push('Thiếu biển số xe.');
  if (!String(d.product || '').trim()) loi.push('Thiếu tên sản phẩm.');

  var tong = chuanHoaTien(d.amount);
  if (isNaN(tong) || tong <= 0) loi.push('Số tiền không hợp lệ.');

  var goc = d.phiGoc == null ? null : chuanHoaTien(d.phiGoc);
  if (goc != null && (isNaN(goc) || goc <= 0)) loi.push('Phí gốc không hợp lệ.');
  if (goc != null && !isNaN(tong) && goc > tong) {
    loi.push('Phí gốc lớn hơn tổng phí — sai dữ liệu.');
  }

  if (d.affiliateId && !/^[A-Z0-9]{3,8}$/.test(chuanHoaMaCtv(d.affiliateId))) {
    loi.push('Mã cộng tác viên sai định dạng.');
  }
  return loi;
}

/**
 * Tách phí gốc và VAT từ tổng phí khi trang web không gửi phí gốc.
 * TNDS chịu VAT 10%, nên phí gốc = tổng / 1,1. Làm tròn đến đồng.
 * Ưu tiên dùng phí gốc do trang web gửi lên — nó là con số gốc, còn đây chỉ
 * là suy ngược.
 */
function tachPhi(tongPhi, phiGocNeuCo) {
  var tong = chuanHoaTien(tongPhi);
  if (phiGocNeuCo != null && !isNaN(chuanHoaTien(phiGocNeuCo))) {
    var g = chuanHoaTien(phiGocNeuCo);
    return { phi_goc: g, vat: tong - g, tong_phi: tong };
  }
  var goc = Math.round(tong / 1.1);
  return { phi_goc: goc, vat: tong - goc, tong_phi: tong };
}

/**
 * CHỌN QUY TẮC HOA HỒNG.
 * Quy tắc có hiệu lực theo ngày: lấy quy tắc của đúng nhóm xe, có ngày hiệu
 * lực SỚM HƠN HOẶC BẰNG ngày tạo đơn, và mới nhất trong số đó.
 *
 * Vì sao phải theo ngày: đổi mức hoa hồng mà không có mốc hiệu lực thì mọi đơn
 * cũ cũng đổi theo — tức là viết lại lịch sử. Cộng tác viên hỏi "sao tháng
 * trước khác tháng này" sẽ không ai trả lời được.
 */
function chonQuyTac(dsQuyTac, nhomXe, ngayTaoDon) {
  var nx = String(nhomXe || '').trim().toLowerCase();
  var ngay = ngayTaoDon instanceof Date ? ngayTaoDon : new Date(ngayTaoDon);
  var ung = [];
  for (var i = 0; i < (dsQuyTac || []).length; i++) {
    var q = dsQuyTac[i];
    if (String(q.nhom_xe || '').trim().toLowerCase() !== nx) continue;
    var hl = q.hieu_luc_tu instanceof Date ? q.hieu_luc_tu : new Date(q.hieu_luc_tu);
    if (isNaN(hl.getTime())) continue;
    /* So theo NGÀY, bỏ giờ: đơn tạo lúc 8h sáng cùng ngày quy tắc có hiệu lực
       vẫn phải được hưởng quy tắc đó. */
    var a = new Date(hl.getFullYear(), hl.getMonth(), hl.getDate());
    var b = new Date(ngay.getFullYear(), ngay.getMonth(), ngay.getDate());
    if (a.getTime() <= b.getTime()) ung.push({ q: q, hl: a.getTime() });
  }
  if (!ung.length) return null;
  ung.sort(function (x, y) { return y.hl - x.hl; });
  return ung[0].q;
}

/**
 * TÍNH HOA HỒNG cho một đơn.
 * Trả { so_tien, ty_le, can_cu, quy_tac } hoặc { loi } — KHÔNG bao giờ trả về
 * 0 một cách im lặng khi không tìm thấy quy tắc. Thà dừng lại và báo, còn hơn
 * ghi số 0 vào một đơn đáng lẽ có hoa hồng: cộng tác viên sẽ không phát hiện
 * ra, và lỗi đó chỉ lộ khi họ đối chiếu sổ của chính mình.
 */
function tinhHoaHong(don, dsQuyTac) {
  if (!don.ctv_id) return { so_tien: 0, ty_le: null, quy_tac: null, khong_co_ctv: true };

  var q = chonQuyTac(dsQuyTac, don.nhom_xe, don.ngay_tao);
  if (!q) {
    return { loi: 'Chưa khai quy tắc hoa hồng cho nhóm xe "' + don.nhom_xe +
                  '" có hiệu lực trước ngày tạo đơn.' };
  }

  var loai = String(q.loai || '').trim().toLowerCase();
  var canCu = String(q.can_cu || 'phi_goc').trim().toLowerCase();
  var goc = canCu === 'tong_phi' ? chuanHoaTien(don.tong_phi) : chuanHoaTien(don.phi_goc);
  if (isNaN(goc) || goc <= 0) return { loi: 'Đơn thiếu ' + canCu + ' để tính hoa hồng.' };

  if (loai === 'percent') {
    var tl = Number(q.gia_tri);
    /* Cho phép nhập 40 hoặc 0.4 — kế toán gõ "40" là chuyện bình thường, và
       hiểu nhầm 40 thành 4000% là lỗi tốn tiền nhất có thể có ở bảng này. */
    if (tl > 1) tl = tl / 100;
    if (!(tl > 0 && tl <= 1)) return { loi: 'Tỷ lệ hoa hồng không hợp lệ: ' + q.gia_tri };
    return { so_tien: Math.round(goc * tl), ty_le: tl, can_cu: canCu, quy_tac: q };
  }
  if (loai === 'fixed') {
    var st = chuanHoaTien(q.gia_tri);
    if (isNaN(st) || st < 0) return { loi: 'Số tiền hoa hồng không hợp lệ: ' + q.gia_tri };
    return { so_tien: st, ty_le: null, can_cu: canCu, quy_tac: q };
  }
  return { loi: 'Loại quy tắc phải là "percent" hoặc "fixed", đang là: ' + q.loai };
}

/**
 * ĐƠN ĐÃ ĐỦ ĐIỀU KIỆN SINH HOA HỒNG CHƯA.
 * Mốc do CH.MOC_SINH_HOA_HONG quyết định. Và bắt buộc: chỉ sinh khi
 * Commission_Status còn TRỐNG — đây là chốt chặn chống trả hoa hồng hai lần
 * khi nhân viên lỡ tay đổi trạng thái hai lần, hoặc hai người cùng sửa.
 */
function duDieuKienHoaHong(don, moc) {
  if (!don.ctv_id) return false;
  if (String(don.commission_status || '').trim() !== '') return false;
  if (moc === 'ISSUED') return String(don.gcn_status || '').trim() === 'ISSUED';
  return String(don.payment_status || '').trim() === 'PAID';
}

/**
 * Lọc đơn của đúng một cộng tác viên, và CẮT BỎ những trường không được phép
 * gửi cho họ (đặc tả mục 13: "Chỉ trả cho CTV các thông tin khách hàng cần
 * thiết").
 *
 * Cộng tác viên KHÔNG được thấy: họ tên khách, số điện thoại, email, CCCD,
 * địa chỉ. Họ thấy biển số, sản phẩm, số tiền, trạng thái, hoa hồng.
 * Đây là danh sách cho phép, không phải danh sách cấm — thêm cột mới vào
 * ORDERS sau này sẽ KHÔNG tự động chảy ra ngoài.
 */
var TRUONG_CTV_DUOC_XEM = [
  'order_id', 'ngay_tao', 'bien_so', 'san_pham', 'nhom_xe', 'tong_phi',
  'payment_status', 'gcn_status', 'commission', 'commission_status',
  'nguon_ghi_nhan'
];

function donChoCtv(dsDon, maCtv) {
  var ma = chuanHoaMaCtv(maCtv);
  var ra = [];
  for (var i = 0; i < (dsDon || []).length; i++) {
    var d = dsDon[i];
    if (chuanHoaMaCtv(d.ctv_id) !== ma) continue;
    var o = {};
    for (var j = 0; j < TRUONG_CTV_DUOC_XEM.length; j++) {
      var k = TRUONG_CTV_DUOC_XEM[j];
      o[k] = d[k] == null ? '' : d[k];
    }
    ra.push(o);
  }
  return ra;
}

/* Tổng quan Dashboard (đặc tả mục 12) — cộng từ chính danh sách đơn đã lọc,
   không lưu sẵn ở đâu cả. */
function tongQuanCtv(donDaLoc) {
  var t = {
    so_don: 0, so_don_da_tra: 0, so_don_da_cap: 0,
    doanh_thu: 0, hoa_hong_phat_sinh: 0, hoa_hong_cho_duyet: 0, hoa_hong_da_tra: 0
  };
  for (var i = 0; i < (donDaLoc || []).length; i++) {
    var d = donDaLoc[i];
    t.so_don++;
    var tt = String(d.payment_status || '');
    var hh = chuanHoaTien(d.commission) || 0;
    var tthh = String(d.commission_status || '');
    if (tt === 'PAID') { t.so_don_da_tra++; t.doanh_thu += chuanHoaTien(d.tong_phi) || 0; }
    if (String(d.gcn_status || '') === 'ISSUED') t.so_don_da_cap++;
    if (tthh === 'COMMISSION_PAID') { t.hoa_hong_phat_sinh += hh; t.hoa_hong_da_tra += hh; }
    else if (tthh === 'COMMISSION_APPROVED') { t.hoa_hong_phat_sinh += hh; t.hoa_hong_cho_duyet += hh; }
    else if (tthh === 'COMMISSION_CLAWBACK') { t.hoa_hong_phat_sinh -= hh; }
  }
  return t;
}

/* Cho Node kiểm thử. Trong Apps Script dòng này không chạy (không có module). */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sinhMaDon: sinhMaDon, chuanHoaSdt: chuanHoaSdt, sdtHopLe: sdtHopLe,
    chuanHoaMaCtv: chuanHoaMaCtv, chuanHoaTien: chuanHoaTien,
    kiemTraDon: kiemTraDon, tachPhi: tachPhi, chonQuyTac: chonQuyTac,
    tinhHoaHong: tinhHoaHong, duDieuKienHoaHong: duDieuKienHoaHong,
    donChoCtv: donChoCtv, tongQuanCtv: tongQuanCtv,
    TRUONG_CTV_DUOC_XEM: TRUONG_CTV_DUOC_XEM
  };
}
