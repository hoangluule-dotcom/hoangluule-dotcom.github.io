#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Đồng bộ layout dùng chung cho website DBV247.

Lấy index.html làm bản chuẩn, sao chép các khối dùng chung sang mọi trang HTML
khác: header, footer, floating CTA (desktop), thanh CTA dưới (mobile), CSS của
các khối đó, mã GTM, và script sửa link Zalo/Messenger trên di động.

Vì sao cần: site là HTML tĩnh, mỗi trang chứa một bản sao của header/footer.
Sửa tay từng file thì sớm muộn cũng sót — nhất là các thư mục con như tin-tuc/.

Cách dùng:
    python sync_layout.py --root <thư-mục-site>            # chỉ kiểm tra, không ghi
    python sync_layout.py --root <thư-mục-site> --write    # ghi thay đổi
    python sync_layout.py --root <thư-mục-site> --write --only tin-tuc/bai-moi.html
"""

import argparse
import os
import re
import sys

# ── Cấu hình ────────────────────────────────────────────────────────────────

SOURCE_FILE = 'index.html'

# Không đụng vào: trang xác minh Google, bản nháp, trang quản trị nội bộ
SKIP_NAMES = {
    'google067cc8913a387cda.html',
    'index-test.html',
    'bao-hiem-du-lich-quoc-te-demo.html',
}
SKIP_DIRS = {'admin', 'node_modules', 'Originals', '_skill-build'}

# Các khối HTML được đồng bộ.
# ('tag', tên_thẻ, class)  — thẻ không lồng nhau được, dùng regex là đủ
# ('div', class)           — div lồng nhau nên phải đếm độ sâu, regex sẽ khớp nhầm
# Cột cuối là vị trí chèn khi trang chưa có khối đó:
#   'top'    — ngay sau <body>, vì header phải nằm đầu trang
#   'bottom' — trước </body>
BLOCKS = [
    ('header',   ('tag', 'header', 'hdr'), 'Header',           'top'),
    ('footer',   ('tag', 'footer', 'ftr'), 'Footer',           'bottom'),
    ('floatcta', ('div', 'float-cta'),     'Floating CTA',     'bottom'),
    ('mobbar',   ('div', 'mob-bar'),       'Thanh CTA mobile', 'bottom'),
]

# Tiền tố class thuộc layout — dùng để lọc CSS cần mang theo
CSS_PREFIX = re.compile(
    r'\.(?:hdr|ftr|float-(?:cta|btn)|mob-(?:bar|call|zalo|messenger)'
    r'|btn-(?:catalog-hdr|cat-text|login|consult-hdr)|cat-(?:dropdown|dd-))'
)

# Quy tắc KHÔNG được đồng bộ vì phụ thuộc ngữ cảnh từng trang.
#
# Trang chủ có header trong suốt, position:fixed, nổi đè lên ảnh banner —
# đó là chủ ý thiết kế vì banner được canh sẵn cho phần header phủ lên.
# Trang con thì nội dung bắt đầu ngay từ đầu trang, cần header nền đặc và
# position:sticky để đẩy nội dung xuống. Bê nguyên quy tắc của trang chủ sang
# sẽ khiến chữ trên header đè lên chữ của trang.
#
# Phần tạo dáng (font, khoảng cách, màu chữ, dropdown) vẫn được đồng bộ bình
# thường — chỉ riêng nền và cách định vị của khối .hdr là để mỗi trang tự lo.
CSS_EXCLUDE = {'.hdr', '.hdr.scrolled'}

CSS_OPEN = '<style id="dbv-layout">'
CSS_CLOSE = '</style>'
JS_OPEN = '<script id="dbv-layout-js">'
JS_CLOSE = '</script>'

# Hàm phụ trợ cho header (mở/đóng dropdown, đổi nền khi cuộn).
# Nằm cạnh script này trong assets/ vì logic ổn định, không lấy từ index.html.
LAYOUT_JS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              '..', 'assets', 'layout.js')

# Khung chat tư vấn. Chỉ là 1 thẻ script — toàn bộ CSS và HTML do file
# assets/dbv-chatbot.js tự chèn, nên trang mới thêm chỉ cần dòng này.
CHATBOT_ID = 'id="dbv-chatbot"'
CHATBOT_TAG = '<script id="dbv-chatbot" src="/assets/dbv-chatbot.js" defer></script>'

GTM_RE     = re.compile(r'<!-- Google Tag Manager -->.*?<!-- End Google Tag Manager -->', re.DOTALL)
GTM_NS_RE  = re.compile(r'<!-- Google Tag Manager \(noscript\) -->.*?<!-- End Google Tag Manager \(noscript\) -->', re.DOTALL)
APPLINK_RE = re.compile(r'<script>\s*/\* dbv-applink-fix.*?</script>', re.DOTALL)

# Trang nào thì mục menu nào sáng lên
ACTIVE_RULES = [
    (re.compile(r'^cong-tac-vien-dai-ly'),   '/cong-tac-vien-dai-ly'),
    (re.compile(r'^tin-tuc'),                '/tin-tuc'),
    (re.compile(r'^boi-thuong'),             '/boi-thuong'),
    (re.compile(r'^servicemap'),             '/servicemap'),
    (re.compile(r'^(?:san-pham|bao-hiem-)'), '/san-pham'),
]

# Ảnh dùng đường dẫn tương đối — cần thêm ../ khi trang nằm trong thư mục con
RELATIVE_ASSETS = re.compile(
    r'(src=")(?!https?:|/|\.\./|data:)([^"]+\.(?:webp|png|jpg|jpeg|svg|ico))(")')


# ── Tiện ích ────────────────────────────────────────────────────────────────

def read(path):
    with open(path, encoding='utf-8', errors='ignore') as f:
        return f.read()


def write_file(path, text):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def target_files(root, only=None):
    if only:
        return [os.path.join(root, p) for p in only]
    src_abs = os.path.abspath(os.path.join(root, SOURCE_FILE))
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith('.')]
        for fn in sorted(filenames):
            if not fn.endswith('.html') or fn in SKIP_NAMES:
                continue
            full = os.path.join(dirpath, fn)
            if os.path.abspath(full) == src_abs:
                continue
            out.append(full)
    return sorted(out)


def depth_of(root, path):
    return os.path.relpath(path, root).replace('\\', '/').count('/')


def find_block(html, spec):
    """Tìm vị trí một khối layout, trả về (đầu, cuối) hoặc None.

    Với <div> phải đếm độ sâu thẻ lồng nhau. Dùng regex kiểu `.*?</div>` sẽ
    dừng ở thẻ đóng đầu tiên (sai khi div có con), còn `.*</div>` thì nuốt
    tới thẻ đóng cuối trang — cả hai đều phá cấu trúc file.
    """
    if spec[0] == 'tag':
        _, tag, cls = spec
        m = re.search(r'<%s class="%s"[^>]*>.*?</%s>' % (tag, re.escape(cls), tag),
                      html, re.DOTALL)
        return (m.start(), m.end()) if m else None

    _, cls = spec
    m = re.search(r'<div class="%s"[^>]*>' % re.escape(cls), html)
    if not m:
        return None
    pos, depth = m.end(), 1
    scanner = re.compile(r'<div\b|</div>')
    while depth > 0:
        t = scanner.search(html, pos)
        if not t:
            return None          # HTML hỏng — bỏ qua còn hơn ghi đè bừa
        depth += -1 if t.group(0) == '</div>' else 1
        pos = t.end()
    return (m.start(), pos)


# ── Trích xuất từ bản chuẩn ─────────────────────────────────────────────────

def extract_css_vars(src):
    """Đọc :root để lấy giá trị dự phòng cho biến màu."""
    m = re.search(r':root\s*\{(.*?)\}', src, re.DOTALL)
    return dict(re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', m.group(1))) if m else {}


def split_rules(css):
    """Tách CSS thành danh sách khối top-level, giữ nguyên @media."""
    rules, buf, depth = [], '', 0
    for ch in css:
        buf += ch
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                rules.append(buf.strip())
                buf = ''
    if buf.strip():
        rules.append(buf.strip())
    return rules


def is_layout_rule(rule):
    # Chú thích /* ... */ đứng trước thường dính liền vào selector khi tách khối,
    # nên phải gỡ ra trước khi đối chiếu, không thì phép loại trừ trượt hết.
    sel = re.sub(r'/\*.*?\*/', '', rule.split('{', 1)[0], flags=re.DOTALL).strip()
    if sel in CSS_EXCLUDE:
        return False
    return bool(CSS_PREFIX.search(sel))


# Giá trị mặc định an toàn cho trang mới chưa tự khai báo .hdr.
# Dùng :where() để độ ưu tiên bằng 0 — bất kỳ quy tắc .hdr nào của trang cũng
# thắng được, nên đây chỉ là lưới an toàn, không phải thứ áp đặt.
SAFE_DEFAULTS = (
    ':where(.hdr){background:#fff;position:sticky;top:0;z-index:300;'
    'border-bottom:1px solid var(--bd,#E2E8F0)}'
)


def extract_layout_css(src, css_vars):
    """Gom CSS của các khối layout, thêm giá trị dự phòng cho biến màu.

    Trang tin tức có bảng biến riêng, đôi khi thiếu biến mà layout cần.
    Thêm fallback vào var() để khối vẫn hiển thị đúng dù trang thiếu biến đó.
    """
    picked = []
    for css in re.findall(r'<style[^>]*>(.*?)</style>', src, re.DOTALL):
        for rule in split_rules(css):
            if rule.startswith('@media'):
                head, _, body = rule.partition('{')
                inner = body.rsplit('}', 1)[0]
                keep = [r for r in split_rules(inner) if is_layout_rule(r)]
                if keep:
                    picked.append(head + '{' + ''.join(keep) + '}')
            elif rule.startswith('@'):
                continue
            elif is_layout_rule(rule):
                picked.append(rule)

    out = SAFE_DEFAULTS + '\n' + '\n'.join(picked)

    def add_fallback(m):
        if ',' in m.group(0):
            return m.group(0)
        val = css_vars.get(m.group(1))
        return 'var(%s,%s)' % (m.group(1), val.strip()) if val else m.group(0)

    return re.sub(r'var\((--[\w-]+)\)', add_fallback, out)


def extract_blocks(src):
    found = {}
    for key, spec, _lbl, _pl in BLOCKS:
        span = find_block(src, spec)
        if span:
            found[key] = src[span[0]:span[1]].rstrip()
    for key, rx in (('gtm', GTM_RE), ('gtm_ns', GTM_NS_RE), ('applink', APPLINK_RE)):
        m = rx.search(src)
        if m:
            found[key] = m.group(0)
    return found


# ── Điều chỉnh khối theo từng trang ─────────────────────────────────────────

def set_active(html, page_rel):
    """Đánh dấu mục menu đang xem.

    Thẻ <a> của menu có thể đã mang sẵn class (hdr-nav-top) và các thuộc tính
    khác. Phải GỘP 'active' vào class có sẵn — thêm một thuộc tính class thứ hai
    sẽ khiến trình duyệt bỏ qua cái sau, làm mục menu mất hết định dạng.
    """
    html = re.sub(r'(\sclass="[^"]*?)\s*\bactive\b\s*([^"]*")', r'\1\2', html)
    html = re.sub(r'\s+class="\s*"', '', html)
    for rx, href in ACTIVE_RULES:
        if not rx.match(page_rel):
            continue

        def danh_dau(m):
            the = m.group(0)
            if ' class="' in the:
                return the.replace(' class="', ' class="active ', 1)
            return the[:-1] + ' class="active">'

        return re.sub(r'<a\s[^>]*?href="%s"[^>]*>' % re.escape(href),
                      danh_dau, html, count=1)
    return html


def fix_paths(html, depth):
    if depth == 0:
        return html
    prefix = '../' * depth
    return RELATIVE_ASSETS.sub(lambda m: m.group(1) + prefix + m.group(2) + m.group(3), html)


def prepare(block_html, page_rel, depth, is_header):
    out = fix_paths(block_html, depth)
    return set_active(out, page_rel) if is_header else out


# ── Đồng bộ một file ────────────────────────────────────────────────────────

def sync_one(path, root, canon, css_block, js_block, do_write):
    src = read(path)
    out = src
    rel = os.path.relpath(path, root).replace('\\', '/')
    depth = depth_of(root, path)
    changes = []

    # 1. Các khối HTML
    for key, spec, label, place in BLOCKS:
        if key not in canon:
            continue
        want = prepare(canon[key], rel, depth, key == 'header')
        span = find_block(out, spec)
        if span:
            if out[span[0]:span[1]].rstrip() != want:
                out = out[:span[0]] + want + out[span[1]:]
                changes.append('cập nhật ' + label)
            continue

        # Chưa có khối này — chèn mới vào đúng vị trí
        if place == 'top':
            # Header phải nằm đầu trang, không phải cuối. Nếu đã có noscript GTM
            # thì chèn sau nó để iframe ẩn không xen giữa body và header.
            ns = GTM_NS_RE.search(out)
            if ns:
                at = ns.end()
            else:
                mb = re.search(r'<body[^>]*>', out, re.I)
                at = mb.end() if mb else -1
        else:
            at = out.rfind('</body>')

        if at == -1:
            changes.append('KHÔNG chèn được ' + label + ' (thiếu thẻ body)')
        else:
            out = out[:at] + '\n' + want + '\n' + out[at:]
            changes.append('THÊM MỚI ' + label)

    # 2. CSS layout — khối riêng cuối <head> nên luôn thắng CSS của trang
    css_want = CSS_OPEN + '\n' + css_block + '\n' + CSS_CLOSE
    m = re.search(re.escape(CSS_OPEN) + r'.*?' + re.escape(CSS_CLOSE), out, re.DOTALL)
    if m:
        if m.group(0) != css_want:
            out = out[:m.start()] + css_want + out[m.end():]
            changes.append('cập nhật CSS layout')
    else:
        head_end = out.lower().find('</head>')
        if head_end == -1:
            changes.append('KHÔNG chèn được CSS (thiếu </head>)')
        else:
            out = out[:head_end] + css_want + '\n' + out[head_end:]
            changes.append('THÊM MỚI CSS layout')

    # 3. JS phụ trợ cho header — không có thì bấm hamburger không phản ứng gì
    if js_block:
        js_want = JS_OPEN + '\n' + js_block.rstrip() + '\n' + JS_CLOSE
        mm = re.search(re.escape(JS_OPEN) + r'.*?' + re.escape(JS_CLOSE), out, re.DOTALL)
        if mm:
            if mm.group(0) != js_want:
                out = out[:mm.start()] + js_want + out[mm.end():]
                changes.append('cập nhật JS header')
        else:
            anchor = out.rfind('</body>')
            if anchor != -1:
                out = out[:anchor] + js_want + '\n' + out[anchor:]
                changes.append('THÊM MỚI JS header')

    # 4. GTM — chèn sau charset/viewport để khai báo mã hoá luôn đứng đầu
    if 'gtm' in canon and not GTM_RE.search(out):
        anchor = None
        for rx in (r'<meta\s+name="viewport"[^>]*>', r'<meta\s+charset=[^>]*>'):
            for mm in re.finditer(rx, out, re.I):
                anchor = max(anchor or 0, mm.end())
        if anchor:
            out = out[:anchor] + '\n\n' + canon['gtm'] + out[anchor:]
            changes.append('THÊM MỚI mã GTM')
    if 'gtm_ns' in canon and not GTM_NS_RE.search(out):
        mm = re.search(r'<body[^>]*>', out, re.I)
        if mm:
            out = out[:mm.end()] + '\n' + canon['gtm_ns'] + out[mm.end():]
            changes.append('THÊM MỚI GTM noscript')

    # 5. Script sửa link Zalo/Messenger trên di động
    if 'applink' in canon:
        mm = APPLINK_RE.search(out)
        if mm:
            if mm.group(0) != canon['applink']:
                out = out[:mm.start()] + canon['applink'] + out[mm.end():]
                changes.append('cập nhật script link Zalo/Messenger')
        else:
            anchor = out.rfind('</body>')
            if anchor != -1:
                out = out[:anchor] + canon['applink'] + '\n' + out[anchor:]
                changes.append('THÊM MỚI script link Zalo/Messenger')

    # 6. Khung chat tư vấn — 1 dòng script, tự chèn CSS và HTML của nó
    if CHATBOT_ID not in out:
        anchor = out.rfind('</body>')
        if anchor != -1:
            out = out[:anchor] + CHATBOT_TAG + '\n' + out[anchor:]
            changes.append('THÊM MỚI khung chat')

    if do_write and out != src:
        write_file(path, out)

    return changes, seo_check(src)


# ── Kiểm tra SEO (chỉ báo cáo) ──────────────────────────────────────────────

def seo_check(html):
    """Nội dung SEO khác nhau theo trang nên chỉ báo thiếu, không tự điền."""
    missing = []
    if not re.search(r'<link[^>]+rel="canonical"', html, re.I):
        missing.append('canonical')
    if not re.search(r'<meta[^>]+name="description"', html, re.I):
        missing.append('meta description')
    if not re.search(r'<meta[^>]+property="og:image"', html, re.I):
        missing.append('og:image')
    if not re.search(r'<title>.*?</title>', html, re.I | re.DOTALL):
        missing.append('title')
    return missing


# ── Kiểm tra an toàn sau khi ghi ────────────────────────────────────────────

def sanity(path):
    """Bắt lỗi cấu trúc — thà báo động nhầm còn hơn để trang vỡ mà không biết."""
    c = read(path)
    problems = []

    body = c[c.find('<body'):]
    body = re.sub(r'<script.*?</script>', '', body, flags=re.DOTALL)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.DOTALL)
    for tag in ('div', 'button', 'nav', 'footer', 'header'):
        o = len(re.findall(r'<%s\b' % tag, body))
        cl = len(re.findall(r'</%s>' % tag, body))
        if o != cl:
            problems.append('thẻ <%s> lệch (%d mở / %d đóng)' % (tag, o, cl))

    for m in re.finditer(r'<style[^>]*>(.*?)</style>', c, re.DOTALL):
        depth = 0
        broke = False
        for line in m.group(1).split('\n'):
            depth += line.count('{') - line.count('}')
            if depth < 0:
                problems.append('CSS thừa dấu }')
                broke = True
                break
        if not broke and depth > 0:
            problems.append('CSS thiếu %d dấu }' % depth)

    p = c.lower().find('<meta charset')
    if p == -1:
        problems.append('thiếu khai báo charset')
    elif p > 1024:
        problems.append('charset ở byte %d (nên dưới 1024)' % p)

    return problems


# ── Chương trình chính ──────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description='Đồng bộ layout dùng chung cho website DBV247')
    ap.add_argument('--root', required=True, help='Thư mục gốc của site (chứa index.html)')
    ap.add_argument('--write', action='store_true', help='Ghi thay đổi. Không có cờ này thì chỉ kiểm tra.')
    ap.add_argument('--only', nargs='*', help='Chỉ xử lý một số file (đường dẫn tương đối từ --root)')
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    source = os.path.join(root, SOURCE_FILE)
    if not os.path.exists(source):
        print('LỖI: không tìm thấy %s' % source)
        return 1

    src = read(source)
    canon = extract_blocks(src)
    css_block = extract_layout_css(src, extract_css_vars(src))

    js_block = ''
    js_path = os.path.normpath(LAYOUT_JS_PATH)
    if os.path.exists(js_path):
        js_block = read(js_path)
    else:
        print('CẢNH BÁO: không thấy %s — menu hamburger có thể không hoạt động '
              'trên trang chưa có sẵn hàm dropdown\n' % js_path)

    print('Bản chuẩn: %s' % SOURCE_FILE)
    print('  Khối lấy được : %s' % (', '.join(sorted(canon)) or '(không có)'))
    print('  CSS layout    : %d ký tự' % len(css_block))
    print('  JS header     : %d ký tự' % len(js_block))
    missing_src = [lbl for k, _sp, lbl, _pl in BLOCKS if k not in canon]
    if missing_src:
        print('  CẢNH BÁO: bản chuẩn thiếu %s — phần này sẽ không được đồng bộ'
              % ', '.join(missing_src))
    print()

    files = target_files(root, args.only)
    print('%s %d trang%s\n' % ('Đang ghi vào' if args.write else 'Đang kiểm tra',
                               len(files), '' if args.write else ' (chưa ghi gì)'))

    n_changed = 0
    seo_report = []
    for path in files:
        rel = os.path.relpath(path, root).replace('\\', '/')
        changes, seo = sync_one(path, root, canon, css_block, js_block, args.write)
        if changes:
            n_changed += 1
            print('  %s' % rel)
            for ch in changes:
                print('      %s' % ch)
        if seo:
            seo_report.append((rel, seo))

    print()
    if n_changed == 0:
        print('Tất cả %d trang đã khớp bản chuẩn.' % len(files))
    else:
        print('%s %d/%d trang.' % ('Đã cập nhật' if args.write else 'Cần cập nhật',
                                   n_changed, len(files)))
        if not args.write:
            print('Chạy lại kèm --write để ghi thay đổi.')

    if args.write:
        print()
        bad = []
        for path in files:
            probs = sanity(path)
            if probs:
                bad.append((os.path.relpath(path, root).replace('\\', '/'), probs))
        if bad:
            print('CẢNH BÁO — kiểm tra lại các trang sau:')
            for rel, probs in bad:
                print('  %s: %s' % (rel, '; '.join(probs)))
        else:
            print('Kiểm tra cấu trúc: %d trang đều hợp lệ.' % len(files))

    if seo_report:
        print()
        print('Thiếu thẻ SEO (script không tự điền vì nội dung mỗi trang khác nhau):')
        for rel, miss in seo_report:
            print('  %s: thiếu %s' % (rel, ', '.join(miss)))

    return 0


if __name__ == '__main__':
    sys.exit(main())
