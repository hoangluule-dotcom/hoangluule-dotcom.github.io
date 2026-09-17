/* Kiểm thử ghi nhận cộng tác viên và màn hình quản trị.
   Chạy: node scripts/test_ghi_nhan.mjs

   Máy chủ tại chỗ mô phỏng Netlify: clean URL, luật /r/*, các hàm thật, và
   BẮT luôn POST của Netlify Forms để xem đơn gửi lên mang theo những gì.
   Đơn hàng được giả lập qua một kho tạm thay cho Netlify Forms API — phần
   đọc form thật cần token nên không chạy được trong hộp cát. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

process.env.CTV_TOKEN_SECRET = 'chuoi-bi-mat-dai-hon-16-ky-tu-de-test';
process.env.DASHBOARD_KEY = 'khoa-quan-tri-test';

const K = require(path.join(GOC, 'netlify/functions/lib/ctv-kho.js'));

/* Thay docDonHang bằng bản giả — đơn thật nằm ở Netlify Forms, cần token. */
const DON_GIA = [];
const LEAD_GIA = [];
const DOC_DON_THAT = K.docDonHang;   /* giữ bản thật để soát việc lật trang */
K.docDonHang = async () => DON_GIA;
K.docLead = async () => LEAD_GIA;

const auth = require(path.join(GOC, 'netlify/functions/ctv-auth.js'));
const toi = require(path.join(GOC, 'netlify/functions/ctv-toi.js'));
const ref = require(path.join(GOC, 'netlify/functions/ctv-ref.js'));
const ten = require(path.join(GOC, 'netlify/functions/ctv-ten.js'));
const admin = require(path.join(GOC, 'netlify/functions/ctv-admin.js'));

let dat = 0, truot = 0;
const kiemTra = (t, dk, ct) => {
  if (dk) { dat++; console.log('  đạt   ' + t); }
  else { truot++; console.log('  TRƯỢT ' + t + (ct ? '  → ' + ct : '')); }
};

/* ── Lật trang API Netlify ────────────────────────────────────────────────
   API chặn per_page ở 100 và tự phân trang. Đọc đúng một trang thì form vượt
   100 lượt gửi là phần còn lại biến mất, không có lỗi nào. Đây là phép thử
   duy nhất chặn được lỗi đó, vì mọi phép thử khác đều dùng docDonHang giả. */
console.log('\n── Đọc đơn từ Netlify Forms phải lật hết trang ──');
{
  process.env.NETLIFY_ACCESS_TOKEN = 'token-gia-de-test';
  const fetchThat = globalThis.fetch;
  const daXin = [];
  const banGhi = (n, tu) => Array.from({ length: n }, (_, i) => ({
    id: 's' + (tu + i), created_at: new Date().toISOString(),
    data: { 'ma-don': 'D' + (tu + i), 'ma-ctv': 'AAAA', 'tong-phi': '480700' },
  }));

  globalThis.fetch = async (url) => {
    daXin.push(String(url));
    if (String(url).indexOf('/forms') >= 0 && String(url).indexOf('/submissions') < 0) {
      return { ok: true, json: async () => [{ id: 'f1', name: 'dbv-capdon-tnds' }] };
    }
    const trang = Number(new URL(String(url)).searchParams.get('page') || 1);
    /* 230 bản ghi: hai trang đầy rồi một trang lẻ */
    const lo = trang === 1 ? banGhi(100, 0) : trang === 2 ? banGhi(100, 100)
             : trang === 3 ? banGhi(30, 200) : [];
    return { ok: true, json: async () => lo };
  };

  const ds = await DOC_DON_THAT();
  kiemTra('đọc đủ 230 bản ghi chứ không dừng ở 100', ds.length === 230, String(ds.length));
  kiemTra('không xin per_page quá 100 (API sẽ lặng lẽ cắt)',
    !daXin.some((u) => /per_page=(\d+)/.test(u) && Number(RegExp.$1) > 100),
    daXin.find((u) => /per_page=[0-9]{3,}/.test(u)));
  kiemTra('có xin trang 2 và trang 3',
    daXin.some((u) => /page=2\b/.test(u)) && daXin.some((u) => /page=3\b/.test(u)));
  kiemTra('dừng lại khi trang chưa đầy, không xin trang 4',
    !daXin.some((u) => /page=4\b/.test(u)));

  globalThis.fetch = fetchThat;
  delete process.env.NETLIFY_ACCESS_TOKEN;
}

const LOAI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
};

const HAM = { 'ctv-auth': auth, 'ctv-toi': toi, 'ctv-ref': ref, 'ctv-ten': ten, 'ctv-admin': admin };

const FORM_POST = [];   // mọi POST mà wizard gửi lên Netlify Forms

async function docThan(req) {
  const m = []; for await (const c of req) m.push(c);
  return Buffer.concat(m).toString('utf8');
}

const may = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = decodeURIComponent(u.pathname);
  const than = await docThan(req);

  /* Netlify Forms: trang gửi POST về "/" kèm form-name */
  if (req.method === 'POST' && (p === '/' || p === '/index.html')) {
    FORM_POST.push(Object.fromEntries(new URLSearchParams(than)));
    res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return;
  }

  /* Luật /r/* trong _redirects */
  let fn = p.startsWith('/.netlify/functions/') ? p.slice('/.netlify/functions/'.length) : null;
  const q = Object.fromEntries(u.searchParams);
  if (!fn && /^\/r\//.test(p)) { fn = 'ctv-ref'; q.ma = p.slice(3); }

  if (fn && HAM[fn]) {
    const kq = await HAM[fn].handler({
      httpMethod: req.method, headers: req.headers, path: p,
      queryStringParameters: q, body: than,
    });
    res.writeHead(kq.statusCode, kq.headers || {});
    res.end(kq.body || '');
    return;
  }

  if (p === '/') p = '/index.html';
  let f = path.join(GOC, p);
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': LOAI[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => may.listen(8895, ok));
const CS = 'http://127.0.0.1:8895';

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
  await t.waitForTimeout(350);
  return t;
}

/* Đi hết wizard tới bước hiện QR để đơn được gửi lên */
async function datDon(t) {
  await t.click('#cdvt-oto');
  await t.selectOption('#cdf-group', 'nkd');
  await t.waitForTimeout(150);
  await t.selectOption('#cdf-sub', 'd6');
  await t.waitForTimeout(200);
  await t.click('#cdb1');
  await t.fill('#cdf-plate', '30A12345');
  await t.fill('#cdf-brand', 'Toyota Vios');
  await t.fill('#cdf-vin', 'AB123456');      /* 8 ký tự cuối số khung */
  await t.fill('#cdf-eng', 'CD789012');      /* 8 ký tự cuối số máy */
  await t.click('#cdp2 button.btn-p');
  await t.fill('#cdf-name', 'Trần Văn Khách');
  await t.fill('#cdf-phone', '0901234567');
  await t.fill('#cdf-email', 'khach@example.com');
  await t.fill('#cdf-addr', 'Hà Nội');
  await t.check('#cdf-agree');
  await t.click('#cdb3');
  await t.waitForTimeout(500);
}

let MA = '';
try {
  /* ── Tạo một CTV để thử ─────────────────────────────────────────────── */
  const r = await auth.handler({
    httpMethod: 'POST', headers: {},
    body: JSON.stringify({ hanh_dong: 'dang-ky', ho_ten: 'Lưu Lê Hoàng', sdt: '0904753830', mat_khau: 'matkhau123' }),
  });
  MA = JSON.parse(r.body).ctv.ma_ctv;
  const TOKEN = JSON.parse(r.body).token;
  console.log('\n── Link giới thiệu /r/<MÃ> ──');
  kiemTra('tạo được CTV để thử, mã = ' + MA, /^[A-Z0-9]{4}$/.test(MA));

  const ctx = await tb.newContext({ viewport: { width: 1440, height: 1000 } });

  /* /r/<MÃ> đặt cookie và chuyển hướng */
  {
    const t = await ctx.newPage();
    const res = await t.goto(CS + '/r/' + MA, { waitUntil: 'load' });
    kiemTra('/r/MÃ chuyển tới /cap-don-tnds', t.url().endsWith('/cap-don-tnds'), t.url());
    const ck = (await ctx.cookies()).find((c) => c.name === 'dbv_ctv');
    kiemTra('đã đặt cookie dbv_ctv = ' + MA, !!ck && ck.value === MA, ck ? ck.value : 'không có cookie');
    kiemTra('cookie sống 30 ngày', !!ck && ck.expires > Date.now() / 1000 + 29 * 86400,
      ck ? String(ck.expires) : '');
    kiemTra('cookie SameSite=Lax', !!ck && ck.sameSite === 'Lax', ck ? ck.sameSite : '');
    kiemTra('cookie KHÔNG đặt HttpOnly (để form đọc được mã công khai)', !!ck && ck.httpOnly === false);
    await t.close();
  }

  /* Chống chuyển hướng ra ngoài */
  {
    const c2 = await tb.newContext();
    const t = await c2.newPage();
    await t.goto(CS + '/r/' + MA + '?den=' + encodeURIComponent('https://trang-la.example.com/'), { waitUntil: 'load' });
    kiemTra('?den= trỏ ra tên miền khác bị chặn, quay về trang cấp đơn',
      t.url().startsWith(CS + '/cap-don-tnds'), t.url());
    await t.goto(CS + '/r/' + MA + '?den=' + encodeURIComponent('//trang-la.example.com/'), { waitUntil: 'load' });
    kiemTra('?den=//tên-miền cũng bị chặn', t.url().startsWith(CS + '/cap-don-tnds'), t.url());
    await t.goto(CS + '/r/' + MA + '?den=' + encodeURIComponent('/bao-hiem-tnds-xemay'), { waitUntil: 'load' });
    kiemTra('?den= trỏ đường dẫn nội bộ thì đi đúng chỗ',
      t.url().endsWith('/bao-hiem-tnds-xemay'), t.url());
    await c2.close();
  }

  /* Mã không tồn tại */
  {
    const c3 = await tb.newContext();
    const t = await c3.newPage();
    await t.goto(CS + '/r/ZZZZ', { waitUntil: 'load' });
    kiemTra('mã không tồn tại: vẫn tới trang mua, KHÔNG đặt cookie',
      t.url().endsWith('/cap-don-tnds') && !(await c3.cookies()).some((c) => c.name === 'dbv_ctv'));
    await c3.close();
  }

  console.log('\n── Ô "Mã giới thiệu" trên trang cấp đơn ──');
  {
    const t = await mo(ctx, '/cap-don-tnds');
    await t.click('#cdvt-oto');
    await t.selectOption('#cdf-group', 'nkd');
    await t.waitForTimeout(150);
    await t.selectOption('#cdf-sub', 'd6');
    await t.click('#cdb1');
    await t.fill('#cdf-plate', '30A99999');
    await t.fill('#cdf-vin', 'AB111111');
    await t.fill('#cdf-eng', 'CD222222');
    await t.click('#cdp2 button.btn-p');
    await t.waitForTimeout(200);
    kiemTra('ô mã giới thiệu điền sẵn từ cookie',
      (await t.inputValue('#cdf-ctv')) === MA, await t.inputValue('#cdf-ctv'));
    await t.waitForFunction(() => /Người giới thiệu/.test(document.getElementById('cdctv-hint').textContent),
      null, { timeout: 6000 }).catch(() => {});
    const goi = await t.locator('#cdctv-hint').textContent();
    kiemTra('hiện tên người giới thiệu để khách xác nhận', /Người giới thiệu/.test(goi), goi);
    kiemTra('tên bị rút gọn, không phơi tên đầy đủ', /Lưu Lê H\./.test(goi), goi);
    kiemTra('KHÔNG hiện số điện thoại của CTV', !/0904753830/.test(goi), goi);
    await t.close();
  }

  console.log('\n── Đơn gửi lên có mang mã CTV không ──');
  {
    FORM_POST.length = 0;
    const t = await mo(ctx, '/cap-don-tnds');
    await datDon(t);
    const don = FORM_POST[FORM_POST.length - 1];
    kiemTra('đơn đã được gửi lên Netlify Forms', !!don, 'không bắt được POST nào');
    if (don) {
      kiemTra('đơn mang mã CTV ' + MA, don['ma-ctv'] === MA, don['ma-ctv']);
      kiemTra('đơn ghi nguồn = cookie_link', don['nguon-ghi-nhan'] === 'cookie_link', don['nguon-ghi-nhan']);
      kiemTra('tổng phí đúng 480700', don['tong-phi'] === '480700', don['tong-phi']);
      DON_GIA.push({
        id: 's1', thoi_diem: new Date().toISOString(), ma_don: don['ma-don'], ma_ctv: don['ma-ctv'],
        nguon_ghi_nhan: don['nguon-ghi-nhan'], trang_thai: don['trang-thai'], loai_xe: don['loai-xe'],
        chi_tiet_xe: don['chi-tiet-xe'], bien_so: don['bien-so'], thoi_han: don['thoi-han'],
        phi_goc: 437000, tong_phi: 480700,
      });
    }
    await t.close();
  }

  /* Khách tự nhập mã phải thắng cookie */
  {
    FORM_POST.length = 0;
    const t = await mo(ctx, '/cap-don-tnds');
    await t.click('#cdvt-oto');
    await t.selectOption('#cdf-group', 'nkd');
    await t.waitForTimeout(150);
    await t.selectOption('#cdf-sub', 'd6');
    await t.click('#cdb1');
    await t.fill('#cdf-plate', '30A88888');
    await t.fill('#cdf-vin', 'AB333333');
    await t.fill('#cdf-eng', 'CD444444');
    await t.click('#cdp2 button.btn-p');
    await t.fill('#cdf-ctv', 'AAAA');
    await t.fill('#cdf-name', 'Nguyễn Thị B');
    await t.fill('#cdf-phone', '0912000111');
    await t.fill('#cdf-email', 'b@example.com');
    await t.fill('#cdf-addr', 'Hải Phòng');
    await t.check('#cdf-agree');
    await t.click('#cdb3');
    await t.waitForTimeout(500);
    const don = FORM_POST[FORM_POST.length - 1];
    kiemTra('mã khách TỰ NHẬP thắng cookie', don && don['ma-ctv'] === 'AAAA', don && don['ma-ctv']);
    kiemTra('nguồn ghi nhận đổi thành khach_tu_nhap',
      don && don['nguon-ghi-nhan'] === 'khach_tu_nhap', don && don['nguon-ghi-nhan']);
    await t.close();
  }

  console.log('\n── Ghi nhận trên MỌI trang có công cụ cấp đơn ──');
  for (const trang of ['/bao-hiem-tnds-oto', '/bao-hiem-tnds-xemay', '/tnds-xe-5-cho', '/tnds-xe-7-cho']) {
    const t = await mo(ctx, trang);
    await t.waitForTimeout(250);
    kiemTra(trang + ' điền sẵn mã từ cookie',
      (await t.inputValue('#cdf-ctv')) === MA, await t.inputValue('#cdf-ctv'));
    await t.close();
  }

  console.log('\n── Hai trang vừa chuyển đổi ──');
  {
    const t = await mo(ctx, '/tnds-xe-5-cho');
    kiemTra('xe-5-cho chọn sẵn ô tô / không KDVT / dưới 6 chỗ',
      await t.locator('#cdvt-oto.on').count() === 1
      && (await t.inputValue('#cdf-group')) === 'nkd'
      && (await t.inputValue('#cdf-sub')) === 'd6',
      (await t.inputValue('#cdf-group')) + '/' + (await t.inputValue('#cdf-sub')));
    const phi = (await t.locator('#cdfee').textContent()).replace(/\s+/g, ' ');
    kiemTra('xe-5-cho hiện sẵn 480.700đ ngay khi mở trang', /480\.700/.test(phi), phi.slice(0, 160));
    kiemTra('vẫn còn thẻ H1 SEO của trang',
      /xe 5 chỗ/i.test(await t.locator('h1').first().textContent()),
      await t.locator('h1').first().textContent());
    await t.close();
  }
  {
    const t = await mo(ctx, '/tnds-xe-7-cho');
    kiemTra('xe-7-cho chọn sẵn nhóm 6–11 chỗ', (await t.inputValue('#cdf-sub')) === 'c611',
      await t.inputValue('#cdf-sub'));
    const phi = (await t.locator('#cdfee').textContent()).replace(/\s+/g, ' ');
    kiemTra('xe-7-cho hiện sẵn 873.400đ (794.000 + VAT)', /873\.400/.test(phi), phi.slice(0, 160));
    kiemTra('vẫn còn thẻ H1 SEO của trang',
      /7 chỗ/i.test(await t.locator('h1').first().textContent()),
      await t.locator('h1').first().textContent());
    await t.close();
  }

  /* CSS cũ còn sót trong hai trang đó có làm lệch khối cấp đơn không —
     so từng thuộc tính tính toán với trang chuẩn, không đoán. */
  console.log('\n── CSS còn sót có làm lệch khối cấp đơn không ──');
  {
    const CHON = ['#cap-don .cd-card', '#cap-don .cd-steps', '#cap-don .vt:not(.on)',   /* .vt đang chọn có nền xanh — trạng thái, không phải kiểu dáng */ '#cap-don .cd-fee',
                  '#cap-don .btn-p', '#cap-don .cd-sum', '#cap-don .fld input'];
    const THUOC = ['backgroundColor', 'color', 'borderRadius', 'borderTopWidth', 'fontSize',
                   'fontWeight', 'paddingTop', 'paddingLeft', 'display'];
    async function kieu(url) {
      const t = await ctx.newPage();
      await t.goto(CS + url, { waitUntil: 'load' });
      await t.waitForTimeout(400);
      const r = await t.evaluate(([cs, ts]) => {
        const o = {};
        cs.forEach((sel) => {
          const e = document.querySelector(sel);
          if (!e) { o[sel] = null; return; }
          const g = getComputedStyle(e);
          o[sel] = ts.map((k) => g[k]).join('|');
        });
        return o;
      }, [CHON, THUOC]);
      await t.close();
      return r;
    }
    const chuan = await kieu('/cap-don-tnds');
    for (const trang of ['/tnds-xe-5-cho', '/tnds-xe-7-cho']) {
      const cua = await kieu(trang);
      const lech = CHON.filter((s) => chuan[s] !== cua[s]);
      kiemTra(trang + ' hiển thị y hệt trang chuẩn', lech.length === 0,
        lech.map((s) => s + ': ' + chuan[s] + ' ≠ ' + cua[s]).join(' | ').slice(0, 400));
    }
  }

  console.log('\n── Bảng điều khiển của CTV ──');
  {
    const r2 = await toi.handler({ httpMethod: 'GET', headers: { authorization: 'Bearer ' + TOKEN } });
    const d = JSON.parse(r2.body);
    kiemTra('ghi_nhan_dang_bat = true', d.ghi_nhan_dang_bat === true);
    kiemTra('hoa_hong_dang_bat = false (chưa có đối soát)', d.hoa_hong_dang_bat === false);
    kiemTra('đếm được lượt bấm link', d.thong_ke.luot_bam_link >= 1, String(d.thong_ke.luot_bam_link));
    kiemTra('thấy đúng 1 đơn của mình', d.don_hang.length === 1, String(d.don_hang.length));
    kiemTra('ba ô hoa hồng vẫn bằng 0',
      d.thong_ke.hoa_hong_cho === 0 && d.thong_ke.hoa_hong_kha_dung === 0 && d.thong_ke.hoa_hong_da_rut === 0);
    const don = d.don_hang[0] || {};
    kiemTra('đơn KHÔNG kèm tên khách / sđt / CCCD / địa chỉ',
      !('ho_ten' in don) && !('sdt' in don) && !('cccd' in don) && !('dia_chi' in don),
      Object.keys(don).join(','));
  }

  console.log('\n── Lead sản phẩm khác (không bán online) ──');
  {
    /* Giả lập: dbv-tracking.js gắn mã vào body của mọi form có form-name=.
       Chạy thật trên trang sản phẩm để chứng minh bộ bắt form hoạt động. */
    FORM_POST.length = 0;
    const t = await mo(ctx, '/bao-hiem-chay-no');
    /* Kiểm thật: dbv-tracking.js đặt cờ này khi bộ bắt form đã gắn xong */
    const co = await t.evaluate(() =>
      !!document.querySelector('script[src="/assets/dbv-tracking.js"]'));
    kiemTra('trang sản phẩm có thẻ dbv-tracking.js', co);
    const kq = await t.evaluate(async () => {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'form-name=dbv-tuvan&ho-ten=Khach+Thu&dien-thoai=0912000222&san-pham=Chay+no',
      });
      return true;
    });
    await t.waitForTimeout(300);
    const lead = FORM_POST[FORM_POST.length - 1];
    kiemTra('lead sản phẩm khác được gắn mã CTV từ cookie',
      !!lead && lead['ma-ctv'] === MA, lead ? lead['ma-ctv'] : 'không bắt được');
    kiemTra('lead ghi nguồn = cookie_link',
      !!lead && lead['nguon-ghi-nhan'] === 'cookie_link', lead && lead['nguon-ghi-nhan']);
    kiemTra('lead vẫn giữ nguyên các trường cũ',
      !!lead && lead['ho-ten'] === 'Khach Thu' && lead['san-pham'] === 'Chay no');
    if (lead) LEAD_GIA.push({ id: 'l1', thoi_diem: new Date().toISOString(), form: 'dbv-tuvan',
      ma_ctv: lead['ma-ctv'], nguon_ghi_nhan: lead['nguon-ghi-nhan'],
      san_pham: lead['san-pham'], trang: '/bao-hiem-chay-no' });
    await t.close();
  }

  /* Đơn TNDS tự gắn ma-ctv rồi — dbv-tracking.js KHÔNG được đè lên */
  {
    FORM_POST.length = 0;
    const t = await mo(ctx, '/cap-don-tnds');
    await t.evaluate(async () => {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'form-name=dbv-capdon-tnds&ma-ctv=AAAA&nguon-ghi-nhan=khach_tu_nhap',
      });
    });
    await t.waitForTimeout(300);
    const d = FORM_POST[FORM_POST.length - 1];
    kiemTra('body đã có ma-ctv thì KHÔNG bị cookie đè lên (mã khách tự nhập được giữ)',
      !!d && d['ma-ctv'] === 'AAAA', d && d['ma-ctv']);
    await t.close();
  }

  console.log('\n── API quản trị ──');
  {
    let r3 = await admin.handler({ httpMethod: 'GET', headers: {} });
    kiemTra('không có khoá → 401', r3.statusCode === 401);
    r3 = await admin.handler({ httpMethod: 'GET', headers: { 'x-dashboard-key': 'sai-khoa' } });
    kiemTra('sai khoá → 401', r3.statusCode === 401);
    r3 = await admin.handler({ httpMethod: 'GET', headers: { 'x-dashboard-key': 'khoa-quan-tri-test' } });
    kiemTra('đúng khoá → 200', r3.statusCode === 200, r3.body.slice(0, 200));
    const d = JSON.parse(r3.body);
    kiemTra('liệt kê được cộng tác viên', d.ctv.length === 1, String(d.ctv.length));
    kiemTra('gắn đúng doanh thu cho CTV', d.ctv[0].doanh_thu === 0 && d.ctv[0].so_don === 1,
      JSON.stringify({ dt: d.ctv[0].doanh_thu, don: d.ctv[0].so_don }));
    kiemTra('có tổng hợp toàn hệ thống', d.tong && d.tong.so_ctv === 1);
    kiemTra('KHÔNG trả mật khẩu băm ra ngoài', !/mat_khau_bam|muoi/.test(r3.body));
    kiemTra('đếm được lead sản phẩm khác', d.ctv[0].lead_sp_khac === 1, String(d.ctv[0].lead_sp_khac));
    kiemTra('có nêu rõ phạm vi hoa hồng là TNDS',
      Array.isArray(d.pham_vi_hoa_hong) && d.pham_vi_hoa_hong.join(' ').indexOf('TNDS') >= 0,
      JSON.stringify(d.pham_vi_hoa_hong));
    kiemTra('lead KHÔNG kèm tên hay số điện thoại khách',
      !(d.lead || []).some((l) => 'ho_ten' in l || 'sdt' in l || 'dien_thoai' in l),
      JSON.stringify((d.lead || [])[0] || {}));
  }

  /* Đơn về hệ thống nhưng KHÔNG mang mã — tình huống hay bị nhầm thành "cộng
     tác viên mất đơn". Quản trị phải nhìn thấy được, nếu không thì mỗi lần
     khiếu nại đều phải mở thẳng Netlify Forms mới trả lời được. */
  console.log('\n── Đơn không gắn mã: quản trị phải nhìn thấy ──');
  {
    DON_GIA.push({
      id: 'skg', thoi_diem: new Date().toISOString(), ma_don: 'KHONGMA1', ma_ctv: '',
      nguon_ghi_nhan: '', trang_thai: 'Khách báo đã chuyển khoản', loai_xe: 'Ô tô',
      chi_tiet_xe: 'Không KDVT · dưới 6 chỗ', bien_so: '30A00001', thoi_han: '1 năm',
      phi_goc: 437000, tong_phi: 480700,
    });
    const r = await admin.handler({ httpMethod: 'GET', headers: { 'x-dashboard-key': 'khoa-quan-tri-test' } });
    const d = JSON.parse(r.body);
    kiemTra('API trả về danh sách đơn không gắn mã',
      Array.isArray(d.don_khong_gan) && d.don_khong_gan.length === 1, JSON.stringify(d.don_khong_gan));
    kiemTra('đúng đơn vừa thêm', (d.don_khong_gan[0] || {}).ma_don === 'KHONGMA1');
    kiemTra('đơn không gắn mã KHÔNG lẫn vào danh sách đơn có mã',
      !(d.don || []).some((x) => x.ma_don === 'KHONGMA1'));
    kiemTra('KHÔNG kèm tên, số điện thoại hay địa chỉ khách',
      !/ho_ten|sdt|dia_chi|cccd/.test(JSON.stringify(d.don_khong_gan)),
      JSON.stringify(d.don_khong_gan[0]));
    kiemTra('ô chỉ số đơn không gắn mã đếm đúng', d.tong.so_don_khong_gan === 1,
      String(d.tong.so_don_khong_gan));
  }

  console.log('\n── Màn hình quản trị /admin/ctv ──');
  {
    const c4 = await tb.newContext({ viewport: { width: 1440, height: 1000 } });
    const t = await c4.newPage();
    t.on('pageerror', (e) => loiJs.push('/admin/ctv :: ' + e.message));
    await t.goto(CS + '/admin/ctv.html', { waitUntil: 'load' });
    kiemTra('chưa có khoá thì hiện cổng khoá', await t.locator('#gate').isVisible());
    await t.fill('#keyInput', 'sai-khoa');
    await t.click('#btnUnlock');
    await t.waitForSelector('#gateErr.show', { timeout: 6000 });
    kiemTra('sai khoá thì báo lỗi, không vào được', await t.locator('#app').isHidden());
    await t.fill('#keyInput', 'khoa-quan-tri-test');
    await t.click('#btnUnlock');
    await t.waitForSelector('#app', { state: 'visible', timeout: 8000 });
    kiemTra('đúng khoá thì vào được', await t.locator('#app').isVisible());
    kiemTra('bảng hiện đúng 1 cộng tác viên', await t.locator('tr.ctv').count() === 1);
    kiemTra('hiện mã CTV ' + MA, (await t.locator('tr.ctv .ma').first().textContent()).trim() === MA);
    kiemTra('ô chỉ số "Cộng tác viên" = 1', (await t.locator('#k-ctv').textContent()).trim() === '1');
    await t.locator('tr.ctv').first().click();
    await t.waitForTimeout(300);
    kiemTra('bấm vào hàng thì bung danh sách đơn',
      await t.locator('tr.don-hang.mo table.don').first().locator('tbody tr').count() === 1);
    kiemTra('bảng có cột "Lead SP khác"',
      /Lead SP khác/.test(await t.locator('thead').first().textContent()));
    kiemTra('phần bung ra có danh sách lead sản phẩm khác',
      /Lead sản phẩm khác/.test(await t.locator('tr.don-hang.mo').first().textContent()));
    /* Soát tiêu đề cột, không soát cả bảng: phần bung ra có nhắc "chưa sinh
       hoa hồng" — đó là lời giải thích, không phải cột dữ liệu. */
    kiemTra('bảng KHÔNG có cột hoa hồng',
      !/hoa hồng/i.test(await t.locator('thead').first().textContent()),
      await t.locator('thead').first().textContent());
    /* Danh sách đơn không gắn mã: ẩn sẵn, bấm mới hiện — không chiếm chỗ của
       bảng chính, nhưng phải có ở đó khi cần soi. */
    kiemTra('danh sách đơn không gắn mã ẩn sẵn', await t.locator('#kg-vung').isHidden());
    await t.click('#btn-kg');
    await t.waitForTimeout(250);
    kiemTra('bấm thì hiện ra', await t.locator('#kg-vung').isVisible());
    kiemTra('liệt kê đúng đơn không gắn mã',
      (await t.locator('#kg-tbody tr').count()) === 1 &&
      /KHONGMA1/.test(await t.locator('#kg-tbody').textContent()),
      await t.locator('#kg-tbody').textContent());
    await c4.close();
  }

  /* Máy chủ KHÔNG đọc được đơn: bảng điều khiển của CTV phải nói thẳng là lỗi
     hệ thống, KHÔNG được hiện số 0 kèm câu "mọi đơn đều được ghi lại". Số 0
     lúc này là một khẳng định mà hệ thống không có căn cứ để nói. */
  console.log('\n── Không đọc được đơn thì CTV phải được báo, không phải thấy số 0 ──');
  {
    const thatBai = async () => { throw new Error('Thiếu biến môi trường NETLIFY_ACCESS_TOKEN trên Netlify.'); };
    const cu = K.docDonHang;
    K.docDonHang = thatBai;

    const rt = await toi.handler({ httpMethod: 'GET', headers: { authorization: 'Bearer ' + TOKEN } });
    const dt = JSON.parse(rt.body);
    kiemTra('API vẫn trả 200 (hồ sơ và lượt bấm vẫn đúng)', rt.statusCode === 200, String(rt.statusCode));
    kiemTra('API kèm canh_bao nói rõ vì sao', !!dt.canh_bao && /NETLIFY_ACCESS_TOKEN/.test(dt.canh_bao),
      String(dt.canh_bao));

    const c5 = await tb.newContext({ viewport: { width: 1200, height: 1000 } });
    await c5.addInitScript((tk) => {
      try { localStorage.setItem('dbv_ctv_token', tk); } catch (e) {}
    }, TOKEN);
    const t5 = await c5.newPage();
    t5.on('pageerror', (e) => loiJs.push('/ctv-dashboard :: ' + e.message));
    await t5.goto(CS + '/ctv-dashboard', { waitUntil: 'load' });
    await t5.waitForSelector('#db-main.show', { timeout: 8000 });
    const bang = await t5.locator('#bang-giai-doan').textContent();
    kiemTra('băng cảnh báo đổi sang màu lỗi',
      (await t5.locator('#bang-giai-doan').getAttribute('class')).indexOf('loi') >= 0);
    kiemTra('nói rõ là lỗi hệ thống, không phải CTV không có đơn',
      /lỗi hệ thống/i.test(bang), bang.slice(0, 120));
    kiemTra('KHÔNG khẳng định "mọi đơn đều được ghi lại"', !/đều được ghi lại/.test(bang));
    kiemTra('ô doanh thu hiện "—" chứ không phải 0',
      (await t5.locator('#k-hhc').textContent()).trim() === '—',
      await t5.locator('#k-hhc').textContent());
    kiemTra('ô đơn chờ tiền cũng hiện "—"',
      (await t5.locator('#k-cho').textContent()).trim() === '—');
    kiemTra('ô lượt bấm link VẪN hiện số thật (đọc từ kho khác)',
      (await t5.locator('#k-bam').textContent()).trim() !== '—',
      await t5.locator('#k-bam').textContent());
    kiemTra('khối đơn nói "chưa đọc được", không nói "chưa có đơn nào"',
      /Chưa đọc được danh sách đơn/.test(await t5.locator('#bang-don').textContent()),
      await t5.locator('#bang-don').textContent());
    await c5.close();

    K.docDonHang = cu;
  }

  kiemTra('không có lỗi JavaScript nào', loiJs.length === 0, loiJs.slice(0, 4).join(' ;; '));
  await ctx.close();
} finally {
  await tb.close();
  may.close();
}

console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
