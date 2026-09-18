/* Kiểm thử giao diện cổng CTV — chạy: node scripts/test_ctv_giao_dien.mjs
   Dựng một máy chủ tại chỗ mô phỏng Netlify (clean URL + hai function thật),
   rồi mở bằng Chromium để đi hết luồng đăng ký → bảng điều khiển → lưu hồ sơ
   → đăng xuất → đăng nhập lại.

   Cũng so hình học header/footer với một trang chuẩn của site để chắc rằng
   layout không lệch — script sync_layout.py không so được phần này. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

process.env.CTV_TOKEN_SECRET = 'chuoi-bi-mat-dai-hon-16-ky-tu-de-test';
process.env.GAS_KHOA_NOI_BO = 'khoa-noi-bo-de-test-0123456789ab';

/* Apps Script giả — bảng điều khiển nay đọc số liệu từ Google Sheets qua
   hàm gas-ctv, nên phải có một đầu kia trả lời thì trang mới hiện lên. */
const mayGas = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let than = ''; for await (const c of req) than += c;
  const p = Object.fromEntries(new URLSearchParams(req.method === 'POST' ? than : u.search));
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (p.action === 'dangKyCtv') { res.end(JSON.stringify({ ok: true, ctvId: p.ctvId })); return; }
  res.end(JSON.stringify({ ok: true, cap_nhat: '2026-09-17 10:00:00',
    tong_quan: { so_don: 0, so_don_da_tra: 0, doanh_thu: 0,
                 hoa_hong_phat_sinh: 0, hoa_hong_cho_duyet: 0, hoa_hong_da_tra: 0 },
    don: [] }));
});
await new Promise((ok) => mayGas.listen(8902, ok));
process.env.GAS_URL = 'http://127.0.0.1:8902/exec';

const auth = require(path.join(GOC, 'netlify/functions/ctv-auth.js'));
const toi = require(path.join(GOC, 'netlify/functions/ctv-toi.js'));
const gasCtv = require(path.join(GOC, 'netlify/functions/gas-ctv.js'));

let dat = 0, truot = 0;
const kiemTra = (ten, dk, ct) => {
  if (dk) { dat++; console.log('  đạt   ' + ten); }
  else { truot++; console.log('  TRƯỢT ' + ten + (ct ? '  → ' + ct : '')); }
};

const LOAI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml',
};

async function docThan(req) {
  const manh = [];
  for await (const m of req) manh.push(m);
  return Buffer.concat(manh).toString('utf8');
}

const may = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = decodeURIComponent(u.pathname);

  // Hai function
  const fn = p.startsWith('/.netlify/functions/') ? p.slice('/.netlify/functions/'.length) : null;
  if (fn === 'ctv-auth' || fn === 'ctv-toi' || fn === 'gas-ctv') {
    const bo = fn === 'ctv-auth' ? auth : (fn === 'gas-ctv' ? gasCtv : toi);
    const kq = await bo.handler({
      httpMethod: req.method,
      headers: req.headers,
      body: await docThan(req),
    });
    res.writeHead(kq.statusCode, kq.headers || {});
    res.end(kq.body);
    return;
  }

  // Clean URL như Netlify
  if (p === '/') p = '/index.html';
  let f = path.join(GOC, p);
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f = f + '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': LOAI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

await new Promise((ok) => may.listen(8899, ok));
const CS = 'http://127.0.0.1:8899';

const tb = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' })
  .catch(() => chromium.launch());

const loiJs = [];
async function moTrang(ctx, url) {
  const tr = await ctx.newPage();
  tr.on('pageerror', (e) => loiJs.push(url + ' :: ' + e.message));
  /* Bỏ qua lỗi tải tài nguyên: máy chủ test này không có logo, font Google,
     GTM hay khung chat, và container không ra được internet. Chỉ soi lỗi
     JavaScript thật. */
  tr.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::ERR_/.test(t)) return;
    loiJs.push(url + ' :: console ' + t);
  });
  await tr.goto(CS + url, { waitUntil: 'domcontentloaded' });
  return tr;
}

const SDT = '0912345678';
const MK = 'matkhau123';

try {
  /* ── 1440px: luồng đầy đủ ─────────────────────────────────────────────── */
  console.log('\n── Luồng đăng ký và bảng điều khiển (1440px) ──');
  let ctx = await tb.newContext({ viewport: { width: 1440, height: 900 } });
  let tr = await moTrang(ctx, '/ctv');

  kiemTra('trang /ctv có header của site', await tr.locator('header.hdr').count() === 1);
  kiemTra('trang /ctv có footer của site', await tr.locator('footer.ftr').count() === 1);
  kiemTra('mặc định mở tab Đăng nhập', await tr.locator('#pane-login').isVisible());

  // Chặn số sai ngay trên trình duyệt, không gọi mạng
  await tr.click('.au-tab[data-tab="reg"]');
  await tr.fill('#r-ten', 'Nguyễn Văn A');
  await tr.fill('#r-sdt', '02812345678');
  await tr.fill('#r-mk', MK);
  await tr.click('#btn-reg');
  await tr.waitForTimeout(120);
  kiemTra('số cố định bị chặn ngay tại ô, có báo lỗi',
    await tr.locator('#f-r-sdt.err .err-msg').count() === 1);

  // Mật khẩu ngắn
  await tr.fill('#r-sdt', SDT);
  await tr.fill('#r-mk', '123');
  await tr.click('#btn-reg');
  await tr.waitForTimeout(120);
  kiemTra('mật khẩu ngắn bị chặn tại ô', await tr.locator('#f-r-mk.err').count() === 1);

  // Đăng ký thật
  await tr.fill('#r-mk', MK);
  await Promise.all([
    tr.waitForURL('**/ctv-dashboard', { timeout: 8000 }),
    tr.click('#btn-reg'),
  ]);
  kiemTra('đăng ký xong thì nhảy sang bảng điều khiển', tr.url().endsWith('/ctv-dashboard'));

  await tr.waitForSelector('#db-main.show', { timeout: 8000 });
  const ma = (await tr.locator('#ma-ctv').textContent()).trim();
  kiemTra('bảng điều khiển hiện mã CTV 4 ký tự',
    /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(ma), ma);
  kiemTra('link giới thiệu là /r/<MÃ> (đi qua hàm máy chủ để đặt cookie 30 ngày)',
    (await tr.inputValue('#link-gt')).endsWith('/r/' + ma), await tr.inputValue('#link-gt'));
  kiemTra('hiện tên và số điện thoại',
    (await tr.locator('#who').textContent()).includes(SDT));
  kiemTra('băng thông báo "chưa bật ghi nhận" đang hiện',
    await tr.locator('#bang-giai-doan').isVisible());
  const soLieu = await tr.locator('.o .so').allTextContents();
  /* 8 ô: lượt bấm, đơn chờ, đơn đã đối soát, doanh thu, phí trước VAT, VAT,
     hoa hồng khả dụng, đã rút. Ba ô tiền tách bạch là cố ý — hoa hồng tính
     trên phí trước VAT, nên con số đó phải hiện ra để cộng tác viên tự kiểm. */
  kiemTra('cả 8 chỉ số đều là 0', soLieu.length === 8 && soLieu.every((s) => /^0/.test(s.trim())), soLieu.join(' | '));
  kiemTra('ô số điện thoại bị khoá không cho sửa', await tr.locator('#p-sdt').isDisabled());

  // Lưu hồ sơ
  await tr.fill('#p-nh', 'Techcombank');
  await tr.fill('#p-stk', '1903 1234 5678');
  await tr.fill('#p-chu', 'NGUYEN VAN A');
  await tr.click('#btn-save');
  await tr.waitForFunction(() => document.getElementById('hs-msg').textContent.trim().length > 0, null, { timeout: 8000 });
  kiemTra('lưu hồ sơ báo thành công',
    (await tr.locator('#hs-msg').getAttribute('class')).includes('good'),
    await tr.locator('#hs-msg').textContent());
  kiemTra('số tài khoản đã được bỏ khoảng trắng', (await tr.inputValue('#p-stk')) === '190312345678',
    await tr.inputValue('#p-stk'));

  // Đổi mật khẩu sai mật khẩu cũ
  await tr.fill('#p-mkc', 'sai-roi-nhe');
  await tr.fill('#p-mkm', 'moi123456');
  await tr.click('#btn-save');
  let choiDoiMk = true;
  try {
    await tr.waitForFunction(
      () => /không đúng/i.test(document.getElementById('hs-msg').textContent),
      null, { timeout: 8000 });
  } catch (e) { choiDoiMk = false; }
  kiemTra('đổi mật khẩu sai mật khẩu cũ bị từ chối', choiDoiMk,
    await tr.locator('#hs-msg').textContent());

  // Đăng xuất rồi quay lại
  await Promise.all([tr.waitForURL('**/ctv', { timeout: 8000 }), tr.click('#btn-out')]);
  kiemTra('đăng xuất về /ctv', tr.url().endsWith('/ctv'));
  kiemTra('sau khi đăng xuất, form đăng nhập hiện lại', await tr.locator('#pane-login').isVisible());

  // Vào thẳng dashboard khi chưa đăng nhập
  const tr2 = await moTrang(ctx, '/ctv-dashboard');
  await tr2.waitForURL('**/ctv', { timeout: 8000 }).catch(() => {});
  kiemTra('vào /ctv-dashboard khi chưa đăng nhập thì bị đẩy về /ctv', tr2.url().endsWith('/ctv'));
  await tr2.close();

  // Đăng nhập lại
  await tr.fill('#l-sdt', SDT);
  await tr.fill('#l-mk', MK);
  await Promise.all([tr.waitForURL('**/ctv-dashboard', { timeout: 8000 }), tr.click('#btn-login')]);
  await tr.waitForSelector('#db-main.show', { timeout: 8000 });
  kiemTra('đăng nhập lại vào đúng tài khoản, mã không đổi',
    (await tr.locator('#ma-ctv').textContent()).trim() === ma);
  kiemTra('thông tin ngân hàng đã lưu vẫn còn', (await tr.inputValue('#p-nh')) === 'Techcombank');

  // Sai mật khẩu
  await tr.evaluate(() => localStorage.clear());
  const tr3 = await moTrang(ctx, '/ctv');
  await tr3.fill('#l-sdt', SDT);
  await tr3.fill('#l-mk', 'sai-het-roi');
  await tr3.click('#btn-login');
  await tr3.waitForSelector('#msg-login.show.bad', { timeout: 8000 });
  kiemTra('sai mật khẩu hiện băng báo lỗi, không chuyển trang',
    tr3.url().endsWith('/ctv'), await tr3.locator('#msg-login').textContent());
  await tr3.close();

  /* ── So hình học header/footer với trang chuẩn ────────────────────────── */
  console.log('\n── So layout với trang chuẩn bao-hiem-tai-nan.html ──');
  const KHOI = ['header.hdr', '.hdr-inner', '.hdr-nav', '.hdr-logo', 'footer.ftr', '.float-cta', '.mob-bar'];
  async function hinhHoc(url, rong) {
    const c = await tb.newContext({ viewport: { width: rong, height: 900 } });
    const t = await c.newPage();
    await t.goto(CS + url, { waitUntil: 'load' });
    await t.waitForTimeout(350);
    const r = await t.evaluate((ks) => {
      const o = {};
      ks.forEach((k) => {
        const e = document.querySelector(k);
        if (!e) { o[k] = null; return; }
        const b = e.getBoundingClientRect();
        o[k] = [Math.round(b.x), Math.round(b.width), Math.round(b.height)];
      });
      return o;
    }, KHOI);
    await c.close();
    return r;
  }
  for (const rong of [1440, 390]) {
    const chuan = await hinhHoc('/bao-hiem-tai-nan', rong);
    for (const trang of ['/ctv', '/ctv-dashboard']) {
      const cua = await hinhHoc(trang, rong);
      const lech = KHOI.filter((k) => JSON.stringify(chuan[k]) !== JSON.stringify(cua[k]));
      kiemTra(trang + ' @' + rong + 'px khớp hình học header/footer', lech.length === 0,
        lech.map((k) => k + ': chuẩn ' + JSON.stringify(chuan[k]) + ' ≠ ' + JSON.stringify(cua[k])).join(' | '));
    }
  }

  /* ── Không tràn ngang trên iPhone ─────────────────────────────────────── */
  console.log('\n── Điện thoại 390px ──');
  const ctxM = await tb.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const trang of ['/ctv', '/ctv-dashboard']) {
    const t = await ctxM.newPage();
    if (trang === '/ctv-dashboard') {
      await t.goto(CS + '/ctv');
      await t.fill('#l-sdt', SDT); await t.fill('#l-mk', MK);
      await Promise.all([t.waitForURL('**/ctv-dashboard', { timeout: 8000 }), t.click('#btn-login')]);
      await t.waitForSelector('#db-main.show', { timeout: 8000 });
    } else {
      await t.goto(CS + trang, { waitUntil: 'load' });
    }
    await t.waitForTimeout(250);
    const tran = await t.evaluate(() => ({
      body: document.documentElement.scrollWidth,
      cua: window.innerWidth,
    }));
    kiemTra(trang + ' không tràn ngang ở 390px', tran.body <= tran.cua + 1,
      'scrollWidth ' + tran.body + ' > ' + tran.cua);
    await t.close();
  }
  await ctxM.close();

  /* ── Ngôn từ: không tuyên bố vượt trội ───────────────────────────────── */
  console.log('\n── Kiểm tra ngôn từ ──');
  const CAM = ['số 1', 'số một', 'tốt nhất', 'rẻ nhất', 'uy tín nhất', 'hàng đầu', 'duy nhất tại việt nam'];
  for (const f of ['ctv.html', 'ctv-dashboard.html']) {
    // Chỉ soát phần nội dung của trang, bỏ header/footer đồng bộ từ index.html
    const s = fs.readFileSync(path.join(GOC, f), 'utf8');
    const than = s.slice(s.indexOf('<main'), s.lastIndexOf('</main>'));
    const thay = CAM.filter((t) => than.toLowerCase().includes(t));
    kiemTra(f + ' không dùng từ tuyên bố vượt trội', thay.length === 0, thay.join(', '));
  }

  kiemTra('không có lỗi JavaScript nào trên các trang đã mở', loiJs.length === 0, loiJs.slice(0, 4).join(' ;; '));

  await ctx.close();
} finally {
  await tb.close();
  may.close(); mayGas.close();
}

console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
