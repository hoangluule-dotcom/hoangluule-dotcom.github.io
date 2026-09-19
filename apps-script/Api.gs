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
  'Ngày thanh toán':'ngay_thanh_toan', 'Payout_ID ':'payout_id',
  /* Hồ sơ cấp giấy chứng nhận — thêm 18/09/2026 */
  'Chi tiết xe':'chi_tiet_xe', 'Số khung':'so_khung', 'Số máy':'so_may',
  'Hiệu xe':'hieu_xe', 'Năm SX':'nam_sx', 'Số chỗ':'so_cho',
  'Thời hạn':'thoi_han', 'Ngày hiệu lực':'ngay_hieu_luc',
  'Ngày hết hạn':'ngay_het_han', 'Địa chỉ khách':'dia_chi',
  'Xuất hoá đơn':'xuat_hoa_don', 'Tên công ty':'ten_cty', 'MST':'mst',
  'Địa chỉ công ty':'dia_chi_cty', 'Email hoá đơn':'email_hd',
  'Địa chỉ giao GCN':'dia_chi_giao', 'Người nhận':'nguoi_nhan',
  'SĐT người nhận':'sdt_nhan'
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
    if (hanhDong === 'capNhatDon')       return capNhatDon(e.parameter);
    if (hanhDong === 'dangKyCtv')        return dangKyCtv(e.parameter);
    if (hanhDong === 'capNhatCtv')       return capNhatCtv(e.parameter);

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

    /* ── Màn hình quản trị ──────────────────────────────────────────────
       Hai hành động, hai tập dữ liệu khác hẳn nhau, và tách ra là CỐ Ý:

       adminDon  → đơn hàng ĐẦY ĐỦ, có tên khách, số điện thoại, địa chỉ, số
                   khung. Dành cho nhân viên nhập liệu và phát hành giấy.
       adminCtv  → hồ sơ cộng tác viên và tiền, KHÔNG có dữ liệu cá nhân của
                   khách. Danh sách đơn kèm theo đi qua donChoCtv() nên chịu
                   đúng danh sách cho phép như dashboard của chính CTV.

       Quản lý hoa hồng không cần biết khách tên gì. Gộp hai thứ này vào một
       chỗ là mọi người mở màn hình CTV đều thấy luôn hồ sơ khách. */
    if (hanhDong === 'adminDon') {
      var tatCa = docSheet(CH.SHEET.ORDERS);
      tatCa.sort(function (a, b) {
        return String(b.ngay_tao).localeCompare(String(a.ngay_tao));
      });
      return tra({ ok: true, don: tatCa, cot: CH.COT_ORDERS, cap_nhat: chuoiNgay() });
    }

    if (hanhDong === 'adminCtv') {
      var dsDonCtv = docSheet(CH.SHEET.ORDERS);
      var theoCtv = {};
      var dsTongHop = tongHopToanBo();
      for (var t = 0; t < dsTongHop.length; t++) {
        theoCtv[dsTongHop[t].ma_ctv] = donChoCtv(dsDonCtv, dsTongHop[t].ma_ctv);
      }
      return tra({ ok: true, ctv: dsTongHop, don_theo_ctv: theoCtv,
                   cap_nhat: chuoiNgay() });
    }

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

    /* MÃ ĐƠN DO TRANG WEB GỬI LÊN LÀ KHOÁ CHỐNG TRÙNG.
       ─────────────────────────────────────────────────────────────────────
       Trang cấp đơn gửi cùng một đơn LÊN NHIỀU LẦN, và đó là cố ý: một lần
       khi sinh mã QR (để không mất khách bỏ dở), một lần khi khách bấm "đã
       chuyển khoản", một lần nữa nếu khách đăng ký nhận bản giấy. Thời Netlify
       Forms thì mỗi lần là một bản ghi lead, vô hại.
       Trên SỔ CÁI thì không: mỗi lần gửi lại đẻ thêm một dòng đơn. Tệ hơn,
       vòng lặp sinh mã bên dưới thấy mã trùng nên ĐỔI SANG MÃ MỚI — hai dòng
       khác mã, cùng một xe, cùng một khách. Doanh thu nhân đôi, hoa hồng nhân
       đôi, và nhìn bảng không ai biết đó là một đơn.
       Nên: mã web đã tồn tại thì KHÔNG tạo dòng mới. Ghi lại việc khách gửi
       lại (có ích cho đối soát: "khách báo đã chuyển khoản") rồi trả về chính
       đơn cũ.
       Vòng sinh lại bên dưới chỉ còn dùng cho mã do máy chủ tự sinh. */
    var dsDon = docSheet(CH.SHEET.ORDERS);
    var daCo = {};
    for (var j = 0; j < dsDon.length; j++) daCo[String(dsDon[j].order_id)] = dsDon[j];

    var maWeb = String(p.orderId || '').trim();
    if (maWeb && daCo[maWeb]) return ghiNhanLaiDon(daCo[maWeb], p);

    var ma = maWeb || sinhMaDon();
    var lan = 0;
    while (daCo[ma]) {
      if (++lan > 5) return traLoi('Không sinh được mã đơn không trùng.', 'MA_TRUNG');
      ma = sinhMaDon();
    }

    var phi = tachPhi(p.amount, p.phiGoc);
    var nay = bayGio();

    /* Bảng tra tên cột → giá trị, thay cho chuỗi if/else dài.
       Cột nào không có trong bảng này thì để trống — GCN_Status, Commission,
       Payout_ID... đều do nghiệp vụ sau này điền, không phải lúc tạo đơn. */
    var giaTri = {
      'Order_ID'       : ma,
      'CTV_ID'         : maCtv,
      'Ngày tạo'       : nay,
      'Khách hàng'     : String(p.customerName || '').trim(),
      'SĐT'            : chuanHoaSdt(p.phone),
      'Email'          : String(p.email || '').trim(),
      'Biển số'        : String(p.plate || '').trim().toUpperCase(),
      'Sản phẩm'       : String(p.product || '').trim(),
      'Nhóm xe'        : String(p.nhomXe || p.vehicleGroup || '').trim().toLowerCase(),
      'Phí gốc'        : phi.phi_goc,
      'VAT'            : phi.vat,
      'Phí'            : phi.tong_phi,
      'Payment_Status' : CH.TT_TT.CHO,
      'Nguồn ghi nhận' : String(p.nguonGhiNhan || '').trim(),
      'Ghi chú'        : ghiChuThem,

      /* Hồ sơ để nhân viên cấp giấy chứng nhận và chuyển phát. */
      'Chi tiết xe'    : String(p.chiTietXe || '').trim(),
      'Số khung'       : String(p.soKhung || '').trim().toUpperCase(),
      'Số máy'         : String(p.soMay || '').trim().toUpperCase(),
      'Hiệu xe'        : String(p.hieuXe || '').trim(),
      'Năm SX'         : String(p.namSx || '').trim(),
      'Số chỗ'         : String(p.soCho || '').trim(),
      'Thời hạn'       : String(p.thoiHan || '').trim(),
      'Ngày hiệu lực'  : String(p.ngayHieuLuc || '').trim(),
      'Ngày hết hạn'   : String(p.ngayHetHan || '').trim(),
      'Địa chỉ khách'  : String(p.diaChi || '').trim(),
      'Xuất hoá đơn'   : String(p.xuatHoaDon || '').trim(),
      'Tên công ty'    : String(p.tenCty || '').trim(),
      'MST'            : String(p.mst || '').trim(),
      'Địa chỉ công ty': String(p.diaChiCty || '').trim(),
      'Email hoá đơn'  : String(p.emailHd || '').trim(),
      'Địa chỉ giao GCN': String(p.diaChiGiao || '').trim(),
      'Người nhận'     : String(p.nguoiNhan || '').trim(),
      'SĐT người nhận' : p.sdtNhan ? chuanHoaSdt(p.sdtNhan) : '',
    };
    var hang = [];
    for (var k = 0; k < CH.COT_ORDERS.length; k++) {
      var c = CH.COT_ORDERS[k];
      hang.push(giaTri[c] === undefined ? '' : giaTri[c]);
    }
    laySheet(CH.SHEET.ORDERS).appendRow(hang);
    ghiNhatKy('createOrder', ma, maCtv, 'website', '', CH.TT_TT.CHO, ghiChuThem);

    return tra({ ok: true, orderId: ma, ctvId: maCtv,
                 phi_goc: phi.phi_goc, vat: phi.vat, tong_phi: phi.tong_phi,
                 canh_bao: ghiChuThem || null });
  });
}

/**
 * Trang web gửi lại một đơn ĐÃ CÓ. Không tạo dòng mới.
 * GỌI BÊN TRONG KHOÁ.
 *
 * Việc duy nhất cần ghi lại là khách vừa làm gì: "Khách báo đã chuyển khoản"
 * là tín hiệu cho kế toán đi soi sao kê, "Đăng ký nhận bản giấy" là việc của
 * bộ phận phát hành. Ghi vào cột Ghi chú kèm giờ.
 *
 * KHÔNG đụng vào Payment_Status: khách nói đã chuyển tiền không phải là tiền
 * đã về. Chỉ kế toán, sau khi thấy sao kê, mới được đổi trạng thái đó.
 */
function ghiNhanLaiDon(don, p) {
  var tt = String(p.trangThaiKhach || '').trim();
  if (tt) {
    var cu = String(don.ghi_chu || '');
    if (cu.indexOf(tt) < 0) {
      var them = chuoiNgay() + ' — ' + tt;
      ghiO(CH.SHEET.ORDERS, don._hang, 'Ghi chú', cu ? cu + ' | ' + them : them);
    }
  }
  ghiNhatKy('donGuiLai', don.order_id, don.ctv_id, 'website', '', tt,
            'không tạo dòng mới');
  return tra({
    ok: true, orderId: don.order_id, ctvId: don.ctv_id,
    phi_goc: don.phi_goc, vat: don.vat, tong_phi: don.tong_phi,
    trung_lap: true, trang_thai_khach: tt, canh_bao: null,
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

      /* Mã giao dịch ngân hàng KHÔNG còn bắt buộc (quyết định 19/09/2026):
         người đối soát đã nhìn sao kê rồi mới đổi trạng thái, nên thao tác đó
         là căn cứ. Nhưng KHI CÓ điền thì vẫn phải là mã chưa dùng cho đơn nào
         khác — Sheets không có ràng buộc duy nhất nên phải tự kiểm, và phải
         kiểm BÊN TRONG khoá. Giữ lại vì nó không cản trở ai mà vẫn bắt được
         trường hợp một lần chuyển khoản bị dán cho hai đơn. */
      if (tt === CH.TT_TT.DA_TRA) {
        var ref = String(p.bankRef || '').trim();
        if (ref) {
          for (var j = 0; j < ds.length; j++) {
            if (String(ds[j].bank_ref || '').trim() === ref &&
                String(ds[j].order_id) !== ma) {
              return traLoi('Mã giao dịch ' + ref + ' đã dùng cho đơn ' +
                            ds[j].order_id + '.', 'REF_TRUNG');
            }
          }
          ghiO(CH.SHEET.ORDERS, don._hang, 'Bank_Ref', ref);
        }
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

/**
 * NHÂN VIÊN SỬA HỒ SƠ ĐƠN TỪ MÀN HÌNH QUẢN TRỊ.
 *
 * Khách gõ nhầm số khung, thiếu địa chỉ giao giấy, sai năm sản xuất — những
 * thứ đó phải sửa được, và sửa ở dashboard thì có nhật ký, khác hẳn sửa tay
 * trong bảng tính.
 *
 * DANH SÁCH CHO PHÉP, KHÔNG PHẢI DANH SÁCH CẤM. Thêm cột mới vào ORDERS sau
 * này sẽ KHÔNG tự động sửa được từ ngoài — phải khai thêm ở đây một cách có ý
 * thức.
 *
 * BA CỘT TIỀN (Phí gốc, VAT, Phí) CỐ Ý KHÔNG CHO SỬA.
 * Hoa hồng đã được tính và đóng băng theo phí gốc tại thời điểm đủ điều kiện.
 * Sửa phí mà không tính lại hoa hồng là sổ tự mâu thuẫn với chính nó; tính lại
 * thì lại đổi số tiền của một đơn đã chốt với cộng tác viên. Đơn sai phí phải
 * HUỶ rồi cấp lại đơn mới — dài hơn một chút, nhưng sổ luôn đúng.
 *
 * Commission, Commission_Rate, Commission_Status, Payout_ID cũng không cho
 * sửa: chúng do mã sinh ra, không phải do người gõ.
 */
var COT_ADMIN_SUA = [
  'Khách hàng', 'SĐT', 'Email', 'Biển số', 'Chi tiết xe', 'Số khung', 'Số máy',
  'Hiệu xe', 'Năm SX', 'Số chỗ', 'Thời hạn', 'Ngày hiệu lực', 'Ngày hết hạn',
  'Địa chỉ khách', 'Xuất hoá đơn', 'Tên công ty', 'MST', 'Địa chỉ công ty',
  'Email hoá đơn', 'Địa chỉ giao GCN', 'Người nhận', 'SĐT người nhận',
  'GCN_Status', 'Ghi chú'
];

function capNhatDon(p) {
  var ma = String(p.orderId || '').trim();
  if (!ma) return traLoi('Thiếu Order_ID.', 'THIEU');

  var truong;
  try { truong = JSON.parse(p.truong || '{}'); }
  catch (e) { return traLoi('Danh sách trường sửa không phải JSON hợp lệ.', 'DU_LIEU'); }

  return khoaVaChay(function () {
    var ds = docSheet(CH.SHEET.ORDERS);
    var don = null;
    for (var i = 0; i < ds.length; i++) {
      if (String(ds[i].order_id) === ma) { don = ds[i]; break; }
    }
    if (!don) return traLoi('Không tìm thấy đơn ' + ma, 'KHONG_CO');

    var nguoi = String(p.nguoi || 'quan-tri');
    var daDoi = [];
    var tuChoi = [];

    for (var ten in truong) {
      if (!Object.prototype.hasOwnProperty.call(truong, ten)) continue;
      if (COT_ADMIN_SUA.indexOf(ten) < 0) { tuChoi.push(ten); continue; }
      var moi = truong[ten] == null ? '' : String(truong[ten]);
      var khoa = KHOA_COT[ten];
      var cu = khoa ? String(don[khoa] == null ? '' : don[khoa]) : '';
      if (moi === cu) continue;
      ghiO(CH.SHEET.ORDERS, don._hang, ten, moi);
      ghiNhatKy('capNhatDon', ma, don.ctv_id, nguoi, cu, moi, ten);
      daDoi.push(ten);
    }

    /* Đổi GCN_Status có thể là mốc sinh hoa hồng (khi CH.MOC_SINH_HOA_HONG
       đặt 'ISSUED'), nên phải chạy lại phép kiểm — vẫn bên trong khoá. */
    var kq = null;
    if (daDoi.indexOf('GCN_Status') >= 0) {
      don.gcn_status = String(truong['GCN_Status'] || '');
      kq = sinhHoaHongNeuDu(don, nguoi);
    }

    return tra({ ok: true, orderId: ma, da_doi: daDoi,
                 tu_choi: tuChoi, hoa_hong: kq });
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

  /* MÃ GIAO DỊCH NGÂN HÀNG KHÔNG BẮT BUỘC, NHƯNG CÓ THÌ PHẢI DUY NHẤT.
     capNhatTrangThai() đã kiểm điều này trước khi ghi, nhưng đường đi thật của
     nhân viên là sửa tay trong bảng tính — đường đó không qua hàm kia. Không
     kiểm ở đây thì một lần chuyển khoản dán vào hai đơn là trả hoa hồng hai
     lần, và bảng nhìn vẫn sạch sẽ.
     Ô trống thì bỏ qua đoạn này và hoa hồng vẫn sinh — PAID là đủ. */
  var ref = String(don.bank_ref || '').trim();
  if (ref) {
    var dsKiem = docSheet(CH.SHEET.ORDERS);
    for (var k = 0; k < dsKiem.length; k++) {
      if (String(dsKiem[k].order_id) === String(don.order_id)) continue;
      if (String(dsKiem[k].bank_ref || '').trim() !== ref) continue;
      var loiRef = 'Mã giao dịch ' + ref + ' đã dùng cho đơn ' + dsKiem[k].order_id;
      ghiO(CH.SHEET.ORDERS, don._hang, 'Ghi chú',
           (don.ghi_chu ? don.ghi_chu + ' | ' : '') + 'CHƯA TÍNH HOA HỒNG: ' + loiRef);
      ghiNhatKy('hoaHongLoi', don.order_id, don.ctv_id, nguoi, '', '', loiRef);
      return { sinh: false, loi: loiRef };
    }
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

    /* Vẫn theo dõi Bank_Ref dù nó không còn là điều kiện sinh hoa hồng: khi
       đơn chưa sinh được vì lý do khác (thiếu quy tắc, sai nhóm xe) và nhân
       viên quay lại điền nốt mã giao dịch, lần sửa đó là cơ hội chạy lại. */
    var tenCot = sh.getRange(1, e.range.getColumn()).getValue();
    if (tenCot !== 'Payment_Status' && tenCot !== 'GCN_Status' &&
        tenCot !== 'Bank_Ref') return;

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

/**
 * Cập nhật hồ sơ cộng tác viên trong sheet CTV.
 *
 * VÌ SAO CẦN: hồ sơ đăng nhập nằm ở Netlify Blobs, còn sheet CTV là nơi màn
 * hình chi trả đọc TÀI KHOẢN NHẬN TIỀN. Cộng tác viên đổi số tài khoản trên
 * web mà sheet không đổi theo thì đến kỳ chi trả, tiền đi vào tài khoản cũ.
 * Không ai phát hiện cho tới khi họ báo chưa nhận được.
 *
 * Chỉ ghi đè những trường được gửi lên — trường bỏ trống giữ nguyên giá trị cũ.
 */
function capNhatCtv(p) {
  var ma = chuanHoaMaCtv(p.ctvId || '');
  if (!ma) return traLoi('Thiếu mã cộng tác viên.', 'THIEU');

  return khoaVaChay(function () {
    var ds = docSheet(CH.SHEET.CTV);
    var ban = null;
    for (var i = 0; i < ds.length; i++) {
      if (chuanHoaMaCtv(ds[i].ctv_id) === ma) { ban = ds[i]; break; }
    }
    /* CHƯA CÓ DÒNG TRONG SHEET THÌ TẠO BÙ, KHÔNG BÁO LỖI RỒI THÔI.
       Cộng tác viên đăng ký trước khi bảng tính này tồn tại (hoặc trước khi
       Netlify có GAS_URL) thì hồ sơ chỉ nằm ở Netlify Blobs. Họ vào dashboard
       điền số tài khoản, thấy báo "Đã lưu" — nhưng sheet không có dòng nào để
       cập nhật, nên màn hình chi trả của kế toán không thấy số tài khoản đó.
       Đến kỳ chi trả mới lộ, và lộ bằng cách tiền không tới được người ta.
       Tạo bù ở đây thì mọi cộng tác viên cũ tự vào sổ ngay lần đầu họ lưu hồ
       sơ, không cần ai nhớ đi gõ tay. */
    if (!ban) {
      if (!sdtHopLe(p.phone)) {
        return traLoi('Không tìm thấy cộng tác viên ' + ma +
                      ' và không có số điện thoại hợp lệ để tạo bù.', 'KHONG_CO');
      }
      laySheet(CH.SHEET.CTV).appendRow([
        ma, String(p.hoTen || '').trim(), chuanHoaSdt(p.phone),
        String(p.email || '').trim(), 'ACTIVE',
        String(p.nganHang || ''), String(p.soTaiKhoan || ''),
        String(p.chuTaiKhoan || ''), bayGio(),
      ]);
      ghiNhatKy('boSungCtv', '', ma, 'website', '', 'ACTIVE',
                'tạo bù dòng CTV lúc cập nhật hồ sơ');
      return tra({ ok: true, ctvId: ma, da_tao_moi: true,
                   da_doi: ['Ngân hàng', 'Số tài khoản', 'Chủ tài khoản'] });
    }

    var doi = [];
    [['hoTen','Họ tên'], ['email','Email'], ['nganHang','Ngân hàng'],
     ['soTaiKhoan','Số tài khoản'], ['chuTaiKhoan','Chủ tài khoản']
    ].forEach(function (c) {
      if (p[c[0]] == null || String(p[c[0]]).trim() === '') return;
      ghiO(CH.SHEET.CTV, ban._hang, c[1], String(p[c[0]]).trim());
      doi.push(c[1]);
    });

    if (doi.length) {
      ghiNhatKy('capNhatCtv', '', ma, 'website', '', doi.join(', '), '');
    }
    return tra({ ok: true, ctvId: ma, da_doi: doi });
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
