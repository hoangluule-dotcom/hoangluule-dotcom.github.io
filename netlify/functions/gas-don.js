/* DBV247 — Nhận đơn từ trang cấp đơn, ghi vào Google Sheets qua Apps Script
   ===========================================================================
   POST /.netlify/functions/gas-don
        Content-Type: application/x-www-form-urlencoded  (hoặc JSON)

   Đây là chỗ THAY THẾ Netlify Forms làm nơi nhận đơn. Lý do đổi không phải vì
   Forms chậm hay xấu, mà vì gói miễn phí có hạn mức lượt gửi mỗi tháng và
   VƯỢT HẠN MỨC THÌ ĐƠN BỊ BỎ IM LẶNG — không lỗi, không thông báo, đơn biến
   mất. Mỗi khách tốn hai lượt (một lúc sinh QR, một lúc báo đã chuyển khoản),
   nên ngưỡng đó tới nhanh hơn cảm giác.

   TRANG WEB VẪN GIỮ NETLIFY FORMS LÀM ĐƯỜNG DỰ PHÒNG: nếu hàm này hỏng hoặc
   Apps Script không trả lời, assets/cap-don-tnds.js sẽ gửi sang Forms như cũ.
   Thà có đơn nằm ở hai nơi còn hơn mất đơn của khách.
*/

'use strict';

const G = require('./lib/gas');

/* Thông báo Telegram trước đây do submission-created.js bắn khi có bản ghi mới
   trong Netlify Forms. Đơn không còn đi qua Forms nữa thì thông báo cũng tắt
   theo — nên hàm này tự bắn. Bỏ quên chỗ này là nhân viên không biết có đơn
   mới mà xử lý. */
async function baoTelegram(don) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;

  /* KHÔNG gửi CCCD và địa chỉ khách qua Telegram (NĐ 13/2023). Chỉ đủ để
     nhân viên biết có đơn mới và tra được trong bảng tính. */

  /* Đơn gửi lại KHÔNG phải đơn mới — báo "đơn mới" lần thứ hai cho cùng một xe
     là dạy nhân viên bỏ qua thông báo. Nhưng cũng không im lặng: "khách báo đã
     chuyển khoản" chính là lúc kế toán cần mở sao kê. */
  const dong = don.trung_lap
    ? [
        '🔔 *Cập nhật đơn*',
        'Mã đơn: `' + don.orderId + '`',
        'Xe: ' + (don.plate || '—'),
        don.trang_thai_khach || 'Khách gửi lại thông tin',
      ].join('\n')
    : [
        '🧾 *Đơn TNDS mới*',
        'Mã đơn: `' + don.orderId + '`',
        'Xe: ' + (don.plate || '—') + ' · ' + (don.product || ''),
        'Phí: ' + Number(don.tong_phi || 0).toLocaleString('vi-VN') + 'đ',
        don.ctvId ? 'CTV: ' + don.ctvId : 'Không gắn mã CTV',
      ].join('\n');

  try {
    await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: dong, parse_mode: 'Markdown' }),
    });
  } catch (err) {
    /* Thông báo hỏng không được làm hỏng việc ghi đơn. */
    console.error('Telegram: ' + err.message);
  }
}

function docThan(event) {
  const kieu = (event.headers['content-type'] || event.headers['Content-Type'] || '');
  const tho = event.body || '';
  if (kieu.indexOf('application/json') >= 0) {
    try { return JSON.parse(tho); } catch (e) { return null; }
  }
  return Object.fromEntries(new URLSearchParams(tho));
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return G.json(405, { error: 'Chỉ nhận POST.' });

  const p = docThan(event);
  if (!p) return G.json(400, { error: 'Nội dung gửi lên không đọc được.' });

  /* Tên trường ở trang web (tiếng Việt, gạch ngang) khác tên ở đặc tả Apps
     Script (camelCase tiếng Anh). Quy đổi ở đây, một chỗ duy nhất. */
  const goi = {
    orderId      : p['ma-don'] || p.orderId || '',
    affiliateId  : p['ma-ctv'] || p.affiliateId || '',
    customerName : p['ho-ten'] || p.customerName || '',
    phone        : p['sdt'] || p.phone || '',
    email        : p['email'] || p.email || '',
    plate        : p['bien-so'] || p.plate || '',
    product      : p['san-pham'] || p.product || '',
    amount       : p['tong-phi'] || p.amount || '',
    phiGoc       : p['phi-goc'] || p.phiGoc || '',
    nguonGhiNhan : p['nguon-ghi-nhan'] || p.nguonGhiNhan || '',
    /* Khách vừa làm gì: "Chờ thanh toán" / "Khách báo đã chuyển khoản" /
       "Đăng ký nhận bản giấy". Trang web gửi cùng một mã đơn nhiều lần, và
       Apps Script dùng trường này để ghi chú thay vì tạo dòng mới. */
    trangThaiKhach: p['trang-thai'] || p.trangThaiKhach || '',

    /* HỒ SƠ CẤP GIẤY CHỨNG NHẬN.
       Trang cấp đơn vẫn luôn gửi đủ những trường này. Trước 18/09/2026 hàm
       này không chuyển tiếp và sổ cái cũng không có cột, nên chúng rơi mất —
       nhân viên phát hành không có số khung, số máy, ngày hiệu lực hay địa chỉ
       giao giấy, tức là không cấp nổi giấy chứng nhận. */
    chiTietXe    : p['chi-tiet-xe'] || p.chiTietXe || '',
    soKhung      : p['so-khung'] || p.soKhung || '',
    soMay        : p['so-may'] || p.soMay || '',
    hieuXe       : p['hieu-xe'] || p.hieuXe || '',
    namSx        : p['nam-sx'] || p.namSx || '',
    soCho        : p['so-cho'] || p.soCho || '',
    thoiHan      : p['thoi-han'] || p.thoiHan || '',
    ngayHieuLuc  : p['ngay-hieu-luc'] || p.ngayHieuLuc || '',
    ngayHetHan   : p['ngay-het-han'] || p.ngayHetHan || '',
    diaChi       : p['dia-chi'] || p.diaChi || '',
    xuatHoaDon   : p['xuat-hoa-don'] || p.xuatHoaDon || '',
    tenCty       : p['ten-cty'] || p.tenCty || '',
    mst          : p['mst'] || p.mst || '',
    diaChiCty    : p['dia-chi-cty'] || p.diaChiCty || '',
    emailHd      : p['email-hd'] || p.emailHd || '',
    diaChiGiao   : p['dia-chi-giao'] || p.diaChiGiao || '',
    nguoiNhan    : p['nguoi-nhan'] || p.nguoiNhan || '',
    sdtNhan      : p['sdt-nhan'] || p.sdtNhan || '',
  };

  /* NHÓM XE Ở ĐÂY LÀ NHÓM TÍNH HOA HỒNG, KHÔNG PHẢI NHÓM TÍNH PHÍ.
     ─────────────────────────────────────────────────────────────────────────
     Trang web có trường 'nhom-xe', nhưng nó mang nhóm TÍNH PHÍ theo Thông tư:
     nkd (không kinh doanh) / kd (kinh doanh) / tai (xe tải) / khac / moto.
     COMMISSION_RULES chỉ có hai dòng — oto và moto — vì hoa hồng đã chốt 40%
     cho cả hai loại.
     Lấy thẳng 'nhom-xe' thì đơn ô tô vào sổ với nhóm "nkd", chonQuyTac() không
     tìm thấy quy tắc nào, và hệ thống từ chối tính hoa hồng rồi ghi chú lại.
     Hành vi đó đúng như thiết kế (thà báo còn hơn ghi 0 vào ô tiền), nhưng
     nguyên nhân nằm ở phép quy đổi sai ngay tại đây — đã xảy ra thật ngày
     17/09/2026.
     'loai-xe' mới là thứ phân biệt ô tô với xe máy, và trang web luôn gửi nó
     với đúng hai giá trị "Xe máy / mô tô" hoặc "Ô tô". */
  const loaiXe = String(p['loai-xe'] || p.loaiXe || '').toLowerCase();
  goi.nhomXe = p.nhomXe === 'moto' || p.nhomXe === 'oto'
    ? p.nhomXe
    : (/máy|mô tô|moto/.test(loaiXe) ? 'moto' : 'oto');

  /* Trước 18/09 chi tiết xe bị gộp vào tên sản phẩm vì ORDERS không có cột cho
     nó. Nay đã có cột "Chi tiết xe" riêng, nên để tên sản phẩm sạch trở lại —
     lọc và cộng theo sản phẩm mới làm được. */

  try {
    const kq = await G.goiPost('createOrder', goi);
    if (!kq || !kq.ok) {
      return G.json(400, { error: (kq && kq.error) || 'Apps Script từ chối đơn.' });
    }
    await baoTelegram({
      orderId: kq.orderId, ctvId: kq.ctvId, plate: goi.plate,
      product: goi.product, tong_phi: kq.tong_phi,
      trung_lap: kq.trung_lap === true,
      trang_thai_khach: kq.trang_thai_khach || goi.trangThaiKhach,
    });
    return G.json(200, {
      ok: true, orderId: kq.orderId, ctvId: kq.ctvId,
      phi_goc: kq.phi_goc, vat: kq.vat, tong_phi: kq.tong_phi,
      trung_lap: kq.trung_lap === true,
      canh_bao: kq.canh_bao || null,
    });
  } catch (err) {
    /* Trả 502 để trang web biết mà chuyển sang đường dự phòng Netlify Forms.
       Ghi log đầy đủ ở đây, nhưng KHÔNG trả chi tiết hệ thống về trình duyệt. */
    console.error('[gas-don] ' + (err.message || err));
    return G.json(502, { error: 'Không ghi được đơn vào hệ thống.', du_phong: true });
  }
};
