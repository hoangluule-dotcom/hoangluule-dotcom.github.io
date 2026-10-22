/* DBV247 — Kết nối Zalo OA (làm MỘT LẦN, và làm lại nếu quá 3 tháng không dùng)
   ---------------------------------------------------------------------------
   1. Nhân viên mở /admin/zalo-mini → bấm "Kết nối Zalo OA"
      → /.netlify/functions/zalo-oa-ket-noi?khoa=<DASHBOARD_KEY>
   2. Hàm này chuyển sang trang ủy quyền của Zalo (OAuth v4 + PKCE).
      Người bấm phải là QUẢN TRỊ VIÊN của OA DBV247 → bấm "Đồng ý".
   3. Zalo quay về chính hàm này kèm ?code=…&state=…&oa_id=… → đổi lấy token,
      lưu vào Blobs. Từ đó lib/zalo-oa.js tự làm mới token.

   Trên developers.zalo.me → app "Bảo hiểm DBV" → Official Account → phần
   "Callback URL" phải khai đúng:
     https://dbv247.com.vn/.netlify/functions/zalo-oa-ket-noi
*/

'use strict';

const crypto = require('node:crypto');
const C = require('./lib/zalo-mini-chung');
const OA = require('./lib/zalo-oa');

const SITE = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
const REDIRECT = SITE + '/.netlify/functions/zalo-oa-ket-noi';

const trang = (tieuDe, noiDung, ok) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  body:
    '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>' + tieuDe + '</title></head>' +
    '<body style="font-family:\'Be Vietnam Pro\',sans-serif;max-width:560px;margin:48px auto;padding:0 16px;color:#1C1C1C">' +
    '<h1 style="color:' + (ok ? '#084C38' : '#C97D08') + ';font-size:24px">' + tieuDe + '</h1><p style="line-height:1.6">' + noiDung + '</p>' +
    '<p><a href="/admin/zalo-mini.html" style="color:#007437;font-weight:700">Về trang quản trị đơn Mini App</a></p></body></html>',
});

exports.handler = async function (event) {
  const q = event.queryStringParameters || {};
  const kho = C.moKho();

  try {
    /* Bước 3: Zalo quay về */
    if (q.code) {
      const pk = await kho.get('oa/pkce/' + String(q.state || ''), { type: 'json' });
      if (!pk || Date.now() - pk.luc > 15 * 60000) {
        return trang('Liên kết đã hết hạn', 'Anh/chị quay lại trang quản trị và bấm "Kết nối Zalo OA" lần nữa.', false);
      }
      await kho.delete('oa/pkce/' + q.state);
      await OA.luuTokenTuMa(q.code, pk.verifier, q.oa_id);
      return trang('Đã kết nối Zalo OA', 'Từ giờ, khi nhân viên gắn giấy chứng nhận, OA DBV247 sẽ tự nhắn khách. OA: ' + (q.oa_id || '') + '.', true);
    }

    /* Bước 1–2: bắt đầu — chỉ người có khoá quản trị */
    /* Chỉ Quản lý (vé đăng nhập /quan-tri, hoặc khoá chung khi chưa tắt). */
    const quyen = await require('./lib/quan-tri-auth').kiemQuyen({ headers: { 'x-dashboard-key': String(q.khoa || '') } }, ['quan-ly']);
    if (quyen.loi) {
      return { statusCode: quyen.ma, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: quyen.loi };
    }
    if (q['trang-thai']) return C.json(200, await OA.trangThai());

    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');
    await kho.setJSON('oa/pkce/' + state, { verifier, luc: Date.now() });
    const url = 'https://oauth.zaloapp.com/v4/oa/permission?' + new URLSearchParams({
      app_id: OA.APP_ID, redirect_uri: REDIRECT, code_challenge: challenge, state,
    }).toString();
    return { statusCode: 302, headers: { Location: url, 'Cache-Control': 'no-store' }, body: '' };
  } catch (err) {
    console.error('zalo-oa-ket-noi:', err);
    return trang('Chưa kết nối được', 'Lỗi: ' + String(err.message || err).replace(/</g, '&lt;'), false);
  }
};
