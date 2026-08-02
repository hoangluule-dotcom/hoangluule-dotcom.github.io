/* DBV247 – Nhận số điện thoại khách để lại trong khung chat.
   ---------------------------------------------------------------------------
   Đẩy thẳng vào Netlify Forms dưới tên form "chatbot-lead", nên lead từ chatbot
   chạy chung một đường ống với các form khác và hiện luôn trong dashboard CRM
   mà không phải sửa gì bên đó.

   Netlify chỉ nhận form nào nó "nhìn thấy" trong HTML lúc build — vì vậy trong
   index.html có một form ẩn tên "chatbot-lead" để đăng ký. Xoá form ẩn đó đi là
   lead chatbot mất đường vào.
*/

const SITE_URL = process.env.URL || "https://dbv247.com.vn";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(payload),
  };
}

/* Số Việt Nam: 10 số bắt đầu bằng 0, hoặc dạng +84/84. */
function normPhone(raw) {
  let s = String(raw || "").replace(/[^\d+]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("84") && s.length === 11) s = "0" + s.slice(2);
  return /^0\d{9}$/.test(s) ? s : null;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Chỉ nhận POST." });

  let p;
  try {
    p = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: "Body không phải JSON hợp lệ." });
  }

  const phone = normPhone(p.phone);
  if (!phone) {
    return json(400, { error: "Số điện thoại chưa đúng. Anh/chị nhập lại giúp (10 số, bắt đầu bằng 0)." });
  }

  const name = String(p.name || "").trim().slice(0, 100);
  const need = String(p.need || "").trim().slice(0, 120);

  // Kèm lại vài lượt chat gần nhất để tư vấn viên biết khách đang quan tâm gì,
  // gọi lại không phải hỏi từ đầu.
  const history = Array.isArray(p.history) ? p.history.slice(-8) : [];
  const transcript = history
    .map((m) => (m.role === "bot" ? "DBV247: " : "Khách: ") + String(m.text || "").slice(0, 400))
    .join("\n")
    .slice(0, 3000);

  const form = new URLSearchParams();
  form.set("form-name", "chatbot-lead");
  form.set("name", name || "(khách chat, chưa cho tên)");
  form.set("phone", phone);
  form.set("need", need || "(chưa rõ)");
  form.set("page", String(p.page || "").slice(0, 200));
  form.set("transcript", transcript);

  try {
    const res = await fetch(SITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok && res.status !== 200 && res.status !== 303) {
      return json(502, { error: "Chưa gửi được thông tin. Anh/chị gọi giúp 0869 656 561 nhé." });
    }
    return json(200, { ok: true });
  } catch (err) {
    console.error("chat-lead.js:", err);
    return json(502, { error: "Chưa gửi được thông tin. Anh/chị gọi giúp 0869 656 561 nhé." });
  }
};
