/* DBV247 — Cổng cho hai màn hình quản trị
   ===========================================================================
   GET  /.netlify/functions/gas-admin?view=don    → đơn hàng ĐẦY ĐỦ (có dữ liệu
                                                    cá nhân của khách)
   GET  /.netlify/functions/gas-admin?view=ctv    → hồ sơ CTV + tiền, KHÔNG có
                                                    dữ liệu cá nhân của khách
   POST /.netlify/functions/gas-admin             → cập nhật đơn, ghi về sheet
        { action:'trangThai'|'hoSo', orderId, ... }

   Header bắt buộc: x-dashboard-key: <DASHBOARD_KEY>

   VÌ SAO PHẢI CÓ HÀM NÀY, KHÔNG GỌI THẲNG APPS SCRIPT TỪ TRANG QUẢN TRỊ
   Khoá nội bộ của Apps Script (GAS_KHOA_NOI_BO) chỉ được nằm ở biến môi trường
   máy chủ. Trang quản trị chạy trong trình duyệt; nhúng khoá đó vào là ai mở
   DevTools cũng đọc được, và khoá đó mở được TOÀN BỘ sổ cái.
   Hàm này giữ khoá ở phía máy chủ và chỉ nhận DASHBOARD_KEY của nhân viên.

   MỘT KHOÁ DÙNG CHUNG LÀ ĐIỂM YẾU ĐÃ BIẾT
   DASHBOARD_KEY dùng chung cho cả nhóm, nên cột "Người thực hiện" trong NHAT_KY
   chỉ ghi được cái tên mà trang gửi lên, không xác thực được ai thật sự bấm.
   Đủ để lần vết khi mọi người trung thực, KHÔNG đủ để quy trách nhiệm. Muốn
   chặt hơn thì phải cho mỗi nhân viên một tài khoản riêng — việc đó chưa làm.
*/

'use strict';

const G = require('./lib/gas');

function kiemKhoa(event) {
  const h = event.headers || {};
  const daGui = h['x-dashboard-key'] || h['X-Dashboard-Key'] || '';
  const mong = process.env.DASHBOARD_KEY || '';
  if (!mong) return 'Thiếu biến môi trường DASHBOARD_KEY trên Netlify.';
  /* So sánh thường, không hằng thời gian: khoá này nằm sau đăng nhập nội bộ và
     không phải bí mật cấp mật khẩu. Ghi ra đây để người sau biết là đã cân
     nhắc chứ không phải bỏ sót. */
  if (daGui !== mong) return 'Sai hoặc thiếu khoá truy cập.';
  return null;
}

function docThan(event) {
  const kieu = (event.headers['content-type'] || event.headers['Content-Type'] || '');
  const tho = event.body || '';
  if (kieu.indexOf('application/json') >= 0) {
    try { return JSON.parse(tho); } catch (e) { return null; }
  }
  return Object.fromEntries(new URLSearchParams(tho));
}

exports.handler = async function (event) {
  const loiKhoa = kiemKhoa(event);
  if (loiKhoa) return G.json(401, { error: loiKhoa });

  try {
    if (event.httpMethod === 'GET') return await xem(event);
    if (event.httpMethod === 'POST') return await ghi(event);
    return G.json(405, { error: 'Method không được hỗ trợ.' });
  } catch (err) {
    /* Ghi log đầy đủ ở máy chủ, KHÔNG trả chi tiết hệ thống về trình duyệt. */
    console.error('[gas-admin] ' + (err.message || err));
    return G.json(502, { error: 'Không đọc được dữ liệu từ hệ thống sổ sách.' });
  }
};

async function xem(event) {
  const view = ((event.queryStringParameters || {}).view || 'don').trim();

  if (view === 'ctv') {
    const kq = await G.goiGet('adminCtv', {});
    if (!kq || !kq.ok) return G.json(502, { error: (kq && kq.error) || 'Không đọc được.' });
    return G.json(200, {
      ok: true, ctv: kq.ctv || [], don_theo_ctv: kq.don_theo_ctv || {},
      cap_nhat: kq.cap_nhat || null,
    });
  }

  if (view === 'don') {
    const kq = await G.goiGet('adminDon', {});
    if (!kq || !kq.ok) return G.json(502, { error: (kq && kq.error) || 'Không đọc được.' });
    return G.json(200, {
      ok: true, don: kq.don || [], cot: kq.cot || [], cap_nhat: kq.cap_nhat || null,
    });
  }

  return G.json(400, { error: 'view phải là "don" hoặc "ctv".' });
}

async function ghi(event) {
  const p = docThan(event);
  if (!p) return G.json(400, { error: 'Nội dung gửi lên không đọc được.' });

  const ma = String(p.orderId || '').trim();
  if (!ma) return G.json(400, { error: 'Thiếu mã đơn.' });
  const nguoi = String(p.nguoi || '').trim() || 'quan-tri';

  /* HAI ĐƯỜNG GHI KHÁC NHAU, KHÔNG GỘP.
     'trangThai' đụng tới TIỀN: đánh dấu đã nhận tiền là mốc sinh hoa hồng, nên
     nó đi qua capNhatTrangThai() với các chốt chặn còn lại (không trả hoa hồng
     hai lần cho một đơn; nếu có điền Bank_Ref thì mã đó phải chưa dùng cho đơn
     khác — từ 19/09/2026 Bank_Ref không còn bắt buộc).
     'hoSo' chỉ sửa thông tin hành chính của đơn, đi qua capNhatDon() với danh
     sách cột được phép. */
  if (p.action === 'trangThai') {
    const kq = await G.goiPost('updateOrderStatus', {
      orderId: ma, nguoi,
      paymentStatus: p.paymentStatus || '',
      bankRef: p.bankRef || '',
      gcnStatus: p.gcnStatus || '',
      ghiChu: p.ghiChu == null ? undefined : String(p.ghiChu),
    });
    if (!kq || !kq.ok) {
      return G.json(400, { error: (kq && kq.error) || 'Không cập nhật được.' });
    }
    return G.json(200, { ok: true, orderId: ma, hoa_hong: kq.hoa_hong || null });
  }

  if (p.action === 'hoSo') {
    const truong = p.truong && typeof p.truong === 'object' ? p.truong : null;
    if (!truong) return G.json(400, { error: 'Thiếu danh sách trường cần sửa.' });
    const kq = await G.goiPost('capNhatDon', {
      orderId: ma, nguoi, truong: JSON.stringify(truong),
    });
    if (!kq || !kq.ok) {
      return G.json(400, { error: (kq && kq.error) || 'Không cập nhật được.' });
    }
    return G.json(200, {
      ok: true, orderId: ma, da_doi: kq.da_doi || [], tu_choi: kq.tu_choi || [],
    });
  }

  return G.json(400, { error: 'action phải là "trangThai" hoặc "hoSo".' });
}
