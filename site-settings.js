/* DBV247 – Đồng bộ thông tin liên hệ (SDT, email, Zalo, MST, địa chỉ)
   Nguồn dữ liệu: /content/settings.json — sửa qua trang /admin, mục "Thông tin liên hệ".
   Script này tự chạy trên mọi trang, không cần cấu hình gì thêm. */
(function () {
  fetch("/content/settings.json")
    .then(function (r) { return r.json(); })
    .then(function (s) {
      if (!s) return;

      // Số điện thoại: cập nhật mọi link tel: + text số hiển thị bên trong
      if (s.phone) {
        document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
          a.setAttribute("href", "tel:" + s.phone);
          if (s.phone_display) {
            a.innerHTML = a.innerHTML.replace(/0869\s?656\s?561/g, s.phone_display);
          }
        });
      }

      // Email: cập nhật mọi link mailto: + text hiển thị
      if (s.email) {
        document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
          a.setAttribute("href", "mailto:" + s.email);
          a.innerHTML = a.innerHTML.replace(/dbvi247@gmail\.com/g, s.email);
        });
      }

      // Zalo: cập nhật link + số hiển thị kèm theo (nếu có)
      if (s.zalo_link) {
        document.querySelectorAll('a[href^="https://zalo.me/"]').forEach(function (a) {
          a.setAttribute("href", s.zalo_link);
          if (s.phone_display) {
            a.innerHTML = a.innerHTML.replace(/0869\s?656\s?561/g, s.phone_display);
          }
        });
      }

      // Mã số thuế
      if (s.tax_code) {
        document.querySelectorAll('[data-cms="tax-code"]').forEach(function (el) {
          el.textContent = s.tax_code;
        });
      }

      // Địa chỉ
      if (s.address) {
        document.querySelectorAll('[data-cms="address"]').forEach(function (el) {
          el.textContent = s.address;
        });
      }
    })
    .catch(function () {
      /* Nếu không tải được settings.json, giữ nguyên nội dung gốc trong HTML — không lỗi trang. */
    });
})();
