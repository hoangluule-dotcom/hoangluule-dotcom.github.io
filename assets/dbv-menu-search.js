/* ============================================================================
   DBV247 — TÌM KIẾM SẢN PHẨM TRÊN ĐIỆN THOẠI
   ----------------------------------------------------------------------------
   Chèn nút kính lúp bên trái nút menu, mở lớp phủ tìm kiếm ngay tại chỗ.
   Không cần tải lại trang, hoạt động từ mọi trang trong site.

   MUỐN THÊM / SỬA SẢN PHẨM: sửa mảng DBV_SANPHAM bên dưới. Không cần đụng
   phần nào khác. Trường "tim" là các từ khóa phụ giúp tìm ra sản phẩm đó —
   cứ thêm thoải mái, càng nhiều cách gọi dân dã càng dễ tìm.
   ============================================================================ */

var DBV_SANPHAM = [
  { ten: 'BH TNDS Chủ Xe Ô Tô', url: '/bao-hiem-tnds-oto', the: 'HOT',
    mo: 'Bảo hiểm bắt buộc – trách nhiệm dân sự với bên thứ ba.',
    tim: 'oto o to xe hoi bat buoc tnds trach nhiem dan su cà vẹt phat csgt' },

  { ten: 'BH TNDS Chủ Xe Máy', url: '/bao-hiem-tnds-xemay', the: 'HOT',
    mo: 'Bảo hiểm bắt buộc cho chủ xe máy – cấp đơn trong ngày.',
    tim: 'xe may xemay moto mo to bat buoc tnds 55k 66k phat csgt' },

  { ten: 'BH Vật Chất Ô Tô (Thân Vỏ)', url: '/bao-hiem-vat-chat-oto', the: 'HOT',
    mo: 'Va chạm, lật đổ, cháy nổ, thiên tai, mất cắp bộ phận.',
    tim: 'vat chat than vo oto o to hai chieu 2 chieu bao hiem xe hoi va cham gara' },

  { ten: 'Công Cụ Tính Phí Vật Chất Ô Tô', url: '/tinh-phi-vat-chat-oto', the: 'MỚI',
    mo: 'Tự động tra giá xe qua Google, tính phí theo đúng biểu phí trong 30 giây.',
    tim: 'tinh phi bao hiem o to cong cu tra gia xe tu dong online vat chat than vo' },

  { ten: 'BH Xe Ô Tô Điện', url: '/bao-hiem-oto-dien', the: 'MỚI',
    mo: 'Bảo vệ pin, bộ sạc, hệ thống điện và TNDS xe điện.',
    tim: 'xe dien oto dien vinfast vf3 vf5 vf6 vf7 vf8 vf9 pin sac ac quy' },

  { ten: 'BH Hàng Hóa Xuất Nhập Khẩu', url: '/bao-hiem-xnk', the: '',
    mo: 'Lô hàng XNK trên hành trình quốc tế – điều kiện ICC A, B, C.',
    tim: 'xnk xuat nhap khau hang hoa icc container duong bien cargo' },

  { ten: 'BH Vận Chuyển Nội Địa', url: '/bao-hiem-van-chuyen', the: '',
    mo: 'Hàng hóa đường bộ, đường sắt, đường thủy nội địa.',
    tim: 'van chuyen noi dia hang hoa duong bo duong sat xe tai logistics' },

  { ten: 'BH Bưu Gửi Quốc Tế', url: '/bao-hiem-buu-gui', the: '',
    mo: 'Bưu phẩm và hàng gửi quốc tế, tránh thất lạc hư hỏng.',
    tim: 'buu gui buu pham buu kien chuyen phat quoc te that lac' },

  { ten: 'BH Thân Tàu Nội Địa', url: '/bao-hiem-than-tau-noi-dia', the: '',
    mo: 'Tàu thuyền vận tải thủy nội địa – tổn thất, đắm tàu, va chạm.',
    tim: 'than tau tau thuyen duong thuy sa lan dam tau hang hai' },

  { ten: 'BH Cháy Nổ Bắt Buộc', url: '/bao-hiem-chay-no', the: 'BẮT BUỘC',
    mo: 'Bắt buộc theo pháp luật – tránh phạt, bảo vệ cơ sở kinh doanh.',
    tim: 'chay no bat buoc pccc hoa hoan co so kinh doanh nghi dinh phat' },

  { ten: 'BH Cháy Nổ Hộ Kinh Doanh', url: '/bao-hiem-chay-no-hkd', the: 'BẮT BUỘC',
    mo: 'Theo NĐ 105/2025 – phạt đến 50 triệu nếu không mua.',
    tim: 'chay no ho kinh doanh hkd nha o ket hop kinh doanh 200m2 pccc phat' },

  { ten: 'BH Cháy Nổ Căn Hộ Chung Cư', url: '/bao-hiem-chay-no-chung-cu', the: 'MỚI',
    mo: 'Bắt buộc cho căn hộ chung cư – tài sản, nội thất, trách nhiệm.',
    tim: 'chay no chung cu can ho toa nha ban quan tri pccc bat buoc' },

  { ten: 'BH Hỏa Hoạn & Rủi Ro Đặc Biệt', url: '/bao-hiem-hoa-hoan', the: '',
    mo: 'Hỏa hoạn, lũ lụt, sét đánh, bão, động đất.',
    tim: 'hoa hoan rui ro dac biet chay lu lut set bao dong dat nha xuong' },

  { ten: 'BH Mọi Rủi Ro Tài Sản', url: '/bao-hiem-moi-rui-ro', the: '',
    mo: 'Phạm vi rộng nhất cho tài sản doanh nghiệp trong một hợp đồng.',
    tim: 'moi rui ro tai san doanh nghiep nha may kho xuong may moc' },

  { ten: 'BH Rủi Ro Xây Dựng', url: '/bao-hiem-xay-dung', the: '',
    mo: 'Công trình, thiết bị và trách nhiệm bên thứ ba khi thi công.',
    tim: 'xay dung cong trinh thi cong lap dat nha thau car ear' },

  { ten: 'BH Xây Dựng Nhà Ở', url: '/bao-hiem-xay-dung-nha-o', the: 'MỚI',
    mo: 'Nhà ở riêng lẻ: bảo vệ công trình đang xây và trách nhiệm bên thứ ba.',
    tim: 'xay dung nha o nha rieng le xay nha chu nha cong trinh nha dan' },

  { ten: 'BH Trách Nhiệm Chung', url: '/bao-hiem-tnc', the: '',
    mo: 'Trách nhiệm dân sự phát sinh trong hoạt động kinh doanh.',
    tim: 'trach nhiem chung tnc dan su doanh nghiep' },

  { ten: 'BH Trách Nhiệm Công Cộng', url: '/bao-hiem-tncc', the: '',
    mo: 'Thiệt hại thân thể, tài sản bên thứ ba trong khu vực kinh doanh.',
    tim: 'trach nhiem cong cong tncc khach hang nga trong quan cua hang' },

  { ten: 'BH TNN Nghề Nghiệp – Khám Chữa Bệnh', url: '/bao-hiem-tnn-kcb', the: '',
    mo: 'Dành cho cơ sở khám chữa bệnh, bác sĩ, chuyên gia y tế.',
    tim: 'trach nhiem nghe nghiep kcb bac si phong kham benh vien y te' },

  { ten: 'BH TNN Nghề Nghiệp – Luật Sư & Công Chứng', url: '/bao-hiem-tnn-ls', the: '',
    mo: 'Rủi ro nghề nghiệp cho luật sư, công chứng viên.',
    tim: 'trach nhiem nghe nghiep luat su cong chung vien phap ly van phong' },

  { ten: 'BH TNN Nghề Nghiệp – Tư Vấn Thiết Kế & Giám Sát', url: '/bao-hiem-tnn-tvtk', the: '',
    mo: 'Tư vấn thiết kế, giám sát thi công, quản lý dự án.',
    tim: 'trach nhiem nghe nghiep tu van thiet ke giam sat kien truc su ky su' },

  { ten: 'BH Du Lịch Nội Địa', url: '/bao-hiem-du-lich-noi-dia', the: 'HOT',
    mo: 'Tai nạn, y tế và hành lý khi du lịch trong nước.',
    tim: 'du lich noi dia trong nuoc tour doan hanh ly tai nan' },

  { ten: 'BH Du Lịch Quốc Tế', url: '/bao-hiem-du-lich-quoc-te', the: 'HOT',
    mo: 'Hỗ trợ xin visa Schengen, Mỹ, Úc. Chi trả viện phí, hồi hương.',
    tim: 'du lich quoc te visa schengen chau au my uc nhat han quoc dai loan 30000 eur' },

  { ten: 'BH Bệnh Nhiệt Đới', url: '/bao-hiem-benh-nhiet-doi', the: 'MỚI',
    mo: 'Sốt xuất huyết, cúm, tay chân miệng, thủy đậu, sởi.',
    tim: 'benh nhiet doi sot xuat huyet cum tay chan mieng thuy dau soi' },

  { ten: 'BH Sức Khỏe DBVCare', url: '/bao-hiem-suc-khoe', the: 'HOT',
    mo: 'Nội trú, ngoại trú và nha khoa cho cá nhân và doanh nghiệp.',
    tim: 'suc khoe y te dbvcare noi tru ngoai tru nha khoa kham benh bao lanh vien phi' },

  { ten: 'BH Tai Nạn 24 Giờ', url: '/bao-hiem-tai-nan', the: '',
    mo: 'Tử vong, thương tật vĩnh viễn, chi phí y tế do tai nạn.',
    tim: 'tai nan 24 gio 24/24 con nguoi thuong tat tu vong nguoi lao dong' }
];

/* ========================================================================== */
/*  Từ đây trở xuống không cần sửa                                            */
/* ========================================================================== */
(function () {
  'use strict';

  var GOI_Y = ['Ô tô', 'Xe máy', 'Cháy nổ', 'Du lịch', 'Sức khỏe', 'Xe điện'];

  /* Bỏ dấu tiếng Việt để gõ kiểu nào cũng tìm ra */
  function boDau(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Chuẩn bị sẵn chuỗi tìm kiếm cho từng sản phẩm */
  var CHISO = DBV_SANPHAM.map(function (s) {
    return {
      sp: s,
      khoa: boDau(s.ten + ' ' + s.mo + ' ' + (s.tim || '') + ' ' + s.url.replace(/-/g, ' '))
    };
  });

  function timKiem(tuKhoa) {
    var q = boDau(tuKhoa);
    if (!q) return [];
    var tu = q.split(' ').filter(Boolean);
    var kq = [];
    CHISO.forEach(function (m) {
      var diem = 0, khop = true;
      tu.forEach(function (t) {
        var i = m.khoa.indexOf(t);
        if (i === -1) { khop = false; return; }
        diem += 10;
        if (boDau(m.sp.ten).indexOf(t) !== -1) diem += 20;   // khớp ở tên thì ưu tiên
        if (i === 0) diem += 5;
      });
      if (khop) kq.push({ sp: m.sp, diem: diem });
    });
    kq.sort(function (a, b) { return b.diem - a.diem; });
    return kq.map(function (k) { return k.sp; });
  }

  function thoat(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toDam(vanBan, tuKhoa) {
    var an = thoat(vanBan);
    var tu = boDau(tuKhoa).split(' ').filter(function (t) { return t.length > 1; });
    if (!tu.length) return an;
    var khongDau = boDau(vanBan);
    var danh = new Array(an.length).fill(false);
    tu.forEach(function (t) {
      var i = khongDau.indexOf(t);
      while (i !== -1) {
        for (var j = i; j < i + t.length && j < danh.length; j++) danh[j] = true;
        i = khongDau.indexOf(t, i + t.length);
      }
    });
    // chỉ tô khi độ dài hai chuỗi khớp nhau, tránh lệch vị trí do ký tự đặc biệt
    if (khongDau.length !== vanBan.length || an.length !== vanBan.length) return an;
    var ra = '', dangTo = false;
    for (var k = 0; k < vanBan.length; k++) {
      if (danh[k] && !dangTo) { ra += '<mark>'; dangTo = true; }
      if (!danh[k] && dangTo) { ra += '</mark>'; dangTo = false; }
      ra += thoat(vanBan[k]);
    }
    if (dangTo) ra += '</mark>';
    return ra;
  }

  function lopThe(the) {
    if (the === 'HOT') return 'hot';
    if (the === 'MỚI') return 'moi';
    if (the === 'BẮT BUỘC') return 'batbuoc';
    return '';
  }

  function veMuc(sp, tuKhoa) {
    return '<a class="dbv-search-muc" href="' + thoat(sp.url) + '">' +
      '<span style="flex:1;min-width:0">' +
        '<span class="dbv-search-muc-ten">' + toDam(sp.ten, tuKhoa) + '</span>' +
        '<span class="dbv-search-muc-mo" style="display:block">' + thoat(sp.mo) + '</span>' +
      '</span>' +
      (sp.the ? '<span class="dbv-search-the ' + lopThe(sp.the) + '">' + thoat(sp.the) + '</span>' : '') +
    '</a>';
  }

  /* ---------------------------------------------------------------- dựng DOM */
  var lop, o, than, daDung = false;

  function dungLopPhu() {
    if (daDung) return;
    daDung = true;

    lop = document.createElement('div');
    lop.className = 'dbv-search-lop';
    lop.setAttribute('role', 'dialog');
    lop.setAttribute('aria-modal', 'true');
    lop.setAttribute('aria-label', 'Tìm kiếm sản phẩm bảo hiểm');
    lop.innerHTML =
      '<div class="dbv-search-thanh">' +
        '<input class="dbv-search-o" type="search" inputmode="search" autocomplete="off" ' +
               'placeholder="Tìm sản phẩm bảo hiểm..." aria-label="Nhập từ khóa tìm sản phẩm">' +
        '<button class="dbv-search-dong" type="button" aria-label="Đóng tìm kiếm">Đóng</button>' +
      '</div>' +
      '<div class="dbv-search-than" aria-live="polite"></div>';
    document.body.appendChild(lop);

    o = lop.querySelector('.dbv-search-o');
    than = lop.querySelector('.dbv-search-than');

    lop.querySelector('.dbv-search-dong').addEventListener('click', dong);
    o.addEventListener('input', function () { ve(o.value); });
    o.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') dong();
      if (e.key === 'Enter') {
        var dau = than.querySelector('.dbv-search-muc');
        if (dau) { ghiNhanTim(o.value, true); location.href = dau.getAttribute('href'); }
      }
    });
    than.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.dbv-search-chip') : null;
      if (chip) { o.value = chip.textContent.trim(); ve(o.value); o.focus(); return; }
      var muc = e.target.closest ? e.target.closest('.dbv-search-muc') : null;
      if (muc) ghiNhanTim(o.value, true);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lop.classList.contains('mo')) dong();
    });
  }

  function ve(tuKhoa) {
    var q = String(tuKhoa || '').trim();

    if (!q) {
      var hot = DBV_SANPHAM.filter(function (s) { return s.the === 'HOT' || s.the === 'MỚI'; });
      than.innerHTML =
        '<div class="dbv-search-nhan">Tìm nhanh</div>' +
        '<div class="dbv-search-goiy">' +
          GOI_Y.map(function (g) {
            return '<button class="dbv-search-chip" type="button">' + thoat(g) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="dbv-search-nhan">Sản phẩm được quan tâm</div>' +
        '<div class="dbv-search-mucs">' + hot.map(function (s) { return veMuc(s, ''); }).join('') + '</div>';
      return;
    }

    var kq = timKiem(q);
    if (!kq.length) {
      than.innerHTML =
        '<div class="dbv-search-trong">' +
          'Không tìm thấy sản phẩm nào khớp với <strong>"' + thoat(q) + '"</strong>.<br>' +
          'Bạn thử từ khóa ngắn hơn, hoặc gọi <a href="tel:0869656561">0869 656 561</a> để được tư vấn trực tiếp.' +
        '</div>' +
        '<div class="dbv-search-goiy" style="justify-content:center">' +
          GOI_Y.map(function (g) {
            return '<button class="dbv-search-chip" type="button">' + thoat(g) + '</button>';
          }).join('') +
        '</div>';
      ghiNhanTim(q, false);
      return;
    }

    than.innerHTML =
      '<div class="dbv-search-nhan">' + kq.length + ' sản phẩm phù hợp</div>' +
      '<div class="dbv-search-mucs">' + kq.map(function (s) { return veMuc(s, q); }).join('') + '</div>';
  }

  /* Gửi từ khóa về GA4 — biết khách đang tìm gì mà site chưa có là dữ liệu rất quý */
  var hen = null, daGui = '';
  function ghiNhanTim(tuKhoa, ngay) {
    var q = String(tuKhoa || '').trim();
    if (!q || q.length < 2 || q === daGui) return;
    clearTimeout(hen);
    var gui = function () {
      daGui = q;
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'search', {
          search_term: q,
          so_ket_qua: timKiem(q).length,
          trang: location.pathname
        });
      }
    };
    ngay ? gui() : (hen = setTimeout(gui, 1200));
  }

  function mo() {
    dungLopPhu();
    ve('');
    lop.classList.add('mo');
    document.body.classList.add('dbv-khoa-cuon');
    setTimeout(function () { o.focus(); }, 60);
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'mo_tim_kiem', { trang: location.pathname });
    }
  }

  function dong() {
    if (!lop) return;
    lop.classList.remove('mo');
    document.body.classList.remove('dbv-khoa-cuon');
    o.value = '';
  }

  /* ------------------------------------------------- chèn nút vào header */
  function chenNut() {
    var khu = document.querySelector('.hdr-actions');
    if (!khu || khu.querySelector('.dbv-btn-search')) return;

    var nut = document.createElement('button');
    nut.className = 'dbv-btn-search';
    nut.type = 'button';
    nut.setAttribute('aria-label', 'Tìm kiếm sản phẩm');
    nut.innerHTML =
      '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>';
    nut.addEventListener('click', mo);

    // đặt bên TRÁI nút menu
    var menu = khu.querySelector('.hdr-cat-wrap');
    if (menu) khu.insertBefore(nut, menu);
    else khu.insertBefore(nut, khu.firstChild);

    // nhãn cho nút menu (trước đây chỉ là icon, không có mô tả cho trình đọc màn hình)
    var btnMenu = khu.querySelector('.btn-catalog-hdr');
    if (btnMenu && !btnMenu.getAttribute('aria-label')) {
      btnMenu.setAttribute('aria-label', 'Mở menu điều hướng');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', chenNut);
  } else {
    chenNut();
  }

  window.DBV = window.DBV || {};
  window.DBV.moTimKiem = mo;
  window.DBV.dongTimKiem = dong;
})();
