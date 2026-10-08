# -*- coding: utf-8 -*-
"""Kho kiến thức cho chatbot DBV247 — dựng từ TOÀN BỘ trang web + kien-thuc/hoi-dap.md.

Bản 2 (08/10/2026). Khác bản cũ:
  - Đọc mọi trang (sản phẩm, TNDS, công cụ, tin tức...), không chỉ bao-hiem-*.
  - KHÔNG cắt cụt 2.600 ký tự nữa: mỗi trang được chia thành ĐOẠN theo tiêu đề
    (h2/h3), mỗi đoạn ~300–1.400 ký tự. Bot chỉ lấy vài đoạn khớp câu hỏi.
  - Thêm kien-thuc/hoi-dap.md: câu hỏi–trả lời do DBV247 tự viết, ưu tiên cao nhất.
    (Netlify chặn mọi tệp .md trên internet nên tệp này không bị lộ.)

Netlify tự chạy script này mỗi lần deploy (xem build.command trong netlify.toml).
Chạy tay:  python3 scripts/build_kb.py      (trong thư mục netlify_upload)

Vì sao phải chặt chẽ: chatbot bảo hiểm mà tự nghĩ ra phạm vi bảo hiểm hay mức phí là
nguy hiểm thật. Toàn bộ kiến thức phải rút từ trang thật hoặc hoi-dap.md.
"""
import re, json, glob, os, html as ihtml, argparse

_ap = argparse.ArgumentParser()
_ap.add_argument('--root', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
_root = os.path.abspath(_ap.parse_args().root)
if not os.path.isfile(os.path.join(_root, 'index.html')):
    raise SystemExit('Khong thay index.html trong: ' + _root)
os.chdir(_root)

MIN_DOAN, MAX_DOAN = 300, 1400

SKIP = {'google067cc8913a387cda.html', 'index-test.html', 'bao-hiem-du-lich-quoc-te-demo.html',
        'servicemap.html', '404.html', 'ctv-dashboard.html'}
SKIP_DIRS = ('admin', 'sao-luu', 'node_modules', 'scripts', 'supabase', 'apps-script', '_')

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

Phí bảo hiểm vật chất ô tô: tính theo biểu phí QĐ 219/2026/QĐ-DBV, phụ thuộc giá trị
xe, tuổi xe, mục đích sử dụng và các điều khoản bổ sung; phí tối thiểu 6.000.000đ/xe.
Ước tính bằng công cụ tính phí; phí chính thức do tư vấn viên báo sau khi xem hồ sơ xe.
""".strip()

def bo_the(b):
    for tag in ('script', 'style', 'header', 'footer', 'nav', 'svg', 'noscript', 'template', 'select', 'button'):
        b = re.sub(r'<%s\b.*?</%s>' % (tag, tag), ' ', b, flags=re.DOTALL | re.I)
    b = re.sub(r'<!--.*?-->', ' ', b, flags=re.DOTALL)
    # các khối ẩn dùng cho Netlify Forms
    b = re.sub(r'<form[^>]*\bhidden\b[^>]*>.*?</form>', ' ', b, flags=re.DOTALL | re.I)
    return b

def chu(h):
    t = ihtml.unescape(re.sub(r'<[^>]+>', ' ', h))
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'Trang chủ\s*[›/]\s*', '', t)
    return t

def meta(s, name):
    m = re.search(r'<meta[^>]+name="%s"[^>]+content="([^"]*)"' % name, s, re.I)
    return ihtml.unescape(m.group(1)).strip() if m else ''

def tieu_de(s):
    m = re.search(r'<title>(.*?)</title>', s, re.DOTALL)
    if not m: return ''
    t = ihtml.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
    return re.sub(r'\s*[|–-]\s*(DBV247|DBV Insurance|DBV Thành Đô)\s*$', '', t)

def cat_cau(t, gioi_han):
    """Cắt đoạn dài theo ranh giới câu."""
    out, cur = [], ''
    for c in re.split(r'(?<=[.!?;:])\s+', t):
        if len(cur) + len(c) + 1 > gioi_han and len(cur) >= MIN_DOAN:
            out.append(cur.strip()); cur = c
        else:
            cur = (cur + ' ' + c) if cur else c
    if cur.strip(): out.append(cur.strip())
    return out

def chia_doan(body_html):
    """Chia thân trang theo h1/h2/h3 → [(tiêu đề mục, chữ)]."""
    parts = re.split(r'(<h[1-3][^>]*>.*?</h[1-3]>)', body_html, flags=re.DOTALL | re.I)
    muc, head, buf = [], '', []
    for p in parts:
        if re.match(r'<h[1-3]', p, re.I):
            if buf: muc.append((head, chu(' '.join(buf))))
            head, buf = chu(p), []
        else:
            buf.append(p)
    if buf: muc.append((head, chu(' '.join(buf))))
    # gộp mục quá ngắn vào mục sau, cắt mục quá dài
    doan, ton = [], None
    for h, t in muc:
        if not t and not h: continue
        if ton:
            h = ton[0] + ' › ' + h if h else ton[0]
            t = ton[1] + ' ' + t
            ton = None
        if len(t) < MIN_DOAN:
            ton = (h, t); continue
        for i, x in enumerate(cat_cau(t, MAX_DOAN)):
            doan.append((h + (' (tiếp)' if i else ''), x))
    if ton and ton[1].strip():
        if doan and len(doan[-1][1]) + len(ton[1]) < MAX_DOAN + 400:
            doan[-1] = (doan[-1][0], doan[-1][1] + ' ' + ton[0] + ': ' + ton[1])
        else:
            doan.append(ton)
    return doan

pages, chunks = [], []

def la_san_pham(f):
    return bool(re.match(r'(bao-hiem-|tnds-|cap-don|tinh-phi|boi-thuong|san-pham|ve-dbv|cong-tac-vien|hop-tac)', f))

files = sorted(glob.glob('*.html') + glob.glob('tin-tuc/*.html'))
for f in files:
    name = os.path.basename(f)
    if name in SKIP or f.startswith(SKIP_DIRS):
        continue
    s = open(f, encoding='utf-8', errors='ignore').read()
    if re.search(r'<meta[^>]+name="robots"[^>]+noindex', s, re.I):
        continue
    t = tieu_de(s)
    if not t:
        continue
    url = '/' if f == 'index.html' else '/' + f[:-5]
    d = meta(s, 'description')
    pages.append({'url': url, 'title': t, 'desc': d, 'sp': 1 if la_san_pham(f) else 0})
    body = s[s.find('<body'):] if '<body' in s else s
    if url in ('/tin-tuc', '/san-pham'):
        continue  # trang danh sách: chỉ toàn tiêu đề bài khác, gây nhiễu khi tìm
    for h, x in chia_doan(bo_the(body)):
        if len(x) < 60:
            continue
        # khối "bài viết liên quan / tìm hiểu thêm": lặp tiêu đề bài khác, không có nội dung thật
        if re.search(r'(Bài viết liên quan|Tìm hiểu thêm|Đọc thêm|Có thể bạn quan tâm|Nhận Tư Vấn|Nhận tư vấn)', h, re.I) \
                or x.count('Đọc bài viết') >= 2:
            continue
        chunks.append({'u': url, 'h': h[:160], 'x': x})

# ── Hỏi–đáp tự viết: "## Câu hỏi" rồi câu trả lời ──
HD = 'kien-thuc/hoi-dap.md'
so_hd = 0
if os.path.isfile(HD):
    md = open(HD, encoding='utf-8').read()
    for blk in re.split(r'^##\s+', md, flags=re.M)[1:]:
        dong = blk.strip().split('\n', 1)
        hoi = dong[0].strip()
        dap = re.sub(r'\s+', ' ', dong[1]).strip() if len(dong) > 1 else ''
        if hoi and dap:
            chunks.append({'u': '#hoi-dap', 'h': hoi, 'x': dap, 'hd': 1})
            so_hd += 1

kb = {'company': COMPANY, 'pages': pages, 'chunks': chunks,
      'built': __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}

out = 'netlify/functions/kb-data.js'
with open(out, 'w', encoding='utf-8') as fh:
    fh.write('// TỆP SINH TỰ ĐỘNG — đừng sửa tay. Nguồn: scripts/build_kb.py (Netlify chạy mỗi lần deploy)\n')
    fh.write('module.exports = ')
    json.dump(kb, fh, ensure_ascii=False, separators=(',', ':'))
    fh.write(';\n')

print('Kho kien thuc: %d trang, %d doan (%d hoi-dap), %.0f KB -> %s' % (
    len(pages), len(chunks), so_hd, os.path.getsize(out) / 1024, out))
