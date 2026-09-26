/* DBV247 — hàm dùng chung cho header/footer đồng bộ.
   Chỉ định nghĩa khi trang chưa có, để không đè logic riêng của trang chủ. */
(function () {
  'use strict';

  /* ── Hamburger (mobile) ─────────────────────────────────────────── */
  if (typeof window.toggleCatDropdown !== 'function') {
    window.toggleCatDropdown = function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      var d = document.getElementById('cat-dropdown');
      if (d) d.classList.toggle('open');
    };
  }

  if (typeof window.closeCatDropdown !== 'function') {
    window.closeCatDropdown = function () {
      var d = document.getElementById('cat-dropdown');
      if (d) d.classList.remove('open');
      var i, subs = document.querySelectorAll('.cat-dd-sub.open');
      for (i = 0; i < subs.length; i++) subs[i].classList.remove('open');
      var mores = document.querySelectorAll('.cat-dd-more.open');
      for (i = 0; i < mores.length; i++) mores[i].classList.remove('open');
    };
  }

  /* Mở/đóng một nhánh trong hamburger. Các nhánh cùng cấp thu lại. */
  if (typeof window.toggleCatSub !== 'function') {
    window.toggleCatSub = function (btn) {
      if (!btn) return;
      var sub = document.getElementById(btn.getAttribute('data-sub'));
      if (!sub) return;
      var dangMo = sub.classList.contains('open');
      var cha = btn.parentNode, i;
      var anhEm = cha.querySelectorAll(':scope > .cat-dd-sub.open');
      for (i = 0; i < anhEm.length; i++) anhEm[i].classList.remove('open');
      var nutAnhEm = cha.querySelectorAll(':scope > .cat-dd-more.open');
      for (i = 0; i < nutAnhEm.length; i++) nutAnhEm[i].classList.remove('open');
      if (!dangMo) { sub.classList.add('open'); btn.classList.add('open'); }
    };
  }

  /* ── Menu ngang (desktop) ───────────────────────────────────────── */
  if (!window.__dbvNavInit) {
    window.__dbvNavInit = true;

    document.addEventListener('DOMContentLoaded', function () {
      /* Panel Sản phẩm: chọn nhóm thì cột phải đổi theo */
      var nuts = document.querySelectorAll('.hdr-mega-cat');
      function chon(nut) {
        var mega = nut.closest('.hdr-mega'); if (!mega) return;
        var i, c = mega.querySelectorAll('.hdr-mega-cat');
        for (i = 0; i < c.length; i++) c[i].classList.remove('on');
        var l = mega.querySelectorAll('.hdr-mega-list');
        for (i = 0; i < l.length; i++) l[i].classList.remove('on');
        nut.classList.add('on');
        var ds = mega.querySelector('#' + nut.getAttribute('aria-controls'));
        if (ds) ds.classList.add('on');
      }
      for (var i = 0; i < nuts.length; i++) {
        nuts[i].addEventListener('click', function (e) { e.preventDefault(); chon(this); });
        nuts[i].addEventListener('mouseenter', function () { chon(this); });
      }

      /* Thiết bị cảm ứng không có hover — bấm để mở/đóng */
      var tops = document.querySelectorAll('.hdr-nav-item > button.hdr-nav-top');
      for (var k = 0; k < tops.length; k++) {
        tops[k].addEventListener('click', function (e) {
          e.stopPropagation();
          var panel = this.parentNode.querySelector('.hdr-drop, .hdr-mega');
          if (!panel) return;
          var mo = panel.classList.contains('open');
          dongMenuNgang();
          if (!mo) { panel.classList.add('open'); this.setAttribute('aria-expanded', 'true'); }
        });
      }
    });

    function dongMenuNgang() {
      var i, p = document.querySelectorAll('.hdr-mega.open, .hdr-drop.open');
      for (i = 0; i < p.length; i++) p[i].classList.remove('open');
      var t = document.querySelectorAll('.hdr-nav-top[aria-expanded="true"]');
      for (i = 0; i < t.length; i++) t[i].setAttribute('aria-expanded', 'false');
    }
    window.__dbvDongMenuNgang = dongMenuNgang;
  }

  /* ── Nút Đăng nhập trên header ──────────────────────────────────
     Đã có phiên cộng tác viên thì đổi nhãn thành "Bảng điều khiển" và trỏ
     thẳng vào đó. Chỉ đọc localStorage, không gọi máy chủ — nhãn sai một nhịp
     cũng không sao, còn chờ một vòng mạng thì nút nhấp nháy trên mọi trang.
     Token hết hạn thì /ctv-dashboard tự đẩy về /ctv, nên không có đường cụt. */
  if (!window.__dbvNutDangNhap) {
    window.__dbvNutDangNhap = true;
    document.addEventListener('DOMContentLoaded', function () {
      var co = false;
      try { co = !!localStorage.getItem('dbv_ctv_token'); } catch (e) { co = false; }
      if (!co) return;
      /* Hai lối vào: nút xanh ở header (desktop) và mục đầu trong hamburger
         (mobile). Cả hai phải đổi cùng lúc, nếu không thì xoay ngang màn hình
         là thấy hai nhãn khác nhau. */
      ['hdr-dangnhap', 'menu-dangnhap', 'mob-taikhoan'].forEach(function (id) {
        var nut = document.getElementById(id);
        if (!nut) return;
        nut.setAttribute('href', '/ctv-dashboard');
        if (id === 'mob-taikhoan') return;   /* tab đáy giữ nhãn ngắn "Tài khoản" */
        var tx = nut.querySelector('.btn-login-tx');
        if (tx) tx.textContent = (id === 'menu-dangnhap')
          ? 'Bảng điều khiển cộng tác viên'
          : 'Bảng điều khiển';
      });
    });
  }

  /* ── Mobile (mockup 26/09/2026): khoá cuộn khi mở menu toàn màn hình ── */
  if (!window.__dbvMenuKhoaCuon) {
    window.__dbvMenuKhoaCuon = true;
    document.addEventListener('DOMContentLoaded', function () {
      var d = document.getElementById('cat-dropdown');
      if (!d || !window.MutationObserver) return;
      new MutationObserver(function () {
        var mo = d.classList.contains('open') && window.matchMedia('(max-width:640px)').matches;
        document.body.style.overflow = mo ? 'hidden' : '';
        /* header có z-index 300 nên panel không phủ được thanh tab đáy (400) — ẩn thanh khi menu mở */
        var bar = document.querySelector('.mob-bar'); if (bar) bar.style.visibility = mo ? 'hidden' : '';
        /* Khung chat (z-index 394–396) nổi trên header — ẩn luôn khi menu mở */
        [].forEach.call(document.querySelectorAll('[id^="dbvchat"]'), function (el) {
          if (getComputedStyle(el).position === 'fixed') el.style.visibility = mo ? 'hidden' : '';
        });
        /* Một số trang đặt backdrop-filter/transform cho .hdr — khi đó position:fixed của
           panel bị "nhốt" trong header cao 56px. Gỡ tạm lúc menu mở. */
        var h = d.closest('.hdr');
        if (h) { h.style.backdropFilter = mo ? 'none' : ''; h.style.webkitBackdropFilter = mo ? 'none' : ''; h.style.transform = mo ? 'none' : ''; }
      }).observe(d, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ── Nút tìm kiếm header mobile: mở hộp tìm của dbv-menu-search.js.
     Chỉ 32/104 trang có sẵn script đó — trang nào thiếu thì nạp khi bấm. ── */
  if (typeof window.dbvTimKiem !== 'function') {
    window.dbvTimKiem = function () {
      if (typeof window.closeCatDropdown === 'function') window.closeCatDropdown();
      if (window.DBV && typeof window.DBV.moTimKiem === 'function') { window.DBV.moTimKiem(); return; }
      if (!document.querySelector('link[href*="dbv-header.css"]')) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/dbv-header.css';
        document.head.appendChild(l);
      }
      var sc = document.createElement('script'); sc.src = '/assets/dbv-menu-search.js';
      sc.onload = function () { if (window.DBV && window.DBV.moTimKiem) window.DBV.moTimKiem(); };
      sc.onerror = function () { location.href = '/san-pham'; };
      document.head.appendChild(sc);
    };
  }

  /* ── Thanh tab đáy: sáng tab theo trang đang xem; tab "Tư vấn" mở bảng liên hệ ── */
  if (!window.__dbvTabDay) {
    window.__dbvTabDay = true;
    window.dbvMoTuVan = function () {
      var sh = document.getElementById('mob-sheet'); if (!sh) { location.href = '/tu-van'; return; }
      sh.hidden = false; document.body.style.overflow = 'hidden';
      try { (window.dataLayer = window.dataLayer || []).push({ event: 'mo_bang_tu_van', trang: location.pathname }); } catch (e) {}
    };
    window.dbvDongTuVan = function () {
      var sh = document.getElementById('mob-sheet'); if (!sh) return;
      sh.hidden = true; document.body.style.overflow = '';
    };
    document.addEventListener('DOMContentLoaded', function () {
      var p = location.pathname.replace(/\.html$/, '');
      var tab = p === '/' || p === '/index' ? 'home'
        : /^\/tu-van/.test(p) ? 'tv'
        : /^\/ctv/.test(p) ? 'tk'
        : /^\/(san-pham|bao-hiem-|tnds-|cap-don-tnds|tinh-phi)/.test(p) ? 'sp' : '';
      if (!tab) return;
      var t = document.querySelector('.mob-bar .mob-tab[data-tab="' + tab + '"]');
      if (t) { t.classList.add('on'); t.setAttribute('aria-current', 'page'); }
    });
  }

  /* ── Đóng khi bấm ra ngoài / nhấn Esc — gắn một lần ─────────────── */
  if (!window.__dbvLayoutOutsideClick) {
    window.__dbvLayoutOutsideClick = true;

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!(t && t.closest)) return;
      if (!t.closest('.hdr-cat-wrap') && typeof window.closeCatDropdown === 'function') {
        window.closeCatDropdown();
      }
      if (!t.closest('.hdr-nav-item') && window.__dbvDongMenuNgang) {
        window.__dbvDongMenuNgang();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) return;
      if (typeof window.closeCatDropdown === 'function') window.closeCatDropdown();
      if (window.__dbvDongMenuNgang) window.__dbvDongMenuNgang();
      if (window.dbvDongTuVan) window.dbvDongTuVan();
    });
  }
})();
