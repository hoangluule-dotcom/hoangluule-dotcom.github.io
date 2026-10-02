"""Apply the approved news mockup while preserving article data and shared layout.
Run after build_news_index.py if the article index is regenerated.
"""
from pathlib import Path
import re, json, html

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'tin-tuc.html'
PREFIX = '/assets/img/tin-tuc/'

def cover(url, cat):
    if any(w in url for w in ('boi-thuong', 'khai-bao', 'giay-chung-nhan', 'quy-tac', 'dbv-co-tot')):
        return 'claims'
    if any(w in url for w in ('du-lich', 'visa', 'hanh-ly', 'chuyen-bay')):
        return 'travel'
    if cat == 'conguoi':
        return 'health-family'
    if cat == 'xe':
        return 'auto-family'
    if any(w in url for w in ('chung-cu', 'can-ho', 'nha-dan', 'chu-nha')):
        return 'home'
    if cat in ('taisan', 'hanghai', 'trachnhiem') or 'hang-hoa' in url or 'gui-hang' in url:
        return 'business'
    return 'claims'

def apply():
    source = PAGE.read_text(encoding='utf-8')
    start_mark, end_mark = '<!-- DBV:NEWS-CARDS:START -->', '<!-- DBV:NEWS-CARDS:END -->'
    block = source.split(start_mark)[1].split(end_mark)[0]
    cards = re.findall(r'<a class="guide-card"[^>]*>.*?</a>', block, re.S)
    assert cards, 'No existing article cards found'
    mapping = {}
    for card in cards:
        url = re.search(r'href="([^"]+)"', card)[1]
        cat = re.search(r'data-cat="([^"]+)"', card)[1]
        name = html.unescape(re.search(r'<h3>(.*?)</h3>', card, re.S)[1])
        key = cover(url, cat)
        image = f'<img src="{PREFIX}{key}-v1.webp" srcset="{PREFIX}{key}-v1-480.webp 480w, {PREFIX}{key}-v1.webp 960w" sizes="(max-width:767px) 100px, (max-width:900px) 50vw, 400px" alt="{html.escape(name, quote=True)}" loading="lazy" decoding="async" width="960" height="640">'
        card = re.sub(r'<img[^>]*>', image, card, count=1)
        mapping[url] = card
    picks = [
        'kinh-nghiem-su-dung-bao-hiem-xe-oto',
        'bao-hiem-chay-no-chung-cu-nghi-dinh-67',
        'bao-hiem-du-lich-chi-tra-nhung-gi',
        'bao-hiem-suc-khoe-thoi-gian-cho-bao-lau',
        'bao-hiem-chay-no-cho-kho-hang-xuong-nho',
        'thu-tuc-khai-bao-boi-thuong-bao-hiem-dbv',
    ]
    picks = ['/tin-tuc/' + x for x in picks]
    assert all(x in mapping for x in picks)
    order = picks + [x for x in mapping if x not in picks]
    featured_keys = [picks[0], picks[5], picks[3]]
    featured = ''.join(mapping[x].replace('class="guide-card"', 'class="guide-card nt-feature-card"', 1) for x in featured_keys)
    featured = featured.replace('sizes="(max-width:767px) 100px, (max-width:900px) 50vw, 400px"', 'sizes="(max-width:767px) calc(100vw - 32px), 620px"', 1)
    search_icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>'
    icons = {
      'all': '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
      'xe': '<path d="m5 9 2-5h10l2 5M3 9h18v9H3zM6 18v3m12-3v3M6 13h2m8 0h2"/>',
      'taisan': '<path d="M5 21V3h14v18M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M10 21v-3h4v3"/>',
      'conguoi': '<path d="m3 15 7-3V3l3-1 1 10 7 3v3l-7-2v4l2 2h-8l2-2v-4l-7 2z"/>',
      'chung': '<path d="M12 5C8 2 3 3 3 3v17s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2zM12 5v17"/>',
    }
    tabs_block = source.split('<!-- DBV:NEWS-TABS:START -->')[1].split('<!-- DBV:NEWS-TABS:END -->')[0]
    tabs = []
    for button in re.findall(r'<button\b.*?</button>', tabs_block, re.S):
        key = re.search(r'data-cat="([^"]+)"', button)[1]
        button = re.sub(r' role="tab"| aria-selected="[^"]*"', '', button)
        button = re.sub(r' aria-pressed="[^"]*"', '', button)
        button = re.sub(r'<svg\b.*?</svg>', '', button, flags=re.S)
        button = button.replace('type="button"', f'type="button" aria-pressed="{str(key == "all").lower()}"', 1)
        icon = f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">{icons.get(key,icons["chung"])}</svg>'
        button = re.sub(r'(<button[^>]*>)', r'\1' + icon, button, count=1)
        tabs.append(button)
    # Each source card remains in the static HTML, even without JavaScript.
    main = f'''<main class="nt" id="nt-page"><div class="nt-wrap">
<nav class="nt-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span aria-hidden="true">/</span>Tin tức &amp; cẩm nang</nav>
<section class="nt-hero" aria-labelledby="nt-title"><picture class="nt-hero-art"><source srcset="{PREFIX}hero-office-v1.webp" type="image/webp"><img src="{PREFIX}hero-office-v1.webp" width="1855" height="848" alt="" fetchpriority="high" decoding="async"></picture><div class="nt-hero-copy"><h1 id="nt-title">Tin tức &amp; cẩm nang bảo hiểm</h1><p>Hiểu đúng bảo hiểm, an tâm mỗi ngày.</p><form id="nt-search" class="nt-search nt-js" role="search"><label class="nt-sr" for="nt-query">Tìm bài viết, chủ đề bạn quan tâm</label>{search_icon}<input type="search" id="nt-query" placeholder="Tìm bài viết, chủ đề bạn quan tâm" autocomplete="off"><button class="nt-btn nt-orange" type="submit">Tìm kiếm</button></form></div></section>
<div class="news-tabs nt-js" id="newsTabs" role="group" aria-label="Lọc bài viết theo chủ đề"><!-- DBV:NEWS-TABS:START -->{''.join(tabs)}<!-- DBV:NEWS-TABS:END --></div>
<section id="nt-featured" class="nt-featured" aria-labelledby="nt-feature-title"><div class="nt-section-head"><h2 id="nt-feature-title">Bài viết nổi bật</h2><a href="#nt-results" class="nt-text-link">Xem tất cả <span aria-hidden="true">→</span></a></div><div class="nt-feature-grid">{featured}</div></section>
<section id="newsListWrap" aria-labelledby="nt-results"><div class="nt-toolbar"><div><h2 id="nt-results" tabindex="-1">Khám phá cẩm nang</h2><p id="nt-count" role="status" aria-live="polite">{len(cards)} bài viết</p></div><label class="nt-sort nt-js"><span>Sắp xếp</span><select id="nt-sort" aria-label="Sắp xếp bài viết"><option value="suggested">Đề xuất</option><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="title">Tiêu đề A–Z</option></select></label></div><div class="guide-grid" id="newsGrid">{start_mark}{''.join(mapping[x] for x in order)}{end_mark}</div><div class="nt-empty" id="newsEmpty" hidden><h3>Chưa tìm thấy bài viết phù hợp</h3><p>Thử từ khóa khác hoặc chọn một chủ đề khác.</p><button id="nt-reset" class="nt-btn" type="button">Xóa bộ lọc</button></div><div class="nt-more nt-js"><button id="nt-more" class="nt-btn" type="button">Xem thêm bài viết <span aria-hidden="true">⌄</span></button></div></section>
<section class="nt-consult" aria-labelledby="nt-consult-title"><img src="{PREFIX}consult-v1.webp" width="420" height="560" alt="Tư vấn viên Bảo hiểm DBV" loading="lazy" decoding="async"><div class="nt-consult-copy"><h2 id="nt-consult-title">Cần giải đáp về bảo hiểm?</h2><p>DBV247 sẵn sàng hỗ trợ bạn.</p></div><div class="nt-actions"><a class="nt-btn nt-orange" href="/tu-van">Nhận tư vấn</a><a class="nt-btn" href="/san-pham">Khám phá sản phẩm</a></div></section>
<div class="nt-support"><a href="/boi-thuong"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/></svg><div><strong>Hướng dẫn bồi thường</strong><span>Quy trình, hồ sơ và thông tin hỗ trợ.</span></div><b aria-hidden="true">›</b></a><a href="/servicemap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg><div><strong>Mạng lưới dịch vụ</strong><span>Tìm điểm hỗ trợ và garage liên kết.</span></div><b aria-hidden="true">›</b></a></div>
</div></main>'''
    updated = re.sub(r'<main class="nt".*?</main>', lambda m: main, source, count=1, flags=re.S)
    schema = {'@context':'https://schema.org','@type':'ItemList','name':'Cẩm nang bảo hiểm DBV247','numberOfItems':len(order),'itemListElement':[{'@type':'ListItem','position':i+1,'url':'https://dbv247.com.vn'+url,'name':html.unescape(re.search(r'<h3>(.*?)</h3>',mapping[url],re.S)[1])} for i,url in enumerate(order)]}
    updated = re.sub(r'(<!-- DBV:NEWS-SCHEMA:START -->).*?(<!-- DBV:NEWS-SCHEMA:END -->)', lambda m: m[1]+'\n<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False,indent=2)+'</script>\n'+m[2], updated, flags=re.S)
    updated = re.sub(r'<link rel="stylesheet" href="/assets/hero-scenes.css[^\"]*">\s*', '', updated)
    updated = re.sub(r'(/assets/news-page.css)(?:\?[^\"]*)?', r'\1?v=20261002-mockup2', updated)
    if '/assets/news-mockup.css' not in updated:
        updated = updated.replace('</head>', '<link rel="stylesheet" href="/assets/news-mockup.css?v=20261002-mockup2">\n</head>', 1)
    updated = updated.replace('/assets/news-page.js"', '/assets/news-page.js?v=20261002-mockup2"')
    # Verify shared layout and analytics are outside the replacement.
    for tag, cls in [('header','hdr'), ('footer','ftr')]:
        pattern = rf'<{tag} class="{cls}".*?</{tag}>'
        assert re.search(pattern, source, re.S)[0] == re.search(pattern, updated, re.S)[0]
    PAGE.write_text(updated, encoding='utf-8')
    print(f'Updated news mockup: {len(cards)} articles, shared header/footer preserved.')

if __name__ == '__main__':
    apply()
