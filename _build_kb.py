# -*- coding: utf-8 -*-
"""Sinh kiến thức nền cho chatbot từ chính nội dung website.

Chatbot bảo hiểm mà tự nghĩ ra phạm vi bảo hiểm hay mức phí là nguy hiểm thật —
khách đọc xong tưởng được bồi thường, đến lúc xảy ra chuyện mới biết không.
Vì vậy toàn bộ kiến thức phải rút từ trang thật, và chỉ dẫn hệ thống buộc mô
hình chỉ được trả lời trong phạm vi đó.

Chạy lại mỗi khi nội dung site thay đổi:
    python _build_kb.py
"""
import re, json, glob, os, html as ihtml

def text_of(html_str):
    b = html_str[html_str.find('<body'):] if '<body' in html_str else html_str
    for tag in ('script', 'style', 'header', 'footer', 'svg', 'noscript'):
        b = re.sub(r'<%s.*?</%s>' % (tag, tag), ' ', b, flags=re.DOTALL | re.I)
    b = re.sub(r'<!--.*?-->', ' ', b, flags=re.DOTALL)
    t = ihtml.unescape(re.sub(r'<[^>]+>', ' ', b))
    return re.sub(r'\s+', ' ', t).strip()

def meta(html_str, name):
    m = re.search(r'<meta[^>]+name="%s"[^>]+content="([^"]*)"' % name, html_str, re.I)
    return ihtml.unescape(m.group(1)).strip() if m else ''

def title(html_str):
    m = re.search(r'<title>(.*?)</title>', html_str, re.DOTALL)
    return re.sub(r'\s*\|\s*DBV247\s*$', '', ihtml.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()) if m else ''

SKIP = {'google067cc8913a387cda.html', 'index-test.html',
        'bao-hiem-du-lich-quoc-te-demo.html', 'servicemap.html'}

# ── Thông tin doanh nghiệp (cố định, lấy từ trang chủ và ve-dbv) ────────────
COMPANY = """
DBV247 là kênh tư vấn và cấp đơn bảo hiểm trực tuyến của Công ty Cổ phần Tập đoàn
Bảo hiểm DBV — Chi nhánh Thành Đô.

- Giấy phép Bộ Tài chính số 49/GD/KDBH
- Mã số thuế chi nhánh: 0102737963-059
- Địa chỉ: BT20-C37, TDP 20, Phường Thanh Xuân, TP Hà Nội
- Hotline tư vấn: 0869 656 561 (cũng là số Zalo)
- Hotline bồi thường 24/7: 1900 969 690
- Email: dbvi247@gmail.com
- Website: https://dbv247.com.vn

Lịch sử: thành lập năm 2008 với tên Tổng Công ty Cổ phần Bảo hiểm Hàng không (VNI).
Năm 2024 DB Insurance (Hàn Quốc) trở thành cổ đông chiến lược nắm 75% vốn điều lệ.
Ngày 06/05/2025 Bộ Tài chính ban hành Quyết định 49/GPDC43/KDBH cho phép đổi tên
thành Công ty Cổ phần Tập đoàn Bảo hiểm DBV. Mã chứng khoán: AIC.
Ba tên gọi "bảo hiểm DBV", "bảo hiểm VNI", "Bảo hiểm Hàng không" là cùng một
doanh nghiệp qua các giai đoạn.

Quy mô: trên 18 năm hoạt động, hơn 2 triệu khách hàng, trên 20 sản phẩm,
98% tỷ lệ hồ sơ bồi thường giải quyết thành công, hơn 1.500 gara liên kết toàn quốc.

Quy tắc và biểu phí đang áp dụng:
- QĐ 905A/2025/QĐ-DBV: Quy tắc Bảo hiểm kết hợp xe ô tô
- QĐ 219/2026/QĐ-DBV: Biểu phí bảo hiểm xe ô tô (gồm cả xe điện)
- QĐ 418/2025/QĐ-DBV ngày 27/05/2025: Quy tắc bảo hiểm bưu gửi
- Nghị định 67/2023/NĐ-CP: biểu phí TNDS bắt buộc (Phụ lục I)

Thời gian bồi thường:
- Vật chất xe cơ giới: 5–7 ngày làm việc, cam kết thanh toán trong 30 ngày kể từ
  khi nhận đủ hồ sơ hợp lệ
- Sức khỏe, tai nạn cá nhân: 5–15 ngày làm việc
- Trường hợp cần xác minh thêm: tối đa 45 ngày
- Khách phải thông báo sự cố trong vòng 24 giờ

Nộp hồ sơ bồi thường sức khỏe: cổng điện tử ebhhk.vn hoặc trực tiếp tại văn phòng.

Biểu phí TNDS bắt buộc ô tô không kinh doanh vận tải (đã gồm VAT):
- Dưới 6 chỗ: 480.700 đồng/năm
- 6 đến 11 chỗ: 873.400 đồng/năm
- 12 đến 24 chỗ: 1.397.000 đồng/năm
- Trên 24 chỗ: 2.007.500 đồng/năm
- Pickup/Minivan: 480.700 đồng/năm
- Xe tập lái: 120% phí xe cùng loại

Phí bảo hiểm vật chất ô tô: tính theo tỷ lệ phần trăm giá trị xe, khởi điểm từ
1,0%/năm. Mức chính xác phụ thuộc dòng xe, năm sản xuất, mục đích sử dụng,
mức khấu trừ và lịch sử bồi thường — phải để tư vấn viên báo giá.
""".strip()

pages = []
for f in sorted(glob.glob('*.html') + glob.glob('tin-tuc/*.html')):
    name = os.path.basename(f)
    if name in SKIP or f.startswith('admin'):
        continue
    c = open(f, encoding='utf-8', errors='ignore').read()
    t = title(c)
    d = meta(c, 'description')
    if not t:
        continue

    url = '/' + f.replace('.html', '')
    if f == 'index.html':
        url = '/'

    body = text_of(c)
    # Bỏ phần lặp lại của header/footer đã bị strip hụt
    body = re.sub(r'Trang chủ\s*[›/]\s*', '', body)

    entry = {'url': url, 'title': t, 'desc': d}
    # Với trang sản phẩm và bài viết, giữ thêm phần thân để trả lời chi tiết
    if f.startswith('bao-hiem-') or f.startswith('tin-tuc/') or f in ('boi-thuong.html', 've-dbv.html'):
        entry['content'] = body[:2600]
    pages.append(entry)

kb = {'company': COMPANY, 'pages': pages}

# Ghi thành module CommonJS để Netlify Function nạp trực tiếp. Nếu để dạng
# .json rồi đọc bằng fs thì phải khai báo included_files trong netlify.toml,
# require() một file .js thì bundler tự gói kèm, đỡ một chỗ dễ quên.
out = 'netlify/functions/kb-data.js'
os.makedirs('netlify/functions', exist_ok=True)
with open(out, 'w', encoding='utf-8') as fh:
    fh.write('// TỆP SINH TỰ ĐỘNG — đừng sửa tay.\n')
    fh.write('// Chạy lại: python _build_kb.py  (sau mỗi lần đổi nội dung trang)\n')
    fh.write('module.exports = ')
    json.dump(kb, fh, ensure_ascii=False, indent=1)
    fh.write(';\n')

size = os.path.getsize(out)
core = len(COMPANY) + sum(len(p['title']) + len(p['desc']) for p in pages)
print('Da ghi %s' % out)
print('  So trang        : %d' % len(pages))
print('  Co noi dung     : %d' % sum(1 for p in pages if p.get('content')))
print('  Tong kich thuoc : %.0f KB' % (size / 1024))
print('  Phan luon gui   : ~%d token (cong ty + danh muc trang)' % (core // 3))
print('  Phan noi dung se duoc loc theo cau hoi, khong gui het.')
