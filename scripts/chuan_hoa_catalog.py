"""Trang danh mục (san-pham.html → assets/catalog.css) theo v1.0 — 30/09/2026."""
import sys,re
p=sys.argv[1]; s=open(p,encoding='utf-8',newline='').read()
mq=s.index('@media(max-width:767px){')
desk,mob=s[:mq],s[mq:]
def R(t,a,b,n=1):
    c=t.count(a); assert c==n,(a,c); return t.replace(a,b)
# token
desk=R(desk,'.dc{--dc-green:#007437;--dc-dark:#084c38;--dc-mint:#eff8f2;--dc-border:#e1ebe4;--dc-muted:#4f5f57;background:#fff;color:#1c2b24;',
            '.dc{--dc-green:var(--c-brand);--dc-dark:var(--c-heading);--dc-mint:var(--c-mint);--dc-border:var(--c-border);--dc-muted:var(--c-text-muted);background:#fff;color:var(--c-text);')
desk=R(desk,'.dc :focus-visible{outline:3px solid #c97d08;','.dc :focus-visible{outline:3px solid var(--c-brand);')
desk=R(desk,'background:linear-gradient(115deg,#f6fbf7,var(--dc-mint))','background:var(--grad-mint)')
# cỡ chữ desktop
for a,b in [('.dc-breadcrumb{display:flex;gap:10px;font-size:13px','.dc-breadcrumb{display:flex;gap:10px;font-size:12px'),
            ('.dc-hero p{font-size:15px','.dc-hero p{font-size:16px'),
            ('.dc-reset{border:0;background:none;color:var(--dc-green);font-size:12px;cursor:pointer;text-decoration:underline;min-height:32px}','.dc-reset{border:0;background:none;color:var(--dc-green);font-size:14px;cursor:pointer;text-decoration:underline;min-height:44px}'),
            ('.dc-check{display:flex;align-items:center;gap:9px;min-height:42px;font-size:13px','.dc-check{display:flex;align-items:center;gap:9px;min-height:44px;font-size:14px'),
            ('.dc-toolbar h2{font-size:22px}','.dc-toolbar h2{font-size:24px}'),
            ('font-size:11px;font-weight:700;padding:3px 8px;border-radius:var(--radius-sm)}','font-size:12px;font-weight:700;padding:3px 8px;border-radius:var(--radius-sm)}'),
            ('.dc-card h3{font-size:15px','.dc-card h3{font-size:16px'),
            ('.dc-desc{font-size:13px','.dc-desc{font-size:14px'),
            ('.dc-consult h2{font-size:20px}','.dc-consult h2{font-size:24px}'),
            ('.dc-consent{display:flex;align-items:flex-start;gap:8px;font-size:11px','.dc-consent{display:flex;align-items:flex-start;gap:8px;font-size:12px')]:
    desk=R(desk,a,b)
# mobile
for a,b in [('.dc-breadcrumb{font-size:11px','.dc-breadcrumb{font-size:12px'),
            ('.dc h1{font-size:27px','.dc h1{font-size:28px'),
            ('.dc-hero p{font-size:13px','.dc-hero p{font-size:15px'),
            ('.dc-search input{font-size:12px}','.dc-search input{font-size:16px}'),
            ('.dc-search .dc-btn{font-size:12px;padding:8px 10px;min-height:40px}','.dc-search .dc-btn{font-size:14px;padding:8px 12px;min-height:44px}'),
            ('.dc-audience button{font-size:12px','.dc-audience button{font-size:13px'),
            ('.dc-toolbar h2{font-size:20px}','.dc-toolbar h2{font-size:22px}'),
            ('.dc-sort select{max-width:175px;font-size:12px}','.dc-sort select{max-width:175px;font-size:16px}'),
            ('.dc-desc{font-size:12px;line-height:1.45}','.dc-desc{font-size:14px;line-height:1.45}'),
            ('min-height:26px;font-size:12px','min-height:26px;font-size:14px'),
            ('.dc-badge{top:5px;left:5px;font-size:9px;padding:2px 5px}','.dc-badge{top:5px;left:5px;font-size:11px;padding:2px 6px}'),
            ('.dc-consult h2{font-size:19px}','.dc-consult h2{font-size:22px}'),
            ('.dc-consult p{font-size:13px}','.dc-consult p{font-size:14px}')]:
    mob=R(mob,a,b)
open(p,'w',encoding='utf-8',newline='').write(desk+mob); print('ok')
