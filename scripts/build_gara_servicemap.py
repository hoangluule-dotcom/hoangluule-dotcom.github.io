#!/usr/bin/env python3
"""Cập nhật tab "Gara liên kết" của servicemap.html từ file Excel HĐSC đã ký.

Dùng:  python3 scripts/build_gara_servicemap.py <file.xlsx> [--write]
- Đọc sheet "HĐSC đã ký" (danh sách gốc, mỗi dòng = 1 hợp đồng sửa chữa).
- Chỉ đưa lên web: tên thường gọi, tên pháp nhân, địa chỉ, tỉnh, hãng.
  KHÔNG đưa số HĐ, MST, % giảm giá (dữ liệu nội bộ).
- Chi nhánh (ty=1) và bệnh viện (ty=3) giữ nguyên.
Không có --write thì chỉ in thống kê.
"""
import sys, re, json, unicodedata, collections
import openpyxl

SHEET = 'HĐSC đã ký'
HTML = 'servicemap.html'

# Nhãn "Tên hãng" không phải hãng xe → xếp vào gara đa hãng
KHONG_CHINH_HANG = {'GARAGE', 'CARPLA', 'TRUCKS', 'ISAMCO'}
# Nhãn trong Excel → danh sách mã hãng (để lọc) ; hiển thị lấy từ TEN_HANG
TACH_HANG = {
    'KIA-MAZDA': ['KIA', 'MAZDA'], 'KIA,MAZDA': ['KIA', 'MAZDA'],
    'OMODA & JAECOO': ['OMODA', 'JAECOO'], 'GELLY, LINK&CO': ['GEELY', 'LYNK & CO'],
    'DONGFENG&FAW': ['DONGFENG', 'FAW'], 'DOTHANH': ['ĐÔ THÀNH'], 'SINOTRUCK': ['SINOTRUK'],
}
# BITCAR là tập đoàn đại lý — suy ra hãng từ tên thường gọi
BITCAR_THEO_TEN = [('FORD', 'FORD'), ('MITSUBISHI', 'MITSUBISHI'), ('BYD', 'BYD')]
TEN_HANG = {
    'TOYOTA': 'Toyota', 'HYUNDAI': 'Hyundai', 'VINFAST': 'VinFast', 'MITSUBISHI': 'Mitsubishi',
    'FORD': 'Ford', 'HONDA': 'Honda', 'THACO': 'Thaco', 'MG': 'MG', 'SUZUKI': 'Suzuki',
    'ISUZU': 'Isuzu', 'HINO': 'Hino', 'KIA': 'Kia', 'MAZDA': 'Mazda', 'BYD': 'BYD',
    'VOLKSWAGEN': 'Volkswagen', 'NISSAN': 'Nissan', 'MERCEDES': 'Mercedes-Benz', 'SKODA': 'Skoda',
    'SUBARU': 'Subaru', 'OMODA': 'Omoda', 'JAECOO': 'Jaecoo', 'SINOTRUK': 'Sinotruk',
    'DONGFENG': 'Dongfeng', 'GEELY': 'Geely', 'LYNK & CO': 'Lynk & Co', 'CHENGLONG': 'Chenglong',
    'JAC': 'JAC', 'VOLVO': 'Volvo', 'HOWO': 'Howo', 'AUDI': 'Audi', 'FAW': 'FAW', 'BMW': 'BMW',
    'PEUGEOT': 'Peugeot', 'DAEWOO': 'Daewoo', 'ĐÔ THÀNH': 'Đô Thành', 'BITCAR': 'Bitcar',
}
TINH_DAC_BIET = {'HCM': 'Hồ Chí Minh', 'TP HCM': 'Hồ Chí Minh', 'THỪA THIÊN HUẾ': 'Huế'}


def bo_dau(s):
    s = unicodedata.normalize('NFD', s or '')
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s.replace('đ', 'd').replace('Đ', 'D').lower()


def gon(s):
    s = '' if s is None else str(s)
    return re.sub(r'\s+', ' ', s).strip()


def tinh_chuan(raw, cities):
    raw = gon(raw).upper()
    if raw in TINH_DAC_BIET:
        return TINH_DAC_BIET[raw]
    key = bo_dau(raw)
    for c in cities:
        if bo_dau(c) == key:
            return c
    return raw.title()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    xlsx, write = sys.argv[1], '--write' in sys.argv
    html = open(HTML, encoding='utf-8').read()
    m = re.search(r'var SERVICE_DATA = (\{.*?\});\n', html, re.S)
    data = json.loads(m.group(1))
    cities = data['cities']
    others = [i for i in data['items'] if i['ty'] != 2]
    old_gara = sum(1 for i in data['items'] if i['ty'] == 2)

    ws = openpyxl.load_workbook(xlsx, data_only=True)[SHEET]
    items, seen, gop = [], {}, 0
    for r in ws.iter_rows(min_row=3, values_only=True):
        cty, ten = gon(r[5]), gon(r[6])
        if not (cty or ten):
            continue
        if ten in ('', '0', 'None'):
            ten = cty
        mst, addr = gon(r[4]), gon(r[7])
        nhan = gon(r[2]).upper()
        k = (mst, bo_dau(addr))
        it = {'t': ten, 'a': addr, 'c': tinh_chuan(r[1], cities), 'ty': 2, 'lat': '', 'lng': ''}
        if cty and bo_dau(cty) != bo_dau(ten):
            it['n'] = cty
        if nhan and nhan not in KHONG_CHINH_HANG:
            if nhan == 'BITCAR':
                b = [h for w, h in BITCAR_THEO_TEN if w in ten.upper()] or ['BITCAR']
            else:
                b = TACH_HANG.get(nhan, [nhan])
            it['b'] = b
            it['h'] = ' – '.join(TEN_HANG.get(x, x.title()) for x in b)
            it['o'] = 1
        if k in seen:           # hợp đồng ký lại cho cùng cơ sở → giữ bản mới nhất
            items[seen[k]] = it
            gop += 1
            continue
        seen[k] = len(items)
        items.append(it)

    # Chính hãng lên trước, rồi theo tỉnh, rồi tên
    items.sort(key=lambda i: (i['c'] != 'Hà Nội', i['c'] != 'Hồ Chí Minh', bo_dau(i['c']), -i.get('o', 0), bo_dau(i['t'])))
    new_cities = sorted(set(cities) | {i['c'] for i in items}, key=bo_dau)
    brands = collections.Counter(b for i in items for b in i.get('b', []))
    data['hang'] = {b: TEN_HANG.get(b, b.title()) for b, _ in brands.most_common()}
    data['cities'] = new_cities
    data['items'] = [i for i in others if i['ty'] == 1] + items + [i for i in others if i['ty'] == 3]
    data['capnhat'] = '09/2026'

    print(f'Gara cũ: {old_gara} → mới: {len(items)} (chính hãng {sum(1 for i in items if i.get("o"))}, '
          f'đa hãng {sum(1 for i in items if not i.get("o"))}); gộp trùng {gop}')
    print('Tỉnh mới thêm:', sorted(set(new_cities) - set(cities)))
    print('Hãng:', ', '.join(f'{data["hang"][b]} {n}' for b, n in brands.most_common()))
    if write:
        js = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        html = html[:m.start(1)] + js + html[m.end(1):]
        open(HTML, 'w', encoding='utf-8', newline='\n').write(html)
        print('Đã ghi', HTML)


if __name__ == '__main__':
    main()
