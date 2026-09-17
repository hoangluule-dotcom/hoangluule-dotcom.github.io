/**
 * DBV247 — Affiliate TNDS · TẠO BẢNG TÍNH
 * ===========================================================================
 * Chạy MỘT LẦN: mở Apps Script → chọn hàm taoBangTinh → Run.
 * Tạo đủ 5 sheet, hàng tiêu đề, định dạng, danh sách chọn cho ô trạng thái, và
 * KHOÁ những cột nhân viên không được sửa tay.
 *
 * Chạy lại được nhiều lần: sheet đã có thì giữ nguyên dữ liệu, chỉ dựng lại
 * tiêu đề và phần khoá.
 *
 * VÌ SAO PHẢI KHOÁ CỘT
 * Nhân viên làm việc trực tiếp trong bảng tính (đặc tả mục 15). Một lần kéo
 * nhầm chuột trong Google Sheets có thể đè hàng chục dòng, và Sheets không hỏi
 * lại. Cột tiền và cột trạng thái hoa hồng vì vậy chỉ được ghi bằng mã, không
 * ghi bằng tay. Nhân viên chỉ sửa 4 cột: Payment_Status, Bank_Ref, GCN_Status,
 * Ghi chú.
 */

function taoBangTinh() {
  var bt = SpreadsheetApp.getActiveSpreadsheet();
  bt.setSpreadsheetTimeZone(CH.MUI_GIO);

  dungSheet_(bt, CH.SHEET.CTV,     CH.COT_CTV);
  dungSheet_(bt, CH.SHEET.ORDERS,  CH.COT_ORDERS);
  dungSheet_(bt, CH.SHEET.QUY_TAC, CH.COT_QUY_TAC);
  dungSheet_(bt, CH.SHEET.PAYOUTS, CH.COT_PAYOUTS);
  dungSheet_(bt, CH.SHEET.NHAT_KY, CH.COT_NHAT_KY);

  dungDanhSachChon_(bt);
  dungKhoaCot_(bt);
  dungDinhDang_(bt);

  SpreadsheetApp.getUi().alert(
    'Đã dựng xong 5 sheet.\n\n' +
    'Việc còn lại:\n' +
    '1. Điền COMMISSION_RULES (xem hướng dẫn) — chưa có quy tắc thì hệ thống ' +
    'sẽ KHÔNG tính hoa hồng và báo rõ, cố ý như vậy.\n' +
    '2. Đặt KHOA_NOI_BO trong Project Settings → Script Properties.\n' +
    '3. Deploy → New deployment → Web app.\n' +
    '4. Triggers → Add Trigger → hàm onSuaDBV → sự kiện On edit.'
  );
}

function dungSheet_(bt, ten, cot) {
  var sh = bt.getSheetByName(ten);
  if (!sh) sh = bt.insertSheet(ten);

  sh.getRange(1, 1, 1, cot.length).setValues([cot]);
  sh.getRange(1, 1, 1, cot.length)
    .setFontWeight('bold').setBackground('#E8F5E9').setFontColor('#005A2B');
  sh.setFrozenRows(1);

  /* Cắt bớt cột thừa để không ai lỡ gõ dữ liệu vào vùng ngoài bảng */
  if (sh.getMaxColumns() > cot.length) {
    sh.deleteColumns(cot.length + 1, sh.getMaxColumns() - cot.length);
  }
  return sh;
}

function dungDanhSachChon_(bt) {
  var sh = bt.getSheetByName(CH.SHEET.ORDERS);
  var soHang = Math.max(sh.getMaxRows() - 1, 1);

  /* Gõ tay "Paid" thay vì "PAID" là đơn đứng im mà không ai hiểu vì sao.
     Danh sách chọn loại bỏ hẳn nhóm lỗi đó. */
  dat_(sh, 'Payment_Status', [CH.TT_TT.CHO, CH.TT_TT.DA_TRA, CH.TT_TT.HUY, CH.TT_TT.HOAN], soHang);
  dat_(sh, 'GCN_Status', ['', CH.TT_GCN.DA], soHang);
  dat_(sh, 'Commission_Status',
       ['', CH.TT_HH.DU, CH.TT_HH.DA_TRA, CH.TT_HH.THU_HOI], soHang);

  var shq = bt.getSheetByName(CH.SHEET.QUY_TAC);
  var hq = Math.max(shq.getMaxRows() - 1, 1);
  dat_(shq, 'Loại', ['percent', 'fixed'], hq);
  dat_(shq, 'Căn cứ', ['phi_goc', 'tong_phi'], hq);
  dat_(shq, 'Nhóm xe', ['oto', 'moto'], hq);

  function dat_(sheet, tenCot, ds, soDong) {
    var tieuDe = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var c = tieuDe.indexOf(tenCot) + 1;
    if (c < 1) return;
    var qt = SpreadsheetApp.newDataValidation()
      .requireValueInList(ds, true).setAllowInvalid(false).build();
    sheet.getRange(2, c, soDong, 1).setDataValidation(qt);
  }
}

function dungKhoaCot_(bt) {
  var sh = bt.getSheetByName(CH.SHEET.ORDERS);
  var tieuDe = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

  /* Gỡ hết phần khoá cũ rồi dựng lại, để chạy lại hàm này không chồng lớp */
  var cu = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  for (var i = 0; i < cu.length; i++) {
    if (cu[i].getDescription() && cu[i].getDescription().indexOf('DBV247') === 0) {
      cu[i].remove();
    }
  }

  for (var c = 0; c < tieuDe.length; c++) {
    var ten = tieuDe[c];
    if (CH.COT_NHAN_VIEN_SUA.indexOf(ten) >= 0) continue;   // 4 cột cho phép sửa
    var p = sh.getRange(2, c + 1, Math.max(sh.getMaxRows() - 1, 1), 1)
             .protect()
             .setDescription('DBV247 — cột "' + ten + '" chỉ được ghi bằng mã');
    p.removeEditors(p.getEditors());
    if (p.canDomainEdit && p.canDomainEdit()) p.setDomainEdit(false);
  }

  /* Sheet nhật ký: không ai được sửa, kể cả chủ bảng tính cũng nên tránh */
  var nk = bt.getSheetByName(CH.SHEET.NHAT_KY);
  var pn = nk.protect().setDescription('DBV247 — nhật ký, chỉ ghi thêm');
  pn.removeEditors(pn.getEditors());
}

function dungDinhDang_(bt) {
  var sh = bt.getSheetByName(CH.SHEET.ORDERS);
  var tieuDe = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var soDong = Math.max(sh.getMaxRows() - 1, 1);

  ['Phí gốc', 'VAT', 'Phí', 'Commission'].forEach(function (t) {
    var c = tieuDe.indexOf(t) + 1;
    if (c > 0) sh.getRange(2, c, soDong, 1).setNumberFormat('#,##0');
  });
  var cr = tieuDe.indexOf('Commission_Rate') + 1;
  if (cr > 0) sh.getRange(2, cr, soDong, 1).setNumberFormat('0.00%');

  ['Ngày tạo', 'Ngày nhận tiền'].forEach(function (t) {
    var c = tieuDe.indexOf(t) + 1;
    if (c > 0) sh.getRange(2, c, soDong, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  });

  /* Biển số và mã đơn phải là CHỮ, không để Sheets tự hiểu thành số hay ngày —
     "30A12345" thì không sao, nhưng "0912345678" mà thành số là mất số 0 đầu. */
  ['Order_ID', 'SĐT', 'Biển số', 'Bank_Ref'].forEach(function (t) {
    var c = tieuDe.indexOf(t) + 1;
    if (c > 0) sh.getRange(2, c, soDong, 1).setNumberFormat('@');
  });

  var shc = bt.getSheetByName(CH.SHEET.CTV);
  var tdc = shc.getRange(1, 1, 1, shc.getLastColumn()).getValues()[0];
  ['SĐT', 'Số tài khoản'].forEach(function (t) {
    var c = tdc.indexOf(t) + 1;
    if (c > 0) shc.getRange(2, c, Math.max(shc.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  });
}

/**
 * Điền quy tắc hoa hồng đã chốt: 40% trên PHÍ GỐC cho cả ô tô và xe máy,
 * hiệu lực từ 01/09/2026.
 *
 * Ngày hiệu lực đặt sớm hơn hôm nay là cố ý: quy tắc được tra theo NGÀY TẠO
 * ĐƠN, nên nếu chỉ có hiệu lực từ hôm nay thì mọi đơn tạo trước đó sẽ không
 * tìm được quy tắc nào và không tính được hoa hồng.
 *
 * Đổi mức sau này: THÊM DÒNG MỚI với ngày hiệu lực mới, KHÔNG sửa dòng cũ.
 */
function dienQuyTacHoaHong() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CH.SHEET.QUY_TAC);
  var da = sh.getLastRow() > 1;
  if (da) {
    var tra = SpreadsheetApp.getUi().alert(
      'COMMISSION_RULES đã có dữ liệu. Thêm hai dòng 40% nữa?',
      SpreadsheetApp.getUi().ButtonSet.YES_NO);
    if (tra !== SpreadsheetApp.getUi().Button.YES) return;
  }
  sh.appendRow(['oto',  'percent', 0.4, 'phi_goc', new Date('2026-09-01'),
                'Mức khởi điểm — 40% phí gốc, không gồm VAT']);
  sh.appendRow(['moto', 'percent', 0.4, 'phi_goc', new Date('2026-09-01'),
                'Mức khởi điểm — 40% phí gốc, không gồm VAT']);
}

/** Menu cho tiện, khỏi phải vào trình soạn thảo Apps Script mỗi lần. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DBV247')
    .addItem('Dựng lại cấu trúc bảng tính', 'taoBangTinh')
    .addItem('Điền quy tắc hoa hồng 40%', 'dienQuyTacHoaHong')
    .addToUi();
}
