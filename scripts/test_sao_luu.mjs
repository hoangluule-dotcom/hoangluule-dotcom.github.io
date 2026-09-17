/* Kiểm thử script sao lưu dữ liệu Netlify.
   Chạy: node scripts/test_sao_luu.mjs

   Không gọi API thật — dựng một máy chủ giả đóng vai api.netlify.com, rồi
   chạy chính script sao lưu với địa chỉ trỏ vào đó.

   MÁY CHỦ GIẢ PHẢI NẰM Ở TIẾN TRÌNH RIÊNG: spawnSync chặn vòng lặp sự kiện
   của tiến trình gọi nó, nên nếu để máy chủ giả trong cùng tiến trình thì nó
   không bao giờ trả lời được script con — cả hai cùng đứng đợi nhau.

   Hai điều đáng thử nhất, và đều là loại hỏng âm thầm:
     1. Lật hết trang — API Netlify chặn per_page ở 100. Đọc một trang thì bản
        sao bị cắt cụt mà không có lỗi nào.
     2. Số bản ghi tụt so với lần trước — phải báo đỏ, vì nếu không thì bản sao
        thiếu sẽ lặng lẽ đè lên bản sao tốt. */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = path.join('/tmp', 'thu-sao-luu-' + process.pid);
const CONG = 8899;

let dat = 0, truot = 0;
const kiemTra = (t, dk, ct) => {
  if (dk) { dat++; console.log('  đạt   ' + t); }
  else { truot++; console.log('  TRƯỢT ' + t + (ct ? '  → ' + ct : '')); }
};

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

/* Máy chủ giả — số bản ghi đọc từ tệp để đổi được giữa các lượt chạy */
const TEP_SO = path.join(TMP, 'so-ban-ghi.txt');
fs.writeFileSync(TEP_SO, '230');
fs.writeFileSync(path.join(TMP, 'may-gia.js'), `
const http = require('http');
const fs = require('fs');
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const N = Number(fs.readFileSync(${JSON.stringify(TEP_SO)}, 'utf8').trim());
  res.setHeader('Content-Type', 'application/json');
  if (/\\/forms$/.test(u.pathname)) {
    res.end(JSON.stringify([{ id: 'f1', name: 'dbv-capdon-tnds', created_at: '2026-01-01' }]));
    return;
  }
  if (/\\/submissions$/.test(u.pathname)) {
    const trang = Number(u.searchParams.get('page') || 1);
    const moi = Number(u.searchParams.get('per_page') || 100);
    const tu = (trang - 1) * moi;
    const n = Math.max(0, Math.min(moi, N - tu));
    res.end(JSON.stringify(Array.from({ length: n }, (_, i) => ({
      id: 's' + (tu + i), created_at: '2026-09-01', data: { 'ma-don': 'D' + (tu + i) },
    }))));
    return;
  }
  res.statusCode = 404; res.end('[]');
}).listen(${CONG});
`);

const may = spawn('node', [path.join(TMP, 'may-gia.js')], { stdio: 'ignore' });
await new Promise((ok) => setTimeout(ok, 700));

/* Bản sao của script thật, chỉ đổi địa chỉ API */
fs.writeFileSync(
  path.join(TMP, 'sao_luu.js'),
  fs.readFileSync(path.join(GOC, 'scripts/sao_luu_netlify.js'), 'utf8')
    .replace(/https:\/\/api\.netlify\.com/g, 'http://127.0.0.1:' + CONG)
);

const ngay = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const chay = (env) => spawnSync('node', [path.join(TMP, 'sao_luu.js')], {
  env: { ...process.env, ...env }, encoding: 'utf8', cwd: TMP, timeout: 60000,
});

try {
  console.log('\n── Sao lưu dữ liệu Netlify ──');
  {
    const r = chay({ NETLIFY_ACCESS_TOKEN: '', THU_MUC_RA: 'ra' });
    kiemTra('thiếu token thì dừng ngay, mã thoát 1',
      r.status === 1 && /THIẾU NETLIFY_ACCESS_TOKEN/.test(r.stdout), String(r.status));
  }
  {
    const r = chay({ NETLIFY_ACCESS_TOKEN: 'tok', THU_MUC_RA: 'ra' });
    kiemTra('chạy xong sạch', r.status === 0, (r.stdout || '') + (r.stderr || ''));
    const f = path.join(TMP, 'ra', ngay, 'forms', 'dbv-capdon-tnds.json');
    kiemTra('có ghi ra tệp sao lưu của form', fs.existsSync(f));
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf8'));
      kiemTra('lấy đủ 230 bản ghi, KHÔNG dừng ở 100', d.so_ban_ghi === 230, String(d.so_ban_ghi));
      kiemTra('không trùng bản ghi giữa các trang',
        new Set(d.ban_ghi.map((x) => x.id)).size === 230);
      kiemTra('giữ nguyên nội dung bản ghi, không cắt trường',
        d.ban_ghi[0] && d.ban_ghi[0].data && d.ban_ghi[0].data['ma-don'] === 'D0');
    }
    kiemTra('có ghi mốc để lần sau so', fs.existsSync(path.join(TMP, 'ra', 'moc.json')));
  }
  {
    fs.writeFileSync(TEP_SO, '180');   /* dữ liệu tụt — tình huống đáng sợ nhất */
    const r = chay({
      NETLIFY_ACCESS_TOKEN: 'tok', THU_MUC_RA: 'ra2',
      MOC_CU: path.join(TMP, 'ra', 'moc.json'),
    });
    kiemTra('số bản ghi giảm → thoát mã 2 để việc chạy tự động báo đỏ',
      r.status === 2, String(r.status));
    kiemTra('nói rõ giảm từ đâu xuống đâu', /230 → 180/.test(r.stdout || ''),
      (r.stdout || '').slice(-200));
    kiemTra('vẫn ghi bản sao ra đĩa dù đang báo lỗi',
      fs.existsSync(path.join(TMP, 'ra2', ngay, 'forms', 'dbv-capdon-tnds.json')));
  }
  {
    fs.writeFileSync(TEP_SO, '230');
    const r = chay({
      NETLIFY_ACCESS_TOKEN: 'tok', THU_MUC_RA: 'ra3',
      MOC_CU: path.join(TMP, 'ra', 'moc.json'),
    });
    kiemTra('số bản ghi không giảm thì chạy sạch trở lại', r.status === 0, String(r.status));
  }
} finally {
  may.kill();
  fs.rmSync(TMP, { recursive: true, force: true });
}

console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
