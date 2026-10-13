/* DBV247 — Lịch tự động của Bot em gái DBV. Chạy MỖI GIỜ (netlify.toml),
   xem giờ Việt Nam để quyết định việc gì (lib/giai-tri-tu-dong.js → viecTheoGio),
   rồi giao cho hàm nền zalo-giaitri-lich-background.js (gọi AI mất vài giây,
   hàm theo lịch bị cắt ở 30 giây). Mỗi việc chạy THÀNH CÔNG 1 lần/ngày; lỗi thì giờ sau (trong khung giờ) chạy bù. */
'use strict';
const G = require('./lib/giai-tri-tu-dong');

exports.handler = async function () {
  const secret = process.env.ZALO_GT_WEBHOOK_SECRET;
  if (!process.env.ZALO_GT_BOT_TOKEN || !secret || !process.env.ZALO_GT_CHAT_ID) return { statusCode: 200 };
  const t = G.bayGio();
  let viec = G.viecTheoGio(t);
  if (!viec.length) return { statusCode: 200 };
  // Bỏ việc đã chạy THÀNH CÔNG hôm nay, và việc đang chạy dở (dưới 50 phút)
  const da = await G.doc('lich-da-chay', {});
  const dang = await G.doc('lich-dang-chay', {});
  const nay = Date.now();
  viec = viec.filter((v) => da[v] !== t.ngay && !(dang[v] && nay - dang[v] < 50 * 60e3));
  if (!viec.length) return { statusCode: 200 };
  viec.forEach((v) => (dang[v] = nay));
  await G.ghi('lich-dang-chay', dang);
  const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
  const r = await fetch(goc + '/.netlify/functions/zalo-giaitri-lich-background', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-noi-bo': secret }, body: JSON.stringify({ viec, ngay: t.ngay }),
  }).catch((e) => ({ status: 0, e }));
  console.log('giaitri-lich:', t.ngay, t.h + 'h', viec.join(','), '→', r.status);
  return { statusCode: 200 };
};
