/* DBV247 — Lịch gửi báo cáo chatbot: 8:00 sáng thứ Hai (giờ VN) = 01:00 UTC thứ Hai.
   Lịch khai trong netlify.toml ([functions."chat-bao-cao"] schedule).
   Hàm lịch bị Netlify cắt sau 30 giây → chỉ đánh thức hàm nền làm việc nặng. */
'use strict';
exports.handler = async function () {
  const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
  const khoa = process.env.PHIEU_SECRET || process.env.ZALO_WEBHOOK_SECRET || process.env.DASHBOARD_KEY;
  if (!khoa) { console.error('chat-bao-cao: thiếu khoá nội bộ (ZALO_WEBHOOK_SECRET hoặc DASHBOARD_KEY)'); return { statusCode: 500 }; }
  const r = await fetch(goc + '/.netlify/functions/chat-bao-cao-background?ngay=7', { method: 'POST', headers: { 'x-noi-bo': khoa } });
  console.log('chat-bao-cao: hàm nền trả', r.status);
  return { statusCode: 200 };
};
