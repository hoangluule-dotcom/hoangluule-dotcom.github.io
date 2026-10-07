/* DBV247 — Bảo hiểm cháy nổ hộ kinh doanh, body v2 (03/10/2026, cập nhật công cụ tính phí 03/10 tối).
   Chọn loại hình từ 8 thẻ → điền sẵn công cụ tính phí; gửi lead Netlify Forms (dbv-tuvan).
   Công cụ tính phí dùng CÙNG cách tính với trang bao-hiem-chay-no (assets/chay-no.js):
   tổng số tiền BH = giá trị xây dựng (khách nhập, hoặc diện tích × 12.000.000 đ/m² — không hiển thị công thức) + tài sản cố định + hàng hoá;
   × tỷ lệ phí theo Phụ lục VI NĐ 105/2025; hiển thị 1 mức phí. Từ 1.000 tỷ → thoả thuận riêng. Chưa gồm VAT 10%. Cập nhật 07/10/2026. */
(function () {
  'use strict';
  var root = document.querySelector('main.hk');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var DATA = {};
  try { DATA = JSON.parse($('hk-data').textContent); } catch (e) { return; }

  var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var fmt = function (n) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n)); };
  var money = function (n) { return fmt(n) + ' đ'; };
  var pct = function (v) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(v) + '%'; };
  var digits = function (el) { var d = (el.value || '').replace(/\D/g, ''); return d ? Number(d) : 0; };

  function goTo(el, focusEl) {
    if (!el) return;
    el.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
    var f = focusEl || el;
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }

  /* ── Liên kết neo trong trang ── */
  root.querySelectorAll('a[data-hk-scroll]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href').slice(1), t = $(id);
      if (!t) return;
      ev.preventDefault();
      var h = t.querySelector('h2');
      if (h && !h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      goTo(t, h);
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });

  /* ── Mở/đóng: điều kiện áp dụng + accordion ── */
  function toggler(btn) {
    btn.addEventListener('click', function () {
      var p = $(btn.getAttribute('aria-controls')), open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (p) p.hidden = open;
    });
  }
  root.querySelectorAll('.hk-cond-btn, .hk-acc-btn').forEach(toggler);

  /* ── Chọn loại hình (8 thẻ ↔ ô "Loại cơ sở") ── */
  var G = DATA.groups, V = DATA.variants;
  var rateSel = $('fire-rate-type'), leadType = $('hk-l-type'), cards = root.querySelectorAll('.hk-type');
  var leadTypeAuto = true, group = '';
  leadType.addEventListener('change', function () { leadTypeAuto = false; });

  function markGroup(g) {
    group = G[g] ? g : '';
    cards.forEach(function (c) { c.classList.toggle('is-selected', !!group && c.getAttribute('data-type') === group); });
    root.querySelectorAll('.hk-pick').forEach(function (b) { b.setAttribute('aria-pressed', String(!!group && b.getAttribute('data-type') === group)); });
    $('hk-chosen-name').textContent = group ? G[group].n : 'chưa chọn loại hình';
    if (group && (leadTypeAuto || !leadType.value)) { leadType.value = group; leadTypeAuto = true; }
  }
  function pickGroup(g) {
    if (!G[g]) return;
    var cur = V[rateSel.value];
    if (!cur || cur.g !== g) rateSel.value = G[g].v[0];   // giữ biến thể đang chọn nếu cùng nhóm
    markGroup(g); onType();
  }
  root.querySelectorAll('.hk-pick').forEach(function (b) {
    b.addEventListener('click', function () {
      pickGroup(b.getAttribute('data-type'));
      goTo($('tinh-phi'), $('hk-h-calc'));
    });
  });

  /* ── Tính phí nhanh — cùng cách tính với trang bao-hiem-chay-no (assets/chay-no.js) ── */
  var UNIT_BUILD = 12000000; // đ/m² — ước tính nội bộ khi khách chưa có giá trị xây dựng (không hiển thị)
  function rateText(r) {
    if (!r) return 'Cần chuyên viên xác định theo hồ sơ';
    if (r.s) return pct(r.s[0]) + '/năm nếu có chữa cháy tự động · ' + pct(r.s[1]) + '/năm nếu không có';
    return r.r[0] === r.r[1] ? pct(r.r[0]) + '/năm' : pct(r.r[0]) + ' – ' + pct(r.r[1]) + '/năm';
  }
  function live(id) {
    var el = $(id);
    el.addEventListener('input', function () { var d = el.value.replace(/\D/g, '').slice(0, 16); el.value = d ? fmt(Number(d)) : ''; update(); });
  }
  ['fire-area', 'fire-bv', 'fire-fixed', 'fire-stock'].forEach(live);
  function onType() {
    var v = V[rateSel.value];
    $('fire-spk-wrap').hidden = !(v && v.r && v.r.s);
    $('fire-rate-hint').textContent = v ? 'Mục ' + v.m + ' · ' + rateText(v.r) : 'Tỷ lệ phí áp dụng theo loại cơ sở bạn chọn.';
    if (v && v.g !== group) markGroup(v.g);
    if (!v) markGroup('');
    update();
  }
  rateSel.addEventListener('change', onType);
  root.querySelectorAll('[name="fire-sprinkler"]').forEach(function (i) { i.addEventListener('change', update); });

  function quote() {
    var v = V[rateSel.value], area = digits($('fire-area')), bv = digits($('fire-bv')), build = bv || area * UNIT_BUILD, est = !bv && build > 0,
        fixed = digits($('fire-fixed')), stock = digits($('fire-stock')), total = build + fixed + stock;
    var q = { v: v, build: build, est: est, fixed: fixed, stock: stock, total: total, area: area, rateTxt: '—', title: '', detail: '', alt: '' };
    if (!v) { q.title = 'Chọn loại cơ sở'; q.detail = 'Chọn loại cơ sở để áp đúng tỷ lệ phí theo biểu phí NĐ 105/2025.'; return q; }
    var rate = null, alt = null, r = v.r, sp = '';
    if (!r) { q.rateTxt = 'Cần chuyên viên xác định theo hồ sơ'; }
    else if (r.s) {
      sp = root.querySelector('[name="fire-sprinkler"]:checked').value;
      rate = sp === 'yes' ? r.s[0] : r.s[1]; if (sp === 'unknown') alt = r.s[0];
      q.rateTxt = pct(rate) + '/năm' + (sp === 'yes' ? ' (có chữa cháy tự động)' : ' (không có chữa cháy tự động)');
    } else { rate = r.r[0]; q.rateTxt = pct(rate) + '/năm'; }
    if (!total) { q.title = 'Nhập diện tích cơ sở'; q.detail = 'Nhập diện tích (hoặc giá trị xây dựng) để tính tổng số tiền bảo hiểm.'; return q; }
    if (total >= 1e12) { q.title = 'Cần đánh giá riêng'; q.detail = 'Tổng số tiền bảo hiểm từ 1.000 tỷ đồng áp dụng cơ chế thoả thuận phí riêng — chuyên viên DBV sẽ tư vấn.'; return q; }
    if (rate === null) { q.title = 'Chuyên viên báo phí'; q.detail = 'Loại cơ sở này chưa có tỷ lệ phí cố định trên công cụ. Gửi thông tin để chuyên viên DBV báo phí theo hồ sơ.'; return q; }
    var a = total * rate / 100;
    q.ok = true;
    q.title = '≈ ' + money(a) + ' / năm';
    q.detail = 'Chưa gồm VAT 10% (≈ ' + money(a * 1.1) + ' đã gồm VAT).' + (est ? ' Giá trị xây dựng đang được ước tính theo diện tích — nhập số liệu thực tế để kết quả sát hơn.' : '');
    if (alt !== null) q.alt = 'Nếu cơ sở có hệ thống chữa cháy tự động, phí còn khoảng ' + money(total * alt / 100) + '/năm.';
    return q;
  }
  function update() {
    var q = quote();
    $('fs-build').textContent = q.build ? money(q.build) + (q.est ? ' (ước tính)' : '') : '—';
    $('fs-fixed').textContent = q.fixed ? money(q.fixed) : '—';
    $('fs-stock').textContent = q.stock ? money(q.stock) : '—';
    $('fs-total').textContent = q.total ? money(q.total) : '—';
    $('fire-rate-val').textContent = q.rateTxt;
    $('fire-estimate').textContent = q.title;
    $('fire-estimate-detail').textContent = q.detail;
    $('fire-estimate-alt').hidden = !q.alt; $('fire-estimate-alt').textContent = q.alt;
    $('hk-l-attach').hidden = !(q.v || q.total);
  }
  function summary() {
    var q = quote(), sp = root.querySelector('[name="fire-sprinkler"]:checked').value;
    return [
      'Loại cơ sở tính phí: ' + (rateSel.value ? rateSel.options[rateSel.selectedIndex].text : 'Chưa chọn'),
      'Diện tích: ' + (q.area ? fmt(q.area) + ' m²' : 'Chưa nhập'),
      'Giá trị xây dựng: ' + (q.build ? money(q.build) + (q.est ? ' (ước tính theo diện tích)' : ' (khách cung cấp)') : '—'),
      'Tài sản cố định: ' + (q.fixed ? money(q.fixed) : 'Không nhập'),
      'Hàng hoá lưu kho: ' + (q.stock ? money(q.stock) : 'Không nhập'),
      'Tổng số tiền bảo hiểm: ' + (q.total ? money(q.total) : '—'),
      (q.v && q.v.r && q.v.r.s) ? 'Chữa cháy tự động: ' + ({ yes: 'Có', no: 'Không', unknown: 'Chưa rõ' }[sp]) : '',
      'Tỷ lệ phí: ' + q.rateTxt,
      'Phí dự kiến: ' + q.title + ' — ' + q.detail + (q.alt ? ' ' + q.alt : '')
    ].filter(Boolean).join('\n');
  }
  function hasCalc() { return !!(rateSel.value || quote().total); }

  /* ── Từ kết quả sang form ── */
  $('hk-to-lead').addEventListener('click', function (ev) {
    ev.preventDefault();
    if (group && (leadTypeAuto || !leadType.value)) leadType.value = group;
    goTo($('tu-van'), $('hk-l-phone'));
  });

  /* ── Form tư vấn: Netlify Forms, form-name dbv-tuvan ──
     dbv-tracking.js tự gắn utm/gclid, mã CTV, dong-y-chinh-sach + thoi-diem-dong-y khi gửi. */
  var form = $('hk-lead'), phone = $('hk-l-phone'), consent = $('hk-l-consent'), status = $('hk-l-status');
  var submitBtn = form.querySelector('[type=submit]'), busy = false;
  phone.addEventListener('input', function () { phone.removeAttribute('aria-invalid'); $('hk-l-phone-err').hidden = true; });
  consent.addEventListener('change', function () { if (consent.checked) $('hk-l-consent-err').hidden = true; });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (busy) return;
    var p = phone.value.replace(/[\s().-]/g, '').replace(/^\+?84/, '0');
    var bad = null;
    if (!/^0[35789]\d{8}$/.test(p) && !/^02\d{9}$/.test(p)) {
      phone.setAttribute('aria-invalid', 'true');
      var pe = $('hk-l-phone-err'); pe.textContent = 'Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 số di động hoặc 11 số cố định).'; pe.hidden = false;
      bad = phone;
    }
    if (!consent.checked) { $('hk-l-consent-err').hidden = false; bad = bad || consent; }
    if (bad) { bad.focus(); return; }
    if (form.elements['bot-field'].value) return;

    var when = new Date().toISOString();
    var q = hasCalc() ? summary() : '';
    var data = new URLSearchParams();
    data.set('form-name', 'dbv-tuvan');
    data.set('san-pham', 'Bảo Hiểm Cháy Nổ Bắt Buộc HKD');
    data.set('ho-ten', $('hk-l-name').value.trim());
    data.set('dien-thoai', p);
    data.set('loai-hinh-kd', leadType.value ? leadType.options[leadType.selectedIndex].text : '');
    var city = $('hk-l-city'); data.set('tinh-thanh', city.value ? city.options[city.selectedIndex].text : '');
    if (q) {
      data.set('ket-qua-tinh-phi', q);
      if (digits($('fire-area'))) data.set('dien-tich', fmt(digits($('fire-area'))) + ' m²');
    }
    data.set('ghi-chu', (q ? 'Đã tính phí dự kiến trên trang (xem ket-qua-tinh-phi). ' : '') +
      'Khách tích đồng ý Chính sách bảo mật và cho phép DBV liên hệ tư vấn: Có (' + when + ')');
    data.set('trang', location.pathname);
    data.set('bot-field', '');

    busy = true; submitBtn.disabled = true; status.dataset.error = 'false'; status.textContent = 'Đang gửi yêu cầu…';
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    var done = function (ok, msg) {
      clearTimeout(timer);
      status.dataset.error = ok ? 'false' : 'true'; status.textContent = msg;
      if (ok) { submitBtn.textContent = 'Đã gửi yêu cầu'; }
      else { submitBtn.disabled = false; busy = false; }
    };
    if (['localhost', '127.0.0.1', ''].indexOf(location.hostname) !== -1) {
      window.__hkLastLead = data.toString();
      done(false, 'Đây là bản xem trước: thông tin chưa được gửi.');
      return;
    }
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString(), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error('server');
        done(true, 'Đã gửi yêu cầu. Chuyên viên DBV247 sẽ liên hệ tư vấn cho bạn.');

      })
      .catch(function () { done(false, 'Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi 0869 656 561.'); });
  });

  update();
  /* Mở trang bằng #tinh-phi?loai=… hoặc ?loai=nha-hang → chọn sẵn */
  try {
    var pre = new URLSearchParams(location.search).get('loai');
    if (pre && G[pre]) pickGroup(pre);
  } catch (e) {}
})();
