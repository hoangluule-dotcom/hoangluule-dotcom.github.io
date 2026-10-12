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
const GX = require("./lib/gia-xe-chung");  // bộ tra giá dùng chung với chatbot & bot Zalo

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

/* Phần tra Google + kiểm dịch đã chuyển sang lib/gia-xe-chung.js (dùng chung). */

/* Toàn bộ logic bên dưới đã tự bắt lỗi ở từng bước, nhưng vẫn bọc thêm một lớp
   try/catch ngoài cùng: lỡ có gì bất ngờ (vd. lỗi hiếm gặp từ SDK) thì hàm vẫn
   trả về JSON tử tế thay vì để nền tảng ném ra một trang lỗi 502 rỗng mà cả
   khách lẫn mình sau này debug đều không biết vì sao. */
exports.handler = async function (event) {
  try {
    return await xuLy(event);
  } catch (err) {
    console.error("gia-xe-cong-khai.js: loi khong luong truoc", err);
    const dk = event.headers && (event.headers["x-dashboard-key"] || "");
    if (dk && process.env.DASHBOARD_KEY && dk === process.env.DASHBOARD_KEY) {
      return json(502, { ok: false, ly_do: "loi_khong_luong_truoc", chi_tiet: String(err && err.message) });
    }
    return json(502, { ok: false, ly_do: "loi_khong_luong_truoc" });
  }
};

async function xuLy(event) {
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

  /* Quy về đúng tên hãng/dòng trong CSDL để dùng CHUNG bộ nhớ với chatbot và bot Zalo
     ("VF 6", "vinfast vf6" → VINFAST|VF6) */
  let hangC = hang, dongC = dong;
  try { const x = await GX.timDongXe(hang, dong); if (x) { hangC = x.hang; dongC = x.dong; } } catch (e) { /* giữ nguyên */ }

  const store = openStore(STORE_NAME);
  const key = khoaCache(hangC, dongC, nam);

  if (!boQuaCache && store) {
    try {
      const cached = await store.get(key, { type: "json" });
      if (cached && cached.ok && conHan(cached, CACHE_GIO)) {
        return json(200, Object.assign({}, cached, { tu_cache: true }));
      }
    } catch (e) { /* cache lỗi thì tra mới, không chặn khách */ }
  }

  // Tra Google + kiểm dịch so với CSDL (lệch 60–140% hoặc vượt giá niêm yết thì loại) + ghi bộ nhớ chung
  const ketQua = await GX.traMoiVaLuu(hangC, dongC, nam, phienBan, 7000);

  if (!ketQua.ok) {
    const khongTim = ketQua.ly_do === "khong_tim_thay" || ketQua.ly_do === "so_vo_ly";
    if (!khongTim) console.warn("gia-xe-cong-khai.js:", hang, dong, nam, "->", ketQua.ly_do, ketQua.chi_tiet || "");
    return json(khongTim ? 200 : 502, Object.assign({ tu_cache: false }, ketQua));
  }

  return json(200, Object.assign({ tu_cache: false }, ketQua));
}
