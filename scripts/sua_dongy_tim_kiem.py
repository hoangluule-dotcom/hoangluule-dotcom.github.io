import sys
p=sys.argv[1]; s=open(p,encoding='utf-8',newline='').read()
a="""    nut.forEach(function (b) {
      var khoi = timKhoiForm(b) || b.parentNode;"""
b="""    nut.forEach(function (b) {
      /* (30/09/2026) Bỏ qua ô tìm kiếm — không gửi thông tin cá nhân nên
         không cần thông báo đồng ý (trước đây dòng này hiện dưới ô tìm kiếm
         ở trang chủ, danh mục sản phẩm, tin tức, mạng lưới). Bỏ qua cả form đã
         có ô tích "đồng ý" riêng, tránh hiện hai lần. */
      var f = b.form || (b.closest ? b.closest('form') : null);
      if (f && (f.getAttribute('role') === 'search' ||
                f.querySelector('input[type="search"]'))) return;
      if (f && f.querySelector('input[type="checkbox"]') &&
          /đồng ý/i.test(f.textContent || '')) return;
      var khoi = timKhoiForm(b) || b.parentNode;"""
assert s.count(a)==1; s=s.replace(a,b); open(p,'w',encoding='utf-8',newline='').write(s); print('ok')
