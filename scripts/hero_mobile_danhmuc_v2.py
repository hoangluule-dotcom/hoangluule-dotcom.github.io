"""v2 (30/09/2026): tư vấn viên trên điện thoại không còn khung — mép ảnh mờ dần vào nền mint."""
import sys,re
p=sys.argv[1]; W=sys.argv[2] if len(sys.argv)>2 else '124px'; H=sys.argv[3] if len(sys.argv)>3 else '150px'
MASK=sys.argv[4] if len(sys.argv)>4 else 'linear-gradient(to right,transparent 0,#000 34%),linear-gradient(to bottom,#000 68%,transparent 100%)'
s=open(p,encoding='utf-8',newline='').read()
new=(" .dc-hero .dbv-hero-scene{grid-area:a;position:relative;inset:auto;z-index:0;width:%s;height:%s;align-self:end;"
     "margin:-18px -16px 0 0;align-self:start;-webkit-mask-image:%s;mask-image:%s;"
     "-webkit-mask-composite:source-in;mask-composite:intersect}" % (W,H,MASK,MASK))
s2,n=re.subn(r' \.dc-hero \.dbv-hero-scene\{grid-area:a;[^}]*\}',lambda m:new,s)
assert n==1; open(p,'w',encoding='utf-8',newline='').write(s2); print('ok')
