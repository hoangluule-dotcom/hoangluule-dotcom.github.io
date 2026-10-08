/* DBV247 — Nhật ký hội thoại chatbot (Netlify Blobs, store "dbv247-chat-log")
   ===========================================================================
   Mục đích: biết bot trả lời sai/không trả lời được câu gì để bổ sung
   kien-thuc/hoi-dap.md. Báo cáo tuần: chat-bao-cao-background.js.

   Khoá: "phien/<ngày VN>/<mã phiên>" → { sid, ngay, page, lead, luot:[{t,q,a,nhom,cc,kb,vote}] }
   Một phiên chỉ do một trình duyệt ghi tuần tự nên không tranh ghi.

   Bảo vệ dữ liệu cá nhân (NĐ 13/2023): trước khi lưu, mọi dãy số dài từ 8 chữ số
   (SĐT, CCCD, số tài khoản, biển số dạng số) đều bị che. Tự xoá sau 90 ngày.
   Ghi lỗi không bao giờ làm hỏng câu trả lời cho khách.
*/
'use strict';

const { getStore } = require('@netlify/blobs');
const SITE_ID = 'df7ffacd-8e52-4769-b95b-23c978b36e29';
const STORE = 'dbv247-chat-log';

function kho() {
  try { return getStore({ name: STORE, consistency: 'strong' }); }
  catch (e) {
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!token) return null;
    return getStore({ name: STORE, siteID: process.env.SITE_ID || SITE_ID, token, consistency: 'strong' });
  }
}

function ngayVN(ms) {
  return new Date((ms || Date.now()) + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function che(s, max) {
  return String(s || '')
    .replace(/(\+?\d[\d\s.\-]{7,}\d)/g, (m) => {
      if (/^\d{1,3}([.,]\d{3}){2,}$/.test(m.trim())) return m;   // số tiền dạng 450.000.000 — giữ lại
      return m.replace(/\D/g, '').length >= 8 ? '[số đã ẩn]' : m;
    })
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, '[email đã ẩn]')
    .slice(0, max || 600);
}

const sidHopLe = (sid) => /^[a-z0-9]{8,32}$/i.test(String(sid || ''));

/* Dấu hiệu bot không trả lời được — để báo cáo tuần gom lại */
const KHONG_BIET = /(chưa có thông tin|không có thông tin|chưa có dữ liệu|em chưa nắm|chưa thể trả lời|không thể trả lời|ngoài phạm vi)/i;

async function ghiLuot(o) {
  if (!sidHopLe(o.sid)) return -1;
  const k = kho(); if (!k) return -1;
  try {
    const key = 'phien/' + ngayVN() + '/' + o.sid;
    const p = (await k.get(key, { type: 'json' })) || { sid: o.sid, ngay: ngayVN(), page: che(o.page, 200), luot: [] };
    if (p.luot.length >= 60) return -1;
    p.luot.push({
      t: Date.now(), q: che(o.q, 600), a: che(o.a, 1500), nhom: o.nhom || '',
      cc: (o.congCu || []).slice(0, 5), kb: KHONG_BIET.test(o.a || '') ? 1 : 0,
    });
    await k.setJSON(key, p);
    return p.luot.length - 1;
  } catch (e) { console.error('nhat-ky ghi:', e.message); return -1; }
}

async function capNhatPhien(sid, ham) {
  if (!sidHopLe(sid)) return false;
  const k = kho(); if (!k) return false;
  // phiên có thể bắt đầu hôm qua (chat qua nửa đêm): thử hôm nay rồi hôm qua
  for (const ng of [ngayVN(), ngayVN(Date.now() - 864e5)]) {
    const key = 'phien/' + ng + '/' + sid;
    try {
      const p = await k.get(key, { type: 'json' });
      if (!p) continue;
      if (ham(p) === false) return false;
      await k.setJSON(key, p);
      return true;
    } catch (e) { console.error('nhat-ky cap nhat:', e.message); return false; }
  }
  return false;
}

const danhGia = (sid, i, vote, lyDo) => capNhatPhien(sid, (p) => {
  const l = p.luot[i]; if (!l) return false;
  l.vote = vote > 0 ? 1 : -1;
  if (lyDo) l.lyDo = che(lyDo, 300);
});
const danhDauLead = (sid) => capNhatPhien(sid, (p) => { p.lead = 1; });

/* Đọc các phiên trong n ngày gần nhất */
async function docPhien(soNgay) {
  const k = kho(); if (!k) return [];
  const out = [];
  for (let d = 0; d < soNgay; d++) {
    const ng = ngayVN(Date.now() - d * 864e5);
    const { blobs } = await k.list({ prefix: 'phien/' + ng + '/' });
    for (let i = 0; i < blobs.length; i += 25) {
      const lo = await Promise.all(blobs.slice(i, i + 25).map((b) => k.get(b.key, { type: 'json' }).catch(() => null)));
      lo.forEach((p) => p && out.push(p));
    }
  }
  return out;
}

/* Xoá nhật ký quá hạn (mặc định 90 ngày) */
async function donCu(giuNgay) {
  const k = kho(); if (!k) return 0;
  const moc = ngayVN(Date.now() - (giuNgay || 90) * 864e5);
  const { blobs } = await k.list({ prefix: 'phien/' });
  let n = 0;
  for (const b of blobs) {
    const ng = b.key.split('/')[1];
    if (ng && ng < moc) { await k.delete(b.key).catch(() => {}); n++; }
  }
  return n;
}

module.exports = { ghiLuot, danhGia, danhDauLead, docPhien, donCu, ngayVN, che, sidHopLe };
