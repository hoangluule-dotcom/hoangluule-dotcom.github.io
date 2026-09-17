/**
 * DBV247 — Affiliate TNDS · API (doGet / doPost) + ghi Sheets
 * ===========================================================================
 * Mọi request đều phải mang KHOA NỘI BỘ. Apps Script không phục vụ trình duyệt
 * trực tiếp — chỉ phục vụ hàm Netlify. Xem lời giải thích ở CauHinh.gs.
 *
 * MỌI THAO TÁC GHI ĐỀU BỌC TRONG LockService.
 * Google Sheets không có giao dịch. Hai người cùng bấm, hoặc một người bấm hai
 * lần, hoặc trigger onEdit chạy chồng lên nhau — đều dẫn tới ghi đè hoặc cộng
 * tiền hai lần. LockService là thứ duy nhất Apps Script có để chặn, và nó chỉ
 * chặn được nếu MỌI đường ghi đều đi qua nó. Bỏ sót một chỗ là hỏng cả hệ.
 */

/* Tên cột trong sheet ↔ khoá dùng trong mã. Khai tường minh, không tự động
   chuyển đổi từ tiếng Việt — "Phí" và "Phí gốc" mà tự slug hoá là đụng nhau. */
var KHOA_COT = {
  'Order_ID':'order_id', 'CTV_ID':'ctv_id', 'Ngày tạo':'ngay_tao',
  'Khách hàng':'khach_hang', 'SĐT':'sdt', 'Email':'email', 'Biển số':'bien_so',
  'Sản phẩm':'san_pham', 'Nhóm xe':'nhom_xe', 'Phí gốc':'phi_goc', 'VAT':'vat',
  'Phí':'tong_phi', 'Payment_Status':'payment_status', 'Bank_Ref':'bank_ref',
  'Ngày nhận tiền':'ngay_nhan_tien', 'GCN_Status':'gcn_status',
  'Commission':'commission', 'Commission_Rate':'commission_rate',
  'Commission_Status':'commission_status', 'Payout_ID':'payout_id',
  'Nguồn ghi nhận':'nguon_ghi_nhan', 'Ghi chú':'ghi_chu',
  'Họ tên':'ho_ten', 'Trạng thái':'trang_thai', 'Ngân hàng':'ngan_hang',
  'Số tài khoản':'so_tai_khoan', 'Chủ tài khoản':'chu_tai_khoan',
  'Loại':'loai', 'Giá trị':'gia_tri', 'Căn cứ':'can_cu',
  'Hiệu lực từ':'hieu_luc_tu', 'Kỳ thanh toán':'ky', 'Số tiền':'so_tien',
  'Ngày thanh toán':'ngay_thanh_toan', 'Payout_ID ':'payout_id'
};

/* ── Tiện ích ───────────────────────────────────────────────────────────── */

function bangTinh() { return SpreadsheetApp.getActiveSpreadsheet(); }

function laySheet(ten) {
  var sh = bangTinh().getSheetByName(ten);
  if (!sh) throw new Error('Không tìm thấy sheet "' + ten + '". Chạy taoBangTinh() trước.');
  return sh;
}

/** Đọc cả sheet thành mảng đối tượng, kèm số hàng thật để còn ghi ngược lại. */
function docSheet(ten) {
  var sh = laySheet(ten);
  var vung = sh.getDataRange().getValues();
  if (vung.length < 2) return [];
  var tieuDe = vung[0];
  var ra = [];
  for (var i = 1; i < vung.length; i++) {
    var o = { _hang: i + 1 };           // 1-based, có tính hàng tiêu đề
    var rong = true;
    for (var j = 0; j < tieuDe.length; j++) {
      var k = KHOA_COT[tieuDe[j]] || String(tieuDe[j]);
      o[k] = vung[i][j];
      if (vung[i][j] !== '' && vung[i][j] != null) rong = false;
    }
    if (!rong) ra.push(o);
  }
  return ra;
}

function chiSoCot(ten, tenCot) {
  var sh = laySheet(ten);
  var tieuDe = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  for (var i = 0; i < tieuDe.length; i++) if (tieuDe[i] === tenCot) return i + 1;
  throw new Error('Sheet "' + ten + '" không có cột "' + tenCot + '".');
}

function ghiO(ten, hang, tenCot, giaTri) {
  laySheet(ten).getRange(hang, chiSoCot(ten, tenCot)).setValue(giaTri);
}

function bayGio() { return new Date(); }

function chuoiNgay(d) {
  return Utilities.formatDate(d || new Date(), CH.MUI_GIO, 'yyyy-MM-dd HH:mm:ss');
}

/** Bọc mọi thao tác ghi. 25 giây là đủ cho một lượt ghi vài ô; lâu hơn thế
    nghĩa là có chuyện bất thường và thà báo lỗi còn hơn treo. */
function khoaVaChay(viec) {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(25000)) {
    throw new Error('Hệ thống đang bận ghi dữ liệu, thử lại sau vài giây.');
  }
  try { return viec(); } finally { khoa.releaseLock(); }
}

function ghiNhatKy(hanhDong, orderId, ctvId, nguoi, truoc, sau, ghiChu) {
  try {
    laySheet(CH.SHEET.NHAT_KY).appendRow([
      chuoiNgay(), hanhDong, orderId || '', ctvId || '', nguoi || '',
      truoc == null ? '' : String(truoc), sau == null ? '' : String(sau), ghiChu || ''
    ]);
  } catch (e) {
    /* Nhật ký hỏng không được làm hỏng nghiệp vụ — nhưng phải để lại dấu vết
       trong log của Apps Script để còn biết mà sửa. */
    console.error('Không ghi được nhật ký: ' + e.message);
  }
}

function tra(doiTuong) {
  return ContentService.createTextOutput(JSON.stringify(doiTuong))
    .setMimeType(ContentService.MimeType.JSON);
}
function traLoi(thongDiep, ma) {
  console.error('[DBV247] ' + (ma || 'LOI') + ': ' + thongDiep);
  return tra({ ok: false, error: thongDiep, ma: ma || 'LOI' });
}

/* ── Xác thực ───────────────────────────────────────────────────────────── */

function khoaHopLe(e) {
  var mong = PropertiesService.getScriptProperties()
               .getProperty(CH.TEN_THUOC_TINH_KHOA) || '';
  if (!mong) throw new Error('Chưa đặt ' + CH.TEN_THUOC_TINH_KHOA +
    ' trong Script Properties của Apps Script.');
  var gui = (e && e.parameter && e.parameter.khoa) || '';
  return gui === mong;
}

/* ── doPost ─────────────────────────────────────────────────────────────── */

function doPost(e) {
  try {
    if (!khoaHopLe(e)) return traLoi('Sai hoặc thiếu khoá nội bộ.', 'KHOA');
    var hanhDong = (e.parameter.action || '').trim();

    if (hanhDong === 'createOrder')      return taoDon(e.parameter);
    if (hanhDong === 'updateOrderStatus')return capNhatTrangThai(e.parameter);
    if (hanhDong === 'dangKyCtv')        return dangKyCtv(e.parameter);

    return traLoi('Hành động không hợp lệ: ' + hanhDong, 'HANH_DONG');
  } catch (err) {
    return traLoi(err.message || String(err), 'NGOAI_LE');
  }
}

/* ── doGet ──────────────────────────────────────────────────────────────── */

function doGet(e) {
  try {
    if (!khoaHopLe(e)) return traLoi('Sai hoặc thiếu khoá nội bộ.', 'KHOA');
    var hanhDong = (e.parameter.action || '').trim();

    /* CTV_ID LẤY TỪ THAM SỐ DO HÀM NETLIFY GỬI, mà hàm đó chỉ gửi sau khi đã
       giải token đăng nhập. Trình duyệt không bao giờ gọi thẳng vào đây, nên
       không có chuyện đổi ma_ctv trên URL để xem dữ liệu người khác
       (đặc tả mục 13). */
    var maCtv = chuanHoaMaCtv(e.parameter.ma_ctv || '');

    if (hanhDong === 'dashboard' || hanhDong === 'orders' || hanhDong === 'commissions') {
      if (!maCtv) return traLoi('Thiếu mã cộng tác viên.', 'THIEU_CTV');
      var cua = donChoCtv(docSheet(CH.SHEET.ORDERS), maCtv);
      if (hanhDong === 'orders') return tra({ ok: true, don: cua });
      if (hanhDong === 'commissions') {
        return tra({ ok: true, don: cua.filter(function (d) {
          return String(d.commission_status || '') !== '';
        })});
      }
      return tra({ ok: true, tong_quan: tongQuanCtv(cua), don: cua.slice(0, 200),
                   cap_nhat: chuoiNgay() });
    }

    if (hanhDong === 'adminCtv') return tra({ ok: true, ctv: tongHopToanBo() });

    return traLoi('Hành động không hợp lệ: ' + hanhDong, 'HANH_DONG');
  } catch (err) {
    return traLoi(err.message || String(err), 'NGOAI_LE');
  }
}

/* ── Tạo đơn (đặc tả mục 18) ────────────────────────────────────────────── */

function taoDon(p) {
  var loi = kiemTraDon(p);
  if (loi.length) return traLoi(loi.join(' '), 'DU_LIEU');

  return khoaVaChay(function () {
    var maCtv = chuanHoaMaCtv(p.affiliateId || '');

    /* CTV phải có thật và đang hoạt động. Mã lạ thì đơn vẫn được ghi — khách
       không có lỗi gì và không được để họ mất đơn — nhưng KHÔNG gắn CTV, và
       ghi lại mã lạ đó vào ghi chú để còn tra. */
    var ghiChuThem = '';
    if (maCtv) {
      var ds = docSheet(CH.SHEET.CTV);
      var thay = null;
      for (var i = 0; i < ds.length; i++) {
        if (chuanHoaMaCtv(ds[i].ctv_id) === maCtv) { thay = ds[i]; break; }
      }
      if (!thay || String(thay.trang_thai).toUpperCase() !== 'ACTIVE') {
        ghiChuThem = 'Mã CTV không hợp lệ hoặc ngưng hoạt động: ' + maCtv;
        maCtv = '';
      }
    }

    /* Mã đơn: ưu tiên mã do trang web sinh, nhưng phải kiểm trùng.
       Trùng thì sinh lại, tối đa 5 lần rồi báo lỗi thay vì ghi đè đơn cũ. */
    var dsDon = docSheet(CH.SHEET.ORDERS);
    var daCo = {};
    for (var j = 0; j < dsDon.length; j++) daCo[String(dsDon[j].order_id)] = true;

    var ma = String(p.orderId || '').trim() || sinhMaDon();
    var lan = 0;
    while (daCo[ma]) {
      if (++lan > 5) return traLoi('Không sinh được mã đơn không trùng.', 'MA_TRUNG');
      ma = sinhMaDon();
    }

    var phi = tachPhi(p.amount, p.phiGoc);
    var nay = bayGio();

    var hang = [];
    for (var k = 0; k < CH.COT_ORDERS.length; k++) {
      var c = CH.COT_ORDERS[k], v = '';
      if (c === 'Order_ID') v = ma;
      else if (c === 'CTV_ID') v = maCtv;
      else if (c === 'Ngày tạo') v = nay;
      else if (c === 'Khách hàng') v = String(p.customerName || '').trim();
      else if (c === 'SĐT') v = chuanHoaSdt(p.phone);
      else if (c === 'Email') v = String(p.email || '').trim();
      else if (c === 'Biển số') v = String(p.plate || '').trim().toUpperCase();
      else if (c === 'Sản phẩm') v = String(p.product || '').trim();
      else if (c === 'Nhóm xe') v = String(p.nhomXe || p.vehicleGroup || '').trim().toLowerCase();
      else if (c === 'Phí gốc') v = phi.phi_goc;
      else if (c === 'VAT') v = phi.vat;
      else if (c === 'Phí') v = phi.tong_phi;
      else if (c === 'Payment_Status') v = CH.TT_TT.CHO;
      else if (c === 'Nguồn ghi nhận') v = String(p.nguonGhiNhan || '').trim();
      else if (c === 'Ghi chú') v = ghiChuThem;
      hang.push(v);
    }
    laySheet(CH.SHEET.ORDERS).appendRow(hang);
    ghiNhatKy('createOrder', ma, maCtv, 'website', '', CH.TT_TT.CHO, ghiChuThem);

    return tra({ ok: true, orderId: ma, ctvId: maCtv,
                 phi_goc: phi.phi_goc, vat: phi.vat, tong_phi: phi.tong_phi,
                 canh_bao: ghiChuThem || null });
  });
}

/* ── Nhân viên đổi trạng thái (đặc tả mục 15) ───────────────────────────── */

function capNhatTrangThai(p) {
  var ma = String(p.orderId || '').trim();
  if (!ma) return traLoi('Thiếu Order_ID.', 'THIEU');

  return khoaVaChay(function () {
    var ds = docSheet(CH.SHEET.ORDERS);
    var don = null;
    for (var i = 0; i < ds.length; i++) {
      if (String(ds[i].order_id) === ma) { don = ds[i]; break; }
    }
    if (!don) return traLoi('Không tìm thấy đơn ' + ma, 'KHONG_CO');

    var nguoi = String(p.nguoi || 'nhan-vien');
    var truoc = don.payment_status;

    if (p.paymentStatus) {
      var tt = String(p.paymentStatus).trim().toUpperCase();

      /* Đánh dấu ĐÃ NHẬN TIỀN thì bắt buộc có mã giao dịch ngân hàng, và mã đó
         chưa được dùng cho đơn nào khác. Đây là chốt chặn chống dùng một lần
         chuyển khoản để đánh dấu hai đơn — Sheets không có ràng buộc duy nhất
         nên phải tự kiểm, và phải kiểm BÊN TRONG khoá. */
      if (tt === CH.TT_TT.DA_TRA) {
        var ref = String(p.bankRef || '').trim();
        if (!ref) return traLoi('Phải nhập mã giao dịch ngân hàng (Bank_Ref) khi xác nhận đã nhận tiền.', 'THIEU_REF');
        for (var j = 0; j < ds.length; j++) {
          if (String(ds[j].bank_ref || '').trim() === ref &&
              String(ds[j].order_id) !== ma) {
            return traLoi('Mã giao dịch ' + ref + ' đã dùng cho đơn ' +
                          ds[j].order_id + '.', 'REF_TRUNG');
          }
        }
        ghiO(CH.SHEET.ORDERS, don._hang, 'Bank_Ref', ref);
        ghiO(CH.SHEET.ORDERS, don._hang, 'Ngày nhận tiền', bayGio());
      }
      ghiO(CH.SHEET.ORDERS, don._hang, 'Payment_Status', tt);
      don.payment_status = tt;
    }

    if (p.gcnStatus) {
      ghiO(CH.SHEET.ORDERS, don._hang, 'GCN_Status', String(p.gcnStatus).trim().toUpperCase());
      don.gcn_status = String(p.gcnStatus).trim().toUpperCase();
    }
    if (p.ghiChu != null) ghiO(CH.SHEET.ORDERS, don._hang, 'Ghi chú', String(p.ghiChu));

    ghiNhatKy('updateOrderStatus', ma, don.ctv_id, nguoi, truoc, don.payment_status, '');

    var kq = sinhHoaHongNeuDu(don, nguoi);
    return tra({ ok: true, orderId: ma, hoa_hong: kq });
  });
}

/* ── Sinh hoa hồng ──────────────────────────────────────────────────────── */

/**
 * GỌI BÊN TRONG KHOÁ. Không gọi hàm này từ nơi chưa giữ khoá.
 * Ghi hoa hồng THẲNG VÀO DÒNG ĐƠN và không bao giờ tính lại — đó là ảnh chụp
 * tại thời điểm đủ điều kiện. Đổi tỷ lệ sau này không được phép làm đổi con số
 * của đơn cũ.
 */
function sinhHoaHongNeuDu(don, nguoi) {
  if (!duDieuKienHoaHong(don, CH.MOC_SINH_HOA_HONG)) {
    return { sinh: false, ly_do: 'chưa đủ điều kiện hoặc đã sinh rồi' };
  }
  var quyTac = docSheet(CH.SHEET.QUY_TAC);
  var r = tinhHoaHong({
    ctv_id: don.ctv_id, nhom_xe: don.nhom_xe,
    phi_goc: don.phi_goc, tong_phi: don.tong_phi, ngay_tao: don.ngay_tao
  }, quyTac);

  if (r.loi) {
    /* KHÔNG ghi 0 vào ô hoa hồng. Ghi chú lại để người xử lý thấy, và để đơn ở
       nguyên trạng thái chưa sinh — chạy lại được sau khi khai quy tắc. */
    ghiO(CH.SHEET.ORDERS, don._hang, 'Ghi chú',
         (don.ghi_chu ? don.ghi_chu + ' | ' : '') + 'CHƯA TÍNH ĐƯỢC HOA HỒNG: ' + r.loi);
    ghiNhatKy('hoaHongLoi', don.order_id, don.ctv_id, nguoi, '', '', r.loi);
    return { sinh: false, loi: r.loi };
  }
  if (r.khong_co_ctv) return { sinh: false, ly_do: 'đơn không gắn CTV' };

  ghiO(CH.SHEET.ORDERS, don._hang, 'Commission', r.so_tien);
  ghiO(CH.SHEET.ORDERS, don._hang, 'Commission_Rate', r.ty_le == null ? '' : r.ty_le);
  ghiO(CH.SHEET.ORDERS, don._hang, 'Commission_Status', CH.TT_HH.DU);
  ghiNhatKy('sinhHoaHong', don.order_id, don.ctv_id, nguoi, '', r.so_tien,
            'tỷ lệ ' + (r.ty_le == null ? 'cố định' : (r.ty_le * 100) + '%') +
            ' trên ' + r.can_cu);
  return { sinh: true, so_tien: r.so_tien, ty_le: r.ty_le };
}

/**
 * TRIGGER onEdit (bản cài đặt, không phải onEdit đơn giản).
 * Nhân viên sửa Payment_Status ngay trong bảng tính — đúng quy trình ở đặc tả
 * mục 15 — thì hoa hồng phải tự sinh.
 *
 * Phải là INSTALLABLE trigger: onEdit đơn giản không được phép dùng
 * LockService, mà không có khoá thì hai lần sửa gần nhau có thể sinh hoa hồng
 * hai lần. Cách cài: Apps Script → Triggers → Add Trigger → chọn hàm
 * onSuaDBV, sự kiện "On edit".
 */
function onSuaDBV(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== CH.SHEET.ORDERS) return;
    if (e.range.getRow() < 2) return;

    var tenCot = sh.getRange(1, e.range.getColumn()).getValue();
    if (tenCot !== 'Payment_Status' && tenCot !== 'GCN_Status') return;

    var hang = e.range.getRow();
    khoaVaChay(function () {
      var ds = docSheet(CH.SHEET.ORDERS);
      for (var i = 0; i < ds.length; i++) {
        if (ds[i]._hang === hang) {
          ghiNhatKy('suaTayTrongSheet', ds[i].order_id, ds[i].ctv_id,
                    (e.user && e.user.getEmail && e.user.getEmail()) || 'không rõ',
                    e.oldValue, e.value, tenCot);
          sinhHoaHongNeuDu(ds[i], 'sửa tay trong Sheet');
          return;
        }
      }
    });
  } catch (err) {
    console.error('onSuaDBV: ' + err.message);
  }
}

/* ── Đăng ký cộng tác viên ──────────────────────────────────────────────── */

function dangKyCtv(p) {
  var ma = chuanHoaMaCtv(p.ctvId || '');
  if (!/^[A-Z0-9]{3,8}$/.test(ma)) return traLoi('Mã cộng tác viên sai định dạng.', 'MA');
  if (!sdtHopLe(p.phone)) return traLoi('Số điện thoại không hợp lệ.', 'SDT');

  return khoaVaChay(function () {
    var ds = docSheet(CH.SHEET.CTV);
    for (var i = 0; i < ds.length; i++) {
      if (chuanHoaMaCtv(ds[i].ctv_id) === ma) return traLoi('Mã ' + ma + ' đã tồn tại.', 'TRUNG');
      if (chuanHoaSdt(ds[i].sdt) === chuanHoaSdt(p.phone)) {
        return traLoi('Số điện thoại này đã đăng ký với mã ' + ds[i].ctv_id + '.', 'TRUNG_SDT');
      }
    }
    laySheet(CH.SHEET.CTV).appendRow([
      ma, String(p.hoTen || '').trim(), chuanHoaSdt(p.phone), String(p.email || '').trim(),
      'ACTIVE', String(p.nganHang || ''), String(p.soTaiKhoan || ''),
      String(p.chuTaiKhoan || ''), bayGio()
    ]);
    ghiNhatKy('dangKyCtv', '', ma, 'website', '', 'ACTIVE', '');
    return tra({ ok: true, ctvId: ma });
  });
}

/* ── Tổng hợp cho màn hình quản trị ─────────────────────────────────────── */

function tongHopToanBo() {
  var dsCtv = docSheet(CH.SHEET.CTV);
  var dsDon = docSheet(CH.SHEET.ORDERS);
  var ra = [];
  for (var i = 0; i < dsCtv.length; i++) {
    var c = dsCtv[i];
    var cua = donChoCtv(dsDon, c.ctv_id);
    var t = tongQuanCtv(cua);
    ra.push({
      ma_ctv: c.ctv_id, ho_ten: c.ho_ten, sdt: c.sdt, trang_thai: c.trang_thai,
      ngan_hang: c.ngan_hang, so_tai_khoan: c.so_tai_khoan,
      chu_tai_khoan: c.chu_tai_khoan, ngay_tao: c.ngay_tao,
      so_don: t.so_don, so_don_da_tra: t.so_don_da_tra, doanh_thu: t.doanh_thu,
      hoa_hong_phat_sinh: t.hoa_hong_phat_sinh,
      hoa_hong_cho_duyet: t.hoa_hong_cho_duyet,
      hoa_hong_da_tra: t.hoa_hong_da_tra
    });
  }
  ra.sort(function (a, b) { return b.doanh_thu - a.doanh_thu; });
  return ra;
}
