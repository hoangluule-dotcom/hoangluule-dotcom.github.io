import sys,re
p=sys.argv[1]; s=open(p,encoding='utf-8',newline='').read()
R=[
("--pg:#007437; --pg-d:#005a2b; --pg-dd:#0f2515; --pg-50:#f1f8f3; --pg-100:#dcefe2;",
 "--pg:var(--c-brand); --pg-d:var(--c-brand-hover); --pg-dd:var(--c-heading); --pg-50:var(--c-mint); --pg-100:var(--c-mint-2);"),
("--po:#E8920A; --po-h:#d98200; --po-ink:#E8920A; --po-50:#FFF8E7;",
 "--po:var(--c-accent); --po-h:var(--c-accent-hover); --po-ink:var(--c-accent); --po-50:var(--c-accent-soft);"),
("--pink:#0f2515; --ptx:#1f2a24; --pmu:#5a6560; --pline:#e2e8e4; --pbg:#f5f7f6;",
 "--pink:var(--c-heading); --ptx:var(--c-text); --pmu:var(--c-text-muted); --pline:var(--c-border); --pbg:var(--c-bg-muted);"),
("\n  --pr:14px; --pr-s:10px;",""),
("--psh:0 1px 2px rgba(15,37,21,.06),0 4px 16px rgba(15,37,21,.06);","--psh:var(--shadow-card);"),
("--psh-l:0 2px 4px rgba(15,37,21,.06),0 12px 32px rgba(15,37,21,.10);","--psh-l:var(--shadow-card-hover);"),
("--pw:1200px;","--pw:var(--container-page); /* v1.0: tối đa 1240px gồm lề 24px */"),
(".plp-in{max-width:var(--pw);margin:0 auto;padding:0 20px}",".plp-in{max-width:var(--pw);margin:0 auto;padding:0 24px}"),
("background:var(--pg-d);color:#fff}\n.plp-final .plp-h2{color:#fff;font-size:28px}",
 "background:var(--grad-mint);border:1px solid var(--c-mint-2);color:var(--c-heading)}\n.plp-final .plp-h2{color:var(--c-heading);font-size:24px}"),
(".plp-final p{margin-top:8px;color:rgba(255,255,255,.85);font-size:16px}",".plp-final p{margin-top:8px;color:var(--c-text-muted);font-size:16px}"),
("font-size:14px;color:rgba(255,255,255,.8)}","font-size:14px;color:var(--c-text-muted)}"),
("font-size:22px;font-weight:800;color:#fff;font-variant-numeric","font-size:22px;font-weight:800;color:var(--c-heading);font-variant-numeric"),
(".plp-final-lead .plp-h2{text-transform:uppercase;font-size:26px}",".plp-final-lead .plp-h2{font-size:24px}"),
(".plp-final-lead .plp-h2{font-size:21px}",".plp-final-lead .plp-h2{font-size:22px}"),
(".plp .plp-lead p.plp-lead-legal{color:#7a847f;",".plp .plp-lead p.plp-lead-legal{color:var(--c-text-muted);"),
(".plp-theme-shop .plp-final>.plp-in{background:transparent;box-shadow:none;padding:0 20px}",".plp-theme-shop .plp-final>.plp-in{background:transparent;box-shadow:none;padding:0 24px}"),
(".plp-theme-shop .plp-final .plp-h2{background:none;padding:0;color:#fff;font-size:24px}",".plp-theme-shop .plp-final .plp-h2{background:none;padding:0;color:var(--c-heading);font-size:24px;text-transform:none}"),
(".plp-theme-shop .plp-final .plp-h2{font-size:19px}",".plp-theme-shop .plp-final .plp-h2{font-size:22px}"),
]
for a,b in R:
    a2=a.replace('\n','\r\n') if '\r\n' in s else a; b2=b.replace('\n','\r\n') if '\r\n' in s else b
    n=s.count(a2)
    if n!=1 and a.startswith('.plp .plp-lead'): 
        a2=a2.replace('.plp .plp-lead','.plp-final .plp-lead'); b2=b2.replace('.plp .plp-lead','.plp-final .plp-lead'); n=s.count(a2)
    print(n, a[:60]); s=s.replace(a2,b2)
# pill
for sel,to in [('.plp-badge{','sm'),('.plp-media-badge{','sm'),('.plp-step-meta{','sm'),('.plp-gal-count{','sm'),('.plp-intro-jump a{','control')]:
    i=s.find(sel); j=s.find('}',i)
    seg=s[i:j]; assert 'var(--radius-pill)' in seg, sel
    s=s[:i]+seg.replace('var(--radius-pill)',f'var(--radius-{to})')+s[j:]
print('pill left:',s.count('--radius-pill'))
open(p,'w',encoding='utf-8',newline='').write(s)
