/**
 * DBV247 — Affiliate TNDS · CẤU HÌNH
 * ===========================================================================
 * Mọi thứ có thể phải đổi đều nằm ở tệp này. Sửa chỗ khác là sai chỗ.
 *
 * KIẾN TRÚC (theo đặc tả, mục 2 và 17):
 *
 *   Trình duyệt  →  Hàm Netlify  →  Apps Script  →  Google Sheets
 *
 * Vì sao có Hàm Netlify ở giữa chứ không gọi thẳng Apps Script từ trang web —
 * đặc tả mục 17 cho phép "serverless proxy", và ở đây nó giải quyết ba việc
 * cùng lúc:
 *   1. Đặc tả mục 23 cấm để secret trong mã frontend. Nếu trang web gọi thẳng
 *      Apps Script thì Web App phải mở cho "Anyone", và URL đó thành một cửa
 *      ai cũng POST vào được.
 *   2. Đặc tả mục 13 đòi CTV_ID của phiên phải được xác định phía máy chủ.
 *      Cổng đăng nhập cộng tác viên đã chạy sẵn trên Netlify (số điện thoại +
 *      mật khẩu, token ký HMAC, khoá sau 10 lần sai) và đã có 51 phép thử.
 *      Viết lại phần đó trong Apps Script là đi lùi.
 *   3. Không còn vấn đề CORS.
 *
 * Apps Script vì vậy KHÔNG BAO GIỜ nhận request không mang khoá nội bộ.
 */

var CH = {

  /* ── Tên các sheet ─────────────────────────────────────────────────────
     Đổi tên sheet trong bảng tính thì đổi ở đây, đừng sửa rải rác trong mã. */
  SHEET: {
    CTV      : 'CTV',
    ORDERS   : 'ORDERS',
    QUY_TAC  : 'COMMISSION_RULES',
    PAYOUTS  : 'PAYOUTS',
    NHAT_KY  : 'NHAT_KY'
  },

  /* ── Trạng thái đơn (đặc tả mục 11) ────────────────────────────────── */
  TT_TT: {          // Payment_Status
    CHO   : 'PAYMENT_PENDING',
    DA_TRA: 'PAID',
    HUY   : 'CANCELLED',
    HOAN  : 'REFUNDED'
  },
  TT_GCN: {         // GCN_Status
    CHUA: '',
    DA  : 'ISSUED'
  },
  TT_HH: {          // Commission_Status
    CHUA  : '',
    DU    : 'COMMISSION_APPROVED',
    DA_TRA: 'COMMISSION_PAID',
    THU_HOI:'COMMISSION_CLAWBACK'
  },

  /**
   * MỐC SINH HOA HỒNG.
   * Đặc tả mục 11 nói rõ: "Không mặc định rằng tạo đơn hoặc thanh toán là đủ
   * điều kiện nhận hoa hồng." Nên mốc này là một lựa chọn kinh doanh, đặt ở
   * đây để đổi được mà không sửa logic.
   *
   * 'PAID'   — sinh hoa hồng ngay khi nhân viên xác nhận tiền về.
   * 'ISSUED' — chỉ sinh sau khi đã cấp giấy chứng nhận. An toàn hơn: đơn cấp
   *            hỏng hoặc khách đổi ý trước khi cấp thì chưa nợ ai đồng nào.
   *
   * Đang để 'PAID' theo quyết định 15/09/2026 (hoa hồng tính khi khách đã
   * chuyển tiền). Đổi sang 'ISSUED' chỉ cần sửa dòng này.
   */
  MOC_SINH_HOA_HONG: 'PAID',

  /* ── Cột của sheet ORDERS ──────────────────────────────────────────────
     Thứ tự phải KHỚP với hàng tiêu đề do KhoiTao.gs tạo ra. Mã đọc/ghi theo
     tên cột chứ không theo chỉ số, nên chèn thêm cột ở giữa không làm hỏng —
     nhưng vẫn phải khai ở đây. */
  COT_ORDERS: [
    'Order_ID', 'CTV_ID', 'Ngày tạo', 'Khách hàng', 'SĐT', 'Email', 'Biển số',
    'Sản phẩm', 'Nhóm xe', 'Phí gốc', 'VAT', 'Phí',
    'Payment_Status', 'Bank_Ref', 'Ngày nhận tiền',
    'GCN_Status', 'Commission', 'Commission_Rate', 'Commission_Status',
    'Payout_ID', 'Nguồn ghi nhận', 'Ghi chú'
  ],

  COT_CTV: ['CTV_ID','Họ tên','SĐT','Email','Trạng thái','Ngân hàng',
            'Số tài khoản','Chủ tài khoản','Ngày tạo'],

  /* Quy tắc hoa hồng — KHÔNG phải một số tiền cố định.
     Đặc tả mục 9.3 ví dụ bằng số tiền (40.000/45.000), nhưng chính sách đã
     chốt là TỶ LỆ PHẦN TRĂM (40% trên phí gốc). Bảng này đỡ được cả hai kiểu:
     Loại = 'percent' hoặc 'fixed'. Và có cột Hiệu lực từ, để đổi mức sau này
     không viết lại lịch sử của đơn cũ. */
  COT_QUY_TAC: ['Nhóm xe','Loại','Giá trị','Căn cứ','Hiệu lực từ','Ghi chú'],

  COT_PAYOUTS: ['Payout_ID','CTV_ID','Kỳ thanh toán','Số tiền',
                'Ngày thanh toán','Ghi chú'],

  COT_NHAT_KY: ['Thời điểm','Hành động','Order_ID','CTV_ID','Người thực hiện',
                'Trước','Sau','Ghi chú'],

  /* ── Những cột NHÂN VIÊN được phép sửa tay trong bảng tính ──────────────
     Mọi cột khác sẽ bị khoá bằng Protected Range khi chạy taoBangTinh().
     Lý do: tiền không được sửa bằng tay. Một lần kéo nhầm chuột trong Sheets
     có thể đè 50 dòng mà không để lại dấu vết nào. */
  COT_NHAN_VIEN_SUA: ['Payment_Status', 'Bank_Ref', 'GCN_Status', 'Ghi chú'],

  /* ── Khoá nội bộ ───────────────────────────────────────────────────────
     Đặt bằng: Apps Script → Project Settings → Script Properties
       KHOA_NOI_BO = một chuỗi ngẫu nhiên dài ≥ 32 ký tự
     Chuỗi này CHỈ nằm ở hai nơi: Script Properties của Apps Script, và biến
     môi trường của Netlify. Không bao giờ trong HTML hay JS gửi xuống trình
     duyệt. */
  TEN_THUOC_TINH_KHOA: 'KHOA_NOI_BO',

  /* Múi giờ để sinh mã đơn và ghi ngày — Apps Script mặc định theo project,
     ghim ở đây cho chắc. */
  MUI_GIO: 'Asia/Ho_Chi_Minh',

  /* Bao nhiêu giây thì Dashboard tự tải lại (đặc tả mục 14) */
  GIAY_TU_TAI_LAI: 60
};
