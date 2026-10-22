/* DBV247 — Gửi tin nhắn Zalo OA cho khách (tin Tư vấn)
   ===========================================================================
   Dùng khi nhân viên gắn giấy chứng nhận ở /admin/zalo-mini: OA DBV247 nhắn
   khách "giấy chứng nhận đã sẵn sàng".

   ĐIỀU KIỆN CỦA ZALO (tin Tư vấn):
   • Khách đang theo dõi OA (thì Mini App mới lấy được idByOA của khách).
   • Khách có tương tác với OA/Mini App trong 7 ngày gần nhất — bấm thanh toán
     trong Mini App được tính là tương tác. Trong 48 giờ đầu: miễn phí.
   • Zalo App "Bảo hiểm DBV" đã liên kết với OA và bật quyền gửi tin.
   (Tin "UID Giao dịch" Zalo đã dừng từ 01/03/2026 nên không dùng.)

   TOKEN OA: lấy một lần qua /.netlify/functions/zalo-oa-ket-noi (OAuth v4 có
   PKCE), lưu ở Blobs "dbv247-miniapp" khoá oa/token. Access token sống ~25 giờ,
   refresh token ~3 tháng và CHỈ DÙNG ĐƯỢC MỘT LẦN — mỗi lần làm mới phải lưu
   ngay refresh token mới, lỡ mất là phải kết nối lại.
*/

'use strict';

const C = require('./zalo-mini-chung');

const APP_ID = process.env.ZALO_APP_ID || '3776909008774584524';
const URL_TOKEN = 'https://oauth.zaloapp.com/v4/oa/access_token';

function biMatApp() {
  const s = process.env.ZALO_MINIAPP_SECRET_KEY;
  if (!s) throw new Error('Thiếu ZALO_MINIAPP_SECRET_KEY trên Netlify.');
  return s;
}

async function goiToken(form) {
  const r = await fetch(URL_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: biMatApp() },
    body: new URLSearchParams(Object.assign({ app_id: APP_ID }, form)).toString(),
  });
  const kq = await r.json().catch(() => ({}));
  if (!kq.access_token) throw new Error('Zalo không cấp token OA: ' + JSON.stringify(kq).slice(0, 200));
  return {
    access: kq.access_token,
    refresh: kq.refresh_token,
    het: Date.now() + (parseInt(kq.expires_in, 10) || 90000) * 1000,
    capLuc: new Date().toISOString(),
  };
}

/* Lần đầu: đổi mã ủy quyền (sau khi admin OA bấm Đồng ý) lấy token. */
async function luuTokenTuMa(code, codeVerifier, oaId) {
  const t = await goiToken({ code, grant_type: 'authorization_code', code_verifier: codeVerifier });
  t.oaId = oaId || '';
  await C.moKho().setJSON('oa/token', t);
  return t;
}

async function layAccessToken() {
  const kho = C.moKho();
  const t = await kho.get('oa/token', { type: 'json' });
  if (!t || !t.refresh) throw new Error('Chưa kết nối Zalo OA. Vào /admin/zalo-mini bấm "Kết nối Zalo OA".');
  if (t.access && Date.now() < t.het - 5 * 60000) return t.access;
  const moi = await goiToken({ refresh_token: t.refresh, grant_type: 'refresh_token' });
  moi.oaId = t.oaId;
  await kho.setJSON('oa/token', moi); // lưu NGAY: refresh token cũ đã hết hiệu lực
  return moi.access;
}

async function trangThai() {
  const t = await C.moKho().get('oa/token', { type: 'json' });
  return t && t.refresh ? { daKetNoi: true, oaId: t.oaId || '', capLuc: t.capLuc } : { daKetNoi: false };
}

/* Gửi tin Tư vấn dạng văn bản. Trả {ok, loi}. Không bao giờ ném lỗi ra ngoài. */
async function guiTinTuVan(userIdTheoOA, text) {
  try {
    const access = await layAccessToken();
    const r = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: access },
      body: JSON.stringify({ recipient: { user_id: String(userIdTheoOA) }, message: { text: String(text).slice(0, 2000) } }),
    });
    const kq = await r.json().catch(() => ({}));
    if (kq.error === 0) return { ok: true };
    return { ok: false, loi: 'Zalo trả lỗi ' + kq.error + ': ' + (kq.message || '') };
  } catch (err) {
    return { ok: false, loi: String(err.message || err) };
  }
}

module.exports = { APP_ID, luuTokenTuMa, layAccessToken, trangThai, guiTinTuVan };
