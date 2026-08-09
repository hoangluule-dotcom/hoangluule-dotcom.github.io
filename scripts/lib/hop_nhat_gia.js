/* DBV247 — Hợp nhất giá thị trường quét được vào bảng giá nền
   ===========================================================================
   Bảng nền là dữ liệu AICycle (phủ rộng, 11.502 dòng, cập nhật thủ công).
   Giá thị trường quét được sẽ ĐÈ LÊN bảng nền ở những dòng khớp được, phần
   còn lại giữ nguyên. Nhờ vậy độ phủ không giảm mà độ tươi thì tăng.

   BA CỬA KIỂM DỊCH — dòng nào không qua đủ ba cửa thì KHÔNG được đè:

     1. Phải khớp đúng phiên bản. Không khớp thì giữ giá nền, vì giá gộp cả
        dòng xe không cùng đơn vị so sánh với giá của một phiên bản.

     2. Phải đủ số tin và các nguồn không mâu thuẫn. Hai nguồn lệch nhau quá
        25% nghĩa là ít nhất một nguồn sai mà không biết nguồn nào.

     3. Không được nhảy quá xa so với tháng trước. Xe mất giá quãng 1%/tháng;
        nhảy 40% trong một tháng gần như chắc chắn là lỗi đọc dữ liệu chứ
        không phải thị trường. Những dòng này bị CÁCH LY và đưa vào báo cáo
        để người xem, thay vì âm thầm ghi đè.

   Cửa số 3 là thứ đã thiếu trong mọi phiên bản trước. Ngày 08/08/2026 parser
   đọc giá "1 Tỷ 180 Triệu" thành 1 tỷ chẵn — sai 15% và không có gì chặn lại.
   ===========================================================================
   Định dạng bản ghi (mảng, nối thêm vào cuối để không phá bản cũ):
     [0] nam   [1] phien_ban   [2] gia_tri   [3] gia_min   [4] gia_max
     [5] nhien_lieu   [6] so_ghe   [7] gia_niem_yet   [8] uoc_tinh
     [9] nguon_gia    [10] so_tin_rao   [11] ky_cap_nhat
*/

"use strict";

const NGUONG = {
  /* Đổi quá mức này thì đánh dấu trong báo cáo cho người xem. */
  canh_bao: 0.10,
  /* Đổi quá mức này thì KHÔNG đè, đưa vào danh sách cách ly. */
  cach_ly: 0.40,
  /* Dưới số tin này thì không đủ cơ sở để đè lên giá nền. */
  so_tin_toi_thieu: 3
};

const NGUON_GIA = { NEN: "aicycle", UOC_TINH: "uoc_tinh", THI_TRUONG: "thi_truong" };

/**
 * Đè kết quả quét lên các bản ghi của một (hãng, dòng, năm).
 *
 * @param {Array<Array>} banGhi   các dòng CSDL của đúng năm đó
 * @param {Object} quet           kết quả từ lib/nguon/index.js traGia()
 * @param {Function} chonPhienBan hàm khớp phiên bản (từ lib/bonbanh.js)
 * @param {string} ky             kỳ cập nhật, dạng "2026-08"
 * @returns {{banGhi:Array, thayDoi:Array, cachLy:Array, giuNguyen:number}}
 */
function hopNhatMotNam(banGhi, quet, chonPhienBan, ky) {
  const thayDoi = [], cachLy = [];
  let giuNguyen = 0;

  if (!quet || !quet.ok || !Array.isArray(quet.theo_phien_ban) || !quet.theo_phien_ban.length) {
    return { banGhi, thayDoi, cachLy, giuNguyen: banGhi.length };
  }

  const moi = banGhi.map((r) => {
    const cu = [...r];
    const tenCSDL = cu[1];
    const giaCu = cu[2];

    /* Cửa 1 — khớp phiên bản */
    const nhom = chonPhienBan(quet.theo_phien_ban, tenCSDL, NGUONG.so_tin_toi_thieu);
    if (!nhom) { giuNguyen++; return cu; }

    /* Cửa 2 — đủ tin và các nguồn không mâu thuẫn */
    if (nhom.so_tin < NGUONG.so_tin_toi_thieu) { giuNguyen++; return cu; }
    if (nhom.dong_thuan === "mau_thuan") {
      cachLy.push({
        ten: tenCSDL, nam: cu[0], gia_cu: giaCu, gia_moi: nhom.trung_vi,
        ly_do: "nguồn mâu thuẫn " + nhom.lech_toi_da + "%",
        chi_tiet: (nhom.theo_nguon || []).map((x) => x.nguon + " " + tr(x.trung_vi)).join(" vs ")
      });
      giuNguyen++; return cu;
    }

    /* Cửa 3 — không nhảy quá xa so với kỳ trước */
    const lech = giaCu > 0 ? (nhom.trung_vi - giaCu) / giaCu : 0;
    if (Math.abs(lech) > NGUONG.cach_ly) {
      cachLy.push({
        ten: tenCSDL, nam: cu[0], gia_cu: giaCu, gia_moi: nhom.trung_vi,
        ly_do: "nhảy " + pt(lech) + " so với kỳ trước",
        chi_tiet: nhom.so_tin + " tin rao"
      });
      giuNguyen++; return cu;
    }

    /* Qua cả ba cửa — ghi đè */
    cu[2] = nhom.trung_vi;
    cu[3] = nhom.q1;
    cu[4] = nhom.q3;
    cu[8] = 0;                       // không còn là số ước tính nữa
    cu[9] = NGUON_GIA.THI_TRUONG;
    cu[10] = nhom.so_tin;
    cu[11] = ky;

    if (Math.abs(lech) > NGUONG.canh_bao) {
      thayDoi.push({
        ten: tenCSDL, nam: cu[0], gia_cu: giaCu, gia_moi: nhom.trung_vi,
        lech, so_tin: nhom.so_tin, dong_thuan: nhom.dong_thuan
      });
    }
    return cu;
  });

  return { banGhi: moi, thayDoi, cachLy, giuNguyen };
}

/* Gắn nhãn nguồn cho những dòng chưa từng được đè, để báo cáo đếm được. */
function ganNhanNen(banGhi) {
  return banGhi.map((r) => {
    const c = [...r];
    if (!c[9]) c[9] = c[8] === 1 ? NGUON_GIA.UOC_TINH : NGUON_GIA.NEN;
    if (c[10] === undefined) c[10] = 0;
    if (c[11] === undefined) c[11] = null;
    return c;
  });
}

/* ── Báo cáo ───────────────────────────────────────────────────────────── */

function tr(x) {
  if (!x) return "—";
  return x >= 1e9
    ? (x / 1e9).toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + " tỷ"
    : Math.round(x / 1e6) + " tr";
}
function pt(x) { return (x > 0 ? "+" : "") + (x * 100).toFixed(1) + "%"; }

/**
 * Dựng báo cáo Markdown để dán vào phần mô tả Pull Request.
 */
function dungBaoCao(tk, ky) {
  const d = [];
  d.push(`# Cập nhật giá xe kỳ ${ky}`);
  d.push("");
  d.push("| Chỉ số | Số lượng |");
  d.push("|---|---|");
  d.push(`| Dòng được cập nhật giá thị trường | **${tk.da_cap_nhat}** |`);
  d.push(`| Dòng giữ nguyên giá nền | ${tk.giu_nguyen} |`);
  d.push(`| Dòng bị cách ly, chờ xem | **${tk.cach_ly.length}** |`);
  d.push(`| Đổi quá ${(NGUONG.canh_bao * 100).toFixed(0)}% — cần xem kỹ | **${tk.thay_doi.length}** |`);
  d.push(`| Cặp xe đã quét | ${tk.da_quet} |`);
  d.push(`| Cặp xe không lấy được dữ liệu | ${tk.khong_co} |`);
  d.push("");

  if (tk.cach_ly.length) {
    d.push(`## ⛔ Bị cách ly — KHÔNG ghi vào file (${tk.cach_ly.length} dòng)`);
    d.push("");
    d.push("Những dòng này giá nhảy quá xa hoặc các nguồn mâu thuẫn. Giá cũ được giữ nguyên.");
    d.push("");
    d.push("| Xe | Giá cũ | Giá quét được | Lý do |");
    d.push("|---|---|---|---|");
    for (const x of tk.cach_ly.slice(0, 60)) {
      d.push(`| ${x.xe} ${x.nam} ${x.ten} | ${tr(x.gia_cu)} | ${tr(x.gia_moi)} | ${x.ly_do} |`);
    }
    if (tk.cach_ly.length > 60) d.push(`| _…còn ${tk.cach_ly.length - 60} dòng_ | | | |`);
    d.push("");
  }

  if (tk.thay_doi.length) {
    d.push(`## ⚠ Đổi quá ${(NGUONG.canh_bao * 100).toFixed(0)}% — đã ghi, nhưng nên xem (${tk.thay_doi.length} dòng)`);
    d.push("");
    d.push("| Xe | Giá cũ | Giá mới | Đổi | Số tin |");
    d.push("|---|---|---|---|---|");
    const sap = [...tk.thay_doi].sort((a, b) => Math.abs(b.lech) - Math.abs(a.lech));
    for (const x of sap.slice(0, 60)) {
      d.push(`| ${x.xe} ${x.nam} ${x.ten} | ${tr(x.gia_cu)} | ${tr(x.gia_moi)} | **${pt(x.lech)}** | ${x.so_tin} |`);
    }
    if (sap.length > 60) d.push(`| _…còn ${sap.length - 60} dòng_ | | | | |`);
    d.push("");
  }

  if (tk.suc_khoe_nguon && tk.suc_khoe_nguon.length) {
    d.push("## Sức khoẻ từng nguồn");
    d.push("");
    d.push("| Nguồn | Lượt đạt | Lượt hỏng | Vi phạm hay gặp |");
    d.push("|---|---|---|---|");
    for (const s of tk.suc_khoe_nguon) {
      d.push(`| ${s.nguon} | ${s.dat} | ${s.hong} | ${s.vi_pham_pho_bien || "—"} |`);
    }
    d.push("");
  }

  d.push("---");
  d.push("");
  d.push("**Cách duyệt:** xem bảng cách ly trước — đó là những chỗ nghi có lỗi đọc dữ liệu.");
  d.push("Nếu thấy nhiều dòng cùng lệch theo một kiểu, nhiều khả năng parser hỏng chứ không phải thị trường đổi.");
  d.push("Không ưng thì đóng PR, file cũ vẫn nguyên vẹn.");

  return d.join("\n");
}

module.exports = { NGUONG, NGUON_GIA, hopNhatMotNam, ganNhanNen, dungBaoCao, tr, pt };
