/* DBV247 — Quét giá thị trường hàng tuần
   ---------------------------------------------------------------------------
   Chạy tự động 03:00 sáng thứ Hai (khai báo lịch trong netlify.toml).

   Vì sao quét trước thay vì tra lúc khách bấm:
     - Trang nội bộ trả kết quả tức thì, không bắt thẩm định viên chờ 2-3 giây.
     - Tải dồn vào một khung giờ đêm, mỗi request cách nhau hơn 1 giây, tổng
       cộng vài trăm lượt một tuần. Nhẹ hơn nhiều so với mỗi lượt khách một
       request, và ít khả năng bị Bonbanh chặn IP.

   Quét cái gì: các cặp (dòng xe × năm) phổ biến nhất, lấy từ chính CSDL —
   ưu tiên xe đời 2015 trở lại đây vì đó là nhóm khách hỏi bảo hiểm nhiều nhất.
   Ngân sách mỗi lần chạy có giới hạn cứng để không vượt thời gian thực thi.

   Cảnh báo hỏng: nếu tỷ lệ quét thành công tụt dưới 40%, gần như chắc chắn
   Bonbanh đã đổi giao diện và parser cần sửa. Lúc đó cron gửi Telegram (dùng
   lại TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID có sẵn của site).
*/

"use strict";

const { getStore } = require("@netlify/blobs");
const { docGiaThiTruong } = require("./lib/bonbanh.js");

const STORE = "dbv247-gia-xe";
const NGAN_SACH_MS = 9 * 60 * 1000;  // dừng trước khi Netlify cắt (10 phút)
const TOI_DA_MOI_LAN = 120;          // số cặp (dòng xe × năm) mỗi lần chạy
const NAM_TU = new Date().getFullYear() - 11;

/* Dòng xe cần theo dõi sát nhất — bán chạy, hay được hỏi bảo hiểm. */
const UU_TIEN = [
  ["TOYOTA", "VIOS"], ["TOYOTA", "FORTUNER"], ["TOYOTA", "INNOVA"],
  ["TOYOTA", "CAMRY"], ["TOYOTA", "COROLLA CROSS"], ["TOYOTA", "COROLLA ALTIS"],
  ["TOYOTA", "VELOZ CROSS"], ["TOYOTA", "YARIS CROSS"], ["TOYOTA", "WIGO"],
  ["TOYOTA", "RAIZE"], ["TOYOTA", "HILUX"], ["TOYOTA", "LAND CRUISER"],
  ["HONDA", "CITY"], ["HONDA", "CR-V"], ["HONDA", "CIVIC"], ["HONDA", "HR-V"],
  ["HONDA", "BRIO"], ["HONDA", "ACCORD"],
  ["HYUNDAI", "ACCENT"], ["HYUNDAI", "SANTAFE"], ["HYUNDAI", "TUCSON"],
  ["HYUNDAI", "I10"], ["HYUNDAI", "CRETA"], ["HYUNDAI", "ELANTRA"],
  ["KIA", "MORNING"], ["KIA", "SELTOS"], ["KIA", "CERATO"], ["KIA", "SORENTO"],
  ["KIA", "CARNIVAL"], ["KIA", "K3"], ["KIA", "SONET"], ["KIA", "SPORTAGE"],
  ["MAZDA", "CX5"], ["MAZDA", "3"], ["MAZDA", "CX8"], ["MAZDA", "2"], ["MAZDA", "CX30"],
  ["FORD", "RANGER"], ["FORD", "EVEREST"], ["FORD", "TERRITORY"],
  ["MITSUBISHI", "XPANDER"], ["MITSUBISHI", "OUTLANDER"], ["MITSUBISHI", "ATTRAGE"],
  ["MITSUBISHI", "TRITON"], ["MITSUBISHI", "XFORCE"],
  ["VINFAST", "VF8"], ["VINFAST", "VF5"], ["VINFAST", "FADIL"], ["VINFAST", "VF3"],
  ["VINFAST", "LUX A2.0"], ["VINFAST", "VF6"],
  ["NISSAN", "NAVARA"], ["NISSAN", "X-TRAIL"], ["NISSAN", "ALMERA"],
  ["SUZUKI", "XL7"], ["SUZUKI", "ERTIGA"], ["SUZUKI", "SWIFT"],
  ["MERCEDES-BENZ", "C-CLASS"], ["MERCEDES-BENZ", "GLC"], ["MERCEDES-BENZ", "E-CLASS"],
  ["BMW", "3 SERIES"], ["BMW", "X3"], ["BMW", "5 SERIES"],
  ["MG", "ZS"], ["MG", "5"]
];

async function baoTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML" })
    });
  } catch (_) {}
}

/* Xếp lịch quét: xe càng mới càng ưu tiên, và xoay vòng theo tuần để lần chạy
   sau không lặp lại y hệt lần trước. */
function lenLich(tuanThu) {
  const namHT = new Date().getFullYear();
  const ds = [];
  for (const [hang, dong] of UU_TIEN) {
    for (let nam = namHT; nam >= NAM_TU; nam--) ds.push({ hang, dong, nam });
  }
  const batDau = (tuanThu * TOI_DA_MOI_LAN) % ds.length;
  return [...ds.slice(batDau), ...ds.slice(0, batDau)].slice(0, TOI_DA_MOI_LAN);
}

exports.handler = async function () {
  const batDau = Date.now();
  let store;
  try {
    store = getStore(STORE);
  } catch (e) {
    return { statusCode: 500, body: "Không mở được Blobs: " + e.message };
  }

  /* Đọc số tuần đã chạy để xoay vòng danh sách. */
  let trangThai = null;
  try { trangThai = await store.get("_trang_thai_cron", { type: "json" }); } catch (_) {}
  const tuanThu = (trangThai?.tuan_thu || 0) + 1;

  const lich = lenLich(tuanThu);
  const kq = { thanh_cong: 0, that_bai: 0, chi_tiet_loi: [] };

  for (const muc of lich) {
    if (Date.now() - batDau > NGAN_SACH_MS) break;

    let slugDaBiet = null;
    try {
      slugDaBiet = await store.get(`slug|${muc.hang}|${muc.dong}`.toLowerCase(), { type: "json" });
    } catch (_) {}

    const r = await docGiaThiTruong({ ...muc, soTrang: 1, slugDaBiet });

    if (r.ok && r.tong_hop && r.tong_hop.so_tin >= 3) {
      const khoa = `${muc.hang}|${muc.dong}|${muc.nam}`.toLowerCase().replace(/[^a-z0-9|._-]/g, "_");
      try {
        /* Lưu nguyên bản kèm bảng theo phiên bản. Khớp phiên bản để lúc trả
           về cho người dùng, vì cron không biết ai sẽ tra bản nào. */
        await store.setJSON(khoa, r);
        if (r.slug) await store.setJSON(`slug|${muc.hang}|${muc.dong}`.toLowerCase(), r.slug);
      } catch (_) {}
      kq.thanh_cong++;
    } else {
      kq.that_bai++;
      if (kq.chi_tiet_loi.length < 12) {
        kq.chi_tiet_loi.push(`${muc.hang} ${muc.dong} ${muc.nam}: ${r.ly_do || "?"}`);
      }
    }
  }

  const tong = kq.thanh_cong + kq.that_bai;
  const tyLe = tong ? Math.round((kq.thanh_cong / tong) * 100) : 0;

  try {
    await store.setJSON("_trang_thai_cron", {
      tuan_thu: tuanThu,
      chay_luc: new Date().toISOString(),
      da_quet: tong,
      thanh_cong: kq.thanh_cong,
      ty_le: tyLe,
      giay: Math.round((Date.now() - batDau) / 1000),
      loi_mau: kq.chi_tiet_loi
    });
  } catch (_) {}

  /* Tỷ lệ tụt sâu = parser hỏng, phải sửa tay. Báo ngay thay vì để dữ liệu
     âm thầm cũ dần mà không ai biết. */
  if (tong >= 20 && tyLe < 40) {
    await baoTelegram(
      `⚠️ <b>Quét giá xe hỏng</b>\n` +
      `Tỷ lệ thành công chỉ <b>${tyLe}%</b> (${kq.thanh_cong}/${tong}).\n` +
      `Nhiều khả năng Bonbanh đã đổi giao diện — cần sửa parser trong ` +
      `<code>netlify/functions/lib/bonbanh.js</code>.\n\n` +
      `Lỗi mẫu:\n${kq.chi_tiet_loi.slice(0, 5).join("\n")}`
    );
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tuan_thu: tuanThu, da_quet: tong, thanh_cong: kq.thanh_cong,
      ty_le: tyLe + "%", giay: Math.round((Date.now() - batDau) / 1000),
      loi_mau: kq.chi_tiet_loi
    })
  };
};
