/* Kiểm thử header: hotline dạng chữ + nút Đăng nhập nền xanh (desktop), và
   lối vào cộng tác viên nằm trong hamburger (mobile).
   Chạy: node scripts/test_header.mjs

   Soát TOÀN BỘ trang HTML của site, không chỉ vài trang mẫu — đây là loại thay
   đổi mà sót một trang thì không ai nhìn ra cho tới khi khách phàn nàn.

   Ý ĐỒ THIẾT KẾ mà bộ test này khoá lại:
     · Desktop: hotline (icon + chữ, MÀU XANH, KHÔNG phải nút) đứng BÊN TRÁI
       nút Đăng nhập (nền xanh, chữ trắng). Chỉ một hành động nổi bật.
     · Mobile ≤640px: cả hotline và nút Đăng nhập ẩn khỏi header — lối vào cộng
       tác viên là mục ĐẦU TIÊN trong panel Danh mục; gọi điện đã có ở thanh CTA
       dưới cùng.
     · Cụm cũ "kính lúp + Nhận tư vấn" không được quay lại. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Màu thương hiệu — phải khớp --g trong bảng biến của mọi trang. */
const XANH = 'rgb(0, 116, 55)';
const TRANG = 'rgb(255, 255, 255)';

let dat = 0, truot = 0;
const kiemTra = (t, dk, ct) => {
  if (dk) { dat++; console.log('  đạt   ' + t); }
  else { truot++; console.log('  TRƯỢT ' + t + (ct ? '  → ' + ct : '')); }
};

const LOAI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
};
const may = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  let f = path.join(GOC, p);
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': LOAI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => may.listen(8893, ok));
const CS = 'http://127.0.0.1:8893';

/* ── Soát mã nguồn mọi trang ───────────────────────────────────────────── */
console.log('\n── Soát mã nguồn toàn bộ trang ──');
const moiTrang = [];
for (const d of ['', 'tin-tuc']) {
  const thuMuc = path.join(GOC, d);
  for (const f of fs.readdirSync(thuMuc)) {
    if (!f.endsWith('.html')) continue;
    if (f === 'google067cc8913a387cda.html') continue;
    moiTrang.push(path.join(d, f));
  }
}
const loi = {
  thieuNut: [], thieuMucMenu: [], conSearch: [], thieuHotline: [], hotlineDangNut: [],
  conTuVan: [], thieuMenu: [], saiThuTu: [],
};
for (const f of moiTrang) {
  const s = fs.readFileSync(path.join(GOC, f), 'utf8');
  const i = s.indexOf('<header class="hdr"');
  if (i < 0) continue;
  const hd = s.slice(i, s.indexOf('</header>', i) + 9);
  if (!hd.includes('id="hdr-dangnhap"')) loi.thieuNut.push(f);
  if (!hd.includes('id="menu-dangnhap"')) loi.thieuMucMenu.push(f);
  if (hd.includes('class="hdr-search"')) loi.conSearch.push(f);
  /* Hotline PHẢI còn — nhưng là thẻ <a class="hdr-hotline">, không phải button */
  if (!hd.includes('class="hdr-hotline"')) loi.thieuHotline.push(f);
  if (/<button[^>]*hdr-hotline|hdr-hotline[^>]*btn-/.test(hd)) loi.hotlineDangNut.push(f);
  if (hd.includes('btn-consult-hdr')) loi.conTuVan.push(f);
  if (!hd.includes('btn-catalog-hdr')) loi.thieuMenu.push(f);
  /* Hotline đứng TRƯỚC nút Đăng nhập trong DOM — nguồn duy nhất quyết định thứ
     tự trái/phải, vì .hdr-actions là flex không đảo chiều. */
  const vtHotline = hd.indexOf('class="hdr-hotline"');
  const vtNut = hd.indexOf('id="hdr-dangnhap"');
  if (vtHotline < 0 || vtNut < 0 || vtHotline > vtNut) loi.saiThuTu.push(f);
}
kiemTra('cả ' + moiTrang.length + ' trang đều có nút Đăng nhập trong header',
  loi.thieuNut.length === 0, loi.thieuNut.slice(0, 5).join(', '));
kiemTra('cả ' + moiTrang.length + ' trang đều có mục Đăng nhập trong hamburger',
  loi.thieuMucMenu.length === 0, loi.thieuMucMenu.slice(0, 5).join(', '));
kiemTra('không trang nào còn nút tìm kiếm trong header',
  loi.conSearch.length === 0, loi.conSearch.slice(0, 5).join(', '));
kiemTra('không trang nào còn nút Nhận tư vấn trong header',
  loi.conTuVan.length === 0, loi.conTuVan.slice(0, 5).join(', '));
kiemTra('mọi trang đều có CTA hotline trong header',
  loi.thieuHotline.length === 0, loi.thieuHotline.slice(0, 5).join(', '));
kiemTra('hotline là liên kết chữ, không phải button',
  loi.hotlineDangNut.length === 0, loi.hotlineDangNut.slice(0, 5).join(', '));
kiemTra('hotline đứng trước nút Đăng nhập ở mọi trang',
  loi.saiThuTu.length === 0, loi.saiThuTu.slice(0, 5).join(', '));
kiemTra('nút menu Danh mục (điều hướng mobile) vẫn còn nguyên',
  loi.thieuMenu.length === 0, loi.thieuMenu.slice(0, 5).join(', '));

/* ── Hiển thị thật ─────────────────────────────────────────────────────── */
const tb = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' })
  .catch(() => chromium.launch());
const loiJs = [];

async function xem(url, rong, truoc) {
  const c = await tb.newContext({ viewport: { width: rong, height: 900 } });
  const t = await c.newPage();
  t.on('pageerror', (e) => loiJs.push(url + '@' + rong + ' :: ' + e.message));
  t.on('console', (m) => {
    if (m.type() !== 'error') return;
    const x = m.text();
    if (/Failed to load resource|net::ERR_/.test(x)) return;
    loiJs.push(url + ' :: console ' + x);
  });
  if (truoc) await truoc(t, c);
  await t.goto(CS + url, { waitUntil: 'load' });
  await t.waitForTimeout(450);
  const r = await t.evaluate(() => {
    const nut = document.getElementById('hdr-dangnhap');
    const htl = document.querySelector('.hdr-hotline');
    const muc = document.getElementById('menu-dangnhap');
    const hien = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
    const b = nut ? nut.getBoundingClientRect() : null;
    const bh = htl ? htl.getBoundingClientRect() : null;
    const s = nut ? getComputedStyle(nut) : null;
    const sh = htl ? getComputedStyle(htl) : null;
    return {
      co: !!nut,
      hien: hien(nut),
      nhan: nut ? (nut.querySelector('.btn-login-tx') || {}).textContent : '',
      href: nut ? nut.getAttribute('href') : '',
      nen: s ? s.backgroundColor : '',
      chu: s ? s.color : '',
      phai: b ? Math.round(window.innerWidth - b.right) : -1,
      /* Hotline */
      htlCo: !!htl,
      htlHien: hien(htl),
      htlChu: sh ? sh.color : '',
      htlNen: sh ? sh.backgroundColor : '',
      htlVien: sh ? sh.borderTopWidth : '',
      htlHref: htl ? htl.getAttribute('href') : '',
      htlTheTen: htl ? htl.tagName : '',
      htlCoIcon: !!(htl && htl.querySelector('svg')),
      /* Hotline bên trái nút Đăng nhập */
      htlBenTrai: (b && bh) ? bh.right <= b.left + 1 : false,
      htlCungHang: (b && bh) ? Math.abs((bh.top + bh.bottom) / 2 - (b.top + b.bottom) / 2) < 12 : false,
      /* Mục trong hamburger */
      mucCo: !!muc,
      mucNhan: muc ? (muc.querySelector('.btn-login-tx') || {}).textContent : '',
      mucHref: muc ? muc.getAttribute('href') : '',
      /* 26/09/2026: panel mobile có thanh logo + nút đóng (.cat-dd-top) ở trên cùng —
         mục Đăng nhập là mục ĐẦU TIÊN ngay dưới thanh đó. */
      mucDauTien: !!(muc && muc.parentElement && muc.parentElement.querySelector(':scope > :not(.cat-dd-top)') === muc),
      kinhLup: !!document.querySelector('.hdr-actions .dbv-btn-search, .hdr-actions .hdr-search'),
      danhMuc: hien(document.querySelector('.btn-catalog-hdr')),
      tran: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  await c.close();
  return r;
}

console.log('\n── Desktop 1440px ──');
{
  const r = await xem('/', 1440);
  kiemTra('nút Đăng nhập hiện trên trang chủ', r.hien);
  kiemTra('nhãn là "Đăng nhập"', r.nhan.trim() === 'Đăng nhập', r.nhan);
  kiemTra('trỏ tới /ctv', r.href === '/ctv', r.href);
  kiemTra('nền nút là xanh thương hiệu', r.nen === XANH, r.nen);
  kiemTra('chữ trên nút màu trắng', r.chu === TRANG, r.chu);
  kiemTra('nằm sát mép phải (cách ≤ 60px)', r.phai >= 0 && r.phai <= 60, 'cách ' + r.phai + 'px');
  kiemTra('không còn nút kính lúp nào trong header', !r.kinhLup);
  kiemTra('không tràn ngang', !r.tran);
}
console.log('\n── CTA hotline (desktop) ──');
{
  const r = await xem('/', 1440);
  kiemTra('hotline hiện trong header', r.htlHien);
  kiemTra('là thẻ liên kết <a>, không phải <button>', r.htlTheTen === 'A', r.htlTheTen);
  kiemTra('gọi đúng số 0869656561', r.htlHref === 'tel:0869656561', r.htlHref);
  kiemTra('có icon đi kèm chữ', r.htlCoIcon);
  kiemTra('chữ màu xanh thương hiệu', r.htlChu === XANH, r.htlChu);
  kiemTra('KHÔNG có nền (không phải button)',
    /rgba\(0, 0, 0, 0\)|transparent/.test(r.htlNen), r.htlNen);
  kiemTra('KHÔNG có viền (không phải button)',
    r.htlVien === '0px' || r.htlVien === '', r.htlVien);
  kiemTra('đứng bên TRÁI nút Đăng nhập', r.htlBenTrai);
  kiemTra('cùng hàng ngang với nút Đăng nhập', r.htlCungHang);
}
{
  const r = await xem('/bao-hiem-suc-khoe', 1440);
  kiemTra('trang sản phẩm cũng có nút, đúng nhãn và màu',
    r.hien && r.nhan.trim() === 'Đăng nhập' && r.nen === XANH, r.nhan + ' / ' + r.nen);
  kiemTra('trang sản phẩm: hotline xanh, bên trái nút',
    r.htlHien && r.htlChu === XANH && r.htlBenTrai, r.htlChu);
  kiemTra('trang sản phẩm không còn kính lúp', !r.kinhLup);
}
{
  const r = await xem('/tin-tuc/bao-hiem-xe-limo-green-phi-bao-nhieu', 1440);
  kiemTra('trang tin tức (bảng biến riêng) vẫn ra đúng màu nền nút',
    r.nen === XANH, r.nen);
  kiemTra('trang tin tức: hotline đúng màu xanh', r.htlChu === XANH, r.htlChu);
}

console.log('\n── Điện thoại 390px: lối vào nằm trong hamburger ──');
for (const u of ['/', '/bao-hiem-tnds-xemay', '/tin-tuc/bao-hiem-xe-limo-green-phi-bao-nhieu']) {
  const r = await xem(u, 390);
  kiemTra(u + ' — nút Đăng nhập ẩn khỏi header (nhường chỗ cho logo)', !r.hien);
  kiemTra(u + ' — hotline cũng ẩn khỏi header', !r.htlHien);
  kiemTra(u + ' — mục Đăng nhập nằm đầu panel Danh mục', r.mucCo && r.mucDauTien);
  kiemTra(u + ' — nhãn mục là "Đăng nhập cộng tác viên"',
    (r.mucNhan || '').trim() === 'Đăng nhập cộng tác viên', r.mucNhan);
  kiemTra(u + ' — mục trỏ tới /ctv', r.mucHref === '/ctv', r.mucHref);
  kiemTra(u + ' — nút Danh mục vẫn hiện (điều hướng mobile)', r.danhMuc);
  kiemTra(u + ' — không tràn ngang', !r.tran);
}

console.log('\n── Mở hamburger trên mobile thì thấy và bấm được ──');
{
  const c = await tb.newContext({ viewport: { width: 390, height: 844 } });
  const t = await c.newPage();
  await t.goto(CS + '/', { waitUntil: 'load' });
  await t.waitForTimeout(400);
  await t.click('.btn-catalog-hdr');
  await t.waitForTimeout(350);
  const r = await t.evaluate(() => {
    const m = document.getElementById('menu-dangnhap');
    const b = m ? m.getBoundingClientRect() : null;
    const dd = document.getElementById('cat-dropdown');
    return {
      moRa: !!dd && dd.classList.contains('open'),
      thay: !!b && b.width > 0 && b.height > 0,
      trongTamNhin: !!b && b.top >= 0 && b.top < window.innerHeight,
      cao: b ? Math.round(b.height) : 0,
      mauChu: m ? getComputedStyle(m).color : '',
    };
  });
  kiemTra('panel Danh mục mở được', r.moRa);
  kiemTra('mục Đăng nhập nhìn thấy ngay, không phải cuộn', r.thay && r.trongTamNhin);
  kiemTra('vùng bấm cao ≥ 40px (ngón tay bấm được)', r.cao >= 40, r.cao + 'px');
  kiemTra('mục Đăng nhập nổi bật bằng màu xanh thương hiệu', r.mauChu === XANH, r.mauChu);
  await t.click('#menu-dangnhap');
  await t.waitForTimeout(600);
  kiemTra('bấm vào thì sang trang /ctv', /\/ctv$/.test(t.url()), t.url());
  await c.close();
}

console.log('\n── Đã đăng nhập thì đổi nhãn ở CẢ HAI lối vào ──');
{
  const r = await xem('/', 1440, async (t, c) => {
    await c.addInitScript(() => {
      try { localStorage.setItem('dbv_ctv_token', 'token-gia-de-test'); } catch (e) {}
    });
  });
  kiemTra('nút header đổi thành "Bảng điều khiển"', r.nhan.trim() === 'Bảng điều khiển', r.nhan);
  kiemTra('nút header trỏ thẳng vào /ctv-dashboard', r.href === '/ctv-dashboard', r.href);
  kiemTra('mục hamburger đổi thành "Bảng điều khiển cộng tác viên"',
    (r.mucNhan || '').trim() === 'Bảng điều khiển cộng tác viên', r.mucNhan);
  kiemTra('mục hamburger cũng trỏ vào /ctv-dashboard', r.mucHref === '/ctv-dashboard', r.mucHref);
  kiemTra('nút vẫn giữ nền xanh khi đã đăng nhập', r.nen === XANH, r.nen);
}
{
  const r = await xem('/', 390, async (t, c) => {
    await c.addInitScript(() => {
      try { localStorage.setItem('dbv_ctv_token', 'token-gia-de-test'); } catch (e) {}
    });
  });
  kiemTra('mobile: mục hamburger cũng đã đổi nhãn',
    (r.mucNhan || '').trim() === 'Bảng điều khiển cộng tác viên', r.mucNhan);
}

console.log('\n── Hộp tìm kiếm vẫn gọi được từ mã ──');
{
  const c = await tb.newContext({ viewport: { width: 1440, height: 900 } });
  const t = await c.newPage();
  await t.goto(CS + '/', { waitUntil: 'load' });
  await t.waitForTimeout(400);
  const ok = await t.evaluate(() => typeof (window.DBV || {}).moTimKiem === 'function');
  kiemTra('window.DBV.moTimKiem vẫn còn (gắn lại chỗ khác được)', ok);
  await c.close();
}

kiemTra('không có lỗi JavaScript nào', loiJs.length === 0, loiJs.slice(0, 4).join(' ;; '));

await tb.close();
may.close();
console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
