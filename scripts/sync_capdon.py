#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Đồng bộ khối công cụ cấp đơn TNDS vào các trang của site DBV247.

BẢN CHUẨN là cap-don-tnds.html. Mọi trang muốn nhúng công cụ cấp đơn chỉ cần
có một trong hai thứ sau, script lo phần còn lại:

    <!-- CAP-DON-TNDS -->            ← chỗ đánh dấu, script thay bằng khối thật
    <section id="cap-don" ...>...    ← đã có khối rồi, script cập nhật lại

Script bảo đảm mỗi trang đích có đủ bốn thứ:

    1. <link rel="stylesheet" href="/assets/cap-don-tnds.css">   trong <head>
    2. <form name="dbv-capdon-tnds" ... hidden>...</form>        ngay sau <body>
    3. <section id="cap-don"> ... </section>                     đúng bản chuẩn
    4. <script src="/assets/cap-don-tnds.js" defer></script>     trước </body>

VÌ SAO KHỐI HTML NẰM TRONG TỪNG TRANG CHỨ KHÔNG DỰNG BẰNG JAVASCRIPT
Khối này dài gần 19.000 ký tự và là nội dung Google đọc để hiểu trang nói về
cấp đơn TNDS. Dựng bằng JavaScript thì mã nguồn trang chỉ còn một thẻ div rỗng.
Nên HTML giữ trong trang, còn CSS và JS — thứ Google không cần đọc — tách ra
file dùng chung để chỉ có một bản duy nhất.

VÌ SAO FORM ẨN PHẢI LÀ HTML THẬT
Netlify Forms quét HTML tĩnh lúc deploy để biết site có những form nào. Form
do JavaScript chèn vào sẽ KHÔNG được đăng ký, và mọi đơn gửi lên bị trả 404 —
lỗi câm, khách bấm xong không thấy gì và đơn biến mất.

Cách dùng:
    python3 scripts/sync_capdon.py --root <thư-mục-site>            # xem trước
    python3 scripts/sync_capdon.py --root <thư-mục-site> --write    # ghi
    python3 scripts/sync_capdon.py --root <...> --write --only bao-hiem-tnds-xemay.html
"""

import argparse
import os
import re
import sys

SOURCE_FILE = 'cap-don-tnds.html'

CSS_TAG = '<link rel="stylesheet" href="/assets/cap-don-tnds.css">'
JS_TAG = '<script src="/assets/cap-don-tnds.js" defer></script>'
MOC = '<!-- CAP-DON-TNDS -->'

FORM_NAME = 'dbv-capdon-tnds'

SKIP_DIRS = {'admin', 'node_modules', 'Originals', '_skill-build', '_to_delete'}

# Mã inline của bản cũ — gỡ đi khi gặp, vì nay đã tách ra file dùng chung.
# Trước 12/09/2026 công cụ nằm inline trong bao-hiem-tnds-oto.html.
INLINE_CSS_RE = re.compile(r'[ \t]*<style id="cd-capdon-css">.*?</style>\n?', re.DOTALL)
INLINE_JS_RE = re.compile(r'[ \t]*<script id="cd-capdon-js">.*?</script>\n?', re.DOTALL)


def read(path):
    with open(path, encoding='utf-8', errors='ignore') as f:
        return f.read()


def write_file(path, text):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def lay_section(html):
    """Cắt đúng <section id="cap-don"> ... </section>, đếm độ sâu vì section lồng nhau."""
    i = html.find('<section id="cap-don"')
    if i < 0:
        return None, -1, -1
    depth = 0
    for m in re.finditer(r'<section\b|</section>', html[i:]):
        depth += -1 if m.group(0).startswith('</') else 1
        if depth == 0:
            j = i + m.end()
            return html[i:j], i, j
    return None, -1, -1


def lay_form(html):
    i = html.find('<form name="%s"' % FORM_NAME)
    if i < 0:
        return None
    j = html.find('</form>', i)
    return html[i:j + 7] if j > 0 else None


def target_files(root, only=None):
    if only:
        return [os.path.join(root, p) for p in only]
    src_abs = os.path.abspath(os.path.join(root, SOURCE_FILE))
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith('.')]
        for fn in sorted(filenames):
            if not fn.endswith('.html'):
                continue
            p = os.path.join(dirpath, fn)
            if os.path.abspath(p) == src_abs:
                continue
            s = read(p)
            # chỉ đụng vào trang đã có khối hoặc đã đặt mốc
            if MOC in s or '<section id="cap-don"' in s:
                out.append(p)
    return out


def xu_ly(path, section, form, ghi):
    s = goc = read(path)
    viec = []

    # 1. Gỡ bản inline cũ nếu còn
    if INLINE_CSS_RE.search(s):
        s = INLINE_CSS_RE.sub('', s)
        viec.append('gỡ <style id="cd-capdon-css"> inline')
    if INLINE_JS_RE.search(s):
        s = INLINE_JS_RE.sub('', s)
        viec.append('gỡ <script id="cd-capdon-js"> inline')

    # 2. Khối HTML
    cu, i, j = lay_section(s)
    if cu is None:
        if MOC not in s:
            return None, ['BỎ QUA: không thấy <section id="cap-don"> lẫn mốc ' + MOC]
        s = s.replace(MOC, section, 1)
        viec.append('THÊM MỚI khối cấp đơn')
    else:
        # giữ nguyên data-loai-xe riêng của trang
        m = re.search(r'<section id="cap-don"([^>]*)>', cu)
        thuoc_tinh = m.group(1) if m else ''
        moi = re.sub(r'<section id="cap-don"[^>]*>',
                     '<section id="cap-don"%s>' % thuoc_tinh, section, count=1)
        if cu != moi:
            s = s[:i] + moi + s[j:]
            viec.append('cập nhật khối cấp đơn')

    # 3. Form ẩn — đặt ngay sau <body...>
    if ('name="%s"' % FORM_NAME) not in s:
        m = re.search(r'<body[^>]*>', s)
        if not m:
            return None, ['BỎ QUA: không thấy thẻ <body>']
        s = s[:m.end()] + '\n\n' + form + '\n' + s[m.end():]
        viec.append('THÊM MỚI form ẩn Netlify')

    # 4. Thẻ CSS trong <head>
    if CSS_TAG not in s:
        k = s.find('</head>')
        if k < 0:
            return None, ['BỎ QUA: không thấy </head>']
        s = s[:k] + CSS_TAG + '\n' + s[k:]
        viec.append('THÊM MỚI thẻ CSS')

    # 5. Thẻ JS trước </body>
    if JS_TAG not in s:
        k = s.rfind('</body>')
        if k < 0:
            return None, ['BỎ QUA: không thấy </body>']
        s = s[:k] + JS_TAG + '\n' + s[k:]
        viec.append('THÊM MỚI thẻ JS')

    if not viec:
        return s, []
    if ghi and s != goc:
        write_file(path, s)
    return s, viec


def kiem_tra(path, s):
    """Vài phép kiểm tối thiểu sau khi ghi — bắt lỗi cấu trúc trước khi push."""
    loi = []
    if s.count('<section id="cap-don"') != 1:
        loi.append('có %d khối #cap-don (phải đúng 1)' % s.count('<section id="cap-don"'))
    if s.count(CSS_TAG) != 1:
        loi.append('thẻ CSS xuất hiện %d lần' % s.count(CSS_TAG))
    if s.count(JS_TAG) != 1:
        loi.append('thẻ JS xuất hiện %d lần' % s.count(JS_TAG))
    if s.count('name="%s"' % FORM_NAME) != 1:
        loi.append('form ẩn xuất hiện %d lần' % s.count('name="%s"' % FORM_NAME))
    if s.count('<section') != s.count('</section>'):
        loi.append('lệch thẻ section: %d mở / %d đóng' % (s.count('<section'), s.count('</section>')))
    # thẻ CSS phải nằm trong <head>
    if CSS_TAG in s and s.find(CSS_TAG) > s.find('</head>'):
        loi.append('thẻ CSS nằm ngoài <head>')
    return loi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True)
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--only', nargs='*')
    a = ap.parse_args()

    src = os.path.join(a.root, SOURCE_FILE)
    if not os.path.exists(src):
        print('Không thấy bản chuẩn: ' + src)
        return 1

    goc = read(src)
    section, _, _ = lay_section(goc)
    form = lay_form(goc)
    if not section:
        print('Bản chuẩn thiếu <section id="cap-don">')
        return 1
    if not form:
        print('Bản chuẩn thiếu <form name="%s">' % FORM_NAME)
        return 1

    print('Bản chuẩn: ' + SOURCE_FILE)
    print('  Khối cấp đơn : %d ký tự' % len(section))
    print('  Form ẩn      : %d ký tự' % len(form))

    files = target_files(a.root, a.only)
    print('\n%s %d trang\n' % ('Đang ghi vào' if a.write else 'Đang kiểm tra (chưa ghi gì)', len(files)))

    doi = 0
    canh_bao = []
    for p in files:
        ten = os.path.relpath(p, a.root).replace(os.sep, '/')
        s, viec = xu_ly(p, section, form, a.write)
        if s is None:
            print('  %s\n      %s' % (ten, viec[0]))
            continue
        if viec:
            doi += 1
            print('  ' + ten)
            for v in viec:
                print('      ' + v)
        if a.write:
            loi = kiem_tra(p, read(p))
            if loi:
                canh_bao.append((ten, loi))

    if doi == 0:
        print('  Tất cả %d trang đã khớp bản chuẩn.' % len(files))
    else:
        print('\n%s %d/%d trang.' % ('Đã cập nhật' if a.write else 'Cần cập nhật', doi, len(files)))
        if not a.write:
            print('Chạy lại kèm --write để ghi thay đổi.')

    if canh_bao:
        print('\nCẢNH BÁO cấu trúc:')
        for ten, loi in canh_bao:
            print('  %s: %s' % (ten, '; '.join(loi)))
        return 1
    elif a.write:
        print('\nKiểm tra cấu trúc: mọi trang đã ghi đều hợp lệ.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
