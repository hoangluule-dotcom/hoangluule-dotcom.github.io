/* DBV247 — Kịch bản khai thác nhu cầu theo nhóm sản phẩm
   ===========================================================================
   MỘT nguồn dùng chung cho hai nơi:
   - chat.js (chatbot web): biết khách đang quan tâm nhóm nào thì hỏi tiếp
     đúng thông tin còn thiếu — mỗi lượt MỘT câu, như tư vấn viên giỏi.
   - phieu-tu-van-background.js: dựng phiếu gọi lại cho sale (đã biết gì,
     còn thiếu gì, khách hay phản đối điều gì và đáp thế nào).

   Sửa kịch bản ở đây là cả chatbot lẫn phiếu cùng đổi theo.

   Ba loại nội dung, phân biệt rõ:
   - hoi     : câu hỏi được phép hỏi KHÁCH trên web (không hỏi CCCD, tài khoản,
               tình trạng bệnh — những thứ đó tư vấn viên hỏi theo tờ khai).
   - noiBo   : lưu ý CHỈ cho sale đọc trong phiếu. KHÔNG bao giờ đưa vào chatbot
               web (vd tư vấn mở rộng cháy nổ chỉ được trao đổi trực tiếp).
   - phanDoi : khách hay nói gì → sale đáp thế nào. Chỉ dùng trong phiếu.
*/

'use strict';

const NHOM = [
  {
    ma: 'boi-thuong',
    ten: 'Khách cần hỗ trợ BỒI THƯỜNG / sự cố',
    url: ['/boi-thuong', '/tin-tuc/thu-tuc-khai-bao-boi-thuong'],
    tuKhoa: ['boi thuong', 'tai nan roi', 'va cham', 'dam xe', 'quet xe', 'bi dam', 'su co', 'giam dinh', 'ho so boi thuong', 'chay roi', 'bi mat cap'],
    hoi: [
      'Sự cố xảy ra khi nào, ở đâu, đã báo hotline 1900 969 690 chưa',
      'Biển số xe hoặc số hợp đồng / giấy chứng nhận bảo hiểm',
      'Thiệt hại sơ bộ (người, xe, tài sản) và hiện trường còn giữ không',
    ],
    noiBo: [
      'Ưu tiên gọi NGAY, không chào bán. Hướng dẫn khách giữ hiện trường, chụp ảnh, báo hotline 1900 969 690 nếu chưa báo.',
      'Không hứa "chắc chắn được bồi thường" — kết luận căn cứ hợp đồng và giám định.',
    ],
    phanDoi: [],
  },
  {
    ma: 'tnds',
    ten: 'TNDS bắt buộc ô tô / xe máy',
    url: ['/bao-hiem-tnds', '/tnds', '/cap-don', '/tin-tuc/muc-phat-khong-co-bao-hiem'],
    tuKhoa: ['tnds', 'bat buoc xe', 'trach nhiem dan su', 'xe may', 'xe tai', 'cho ngoi', 'cho kinh doanh', 'bao hiem bat buoc o to', 'phat khong co bao hiem', '4 cho', '5 cho', '7 cho', '9 cho', '16 cho', 'grab', 'chay app', 'xe khach'],
    /* Từ chung về xe (điểm thấp): chỉ để không rơi về "chưa rõ" khi khách nói "xe" mà chưa nói loại bảo hiểm */
    tuKhoaPhu: ['o to', 'oto', 'xe'],
    hoi: [
      'Loại xe: ô tô hay xe máy; ô tô bao nhiêu chỗ hoặc xe tải bao nhiêu tấn',
      'Xe có kinh doanh vận tải không (taxi, chạy app, xe hợp đồng, chở hàng thuê)',
      'Giấy bảo hiểm cũ hết hạn ngày nào (hay xe mới chưa có)',
      'Muốn mua 1 năm hay nhiều năm',
      'Có muốn thêm bảo hiểm tai nạn người ngồi trên xe không',
    ],
    noiBo: [
      'Tra phí nhanh: tag "@Bot DBV247 phí TNDS ..." trong nhóm Zalo. Phí theo Phụ lục I NĐ 67/2023/NĐ-CP.',
      'Biên ±15% (Điều 8 NĐ 67) chỉ xét theo lịch sử bồi thường/tai nạn từng xe, hai chiều — KHÔNG hứa giảm đại trà.',
      'Hết hạn trong 30 ngày = khách nóng, chốt được ngay trong cuộc gọi.',
      'Gợi ý bán kèm khi phù hợp: tai nạn người ngồi trên xe; xe ô tô giá trị cao → hỏi thêm về bảo hiểm vật chất.',
    ],
    phanDoi: [
      ['Ngoài cây xăng / chỗ khác bán rẻ hơn', 'Phí TNDS do Nhà nước quy định theo NĐ 67/2023, nơi nào bán đúng cũng cùng mức. Luật không cho giảm giá đại trà, nên lời chào "ai mua cũng rẻ" là dấu hiệu cần kiểm tra giấy chứng nhận có tra cứu được không. Bên em cấp giấy chứng nhận hợp lệ và hỗ trợ khi có sự cố.'],
      ['Ít khi bị kiểm tra, mua làm gì', 'Mục đích chính là khi va chạm, bảo hiểm trả phần bồi thường cho bên bị thiệt hại thay mình. Không có giấy còn bị phạt theo NĐ 168/2024 (có bài trên web dbv247.com.vn/tin-tuc/muc-phat-khong-co-bao-hiem-xe-2026).'],
    ],
  },
  {
    ma: 'vat-chat-oto',
    ten: 'Bảo hiểm vật chất (thân vỏ) ô tô',
    url: ['/bao-hiem-vat-chat-oto', '/bao-hiem-oto-dien', '/bao-hiem-doi-xe', '/tin-tuc/bao-hiem-vat-chat', '/tin-tuc/bao-hiem-o-to-dien', '/tin-tuc/kinh-nghiem-su-dung-bao-hiem-xe', '/dinh-gia-xe', '/gia-xe'],
    tuKhoa: ['vat chat', 'than vo', 'than xe', 'thuy kich', 'ngap nuoc', 'tray xuoc', 'gara', 'chinh hang', 'khau tru', 'o to dien', 'vinfast', 'pin', 'doi xe', 'hai chieu'],
    hoi: [
      'Hãng, dòng xe, phiên bản (vd Toyota Vios G, VinFast VF 5)',
      'Năm sản xuất và giá trị xe hiện tại hoặc giá mua',
      'Mục đích sử dụng: gia đình, chạy dịch vụ/app, cho thuê, xe công ty',
      'Đang có bảo hiểm thân vỏ chưa, hãng nào, hết hạn khi nào; đã từng bồi thường chưa',
      'Quan tâm điều gì nhất: sửa gara chính hãng, thủy kích/ngập nước, mất cắp bộ phận, mức khấu trừ',
      'Xe thường đi và sửa ở tỉnh/thành nào',
    ],
    noiBo: [
      'Phí theo biểu phí QĐ 219/2026 (công cụ tính phí trên web, bot cũng tính được): tùy giá trị xe, tuổi xe, mục đích, điều khoản bổ sung. Xe cũ/giá trị thấp có tỷ lệ cao hơn hẳn. PHÍ TỐI THIỂU 6.000.000đ/xe (áp cả sau giảm).',
      'Xe dưới khoảng 333–500 triệu sẽ chạm mức sàn 6 triệu → NÓI TRƯỚC với khách để giữ niềm tin, đừng để khách tự phát hiện lúc nhận báo phí.',
      'Xe kinh doanh vận tải tỷ lệ cao hơn xe gia đình. Xe điện: pin nằm trong phạm vi bảo hiểm gốc.',
      'Báo phí chính xác cần ảnh đăng ký/đăng kiểm và có thể cần giám định xe — hẹn khách gửi qua Zalo 0869 656 561.',
    ],
    phanDoi: [
      ['Bên khác báo rẻ hơn', 'Đừng hạ giá ngay. Hỏi khách gửi báo giá bên kia để so CÙNG điều kiện: số tiền bảo hiểm, mức khấu trừ, điều khoản bổ sung (thủy kích, chính hãng, mất cắp bộ phận). Rẻ hơn thường do thiếu điều khoản hoặc khấu trừ cao.'],
      ['Xe cũ rồi, có cần mua không', 'Hỏi lại: nếu xe hỏng nặng hôm nay, anh/chị có sẵn tiền sửa không? Xe cũ chi phí sửa không rẻ hơn xe mới. Nêu rõ mức phí thực tế (kể cả mức tối thiểu) để khách tự cân nhắc.'],
      ['Phí cao quá', 'Giải thích các yếu tố tạo phí và lựa chọn giảm phí hợp lệ: tăng mức khấu trừ, bỏ bớt điều khoản không cần. Không hứa giảm ngoài biểu phí.'],
    ],
  },
  {
    ma: 'tai-san',
    ten: 'Cháy nổ bắt buộc / Mọi rủi ro tài sản',
    url: ['/bao-hiem-chay-no', '/bao-hiem-hoa-hoan', '/bao-hiem-moi-rui-ro', '/tin-tuc/bao-hiem-chay-no'],
    tuKhoa: ['chay no', 'hoa hoan', 'pccc', 'phong chay', 'nha xuong', 'kho hang', 'chung cu', 'can ho', 'ho kinh doanh', 'toa nha', 'moi rui ro tai san', 'bao hiem tai san', 'bao hiem nha'],
    hoi: [
      'Loại cơ sở: căn hộ chung cư, hộ kinh doanh, kho, nhà xưởng, tòa nhà, văn phòng',
      'Ngành nghề / hàng hóa lưu trữ ở đó',
      'Tỉnh/thành, địa chỉ cơ sở (mức quận/huyện là đủ)',
      'Giá trị tài sản muốn bảo hiểm: nhà/công trình, máy móc, hàng tồn kho',
      'Cần có giấy bảo hiểm khi nào; do cơ quan PCCC/ngân hàng/đối tác yêu cầu hay tự mua',
      'Đã có hợp đồng cũ chưa, hết hạn khi nào',
    ],
    noiBo: [
      'Cháy nổ bắt buộc: KHÔNG tặng, KHÔNG khuyến mại dưới mọi hình thức.',
      'Phí dự trù cháy nổ bắt buộc trên khoảng 20 triệu → cân nhắc tư vấn Mọi rủi ro tài sản mở rộng cháy nổ bắt buộc để tăng quyền lợi. CHỈ trao đổi trực tiếp với khách — không ghi lên web, quảng cáo, tin nhắn hàng loạt.',
      'Cần danh mục tài sản + giá trị để báo phí; cơ sở lớn có thể cần khảo sát.',
    ],
    phanDoi: [
      ['Mua cho có thôi, chọn gói rẻ nhất', 'Giá trị khai thấp hơn thực tế thì khi cháy chỉ được bồi thường theo tỷ lệ — khai đúng giá trị mới đủ bảo vệ. Giải thích nhẹ nhàng, để khách tự quyết.'],
      ['Có bảo hiểm của chủ nhà / ban quản lý rồi', 'Hỏi rõ đơn đó bảo hiểm cho phần nào: thường chỉ phần kết cấu chung, KHÔNG gồm tài sản, hàng hóa, nội thất của khách.'],
    ],
  },
  {
    ma: 'hang-hoa',
    ten: 'Bảo hiểm hàng hóa (XNK / vận chuyển nội địa / bưu gửi)',
    url: ['/bao-hiem-xnk', '/bao-hiem-van-chuyen', '/bao-hiem-buu-gui', '/bao-hiem-hang-hoa'],
    tuKhoa: ['hang hoa', 'xuat nhap khau', 'xnk', 'van chuyen', 'container', 'cif', 'fob', 'buu gui', 'chuyen phat', 'lo hang', 'van don'],
    hoi: [
      'Loại hàng hóa',
      'Tuyến: từ đâu đến đâu; nội địa hay xuất nhập khẩu',
      'Phương tiện: đường bộ, đường biển, hàng không, đường sắt',
      'Giá trị lô hàng (hoặc tổng giá trị vận chuyển dự kiến/năm nếu đi thường xuyên)',
      'Mua theo từng chuyến hay hợp đồng bao cả năm',
      'Với XNK: điều kiện giao hàng (CIF, FOB, EXW...) và ngày tàu/xe chạy',
    ],
    noiBo: [
      'Hỏi được tần suất vận chuyển → khách đi thường xuyên thì đề xuất hợp đồng bao, giữ khách cả năm.',
      'Lô sắp chạy trong vài ngày = khách nóng; phải cấp trước khi hàng khởi hành.',
    ],
    phanDoi: [
      ['Bên vận chuyển đã chịu trách nhiệm rồi', 'Trách nhiệm của nhà vận chuyển thường bị giới hạn và có nhiều trường hợp miễn trừ; bảo hiểm hàng hóa bồi thường theo giá trị hàng của chủ hàng.'],
    ],
  },
  {
    ma: 'cong-trinh',
    ten: 'Bảo hiểm xây dựng / lắp đặt',
    url: ['/bao-hiem-xay-dung', '/bao-hiem-lap-dat'],
    tuKhoa: ['xay dung', 'lap dat', 'cong trinh', 'goi thau', 'nha thau', 'chu dau tu', 'thi cong'],
    hoi: [
      'Loại công trình và địa điểm',
      'Tổng giá trị hợp đồng / gói thầu',
      'Tỷ trọng phần xây dựng và phần lắp đặt thiết bị',
      'Thời gian thi công dự kiến (bắt đầu – kết thúc)',
      'Khách là chủ đầu tư hay nhà thầu; bảo hiểm do hợp đồng/ngân hàng yêu cầu không',
    ],
    noiBo: [
      'Hạng mục nào chiếm trên 50% giá trị gói thầu thì hợp đồng theo hạng mục đó. DBV có bán riêng Mọi rủi ro lắp đặt (biểu phí, quy tắc riêng).',
      'Giá trị vượt hạn mức phân cấp chi nhánh 1.500 tỷ → phải trình Công ty duyệt phí.',
      'Cần hồ sơ: hợp đồng thi công, dự toán, tiến độ.',
    ],
    phanDoi: [],
  },
  {
    ma: 'con-nguoi',
    ten: 'Sức khỏe / Tai nạn con người',
    url: ['/bao-hiem-suc-khoe', '/bao-hiem-tai-nan', '/bao-hiem-cham-soc-suc-khoe', '/bao-hiem-benh-nhiet-doi'],
    tuKhoa: ['suc khoe', 'vien phi', 'noi tru', 'ngoai tru', 'bao lanh vien phi', 'tai nan', 'thai san', 'dbvcare', 'sot xuat huyet', 'nhiet doi', 'bao hiem nhan vien'],
    hoi: [
      'Bảo vệ cho ai: bản thân, gia đình hay nhân viên công ty',
      'Số người và độ tuổi từng người (khoảng tuổi là đủ)',
      'Muốn ưu tiên quyền lợi nào: nội trú, ngoại trú, tai nạn, thai sản',
      'Ngân sách dự kiến mỗi năm',
      'Hay khám ở bệnh viện nào (để kiểm tra bảo lãnh viện phí)',
    ],
    noiBo: [
      'KHÔNG hỏi tình trạng bệnh qua chat; khi gọi, hỏi theo tờ khai sức khỏe và giải thích thời gian chờ, điểm loại trừ trung thực.',
      'Nhóm công ty / nhiều nhân viên → khách giá trị cao, đề xuất hẹn gặp.',
    ],
    phanDoi: [
      ['Đã có bảo hiểm y tế nhà nước rồi', 'BHYT chi trả theo danh mục và tuyến; bảo hiểm sức khỏe bù phần chênh, phòng dịch vụ và bảo lãnh viện phí ở bệnh viện tư.'],
      ['Mua rồi không dùng thì phí', 'Giống TNDS xe — mong không phải dùng; nêu khoản viện phí trung bình một lần nằm viện để khách tự so.'],
    ],
  },
  {
    ma: 'du-lich',
    ten: 'Bảo hiểm du lịch',
    url: ['/bao-hiem-du-lich', '/tin-tuc/bao-hiem-du-lich'],
    tuKhoa: ['du lich', 'visa', 'schengen', 'nuoc ngoai', 'cong tac', 'du hoc', 'chuyen bay'],
    hoi: [
      'Đi trong nước hay nước ngoài; điểm đến',
      'Ngày đi và ngày về',
      'Số người và độ tuổi',
      'Mục đích: du lịch, công tác, thăm thân, du học; có cần nộp hồ sơ xin visa (Schengen) không, hạn nộp khi nào',
    ],
    noiBo: [
      'Xin visa Schengen cần mức 30.000 EUR — hạn nộp hồ sơ gần = khách nóng, cấp ngay trong ngày.',
    ],
    phanDoi: [],
  },
  {
    ma: 'trach-nhiem',
    ten: 'Bảo hiểm trách nhiệm (công cộng / nghề nghiệp)',
    url: ['/bao-hiem-tn', '/bao-hiem-doanh-nghiep'],
    tuKhoa: ['trach nhiem cong cong', 'trach nhiem nghe nghiep', 'luat su', 'cong chung', 'kham chua benh', 'phong kham', 'tu van thiet ke', 'giam sat', 'doanh nghiep han quoc'],
    hoi: [
      'Ngành nghề / loại hình hoạt động',
      'Quy mô: doanh thu năm, số nhân sự hoặc số giường/phòng khám',
      'Hạn mức trách nhiệm mong muốn',
      'Bảo hiểm do pháp luật, hợp đồng hay đối tác yêu cầu không; cần có khi nào',
      'Đã có hợp đồng cũ chưa, đã từng có khiếu nại chưa',
    ],
    noiBo: [
      'Thường cần giấy đề nghị/bảng câu hỏi riêng theo nghề — gửi mẫu cho khách sau cuộc gọi.',
    ],
    phanDoi: [],
  },
  {
    ma: 'tau',
    ten: 'Bảo hiểm thân tàu thủy nội địa',
    url: ['/bao-hiem-than-tau'],
    tuKhoa: ['tau', 'than tau', 'sa lan', 'ghe', 'tau ca', 'tau thuy'],
    hoi: [
      'Loại tàu, vật liệu vỏ, năm đóng',
      'Trọng tải / công suất máy',
      'Vùng hoạt động',
      'Giá trị tàu',
    ],
    noiBo: ['Cần giấy chứng nhận đăng ký, đăng kiểm tàu để báo phí.'],
    phanDoi: [],
  },
];

const CHUNG = {
  ma: 'chung',
  ten: 'Chưa rõ sản phẩm',
  url: [],
  tuKhoa: [],
  hoi: [
    'Anh/chị cần bảo hiểm cho gì: xe, nhà/tài sản, hàng hóa, công trình, con người hay chuyến đi',
    'Mua cho cá nhân/gia đình hay cho doanh nghiệp',
    'Cần có bảo hiểm khi nào',
  ],
  noiBo: ['Khách chưa rõ nhu cầu — cuộc gọi đầu tiên mục tiêu là xác định sản phẩm, chưa cần chốt.'],
  phanDoi: [],
};

function boDau(s) {
  return String(s || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

/* Nhận diện nhóm sản phẩm. Trang khách đang xem là tín hiệu mạnh, nhưng câu
   khách gõ thắng nếu nói rõ sản phẩm khác (đang ở trang TNDS mà hỏi "thân vỏ"). */
function nhanDien(text, page) {
  const t = ' ' + boDau(text).replace(/[^a-z0-9]+/g, ' ') + ' ';
  const p = String(page || '').toLowerCase();
  let tot = null, diemTot = 0;
  NHOM.forEach((n) => {
    let d = 0;
    if (p && n.url.some((u) => p.startsWith(u))) d += 1.5;  // trang đang xem: thắng từ chung "xe", thua từ khoá rõ ràng
    n.tuKhoa.forEach((k) => { if (t.includes(' ' + k)) d += 3; });
    (n.tuKhoaPhu || []).forEach((k) => { if (t.includes(' ' + k + ' ')) d += 1; });
    if (d > diemTot) { diemTot = d; tot = n; }
  });
  return tot || CHUNG;
}

module.exports = { NHOM, CHUNG, nhanDien, boDau };
