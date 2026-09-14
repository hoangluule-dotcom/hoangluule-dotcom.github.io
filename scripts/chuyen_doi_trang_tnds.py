#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chuyển tnds-xe-5-cho.html và tnds-xe-7-cho.html sang khối cấp đơn dùng chung.

Trước 13/09/2026 hai trang này mang BẢN SAO RIÊNG của wizard cấp đơn — mã cũ,
id không có tiền tố cd, không nối vào window.CD. Cùng với bản dùng chung thì
biểu phí tồn tại ba bản; sửa phí một chỗ là lệch hai chỗ kia mà không ai biết.

Script gỡ đúng bốn thứ khỏi mỗi trang rồi để sync_capdon.py đặt khối chuẩn vào:

  1. Form ẩn cũ            — thiếu hai trường ma-ctv và nguon-ghi-nhan
  2. Khối HTML wizard      — từ mốc WIZARD tới <!-- /cd-wrap -->
  3. Thẻ <script> wizard   — nhận diện bằng 'function makeQR'
  4. Thẻ <script> preset   — nhận diện bằng 'Preset cho landing'

KHÔNG ĐỤNG VÀO CSS CỦA TRANG — cố ý.
Đã soát: 10 lớp trong vùng CSS wizard (fee-row, fee-num, faq, on, sum-r...) còn
được các phần KHÁC của trang dùng, nên cắt CSS theo vùng là làm vỡ bảng phí và
FAQ của chính trang đó. Bản CSS dùng chung khoá toàn bộ trong phạm vi #cap-don
nên độ ưu tiên (id+class) luôn thắng luật trần của trang (class). Phần CSS thừa
còn lại vô hại, và test so từng thuộc tính tính toán với trang chuẩn sẽ chứng
minh điều đó thay vì chỉ tin là thế.

Giữ nguyên phần HERO (chứa thẻ H1 "Bảo hiểm TNDS xe 5 chỗ…") — đó là nội dung
SEO của trang, không phải của công cụ cấp đơn.

Chạy:
    python3 scripts/chuyen_doi_trang_tnds.py --root .            # xem trước
    python3 scripts/chuyen_doi_trang_tnds.py --root . --write
"""

import argparse
import os
import re
import sys

TRANG = {
    'tnds-xe-5-cho.html': {'loai': 'oto', 'nhom': 'nkd', 'chi_tiet': 'd6'},
    'tnds-xe-7-cho.html': {'loai': 'oto', 'nhom': 'nkd', 'chi_tiet': 'c611'},
}

MOC = '<!-- CAP-DON-TNDS -->'

FORM_MO = '<!-- ══════════ FORM ẨN CHO NETLIFY NHẬN DIỆN (build-time) ══════════ -->'
WIZARD_MO = '<!-- ══════════ WIZARD ══════════ -->'
WIZARD_DONG = '</div><!-- /cd-wrap -->'


def cat_giua(s, mo, dong, thay=''):
    """Cắt đoạn từ mo tới hết dong, thay bằng `thay`.
    Trả về (chuỗi mới, đoạn đã cắt) hoặc (s, None) nếu không tìm thấy."""
    i = s.find(mo)
    if i < 0:
        return s, None
    j = s.find(dong, i)
    if j < 0:
        return s, None
    k = j + len(dong)
    return s[:i] + thay + s[k:], s[i:k]


def cat_script_chua(s, dau_hieu):
    """Gỡ thẻ <script> đầu tiên có chứa dau_hieu (bỏ qua script có thuộc tính id/src)."""
    for m in re.finditer(r'<script(?![^>]*\b(?:id|src)=)[^>]*>', s):
        i = m.start()
        j = s.find('</script>', i)
        if j < 0:
            continue
        khoi = s[i:j + 9]
        if dau_hieu in khoi:
            return s[:i] + s[j + 9:], khoi
    return s, None


def xu_ly(duong_dan, cau_hinh, ghi):
    s = goc = open(duong_dan, encoding='utf-8').read()
    viec = []

    s, form_cu = cat_giua(s, FORM_MO, '</form>')
    if form_cu:
        viec.append('gỡ form ẩn cũ (%d ký tự)' % len(form_cu))

    s, wiz = cat_giua(s, WIZARD_MO, WIZARD_DONG, MOC)
    if wiz:
        viec.append('gỡ khối wizard cũ (%d ký tự), đặt mốc vào đúng chỗ đó' % len(wiz))

    s, js = cat_script_chua(s, 'function makeQR')
    if js:
        viec.append('gỡ <script> wizard cũ (%d ký tự)' % len(js))

    s, preset = cat_script_chua(s, 'Preset cho landing')
    if preset:
        viec.append('gỡ <script> preset cũ (%d ký tự)' % len(preset))

    if not viec:
        return None, ['đã chuyển đổi từ trước, không còn gì để gỡ']

    if ghi:
        open(duong_dan, 'w', encoding='utf-8').write(s)
    return s, viec


def dat_thuoc_tinh(duong_dan, cau_hinh):
    """Gắn data-loai-xe / data-nhom / data-chi-tiet sau khi sync_capdon đã chèn khối."""
    s = open(duong_dan, encoding='utf-8').read()
    if '<section id="cap-don"' not in s:
        return False
    moi = '<section id="cap-don" data-loai-xe="%s" data-nhom="%s" data-chi-tiet="%s">' % (
        cau_hinh['loai'], cau_hinh['nhom'], cau_hinh['chi_tiet'])
    s2 = re.sub(r'<section id="cap-don"[^>]*>', moi, s, count=1)
    if s2 != s:
        open(duong_dan, 'w', encoding='utf-8').write(s2)
        return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True)
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--dat-thuoc-tinh', action='store_true',
                    help='chỉ gắn data-loai-xe/nhom/chi-tiet (chạy SAU sync_capdon.py)')
    a = ap.parse_args()

    for ten, cau_hinh in TRANG.items():
        p = os.path.join(a.root, ten)
        if not os.path.exists(p):
            print('  %s — không thấy file' % ten)
            continue

        if a.dat_thuoc_tinh:
            ok = dat_thuoc_tinh(p, cau_hinh)
            print('  %s — %s' % (ten, 'đã gắn thuộc tính chọn sẵn' if ok else 'không đổi'))
            continue

        truoc = os.path.getsize(p)
        s, viec = xu_ly(p, cau_hinh, a.write)
        print('  ' + ten)
        for v in viec:
            print('      ' + v)
        if a.write and s is not None:
            print('      %d → %d byte' % (truoc, os.path.getsize(p)))

    if not a.write and not a.dat_thuoc_tinh:
        print('\nChạy lại kèm --write để ghi, rồi:')
        print('  python3 scripts/sync_capdon.py --root . --write')
        print('  python3 scripts/chuyen_doi_trang_tnds.py --root . --dat-thuoc-tinh')
    return 0


if __name__ == '__main__':
    sys.exit(main())
