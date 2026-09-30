"""Bước 2 (30/09/2026) — chuẩn hoá trang sản phẩm theo Hệ thống thị giác v1.0.
Chạy một lần trên CSS gốc; chạy lại lần hai không đổi gì (idempotent).
Sửa tại nguồn (CSS trong trang), không thêm lớp ghi đè.
  python3 chuan_hoa_v1.py <root> <file...> [--report]
"""
import re, sys, os, json
ROOT=sys.argv[1]; FILES=[a for a in sys.argv[2:] if not a.startswith('--')]
NAVY=r'(?:#1b3a5c|#0f2942|#132d47|#1a3a5c|#255770|#2c4a7c|var\(--navy[dlp]?\))'
NAVY_RE=re.compile(NAVY,re.I)
WHITE=re.compile(r'#fff(?:fff)?\b|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)|\bwhite\b',re.I)
H1=clamp='clamp(28px,1.23vw + 23.2px,38px)'
H2='clamp(22px,.25vw + 21px,24px)'
log=[]
import json as _json
# Selector cần đổi chữ trắng → tối, tìm bằng kiểm tra tương phản thực tế (Playwright + CDP)
# sau lượt chuyển đổi đầu. Xem chuan_hoa_v1_ngoai_le.json.
try:
    FORCE={k:set(v) for k,v in _json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'chuan_hoa_v1_ngoai_le.json'),encoding='utf-8')).items()}
except FileNotFoundError: FORCE={}
CUR=['']

def split_decls(body):
    out=[];buf='';d=0
    for ch in body:
        if ch=='(':d+=1
        if ch==')':d-=1
        if ch==';' and d==0: out.append(buf);buf=''
        else: buf+=ch
    if buf.strip(): out.append(buf)
    return out

def parse(css,base=0):
    out=[];i=0;n=len(css)
    while i<n:
        if css.startswith('/*',i):
            j=css.find('*/',i+2); i=n if j<0 else j+2; continue
        if css[i].isspace() or css[i] in ';}': i+=1; continue
        j=i
        while j<n and css[j] not in '{};':
            if css.startswith('/*',j):
                q=css.find('*/',j+2); j=n if q<0 else q+2; continue
            j+=1
        if j>=n or css[j]!='{': i=j+1; continue
        d=0;k=j
        while k<n:
            if css.startswith('/*',k):
                q=css.find('*/',k+2); k=n if q<0 else q+2; continue
            if css[k]=='{': d+=1
            elif css[k]=='}':
                d-=1
                if d==0: break
            k+=1
        out.append((base+i,base+k+1,css[i:j],base+j+1,base+k)); i=k+1
    return out

def clean_sel(sel): return re.sub(r'/\*.*?\*/','',sel,flags=re.S).strip()

def dark_roots(css):
    """Selector có nền navy → gốc khối tối."""
    roots=set()
    for (s,e,sel,bs,be) in all_rules(css):
        for dcl in split_decls(css[bs:be]):
            if ':' in dcl and dcl.split(':')[0].strip().startswith('background') and NAVY_RE.search(dcl):
                last=clean_sel(sel).split(',')[0].split()[-1] if clean_sel(sel) else ''
                cl=re.findall(r'\.([\w-]+)',re.sub(r'::?[\w-]+(\([^)]*\))?','',last))
                if cl and not re.search(r'option|zalo|th$',clean_sel(sel)): roots.add('.'.join(sorted(cl)))
    return roots

def all_rules(css):
    yield from _rules(css,0,len(css),0)

def _rules(css,a,b,depth):
    for r in parse(css[a:b],a):
        sel=clean_sel(r[2]); body=css[r[3]:r[4]]
        if sel.startswith('@keyframes') or sel.startswith('@font-face'): continue
        if '{' in body and depth<4: yield from _rules(css,r[3],r[4],depth+1)
        elif not sel.startswith('@'): yield r

def family(cls):
    """cta-final → cta- ; risk-visual → risk-visual/risk-divider…: lấy tiền tố trước '-' đầu."""
    return cls.split('-')[0]+'-'

def rewrite_rule(sel,body,roots,fams):
    s=clean_sel(sel); sl=s.lower()
    decls=split_decls(body); out=[]; changed=[]
    comps=[set(re.findall(r'\.([\w-]+)',c)) for c in re.split(r'[\s>+~]+',s.split(',')[0]) if c]
    in_dark = any(set(r.split('.'))<=c for r in roots for c in comps)
    forced = any(re.sub(r'\s+',' ',x.strip()) in FORCE.get(CUR[0],set()) for x in s.split(','))
    in_dark = in_dark or forced
    _pp=s.split(',')[0].split() if s else []; lastc=re.findall(r'\.([\w-]+)',_pp[-1]) if _pp else []
    in_dark = in_dark or any(c in DARK_ONLY for c in lastc)
    fam_hit = any(re.search(r'\.'+re.escape(f)+r'[\w-]*',s) or re.search(r'\.[\w-]*-'+re.escape(f[:-1])+r'\b',s) for f in fams)
    has_bg = any(re.match(r'\s*background(-color)?\s*:',d) and not re.search(r'transparent|none|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*\.[0-2]',d) and not NAVY_RE.search(d) for d in decls)
    is_btn = bool(re.search(r'btn|button',sl))
    for d in decls:
        if ':' not in d: out.append(d); continue
        p,v=d.split(':',1); prop=p.strip().lower(); nv=v
        # 1. màu tiêu đề
        nv=nv.replace('var(--dk)','var(--c-heading)')
        # 2. bo pill
        if 'var(--radius-pill)' in nv:
            nv=nv.replace('var(--radius-pill)','var(--radius-control)' if re.search(r'btn|tab|chip|filter|jump|pill',sl) else 'var(--radius-sm)')
        # 3. container
        if prop=='max-width' and re.search(r'1(?:1[0-9]|2[0-9]|3[0-2])0px',nv) and re.search(r'inner|wrap|container|-in\b|\.wrap|^\.dbvrel$',sl) and not re.search(r'footer|ftr|hdr',sl):
            nv=re.sub(r'1\d{3}px','var(--container-page)',nv)
        if prop=='color' and re.search(r'#0f2515|#1a4d32|#1a2e1a',nv,re.I): nv=re.sub(r'#0f2515|#1a4d32|#1a2e1a','var(--c-heading)',nv,flags=re.I)
        if prop=='color' and re.search(r'#007437\b',nv,re.I): nv=re.sub(r'#007437','var(--c-brand)',nv,flags=re.I)
        # 4. cỡ chữ tiêu đề
        if prop=='font-size':
            last=s.split(',')[0].split()[-1] if s else ''
            if re.search(r'(-h1|^h1)$',last): nv=' '+H1
            elif re.search(r'(-h2|^h2)$',last): nv=' '+H2
        # 5. khối tối navy → mint
        if prop.startswith('background') and NAVY_RE.search(nv) and not re.search(r'zalo',sl):
            if 'option' in sl: nv=' #fff'
            elif re.search(r'\bth\b',sl): nv=' var(--c-heading)'
            else: nv=' var(--grad-mint)'
        if 'zalo' in sl and prop.startswith('background') and NAVY_RE.search(nv): nv=' var(--c-brand)'
        is_field=bool(re.search(r'\b(input|select|textarea)\b',sl)) and 'option' not in sl
        if (in_dark or forced) and is_field:
            if prop=='color' and WHITE.search(nv): nv=' var(--c-text)'
            elif prop.startswith('background') and WHITE.search(nv): nv=' #fff'
            elif prop.startswith('border') and WHITE.search(nv): nv=WHITE.sub('var(--c-border)',nv)
        if 'placeholder' in sl and prop=='color' and WHITE.search(nv): nv=' var(--c-text-muted)'
        if 'option' in sl and prop=='color' and WHITE.search(nv): nv=' var(--c-text)'
        if forced and prop=='color' and not WHITE.search(nv):
            if re.search(r'#718096|var\(--ts\)',nv): nv=' var(--c-text-muted)'
            elif 'var(--gold)' in nv: nv=' var(--c-heading)'
            elif re.search(r'#ffd9a0',nv,re.I): nv=' var(--c-brand)'
        if in_dark and prop=='color' and re.search(r'#ffd9a0',nv,re.I): nv=' var(--c-brand)'
        if (in_dark or fam_hit) and not has_bg and not is_field:
            if prop=='color' and WHITE.search(nv):
                m=WHITE.search(nv); a=float(m.group(1)) if m.group(1) else 1
                nv=' var(--c-brand)' if is_btn else (' var(--c-heading)' if a>=.85 else ' var(--c-text-muted)')
            if prop.startswith('border') and WHITE.search(nv):
                nv=WHITE.sub('var(--c-brand)' if is_btn else 'var(--c-border)',nv)
            if prop.startswith('background') and WHITE.search(nv):
                nv=' var(--c-mint)'
            if is_btn and prop.startswith('background') and 'transparent' in nv: nv=' #fff'
            if prop=='color' and 'var(--gold)' in nv and re.search(r'num|::before|prom',sl): nv=' var(--c-heading)' if 'num' in sl else ' var(--c-brand)'
        # 6. bóng
        if prop=='box-shadow':
            if 'var(--sh2)' in nv or 'var(--sh3)' in nv: nv=' var(--shadow-card-hover)'
            elif 'var(--sh)' in nv: nv=' var(--shadow-card-hover)' if ':hover' in sl else ' var(--shadow-card)'
            elif re.search(r'rgba\(\s*0\s*,\s*0\s*,\s*0',nv) and re.search(r'card|box|item|visual',sl):
                nv=' var(--shadow-card-hover)' if (':hover' in sl or 'form-card' in sl) else ' var(--shadow-card)'
        # 7. font
        if prop=='font-family' and 'lexend' in nv.lower():
            nv=re.sub(r"['\"]?Lexend['\"]?",'"Be Vietnam Pro"',nv,flags=re.I)
        if nv!=v: changed.append(f'{prop}: {v.strip()} → {nv.strip()}')
        out.append(p+':'+nv)
    if any('var(--grad-mint)' in c for c in changed) and not any(re.match(r'\s*color\s*:',d) for d in out):
        out.append('color:var(--c-heading)'); changed.append('color: (kế thừa trắng) → var(--c-heading)')
    if any('var(--container-page)' in c for c in changed):
        for i,d in enumerate(out):
            if re.match(r'\s*padding\s*:',d):
                vals=d.split(':',1)[1].split()
                if len(vals)>=2 and vals[1] in ('32px','40px','20px'):
                    vals[1]='24px'; nd=d.split(':',1)[0]+':'+' '.join(vals)
                    changed.append(f'padding: {d.split(":",1)[1].strip()} → {" ".join(vals)}'); out[i]=nd
    return ';'.join(out),changed

ROOTS_OF={}
DARK_ONLY=set(); PAGE_ROOTS=set()
def process_css(css,fname):
    roots=dark_roots(css)|PAGE_ROOTS; fams=set()
    ROOTS_OF.setdefault(fname,set()).update(roots)
    edits=[]
    for (s,e,sel,bs,be) in all_rules(css):
        cs=clean_sel(sel)
        if cs==':root':
            body=css[bs:be]
            nb=re.sub(r'\s*--(?:dk|bg)\s*:[^;}]*;?','',body)
            nb=re.sub(r'(--container-lp\s*:)\s*1\d{3}px',r'\1var(--container-page)',nb)
            if nb!=body: edits.append((bs,be,nb)); log.append((fname,':root','bỏ --dk/--bg riêng'))
            continue
        nb,ch=rewrite_rule(sel,css[bs:be],roots,fams)
        if ch:
            edits.append((bs,be,nb)); log.extend((fname,cs[:70],c) for c in ch)
    for (bs,be,nb) in sorted(edits,key=lambda x:-x[0]): css=css[:bs]+nb+css[be:]
    return css

def element_span(t,start):
    """Từ vị trí thẻ mở, tìm thẻ đóng tương ứng (đếm cùng tên thẻ)."""
    tag=re.match(r'<(\w+)',t[start:]).group(1)
    d=0
    for m in re.finditer(r'<(/?)'+tag+r'\b[^>]*?(/?)>',t[start:]):
        if m.group(1): d-=1
        elif not m.group(2): d+=1
        if d==0: return start+m.end()
    return len(t)

def fix_style(st,dark):
    o=st
    st=st.replace('var(--dk)','var(--c-heading)').replace('var(--ts)','var(--c-text-muted)')
    st=re.sub(r'((?<![\w-])color\s*:\s*)var\(--navy[dlp]?\)',r'\1var(--c-heading)',st)
    if NAVY_RE.search(st) and re.search(r'background',st): st=re.sub(r'(background(?:-color)?\s*:\s*)[^;"]*'+NAVY+r'[^;"]*',r'\1var(--grad-mint)',st,flags=re.I)
    if dark and not re.search(r'background(?:-color)?\s*:\s*(?!transparent)',st):
        def col(m):
            v=m.group(2); w=WHITE.search(v)
            if w:
                a=float(w.group(1)) if w.group(1) else 1
                return m.group(1)+('var(--c-heading)' if a>=.85 else 'var(--c-text-muted)')
            if 'var(--gold)' in v or re.search(r'#ffd9a0',v,re.I): return m.group(1)+'var(--c-brand)'
            return m.group(0)
        st=re.sub(r'((?<![\w-])color\s*:\s*)([^;"]+)',col,st)
        st=re.sub(r'(border[\w-]*\s*:[^;"]*?)'+WHITE.pattern,lambda m:m.group(1)+'var(--c-border)',st,flags=re.I)
    return st

def process_html(t,fname,roots):
    b=t.find('<body'); 
    if b<0: return t
    spans=[]
    for m in re.finditer(r'<(\w+)\b[^>]*>',t[b:]):
        tag=m.group(0); pos=b+m.start()
        cls=re.search(r'class="([^"]*)"',tag); st=re.search(r'style="([^"]*)"',tag)
        isroot=(cls and any(set(r.split('.'))<=set(cls.group(1).split()) for r in roots)) or (st and NAVY_RE.search(st.group(1)) and 'background' in st.group(1))
        if isroot: spans.append((pos,element_span(t,pos)))
    def in_dark(pos): return any(a<=pos<z for a,z in spans)
    out=[];last=0
    for m in re.finditer(r'style="([^"]*)"',t):
        if m.start()<b: continue
        ns=fix_style(m.group(1),in_dark(m.start()))
        if ns!=m.group(1):
            log.append((fname,'style=""',m.group(1)[:60]+' → '+ns[:60]))
            out.append(t[last:m.start(1)]); out.append(ns); last=m.end(1)
    out.append(t[last:])
    t=''.join(out)
    t2=re.sub(r'((?:stroke|fill|color)=")var\(--navy[dlp]?\)"',r'\1var(--c-brand)"',t)
    t2=re.sub(r'((?:stroke|fill|color)=")var\(--dk\)"',r'\1var(--c-heading)"',t2)
    if t2!=t: log.append((fname,'thuộc tính SVG','var(--navy)/var(--dk) → token chuẩn'))
    return t2

for f in FILES:
    CUR[0]=f
    p=os.path.join(ROOT,f); t=open(p,encoding='utf-8',newline='').read()
    if f.endswith('.css'): nt=process_css(t,f)
    else:
        allcss=' '.join(m.group(2) for m in re.finditer(r'<style([^>]*)>(.*?)</style>',t,re.S) if 'dbv-layout' not in m.group(1))
        PAGE_ROOTS=dark_roots(allcss)
        b0=t.find('<body'); inside=set(); outside=set(); spans=[]
        for m in re.finditer(r'<(\w+)\b[^>]*>',t[b0:]):
            tag=m.group(0); cls=re.search(r'class="([^"]*)"',tag); st=re.search(r'style="([^"]*)"',tag)
            if (cls and any(set(r.split('.'))<=set(cls.group(1).split()) for r in PAGE_ROOTS)) or (st and NAVY_RE.search(st.group(1)) and 'background' in st.group(1)):
                spans.append((b0+m.start(),element_span(t,b0+m.start())))
        for m in re.finditer(r'class="([^"]*)"',t[b0:]):
            pos=b0+m.start(); cl=set(m.group(1).split())
            (inside if any(a<pos<z for a,z in spans) else outside).update(cl)
        DARK_ONLY=inside-outside
        parts=[];last=0
        for m in re.finditer(r'<style([^>]*)>(.*?)</style>',t,re.S):
            if 'dbv-layout' in m.group(1): continue
            c=process_css(m.group(2),f)
            c2=re.sub(r'var\(--dk,\s*var\(--c-heading\)\)','var(--c-heading)',c)
            c2=re.sub(r'var\(--(?:dk|navy[dlp]?)\)','var(--c-heading)',c2)
            c2=c2.replace('var(--ts)','var(--c-text-muted)')
            if c2!=c: log.append((f,'(còn sót)','var(--dk)/var(--navy) → var(--c-heading)'))
            parts.append((m.start(2),m.end(2),c2))
        nt=t
        for (a,b,c) in reversed(parts): nt=nt[:a]+c+nt[b:]
        nt=process_html(nt,f,ROOTS_OF.get(f,set()))
    if nt!=t: open(p,'w',encoding='utf-8',newline='').write(nt)
if '--report' in sys.argv:
    for l in log: print(' | '.join(l))
print('thay doi:',len(log))
