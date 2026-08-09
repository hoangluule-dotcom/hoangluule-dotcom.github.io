/* DBV247 — Khung quét giá xe nhiều nguồn
   ===========================================================================
   TRIẾT LÝ: GIẢ ĐỊNH PARSER SẼ HỎNG.

   Không phải "có thể hỏng" mà "sẽ hỏng" — chỉ là bao giờ. Riêng ngày
   08/08/2026, parser Bonbanh lộ ba lỗi, và cả ba đều SAI ÂM THẦM:

     1. Giá "1 Tỷ 180 Triệu" đọc thành 1 tỷ chẵn  -> mọi xe trên 1 tỷ sai
     2. Bản 2.7 khớp nhầm sang bản 2.8            -> trả giá của xe khác
     3. Mọi tin rơi vào một nhóm "khong ro"       -> gộp 4 phiên bản làm một

   Không lỗi nào ném exception. Không lỗi nào hiện lên màn hình. Chúng chỉ
   trả về một con số trông hoàn toàn bình thường.

   Vì vậy khung này KHÔNG tin vào việc "code đúng". Nó kiểm tra kết quả sau
   mỗi lần quét bằng một bộ BẤT BIẾN — những điều phải đúng nếu parser còn
   hoạt động. Bất biến gãy thì nguồn bị đánh dấu hỏng và loại khỏi việc tính
   giá, thay vì âm thầm đầu độc cơ sở dữ liệu.

   Ba bất biến dưới đây được chọn để bắt đúng ba lỗi trên.
   ===========================================================================
   Thêm nguồn mới: viết một object theo giao diện ở cuối file rồi đăng ký vào
   lib/nguon/index.js. Không cần sửa gì trong khung này.
*/

"use strict";

/* ── Ngưỡng bất biến ────────────────────────────────────────────────────────
   Chỉnh ở đây, đừng rải số ma khắp code. */
const NGUONG = {
  /* Giá nằm ngoài dải này chắc chắn là đọc sai, không phải xe thật. */
  gia_min: 50e6,
  gia_max: 30e9,

  /* Đọc được quá ít so với số tin trang tự báo -> parser đang trượt phần lớn. */
  ty_le_boc_toi_thieu: 0.4,

  /* BẮT LỖI SỐ 3: gom hết vào "khong ro" nghĩa là tên phiên bản không lấy
     được. Trang tin rao nào cũng phải có tên phiên bản cho phần lớn tin. */
  ty_le_co_phien_ban_toi_thieu: 0.6,

  /* BẮT LỖI SỐ 1: khi giá tiền tỷ bị cắt cụt, hàng loạt tin dồn về đúng
     những con số tròn tỷ. Ngoài đời rất hiếm xe rao đúng 1.000.000.000. */
  ty_le_gia_tron_ty_toi_da: 0.15,

  /* Tin không đúng năm yêu cầu -> đang lẫn mục "xe tương tự". */
  ty_le_dung_nam_toi_thieu: 0.7,

  /* Dưới mức này thì thống kê không có ý nghĩa. */
  so_tin_toi_thieu: 3
};

/* ── Kiểm tra bất biến ─────────────────────────────────────────────────── */

/**
 * @param {Array} tin  bản ghi thô từ một adapter
 * @param {Object} ctx { nam, tong_tin_trang }
 * @returns {{dat:boolean, diem:number, vi_pham:Array, so_lieu:Object}}
 */
function kiemTraBatBien(tin, ctx) {
  const viPham = [];
  const n = tin.length;
  const soLieu = { so_tin: n };

  if (n < NGUONG.so_tin_toi_thieu) {
    viPham.push({ ma: "qua_it_tin", chi_tiet: `chỉ ${n} tin, cần tối thiểu ${NGUONG.so_tin_toi_thieu}` });
    return { dat: false, diem: 0, vi_pham: viPham, so_lieu: soLieu };
  }

  /* 1. Giá phải nằm trong dải hợp lý */
  const ngoaiDai = tin.filter((x) => !(x.gia >= NGUONG.gia_min && x.gia <= NGUONG.gia_max));
  soLieu.ngoai_dai_gia = ngoaiDai.length;
  if (ngoaiDai.length / n > 0.2) {
    viPham.push({ ma: "gia_ngoai_dai", chi_tiet: `${ngoaiDai.length}/${n} tin có giá vô lý` });
  }

  /* 2. Tỷ lệ bóc được so với số tin trang tự báo */
  if (ctx.tong_tin_trang) {
    const kyVong = Math.min(ctx.tong_tin_trang, ctx.tin_moi_trang || 20);
    const tyLe = n / kyVong;
    soLieu.ty_le_boc = Math.round(tyLe * 100) / 100;
    if (tyLe < NGUONG.ty_le_boc_toi_thieu) {
      viPham.push({ ma: "boc_thieu", chi_tiet: `chỉ đọc được ${n}/${kyVong} tin trang báo có` });
    }
  }

  /* 3. Phần lớn tin phải có tên phiên bản — BẮT LỖI GOM NHÓM */
  const coPB = tin.filter((x) => x.phien_ban && String(x.phien_ban).trim()).length;
  soLieu.ty_le_co_phien_ban = Math.round((coPB / n) * 100) / 100;
  if (coPB / n < NGUONG.ty_le_co_phien_ban_toi_thieu) {
    viPham.push({
      ma: "thieu_phien_ban",
      chi_tiet: `chỉ ${coPB}/${n} tin lấy được tên phiên bản — nhiều khả năng đường dẫn đổi cấu trúc`
    });
  }

  /* 4. Giá tròn tỷ bất thường — BẮT LỖI GIÁ BỊ CẮT CỤT */
  const tronTy = tin.filter((x) => x.gia > 0 && x.gia % 1e9 === 0).length;
  soLieu.ty_le_tron_ty = Math.round((tronTy / n) * 100) / 100;
  if (tronTy / n > NGUONG.ty_le_gia_tron_ty_toi_da) {
    viPham.push({
      ma: "gia_tron_ty_bat_thuong",
      chi_tiet: `${tronTy}/${n} tin có giá đúng số tròn tỷ — nhiều khả năng phần triệu bị mất`
    });
  }

  /* 5. Năm phải khớp yêu cầu */
  if (ctx.nam) {
    const coNam = tin.filter((x) => x.nam);
    if (coNam.length) {
      const dungNam = coNam.filter((x) => x.nam === ctx.nam).length;
      soLieu.ty_le_dung_nam = Math.round((dungNam / coNam.length) * 100) / 100;
      if (dungNam / coNam.length < NGUONG.ty_le_dung_nam_toi_thieu) {
        viPham.push({
          ma: "lan_nam_khac",
          chi_tiet: `chỉ ${dungNam}/${coNam.length} tin đúng đời ${ctx.nam} — có thể đang lẫn mục xe tương tự`
        });
      }
    }
  }

  const diem = Math.max(0, 1 - viPham.length * 0.34);
  return { dat: viPham.length === 0, diem: Math.round(diem * 100) / 100, vi_pham: viPham, so_lieu: soLieu };
}

/* ── Chạy một nguồn ────────────────────────────────────────────────────── */

/**
 * Gọi adapter, lọc bản ghi rác, chấm sức khoẻ.
 * KHÔNG ném lỗi ra ngoài — nguồn hỏng chỉ làm giảm số nguồn, không được làm
 * sập cả lần tra.
 */
async function chayNguon(nguon, yeuCau) {
  const batDau = Date.now();
  try {
    const kq = await nguon.quet(yeuCau);
    if (!kq || !Array.isArray(kq.tin)) {
      return { nguon: nguon.ma, ok: false, ly_do: "adapter_khong_tra_du_lieu", giay: giay(batDau) };
    }

    /* Chỉ giữ bản ghi có giá đọc được. Bản ghi thiếu giá là rác, không phải
       thông tin — giữ lại chỉ làm loãng thống kê. */
    const sach = kq.tin.filter((x) => x && Number(x.gia) > 0);

    const suckhoe = kiemTraBatBien(sach, {
      nam: yeuCau.nam,
      tong_tin_trang: kq.tong_tin_trang,
      tin_moi_trang: nguon.tin_moi_trang
    });

    return {
      nguon: nguon.ma,
      ten: nguon.ten,
      ok: suckhoe.dat,
      tin: sach,
      url_goc: kq.url_goc || null,
      tong_tin_trang: kq.tong_tin_trang || null,
      suc_khoe: suckhoe,
      giay: giay(batDau)
    };
  } catch (e) {
    return { nguon: nguon.ma, ok: false, ly_do: "ngoai_le", chi_tiet: String(e && e.message), giay: giay(batDau) };
  }
}

function giay(t) { return Math.round((Date.now() - t) / 100) / 10; }

/* ── Giao diện adapter ──────────────────────────────────────────────────────
   Mỗi nguồn phải xuất ra một object như sau:

   {
     ma: 'bonbanh',                 // định danh ngắn, dùng làm khoá lưu trữ
     ten: 'Bonbanh.com',            // tên hiển thị
     tin_moi_trang: 20,             // số tin mỗi trang, để tính tỷ lệ bóc
     uu_tien: 1,                    // số nhỏ = tin cậy hơn khi các nguồn lệch

     async quet({hang, dong, nam, phienBan, slugDaBiet}) {
       return {
         tin: [                     // mảng bản ghi
           { ma, gia, nam, phien_ban, so_km, hop_so }
         ],
         tong_tin_trang: 46,        // số tin trang tự báo, dùng cho bất biến
         url_goc: 'https://…',      // để người dùng tự đối chiếu
         slug: {...}                // tuỳ chọn, để lần sau đi thẳng
       };
     }
   }

   Bắt buộc: `gia` tính bằng đồng, `phien_ban` là chuỗi đã chuẩn hoá chữ
   thường. Thiếu `phien_ban` sẽ làm gãy bất biến số 3 — đó là chủ ý.
*/

module.exports = { NGUONG, kiemTraBatBien, chayNguon };
