/* DBV247 — Webhook của Zalo Mini App "Bảo hiểm DBV"
   ---------------------------------------------------------------------------
   Khai ở mini.zalo.me → Xét duyệt phiên bản → Thiết lập Webhook URL:
     https://dbv247.com.vn/.netlify/functions/zalo-mini-webhook

   Sự kiện xử lý:
   • user.revoke.consent — người dùng rút lại sự đồng ý & yêu cầu xoá dữ liệu
     {event, appId, userId, timestamp}. Ta xoá: liên kết thiết bị ↔ Mini App,
     ID theo OA, SĐT đã liên kết, tệp khách tự tải lên. GIỮ hồ sơ hợp đồng đã
     cấp (nghĩa vụ lưu trữ theo luật kinh doanh bảo hiểm) nhưng gỡ khỏi app.

   Xác thực: header x-zevent-signature = sha256(giá trị các trường xếp theo tên
   A→Z nối liền + API Key) dạng hex (docs.zaloplatforms.com … /webhook/verifysignature).
   API Key lấy ở mini.zalo.me → Open APIs, đặt vào biến ZALO_MINIAPP_API_KEY.
   Chưa đặt biến → vẫn nhận (ghi log cảnh báo) để không lỡ yêu cầu xoá dữ liệu.

   Zalo User ID → khoá thiết bị: app gửi getUserID() qua hanh-dong=dong-bo
   (zalo-mini.js), lưu ở zu/<userId> = {ids: [...]}.
*/
'use strict';

const crypto = require('node:crypto');
const C = require('./lib/zalo-mini-chung');

function chuKy(data, khoa) {
  const noi = Object.keys(data).sort().map((k) => {
    const v = data[k];
    return v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v);
  }).join('');
  return crypto.createHash('sha256').update(noi + khoa).digest('hex');
}

function dungChuKy(data, nhan, khoa) {
  const tinh = Buffer.from(chuKy(data, khoa));
  const den = Buffer.from(String(nhan || '').trim().toLowerCase());
  return tinh.length === den.length && crypto.timingSafeEqual(tinh, den);
}

/** Gỡ mọi dữ liệu Mini App của một khách (theo ID thiết bị) — giữ hồ sơ hợp đồng. */
async function xoaDuLieuKhach(kho, id) {
  const { blobs } = await kho.list({ prefix: 'kh/' + id + '/' });
  let soDon = 0;
  let soTep = 0;
  for (const b of blobs) {
    const phan = b.key.split('/');
    if (phan[2] === 'don') {
      const d = await kho.get('don/' + phan[3], { type: 'json' });
      if (d && d.zaloId === id) {
        d.zaloId = '';
        d.idOA = '';
        d.goKhoiAppLuc = new Date().toISOString();
        d.goKhoiAppLyDo = 'user.revoke.consent';
        await kho.setJSON('don/' + d.maDon, d);
        soDon++;
      }
    } else if (phan[2] === 'tep') {
      const t = await kho.get(b.key, { type: 'json' });
      if (t && t.nguon === 'khach') {
        await kho.delete('tep/' + t.maTep);
        soTep++;
      }
    } else if (phan[2] === 'sdt') {
      const lk = await kho.get(b.key, { type: 'json' });
      if (lk && lk.sdt) {
        const m = await kho.get('sdt/' + lk.sdt, { type: 'json' });
        if (m && m.zaloId === id) await kho.delete('sdt/' + lk.sdt);
      }
    }
    await kho.delete(b.key);
  }
  return { soDon, soTep };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return C.json(200, { ok: true });
  let p;
  try {
    p = JSON.parse(event.body || '{}');
  } catch (err) {
    return C.json(400, { error: 'JSON không hợp lệ.' });
  }

  const khoa = process.env.ZALO_MINIAPP_API_KEY;
  const h = event.headers || {};
  const nhan = h['x-zevent-signature'] || h['X-ZEvent-Signature'] || h['X-Zevent-Signature'];
  if (khoa) {
    if (!dungChuKy(p, nhan, khoa)) {
      console.error('zalo-mini-webhook: sai chữ ký', p.event);
      return C.json(401, { error: 'Sai chữ ký.' });
    }
  } else {
    console.error('zalo-mini-webhook: CHƯA đặt ZALO_MINIAPP_API_KEY — không kiểm được chữ ký');
  }

  if (p.appId && String(p.appId) !== C.MINI_APP_ID) return C.json(200, { ok: true, boQua: 'appId khác' });

  try {
    if (p.event === 'user.revoke.consent') {
      const userId = String(p.userId || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 64);
      if (!userId) return C.json(200, { ok: true });
      const kho = C.moKho();
      const zu = await kho.get('zu/' + userId, { type: 'json' });
      const kq = { soMay: 0, soDon: 0, soTep: 0 };
      for (const id of (zu && zu.ids) || []) {
        const r = await xoaDuLieuKhach(kho, id);
        kq.soMay++;
        kq.soDon += r.soDon;
        kq.soTep += r.soTep;
      }
      await kho.delete('zu/' + userId);
      await kho.setJSON('xoa-du-lieu/' + Date.now() + '-' + userId.slice(-6), Object.assign({ luc: new Date().toISOString(), event: p.event }, kq));
      console.log('zalo-mini-webhook: đã xoá dữ liệu theo yêu cầu', kq);
      return C.json(200, { ok: true });
    }
    return C.json(200, { ok: true });
  } catch (err) {
    console.error('zalo-mini-webhook:', err);
    return C.json(500, { error: 'Lỗi xử lý.' });
  }
};

exports._chuKy = chuKy;
exports._xoaDuLieuKhach = xoaDuLieuKhach;
