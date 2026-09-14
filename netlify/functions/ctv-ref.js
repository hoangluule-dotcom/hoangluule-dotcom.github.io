/* DBV247 — Link giới thiệu /r/<MÃ>
   ---------------------------------------------------------------------------
   GET /r/K7X2              → đặt cookie, chuyển về /cap-don-tnds
   GET /r/K7X2?den=/bao-hiem-tnds-xemay
                            → đặt cookie, chuyển về trang đó

   VÌ SAO PHẢI LÀ HÀM MÁY CHỦ, KHÔNG PHẢI LINK ?ctv= THÔNG THƯỜNG
   Cookie phải được đặt bằng header Set-Cookie từ máy chủ. Safari ITP cắt cookie
   do JavaScript đặt (document.cookie) xuống còn 7 NGÀY. Công bố cửa sổ ghi nhận
   30 ngày với cộng tác viên mà thực tế chỉ 7 ngày trên mọi iPhone là đúng loại
   "thất thoát im lặng" nguy hiểm nhất: không có log, không ai biết, cộng tác
   viên chỉ thấy mất đơn rồi kết luận DBV ăn gian.

   Cookie KHÔNG đặt HttpOnly — xem giải thích trong assets/cap-don-tnds.js.
   Giá trị bên trong chỉ là mã công khai 4 ký tự, không phải bí mật.

   Định tuyến trong _redirects:
       /r/*   /.netlify/functions/ctv-ref?ma=:splat   200
*/

'use strict';

const K = require('./lib/ctv-kho');

const COOKIE = 'dbv_ctv';
const SONG_NGAY = 30;
const DEN_MAC_DINH = '/cap-don-tnds';

/* Chỉ cho phép chuyển tới đường dẫn nội bộ.
   Không kiểm thì /r/K7X2?den=https://trang-lua-dao.com biến link của DBV thành
   bàn đạp chuyển hướng cho người khác — lỗ hổng open redirect kinh điển. */
function dichHopLe(tho) {
  const v = String(tho || '').trim();
  if (!v) return DEN_MAC_DINH;
  if (v[0] !== '/') return DEN_MAC_DINH;      // phải là đường dẫn nội bộ
  if (v.slice(0, 2) === '//') return DEN_MAC_DINH; // //evil.com là tuyệt đối
  if (v.indexOf('\\') >= 0) return DEN_MAC_DINH;
  if (!/^\/[A-Za-z0-9\-._~/?&=#%]*$/.test(v)) return DEN_MAC_DINH;
  return v;
}

function chuanHoaMa(v) {
  return String(v || '').toUpperCase()
    .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 4);
}

function chuyenHuong(den, cookie) {
  const h = {
    Location: den,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
  if (cookie) h['Set-Cookie'] = cookie;
  return { statusCode: 302, headers: h, body: '' };
}

exports.handler = async function (event) {
  const q = event.queryStringParameters || {};

  /* Mã lấy từ ?ma= (do _redirects truyền vào) hoặc từ chính đường dẫn,
     phòng khi luật chuyển hướng bị sửa. */
  let ma = chuanHoaMa(q.ma);
  if (!ma) {
    const m = /\/r\/([^/?#]+)/.exec(event.path || '');
    if (m) ma = chuanHoaMa(m[1]);
  }

  const den = dichHopLe(q.den);

  /* Mã sai định dạng: vẫn đưa khách tới trang mua, chỉ là không gắn ai cả.
     Đừng bao giờ trả lỗi cho khách vì một chuyện của nội bộ. */
  if (!ma) return chuyenHuong(den, '');

  let kho;
  try {
    kho = K.moKho();
  } catch (err) {
    return chuyenHuong(den, '');
  }

  /* Mã không tồn tại hoặc tài khoản đã khoá thì không đặt cookie — tránh gắn
     đơn cho một mã ma rồi sau này không biết trả cho ai. */
  let ban = null;
  try {
    ban = await K.docTheoMa(kho, ma);
  } catch (err) {
    ban = null;
  }
  if (!ban || ban.trang_thai !== 'hoat_dong') return chuyenHuong(den, '');

  await K.ghiLuotBam(kho, ma, (event.headers && (event.headers.referer || event.headers.referrer)) || '');

  const cookie = COOKIE + '=' + encodeURIComponent(ma) +
    '; Path=/' +
    '; Max-Age=' + (SONG_NGAY * 86400) +
    '; SameSite=Lax' +
    '; Secure';

  return chuyenHuong(den, cookie);
};
