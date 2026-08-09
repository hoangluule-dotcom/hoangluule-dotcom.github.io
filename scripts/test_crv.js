const B=require('../netlify/functions/lib/bonbanh.js');
const D=JSON.parse(require('fs').readFileSync(__dirname+'/../data/gia-xe-db.json','utf8')).data;
const V=x=>x>=1e9?(x/1e9).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')+' tỷ':(x/1e6).toFixed(0)+'tr';

/* 19 tin thật của Honda CRV 2024, trang 1 */
const tin=[
 ['e-hev-rs','6931526','1 Tỷ 180 Triệu','Hà Nội','5,000'],['e-hev-rs','6837955','1 Tỷ 179 Triệu','TP HCM','21,000'],
 ['l','6881068','945 Triệu','Hà Nội','0'],['l','6923378','940 Triệu','TP HCM','25,000'],
 ['l','6835453','960 Triệu','Hà Nội','0'],['l-awd','6924461','1 Tỷ 115 Triệu','Hà Nội','50,000'],
 ['e-hev-rs','6919859','1 Tỷ 179 Triệu','TP HCM','17,000'],['e-hev-rs','6931235','1 Tỷ 185 Triệu','Hà Nội','5,000'],
 ['e-hev-rs','6931227','1 Tỷ 99 Triệu','Hà Nội','30,000'],['l','6882589','939 Triệu','TP HCM','42,000'],
 ['l','6501384','970 Triệu','TP HCM','42,000'],['e-hev-rs','6918733','1 Tỷ 199 Triệu','TP HCM','17,000'],
 ['e-hev-rs','6897773','1 Tỷ 179 Triệu','Hà Nội','15,000'],['e-hev-rs','6883406','1 Tỷ 205 Triệu','TP HCM','15,000'],
 ['l-awd','6926491','1 Tỷ 110 Triệu','Hà Nội','52,000'],['l','6876183','975 Triệu','TP HCM','32,000'],
 ['l','6897801','979 Triệu','Hà Nội','20,000'],['e-hev-rs','6918347','1 Tỷ 165 Triệu','Hà Nội','45,000'],
 ['e-hev-rs','6856381','1 Tỷ 198 Triệu','TP HCM','15,000']];

/* HTML dựng theo đúng Bonbanh: THUỘC TÍNH TITLE ĐỨNG TRƯỚC HREF */
const html='<ul class="car-list">'+tin.map(([v,ma,gia,tinh,odo])=>
 `<li class="car-item"><a title="Ban xe oto cu Honda CRV 2024 ${v.toUpperCase()} gia ${gia} - ${tinh}" `
 +`href="/xe-honda-crv-${v}-2024-${ma}" class="car-title">`
 +`<h3>Honda CRV ${v} - 2024</h3><div class="cb3">${gia}</div><div class="cb4">${tinh}</div>`
 +` Mã: ${ma} <div>Xe lắp ráp trong nước, màu trắng, máy xăng 1.5 L, số tự động, 7 chỗ , đã đi ${odo} km</div>`
 +`</a></li>`).join('')+'</ul><div>Trang 1 / 2 ( <b>Tổng: 38 tin</b> )</div>';

console.log('=== 1. Từng chiến lược đọc được gì (HTML có title đứng TRƯỚC href)');
const t=B.bocTuTitle(html), x=B.bocTuText(html), s=B.bocSlug(html);
console.log('   bocTuTitle (chiến lược A) :',t.length,'tin   ← đây là chỗ hỏng, đòi href rồi mới tới title');
console.log('   bocTuText  (chiến lược B) :',x.length,'tin   có ver_slug:',x.filter(r=>r.ver_slug).length);
console.log('   bocSlug    (chiến lược 0) :',s.length,'tin   có ver_slug:',s.filter(r=>r.ver_slug).length,'  ← bước mới thêm');

const tong=B.hopNhat(s,t,x);
console.log('   sau hợp nhất             :',tong.length,'tin   có ver_slug:',tong.filter(r=>r.ver_slug).length,'  có giá:',tong.filter(r=>r.gia>0).length);

console.log('\n=== 2. Nhóm theo phiên bản');
const nhom=new Map();
tong.forEach(r=>{
  const ten=B.tenPhienBanTuSlug(r.ver_slug,'honda','crv')||'khong ro';
  if(!nhom.has(ten))nhom.set(ten,[]);
  nhom.get(ten).push(r.gia);
});
const theoPB=[];
for(const [ten,gs] of nhom){const k=B.thongKe(gs); if(k)theoPB.push({ten,...k});}
theoPB.sort((a,b)=>b.so_tin-a.so_tin);
theoPB.forEach(p=>console.log('   '+p.ten.padEnd(12)+p.so_tin+' tin · trung vị '+V(p.trung_vi).padStart(9)+' · Q1–Q3 '+V(p.q1)+' – '+V(p.q3)));

console.log('\n=== 3. Khớp với CSDL — đúng ca bạn test');
const rows=(D.HONDA['CR-V']||[]).filter(r=>r[0]===2024);
rows.forEach(r=>{
  const k=B.chonPhienBan(theoPB,r[1],3);
  if(!k){console.log('   '+String(r[1]).padEnd(10)+'→ không khớp (lùi về CSDL '+V(r[2])+', an toàn)');return;}
  const lech=((k.trung_vi-r[2])/r[2]*100).toFixed(1);
  console.log('   '+String(r[1]).padEnd(10)+'→ "'+k.ten+'" ('+k.so_tin+' tin) · thị trường '+V(k.trung_vi)+' vs CSDL '+V(r[2])+' → '+(lech>0?'+':'')+lech+'%');
});

console.log('\n=== 4. So với những gì bạn thấy trên màn hình');
console.log('   Ảnh chụp    : "khong ro · 36 tin · 1.14 tỷ"  → gom cả 4 phiên bản làm một');
const ehev=theoPB.find(p=>p.ten==='e hev rs');
console.log('   Sau khi sửa : "e hev rs · '+ehev.so_tin+' tin · '+V(ehev.trung_vi)+'"  → đúng bản EHEV RS');
