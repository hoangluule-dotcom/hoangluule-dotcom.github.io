"""Hero trang danh mục trên điện thoại: chữ bên trái, tư vấn viên trong khung riêng bên phải,
ô tìm kiếm full ngang bên dưới — không chồng chữ lên ảnh. 30/09/2026."""
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8',newline='').read()
R=[(" .dc .dc-hero,.nt .nt-hero,.sm .sm-hero{display:flex;flex-direction:column;"," .nt .nt-hero,.sm .sm-hero{display:flex;flex-direction:column;"),
   (" .dc .dc-hero-copy,.nt .nt-hero>div,.sm .sm-hero>div{width:100%;"," .nt .nt-hero>div,.sm .sm-hero>div{width:100%;"),
   (" .dc-hero .dbv-hero-scene,.nt-hero .dbv-hero-scene,.sm-hero .dbv-hero-scene{position:relative;"," .nt-hero .dbv-hero-scene,.sm-hero .dbv-hero-scene{position:relative;"),
   (" .dc .dc-hero h1,.nt .nt-hero h1,.sm .sm-hero h1{font-size:27px}\n}",
    """ .nt .nt-hero h1,.sm .sm-hero h1{font-size:27px}
 /* Danh mục: 2 cột (chữ | tư vấn viên trong khung riêng) + hàng tìm kiếm full ngang.
    Chữ và ô tìm kiếm không nằm đè lên ảnh; khối cao ~250px thay vì ~420px. */
 .dc .dc-hero{display:grid;grid-template-columns:minmax(0,1fr) 112px;grid-template-areas:"t a" "p a" "s s";column-gap:12px;min-height:0;padding:18px 16px 16px;border-radius:var(--radius-panel,20px)}
 .dc .dc-hero-copy{display:contents}
 .dc .dc-hero h1{grid-area:t;align-self:end;font-size:28px;margin:0 0 6px}
 .dc .dc-hero p{grid-area:p;align-self:start;margin:0}
 .dc .dc-hero .dc-search{grid-area:s;max-width:none;margin-top:14px}
 .dc-hero .dbv-hero-scene{grid-area:a;position:relative;inset:auto;z-index:0;width:112px;height:140px;align-self:end;border-radius:var(--radius-card,16px);overflow:hidden}
 .dc-hero .dbv-hero-scene img{object-position:88% top}
 .dc-hero .dbv-hero-scene::after{content:none}
}""")]
for a,b in R:
    a2=a.replace('\n','\r\n') if '\r\n' in s else a; b2=b.replace('\n','\r\n') if '\r\n' in s else b
    assert s.count(a2)==1,a[:50]; s=s.replace(a2,b2)
open(p,'w',encoding='utf-8',newline='').write(s); print('ok')
