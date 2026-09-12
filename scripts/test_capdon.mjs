/* Kiểm thử công cụ cấp đơn TNDS sau khi gom về site chính.
   Chạy: node scripts/test_capdon.mjs

   Mục tiêu: chứng minh việc tách CSS/JS ra file dùng chung KHÔNG làm đổi
   hành vi — phí tính ra vẫn đúng biểu phí Nghị định 67/2023, và ba trang
   nhúng công cụ đều chạy được.

   Máy chủ tại chỗ mô phỏng Netlify (clean URL). Không cần mạng. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let dat = 0, truot = 0;
const kiemTra = (ten, dk, ct) => {
  if (dk) { dat++; console.log('  đạt   ' + ten); }
  else { truot++; console.log('  TRƯỢT ' + ten + (ct ? '  → ' + ct : '')); }
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
await new Promise((ok) => may.listen(8897, ok));
const CS = 'http://127.0.0.1:8897';

const tb = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' })
  .catch(() => chromium.launch());

const loiJs = [];
async function mo(ctx, url) {
  const t = await ctx.newPage();
  t.on('pageerror', (e) => loiJs.push(url + ' :: ' + e.message));
  t.on('console', (m) => {
    if (m.type() !== 'error') return;
    const x = m.text();
    if (/Failed to load resource|net::ERR_/.test(x)) return;
    loiJs.push(url + ' :: console ' + x);
  });
  await t.goto(CS + url, { waitUntil: 'load' });
  await t.waitForTimeout(400);
  return t;
}

const TRANG = ['/cap-don-tnds', '/bao-hiem-tnds-oto', '/bao-hiem-tnds-xemay'];

try {
  const ctx = await tb.newContext({ viewport: { width: 1440, height: 1000 } });

  console.log('\n── Ba trang đều nhúng được công cụ ──');
  for (const u of TRANG) {
    const t = await mo(ctx, u);
    kiemTra(u + ' có đúng 1 khối #cap-don', await t.locator('#cap-don').count() === 1);
    kiemTra(u + ' nạp CSS dùng chung',
      await t.locator('link[href="/assets/cap-don-tnds.css"]').count() === 1);
    kiemTra(u + ' nạp JS dùng chung và window.CD tồn tại',
      await t.evaluate(() => typeof window.CD === 'object' && typeof window.CD.pickVeh === 'function'));
    kiemTra(u + ' có form ẩn dbv-capdon-tnds cho Netlify Forms',
      await t.locator('form[name="dbv-capdon-tnds"]').count() === 1);
    kiemTra(u + ' KHÔNG còn CSS/JS inline của bản cũ',
      await t.locator('#cd-capdon-css, #cd-capdon-js').count() === 0);
    await t.close();
  }

  console.log('\n── Loại xe mở sẵn theo từng trang ──');
  {
    const t = await mo(ctx, '/bao-hiem-tnds-xemay');
    kiemTra('trang xe máy mở sẵn tab xe máy', await t.locator('#cdvt-moto.on').count() === 1);
    kiemTra('trang xe máy hiện khối chọn xe máy', await t.locator('#cdmoto-opts').isVisible());
    kiemTra('mức trách nhiệm hiện 50 triệu',
      (await t.locator('#cdcov-ts').textContent()).includes('50'), await t.locator('#cdcov-ts').textContent());
    await t.close();
  }
  {
    const t = await mo(ctx, '/bao-hiem-tnds-oto');
    kiemTra('trang ô tô mở sẵn tab ô tô', await t.locator('#cdvt-oto.on').count() === 1);
    kiemTra('mức trách nhiệm hiện 100 triệu',
      (await t.locator('#cdcov-ts').textContent()).includes('100'), await t.locator('#cdcov-ts').textContent());
    await t.close();
  }
  {
    const t = await mo(ctx, '/cap-don-tnds');
    kiemTra('trang chuẩn KHÔNG ép sẵn loại xe nào',
      await t.locator('#cdvt-oto.on, #cdvt-moto.on').count() === 0);
    await t.close();
  }
  {
    const t = await mo(ctx, '/cap-don-tnds?loai=moto');
    kiemTra('?loai=moto mở sẵn tab xe máy', await t.locator('#cdvt-moto.on').count() === 1);
    await t.close();
  }

  console.log('\n── Phí tính ra có đúng biểu phí không ──');
  {
    const t = await mo(ctx, '/cap-don-tnds');
    // Ô tô, không kinh doanh vận tải, dưới 6 chỗ, 1 năm
    await t.click('#cdvt-oto');
    await t.selectOption('#cdf-group', 'nkd');
    await t.waitForTimeout(200);
    const tuyChon = await t.locator('#cdf-sub option').allTextContents();
    kiemTra('có danh sách loại xe con sau khi chọn nhóm', tuyChon.length > 1, tuyChon.join(' | '));
    // chọn mục đầu tiên có chữ "6 chỗ"
    const giaTri = await t.locator('#cdf-sub option').evaluateAll((os) =>
      os.map((o) => ({ v: o.value, t: o.textContent })));
    const duoi6 = giaTri.find((o) => /dưới 6|<\s*6|6 chỗ/i.test(o.t) && o.v);
    kiemTra('tìm được mục xe dưới 6 chỗ', !!duoi6, JSON.stringify(giaTri).slice(0, 300));
    if (duoi6) {
      await t.selectOption('#cdf-sub', duoi6.v);
      await t.waitForTimeout(300);
      const phi = (await t.locator('#cdfee').textContent()).replace(/\s+/g, ' ');
      kiemTra('ô tô dưới 6 chỗ không KDVT, 1 năm → tổng 480.700 đ (437.000 + VAT 10%)',
        /480\.700/.test(phi), phi.slice(0, 220));
    }
    await t.close();
  }
  {
    const t = await mo(ctx, '/bao-hiem-tnds-xemay');
    // Xe máy trên 50cc, 1 năm → 55.000 + VAT = 60.500 ; xe 50cc+ là 60.000 + VAT = 66.000
    const opts = await t.locator('#cdf-moto option').evaluateAll((os) =>
      os.map((o) => ({ v: o.value, t: (o.textContent || '').trim() })));
    kiemTra('trang xe máy có danh sách loại xe máy', opts.length > 1, JSON.stringify(opts).slice(0, 300));
    const tren50 = opts.find((o) => o.v && /trên 50|từ 50|50cc/i.test(o.t));
    if (tren50) {
      await t.selectOption('#cdf-moto', tren50.v);
      await t.waitForTimeout(300);
      const phi = (await t.locator('#cdfee').textContent()).replace(/\s+/g, ' ');
      kiemTra('xe máy (' + tren50.t + ') 1 năm → tổng 66.000 đ',
        /66\.000/.test(phi), phi.slice(0, 220));
    }
    await t.close();
  }

  console.log('\n── Không còn đường dẫn sang tên miền phụ ──');
  {
    const t = await mo(ctx, '/bao-hiem-tnds-xemay');
    const hrefs = await t.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href') || ''));
    kiemTra('trang xe máy không còn link ra tnds.dbv247.com.vn',
      !hrefs.some((h) => h.includes('tnds.dbv247.com.vn')),
      hrefs.filter((h) => h.includes('tnds.dbv247')).join(', '));
    kiemTra('hai nút "Mua ngay" nay trỏ vào #cap-don ngay trong trang',
      hrefs.filter((h) => h === '#cap-don').length === 2,
      'đếm được ' + hrefs.filter((h) => h === '#cap-don').length);
    await t.close();
  }

  console.log('\n── So layout với trang chuẩn ──');
  const KHOI = ['header.hdr', '.hdr-inner', '.hdr-nav', '.hdr-logo', 'footer.ftr', '.float-cta', '.mob-bar'];
  async function hinh(url, rong) {
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
    const chuan = await hinh('/bao-hiem-tai-nan', rong);
    const cua = await hinh('/cap-don-tnds', rong);
    const lech = KHOI.filter((k) => JSON.stringify(chuan[k]) !== JSON.stringify(cua[k]));
    kiemTra('/cap-don-tnds @' + rong + 'px khớp hình học header/footer', lech.length === 0,
      lech.map((k) => k + ': ' + JSON.stringify(chuan[k]) + ' ≠ ' + JSON.stringify(cua[k])).join(' | '));
  }

  console.log('\n── Điện thoại 390px ──');
  const ctxM = await tb.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const u of TRANG) {
    const t = await ctxM.newPage();
    await t.goto(CS + u, { waitUntil: 'load' });
    await t.waitForTimeout(400);
    const d = await t.evaluate(() => ({ w: document.documentElement.scrollWidth, v: window.innerWidth }));
    kiemTra(u + ' không tràn ngang ở 390px', d.w <= d.v + 1, 'scrollWidth ' + d.w + ' > ' + d.v);
    await t.close();
  }
  await ctxM.close();

  kiemTra('không có lỗi JavaScript nào', loiJs.length === 0, loiJs.slice(0, 4).join(' ;; '));
  await ctx.close();
} finally {
  await tb.close();
  may.close();
}

console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
