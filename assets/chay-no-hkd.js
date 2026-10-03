/* DBV247 — Bảo hiểm cháy nổ hộ kinh doanh, body v2 (03/10/2026).
   Chọn loại hình từ 8 thẻ → điền sẵn công cụ tính phí; tính phí dự kiến; gửi lead Netlify Forms (dbv-tuvan).
   Tỷ lệ phí: mức tối thiểu/năm theo biểu phí NĐ 67/2023, sửa đổi bởi NĐ 105/2025 (dữ liệu ở #hk-data).
   Nhóm không có tỷ lệ riêng, thời hạn khác 12 tháng hoặc tài sản từ 1.000 tỷ → chuyển báo giá cụ thể. */
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

  /* ── Chọn loại hình ── */
  var typeSel = $('hk-type'), leadType = $('hk-l-type'), cards = root.querySelectorAll('.hk-type');
  var leadTypeAuto = true;
  leadType.addEventListener('change', function () { leadTypeAuto = false; });

  function select(k) {
    var t = DATA[k];
    cards.forEach(function (c) { c.classList.toggle('is-selected', !!t && c.getAttribute('data-type') === k); });
    root.querySelectorAll('.hk-pick').forEach(function (b) {
      b.setAttribute('aria-pressed', String(!!t && b.getAttribute('data-type') === k));
    });
    if (typeSel.value !== (t ? k : '')) typeSel.value = t ? k : '';
    $('hk-chosen-name').textContent = t ? t.n : 'chưa chọn loại hình';
    $('hk-spk-wrap').hidden = !(t && t.spk);
    if (t && (leadTypeAuto || !leadType.value)) { leadType.value = k; leadTypeAuto = true; }
    typeSel.removeAttribute('aria-invalid');
    if (computed) calc(false);
  }
  root.querySelectorAll('.hk-pick').forEach(function (b) {
    b.addEventListener('click', function () {
      select(b.getAttribute('data-type'));
      goTo($('tinh-phi'), $('hk-h-calc'));
    });
  });
  typeSel.addEventListener('change', function () { select(typeSel.value); });

  /* ── Ô số tiền / diện tích: định dạng nghìn ── */
  ['hk-value', 'hk-area'].forEach(function (id) {
    var el = $(id);
    el.addEventListener('input', function () {
      var d = el.value.replace(/\D/g, '').slice(0, 16);
      el.value = d ? fmt(Number(d)) : '';
      el.removeAttribute('aria-invalid'); if (id === 'hk-value') $('hk-value-err').hidden = true;
      if (computed) calc(false);
    });
  });
  ['hk-pccc', 'hk-term'].forEach(function (id) { $(id).addEventListener('change', function () { if (computed) calc(false); }); });
  root.querySelectorAll('[name="hk-spk"]').forEach(function (r) { r.addEventListener('change', function () { if (computed) calc(false); }); });
  $('hk-ack').addEventListener('change', function () { if ($('hk-ack').checked) $('hk-ack-err').hidden = true; });

  /* ── Tính phí ── */
  var computed = false, lastSummary = '';
  function selText(el) { return el.value ? el.options[el.selectedIndex].text : 'Chưa chọn'; }

  function quote() {
    var k = typeSel.value, t = DATA[k], v = digits($('hk-value')), area = digits($('hk-area'));
    var term = $('hk-term').value, spkEl = root.querySelector('[name="hk-spk"]:checked'), spk = spkEl ? spkEl.value : 'chua-ro';
    var q = { t: t, v: v, area: area, isQuote: false, price: '', formula: '', vat: '', rateTxt: '' };
    if (term !== '12') {
      q.isQuote = true; q.price = 'Cần báo giá cụ thể';
      q.formula = 'Thời hạn khác 12 tháng: phí được tính tương ứng với thời hạn bảo hiểm, chuyên viên DBV sẽ báo giá chính xác.';
    } else if (!t.rate) {
      q.isQuote = true; q.price = 'Cần báo giá cụ thể'; q.formula = t.why;
    } else if (v >= 1e12) {
      q.isQuote = true; q.price = 'Cần báo giá cụ thể';
      q.formula = 'Tổng số tiền bảo hiểm từ 1.000 tỷ đồng áp dụng cách tính phí riêng theo quy định.';
    } else {
      var lo = t.rate[0], hi = t.rate[1];
      if (t.spk) { if (spk === 'co') hi = lo; else if (spk === 'khong') lo = hi; }
      var a = Math.round(v * lo / 100), b = Math.round(v * hi / 100);
      q.rateTxt = lo === hi ? pct(lo) : pct(lo) + ' – ' + pct(hi);
      q.price = a === b ? money(a) : fmt(a) + ' – ' + money(b); q.range = a !== b;
      q.formula = money(v) + ' × ' + q.rateTxt + (lo !== hi ? ' (tùy hệ thống chữa cháy tự động)' : '');
      q.vat = 'Chưa gồm VAT 10% · ≈ ' + (a === b ? money(a * 1.1) : fmt(a * 1.1) + ' – ' + money(b * 1.1)) + ' đã gồm VAT';
    }
    return q;
  }

  function calc(fromSubmit) {
    var k = typeSel.value, ok = true, firstBad = null;
    if (!DATA[k]) { ok = false; typeSel.setAttribute('aria-invalid', 'true'); firstBad = firstBad || typeSel; }
    if (!(digits($('hk-value')) > 0)) {
      ok = false; $('hk-value').setAttribute('aria-invalid', 'true');
      var er = $('hk-value-err'); er.textContent = 'Vui lòng nhập giá trị tài sản lớn hơn 0.'; er.hidden = false;
      firstBad = firstBad || $('hk-value');
    }
    if (!$('hk-ack').checked) { ok = false; $('hk-ack-err').hidden = false; firstBad = firstBad || $('hk-ack'); }
    if (!ok) { if (fromSubmit && firstBad) firstBad.focus(); return; }

    var q = quote(), t = q.t;
    computed = true;
    $('hk-res-empty').hidden = true; $('hk-res-body').hidden = false;
    $('hk-res-title').textContent = q.isQuote ? 'Báo giá cụ thể' : 'Phí dự kiến / năm';
    var p = $('hk-price'); p.textContent = q.price; p.classList.toggle('is-quote', q.isQuote); p.classList.toggle('is-range', !!q.range);
    $('hk-formula').textContent = q.formula;
    $('hk-vat').textContent = q.vat; $('hk-vat').hidden = !q.vat;
    var wa = $('hk-warn-area');
    if (t.area && q.area > 0 && q.area < t.area) {
      $('hk-warn-area-t').textContent = 'Diện tích ' + fmt(q.area) + ' m² nhỏ hơn ngưỡng ' + fmt(t.area) + ' m² của nhóm này: cơ sở có thể chưa thuộc diện bắt buộc (còn xét số tầng, loại hàng hóa). Nếu mua tự nguyện, DBV báo giá riêng.';
      wa.hidden = false;
    } else wa.hidden = true;
    $('hk-warn-pccc').hidden = $('hk-pccc').value !== 'chua-nghiem-thu';
    $('hk-l-attach').hidden = false;
    var spkEl = root.querySelector('[name="hk-spk"]:checked');
    lastSummary = [
      'Loại hình: ' + t.n,
      'Giá trị tài sản bảo hiểm: ' + money(q.v),
      'Diện tích: ' + (q.area ? fmt(q.area) + ' m²' : 'Chưa nhập'),
      'Hồ sơ PCCC: ' + selText($('hk-pccc')),
      t.spk ? 'Chữa cháy tự động: ' + (spkEl ? spkEl.parentNode.textContent.trim() : 'Chưa rõ') : '',
      'Thời hạn: ' + selText($('hk-term')),
      'Kết quả: ' + q.price + (q.rateTxt ? ' (tỷ lệ ' + q.rateTxt + '/năm, chưa VAT)' : ''),
      q.formula
    ].filter(Boolean).join('\n');
  }
  $('hk-calc-form').addEventListener('submit', function (ev) { ev.preventDefault(); calc(true); });
  $('hk-calc-btn').addEventListener('click', function () { calc(true); });
  ['hk-value', 'hk-area'].forEach(function (id) {
    $(id).addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); calc(true); } });
  });

  /* ── Từ kết quả sang form / Zalo ── */
  $('hk-to-lead').addEventListener('click', function (ev) {
    ev.preventDefault();
    if (DATA[typeSel.value] && (leadTypeAuto || !leadType.value)) leadType.value = typeSel.value;
    goTo($('tu-van'), $('hk-l-phone'));
  });
  $('hk-zalo').addEventListener('click', function () {
    var st = $('hk-zalo-status');
    if (!lastSummary) { st.textContent = 'Bạn có thể nhắn trực tiếp cho DBV qua Zalo, hoặc tính phí trước để gửi kèm kết quả.'; return; }
    var text = 'Nhờ DBV báo giá bảo hiểm cháy nổ hộ kinh doanh:\n' + lastSummary;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        st.textContent = 'Đã sao chép kết quả — dán vào khung chat Zalo để gửi cho DBV.';
      }, function () { st.textContent = 'Mở Zalo để nhắn DBV kèm loại hình và giá trị tài sản của bạn.'; });
    } else st.textContent = 'Mở Zalo để nhắn DBV kèm loại hình và giá trị tài sản của bạn.';
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
    var q = computed ? lastSummary : '';
    var data = new URLSearchParams();
    data.set('form-name', 'dbv-tuvan');
    data.set('san-pham', 'Bảo Hiểm Cháy Nổ Bắt Buộc HKD');
    data.set('ho-ten', $('hk-l-name').value.trim());
    data.set('dien-thoai', p);
    data.set('loai-hinh-kd', leadType.value ? selText(leadType) : '');
    data.set('tinh-thanh', $('hk-l-city').value ? selText($('hk-l-city')) : '');
    if (computed) {
      data.set('ket-qua-tinh-phi', q);
      if (digits($('hk-area'))) data.set('dien-tich', fmt(digits($('hk-area'))) + ' m²');
      data.set('thoi-han', selText($('hk-term')));
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

  /* Mở trang bằng #tinh-phi?loai=… hoặc ?loai=nha-hang → chọn sẵn */
  try {
    var pre = new URLSearchParams(location.search).get('loai');
    if (pre && DATA[pre]) select(pre);
  } catch (e) {}
})();
