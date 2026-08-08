/* DBV247 — API tra giá thị trường xe cũ (realtime)
   ---------------------------------------------------------------------------
   Gọi từ: /admin/tham-dinh-gia-xe.html  (bản nội bộ)

   GIỚI HẠN TRUY CẬP — cố ý chặt:
   Hàm này yêu cầu header x-dashboard-key khớp DASHBOARD_KEY. Lý do không mở
   cho trang khách hàng ngay:
     1. Quy chế Bonbanh cấm phổ biến lại nội dung của họ. Dùng nội bộ để thẩm
        định thì khác với đăng công khai. Cần xin phép Kypernet trước khi mở.
     2. Mở public đồng nghĩa mỗi lượt khách là một request sang Bonbanh. Bị
        chặn IP là mất luôn nguồn dữ liệu.
   Khi đã có chấp thuận bằng văn bản, bỏ đoạn kiểm tra khoá ở dưới là xong.

   Thứ tự lấy dữ liệu:
     1. Blobs cache (cron quét hàng tuần ghi vào đây)   -> nhanh nhất
     2. Đọc trực tiếp Bonbanh bằng parser                -> chính xác nhất
     3. Nhờ Gemini đọc hộ                                -> khi parser hỏng
     4. Chịu, trả về lý do rõ ràng                       -> KHÔNG bịa số

   Biến môi trường:
     DASHBOARD_KEY   (bắt buộc)
     GEMINI_API_KEY  (tuỳ chọn — thiếu thì bỏ bước 3)
*/

"use strict";

const { getStore } = require("@netlify/blobs");
const { docGiaThiTruong, apPhienBan, boThe, UA } = require("./lib/bonbanh.js");
const { traGiaBangAI } = require("./lib/gemini-gia-xe.js");

const STORE = "dbv247-gia-xe";
const CACHE_GIO = 24 * 7; // dữ liệu cron còn dùng được 7 ngày

function json(code, data) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(data)
  };
}

function khoaCache(hang, dong, nam) {
  return `${hang}|${dong}|${nam}`.toLowerCase().replace(/[^a-z0-9|._-]/g, "_");
}

function conHan(banGhi, gio) {
  if (!banGhi?.doc_luc) return false;
  return Date.now() - new Date(banGhi.doc_luc).getTime() < gio * 3600e3;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return json(405, { loi: "Chỉ nhận GET hoặc POST" });
  }

  /* ── Kiểm tra khoá ─────────────────────────────────────────────────────── */
  const khoaGui = event.headers["x-dashboard-key"] || "";
  const khoaThat = process.env.DASHBOARD_KEY || "";
  if (!khoaThat) return json(500, { loi: "Máy chủ chưa cấu hình DASHBOARD_KEY" });
  if (khoaGui !== khoaThat) return json(401, { loi: "Không có quyền truy cập" });

  /* ── Tham số ───────────────────────────────────────────────────────────── */
  const q = event.queryStringParameters || {};
  const body = event.httpMethod === "POST" && event.body ? JSON.parse(event.body) : {};
  const hang = String(body.hang || q.hang || "").trim().toUpperCase();
  const dong = String(body.dong || q.dong || "").trim().toUpperCase();
  const nam = parseInt(body.nam || q.nam, 10);
  /* Tên phiên bản như trong CSDL, vd "1.5G CVT". Không bắt buộc — thiếu thì
     trả về số liệu cả dòng xe, nhưng lúc đó đừng đem so với giá CSDL của một
     phiên bản cụ thể vì hai bên không cùng đơn vị so sánh. */
  const phienBan = String(body.phien_ban || q.phien_ban || "").trim();
  const boQuaCache = String(body.moi || q.moi || "") === "1";

  if (!hang || !dong || !nam || nam < 1990 || nam > new Date().getFullYear() + 1) {
    return json(400, { loi: "Thiếu hoặc sai tham số: hang, dong, nam" });
  }

  let store = null;
  try { store = getStore(STORE); } catch (_) { /* chạy local không có Blobs */ }

  const khoa = khoaCache(hang, dong, nam);

  /* ── 1. Cache ──────────────────────────────────────────────────────────── */
  if (store && !boQuaCache) {
    try {
      const cu = await store.get(khoa, { type: "json" });
      if (cu && conHan(cu, CACHE_GIO)) {
        /* Cache lưu số liệu của cả dòng xe kèm bảng theo phiên bản. Việc khớp
           phiên bản làm lúc trả về, nên cron không cần biết trước thẩm định
           viên sẽ tra phiên bản nào. */
        const ra = apPhienBan(cu, phienBan);
        return json(200, { ...ra, tu_cache: true, tuoi_gio: Math.round((Date.now() - new Date(cu.doc_luc).getTime()) / 3600e3) });
      }
    } catch (_) {}
  }

  /* Slug đã học được từ những lần trước — đi thẳng, đỡ phải dò. */
  let slugDaBiet = null;
  if (store) {
    try { slugDaBiet = await store.get(`slug|${hang}|${dong}`.toLowerCase(), { type: "json" }); } catch (_) {}
  }

  /* ── 2. Parser ─────────────────────────────────────────────────────────── */
  let kq = await docGiaThiTruong({ hang, dong, nam, soTrang: 2, slugDaBiet });

  if (kq.ok && kq.tong_hop && kq.tong_hop.so_tin >= 3) {
    if (store) {
      try {
        await store.setJSON(khoa, kq);
        if (kq.slug) await store.setJSON(`slug|${hang}|${dong}`.toLowerCase(), kq.slug);
      } catch (_) {}
    }
    const ra = apPhienBan(kq, phienBan);
    /* Số liệu của đúng phiên bản đáng tin hơn số liệu gộp cả dòng xe, kể cả
       khi ít tin hơn — vì nó so được trực tiếp với giá CSDL. */
    const doTinCay =
      ra.muc === "phien_ban"
        ? (ra.so_tin >= 6 ? "cao" : "trung_binh")
        : (ra.so_tin >= 10 ? "trung_binh" : "thap");
    return json(200, { ...ra, do_tin_cay: doTinCay, tu_cache: false });
  }

  /* ── 3. Nhờ AI đọc hộ ──────────────────────────────────────────────────── */
  if (process.env.GEMINI_API_KEY && kq.url_goc) {
    let noiDung = "";
    try {
      const r = await fetch(kq.url_goc, { headers: { "User-Agent": UA } });
      if (r.ok) noiDung = boThe(await r.text());
    } catch (_) {}

    if (noiDung) {
      const ai = await traGiaBangAI({ hang, dong, nam, noiDungTrang: noiDung, urlGoc: kq.url_goc });
      if (ai.ok) {
        const ra = { ...ai, hang, dong, nam, url_goc: kq.url_goc, tu_cache: false };
        if (store) { try { await store.setJSON(khoa, ra); } catch (_) {} }
        return json(200, ra);
      }
    }
  }

  /* ── 4. Không có thì nói không có ──────────────────────────────────────── */
  return json(200, {
    ok: false,
    hang, dong, nam,
    ly_do: kq.ly_do || "khong_du_du_lieu",
    thong_diep:
      kq.ly_do === "khong_tim_thay"
        ? "Không tìm thấy dòng xe này trên Bonbanh. Có thể tên trong CSDL khác tên bên họ, hoặc dòng xe quá hiếm."
        : "Có trang nhưng số tin rao quá ít để tính ra khoảng giá đáng tin.",
    chan_doan: kq.chan_doan || null,
    doc_luc: new Date().toISOString()
  });
};
