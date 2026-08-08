/* DBV247 — Quét giá thị trường theo lô nhỏ, chạy mỗi giờ
   ---------------------------------------------------------------------------
   HAI RÀNG BUỘC CỦA NETLIFY QUYẾT ĐỊNH TOÀN BỘ THIẾT KẾ NÀY:

   1. Scheduled function bị cắt sau 30 GIÂY. Không phải 10 phút như function
      thường chạy nền. Bản đầu tiên đặt ngân sách 9 phút và quét 120 mục —
      nó sẽ bị giết giữa chừng, ghi được vài mục rồi chết, và không ai biết
      vì Netlify không báo lỗi ra ngoài.

   2. KHÔNG gọi được scheduled function bằng URL. Netlify chặn hẳn. Muốn chạy
      tay phải vào giao diện Netlify > Functions > chọn hàm > bấm "Run now",
      hoặc chạy `netlify functions:invoke gia-thi-truong-cron` ở máy.

   Vì vậy: quét lô nhỏ (10 mục) mỗi giờ thay vì lô lớn mỗi tuần.
   Cộng lại 24 lượt/ngày × 10 = 240 mục/ngày, phủ hết 780 cặp (dòng xe × năm)
   trong khoảng 3,5 ngày — dữ liệu còn tươi hơn bản quét tuần, mà không lượt
   nào chạm giới hạn 30 giây.

   Lịch khai trong netlify.toml. Kết quả lưu ở Blobs store "dbv247-gia-xe".
*/

"use strict";

const { getStore } = require("@netlify/blobs");
const { docGiaThiTruong } = require("./lib/bonbanh.js");

const STORE = "dbv247-gia-xe";

/* Dừng ở 22 giây, chừa 8 giây cho việc ghi Blobs và trả kết quả. Chạm mốc 30
   giây là Netlify cắt ngang, mất cả phần thống kê của lượt đó. */
const NGAN_SACH_MS = 22000;
const TOI_DA_MOI_LUOT = 10;
const NAM_TU = new Date().getFullYear() - 11;

/* Ngưỡng cảnh báo tính trên nhiều lượt cộng lại — một lượt 10 mục quá ít để
   kết luận parser hỏng, chỉ cần 4 dòng xe hiếm là tỷ lệ đã tụt dưới 40%. */
const CUA_SO_DANH_GIA = 60;   // số mục gần nhất dùng để đánh giá
const NGUONG_HONG = 40;       // %
const NGHI_GIUA_2_CANH_BAO_MS = 24 * 3600e3;

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

/* Danh sách đầy đủ mọi cặp cần quét, thứ tự cố định để con trỏ xoay vòng
   chạy hết một lượt rồi mới quay lại từ đầu. */
function toanBoLich() {
  const namHT = new Date().getFullYear();
  const ds = [];
  for (const [hang, dong] of UU_TIEN) {
    for (let nam = namHT; nam >= NAM_TU; nam--) ds.push({ hang, dong, nam });
  }
  return ds;
}

async function baoTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML" })
    });
    return true;
  } catch (_) { return false; }
}

exports.handler = async function () {
  const batDau = Date.now();
  let store;
  try {
    store = getStore(STORE);
  } catch (e) {
    return { statusCode: 500, body: "Không mở được Blobs: " + e.message };
  }

  let tt = null;
  try { tt = await store.get("_trang_thai_cron", { type: "json" }); } catch (_) {}
  tt = tt || {};

  const lich = toanBoLich();
  const conTro = Number(tt.con_tro) || 0;
  const luotThu = (Number(tt.luot_thu) || 0) + 1;

  const lo = [];
  for (let i = 0; i < TOI_DA_MOI_LUOT; i++) lo.push(lich[(conTro + i) % lich.length]);

  let thanhCong = 0, thatBai = 0;
  const loiMau = [];
  let daXong = 0;

  for (const muc of lo) {
    if (Date.now() - batDau > NGAN_SACH_MS) break;

    let slugDaBiet = null;
    try {
      slugDaBiet = await store.get(`slug|${muc.hang}|${muc.dong}`.toLowerCase(), { type: "json" });
    } catch (_) {}

    const r = await docGiaThiTruong({ ...muc, soTrang: 1, slugDaBiet });
    daXong++;

    if (r.ok && r.tong_hop && r.tong_hop.so_tin >= 3) {
      const khoa = `${muc.hang}|${muc.dong}|${muc.nam}`.toLowerCase().replace(/[^a-z0-9|._-]/g, "_");
      try {
        await store.setJSON(khoa, r);
        if (r.slug) await store.setJSON(`slug|${muc.hang}|${muc.dong}`.toLowerCase(), r.slug);
      } catch (_) {}
      thanhCong++;
    } else {
      thatBai++;
      if (loiMau.length < 6) loiMau.push(`${muc.hang} ${muc.dong} ${muc.nam}: ${r.ly_do || "?"}`);
    }
  }

  /* Cộng dồn qua các lượt gần đây để đánh giá sức khoẻ parser. */
  const lichSu = Array.isArray(tt.lich_su) ? tt.lich_su.slice(-20) : [];
  lichSu.push({ t: Date.now(), ok: thanhCong, tong: daXong });
  while (lichSu.reduce((s, x) => s + x.tong, 0) > CUA_SO_DANH_GIA * 2 && lichSu.length > 1) lichSu.shift();

  const tongCuaSo = lichSu.reduce((s, x) => s + x.tong, 0);
  const okCuaSo = lichSu.reduce((s, x) => s + x.ok, 0);
  const tyLeCuaSo = tongCuaSo ? Math.round((okCuaSo / tongCuaSo) * 100) : 0;

  let daCanhBao = Number(tt.canh_bao_luc) || 0;
  let guiCanhBao = false;
  if (
    tongCuaSo >= 30 &&
    tyLeCuaSo < NGUONG_HONG &&
    Date.now() - daCanhBao > NGHI_GIUA_2_CANH_BAO_MS
  ) {
    guiCanhBao = await baoTelegram(
      `⚠️ <b>Quét giá xe có vấn đề</b>\n` +
      `Tỷ lệ thành công <b>${tyLeCuaSo}%</b> trên ${tongCuaSo} mục gần nhất.\n` +
      `Nhiều khả năng Bonbanh đã đổi giao diện — kiểm tra parser ở ` +
      `<code>netlify/functions/lib/bonbanh.js</code>.\n\n` +
      `Lỗi mẫu:\n${loiMau.slice(0, 4).join("\n")}`
    );
    if (guiCanhBao) daCanhBao = Date.now();
  }

  const conTroMoi = (conTro + daXong) % lich.length;
  const vongThu = Math.floor((conTro + daXong) / lich.length) + (Number(tt.vong_thu) || 0);

  try {
    await store.setJSON("_trang_thai_cron", {
      luot_thu: luotThu,
      con_tro: conTroMoi,
      vong_thu: vongThu,
      tong_cap: lich.length,
      chay_luc: new Date().toISOString(),
      luot_nay: { da_quet: daXong, thanh_cong: thanhCong, giay: Math.round((Date.now() - batDau) / 1000) },
      cua_so: { so_muc: tongCuaSo, ty_le: tyLeCuaSo },
      loi_mau: loiMau,
      lich_su: lichSu,
      canh_bao_luc: daCanhBao
    });
  } catch (_) {}

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      luot_thu: luotThu,
      da_quet: daXong,
      thanh_cong: thanhCong,
      that_bai: thatBai,
      giay: Math.round((Date.now() - batDau) / 1000),
      tien_do: `${conTroMoi}/${lich.length} cặp · vòng ${vongThu}`,
      ty_le_cua_so: tyLeCuaSo + "% trên " + tongCuaSo + " mục gần nhất",
      da_gui_canh_bao: guiCanhBao,
      loi_mau: loiMau
    })
  };
};
