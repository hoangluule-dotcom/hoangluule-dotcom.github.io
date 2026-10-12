/* DBV247 — Webhook nhận sự kiện từ Zalo Bot (Bot DBV247)
   ===========================================================================
   Bot chỉ nhận được tin khi có người @nhắc bot trong nhóm, trả lời (reply) tin
   của bot, hoặc nhắn riêng cho bot — Zalo quy định vậy.

   Bot làm 2 việc:
   1. Tin là "id"  → trả lời ID của cuộc trò chuyện (dùng khi cài đặt).
   2. Tin khác     → tra phí nhanh TNDS + hỏi đáp nghiệp vụ, CHỈ ở những nơi
                     được phép (ZALO_CHAT_ID, và thêm ZALO_HOI_DAP_CHO nếu có).
                     Phần trả lời chạy ở zalo-hoidap-background.js vì gọi AI
                     mất vài giây, quá thời gian chờ của hàm thường.

   Biến môi trường: ZALO_BOT_TOKEN, ZALO_WEBHOOK_SECRET, ZALO_CHAT_ID,
                    GEMINI_API_KEY (dùng chung với chatbot trên web),
                    ZALO_BOT_NAME (tuỳ chọn, mặc định "Bot DBV247"),
                    ZALO_HOI_DAP_CHO (tuỳ chọn: thêm ID được hỏi đáp, cách nhau dấu phẩy).

   Cài webhook (một lần, PowerShell):
     Invoke-RestMethod -Method Post -Uri "https://bot-api.zaloplatforms.com/bot<TOKEN>/setWebhook"
       -ContentType "application/json"
       -Body '{"url":"https://dbv247.com.vn/.netlify/functions/zalo-webhook","secret_token":"<ZALO_WEBHOOK_SECRET>"}'
   secret_token chỉ gồm A-Z a-z 0-9 _ - và phải GIỐNG HỆT biến trên Netlify.
   Đã đặt webhook thì lệnh getUpdates không dùng được nữa.
*/

'use strict';

const { guiDen, dsNhan } = require('./lib/zalo');
const DAY = require('./lib/day-bot');  // "học: … | …" — quản trị dạy bot ngay trong Zalo

/* Bỏ phần "@Bot DBV247" khỏi câu hỏi */
function boTag(text) {
  const ten = (process.env.ZALO_BOT_NAME || 'Bot DBV247').trim();
  const esc = ten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text || '')
    .replace(new RegExp('@' + esc, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Quản trị viên được chat riêng với bot đầy đủ chức năng (không cần nằm trong danh sách nhóm) */
const laQuanTri = (bien, id) => !!id && String(process.env[bien] || '').split(',').map((s) => s.trim()).includes(id);

function duocHoiDap(chatId) {
  const them = String(process.env.ZALO_HOI_DAP_CHO || '').split(',').map(s => s.trim()).filter(Boolean);
  return dsNhan().concat(them).includes(chatId);
}

exports.handler = async function (event) {
  const token  = process.env.ZALO_BOT_TOKEN;
  const secret = process.env.ZALO_WEBHOOK_SECRET;

  /* Mở bằng trình duyệt để tự kiểm tra cấu hình — chỉ báo CÓ/THIẾU, không lộ giá trị */
  if (event.httpMethod !== 'POST') {
    const co = (v) => (process.env[v] ? 'CÓ' : 'THIẾU');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'zalo-webhook v3 (tra phí + hỏi đáp)\n' +
        ['ZALO_BOT_TOKEN', 'ZALO_WEBHOOK_SECRET', 'ZALO_CHAT_ID', 'GEMINI_API_KEY']
          .map((v) => v + ': ' + co(v)).join('\n')
    };
  }

  const h = event.headers || {};
  const nhan = h['x-bot-api-secret-token'] || h['X-Bot-Api-Secret-Token'];
  if (!token || !secret || nhan !== secret) {
    console.error('Zalo webhook bị từ chối:',
      !token ? 'thiếu ZALO_BOT_TOKEN' : !secret ? 'thiếu ZALO_WEBHOOK_SECRET' :
      !nhan ? 'Zalo không gửi header secret' : 'secret KHÔNG KHỚP với lệnh setWebhook');
    return { statusCode: 403, body: 'forbidden' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 200, body: 'bad json' }; }

  const ev   = body.result || body;
  const msg  = ev.message || {};
  const chat = msg.chat || {};
  if (!chat.id) return { statusCode: 200, body: 'no chat' };

  const cau = boTag(msg.text);
  const nguoi = (msg.from && msg.from.display_name) || '';
  console.log('Zalo:', chat.chat_type, chat.id, nguoi, '|', cau.slice(0, 200));

  /* Tin không phải chữ. Zalo có thể gửi tin chứa LINK dưới dạng khác (xem trước liên kết):
     vẫn còn chữ thì xử lý như tin chữ; không còn chữ thì ghi log để dò, báo quản trị. */
  if (ev.event_name && ev.event_name !== 'message.text.received' && !String(msg.text || '').trim()) {
    console.log('Zalo sự kiện khác:', ev.event_name, JSON.stringify(msg).slice(0, 800));
    if (laQuanTri('ZALO_ADMIN_ID', msg.from && msg.from.id) && /unsupported|link/.test(ev.event_name)) {
      await guiDen(chat.id, 'Zalo không chuyển tin chứa link cho bot, nên em chưa đọc được 😅\n' +
        'Anh/chị gửi lại theo 1 trong 2 cách:\n' +
        '1) Gõ chữ trước link: học: drive.google.com/file/d/...\n' +
        '2) Chỉ gửi MÃ tài liệu (đoạn dài nằm giữa /d/ và /view hoặc /edit trong link):\n   học: 1AbCdEfGhIjKlMnOpQrStUvWxYz');
    }
    return { statusCode: 200, body: 'skip' };
  }

  /* 0. Lệnh dạy bot (học / đã học / quên / tôi là ai) — chỉ ZALO_ADMIN_ID được dạy */
  try {
    const tl = await DAY.xuLyLenh(cau, { ten: 'nghiep-vu', bienAdmin: 'ZALO_ADMIN_ID',
      idNguoi: (msg.from && msg.from.id) || '', tenNguoi: nguoi });
    if (tl && tl.docTaiLieu) {
      /* "học: <link>" → hàm nền đọc tài liệu, gửi bản xem trước, chờ "lưu" */
      await guiDen(chat.id, '📥 Em đang đọc tài liệu, khoảng 10–40 giây nữa sẽ gửi bản tóm tắt để anh/chị duyệt…');
      const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
      await fetch(goc + '/.netlify/functions/zalo-hoc-tai-lieu-background', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-noi-bo': secret },
        body: JSON.stringify({ bot: 'ops', chatId: chat.id, idNguoi: (msg.from && msg.from.id) || '', url: tl.docTaiLieu })
      }).catch((e) => console.error('hoc-tai-lieu dispatch:', e.message));
      return { statusCode: 200, body: 'ok' };
    }
    if (tl) { await guiDen(chat.id, tl); return { statusCode: 200, body: 'ok' }; }
  } catch (e) {
    console.error('day-bot:', e.message);
    await guiDen(chat.id, 'Chưa lưu được (lỗi kho lưu). Anh/chị thử lại sau ít phút.');
    return { statusCode: 200, body: 'ok' };
  }

  /* 1. Lệnh lấy ID */
  if (/^id\s*$/i.test(cau)) {
    const loai = chat.chat_type === 'GROUP' ? 'NHÓM' : 'CHAT RIÊNG';
    await guiDen(chat.id, `ID của ${loai} này:\n${chat.id}`);
    return { statusCode: 200, body: 'ok' };
  }

  /* 2. Tra phí / hỏi đáp — chỉ nơi được phép, tránh người lạ đốt hạn mức AI */
  if (!duocHoiDap(chat.id) && !laQuanTri('ZALO_ADMIN_ID', msg.from && msg.from.id)) {
    await guiDen(chat.id, 'Bot DBV247 chỉ trả lời trong nhóm vận hành DBV247.');
    return { statusCode: 200, body: 'not allowed' };
  }

  if (!cau) {
    await guiDen(chat.id,
      'Chào ' + (nguoi || 'anh/chị') + '! Tag bot kèm câu hỏi, ví dụ:\n' +
      '- @Bot DBV247 phí TNDS xe 7 chỗ kinh doanh\n' +
      '- @Bot DBV247 xe tải 5 tấn mua 2 năm bao nhiêu\n' +
      '- @Bot DBV247 bảo hiểm cháy nổ bắt buộc áp dụng cho ai');
    return { statusCode: 200, body: 'ok' };
  }

  /* Chuyển sang hàm nền (trả 202 ngay, chạy tối đa 15 phút) */
  try {
    const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
    const r = await fetch(goc + '/.netlify/functions/zalo-hoidap-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-noi-bo': secret },
      body: JSON.stringify({ chatId: chat.id, cau: cau, nguoi: nguoi })
    });
    if (r.status >= 300) throw new Error('hàm nền trả ' + r.status);
  } catch (e) {
    /* Gói Netlify không chạy được hàm nền → trả lời ngay trong hàm này
       (có thể chậm vài giây, vẫn hơn là im lặng) */
    console.error('Không chuyển được sang hàm nền, chạy trực tiếp:', e.message);
    await require('./zalo-hoidap-background.js').handler({
      headers: { 'x-noi-bo': secret },
      body: JSON.stringify({ chatId: chat.id, cau: cau, nguoi: nguoi })
    });
  }
  return { statusCode: 200, body: 'ok' };
};
