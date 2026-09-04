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
    });
  }
})();
