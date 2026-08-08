/* DBV247 — Bản dự phòng bằng AI khi parser Bonbanh không đọc được
   ---------------------------------------------------------------------------
   Khi nào chạy: chỉ khi parser trả về ít hơn 3 tin. Hai trường hợp hay gặp là
   Bonbanh đổi giao diện, hoặc dòng xe quá hiếm nên không đủ tin để tính.

   Vì sao không dùng AI làm nguồn chính: mô hình ngôn ngữ có thể bịa ra con số
   nghe rất hợp lý mà không dựa trên tin rao nào. Parser đọc số thật từ trang
   thật, truy được về từng mã tin — luôn đáng tin hơn.

   Nên mọi kết quả từ đây đều gắn cờ `do_tin_cay: "thap"` và bắt buộc kèm câu
   nhắc kiểm chứng lại. Không bao giờ ghi đè lên số liệu parser đọc được.

   Biến môi trường: GEMINI_API_KEY (đã dùng sẵn cho chatbot), GEMINI_MODEL.
*/

"use strict";

const MODEL_MAC_DINH = "gemini-2.5-flash";

/* Bắt mô hình trả về đúng khuôn JSON, không kèm lời dẫn. */
const SCHEMA = {
  type: "object",
  properties: {
    tim_thay: { type: "boolean" },
    trung_vi: { type: "number" },
    thap_nhat: { type: "number" },
    cao_nhat: { type: "number" },
    so_tin_tham_khao: { type: "number" },
    ghi_chu: { type: "string" }
  },
  required: ["tim_thay", "ghi_chu"]
};

const CHI_DAN = `Bạn là công cụ tra giá xe ô tô cũ tại Việt Nam.

Nhiệm vụ: từ nội dung trang web được cung cấp, trích ra mức giá RAO BÁN của
đúng dòng xe và đúng năm sản xuất được hỏi.

Quy tắc bắt buộc:
1. CHỈ dùng con số xuất hiện trong nội dung được cung cấp. Tuyệt đối không suy
   đoán, không lấy từ kiến thức sẵn có của bạn.
2. Nếu nội dung không có tin rao nào đúng dòng xe và đúng năm, trả về
   tim_thay = false. Thà không có kết quả còn hơn đưa số sai — con số này được
   dùng để xác định số tiền bảo hiểm cho khách hàng thật.
3. Đơn vị trả về là ĐỒNG (VNĐ). "310 Triệu" -> 310000000.
4. Bỏ qua giá bất thường (dưới 30 triệu hoặc trên 60 tỷ) — đó là tin câu view
   hoặc gõ nhầm.
5. trung_vi là giá ở giữa dãy, không phải trung bình cộng.
6. Trong ghi_chu, nêu rõ đã dựa trên bao nhiêu tin và có gì đáng lưu ý.`;

async function traGiaBangAI({ hang, dong, nam, noiDungTrang, urlGoc }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, ly_do: "thieu_GEMINI_API_KEY" };

  const model = process.env.GEMINI_MODEL || MODEL_MAC_DINH;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  /* Cắt bớt cho vừa cửa sổ ngữ cảnh và đỡ tốn token. */
  const noiDung = String(noiDungTrang || "").slice(0, 60000);

  const cauHoi =
    `Xe cần tra: ${hang} ${dong}, năm sản xuất ${nam}.\n` +
    `Nguồn: ${urlGoc}\n\n--- NỘI DUNG TRANG ---\n${noiDung}`;

  const ctrl = new AbortController();
  const hetGio = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CHI_DAN }] },
        contents: [{ role: "user", parts: [{ text: cauHoi }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: SCHEMA
        }
      })
    });

    if (!r.ok) {
      return { ok: false, ly_do: "gemini_loi_" + r.status };
    }

    const j = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) return { ok: false, ly_do: "gemini_khong_tra_loi" };

    const kq = JSON.parse(txt);
    if (!kq.tim_thay) return { ok: false, ly_do: "ai_khong_tim_thay", ghi_chu: kq.ghi_chu };

    /* Kiểm tra lại số mô hình đưa ra — không tin ngay. */
    const hopLe = (x) => typeof x === "number" && x >= 30e6 && x <= 60e9;
    if (!hopLe(kq.trung_vi)) return { ok: false, ly_do: "ai_tra_so_vo_ly", ghi_chu: kq.ghi_chu };

    const lamTron = (x) => (hopLe(x) ? Math.round(x / 1e6) * 1e6 : 0);
    return {
      ok: true,
      nguon: "bonbanh.com (đọc bằng AI)",
      do_tin_cay: "thap",
      trung_vi: lamTron(kq.trung_vi),
      thap_nhat: lamTron(kq.thap_nhat) || lamTron(kq.trung_vi * 0.9),
      cao_nhat: lamTron(kq.cao_nhat) || lamTron(kq.trung_vi * 1.1),
      so_tin: Math.max(0, Math.round(kq.so_tin_tham_khao || 0)),
      ghi_chu: kq.ghi_chu || "",
      canh_bao:
        "Số này do AI đọc trang, không phải parser bóc trực tiếp. Cần kiểm chứng trước khi dùng cho hồ sơ khách hàng.",
      doc_luc: new Date().toISOString()
    };
  } catch (e) {
    return { ok: false, ly_do: "gemini_ngoai_le", chi_tiet: String(e && e.message) };
  } finally {
    clearTimeout(hetGio);
  }
}

module.exports = { traGiaBangAI };
