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
const DAY = require('./lib/day-bot');
const SN = require('./lib/sinh-nhat');  // danh sách sinh nhật + tự chúc
const NS = require('./lib/nhan-su');    // danh sách nhân sự (tên, phòng, ngày vào DBV)
const G = require('./lib/giai-tri-tu-dong');  // đố vui, góc khen, chào mừng, lịch tự động

/* Giao việc cho hàm nền (gọi AI mất vài giây) */
async function goiNen(body) {
  const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
  await fetch(goc + '/.netlify/functions/zalo-giaitri-lich-background', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-noi-bo': process.env.ZALO_GT_WEBHOOK_SECRET },
    body: JSON.stringify(body),
  }).catch((e) => console.error('giaitri goiNen:', e.message));
}
const dd2 = (n) => String(n).padStart(2, '0');
const VIEC_THU = ['dovui', 'dovuisp', 'thuhai', 'thusau', 'caphe', 'le', 'thamnien', 'tongket'];  // "học: … | …" — quản trị dạy bot ngay trong Zalo

const tenBot = () => (process.env.ZALO_GT_BOT_NAME || 'Bot em gái DBV').trim();

function boTag(text) {
  const esc = tenBot().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text || '').replace(new RegExp('@' + esc, 'gi'), ' ').replace(/\s+/g, ' ').trim();
}

/* Quản trị viên được chat riêng với bot đầy đủ chức năng (không cần nằm trong danh sách nhóm) */
const laQuanTri = (bien, id) => !!id && String(process.env[bien] || '').split(',').map((s) => s.trim()).includes(id);

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
  if (ev.event_name && ev.event_name !== 'message.text.received' && !String(msg.text || '').trim()) {
    console.log('Zalo GT sự kiện khác:', ev.event_name, JSON.stringify(msg).slice(0, 800));
    if (laQuanTri('ZALO_GT_ADMIN_ID', msg.from && msg.from.id) && /unsupported|link/.test(ev.event_name)) {
      await guiDen(chat.id, 'Zalo không chuyển tin chứa link cho bot, nên em chưa đọc được 😅\n' +
        'Anh/chị gửi lại theo 1 trong 2 cách:\n' +
        '1) Gõ chữ trước link: học: drive.google.com/file/d/...\n' +
        '2) Chỉ gửi MÃ tài liệu (đoạn dài nằm giữa /d/ và /view hoặc /edit trong link):\n   học: 1AbCdEfGhIjKlMnOpQrStUvWxYz', token);
    }
    return { statusCode: 200, body: 'skip' };  // ảnh/sticker của người khác: im lặng cho đỡ ồn
  }

  const cau = boTag(msg.text);
  const nguoi = (msg.from && msg.from.display_name) || '';
  console.log('Zalo GT:', chat.chat_type, chat.id, nguoi, '|', cau.slice(0, 200));

  /* Lệnh sinh nhật (sinh nhật: … / ds sinh nhật / xoá sinh nhật: … / thử chúc sinh nhật) */
  try {
    const sn = await SN.xuLyLenh(cau, { laAdmin: laQuanTri('ZALO_GT_ADMIN_ID', msg.from && msg.from.id) });
    if (sn && sn.thuChuc) {
      const tin = await SN.tinHomNay(true, 6000);  // hàm thường bị cắt ở 10 giây
      for (const t of tin) await guiDen(chat.id, t, token);
      return { statusCode: 200, body: 'ok' };
    }
    if (sn) { await guiDen(chat.id, sn, token); return { statusCode: 200, body: 'ok' }; }
  } catch (e) {
    console.error('sinh-nhat:', e.message);
    await guiDen(chat.id, 'Em chưa xử lý được lệnh sinh nhật (lỗi kho lưu), anh/chị thử lại sau nhé.', token);
    return { statusCode: 200, body: 'ok' };
  }

  /* Lệnh quản trị: nhân sự, chạy thử, chào mừng thành viên mới */
  const laAdminGT = laQuanTri('ZALO_GT_ADMIN_ID', msg.from && msg.from.id);
  try {
    const ns = await NS.xuLyLenh(cau, { laAdmin: laAdminGT });
    if (ns) { await guiDen(chat.id, ns, token); return { statusCode: 200, body: 'ok' }; }
  } catch (e) { console.error('nhan-su:', e.message); }
  const kdCau = DAY.boDau(cau);
  if (laAdminGT && /^thu\s*:/.test(kdCau)) {
    const v = kdCau.replace(/^thu\s*:/, '').trim().replace(/\s+/g, '');
    if (!VIEC_THU.includes(v)) { await guiDen(chat.id, 'Chạy thử được: ' + VIEC_THU.join(', ') + '\nVd: thử: dovui', token); return { statusCode: 200, body: 'ok' }; }
    await guiDen(chat.id, '⏳ Đang chạy thử "' + v + '" vào cuộc trò chuyện này…', token);
    await goiNen({ viec: [v], chatIds: [chat.id], thu: true });
    return { statusCode: 200, body: 'ok' };
  }
  /* "trạng thái bot": chẩn đoán lịch tự động (có chạy không, lỗi gì, dữ liệu đủ chưa) */
  if (laAdminGT && /^trang thai( bot)?\s*$/.test(kdCau)) {
    const fmt = (iso) => iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'CHƯA TỪNG CHẠY';
    const t = G.bayGio();
    const [nl, ns2, sn, ns, da] = await Promise.all([G.doc('nhip/lich', null), G.doc('nhip/sinh-nhat', null),
      SN.docDs(), NS.docNs(), G.doc('lich-da-chay', {})]);
    const viecs = ['dovui', 'dovuisp', 'thuhai', 'thusau', 'le', 'thamnien', 'tongket'];
    const nv = await Promise.all(viecs.map((v) => G.doc('nhip/viec/' + v, null)));
    const dongViec = viecs.map((v, i) => nv[i] ? '- ' + v + ': ' + fmt(nv[i].luc) + (nv[i].loi ? ' ❌ ' + nv[i].loi : ' ✓ ' + nv[i].so_tin + ' tin') + (nv[i].thu ? ' (thử)' : '') : null).filter(Boolean);
    await guiDen(chat.id, '🩺 TRẠNG THÁI BOT (' + dd2(t.d) + '/' + dd2(t.m) + ' ' + t.h + 'h)\n' +
      'Lịch mỗi giờ: ' + (nl ? fmt(nl.luc) + (nl.loi ? ' ❌ ' + nl.loi : '') : 'CHƯA TỪNG CHẠY ❌') + '\n' +
      'Sinh nhật 8:00: ' + (ns2 ? fmt(ns2.luc) + ' · ' + (ns2.loi ? '❌ ' + ns2.loi : (ns2.trang_thai || '') + (ns2.so_tin != null ? ', ' + ns2.so_tin + ' tin' : '')) : 'CHƯA TỪNG CHẠY ❌') + '\n' +
      'Danh sách sinh nhật: ' + sn.length + ' người · Nhân sự: ' + ns.length + ' người\n' +
      'Nhóm nhận tin (ZALO_GT_CHAT_ID): ' + (process.env.ZALO_GT_CHAT_ID ? 'có' : 'THIẾU ❌') + (process.env.ZALO_GT_TAT ? ' · Đang tắt: ' + process.env.ZALO_GT_TAT : '') + '\n' +
      'Việc đến hạn giờ này: ' + (G.viecTheoGio(t).join(', ') || 'không') + '\n' +
      'Đã chạy hôm nay: ' + (Object.keys(da).filter((k) => da[k] === t.ngay).join(', ') || 'chưa') +
      (dongViec.length ? '\nLần chạy gần nhất:\n' + dongViec.join('\n') : ''), token);
    return { statusCode: 200, body: 'ok' };
  }

  if (laAdminGT && /^chao mung\s*:/.test(kdCau)) {
    await goiNen({ chaoMung: cau, chatIds: [chat.id] });
    return { statusCode: 200, body: 'ok' };
  }

  /* Lệnh dạy bot — chỉ ZALO_GT_ADMIN_ID được dạy; kho 'giai-tri' chỉ bot này dùng */
  try {
    const tl = await DAY.xuLyLenh(cau, { ten: 'giai-tri', bienAdmin: 'ZALO_GT_ADMIN_ID',
      idNguoi: (msg.from && msg.from.id) || '', tenNguoi: nguoi });
    if (tl && tl.docTaiLieu) {
      /* "học: <link>" → hàm nền đọc tài liệu, gửi bản xem trước, chờ "lưu" */
      await guiDen(chat.id, '📥 Em đang đọc tài liệu, khoảng 10–40 giây nữa sẽ gửi bản tóm tắt để anh/chị duyệt…', token);
      const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
      await fetch(goc + '/.netlify/functions/zalo-hoc-tai-lieu-background', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-noi-bo': secret },
        body: JSON.stringify({ bot: 'gt', chatId: chat.id, idNguoi: (msg.from && msg.from.id) || '', url: tl.docTaiLieu })
      }).catch((e) => console.error('hoc-tai-lieu dispatch:', e.message));
      return { statusCode: 200, body: 'ok' };
    }
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
  /* Đố vui: ai reply/tag đúng đáp án câu đố đang mở → chúc mừng + cộng điểm */
  if (duocPhep(chat.id) || laAdminGT) {
    try {
      const dung = await G.kiemTraDapAn(chat.id, cau, { id: (msg.from && msg.from.id) || '', ten: nguoi });
      if (dung) { await guiDen(chat.id, dung, token); return { statusCode: 200, body: 'ok' }; }
      if (/^(bxh|bang xep hang)\b/.test(kdCau)) {
        const diem = await G.diemThang(G.bayGio().thang);
        await guiDen(chat.id, Object.keys(diem).length ? '🏆 Bảng xếp hạng đố vui tháng này:\n' + G.bangXep(diem, 10)
          : 'Tháng này chưa ai ghi điểm. 15:00 các ngày làm việc có đố vui trà chiều nha 🍵', token);
        return { statusCode: 200, body: 'ok' };
      }
      if (/^khen\s*:/.test(kdCau) && !G.tat('khen')) {
        const k = await G.khen(cau, { ten: nguoi });
        if (k.loi) { await guiDen(chat.id, k.loi, token); return { statusCode: 200, body: 'ok' }; }
        await goiNen({ khen: k, chatIds: [chat.id] });
        return { statusCode: 200, body: 'ok' };
      }
    } catch (e) { console.error('giaitri lenh:', e.message); }
  }

  if (!duocPhep(chat.id) && !laQuanTri('ZALO_GT_ADMIN_ID', msg.from && msg.from.id)) {
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
