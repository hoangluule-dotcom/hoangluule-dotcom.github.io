"""Trang tin tức theo v1.0 (02/10/2026): bỏ dải màu thay ảnh bìa (navy/tím/nâu) trong tin-tuc.html,
đưa news-page.css về token chung, cỡ chữ theo chuẩn, ô nhập 16px trên điện thoại."""
import sys,re
html,css=sys.argv[1],sys.argv[2]
t=open(html,encoding='utf-8',newline='').read()
a=t.find('/* ══ THẺ TIN TỨC — DẢI MÀU THAY ẢNH BÌA ══'); b=t.find('.guide-card-body{padding-top:11px}',a)
assert a>0 and b>a
b=b+len('.guide-card-body{padding-top:11px}')
m=re.match(r'\r?\n',t[b:]); b+= m.end() if m else 0
t=t[:a]+t[b:]
open(html,'w',encoding='utf-8',newline='').write(t)
s=open(css,encoding='utf-8',newline='').read()
mq=s.index('@media(max-width:767px){')
d,mo=s[:mq],s[mq:]
def R(x,a,b):
    assert x.count(a)==1,(a,x.count(a)); return x.replace(a,b)
for a,b in [('.nt{--nt-green:#007437;--nt-dark:#084c38;--nt-mint:#eff8f2;--nt-border:#e0ebe4;','.nt{--nt-green:var(--c-brand);--nt-dark:var(--c-heading);--nt-mint:var(--c-mint);--nt-border:var(--c-border);'),
            ('.nt :focus-visible{outline:3px solid #e8920a;','.nt :focus-visible{outline:3px solid var(--c-brand);'),
            ('.nt-breadcrumb{font-size:12px;color:#66766e;','.nt-breadcrumb{font-size:12px;color:var(--c-text-muted);'),
            ('background:linear-gradient(110deg,#eff8f2,#e1f1e7);border:1px solid var(--nt-border);border-radius:var(--radius-panel,24px)','background:var(--grad-mint);border:1px solid var(--nt-border);border-radius:var(--radius-panel,24px)'),
            ('.nt-hero p{font-size:15px;color:#52675b;','.nt-hero p{font-size:16px;color:var(--c-text-muted);'),
            ('.nt-btn:hover{background:#e6f3eb}','.nt-btn:hover{background:var(--c-mint)}'),
            ('.nt-orange{background:#e8920a;border-color:#e8920a;','.nt-orange{background:var(--c-accent);border-color:var(--c-accent);'),
            ('.nt-orange:hover{background:#c97d08;border-color:#c97d08}','.nt-orange:hover{background:var(--c-accent-hover);border-color:var(--c-accent-hover)}'),
            ('padding:10px 16px;font-size:13px;color:var(--nt-green)','padding:10px 16px;font-size:14px;color:var(--nt-green)'),
            ('.nt .news-tab .n{font-size:10px}','.nt .news-tab .n{font-size:12px}'),
            ('box-shadow:0 3px 14px #084c3807;','box-shadow:var(--shadow-card);'),
            ('.nt .guide-card:hover{transform:none;border-color:#9ac8ac;box-shadow:0 7px 22px #084c3810}','.nt .guide-card:hover{transform:none;border-color:#9ac8ac;box-shadow:var(--shadow-card-hover)}'),
            ('.nt .guide-card-cat{background:#eaf6ee;color:var(--nt-green);font-size:11px;','.nt .guide-card-cat{background:var(--c-green-soft);color:var(--nt-green);font-size:12px;'),
            ('.nt .guide-card-date{font-size:11px;color:#718078}','.nt .guide-card-date{font-size:12px;color:var(--c-text-muted)}'),
            ('.nt .guide-card p{font-size:13px;line-height:1.65;color:#64756b;','.nt .guide-card p{font-size:14px;line-height:1.6;color:var(--c-text-muted);'),
            ('.nt .guide-card-more{font-size:13px;','.nt .guide-card-more{font-size:14px;'),
            ('.nt-toolbar p{font-size:12px;color:#64756b;','.nt-toolbar p{font-size:12px;color:var(--c-text-muted);'),
            ('.nt-sort{display:flex;align-items:center;gap:8px;font-size:12px;color:#64756b}','.nt-sort{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--c-text-muted)}'),
            ('.nt-empty p{margin:12px 0 18px;color:#64756b}','.nt-empty p{margin:12px 0 18px;color:var(--c-text-muted)}'),
            ('border-radius:24px;background:linear-gradient(110deg,#eff8f2,#e1f1e7);padding:20px 24px 20px 0','border-radius:var(--radius-panel,24px);background:var(--grad-mint);padding:20px 24px 20px 0'),
            ('.nt-consult h2{font-size:21px}','.nt-consult h2{font-size:24px}'),
            ('.nt-support span{display:block;color:#64756b;font-size:12px;','.nt-support span{display:block;color:var(--c-text-muted);font-size:14px;')]:
    d=R(d,a,b)
for a,b in [('.nt h1{font-size:27px}','.nt h1{font-size:28px}'),('.nt h2{font-size:21px}','.nt h2{font-size:22px}'),
            ('.nt-breadcrumb{font-size:11px;','.nt-breadcrumb{font-size:12px;'),
            ('.nt-hero p{font-size:13px;','.nt-hero p{font-size:15px;'),
            ('.nt-search input{font-size:12px;padding:8px}','.nt-search input{font-size:16px;padding:8px}'),
            ('.nt-search .nt-btn{font-size:12px;padding:8px 12px}','.nt-search .nt-btn{font-size:14px;padding:8px 12px}'),
            ('.nt .news-tab{flex:0 0 auto;font-size:12px;','.nt .news-tab{flex:0 0 auto;font-size:14px;'),
            ('.nt .guide-card h3{font-size:14px;line-height:1.5}','.nt .guide-card h3{font-size:16px;line-height:1.45}'),
            ('.nt .guide-card-date{font-size:10px}.nt .guide-card-cat{font-size:10px}','.nt .guide-card-date{font-size:12px}.nt .guide-card-cat{font-size:12px}'),
            ('.nt-sort{margin-left:auto;font-size:11px}','.nt-sort{margin-left:auto;font-size:12px}.nt-sort select{font-size:16px}'),
            ('.nt .guide-card-more{font-size:12px}','.nt .guide-card-more{font-size:14px}'),
            ('.nt-consult h2{font-size:19px}','.nt-consult h2{font-size:22px}'),
            ('.nt-actions .nt-btn{font-size:12px;padding:10px 8px}','.nt-actions .nt-btn{font-size:14px;padding:10px 8px}'),
            ('.nt-support span{font-size:11px}','.nt-support span{font-size:13px}')]:
    mo=R(mo,a,b)
open(css,'w',encoding='utf-8',newline='').write(d+mo); print('ok')
