/* DBV247 – Chatbot tư vấn (Google Gemini)
   ---------------------------------------------------------------------------
   Hàm chạy phía server nên khoá API không bao giờ lộ ra trình duyệt.

   Biến môi trường cần khai trên Netlify:
   - GEMINI_API_KEY : khoá lấy tại https://aistudio.google.com/apikey  (BẮT BUỘC)
   - GEMINI_MODEL   : tên model, mặc định "gemini-2.5-flash"            (tuỳ chọn)
   - CHAT_MAX_PER_HOUR : số lượt tối đa mỗi IP mỗi giờ, mặc định 30     (tuỳ chọn)

   Vì sao phải chặt chẽ: đây là site bảo hiểm. Nếu chatbot khẳng định sai phạm vi
   bảo hiểm hoặc mức phí, khách tin theo rồi mua nhầm — lúc xảy ra chuyện mới biết
   không được bồi thường. Nên chỉ dẫn hệ thống dưới đây buộc nó:
     1. chỉ nói những gì có trong kiến thức nền rút từ chính website,
     2. không tự báo giá hay xác nhận một trường hợp cụ thể có được bồi thường,
     3. chuyển sang tư vấn viên ở mọi câu hỏi mang tính cam kết.
*/

const KB = require("./kb-data.js");
const { getStore } = require("@netlify/blobs");

const SITE_ID = "df7ffacd-8e52-4769-b95b-23c978b36e29";
const STORE_NAME = "dbv247-chat";
const RATE_KEY = "rate-limit";

const MAX_MSG_LEN = 600;      // câu hỏi dài hơn thì cắt
const MAX_HISTORY = 10;       // số lượt hội thoại gửi kèm
const MAX_PAGES = 3;          // số trang nội dung đính kèm mỗi lượt

/* ── Tiện ích ────────────────────────────────────────────────────────────── */

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(payload),
  };
}

/* Bỏ dấu tiếng Việt để so khớp từ khoá. Khách gõ "bao hiem oto" không dấu vẫn
   phải tìm ra trang "Bảo hiểm ô tô". */
function noAccent(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d");
}

const STOP = new Set(
  ("cua co la va cho toi minh ban duoc khong nhu the nao gi bao nhieu " +
   "mot cac nhung o tai voi thi ma ra nay do ai khi neu hay xin chao " +
   "muon can hoi tu van em anh chi a").split(" ")
);

function keywords(s) {
  return noAccent(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

/* Chọn vài trang liên quan nhất thay vì nhồi cả 135 KB kiến thức vào mỗi lượt.
   Gửi hết thì mỗi câu hỏi tốn hơn 45.000 token — tiền token đội lên vô ích và
   mô hình cũng loãng, dễ trả lời lệch trọng tâm. */
function pickPages(question, history) {
  const recent = history.slice(-2).map((m) => m.text).join(" ");
  const words = keywords(question + " " + recent);
  if (!words.length) return [];

  const scored = KB.pages
    .filter((p) => p.content)
    .map((p) => {
      const t = noAccent(p.title);
      const d = noAccent(p.desc);
      const c = noAccent(p.content);
      let score = 0;
      words.forEach((w) => {
        if (t.includes(w)) score += 6;
        if (d.includes(w)) score += 3;
        const hits = c.split(w).length - 1;
        if (hits) score += Math.min(hits, 4);
      });
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAGES);

  return scored.map((x) => x.p);
}

function buildSystemPrompt(pages) {
  const index = KB.pages
    .map((p) => "- " + p.title + " → " + p.url + (p.desc ? " (" + p.desc + ")" : ""))
    .join("\n");

  const detail = pages.length
    ? pages.map((p) => "### " + p.title + " (" + p.url + ")\n" + p.content).join("\n\n")
    : "(Không có trang nào khớp rõ với câu hỏi này.)";

  return [
    "Bạn là trợ lý tư vấn của DBV247 — kênh bảo hiểm trực tuyến của Tập đoàn Bảo hiểm DBV, Chi nhánh Thành Đô.",
    "Trả lời bằng tiếng Việt, xưng \"DBV247\", gọi khách là \"anh/chị\". Giọng gần gũi, thẳng thắn, không hoa mỹ.",
    "",
    "== QUY TẮC BẮT BUỘC ==",
    "1. CHỈ dùng thông tin trong phần TƯ LIỆU bên dưới. Không có trong đó thì nói thẳng là chưa có thông tin và mời khách để lại số điện thoại. TUYỆT ĐỐI không suy đoán.",
    "2. KHÔNG tự báo giá, KHÔNG tự tính phí cho một chiếc xe hoặc một người cụ thể. Phí phụ thuộc dòng xe, năm sản xuất, mục đích sử dụng, độ tuổi, lịch sử bồi thường — chỉ tư vấn viên báo được. Biểu phí TNDS bắt buộc là do Nhà nước quy định thì được nêu, và phải nói rõ đó là phí bắt buộc theo Nghị định 67/2023/NĐ-CP.",
    "3. KHÔNG khẳng định một tình huống cụ thể của khách CÓ hoặc KHÔNG được bồi thường. Được nêu nguyên tắc chung trong tư liệu, nhưng phải kết lại rằng kết luận chính thức căn cứ hợp đồng và hồ sơ thực tế, và mời khách gặp tư vấn viên.",
    "4. Không bịa con số, tên gara, tên bệnh viện, điều khoản, ngày tháng. Con số nào không có trong tư liệu thì không được nói.",
    "5. Nếu khách đang gặp sự cố cần bồi thường gấp, đưa ngay hotline 1900 969 690 (24/7) lên đầu câu trả lời.",
    "",
    "== CÁCH TRẢ LỜI ==",
    "- Ngắn gọn nhưng phải đủ ý: 3–6 câu, hoặc tối đa 6 gạch đầu dòng. Không viết thành bài dài.",
    "- Nếu khách hỏi \"có những loại nào\", \"gồm những gì\" thì LIỆT KÊ ĐỦ các mục có trong tư liệu, đừng bỏ dở giữa chừng.",
    "- Luôn viết trọn vẹn câu cuối cùng. Không bao giờ dừng giữa một danh sách đang liệt kê.",
    "- Kèm đúng 1 đường dẫn trang liên quan nếu có, viết dạng markdown [tên trang](/đường-dẫn).",
    "- Sau khi trả lời, nếu câu hỏi thuộc loại cần báo giá hoặc cần xem hồ sơ, mời khách để lại số điện thoại để tư vấn viên gọi lại, hoặc gọi 0869 656 561.",
    "- Câu hỏi ngoài phạm vi bảo hiểm và DBV247 (thời tiết, chính trị, code, chuyện riêng...) thì từ chối lịch sự và kéo về chủ đề bảo hiểm.",
    "- Không hứa hẹn \"chắc chắn được bồi thường\", \"rẻ nhất thị trường\", \"duyệt trong 1 ngày\".",
    "",
    "== TƯ LIỆU: THÔNG TIN DOANH NGHIỆP ==",
    KB.company,
    "",
    "== TƯ LIỆU: DANH MỤC TRANG TRÊN WEBSITE ==",
    index,
    "",
    "== TƯ LIỆU: NỘI DUNG TRANG LIÊN QUAN CÂU HỎI ==",
    detail,
  ].join("\n");
}

/* ── Chặn lạm dụng ────────────────────────────────────────────────────────── */

function openStore() {
  try {
    return getStore({ name: STORE_NAME, consistency: "strong" });
  } catch (err) {
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!token) return null; // không chặn được thì vẫn cho chạy, không chặn nhầm khách
    return getStore({
      name: STORE_NAME,
      siteID: process.env.SITE_ID || SITE_ID,
      token: token,
      consistency: "strong",
    });
  }
}

/* Hạn mức miễn phí của Google reset lúc nửa đêm giờ Thái Bình Dương.
   Đếm theo đúng múi giờ đó thì trần tự đặt của mình mới trùng nhịp với trần
   của Google, không bị lệch nửa ngày. */
function pacificDay() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  } catch (err) {
    // Môi trường thiếu dữ liệu múi giờ — lùi về UTC, lệch vài giờ vẫn hơn là hỏng
    return new Date().toISOString().slice(0, 10);
  }
}

/* Hai lớp chặn lạm dụng:
   - Theo IP theo giờ: ngăn một người ngồi gõ liên tục.
   - Theo toàn site theo ngày: ngăn một đợt spam đốt sạch hạn mức miễn phí của
     Google rồi chatbot chết cả ngày với khách thật.

   Lớp thứ hai quan trọng ở gói miễn phí. Chạm trần tự đặt thì mình còn kiểm
   soát được lời nhắn cho khách; để Google chặn thì chỉ nhận về lỗi 429 khô khan. */
async function checkRate(ip) {
  const perHour = parseInt(process.env.CHAT_MAX_PER_HOUR || "30", 10);
  const perDay = parseInt(process.env.CHAT_MAX_PER_DAY || "150", 10);

  let store;
  try {
    store = openStore();
  } catch (err) {
    return { ok: true };
  }
  if (!store) return { ok: true };

  try {
    const now = Date.now();
    const data = (await store.get(RATE_KEY, { type: "json" })) || {};

    // ── Trần theo ngày cho toàn site ──
    const today = pacificDay();
    const g = data.__global && data.__global.day === today
      ? data.__global
      : { day: today, count: 0 };

    if (g.count >= perDay) {
      console.warn("chat.js: cham tran ngay (" + perDay + " luot).");
      return { ok: false, daily: true };
    }

    // ── Trần theo IP theo giờ ──
    Object.keys(data).forEach((k) => {
      if (k !== "__global" && now - data[k].start > 3600000) delete data[k];
    });

    const rec = data[ip] && now - data[ip].start <= 3600000
      ? data[ip]
      : { start: now, count: 0 };

    if (rec.count >= perHour) {
      const phut = Math.ceil((3600000 - (now - rec.start)) / 60000);
      return { ok: false, minutes: phut };
    }

    rec.count += 1;
    g.count += 1;
    data[ip] = rec;
    data.__global = g;
    await store.setJSON(RATE_KEY, data);
    return { ok: true };
  } catch (err) {
    return { ok: true }; // lỗi kho lưu thì ưu tiên phục vụ khách
  }
}

/* ── Gọi Gemini ───────────────────────────────────────────────────────────── */

async function askGemini(systemPrompt, history, question) {
  const key = process.env.GEMINI_API_KEY;
  // Đổi model bằng biến môi trường GEMINI_MODEL, không cần sửa code.
  // Rẻ hơn: gemini-3.5-flash-lite. Mạnh hơn: gemini-3.5-flash.
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) + ":generateContent";

  const contents = history
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role === "bot" ? "model" : "user",
      parts: [{ text: String(m.text).slice(0, MAX_MSG_LEN) }],
    }));
  contents.push({ role: "user", parts: [{ text: question }] });

  /* Các model Gemini 3 mặc định BẬT chế độ suy nghĩ, và token suy nghĩ tính
     chung vào maxOutputTokens. Để ngân sách hẹp thì model nghĩ hết sạch, câu
     trả lời bị cắt ngang giữa chừng — đúng lỗi đã gặp.
     Hai việc phải làm cùng lúc:
       1. hạ mức suy nghĩ xuống "low" (chatbot tra cứu tư liệu, không cần nghĩ sâu)
       2. nới ngân sách để phần nghĩ còn lại không lấn vào câu trả lời      */
  function payload(withThinking) {
    const gen = {
      temperature: 0.3,        // thấp để bám tư liệu, đỡ bịa
      maxOutputTokens: 2400,
      topP: 0.9,
    };
    if (withThinking) gen.thinkingConfig = { thinkingLevel: "low" };
    return JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: contents,
      generationConfig: gen,
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    });
  }

  const headers = { "Content-Type": "application/json", "x-goog-api-key": key };
  let res = await fetch(url, { method: "POST", headers: headers, body: payload(true) });

  // Model cũ (2.5 trở về trước) không hiểu thinkingLevel và trả 400. Thử lại
  // không kèm tham số đó thay vì để cả chatbot chết vì một tuỳ chọn.
  if (res.status === 400) {
    const first = await res.text();
    if (/thinking/i.test(first)) {
      console.warn("chat.js: model khong ho tro thinkingLevel, goi lai khong kem.");
      res = await fetch(url, { method: "POST", headers: headers, body: payload(false) });
    } else {
      throw new Error("Gemini 400: " + first.slice(0, 300));
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error("Gemini " + res.status + ": " + body.slice(0, 300));
  }

  const data = await res.json();
  const cand = data.candidates && data.candidates[0];
  const parts = cand && cand.content && cand.content.parts;
  // Bỏ các phần đánh dấu là suy nghĩ, chỉ lấy câu trả lời thật
  const text = parts
    ? parts.filter((p) => !p.thought).map((p) => p.text || "").join("").trim()
    : "";

  if (!text) {
    const why = cand ? cand.finishReason : "không rõ";
    throw new Error("Gemini không trả về nội dung (finishReason: " + why + ")" +
      (why === "MAX_TOKENS"
        ? " — model dùng hết ngân sách token cho phần suy nghĩ. Hạ GEMINI_MODEL " +
          "xuống gemini-3.5-flash-lite hoặc nới maxOutputTokens."
        : ""));
  }

  // Vẫn bị cắt thì cắt gọn tới câu hoàn chỉnh cuối, đỡ hơn là bỏ lửng giữa từ
  if (cand && cand.finishReason === "MAX_TOKENS") {
    console.warn("chat.js: cau tra loi bi cat (MAX_TOKENS).");
    const cut = Math.max(text.lastIndexOf("."), text.lastIndexOf("?"),
                         text.lastIndexOf("!"), text.lastIndexOf("\n"));
    const trimmed = cut > 60 ? text.slice(0, cut + 1) : text;
    return trimmed + "\n\nAnh/chị muốn em nói kỹ hơn phần nào ạ?";
  }

  return text;
}

/* ── Handler ──────────────────────────────────────────────────────────────── */

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Chỉ nhận POST." });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(500, {
      error: "Chatbot chưa được cấu hình. Thiếu biến môi trường GEMINI_API_KEY trên Netlify. " +
             "Lưu ý tên biến phải đúng là GEMINI_API_KEY, không phải GEMINI.",
    });
  }
  // Ghi chú về định dạng khoá: khoá bắt đầu bằng "AQ." là auth key — định dạng
  // mới và đúng, mọi khoá tạo trong AI Studio hiện đều thuộc loại này. Khoá cũ
  // "AIza" (standard key) sẽ bị Gemini API từ chối từ tháng 9/2026.
  // Không kiểm tra tiền tố ở đây: Google còn đổi định dạng nữa, chặn theo tiền
  // tố chỉ tạo ra lỗi giả khi họ đổi tiếp.

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: "Body không phải JSON hợp lệ." });
  }

  const question = String(payload.message || "").trim().slice(0, MAX_MSG_LEN);
  if (!question) return json(400, { error: "Chưa có nội dung câu hỏi." });

  const history = Array.isArray(payload.history) ? payload.history : [];

  const ip =
    (event.headers["x-nf-client-connection-ip"] ||
      (event.headers["x-forwarded-for"] || "").split(",")[0] ||
      "unknown").trim();

  const rate = await checkRate(ip);
  if (!rate.ok) {
    return json(429, {
      error: rate.daily
        ? "Trợ lý hôm nay đã phục vụ hết lượt. Anh/chị gọi 0869 656 561 hoặc nhắn Zalo " +
          "để tư vấn viên hỗ trợ trực tiếp — nhanh hơn cả chat ạ."
        : "Anh/chị đã hỏi khá nhiều trong 1 giờ qua. Vui lòng thử lại sau " +
          rate.minutes + " phút, hoặc gọi trực tiếp 0869 656 561 để được hỗ trợ ngay.",
    });
  }

  try {
    const pages = pickPages(question, history);
    const systemPrompt = buildSystemPrompt(pages);
    const reply = await askGemini(systemPrompt, history, question);

    return json(200, {
      reply: reply,
      sources: pages.map((p) => ({ title: p.title, url: p.url })),
    });
  } catch (err) {
    console.error("chat.js:", err);

    // Chế độ chẩn đoán: chỉ người có khoá dashboard mới xem được lỗi gốc từ
    // Google. Khách bình thường vẫn chỉ thấy câu xin lỗi.
    // Cách dùng: gọi /.netlify/functions/chat kèm header x-dashboard-key.
    const dk = event.headers["x-dashboard-key"] || "";
    if (dk && process.env.DASHBOARD_KEY && dk === process.env.DASHBOARD_KEY) {
      return json(502, {
        error: "LỖI GỐC (chế độ chẩn đoán): " + String(err.message || err),
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
        keyPrefix: apiKey.slice(0, 4) + "…",
      });
    }

    return json(502, {
      error:
        "Trợ lý đang bận. Anh/chị gọi 0869 656 561 hoặc nhắn Zalo để được tư vấn viên hỗ trợ ngay nhé.",
    });
  }
};
