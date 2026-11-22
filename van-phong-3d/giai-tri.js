/* DBV247 — PHÒNG GIẢI TRÍ NHÂN VIÊN trong văn phòng 3D
   ===========================================================================
   Tệp này CHỈ được tải khi nhân viên nhập đúng mã ở cửa "Khu nhân viên" sau quầy
   lễ tân (xem index.html, mục KHU NHÂN VIÊN). Khách tham quan không tải tệp này.

   Phòng nằm phía sau tòa nhà (x -9…9, z -36…-22), dựng một lần, ẩn khi ra sảnh.
   10 trò: đố vui trà chiều · Bot em gái DBV · tường sinh nhật · máy nghe nhạc ·
   ném giấy · phi tiêu KPI · máy gắp thú · ghế thư giãn · góc chụp ảnh · bảng giấy nhớ.
   Dữ liệu chung qua hàm máy chủ /.netlify/functions/giai-tri-3d (giai-tri-3d.js).
   Mở trên máy không có máy chủ (xem thử) thì chạy chế độ "bản xem thử": dữ liệu giả,
   lưu trong trình duyệt. */
(function () {
'use strict';
let A = null, S = null, DATA = null, ROOM = null, built = false, inside = false, F7 = false, RA = null;
const ROOMSET = new Set(), TX = {}, OBJ = {};
const R = { x0: -9, x1: 9, z0: -36, z1: -22 };
const F = '"Be Vietnam Pro",sans-serif';
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dd = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BRAND = { navy: '#084C38', lam: '#007437', cam: '#E8920A', muc: '#063A2B', thanh: '#8ED1A9', kem: '#F7F1E6' };

/* ───────────────────────── Biểu tượng thêm ───────────────────────── */
const ICON_THEM = {
  cup: '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  cake: '<path d="M4 20h16v-7H4z"/><path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0"/><path d="M8 13v-3M12 13v-3M16 13v-3"/><path d="M8 7v.5M12 7v.5M16 7v.5"/>',
  gift: '<rect x="3" y="8" width="18" height="4"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  trash: '<path d="M5 7h14l-1.5 13h-11z"/><path d="M9 7V4h6v3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l7-7"/>',
  note: '<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/>',
  door: '<path d="M6 21V3h10v18"/><path d="M3 21h18"/><path d="M13 12h.01"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',
};

/* ───────────────────────── CSS riêng của phòng ───────────────────────── */
const CSS = `
.gt-ov{position:fixed;inset:0;z-index:25;background:rgba(6,30,22,.62);backdrop-filter:blur(4px);display:grid;place-items:center;padding:16px}
.gt-card{background:#fff;border-radius:18px;width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.35);border-top:5px solid var(--gac,#007437)}
.gt-hd{display:flex;align-items:center;gap:10px;padding:12px 12px 8px 18px}.gt-hd b{flex:1;font-size:17px;font-weight:800;color:#063A2B}
.gt-hd small{display:block;font-size:12px;font-weight:600;color:#667085}
.gt-x{width:36px;height:36px;border-radius:50%;background:#F2F4F7;display:grid;place-items:center;color:#344054;flex:none}
.gt-bd{padding:0 16px 16px}.gt-cvw{display:flex;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none}
.gt-cv{display:block;border-radius:14px;touch-action:none}
.gt-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center;margin-top:10px}
.gt-btn{height:42px;padding:0 16px;border-radius:12px;background:#084C38;color:#fff;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:7px}
.gt-btn.cam{background:#E8920A}.gt-btn.ghost{background:#fff;color:#084C38;border:1.5px solid #D0D5DD}.gt-btn[disabled]{opacity:.5;cursor:default}
.gt-btn.big{height:52px;padding:0 22px;font-size:16px}
.gt-msg{text-align:center;font-size:14px;color:#344054;margin-top:8px;min-height:20px;line-height:1.5}
.gt-lb{margin-top:12px;background:#F9FAFB;border:1px solid #F2F4F7;border-radius:12px;padding:10px 12px}
.gt-lb h4{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#667085;margin-bottom:6px}
.gt-lb ol{list-style:none;counter-reset:x}.gt-lb li{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;padding:4px 0;border-bottom:1px dashed #EAECF0;counter-increment:x}
.gt-lb li:last-child{border-bottom:0}.gt-lb li:before{content:counter(x)".";width:22px;color:#98A2B3;font-weight:700}.gt-lb li span{flex:1}.gt-lb li b{font-variant-numeric:tabular-nums;color:#084C38}
.gt-lb li.me{color:#E8920A;font-weight:700}.gt-empty{font-size:13px;color:#98A2B3}
.gt-q{background:linear-gradient(135deg,#123A2C,#0B5A3A);color:#F6E7B0;border-radius:14px;padding:14px 15px;font-size:15px;line-height:1.55}
.gt-q small{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0B2A20;background:#E8920A;border-radius:999px;padding:2px 9px;margin-bottom:8px}
.gt-q .gt-hint{display:block;color:#A8D5BD;font-size:12.5px;margin-top:8px}
.gt-f{display:flex;gap:8px;margin-top:10px}.gt-f input,.gt-f select,.gt-ta{flex:1;min-width:0;height:42px;border:1.5px solid #D0D5DD;border-radius:10px;padding:0 12px;font:inherit;font-size:15px;outline:none;background:#fff}
.gt-ta{width:100%;height:72px;padding:10px 12px;resize:none;display:block}.gt-f input:focus,.gt-ta:focus,.gt-f select:focus{border-color:#007437;box-shadow:0 0 0 4px rgba(0,116,55,.14)}
.gt-f button{height:42px;padding:0 14px;border-radius:10px;background:#E8920A;color:#fff;font-weight:700;font-size:14px;flex:none}.gt-f button[disabled]{opacity:.55}
.gt-res{margin-top:10px;font-size:14px;line-height:1.55;border-radius:10px;padding:10px 12px;white-space:pre-wrap;display:none}.gt-res.ok{display:block;background:#E7F8F0;color:#05603A}.gt-res.no{display:block;background:#FEF3E6;color:#93370D}.gt-res.info{display:block;background:#F2F4F7;color:#344054}
.gt-sub{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#667085;margin:14px 0 6px}
.gt-pr{border:1px solid #F2F4F7;border-radius:12px;padding:10px 12px;margin-bottom:8px}.gt-pr p{font-size:13.5px;line-height:1.5;color:#344054}
.gt-pr button{font-size:12.5px;font-weight:700;color:#007437;margin-top:6px}.gt-pr .ans{display:none;font-size:13px;color:#05603A;margin-top:6px;background:#E7F8F0;border-radius:8px;padding:6px 9px}.gt-pr.open .ans{display:block}
.gt-sn{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;border:1px solid #F2F4F7;margin-bottom:6px}.gt-sn b{flex:1;font-size:14px;color:#063A2B}.gt-sn span{font-size:12.5px;font-weight:700;color:#667085;font-variant-numeric:tabular-nums}
.gt-sn.nay{background:#FEF3E6;border-color:#F7C78A}.gt-sn.nay span{color:#E8920A}
.gt-wish{font-size:13px;line-height:1.5;padding:8px 10px;border-radius:10px;background:#F9FAFB;margin-bottom:6px;position:relative}.gt-wish b{color:#084C38}.gt-wish i{font-style:normal;color:#98A2B3;font-size:11.5px;display:block;margin-top:2px}
.gt-del{position:absolute;top:6px;right:8px;font-size:12px;color:#98A2B3}.gt-del:hover{color:#D92D20}
.gt-chips{display:flex;flex-wrap:wrap;gap:6px}.gt-chips button{height:34px;padding:0 13px;border-radius:999px;border:1.5px solid #D0D5DD;font-size:13px;font-weight:600;color:#084C38;background:#fff}
.gt-chips button.act{background:#E8920A;border-color:#E8920A;color:#fff}
.gt-sw{width:30px;height:30px;border-radius:8px;border:2px solid transparent;flex:none}.gt-sw.act{border-color:#063A2B}
.gt-note{border-radius:4px 4px 12px 4px;padding:10px 12px;margin-bottom:8px;font-size:14px;line-height:1.5;color:#2a2a2a;position:relative;box-shadow:0 2px 6px rgba(0,0,0,.06)}
.gt-note i{display:flex;justify-content:space-between;align-items:center;font-style:normal;font-size:11.5px;color:rgba(0,0,0,.5);margin-top:6px;gap:8px}
.gt-note .lk{font-size:12.5px;font-weight:700;color:#B42318;display:inline-flex;gap:4px;align-items:center}.gt-note .lk.on{color:#D92D20}
.gt-chat{display:flex;flex-direction:column;gap:8px;max-height:min(46vh,380px);overflow:auto;padding:4px 2px 8px}
.gt-chat .msg{max-width:88%}
.gt-quick{display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}.gt-quick::-webkit-scrollbar{display:none}
.gt-quick button{flex:none;height:30px;padding:0 10px;border-radius:999px;background:#fff;border:1px solid #D0D5DD;font-size:12.5px;color:#344054}
.gt-ring{width:180px;height:180px;border-radius:50%;margin:8px auto 6px;display:grid;place-items:center;text-align:center;background:radial-gradient(circle at 50% 45%,#E7F8F0,#CDEBDB);box-shadow:inset 0 0 0 10px rgba(0,116,55,.12);transition:transform 3.8s ease-in-out}
.gt-ring b{display:block;font-size:34px;font-weight:800;color:#063A2B;font-variant-numeric:tabular-nums}.gt-ring span{display:block;font-size:13px;font-weight:600;color:#2E6B52}
.gt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:8px;margin-top:6px}.gt-grid div{text-align:center;font-size:11px;line-height:1.3;color:#344054;background:#F9FAFB;border-radius:10px;padding:6px 4px}
.gt-grid div.no{opacity:.35;filter:grayscale(1)}.gt-grid canvas{display:block;margin:0 auto 2px}
.gt-meter{height:10px;border-radius:999px;background:#F2F4F7;overflow:hidden;margin-top:8px}.gt-meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#0FA968,#E8920A);transition:width .08s}
.gt-tool{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:8px}.gt-tool button{height:36px;padding:0 12px;border-radius:999px;border:1.5px solid #D0D5DD;font-size:13px;font-weight:600;color:#084C38;background:#fff}
.gt-tool button.act{background:#084C38;color:#fff;border-color:#084C38}
.gt-shot{display:block;max-width:100%;border-radius:14px;margin:0 auto}
#gtConf{position:fixed;inset:0;z-index:40;pointer-events:none}
@media (max-width:720px){.gt-ov{padding:0}.gt-card{border-radius:0;height:100%;max-height:none;width:100%}}
`;

/* ───────────────────────── Âm thanh ngắn ───────────────────────── */
function sfx(kind) {
  try {
    A.audioInit(); const ac = A.getAC(); if (!ac) return; if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination);
    const set = (type, f0, f1, dur, v) => { o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.start(t); o.stop(t + dur + .02); };
    if (kind === 'hit') set('triangle', 520, 880, .25, .18);
    else if (kind === 'miss') set('sine', 300, 140, .3, .15);
    else if (kind === 'throw') set('sine', 900, 420, .18, .06);
    else if (kind === 'win') { set('triangle', 660, 1320, .5, .2); setTimeout(() => sfxTone(990, .35), 120); setTimeout(() => sfxTone(1320, .4), 260); }
    else if (kind === 'click') set('square', 1200, 900, .05, .04);
    else if (kind === 'chime') { set('sine', 880, 878, 1.6, .15); setTimeout(() => sfxTone(1318, 1.4), 180); }
    else if (kind === 'thud') set('sine', 160, 60, .2, .25);
  } catch (e) { /* bỏ qua */ }
}
function sfxTone(f, dur) { try { const ac = A.getAC(); const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + .02); } catch (e) { /* bỏ qua */ } }

/* ───────────────────────── Pháo giấy ───────────────────────── */
function confetti(ms) {
  let c = $('gtConf'); if (!c) { c = document.createElement('canvas'); c.id = 'gtConf'; document.body.appendChild(c); }
  const x = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight;
  const cols = ['#E8920A', '#0FA968', '#007437', '#F6C344', '#ffffff', '#8ED1A9', '#E86A5A'];
  const P = Array.from({ length: 170 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 13, vy: -Math.random() * 13 - 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, s: 5 + Math.random() * 7, c: cols[(Math.random() * cols.length) | 0] }));
  const t0 = performance.now();
  (function f(now) {
    x.clearRect(0, 0, W, H); const k = (now - t0) / (ms || 2600);
    P.forEach((p) => { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.globalAlpha = Math.max(0, 1 - k * k); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
    if (k < 1) requestAnimationFrame(f); else x.clearRect(0, 0, W, H);
  })(t0);
}

/* ───────────────────────── Lớp phủ trò chơi ───────────────────────── */
let OV = null;
function overlay(title, sub, color, onClose) {
  closeOv();
  const el = document.createElement('div'); el.className = 'gt-ov';
  el.innerHTML = `<div class="gt-card" style="--gac:${color || '#007437'}"><div class="gt-hd"><div style="flex:1"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div><button class="gt-x" aria-label="Đóng">${A.ic('x', 18)}</button></div><div class="gt-bd"></div></div>`;
  document.body.appendChild(el);
  OV = { el, bd: el.querySelector('.gt-bd'), onClose, key: null, raf: 0 };
  el.querySelector('.gt-x').onclick = closeOv;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) closeOv(); });
  return OV;
}
function closeOv() { if (!OV) return; const o = OV; OV = null; cancelAnimationFrame(o.raf); try { o.onClose && o.onClose(); } catch (e) { /* bỏ qua */ } o.el.remove(); }
function gameCanvas(host, w, h) {
  const wrap = document.createElement('div'); wrap.className = 'gt-cvw'; host.appendChild(wrap);
  const c = document.createElement('canvas'); c.className = 'gt-cv'; wrap.appendChild(c); const x = c.getContext('2d');
  const G = { c, x, W: w, H: h };
  G.fit = () => { const avW = Math.max(240, wrap.getBoundingClientRect().width || 320), avH = Math.max(260, innerHeight - (innerWidth <= 720 ? 230 : 300));
    const s = Math.min(avW / w, avH / h, 1.6), d = Math.min(devicePixelRatio || 1, 2); c.style.width = w * s + 'px'; c.style.height = h * s + 'px'; c.width = Math.round(w * s * d); c.height = Math.round(h * s * d); x.setTransform(s * d, 0, 0, s * d, 0, 0); };
  G.pt = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * w, y: (e.clientY - r.top) / r.height * h }; };
  requestAnimationFrame(G.fit); G.fit();
  return G;
}
function lbHtml(title, rows, unit) {
  const me = S && S.ten;
  return `<div class="gt-lb"><h4>${esc(title)}</h4>${rows && rows.length ? `<ol>${rows.map((r) => `<li class="${r.ten === me ? 'me' : ''}"><span>${esc(r.ten)}</span><b>${r.diem}${unit || ''}</b></li>`).join('')}</ol>` : '<p class="gt-empty">Chưa có ai — chơi đi để lên bảng đầu tiên!</p>'}</div>`;
}

/* ───────────────────────── Kết nối máy chủ (hoặc bản xem thử) ───────────────────────── */
async function api(body) {
  if (S.demo) return demo(body);
  const r = await fetch(A.gtUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ tok: S.tok }, body)) });
  let j = {}; try { j = await r.json(); } catch (e) { /* bỏ qua */ }
  if (r.status === 401 && j.het_phien) { A.logout(); A.toast('Phiên đã hết hạn — nhập lại mã ở cửa nhân viên nhé'); ra(); throw new Error('het_phien'); }
  if (!r.ok) throw new Error(j.loi || 'Máy chủ đang bận, thử lại sau nhé');
  return j;
}
/* Bản xem thử: dữ liệu giả lưu localStorage, dùng khi chưa có hàm máy chủ */
const DEMO_K = 'dbv_gt3d_demo';
function dGet() { try { return JSON.parse(localStorage.getItem(DEMO_K) || '{}'); } catch (e) { return {}; } }
function dSet(o) { try { localStorage.setItem(DEMO_K, JSON.stringify(o)); } catch (e) { /* bỏ qua */ } }
const QUA_DEMO = [['gau', 'Gấu bông xanh', 'Thường'], ['meo', 'Mèo thần tài chốt đơn', 'Thường'], ['ca', 'Cá voi ôm hợp đồng', 'Thường'], ['vit', 'Vịt vàng deadline', 'Hiếm'], ['tho', 'Thỏ trà đá', 'Hiếm'], ['rong', 'Rồng vàng KPI', 'Rất hiếm'], ['sao', 'Ngôi sao tái tục', 'Huyền thoại']];
async function demo(b) {
  await new Promise((r) => setTimeout(r, 250));
  const D = dGet(), now = new Date(), d = now.getDate(), m = now.getMonth() + 1, ngay = now.toISOString().slice(0, 10), me = S.ten;
  D.bxh = D.bxh || [{ ten: 'Trần Minh Anh', diem: 14 }, { ten: 'Lê Hoàng Nam', diem: 11 }, { ten: 'Phạm Thị Hà', diem: 9 }];
  D.nem = D.nem || [{ ten: 'Vũ Đức Long', diem: 7 }, { ten: 'Đỗ Ngọc Mai', diem: 5 }]; D.phitieu = D.phitieu || [{ ten: 'Lê Hoàng Nam', diem: 260 }];
  D.notes = D.notes || [{ id: 'a1', ten: 'Đỗ Ngọc Mai', nd: 'Chiều nay ai đi cà phê muối không ạ?', mau: 'vang', luc: Date.now() - 3600e3, thich: ['x', 'y'] }, { id: 'a2', ten: 'Vũ Đức Long', nd: 'Cảm ơn team vận hành đã hỗ trợ khách gấp hôm qua!', mau: 'xanh', luc: Date.now() - 7200e3, thich: ['x'] }];
  D.chuc = D.chuc || []; D.gap = D.gap || { ngay: '', dung: 0, bst: {} };
  const sn = [{ ten: 'Nguyễn Thu Trang', d, m, nay: true }, { ten: 'Phạm Thị Hà', d: Math.min(28, d + 5), m, nay: false }, { ten: 'Trần Minh Anh', d: Math.max(1, d - 6), m, nay: false }].sort((a, c) => a.d - c.d);
  const notesOut = () => D.notes.slice(-40).map((n) => ({ id: n.id, ten: n.ten, nd: n.nd, mau: n.mau, luc: n.luc, thich: n.thich.length, toi_thich: n.thich.includes('me'), cua_toi: n.ten === me }));
  const top = (L) => L.slice().sort((a, c) => c.diem - a.diem).slice(0, 10);
  const dv = D.dv || { kieu: 'Suy luận', trang: '', cau_hoi: '(Bản xem thử) Họp đầu tuần có 5 người, ai cũng bắt tay mỗi người còn lại đúng 1 lần. Có tất cả bao nhiêu cái bắt tay?', xong: false, nguoi: '', dap_an: '', giai_thich: '', phu: '', phu_xong: false };
  const ret = (o) => { dSet(D); return Object.assign({ ok: true }, o); };
  const upd = (L, sc) => { const r = L.find((x) => x.ten === me); if (!r) L.push({ ten: me, diem: sc }); else r.diem = Math.max(r.diem, sc); };
  switch (b.hanh_dong) {
    case 'tong_quan': return ret({ ten: me, qt: false, hom_nay: { d, m, y: now.getFullYear() }, do_vui: dv, bxh: top(D.bxh), giai: 'Phần quà bí mật 100K (bản xem thử)', sinh_nhat: sn, loi_chuc: D.chuc, tro: { nem: top(D.nem), phitieu: top(D.phitieu) }, gap: { con_luot: D.gap.ngay === ngay ? 3 - D.gap.dung : 3, bst: D.gap.bst, qua: QUA_DEMO.map((q) => ({ id: q[0], ten: q[1], hiem: q[2] })) }, giay_nho: notesOut() });
    case 'do_vui': {
      if (dv.xong) return ret({ ket_qua: 'da_xong', text: 'Câu hôm nay đã có người giải rồi.', do_vui: dv });
      const ok = /(^|\D)10(\D|$)|mười/i.test(b.tra_loi);
      upd(D.bxh, 0); const r = D.bxh.find((x) => x.ten === me); r.diem += ok ? 4 : 1;
      if (ok) { Object.assign(dv, { xong: true, nguoi: me, dap_an: '10', giai_thich: '5×4÷2 = 10 cái bắt tay.' }); D.dv = dv; }
      return ret({ ket_qua: ok ? 'dung' : 'sai', text: ok ? '🎉 CHÍNH XÁC! ' + me + ' nhanh tay nhất, +4 điểm. Đáp án: 10 💡 5×4÷2 = 10 cái.' : 'Chưa đúng rồi 😅 +1 điểm tham gia. Nghĩ thêm chút nữa nha!', do_vui: dv, bxh: top(D.bxh) });
    }
    case 'diem': { const L = b.tro === 'nem' ? D.nem : D.phitieu; const cu = (L.find((x) => x.ten === me) || {}).diem; upd(L, b.diem); return ret({ ky_luc: cu == null || b.diem > cu, cao_nhat: Math.max(cu || 0, b.diem), bang: top(L) }); }
    case 'gap': {
      if (D.gap.ngay !== ngay) { D.gap.ngay = ngay; D.gap.dung = 0; }
      if (D.gap.dung >= 3) return ret({ het_luot: true, con_luot: 0, bst: D.gap.bst });
      D.gap.dung++; const trung = Math.random() < .12 + .62 * (b.gan || 0); let qua = null;
      if (trung) { const q = QUA_DEMO[Math.floor(Math.random() * QUA_DEMO.length)]; qua = { id: q[0], ten: q[1], hiem: q[2] }; D.gap.bst[q[0]] = (D.gap.bst[q[0]] || 0) + 1; }
      return ret({ trung, qua, con_luot: 3 - D.gap.dung, bst: D.gap.bst });
    }
    case 'chuc': D.chuc.push({ id: 'c' + Date.now(), cho: b.cho, tu: me, loi: b.loi, luc: Date.now(), uid: 'me' }); return ret({ loi_chuc: D.chuc });
    case 'giay_nho': D.notes.push({ id: 'n' + Date.now(), ten: me, nd: b.noi_dung, mau: b.mau, luc: Date.now(), thich: [] }); return ret({ giay_nho: notesOut() });
    case 'thich': { const n = D.notes.find((x) => x.id === b.id); if (n) { const i = n.thich.indexOf('me'); if (i >= 0) n.thich.splice(i, 1); else n.thich.push('me'); } return ret({ giay_nho: notesOut() }); }
    case 'xoa': if (b.loai === 'chuc') { D.chuc = D.chuc.filter((x) => x.id !== b.id); return ret({ loi_chuc: D.chuc }); } D.notes = D.notes.filter((x) => x.id !== b.id); return ret({ giay_nho: notesOut() });
    case 'chat': {
      const q = String(b.cau).toLowerCase(); const L = [
        [/cười|vui|joke/, 'Sếp hỏi: "Sao em đi làm muộn?" — "Dạ tại biển báo ghi: Trường học, đi chậm lại ạ!" 😆 Anh/chị kể em nghe một chuyện vui đi!'],
        [/ăn|trưa|đói/, 'Trưa nay em đề cử bún chả que tre, ăn xong làm việc như được nạp pin 100% 🔋 Hay anh/chị thích bánh cuốn nóng hơn ạ?'],
        [/bói|hôm nay/, 'Quẻ hôm nay: tài lộc lấp lánh, gặp quý nhân ở quầy trà chiều 🍵 Màu may mắn: xanh DBV!'],
        [/đố/, 'Đố anh/chị: cái gì càng kéo càng ngắn? 🤔 (Gợi ý: hút thuốc là có hại đó nha!)']];
      const f = L.find((x) => x[0].test(q)); return ret({ text: (f ? f[1] : 'Em là bản xem thử nên hơi ngơ ngác chút 😅 Khi lên dbv247.com.vn em nói chuyện thật nha! Giờ anh/chị muốn nghe chuyện cười hay bói vui ạ?') });
    }
  }
  return ret({});
}
async function loadData() {
  try { DATA = await api({ hanh_dong: 'tong_quan' }); drawAll(); } catch (e) { if (e.message !== 'het_phien') console.warn('giai-tri:', e.message); }
}

/* ───────────────────────── Dựng phòng 3D ───────────────────────── */
function wrapText(x, t, maxW) { const w = String(t).split(' '), L = []; let cur = ''; w.forEach((s) => { const n = cur ? cur + ' ' + s : s; if (x.measureText(n).width > maxW && cur) { L.push(cur); cur = s; } else cur = n; }); if (cur) L.push(cur); return L; }
function panelMesh(tex, w, h, x, y, z, ry, std) { const m = new A.THREE.Mesh(new A.THREE.PlaneGeometry(w, h), std ? A.std('#ffffff', { map: tex, roughness: .7 }) : A.basic(tex)); m.position.set(x, y, z); m.rotation.y = ry || 0; A.scene.add(m); return m; }
function st(id, o) { A.STATIONS[id] = Object.assign({ kind: 'info', walk: o.stand.clone().setY(A.EYE) }, o); }
function hb(w, h, d, x, y, z, id, label, ry) { return A.hitBox(w, h, d, x, y, z, { type: 'st', id, label }, ry || 0); }

function buildRoom() {
  const { THREE, V3, EYE, RH, box, cyl, std, ctex, rr } = A;
  const before = new Set(A.scene.children);
  const wallM = std('#F1E8DA', { roughness: .9 }), accentM = std('#0E3B2C', { roughness: .4, metalness: .1 }), brass = A.MB.brass || std('#B8925A', { metalness: .85, roughness: .3 });

  /* Sàn gỗ + thảm tròn + tường + trần */
  const wt = A.M.wood.map.clone(); wt.needsUpdate = true; wt.repeat.set(7, 5);
  A.floorRect(R.x0, R.z0, R.x1, R.z1, std('#ffffff', { map: wt, roughness: .5 }), 0);
  const rug = ctex(1024, 1024, (x, w) => { const c = w / 2; x.fillStyle = '#E9DFCB'; x.beginPath(); x.arc(c, c, 510, 0, 7); x.fill(); x.strokeStyle = '#007437'; x.lineWidth = 34; x.beginPath(); x.arc(c, c, 470, 0, 7); x.stroke();
    x.strokeStyle = '#E8920A'; x.lineWidth = 10; x.beginPath(); x.arc(c, c, 420, 0, 7); x.stroke(); x.fillStyle = 'rgba(0,116,55,.08)'; for (let i = 0; i < 12; i++) { x.save(); x.translate(c, c); x.rotate(i * Math.PI / 6); x.beginPath(); x.ellipse(0, -250, 60, 130, 0, 0, 7); x.fill(); x.restore(); } });
  const rm = new THREE.Mesh(new THREE.CircleGeometry(3.1, 64), std('#ffffff', { map: rug, roughness: 1, transparent: true })); rm.rotation.x = -Math.PI / 2; rm.position.set(-.6, .009, -30.2); rm.receiveShadow = true; A.scene.add(rm);
  [['x', R.z1, R.x0 - .1, R.x1 + .1], ['x', R.z0, R.x0 - .1, R.x1 + .1], ['z', R.x0, R.z0, R.z1], ['z', R.x1, R.z0, R.z1]].forEach(([ax, f, a, b]) => A.wallRun(ax, f, a, b, [], { h: RH, mat: wallM }));
  A.ceilRect(R.x0, R.z0, R.x1, R.z1, RH, 0);
  // vách nhấn xanh đậm tường sau + nẹp đồng, dải xanh chân tường quanh phòng
  box(17.6, 2.9, .04, accentM, 0, 1.75, R.z0 + .12, A.scene, false);[.3, 3.2].forEach((y) => box(17.7, .04, .05, brass, 0, y, R.z0 + .13, A.scene, false));
  [[-1, R.x0 + .12], [1, R.x1 - .12]].forEach(([s, x]) => { box(.03, .9, 13.8, std('#DCEFE3', { roughness: .8 }), x, .55, -29, A.scene, false); box(.04, .04, 13.8, brass, x, 1.0, -29, A.scene, false); });
  box(17.8, .9, .03, std('#DCEFE3', { roughness: .8 }), 0, .55, R.z1 - .12, A.scene, false);
  // đèn trần + dây đèn trang trí
  const lm = new THREE.MeshBasicMaterial({ color: '#fff3df', toneMapped: false });
  for (let x = -6; x <= 6; x += 4) for (let z = -33.5; z <= -24; z += 3.2) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .36), lm); l.rotation.x = Math.PI / 2; l.position.set(x, RH - .01, z); A.scene.add(l); }
  { const N = 4 * 26, im = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd89a', toneMapped: false }), N), m4 = new THREE.Matrix4(); let i = 0;
    [[-8.6, -23, 8.6, -27.5], [8.6, -27.5, -8.6, -31.5], [-8.6, -31.5, 8.6, -35.5], [-8.6, -23, -8.6, -35.5]].forEach(([x0, z0, x1, z1]) => { for (let k = 0; k < 26; k++) { const s = k / 25; m4.makeTranslation(x0 + (x1 - x0) * s, RH - .12 - Math.sin(s * Math.PI) * .5, z0 + (z1 - z0) * s); im.setMatrixAt(i++, m4); } });
    A.scene.add(im); OBJ.bulbs = im; }

  /* Biển neon PHÒNG GIẢI TRÍ trên tường sau */
  const neon = ctex(1600, 300, (x, w, h) => { x.clearRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 150px ' + F;
    x.shadowColor = '#FFB547'; x.shadowBlur = 40; x.fillStyle = '#FFE2A8'; x.fillText('PHÒNG GIẢI TRÍ', w / 2, h / 2 - 10); x.shadowBlur = 16; x.fillText('PHÒNG GIẢI TRÍ', w / 2, h / 2 - 10);
    x.shadowColor = '#5FE0A2'; x.shadowBlur = 22; x.fillStyle = '#C9F5DD'; x.font = '700 46px ' + F; x.fillText('Làm hết sức · Chơi hết mình', w / 2, h - 34); });
  { const m = panelMesh(neon, 5.2, .98, 0, 2.86, R.z0 + .16); m.material.transparent = true; }

  /* ── 1. Quầy trà chiều + bảng đố vui ── */
  { const cx = -4.3, cz = -35.15, wood = A.M.wood;
    box(3.1, .96, .72, wood, cx, .48, cz); box(3.2, .06, .8, A.M.white, cx, .99, cz); box(3.12, .05, .02, new THREE.MeshBasicMaterial({ color: '#E8920A' }), cx, .82, cz + .37, A.scene, false);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 14), std('#E6EDE8', { roughness: .25 })); pot.scale.y = .8; pot.position.set(cx - .8, 1.12, cz); A.scene.add(pot);
    cyl(.012, .022, .14, std('#E6EDE8'), cx - .66, 1.15, cz, A.scene, 8).rotation.z = -1; cyl(.05, .05, .03, std('#E6EDE8'), cx - .8, 1.23, cz, A.scene, 12);
    for (let i = 0; i < 5; i++) { cyl(.04, .032, .07, A.M.white, cx - .35 + i * .2, 1.06, cz + .1, A.scene, 14); cyl(.035, .035, .004, std('#b8741a', { roughness: .2 }), cx - .35 + i * .2, 1.093, cz + .1, A.scene, 14); }
    cyl(.16, .16, .015, A.M.white, cx + .8, 1.03, cz, A.scene, 20); for (let i = 0; i < 6; i++) cyl(.035, .035, .015, std('#C98B45', { roughness: .8 }), cx + .8 + Math.cos(i) * .08, 1.05 + i * .004, cz + Math.sin(i) * .08, A.scene, 12);
    TX.board = ctex(1024, 640, () => {}); const bm = panelMesh(TX.board, 2.9, 1.81, cx, 2.15, R.z0 + .17); bm.material.toneMapped = false;
    box(3.0, 1.9, .05, std('#6b4a2c', { roughness: .6 }), cx, 2.15, R.z0 + .14, A.scene, false);
    A.obstacle(cx - 1.6, cz - .45, cx + 1.6, cz + .45); A.blob(cx, cz, 3.6, 1.4, .6);
    hb(3.2, 3, 1.2, cx, 1.5, cz + .1, 'gt_dovui', 'Quầy trà chiều — đố vui 15:00, cộng điểm chung với nhóm Zalo');
    st('gt_dovui', { name: 'Quầy trà chiều', stand: new V3(cx, EYE, -32.4), look: new V3(cx, 1.7, R.z0), back: new V3(cx, EYE, -31.6), open: openDoVui }); }

  /* ── 2. Bot em gái DBV ── */
  { const bx = .7, bz = -35.0;
    OBJ.bot = A.person({ female: true, suit: '#007437', accent: '#E8920A', hair: '#2b1a12', pants: '#1f2a3d', tag: true }, bx, bz, 0);
    cyl(.5, .55, .84, A.M.white, bx, .42, bz + .78, A.scene, 32); cyl(.56, .56, .05, A.M.navy, bx, .86, bz + .78, A.scene, 32);
    const pn = ctex(1024, 256, (x, w, h) => { x.fillStyle = '#063A2B'; rr(x, 0, 0, w, h, 40); x.fill(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#FF8FB1'; x.shadowBlur = 24; x.fillStyle = '#FFD1E0'; x.font = '900 92px ' + F; x.fillText('Bot em gái DBV', w / 2, h / 2 - 16); x.shadowBlur = 0; x.fillStyle = '#A8D5BD'; x.font = '600 40px ' + F; x.fillText('tám chuyện · kể chuyện cười · bói vui', w / 2, h - 46); });
    const pm = panelMesh(pn, 1.2, .3, bx, .52, bz + 1.34); pm.material.transparent = true;
    A.obstacle(bx - .7, bz - .4, bx + .7, bz + 1.4); A.blob(bx, bz + .5, 1.8, 2, .6);
    hb(1.6, 2.2, 2, bx, 1.1, bz + .5, 'gt_bot', 'Bot em gái DBV — trò chuyện, kể chuyện cười, bói vui');
    st('gt_bot', { name: 'Bot em gái DBV', stand: new V3(bx, EYE, -31.4), look: new V3(bx, 1.5, bz), back: new V3(bx, EYE, -30.6), open: openBot }); }

  /* ── 3. Tường sinh nhật + bánh kem ── */
  { const sx = 5.4, sz = -34.4;
    TX.bday = ctex(1024, 640, () => {}); const bm = panelMesh(TX.bday, 3.4, 2.12, sx, 2.05, R.z0 + .17); bm.material.toneMapped = false;
    cyl(.55, .55, .05, A.M.white, sx, .76, sz, A.scene, 28); cyl(.05, .22, .74, A.M.frame, sx, .37, sz, A.scene, 12);
    const cakeM = [std('#FFF4E6', { roughness: .5 }), std('#F7C9D3', { roughness: .5 }), std('#ffffff', { roughness: .4 })];
    cyl(.3, .3, .16, cakeM[0], sx, .87, sz, A.scene, 32); cyl(.31, .31, .03, std('#E8920A', { roughness: .4 }), sx, .82, sz, A.scene, 32); cyl(.22, .22, .14, cakeM[1], sx, 1.02, sz, A.scene, 32); cyl(.14, .14, .1, cakeM[2], sx, 1.14, sz, A.scene, 28);
    OBJ.flames = []; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283, px = sx + Math.cos(a) * .09, pz = sz + Math.sin(a) * .09;
      cyl(.008, .008, .09, std(['#0FA968', '#E8920A', '#ffffff', '#F7C9D3', '#007437'][i]), px, 1.235, pz, A.scene, 6);
      const f = new THREE.Mesh(new THREE.ConeGeometry(.014, .045, 8), new THREE.MeshBasicMaterial({ color: '#FFB547', toneMapped: false })); f.position.set(px, 1.305, pz); A.scene.add(f);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFD27A', transparent: true, opacity: .35, toneMapped: false, depthWrite: false })); gl.position.copy(f.position); A.scene.add(gl); OBJ.flames.push({ f, gl }); }
    OBJ.balloons = []; const bc = ['#E8920A', '#0FA968', '#ffffff', '#F7C9D3', '#007437', '#F6C344'];
    [[sx - 2.1, -35.3], [sx + 2.1, -35.3], [sx - 1.8, -34.6], [sx + 1.9, -34.7]].forEach(([x, z], k) => { for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.17, 20, 16), std(bc[(k * 3 + i) % 6], { roughness: .25 })); b.scale.y = 1.18;
      const y = 2.1 + i * .3 + (k % 2) * .15; b.position.set(x + (i - 1) * .2, y, z + (i % 2) * .12); A.scene.add(b); const s = cyl(.003, .003, y - .2, std('#ffffff'), x, (y - .2) / 2, z, A.scene, 4); OBJ.balloons.push({ b, y, p: Math.random() * 6 }); s.castShadow = false; } });
    [[sx - 1.1, -35.5, '#E8920A'], [sx + 1.2, -35.45, '#007437'], [sx + .8, -35.6, '#F7C9D3']].forEach(([x, z, c]) => { box(.36, .3, .36, std(c, { roughness: .6 }), x, .15, z); box(.38, .04, .07, std('#ffffff'), x, .31, z, A.scene, false); });
    A.obstacle(sx - .6, sz - .6, sx + .6, sz + .6); A.obstacle(sx - 1.4, -35.8, sx + 1.4, -35.2); A.blob(sx, sz, 1.6, 1.6, .6);
    hb(3.4, 2.6, 1.6, sx, 1.3, -35, 'gt_sinhnhat', 'Tường sinh nhật — thổi nến, gửi lời chúc');
    st('gt_sinhnhat', { name: 'Tường sinh nhật', stand: new V3(sx, EYE, -32.0), look: new V3(sx, 1.35, -35.2), back: new V3(sx, EYE, -31.3), open: openSinhNhat }); }

  /* ── 4. Máy gắp thú ── */
  { const gx = -7.55, gz = -34.3, g = new THREE.Group(); g.position.set(gx, 0, gz); A.scene.add(g);
    box(1.3, .85, 1.2, std('#007437', { roughness: .45 }), 0, .425, 0, g); box(1.32, .06, 1.22, std('#E8920A', { roughness: .4 }), 0, .86, 0, g, false);
    const glass = new THREE.MeshStandardMaterial({ color: '#dff0ff', transparent: true, opacity: .18, roughness: .05, depthWrite: false });
    const gb = new THREE.Mesh(new THREE.BoxGeometry(1.24, 1.15, 1.14), glass); gb.position.y = 1.47; gb.renderOrder = 2; g.add(gb);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.05, 1.18, .05, std('#E8920A', { roughness: .4 }), a * .62, 1.47, b * .57, g, false));
    box(1.3, .32, 1.2, std('#007437', { roughness: .45 }), 0, 2.2, 0, g);
    const sg = ctex(512, 128, (x, w, h) => { x.fillStyle = '#063A2B'; x.fillRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#FFB547'; x.shadowBlur = 18; x.fillStyle = '#FFE2A8'; x.font = '900 64px ' + F; x.fillText('GẮP THÚ DBV', w / 2, h / 2 + 2); });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .3), A.basic(sg)); sm.position.set(0, 2.2, .605); g.add(sm);
    const pc = ['#0FA968', '#F6C344', '#5AA9E6', '#F7C9D3', '#ffffff', '#E8920A', '#C9B8F0'];
    for (let i = 0; i < 16; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.09 + Math.random() * .04, 14, 10), std(pc[i % pc.length], { roughness: .8 })); p.position.set(-.45 + (i % 5) * .22 + Math.random() * .05, .98 + Math.floor(i / 5) * .09, -.38 + ((i * 7) % 5) * .19); g.add(p); }
    const claw = new THREE.Group(); claw.position.set(.15, 1.95, .05); g.add(claw); OBJ.claw = claw;
    cyl(.006, .006, .3, A.M.chrome, 0, -.15, 0, claw, 6); cyl(.05, .05, .05, A.M.chrome, 0, -.3, 0, claw, 12);
    for (let i = 0; i < 3; i++) { const pr = new THREE.Group(); pr.rotation.y = i * 2.094; claw.add(pr); const a = cyl(.008, .008, .16, A.M.chrome, .05, -.38, 0, pr, 6); a.rotation.z = .5; }
    box(.36, .03, .26, std('#1d2433'), 0, .9, .45, g, false); cyl(.012, .012, .1, std('#1d2433'), -.08, .95, .47, g, 8); const kb = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), std('#E8920A')); kb.position.set(-.08, 1.01, .47); g.add(kb);
    cyl(.04, .04, .02, std('#E86A5A', { roughness: .3 }), .1, .925, .48, g, 14);
    A.obstacle(gx - .7, gz - .65, gx + .7, gz + .65); A.blob(gx, gz, 1.8, 1.7, .7);
    hb(1.4, 2.4, 1.3, gx, 1.2, gz, 'gt_gap', 'Máy gắp thú — 3 lượt mỗi ngày');
    st('gt_gap', { name: 'Máy gắp thú', stand: new V3(gx + .35, EYE, -31.9), look: new V3(gx, 1.35, gz), back: new V3(gx + .6, EYE, -31.1), open: openGap }); }

  /* ── 5. Phi tiêu bảng KPI (tường trái) ── */
  { const dz = -24.9, dx = R.x0 + .13;
    const dt = ctex(1024, 1024, (x, w) => drawDartBoard(x, w)); const dm = new THREE.Mesh(new THREE.CircleGeometry(.46, 64), A.basic(dt)); dm.position.set(dx + .04, 1.75, dz); dm.rotation.y = Math.PI / 2; A.scene.add(dm);
    const cab = box(.06, 1.25, 1.25, std('#6b4a2c', { roughness: .6 }), dx, 1.75, dz, A.scene, false); cab.castShadow = false;
    [[.08, .1], [-.12, -.05], [.02, -.18]].forEach(([a, b]) => { const d = new THREE.Group(); d.position.set(dx + .1, 1.75 + b, dz + a); d.rotation.z = Math.PI / 2 + .1; A.scene.add(d); cyl(.006, .004, .14, std('#2b3036'), 0, 0, 0, d, 6); const fl = new THREE.Mesh(new THREE.ConeGeometry(.02, .05, 3), std('#E8920A')); fl.position.y = -.08; d.add(fl); });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(.06, 1.4), new THREE.MeshBasicMaterial({ color: '#E8920A' })); line.rotation.x = -Math.PI / 2; line.position.set(-5.9, .011, dz); A.scene.add(line);
    const sign = ctex(512, 160, (x, w, h) => { x.fillStyle = '#084C38'; rr(x, 0, 0, w, h, 26); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 64px ' + F; x.fillText('PHI TIÊU KPI', w / 2, 82); x.fillStyle = '#A8D5BD'; x.font = '600 32px ' + F; x.fillText('Bắn trúng tâm = Vượt KPI', w / 2, 128); });
    panelMesh(sign, 1.1, .34, dx + .04, 2.72, dz, Math.PI / 2).material.transparent = true;
    hb(.6, 1.6, 1.4, dx + .3, 1.75, dz, 'gt_phitieu', 'Phi tiêu bảng KPI — 5 phi tiêu, bảng xếp hạng tuần');
    st('gt_phitieu', { name: 'Phi tiêu KPI', stand: new V3(-5.5, EYE, dz), look: new V3(dx, 1.75, dz), back: new V3(-4.8, EYE, dz), open: openPhiTieu }); }

  /* ── 6. Góc chụp ảnh (tường trái) ── */
  { const pz = -29.6, px = R.x0 + .13;
    const bk = ctex(1024, 1024, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); const L = A.IMG.full;
      for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { const ox = c * 256 + (r % 2 ? 128 : 0) - 64, oy = r * 175 + 40; if (L) { const lw = 170, lh = lw * L.height / L.width; x.drawImage(L, ox + 43, oy, lw, lh); } else { x.fillStyle = '#007437'; x.font = '800 40px ' + F; x.fillText('DBV', ox + 80, oy + 40); } }
      x.fillStyle = 'rgba(0,116,55,.92)'; x.fillRect(0, h - 120, w, 120); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '800 54px ' + F; x.fillText('Chi nhánh Thành Đô · Phòng giải trí', w / 2, h - 44); });
    panelMesh(bk, 2.6, 2.6, px + .03, 1.6, pz, Math.PI / 2, true);
    box(.05, 2.7, 2.7, std('#d8d4cc', { roughness: .9 }), px, 1.6, pz, A.scene, false);
    const rl = new THREE.Group(); rl.position.set(-6.5, 0, pz - 1.1); rl.rotation.y = -Math.PI / 2 + .35; A.scene.add(rl);
    cyl(.015, .015, 1.6, A.M.frame, 0, .8, 0, rl, 8);[0, 2.09, 4.19].forEach((a) => { const l = cyl(.01, .01, .5, A.M.frame, Math.cos(a) * .15, .2, Math.sin(a) * .15, rl, 6); l.rotation.z = Math.cos(a) * .5; l.rotation.x = -Math.sin(a) * .5; });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.26, .03, 12, 40), new THREE.MeshBasicMaterial({ color: '#fffaf0', toneMapped: false })); ring.position.y = 1.7; rl.add(ring); OBJ.ring = ring;
    box(.09, .16, .02, std('#111'), 0, 1.7, .01, rl, false);
    const mk = new THREE.Mesh(new THREE.RingGeometry(.28, .34, 32), new THREE.MeshBasicMaterial({ color: '#E8920A' })); mk.rotation.x = -Math.PI / 2; mk.position.set(px + 1.2, .012, pz); A.scene.add(mk);
    A.obstacle(-6.7, pz - 1.3, -6.3, pz - .9);
    hb(.6, 2.6, 2.6, px + .3, 1.5, pz, 'gt_anh', 'Góc chụp ảnh — chụp ảnh khung DBV, tải về đăng nhóm');
    st('gt_anh', { name: 'Góc chụp ảnh', stand: new V3(-5.4, EYE, pz), look: new V3(px, 1.55, pz), back: new V3(-4.7, EYE, pz), open: openAnh }); }

  /* ── 7. Ném giấy vào thùng rác ── */
  { const nx = 3.0, deskZ = -25.6, binZ = -29.3;
    box(1.3, .05, .65, A.M.white, nx, .74, deskZ); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.04, .72, .04, A.M.frame, nx + a * .6, .36, deskZ + b * .28, A.scene, false));
    const paper = std('#f7f7f2', { roughness: .95, flatShading: true });
    for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(.055, 0), paper); p.position.set(nx - .3 + (i % 4) * .12, .8 + Math.floor(i / 4) * .07, deskZ + (i % 2) * .08); p.rotation.set(i, i * 2, i * 3); A.scene.add(p); }
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(.24, .19, .5, 24, 1, true), std('#2b3036', { roughness: .5, side: THREE.DoubleSide })); bin.position.set(nx, .25, binZ); A.scene.add(bin);
    const bb = new THREE.Mesh(new THREE.CircleGeometry(.19, 24), std('#2b3036')); bb.rotation.x = -Math.PI / 2; bb.position.set(nx, .01, binZ); A.scene.add(bb);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.24, .012, 8, 32), std('#E8920A')); rim.rotation.x = Math.PI / 2; rim.position.set(nx, .5, binZ); A.scene.add(rim);
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(.055, 0), paper); p.position.set(nx + Math.cos(i * 1.7) * (.45 + i * .07), .05, binZ + Math.sin(i * 1.7) * (.4 + i * .05)); A.scene.add(p); }
    const fan = new THREE.Group(); fan.position.set(nx + 1.5, 0, binZ + .5); fan.rotation.y = -Math.PI / 2 - .4; A.scene.add(fan);
    cyl(.16, .2, .05, std('#E6EDE8'), 0, .025, 0, fan, 20); cyl(.015, .015, 1.1, std('#E6EDE8'), 0, .58, 0, fan, 8);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(.22, .01, 6, 30), std('#E6EDE8')); cage.position.set(0, 1.18, .05); fan.add(cage);
    const blades = new THREE.Group(); blades.position.set(0, 1.18, .05); fan.add(blades); OBJ.fan = blades;
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CircleGeometry(.09, 12), std('#5AA9E6', { side: THREE.DoubleSide })); b.scale.set(1, .45, 1); b.rotation.z = i * 2.094; b.position.set(Math.cos(i * 2.094 + 1.57) * .08, Math.sin(i * 2.094 + 1.57) * .08, 0); blades.add(b); }
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .06), new THREE.MeshBasicMaterial({ color: '#E8920A' })); tape.rotation.x = -Math.PI / 2; tape.position.set(nx, .011, deskZ - .7); A.scene.add(tape);
    A.obstacle(nx - .7, deskZ - .36, nx + .7, deskZ + .36); A.obstacle(nx - .3, binZ - .3, nx + .3, binZ + .3); A.obstacle(nx + 1.3, binZ + .3, nx + 1.7, binZ + .7);
    hb(1.4, 1.2, .8, nx, .7, deskZ, 'gt_nem', 'Ném giấy vào thùng rác — 10 viên, có gió quạt');
    hb(.7, .8, .7, nx, .4, binZ, 'gt_nem', 'Ném giấy vào thùng rác');
    st('gt_nem', { name: 'Ném giấy', stand: new V3(nx, EYE, deskZ - 1.15), look: new V3(nx, .3, binZ), back: new V3(nx - .9, EYE, deskZ - 1.6), open: openNem }); }

  /* ── 8. Máy nghe nhạc (tường phải) ── */
  { const jx = R.x1 - .45, jz = -24.4, g = new THREE.Group(); g.position.set(jx, 0, jz); g.rotation.y = -Math.PI / 2; A.scene.add(g);
    const body = std('#6b2f1f', { roughness: .45 }), trim = std('#E8C27A', { metalness: .6, roughness: .3 });
    box(1.0, 1.25, .6, body, 0, .625, 0, g); const top = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .6, 32, 1, false, 0, Math.PI), body); top.rotation.z = Math.PI / 2; top.rotation.y = Math.PI / 2; top.position.y = 1.25; g.add(top);
    TX.juke = ctex(512, 512, () => {}); const sc = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78), A.basic(TX.juke)); sc.position.set(0, 1.0, .305); g.add(sc);
    OBJ.jukeLights = []; [-.47, .47].forEach((x) => { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.1, .05), new THREE.MeshBasicMaterial({ color: '#ffb36b', toneMapped: false })); l.position.set(x, .9, .29); g.add(l); OBJ.jukeLights.push(l); });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(.47, .025, 8, 40, Math.PI), new THREE.MeshBasicMaterial({ color: '#ffb36b', toneMapped: false })); arch.position.set(0, 1.25, .29); g.add(arch); OBJ.jukeLights.push(arch);
    box(.9, .05, .62, trim, 0, .1, 0, g, false); box(.9, .3, .02, std('#3a1a10', { roughness: .8 }), 0, .32, .3, g, false);
    A.obstacle(jx - .35, jz - .55, jx + .45, jz + .55); A.blob(jx, jz, 1.2, 1.4, .6);
    hb(.8, 1.8, 1.1, jx, .9, jz, 'gt_nhac', 'Máy nghe nhạc — chọn nhạc cho cả văn phòng');
    st('gt_nhac', { name: 'Máy nghe nhạc', stand: new V3(6.3, EYE, jz), look: new V3(jx, 1.15, jz), back: new V3(5.6, EYE, jz), open: openNhac }); }

  /* ── 9. Bảng giấy nhớ (tường phải) ── */
  { const nz = -28.3, nx = R.x1 - .13;
    TX.cork = ctex(1024, 640, () => {}); const cm = panelMesh(TX.cork, 2.7, 1.69, nx - .03, 1.75, nz, -Math.PI / 2, true); cm.material.roughness = .9;
    box(.05, 1.8, 2.82, std('#6b4a2c', { roughness: .6 }), nx, 1.75, nz, A.scene, false);
    const ts = ctex(512, 120, (x, w, h) => { x.fillStyle = '#E8920A'; rr(x, 0, 0, w, h, 24); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 56px ' + F; x.fillText('BẢNG GIẤY NHỚ', w / 2, 80); });
    panelMesh(ts, 1.2, .28, nx - .04, 2.85, nz, -Math.PI / 2).material.transparent = true;
    hb(.5, 1.9, 2.8, nx - .25, 1.75, nz, 'gt_giaynho', 'Bảng giấy nhớ — dán lời nhắn, thả tim');
    st('gt_giaynho', { name: 'Bảng giấy nhớ', stand: new V3(5.7, EYE, nz), look: new V3(nx, 1.7, nz), back: new V3(5.0, EYE, nz), open: openGiayNho }); }

  /* ── 10. Góc thư giãn: ghế massage nhìn ra "cửa sổ" ── */
  { const cx = 7.0, cz = -32.1, chM = std('#0E3B2C', { roughness: .5 }), g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = Math.PI / 2; A.scene.add(g);
    const _r = 0; box(.75, .45, .8, chM, 0, .3, 0, g); const bk = box(.75, .95, .22, chM, 0, .85, -.42, g); bk.rotation.x = -.35; box(.18, .55, .8, chM, -.42, .55, 0, g); box(.18, .55, .8, chM, .42, .55, 0, g);
    const fr = box(.6, .12, .55, chM, 0, .22, .62, g); fr.rotation.x = .5; box(.5, .2, .1, std('#E8920A', { roughness: .5 }), 0, 1.2, -.58, g);
    const win = ctex(1024, 640, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8EC5EA'); gr.addColorStop(.7, '#DDEFF8'); gr.addColorStop(1, '#F6E9D6'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.85)'; [[200, 120, 60], [260, 110, 80], [330, 125, 55], [700, 90, 70], [770, 80, 90], [840, 95, 60]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
      for (let i = 0; i < 18; i++) { const bw = 40 + (i * 37) % 60, bh = 120 + (i * 71) % 200; x.fillStyle = ['#A9BFCF', '#B9CCD9', '#9DB3C4'][i % 3]; x.fillRect(i * 58, h - 140 - bh, bw, bh + 140); }
      x.fillStyle = '#4f9a62'; for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(i * 42, h - 40 + Math.sin(i) * 12, 46, 0, 7); x.fill(); }
      x.strokeStyle = '#fff'; x.lineWidth = 22; x.strokeRect(11, 11, w - 22, h - 22); x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke(); });
    panelMesh(win, 2.4, 1.5, R.x1 - .2, 1.85, cz, -Math.PI / 2);
    box(.06, 1.62, 2.52, std('#ffffff', { roughness: .5 }), R.x1 - .12, 1.85, cz, A.scene, false);
    [[6.3, -33.5, '#E8920A'], [6.4, -30.6, '#EDE6DA']].forEach(([x, z, c]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(.42, 24, 16), std(c, { roughness: .95 })); b.scale.set(1, .55, 1); b.position.set(x, .24, z); b.castShadow = true; A.scene.add(b); A.obstacle(x - .4, z - .4, x + .4, z + .4); });
    cyl(.012, .012, 1.6, brass, 8.3, .8, -33.6, A.scene, 8); const sh = new THREE.Mesh(new THREE.CylinderGeometry(.14, .22, .25, 20, 1, true), std('#F7F1E6', { side: THREE.DoubleSide })); sh.position.set(8.3, 1.65, -33.6); A.scene.add(sh);
    A.plant(8.35, -30.5, 'ficus', .95); A.obstacle(cx - .6, cz - .5, cx + .7, cz + .5); A.blob(cx, cz, 1.6, 1.4, .6);
    hb(1.2, 1.4, 1.1, cx, .7, cz, 'gt_thugian', 'Ghế thư giãn — nghỉ 1, 3 hoặc 5 phút');
    st('gt_thugian', { name: 'Ghế thư giãn', walk: new V3(5.8, EYE, cz), stand: new V3(7.02, 1.22, cz), look: new V3(R.x1, 1.6, cz), back: new V3(5.6, EYE, cz), open: openThuGian }); }

  /* ── Cửa ra sảnh (tường trước, sau lưng lúc vào) ── */
  { const ez = R.z1 - .12;
    box(1.25, 2.35, .08, std('#8a5a3c', { roughness: .55 }), 0, 1.175, ez); box(1.4, .08, .12, A.M.frame, 0, 2.39, ez, A.scene, false);[-1, 1].forEach((s) => box(.08, 2.4, .12, A.M.frame, s * .66, 1.2, ez, A.scene, false));
    cyl(.02, .02, .3, brass, .45, 1.1, ez - .07, A.scene, 8).rotation.x = Math.PI / 2;
    const es = ctex(512, 140, (x, w, h) => { x.fillStyle = '#0FA968'; rr(x, 0, 0, w, h, 24); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 70px ' + F; x.fillText('RA SẢNH  ⟶', w / 2, 96); });
    panelMesh(es, 1.1, .3, 0, 2.7, ez - .06, Math.PI);
    const slg = ctex(1600, 260, (x, w, h) => { x.textAlign = 'center'; x.fillStyle = '#084C38'; x.font = '900 92px ' + F; x.fillText('Nghỉ ngơi đúng lúc,', w / 2, 100); x.fillStyle = '#E8920A'; x.fillText('làm việc bứt tốc!', w / 2, 210); });
    const sl1 = panelMesh(slg, 2.6, .42, -4.3, 2.4, ez - .06, Math.PI); sl1.material.transparent = true;
    hb(1.4, 2.5, .5, 0, 1.2, ez - .2, 'gt_ra', 'Ra sảnh chính');
    st('gt_ra', { name: 'Cửa ra sảnh', stand: new V3(0, EYE, -23.4), look: new V3(0, 1.3, R.z1), back: new V3(0, EYE, -24.2), open: openRa }); }

  /* Cây xanh, sofa nhỏ, vài người đang chơi cho phòng có sức sống */
  [[-8.4, -22.7], [8.4, -22.7], [-8.4, -35.5], [-2.2, -35.5], [3.0, -35.5]].forEach(([x, z]) => A.plant(x, z));
  A.sofa(-1.2, -23.0, Math.PI, '#2E6B52', 2.0);
  try {
    A.customer({ x: -5.95, z: -24.2, ry: -Math.PI / 2 - .2, talk: false, female: true });
    A.customer({ x: -6.2, z: -33.7, ry: Math.PI * .85, talk: true });
    A.customer({ x: 4.6, z: -26.4, ry: -Math.PI / 2, talk: true, female: false });
    [[-5.95, -24.2], [-6.2, -33.7], [4.6, -26.4]].forEach(([x, z]) => A.obstacle(x - .25, z - .25, x + .25, z + .25));
  } catch (e) { /* mẫu người chưa nạp thì bỏ qua */ }

  /* Gom mọi thứ vừa dựng vào một nhóm để bật/tắt cả phòng */
  ROOM = new THREE.Group(); A.scene.add(ROOM);
  A.scene.children.filter((c) => !before.has(c) && c !== ROOM).forEach((c) => ROOM.add(c));
  ROOM.traverse((o) => ROOMSET.add(o));
  A.WALK.push([R.x0 + .1, R.z0 + .1, R.x1 - .1, R.z1 - .1]); A.rebuildGrid();
  built = true; drawAll();
}

/* ───────────────────────── Vẽ các bảng (theo dữ liệu) ───────────────────────── */
function drawAll() { drawBoard(); drawBday(); drawCork(); drawJuke(); }
function drawBoard() {
  if (!TX.board) return; const x = TX.board.userData.ctx, w = 1024, h = 640;
  x.fillStyle = '#173f31'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 900; i++) x.fillRect(Math.random() * w, Math.random() * h, 3, 1);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = '#F6E7B0'; x.font = '900 58px ' + F; x.fillText('ĐỐ VUI TRÀ CHIỀU', 56, 96);
  x.fillStyle = '#E8920A'; A.rr(x, 640, 50, 150, 60, 30); x.fill(); x.fillStyle = '#0B2A20'; x.font = '800 38px ' + F; x.fillText('15:00', 665, 94);
  const dv = DATA && DATA.do_vui; let y = 170; x.font = '600 36px ' + F; x.fillStyle = '#FFFFFF';
  const lines = dv ? (dv.xong && !dv.phu ? ['Câu hôm nay: ' + (dv.nguoi || 'một đồng nghiệp') + ' đã giải.', 'Đáp án: ' + (dv.dap_an || '—'), 'Hẹn 15:00 ngày làm việc tiếp theo!'] : wrapText(x, (dv.phu ? 'Câu bổ sung +2: ' + dv.phu : dv.cau_hoi), w - 120).slice(0, 6))
    : (DATA ? ['Chưa tới giờ ra đề.', 'Câu đố mới lúc 15:00 các ngày làm việc,', 'trả lời ở đây là tính điểm chung với nhóm Zalo.'] : ['Đang tải câu đố…']);
  lines.forEach((l) => { x.fillText(l, 60, y); y += 50; });
  x.fillStyle = 'rgba(246,231,176,.25)'; x.fillRect(56, h - 120, w - 112, 3);
  const b = (DATA && DATA.bxh) || []; x.fillStyle = '#A8D5BD'; x.font = '700 30px ' + F; x.fillText('BẢNG VÀNG THÁNG', 60, h - 72);
  x.fillStyle = '#F6E7B0'; x.font = '600 30px ' + F; x.fillText(b.length ? b.slice(0, 3).map((r, i) => (i + 1) + '. ' + r.ten.split(' ').slice(-2).join(' ') + ' ' + r.diem + 'đ').join('   ') : 'Chưa có ai — trả lời đầu tiên để lên bảng!', 60, h - 30);
  TX.board.needsUpdate = true;
}
function drawBday() {
  if (!TX.bday) return; const x = TX.bday.userData.ctx, w = 1024, h = 640;
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#FFF6EA'); g.addColorStop(1, '#FCE3D3'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const cols = ['#E8920A', '#0FA968', '#F7C9D3', '#007437', '#F6C344']; x.strokeStyle = '#B8925A'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 30); x.quadraticCurveTo(w / 2, 90, w, 30); x.stroke();
  for (let i = 0; i < 16; i++) { const t = (i + .5) / 16, px = t * w, py = 30 + 60 * 4 * t * (1 - t) * .5 * 2 * .5; x.fillStyle = cols[i % 5]; x.beginPath(); x.moveTo(px - 26, py); x.lineTo(px + 26, py); x.lineTo(px, py + 56); x.closePath(); x.fill(); }
  const m = DATA && DATA.hom_nay ? DATA.hom_nay.m : (new Date().getMonth() + 1);
  x.textAlign = 'center'; x.fillStyle = '#084C38'; x.font = '900 66px ' + F; x.fillText('SINH NHẬT THÁNG ' + m, w / 2, 178);
  const L = (DATA && DATA.sinh_nhat) || [];
  if (!L.length) { x.fillStyle = '#667085'; x.font = '600 34px ' + F; x.fillText(DATA ? 'Tháng này chưa có ai trong danh sách' : 'Đang tải…', w / 2, 330); }
  else { x.font = '600 34px ' + F; const two = L.length > 5; L.slice(0, 10).forEach((p, i) => { const col = two ? (i < 5 ? 0 : 1) : 0, row = two ? i % 5 : i; const cx = two ? (col ? w * .74 : w * .27) : w / 2, cy = 250 + row * 64;
    if (p.nay) { x.fillStyle = '#E8920A'; A.rr(x, cx - 230, cy - 44, 460, 58, 29); x.fill(); x.fillStyle = '#fff'; } else x.fillStyle = '#063A2B';
    x.fillText(dd(p.d) + '/' + dd(p.m) + '  ' + p.ten + (p.nay ? '  🎂' : ''), cx, cy); }); }
  x.fillStyle = '#B8925A'; x.font = '600 28px ' + F; x.fillText('Bấm vào bánh kem để thổi nến · gửi lời chúc', w / 2, h - 32);
  TX.bday.needsUpdate = true;
}
const NOTE_COL = { vang: '#FFE98A', hong: '#FFC6D3', xanh: '#BDEBD0', cam: '#FFD0A1', tim: '#D9CCF5' };
function drawCork() {
  if (!TX.cork) return; const x = TX.cork.userData.ctx, w = 1024, h = 640; x.fillStyle = '#C89B66'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 40},30,${.18 + Math.random() * .2})`; x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2); }
  const N = ((DATA && DATA.giay_nho) || []).slice(-12).reverse();
  if (!N.length) { x.fillStyle = '#5a3d22'; x.textAlign = 'center'; x.font = '700 40px ' + F; x.fillText(DATA ? 'Chưa có giấy nhớ — dán tờ đầu tiên nhé!' : 'Đang tải…', w / 2, h / 2); }
  N.forEach((n, i) => { const c = i % 4, r = Math.floor(i / 4), px = 30 + c * 248, py = 22 + r * 205, s = 220; x.save(); x.translate(px + s / 2, py + s / 2 - 10); x.rotate(((i * 37) % 9 - 4) * .012);
    x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(-s / 2 + 5, -s / 2 + 7, s, s - 20); x.fillStyle = NOTE_COL[n.mau] || NOTE_COL.vang; x.fillRect(-s / 2, -s / 2, s, s - 20);
    x.fillStyle = '#D92D20'; x.beginPath(); x.arc(0, -s / 2 + 12, 8, 0, 7); x.fill();
    x.fillStyle = '#2a2a2a'; x.textAlign = 'left'; x.font = '600 24px ' + F; wrapText(x, n.nd, s - 26).slice(0, 5).forEach((l, k) => x.fillText(l, -s / 2 + 13, -s / 2 + 50 + k * 28));
    x.fillStyle = 'rgba(0,0,0,.55)'; x.font = '700 18px ' + F; x.fillText('— ' + n.ten.split(' ').slice(-2).join(' ') + (n.thich ? '  ♥ ' + n.thich : ''), -s / 2 + 13, s / 2 - 30); x.restore(); });
  TX.cork.needsUpdate = true;
}
let jukeKey = '';
function drawJuke() {
  if (!TX.juke) return; const M = A.MUSIC, on = !!(M.el || M.gen), cur = on ? M.cur : '', key = cur + on; if (key === jukeKey) return; jukeKey = key;
  const x = TX.juke.userData.ctx, w = 512, h = 512; const g = x.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 300); g.addColorStop(0, '#2a1208'); g.addColorStop(1, '#120603'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(232,194,122,.35)'; x.lineWidth = 3; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(60, 300 + i * 20); x.lineTo(w - 60, 300 + i * 20); x.stroke(); }
  x.textAlign = 'center'; x.fillStyle = '#E8C27A'; x.font = '900 52px ' + F; x.fillText('DBV JUKEBOX', w / 2, 90);
  const nm = (A.MUSIC_OPTS.find((o) => o[0] === cur) || [0, ''])[1];
  x.fillStyle = on ? '#FFE2A8' : '#9c8a72'; x.font = '700 34px ' + F; x.fillText(on ? 'Đang phát' : 'Đang tắt', w / 2, 170); x.font = '800 36px ' + F; x.fillText(on ? nm : 'Bấm để chọn nhạc', w / 2, 225);
  TX.juke.needsUpdate = true;
}
function drawDartBoard(x, w) {
  const c = w / 2, R0 = w / 2 - 6; x.fillStyle = '#1d2433'; x.beginPath(); x.arc(c, c, R0, 0, 7); x.fill();
  const rings = [[1, '#F7F1E6'], [.85, '#0E3B2C'], [.55, '#F7F1E6'], [.3, '#007437'], [.1, '#E8920A']];
  rings.forEach(([r, col]) => { x.fillStyle = col; x.beginPath(); x.arc(c, c, R0 * r * .94, 0, 7); x.fill(); });
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; x.beginPath(); x.moveTo(c + Math.cos(a) * R0 * .1, c + Math.sin(a) * R0 * .1); x.lineTo(c + Math.cos(a) * R0 * .94, c + Math.sin(a) * R0 * .94); x.stroke(); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; const lab = [[.92, 'CÓ MẶT', '#063A2B'], [.7, 'CỐ LÊN', '#F7F1E6'], [.43, 'GẦN ĐẠT', '#063A2B'], [.2, 'ĐẠT KPI', '#ffffff']];
  lab.forEach(([r, t, col]) => { x.fillStyle = col; x.font = '800 ' + Math.round(w * .036) + 'px ' + F; x.fillText(t, c, c - R0 * r * .94 + w * .02); });
  x.fillStyle = '#fff'; x.font = '900 ' + Math.round(w * .03) + 'px ' + F; x.fillText('VƯỢT', c, c - 8); x.fillText('KPI', c, c + 22);
}

/* ───────────────────────── Vào / ra phòng ───────────────────────── */
function setInside(v) { inside = v; if (ROOM) { ROOM.visible = v; } A.hook.pickOk = (o) => (inside ? ROOMSET.has(o) : !ROOMSET.has(o)); const b = $('bMap'); if (b) b.style.display = v ? 'none' : ''; }
function roomNav() {
  const N = $('nav'); N.innerHTML = '';
  const mk = (id, label, icon) => { const b = document.createElement('button'); b.dataset.id = id; b.innerHTML = A.ic(icon, 17) + `<span>${label}</span>`; b.onclick = () => (id === 'gt_ra' ? ra() : A.goStation(id)); N.appendChild(b); };
  mk('gt_ra', 'Ra sảnh', 'door'); const s = document.createElement('div'); s.className = 'sep'; N.appendChild(s);
  [['gt_dovui', 'Trà chiều', 'cup'], ['gt_bot', 'Bot em gái', 'smile'], ['gt_sinhnhat', 'Sinh nhật', 'cake'], ['gt_gap', 'Gắp thú', 'gift'], ['gt_nem', 'Ném giấy', 'trash'], ['gt_phitieu', 'Phi tiêu', 'target'],
    ['gt_anh', 'Chụp ảnh', 'camera'], ['gt_nhac', 'Âm nhạc', 'music'], ['gt_thugian', 'Thư giãn', 'leaf'], ['gt_giaynho', 'Giấy nhớ', 'note']].forEach((x) => mk(x[0], x[1], x[2]));
}
async function vao(sess) {
  S = sess; if (!built) buildRoom();
  setInside(true); roomNav();
  A.cam.pos.set(0, A.EYE, -23.35); A.cam.yaw = 0; A.cam.pitch = -.06;
  A.st.curSt = null; A.st.mode = 'lobby'; A.st.busy = false;
  loadData().then(() => { if (DATA && DATA.sinh_nhat && DATA.sinh_nhat.some((p) => p.nay)) setTimeout(() => A.toast('Hôm nay có sinh nhật ' + DATA.sinh_nhat.filter((p) => p.nay).map((p) => p.ten).join(', ') + ' 🎂 — ghé tường sinh nhật thổi nến nhé!'), 2500); });
  setTimeout(() => A.toast('Chào ' + esc(S.ten) + '! Bấm vào đồ vật để chơi · phím mũi tên để đi lại' + (S.demo ? ' (bản xem thử)' : '')), 450);
}
async function ra() {
  const st = A.st; if (st.busy && st.mode === 'moving') return;
  closeOv(); stopRelax(); A.closePanel(); A.clearGuide(); st.busy = true; st.mode = 'moving'; st.curSt = null;
  await A.fade(1, '');
  setInside(false); const N = $('nav'); N.innerHTML = ''; A.buildNav();
  A.cam.pos.set(-2.7, A.EYE, -5.0); A.cam.yaw = Math.PI; A.cam.pitch = -.04; A.door(1);
  await A.fade(0); A.door(0);
  await A.flyTo(new A.V3(-2.1, A.EYE, -1.1), new A.V3(-1.2, 1.5, 6), 1.1);
  st.mode = 'lobby'; st.busy = false; A.setNav(null);
}

/* ───────────────────────── Panel dùng chung ───────────────────────── */
function panel(o) {
  A.openInfo(Object.assign({ ft2: RA ? ['Thang máy', RA, 'lift'] : ['Ra sảnh', ra, 'door'], onX: () => { A.closePanel(); A.toast('Bấm vào đồ vật để mở lại · phím mũi tên để rời chỗ'); } }, o));
}

/* ═════════════ 1. ĐỐ VUI TRÀ CHIỀU ═════════════ */
const LUYEN = [
  ['Một chiếc đồng hồ điểm 4 tiếng mất 6 giây (tính từ tiếng đầu tới tiếng cuối). Điểm 8 tiếng mất bao nhiêu giây?', '14 giây — 4 tiếng có 3 khoảng (2 giây/khoảng), 8 tiếng có 7 khoảng.'],
  ['Phòng có 6 người, mỗi người đưa danh thiếp cho từng người còn lại. Có bao nhiêu tấm danh thiếp được trao?', '30 tấm — mỗi người đưa 5 tấm, 6 × 5 = 30.'],
  ['Dãy số đơn hàng: 3, 6, 11, 18, 27, … Số tiếp theo là gì?', '38 — khoảng cách tăng 3, 5, 7, 9 rồi 11.'],
  ['Một xe chạy 60 km/giờ đi hết 90 km. Nếu chạy 45 km/giờ thì mất thêm bao nhiêu phút?', '30 phút — 1 giờ 30 phút so với 2 giờ.'],
  ['Hôm nay thứ Tư. 100 ngày nữa là thứ mấy?', 'Thứ Sáu — 100 chia 7 dư 2, thứ Tư cộng 2 ngày.'],
  ['Trong bãi có xe máy và ô tô, tổng 15 xe và 42 bánh. Có bao nhiêu ô tô?', '6 ô tô — coi hết là xe máy được 30 bánh, dư 12 bánh, mỗi ô tô thêm 2.'],
];
function openDoVui() {
  const dv = DATA && DATA.do_vui, bxh = (DATA && DATA.bxh) || [], giai = DATA && DATA.giai;
  let qHtml;
  if (!DATA) qHtml = '<div class="gt-res info">Đang tải câu đố…</div>';
  else if (!dv) qHtml = '<div class="gt-q"><small>Chưa tới giờ</small><br>Câu đố trà chiều ra lúc <b>15:00 các ngày làm việc</b> trong nhóm Zalo. Trả lời ở đây được tính điểm như trả lời trong Zalo.</div>';
  else if (dv.xong && !dv.phu) qHtml = `<div class="gt-q"><small>Đã có người giải</small><br>${esc(dv.cau_hoi)}<span class="gt-hint">Người giải: ${esc(dv.nguoi)} · Đáp án: ${esc(dv.dap_an)}${dv.giai_thich ? ' — ' + esc(dv.giai_thich) : ''}${dv.phu_xong ? '<br>Câu bổ sung: ' + esc(dv.nguoi_phu) + ' · ' + esc(dv.dap_an_phu) : ''}</span></div>`;
  else qHtml = `<div class="gt-q"><small>${dv.phu ? 'Câu bổ sung +2 điểm' : esc(dv.kieu) + ' · +3 điểm người đúng đầu tiên'}</small><br>${esc(dv.phu || dv.cau_hoi)}${dv.trang ? `<span class="gt-hint">Gợi ý: đáp án có trên dbv247.com.vn – trang "${esc(dv.trang)}"</span>` : ''}${dv.phu ? `<span class="gt-hint">${esc(dv.nguoi)} đã giải câu chính nên không tính điểm câu này.</span>` : ''}</div>
    <form class="gt-f" id="dvF"><input id="dvI" maxlength="60" autocomplete="off" placeholder="Câu trả lời của anh/chị"><button>Trả lời</button></form>`;
  panel({ title: 'Quầy trà chiều', tag: 'Đố vui 15:00', icon: 'cup', color: '#E8920A', soft: '#FEF3E6', intro: 'Mời dùng trà và giải câu đố trong ngày. Đoán là +1 điểm tham gia, đúng đầu tiên +3, câu bổ sung +2 — chung bảng xếp hạng tháng với nhóm Zalo.',
    body: qHtml + '<div class="gt-res" id="dvR"></div>' + lbHtml('Bảng xếp hạng tháng' + (giai ? ' · Giải: ' + giai : ''), bxh, 'đ') +
      '<div class="gt-sub">Luyện tập trong lúc chờ (không tính điểm)</div>' + LUYEN.map((q, i) => `<div class="gt-pr" data-i="${i}"><p>${esc(q[0])}</p><button>Xem đáp án</button><div class="ans">${esc(q[1])}</div></div>`).join(''),
    after: () => {
      document.querySelectorAll('.gt-pr button').forEach((b) => b.onclick = () => { b.parentNode.classList.toggle('open'); b.textContent = b.parentNode.classList.contains('open') ? 'Ẩn đáp án' : 'Xem đáp án'; });
      const f = $('dvF'); if (!f) return;
      f.onsubmit = async (e) => { e.preventDefault(); const v = $('dvI').value.trim(); if (!v) return; const b = f.querySelector('button'); b.disabled = true; const R = $('dvR');
        try { const j = await api({ hanh_dong: 'do_vui', tra_loi: v }); R.className = 'gt-res ' + (j.ket_qua === 'dung' ? 'ok' : j.ket_qua === 'sai' ? 'no' : 'info'); R.textContent = j.text;
          if (j.do_vui !== undefined) DATA.do_vui = j.do_vui; if (j.bxh) DATA.bxh = j.bxh; drawBoard();
          if (j.ket_qua === 'dung') { sfx('win'); confetti(); setTimeout(openDoVui, 3500); } else { sfx('miss'); $('dvI').value = ''; $('dvI').focus(); } }
        catch (er) { R.className = 'gt-res no'; R.textContent = er.message; }
        b.disabled = false; };
    } });
}

/* ═════════════ 2. BOT EM GÁI DBV ═════════════ */
const CHAT = [];
function openBot() {
  if (OBJ.bot) OBJ.bot.waveT = performance.now() / 1000;
  if (!CHAT.length) CHAT.push({ r: 'a', t: 'Ơ ' + (S.ten.split(' ').pop()) + ' ghé chơi nè! 🥳 Em là Bot em gái DBV — muốn nghe chuyện cười, bói vui hôm nay hay tám chuyện ăn gì trưa mai ạ?' });
  const quick = ['Kể chuyện cười đi em', 'Trưa nay ăn gì?', 'Bói vui hôm nay', 'Đố em một câu nè'];
  panel({ title: 'Bot em gái DBV', tag: 'Tám chuyện', icon: 'smile', color: '#D9467A', soft: '#FDECF2', intro: 'Cô em út của nhóm Zalo giải trí, giờ có mặt trong phòng — nói chuyện vui, không bàn chuyện deadline.',
    body: `<div class="gt-chat" id="btM"></div><div class="gt-quick" id="btQ">${quick.map((q) => `<button>${q}</button>`).join('')}</div><form class="gt-f" id="btF"><input id="btI" maxlength="400" autocomplete="off" placeholder="Nhắn cho em…"><button>Gửi</button></form>`,
    after: () => { renderBot(); $('btQ').querySelectorAll('button').forEach((b) => b.onclick = () => sendBot(b.textContent)); $('btF').onsubmit = (e) => { e.preventDefault(); const v = $('btI').value.trim(); if (v) { $('btI').value = ''; sendBot(v); } }; } });
}
function renderBot() { const M = $('btM'); if (!M) return; M.innerHTML = CHAT.map((m) => `<div class="msg ${m.r}">${m.t ? esc(m.t) : '<span class="dots"><i></i><i></i><i></i></span>'}</div>`).join(''); M.scrollTop = M.scrollHeight; const b = $('btF') && $('btF').querySelector('button'); if (b) b.disabled = CHAT.busy; }
async function sendBot(t) {
  if (CHAT.busy) return; CHAT.busy = true; const ls = CHAT.filter((m) => m.t).slice(-8).map((m) => ({ r: m.r, t: m.t }));
  CHAT.push({ r: 'u', t }); const m = { r: 'a', t: '' }; CHAT.push(m); renderBot();
  try { const j = await api({ hanh_dong: 'chat', cau: t, ls }); m.t = j.text || '…'; } catch (e) { m.t = 'Em đơ mất rồi 🥲 ' + e.message; }
  if (OBJ.bot) OBJ.bot.talkUntil = performance.now() + Math.min(9000, m.t.length * 50);
  CHAT.busy = false; renderBot();
}

/* ═════════════ 3. SINH NHẬT ═════════════ */
let candlesOut = 0;
function openSinhNhat() {
  const L = (DATA && DATA.sinh_nhat) || [], W = (DATA && DATA.loi_chuc) || [], m = DATA && DATA.hom_nay ? DATA.hom_nay.m : new Date().getMonth() + 1;
  const nay = L.filter((p) => p.nay);
  const opts = L.length ? L.map((p) => `<option value="${esc(p.ten)}">${esc(p.ten)} (${dd(p.d)}/${dd(p.m)})</option>`).join('') : '';
  panel({ title: 'Tường sinh nhật', tag: 'Tháng ' + m, icon: 'cake', color: '#E86A5A', soft: '#FDEDEB', intro: nay.length ? 'Hôm nay là sinh nhật ' + nay.map((p) => p.ten).join(', ') + '! Thổi nến và gửi lời chúc nào.' : 'Những người có sinh nhật trong tháng. Gửi lời chúc trước, đến ngày bot cũng chúc trong nhóm Zalo.',
    body: (L.length ? L.map((p) => `<div class="gt-sn ${p.nay ? 'nay' : ''}"><b>${esc(p.ten)}</b><span>${dd(p.d)}/${dd(p.m)}${p.nay ? ' · hôm nay' : ''}</span></div>`).join('') : `<div class="gt-res info">${DATA ? 'Tháng này chưa có ai trong danh sách sinh nhật. Quản trị nạp danh sách qua lệnh "sinh nhật:" với Bot em gái DBV.' : 'Đang tải…'}</div>`) +
      `<div class="gt-row"><button class="gt-btn cam" id="snBlow">${A.ic('cake', 16)} Thổi nến</button></div>` +
      `<div class="gt-sub">Gửi lời chúc</div><form id="snF">${L.length ? `<div class="gt-f"><select id="snC">${opts}</select></div>` : '<div class="gt-f"><input id="snC" maxlength="40" placeholder="Chúc ai?"></div>'}<textarea class="gt-ta" id="snT" maxlength="200" placeholder="Viết lời chúc (tối đa 200 ký tự)" style="margin-top:8px"></textarea><div class="gt-row" style="justify-content:flex-end"><button class="gt-btn">Gửi lời chúc</button></div></form>` +
      `<div class="gt-sub">Lời chúc tháng này</div><div id="snW"></div>`,
    after: () => { renderWishes(W); if (nay.length) { const s = $('snC'); if (s && s.tagName === 'SELECT') s.value = nay[0].ten; }
      $('snBlow').onclick = blowCandles;
      $('snF').onsubmit = async (e) => { e.preventDefault(); const cho = $('snC').value.trim(), loi = $('snT').value.trim(); if (!cho || loi.length < 2) return A.toast('Chọn người và viết lời chúc nhé');
        const b = $('snF').querySelector('button'); b.disabled = true; try { const j = await api({ hanh_dong: 'chuc', cho, loi }); DATA.loi_chuc = j.loi_chuc; renderWishes(j.loi_chuc); $('snT').value = ''; sfx('hit'); A.toast('Đã gửi lời chúc tới ' + cho); } catch (er) { A.toast(er.message); } b.disabled = false; }; } });
}
function renderWishes(W) {
  const el = $('snW'); if (!el) return; const me = S.ten;
  el.innerHTML = W.length ? W.slice().reverse().map((w) => `<div class="gt-wish"><b>${esc(w.tu)}</b> → <b>${esc(w.cho)}</b>: ${esc(w.loi)}<i>${new Date(w.luc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</i>${(w.tu === me || (DATA && DATA.qt)) && w.id ? `<button class="gt-del" data-id="${w.id}">Xoá</button>` : ''}</div>`).join('') : '<p class="gt-empty">Chưa có lời chúc nào.</p>';
  el.querySelectorAll('.gt-del').forEach((b) => b.onclick = async () => { try { const j = await api({ hanh_dong: 'xoa', loai: 'chuc', id: b.dataset.id }); DATA.loi_chuc = j.loi_chuc; renderWishes(j.loi_chuc); } catch (e) { A.toast(e.message); } });
}
function blowCandles() {
  const ov = overlay('Thổi nến', 'Thổi vào micro, hoặc bấm nút bên dưới', '#E86A5A', () => { if (ov.stream) ov.stream.getTracks().forEach((t) => t.stop()); });
  ov.bd.innerHTML = `<div style="text-align:center;font-size:64px;line-height:1.2;margin-top:6px" id="bcI">🎂</div><div class="gt-msg" id="bcM">Đang bật micro… cứ thổi mạnh như thổi nến thật nhé!</div><div class="gt-meter"><i id="bcV"></i></div><div class="gt-row"><button class="gt-btn ghost" id="bcB">Thổi bằng nút bấm</button></div>`;
  let acc = 0, done = false;
  const out = () => { if (done) return; done = true; candlesOut = performance.now() + 20000; sfx('win'); confetti(3000); $('bcI').textContent = '🎉'; const nay = ((DATA && DATA.sinh_nhat) || []).filter((p) => p.nay);
    $('bcM').textContent = nay.length ? 'Chúc mừng sinh nhật ' + nay.map((p) => p.ten).join(', ') + '! Nhớ gửi lời chúc nhé.' : 'Phù! Nến tắt rồi — chúc cả nhà một tháng thật vui!'; if (ov.stream) ov.stream.getTracks().forEach((t) => t.stop()); setTimeout(() => { if (OV === ov) closeOv(); }, 3200); };
  $('bcB').onclick = out;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
    if (OV !== ov) { s.getTracks().forEach((t) => t.stop()); return; } ov.stream = s; A.audioInit(); const ac = A.getAC(); if (!ac) return; if (ac.state === 'suspended') ac.resume();
    const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(s).connect(an); const buf = new Float32Array(an.fftSize); $('bcM').textContent = 'Micro đã bật — thổi đi nào!';
    let last = performance.now(); const loop = (now) => { if (OV !== ov || done) return; an.getFloatTimeDomainData(buf); let r = 0; for (let i = 0; i < buf.length; i++) r += buf[i] * buf[i]; r = Math.sqrt(r / buf.length);
      const lv = clamp(r * 6, 0, 1); $('bcV').style.width = (lv * 100) + '%'; const dt = now - last; last = now; if (lv > .45) acc += dt; else acc = Math.max(0, acc - dt * .5); if (acc > 450) out(); else ov.raf = requestAnimationFrame(loop); };
    ov.raf = requestAnimationFrame(loop);
  }).catch(() => { if ($('bcM')) $('bcM').textContent = 'Không bật được micro — dùng nút bấm bên dưới nhé.'; });
  else $('bcM').textContent = 'Trình duyệt không cho dùng micro — dùng nút bấm bên dưới nhé.';
}

/* ═════════════ 4. MÁY NGHE NHẠC ═════════════ */
function openNhac() {
  const M = A.MUSIC, on = !!(M.el || M.gen);
  panel({ title: 'Máy nghe nhạc', tag: 'Jukebox', icon: 'music', color: '#9A4A2A', soft: '#FBEFE8', intro: 'Chọn nhạc nền — phát chung cho cả văn phòng 3D trên máy của anh/chị.',
    body: `<div class="gt-chips" id="jbC">${A.MUSIC_OPTS.map((o) => `<button data-k="${o[0]}" class="${on && M.cur === o[0] ? 'act' : ''}">${o[1]}</button>`).join('')}<button data-k="off" class="${on ? '' : 'act'}">Tắt nhạc</button></div>
      <div class="gt-sub">Âm lượng</div><input type="range" id="jbV" min="0" max="100" value="${Math.round(M.vol * 100)}" style="width:100%">`,
    after: () => { $('jbC').querySelectorAll('button').forEach((b) => b.onclick = () => { $('jbC').querySelectorAll('button').forEach((x) => x.classList.toggle('act', x === b)); if (b.dataset.k === 'off') { M.on = false; A.stopMusic(); } else { M.on = true; A.playMusic(b.dataset.k); } sfx('click'); });
      $('jbV').oninput = (e) => { M.vol = e.target.value / 100; if (M.el) M.el.volume = M.vol; }; } });
}

/* ═════════════ 5. GHẾ THƯ GIÃN ═════════════ */
let RLX = null;
function stopRelax(silent) {
  if (!RLX) return; clearInterval(RLX.iv); const M = A.MUSIC; M.vol = RLX.vol; if (RLX.music) { if (RLX.music === 'off') { M.on = false; A.stopMusic(); } else { M.on = true; A.playMusic(RLX.music); } } else if (M.el) M.el.volume = M.vol;
  RLX = null; if (!silent) { const b = $('rxB'); if (b) b.textContent = 'Bắt đầu'; }
}
function openThuGian() {
  let mins = 3;
  panel({ title: 'Ghế thư giãn', tag: 'Nghỉ ngắn', icon: 'leaf', color: '#0FA968', soft: '#E7F8F0', intro: 'Ngả lưng, nhìn ra cửa sổ, thở chậm theo vòng tròn. Nhạc nhẹ tự bật trong lúc nghỉ.', backLabel: 'Đứng dậy',
    onBack: () => { stopRelax(); A.backFromStation(); },
    body: `<div class="gt-chips" id="rxC">${[1, 3, 5].map((m) => `<button data-m="${m}" class="${m === 3 ? 'act' : ''}">${m} phút</button>`).join('')}</div><div class="gt-ring" id="rxR"><div><b id="rxT">3:00</b><span id="rxS">Sẵn sàng</span></div></div><div class="gt-row"><button class="gt-btn" id="rxB">Bắt đầu</button></div>`,
    after: () => {
      $('rxC').querySelectorAll('button').forEach((b) => b.onclick = () => { if (RLX) return; mins = +b.dataset.m; $('rxC').querySelectorAll('button').forEach((x) => x.classList.toggle('act', x === b)); $('rxT').textContent = mins + ':00'; });
      $('rxB').onclick = () => {
        if (RLX) { stopRelax(); $('rxS').textContent = 'Đã dừng'; $('rxR').style.transform = ''; return; }
        const M = A.MUSIC; RLX = { end: Date.now() + mins * 60000, vol: M.vol, music: M.on ? (M.cur || 'summer') : 'off', t0: Date.now() };
        M.on = true; M.vol = Math.min(M.vol, .2); A.playMusic('classic'); $('rxB').textContent = 'Dừng';
        const tick = () => { const R = $('rxR'); if (!R) { stopRelax(true); return; } const left = Math.max(0, RLX.end - Date.now()), s = Math.ceil(left / 1000); $('rxT').textContent = Math.floor(s / 60) + ':' + dd(s % 60);
          const ph = ((Date.now() - RLX.t0) / 1000) % 14; const [txt, sc] = ph < 4 ? ['Hít vào…', 1.12] : ph < 8 ? ['Giữ hơi…', 1.12] : ['Thở ra từ từ…', .9]; $('rxS').textContent = txt; R.style.transform = 'scale(' + sc + ')';
          if (left <= 0) { stopRelax(); sfx('chime'); $('rxS').textContent = 'Xong rồi!'; R.style.transform = ''; A.toast('Hết giờ nghỉ — nạp đầy năng lượng rồi, chiến tiếp thôi!'); } };
        RLX.iv = setInterval(tick, 250); tick(); };
    } });
}

/* ═════════════ 6. BẢNG GIẤY NHỚ ═════════════ */
function openGiayNho() {
  let mau = 'vang';
  panel({ title: 'Bảng giấy nhớ', tag: 'Lời nhắn', icon: 'note', color: '#E8920A', soft: '#FEF3E6', intro: 'Dán lời nhắn cho cả nhà: rủ đi ăn, cảm ơn đồng nghiệp, chia sẻ niềm vui. Giấy nhớ ghi tên người viết.',
    body: `<form id="gnF"><textarea class="gt-ta" id="gnT" maxlength="140" placeholder="Viết lời nhắn (tối đa 140 ký tự)"></textarea>
      <div class="gt-row" style="justify-content:space-between"><div style="display:flex;gap:6px" id="gnC">${Object.keys(NOTE_COL).map((k) => `<button type="button" class="gt-sw ${k === 'vang' ? 'act' : ''}" data-k="${k}" style="background:${NOTE_COL[k]}" aria-label="${k}"></button>`).join('')}</div><button class="gt-btn cam">Dán lên bảng</button></div></form>
      <div class="gt-sub">Trên bảng</div><div id="gnL"></div>`,
    after: () => { renderNotes(); $('gnC').querySelectorAll('button').forEach((b) => b.onclick = () => { mau = b.dataset.k; $('gnC').querySelectorAll('button').forEach((x) => x.classList.toggle('act', x === b)); });
      $('gnF').onsubmit = async (e) => { e.preventDefault(); const v = $('gnT').value.trim(); if (v.length < 2) return; const b = $('gnF').querySelector('.gt-btn'); b.disabled = true;
        try { const j = await api({ hanh_dong: 'giay_nho', noi_dung: v, mau }); DATA.giay_nho = j.giay_nho; $('gnT').value = ''; renderNotes(); drawCork(); sfx('hit'); } catch (er) { A.toast(er.message); } b.disabled = false; }; } });
}
function renderNotes() {
  const el = $('gnL'); if (!el) return; const N = ((DATA && DATA.giay_nho) || []).slice().reverse();
  el.innerHTML = N.length ? N.map((n) => `<div class="gt-note" style="background:${NOTE_COL[n.mau] || NOTE_COL.vang}">${esc(n.nd)}<i><span>${esc(n.ten)} · ${new Date(n.luc).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' })}</span><span style="display:flex;gap:10px"><button class="lk ${n.toi_thich ? 'on' : ''}" data-id="${n.id}">${n.toi_thich ? '♥' : '♡'} ${n.thich}</button>${n.cua_toi || (DATA && DATA.qt) ? `<button class="gt-del" style="position:static" data-x="${n.id}">Gỡ</button>` : ''}</span></i></div>`).join('') : '<p class="gt-empty">Chưa có giấy nhớ nào.</p>';
  const act = async (body) => { try { const j = await api(body); DATA.giay_nho = j.giay_nho; renderNotes(); drawCork(); } catch (e) { A.toast(e.message); } };
  el.querySelectorAll('.lk').forEach((b) => b.onclick = () => act({ hanh_dong: 'thich', id: b.dataset.id }));
  el.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => act({ hanh_dong: 'xoa', loai: 'giay_nho', id: b.dataset.x }));
}

/* ═════════════ 7. NÉM GIẤY ═════════════ */
function openNem() {
  const ov = overlay('Ném giấy vào thùng rác', '10 viên · vuốt lên để ném · nhớ để ý gió quạt', '#5AA9E6');
  const G = gameCanvas(ov.bd, 360, 560), x = G.x;
  ov.bd.insertAdjacentHTML('beforeend', '<div class="gt-msg" id="nmM">Kéo viên giấy lên rồi thả tay. Kéo dài = ném xa.</div><div id="nmE"></div>');
  const ST = { left: 10, score: 0, streak: 0, wind: 0, phase: 'ready', drag: null, b: null, msg: '', msgT: 0, done: false };
  const newWind = () => { ST.wind = Math.round((Math.random() * 2 - 1) * (ST.score > 3 ? 1 : .6) * 10) / 10; };
  newWind();
  const sc = (z) => 1 - .62 * Math.min(1.25, z), SX = (L, z) => 180 + L * sc(z), SY = (z, h) => 480 - 280 * z - h * sc(z);
  const ballAt = (s, b) => ({ z: b.d * s, L: b.aim * s + b.wind * 95 * s * s, h: b.peak * 4 * s * (1 - s) });
  function drawBin(front) { const y = SY(1, 0), r = 60 * sc(1), hgt = 52;
    if (!front) { x.fillStyle = '#1d2433'; x.beginPath(); x.ellipse(180, y, r, r * .32, 0, 0, 7); x.fill(); return; }
    x.fillStyle = '#2b3036'; x.beginPath(); x.moveTo(180 - r, y); x.lineTo(180 - r * .8, y + hgt); x.lineTo(180 + r * .8, y + hgt); x.lineTo(180 + r, y); x.ellipse(180, y, r, r * .32, 0, 0, Math.PI); x.closePath(); x.fill();
    x.strokeStyle = '#E8920A'; x.lineWidth = 3; x.beginPath(); x.ellipse(180, y, r, r * .32, 0, 0, 7); x.stroke(); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(180 - r * .6, y + 8, 6, hgt - 14); }
  function drawBall(px, py, r) { x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.fillStyle = '#FBFBF6'; x.beginPath(); x.arc(px, py - 1, r, 0, 7); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = Math.max(1, r * .08); x.beginPath(); x.moveTo(px - r * .5, py - r * .2); x.lineTo(px, py + r * .1); x.lineTo(px + r * .4, py - r * .4); x.moveTo(px - r * .2, py + r * .5); x.lineTo(px + r * .3, py + r * .2); x.stroke(); }
  function frame(now) {
    if (OV !== ov) return; const t = now / 1000;
    const g = x.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, '#F1E8DA'); g.addColorStop(.3, '#EADFCC'); g.addColorStop(.31, '#C79F72'); g.addColorStop(1, '#A87E55'); x.fillStyle = g; x.fillRect(0, 0, 360, 560);
    x.strokeStyle = 'rgba(0,0,0,.06)'; for (let i = -8; i <= 8; i++) { x.beginPath(); x.moveTo(180 + i * 20, 172); x.lineTo(180 + i * 70, 560); x.stroke(); }
    x.fillStyle = '#DCEFE3'; x.fillRect(0, 150, 360, 22); x.fillStyle = '#9fc3da'; x.fillRect(40, 30, 110, 90); x.fillStyle = '#fff'; x.fillRect(93, 30, 4, 90); x.fillRect(40, 73, 110, 4);
    // quạt + gió
    x.save(); x.translate(300, 70); x.fillStyle = '#E6EDE8'; x.fillRect(-3, 10, 6, 60); x.beginPath(); x.arc(0, 0, 30, 0, 7); x.fill(); x.rotate(t * (2 + Math.abs(ST.wind) * 14) * (ST.wind >= 0 ? 1 : -1));
    x.fillStyle = '#5AA9E6'; for (let i = 0; i < 3; i++) { x.rotate(2.094); x.beginPath(); x.ellipse(0, -13, 7, 13, 0, 0, 7); x.fill(); } x.restore();
    x.fillStyle = '#063A2B'; x.font = '700 14px ' + F; x.textAlign = 'center'; x.fillText('GIÓ', 300, 128);
    const wa = ST.wind; x.fillStyle = wa === 0 ? '#667085' : '#E8920A'; x.font = '800 18px ' + F; x.fillText(wa === 0 ? 'lặng' : (wa < 0 ? '◀ ' : '') + Math.abs(wa).toFixed(1) + (wa > 0 ? ' ▶' : ''), 300, 148);
    // bảng điểm
    x.textAlign = 'left'; x.fillStyle = '#063A2B'; x.font = '800 22px ' + F; x.fillText('Điểm: ' + ST.score, 18, 200 - 14); x.font = '600 14px ' + F; x.fillStyle = '#344054'; x.fillText('Còn ' + ST.left + ' viên' + (ST.streak >= 2 ? ' · chuỗi ' + ST.streak : ''), 18, 200 + 6);
    drawBin(false);
    const b = ST.b; let bp = null;
    if (b) { const s = clamp((now - b.t0) / 900, 0, 1); bp = ballAt(s, b); bp.s = s; if (s >= 1 && !b.end) endThrow(b, bp); }
    const behind = bp && bp.z > 1.0 && !(b.res === 'in');
    if (behind) drawBall(SX(bp.L, bp.z), SY(bp.z, bp.h) - 2, 22 * sc(bp.z));
    if (b && b.res === 'in' && b.end && now - b.endT < 400) { const k = (now - b.endT) / 400; drawBall(SX(0, 1), SY(1, 0) + k * 20, 22 * sc(1) * (1 - k * .3)); }
    drawBin(true);
    if (bp && !behind && !(b.res === 'in' && b.end)) drawBall(SX(bp.L, bp.z), SY(bp.z, bp.h) - 2, 22 * sc(bp.z));
    if (b && b.end && b.res !== 'in') { const fz = clamp(b.d, 0, 1.25); drawBall(SX(b.endL, fz), SY(fz, 0) + 4, 22 * sc(fz)); }
    if (!ST.b && ST.left > 0 && ST.phase === 'ready') { const off = ST.drag ? { x: ST.drag.cx - ST.drag.sx, y: ST.drag.cy - ST.drag.sy } : { x: 0, y: 0 };
      if (ST.drag) { x.setLineDash([6, 6]); x.strokeStyle = 'rgba(6,58,43,.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(180, 500); x.lineTo(180 + off.x * 1.4, 500 + Math.min(0, off.y) * 1.4); x.stroke(); x.setLineDash([]); }
      drawBall(180 + off.x * .15, 500 + Math.min(0, off.y) * .1, 22); }
    if (ST.msg && now - ST.msgT < 1100) { x.textAlign = 'center'; x.font = '900 34px ' + F; x.fillStyle = ST.msgC; x.globalAlpha = 1 - (now - ST.msgT) / 1100; x.fillText(ST.msg, 180, 300); x.globalAlpha = 1; }
    ov.raf = requestAnimationFrame(frame);
  }
  function show(m, c) { ST.msg = m; ST.msgC = c; ST.msgT = performance.now(); }
  function endThrow(b, bp) {
    b.end = true; b.endT = performance.now(); b.endL = bp.L; const dz = b.d - 1, lat = Math.abs(bp.L);
    if (Math.abs(dz) <= .09 && lat <= 44) { b.res = 'in'; ST.streak++; ST.score += 1 + (ST.streak % 3 === 0 ? 1 : 0); sfx('hit'); show(ST.streak % 3 === 0 ? 'Chuỗi 3! +2' : 'Vào rồi!', '#0FA968'); }
    else { b.res = 'out'; ST.streak = 0; sfx('thud'); show(Math.abs(dz) <= .09 && lat <= 70 ? 'Chạm vành!' : dz > .09 ? 'Quá tay!' : dz < -.09 ? 'Hụt rồi!' : 'Lệch rồi!', '#D92D20'); }
    setTimeout(() => { ST.b = null; if (ST.left <= 0) finish(); else { newWind(); ST.phase = 'ready'; } }, 850);
  }
  async function finish() {
    ST.phase = 'end'; $('nmM').textContent = 'Kết thúc! Được ' + ST.score + ' điểm.'; const E = $('nmE');
    E.innerHTML = `<div class="gt-row"><button class="gt-btn cam" id="nmA">Chơi lại</button></div><div class="gt-msg">Đang lưu điểm…</div>`; $('nmA').onclick = () => { closeOv(); openNem(); };
    try { const j = await api({ hanh_dong: 'diem', tro: 'nem', diem: ST.score }); if (DATA) DATA.tro.nem = j.bang; E.querySelector('.gt-msg').textContent = j.ky_luc ? 'Kỷ lục tuần mới của anh/chị!' : 'Kỷ lục tuần của anh/chị: ' + j.cao_nhat + ' điểm.'; E.insertAdjacentHTML('beforeend', lbHtml('Bảng xếp hạng tuần', j.bang, 'đ')); if (j.ky_luc) { sfx('win'); confetti(); } }
    catch (e) { E.querySelector('.gt-msg').textContent = e.message; }
  }
  G.c.addEventListener('pointerdown', (e) => { if (ST.phase !== 'ready' || ST.b || ST.left <= 0) return; const p = G.pt(e); ST.drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y }; G.c.setPointerCapture(e.pointerId); A.audioInit(); });
  G.c.addEventListener('pointermove', (e) => { if (!ST.drag) return; const p = G.pt(e); ST.drag.cx = p.x; ST.drag.cy = p.y; });
  const up = () => { const d = ST.drag; ST.drag = null; if (!d) return; const dx = d.cx - d.sx, dy = d.cy - d.sy; if (dy > -25) return;
    const p = clamp(-dy / 250, .3, 1.7); ST.left--; ST.phase = 'fly'; sfx('throw');
    ST.b = { t0: performance.now(), d: p, aim: dx * 1.9, peak: 120 + p * 70, wind: ST.wind }; };
  G.c.addEventListener('pointerup', up); G.c.addEventListener('pointercancel', () => { ST.drag = null; });
  ov.raf = requestAnimationFrame(frame);
  if (DATA && DATA.tro) $('nmE').innerHTML = lbHtml('Bảng xếp hạng tuần', DATA.tro.nem, 'đ');
}

/* ═════════════ 8. PHI TIÊU KPI ═════════════ */
const DART_RING = [[.1, 100, 'VƯỢT KPI!', '#E8920A'], [.3, 50, 'ĐẠT KPI', '#0FA968'], [.55, 25, 'GẦN ĐẠT', '#007437'], [.85, 10, 'CỐ LÊN', '#344054'], [1, 5, 'CÓ MẶT', '#667085']];
const DART_MISS = ['Họp rút kinh nghiệm!', 'Trượt KPI mất rồi!', 'Bay ra ngoài kế hoạch!'];
function openPhiTieu() {
  const ov = overlay('Phi tiêu bảng KPI', '5 phi tiêu · bấm/chạm đúng lúc tâm ngắm đi qua giữa bảng', '#007437');
  const G = gameCanvas(ov.bd, 360, 470), x = G.x, C = { x: 180, y: 220 }, RB = 150;
  ov.bd.insertAdjacentHTML('beforeend', '<div class="gt-msg" id="ptM">Bấm hoặc chạm vào bảng để phóng.</div><div id="ptE"></div>');
  const ST = { left: 5, score: 0, darts: [], fly: null, msg: '', msgT: 0, t0: performance.now(), ph: Math.random() * 6, end: false };
  const board = ctex2(512, (cx) => drawDartBoard(cx, 512));
  function aim(now) { const t = (now - ST.t0) / 1000, sp = 1 + (5 - ST.left) * .22; return { x: C.x + Math.sin(t * 1.7 * sp + ST.ph) * RB * .85, y: C.y + Math.sin(t * 2.3 * sp + ST.ph * 1.7) * RB * .7 }; }
  function frame(now) {
    if (OV !== ov) return;
    x.fillStyle = '#EFE6D8'; x.fillRect(0, 0, 360, 470); x.fillStyle = '#6b4a2c'; x.fillRect(C.x - RB - 18, C.y - RB - 18, (RB + 18) * 2, (RB + 18) * 2);
    x.drawImage(board, C.x - RB, C.y - RB, RB * 2, RB * 2);
    ST.darts.forEach((d) => { x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.arc(d.x + 2, d.y + 3, 4, 0, 7); x.fill(); x.strokeStyle = '#2b3036'; x.lineWidth = 3; x.beginPath(); x.moveTo(d.x, d.y); x.lineTo(d.x + 14, d.y + 18); x.stroke(); x.fillStyle = '#E8920A'; x.beginPath(); x.moveTo(d.x + 12, d.y + 14); x.lineTo(d.x + 24, d.y + 18); x.lineTo(d.x + 16, d.y + 26); x.closePath(); x.fill(); });
    if (ST.fly) { const k = clamp((now - ST.fly.t0) / 220, 0, 1); const px = 180 + (ST.fly.x - 180) * k, py = 470 + (ST.fly.y - 470) * k; x.strokeStyle = '#2b3036'; x.lineWidth = 3 + (1 - k) * 4; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 10, py + 22 + (1 - k) * 20); x.stroke(); if (k >= 1) land(ST.fly); }
    if (!ST.end && !ST.fly && ST.left > 0) { const a = aim(now); x.strokeStyle = '#D92D20'; x.lineWidth = 2.5; x.beginPath(); x.arc(a.x, a.y, 13, 0, 7); x.moveTo(a.x - 20, a.y); x.lineTo(a.x + 20, a.y); x.moveTo(a.x, a.y - 20); x.lineTo(a.x, a.y + 20); x.stroke(); }
    x.textAlign = 'left'; x.fillStyle = '#063A2B'; x.font = '800 20px ' + F; x.fillText('Điểm: ' + ST.score, 14, 28); x.textAlign = 'right'; x.font = '600 14px ' + F; x.fillStyle = '#344054'; x.fillText('Còn ' + ST.left + ' phi tiêu', 346, 28);
    if (ST.msg && now - ST.msgT < 1200) { x.textAlign = 'center'; x.font = '900 28px ' + F; x.fillStyle = ST.msgC; x.globalAlpha = 1 - (now - ST.msgT) / 1200; x.fillText(ST.msg, 180, 448); x.globalAlpha = 1; }
    ov.raf = requestAnimationFrame(frame);
  }
  function land(f) {
    ST.fly = null; ST.darts.push({ x: f.x, y: f.y }); const r = Math.hypot(f.x - C.x, f.y - C.y) / RB; const ring = DART_RING.find((q) => r <= q[0]);
    if (ring) { ST.score += ring[1]; ST.msg = ring[2] + ' +' + ring[1]; ST.msgC = ring[3]; sfx(ring[1] >= 50 ? 'win' : 'hit'); } else { ST.msg = DART_MISS[(Math.random() * DART_MISS.length) | 0]; ST.msgC = '#D92D20'; sfx('miss'); }
    ST.msgT = performance.now(); if (ST.left <= 0) setTimeout(finish, 700);
  }
  function shoot() { if (ST.end || ST.fly || ST.left <= 0) return; A.audioInit(); const a = aim(performance.now()); ST.left--; sfx('throw'); ST.fly = { x: a.x, y: a.y, t0: performance.now() }; }
  async function finish() {
    ST.end = true; $('ptM').textContent = 'Tổng: ' + ST.score + ' điểm KPI' + (ST.score >= 300 ? ' — xuất sắc!' : ST.score >= 150 ? ' — đạt chỉ tiêu!' : ' — tuần sau bứt phá nhé!'); const E = $('ptE');
    E.innerHTML = `<div class="gt-row"><button class="gt-btn cam" id="ptA">Chơi lại</button></div><div class="gt-msg">Đang lưu điểm…</div>`; $('ptA').onclick = () => { closeOv(); openPhiTieu(); };
    try { const j = await api({ hanh_dong: 'diem', tro: 'phitieu', diem: ST.score }); if (DATA) DATA.tro.phitieu = j.bang; E.querySelector('.gt-msg').textContent = j.ky_luc ? 'Kỷ lục tuần mới của anh/chị!' : 'Kỷ lục tuần của anh/chị: ' + j.cao_nhat + ' điểm.'; E.insertAdjacentHTML('beforeend', lbHtml('Bảng xếp hạng tuần', j.bang)); if (j.ky_luc) { sfx('win'); confetti(); } }
    catch (e) { E.querySelector('.gt-msg').textContent = e.message; }
  }
  G.c.addEventListener('pointerdown', (e) => { e.preventDefault(); shoot(); });
  ov.key = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); shoot(); } };
  ov.raf = requestAnimationFrame(frame);
  if (DATA && DATA.tro) $('ptE').innerHTML = lbHtml('Bảng xếp hạng tuần', DATA.tro.phitieu);
}
function ctex2(w, draw) { const c = document.createElement('canvas'); c.width = c.height = w; draw(c.getContext('2d')); return c; }

/* ═════════════ 9. MÁY GẮP THÚ ═════════════ */
const QUA_MAU = { gau: ['#2E9E6A', '#1E7A50'], meo: ['#F6C344', '#D99A1E'], ca: ['#5AA9E6', '#3A7FB8'], vit: ['#FFD84A', '#E8920A'], tho: ['#F7F7F2', '#F2B8C6'], rong: ['#E9B949', '#C2410C'], sao: ['#FFD84A', '#E8920A'] };
function drawQua(x, id, cx, cy, s) {
  const [c1, c2] = QUA_MAU[id] || QUA_MAU.gau; x.save(); x.translate(cx, cy); x.scale(s / 50, s / 50); x.lineJoin = 'round';
  const eyes = (y, sp) => { x.fillStyle = '#1d2433'; [-1, 1].forEach((k) => { x.beginPath(); x.arc(k * (sp || 8), y, 3, 0, 7); x.fill(); }); x.strokeStyle = '#1d2433'; x.lineWidth = 2; x.beginPath(); x.arc(0, y + 5, 4, .2, Math.PI - .2); x.stroke(); };
  if (id === 'sao') { x.fillStyle = c1; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 24, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); x.strokeStyle = c2; x.lineWidth = 2; x.stroke(); eyes(-2, 6); }
  else if (id === 'ca') { x.fillStyle = c1; x.beginPath(); x.ellipse(0, 4, 24, 16, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(20, 2); x.lineTo(32, -8); x.lineTo(30, 10); x.closePath(); x.fill(); x.fillStyle = '#fff'; x.fillRect(-10, 8, 16, 11); x.fillStyle = c2; x.fillRect(-8, 11, 12, 2); x.fillRect(-8, 15, 9, 2); eyes(-2, 8); }
  else if (id === 'vit') { x.fillStyle = c1; x.beginPath(); x.arc(0, 8, 19, 0, 7); x.fill(); x.beginPath(); x.arc(0, -12, 13, 0, 7); x.fill(); x.fillStyle = c2; x.beginPath(); x.ellipse(0, -8, 9, 4, 0, 0, 7); x.fill(); x.fillStyle = '#1d2433'; [-5, 5].forEach((k) => { x.beginPath(); x.arc(k, -15, 2.5, 0, 7); x.fill(); }); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.arc(10, 12, 7, 0, 7); x.stroke(); x.beginPath(); x.moveTo(10, 12); x.lineTo(10, 7); x.moveTo(10, 12); x.lineTo(13, 13); x.stroke(); }
  else if (id === 'tho') { x.fillStyle = c1; [-7, 7].forEach((k) => { x.beginPath(); x.ellipse(k, -24, 5, 14, k * .02, 0, 7); x.fill(); }); x.fillStyle = c2; [-7, 7].forEach((k) => { x.beginPath(); x.ellipse(k, -24, 2.5, 9, 0, 0, 7); x.fill(); }); x.fillStyle = c1; x.beginPath(); x.arc(0, 4, 20, 0, 7); x.fill(); x.strokeStyle = '#e5e5dc'; x.lineWidth = 1.5; x.stroke(); eyes(0, 7); x.fillStyle = '#C98B45'; x.fillRect(12, 8, 9, 12); x.fillStyle = '#fff'; x.fillRect(12, 8, 9, 3); }
  else if (id === 'rong') { x.fillStyle = c1; x.beginPath(); x.arc(0, 4, 20, 0, 7); x.fill(); x.fillStyle = c2; [-1, 1].forEach((k) => { x.beginPath(); x.moveTo(k * 8, -14); x.lineTo(k * 14, -28); x.lineTo(k * 4, -16); x.closePath(); x.fill(); }); for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(18, -6 + i * 8); x.lineTo(27, -2 + i * 8); x.lineTo(18, 2 + i * 8); x.fill(); } eyes(0, 7); x.fillStyle = '#fff'; x.font = '800 9px ' + F; x.textAlign = 'center'; x.fillText('KPI', 0, 19); }
  else { x.fillStyle = c1; [-1, 1].forEach((k) => { x.beginPath(); if (id === 'meo') { x.moveTo(k * 6, -14); x.lineTo(k * 18, -28); x.lineTo(k * 19, -10); } else x.arc(k * 15, -16, 8, 0, 7); x.closePath(); x.fill(); }); x.beginPath(); x.arc(0, 4, 21, 0, 7); x.fill(); x.fillStyle = c2; x.beginPath(); x.ellipse(0, 10, 10, 7, 0, 0, 7); x.fill(); eyes(-1, 8);
    if (id === 'meo') { x.fillStyle = c1; x.beginPath(); x.ellipse(-20, -6, 5, 9, -.5, 0, 7); x.fill(); x.fillStyle = '#E8920A'; x.beginPath(); x.arc(0, 16, 4, 0, 7); x.fill(); } else { x.fillStyle = '#fff'; x.font = '900 8px ' + F; x.textAlign = 'center'; x.fillText('DBV', 0, 12); } }
  x.restore();
}
function openGap() {
  const g0 = (DATA && DATA.gap) || { con_luot: 3, bst: {}, qua: [] };
  const ov = overlay('Máy gắp thú DBV', '3 lượt mỗi ngày · ◀ ▶ di chuyển, GẮP để thả móc', '#E8920A');
  const G = gameCanvas(ov.bd, 360, 500), x = G.x;
  ov.bd.insertAdjacentHTML('beforeend', `<div class="gt-row"><button class="gt-btn ghost big" id="gpL" aria-label="Sang trái">◀</button><button class="gt-btn cam big" id="gpG">GẮP</button><button class="gt-btn ghost big" id="gpR" aria-label="Sang phải">▶</button></div><div class="gt-msg" id="gpM"></div><div class="gt-sub">Bộ sưu tập của anh/chị</div><div class="gt-grid" id="gpB"></div>`);
  const IDS = ['gau', 'meo', 'ca', 'vit', 'tho', 'rong', 'sao'];
  const items = []; for (let i = 0; i < 11; i++) items.push({ id: IDS[i % 6], x: 110 + (i % 6) * 40 + Math.random() * 12, y: 395 - Math.floor(i / 6) * 34 - Math.random() * 6, s: 44 + Math.random() * 8 });
  if (Math.random() < .5) items.push({ id: 'sao', x: 230 + Math.random() * 60, y: 352, s: 40 });
  items.sort((a, b) => b.y - a.y);
  const ST = { cx: 300, cy: 70, open: 1, phase: 'idle', dir: 0, grab: null, left: g0.con_luot, info: null };
  const msg = (t) => { $('gpM').textContent = t; };
  msg(ST.left > 0 ? 'Hôm nay còn ' + ST.left + ' lượt.' : 'Hết lượt hôm nay — mai quay lại nhé!');
  renderBst(g0.bst);
  function renderBst(bst) { const el = $('gpB'); if (!el) return; const Q = (DATA && DATA.gap && DATA.gap.qua && DATA.gap.qua.length) ? DATA.gap.qua : IDS.map((id) => ({ id, ten: id }));
    el.innerHTML = ''; Q.forEach((q) => { const d = document.createElement('div'); const n = (bst || {})[q.id] || 0; if (!n) d.className = 'no'; const c = document.createElement('canvas'); c.width = c.height = 104; c.style.width = c.style.height = '52px'; drawQua(c.getContext('2d'), q.id, 52, 58, 64); d.appendChild(c); d.insertAdjacentHTML('beforeend', `${esc(q.ten)}${n ? ' ×' + n : ''}${q.hiem ? '<br><b style="color:#E8920A">' + esc(q.hiem) + '</b>' : ''}`); el.appendChild(d); }); }
  function frame(now) {
    if (OV !== ov) return;
    x.fillStyle = '#007437'; x.fillRect(0, 0, 360, 500); x.fillStyle = '#E8920A'; x.fillRect(0, 0, 360, 36); x.fillStyle = '#fff'; x.font = '900 20px ' + F; x.textAlign = 'center'; x.fillText('GẮP THÚ DBV', 180, 25);
    const gl = x.createLinearGradient(0, 40, 0, 440); gl.addColorStop(0, '#EAF6FF'); gl.addColorStop(1, '#CFE6F7'); x.fillStyle = gl; x.fillRect(16, 44, 328, 380);
    x.fillStyle = '#B9D6EA'; x.fillRect(16, 410, 328, 14); x.fillStyle = '#1d2433'; x.fillRect(22, 330, 66, 94); x.fillStyle = '#E8920A'; x.fillRect(22, 326, 66, 6); x.fillStyle = '#fff'; x.font = '700 11px ' + F; x.fillText('LẤY QUÀ', 55, 415);
    items.forEach((it) => { if (it !== ST.grab) drawQua(x, it.id, it.x, it.y, it.s); });
    if (ST.phase === 'move') { ST.cx = clamp(ST.cx + ST.dir * 3.2, 56, 320); }
    if (ST.phase === 'down') { ST.cy += 4; const tgt = target(); const stopY = tgt ? tgt.y - tgt.s * .55 : 380; if (ST.cy >= stopY) { ST.phase = 'close'; ST.t = now; } }
    if (ST.phase === 'close') { ST.open = Math.max(0, 1 - (now - ST.t) / 300); if (ST.open <= 0 && !ST.req) grab(); }
    if (ST.phase === 'up') { ST.cy -= 3; if (ST.grab) { ST.grab.x = ST.cx; ST.grab.y = ST.cy + ST.grab.s * .55; if (ST.slip && ST.cy < ST.slipY) { ST.grab.vy = 0; ST.falling = ST.grab; ST.grab = null; sfx('thud'); msg('Ối, tuột mất rồi! ' + left()); } } if (ST.cy <= 70) { ST.cy = 70; ST.phase = ST.grab ? 'home' : 'idle'; ST.open = ST.grab ? 0 : 1; } }
    if (ST.phase === 'home') { ST.cx = Math.max(55, ST.cx - 3); if (ST.grab) ST.grab.x = ST.cx; if (ST.cx <= 55) { ST.open = 1; ST.falling = ST.grab; ST.won = ST.grab; ST.grab = null; ST.phase = 'idle'; } }
    if (ST.falling) { const f = ST.falling; f.vy = (f.vy || 0) + .6; f.y += f.vy; const floor = ST.won === f ? 470 : f.y0 || 395; if (f.y >= floor) { if (ST.won === f) { items.splice(items.indexOf(f), 1); reveal(); ST.won = null; } else f.y = floor; ST.falling = null; } }
    if (ST.grab) drawQua(x, ST.grab.id, ST.grab.x, ST.grab.y, ST.grab.s);
    // móc gắp
    x.strokeStyle = '#9aa6b1'; x.lineWidth = 3; x.beginPath(); x.moveTo(ST.cx, 44); x.lineTo(ST.cx, ST.cy); x.stroke(); x.fillStyle = '#C9CED4'; x.fillRect(ST.cx - 14, ST.cy - 6, 28, 10);
    x.strokeStyle = '#C9CED4'; x.lineWidth = 4; const o = 6 + ST.open * 14; [-1, 1].forEach((k) => { x.beginPath(); x.moveTo(ST.cx + k * 8, ST.cy + 4); x.lineTo(ST.cx + k * (8 + o), ST.cy + 22); x.lineTo(ST.cx + k * (o * .4 + 2), ST.cy + 34); x.stroke(); });
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(30, 50, 10, 360);
    ov.raf = requestAnimationFrame(frame);
  }
  const left = () => (ST.left > 0 ? 'Còn ' + ST.left + ' lượt.' : 'Hết lượt hôm nay.');
  function target() { let best = null, bd = 1e9; items.forEach((it) => { const d = Math.abs(it.x - ST.cx); if (d < it.s * .75 && (it.y < bd)) { bd = it.y; best = it; } }); return best; }
  async function grab() {
    ST.req = true; const t = target(); const gan = t ? clamp(1 - Math.abs(t.x - ST.cx) / (t.s * .6), 0, 1) : 0; msg('Đang gắp…');
    let j; try { j = await api({ hanh_dong: 'gap', gan }); } catch (e) { msg(e.message); ST.req = false; ST.phase = 'up'; ST.open = 1; return; }
    ST.req = false; ST.left = j.con_luot; if (DATA) { DATA.gap.con_luot = j.con_luot; DATA.gap.bst = j.bst; }
    if (j.het_luot) { msg('Hết 3 lượt hôm nay rồi — mai quay lại nhé!'); ST.phase = 'up'; ST.open = 1; return; }
    if (t) { t.y0 = t.y; ST.grab = t; if (j.trung) { if (j.qua) t.id = j.qua.id; ST.info = j.qua; ST.slip = false; } else { ST.slip = true; ST.slipY = ST.cy - 60 - Math.random() * 80; } }
    else msg('Trượt rồi — không gắp trúng món nào. ' + left());
    ST.phase = 'up'; renderBst(j.bst);
  }
  function reveal() { const q = ST.info; sfx('win'); confetti(); msg('Trúng ' + (q ? q.ten + ' (' + q.hiem + ')' : 'một món quà') + '! ' + left()); }
  const go = (d) => { if (ST.phase === 'idle' || ST.phase === 'move') { if (ST.left <= 0) { msg('Hết lượt hôm nay — mai quay lại nhé!'); return; } ST.dir = d; ST.phase = d ? 'move' : 'idle'; } };
  const drop = () => { if ((ST.phase === 'idle' || ST.phase === 'move') && ST.left > 0) { ST.phase = 'down'; ST.dir = 0; sfx('click'); } else if (ST.left <= 0) msg('Hết lượt hôm nay — mai quay lại nhé!'); };
  [['gpL', -1], ['gpR', 1]].forEach(([id, d]) => { const b = $(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); go(d); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => { if (ST.phase === 'move') { ST.dir = 0; ST.phase = 'idle'; } })); });
  $('gpG').onclick = drop;
  G.c.addEventListener('pointerdown', (e) => { const p = G.pt(e); if (ST.phase === 'idle' || ST.phase === 'move') { ST.drag = true; ST.cx = clamp(p.x, 56, 320); } G.c.setPointerCapture(e.pointerId); });
  G.c.addEventListener('pointermove', (e) => { if (ST.drag && (ST.phase === 'idle' || ST.phase === 'move')) ST.cx = clamp(G.pt(e).x, 56, 320); });
  G.c.addEventListener('pointerup', () => { ST.drag = false; });
  ov.key = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (e.type === 'keydown') go(e.key === 'ArrowLeft' ? -1 : 1); else if (ST.phase === 'move') { ST.dir = 0; ST.phase = 'idle'; } } if (e.type === 'keydown' && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown')) { e.preventDefault(); drop(); } };
  ov.raf = requestAnimationFrame(frame);
}

/* ═════════════ 10. GÓC CHỤP ẢNH ═════════════ */
const STK = {
  kinh: (x, s) => { x.fillStyle = '#111'; [-1, 1].forEach((k) => { x.beginPath(); x.ellipse(k * s * .26, 0, s * .22, s * .15, 0, 0, 7); x.fill(); }); x.fillRect(-s * .06, -s * .04, s * .12, s * .05); x.fillStyle = 'rgba(255,255,255,.35)'; [-1, 1].forEach((k) => { x.beginPath(); x.ellipse(k * s * .26 - s * .07, -s * .05, s * .05, s * .03, -.5, 0, 7); x.fill(); }); },
  mu: (x, s) => { x.fillStyle = '#E8920A'; x.beginPath(); x.moveTo(-s * .28, s * .3); x.lineTo(0, -s * .45); x.lineTo(s * .28, s * .3); x.closePath(); x.fill(); x.fillStyle = '#0FA968'; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(-s * .1 + i * s * .1, s * (.15 - i * .18), s * .045, 0, 7); x.fill(); } x.fillStyle = '#fff'; x.beginPath(); x.arc(0, -s * .47, s * .08, 0, 7); x.fill(); },
  ria: (x, s) => { x.fillStyle = '#2b1a12'; x.beginPath(); x.moveTo(0, -s * .02); x.bezierCurveTo(-s * .12, -s * .14, -s * .35, -s * .1, -s * .42, s * .06); x.bezierCurveTo(-s * .3, 0, -s * .15, s * .06, 0, s * .03); x.bezierCurveTo(s * .15, s * .06, s * .3, 0, s * .42, s * .06); x.bezierCurveTo(s * .35, -s * .1, s * .12, -s * .14, 0, -s * .02); x.fill(); },
  no: (x, s) => { x.fillStyle = '#E86A5A'; [-1, 1].forEach((k) => { x.beginPath(); x.moveTo(0, 0); x.lineTo(k * s * .38, -s * .2); x.lineTo(k * s * .38, s * .2); x.closePath(); x.fill(); }); x.fillStyle = '#C2413A'; x.beginPath(); x.arc(0, 0, s * .09, 0, 7); x.fill(); },
  vuong: (x, s) => { x.fillStyle = '#F6C344'; x.beginPath(); x.moveTo(-s * .35, s * .2); x.lineTo(-s * .35, -s * .15); x.lineTo(-s * .18, s * .02); x.lineTo(0, -s * .28); x.lineTo(s * .18, s * .02); x.lineTo(s * .35, -s * .15); x.lineTo(s * .35, s * .2); x.closePath(); x.fill(); x.fillStyle = '#E86A5A'; x.beginPath(); x.arc(0, s * .08, s * .05, 0, 7); x.fill(); },
};
const STK_TEN = { kinh: 'Kính râm', mu: 'Mũ tiệc', ria: 'Ria mép', no: 'Nơ', vuong: 'Vương miện' };
const KHUNG = [['xanh', 'Khung DBV'], ['sinhnhat', 'Sinh nhật'], ['polaroid', 'Polaroid']];
function openAnh() {
  const ov = overlay('Góc chụp ảnh', 'Chọn khung, thêm phụ kiện, bấm chụp — ảnh tải về để đăng nhóm', '#007437', () => { if (ov.stream) ov.stream.getTracks().forEach((t) => t.stop()); });
  const W = 480, H = 600, G = gameCanvas(ov.bd, W, H); let x = G.x;
  ov.bd.insertAdjacentHTML('beforeend', `<div class="gt-tool" id="paK">${KHUNG.map((k, i) => `<button data-k="${k[0]}" class="${i ? '' : 'act'}">${k[1]}</button>`).join('')}</div>
    <div class="gt-tool" id="paS">${Object.keys(STK).map((k) => `<button data-k="${k}">${STK_TEN[k]}</button>`).join('')}</div>
    <div class="gt-row"><button class="gt-btn cam big" id="paC">${A.ic('camera', 18)} Chụp</button><label class="gt-btn ghost" style="cursor:pointer">Chọn ảnh có sẵn<input type="file" accept="image/*" id="paU" hidden></label></div>
    <div class="gt-msg" id="paM">Đang bật camera…</div><div id="paR"></div>`);
  const vid = document.createElement('video'); vid.playsInline = true; vid.muted = true; let img = null;
  const ST = { khung: 'xanh', st: [], sel: null, drag: null, cd: 0, frozen: null, flash: 0 };
  const today = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
  function cover(src, sw, sh, dx, dy, dw, dh, mirror) { const r = Math.max(dw / sw, dh / sh), w = sw * r, h = sh * r; x.save(); x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); if (mirror) { x.translate(dx + dw, 0); x.scale(-1, 1); x.drawImage(src, (dw - w) / 2, dy + (dh - h) / 2, w, h); } else x.drawImage(src, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h); x.restore(); }
  function photoArea() { return ST.khung === 'polaroid' ? [26, 26, W - 52, H - 150] : ST.khung === 'sinhnhat' ? [20, 90, W - 40, H - 188] : [18, 18, W - 36, H - 110]; }
  function logo(px, py, lw) { const L = A.IMG.full; if (!L) return; const lh = lw * L.height / L.width; x.fillStyle = '#fff'; A.rr(x, px - 10, py - 8, lw + 20, lh + 16, 12); x.fill(); x.drawImage(L, px, py, lw, lh); }
  function render(now) {
    const [ax, ay, aw, ah] = photoArea();
    x.fillStyle = ST.khung === 'xanh' ? '#007437' : ST.khung === 'sinhnhat' ? '#FFF2E3' : '#FBFAF7'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#d9dee3'; x.fillRect(ax, ay, aw, ah);
    if (ST.frozen) x.drawImage(ST.frozen, ax, ay, aw, ah);
    else if (img) cover(img, img.width, img.height, ax, ay, aw, ah, false);
    else if (vid.readyState >= 2) cover(vid, vid.videoWidth, vid.videoHeight, ax, ay, aw, ah, true);
    else { x.fillStyle = '#667085'; x.font = '600 18px ' + F; x.textAlign = 'center'; x.fillText('Chưa có hình từ camera', W / 2, ay + ah / 2); }
    ST.st.forEach((s) => { x.save(); x.translate(s.x, s.y); STK[s.k](x, s.s); x.restore(); if (s === ST.sel && !ST.cap) { x.strokeStyle = 'rgba(255,255,255,.9)'; x.setLineDash([5, 4]); x.lineWidth = 2; x.strokeRect(s.x - s.s * .5, s.y - s.s * .5, s.s, s.s); x.setLineDash([]); } });
    if (ST.khung === 'xanh') { x.fillStyle = '#E8920A'; x.fillRect(0, H - 92, W, 6); logo(32, H - 70, 84); x.textAlign = 'right'; x.fillStyle = '#fff'; x.font = '800 17px ' + F; x.fillText('Phòng giải trí · Chi nhánh Thành Đô', W - 24, H - 46); x.fillStyle = '#A8D5BD'; x.font = '600 15px ' + F; x.fillText(today, W - 24, H - 22); }
    else if (ST.khung === 'sinhnhat') { const cols = ['#E8920A', '#0FA968', '#F7C9D3', '#007437', '#F6C344']; for (let i = 0; i < 12; i++) { x.fillStyle = cols[i % 5]; x.beginPath(); x.moveTo(i * 40, 10); x.lineTo(i * 40 + 40, 10); x.lineTo(i * 40 + 20, 46); x.closePath(); x.fill(); }
      x.textAlign = 'center'; x.fillStyle = '#E86A5A'; x.font = '900 34px ' + F; x.fillText('Happy Birthday!', W / 2, 80); logo(W / 2 - 55, H - 66, 110); x.fillStyle = '#B8925A'; x.font = '600 14px ' + F; x.fillText(today, W / 2, H - 82); }
    else { x.textAlign = 'center'; x.fillStyle = '#2a2a2a'; x.font = 'italic 600 24px ' + F; x.fillText('Trà chiều cùng team DBV', W / 2, H - 82); x.fillStyle = '#98A2B3'; x.font = '600 14px ' + F; x.fillText('Chi nhánh Thành Đô · ' + today, W / 2, H - 56); logo(W / 2 - 40, H - 44, 80); }
    if (ST.cd) { const n = Math.ceil((ST.cd - now) / 1000); if (n > 0) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ax, ay, aw, ah); x.fillStyle = '#fff'; x.font = '900 120px ' + F; x.textAlign = 'center'; x.fillText(n, W / 2, ay + ah / 2 + 40); } }
    if (ST.flash && now - ST.flash < 300) { x.fillStyle = 'rgba(255,255,255,' + (1 - (now - ST.flash) / 300) + ')'; x.fillRect(0, 0, W, H); }
  }
  function frame(now) { if (OV !== ov) return; if (ST.cd && now >= ST.cd) capture(now); render(now); ov.raf = requestAnimationFrame(frame); }
  function capture(now) {
    ST.cd = 0; const [ax, ay, aw, ah] = photoArea(); const c = document.createElement('canvas'); c.width = aw * 2; c.height = ah * 2; const cx = c.getContext('2d');
    if (img) { const r = Math.max(c.width / img.width, c.height / img.height); cx.drawImage(img, (c.width - img.width * r) / 2, (c.height - img.height * r) / 2, img.width * r, img.height * r); }
    else if (vid.readyState >= 2) { const r = Math.max(c.width / vid.videoWidth, c.height / vid.videoHeight); cx.translate(c.width, 0); cx.scale(-1, 1); cx.drawImage(vid, (c.width - vid.videoWidth * r) / 2, (c.height - vid.videoHeight * r) / 2, vid.videoWidth * r, vid.videoHeight * r); }
    ST.frozen = c; ST.cap = true; ST.flash = now; sfx('click');
    // xuất ảnh độ phân giải gấp đôi: vẽ lại toàn bộ khung vào canvas riêng
    const out = document.createElement('canvas'); out.width = W * 2; out.height = H * 2; const ox = out.getContext('2d'); ox.scale(2, 2);
    x = ox; try { render(performance.now() + 1e6); } finally { x = G.x; }
    const url = out.toDataURL('image/jpeg', .92); ST.cap = false;
    $('paR').innerHTML = `<div class="gt-sub">Ảnh vừa chụp</div><img class="gt-shot" src="${url}" alt="Ảnh chụp ở phòng giải trí"><div class="gt-row"><a class="gt-btn cam" href="${url}" download="dbv-phong-giai-tri-${Date.now()}.jpg">Tải ảnh</a><button class="gt-btn ghost" id="paSh">Chia sẻ</button><button class="gt-btn ghost" id="paRe">Chụp lại</button></div>`;
    $('paRe').onclick = () => { ST.frozen = null; $('paR').innerHTML = ''; };
    $('paSh').onclick = async () => { try { const blob = await (await fetch(url)).blob(); const f = new File([blob], 'dbv-phong-giai-tri.jpg', { type: 'image/jpeg' }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Phòng giải trí DBV' }); else A.toast('Máy này chưa hỗ trợ chia sẻ trực tiếp — bấm Tải ảnh rồi gửi vào nhóm nhé'); } catch (e) { /* người dùng huỷ */ } };
    $('paR').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('paK').querySelectorAll('button').forEach((b) => b.onclick = () => { ST.khung = b.dataset.k; ST.frozen = null; $('paK').querySelectorAll('button').forEach((y) => y.classList.toggle('act', y === b)); });
  $('paS').querySelectorAll('button').forEach((b) => b.onclick = () => { const k = b.dataset.k, i = ST.st.findIndex((s) => s.k === k); if (i >= 0) { ST.st.splice(i, 1); b.classList.remove('act'); ST.sel = null; }
    else { const [ax, ay, aw, ah] = photoArea(); const pos = { kinh: [.5, .4, .42], mu: [.5, .14, .32], ria: [.5, .58, .3], no: [.5, .8, .26], vuong: [.5, .12, .34] }[k]; const s = { k, x: ax + aw * pos[0], y: ay + ah * pos[1], s: aw * pos[2] }; ST.st.push(s); ST.sel = s; b.classList.add('act'); } });
  G.c.addEventListener('pointerdown', (e) => { const p = G.pt(e); ST.sel = null; for (let i = ST.st.length - 1; i >= 0; i--) { const s = ST.st[i]; if (Math.abs(p.x - s.x) < s.s * .55 && Math.abs(p.y - s.y) < s.s * .55) { ST.sel = s; ST.drag = { dx: p.x - s.x, dy: p.y - s.y }; G.c.setPointerCapture(e.pointerId); break; } } });
  G.c.addEventListener('pointermove', (e) => { if (!ST.drag || !ST.sel) return; const p = G.pt(e); ST.sel.x = p.x - ST.drag.dx; ST.sel.y = p.y - ST.drag.dy; });
  G.c.addEventListener('pointerup', () => { ST.drag = null; });
  G.c.addEventListener('wheel', (e) => { if (!ST.sel) return; e.preventDefault(); ST.sel.s = clamp(ST.sel.s * (e.deltaY < 0 ? 1.08 : .93), 30, 420); }, { passive: false });
  $('paC').onclick = () => { if (ST.cd) return; ST.frozen = null; $('paR').innerHTML = ''; ST.sel = null; ST.cd = performance.now() + 3000; sfx('click'); };
  $('paU').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const im = new Image(); im.onload = () => { img = im; ST.frozen = null; $('paM').textContent = 'Đã dùng ảnh có sẵn. Thêm phụ kiện rồi bấm Chụp để ghép khung.'; }; im.src = URL.createObjectURL(f); };
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
    .then((s) => { if (OV !== ov) { s.getTracks().forEach((t) => t.stop()); return; } ov.stream = s; vid.srcObject = s; vid.play().catch(() => {}); $('paM').textContent = 'Camera đã bật. Chọn khung, thêm phụ kiện (kéo để di chuyển, cuộn chuột để phóng to), rồi bấm Chụp.'; })
    .catch(() => { $('paM').textContent = 'Không bật được camera — bấm "Chọn ảnh có sẵn" để ghép khung cho ảnh trong máy.'; });
  else $('paM').textContent = 'Trình duyệt không cho dùng camera — bấm "Chọn ảnh có sẵn".';
  ov.raf = requestAnimationFrame(frame);
}

/* ═════════════ Cửa ra ═════════════ */
function openRa() {
  panel({ title: 'Ra sảnh chính', tag: 'Cửa ra', icon: 'door', color: '#0FA968', soft: '#E7F8F0', intro: 'Đang vào phòng với tên ' + S.ten + (S.demo ? ' (bản xem thử)' : '') + '. Lần sau vào thẳng, không cần nhập lại mã.',
    body: `<div class="gt-row" style="justify-content:flex-start"><button class="gt-btn" id="raG">${A.ic('door', 16)} Ra sảnh</button><button class="gt-btn ghost" id="raO">Đổi người (đăng xuất)</button></div><p class="note">Đổi người: lần sau bấm cửa nhân viên sẽ phải nhập lại mã và chọn tên.</p>`,
    after: () => { $('raG').onclick = ra; $('raO').onclick = () => { A.logout(); A.toast('Đã đăng xuất khỏi phòng giải trí'); ra(); }; } });
}

/* ───────────────────────── Hoạt cảnh mỗi khung hình ───────────────────────── */
function tick(dt, t) {
  if (!((inside && built) || F7)) return;
  if (OBJ.claw) { OBJ.claw.position.x = .15 + Math.sin(t * .6) * .3; OBJ.claw.position.z = .05 + Math.sin(t * .45) * .25; OBJ.claw.rotation.y = t * .5; }
  if (OBJ.fan) OBJ.fan.rotation.z -= dt * 9;
  if (OBJ.balloons) OBJ.balloons.forEach((b) => { b.b.position.y = b.y + Math.sin(t * 1.2 + b.p) * .04; });
  if (OBJ.flames) { const lit = performance.now() > candlesOut; OBJ.flames.forEach((f, i) => { f.f.visible = f.gl.visible = lit; if (lit) { const k = 1 + Math.sin(t * 17 + i * 2) * .15; f.f.scale.set(1, k, 1); } }); }
  const M = A.MUSIC, on = !!(M.el || M.gen); if (OBJ.jukeLights) OBJ.jukeLights.forEach((l, i) => { if (on) l.material.color.setHSL(((t * .15 + i * .2) % 1), .9, .62); else l.material.color.set('#7a5a3c'); });
  if (OBJ.ring) OBJ.ring.material.color.setScalar(.85 + Math.sin(t * 2) * .15);
  drawJuke();
}

/* ───────────────────────── Khởi tạo ───────────────────────── */
function init(api) {
  A = api; Object.assign(A.ICONS, ICON_THEM);
  const s = document.createElement('style'); s.id = 'gt-css'; s.textContent = CSS; document.head.appendChild(s);
  A.hook.where = (p) => (p.x > R.x0 && p.x < R.x1 && p.z > R.z0 && p.z < R.z1 ? 'Phòng giải trí' : null);
  A.hook.tick = tick;
  // phím trong lớp phủ trò chơi / ô nhập nhiều dòng: không để văn phòng 3D bắt phím mũi tên
  const keyCap = (e) => { if (OV) { if (e.key === 'Escape' && e.type === 'keydown') { closeOv(); e.stopPropagation(); return; } if (OV.key) OV.key(e); if (e.target.tagName !== 'INPUT') e.stopPropagation(); }
    else if (e.target && e.target.tagName === 'TEXTAREA') e.stopPropagation(); };
  addEventListener('keydown', keyCap, true); addEventListener('keyup', keyCap, true);
}
/* ── Tầng 7 DBV Building (tang-tren.js): phòng Relax dựng ở tầng 7, các trò mở bằng mo(id) ── */
function tx() { const c = A.ctex; if (!TX.board) TX.board = c(1024, 640, () => {}); if (!TX.bday) TX.bday = c(1024, 640, () => {}); if (!TX.cork) TX.cork = c(1024, 640, () => {}); if (!TX.juke) TX.juke = c(512, 512, () => {}); jukeKey = ''; drawAll(); return TX; }
function gan(sess, o) { S = sess; F7 = true; RA = (o && o.ra) || null; if (o && o.obj) Object.assign(OBJ, o.obj); tx();
  loadData().then(() => { if (DATA && DATA.sinh_nhat && DATA.sinh_nhat.some((p) => p.nay)) setTimeout(() => A.toast('Hôm nay có sinh nhật ' + DATA.sinh_nhat.filter((p) => p.nay).map((p) => p.ten).join(', ') + ' 🎂 — ghé tường sinh nhật thổi nến nhé!'), 2500); });
  setTimeout(() => A.toast('Chào ' + esc(S.ten) + '! Phòng Relax tầng 7 — bấm vào đồ vật để chơi' + (S.demo ? ' (bản xem thử)' : '')), 450); }
function roi() { F7 = false; RA = null; closeOv(); stopRelax(true); }
const MO = { dovui: openDoVui, bot: openBot, sinhnhat: openSinhNhat, nhac: openNhac, thugian: openThuGian, giaynho: openGiayNho, nem: openNem, phitieu: openPhiTieu, gap: openGap, anh: openAnh };
function mo(id) { if (!S) return A.toast('Vào Phòng Relax bằng thang máy, nhập mã nhân viên trước nhé'); const f = MO[id]; if (f) f(); }
window.GT3D = { init, vao, ra, tx, gan, roi, mo };
})();
