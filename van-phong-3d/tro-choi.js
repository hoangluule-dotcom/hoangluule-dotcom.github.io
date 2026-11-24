/* DBV Building · Tầng 7 Phòng Relax — các trò chơi chơi được (bóng bàn, bi lắc, bóng rổ, cờ caro,
   lật thẻ, đua xe, rắn săn mồi). Tải khi bấm vào trò lần đầu. Mở bằng window.TROCHOI.mo(id, {ten}).
   Kỷ lục lưu trên máy người chơi (localStorage 'dbv_tc_best'). */
(function () {
  'use strict';
  const FONT = '"Be Vietnam Pro",system-ui,sans-serif';
  const G = { green: '#084C38', green2: '#007437', mint: '#5FE0A2', orange: '#E8920A', amber: '#FFB547', cream: '#F7F1E6', red: '#C8102E', blue: '#1554F0' };
  let ov = null, game = null, opts = {}, keys = {}, onKey = null, AC = null;

  /* ---------- tiện ích ---------- */
  const BK = 'dbv_tc_best';
  const bestAll = () => { try { return JSON.parse(localStorage.getItem(BK) || '{}'); } catch (e) { return {}; } };
  const bestOf = (id) => bestAll()[id];
  function saveBest(id, v, lower) { const b = bestAll(); const old = b[id]; const better = old == null || (lower ? v < old : v > old); if (better) { b[id] = v; try { localStorage.setItem(BK, JSON.stringify(b)); } catch (e) { /* bỏ qua */ } } return better; }
  function addWin(id) { const b = bestAll(); b[id] = (b[id] || 0) + 1; try { localStorage.setItem(BK, JSON.stringify(b)); } catch (e) { /* bỏ qua */ } return b[id]; }
  function beep(f, d, type, vol) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.value = vol || .05; g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + (d || .08)); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + (d || .08)); } catch (e) { /* không có âm thanh */ } }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* ---------- bảng thi đua chung (máy chủ giai-tri-3d) ---------- */
  const TD = { bongro: ['Bóng rổ', 'điểm'], duaxe: ['Đua xe', 'điểm'], ran: ['Rắn săn mồi', 'điểm'], latthe: ['Lật thẻ', 'lượt'], bongban: ['Bóng bàn', 'trận thắng'], bilac: ['Bi lắc', 'trận thắng'], caro: ['Cờ caro', 'ván thắng'], nem: ['Ném giấy', 'điểm'], phitieu: ['Phi tiêu', 'điểm'] };
  const online = () => !!(opts.tok && opts.tok !== 'demo' && opts.url);
  async function api(body) { if (!online()) return null; try { const r = await fetch(opts.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ tok: opts.tok }, body)) }); const j = await r.json().catch(() => ({})); return r.ok && j.ok ? j : null; } catch (e) { return null; } }
  let BXH = null, BXH_T = 0;
  async function bxh(force) { if (!force && BXH && Date.now() - BXH_T < 30000) return BXH; const j = await api({ hanh_dong: 'bxh_tro' }); if (j) { BXH = j; BXH_T = Date.now(); } return BXH; }
  // gửi kết quả một ván; trả về bảng tuần + mọi lúc (hoặc null khi không có mạng/đang chạy thử)
  async function report(tro, body) { const j = await api(Object.assign({ hanh_dong: 'ket_qua', tro }, body)); if (j) { BXH = null; if (opts.onScore) { try { opts.onScore(); } catch (e) { /* bỏ qua */ } } } return j; }
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function rows(ds, dv, n) { if (!ds || !ds.length) return '<p class="tc-empty">Chưa có ai ghi thành tích — vào chơi để đứng đầu!</p>';
    return '<ol class="tc-lb">' + ds.slice(0, n || 10).map((x, i) => `<li class="${opts.ten && x.ten === opts.ten ? 'me' : ''}"><span class="r">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="n">${esc(x.ten)}</span><span class="v">${esc(x.diem)} <small>${esc(dv)}</small></span></li>`).join('') + '</ol>'; }
  function rr(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }

  function css() { if (document.getElementById('tcCss')) return; const s = document.createElement('style'); s.id = 'tcCss'; s.textContent = `
.tc-ov{position:fixed;inset:0;z-index:9000;background:rgba(6,24,18,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:${FONT};padding:10px}
.tc-box{background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(980px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden}
.tc-hd{display:flex;align-items:center;gap:12px;padding:12px 16px;background:${G.green};color:#fff}
.tc-hd b{font-size:18px;line-height:22px;display:block}.tc-hd span{font-size:12px;line-height:16px;color:#A8D5BD}
.tc-sc{margin-left:auto;font-weight:800;font-size:16px;background:rgba(255,255,255,.12);padding:6px 12px;border-radius:999px;white-space:nowrap}
.tc-x{border:0;background:rgba(255,255,255,.16);color:#fff;width:36px;height:36px;border-radius:50%;font-size:22px;line-height:36px;cursor:pointer}
.tc-x:hover{background:rgba(255,255,255,.28)}
.tc-bd{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#0E2A21;padding:10px}
.tc-bd canvas{display:block;touch-action:none;border-radius:10px;cursor:pointer}
.tc-ft{padding:8px 16px 12px;font-size:13px;line-height:18px;color:#4A5568;background:#fff}
.tc-ft kbd{background:#EEF2F0;border:1px solid #D0D5DD;border-bottom-width:2px;border-radius:5px;padding:0 5px;font-family:inherit;font-size:12px}
.tc-end{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,24,18,.6)}
.tc-card{background:#fff;border-radius:16px;padding:22px 26px;text-align:center;min-width:260px;max-width:90%}
.tc-card h3{margin:0 0 6px;font-size:24px;color:${G.green}}.tc-card p{margin:4px 0;color:#344054;font-size:15px}
.tc-card .rec{color:${G.orange};font-weight:800}
.tc-btns{display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap}
.tc-btn{border:0;border-radius:999px;padding:10px 18px;font:700 15px ${FONT};cursor:pointer;background:${G.green2};color:#fff}
.tc-btn.sec{background:#EEF2F0;color:${G.green}}
.tc-menu{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;width:100%;max-width:720px;padding:10px}
.tc-pick{border:0;border-radius:16px;padding:20px;text-align:left;cursor:pointer;font-family:${FONT};background:linear-gradient(135deg,#1B0F3F,#3A1A6E);color:#fff;box-shadow:0 0 0 2px rgba(255,90,200,.35) inset}
.tc-pick.lt{background:#FFF8E7;color:${G.green};box-shadow:0 0 0 2px #F2D9A6 inset}
.tc-pick b{display:block;font-size:20px;margin:8px 0 4px}.tc-pick span{font-size:13px;opacity:.85}.tc-pick i{font-style:normal;font-size:34px}
.tc-pick em{display:block;margin-top:10px;font-style:normal;font-weight:700;font-size:13px;color:${G.amber}}
.tc-pick.lt em{color:${G.orange}}
.tc-pick:hover{transform:translateY(-2px)}
.tc-lb{list-style:none;margin:8px 0 0;padding:0;text-align:left}.tc-lb li{display:flex;gap:10px;align-items:center;padding:6px 10px;border-radius:10px;font-size:14px;color:#1C1C1C}
.tc-lb li:nth-child(odd){background:#F6F8F7}.tc-lb li.me{background:#FFF1DC;font-weight:800}.tc-lb .r{width:30px;text-align:center;font-weight:800;color:${G.green}}.tc-lb .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tc-lb .v{font-weight:800;color:${G.green}}.tc-lb small{font-weight:500;color:#667085}
.tc-empty{color:#667085;font-size:14px;margin:10px 0}.tc-srv{margin-top:10px;border-top:1px solid #EEF2F0;padding-top:10px;max-height:240px;overflow:auto}.tc-srv .big{font-size:16px;font-weight:800;color:${G.orange}}
.tc-cup{border:0;background:${G.amber};color:${G.green};font:800 13px ${FONT};padding:7px 12px;border-radius:999px;cursor:pointer;white-space:nowrap}
.tc-board{background:#fff;width:100%;max-width:760px;border-radius:14px;padding:16px 18px;max-height:calc(100vh - 190px);overflow:auto}
.tc-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.tc-tab{border:1px solid #D0D5DD;background:#fff;border-radius:999px;padding:6px 12px;font:700 13px ${FONT};cursor:pointer;color:${G.green}}
.tc-tab.on{background:${G.green};border-color:${G.green};color:#fff}.tc-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.tc-cols h4{margin:4px 0 0;font-size:15px;color:${G.green}}
.tc-note{font-size:12px;color:#667085;margin-top:10px}
`; document.head.appendChild(s); }

  /* ---------- khung cửa sổ trò chơi ---------- */
  function shell(title, sub, hint) {
    css(); close(true);
    ov = document.createElement('div'); ov.className = 'tc-ov';
    ov.innerHTML = `<div class="tc-box"><div class="tc-hd"><div><b></b><span></span></div><div class="tc-sc"></div><button class="tc-cup" title="Xem bảng thi đua của mọi người">🏆 Bảng thi đua</button><button class="tc-x" title="Đóng (Esc)">×</button></div><div class="tc-bd"></div><div class="tc-ft"></div></div>`;
    ov.querySelector('.tc-hd b').textContent = title; ov.querySelector('.tc-hd span').textContent = sub || '';
    ov.querySelector('.tc-ft').innerHTML = hint || '';
    ov.querySelector('.tc-x').onclick = () => close();
    ov.querySelector('.tc-cup').onclick = () => board(cur || 'bongro');
    ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchmove', 'touchend', 'click', 'dblclick', 'contextmenu'].forEach((ev) => ov.addEventListener(ev, (e) => e.stopPropagation()));
    document.body.appendChild(ov);
    keys = {};
    onKey = (e) => { if (!ov) return; const k = e.key; if (e.type === 'keydown' && k === 'Escape') { close(); } keys[k] = e.type === 'keydown';
      if (/^Arrow|^ $|^[wasdWASD]$/.test(k)) e.preventDefault(); e.stopImmediatePropagation(); if (e.type === 'keydown' && game && game.key) game.key(k); };
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    return ov;
  }
  function close(silent) { if (game && game.stop) game.stop(); game = null; if (ov) { ov.remove(); ov = null; } if (onKey) { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); onKey = null; } keys = {}; void silent; }
  const setScore = (t) => { if (ov) ov.querySelector('.tc-sc').textContent = t; };
  const body = () => ov.querySelector('.tc-bd');

  // tạo canvas logic W×H, co giãn theo màn hình
  function canvas(W, H) { const cv = document.createElement('canvas'); const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = `min(${W}px, 100%, calc((100vh - 170px) * ${(W / H).toFixed(4)}))`; cv.style.height = 'auto'; cv.style.aspectRatio = W + '/' + H;
    const x = cv.getContext('2d'); x.scale(dpr, dpr); body().innerHTML = ''; body().appendChild(cv);
    const P = { x: W / 2, y: H / 2, down: false, active: false, sx: 0, sy: 0, st: 0 };
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener('pointerdown', (e) => { [P.x, P.y] = pos(e); P.down = true; P.active = true; P.sx = P.x; P.sy = P.y; P.st = performance.now(); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* bỏ qua */ } if (game && game.down) game.down(P); });
    cv.addEventListener('pointermove', (e) => { [P.x, P.y] = pos(e); P.active = true; if (game && game.move) game.move(P); });
    cv.addEventListener('pointerup', (e) => { [P.x, P.y] = pos(e); P.down = false; if (game && game.up) game.up(P); });
    return { cv, x, W, H, P }; }
  // vòng lặp khung hình
  function loop(fn) { let last = performance.now(), id = 0, on = true; const step = (t) => { if (!on) return; const dt = Math.min(.05, (t - last) / 1000); last = t; fn(dt, t / 1000); id = requestAnimationFrame(step); }; id = requestAnimationFrame(step); return () => { on = false; cancelAnimationFrame(id); }; }
  // bảng kết quả
  function result(title, lines, again, back, srv, tro) { const d = document.createElement('div'); d.className = 'tc-end';
    d.innerHTML = `<div class="tc-card"><h3></h3>${lines.map((l) => `<p class="tc-l ${l[1] || ''}"></p>`).join('')}<div class="tc-srv">${online() ? '<p class="tc-empty">Đang lưu thành tích lên bảng thi đua…</p>' : '<p class="tc-empty">Đang chạy thử nên chưa lưu lên bảng thi đua chung.</p>'}</div><div class="tc-btns"><button class="tc-btn">Chơi lại</button>${back ? '<button class="tc-btn sec b2">Chọn trò khác</button>' : ''}<button class="tc-btn sec b3">Đóng</button></div></div>`;
    d.querySelector('h3').textContent = title; d.querySelectorAll('p.tc-l').forEach((p, i) => { p.textContent = lines[i][0]; });
    d.querySelector('.tc-btn').onclick = () => { d.remove(); again(); }; if (back) d.querySelector('.b2').onclick = () => { d.remove(); back(); }; d.querySelector('.b3').onclick = () => close();
    body().appendChild(d);
    if (srv && online()) srv.then((j) => { const box = d.querySelector('.tc-srv'); if (!box) return; if (!j || !j.tuan) { box.innerHTML = '<p class="tc-empty">Chưa lưu được lên máy chủ (mạng chập chờn?). Thành tích vẫn ghi trên máy này.</p>'; return; }
      const dv = (TD[tro] || ['', ''])[1], w = j.tuan, a = j.tat_ca; const hang = w.hang ? `Hạng ${w.hang}/${w.so_nguoi} tuần này` : '';
      box.innerHTML = `<p class="big">${esc(hang)}${w.ky_luc && a && a.ky_luc && a.hang === 1 ? ' · Kỷ lục mọi thời của cả phòng!' : w.ky_luc ? ' · Thành tích tuần mới của bạn' : ''}</p>` + rows(w.bang, dv, 5) + '<button class="tc-btn sec" style="margin-top:8px">Xem toàn bộ bảng thi đua</button>';
      box.querySelector('button').onclick = () => board(tro); }); }
  const who = () => (opts.ten ? opts.ten : 'Bạn');
  let cur = null;
  /* ---------- màn hình Bảng thi đua ---------- */
  async function board(sel) { shell('Bảng thi đua Phòng Relax', 'Thành tích của mọi người · bảng tuần làm mới mỗi thứ Hai', 'Bảng tuần: điểm cao nhất của mỗi người trong tuần (bóng bàn, bi lắc, cờ caro tính số trận thắng máy). Bảng mọi lúc: kỷ lục từ trước đến nay. Lật thẻ: càng ít lượt càng cao.');
    setScore(who()); const wrap = document.createElement('div'); wrap.className = 'tc-board'; body().innerHTML = ''; body().appendChild(wrap);
    if (!online()) { wrap.innerHTML = '<p class="tc-empty">Đang chạy thử (không phải trang dbv247.com.vn) nên chưa có bảng thi đua chung. Kỷ lục trên máy này:</p>' + Object.keys(TD).filter((k) => bestOf(k) != null).map((k) => `<p><b>${TD[k][0]}:</b> ${bestOf(k)} ${TD[k][1]}</p>`).join(''); return; }
    wrap.innerHTML = '<p class="tc-empty">Đang tải bảng thi đua…</p>'; const j = await bxh(true); if (!ov || !wrap.isConnected) return;
    if (!j) { wrap.innerHTML = '<p class="tc-empty">Chưa tải được bảng thi đua, thử lại sau nhé.</p>'; return; }
    let pick = sel && j.bang[sel] ? sel : Object.keys(j.bang)[0];
    const paint = () => { const B = j.bang[pick]; wrap.innerHTML = '<div class="tc-tabs">' + Object.keys(j.bang).map((k) => `<button class="tc-tab ${k === pick ? 'on' : ''}" data-k="${k}">${esc(j.bang[k].ten)}</button>`).join('') + '</div>'
      + `<div class="tc-cols"><div><h4>Tuần này (từ ${esc(j.tuan_bat_dau.split('-').reverse().join('/'))})</h4>${rows(B.tuan, B.dv, 10)}</div>` + (B.tat_ca && (B.tat_ca.length || !/nem|phitieu/.test(pick)) ? `<div><h4>Mọi lúc</h4>${rows(B.tat_ca, B.dv, 10)}</div>` : '') + '</div>'
      + (TD[pick] && !/nem|phitieu/.test(pick) ? '<div class="tc-btns"><button class="tc-btn">Chơi ' + esc(B.ten) + '</button></div>' : '') + '<p class="tc-note">Thành tích được ghi theo tên anh/chị đã chọn khi vào Phòng Relax.</p>';
      wrap.querySelectorAll('.tc-tab').forEach((b) => { b.onclick = () => { pick = b.dataset.k; paint(); }; }); const pb = wrap.querySelector('.tc-btns .tc-btn'); if (pb) pb.onclick = () => mo(pick, opts); };
    paint(); }

  /* ======================= BÓNG BÀN ======================= */
  function pingpong() {
    shell('Bóng bàn', 'Đấu với máy · ai tới 7 điểm trước thắng', 'Di chuột / kéo ngón tay lên xuống để điều khiển vợt đỏ, hoặc <kbd>↑</kbd> <kbd>↓</kbd>. <kbd>Esc</kbd> để thoát.');
    const C = canvas(900, 520), x = C.x, W = 900, H = 520; const PH = 92, PW = 14;
    let me, ai, b, sc, serve, stop;
    const reset = () => { me = { y: H / 2 }; ai = { y: H / 2 }; sc = [0, 0]; newBall(1); upd(); };
    const newBall = (dir) => { b = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 9 }; serve = .9; b.dir = dir; };
    const upd = () => setScore(`${who()} ${sc[0]} – ${sc[1]} Máy`);
    const hit = (p, px, side) => { if (Math.abs(b.y - p.y) < PH / 2 + b.r && Math.abs(b.x - px) < PW / 2 + b.r && Math.sign(b.vx) === side) { const off = (b.y - p.y) / (PH / 2); const sp = Math.min(900, Math.hypot(b.vx, b.vy) * 1.05 + 10); const ang = off * .95; b.vx = -side * Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.x = px - side * (PW / 2 + b.r); beep(side > 0 ? 520 : 660, .05); } };
    const draw = () => { x.fillStyle = '#1f4f8f'; x.fillRect(0, 0, W, H); x.strokeStyle = '#fff'; x.lineWidth = 4; x.strokeRect(6, 6, W - 12, H - 12); x.lineWidth = 2; x.beginPath(); x.moveTo(6, H / 2); x.lineTo(W - 6, H / 2); x.stroke();
      x.setLineDash([10, 10]); x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke(); x.setLineDash([]);
      x.fillStyle = 'rgba(255,255,255,.16)'; x.font = `900 120px ${FONT}`; x.textAlign = 'center'; x.fillText(sc[0], W / 4, 150); x.fillText(sc[1], W * 3 / 4, 150);
      x.fillStyle = G.red; rr(x, 30 - PW / 2, me.y - PH / 2, PW, PH, 6); x.fill(); x.fillStyle = '#111'; rr(x, W - 30 - PW / 2, ai.y - PH / 2, PW, PH, 6); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(b.x, b.y, b.r, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.arc(b.x + 4, b.y + 6, b.r, 0, 7); x.fill();
      if (serve > 0) { x.fillStyle = '#fff'; x.font = `700 26px ${FONT}`; x.fillText('Sẵn sàng…', W / 2, H - 40); } };
    const start = () => { reset(); if (stop) stop(); stop = loop((dt) => {
      if (C.P.active) me.y = C.P.y; if (keys.ArrowUp || keys.w) me.y -= 560 * dt; if (keys.ArrowDown || keys.s) me.y += 560 * dt; me.y = clamp(me.y, PH / 2, H - PH / 2);
      const target = b.vx > 0 ? b.y + (b.vy * (W - 30 - b.x) / Math.max(200, b.vx)) * .35 : H / 2; const aiSp = 300 + (sc[0] + sc[1]) * 14; ai.y += clamp(target - ai.y, -aiSp * dt, aiSp * dt); ai.y = clamp(ai.y, PH / 2, H - PH / 2);
      if (serve > 0) { serve -= dt; if (serve <= 0) { const a = (Math.random() - .5) * .8; b.vx = b.dir * Math.cos(a) * 430; b.vy = Math.sin(a) * 430; } }
      b.x += b.vx * dt; b.y += b.vy * dt; if (b.y < b.r + 6 || b.y > H - b.r - 6) { b.vy *= -1; b.y = clamp(b.y, b.r + 6, H - b.r - 6); beep(300, .03, 'sine'); }
      hit(me, 30, -1); hit(ai, W - 30, 1);
      if (b.x < -20 || b.x > W + 20) { const pl = b.x > W; sc[pl ? 0 : 1]++; upd(); beep(pl ? 880 : 200, .15); if (sc[0] >= 7 || sc[1] >= 7) { draw(); stop(); const win = sc[0] > sc[1]; const n = win ? addWin('bongban') : (bestOf('bongban') || 0);
          result(win ? 'Bạn thắng!' : 'Máy thắng rồi', [[`${sc[0]} – ${sc[1]}`], [`Số trận đã thắng máy (máy này): ${n}`, 'rec']], start, null, report('bongban', { thang: win }), 'bongban'); return; } newBall(pl ? -1 : 1); }
      draw(); }); };
    game = { stop: () => stop && stop() }; start();
  }

  /* ======================= BI LẮC ======================= */
  function foosball() {
    shell('Bi lắc', 'Đội đỏ của bạn đấu đội xanh · 5 bàn thắng', 'Di chuột / kéo ngón tay lên xuống: cả 3 thanh đỏ cùng chạy. Cầu thủ chạm bóng là tự sút về phía khung xanh. Hoặc <kbd>↑</kbd> <kbd>↓</kbd>.');
    const C = canvas(900, 520), x = C.x, W = 900, H = 520, GY0 = 185, GY1 = 335, M = 18;
    const rods = [{ x: 70, n: 1, s: 'r' }, { x: 210, n: 3, s: 'b' }, { x: 350, n: 3, s: 'r' }, { x: 550, n: 3, s: 'b' }, { x: 690, n: 3, s: 'r' }, { x: 830, n: 1, s: 'b' }].map((r) => Object.assign(r, { off: H / 2, sp: 150 }));
    let ball, sc, stop, wait;
    const men = (r) => { const out = []; for (let i = 0; i < r.n; i++) out.push(r.off + (i - (r.n - 1) / 2) * r.sp); return out; };
    const lim = (r) => { const half = (r.n - 1) / 2 * r.sp; return [M + 20 + half, H - M - 20 - half]; };
    const kick = (dir) => { beep(dir > 0 ? 600 : 420, .04); };
    const newBall = (dir) => { ball = { x: W / 2, y: H / 2, vx: dir * 120, vy: (Math.random() - .5) * 260, r: 11 }; wait = .7; };
    const draw = () => { x.fillStyle = '#1f6b46'; x.fillRect(0, 0, W, H); for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.04)'; x.fillRect(i * 100, 0, 100, H); }
      x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 3; x.strokeRect(M, M, W - 2 * M, H - 2 * M); x.beginPath(); x.moveTo(W / 2, M); x.lineTo(W / 2, H - M); x.stroke(); x.beginPath(); x.arc(W / 2, H / 2, 60, 0, 7); x.stroke();
      x.fillStyle = '#e8e8e8'; x.fillRect(0, GY0, M, GY1 - GY0); x.fillRect(W - M, GY0, M, GY1 - GY0);
      rods.forEach((r) => { x.fillStyle = '#cfd5da'; x.fillRect(r.x - 3, 0, 6, H); men(r).forEach((y) => { x.fillStyle = r.s === 'r' ? G.red : G.blue; rr(x, r.x - 10, y - 18, 20, 36, 6); x.fill(); x.fillStyle = '#F3D2B5'; x.beginPath(); x.arc(r.x, y, 7, 0, 7); x.fill(); }); });
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ball.x, ball.y, ball.r, 0, 7); x.fill(); x.strokeStyle = '#333'; x.lineWidth = 1.5; x.stroke(); };
    const start = () => { sc = [0, 0]; setScore(`${who()} 0 – 0 Xanh`); newBall(1); if (stop) stop(); stop = loop((dt) => {
      let ty = C.P.active ? C.P.y : null; rods.filter((r) => r.s === 'r').forEach((r) => { const [a, b] = lim(r); if (ty != null) r.off = clamp(ty, a, b); if (keys.ArrowUp || keys.w) r.off = clamp(r.off - 520 * dt, a, b); if (keys.ArrowDown || keys.s) r.off = clamp(r.off + 520 * dt, a, b); });
      rods.filter((r) => r.s === 'b').forEach((r) => { const [a, b] = lim(r); const ms = men(r); let best = 0, bd = 1e9; ms.forEach((y, i) => { const d = Math.abs(y - ball.y); if (d < bd) { bd = d; best = i; } }); const want = r.off + (ball.y - ms[best]); const sp = 250 + (sc[0] + sc[1]) * 15; r.off = clamp(r.off + clamp(want - r.off, -sp * dt, sp * dt), a, b); });
      if (wait > 0) { wait -= dt; draw(); return; }
      const sub = 3; for (let k = 0; k < sub; k++) { const h = dt / sub; ball.x += ball.vx * h; ball.y += ball.vy * h; ball.vx *= (1 - .25 * h); ball.vy *= (1 - .25 * h);
        if (ball.y < M + ball.r) { ball.y = M + ball.r; ball.vy = Math.abs(ball.vy); } if (ball.y > H - M - ball.r) { ball.y = H - M - ball.r; ball.vy = -Math.abs(ball.vy); }
        const inGoal = ball.y > GY0 && ball.y < GY1;
        if (ball.x < M + ball.r && !inGoal) { ball.x = M + ball.r; ball.vx = Math.abs(ball.vx); } if (ball.x > W - M - ball.r && !inGoal) { ball.x = W - M - ball.r; ball.vx = -Math.abs(ball.vx); }
        rods.forEach((r) => { const dir = r.s === 'r' ? 1 : -1; men(r).forEach((y) => { if (Math.abs(ball.x - r.x) < 10 + ball.r && Math.abs(ball.y - y) < 18 + ball.r) { const sp = Math.max(420, Math.hypot(ball.vx, ball.vy) * 1.08); const ang = clamp((ball.y - y) / 30, -1, 1) * .7 + (Math.random() - .5) * .25; ball.vx = dir * Math.cos(ang) * sp; ball.vy = Math.sin(ang) * sp; ball.x = r.x + dir * (10 + ball.r + 1); kick(dir); } }); });
        if (ball.x < -ball.r || ball.x > W + ball.r) { const pl = ball.x > W; sc[pl ? 0 : 1]++; setScore(`${who()} ${sc[0]} – ${sc[1]} Xanh`); beep(pl ? 880 : 180, .2); if (sc[0] >= 5 || sc[1] >= 5) { draw(); stop(); const win = sc[0] > sc[1]; const n = win ? addWin('bilac') : (bestOf('bilac') || 0); result(win ? 'Đội đỏ thắng!' : 'Đội xanh thắng', [[`${sc[0]} – ${sc[1]}`], [`Số trận đã thắng (máy này): ${n}`, 'rec']], start, null, report('bilac', { thang: win }), 'bilac'); return; } newBall(pl ? -1 : 1); break; } }
      if (Math.hypot(ball.vx, ball.vy) < 40 && wait <= 0) { ball.vx += (ball.x < W / 2 ? 1 : -1) * 60; ball.vy += (Math.random() - .5) * 60; }
      draw(); }); };
    game = { stop: () => stop && stop() }; start();
  }

  /* ======================= MÁY BÓNG RỔ ======================= */
  function basketball() {
    shell('Máy bóng rổ', '30 giây · ném càng nhiều càng tốt · từ 10 điểm rổ bắt đầu chạy', 'Vuốt quả bóng lên phía rổ (vuốt lệch trái/phải để ngắm). Bàn phím: <kbd>←</kbd> <kbd>→</kbd> dời bóng, giữ <kbd>Space</kbd> lấy lực rồi thả.');
    const C = canvas(600, 760), x = C.x, W = 600, H = 760, RY = 230, RIM = 46, BY = 640;
    let t, score, hx, balls, bx, charge, charging, stop, drag;
    const throwBall = (x0, vx, p) => { // p: lực (px/ms), vx: lệch ngang (px/ms)
      const xEnd = x0 + vx * 330; const ok = Math.abs(xEnd - hx) < RIM - 14 && p > 1.0 && p < 3.6;
      const short = p <= 1.0, long = p >= 3.6;
      balls.push({ x0, xEnd, ok, short, long, t: 0, dur: .75, hx0: hx }); beep(330, .05, 'triangle'); };
    const start = () => { t = 30; score = 0; hx = W / 2; balls = []; bx = W / 2; charge = 0; charging = false; drag = null; setScore('0 điểm · 30 s'); if (stop) stop();
      stop = loop((dt, now) => { t -= dt; if (score >= 10) hx = W / 2 + Math.sin(now * 1.6) * (score >= 20 ? 190 : 130);
        if (keys.ArrowLeft) bx -= 380 * dt; if (keys.ArrowRight) bx += 380 * dt; bx = clamp(bx, 80, W - 80);
        if (keys[' ']) { charging = true; charge = (charge + dt * 1.6) % 2; } else if (charging) { charging = false; const p = .3 + (charge > 1 ? 2 - charge : charge) * 4.6; throwBall(bx, 0, p); charge = 0; }
        balls.forEach((b) => { b.t += dt; if (!b.done && b.t >= b.dur * .62) { b.done = true; if (b.ok && Math.abs(b.xEnd - hx) < RIM - 8) { score += t < 10 ? 3 : 2; beep(880, .12, 'sine', .08); setTimeout(() => beep(1180, .12, 'sine', .07), 90); } else beep(160, .08); } });
        balls = balls.filter((b) => b.t < b.dur + .4);
        setScore(`${score} điểm · ${Math.max(0, Math.ceil(t))} s`);
        // vẽ
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0E3B2C'); g.addColorStop(1, '#1f4f8f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        x.fillStyle = '#183b6e'; x.beginPath(); x.moveTo(40, H); x.lineTo(W - 40, H); x.lineTo(W - 140, RY + 60); x.lineTo(140, RY + 60); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 2; for (let i = 1; i < 8; i++) { const y = RY + 60 + (H - RY - 60) * i / 8; x.beginPath(); x.moveTo(140 - 100 * i / 8, y); x.lineTo(W - 140 + 100 * i / 8, y); x.stroke(); }
        x.fillStyle = '#fff'; rr(x, hx - 90, RY - 130, 180, 120, 8); x.fill(); x.strokeStyle = G.red; x.lineWidth = 4; x.strokeRect(hx - 36, RY - 70, 72, 54);
        x.fillStyle = '#FFB547'; x.font = `900 26px ${FONT}`; x.textAlign = 'center'; x.fillText(String(score).padStart(2, '0'), hx, RY - 95);
        const drawBall = (X, Y, r) => { x.fillStyle = '#E8762B'; x.beginPath(); x.arc(X, Y, r, 0, 7); x.fill(); x.strokeStyle = '#5a2a0a'; x.lineWidth = Math.max(1, r / 14); x.beginPath(); x.moveTo(X - r, Y); x.lineTo(X + r, Y); x.moveTo(X, Y - r); x.lineTo(X, Y + r); x.stroke(); x.beginPath(); x.arc(X, Y, r * .7, -1, 1); x.stroke(); };
        const behind = [], front = []; balls.forEach((b) => { const k = Math.min(1, b.t / b.dur); let X, Y; const endY = b.short ? BY - 200 : RY, arc = b.short ? 110 : 170;
          if (k < .62) { const q = k / .62; X = b.x0 + (b.xEnd - b.x0) * q; Y = BY + (endY - BY) * q - arc * Math.sin(Math.PI * q); }
          else { const q = (k - .62) / .38; X = b.xEnd + (b.ok ? 0 : (b.long ? 40 : (b.xEnd < hx ? -60 : 60)) * q); Y = endY + (b.ok ? 140 : 240) * q * q; }
          const r = 34 - 16 * Math.min(1, k / .62); (k > .5 ? behind : front).push([X, Y, r]); });
        behind.forEach((p) => drawBall(...p));
        x.strokeStyle = G.orange; x.lineWidth = 6; x.beginPath(); x.ellipse(hx, RY, RIM, 10, 0, 0, 7); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(hx + i * 13, RY + 6); x.lineTo(hx + i * 9, RY + 52); x.stroke(); }
        front.forEach((p) => drawBall(...p));
        if (t > 0) drawBall(bx, BY, 34);
        if (charging) { const p = charge > 1 ? 2 - charge : charge; x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(W - 40, BY - 150, 18, 150); x.fillStyle = p > .16 && p < .71 ? G.mint : G.red; x.fillRect(W - 40, BY - 150 * p, 18, 150 * p); }
        if (t <= 0) { stop(); const rec = saveBest('bongro', score); result('Hết giờ!', [[`${who()} ghi ${score} điểm`], [rec ? 'Kỷ lục mới trên máy này!' : `Kỷ lục trên máy này: ${bestOf('bongro')} điểm`, 'rec']], start, null, report('bongro', { diem: score }), 'bongro'); } }); };
    game = { stop: () => stop && stop(),
      down: (P) => { if (Math.hypot(P.x - bx, P.y - BY) < 110 || P.y > BY - 120) drag = { x: P.x, y: P.y, t: performance.now() }; },
      up: (P) => { if (!drag || t <= 0) return; const dt = Math.max(60, performance.now() - drag.t), dy = P.y - drag.y, dx = P.x - drag.x; if (dy < -40) { bx = clamp(drag.x, 80, W - 80); throwBall(bx, dx / dt, -dy / dt); } drag = null; } };
    start();
  }

  /* ======================= CỜ CARO ======================= */
  function caro(back) {
    shell('Cờ caro', 'Bạn (X xanh) đi trước · 5 quân liền hàng là thắng', 'Bấm vào ô để đánh. Máy cầm O cam, vừa công vừa thủ.');
    const N = 13, S = 44, PAD = 14, C = canvas(N * S + PAD * 2, N * S + PAD * 2), x = C.x; let bd, over, last, moves;
    const in_ = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
    const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
    const line = (i, j, p) => { for (const [a, b] of DIRS) { let c = 1, cells = [[i, j]]; for (const s of [1, -1]) { let k = 1; while (in_(i + a * k * s, j + b * k * s) && bd[i + a * k * s][j + b * k * s] === p) { cells.push([i + a * k * s, j + b * k * s]); c++; k++; } } if (c >= 5) return cells; } return null; };
    const evalCell = (i, j, p) => { let tot = 0; for (const [a, b] of DIRS) { let c = 1, open = 0; for (const s of [1, -1]) { let k = 1; while (in_(i + a * k * s, j + b * k * s) && bd[i + a * k * s][j + b * k * s] === p) { c++; k++; } if (in_(i + a * k * s, j + b * k * s) && !bd[i + a * k * s][j + b * k * s]) open++; }
      tot += c >= 5 ? 1e6 : c === 4 ? (open === 2 ? 1e5 : open ? 2e4 : 0) : c === 3 ? (open === 2 ? 6e3 : open ? 600 : 0) : c === 2 ? (open === 2 ? 300 : open ? 40 : 0) : (open === 2 ? 12 : open ? 3 : 0); } return tot; };
    const aiMove = () => { let best = -1, bi = 6, bj = 6; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (bd[i][j]) continue; let near = false; for (let a = -2; a <= 2 && !near; a++) for (let b = -2; b <= 2; b++) if (in_(i + a, j + b) && bd[i + a][j + b]) { near = true; break; } if (!near) continue;
      const v = evalCell(i, j, 'o') * 1.15 + evalCell(i, j, 'x') + Math.random(); if (v > best) { best = v; bi = i; bj = j; } } return [bi, bj]; };
    const draw = (win) => { x.fillStyle = '#F3E3C3'; x.fillRect(0, 0, C.W, C.H); x.strokeStyle = '#b8956a'; x.lineWidth = 1.2; for (let i = 0; i <= N; i++) { x.beginPath(); x.moveTo(PAD, PAD + i * S); x.lineTo(PAD + N * S, PAD + i * S); x.stroke(); x.beginPath(); x.moveTo(PAD + i * S, PAD); x.lineTo(PAD + i * S, PAD + N * S); x.stroke(); }
      if (last) { x.fillStyle = 'rgba(232,146,10,.18)'; x.fillRect(PAD + last[0] * S, PAD + last[1] * S, S, S); }
      if (win) { x.fillStyle = 'rgba(95,224,162,.4)'; win.forEach(([i, j]) => x.fillRect(PAD + i * S, PAD + j * S, S, S)); }
      x.lineCap = 'round'; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const v = bd[i][j]; if (!v) continue; const cx = PAD + i * S + S / 2, cy = PAD + j * S + S / 2; x.lineWidth = 5;
        if (v === 'x') { x.strokeStyle = G.green2; x.beginPath(); x.moveTo(cx - 12, cy - 12); x.lineTo(cx + 12, cy + 12); x.moveTo(cx + 12, cy - 12); x.lineTo(cx - 12, cy + 12); x.stroke(); } else { x.strokeStyle = G.orange; x.beginPath(); x.arc(cx, cy, 13, 0, 7); x.stroke(); } } };
    const finish = (win, who2) => { over = true; draw(win); const n = who2 === 'x' ? addWin('caro') : (bestOf('caro') || 0); const srv = report('caro', { thang: who2 === 'x' }); setTimeout(() => result(who2 === 'x' ? 'Bạn thắng!' : who2 === 'o' ? 'Máy thắng' : 'Hòa', [[`Sau ${moves} nước`], [`Số ván đã thắng máy (máy này): ${n}`, 'rec']], start, back, srv, 'caro'), 500); };
    const start = () => { bd = Array.from({ length: N }, () => Array(N).fill(null)); over = false; last = null; moves = 0; setScore('Lượt của bạn'); draw(); };
    game = { down: (P) => { if (over) return; const i = Math.floor((P.x - PAD) / S), j = Math.floor((P.y - PAD) / S); if (!in_(i, j) || bd[i][j]) return; bd[i][j] = 'x'; moves++; last = [i, j]; beep(500, .04); let w = line(i, j, 'x'); if (w) return finish(w, 'x');
      setScore('Máy đang nghĩ…'); draw(); over = true; setTimeout(() => { over = false; const [a, b] = aiMove(); bd[a][b] = 'o'; last = [a, b]; beep(380, .04); w = line(a, b, 'o'); if (w) return finish(w, 'o'); if (moves >= N * N / 2) return finish(null, '-'); setScore('Lượt của bạn'); draw(); }, 260); } };
    start();
  }

  /* ======================= LẬT THẺ TRÍ NHỚ ======================= */
  function memory(back) {
    shell('Lật thẻ trí nhớ', 'Tìm 8 cặp thẻ sản phẩm bảo hiểm · càng ít lượt càng giỏi', 'Bấm để lật 2 thẻ. Trùng nhau thì giữ lại.');
    const ITEMS = [['🚗', 'Ô tô'], ['🛵', 'Xe máy'], ['🏠', 'Nhà ở'], ['❤️', 'Sức khỏe'], ['✈️', 'Du lịch'], ['🚢', 'Hàng hải'], ['🔥', 'Cháy nổ'], ['🏗️', 'Công trình']];
    const C = canvas(600, 620), x = C.x, COLS = 4, CW = 132, CH = 132, GX = 12, OX = (600 - COLS * CW - (COLS - 1) * GX) / 2, OY = 20;
    let cards, open, lock, moves, found, t0, stop;
    const start = () => { const deck = ITEMS.concat(ITEMS).map((v, i) => ({ v, id: i % 8, up: false, done: false, flip: 0 })); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      cards = deck; open = []; lock = false; moves = 0; found = 0; t0 = performance.now(); setScore('0 lượt'); if (stop) stop();
      stop = loop((dt) => { cards.forEach((c) => { c.flip += ((c.up || c.done ? 1 : 0) - c.flip) * Math.min(1, dt * 12); }); draw(); }); };
    const draw = () => { x.fillStyle = '#FFF8E7'; x.fillRect(0, 0, C.W, C.H); cards.forEach((c, i) => { const X = OX + (i % COLS) * (CW + GX), Y = OY + Math.floor(i / COLS) * (CH + GX); const k = Math.abs(c.flip - .5) * 2, w = CW * Math.max(.04, k), front = c.flip > .5;
      x.save(); x.translate(X + CW / 2, Y + CH / 2); rr(x, -w / 2, -CH / 2, w, CH, 14); x.fillStyle = front ? (c.done ? '#E7F8F0' : '#fff') : G.green; x.fill(); x.strokeStyle = front ? (c.done ? G.mint : '#F2D9A6') : G.green2; x.lineWidth = 3; x.stroke();
      if (k > .3) { x.scale(Math.max(.04, k), 1); x.textAlign = 'center'; if (front) { x.fillStyle = '#222'; x.font = `56px ${FONT}`; x.fillText(c.v[0], 0, 10); x.fillStyle = G.green; x.font = `700 16px ${FONT}`; x.fillText(c.v[1], 0, 46); } else { x.fillStyle = G.amber; x.font = `900 30px ${FONT}`; x.fillText('DBV', 0, 10); } }
      x.restore(); }); x.fillStyle = '#4A5568'; x.font = `600 15px ${FONT}`; x.textAlign = 'center'; x.fillText(`Đã tìm ${found}/8 cặp`, C.W / 2, C.H - 14); };
    game = { stop: () => stop && stop(), down: (P) => { if (lock) return; const i = Math.floor((P.x - OX) / (CW + GX)) + Math.floor((P.y - OY) / (CH + GX)) * COLS; const cxp = (P.x - OX) % (CW + GX), cyp = (P.y - OY) % (CH + GX);
      if (P.x < OX || P.y < OY || cxp > CW || cyp > CH || i < 0 || i >= cards.length) return; const c = cards[i]; if (c.up || c.done) return; c.up = true; open.push(c); beep(600, .03, 'sine');
      if (open.length === 2) { moves++; setScore(`${moves} lượt`); lock = true; const [a, b] = open; setTimeout(() => { if (a.id === b.id) { a.done = b.done = true; found++; beep(900, .1, 'sine'); } else { a.up = b.up = false; } open = []; lock = false;
        if (found === 8) { const s = Math.round((performance.now() - t0) / 1000); const rec = saveBest('latthe', moves, true); const srv = report('latthe', { diem: moves }); setTimeout(() => result('Hoàn thành!', [[`${moves} lượt · ${s} giây`], [rec ? 'Kỷ lục mới trên máy này: ít lượt nhất!' : `Kỷ lục trên máy này: ${bestOf('latthe')} lượt`, 'rec']], start, back, srv, 'latthe'), 400); } }, a.id === b.id ? 300 : 750); } } };
    start();
  }

  /* ======================= ĐUA XE NÉ KẸT XE ======================= */
  function racer(back) {
    shell('Đua xe né kẹt xe', 'DBV Arcade · né xe, nhặt khiên bảo hiểm (+50)', 'Bấm nửa trái/phải màn hình hoặc <kbd>←</kbd> <kbd>→</kbd> để đổi làn. Có khiên thì được đỡ 1 lần va chạm.');
    const C = canvas(480, 760), x = C.x, W = 480, H = 760, LANES = 3, LW = 120, RX = (W - LANES * LW) / 2;
    let lane, px, obs, spd, dist, score, shield, spawn, stop, over, scroll;
    const laneX = (l) => RX + LW * l + LW / 2;
    const car = (X, Y, col, me) => { x.fillStyle = 'rgba(0,0,0,.3)'; rr(x, X - 30, Y - 48, 64, 100, 14); x.fill(); x.fillStyle = col; rr(x, X - 32, Y - 52, 64, 104, 14); x.fill(); x.fillStyle = '#1b2a3a'; rr(x, X - 24, Y - 34, 48, 26, 6); x.fill(); rr(x, X - 24, Y + 14, 48, 22, 6); x.fill();
      x.fillStyle = me ? '#FFE2A8' : '#ffdede'; x.fillRect(X - 26, Y - 54, 12, 5); x.fillRect(X + 14, Y - 54, 12, 5); if (me) { x.fillStyle = '#fff'; x.font = `900 14px ${FONT}`; x.textAlign = 'center'; x.fillText('DBV', X, Y + 6); } };
    const start = () => { lane = 1; px = laneX(1); obs = []; spd = 320; dist = 0; score = 0; shield = 0; spawn = .6; over = false; scroll = 0; if (stop) stop();
      stop = loop((dt) => { if (over) return; spd += dt * 9; dist += spd * dt; scroll = (scroll + spd * dt) % 80; px += (laneX(lane) - px) * Math.min(1, dt * 14); spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(.38, 1.1 - spd / 1400) * (.7 + Math.random() * .6); const l = Math.floor(Math.random() * LANES); const coin = Math.random() < .18; obs.push({ l, y: -60, coin, col: ['#C8102E', '#1554F0', '#F6C344', '#7d8b86', '#E8920A'][Math.floor(Math.random() * 5)], v: coin ? 0 : 40 + Math.random() * 80 }); }
        obs.forEach((o) => { o.y += (spd - o.v) * dt; }); obs = obs.filter((o) => o.y < H + 80 && !o.gone);
        obs.forEach((o) => { if (Math.abs(laneX(o.l) - px) < 50 && Math.abs(o.y - (H - 120)) < (o.coin ? 50 : 92)) { if (o.coin) { o.gone = true; score += 50; shield = 1; beep(1000, .08, 'sine'); } else if (shield) { o.gone = true; shield = 0; beep(240, .15); } else { over = true; beep(110, .4, 'sawtooth', .08); } } });
        const total = Math.floor(dist / 10) + score; setScore(`${total} điểm${shield ? ' · 🛡' : ''}`);
        x.fillStyle = '#1d6b3f'; x.fillRect(0, 0, W, H); x.fillStyle = '#2b2f36'; x.fillRect(RX - 10, 0, LANES * LW + 20, H); x.fillStyle = '#fff'; x.fillRect(RX - 10, 0, 6, H); x.fillRect(RX + LANES * LW + 4, 0, 6, H);
        x.fillStyle = 'rgba(255,255,255,.7)'; for (let l = 1; l < LANES; l++) for (let y = -80 + scroll; y < H; y += 80) x.fillRect(RX + l * LW - 3, y, 6, 40);
        x.fillStyle = '#145a34'; for (let y = -80 + scroll; y < H; y += 160) { x.beginPath(); x.arc(RX / 2 - 6, y, 16, 0, 7); x.fill(); x.beginPath(); x.arc(W - RX / 2 + 6, y + 80, 16, 0, 7); x.fill(); }
        obs.forEach((o) => { if (o.coin) { x.fillStyle = G.amber; x.beginPath(); x.moveTo(laneX(o.l), o.y - 24); x.lineTo(laneX(o.l) + 22, o.y - 14); x.lineTo(laneX(o.l) + 18, o.y + 12); x.lineTo(laneX(o.l), o.y + 26); x.lineTo(laneX(o.l) - 18, o.y + 12); x.lineTo(laneX(o.l) - 22, o.y - 14); x.closePath(); x.fill(); x.fillStyle = G.green; x.font = `900 13px ${FONT}`; x.textAlign = 'center'; x.fillText('BH', laneX(o.l), o.y + 6); } else car(laneX(o.l), o.y, o.col, false); });
        car(px, H - 120, G.green2, true); if (shield) { x.strokeStyle = 'rgba(255,181,71,.8)'; x.lineWidth = 4; x.beginPath(); x.arc(px, H - 120, 66, 0, 7); x.stroke(); }
        if (over) { stop(); const rec = saveBest('duaxe', total); const srv = report('duaxe', { diem: total }); setTimeout(() => result('Va chạm rồi!', [[`${who()} đạt ${total} điểm`], [rec ? 'Kỷ lục mới trên máy này!' : `Kỷ lục trên máy này: ${bestOf('duaxe')} điểm`, 'rec']], start, back, srv, 'duaxe'), 350); } }); };
    game = { stop: () => stop && stop(), key: (k) => { if (k === 'ArrowLeft' || k === 'a') lane = Math.max(0, lane - 1); if (k === 'ArrowRight' || k === 'd') lane = Math.min(LANES - 1, lane + 1); },
      down: (P) => { lane = P.x < W / 2 ? Math.max(0, lane - 1) : Math.min(LANES - 1, lane + 1); } };
    start();
  }

  /* ======================= RẮN SĂN MỒI ======================= */
  function snake(back) {
    shell('Rắn săn mồi', 'DBV Arcade · ăn hồ sơ để dài ra, đừng cắn vào mình', 'Phím mũi tên hoặc <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>; trên điện thoại vuốt theo hướng muốn đi.');
    const N = 20, S = 28, C = canvas(N * S, N * S), x = C.x; let sn, dir, nd, food, acc, tick, stop, score, over;
    const place = () => { do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (sn.some((p) => p[0] === food[0] && p[1] === food[1])); };
    const turn = (d) => { if (d[0] === -dir[0] && d[1] === -dir[1]) return; nd = d; };
    const start = () => { sn = [[8, 10], [7, 10], [6, 10]]; dir = [1, 0]; nd = dir; acc = 0; tick = .13; score = 0; over = false; place(); setScore('0 điểm'); if (stop) stop();
      stop = loop((dt) => { if (over) return; acc += dt; while (acc >= tick) { acc -= tick; dir = nd; const h = [sn[0][0] + dir[0], sn[0][1] + dir[1]];
          if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || sn.some((p) => p[0] === h[0] && p[1] === h[1])) { over = true; beep(110, .4, 'sawtooth', .08); break; }
          sn.unshift(h); if (h[0] === food[0] && h[1] === food[1]) { score += 10; tick = Math.max(.065, tick - .003); beep(880, .06, 'sine'); place(); setScore(`${score} điểm`); } else sn.pop(); }
        x.fillStyle = '#120B2E'; x.fillRect(0, 0, C.W, C.H); x.fillStyle = 'rgba(255,90,200,.07)'; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i + j) % 2) x.fillRect(i * S, j * S, S, S);
        x.fillStyle = G.amber; rr(x, food[0] * S + 5, food[1] * S + 3, S - 10, S - 6, 3); x.fill(); x.fillStyle = '#fff'; x.fillRect(food[0] * S + 9, food[1] * S + 9, S - 18, 2); x.fillRect(food[0] * S + 9, food[1] * S + 14, S - 18, 2);
        sn.forEach((p, i) => { x.fillStyle = i ? (i % 2 ? '#5FE0A2' : '#3fc487') : '#C9F5DD'; rr(x, p[0] * S + 2, p[1] * S + 2, S - 4, S - 4, 7); x.fill(); });
        const h0 = sn[0]; x.fillStyle = '#120B2E'; x.beginPath(); x.arc(h0[0] * S + S / 2 + dir[0] * 5 - dir[1] * 5, h0[1] * S + S / 2 + dir[1] * 5 - dir[0] * 5, 3, 0, 7); x.fill(); x.beginPath(); x.arc(h0[0] * S + S / 2 + dir[0] * 5 + dir[1] * 5, h0[1] * S + S / 2 + dir[1] * 5 + dir[0] * 5, 3, 0, 7); x.fill();
        if (over) { stop(); const rec = saveBest('ran', score); const srv = report('ran', { diem: score }); setTimeout(() => result('Rắn cắn trúng rồi!', [[`${who()} được ${score} điểm · dài ${sn.length}`], [rec ? 'Kỷ lục mới trên máy này!' : `Kỷ lục trên máy này: ${bestOf('ran')} điểm`, 'rec']], start, back, srv, 'ran'), 350); } }); };
    game = { stop: () => stop && stop(), key: (k) => { const m = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] }[k]; if (m) turn(m); },
      up: (P) => { const dx = P.x - P.sx, dy = P.y - P.sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); } };
    start();
  }

  /* ======================= MENU: BOARD GAME, CONSOLE ======================= */
  function menu(title, sub, list, dark) { shell(title, sub, online() ? 'Chọn một trò để bắt đầu. Thành tích của anh/chị được ghi lên Bảng thi đua chung của cả phòng.' : 'Chọn một trò để bắt đầu. Đang chạy thử nên kỷ lục chỉ lưu trên máy này.'); setScore(who());
    const m = document.createElement('div'); m.className = 'tc-menu'; list.forEach(([ic, name, desc, rec, fn]) => { const b = document.createElement('button'); b.className = 'tc-pick' + (dark ? '' : ' lt'); b.innerHTML = '<i></i><b></b><span></span><em></em>';
      b.querySelector('i').textContent = ic; b.querySelector('b').textContent = name; b.querySelector('span').textContent = desc; b.querySelector('em').textContent = rec; b.onclick = fn; m.appendChild(b); });
    body().innerHTML = ''; body().appendChild(m);
    if (online()) bxh().then((j) => { if (!j) return; m.querySelectorAll('.tc-pick').forEach((b, i) => { const id = list[i][5]; const B = id && j.bang[id]; if (!B) return; const top = B.tuan[0]; const e = b.querySelector('em'); e.textContent = top ? `Dẫn đầu tuần: ${top.ten} · ${top.diem} ${B.dv}` : 'Tuần này chưa ai chơi — giành ngôi đầu!'; }); }); }
  const recTxt = (id, unit, low) => { const v = bestOf(id); return v == null ? 'Chưa có kỷ lục' : (low ? `Kỷ lục: ${v} ${unit}` : `${id === 'caro' ? 'Đã thắng' : 'Kỷ lục'}: ${v} ${unit}`); };
  function boardMenu() { menu('Bàn board game', 'Cờ caro · lật thẻ trí nhớ', [['⭕', 'Cờ caro', 'Đấu với máy trên bàn 13×13, 5 quân liền là thắng.', recTxt('caro', 'ván'), () => caro(boardMenu), 'caro'],
    ['🃏', 'Lật thẻ trí nhớ', 'Tìm 8 cặp thẻ sản phẩm bảo hiểm DBV.', recTxt('latthe', 'lượt', true), () => memory(boardMenu), 'latthe']], false); }
  function consoleMenu() { menu('DBV Arcade · Góc console', 'Cầm tay cầm lên và chọn băng game', [['🏎️', 'Đua xe né kẹt xe', 'Đổi làn tránh xe, nhặt khiên bảo hiểm để được đỡ một lần.', recTxt('duaxe', 'điểm'), () => racer(consoleMenu), 'duaxe'],
    ['🐍', 'Rắn săn mồi', 'Ăn hồ sơ để dài ra, càng dài càng nhanh.', recTxt('ran', 'điểm'), () => snake(consoleMenu), 'ran']], true); }

  function mo(id, o) { opts = Object.assign({}, opts, o || {}); cur = { boardgame: 'caro', console: 'duaxe', thidua: (o && o.tro) || 'bongro' }[id] || id;
    const f = { bongban: pingpong, bilac: foosball, bongro: basketball, boardgame: boardMenu, console: consoleMenu, caro: () => caro(boardMenu), latthe: () => memory(boardMenu), duaxe: () => racer(consoleMenu), ran: () => snake(consoleMenu), thidua: () => board(o && o.tro) }[id];
    if (f) f(); else if (opts.toast) opts.toast('Trò này đang được dựng'); }
  window.TROCHOI = { mo, dong: () => close(), bxh: (o) => { opts = Object.assign({}, opts, o || {}); return bxh(true); } };
})();
