/* DBV247 — Đăng ký / đăng nhập cộng tác viên
   ---------------------------------------------------------------------------
   POST /.netlify/functions/ctv-auth
     { hanh_dong: "dang-ky",   ho_ten, sdt, mat_khau }
     { hanh_dong: "dang-nhap", sdt, mat_khau }

   Trả về: { ok:true, token, ctv:{...} }

   Đây là hàm KHÔNG cần token — tách riêng khỏi ctv-toi.js (hàm cần token) để
   không bao giờ có khả năng lẫn một nhánh không xác thực vào chỗ đã xác thực.

   Biến môi trường cần khai trên Netlify:
     CTV_TOKEN_SECRET — chuỗi ngẫu nhiên ≥16 ký tự, dùng để ký token phiên.
   Netlify Blobs tự khả dụng, không cần cấu hình thêm.
*/

'use strict';

const K = require('./lib/ctv-kho');

const MAT_KHAU_TOI_THIEU = 6;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return K.json(405, { error: 'Chỉ nhận POST.' });
  }

  const than = K.docThan(event);
  if (!than) return K.json(400, { error: 'Nội dung gửi lên không phải JSON hợp lệ.' });

  const hanhDong = String(than.hanh_dong || '');
  if (hanhDong !== 'dang-ky' && hanhDong !== 'dang-nhap') {
    return K.json(400, { error: 'Thiếu hoặc sai hanh_dong (dang-ky | dang-nhap).' });
  }

  /* Số điện thoại và mật khẩu — kiểm tra chung cho cả hai nhánh */
  const sdt = K.chuanHoaSdt(than.sdt);
  if (!K.sdtHopLe(sdt)) {
    return K.json(400, {
      error: 'Số điện thoại không hợp lệ. Nhập số di động 10 chữ số, ví dụ 0912345678.',
      truong: 'sdt',
    });
  }

  const matKhau = String(than.mat_khau || '');
  if (matKhau.length < MAT_KHAU_TOI_THIEU) {
    return K.json(400, {
      error: 'Mật khẩu phải có ít nhất ' + MAT_KHAU_TOI_THIEU + ' ký tự.',
      truong: 'mat_khau',
    });
  }

  let kho;
  try {
    kho = K.moKho();
    /* Gọi biMat() sớm qua kyToken ở cuối cũng được, nhưng báo lỗi cấu hình
       ngay từ đầu thì dễ sửa hơn là báo sau khi đã ghi dữ liệu. */
    K.kyToken('0000000000', 'AAAA');
  } catch (err) {
    return K.json(500, { error: String(err.message || err) });
  }

  try {
    if (hanhDong === 'dang-ky') return await dangKy(kho, than, sdt, matKhau);
    return await dangNhap(kho, sdt, matKhau);
  } catch (err) {
    return K.json(500, { error: 'Lỗi hệ thống: ' + String(err.message || err) });
  }
};

/* ── Đăng ký ─────────────────────────────────────────────────────────────── */
async function dangKy(kho, than, sdt, matKhau) {
  const hoTen = String(than.ho_ten || '').trim();
  if (hoTen.length < 2) {
    return K.json(400, { error: 'Nhập họ và tên của bạn.', truong: 'ho_ten' });
  }

  const daCo = await K.docCtv(kho, sdt);
  if (daCo) {
    return K.json(409, {
      error: 'Số điện thoại này đã có tài khoản. Bạn hãy đăng nhập, hoặc dùng số khác.',
      truong: 'sdt',
    });
  }

  /* Đặt chỗ mã trước khi ghi bản ghi: nếu bước sau lỗi thì chỉ còn một mã bị
     giữ không dùng — vô hại. Làm ngược lại thì sinh ra CTV có mã trùng người
     khác, và đó là lỗi không sửa được về sau vì mã đã đi vào link giới thiệu. */
  const maCtv = await K.sinhMaChuaDung(kho);
  await kho.setJSON('ma/' + maCtv, { sdt: sdt, ngay_tao: new Date().toISOString() });

  const ban = K.banGhiMoi(sdt, hoTen, matKhau, maCtv);
  ban.dang_nhap_cuoi = ban.ngay_tao;
  await K.ghiCtv(kho, ban);

  /* Ghi thêm một dòng vào sheet CTV của bảng tính Affiliate.
     BẮT BUỘC, không phải tuỳ chọn: Apps Script kiểm mã CTV có tồn tại và đang
     ACTIVE trong sheet đó trước khi gắn đơn. Thiếu dòng này thì cộng tác viên
     đăng ký xong, gửi link đi, khách mua — và đơn về hệ thống KHÔNG mang mã
     của họ. Lỗi im lặng, chỉ lộ khi họ hỏi sao không có hoa hồng.

     Nhưng cũng không được làm hỏng việc đăng ký nếu Apps Script trục trặc:
     tài khoản vẫn tạo xong, chỉ ghi log để còn bổ sung dòng thiếu sau. */
  try {
    const G = require('./lib/gas');
    const kq = await G.goiPost('dangKyCtv', {
      ctvId: maCtv, hoTen: ban.ho_ten, phone: ban.sdt, email: ban.email || '',
    });
    if (!kq || !kq.ok) {
      console.error('[ctv-auth] Không thêm được CTV ' + maCtv +
                    ' vào sheet: ' + ((kq && kq.error) || 'không rõ'));
    }
  } catch (err) {
    console.error('[ctv-auth] Apps Script không phản hồi khi thêm CTV ' +
                  maCtv + ': ' + (err.message || err));
  }

  return K.json(201, {
    ok: true,
    token: K.kyToken(ban.sdt, ban.ma_ctv),
    ctv: K.hoSoCongKhai(ban),
  });
}

/* ── Đăng nhập ───────────────────────────────────────────────────────────── */
async function dangNhap(kho, sdt, matKhau) {
  const ban = await K.docCtv(kho, sdt);

  /* Không nói rõ "số này chưa có tài khoản" hay "sai mật khẩu" — một câu trả
     lời cho cả hai để người ngoài không dò được số nào đã là CTV. */
  const SAI = 'Số điện thoại hoặc mật khẩu không đúng.';
  if (!ban) return K.json(401, { error: SAI });

  const conKhoa = K.dangBiKhoa(ban);
  if (conKhoa > 0) {
    return K.json(429, {
      error: 'Đã nhập sai quá nhiều lần. Thử lại sau ' + conKhoa + ' phút.',
    });
  }

  if (ban.trang_thai !== 'hoat_dong') {
    return K.json(403, {
      error: 'Tài khoản đang tạm khoá. Liên hệ 0869 656 561 để được hỗ trợ.',
    });
  }

  if (!K.soSanhBam(K.bamMatKhau(matKhau, ban.muoi), ban.mat_khau_bam)) {
    ban.sai_lien_tiep = Number(ban.sai_lien_tiep || 0) + 1;
    if (ban.sai_lien_tiep >= K.SAI_TOI_DA) {
      ban.khoa_den = new Date(Date.now() + K.KHOA_PHUT * 60000).toISOString();
      ban.sai_lien_tiep = 0;
    }
    ban.ngay_cap_nhat = new Date().toISOString();
    await K.ghiCtv(kho, ban);
    return K.json(401, { error: SAI });
  }

  ban.sai_lien_tiep = 0;
  ban.khoa_den = null;
  ban.dang_nhap_cuoi = new Date().toISOString();
  ban.ngay_cap_nhat = ban.dang_nhap_cuoi;
  await K.ghiCtv(kho, ban);

  return K.json(200, {
    ok: true,
    token: K.kyToken(ban.sdt, ban.ma_ctv),
    ctv: K.hoSoCongKhai(ban),
  });
}
