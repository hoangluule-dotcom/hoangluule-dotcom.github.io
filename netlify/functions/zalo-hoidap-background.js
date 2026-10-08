/* DBV247 — Bot Zalo nội bộ: tra phí nhanh TNDS + hỏi đáp nghiệp vụ
   ===========================================================================
   Hàm NỀN (tên kết thúc bằng -background): Netlify trả 202 ngay cho
   zalo-webhook.js rồi chạy tiếp tối đa 15 phút — đủ thời gian gọi AI.
   Chỉ nhận lời gọi từ zalo-webhook.js (header x-noi-bo = ZALO_WEBHOOK_SECRET).

   Nguồn trả lời:
   - Phí TNDS: lib/bieu-phi-tnds.js (đọc thẳng từ công cụ cấp đơn trên web,
     đã tính sẵn VAT) → con số luôn khớp với giá khách thấy trên web.
   - Nghiệp vụ: kho kiến thức kb-data.js của chatbot web (chat.js), chọn
     vài trang liên quan nhất cho mỗi câu hỏi.
   Dùng chung GEMINI_API_KEY với chatbot web.
*/

'use strict';

const { guiDen } = require('./lib/zalo');
const { bangPhiTnds } = require('./lib/bieu-phi-tnds');
const { pickPages, askGemini, KB } = require('./chat.js')._noiBo;

function promptNoiBo(bangPhi, pages) {
  const detail = pages.length
    ? pages.map((p) => '### ' + p.title + ' (https://dbv247.com.vn' + p.url + ')\n' + p.content).join('\n\n')
    : '(Không có trang nào khớp rõ với câu hỏi này.)';

  return [
    'Bạn là trợ lý nội bộ của nhóm vận hành DBV247 (Tập đoàn Bảo hiểm DBV — Chi nhánh Thành Đô), trả lời trong nhóm Zalo.',
    'Người hỏi là nhân viên/tư vấn viên, KHÔNG phải khách hàng. Xưng "em", gọi "anh/chị". Trả lời thẳng vào việc.',
    '',
    '== QUY TẮC BẮT BUỘC ==',
    '1. Hỏi phí TNDS bắt buộc: CHỈ lấy số từ BIỂU PHÍ TNDS bên dưới, chép đúng con số, không tự nhân chia. Luôn ghi: phí chưa VAT, VAT, tổng/năm. Hỏi nhiều năm thì nhân tổng/năm với số năm và ghi rõ phép nhân.',
    '2. Thiếu thông tin để chọn đúng dòng (không rõ kinh doanh hay không, bao nhiêu chỗ, bao nhiêu tấn) thì liệt kê ngắn các khả năng và hỏi lại — không đoán.',
    '3. Sản phẩm khác (vật chất xe, sức khỏe, cháy nổ, tài sản, hàng hóa...): chỉ dùng thông tin trong TƯ LIỆU. Có tỷ lệ phí/mức phí trong tư liệu thì nêu kèm điều kiện; phí phụ thuộc thẩm định thì nói rõ cần thẩm định.',
    '4. Không có trong tư liệu thì nói "chưa có thông tin trong dữ liệu của bot" — TUYỆT ĐỐI không bịa con số, điều khoản, quy định.',
    '5. Không dùng từ ngữ so sánh vượt trội ("số 1", "tốt nhất", "rẻ nhất").',
    '',
    '== ĐỊNH DẠNG (Zalo không hiển thị markdown) ==',
    '- Chữ thường, KHÔNG dùng **, #, bảng. Gạch đầu dòng bằng "- ".',
    '- Ngắn gọn: tối đa khoảng 10 dòng. Viết trọn câu cuối.',
    '- Có trang web liên quan thì kèm 1 đường link đầy đủ https://dbv247.com.vn/... ở cuối.',
    '',
    '== BIỂU PHÍ TNDS ==',
    bangPhi || '(Tạm thời không tải được biểu phí — nếu được hỏi phí TNDS, báo nhân viên xem công cụ cấp đơn trên web.)',
    '',
    '== TƯ LIỆU: THÔNG TIN DOANH NGHIỆP ==',
    KB.company,
    '',
    '== TƯ LIỆU: TRANG LIÊN QUAN CÂU HỎI ==',
    detail,
  ].join('\n');
}

exports.handler = async function (event) {
  const secret = process.env.ZALO_WEBHOOK_SECRET;
  const h = event.headers || {};
  if (!secret || h['x-noi-bo'] !== secret) {
    console.error('zalo-hoidap: lời gọi không hợp lệ');
    return { statusCode: 403 };
  }

  let d = {};
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400 }; }
  const chatId = d.chatId;
  const cau = String(d.cau || '').slice(0, 600);
  if (!chatId || !cau) return { statusCode: 400 };

  if (!process.env.GEMINI_API_KEY) {
    await guiDen(chatId, 'Bot chưa được cấu hình AI (thiếu GEMINI_API_KEY trên Netlify).');
    return { statusCode: 200 };
  }

  try {
    const [bangPhi, pages] = await Promise.all([bangPhiTnds(), Promise.resolve(pickPages(cau, []))]);
    const traLoi = await askGemini(promptNoiBo(bangPhi, pages), [], cau);
    const dau = d.nguoi ? d.nguoi + ' ơi, ' : '';
    await guiDen(chatId, dau + traLoi);
  } catch (e) {
    console.error('zalo-hoidap:', e.message);
    await guiDen(chatId, 'Bot chưa trả lời được câu này (lỗi AI). Anh/chị thử lại sau ít phút hoặc tra trực tiếp trên dbv247.com.vn nhé.');
  }
  return { statusCode: 200 };
};
