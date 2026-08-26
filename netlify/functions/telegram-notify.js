/* DBV247 – Gửi thông báo Telegram mỗi khi có khách hàng gửi form.

   CÁCH NETLIFY GỌI HÀM NÀY — có đúng hai cách, phải chọn một:
   (a) Đổi tên tệp thành `submission-created.js` → Netlify tự gọi, không cần cấu hình.
   (b) Giữ tên này và vào Netlify → Forms → Form notifications → Add notification
       → Outgoing webhook, URL: https://dbv247.com.vn/.netlify/functions/telegram-notify
   Nếu chưa làm (a) hoặc (b) thì hàm này không bao giờ chạy.

   Cần 2 biến môi trường: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
*/

const FORM_LABELS = {
  "dbv-tuvan":    "Form tư vấn (trang sản phẩm)",
  "dbv-float":    "Nút liên hệ nhanh (nổi)",
  "dbv-suckhoe":  "Form Bảo hiểm sức khỏe",
  "dbv-float-sk": "Nút nổi – Bảo hiểm sức khỏe",
  "lead-form":    "Form trang chủ / bản đồ dịch vụ",
  "hero-form":    "Form banner trang chủ",
  "chatbot-lead": "Khung chat tư vấn",
  "dbv-capdon-dlqt": "🧳 CẤP ĐƠN Du lịch quốc tế (dulich.dbv247.com.vn)",
};

/* Thứ tự hiển thị — quan trọng trước, phụ sau.
   Hỗ trợ cả hai lối đặt tên (name/ho-ten, phone/dien-thoai). */
const FIELDS = [
  ["san-pham",         "Sản phẩm"],
  ["ma-ho-so",         "Mã hồ sơ"],
  ["tong-phi",         "TỔNG PHÍ"],
  ["da-chuyen-khoan",  "Khách khai thanh toán"],
  ["noi-dung-ck",      "Nội dung CK (đối soát)"],
  ["ngan-hang",        "Tài khoản nhận"],
  ["ten-cong-ty",      "Công ty"],
  ["ho-ten",           "Họ tên"],
  ["name",             "Họ tên"],
  ["dien-thoai",       "Điện thoại"],
  ["phone",            "Điện thoại"],
  ["email",            "Email"],
  ["ngon-ngu",         "Ngôn ngữ tư vấn"],
  ["need",             "Nhu cầu"],
  ["nhu-cau",          "Nhu cầu"],
  ["loai-hinh",        "Loại hình / Đối tượng"],
  ["loai-hinh-kd",     "Loại hình KD"],
  ["muc-quan-tam",     "Giá trị / Hạn mức quan tâm"],
  ["loai-xe",          "Loại xe"],
  ["so-cho",           "Số chỗ"],
  ["kinh-doanh",       "Kinh doanh vận tải"],
  ["dich-vu-them",     "Dịch vụ thêm"],
  ["loai-tau",         "Loại tàu"],
  ["hang-hoa",         "Hàng hóa"],
  ["loai",             "Loại"],
  ["diem-den",         "Điểm đến"],
  ["thoi-gian",        "Thời gian"],
  ["thoi-han",         "Thời hạn"],
  ["so-nguoi",         "Số người"],
  ["so-ngay",          "Số ngày"],
  ["muc-dich",         "Mục đích"],
  ["dien-tich",        "Diện tích"],
  ["tinh-thanh",       "Tỉnh/Thành"],
  ["bao-ve-ai",        "Bảo vệ cho ai"],
  ["nhom-tuoi",        "Nhóm tuổi"],
  ["goi-quan-tam",     "Gói quan tâm"],
  ["ket-qua-tinh-phi", "Kết quả tính phí"],
  ["dia-chi",          "Địa chỉ"],
  ["nguoi-duoc-bh",    "Người được bảo hiểm"],
  ["nguoi-thu-huong",  "Người thụ hưởng"],
  ["dong-y-dieu-khoan","Đồng ý quy tắc BH"],
  ["ghi-chu",          "Ghi chú"],
  ["nguon",            "Vị trí form"],
];

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];
const SKIP = new Set(["form-name", "bot-field", "ip", "user_agent", "referrer"]);

function esc(v) {
  return String(v).replace(/[*_`\[\]]/g, "").trim();
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { statusCode: 500, body: "Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID." };
  }

  let sub;
  try { sub = JSON.parse(event.body); }
  catch (err) { return { statusCode: 400, body: "Payload không hợp lệ." }; }

  const data = sub.data || {};
  const formName = sub.form_name || "";

  /* Đơn cấp TNDS đã có submission-created.js lo (tự chạy, không cần cấu hình,
     và in ra bản tin riêng đầy đủ số khung/số máy/nội dung đối soát).
     Nếu hàm này gửi thêm thì mỗi đơn bị báo hai lần trên Telegram. */
  if (formName === "dbv-capdon-tnds") {
    return { statusCode: 200, body: "skipped: submission-created.js đã xử lý" };
  }
  const lines = ["🔔 *DBV247 — Khách hàng mới để lại thông tin*", ""];
  lines.push("Nguồn: " + (FORM_LABELS[formName] || formName || "Không rõ"));

  const shown = new Set();
  FIELDS.forEach(([key, label]) => {
    const v = data[key];
    if (v == null || String(v).trim() === "") return;
    if (shown.has(label)) return;          // tránh in trùng khi có cả name lẫn ho-ten
    shown.add(label);
    lines.push(label + ": " + esc(v));
  });

  /* Field mới chưa kịp khai báo ở trên — vẫn in ra để không mất thông tin */
  Object.keys(data).forEach((k) => {
    if (SKIP.has(k) || UTM.indexOf(k) !== -1 || k === "trang") return;
    if (FIELDS.some((f) => f[0] === k)) return;
    const v = data[k];
    if (v == null || String(v).trim() === "") return;
    lines.push(k + ": " + esc(v));
  });

  const utm = UTM.filter((k) => data[k]).map((k) => k.replace("utm_", "") + "=" + esc(data[k]));
  if (utm.length) lines.push("", "Quảng cáo: " + utm.join(" · "));
  if (data["trang"]) lines.push("Trang: " + esc(data["trang"]));

  const text = lines.join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
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
