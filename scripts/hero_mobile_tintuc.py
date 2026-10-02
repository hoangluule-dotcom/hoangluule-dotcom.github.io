"""Áp dụng bố cục đầu trang điện thoại của trang danh mục cho trang tin tức (02/10/2026)."""
import sys,re
p=sys.argv[1]; s=open(p,encoding='utf-8',newline='').read()
def R(a,b):
    global s
    assert s.count(a)==1,a[:60]; s=s.replace(a,b)
R(" .nt .nt-hero,.sm .sm-hero{display:flex;flex-direction:column;"," .sm .sm-hero{display:flex;flex-direction:column;")
R(" .nt .nt-hero>div,.sm .sm-hero>div{width:100%;"," .sm .sm-hero>div{width:100%;")
R(" .nt-hero .dbv-hero-scene,.sm-hero .dbv-hero-scene{position:relative;"," .sm-hero .dbv-hero-scene{position:relative;")
R(" .nt .nt-hero h1,.sm .sm-hero h1{font-size:27px}"," .sm .sm-hero h1{font-size:27px}")
R(" .dc .dc-hero{display:grid;"," .dc .dc-hero,.nt .nt-hero{display:grid;")
R(" .dc .dc-hero-copy{display:contents}"," .dc .dc-hero-copy,.nt .nt-hero>div{display:contents}")
R(" .dc .dc-hero h1{grid-area:t;"," .dc .dc-hero h1,.nt .nt-hero h1{grid-area:t;")
R(" .dc .dc-hero p{grid-area:p;"," .dc .dc-hero p,.nt .nt-hero p{grid-area:p;")
R(" .dc .dc-hero .dc-search{grid-area:s;"," .dc .dc-hero .dc-search,.nt .nt-hero .nt-search{grid-area:s;")
R(" .dc-hero .dbv-hero-scene{grid-area:a;"," .dc-hero .dbv-hero-scene,.nt-hero .dbv-hero-scene{grid-area:a;")
nl='\r\n' if '\r\n' in s else '\n'
R(" .dc-hero .dbv-hero-scene img{object-position:88% top}"," .dc-hero .dbv-hero-scene img{object-position:88% top}"+nl+" .nt-hero .dbv-hero-scene img{object-position:92% top}")
R(" .dc-hero .dbv-hero-scene::after{content:none}"," .dc-hero .dbv-hero-scene::after,.nt-hero .dbv-hero-scene::after{content:none}")
open(p,'w',encoding='utf-8',newline='').write(s); print('ok')
