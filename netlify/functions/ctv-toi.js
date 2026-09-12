/* DBV247 — Hồ sơ và bảng điều khiển của cộng tác viên đang đăng nhập
   ---------------------------------------------------------------------------
   GET  /.netlify/functions/ctv-toi        (Authorization: Bearer <token>)
        → { ok:true, ctv:{...}, thong_ke:{...}, don_hang:[], ghi_nhan_dang_bat:false }

   POST /.netlify/functions/ctv-toi        (Authorization: Bearer <token>)
        { ho_ten?, email?, ngan_hang?, so_tai_khoan?, chu_tai_khoan?, mat_khau_moi?, mat_khau_cu? }
        → { ok:true, ctv:{...} }

   Mọi nhánh trong hàm này đều đã qua token. Hàm không cần token nằm ở
   ctv-auth.js — giữ tách biệt, đừng gộp lại.

   THỐNG KÊ Ở BƯỚC 1 LUÔN BẰNG 0 và điều đó là cố ý: chưa có luồng ghi nhận
   đơn. Trả số 0 kèm cờ ghi_nhan_dang_bat=false để giao diện nói thẳng với CTV
   rằng phần này chưa bật, thay vì hiện số 0 trần khiến họ tưởng đã mất đơn.
   Niềm tin của CTV vỡ ở đúng chỗ này: họ thấy 0 mà không hiểu vì sao.
*/

'use strict';

const K = require('./lib/ctv-kho');

const NGAN_HANG_TOI_DA = 60;
const SO_TK_TOI_DA = 30;
const MAT_KHAU_TOI_THIEU = 6;

exports.handler = async function (event) {
  let kho, phien;
  try {
    phien = K.giaiToken(K.layToken(event));
    kho = K.moKho();
  } catch (err) {
    return K.json(500, { error: String(err.message || err) });
  }

  if (!phien) {
    return K.json(401, { error: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại giúp mình.' });
  }

  let ban;
  try {
    ban = await K.docCtv(kho, phien.sdt);
  } catch (err) {
    return K.json(500, { error: 'Lỗi đọc dữ liệu: ' + String(err.message || err) });
  }
  if (!ban) return K.json(401, { error: 'Không tìm thấy tài khoản.' });
  if (ban.trang_thai !== 'hoat_dong') {
    return K.json(403, { error: 'Tài khoản đang tạm khoá. Liên hệ 0869 656 561.' });
  }

  try {
    if (event.httpMethod === 'GET') return xem(ban);
    if (event.httpMethod === 'POST') return await capNhat(kho, ban, event);
  } catch (err) {
    return K.json(500, { error: 'Lỗi hệ thống: ' + String(err.message || err) });
  }

  return K.json(405, { error: 'Method không được hỗ trợ.' });
};

/* ── Xem bảng điều khiển ─────────────────────────────────────────────────── */
function xem(ban) {
  return K.json(200, {
    ok: true,
    ctv: K.hoSoCongKhai(ban),
    /* Tên các chỉ số đặt sẵn theo đúng vòng đời đã chốt:
       Đã tạo đơn → Chờ tiền về → Đã đối soát → Hoa hồng chờ 7 ngày → Khả dụng.
       Khi bật ghi nhận đơn thì chỉ việc thay 0 bằng số thật, giao diện không đổi. */
    thong_ke: {
      luot_bam_link: 0,
      don_cho_thanh_toan: 0,
      don_da_doi_soat: 0,
      hoa_hong_cho: 0,
      hoa_hong_kha_dung: 0,
      hoa_hong_da_rut: 0,
    },
    don_hang: [],
    ghi_nhan_dang_bat: false,
  });
}

/* ── Cập nhật hồ sơ ──────────────────────────────────────────────────────── */
async function capNhat(kho, ban, event) {
  const than = K.docThan(event);
  if (!than) return K.json(400, { error: 'Nội dung gửi lên không phải JSON hợp lệ.' });

  let coDoi = false;

  if (than.ho_ten !== undefined) {
    const v = String(than.ho_ten || '').trim();
    if (v.length < 2) return K.json(400, { error: 'Họ tên quá ngắn.', truong: 'ho_ten' });
    ban.ho_ten = v.slice(0, 120);
    coDoi = true;
  }

  if (than.email !== undefined) {
    const v = String(than.email || '').trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      return K.json(400, { error: 'Email không hợp lệ.', truong: 'email' });
    }
    ban.email = v ? v.slice(0, 160) : null;
    coDoi = true;
  }

  /* Thông tin nhận tiền.
     Ở bước 1 chưa có tiền nên cho sửa tự do. KHI MỞ CHỨC NĂNG RÚT TIỀN, ba
     trường dưới đây phải yêu cầu OTP mới được đổi — kẻ chiếm tài khoản không
     cần xem bảng điều khiển, hắn chỉ cần đổi số nhận tiền rồi bấm rút. */
  if (than.ngan_hang !== undefined) {
    const v = String(than.ngan_hang || '').trim();
    ban.ngan_hang = v ? v.slice(0, NGAN_HANG_TOI_DA) : null;
    coDoi = true;
  }

  if (than.so_tai_khoan !== undefined) {
    const v = String(than.so_tai_khoan || '').replace(/[^\dA-Za-z]/g, '');
    if (v && v.length < 6) {
      return K.json(400, { error: 'Số tài khoản quá ngắn.', truong: 'so_tai_khoan' });
    }
    ban.so_tai_khoan = v ? v.slice(0, SO_TK_TOI_DA) : null;
    coDoi = true;
  }

  if (than.chu_tai_khoan !== undefined) {
    const v = String(than.chu_tai_khoan || '').trim();
    ban.chu_tai_khoan = v ? v.slice(0, 120) : null;
    coDoi = true;
  }

  /* Đổi mật khẩu — phải nhập đúng mật khẩu cũ. */
  if (than.mat_khau_moi !== undefined && String(than.mat_khau_moi).length > 0) {
    const moi = String(than.mat_khau_moi);
    if (moi.length < MAT_KHAU_TOI_THIEU) {
      return K.json(400, {
        error: 'Mật khẩu mới phải có ít nhất ' + MAT_KHAU_TOI_THIEU + ' ký tự.',
        truong: 'mat_khau_moi',
      });
    }
    const cu = String(than.mat_khau_cu || '');
    /* Trả 400, KHÔNG trả 401. Trình duyệt coi 401/403 ở hàm này là "phiên đã
       hết" và tự đăng xuất — nhập sai mật khẩu hiện tại mà bị đá ra ngoài thì
       người dùng tưởng hệ thống lỗi. 401 chỉ dành cho token. */
    if (!K.soSanhBam(K.bamMatKhau(cu, ban.muoi), ban.mat_khau_bam)) {
      return K.json(400, { error: 'Mật khẩu hiện tại không đúng.', truong: 'mat_khau_cu' });
    }
    ban.muoi = K.taoMuoi();
    ban.mat_khau_bam = K.bamMatKhau(moi, ban.muoi);
    coDoi = true;
  }

  if (!coDoi) return K.json(400, { error: 'Không có thông tin nào để cập nhật.' });

  ban.ngay_cap_nhat = new Date().toISOString();
  await K.ghiCtv(kho, ban);

  return K.json(200, { ok: true, ctv: K.hoSoCongKhai(ban) });
}
