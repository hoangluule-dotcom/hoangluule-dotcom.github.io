/* ══════════════════════════════════════════════════════════════════════════
   Netlify Event Function — tự chạy mỗi khi có đơn mới gửi vào Netlify Forms.
   Tên file BẮT BUỘC là submission-created.js (Netlify nhận diện theo tên).

   Nhiệm vụ: lọc lấy đơn "Khách báo đã chuyển khoản" và bắn về Telegram.
   Đơn "Chờ thanh toán" bị bỏ qua để tránh nhiễu.

   Cần 2 biến môi trường trong Netlify (Site settings → Environment variables):
     TELEGRAM_BOT_TOKEN   token bot lấy từ @BotFather
     TELEGRAM_CHAT_ID     id của bạn hoặc của nhóm nhận thông báo
   ══════════════════════════════════════════════════════════════════════════ */

/* Chỉ xử lý đúng form cấp đơn TNDS. Các form khác của site (dbv-tuvan,
   chatbot-lead, dbv-float...) đã có telegram-notify.js lo qua webhook — nếu
   hàm này cũng gửi thì mỗi lead bị báo hai lần. */
const FORM_CAP_DON = 'dbv-capdon-tnds';
const TRANG_THAI_DA_CK = 'Khách báo đã chuyển khoản';
const TRANG_THAI_GIAO  = 'Đăng ký nhận bản giấy';

/* Telegram parse_mode=HTML chỉ cho phép vài thẻ, phải escape 3 ký tự này */
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function vnd(v) {
  const n = Number(String(v).replace(/[^0-9]/g, ''));
  return isNaN(n) || n === 0 ? '—' : n.toLocaleString('vi-VN') + ' đ';
}

/* Chỉ in dòng khi có dữ liệu — tránh tin nhắn đầy dấu gạch ngang */
function dong(nhan, giaTri) {
  const v = String(giaTri == null ? '' : giaTri).trim();
  return v ? `${nhan}: <b>${esc(v)}</b>\n` : '';
}

exports.handler = async function (event) {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT  = process.env.TELEGRAM_CHAT_ID;

  if (!TOKEN || !CHAT) {
    console.error('Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID');
    return { statusCode: 200, body: 'missing env' };
  }

  let d = {};
  let formName = '';
  try {
    const body = JSON.parse(event.body || '{}');
    d = (body.payload && body.payload.data) || {};
    formName = (body.payload && body.payload.form_name) || body.form_name || '';
  } catch (e) {
    console.error('Không đọc được payload:', e.message);
    return { statusCode: 200, body: 'bad payload' };
  }

  /* Chỉ nhận form cấp đơn TNDS */
  if (formName && formName !== FORM_CAP_DON) {
    return { statusCode: 200, body: 'skipped: form khác' };
  }
  if (!formName && !d['trang-thai']) {
    return { statusCode: 200, body: 'skipped: không phải đơn cấp TNDS' };
  }

  /* Đơn "Chờ thanh toán" vẫn báo — đó là khách đã khai đủ họ tên, số điện
     thoại, email, biển số rồi mới dừng ở bước QR. Bỏ qua là mất một lead nóng.
     Chỉ khác nhau ở tiêu đề để tư vấn viên phân biệt ngay trên Telegram.
     Muốn tắt: thêm lại dòng
       if (!daChuyenKhoan) return { statusCode: 200, body: 'skipped' };  */
  const trangThai     = (d['trang-thai'] || '').trim();
  const daChuyenKhoan = trangThai === TRANG_THAI_DA_CK;
  /* Khách điền địa chỉ nhận bản giấy ở màn hình hoàn tất — gửi thành bản ghi
     riêng cùng mã đơn, bộ phận phát hành cần biết để in và chuyển phát. */
  const dangKyGiao    = trangThai === TRANG_THAI_GIAO;

  const sdt = String(d['sdt'] || '').replace(/[^0-9+]/g, '');

  let msg = '';
  if (dangKyGiao) {
    msg += `📦 <b>ĐƠN TNDS — KHÁCH ĐĂNG KÝ NHẬN BẢN GIẤY</b>\n`;
  } else if (daChuyenKhoan) {
    msg += `💰 <b>ĐƠN TNDS — KHÁCH BÁO ĐÃ CHUYỂN KHOẢN</b>\n`;
  } else {
    msg += `🟡 <b>ĐƠN TNDS — CHỜ THANH TOÁN</b> (khách dừng ở bước quét QR)\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += dong('🔖 Mã đơn', d['ma-don']);
  msg += dong('💵 Tổng phí', vnd(d['tong-phi']));
  msg += `\n<b>👤 KHÁCH HÀNG</b>\n`;
  msg += dong('Họ tên', d['ho-ten']);
  msg += dong('Điện thoại', sdt);
  msg += dong('CCCD', d['cccd']);
  msg += dong('Email', d['email']);
  msg += dong('Địa chỉ', d['dia-chi']);
  msg += `\n<b>🚗 XE</b>\n`;
  msg += dong('Loại', d['chi-tiet-xe'] || d['loai-xe']);
  msg += dong('Biển số', d['bien-so']);
  msg += dong('Hiệu xe', d['hieu-xe']);
  msg += dong('Số khung', d['so-khung']);
  msg += dong('Số máy', d['so-may']);
  msg += dong('Năm SX', d['nam-sx']);
  msg += dong('Số chỗ', d['so-cho']);
  if (String(d['dia-chi-giao'] || '').trim()) {
    msg += `\n<b>📦 CHUYỂN PHÁT BẢN GIẤY</b>\n`;
    msg += dong('Địa chỉ giao', d['dia-chi-giao']);
    msg += dong('Người nhận', d['nguoi-nhan'] || d['ho-ten']);
    msg += dong('SĐT nhận', d['sdt-nhan'] || sdt);
  }
  msg += `\n<b>📄 ĐƠN BẢO HIỂM</b>\n`;
  msg += dong('Thời hạn', d['thoi-han']);
  msg += dong('Hiệu lực từ', d['ngay-hieu-luc']);
  msg += dong('Đến ngày', d['ngay-het-han']);

  if (String(d['xuat-hoa-don'] || '').trim() === 'Có') {
    msg += `\n<b>🧾 XUẤT HÓA ĐƠN</b>\n`;
    msg += dong('Công ty', d['ten-cty']);
    msg += dong('MST', d['mst']);
    msg += dong('Địa chỉ', d['dia-chi-cty']);
    msg += dong('Email HĐ', d['email-hd']);
  }

  if (String(d['ghi-chu'] || '').trim()) {
    msg += `\n📝 <i>${esc(d['ghi-chu'])}</i>\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (dangKyGiao) {
    msg += `🖨️ <b>In ấn chỉ giấy và chuyển phát</b> tới địa chỉ trên (miễn phí toàn quốc) `;
    msg += `sau khi đã đối soát xong khoản thanh toán của mã đơn này.`;
  } else if (daChuyenKhoan) {
    msg += `⚠️ <b>Đối soát sao kê Techcombank</b> với nội dung `;
    msg += `<code>TNDS ${esc(String(d['bien-so'] || d['ma-don'] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase())}</code> `;
    msg += `trước khi cấp giấy chứng nhận.`;
  } else {
    msg += `📌 Khách <b>chưa bấm xác nhận chuyển khoản</b>. Gọi lại hỗ trợ thanh toán `;
    msg += `(VNPay, Momo, thẻ, thu tận nơi) trước khi đơn nguội.`;
  }
  if (sdt) msg += `\n📞 Gọi khách: <a href="tel:${esc(sdt)}">${esc(sdt)}</a>`;

  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT,
        text: msg,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    if (!r.ok) console.error('Telegram lỗi:', r.status, await r.text());
  } catch (e) {
    console.error('Không gọi được Telegram:', e.message);
  }

  /* Luôn trả 200 — lỗi Telegram không được làm hỏng việc lưu đơn của Netlify */
  return { statusCode: 200, body: 'ok' };
};
