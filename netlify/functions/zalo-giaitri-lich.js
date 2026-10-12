/* DBV247 — Lịch tự động của Bot em gái DBV. Chạy MỖI GIỜ (netlify.toml),
   xem giờ Việt Nam để quyết định việc gì (lib/giai-tri-tu-dong.js → viecTheoGio),
   rồi giao cho hàm nền zalo-giaitri-lich-background.js (gọi AI mất vài giây,
   hàm theo lịch bị cắt ở 30 giây). Mỗi việc chỉ chạy 1 lần/ngày. */
'use strict';
const G = require('./lib/giai-tri-tu-dong');

exports.handler = async function () {
  const secret = process.env.ZALO_GT_WEBHOOK_SECRET;
  if (!process.env.ZALO_GT_BOT_TOKEN || !secret || !process.env.ZALO_GT_CHAT_ID) return { statusCode: 200 };
  const t = G.bayGio();
  let viec = G.viecTheoGio(t);
  if (!viec.length) return { statusCode: 200 };
  const da = await G.doc('lich-da-chay', {});
  viec = viec.filter((v) => da[v] !== t.ngay);
  if (!viec.length) return { statusCode: 200 };
  viec.forEach((v) => (da[v] = t.ngay));
  await G.ghi('lich-da-chay', da);
  const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
  const r = await fetch(goc + '/.netlify/functions/zalo-giaitri-lich-background', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-noi-bo': secret }, body: JSON.stringify({ viec }),
  }).catch((e) => ({ status: 0, e }));
  console.log('giaitri-lich:', t.ngay, t.h + 'h', viec.join(','), '→', r.status);
  return { statusCode: 200 };
};
