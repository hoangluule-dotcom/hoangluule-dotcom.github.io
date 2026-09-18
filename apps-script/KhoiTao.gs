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

  /* Đặt tên bảng tính, nhưng CHỈ khi nó còn mang tên mặc định của Google.
     Đổi tên vô điều kiện thì mỗi lần chạy lại hàm này sẽ xoá mất cái tên người
     dùng tự đặt — một hàm "dựng lại cấu trúc" không có quyền làm việc đó. */
  var TEN_MAC_DINH = ['Untitled spreadsheet', 'Bảng tính không có tiêu đề'];
  if (TEN_MAC_DINH.indexOf(bt.getName()) >= 0) bt.rename('DBV247 — Affiliate TNDS');

  dungSheet_(bt, CH.SHEET.CTV,     CH.COT_CTV);
  dungSheet_(bt, CH.SHEET.ORDERS,  CH.COT_ORDERS);
  dungSheet_(bt, CH.SHEET.QUY_TAC, CH.COT_QUY_TAC);
  dungSheet_(bt, CH.SHEET.PAYOUTS, CH.COT_PAYOUTS);
  dungSheet_(bt, CH.SHEET.NHAT_KY, CH.COT_NHAT_KY);

  dungDanhSachChon_(bt);
  dungKhoaCot_(bt);
  dungDinhDang_(bt);

  thongBao_(
    'Đã dựng xong 5 sheet.\n\n' +
    'Việc còn lại:\n' +
    '1. Điền COMMISSION_RULES (xem hướng dẫn) — chưa có quy tắc thì hệ thống ' +
    'sẽ KHÔNG tính hoa hồng và báo rõ, cố ý như vậy.\n' +
    '2. Đặt KHOA_NOI_BO trong Project Settings → Script Properties.\n' +
    '3. Deploy → New deployment → Web app.\n' +
    '4. Triggers → Add Trigger → hàm onSuaDBV → sự kiện On edit.'
  );
}

/**
 * Báo cho người chạy biết kết quả, KHÔNG được ném lỗi.
 *
 * Chạy hàm từ trình soạn thảo Apps Script thì không có giao diện bảng tính nào
 * đang mở, và SpreadsheetApp.getUi() ném "Cannot call SpreadsheetApp.getUi()
 * from this context". Lần đầu chạy taoBangTinh() đã dính đúng lỗi này: 5 sheet
 * đã dựng xong hoàn chỉnh, nhưng dòng alert cuối cùng ném lỗi nên nhật ký chỉ
 * hiện một dòng Exception màu đỏ — trông y như thất bại toàn tập.
 *
 * Một câu thông báo không bao giờ được phép làm hỏng kết quả của việc đã xong.
 */
function thongBao_(vanBan) {
  try {
    SpreadsheetApp.getUi().alert(vanBan);
  } catch (e) {
    console.log(vanBan);
  }
}

function dungSheet_(bt, ten, cot) {
  var sh = bt.getSheetByName(ten);
  if (!sh) sh = bt.insertSheet(ten);

  /* NỚI RỘNG TRƯỚC KHI GHI TIÊU ĐỀ.
     Lần chạy đầu đã cắt sheet xuống đúng số cột lúc đó. Thêm cột mới vào
     CH.COT_ORDERS rồi chạy lại mà không nới ra thì setValues() ném lỗi vì ghi
     vượt ngoài vùng — và ném SAU khi đã sửa vài sheet khác, để lại bảng tính
     dựng dở. */
  if (sh.getMaxColumns() < cot.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), cot.length - sh.getMaxColumns());
  }

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

/**
 * Khoá mọi cột trừ 4 cột nhân viên được sửa tay.
 *
 * MỘT lớp bảo vệ cho cả sheet, rồi MỞ RA đúng 4 cột — chứ không phải 18 lớp
 * bảo vệ, mỗi cột một lớp.
 *
 * Bản trước làm theo kiểu từng cột: 18 lần protect() + 18 lần removeEditors(),
 * gần 40 lượt gọi API, mất hơn 30 giây. Chạy từ trình soạn thảo (giới hạn 6
 * phút) thì xong, nhưng chạy từ menu bảng tính — giới hạn 30 GIÂY — thì bị cắt
 * giữa chừng: một nửa số cột đã gỡ khoá cũ mà chưa kịp khoá lại, và không có
 * lỗi nào hiện ra ở chỗ dễ thấy. Đúng loại hỏng tệ nhất: cột tiền hở ra mà mọi
 * thứ trông vẫn bình thường.
 *
 * Một lớp bảo vệ chỉ mất vài lượt gọi, nên hàm này chạy lọt cả hai giới hạn.
 */
function dungKhoaCot_(bt) {
  var sh = bt.getSheetByName(CH.SHEET.ORDERS);
  var tieuDe = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var soDong = Math.max(sh.getMaxRows() - 1, 1);

  goBaoVeCu_(sh);

  var moRa = [];
  for (var c = 0; c < tieuDe.length; c++) {
    if (CH.COT_NHAN_VIEN_SUA.indexOf(tieuDe[c]) >= 0) {
      moRa.push(sh.getRange(2, c + 1, soDong, 1));
    }
  }
  var p = sh.protect().setDescription('DBV247 — chỉ 4 cột nhân viên được sửa tay');
  if (moRa.length) p.setUnprotectedRanges(moRa);
  p.removeEditors(p.getEditors());
  if (p.canDomainEdit && p.canDomainEdit()) p.setDomainEdit(false);

  /* Sheet nhật ký: không ai được sửa, kể cả chủ bảng tính cũng nên tránh */
  var nk = bt.getSheetByName(CH.SHEET.NHAT_KY);
  goBaoVeCu_(nk);
  var pn = nk.protect().setDescription('DBV247 — nhật ký, chỉ ghi thêm');
  pn.removeEditors(pn.getEditors());
}

/* Gỡ hết phần khoá cũ DO CHÍNH MÃ NÀY TẠO RA (mô tả bắt đầu bằng "DBV247"),
   cả kiểu theo dải ô lẫn kiểu cả sheet — bản cũ chỉ gỡ kiểu dải ô, nên đổi sang
   cách mới mà không gỡ kiểu cũ là chồng hai lớp lên nhau. Phần bảo vệ do người
   khác đặt tay thì không đụng vào. */
function goBaoVeCu_(sh) {
  [SpreadsheetApp.ProtectionType.RANGE, SpreadsheetApp.ProtectionType.SHEET]
    .forEach(function (loai) {
      var ds = sh.getProtections(loai);
      for (var i = 0; i < ds.length; i++) {
        if ((ds[i].getDescription() || '').indexOf('DBV247') === 0) ds[i].remove();
      }
    });
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
  /* Số khung/số máy có thể toàn chữ số và bắt đầu bằng 0; MST cũng vậy. Để
     Sheets tự hiểu thành số là mất số 0 đầu, và mất số 0 đầu của số khung là
     cấp sai giấy chứng nhận. */
  ['Order_ID', 'SĐT', 'Biển số', 'Bank_Ref', 'Số khung', 'Số máy', 'MST',
   'Năm SX', 'Số chỗ', 'SĐT người nhận'].forEach(function (t) {
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

  /* Đã có dữ liệu thì DỪNG HẲN, không hỏi.
     Trước đây chỗ này hỏi Yes/No bằng getUi(), nhưng chạy từ trình soạn thảo
     thì getUi() ném lỗi — và quan trọng hơn: thêm nhầm một dòng 40% thứ hai
     cùng ngày hiệu lực là hai quy tắc tranh nhau cho cùng một đơn. chonQuyTac()
     sẽ chọn một trong hai một cách tuỳ ý, và không ai biết vì sao hai đơn giống
     hệt nhau lại ra hai số hoa hồng. Không thêm là lựa chọn an toàn duy nhất. */
  if (sh.getLastRow() > 1) {
    thongBao_('COMMISSION_RULES đã có dữ liệu — KHÔNG điền thêm gì cả.\n' +
              'Muốn đổi mức: thêm dòng mới bằng tay với NGÀY HIỆU LỰC mới, ' +
              'đừng sửa dòng cũ (đơn cũ phải giữ nguyên mức của nó).');
    return;
  }
  sh.appendRow(['oto',  'percent', 0.4, 'phi_goc', new Date('2026-09-01'),
                'Mức khởi điểm — 40% phí gốc, không gồm VAT']);
  sh.appendRow(['moto', 'percent', 0.4, 'phi_goc', new Date('2026-09-01'),
                'Mức khởi điểm — 40% phí gốc, không gồm VAT']);
  thongBao_('Đã điền 2 dòng: oto và moto, 40% trên phí gốc, ' +
            'hiệu lực từ 01/09/2026.');
}

/** Menu cho tiện, khỏi phải vào trình soạn thảo Apps Script mỗi lần. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DBV247')
    .addItem('Dựng lại cấu trúc bảng tính', 'taoBangTinh')
    .addItem('Điền quy tắc hoa hồng 40%', 'dienQuyTacHoaHong')
    .addToUi();
}
