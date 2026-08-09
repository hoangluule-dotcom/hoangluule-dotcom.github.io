#!/usr/bin/env node
/* DBV247 — Quét giá thị trường và sinh bản giá xe mới
   ===========================================================================
   Chạy hàng tháng trên GitHub Actions, hoặc chạy tay khi cần cập nhật gấp.

   Vì sao chạy ở đây chứ không phải Netlify Function: function đồng bộ bị cắt
   sau 10 giây, scheduled function sau 30 giây. Quét 800 cặp xe cần khoảng nửa
   tiếng — chỉ chạy được ở nơi không có giới hạn đó.

   Kịch bản:
     1. Đọc bản giá đang dùng
     2. Quét từng cặp (hãng, dòng, năm) qua nhiều nguồn
     3. Đè giá thị trường lên bản nền, qua ba cửa kiểm dịch
     4. Ghi bản mới + báo cáo Markdown

   Script KHÔNG tự phát hành. Nó chỉ sinh file và báo cáo; việc đưa vào dùng
   là do người duyệt Pull Request quyết định.

   Cách chạy:
     node scripts/cap_nhat_gia_thang.js                  # quét đầy đủ
     node scripts/cap_nhat_gia_thang.js --gioi-han 20    # thử nhanh 20 cặp
     node scripts/cap_nhat_gia_thang.js --nam-tu 2018    # chỉ xe từ 2018
*/

"use strict";

const fs = require("fs");
const path = require("path");

const GOC = path.join(__dirname, "..");
const FILE_DB = path.join(GOC, "data", "gia-xe-db.json");
const FILE_BAO_CAO = path.join(GOC, "bao-cao-cap-nhat-gia.md");

const { traGia } = require(path.join(GOC, "netlify/functions/lib/nguon/index.js"));
const { chonPhienBan } = require(path.join(GOC, "netlify/functions/lib/bonbanh.js"));
const H = require("./lib/hop_nhat_gia.js");

/* ── Tham số ───────────────────────────────────────────────────────────── */
function thamSo(ten, macDinh) {
  const i = process.argv.indexOf("--" + ten);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : macDinh;
}
const GIOI_HAN = parseInt(thamSo("gioi-han", "0"), 10);
const NAM_TU = parseInt(thamSo("nam-tu", String(new Date().getFullYear() - 11)), 10);
const NGHI_MS = parseInt(thamSo("nghi", "1200"), 10);

const KY = new Date().toISOString().slice(0, 7);

/* Dòng xe ưu tiên quét. Xe ngoài danh sách vẫn giữ giá nền — không phải xe
   nào cũng có đủ tin rao để thống kê, quét bừa chỉ tốn thời gian. */
const UU_TIEN = [
  ["TOYOTA", "VIOS"], ["TOYOTA", "FORTUNER"], ["TOYOTA", "INNOVA"], ["TOYOTA", "CAMRY"],
  ["TOYOTA", "COROLLA CROSS"], ["TOYOTA", "COROLLA ALTIS"], ["TOYOTA", "VELOZ CROSS"],
  ["TOYOTA", "YARIS CROSS"], ["TOYOTA", "WIGO"], ["TOYOTA", "RAIZE"], ["TOYOTA", "HILUX"],
  ["TOYOTA", "LAND CRUISER"], ["TOYOTA", "AVANZA PREMIO"], ["TOYOTA", "PRADO"],
  ["HONDA", "CITY"], ["HONDA", "CR-V"], ["HONDA", "CIVIC"], ["HONDA", "HR-V"],
  ["HONDA", "BRIO"], ["HONDA", "ACCORD"], ["HONDA", "BRV"],
  ["HYUNDAI", "ACCENT"], ["HYUNDAI", "SANTAFE"], ["HYUNDAI", "TUCSON"], ["HYUNDAI", "I10"],
  ["HYUNDAI", "CRETA"], ["HYUNDAI", "ELANTRA"], ["HYUNDAI", "STARGAZER"], ["HYUNDAI", "PALISADE"],
  ["KIA", "MORNING"], ["KIA", "SELTOS"], ["KIA", "CERATO"], ["KIA", "SORENTO"],
  ["KIA", "CARNIVAL"], ["KIA", "K3"], ["KIA", "SONET"], ["KIA", "SPORTAGE"], ["KIA", "CARENS"],
  ["MAZDA", "CX5"], ["MAZDA", "3"], ["MAZDA", "CX8"], ["MAZDA", "2"], ["MAZDA", "CX30"], ["MAZDA", "6"],
  ["FORD", "RANGER"], ["FORD", "EVEREST"], ["FORD", "TERRITORY"], ["FORD", "EXPLORER"],
  ["MITSUBISHI", "XPANDER"], ["MITSUBISHI", "OUTLANDER"], ["MITSUBISHI", "ATTRAGE"],
  ["MITSUBISHI", "TRITON"], ["MITSUBISHI", "XFORCE"], ["MITSUBISHI", "PAJERO"],
  ["VINFAST", "VF8"], ["VINFAST", "VF5"], ["VINFAST", "FADIL"], ["VINFAST", "VF3"],
  ["VINFAST", "LUX A2.0"], ["VINFAST", "VF6"], ["VINFAST", "VF7"], ["VINFAST", "VF9"],
  ["NISSAN", "NAVARA"], ["NISSAN", "X-TRAIL"], ["NISSAN", "ALMERA"], ["NISSAN", "KICKS"],
  ["SUZUKI", "XL7"], ["SUZUKI", "ERTIGA"], ["SUZUKI", "SWIFT"], ["SUZUKI", "JIMNY"],
  ["MERCEDES-BENZ", "C-CLASS"], ["MERCEDES-BENZ", "GLC"], ["MERCEDES-BENZ", "E-CLASS"],
  ["MERCEDES-BENZ", "GLB"], ["MERCEDES-BENZ", "S-CLASS"],
  ["BMW", "3 SERIES"], ["BMW", "X3"], ["BMW", "5 SERIES"], ["BMW", "X5"],
  ["MG", "ZS"], ["MG", "5"], ["MG", "HS"],
  ["PEUGEOT", "3008"], ["PEUGEOT", "2008"], ["PEUGEOT", "5008"],
  ["SUBARU", "FORESTER"], ["ISUZU", "DMAX"], ["ISUZU", "MU-X"]
];

const nghi = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Chạy ──────────────────────────────────────────────────────────────── */
async function main() {
  const t0 = Date.now();
  const goc = JSON.parse(fs.readFileSync(FILE_DB, "utf8"));
  const D = goc.data;

  /* Dựng danh sách cặp cần quét: chỉ dòng ưu tiên, chỉ năm đủ mới. */
  const namHT = new Date().getFullYear();
  const lich = [];
  for (const [hang, dong] of UU_TIEN) {
    if (!D[hang] || !D[hang][dong]) continue;
    const nam = [...new Set(D[hang][dong].map((r) => r[0]))]
      .filter((y) => y >= NAM_TU && y <= namHT)
      .sort((a, b) => b - a);
    for (const y of nam) lich.push({ hang, dong, nam: y });
  }
  const canQuet = GIOI_HAN > 0 ? lich.slice(0, GIOI_HAN) : lich;

  console.log(`Kỳ ${KY} · ${canQuet.length} cặp cần quét (từ đời ${NAM_TU})`);
  console.log("");

  const tk = {
    da_quet: 0, khong_co: 0, da_cap_nhat: 0, giu_nguyen: 0,
    thay_doi: [], cach_ly: [], suc_khoe: new Map()
  };

  /* Nhớ slug đã học để lần sau khỏi dò lại. */
  const slugDaHoc = new Map();

  for (let i = 0; i < canQuet.length; i++) {
    const m = canQuet[i];
    const khoaSlug = m.hang + "|" + m.dong;

    let quet = null;
    try {
      quet = await traGia({ ...m, slugDaBiet: slugDaHoc.get(khoaSlug) || null });
    } catch (e) {
      console.log(`  ✗ ${m.hang} ${m.dong} ${m.nam} — ngoại lệ: ${e.message}`);
    }
    tk.da_quet++;

    if (quet && quet.slug) slugDaHoc.set(khoaSlug, quet.slug);

    /* Ghi nhận sức khoẻ từng nguồn để đưa vào báo cáo. */
    for (const s of (quet && quet.nguon) || []) {
      if (!tk.suc_khoe.has(s.nguon)) tk.suc_khoe.set(s.nguon, { dat: 0, hong: 0, vp: new Map() });
      const o = tk.suc_khoe.get(s.nguon);
      if (s.ok) o.dat++; else o.hong++;
      for (const v of s.vi_pham || []) o.vp.set(v.ma, (o.vp.get(v.ma) || 0) + 1);
    }

    if (!quet || !quet.ok) { tk.khong_co++; }

    const cu = D[m.hang][m.dong].filter((r) => r[0] === m.nam);
    const kq = H.hopNhatMotNam(cu, quet, chonPhienBan, KY);

    /* Ghi ngược vào cấu trúc dữ liệu */
    const khac = D[m.hang][m.dong].filter((r) => r[0] !== m.nam);
    D[m.hang][m.dong] = [...khac, ...kq.banGhi].sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));

    const soDe = kq.banGhi.length - kq.giuNguyen;
    tk.da_cap_nhat += soDe;
    tk.giu_nguyen += kq.giuNguyen;
    for (const x of kq.thayDoi) tk.thay_doi.push({ ...x, xe: `${m.hang} ${m.dong}` });
    for (const x of kq.cachLy) tk.cach_ly.push({ ...x, xe: `${m.hang} ${m.dong}` });

    const nhan = soDe > 0 ? `cập nhật ${soDe}` : "giữ nguyên";
    process.stdout.write(`\r  [${i + 1}/${canQuet.length}] ${m.hang} ${m.dong} ${m.nam} — ${nhan}`.padEnd(78));

    if (i < canQuet.length - 1) await nghi(NGHI_MS);
  }
  console.log("");

  /* Gắn nhãn nguồn cho toàn bộ, kể cả dòng chưa từng đè. */
  for (const hang in D) for (const dong in D[hang]) D[hang][dong] = H.ganNhanNen(D[hang][dong]);

  /* Ghi file mới */
  goc.meta.ky_cap_nhat = KY;
  goc.meta.capnhat = new Date().toISOString().slice(0, 10);
  goc.meta.cot = ["nam", "phien_ban", "gia_tri", "gia_min", "gia_max", "nhien_lieu",
                  "so_ghe", "gia_niem_yet", "uoc_tinh", "nguon_gia", "so_tin_rao", "ky_cap_nhat"];
  goc.meta.so_ban_ghi = Object.values(D).reduce((a, ms) => a + Object.values(ms).reduce((b, v) => b + v.length, 0), 0);
  goc.meta.thong_ke_ky = {
    da_quet: tk.da_quet, da_cap_nhat: tk.da_cap_nhat,
    cach_ly: tk.cach_ly.length, doi_qua_nguong: tk.thay_doi.length
  };
  fs.writeFileSync(FILE_DB, JSON.stringify(goc));

  /* Báo cáo */
  tk.suc_khoe_nguon = [...tk.suc_khoe].map(([nguon, o]) => ({
    nguon, dat: o.dat, hong: o.hong,
    vi_pham_pho_bien: [...o.vp].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => `${k} (${n})`).join(", ")
  }));
  fs.writeFileSync(FILE_BAO_CAO, H.dungBaoCao(tk, KY));

  const phut = ((Date.now() - t0) / 60000).toFixed(1);
  console.log("");
  console.log(`Xong sau ${phut} phút`);
  console.log(`  cập nhật ${tk.da_cap_nhat} dòng · giữ nguyên ${tk.giu_nguyen} · cách ly ${tk.cach_ly.length} · đổi quá ngưỡng ${tk.thay_doi.length}`);
  console.log(`  file    : ${path.relative(GOC, FILE_DB)}`);
  console.log(`  báo cáo : ${path.relative(GOC, FILE_BAO_CAO)}`);

  /* Cảnh báo lớn nếu nghi parser hỏng hàng loạt. */
  const tongLuot = tk.suc_khoe_nguon.reduce((a, s) => a + s.dat + s.hong, 0);
  const tongHong = tk.suc_khoe_nguon.reduce((a, s) => a + s.hong, 0);
  if (tongLuot >= 20 && tongHong / tongLuot > 0.6) {
    console.log("");
    console.log("⚠ CẢNH BÁO: hơn 60% lượt quét không đạt kiểm tra chất lượng.");
    console.log("  Nhiều khả năng trang nguồn đã đổi giao diện. Đừng merge PR này.");
    process.exitCode = 2;
  }
}

main().catch((e) => { console.error("Lỗi:", e); process.exit(1); });
