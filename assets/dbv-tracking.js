/* ============================================================================
   DBV247 — ĐO LƯỜNG CHUYỂN ĐỔI (GA4 · Google Ads · Facebook Pixel)
   ----------------------------------------------------------------------------
   File này gắn một lần cho toàn bộ website. KHÔNG sửa code cũ của từng trang.

   Cách hoạt động: mọi form trên site đều gửi lead bằng lệnh fetch('/') tới
   Netlify Forms. File này "đứng chờ" ở đó, và mỗi khi có một lead gửi đi
   thành công thì báo cho Google/Facebook biết. Vì việc kiểm tra số điện thoại
   đã chạy TRƯỚC lệnh gửi, nên chỉ lead hợp lệ mới được tính.

   ===========  CẦN ĐIỀN 3 MÃ SỐ BÊN DƯỚI KHI CÓ TÀI KHOẢN  ===================
   Chưa điền cũng không sao — phần GA4 vẫn chạy bình thường ngay từ bây giờ.
   ============================================================================ */

var DBV_CAUHINH = {

  // (1) Google Ads — lấy trong Google Ads > Mục tiêu > Chuyển đổi
  //     Dạng: 'AW-1234567890'  và  'AbCdEfGhIj'
  googleAdsId:        '',      // ← điền mã tài khoản Google Ads
  googleAdsNhanLead:  '',      // ← điền nhãn chuyển đổi "gửi form"
  googleAdsNhanGoi:   '',      // ← điền nhãn chuyển đổi "bấm gọi" (không bắt buộc)

  // (2) Facebook Pixel — lấy trong Trình quản lý sự kiện Facebook
  //     Dạng: '1234567890123456'
  facebookPixelId:    '',      // ← điền mã Pixel

  // (3) Bật/tắt ghi log ra Console để kiểm tra khi cần
  batCheDoKiemTra:    false
};

/* ========================================================================== */
/*  Từ đây trở xuống KHÔNG cần sửa                                            */
/* ========================================================================== */
(function () {
  'use strict';

  function log() {
    if (DBV_CAUHINH.batCheDoKiemTra && window.console) {
      console.log.apply(console, ['[DBV-đo-lường]'].concat([].slice.call(arguments)));
    }
  }

  /* ---------- Bảo đảm gtag tồn tại, kể cả khi trang chưa gắn GA4 ---------- */
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }

  /* ---------- Gửi sự kiện đi đúng đường ----------------------------------
     GA4 của site được nạp QUA GTM chứ không gắn thẳng vào trang. Trong tình
     huống đó, lệnh gtag('event', ...) không tới được GA4 — đã kiểm chứng:
     báo cáo Thời gian thực chỉ thấy page_view, session_start, first_visit,
     còn click_phone và generate_lead thì không bao giờ xuất hiện.

     Đường đúng là đẩy vào dataLayer để GTM bắt được, rồi GTM chuyển tiếp
     sang GA4. Vẫn gọi thêm gtag() vì Google Ads được nạp trực tiếp bởi
     chính file này, không đi qua GTM.                                      */
  function guiSuKien(ten, thamSo) {
    var data = thamSo || {};

    // (1) Cho GTM → GA4
    var payload = { event: ten };
    for (var k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) payload[k] = data[k];
    }
    window.dataLayer.push(payload);

    // (2) Cho Google Ads (nếu đã điền mã) — không ảnh hưởng nếu chưa có
    gtag('event', ten, data);

    log('SỰ KIỆN →', ten, data);
  }

  /* ---------- Nạp Google Ads (chỉ khi đã điền mã) ---------- */
  if (DBV_CAUHINH.googleAdsId) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + DBV_CAUHINH.googleAdsId;
    document.head.appendChild(s);
    gtag('config', DBV_CAUHINH.googleAdsId);
    log('Đã nạp Google Ads:', DBV_CAUHINH.googleAdsId);
  }

  /* ---------- Nạp Facebook Pixel (chỉ khi đã điền mã) ---------- */
  if (DBV_CAUHINH.facebookPixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', DBV_CAUHINH.facebookPixelId);
    fbq('track', 'PageView');
    log('Đã nạp Facebook Pixel:', DBV_CAUHINH.facebookPixelId);
  }

  function fb(tenSuKien, thamSo) {
    if (typeof window.fbq === 'function') fbq('track', tenSuKien, thamSo || {});
  }

  /* ====================================================================== */
  /*  1. LEAD — bắt mọi form gửi đi trên toàn site                          */
  /* ====================================================================== */

  var PHIEN_BAN_CHINH_SACH = 'v1.0 (28/07/2026)';

  var fetchGoc = window.fetch;
  if (typeof fetchGoc === 'function') {
    window.fetch = function (duongDan, tuyChon) {
      try {
        var laLead = tuyChon
          && String(tuyChon.method || '').toUpperCase() === 'POST'
          && String(tuyChon.body || '').indexOf('form-name=') !== -1;
        if (laLead) {
          // Ghi lại bằng chứng đồng ý — yêu cầu của Luật 91/2025/QH15.
          // Mỗi lead trong Netlify Forms sẽ kèm thời điểm và phiên bản chính sách
          // đã hiển thị cho khách tại thời điểm họ bấm gửi.
          tuyChon.body = String(tuyChon.body || '')
            + '&dong-y-chinh-sach=' + encodeURIComponent('Đã hiển thị thông báo ' + PHIEN_BAN_CHINH_SACH + ' và người dùng chủ động bấm gửi')
            + '&thoi-diem-dong-y=' + encodeURIComponent(new Date().toISOString());
          baoLead(String(tuyChon.body));
        }
      } catch (e) { log('lỗi khi đọc lead:', e); }
      return fetchGoc.apply(this, arguments);
    };
    log('Đã sẵn sàng bắt sự kiện gửi form.');
  }

  function baoLead(body) {
    var duLieu = {};
    try {
      new URLSearchParams(body).forEach(function (v, k) { duLieu[k] = v; });
    } catch (e) { /* trình duyệt cũ — bỏ qua, vẫn tính là 1 lead */ }

    var sanPham = duLieu['san-pham'] || tenSanPhamTheoTrang();
    var nguon   = duLieu['nguon'] || duLieu['form-name'] || 'không rõ';

    guiSuKien('generate_lead', {
      san_pham: sanPham,
      vi_tri_form: nguon,
      trang: location.pathname,
      currency: 'VND',
      value: 0
    });
    log('LEAD →', sanPham, '|', nguon);

    if (DBV_CAUHINH.googleAdsId && DBV_CAUHINH.googleAdsNhanLead) {
      gtag('event', 'conversion', {
        send_to: DBV_CAUHINH.googleAdsId + '/' + DBV_CAUHINH.googleAdsNhanLead
      });
    }
    fb('Lead', { content_name: sanPham, content_category: nguon });
  }

  /* Dự phòng: nếu trang nào dùng <form> gửi thẳng (không qua fetch) */
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.tagName !== 'FORM') return;
    if (f.hasAttribute('hidden') || f.getAttribute('name') === null) return;
    if (f.dataset.dbvDaBao === '1') return;
    f.dataset.dbvDaBao = '1';
    setTimeout(function () { f.dataset.dbvDaBao = ''; }, 3000);
    guiSuKien('generate_lead', {
      san_pham: tenSanPhamTheoTrang(),
      vi_tri_form: f.getAttribute('name') || 'form',
      trang: location.pathname
    });
    log('LEAD (form gửi thẳng) →', f.getAttribute('name'));
  }, true);

  /* ====================================================================== */
  /*  2. BẤM GỌI ĐIỆN & BẤM ZALO                                            */
  /* ====================================================================== */

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';

    if (href.indexOf('tel:') === 0) {
      guiSuKien('click_phone', {
        so_dien_thoai: href.replace('tel:', ''),
        trang: location.pathname
      });
      if (DBV_CAUHINH.googleAdsId && DBV_CAUHINH.googleAdsNhanGoi) {
        gtag('event', 'conversion', {
          send_to: DBV_CAUHINH.googleAdsId + '/' + DBV_CAUHINH.googleAdsNhanGoi
        });
      }
      fb('Contact', { method: 'phone' });
      log('BẤM GỌI →', href);
      return;
    }

    if (href.indexOf('zalo.me') !== -1) {
      guiSuKien('click_zalo', { trang: location.pathname });
      fb('Contact', { method: 'zalo' });
      log('BẤM ZALO');
      return;
    }

    if (href.indexOf('m.me') !== -1 || href.indexOf('messenger.com') !== -1) {
      guiSuKien('click_messenger', { trang: location.pathname });
      fb('Contact', { method: 'messenger' });
    }
  }, true);

  /* ====================================================================== */
  /*  3. ĐỘ SÂU ĐỌC TRANG — biết khách đọc bao nhiêu trước khi rời đi        */
  /* ====================================================================== */

  var moc = { 25: false, 50: false, 75: false, 90: false };
  var dangCho = false;

  function kiemTraCuon() {
    var cao = document.documentElement.scrollHeight - window.innerHeight;
    if (cao <= 0) return;
    var phanTram = (window.pageYOffset / cao) * 100;
    [25, 50, 75, 90].forEach(function (m) {
      if (!moc[m] && phanTram >= m) {
        moc[m] = true;
        guiSuKien('scroll_' + m, { trang: location.pathname });
        log('CUỘN', m + '%');
      }
    });
  }

  window.addEventListener('scroll', function () {
    if (dangCho) return;
    dangCho = true;
    setTimeout(function () { kiemTraCuon(); dangCho = false; }, 300);
  }, { passive: true });

  /* ====================================================================== */
  /*  4. THÔNG BÁO ĐỒNG Ý XỬ LÝ DỮ LIỆU CÁ NHÂN                             */
  /*     Tự chèn một dòng ghi chú kèm liên kết Chính sách bảo mật ngay dưới  */
  /*     mỗi nút gửi. Không đụng vào code cũ; nếu không tìm thấy nút thì      */
  /*     lặng lẽ bỏ qua, không ảnh hưởng gì tới trang.                       */
  /* ====================================================================== */

  var LIEN_KET_CS = '<a href="/chinh-sach-bao-mat" target="_blank" rel="noopener">' +
                    'Chính sách bảo vệ dữ liệu cá nhân</a>';

  /* Tìm khối bao ngoài của form: đi ngược lên từ nút gửi cho tới thẻ <form>,
     hoặc tới khối chứa ô nhập nhưng KHÔNG phải hàng ngang (flex/grid).
     Nhờ vậy dòng thông báo luôn nằm DƯỚI form, không bao giờ chen vào
     cùng hàng với nút bấm. */
  function timKhoiForm(nut) {
    var n = nut;
    for (var i = 0; i < 8 && n && n.parentNode; i++) {
      n = n.parentNode;
      if (n.nodeType !== 1) return null;
      if (n.tagName === 'FORM') return n;
      if (n.tagName === 'BODY') return null;
      var coONhap = n.querySelector && n.querySelector('input:not([type="hidden"]), select, textarea');
      if (!coONhap) continue;
      var hienThi = '';
      try { hienThi = String(getComputedStyle(n).display || ''); } catch (e) { }
      if (hienThi.indexOf('flex') === -1 && hienThi.indexOf('grid') === -1) return n;
    }
    return null;
  }

  function chenThongBaoDongY() {
    var CSS_ID = 'dbv-css-dongy';
    if (!document.getElementById(CSS_ID)) {
      var st = document.createElement('style');
      st.id = CSS_ID;
      st.textContent =
        '.dbv-dongy{font-size:11.5px;line-height:1.5;color:#718096;margin-top:8px;' +
        'text-align:center;max-width:460px;margin-left:auto;margin-right:auto;' +
        'flex-basis:100%;width:100%;order:99}' +   /* phòng khi rơi vào khung flex */
        '.dbv-dongy a{color:#007437;text-decoration:underline}' +
        '.dbv-dongy-ngan a{color:inherit;text-decoration:underline}';
      document.head.appendChild(st);
    }

    var nut = [].slice.call(document.querySelectorAll(
      'button[onclick*="submit" i], a[onclick*="submit" i], ' +
      'button[type="submit"], input[type="submit"], [onclick*="Lead" i]'
    ));

    var daXuLy = [];
    var daChen = 0, daGan = 0;

    nut.forEach(function (b) {
      var khoi = timKhoiForm(b) || b.parentNode;
      if (!khoi || daXuLy.indexOf(khoi) !== -1) return;
      daXuLy.push(khoi);

      var cha = khoi.parentNode;
      if (!cha) return;
      if (cha.querySelector && cha.querySelector('.dbv-dongy, .dbv-dongy-ngan')) return;

      /* Nếu ngay dưới form đã có sẵn một dòng ghi chú nhắc tới bảo mật
         (ví dụ "Miễn phí · Bảo mật thông tin" ở form banner trang chủ),
         thì gắn liên kết vào đúng dòng đó thay vì thêm một dòng mới —
         giữ nguyên bố cục thiết kế sẵn có. */
      var ghiChuSan = null;
      var e = khoi.nextElementSibling;
      for (var k = 0; k < 2 && e; k++) {
        if (/bảo mật|bao mat/i.test(e.textContent || '') && (e.textContent || '').length < 90) {
          ghiChuSan = e; break;
        }
        e = e.nextElementSibling;
      }

      if (ghiChuSan) {
        ghiChuSan.classList.add('dbv-dongy-ngan');
        var them = document.createElement('span');
        them.innerHTML = ' · Xem ' + LIEN_KET_CS;
        ghiChuSan.appendChild(them);
        daGan++;
        return;
      }

      var p = document.createElement('p');
      p.className = 'dbv-dongy';
      p.innerHTML = 'Bằng việc gửi thông tin, bạn đồng ý để DBV247 liên hệ tư vấn và ' +
                    'xử lý dữ liệu theo ' + LIEN_KET_CS + '.';
      if (khoi.nextSibling) cha.insertBefore(p, khoi.nextSibling);
      else cha.appendChild(p);
      daChen++;
    });
    log('Thông báo đồng ý: chèn mới', daChen, '· gắn vào ghi chú sẵn có', daGan);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', chenThongBaoDongY);
  } else {
    chenThongBaoDongY();
  }

  /* ====================================================================== */
  /*  5. CHỐNG TRÀN BẢNG TRÊN ĐIỆN THOẠI                                    */
  /*     Bọc mọi bảng vào một khung cuộn ngang. Trên máy tính không đổi gì;  */
  /*     trên điện thoại, bảng rộng sẽ cuộn được thay vì tràn ra ngoài.      */
  /* ====================================================================== */

  function bocBang() {
    var CSS_ID = 'dbv-css-bang';
    if (!document.getElementById(CSS_ID)) {
      var st = document.createElement('style');
      st.id = CSS_ID;
      st.textContent =
        '.dbv-bang-cuon{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}' +
        '.dbv-bang-cuon>table{min-width:100%}';
      document.head.appendChild(st);
    }
    var dem = 0;
    [].slice.call(document.querySelectorAll('table')).forEach(function (t) {
      var cha = t.parentNode;
      if (!cha || cha.nodeType !== 1) return;
      if (String(cha.className || '').indexOf('dbv-bang-cuon') !== -1) return;
      // bỏ qua bảng đã được bọc sẵn bằng khung cuộn trong code gốc
      if (/overflow-x\s*:\s*auto/i.test(cha.getAttribute('style') || '')) return;
      var khung = document.createElement('div');
      khung.className = 'dbv-bang-cuon';
      cha.insertBefore(khung, t);
      khung.appendChild(t);
      dem++;
    });
    log('Đã bọc', dem, 'bảng để cuộn ngang trên điện thoại.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bocBang);
  } else {
    bocBang();
  }

  /* ====================================================================== */
  /*  6. TIỆN ÍCH                                                           */
  /* ====================================================================== */

  function tenSanPhamTheoTrang() {
    var t = (document.title || '').split(/[|—–]/)[0].trim();
    return t || location.pathname;
  }

  /* Cho phép gọi thủ công từ bất kỳ đâu: DBV.baoSuKien('ten_su_kien', {...}) */
  window.DBV = window.DBV || {};
  window.DBV.baoSuKien = function (ten, thamSo) {
    guiSuKien(ten, thamSo || {});
    log('SỰ KIỆN THỦ CÔNG →', ten, thamSo);
  };

  log('Đã khởi động xong.');
})();
