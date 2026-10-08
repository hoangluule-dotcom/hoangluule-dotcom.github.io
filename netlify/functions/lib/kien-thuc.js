/* DBV247 — Tìm đoạn kiến thức khớp câu hỏi (BM25 trên kb-data.js)
   ===========================================================================
   kb-data.js do scripts/build_kb.py sinh ra mỗi lần deploy: ~1.400 đoạn rút từ
   mọi trang web + kien-thuc/hoi-dap.md. Mỗi câu hỏi chỉ lấy vài đoạn khớp nhất
   (không nhồi cả kho vào prompt — tốn token và làm mô hình loãng).

   - Bỏ dấu để "bao hiem oto" vẫn khớp "Bảo hiểm ô tô".
   - Chấm điểm cả từ đơn lẫn cặp từ ("than vo", "chay no") → ít khớp nhầm.
   - Đoạn hỏi–đáp tự viết được ưu tiên; đoạn thuộc trang khách đang xem được cộng điểm.
*/
'use strict';

const KB = require('../kb-data.js');

function boDau(s) {
  return String(s || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

const STOP = new Set(('cua co la va cho toi minh ban duoc khong nhu the nao gi bao nhieu mot cac nhung o tai voi thi ma ra nay do ai khi neu hay xin chao muon can hoi tu van em anh chi a oi nhe vay roi se da dang bi tren duoi trong ngoai').split(' '));

function tachTu(s) {
  const w = boDau(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const don = w.filter((x) => x.length >= 2 && !STOP.has(x));
  const cap = [];
  for (let i = 0; i + 1 < w.length; i++) {
    if (STOP.has(w[i]) && STOP.has(w[i + 1])) continue;
    cap.push(w[i] + '_' + w[i + 1]);
  }
  return don.concat(cap);
}

/* Lập chỉ mục một lần mỗi lần hàm khởi động */
let IDX = null;
function chiMuc() {
  if (IDX) return IDX;
  const tieuDe = {};
  KB.pages.forEach((p) => { tieuDe[p.url] = p.title; });
  const docs = KB.chunks.map((c) => {
    const t = tachTu((tieuDe[c.u] || '') + ' ' + c.h + ' ' + c.h + ' ' + c.x);
    const tf = new Map();
    t.forEach((x) => tf.set(x, (tf.get(x) || 0) + 1));
    return { c, tf, len: t.length };
  });
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, k) => df.set(k, (df.get(k) || 0) + 1)));
  const avg = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
  IDX = { docs, df, avg, N: docs.length, tieuDe };
  return IDX;
}

/**
 * @param {string} cau  câu hỏi (+ vài câu gần nhất)
 * @param {object} [o]  { page: '/duong-dan', k: 6, gioiHan: 7000 }
 * @returns [{u, h, x, title, hd}]
 */
function timDoan(cau, o) {
  o = o || {};
  const I = chiMuc();
  const q = Array.from(new Set(tachTu(cau)));
  if (!q.length) return [];
  const k1 = 1.4, b = 0.7;
  const kq = [];
  for (const d of I.docs) {
    let s = 0;
    for (const t of q) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = I.df.get(t);
      const idf = Math.log(1 + (I.N - n + 0.5) / (n + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / I.avg)) * (t.includes('_') ? 1.6 : 1);
    }
    if (s <= 0) continue;
    if (d.c.hd) s *= 1.5;
    if (o.page && d.c.u === o.page) s *= 1.25;
    kq.push({ d, s });
  }
  kq.sort((a, b2) => b2.s - a.s);
  const k = o.k || 6, gioiHan = o.gioiHan || 7000;
  const out = []; let tong = 0;
  const moiTrang = {};
  for (const { d, s } of kq) {
    if (out.length >= k) break;
    if (out.length && s < kq[0].s * 0.25) break;          // quá kém so với đoạn tốt nhất
    if ((moiTrang[d.c.u] = (moiTrang[d.c.u] || 0) + 1) > 3) continue; // đa dạng nguồn
    if (tong + d.c.x.length > gioiHan && out.length) continue;
    tong += d.c.x.length;
    out.push({ u: d.c.u, h: d.c.h, x: d.c.x, hd: !!d.c.hd, title: d.c.hd ? 'Hỏi–đáp DBV247' : (I.tieuDe[d.c.u] || d.c.u) });
  }
  return out;
}

/* Khối tư liệu cho prompt */
function tuLieu(doan) {
  if (!doan.length) return '(Không có đoạn nào khớp rõ với câu hỏi này.)';
  return doan.map((d) => '### ' + d.title + (d.h ? ' — ' + d.h : '') +
    (d.u.startsWith('/') ? ' (' + d.u + ')' : '') + '\n' + d.x).join('\n\n');
}

/* Tương thích ngược cho zalo-hoidap-background.js và phieu-tu-van-background.js:
   trả về dạng "trang" {title, url, content} như pickPages cũ. */
function pickPages(cau, history) {
  const gan = (history || []).slice(-2).map((m) => m.text).join(' ');
  const doan = timDoan(cau + ' ' + gan, { k: 6 });
  const g = new Map();
  doan.forEach((d) => {
    const key = d.u;
    if (!g.has(key)) g.set(key, { title: d.title, url: d.u.startsWith('/') ? d.u : '', content: '' });
    g.get(key).content += (d.h ? '[' + d.h + '] ' : '') + d.x + '\n';
  });
  return Array.from(g.values());
}

/* Danh mục trang sản phẩm (gọn) để bot gợi đúng đường dẫn */
function danhMucSanPham() {
  return KB.pages.filter((p) => p.sp).map((p) => '- ' + p.title + ' → ' + p.url).join('\n');
}

module.exports = { KB, timDoan, tuLieu, pickPages, danhMucSanPham, boDau };
