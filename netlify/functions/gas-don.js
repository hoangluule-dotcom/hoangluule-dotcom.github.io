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
  const dong = [
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
    nhomXe       : p['nhom-xe'] || p.nhomXe || '',
    amount       : p['tong-phi'] || p.amount || '',
    phiGoc       : p['phi-goc'] || p.phiGoc || '',
    nguonGhiNhan : p['nguon-ghi-nhan'] || p.nguonGhiNhan || '',
  };

  /* Nhóm xe quyết định tỷ lệ hoa hồng. Trang web gửi "Xe máy / mô tô" hoặc
     "Ô tô" ở trường loai-xe, quy về 'moto'/'oto' cho khớp COMMISSION_RULES. */
  if (!goi.nhomXe) {
    const lx = String(p['loai-xe'] || '').toLowerCase();
    goi.nhomXe = /máy|mô tô|moto/.test(lx) ? 'moto' : 'oto';
  }

  try {
    const kq = await G.goiPost('createOrder', goi);
    if (!kq || !kq.ok) {
      return G.json(400, { error: (kq && kq.error) || 'Apps Script từ chối đơn.' });
    }
    await baoTelegram({
      orderId: kq.orderId, ctvId: kq.ctvId, plate: goi.plate,
      product: goi.product, tong_phi: kq.tong_phi,
    });
    return G.json(200, {
      ok: true, orderId: kq.orderId, ctvId: kq.ctvId,
      phi_goc: kq.phi_goc, vat: kq.vat, tong_phi: kq.tong_phi,
      canh_bao: kq.canh_bao || null,
    });
  } catch (err) {
    /* Trả 502 để trang web biết mà chuyển sang đường dự phòng Netlify Forms.
       Ghi log đầy đủ ở đây, nhưng KHÔNG trả chi tiết hệ thống về trình duyệt. */
    console.error('[gas-don] ' + (err.message || err));
    return G.json(502, { error: 'Không ghi được đơn vào hệ thống.', du_phong: true });
  }
};
