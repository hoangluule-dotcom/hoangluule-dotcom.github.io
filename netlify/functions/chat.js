/* DBV247 – Chatbot tư vấn (Google Gemini)
   ---------------------------------------------------------------------------
   Hàm chạy phía server nên khoá API không bao giờ lộ ra trình duyệt.

   Biến môi trường cần khai trên Netlify:
   - GEMINI_API_KEY : khoá lấy tại https://aistudio.google.com/apikey  (BẮT BUỘC)
   - GEMINI_MODEL   : tên model, mặc định "gemini-2.5-flash"            (tuỳ chọn)
   - CHAT_MAX_PER_HOUR : số lượt tối đa mỗi IP mỗi giờ, mặc định 30     (tuỳ chọn)

   Bản 08/10/2026:
   - Kiến thức: lib/kien-thuc.js tìm vài ĐOẠN khớp nhất trong kb-data.js (toàn bộ
     website + kien-thuc/hoi-dap.md, Netlify dựng lại mỗi lần deploy).
   - Báo phí tham khảo: lib/tinh-phi.js — Gemini gọi hàm tính phí dùng chính biểu
     phí của các công cụ trên web; AI không tự tính.
   - Nhật ký + đánh giá: lib/nhat-ky.js (che số điện thoại/CCCD, giữ 90 ngày).

   Vì sao phải chặt chẽ: đây là site bảo hiểm. Nếu chatbot khẳng định sai phạm vi
   bảo hiểm hoặc mức phí, khách tin theo rồi mua nhầm — lúc xảy ra chuyện mới biết
   không được bồi thường. Nên chỉ dẫn hệ thống dưới đây buộc nó:
     1. chỉ nói những gì có trong kiến thức nền rút từ chính website,
     2. không tự báo giá hay xác nhận một trường hợp cụ thể có được bồi thường,
     3. chuyển sang tư vấn viên ở mọi câu hỏi mang tính cam kết.
*/

const { KB, timDoan, tuLieu, pickPages, danhMucSanPham } = require("./lib/kien-thuc.js");
const { nhanDien } = require("./lib/kich-ban-khai-thac.js");
const { KHAI_BAO, goiHam } = require("./lib/tinh-phi.js");
const { ghiLuot } = require("./lib/nhat-ky.js");
const { getStore } = require("@netlify/blobs");

const SITE_ID = "df7ffacd-8e52-4769-b95b-23c978b36e29";
const STORE_NAME = "dbv247-chat";
const RATE_KEY = "rate-limit";

const MAX_MSG_LEN = 600;      // câu hỏi dài hơn thì cắt
const MAX_HISTORY = 10;       // số lượt hội thoại gửi kèm

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

function buildSystemPrompt(doan, nhom) {
  return [
    "Bạn là Trợ lý DBV247 — kênh bảo hiểm trực tuyến của Tập đoàn Bảo hiểm DBV, Chi nhánh Thành Đô.",
    "Trả lời bằng tiếng Việt, xưng \"DBV247\", gọi khách là \"anh/chị\". Giọng gần gũi, thẳng thắn, không hoa mỹ.",
    "",
    "== QUY TẮC BẮT BUỘC ==",
    "1. Kiến thức sản phẩm, quyền lợi, thủ tục: CHỈ dùng phần TƯ LIỆU bên dưới. Không có trong đó thì nói thẳng là chưa có thông tin và mời khách để lại số điện thoại. TUYỆT ĐỐI không suy đoán.",
    "2. PHÍ: chỉ nêu con số lấy từ KẾT QUẢ CÔNG CỤ TÍNH PHÍ (bieu_phi_tnds, tra_gia_xe, phi_vat_chat_oto, phi_chay_no, phi_hang_hoa_noi_dia, phi_hang_hoa_xnk) hoặc con số ghi rõ trong tư liệu. KHÔNG tự nhân, chia, cộng, ước lượng. Thiếu thông tin để gọi công cụ thì hỏi khách MỘT câu cho đủ.",
    "   - Luôn gọi là \"phí tham khảo\" và nói phí chính thức do tư vấn viên báo sau khi xem hồ sơ.",
    "   - Không nêu tỷ lệ giảm phí, hệ số, công thức, đơn giá m² — chỉ nêu mức phí.",
    "   - Vật chất ô tô: khách chưa biết giá trị xe thì gọi tra_gia_xe trước (cần hãng, dòng, năm), rồi dùng gia_tri_so của phiên bản phù hợp (nhiều phiên bản thì hỏi khách bản nào, hoặc nêu khoảng). Nếu áp phí tối thiểu thì nói rõ là phí tối thiểu.",
    "   - Cháy nổ: nếu có nhiều hạng nguy hiểm, nêu mức phí theo từng hạng và nói chuyên viên sẽ xác định hạng chính xác. Không nhắc khuyến mại.",
    "3. KHÔNG khẳng định một tình huống cụ thể của khách CÓ hoặc KHÔNG được bồi thường. Nêu nguyên tắc chung trong tư liệu, kết lại rằng kết luận chính thức căn cứ hợp đồng và hồ sơ thực tế.",
    "4. Không bịa con số, tên gara, tên bệnh viện, điều khoản, ngày tháng.",
    "5. Khách đang gặp sự cố cần bồi thường gấp: đưa ngay hotline 1900 969 690 (24/7) lên đầu câu trả lời.",
    "6. Không dùng từ ngữ so sánh vượt trội (\"số 1\", \"tốt nhất\", \"rẻ nhất\"), không hứa \"chắc chắn được bồi thường\", \"duyệt trong 1 ngày\".",
    "",
    "== CÁCH TRẢ LỜI ==",
    "- Ngắn gọn nhưng đủ ý: 3–6 câu, hoặc tối đa 6 gạch đầu dòng. Không viết thành bài dài.",
    "- Hỏi \"có những loại nào\", \"gồm những gì\" thì LIỆT KÊ ĐỦ các mục có trong tư liệu.",
    "- Luôn viết trọn câu cuối cùng.",
    "- Kèm đúng 1 đường dẫn trang liên quan nếu có, dạng markdown [tên trang](/đường-dẫn) — chỉ dùng đường dẫn có trong tư liệu hoặc danh mục.",
    "- Câu hỏi ngoài phạm vi bảo hiểm và DBV247 thì từ chối lịch sự và kéo về chủ đề bảo hiểm.",
    "",
    "== KHAI THÁC NHU CẦU (quan trọng) ==",
    "Bạn làm việc như một tư vấn viên giỏi: trả lời xong thì HỎI TIẾP để hiểu nhu cầu, nhờ đó ước được phí và tư vấn viên gọi lại báo phí chính xác ngay, khách không phải kể lại từ đầu.",
    "Khách có vẻ đang quan tâm: " + nhom.ten + ".",
    "Thông tin cần biết (theo thứ tự ưu tiên):",
    nhom.hoi.map(function (h, i) { return (i + 1) + ". " + h; }).join("\n"),
    "Cách hỏi:",
    "- Đọc lại hội thoại, bỏ qua những gì khách ĐÃ nói. Mỗi lượt chỉ hỏi ĐÚNG MỘT câu — câu quan trọng nhất còn thiếu — đặt ở cuối câu trả lời, tự nhiên, kèm lý do ngắn (vd \"để ước phí sát hơn\").",
    "- Đủ thông tin để tính phí thì GỌI CÔNG CỤ và báo phí tham khảo ngay, rồi mời khách để lại số điện thoại để tư vấn viên chốt phí chính thức.",
    "- Khi đã biết khoảng 2–3 thông tin chính, tóm tắt lại 1 câu những gì đã hiểu và mời khách để lại số điện thoại. Không mời lại liên tục nếu khách chưa muốn.",
    "- Khách không muốn trả lời thì thôi, không ép, chuyển sang giải đáp.",
    "- TUYỆT ĐỐI không hỏi số CCCD, số tài khoản, mật khẩu, mã OTP, hay chi tiết bệnh tình.",
    "- Khách đang gặp sự cố/cần bồi thường: không chào bán, đưa hotline 1900 969 690 trước, rồi mới hỏi thông tin sự cố.",
    "",
    "== TƯ LIỆU: THÔNG TIN DOANH NGHIỆP ==",
    KB.company,
    "",
    "== TƯ LIỆU: DANH MỤC TRANG SẢN PHẨM ==",
    danhMucSanPham(),
    "",
    "== TƯ LIỆU: CÁC ĐOẠN LIÊN QUAN CÂU HỎI ==",
    tuLieu(doan),
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

const SAFETY = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];
const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.6-flash";

/* Một lượt gọi API. Model cũ không hiểu thinkingLevel → tự gọi lại không kèm. */
async function goiApi(systemPrompt, contents, coCongCu) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(MODEL()) + ":generateContent";
  const headers = { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY };
  function body(withThinking) {
    /* Gemini 3 mặc định BẬT suy nghĩ, token suy nghĩ tính chung vào
       maxOutputTokens → hạ mức "low" và nới ngân sách, kẻo câu trả lời bị cắt. */
    const gen = { temperature: 0.3, maxOutputTokens: 2400, topP: 0.9 };
    if (withThinking) gen.thinkingConfig = { thinkingLevel: "low" };
    const b = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: contents, generationConfig: gen, safetySettings: SAFETY,
    };
    if (coCongCu) b.tools = [{ functionDeclarations: KHAI_BAO }];
    return JSON.stringify(b);
  }
  let res = await fetch(url, { method: "POST", headers: headers, body: body(true) });
  if (res.status === 400) {
    const first = await res.text();
    if (/thinking/i.test(first)) {
      console.warn("chat.js: model khong ho tro thinkingLevel, goi lai khong kem.");
      res = await fetch(url, { method: "POST", headers: headers, body: body(false) });
    } else {
      throw new Error("Gemini 400: " + first.slice(0, 300));
    }
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error("Gemini " + res.status + ": " + t.slice(0, 300));
  }
  return res.json();
}

function chuTraLoi(cand) {
  const parts = cand && cand.content && cand.content.parts;
  return parts ? parts.filter((p) => !p.thought && p.text).map((p) => p.text).join("").trim() : "";
}

/* Hỏi Gemini, cho phép gọi công cụ tính phí tối đa 3 vòng.
   Trả về { text, congCu: [tên công cụ đã gọi] }. */
async function hoiGemini(systemPrompt, history, question, o) {
  o = o || {};
  const contents = history
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role === "bot" ? "model" : "user",
      parts: [{ text: String(m.text).slice(0, MAX_MSG_LEN) }],
    }));
  contents.push({ role: "user", parts: [{ text: question }] });

  const congCu = [];
  let cand = null;
  for (let vong = 0; vong < 4; vong++) {
    const choGoi = o.congCu !== false && vong < 3;
    const data = await goiApi(systemPrompt, contents, choGoi);
    cand = data.candidates && data.candidates[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    const lenh = parts.filter((p) => p.functionCall);
    if (!lenh.length) break;
    // Trả lại nguyên phần trả lời của model (giữ thoughtSignature — Gemini 3 bắt buộc)
    contents.push({ role: "model", parts: parts });
    const ketQua = await Promise.all(lenh.map(async (p) => {
      const ten = p.functionCall.name;
      congCu.push(ten);
      const kq = await goiHam(ten, p.functionCall.args || {});
      return { functionResponse: { name: ten, response: { ket_qua: kq } } };
    }));
    contents.push({ role: "user", parts: ketQua });
  }

  const text = chuTraLoi(cand);
  if (!text) {
    const why = cand ? cand.finishReason : "không rõ";
    throw new Error("Gemini không trả về nội dung (finishReason: " + why + ")" +
      (why === "MAX_TOKENS" ? " — model dùng hết ngân sách token cho phần suy nghĩ." : ""));
  }
  if (cand && cand.finishReason === "MAX_TOKENS") {
    console.warn("chat.js: cau tra loi bi cat (MAX_TOKENS).");
    const cut = Math.max(text.lastIndexOf("."), text.lastIndexOf("?"), text.lastIndexOf("!"), text.lastIndexOf("\n"));
    const trimmed = cut > 60 ? text.slice(0, cut + 1) : text;
    return { text: trimmed + "\n\nAnh/chị muốn em nói kỹ hơn phần nào ạ?", congCu };
  }
  return { text, congCu };
}

/* Giữ chữ ký cũ cho bot Zalo nội bộ và phiếu tư vấn: trả về chuỗi, không dùng công cụ
   (phiếu không cần tính phí; bot Zalo đã có bảng phí TNDS riêng). */
async function askGemini(systemPrompt, history, question) {
  return (await hoiGemini(systemPrompt, history, question, { congCu: false })).text;
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
  const page = String(payload.page || "").slice(0, 200);
  const sid = String(payload.sid || "").slice(0, 32);

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
    // Nhận diện nhóm sản phẩm từ lời khách (không lấy lời bot, kẻo bot tự dắt sai)
    const loiKhach = history.filter((m) => m.role !== "bot").slice(-4)
      .map((m) => m.text).join(" ") + " " + question;
    const nhom = nhanDien(loiKhach, page);
    const gan = history.filter((m) => m.role !== "bot").slice(-2).map((m) => m.text).join(" ");
    const doan = timDoan(question + " " + question + " " + gan, { page: page, k: 6 });
    const systemPrompt = buildSystemPrompt(doan, nhom);
    const kq = await hoiGemini(systemPrompt, history, question);
    const luot = await ghiLuot({ sid: sid, page: page, q: question, a: kq.text, nhom: nhom.ma, congCu: kq.congCu });

    return json(200, {
      reply: kq.text,
      nhom: nhom.ma,
      luot: luot,
      sources: doan.filter((d) => d.u.startsWith("/")).slice(0, 3).map((d) => ({ title: d.title, url: d.u })),
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

/* Cho bot Zalo nội bộ dùng lại bộ tìm tư liệu + gọi Gemini (zalo-hoidap-background.js) */
exports._noiBo = { pickPages, askGemini, hoiGemini, KB, noAccent };
