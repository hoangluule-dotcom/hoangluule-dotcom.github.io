/* DBV247 — Hàm NỀN chạy các việc của Bot em gái DBV: việc theo lịch, chạy thử,
   đăng lời khen, chào thành viên mới. Chỉ nhận lời gọi nội bộ
   (header x-noi-bo = ZALO_GT_WEBHOOK_SECRET). Xem lib/giai-tri-tu-dong.js. */
'use strict';
const G = require('./lib/giai-tri-tu-dong');
const { guiDen } = require('./lib/zalo');

exports.handler = async function (event) {
  const secret = process.env.ZALO_GT_WEBHOOK_SECRET, token = process.env.ZALO_GT_BOT_TOKEN;
  if (!secret || (event.headers || {})['x-noi-bo'] !== secret) return { statusCode: 403 };
  let d = {};
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400 }; }
  const nhom = (d.chatIds && d.chatIds.length) ? d.chatIds
    : String(process.env.ZALO_GT_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  const gui = async (chatId, text) => guiDen(chatId, text, token);
  const guiTatCa = async (text) => { for (const g of nhom) await gui(g, text); };

  if (d.khen) {
    try { await guiTatCa(await G.vietKhen(d.khen)); }
    catch (e) { await guiTatCa('🌟 GÓC KHEN: ' + (d.khen.tu ? d.khen.tu + ' khen ' : '') + d.khen.than + ' 👏👏 Cả nhà thả tim nào!'); }
    return { statusCode: 200 };
  }
  if (d.chaoMung) {
    try { const s = await G.chaoMung(d.chaoMung); if (s) await guiTatCa(s); }
    catch (e) { console.error('chao-mung:', e.message); }
    return { statusCode: 200 };
  }
  for (const v of d.viec || []) {
    try {
      const kq = await G.viec(v, { nhom, thu: !!d.thu });
      for (const x of kq) {
        if (typeof x === 'string') await guiTatCa(x);
        else await gui(x.chatId, x.text);
      }
      console.log('giaitri-viec:', v, kq.length, 'tin');
    } catch (e) {
      console.error('giaitri-viec', v, e.message);
      if (d.thu) await guiTatCa('(Thử "' + v + '") lỗi: ' + String(e.message).slice(0, 150));
    }
  }
  return { statusCode: 200 };
};
