/* DBV247 — Gửi thông báo vào nhóm Zalo vận hành qua Zalo Bot
   ===========================================================================
   Chạy SONG SONG với Telegram, không thay thế. Thiếu biến môi trường thì im
   lặng bỏ qua — nên thêm tệp này vào site không làm thay đổi gì cho tới khi
   khai đủ hai biến dưới đây trên Netlify → Site settings → Environment variables:

     ZALO_BOT_TOKEN   token bot lấy trong mini app "Zalo Bot Creator"
     ZALO_CHAT_ID     id nhóm vận hành (lấy bằng getUpdates — xem hướng dẫn).
                      Muốn gửi cho nhiều nơi: ngăn cách bằng dấu phẩy.

   Tài liệu API: https://docs.zaloplatforms.com/docs/BOT/apis/sendMessage
   Giới hạn của Zalo: mỗi tin 1–2000 ký tự → tin dài hơn được cắt thành nhiều tin.

   Gửi dạng chữ thường (không parse_mode) cho chắc: mọi định dạng Telegram
   (<b>, *đậm*...) được gỡ ra trước khi gửi.
*/

'use strict';

const API = 'https://bot-api.zaloplatforms.com/bot';
const GIOI_HAN = 2000;

/* Gỡ thẻ HTML / ký hiệu Markdown kiểu Telegram, trả về chữ thường */
function chuThuong(s) {
  return String(s == null ? '' : s)
    .replace(/<a\s+href="tel:[^"]*">([^<]*)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\*/g, '')
    .trim();
}

/* Cắt theo dòng để không chặt đôi một dòng thông tin */
function catTin(text) {
  if (text.length <= GIOI_HAN) return [text];
  const phan = [];
  let cur = '';
  for (const dong of text.split('\n')) {
    const them = cur ? cur + '\n' + dong : dong;
    if (them.length > GIOI_HAN) {
      if (cur) phan.push(cur);
      cur = dong.slice(0, GIOI_HAN);
    } else {
      cur = them;
    }
  }
  if (cur) phan.push(cur);
  return phan;
}

/* Không bao giờ ném lỗi — lỗi Zalo không được làm hỏng Telegram hay việc lưu đơn */
async function guiZalo(text) {
  const token = process.env.ZALO_BOT_TOKEN;
  const ds = String(process.env.ZALO_CHAT_ID || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!token || !ds.length) return false;

  const noiDung = chuThuong(text);
  if (!noiDung) return false;

  let ok = true;
  for (const chatId of ds) {
    for (const phan of catTin(noiDung)) {
      try {
        const r = await fetch(API + token + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: phan })
        });
        const kq = await r.json().catch(() => ({}));
        if (!r.ok || kq.ok === false) {
          ok = false;
          console.error('Zalo lỗi:', chatId, r.status, JSON.stringify(kq));
        }
      } catch (e) {
        ok = false;
        console.error('Không gọi được Zalo:', e.message);
      }
    }
  }
  return ok;
}

module.exports = { guiZalo, chuThuong };
