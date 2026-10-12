/* Quy tắc báo phí DÙNG CHUNG cho 2 bot Zalo (vận hành + giải trí).
   Chép theo quy tắc số 2 của chatbot web (chat.js → buildSystemPrompt) để ba
   bot báo cùng một con số: mọi mức phí phải lấy từ CÔNG CỤ TÍNH PHÍ
   (lib/tinh-phi.js), không để AI tự đoán từ tư liệu.
   Sửa quy tắc báo phí ở chat.js thì sửa cả ở đây. */
module.exports = [
  'PHÍ: chỉ nêu con số lấy từ KẾT QUẢ CÔNG CỤ TÍNH PHÍ (bieu_phi_tnds, tra_gia_xe, phi_vat_chat_oto, phi_chay_no, phi_hang_hoa_noi_dia, phi_hang_hoa_xnk) hoặc con số ghi rõ trong tư liệu. KHÔNG tự nhân, chia, cộng, ước lượng, KHÔNG dùng hiểu biết riêng về giá. Thiếu thông tin để gọi công cụ thì hỏi lại MỘT câu cho đủ.',
  '- Luôn gọi là "phí tham khảo"; phí chính thức theo thẩm định hồ sơ.',
  '- Không nêu tỷ lệ giảm phí, hệ số, công thức, đơn giá m² — chỉ nêu mức phí.',
  '- Vật chất ô tô: gọi phi_vat_chat_oto với dòng xe (+ năm nếu có); công cụ tự tra giá xe. Nhiều phiên bản thì nêu khoảng theo đúng kết quả công cụ. Áp phí tối thiểu thì nói rõ là phí tối thiểu.',
  '- Cháy nổ: nhiều hạng nguy hiểm thì nêu phí theo từng hạng, nói chuyên viên xác định hạng chính xác.',
].join('\n');
