/* DBV247 — Dữ liệu bảng điều khiển cộng tác viên (đọc từ Google Sheets)
   ===========================================================================
   GET /.netlify/functions/gas-ctv?viec=dashboard|orders|commissions
       Authorization: Bearer <token đăng nhập>

   ĐÂY LÀ CHỖ ĐẶC TẢ MỤC 13 ĐƯỢC BẢO ĐẢM.

   Mã cộng tác viên KHÔNG lấy từ tham số URL và KHÔNG lấy từ bất cứ thứ gì
   trình duyệt gửi lên. Nó được giải ra từ token đăng nhập đã ký HMAC, rồi tra
   ngược hồ sơ trong kho. Nghĩa là CTV001 đổi URL thành CTV002 không xem được
   gì của CTV002 — không phải vì mã kiểm tra khéo, mà vì trình duyệt không hề
   có chỗ nào để nói mình là ai.

   Apps Script chỉ tin hàm này, và chỉ vì nó mang khoá nội bộ.
*/

'use strict';

const K = require('./lib/ctv-kho');
const G = require('./lib/gas');

const VIEC_HOP_LE = { dashboard: 1, orders: 1, commissions: 1 };

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') return G.json(405, { error: 'Chỉ nhận GET.' });

  /* ── Xác thực ─────────────────────────────────────────────────────────
     401 CHỈ dành cho lỗi token. Mọi lỗi khác phải dùng mã khác, vì bảng điều
     khiển tự đăng xuất khi gặp 401 — trả nhầm 401 là đá người dùng ra ngoài
     giữa chừng mà họ không hiểu vì sao. */
  let phien, kho;
  try {
    phien = K.giaiToken(K.layToken(event));
    kho = K.moKho();
  } catch (err) {
    return G.json(500, { error: String(err.message || err) });
  }
  if (!phien) {
    return G.json(401, { error: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại giúp mình.' });
  }

  let ban;
  try {
    ban = await K.docCtv(kho, phien.sdt);
  } catch (err) {
    return G.json(500, { error: 'Lỗi đọc hồ sơ: ' + String(err.message || err) });
  }
  if (!ban) return G.json(401, { error: 'Không tìm thấy tài khoản.' });
  if (ban.trang_thai !== 'hoat_dong') {
    return G.json(403, { error: 'Tài khoản đang tạm khoá. Liên hệ 0869 656 561.' });
  }

  const viec = (event.queryStringParameters || {}).viec || 'dashboard';
  if (!VIEC_HOP_LE[viec]) return G.json(400, { error: 'Việc không hợp lệ: ' + viec });

  /* ── Hỏi Apps Script ──────────────────────────────────────────────────── */
  let kq;
  try {
    kq = await G.goiGet(viec, { ma_ctv: ban.ma_ctv });
  } catch (err) {
    console.error('[gas-ctv] ' + (err.message || err));
    /* Hồ sơ và mã giới thiệu vẫn đọc được từ kho, nên trả về phần đó kèm cảnh
       báo, thay vì một trang lỗi trắng. Cộng tác viên thấy toàn số 0 mà không
       có lời giải thích là cách nhanh nhất để họ nghĩ mình bị mất đơn. */
    return G.json(200, {
      ok: true,
      ctv: K.hoSoCongKhai(ban),
      canh_bao: 'Chưa đọc được danh sách đơn từ hệ thống. Đây là lỗi phía hệ ' +
                'thống, không phải bạn chưa có đơn.',
      thong_ke: null,
      don_hang: [],
    });
  }

  if (!kq || !kq.ok) {
    return G.json(502, { error: (kq && kq.error) || 'Apps Script không trả lời đúng.' });
  }

  /* Lượt bấm link vẫn đếm ở Netlify Blobs — hàm /r/<MÃ> ghi vào đó, không đi
     qua Sheets. Hỏng phần này thì trả 0 chứ không làm hỏng cả trang. */
  let luot = 0;
  try { luot = await K.demLuotBam(kho, ban.ma_ctv, 90); } catch (err) { luot = 0; }

  const q = kq.tong_quan || {};
  const don = (kq.don || []).map(doiTenTruong);

  /* Ghép hồ sơ (từ kho) với số liệu (từ Sheets). hoSoCongKhai() đã cắt sẵn
     mật khẩu băm và muối — không bao giờ gửi hai thứ đó ra ngoài. */
  return G.json(200, {
    ok: true,
    ctv: K.hoSoCongKhai(ban),
    thong_ke: {
      luot_bam_link     : luot,
      don_cho_thanh_toan: Math.max((q.so_don || 0) - (q.so_don_da_tra || 0), 0),
      don_da_doi_soat   : q.so_don_da_tra || 0,
      doanh_thu_ghi_nhan: q.doanh_thu || 0,
      doanh_thu_phi_goc : q.doanh_thu_phi_goc || 0,
      doanh_thu_vat     : q.doanh_thu_vat || 0,
      hoa_hong_kha_dung : q.hoa_hong_cho_duyet || 0,
      hoa_hong_da_rut   : q.hoa_hong_da_tra || 0,
      hoa_hong_phat_sinh: q.hoa_hong_phat_sinh || 0,
    },
    don_hang: don,
    cap_nhat: kq.cap_nhat || null,
    ghi_nhan_dang_bat: true,
    hoa_hong_dang_bat: true,
  });
};

/* Tên trường trong sheet ORDERS khác tên bảng điều khiển đang dùng từ trước.
   Quy đổi ở máy chủ chứ không sửa rải rác trong HTML: đổi cấu trúc sheet sau
   này thì chỉ sửa đúng hàm này. */
function doiTenTruong(d) {
  return {
    ma_don        : d.order_id,
    thoi_diem     : d.ngay_tao,
    bien_so       : d.bien_so,
    loai_xe       : d.nhom_xe === 'moto' ? 'Xe máy / mô tô' : 'Ô tô',
    chi_tiet_xe   : d.chi_tiet_xe || d.san_pham,
    thoi_han      : d.thoi_han || '',
    /* Ba con số tiền tách bạch. Hoa hồng 40% tính trên PHÍ GỐC, nên cộng tác
       viên phải thấy phí gốc để tự nhân ra và đối chiếu — chỉ đưa tổng phí là
       họ nhân 40% vào đó rồi thắc mắc vì sao thiếu tiền. */
    phi_goc       : Number(d.phi_goc) || 0,
    vat           : Number(d.vat) || 0,
    tong_phi      : Number(d.tong_phi) || 0,
    hoa_hong      : Number(d.commission) || 0,
    ty_le_hh      : Number(d.commission_rate) || 0,
    trang_thai    : d.payment_status,
    trang_thai_gcn: d.gcn_status,
    trang_thai_hh : d.commission_status,
    nguon_ghi_nhan: d.nguon_ghi_nhan,
  };
}
