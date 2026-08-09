#!/usr/bin/env node
/* Canh lệch biểu phí giữa ba bản đang tồn tại trong site
   ---------------------------------------------------------------------------
   Biểu phí QĐ 219/2026 hiện nằm ở ba nơi:
     1. assets/bieu-phi-dbv.js       — trang tính phí nội bộ
     2. bao-hiem-vat-chat-oto.html   — công cụ cho khách (xăng/dầu)
     3. bao-hiem-oto-dien.html       — công cụ cho khách (xe điện)

   Không gộp về một chỗ được vì hai trang sản phẩm không được phép sửa. Vậy
   nên phải có cái canh: sửa một chỗ mà quên hai chỗ kia thì nhân viên báo
   khách một giá, web hiện một giá khác.

   Chạy:  node scripts/check_bieu_phi.js
   Trả mã thoát 1 khi phát hiện lệch — cắm được vào bước kiểm tra trước deploy.
*/

"use strict";
const fs = require("fs");
const path = require("path");

const GOC = path.join(__dirname, "..");

function docTariffTuTrang(tenFile) {
  const p = path.join(GOC, tenFile);
  if (!fs.existsSync(p)) return { loi: "không tìm thấy file" };
  const s = fs.readFileSync(p, "utf8");
  const i = s.indexOf("var TARIFF=");
  if (i < 0) return { loi: "không thấy khai báo TARIFF" };

  /* Cắt từ "var TARIFF=" tới dấu "};" cân bằng ngoặc đầu tiên. */
  let j = s.indexOf("{", i), sau = 0, k = j;
  for (; k < s.length; k++) {
    if (s[k] === "{") sau++;
    else if (s[k] === "}") { sau--; if (sau === 0) break; }
  }
  const bieuThuc = s.slice(j, k + 1);
  try {
    return { ok: new Function("return (" + bieuThuc + ")")() };
  } catch (e) {
    return { loi: "không đọc được: " + e.message };
  }
}

/* So sánh chỉ các trường ảnh hưởng tới số tiền — bỏ qua tên hiển thị. */
function rutGon(t) {
  const ra = {};
  for (const k of Object.keys(t).sort()) {
    const c = t[k];
    ra[k] = {
      thuan: c.thuan,
      bs01: c.bs01,
      bs06: c.bs06,
      bands: (c.bands || []).map((b) => ({
        max: b.max === Infinity ? "vo_cuc" : b.max,
        base: b.base,
        bs02: b.bs02
      }))
    };
  }
  return ra;
}

function soSanh(a, b, nhanA, nhanB) {
  const sa = JSON.stringify(rutGon(a), null, 1);
  const sb = JSON.stringify(rutGon(b), null, 1);
  if (sa === sb) return null;

  const da = sa.split("\n"), db = sb.split("\n");
  const khac = [];
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    if (da[i] !== db[i]) {
      khac.push(`  dòng ${i + 1}\n    ${nhanA}: ${(da[i] || "(thiếu)").trim()}\n    ${nhanB}: ${(db[i] || "(thiếu)").trim()}`);
      if (khac.length >= 8) break;
    }
  }
  return khac.join("\n");
}

/* ── Chạy ─────────────────────────────────────────────────────────────── */
const modun = require(path.join(GOC, "assets", "bieu-phi-dbv.js"));
const xang = docTariffTuTrang("bao-hiem-vat-chat-oto.html");
const dien = docTariffTuTrang("bao-hiem-oto-dien.html");

let loi = 0;
console.log("Canh lệch biểu phí — nguồn:", modun.nguon);
console.log("");

for (const [ten, kq] of [["bao-hiem-vat-chat-oto.html", xang], ["bao-hiem-oto-dien.html", dien]]) {
  process.stdout.write(("  " + ten).padEnd(44));
  if (kq.loi) { console.log("BỎ QUA — " + kq.loi); continue; }
  const d = soSanh(modun.TARIFF, kq.ok, "module", "trang");
  if (!d) { console.log("KHỚP"); }
  else { console.log("LỆCH"); console.log(d); loi++; }
}

/* Mâu thuẫn đã biết giữa hai trang sản phẩm: mốc hết phân cấp của nhóm kd. */
console.log("");
console.log("Kiểm tra mốc hết phân cấp nhóm KDVT:");
const sXang = fs.readFileSync(path.join(GOC, "bao-hiem-vat-chat-oto.html"), "utf8");
const sDien = fs.readFileSync(path.join(GOC, "bao-hiem-oto-dien.html"), "utf8");
const xangCo10 = /escalateMonths/.test(sXang);
const dienCo10 = /escalateMonths/.test(sDien);
console.log("  bao-hiem-vat-chat-oto.html".padEnd(44) + (xangCo10 ? "có luật 10 năm cho KDVT" : "mọi nhóm xe đều 15 năm"));
console.log("  bao-hiem-oto-dien.html".padEnd(44) + (dienCo10 ? "có luật 10 năm cho KDVT (PL05)" : "mọi nhóm xe đều 15 năm"));
if (xangCo10 !== dienCo10) {
  console.log("");
  console.log("  ⚠ HAI TRANG ĐANG MÂU THUẪN. Xe KDVT 12 năm tuổi sẽ ra kết quả khác nhau");
  console.log("    tuỳ khách vào trang nào. Cần hỏi phòng nghiệp vụ xem PL05 áp cho");
  console.log("    cả xe xăng/dầu hay chỉ xe điện, rồi sửa cho thống nhất.");
  loi++;
}

console.log("");
console.log(loi ? `KẾT LUẬN: có ${loi} vấn đề cần xử lý.` : "KẾT LUẬN: ba bản biểu phí đang khớp nhau.");
process.exit(loi ? 1 : 0);
