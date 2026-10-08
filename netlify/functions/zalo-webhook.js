/* DBV247 — Webhook nhận sự kiện từ Zalo Bot
   ===========================================================================
   VIỆC DUY NHẤT: ai @nhắc bot (hoặc trả lời tin của bot) trong nhóm / nhắn
   riêng cho bot → bot trả lời ngay "ID của cuộc trò chuyện này: ...".
   Dùng để lấy ZALO_CHAT_ID của nhóm vận hành mà không cần chạy getUpdates.

   Cài một lần (PowerShell):
     Invoke-RestMethod -Method Post -Uri "https://bot-api.zaloplatforms.com/bot<TOKEN>/setWebhook"
       -ContentType "application/json"
       -Body '{"url":"https://dbv247.com.vn/.netlify/functions/zalo-webhook","secret_token":"<ZALO_WEBHOOK_SECRET>"}'

   Biến môi trường: ZALO_BOT_TOKEN, ZALO_WEBHOOK_SECRET (8–256 ký tự, tự đặt).
   Lưu ý: khi đã cài webhook thì lệnh getUpdates KHÔNG chạy nữa (Zalo quy định).
*/

'use strict';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };

  const token  = process.env.ZALO_BOT_TOKEN;
  const secret = process.env.ZALO_WEBHOOK_SECRET;
  const h = event.headers || {};
  const nhan = h['x-bot-api-secret-token'] || h['X-Bot-Api-Secret-Token'];
  if (!token || !secret || nhan !== secret) {
    return { statusCode: 403, body: 'forbidden' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 200, body: 'bad json' }; }
  console.log('Zalo webhook:', JSON.stringify(body));

  const ev  = body.result || body;
  const msg = ev.message || {};
  const chat = msg.chat || {};
  if (!chat.id) return { statusCode: 200, body: 'no chat' };

  const loai = chat.chat_type === 'GROUP' ? 'NHÓM' : 'CHAT RIÊNG';
  const text = `ID của ${loai} này:\n${chat.id}\n\nDán giá trị trên vào biến ZALO_CHAT_ID trên Netlify.`;

  try {
    const r = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, text })
    });
    console.log('Zalo trả lời:', r.status, await r.text());
  } catch (e) {
    console.error('Không gửi được:', e.message);
  }
  return { statusCode: 200, body: 'ok' };
};
