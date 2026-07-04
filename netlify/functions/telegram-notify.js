/* DBV247 – Gửi thông báo Telegram mỗi khi có khách hàng gửi form
   Hàm này được Netlify tự động gọi (outgoing webhook) mỗi khi có
   submission mới trên bất kỳ form nào của site.

   Cần khai báo 2 biến môi trường trong Netlify:
   - TELEGRAM_BOT_TOKEN : token của bot, lấy từ @BotFather
   - TELEGRAM_CHAT_ID   : id của nhóm/kênh Telegram sẽ nhận thông báo
*/

const FORM_LABELS = {
  "dbv-tuvan": "Form tư vấn (trang sản phẩm)",
  "dbv-float": "Nút liên hệ nhanh (nổi)",
};

const FIELD_LABELS = {
  "ho-ten": "Họ tên",
  "dien-thoai": "Số điện thoại",
  "san-pham": "Sản phẩm quan tâm",
  "ghi-chu": "Ghi chú",
};

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { statusCode: 500, body: "Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID." };
  }

  let sub;
  try {
    sub = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: "Payload không hợp lệ." };
  }

  const data = sub.data || {};
  const formLabel = FORM_LABELS[sub.form_name] || sub.form_name || "Không rõ";

  const lines = ["🔔 *DBV247 – Khách hàng mới để lại thông tin*", "", "Nguồn: " + formLabel];

  ["ho-ten", "dien-thoai", "san-pham", "ghi-chu"].forEach((key) => {
    if (data[key]) {
      lines.push(FIELD_LABELS[key] + ": " + data[key]);
    }
  });

  const text = lines.join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { statusCode: 502, body: "Lỗi gửi Telegram: " + errText };
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
