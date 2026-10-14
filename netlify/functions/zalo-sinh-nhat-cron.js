/* DBV247 — Bot em gái DBV tự chúc sinh nhật trong nhóm giải trí.
   Hàm CHẠY THEO LỊCH: 8:00 sáng giờ VN mỗi ngày (lịch khai trong netlify.toml).
   Gửi tới mọi nhóm trong ZALO_GT_CHAT_ID. Tắt: ZALO_GT_SINH_NHAT=off.
   Chạy tay: Netlify > Functions > zalo-sinh-nhat-cron > "Run now"
   (đã gửi trong ngày rồi thì không gửi lặp). Xem lib/sinh-nhat.js. */
'use strict';

const SN = require('./lib/sinh-nhat');
const DAY = require('./lib/day-bot');
const { guiDen } = require('./lib/zalo');

exports.handler = async function () {
  const nhip = (x) => { const k = DAY.kho(); return k ? k.setJSON('nhip/sinh-nhat', Object.assign({ luc: new Date().toISOString() }, x)).catch(() => {}) : null; };
  await nhip({ trang_thai: 'bat_dau' });
  if (String(process.env.ZALO_GT_SINH_NHAT || '').toLowerCase() === 'off') return { statusCode: 200 };
  const token = process.env.ZALO_GT_BOT_TOKEN;
  const nhom = String(process.env.ZALO_GT_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !nhom.length) { await nhip({ loi: 'thiếu ZALO_GT_BOT_TOKEN hoặc ZALO_GT_CHAT_ID' }); return { statusCode: 200 }; }

  // Chống gửi lặp trong cùng một ngày (lỡ chạy tay thêm lần nữa)
  const h = SN.homNayVN();
  const ngay = h.y + '-' + h.m + '-' + h.d;
  const k = DAY.kho();
  try {
    if (k) {
      const da = await k.get('sinh-nhat-da-gui', { type: 'json' });
      if (da && da.ngay === ngay) { await nhip({ trang_thai: 'da_gui_truoc_do', ngay }); return { statusCode: 200 }; }
    }
  } catch (e) { /* vẫn gửi */ }

  const tin = await SN.tinHomNay(false);
  for (const t of tin) for (const g of nhom) await guiDen(g, t, token);
  if (k) await k.setJSON('sinh-nhat-da-gui', { ngay, so_tin: tin.length }).catch(() => {});
  console.log('sinh-nhat:', ngay, 'gửi', tin.length, 'tin');
  await nhip({ trang_thai: 'xong', ngay, so_tin: tin.length, so_nhom: nhom.length });
  return { statusCode: 200 };
};
