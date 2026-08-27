/* DBV247 — API tra giá xe ô tô cũ REALTIME cho khách (công khai)
   ---------------------------------------------------------------------------
   Khác với netlify/functions/gia-thi-truong.js (nội bộ, đọc Bonbanh, khoá bằng
   DASHBOARD_KEY vì quy chế Bonbanh cấm phổ biến lại nội dung của họ), hàm này
   PHỤC VỤ TRỰC TIẾP khách trên trang công cụ tính phí công khai.

   Vì sao không tái dùng nguồn Bonbanh của gia-thi-truong.js ở đây: dữ liệu đó
   là bản Bonbanh đã quét, phơi nó ra công khai (kể cả qua cache) vẫn là phổ
   biến lại nội dung Bonbanh cho bên thứ ba — đúng điều quy chế của họ cấm, bất
   kể có gọi trực tiếp sang Bonbanh lúc khách bấm hay không.

   Nguồn dùng ở đây: Gemini tự tìm kiếm Google real-time bằng công cụ
   "google_search" (Grounding with Google Search) — đây là kết quả tìm kiếm
   của Google trả cho chính DBV247 qua Gemini, không phải bản sao nội dung
   Bonbanh do DBV247 lưu trữ và phát lại.

   Biến môi trường:
     GEMINI_API_KEY   (bắt buộc — dùng chung với chat.js)
     GEMINI_MODEL     (tuỳ chọn, mặc định "gemini-3.6-flash")
     GIA_XE_MAX_PER_HOUR  (tuỳ chọn, mặc định 20 — thấp hơn chat vì mỗi lượt tốn
                            tiền tìm kiếm Google thật, không chỉ sinh văn bản)
     GIA_XE_MAX_PER_DAY   (tuỳ chọn, mặc định 300)

   Kiểm soát chi phí: cache kết quả 48 giờ theo khoá hãng|dòng|năm trong Netlify
   Blobs store RIÊNG (không đụng store "dbv247-gia-xe" của luồng nội bộ), cộng
   rate-limit theo IP/giờ và theo site/ngày như chat.js.
*/

"use strict";

const { getStore } = require("@netlify/blobs");

const SITE_ID = "df7ffacd-8e52-4769-b95b-23c978b36e29";
const STORE_NAME = "dbv247-gia-xe-cong-khai";
const RATE_KEY = "rate-limit";
const CACHE_GIO = 48; // dữ liệu tìm kiếm còn dùng được 48 giờ trước khi tra lại

function json(code, data) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(data),
  };
}

function khoaCache(hang, dong, nam) {
  return `${hang}|${dong}|${nam}`.toLowerCase().replace(/[^a-z0-9|._-]/g, "_");
}

function conHan(banGhi, gio) {
  if (!banGhi || !banGhi.doc_luc) return false;
  return Date.now() - new Date(banGhi.doc_luc).getTime() < gio * 3600e3;
}

function openStore(name) {
  try {
    return getStore({ name, consistency: "strong" });
  } catch (err) {
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!token) return null;
    try {
      return getStore({ name, siteID: process.env.SITE_ID || SITE_ID, token, consistency: "strong" });
    } catch (err2) {
      return null;
    }
  }
}

function pacificDay() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  } catch (err) {
    return new Date().toISOString().slice(0, 10);
  }
}

/* Hai lớp chặn lạm dụng — giống chat.js, nhưng trần thấp hơn vì mỗi lượt ở
   đây kích hoạt một lượt tìm kiếm Google thật qua Gemini, tốn hơn hẳn một
   lượt sinh văn bản thường. */
async function checkRate(ip) {
  const perHour = parseInt(process.env.GIA_XE_MAX_PER_HOUR || "20", 10);
  const perDay = parseInt(process.env.GIA_XE_MAX_PER_DAY || "300", 10);

  const store = openStore(STORE_NAME);
  if (!store) return { ok: true };

  try {
    const now = Date.now();
    const data = (await store.get(RATE_KEY, { type: "json" })) || {};

    const today = pacificDay();
    const g = data.__global && data.__global.day === today ? data.__global : { day: today, count: 0 };
    if (g.count >= perDay) return { ok: false, daily: true };

    Object.keys(data).forEach((k) => {
      if (k !== "__global" && now - data[k].start > 3600000) delete data[k];
    });

    const rec = data[ip] && now - data[ip].start <= 3600000 ? data[ip] : { start: now, count: 0 };
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
    return { ok: true }; // lỗi kho lưu thì vẫn ưu tiên phục vụ khách
  }
}

/* ── Chỉ dẫn hệ thống cho Gemini ─────────────────────────────────────────── */
const CHI_DAN = `Bạn là công cụ tra giá xe ô tô cũ tại thị trường Việt Nam cho một trang bảo hiểm.

Dùng công cụ tìm kiếm Google được cấp để tìm CÁC TIN RAO BÁN hoặc bài định giá
đang có thật trên mạng, đúng hãng xe, đúng dòng xe, đúng năm sản xuất được hỏi
(sai lệch năm ±1 năm chỉ dùng khi không tìm được đúng năm, phải nêu rõ trong
ghi_chu). Ưu tiên các nguồn Việt Nam: bonbanh.com, chotot.com, oto.com.vn,
carmudi.vn, các sàn/diễn đàn mua bán xe cũ uy tín.

QUY TẮC BẮT BUỘC:
1. CHỈ dùng số liệu tìm thấy qua tìm kiếm thật. Tuyệt đối không suy đoán,
   không lấy từ kiến thức có sẵn không kèm nguồn.
2. Nếu không tìm thấy tin rao nào phù hợp, trả tim_thay=false — thà không có
   kết quả còn hơn đưa số sai, vì số này ảnh hưởng tới số tiền bảo hiểm của
   khách hàng thật.
3. Đơn vị VNĐ nguyên (không viết tắt). "650 triệu" → 650000000.
4. Bỏ qua giá bất thường (dưới 30 triệu hoặc trên 60 tỷ) — tin câu view/gõ nhầm.
5. trung_vi là giá Ở GIỮA dãy giá tìm được, không phải trung bình cộng.
6. Trả lời DUY NHẤT một object JSON hợp lệ, không kèm lời dẫn, không dùng
   markdown code fence, đúng các khoá sau:
   {"tim_thay":boolean,"trung_vi":number,"thap_nhat":number,"cao_nhat":number,
    "so_tin_tham_khao":number,"ghi_chu":string}`;

async function timGiaBangGoogleSearch({ hang, dong, nam, phienBan }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, ly_do: "thieu_GEMINI_API_KEY" };

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) + ":generateContent";

  const cauHoi =
    `Xe cần tra giá thị trường xe cũ: ${hang} ${dong}` +
    (phienBan ? ` (phiên bản ${phienBan})` : "") +
    `, năm sản xuất ${nam}. Tìm kiếm Google ngay bây giờ rồi trả JSON theo đúng quy tắc.`;

  function payload(withThinking) {
    const gen = { temperature: 0, maxOutputTokens: 2000, topP: 0.9 };
    if (withThinking) gen.thinkingConfig = { thinkingLevel: "low" };
    return JSON.stringify({
      system_instruction: { parts: [{ text: CHI_DAN }] },
      contents: [{ role: "user", parts: [{ text: cauHoi }] }],
      tools: [{ google_search: {} }],
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
  const ctrl = new AbortController();
  const hetGio = setTimeout(() => ctrl.abort(), 25000);

  try {
    let r = await fetch(url, { method: "POST", headers, body: payload(true), signal: ctrl.signal });

    // Model không hỗ trợ thinkingLevel (< Gemini 3) trả 400 — gọi lại không kèm.
    if (r.status === 400) {
      const first = await r.text();
      if (/thinking/i.test(first)) {
        r = await fetch(url, { method: "POST", headers, body: payload(false), signal: ctrl.signal });
      } else {
        return { ok: false, ly_do: "gemini_400", chi_tiet: first.slice(0, 300) };
      }
    }

    if (!r.ok) {
      const body = await r.text();
      return { ok: false, ly_do: "gemini_loi_" + r.status, chi_tiet: body.slice(0, 300) };
    }

    const data = await r.json();
    const cand = data.candidates && data.candidates[0];
    const parts = cand && cand.content && cand.content.parts;
    let text = parts
      ? parts.filter((p) => !p.thought).map((p) => p.text || "").join("").trim()
      : "";

    if (!text) return { ok: false, ly_do: "gemini_khong_tra_loi", finish: cand && cand.finishReason };

    // Phòng khi model vẫn kèm code fence dù đã dặn không dùng.
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, ly_do: "khong_doc_duoc_json", chi_tiet: text.slice(0, 300) };

    let kq;
    try {
      kq = JSON.parse(m[0]);
    } catch (e) {
      return { ok: false, ly_do: "json_khong_hop_le", chi_tiet: text.slice(0, 300) };
    }

    if (!kq.tim_thay) return { ok: false, ly_do: "khong_tim_thay", ghi_chu: kq.ghi_chu || "" };

    const hopLe = (x) => typeof x === "number" && x >= 30e6 && x <= 60e9;
    if (!hopLe(kq.trung_vi)) return { ok: false, ly_do: "so_vo_ly", ghi_chu: kq.ghi_chu || "" };

    const lamTron = (x) => (hopLe(x) ? Math.round(x / 1e6) * 1e6 : 0);

    // Số nguồn thực sự Google trả — càng nhiều càng chắc, không tin số model tự khai.
    const soNguonThat =
      (cand.groundingMetadata && cand.groundingMetadata.groundingChunks &&
        cand.groundingMetadata.groundingChunks.length) || 0;

    return {
      ok: true,
      nguon: "Gemini + Google Search (thời gian thực)",
      do_tin_cay: soNguonThat >= 3 ? "trung_binh" : "thap",
      trung_vi: lamTron(kq.trung_vi),
      thap_nhat: lamTron(kq.thap_nhat) || lamTron(kq.trung_vi * 0.9),
      cao_nhat: lamTron(kq.cao_nhat) || lamTron(kq.trung_vi * 1.1),
      so_tin: Math.max(0, Math.round(kq.so_tin_tham_khao || 0)),
      so_nguon_tim_kiem: soNguonThat,
      ghi_chu: kq.ghi_chu || "",
      doc_luc: new Date().toISOString(),
    };
  } catch (e) {
    return { ok: false, ly_do: "ngoai_le", chi_tiet: String(e && e.message) };
  } finally {
    clearTimeout(hetGio);
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return json(405, { ok: false, ly_do: "chi_nhan_GET_hoac_POST" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return json(500, { ok: false, ly_do: "server_chua_cau_hinh_GEMINI_API_KEY" });
  }

  const q = event.queryStringParameters || {};
  let body = {};
  if (event.httpMethod === "POST" && event.body) {
    try { body = JSON.parse(event.body); } catch (e) { body = {}; }
  }

  const hang = String(body.hang || q.hang || "").trim().toUpperCase().slice(0, 40);
  const dong = String(body.dong || q.dong || "").trim().toUpperCase().slice(0, 40);
  const nam = parseInt(body.nam || q.nam, 10);
  const phienBan = String(body.phien_ban || q.phien_ban || "").trim().slice(0, 60);
  const boQuaCache = String(body.moi || q.moi || "") === "1";

  if (!hang || !dong || !nam || nam < 1990 || nam > new Date().getFullYear() + 1) {
    return json(400, { ok: false, ly_do: "thieu_hoac_sai_tham_so_hang_dong_nam" });
  }

  const ip =
    (event.headers["x-nf-client-connection-ip"] ||
      (event.headers["x-forwarded-for"] || "").split(",")[0] ||
      "unknown").trim();

  const rate = await checkRate(ip);
  if (!rate.ok) {
    return json(429, {
      ok: false,
      ly_do: rate.daily ? "het_han_muc_ngay" : "qua_nhieu_luot",
      cho_phut: rate.minutes || null,
      thong_bao: rate.daily
        ? "Công cụ tra giá đã phục vụ hết lượt hôm nay. Bạn có thể tự nhập giá trị xe, hoặc gọi 0869 656 561 để được hỗ trợ ngay."
        : "Bạn vừa tra khá nhiều trong 1 giờ qua. Thử lại sau " + (rate.minutes || 5) +
          " phút, hoặc tự nhập giá trị xe để tính phí ngay.",
    });
  }

  const store = openStore(STORE_NAME);
  const key = khoaCache(hang, dong, nam);

  if (!boQuaCache && store) {
    try {
      const cached = await store.get(key, { type: "json" });
      if (cached && cached.ok && conHan(cached, CACHE_GIO)) {
        return json(200, Object.assign({}, cached, { tu_cache: true }));
      }
    } catch (e) { /* cache lỗi thì tra mới, không chặn khách */ }
  }

  const ketQua = await timGiaBangGoogleSearch({ hang, dong, nam, phienBan });

  if (store) {
    try { await store.setJSON(key, ketQua); } catch (e) { /* không chặn phản hồi khách vì lỗi ghi cache */ }
  }

  if (!ketQua.ok) {
    const khongTim = ketQua.ly_do === "khong_tim_thay" || ketQua.ly_do === "so_vo_ly";
    return json(khongTim ? 200 : 502, Object.assign({ tu_cache: false }, ketQua));
  }

  return json(200, Object.assign({ tu_cache: false }, ketQua));
};
