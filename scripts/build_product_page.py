#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dựng trang sản phẩm bảo hiểm DBV247 theo dạng e-commerce từ một file JSON.

Mỗi trang = một danh sách khối (section). Mỗi khối là một component có nhiều
biến thể bố cục (layout). Khối nào thiếu dữ liệu bắt buộc, hoặc có
"hidden": true, sẽ TỰ ẨN — không để lại tiêu đề trống.

    Component      Layout hỗ trợ                         Dữ liệu bắt buộc
    breadcrumb     —                                     items
    hero           content-left | image-left | lead      title   (lead = hero tối giản + form SĐT)
    product        — (ảnh + giá + tuỳ chọn + form SĐT)    title hoặc product.name
    shop           —                                     name
    specs          —                                     rows
    related        —                                     items
    lead_band      —                                     (cần khối 'lead' ở gốc JSON)
    checklist      —                                     items
    trust          —                                     title
    calculator     calculator                            groups
    benefits       card-grid | list                      items
    coverage       image-left | image-right | card-grid  covered
    plans          pricing-card | comparison-table       cards hoặc table
    reasons        card-grid | list                      items
    steps          timeline | timeline-vertical          items
    checkout       —                                     embed hoặc marker
    exclusions     accordion                             groups
    faq            accordion                             items   (tự sinh JSON-LD FAQPage)
    final_cta      — ("form": true → form SĐT)           title
    sticky_cta     "mode": "lead-bar" | "lead" | mặc định               (luôn có nếu khai báo)

Trang sinh ra CHƯA có header/footer/CTA nổi và CHƯA có khối cấp đơn. Sau khi
dựng, chạy tiếp (script tự gọi nếu có --sync):
    python3 scripts/sync_capdon.py --root . --write --only <file>
    python3 scripts/sync_layout.py --root . --write --only <file>

Cách dùng:
    python3 scripts/build_product_page.py --root . content/san-pham/tnds-xe-5-cho.json
    python3 scripts/build_product_page.py --root . content/san-pham/tnds-xe-5-cho.json --out tnds-xe-5-cho-moi.html --noindex --sync
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys

CSS_VER = '3'
JS_VER = '2'

# ── Tiện ích ────────────────────────────────────────────────────────────────

def e(s):
    return html.escape(str(s if s is not None else ''), quote=True)


def vnd(n):
    return '{:,.0f}'.format(n).replace(',', '.') + 'đ'


def attr_json(obj):
    return e(json.dumps(obj, ensure_ascii=False, separators=(',', ':')))


ICONS = {
    'user':     '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    'car':      '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5M5 12h14"/>',
    'file':     '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13l2 2 4-4"/>',
    'wallet':   '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M6 6V5a1 1 0 0 1 1-1h10"/>',
    'phone':    '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    'call':     '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    'building': '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18"/><path d="M8 8h3M8 12h3M8 16h3"/>',
    'headset':  '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    'qr':       '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    'receipt':  '<path d="M5 3v18l2.5-1.5L10 21l2-1.5 2 1.5 2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5z"/><path d="M9 9h6M9 13h6"/>',
    'truck':    '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    'invoice':  '<path d="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z"/><path d="M10 8h4M10 12h4M9.5 15.5h1"/>',
    'shield':   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    'check':    '<path d="M20 6 9 17l-5-5"/>',
    'x':        '<path d="M18 6 6 18M6 6l12 12"/>',
    'arrow':    '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'alert':    '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    'clock':    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'zalo':     '<path d="M4 5h16v11H9l-4 3v-3H4z"/><path d="M8 9h4l-4 4h4M15 9v4"/>',
    'chevron':  '<path d="m6 9 6 6 6-6"/>',
    'doc':      '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
}


def icon(name, size=22, cls='plp-ic'):
    p = ICONS.get(name)
    if not p:
        return ''
    return ('<svg class="%s" width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>') % (cls, size, size, p)


def cta_link(c, cls='plp-btn plp-btn-buy', default_preset=None, extra=''):
    if not c:
        return ''
    preset = c.get('preset', default_preset)
    data = (' data-plp-preset="%s"' % attr_json(preset)) if preset else ''
    return '<a href="%s" class="%s"%s%s>%s</a>' % (e(c.get('href', '#')), cls, data, extra, e(c['label']))


def head_block(sec, tag='h2'):
    """Tiêu đề khối: eyebrow + h2 + subtitle."""
    out = '<div class="plp-head">'
    if sec.get('eyebrow'):
        out += '<span class="plp-eyebrow">%s</span>' % e(sec['eyebrow'])
    out += '<%s class="plp-h2">%s</%s>' % (tag, e(sec['title']), tag)
    if sec.get('subtitle'):
        out += '<p class="plp-sub">%s</p>' % e(sec['subtitle'])
    out += '</div>'
    return out


def section(sec, inner, extra_cls=''):
    sid = (' id="%s"' % e(sec['id'])) if sec.get('id') else ''
    layout = sec.get('layout', '')
    cls = 'plp-sec plp-s-%s%s%s' % (sec['type'].replace('_', '-'),
                                  (' plp-l-' + layout) if layout else '',
                                  (' ' + extra_cls) if extra_cls else '')
    if sec.get('tone') == 'muted':
        cls += ' plp-tone-muted'
    return '<section%s class="%s"><div class="plp-in">%s</div></section>\n' % (sid, cls, inner)


# ── Components ──────────────────────────────────────────────────────────────

def c_breadcrumb(sec, P):
    items = sec.get('items') or []
    if not items:
        return ''
    lis = []
    for i, it in enumerate(items):
        last = i == len(items) - 1
        if it.get('href') and not last:
            lis.append('<li><a href="%s">%s</a></li>' % (e(it['href']), e(it['label'])))
        else:
            lis.append('<li aria-current="page">%s</li>' % e(it['label']))
    return ('<nav class="plp-bc" aria-label="Đường dẫn"><div class="plp-in"><ol>%s</ol></div></nav>\n' % ''.join(lis))


def price_box(P, cls='plp-price', thumb=None):
    p = P.get('product', {})
    if not p.get('price'):
        return ''
    th = ''
    if thumb and thumb.get('src'):
        # ảnh thu nhỏ chỉ hiện trên mobile (thay cho ảnh lớn bị ẩn); lazy nên desktop không tải
        th = '<img class="plp-price-thumb" src="%s" alt="" width="58" height="81" loading="lazy" decoding="async">' % e(thumb['src'])
    return ('<div class="%s">%s<div class="plp-price-txt">'
            '<span class="plp-price-lbl">%s</span>'
            '<div class="plp-price-row"><b class="plp-price-num">%s</b><span class="plp-price-unit">%s</span></div>'
            '<span class="plp-price-note">%s</span>'
            '%s'
            '</div></div>') % (cls, th, e(p.get('price_label', 'Giá')), vnd(p['price']), e(p.get('price_unit', '')),
                         e(p.get('price_note', '')),
                         ('<span class="plp-price-basis">%s%s</span>' % (icon('shield', 14), e(p['price_basis']))) if p.get('price_basis') else '')


def c_hero(sec, P):
    if not sec.get('title'):
        return ''
    if sec.get('layout') == 'lead':
        return c_hero_lead(sec, P)
    p = P.get('product', {})
    layout = sec.get('layout', 'content-left')
    txt = ''
    if sec.get('eyebrow'):
        txt += '<span class="plp-badge">%s%s</span>' % (icon('shield', 15), e(sec['eyebrow']))
    txt += '<h1 class="plp-h1">%s</h1>' % e(sec['title'])
    if sec.get('value_prop'):
        txt += '<p class="plp-vp">%s</p>' % e(sec['value_prop'])
    if sec.get('for_whom'):
        txt += '<p class="plp-for"><span>Dành cho</span>%s</p>' % e(sec['for_whom'])
    hl = sec.get('highlights') or []
    if hl:
        txt += '<ul class="plp-hl">' + ''.join(
            '<li>%s<b>%s</b><span>%s</span></li>' % (icon(h.get('icon'), 20), e(h['value']), e(h.get('label', '')))
            for h in hl) + '</ul>'
    # hộp mua: giá + CTA
    buy = '<div class="plp-hero-buy">' + price_box(P, thumb=sec.get('image'))
    buy += '<div class="plp-hero-ctas">'
    if p.get('cta'):
        buy += cta_link(p['cta'], 'plp-btn plp-btn-buy plp-btn-lg')
    if sec.get('secondary_cta'):
        buy += cta_link(sec['secondary_cta'], 'plp-btn plp-btn-ghost plp-btn-lg')
    buy += '</div></div>'

    img = ''
    im = sec.get('image')
    if im and im.get('src'):
        img = ('<figure class="plp-hero-media">'
               '<img src="%s" alt="%s" width="%s" height="%s" fetchpriority="high" decoding="async">'
               '%s</figure>') % (e(im['src']), e(im.get('alt', '')), e(im.get('width', '')), e(im.get('height', '')),
                                 ('<figcaption class="plp-media-badge">%s%s</figcaption>' % (icon('check', 14), e(im['badge']))) if im.get('badge') else '')
    trust = sec.get('trust') or []
    trust_html = ''
    if trust:
        trust_html = '<ul class="plp-trust">' + ''.join(
            '<li>%s<span>%s</span></li>' % (icon(t.get('icon'), 18), e(t['text'])) for t in trust) + '</ul>'
    grid_cls = 'plp-hero-grid' + (' plp-rev' if layout == 'image-left' else '') + ('' if img else ' plp-noimg')
    inner = ('<div class="%s"><div class="plp-hero-txt">%s%s</div>%s</div>%s'
             % (grid_cls, txt, buy, img, trust_html))
    return section(sec, inner)


def c_calculator(sec, P):
    groups = sec.get('groups') or []
    if not groups:
        return ''
    g_html = ''
    for g in groups:
        opts = ''
        for i, o in enumerate(g.get('options', [])):
            on = o.get('default') or (i == 0 and not any(x.get('default') for x in g['options']))
            preset = (' data-preset="%s"' % attr_json(o['preset'])) if o.get('preset') else ''
            opts += ('<button type="button" class="plp-opt%s" role="radio" aria-checked="%s" data-value="%s"%s>'
                     '<b>%s</b>%s</button>') % (' on' if on else '', 'true' if on else 'false', e(o['value']), preset,
                                                e(o['label']), ('<small>%s</small>' % e(o['sub'])) if o.get('sub') else '')
        g_html += ('<div class="plp-calc-g" data-key="%s"><span class="plp-calc-lbl" id="lbl-%s">%s</span>'
                   '<div class="plp-seg" role="radiogroup" aria-labelledby="lbl-%s">%s</div></div>') % (
            e(g['key']), e(g['key']), e(g['label']), e(g['key']), opts)
    res = ('<div class="plp-calc-res" aria-live="polite">'
           '<span class="plp-calc-rlbl">%s</span>'
           '<b class="plp-calc-total" data-out="total">—</b>'
           '<dl class="plp-calc-rows">'
           '<div><dt data-out="base-lbl">Phí bảo hiểm</dt><dd data-out="base">—</dd></div>'
           '<div><dt>Thuế GTGT %d%%</dt><dd data-out="vat">—</dd></div>'
           '<div><dt>Tính ra mỗi ngày</dt><dd data-out="day">—</dd></div>'
           '</dl>'
           '%s'
           '%s'
           '</div>') % (e(sec.get('result_label', 'Tổng phải trả')), round(sec.get('vat', 0.1) * 100),
                        cta_link(sec.get('cta'), 'plp-btn plp-btn-buy plp-btn-lg plp-btn-block', extra=' data-plp-calc-cta'),
                        ('<p class="plp-calc-note">%s%s</p>' % (icon('alert', 15), e(sec['note']))) if sec.get('note') else '')
    aside = ''
    if sec.get('aside_link'):
        aside = '<a class="plp-link" href="%s">%s%s</a>' % (e(sec['aside_link']['href']), e(sec['aside_link']['label']), icon('arrow', 16))
    inner = head_block(sec) + ('<div class="plp-calc" data-vat="%s"><div class="plp-calc-form">%s%s</div>%s</div>'
                               % (e(sec.get('vat', 0.1)), g_html, aside, res))
    return section(sec, inner)


def cards(items, with_value=True):
    out = ''
    for it in items:
        out += '<li class="plp-card">'
        out += '<span class="plp-card-ic">%s</span>' % icon(it.get('icon', 'check'), 22)
        if with_value and it.get('value'):
            out += '<span class="plp-card-val"><b>%s</b>%s</span>' % (e(it['value']), (' <small>%s</small>' % e(it['unit'])) if it.get('unit') else '')
        out += '<h3 class="plp-card-t">%s</h3>' % e(it['title'])
        if it.get('text'):
            out += '<p class="plp-card-p">%s</p>' % e(it['text'])
        out += '</li>'
    return out


def c_benefits(sec, P):
    items = sec.get('items') or []
    if not items:
        return ''
    n = min(len(items), 4)
    inner = head_block(sec) + '<ul class="plp-grid plp-cols-%d">%s</ul>' % (n, cards(items))
    return section(sec, inner)


def c_reasons(sec, P):
    items = sec.get('items') or []
    if not items:
        return ''
    n = 3 if len(items) % 3 == 0 or len(items) > 4 else len(items)
    inner = head_block(sec) + '<ul class="plp-grid plp-cols-%d plp-grid-soft">%s</ul>' % (n, cards(items, False))
    return section(sec, inner)


def c_coverage(sec, P):
    cov = sec.get('covered') or []
    if not cov:
        return ''
    layout = sec.get('layout', 'image-left')
    lst = '<ul class="plp-cov-list">' + ''.join(
        '<li><span class="plp-tick ok">%s</span><div><b>%s</b><span>%s</span></div></li>' % (icon('check', 16), e(c['title']), e(c.get('text', '')))
        for c in cov) + '</ul>'
    nc = sec.get('not_covered') or []
    nc_html = ''
    if nc:
        rows = ''
        for c in nc:
            tag = '<a href="%s">%s%s</a>' % (e(c['href']), e(c['text']), icon('arrow', 14)) if c.get('href') else '<span>%s</span>' % e(c['text'])
            rows += '<li><span class="plp-tick no">%s</span><b>%s</b>%s</li>' % (icon('x', 14), e(c['title']), tag)
        nc_html = '<div class="plp-nc"><span class="plp-nc-t">%s</span><ul>%s</ul></div>' % (e(sec.get('not_covered_title', 'Không thuộc phạm vi')), rows)
    ex = sec.get('example')
    ex_html = ''
    if ex and ex.get('rows'):
        rows = ''.join('<div class="plp-ex-row"><span class="plp-ex-lbl">%s</span><span class="plp-ex-ins">%s</span><span class="plp-ex-you">%s</span></div>'
                       % (e(r['label']), e(r['insurer']), e(r['you'])) for r in ex['rows'])
        ex_html = ('<div class="plp-ex"><b class="plp-ex-t">%s</b>%s%s</div>'
                   % (e(ex.get('title', 'Ví dụ')), rows, ('<small>%s</small>' % e(ex['note'])) if ex.get('note') else ''))
    im = sec.get('image')
    media = ''
    if im and im.get('src') and layout in ('image-left', 'image-right'):
        media = ('<figure class="plp-split-media"><img src="%s" alt="%s" width="%s" height="%s" loading="lazy" decoding="async">%s</figure>'
                 % (e(im['src']), e(im.get('alt', '')), e(im.get('width', '')), e(im.get('height', '')),
                    ('<figcaption>%s</figcaption>' % e(im['caption'])) if im.get('caption') else ''))
    body = '<div class="plp-split-body">%s%s%s</div>' % (lst, nc_html, ex_html)
    if media:
        inner = head_block(sec) + '<div class="plp-split%s">%s%s</div>' % (' plp-rev' if layout == 'image-right' else '', media, body)
    else:
        inner = head_block(sec) + body
    return section(sec, inner)


def c_plans(sec, P):
    cards_ = sec.get('cards') or []
    table = sec.get('table')
    if not cards_ and not (table and table.get('rows')):
        return ''
    layout = sec.get('layout', 'pricing-card')
    out = head_block(sec)
    if cards_ and layout == 'pricing-card':
        cs = ''
        for c in cards_:
            feats = ''.join('<li>%s%s</li>' % (icon('check', 16), e(f)) for f in c.get('features', []))
            cs += ('<li class="plp-plan%s">%s<span class="plp-plan-n">%s</span>'
                   '<b class="plp-plan-p">%s</b><span class="plp-plan-u">%s</span>%s'
                   '<ul class="plp-plan-f">%s</ul>%s</li>') % (
                ' featured' if c.get('featured') else '',
                ('<span class="plp-tag">%s</span>' % e(c['badge'])) if c.get('badge') else '',
                e(c['name']), vnd(c['price']), e(c.get('unit', '')),
                ('<span class="plp-plan-per">%s</span>' % e(c['per'])) if c.get('per') else '',
                feats,
                cta_link(c.get('cta'), 'plp-btn %s plp-btn-block' % ('plp-btn-buy' if c.get('featured') else 'plp-btn-outline')))
        out += '<ul class="plp-plans">%s</ul>' % cs
    if table and table.get('rows'):
        cols = table.get('columns', [])
        th = ''.join('<th scope="col">%s</th>' % e(c) for c in cols)
        trs = ''
        for r in table['rows']:
            tds = ''
            for i, cell in enumerate(r['cells']):
                lab = e(cols[i]) if i < len(cols) else ''
                # ô bảng là nội dung do người biên tập viết, cho phép thẻ <a>
                if i == 0:
                    tds += '<th scope="row" data-label="%s">%s</th>' % (lab, cell)
                else:
                    tds += '<td data-label="%s">%s</td>' % (lab, cell)
            trs += '<tr%s>%s</tr>' % (' class="hl"' if r.get('highlight') else '', tds)
        out += ('<div class="plp-table-wrap">%s<table class="plp-table"><thead><tr>%s</tr></thead><tbody>%s</tbody></table>%s</div>'
                % (('<h3 class="plp-h3">%s</h3>' % e(table['title'])) if table.get('title') else '', th, trs,
                   ('<p class="plp-src">%s</p>' % e(table['note'])) if table.get('note') else ''))
    return section(sec, out)


def c_steps(sec, P):
    items = sec.get('items') or []
    if not items:
        return ''
    layout = sec.get('layout', 'timeline')
    lis = ''.join('<li class="plp-step"><span class="plp-step-n">%d</span><div>%s<h3>%s</h3><p>%s</p></div></li>'
                  % (i + 1, ('<span class="plp-step-meta">%s</span>' % e(it['meta'])) if it.get('meta') else '',
                     e(it['title']), e(it.get('text', ''))) for i, it in enumerate(items))
    tl = '<ol class="plp-tl plp-tl-%s plp-tl-n%d">%s</ol>' % ('v' if layout == 'timeline-vertical' else 'h', len(items), lis)
    extra = ''
    if sec.get('prepare'):
        extra = '<p class="plp-prepare">%s%s</p>' % (icon('doc', 18), e(sec['prepare']))
    if sec.get('note'):
        extra += '<p class="plp-prepare plp-note">%s%s</p>' % (icon('check', 18), e(sec['note']))
    a = sec.get('aside')
    if a:
        contacts = ''.join('<a class="plp-contact" href="%s">%s<span><small>%s</small><b>%s</b></span></a>'
                           % (e(c['href']), icon('call', 20), e(c['label']), e(c['value'])) for c in a.get('contacts', []))
        chk = ''.join('<li>%s%s</li>' % (icon('check', 15), e(x)) for x in a.get('checklist', []))
        aside = ('<aside class="plp-aside"><b class="plp-aside-t">%s</b>%s%s</aside>'
                 % (e(a.get('title', '')), contacts,
                    ('<span class="plp-aside-st">%s</span><ul class="plp-chk">%s</ul>' % (e(a.get('checklist_title', '')), chk)) if chk else ''))
        inner = head_block(sec) + '<div class="plp-steps-grid">%s%s</div>' % (tl, aside)
    else:
        inner = head_block(sec) + tl + extra
    return section(sec, inner)


def c_checkout(sec, P):
    # "embed": HTML nhúng nguyên văn (vd. <section id="cap-don" data-...></section> để
    # sync_capdon.py điền công cụ cấp đơn mà vẫn giữ thuộc tính chọn sẵn);
    # "marker": mốc chú thích kiểu <!-- CAP-DON-TNDS -->.
    emb = sec.get('embed') or sec.get('marker')
    if not emb:
        return ''
    inner = head_block(sec) + '\n' + emb + '\n'
    return section(sec, inner)


def accordion(items, name):
    out = ''
    for it in items:
        op = ' open' if it.get('open') else ''
        out += ('<details class="plp-acc"%s><summary><span>%s</span>%s</summary><div class="plp-acc-b">%s</div></details>'
                % (op, e(it['t']), icon('chevron', 20, 'plp-ic plp-chev'), it['b']))
    return '<div class="plp-accs" data-acc="%s">%s</div>' % (e(name), out)


def c_exclusions(sec, P):
    groups = sec.get('groups') or []
    if not groups:
        return ''
    items = []
    for g in groups:
        body = '<ul class="plp-xlist">' + ''.join('<li>%s%s</li>' % (icon('x', 14, 'plp-ic plp-x'), e(x)) for x in g.get('items', [])) + '</ul>'
        if g.get('text'):
            body = '<p>%s</p>' % e(g['text']) + body
        items.append({'t': g['title'], 'b': body, 'open': g.get('open')})
    inner = '<div class="plp-2col">%s%s</div>' % (head_block(sec), accordion(items, 'loai-tru'))
    return section(sec, inner)


def c_faq(sec, P):
    items = sec.get('items') or []
    if not items:
        return ''
    acc = accordion([{'t': it['q'], 'b': '<p>%s</p>' % e(it['a'])} for it in items], 'faq')
    inner = '<div class="plp-2col">%s%s</div>' % (head_block(sec), acc)
    P['_faq'] = items
    return section(sec, inner)


def c_final_cta(sec, P):
    if not sec.get('title'):
        return ''
    p = P.get('product', {})
    if sec.get('form') and P.get('lead'):
        P = with_lead(P, sec)
        inner = ('<div class="plp-final-box plp-final-lead"><div><h2 class="plp-h2">%s</h2><p>%s</p></div>%s</div>'
                 % (e(sec['title']), e(sec.get('text', '')), lead_form(P, 'cuối trang', 'stack', 'cuoi-trang')))
        return section(sec, inner, 'plp-final')
    btns = cta_link(p.get('cta'), 'plp-btn plp-btn-buy plp-btn-lg')
    if sec.get('secondary_cta'):
        btns += cta_link(sec['secondary_cta'], 'plp-btn plp-btn-ghost-inv plp-btn-lg')
    price = ''
    if p.get('price'):
        price = '<span class="plp-final-price"><b>%s</b>%s · %s</span>' % (vnd(p['price']), e(p.get('price_unit', '')), e(p.get('price_note', '')).split(' · ')[0])
    inner = ('<div class="plp-final-box"><div><h2 class="plp-h2">%s</h2><p>%s</p>%s</div><div class="plp-final-ctas">%s</div></div>'
             % (e(sec['title']), e(sec.get('text', '')), price, btns))
    return section(sec, inner, 'plp-final')


def c_sticky_cta(sec, P):
    p = P.get('product', {})
    hide = ','.join(sec.get('hide_when_visible', []))
    if sec.get('mode') == 'lead-bar':
        return ('<div class="plp-sticky plp-sticky-bar" data-hide="%s" aria-hidden="true">%s</div>\n'
                % (e(hide), lead_form(P, 'thanh dính đáy', 'bar', 'bar')))
    if sec.get('mode') == 'lead':
        # bấm → cuộn tới form gần nhất phía dưới (không bắt khách quay lên đầu) và đặt con trỏ vào ô SĐT
        return ('<div class="plp-sticky plp-sticky-lead" data-hide="%s" aria-hidden="true">'
                '<div class="plp-sticky-p"><b>%s</b><small>%s</small></div>'
                '<button type="button" class="plp-btn plp-btn-buy" data-plp-focus tabindex="-1">%s%s</button></div>\n'
                % (e(hide), vnd(p['price']) if p.get('price') else '', e(sec.get('label', '')), e(sec.get('button', 'ĐĂNG KÝ NGAY')), icon('arrow', 18)))
    if not p.get('cta'):
        return ''
    consult = p.get('consult') or {}
    cbtn = ''
    if consult:
        cbtn = ('<button type="button" class="plp-sticky-tv" data-plp-consult data-phone="%s" aria-label="Tư vấn">%s<span>%s</span></button>'
                % (e(consult.get('phone', '')), icon('headset', 20), e(consult.get('label', 'Tư vấn'))))
    return ('<div class="plp-sticky" data-hide="%s" aria-hidden="true">%s'
            '<div class="plp-sticky-p"><small>%s</small><b>%s</b></div>%s</div>\n'
            % (e(hide), cbtn, e(sec.get('label', p.get('short', ''))), vnd(p['price']) if p.get('price') else '',
               cta_link(p['cta'], 'plp-btn plp-btn-buy', extra=' tabindex="-1"')))


# ── Form để lại số điện thoại (dùng ở hero, dải giữa trang, CTA cuối) ──────

def lead_form(P, nguon, variant='stack', uid=None):
    L = P.get('lead')
    if not L:
        return ''
    uid = uid or nguon
    if variant == 'bar':
        return lead_bar(P, L, nguon, uid)
    return (
        '<form class="plp-lead plp-lead-%(v)s" data-plp-lead data-nguon="%(nguon)s" data-form="%(form)s" '
        'data-san-pham="%(sp)s" data-nhu-cau="%(nc)s" data-ok="%(okp)s" novalidate>'
        '<input type="text" name="bot-field" class="plp-hp" tabindex="-1" autocomplete="off" aria-hidden="true">'
        '<div class="plp-lead-fields">'
        '<label class="plp-sr" for="sdt-%(uid)s">%(ph)s</label>'
        '<input class="plp-lead-in" id="sdt-%(uid)s" name="dien-thoai" type="tel" inputmode="tel" autocomplete="tel" '
        'placeholder="%(ph)s" maxlength="16" required aria-describedby="err-%(uid)s">'
        '<button type="submit" class="plp-btn plp-btn-buy plp-lead-btn">%(btn)s</button>'
        '</div>'
        '<p class="plp-lead-err" id="err-%(uid)s" role="alert" hidden></p>'
        '<p class="plp-lead-after">%(ic)s%(after)s</p>'
        # lớp dbv-dongy-ngan: dbv-tracking.js thấy đã có thông báo đồng ý nên không chèn thêm dòng thứ hai
        '<p class="plp-lead-legal dbv-dongy-ngan">%(legal)s</p>'
        '<div class="plp-lead-ok" hidden role="status" tabindex="-1">'
        '<span class="plp-lead-ok-ic">%(ok_ic)s</span>'
        '<b>%(ok_t)s</b><p class="plp-lead-ok-p"></p>'
        '%(ok_cta)s'
        '</div>'
        '</form>') % {
        'v': variant, 'nguon': e(nguon), 'uid': e(uid), 'form': e(L['form_name']), 'sp': e(L['san_pham']),
        'nc': e(L.get('nhu_cau', '')), 'ph': e(L.get('placeholder', 'Số điện thoại của bạn')),
        'btn': e(L.get('button', 'ĐĂNG KÝ NGAY')), 'ic': icon('headset', 16),
        'after': e(L.get('after', '')), 'legal': L.get('legal_html', ''),
        'okp': e(L.get('success_text', '')), 'ok_ic': icon('check', 22), 'ok_t': e(L.get('success_title', 'Đã nhận đăng ký')),
        'ok_cta': ('<a class="plp-btn plp-btn-ghost plp-lead-ok-cta" href="%s" target="_blank" rel="noopener">%s</a>'
                   % (e(L['success_cta']['href']), e(L['success_cta']['label']))) if L.get('success_cta') else ''}


def lead_bar(P, L, nguon, uid):
    """Thanh dính đáy trên mobile: ô SĐT + nút Đăng ký mua (kiểu Shopee)."""
    p = P.get('product', {})
    return (
        '<form class="plp-lead plp-lead-bar" data-plp-lead data-nguon="%(nguon)s" data-form="%(form)s" '
        'data-san-pham="%(sp)s" data-nhu-cau="%(nc)s" data-ok="%(okp)s" novalidate>'
        '<input type="text" name="bot-field" class="plp-hp" tabindex="-1" autocomplete="off" aria-hidden="true">'
        '<div class="plp-bar-top"><span><b data-v-price>%(price)s</b> · <span data-v-label>%(vlabel)s</span></span>'
        '<span class="plp-lead-legal dbv-dongy-ngan">Đăng ký = đồng ý <a href="/chinh-sach-bao-mat" target="_blank" rel="noopener">chính sách dữ liệu</a></span></div>'
        '<div class="plp-lead-fields">'
        '<label class="plp-sr" for="sdt-%(uid)s">%(ph)s</label>'
        '<input class="plp-lead-in" id="sdt-%(uid)s" name="dien-thoai" type="tel" inputmode="tel" autocomplete="tel" '
        'placeholder="Số điện thoại" maxlength="16" required aria-describedby="err-%(uid)s">'
        '<button type="submit" class="plp-btn plp-btn-buy plp-lead-btn">%(btn)s</button>'
        '</div>'
        '<p class="plp-lead-err" id="err-%(uid)s" role="alert" hidden></p>'
        '<div class="plp-lead-ok" hidden role="status" tabindex="-1"><b>%(ok_t)s</b><p class="plp-lead-ok-p"></p></div>'
        '</form>') % {
        'nguon': e(nguon), 'uid': e(uid), 'form': e(L['form_name']), 'sp': e(L['san_pham']),
        'nc': e(L.get('nhu_cau', '')), 'okp': e(L.get('success_text', '')), 'ph': e(L.get('placeholder', '')),
        'btn': e(L.get('button_short', L.get('button', 'Đăng ký'))), 'ok_t': e(L.get('success_title', '')),
        'price': vnd(p.get('price', 0)), 'vlabel': e(default_variant(P).get('label', ''))}


def default_variant(P):
    vs = P.get('product', {}).get('variants') or []
    for v in vs:
        if v.get('default'):
            return v
    return vs[0] if vs else {}


def c_product(sec, P):
    """Khối sản phẩm kiểu sàn TMĐT: ảnh bên trái, giá + tuỳ chọn + form SĐT bên phải."""
    p = P.get('product', {})
    if not sec.get('title') and not p.get('name'):
        return ''
    # Nguyên tắc: ảnh sản phẩm chỉ dùng ảnh NGANG — giữ khối sản phẩm thấp gọn.
    imgs = []
    for im in sec.get('images') or []:
        try:
            ngang = int(im.get('width', 0)) > int(im.get('height', 0))
        except (TypeError, ValueError):
            ngang = False
        if ngang:
            imgs.append(im)
        else:
            print('  ! bỏ ảnh không phải ảnh ngang (hoặc thiếu width/height):', im.get('src'), file=sys.stderr)
    gal = ''
    if imgs:
        slides = ''.join(
            '<figure class="plp-gal-sl" id="anh-%d"><img src="%s" alt="%s" width="%s" height="%s"%s decoding="async"></figure>'
            % (i + 1, e(im['src']), e(im.get('alt', '')), e(im.get('width', '')), e(im.get('height', '')),
               ' fetchpriority="high"' if i == 0 else ' loading="lazy"') for i, im in enumerate(imgs))
        thumbs = ''.join(
            '<button type="button" class="plp-gal-th%s" data-i="%d" aria-label="Xem ảnh %d"><img src="%s" alt="" loading="lazy" width="80" height="80"></button>'
            % (' on' if i == 0 else '', i, i + 1, e(im['src'])) for i, im in enumerate(imgs))
        gal = ('<div class="plp-gal"><div class="plp-gal-main" tabindex="0" aria-label="Ảnh sản phẩm">%s</div>'
               '<span class="plp-gal-count"><b>1</b>/%d</span>'
               '%s<div class="plp-gal-thumbs">%s</div></div>'
               % (slides, len(imgs), ('<span class="plp-gal-note">%s</span>' % e(sec['image_note'])) if sec.get('image_note') else '', thumbs))
    v0 = default_variant(P)
    info = '<div class="plp-pi">'
    if sec.get('badges'):
        info += '<div class="plp-pi-badges">' + ''.join(
            '<span class="%s">%s</span>' % ('plp-mall' if i == 0 else 'plp-pill', e(b)) for i, b in enumerate(sec['badges'])) + '</div>'
    info += '<h1 class="plp-pi-t">%s</h1>' % e(sec.get('title') or p['name'])
    if sec.get('subtitle'):
        info += '<p class="plp-pi-sub">%s</p>' % e(sec['subtitle'])
    info += ('<div class="plp-pi-price"><div><b data-v-price>%s</b><span>%s</span></div><small data-v-note>%s</small></div>'
             % (vnd(v0.get('price', p.get('price', 0))), e(p.get('price_unit', '')), e(v0.get('note', p.get('price_note', '')))))
    vs = p.get('variants') or []
    rows = ''
    dims = p.get('variant_dims') or []
    if vs and dims:
        rows += variant_dims_html(p, vs, v0, dims)
    elif vs:
        btns = ''.join(
            '<button type="button" class="plp-var%s" role="radio" aria-checked="%s" data-label="%s" data-price="%s" data-note="%s">'
            '<b>%s</b>%s<span class="plp-var-p">%s</span></button>'
            % (' on' if v is v0 else '', 'true' if v is v0 else 'false', e(v['label']), e(v['price']), e(v.get('note', '')),
               e(v['label']), ('<small>%s</small>' % e(v['sub'])) if v.get('sub') else '', vnd(v['price'])) for v in vs)
        rows += ('<div class="plp-pi-row plp-pi-vars"><span class="plp-pi-lbl" id="lbl-loai">%s</span>'
                 '<div class="plp-vars plp-vars-n%d" role="radiogroup" aria-labelledby="lbl-loai">%s</div></div>'
                 % (e(p.get('variant_label', 'Loại xe')), len(vs), btns))
    rows += switch_html(sec, P)
    for r in sec.get('rows', []):
        rows += ('<div class="plp-pi-row"><span class="plp-pi-lbl">%s</span><div class="plp-pi-val">%s<span>%s%s</span></div></div>'
                 % (e(r['label']), icon(r.get('icon', 'check'), 18), e(r['value']),
                    ('<small>%s</small>' % e(r['sub'])) if r.get('sub') else ''))
    info += rows
    info += '<div class="plp-pi-buy">' + lead_form(P, 'khối sản phẩm', 'combo', 'sp') + '</div>'
    info += '</div>'
    inner = '<div class="plp-pd%s">%s%s</div>' % ('' if gal else ' plp-noimg', gal, info)
    return section(sec, inner)


def _tim_bien_the(vs, combo):
    for v in vs:
        d = v.get('dims') or {}
        if all(d.get(k) == val for k, val in combo.items()):
            return v
    return None


def variant_dims_html(p, vs, v0, dims):
    """Tuỳ chọn hai chiều kiểu "Màu × Size" (vd. Loại biển × Số chỗ).
    Mỗi chiều là một hàng nút; tổ hợp đã chọn trỏ tới một biến thể thật nằm ẩn
    trong .plp-var-src — product-lp.js dùng biến thể đó để đổi giá và gửi lead."""
    cur = dict(v0.get('dims') or {})
    out = ''
    for d in dims:
        k = d['key']
        chips = ''
        for val in d['options']:
            combo = dict(cur); combo[k] = val
            m = _tim_bien_the(vs, combo)
            on = cur.get(k) == val
            chips += ('<button type="button" class="plp-var plp-dim%s" role="radio" aria-checked="%s" data-dim="%s" data-val="%s"%s>'
                      '<b>%s</b><span class="plp-var-p">%s</span></button>'
                      % (' on' if on else '', 'true' if on else 'false', e(k), e(val), '' if m else ' disabled',
                         e(val), vnd(m['price']) if m else '—'))
        out += ('<div class="plp-pi-row plp-pi-vars"><span class="plp-pi-lbl" id="lbl-%s">%s</span>'
                '<div class="plp-vars plp-dims plp-vars-n%d" role="radiogroup" aria-labelledby="lbl-%s">%s</div></div>'
                % (e(k), e(d['label']), len(d['options']), e(k), chips))
    src = ''.join(
        '<button type="button" class="plp-var%s" tabindex="-1" data-dims="%s" data-label="%s" data-price="%s" data-note="%s"></button>'
        % (' on' if v is v0 else '', attr_json(v.get('dims') or {}), e(v['label']), e(v['price']), e(v.get('note', ''))) for v in vs)
    return out + '<div class="plp-var-src" hidden>%s</div>' % src


def switch_html(sec, P):
    """Link "Không phải xe này? Đổi loại xe" — mở danh sách mọi loại xe trong danh mục."""
    cat = P.get('_catalog')
    sw = sec.get('switch')
    if not cat or not sw:
        return ''
    lis = ''
    for it in cat['items']:
        cur = it['key'] == P.get('slug')
        lis += ('<li><a href="%s"%s><span>%s</span><small>Từ %s/năm</small></a></li>'
                % (e(it['href']), ' aria-current="page"' if cur else '', e(it['title']), vnd(it['price_from'])))
    return ('<details class="plp-sw"><summary>%s <b>%s</b>%s</summary><ul>%s</ul>'
            '<a class="plp-sw-all" href="%s">%s%s</a></details>'
            % (e(sw.get('label', 'Không phải xe này?')), e(sw.get('text', 'Đổi loại xe')), icon('chevron', 16), lis,
               e(cat.get('hub', '/')), e(sw.get('all', 'Xem tất cả loại xe')), icon('arrow', 16)))


def with_lead(P, sec):
    """Khối có "lead" riêng (vd. dải báo giá đội xe) → ghi đè nhu cầu/sản phẩm cho form của khối đó."""
    if not sec.get('lead') or not P.get('lead'):
        return P
    P2 = dict(P)
    P2['lead'] = dict(P['lead'], **sec['lead'])
    return P2


def c_intro(sec, P):
    """Đầu trang danh mục: H1 + một câu + dải tin cậy + lối tắt tới từng nhóm."""
    if not sec.get('title'):
        return ''
    h = ''
    if sec.get('eyebrow'):
        h += '<span class="plp-eyebrow">%s</span>' % e(sec['eyebrow'])
    h += '<h1 class="plp-intro-t">%s</h1>' % e(sec['title'])
    if sec.get('text'):
        h += '<p class="plp-intro-p">%s</p>' % e(sec['text'])
    if sec.get('trust'):
        h += '<ul class="plp-intro-trust">' + ''.join('<li>%s<span>%s</span></li>' % (icon(t.get('icon', 'check'), 16), e(t['text'])) for t in sec['trust']) + '</ul>'
    if sec.get('jump'):
        h += ('<nav class="plp-intro-jump" aria-label="%s"><span>%s</span>%s</nav>'
              % (e(sec.get('jump_label', 'Chọn nhanh')), e(sec.get('jump_label', 'Chọn nhanh')),
                 ''.join('<a href="%s">%s</a>' % (e(j['href']), e(j['label'])) for j in sec['jump'])))
    return section(sec, h, 'plp-intro')


def c_category(sec, P):
    """Lưới thẻ loại xe lấy từ file danh mục (content/san-pham/_danh-muc-*.json)."""
    cat = P.get('_catalog')
    if not cat:
        return ''
    items = [it for it in cat['items'] if it.get('group') == sec.get('group')]
    if not items:
        return ''
    P.setdefault('_itemlist', []).extend(items)
    lis = ''
    for it in items:
        lis += ('<li class="plp-cat-it"><a href="%s">'
                '<span class="plp-cat-img"><img src="%s" alt="%s" width="%s" height="%s" loading="lazy" decoding="async"></span>'
                '<span class="plp-cat-b"><span class="plp-cat-t">%s</span><span class="plp-cat-s">%s</span>'
                '<span class="plp-cat-p">Từ <b>%s</b>/năm</span>'
                '<span class="plp-cat-go">%s%s</span></span></a></li>'
                % (e(it['href']), e(it['image']), e(it.get('alt', it['title'])), e(it.get('width', 800)), e(it.get('height', 600)),
                   e(it['title']), e(it.get('sub', '')), vnd(it['price_from']), e(sec.get('go', 'Xem giá')), icon('arrow', 16)))
    inner = head_block(sec) + '<ul class="plp-cat plp-cat-%s">%s</ul>' % (e(sec.get('size', 'md')), lis)
    return section(sec, inner)


def c_fee_table(sec, P):
    """Bảng phí tóm tắt — mặc định thu gọn trong <details> để không làm ngợp trang."""
    groups = sec.get('groups') or []
    if not groups:
        return ''
    body = ''
    for g in groups:
        body += '<div class="plp-fee-g"><h3>%s</h3><dl>%s</dl></div>' % (
            e(g['title']), ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (e(r[0]), e(r[1])) for r in g['rows']))
    foot = ''
    if sec.get('note'):
        foot += '<p class="plp-src">%s</p>' % e(sec['note'])
    if sec.get('link'):
        foot += '<a class="plp-link" href="%s">%s%s</a>' % (e(sec['link']['href']), e(sec['link']['label']), icon('arrow', 16))
    grid = '<div class="plp-fee">%s</div>%s' % (body, foot)
    if sec.get('collapsed', True):
        inner = ('<details class="plp-fee-d"><summary><span class="plp-h2">%s</span>%s</summary>%s</details>'
                 % (e(sec['title']), icon('chevron', 20), grid))
    else:
        inner = head_block(sec) + grid
    return section(sec, inner)


def c_shop(sec, P):
    if not sec.get('name'):
        return ''
    lg = sec.get('logo') or {}
    btns = ''.join('<a class="plp-btn %s" href="%s"%s>%s%s</a>' % (
        'plp-btn-outline' if i == 0 else 'plp-btn-ghost', e(b['href']),
        ' target="_blank" rel="noopener"' if b['href'].startswith('http') else '', icon(b.get('icon', 'arrow'), 18), e(b['label']))
        for i, b in enumerate(sec.get('buttons', [])))
    facts = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (e(f['label']), e(f['value'])) for f in sec.get('facts', []))
    inner = ('<div class="plp-shop"><div class="plp-shop-id">%s<div><b>%s</b><span>%s</span><div class="plp-shop-btns">%s</div></div></div>'
             '<dl class="plp-shop-facts">%s</dl></div>%s'
             % (('<img class="plp-shop-logo" src="%s" alt="%s" width="%s" height="%s" loading="lazy">' % (e(lg['src']), e(lg.get('alt', '')), e(lg.get('width', '')), e(lg.get('height', '')))) if lg else '',
                e(sec['name']), e(sec.get('sub', '')), btns, facts,
                ('<p class="plp-src">%s</p>' % e(sec['source'])) if sec.get('source') else ''))
    return section(sec, inner)


def c_specs(sec, P):
    rows = sec.get('rows') or []
    if not rows:
        return ''
    trs = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (e(r[0]), e(r[1])) for r in rows)
    inner = head_block(sec) + '<dl class="plp-specs">%s</dl>' % trs
    return section(sec, inner)


def c_related(sec, P):
    items = sec.get('items') or []
    if not items:
        return ''
    cards = ''
    for it in items:
        price = ('<b class="plp-rel-p">%s<small>%s</small></b>' % (vnd(it['price']), e(it.get('unit', '')))) if it.get('price') else \
                ('<b class="plp-rel-p plp-rel-p-txt">%s</b>' % e(it.get('price_text', 'Xem phí')))
        cards += ('<li class="plp-rel"><a href="%s"><span class="plp-rel-img"><img src="%s" alt="%s" width="%s" height="%s" loading="lazy">%s</span>'
                  '<span class="plp-rel-b"><span class="plp-rel-t">%s</span>%s<span class="plp-rel-s">%s</span></span></a></li>'
                  % (e(it['href']), e(it['image']), e(it.get('alt', it['title'])), e(it.get('width', '')), e(it.get('height', '')),
                     ('<span class="plp-rel-tag">%s</span>' % e(it['tag'])) if it.get('tag') else '',
                     e(it['title']), price, e(it.get('sub', ''))))
    inner = head_block(sec) + '<ul class="plp-rels">%s</ul>' % cards
    return section(sec, inner)


def c_hero_lead(sec, P):
    p = P.get('product', {})
    h = '<div class="plp-hl-box">'
    if sec.get('eyebrow'):
        h += '<span class="plp-badge">%s%s</span>' % (icon('shield', 15), e(sec['eyebrow']))
    h += '<h1 class="plp-h1">%s</h1>' % e(sec['title'])
    if sec.get('value_prop'):
        h += '<p class="plp-vp">%s</p>' % e(sec['value_prop'])
    if p.get('price'):
        h += ('<div class="plp-hl-price"><b>%s</b><span>%s</span></div><span class="plp-hl-vat">%s</span>'
              % (vnd(p['price']), e(p.get('price_unit', '')), e(p.get('price_note', ''))))
    checks = sec.get('checks') or []
    ch = ''
    if checks:
        ch = '<ul class="plp-checks">' + ''.join('<li>%s%s</li>' % (icon('check', 16), e(c)) for c in checks) + '</ul>'
    # mobile: dấu tick lên trên form (theo thứ tự mắt đọc); desktop: dưới form
    h += ch.replace('plp-checks', 'plp-checks plp-checks-top', 1)
    h += lead_form(P, 'đầu trang', 'stack', 'hero')
    h += ch.replace('plp-checks', 'plp-checks plp-checks-bottom', 1)
    if sec.get('price_link'):
        h += '<a class="plp-link plp-hl-link" href="%s">%s%s</a>' % (e(sec['price_link']['href']), e(sec['price_link']['label']), icon('arrow', 16))
    h += '</div>'
    return section(sec, h)


def c_lead_band(sec, P):
    if not P.get('lead'):
        return ''
    P = with_lead(P, sec)
    inner = ('<div class="plp-band"><div class="plp-band-txt"><h2 class="plp-h2">%s</h2>%s</div>%s</div>'
             % (e(sec.get('title', '')), (('<p class="plp-sub">%s</p>' % e(sec['subtitle'])) if sec.get('subtitle') else '')
                + (('<a class="plp-link plp-band-link" href="%s">%s%s</a>' % (e(sec['link']['href']), e(sec['link']['label']), icon('arrow', 16))) if sec.get('link') else ''),
                lead_form(P, 'giữa trang', 'inline', sec.get('id', 'giua-trang'))))
    return section(sec, inner)


def c_checklist(sec, P):
    items = sec.get('items') or []
    if not items:
        return ''
    lis = ''.join('<li><span class="plp-tick ok">%s</span><span>%s</span></li>' % (icon('check', 16), e(x)) for x in items)
    inner = head_block(sec) + '<ul class="plp-checklist">%s</ul>' % lis
    return section(sec, inner)


def c_trust(sec, P):
    if not sec.get('title'):
        return ''
    out = '<div class="plp-trust-box">'
    if sec.get('logo'):
        lg = sec['logo']
        out += '<img class="plp-trust-logo" src="%s" alt="%s" width="%s" height="%s" loading="lazy">' % (
            e(lg['src']), e(lg.get('alt', '')), e(lg.get('width', '')), e(lg.get('height', '')))
    out += '<span class="plp-eyebrow">%s</span>' % e(sec.get('eyebrow', '')) if sec.get('eyebrow') else ''
    out += '<h2 class="plp-h2">%s</h2>' % e(sec['title'])
    if sec.get('subtitle'):
        out += '<p class="plp-sub">%s</p>' % e(sec['subtitle'])
    if sec.get('checks'):
        out += '<ul class="plp-checks plp-checks-c">' + ''.join('<li>%s%s</li>' % (icon('check', 16), e(c)) for c in sec['checks']) + '</ul>'
    facts = sec.get('facts') or []
    if facts:
        out += '<dl class="plp-facts">' + ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (e(f['value']), e(f['label'])) for f in facts) + '</dl>'
        if sec.get('facts_source'):
            out += '<p class="plp-src">%s</p>' % e(sec['facts_source'])
    org = sec.get('org') or []
    if org:
        out += '<ul class="plp-org">' + ''.join('<li>%s<span><small>%s</small>%s</span></li>' % (icon(o.get('icon', 'building'), 18), e(o['label']), e(o['value'])) for o in org) + '</ul>'
    out += '</div>'
    return section(sec, out)


COMPONENTS = {
    'breadcrumb': c_breadcrumb, 'hero': c_hero, 'calculator': c_calculator,
    'benefits': c_benefits, 'coverage': c_coverage, 'plans': c_plans, 'reasons': c_reasons,
    'steps': c_steps, 'checkout': c_checkout, 'exclusions': c_exclusions, 'faq': c_faq,
    'final_cta': c_final_cta, 'sticky_cta': c_sticky_cta,
    'lead_band': c_lead_band, 'checklist': c_checklist, 'trust': c_trust,
    'product': c_product, 'shop': c_shop, 'specs': c_specs, 'related': c_related,
    'intro': c_intro, 'category': c_category, 'fee_table': c_fee_table,
}


# ── Trang ───────────────────────────────────────────────────────────────────

def json_ld(P):
    seo = P['seo']
    p = P.get('product', {})
    out = []
    bc = next((s for s in P['sections'] if s['type'] == 'breadcrumb' and not s.get('hidden')), None)
    if bc:
        els = []
        for i, it in enumerate(bc['items']):
            el = {'@type': 'ListItem', 'position': i + 1, 'name': it['label']}
            el['item'] = ('https://dbv247.com.vn' + it['href']) if it.get('href') and it['href'].startswith('/') else seo['canonical']
            els.append(el)
        out.append({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': els})
    if p.get('price'):
        out.append({
            '@context': 'https://schema.org', '@type': 'Product', 'name': p['name'],
            'description': seo['description'], 'image': seo.get('og_image'),
            'brand': {'@type': 'Brand', 'name': 'Bảo hiểm DBV'},
            'offers': ({'@type': 'AggregateOffer', 'priceCurrency': 'VND',
                        'lowPrice': min(v['price'] for v in p['variants']), 'highPrice': max(v['price'] for v in p['variants']),
                        'offerCount': len(p['variants']), 'availability': 'https://schema.org/InStock', 'url': seo['canonical']}
                       if p.get('variants') else
                       {'@type': 'Offer', 'price': p['price'], 'priceCurrency': 'VND',
                        'availability': 'https://schema.org/InStock', 'url': seo['canonical']}),
        })
    if P.get('_itemlist'):
        seen, els = set(), []
        for it in P['_itemlist']:
            if it['href'] in seen:
                continue
            seen.add(it['href'])
            els.append({'@type': 'ListItem', 'position': len(els) + 1, 'name': it['title'],
                        'url': 'https://dbv247.com.vn' + it['href']})
        out.append({'@context': 'https://schema.org', '@type': 'ItemList', 'name': seo.get('og_title', seo['title']),
                    'itemListElement': els})
    if P.get('_faq'):
        out.append({'@context': 'https://schema.org', '@type': 'FAQPage', '@id': seo['canonical'] + '#faq',
                    'mainEntity': [{'@type': 'Question', 'name': f['q'],
                                    'acceptedAnswer': {'@type': 'Answer', 'text': f['a']}} for f in P['_faq']]})
    return ''.join('<script type="application/ld+json">\n%s\n</script>\n' % json.dumps(x, ensure_ascii=False, indent=1) for x in out)


def build(P, noindex=False):
    body = ''
    for sec in P['sections']:
        if sec.get('hidden'):
            continue
        fn = COMPONENTS.get(sec['type'])
        if not fn:
            print('  ! bỏ qua khối không rõ loại:', sec['type'], file=sys.stderr)
            continue
        h = fn(sec, P)
        if not h:
            print('  - ẩn khối "%s" (thiếu dữ liệu)' % sec['type'], file=sys.stderr)
        body += h
    # Nút trỏ tới khối đã bị ẩn (vd. "#tinh-phi" khi trang không có máy tính phí)
    # thì bỏ luôn nút đó, tránh nút bấm không đi đâu cả.
    ids = set(re.findall(r'\bid="([^"]+)"', body))
    def _drop(m):
        return m.group(0) if m.group(1) in ids else ''
    body = re.sub(r'<a href="#([^"]+)" class="plp-btn[^"]*"[^>]*>[^<]*</a>', _drop, body)
    seo = P['seo']
    robots = '<meta name="robots" content="noindex, follow">\n' if noindex else ''
    return ('<!DOCTYPE html>\n<html lang="vi">\n<head>\n'
            '<meta charset="UTF-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            '<title>%(title)s</title>\n'
            '<meta name="description" content="%(desc)s">\n%(robots)s'
            '<link rel="canonical" href="%(canon)s">\n'
            '<meta property="og:type" content="%(ogtype)s">\n'
            '<meta property="og:title" content="%(ogt)s">\n'
            '<meta property="og:description" content="%(ogd)s">\n'
            '<meta property="og:url" content="%(canon)s">\n'
            '<meta property="og:image" content="%(ogi)s">\n'
            '<meta name="theme-color" content="#007437">\n'
            '<link rel="icon" href="/favicon.ico">\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n'
            '<link rel="stylesheet" href="/assets/product-lp.css?v=%(cv)s">\n'
            '%(ld)s'
            '</head>\n<body class="plp-page">\n'
            '<main class="plp%(theme)s" id="noi-dung">\n%(body)s</main>\n'
            '<script src="/assets/dbv-tracking.js" defer></script>\n'
            '<script src="/assets/product-lp.js?v=%(jv)s" defer></script>\n'
            '</body>\n</html>\n') % {
        'title': e(seo['title']), 'desc': e(seo['description']), 'robots': robots,
        'canon': e(seo['canonical']), 'ogt': e(seo.get('og_title', seo['title'])),
        'ogd': e(seo.get('og_description', seo['description'])), 'ogi': e(seo.get('og_image', '')),
        'theme': (' plp-theme-' + P['theme']) if P.get('theme') else '',
        'ogtype': e(P.get('og_type', 'product')),
        'cv': CSS_VER, 'jv': JS_VER, 'ld': json_ld(P), 'body': body}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('data', help='File JSON dữ liệu trang')
    ap.add_argument('--root', default='.', help='Thư mục gốc site (netlify_upload)')
    ap.add_argument('--out', help='Tên file HTML đầu ra (mặc định <slug>.html)')
    ap.add_argument('--noindex', action='store_true', help='Thêm noindex — dùng cho bản xem trước')
    ap.add_argument('--sync', action='store_true', help='Chạy tiếp sync_capdon.py và sync_layout.py')
    a = ap.parse_args()
    with open(os.path.join(a.root, a.data) if not os.path.isabs(a.data) else a.data, encoding='utf-8') as f:
        P = json.load(f)
    if P.get('catalog'):
        with open(os.path.join(a.root, P['catalog']), encoding='utf-8') as f:
            P['_catalog'] = json.load(f)
    out = a.out or (P['slug'] + '.html')
    html_ = build(P, a.noindex)
    with open(os.path.join(a.root, out), 'w', encoding='utf-8', newline='\n') as f:
        f.write(html_)
    print('Đã dựng', out, '(%d ký tự)' % len(html_))
    if a.sync:
        here = os.path.dirname(os.path.abspath(__file__))
        for sc in ('sync_capdon.py', 'sync_layout.py'):
            r = subprocess.run([sys.executable, os.path.join(here, sc), '--root', a.root, '--write', '--only', out],
                               capture_output=True, text=True)
            print('──', sc, 'exit', r.returncode)
            print(r.stdout[-1500:], r.stderr[-800:])


if __name__ == '__main__':
    main()
