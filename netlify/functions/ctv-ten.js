/* DBV247 — Tra tên cộng tác viên theo mã
   ---------------------------------------------------------------------------
   GET /.netlify/functions/ctv-ten?ma=K7X2   →  { ok:true, ma, ho_ten }

   Dùng cho ô "Mã giới thiệu" trên trang cấp đơn: khách nhìn thấy tên người
   giới thiệu để xác nhận đúng người, trước khi trả tiền. Đây là cơ chế 2A.3
   trong đặc tả — thiếu nó thì khách gõ nhầm một ký tự là đơn về tay người khác
   mà cả hai bên đều không biết.

   CHỈ TRẢ VỀ TÊN. Không trả số điện thoại, không trả email, không trả trạng
   thái tài khoản — đây là điểm cuối công khai, ai cũng gọi được.

   Tên bị rút gọn: "Nguyễn Văn An" → "Nguyễn Văn A." — đủ để khách nhận ra
   người quen đã giới thiệu mình, không đủ để người lạ quét mã hàng loạt rồi
   dựng danh sách cộng tác viên của DBV.
*/

'use strict';

const K = require('./lib/ctv-kho');

function chuanHoaMa(v) {
  return String(v || '').toUpperCase()
    .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 4);
}

/* Giữ nguyên họ và tên đệm, viết tắt tên gọi. */
function rutGonTen(ten) {
  const phan = String(ten || '').trim().split(/\s+/).filter(Boolean);
  if (phan.length <= 1) return phan[0] || '';
  phan[phan.length - 1] = phan[phan.length - 1].charAt(0).toUpperCase() + '.';
  return phan.join(' ');
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return K.json(405, { error: 'Chỉ nhận GET.' });
  }

  const ma = chuanHoaMa((event.queryStringParameters || {}).ma);
  if (!ma || ma.length !== 4) {
    return K.json(400, { ok: false, error: 'Mã giới thiệu phải có 4 ký tự.' });
  }

  let kho;
  try {
    kho = K.moKho();
  } catch (err) {
    return K.json(500, { ok: false, error: String(err.message || err) });
  }

  let ban;
  try {
    ban = await K.docTheoMa(kho, ma);
  } catch (err) {
    return K.json(500, { ok: false, error: 'Lỗi đọc dữ liệu.' });
  }

  if (!ban || ban.trang_thai !== 'hoat_dong') {
    return K.json(404, { ok: false, error: 'Không tìm thấy mã này.' });
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      /* Cho phép cache ngắn: mã giới thiệu gần như không đổi, mà mỗi lần khách
         gõ lại ô này là một lượt gọi. */
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({ ok: true, ma: ban.ma_ctv, ho_ten: rutGonTen(ban.ho_ten) }),
  };
};
