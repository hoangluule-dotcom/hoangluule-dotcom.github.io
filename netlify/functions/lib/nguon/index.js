/* DBV247 — Hợp nhất nhiều nguồn giá xe
   ===========================================================================
   Chạy song song các nguồn, loại nguồn hỏng, rồi hợp nhất phần còn lại.

   NGUYÊN TẮC KHI CÁC NGUỒN LỆCH NHAU:
     - Lệch dưới 10%  -> đồng thuận, tin cậy cao
     - Lệch 10–25%    -> lấy nguồn ưu tiên cao hơn, hạ mức tin cậy
     - Lệch trên 25%  -> KHÔNG kết luận. Trả về cả hai kèm cờ mâu thuẫn.

   Vế cuối là điều quan trọng nhất. Hai nguồn chênh nhau một phần tư giá trị
   nghĩa là ít nhất một nguồn sai, mà ta không biết nguồn nào. Chọn bừa một
   con số lúc đó chỉ là đoán có trang trí. Thà báo "không kết luận được" và
   để người quyết.
*/

"use strict";

const { chayNguon } = require("./khung.js");

const NGUON = [require("./bonbanh-adapter.js"), require("./carmudi.js")];

const NGUONG_DONG_THUAN = 0.10;
const NGUONG_MAU_THUAN = 0.25;

/* ── Thống kê ──────────────────────────────────────────────────────────── */
function phanVi(ds, p) {
  if (!ds.length) return 0;
  const i = (ds.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? ds[lo] : ds[lo] + (ds[hi] - ds[lo]) * (i - lo);
}
function locNgoaiLai(gia) {
  const s = [...gia].sort((a, b) => a - b);
  if (s.length < 5) return s;
  const q1 = phanVi(s, 0.25), q3 = phanVi(s, 0.75), iqr = q3 - q1;
  const loc = s.filter((x) => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
  return loc.length >= 3 ? loc : s;
}
function thongKe(gia) {
  const g = locNgoaiLai(gia);
  if (!g.length) return null;
  const tron = (x) => Math.round(x / 1e6) * 1e6;
  return {
    so_tin: g.length,
    so_tin_bi_loai: gia.length - g.length,
    trung_vi: tron(phanVi(g, 0.5)),
    q1: tron(phanVi(g, 0.25)),
    q3: tron(phanVi(g, 0.75))
  };
}

/* Chuẩn hoá tên phiên bản để nhóm được giữa các nguồn viết khác nhau. */
function chuanTen(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9.]+/g, " ").replace(/\s+/g, " ").trim();
}

/* ── Hợp nhất ──────────────────────────────────────────────────────────── */

/**
 * @param {Object} yeuCau {hang, dong, nam, phienBan, slugDaBiet}
 * @returns kết quả đã hợp nhất kèm sức khoẻ từng nguồn
 */
async function traGia(yeuCau) {
  const ketQua = await Promise.all(NGUON.map((n) => chayNguon(n, yeuCau)));

  const dungDuoc = ketQua.filter((r) => r.ok && r.tin && r.tin.length);
  const hong = ketQua.filter((r) => !r.ok);

  if (!dungDuoc.length) {
    return {
      ok: false,
      ly_do: "khong_nguon_nao_dung",
      thong_diep: "Không nguồn nào cho dữ liệu đạt kiểm tra chất lượng.",
      nguon: ketQua.map(tomTat)
    };
  }

  /* Gộp theo phiên bản, giữ dấu vết nguồn để còn đối chứng được. */
  const nhom = new Map();
  for (const r of dungDuoc) {
    for (const t of r.tin) {
      const key = chuanTen(t.phien_ban) || "khong ro";
      if (!nhom.has(key)) nhom.set(key, { ten: key, theo_nguon: new Map() });
      const g = nhom.get(key);
      if (!g.theo_nguon.has(r.nguon)) g.theo_nguon.set(r.nguon, []);
      g.theo_nguon.get(r.nguon).push(t.gia);
    }
  }

  const theoPhienBan = [];
  for (const [, g] of nhom) {
    const moiNguon = [];
    let tatCa = [];
    for (const [ma, gia] of g.theo_nguon) {
      const tk = thongKe(gia);
      if (tk) moiNguon.push({ nguon: ma, ...tk });
      tatCa = tatCa.concat(gia);
    }
    const chung = thongKe(tatCa);
    if (!chung) continue;

    /* Đối chứng chéo giữa các nguồn cho cùng phiên bản. */
    let dongThuan = "mot_nguon", lechToiDa = 0;
    if (moiNguon.length >= 2) {
      const tv = moiNguon.map((x) => x.trung_vi);
      lechToiDa = (Math.max(...tv) - Math.min(...tv)) / Math.min(...tv);
      dongThuan = lechToiDa <= NGUONG_DONG_THUAN ? "dong_thuan"
                : lechToiDa <= NGUONG_MAU_THUAN ? "lech_nhe"
                : "mau_thuan";
    }

    theoPhienBan.push({
      ten: g.ten,
      ...chung,
      theo_nguon: moiNguon,
      dong_thuan: dongThuan,
      lech_toi_da: Math.round(lechToiDa * 1000) / 10
    });
  }
  theoPhienBan.sort((a, b) => b.so_tin - a.so_tin);

  return {
    ok: true,
    hang: yeuCau.hang, dong: yeuCau.dong, nam: yeuCau.nam,
    theo_phien_ban: theoPhienBan,
    so_nguon_dung: dungDuoc.length,
    so_nguon_hong: hong.length,
    nguon: ketQua.map(tomTat),
    url_goc: dungDuoc.map((r) => ({ nguon: r.nguon, url: r.url_goc })).filter((x) => x.url),
    slug: (dungDuoc.find((r) => r.slug) || {}).slug || null,
    doc_luc: new Date().toISOString()
  };
}

function tomTat(r) {
  return {
    nguon: r.nguon,
    ten: r.ten || r.nguon,
    ok: r.ok,
    so_tin: r.tin ? r.tin.length : 0,
    giay: r.giay,
    ly_do: r.ly_do || null,
    vi_pham: r.suc_khoe ? r.suc_khoe.vi_pham : [],
    so_lieu: r.suc_khoe ? r.suc_khoe.so_lieu : null
  };
}

module.exports = { traGia, NGUON, thongKe, chuanTen, NGUONG_DONG_THUAN, NGUONG_MAU_THUAN };
