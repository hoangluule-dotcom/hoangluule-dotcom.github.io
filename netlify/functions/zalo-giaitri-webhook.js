/* DBV247 — Webhook cho bot Zalo GIẢI TRÍ (nhóm cán bộ công ty)
   ===========================================================================
   Bot RIÊNG, tách hẳn khỏi Bot DBV247 (bot báo lead / nhóm vận hành):
   token riêng, webhook riêng, KHÔNG bao giờ nhận thông tin khách hàng.

   - Tag bot + "id"  → trả lời ID nhóm (dùng khi cài đặt).
   - Tag bot + câu khác → chuyển sang zalo-giaitri-background.js (gọi AI vài giây).
   Chỉ trả lời ở nhóm có trong ZALO_GT_CHAT_ID (để trống = trả lời mọi nơi, chỉ nên
   để trống lúc mới cài).

   Biến môi trường:
     ZALO_GT_BOT_TOKEN       token bot giải trí (Zalo Bot Creator)
     ZALO_GT_WEBHOOK_SECRET  mật khẩu webhook, chỉ A-Z a-z 0-9 _ -
     ZALO_GT_CHAT_ID         ID nhóm giải trí (nhiều nhóm: cách nhau dấu phẩy)
     ZALO_GT_BOT_NAME        tên bot đúng như trên Zalo (để bỏ phần @tag), mặc định "Bot em gái DBV"
     GEMINI_GT_API_KEY       (khuyên dùng) khoá Gemini riêng; thiếu thì dùng chung GEMINI_API_KEY
     ZALO_GT_MAX_PER_DAY     số câu trả lời tối đa mỗi ngày, mặc định 150

   Cài webhook (PowerShell, một lần):
     Invoke-RestMethod -Method Post -Uri "https://bot-api.zaloplatforms.com/bot<TOKEN>/setWebhook"
       -ContentType "application/json"
       -Body '{"url":"https://dbv247.com.vn/.netlify/functions/zalo-giaitri-webhook","secret_token":"<ZALO_GT_WEBHOOK_SECRET>"}'
*/

'use strict';

const { guiDen } = require('./lib/zalo');
const DAY = require('./lib/day-bot');  // "học: … | …" — quản trị dạy bot ngay trong Zalo

const tenBot = () => (process.env.ZALO_GT_BOT_NAME || 'Bot em gái DBV').trim();

function boTag(text) {
  const esc = tenBot().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text || '').replace(new RegExp('@' + esc, 'gi'), ' ').replace(/\s+/g, ' ').trim();
}

function duocPhep(chatId) {
  const ds = String(process.env.ZALO_GT_CHAT_ID || '').split(',').map(s => s.trim()).filter(Boolean);
  return !ds.length || ds.includes(chatId);
}

exports.handler = async function (event) {
  const token  = process.env.ZALO_GT_BOT_TOKEN;
  const secret = process.env.ZALO_GT_WEBHOOK_SECRET;

  if (event.httpMethod !== 'POST') {
    const co = (v) => (process.env[v] ? 'CÓ' : 'THIẾU');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'zalo-giaitri-webhook v1\n' +
        ['ZALO_GT_BOT_TOKEN', 'ZALO_GT_WEBHOOK_SECRET', 'ZALO_GT_CHAT_ID', 'GEMINI_GT_API_KEY', 'GEMINI_API_KEY']
          .map((v) => v + ': ' + co(v)).join('\n') +
        '\n(GEMINI_GT_API_KEY thiếu thì bot dùng chung GEMINI_API_KEY)'
    };
  }

  const h = event.headers || {};
  const nhan = h['x-bot-api-secret-token'] || h['X-Bot-Api-Secret-Token'];
  if (!token || !secret || nhan !== secret) {
    console.error('Webhook giải trí bị từ chối:',
      !token ? 'thiếu ZALO_GT_BOT_TOKEN' : !secret ? 'thiếu ZALO_GT_WEBHOOK_SECRET' :
      !nhan ? 'Zalo không gửi header secret' : 'secret KHÔNG KHỚP với lệnh setWebhook');
    return { statusCode: 403, body: 'forbidden' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 200, body: 'bad json' }; }
  const ev = body.result || body;
  const msg = ev.message || {};
  const chat = msg.chat || {};
  if (!chat.id) return { statusCode: 200, body: 'no chat' };
  if (ev.event_name && ev.event_name !== 'message.text.received') {
    return { statusCode: 200, body: 'skip' };  // ảnh/sticker: im lặng cho đỡ ồn
  }

  const cau = boTag(msg.text);
  const nguoi = (msg.from && msg.from.display_name) || '';
  console.log('Zalo GT:', chat.chat_type, chat.id, nguoi, '|', cau.slice(0, 200));

  /* Lệnh dạy bot — chỉ ZALO_GT_ADMIN_ID được dạy; kho 'giai-tri' chỉ bot này dùng */
  try {
    const tl = await DAY.xuLyLenh(cau, { ten: 'giai-tri', bienAdmin: 'ZALO_GT_ADMIN_ID',
      idNguoi: (msg.from && msg.from.id) || '', tenNguoi: nguoi });
    if (tl) { await guiDen(chat.id, tl, token); return { statusCode: 200, body: 'ok' }; }
  } catch (e) {
    console.error('day-bot GT:', e.message);
    await guiDen(chat.id, 'Em chưa ghi nhớ được (lỗi kho lưu), anh/chị dạy lại em sau chút nhé.', token);
    return { statusCode: 200, body: 'ok' };
  }

  if (/^id\s*$/i.test(cau)) {
    await guiDen(chat.id, `ID của ${chat.chat_type === 'GROUP' ? 'NHÓM' : 'CHAT RIÊNG'} này:\n${chat.id}`, token);
    return { statusCode: 200, body: 'ok' };
  }
  if (!duocPhep(chat.id)) {
    await guiDen(chat.id, 'Em là bot của nhóm nội bộ, chỗ này em chưa được sếp duyệt ngồi ạ.', token);
    return { statusCode: 200, body: 'not allowed' };
  }

  const viec = { chatId: chat.id, cau: cau, nguoi: nguoi };
  try {
    const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
    const r = await fetch(goc + '/.netlify/functions/zalo-giaitri-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-noi-bo': secret },
      body: JSON.stringify(viec)
    });
    if (r.status >= 300) throw new Error('hàm nền trả ' + r.status);
  } catch (e) {
    console.error('Không chuyển được sang hàm nền, chạy trực tiếp:', e.message);
    await require('./zalo-giaitri-background.js').handler({ headers: { 'x-noi-bo': secret }, body: JSON.stringify(viec) });
  }
  return { statusCode: 200, body: 'ok' };
};
