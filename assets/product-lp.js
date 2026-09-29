/* ══════════════════════════════════════════════════════════════════════════
   DBV247 — Trang sản phẩm e-commerce (product-lp)
   1. Máy tính phí nhanh (.plp-calc)      — tính tổng, cập nhật nút mua + thanh dính
   2. Nút có data-plp-preset              — chọn sẵn loại xe/thời hạn trong công cụ
                                            cấp đơn dùng chung (window.CD) rồi cuộn tới
   3. Thanh mua dính đáy (.plp-sticky)    — hiện khi đã cuộn qua hộp giá ở hero,
                                            ẩn khi công cụ cấp đơn / CTA cuối đang hiện
   Không phụ thuộc thư viện ngoài. Thiếu khối nào thì phần tương ứng tự bỏ qua.
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function vnd(n){ return (Math.round(n) || 0).toLocaleString('vi-VN') + 'đ'; }
  function parse(s){ try{ return JSON.parse(s); }catch(e){ return null; } }
  function merge(a, b){ var o = {}, k; for(k in a) o[k] = a[k]; for(k in b) o[k] = b[k]; return o; }

  var sticky = $('.plp-sticky');

  /* ── 2. Chọn sẵn trong công cụ cấp đơn ─────────────────────────────── */
  function applyPreset(p){
    var CD = window.CD;
    if(!p || !CD || !document.getElementById('cap-don')) return;
    /* khách đã sang bước 2+ thì không đè lên dữ liệu đang nhập */
    var b1 = document.getElementById('cdp1');
    if(b1 && !b1.classList.contains('on')) return;
    try{
      var oto = document.getElementById('cdvt-oto');
      if(oto && !oto.classList.contains('on')) CD.pickVeh('oto');
      var g = document.getElementById('cdf-group');
      if(p.nhom && g){
        if(g.value !== p.nhom){ g.value = p.nhom; CD.onGroup(); }
        var sub = document.getElementById('cdf-sub');
        if(p.chi_tiet && sub){ sub.value = p.chi_tiet; }
        var seats = document.getElementById('cdf-seats');
        if(p.seats && seats){ seats.value = p.seats; }
        CD.calc();
      }
      if(p.years){
        var chip = $('#cdchips .chip[data-y="' + p.years + '"]');
        if(chip) CD.pickTerm(chip);
      }
    }catch(e){ /* công cụ cấp đơn đổi cấu trúc thì vẫn cuộn tới được */ }
  }

  document.addEventListener('click', function(ev){
    var a = ev.target.closest && ev.target.closest('[data-plp-preset]');
    if(!a) return;
    var href = a.getAttribute('href') || '';
    if(href.charAt(0) !== '#') return;
    var target = document.querySelector(href);
    if(!target) return;
    ev.preventDefault();
    var preset = parse(a.getAttribute('data-plp-preset'));
    applyPreset(preset);
    if(!a.hasAttribute('data-plp-calc-cta')) syncCalc(preset);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if(history.replaceState) history.replaceState(null, '', href);
  });

  function pick(o){
    $$('.plp-opt', o.parentNode).forEach(function(x){
      x.classList.toggle('on', x === o);
      x.setAttribute('aria-checked', x === o ? 'true' : 'false');
    });
  }
  /* nút mua ở chỗ khác (gói thời hạn, hero) → máy tính và thanh dính đi theo */
  function syncCalc(p){
    if(!p) return;
    $$('.plp-calc').forEach(function(calc){
      $$('.plp-calc-g[data-key="base"] .plp-opt', calc).forEach(function(o){
        var op = parse(o.getAttribute('data-preset')) || {};
        if(op.nhom === p.nhom && op.chi_tiet === p.chi_tiet) pick(o);
      });
      if(p.years){
        var y = $('.plp-calc-g[data-key="years"] .plp-opt[data-value="' + p.years + '"]', calc);
        if(y) pick(y);
      }
      if(calc._plpRender) calc._plpRender();
    });
  }

  /* ── 1. Máy tính phí nhanh ──────────────────────────────────────────── */
  $$('.plp-calc').forEach(function(calc){
    var vat = parseFloat(calc.getAttribute('data-vat')) || 0;
    var cta = $('[data-plp-calc-cta]', calc);

    function selected(key){
      return $('.plp-calc-g[data-key="' + key + '"] .plp-opt.on', calc);
    }
    function out(name, v){ var el = $('[data-out="' + name + '"]', calc); if(el) el.textContent = v; }

    function render(){
      var bOpt = selected('base'), yOpt = selected('years');
      var base = bOpt ? parseFloat(bOpt.getAttribute('data-value')) : 0;
      var years = yOpt ? parseInt(yOpt.getAttribute('data-value'), 10) : 1;
      var goc = base * years, thue = Math.round(goc * vat), tong = goc + thue;
      out('total', vnd(tong));
      out('base-lbl', 'Phí bảo hiểm (' + vnd(base) + ' × ' + years + ' năm)');
      out('base', vnd(goc));
      out('vat', vnd(thue));
      out('day', '≈ ' + vnd(tong / (365 * years)));

      var preset = merge(parse(bOpt && bOpt.getAttribute('data-preset')) || {}, { years: years });
      if(cta) cta.setAttribute('data-plp-preset', JSON.stringify(preset));

      /* thanh dính đáy đi theo lựa chọn của khách */
      if(sticky){
        var lb = $('.plp-sticky-p small', sticky), pr = $('.plp-sticky-p b', sticky), btn = $('[data-plp-preset]', sticky);
        if(lb && bOpt) lb.textContent = ($('b', bOpt).textContent) + ' · ' + years + ' năm';
        if(pr) pr.textContent = vnd(tong);
        if(btn) btn.setAttribute('data-plp-preset', JSON.stringify(preset));
      }
    }

    calc.addEventListener('click', function(ev){
      var o = ev.target.closest('.plp-opt');
      if(!o || !calc.contains(o)) return;
      pick(o);
      render();
    });
    /* phím mũi tên trong nhóm radio */
    calc.addEventListener('keydown', function(ev){
      var o = ev.target.closest('.plp-opt');
      if(!o) return;
      var k = ev.key, sib = null;
      if(k === 'ArrowRight' || k === 'ArrowDown') sib = o.nextElementSibling;
      if(k === 'ArrowLeft' || k === 'ArrowUp') sib = o.previousElementSibling;
      if(sib){ ev.preventDefault(); sib.focus(); sib.click(); }
    });
    calc._plpRender = render;
    render();
  });

  /* ── 3. Thanh mua dính đáy ──────────────────────────────────────────── */
  if(sticky && 'IntersectionObserver' in window){
    var sels = (sticky.getAttribute('data-hide') || '').split(',').filter(Boolean);
    var watched = [];
    sels.forEach(function(s){ $$(s.trim()).forEach(function(el){ watched.push(el); }); });
    var hero = $('.plp-hero-buy') || $('.plp-s-hero .plp-lead') || $('.plp-s-product .plp-lead');
    var seen = {}, heroPassed = false;

    function update(){
      var anyVisible = false;
      for(var k in seen) if(seen[k]) anyVisible = true;
      var dangGo = sticky.contains(document.activeElement);   /* đang gõ SĐT trên thanh thì giữ nguyên */
      /* thanh [SĐT][Đăng ký mua] kiểu sàn TMĐT: luôn có khi không thấy form nào trên màn hình */
      var laThanhForm = sticky.classList.contains('plp-sticky-bar');
      var dieuKien = laThanhForm ? (!anyVisible && !seen['hero']) : (heroPassed && !anyVisible);
      var show = !sticky.classList.contains('plp-sticky-off') && (dangGo || dieuKien);
      document.body.classList.toggle('plp-bar-on', show && sticky.classList.contains('plp-sticky-bar'));
      sticky.classList.toggle('show', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      var b = $('.plp-btn', sticky); if(b) b.setAttribute('tabindex', show ? '0' : '-1');
      /* thanh [SĐT][Đăng ký mua] nằm TRÊN thanh tab của site, không che nó;
         thanh kiểu cũ (một nút) thì vẫn phủ lên thanh tab như trước */
      var mob = $('.mob-bar');
      if(mob) mob.classList.toggle('plp-covered', show && !sticky.classList.contains('plp-sticky-bar'));
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var i = watched.indexOf(en.target);
        if(en.target === hero){
          heroPassed = !en.isIntersecting && en.boundingClientRect.top < 0;
          seen['hero'] = en.isIntersecting;
        }else if(i > -1){
          seen[i] = en.isIntersecting;
        }
      });
      update();
    }, { threshold: 0 });
    watched.forEach(function(el){ io.observe(el); });
    sticky.addEventListener('focusin', update);
    sticky.addEventListener('focusout', function(){ setTimeout(update, 50); });
    if(hero && watched.indexOf(hero) < 0) io.observe(hero);
  }



  /* ── 5. Tuỳ chọn loại xe (Biển trắng / Biển vàng / Taxi) ───────────────
     Đổi giá ở mọi chỗ có data-v-price / data-v-note / data-v-label, và gửi
     kèm loại xe đã chọn trong lead để nhân viên gọi lại đúng mức phí. */
  var bienThe = {};
  function chonBienThe(b){
    if(!b) return;
    $$('.plp-var:not(.plp-dim)').forEach(function(x){
      var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    bienThe = { label: b.getAttribute('data-label'), price: parseFloat(b.getAttribute('data-price')) || 0, note: b.getAttribute('data-note') || '' };
    $$('[data-v-price]').forEach(function(el){ el.textContent = vnd(bienThe.price); });
    $$('[data-v-note]').forEach(function(el){ el.textContent = bienThe.note; });
    $$('[data-v-label]').forEach(function(el){ el.textContent = bienThe.label; });
  }
  /* ── 5b. Tuỳ chọn hai chiều (Loại biển × Số chỗ) ──────────────────────
     Nút .plp-dim chỉ là bộ chọn; giá thật nằm ở các .plp-var ẩn trong
     .plp-var-src, mỗi nút mang data-dims = {"bien":"Biển vàng","cho":"16 chỗ"}. */
  var chieu = {};
  function dimsOf(b){ return parse(b.getAttribute('data-dims')) || {}; }
  function timTheoChieu(combo){
    return $$('.plp-var-src .plp-var').filter(function(b){
      var d = dimsOf(b);
      return Object.keys(combo).every(function(k){ return d[k] === combo[k]; });
    })[0] || null;
  }
  function veChieu(){
    $$('.plp-dim').forEach(function(c){
      var k = c.getAttribute('data-dim'), v = c.getAttribute('data-val');
      var on = chieu[k] === v;
      c.classList.toggle('on', on); c.setAttribute('aria-checked', on ? 'true' : 'false');
      var combo = merge(chieu, {}); combo[k] = v;
      var m = timTheoChieu(combo);
      c.disabled = !m;
      var pEl = c.querySelector('.plp-var-p');
      if(pEl) pEl.textContent = m ? vnd(parseFloat(m.getAttribute('data-price'))) : '—';
    });
    var m = timTheoChieu(chieu);
    if(m) chonBienThe(m);
  }
  function chonChieu(c){
    if(c.disabled) return;
    var k = c.getAttribute('data-dim'), v = c.getAttribute('data-val');
    var combo = merge(chieu, {}); combo[k] = v;
    var m = timTheoChieu(combo);
    if(!m){ var o = {}; o[k] = v; m = timTheoChieu(o); }
    if(m){ chieu = dimsOf(m); veChieu(); }
  }
  if($('.plp-var-src')){
    var v0 = $('.plp-var-src .plp-var.on') || $('.plp-var-src .plp-var');
    if(v0) chieu = dimsOf(v0);
  }

  chonBienThe($('.plp-var.on:not(.plp-dim)') || $('.plp-var:not(.plp-dim)'));
  if($('.plp-var-src')) veChieu();
  document.addEventListener('click', function(ev){
    var b = ev.target.closest && ev.target.closest('.plp-var');
    if(!b) return;
    if(b.classList.contains('plp-dim')) chonChieu(b); else chonBienThe(b);
  });
  document.addEventListener('keydown', function(ev){
    var b = ev.target.closest && ev.target.closest('.plp-var');
    if(!b) return;
    if(b.classList.contains('plp-dim')){
      var nx = null;
      if(ev.key === 'ArrowRight' || ev.key === 'ArrowDown') nx = b.nextElementSibling;
      if(ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') nx = b.previousElementSibling;
      while(nx && nx.disabled) nx = (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ? nx.nextElementSibling : nx.previousElementSibling;
      if(nx){ ev.preventDefault(); nx.focus(); chonChieu(nx); }
      return;
    }
    var sib = null;
    if(ev.key === 'ArrowRight' || ev.key === 'ArrowDown') sib = b.nextElementSibling;
    if(ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') sib = b.previousElementSibling;
    if(sib){ ev.preventDefault(); sib.focus(); chonBienThe(sib); }
  });

  /* ── 6. Bộ ảnh sản phẩm: vuốt ngang (mobile), bấm ảnh nhỏ (desktop) ── */
  $$('.plp-gal').forEach(function(g){
    var track = $('.plp-gal-main', g), th = $$('.plp-gal-th', g), dem = $('.plp-gal-count b', g);
    if(!track) return;
    function danhDau(i){
      th.forEach(function(t, k){ t.classList.toggle('on', k === i); });
      if(dem) dem.textContent = i + 1;
    }
    th.forEach(function(t, i){
      t.addEventListener('click', function(){
        track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
        danhDau(i);
      });
    });
    var hen = null;
    track.addEventListener('scroll', function(){
      clearTimeout(hen);
      hen = setTimeout(function(){ danhDau(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))); }, 60);
    }, { passive: true });
  });

  /* ── 4. Form để lại số điện thoại ──────────────────────────────────────
     Gửi vào Netlify Forms (form đã khai ở index.html). dbv-tracking.js bọc
     window.fetch nên tự gắn nguồn khách, mã CTV và bằng chứng đồng ý. */
  function chuanHoaSdt(v){
    var d = String(v || '').replace(/[^\d+]/g, '');
    if(d.indexOf('+84') === 0) d = '0' + d.slice(3);
    else if(d.indexOf('84') === 0 && d.length === 11) d = '0' + d.slice(2);
    return d.replace(/\D/g, '');
  }
  function sdtHopLe(d){ return /^(0[35789]\d{8}|02\d{9})$/.test(d); }
  function hienSdt(d){ return d.length === 10 ? d.slice(0,4) + ' ' + d.slice(4,7) + ' ' + d.slice(7) : d; }

  var daDangKy = null;
  try{ daDangKy = sessionStorage.getItem('plp_da_dang_ky'); }catch(e){}

  function xongTatCa(sdt){
    $$('[data-plp-lead]').forEach(function(f){
      f.classList.add('done');
      var ok = $('.plp-lead-ok', f); if(!ok) return;
      var p = $('.plp-lead-ok-p', ok);
      if(p) p.textContent = (f.getAttribute('data-ok') || '').replace('{sdt}', hienSdt(sdt))
                              .replace('{loai}', bienThe.label ? bienThe.label + ' · ' + vnd(bienThe.price) + '/năm' : 'TNDS');
      ok.hidden = false;
    });
    if(sticky){ sticky.classList.add('plp-sticky-off'); sticky.classList.remove('show'); }
  }
  if(daDangKy) xongTatCa(daDangKy);

  $$('[data-plp-lead]').forEach(function(f){
    var inp = $('.plp-lead-in', f), btn = $('.plp-lead-btn', f), err = $('.plp-lead-err', f);
    function loi(msg){
      err.textContent = msg; err.hidden = !msg;
      inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    inp.addEventListener('input', function(){ if(!err.hidden) loi(''); });
    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      var sdt = chuanHoaSdt(inp.value);
      if(!sdt){ loi('Vui lòng nhập số điện thoại.'); inp.focus(); return; }
      if(!sdtHopLe(sdt)){ loi('Số điện thoại chưa đúng, ví dụ: 0912 345 678.'); inp.focus(); return; }
      loi('');
      var hp = $('.plp-hp', f);
      if(hp && hp.value){ xongTatCa(sdt); return; }          /* bot: giả vờ thành công */
      btn.disabled = true; var nhan = btn.textContent; btn.textContent = 'Đang gửi…';
      var body = new URLSearchParams({
        'form-name': f.getAttribute('data-form'),
        'san-pham': f.getAttribute('data-san-pham') + (bienThe.label ? ' — ' + bienThe.label + ' (' + vnd(bienThe.price) + '/năm)' : ''),
        'loai-xe': bienThe.label || '',
        'nhu-cau': f.getAttribute('data-nhu-cau'),
        'dien-thoai': sdt,
        'trang': location.pathname,
        'nguon': 'Trang ' + (f.getAttribute('data-san-pham') || '') + ' — form ' + (f.getAttribute('data-nguon') || '')
      }).toString();
      window.fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function(r){
          if(!r.ok) throw new Error('HTTP ' + r.status);
          try{ sessionStorage.setItem('plp_da_dang_ky', sdt); }catch(e){}
          xongTatCa(sdt);
          var ok = $('.plp-lead-ok', f); if(ok) ok.focus({ preventScroll: true });
        })
        .catch(function(){
          btn.disabled = false; btn.textContent = nhan;
          loi('Chưa gửi được. Vui lòng thử lại hoặc gọi 0869 656 561.');
        });
    });
  });

  /* Nút trên thanh dính: tới form gần nhất PHÍA DƯỚI (không bắt khách quay lên đầu) */
  document.addEventListener('click', function(ev){
    var b = ev.target.closest && ev.target.closest('[data-plp-focus]');
    if(!b) return;
    var forms = $$('[data-plp-lead]');
    if(!forms.length) return;
    var dich = null;
    for(var i = 0; i < forms.length; i++){
      if(forms[i].getBoundingClientRect().top > 0){ dich = forms[i]; break; }
    }
    dich = dich || forms[forms.length - 1];
    dich.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var inp = $('.plp-lead-in', dich);
    if(inp) setTimeout(function(){ inp.focus({ preventScroll: true }); }, 350);
  });

  /* nút Tư vấn trên thanh dính: dùng bảng liên hệ có sẵn của site, không có thì gọi điện */
  document.addEventListener('click', function(ev){
    var b = ev.target.closest && ev.target.closest('[data-plp-consult]');
    if(!b) return;
    if(typeof window.dbvMoTuVan === 'function') window.dbvMoTuVan();
    else location.href = 'tel:' + (b.getAttribute('data-phone') || '');
  });
})();

/* ── Tab ngang (Quyền lợi · Quy trình bồi thường · Câu hỏi thường gặp) ──
   Mọi tab nằm sẵn trong HTML; ở đây chỉ bật/tắt, hỗ trợ phím mũi tên và
   mở đúng tab khi URL có #faq / #boi-thuong / #quyen-loi. */
(function(){
  'use strict';
  var lists = document.querySelectorAll('.plp-tabs[role="tablist"]');
  Array.prototype.forEach.call(lists, function(list){
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function bat(tab, focus){
      tabs.forEach(function(t){
        var on = t === tab;
        t.classList.toggle('on', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('tabindex', on ? '0' : '-1');
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if(p) p.hidden = !on;
      });
      if(focus) tab.focus();
      /* tab đang chọn luôn nằm trong vùng nhìn khi thanh tab cuộn ngang (mobile) */
      try{ tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }catch(e){}
    }
    tabs.forEach(function(t, i){
      t.addEventListener('click', function(){ bat(t); });
      t.addEventListener('keydown', function(ev){
        var j = null;
        if(ev.key === 'ArrowRight') j = (i + 1) % tabs.length;
        if(ev.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        if(ev.key === 'Home') j = 0;
        if(ev.key === 'End') j = tabs.length - 1;
        if(j !== null){ ev.preventDefault(); bat(tabs[j], true); }
      });
    });
    function theoHash(){
      var h = (location.hash || '').slice(1);
      if(!h) return;
      var t = list.querySelector('[aria-controls="' + h + '"]');
      if(t){ bat(t); var sec = list.closest('section'); if(sec) sec.scrollIntoView({ block: 'start' }); }
    }
    theoHash();
    window.addEventListener('hashchange', theoHash);
  });
})();
