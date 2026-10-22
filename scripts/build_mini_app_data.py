#!/usr/bin/env python3
"""Dữ liệu tĩnh cho Zalo Mini App "Bảo hiểm DBV247" (chạy mỗi lần deploy).

Sinh ra:
  content/mini-app/cam-nang.json   bài tin tức (tin-tuc/*.html): tiêu đề, mô tả, ảnh, ngày, chuyên mục
  content/mini-app/mang-luoi.json  mạng lưới dịch vụ lấy từ servicemap.html (SERVICE_DATA):
                                   chi nhánh (ty=1), gara liên kết (ty=2), cơ sở y tế (ty=3)

Mini App đọc thẳng hai file này (netlify.toml mở CORS cho /content/mini-app/*), nên
thêm bài viết hay cập nhật gara trên website là app tự có — KHÔNG phải gửi Zalo duyệt lại.

Dùng: python3 scripts/build_mini_app_data.py   (lỗi một phần thì giữ file cũ, không chặn deploy)
"""
import json, os, re, sys, html as H

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RA = os.path.join(GOC, 'content', 'mini-app')
SITE = 'https://dbv247.com.vn'


def meta(s, ten, kieu='name'):
    m = re.search(r'<meta\s+%s="%s"\s+content="([^"]*)"' % (kieu, re.escape(ten)), s)
    return H.unescape(m.group(1)).strip() if m else ''


def cam_nang():
    thu_muc = os.path.join(GOC, 'tin-tuc')
    bai = []
    for f in sorted(os.listdir(thu_muc)):
        if not f.endswith('.html') or f.startswith('_') or f == 'index.html':
            continue
        s = open(os.path.join(thu_muc, f), encoding='utf-8').read()
        if re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', s):
            continue
        tieu_de = meta(s, 'og:title', 'property') or H.unescape(re.sub(r'\s+', ' ', (re.search(r'<title>(.*?)</title>', s, re.S) or [None, ''])[1])).split(' | ')[0].strip()
        if not tieu_de:
            continue
        ngay = (re.search(r'"datePublished"\s*:\s*"([^"]+)"', s) or [None, ''])[1][:10]
        muc = (re.search(r'"articleSection"\s*:\s*"([^"]+)"', s) or [None, ''])[1]
        anh = meta(s, 'og:image', 'property')
        if anh.startswith('/'):
            anh = SITE + anh
        bai.append({
            'tieuDe': tieu_de, 'moTa': meta(s, 'description')[:220], 'anh': anh,
            'ngay': ngay, 'muc': muc or 'Kiến thức chung',
            'url': SITE + '/tin-tuc/' + f[:-5],
        })
    bai.sort(key=lambda b: b['ngay'], reverse=True)
    muc = []
    for b in bai:
        if b['muc'] not in muc:
            muc.append(b['muc'])
    return {'capNhat': bai[0]['ngay'] if bai else '', 'muc': muc, 'bai': bai}


def mang_luoi():
    s = open(os.path.join(GOC, 'servicemap.html'), encoding='utf-8').read()
    i = s.find('var SERVICE_DATA')
    j = s.find('{', i)
    obj, _ = json.JSONDecoder().raw_decode(s[j:])
    ds = []
    for it in obj['items']:
        d = {'t': it.get('t', ''), 'a': it.get('a', ''), 'c': it.get('c', ''), 'ty': it.get('ty')}
        if it.get('h'):
            d['h'] = it['h']
        if it.get('b'):
            d['b'] = it['b']
        if it.get('n'):
            d['n'] = it['n']
        ds.append(d)
    return {'capNhat': obj.get('capnhat', ''), 'tinh': obj.get('cities', []), 'hang': obj.get('hang', {}), 'ds': ds}


def ghi(ten, du_lieu):
    os.makedirs(RA, exist_ok=True)
    with open(os.path.join(RA, ten), 'w', encoding='utf-8') as f:
        json.dump(du_lieu, f, ensure_ascii=False, separators=(',', ':'))


loi = 0
for ten, ham in (('cam-nang.json', cam_nang), ('mang-luoi.json', mang_luoi)):
    try:
        d = ham()
        ghi(ten, d)
        print(ten, 'OK', len(d.get('bai') or d.get('ds') or []))
    except Exception as e:  # giữ file cũ
        loi += 1
        print(ten, 'LỖI — giữ bản cũ:', e, file=sys.stderr)
sys.exit(0)
