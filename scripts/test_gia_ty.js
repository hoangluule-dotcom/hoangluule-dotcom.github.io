const B=require('../netlify/functions/lib/bonbanh.js');
const D=JSON.parse(require('fs').readFileSync(__dirname+'/../data/gia-xe-db.json','utf8')).data;
const V=x=>(x/1e6).toFixed(0)+'tr';

console.log('=== 1. Đọc giá dạng tiền tỷ');
[['1 Tỷ 180 Triệu',1180e6],['1 Tỷ 99 Triệu',1099e6],['1 Tỷ 205 Triệu',1205e6],
 ['945 Triệu',945e6],['2 Tỷ 50 Triệu',2050e6],['3 Tỷ',3000e6],['1 Tỷ',1000e6]].forEach(([s,dung])=>{
  const d=B.giaDau(s);
  console.log('   '+s.padEnd(17)+'→ '+V(d).padStart(7)+'   '+(d===dung?'✓':'✗ phải là '+V(dung)));
});

console.log('\n=== 2. Không gộp nhầm hai giá khác nhau');
[['945 Triệu Hà Nội 960 Triệu',945e6,960e6],
 ['1 Tỷ 180 Triệu Hà Nội 970 Triệu',1180e6,970e6]].forEach(([s,dau,cuoi])=>{
  console.log('   "'+s+'"');
  console.log('      cụm đầu '+V(B.giaDau(s))+(B.giaDau(s)===dau?' ✓':' ✗')+'   cụm cuối '+V(B.giaCuoi(s))+(B.giaCuoi(s)===cuoi?' ✓':' ✗')+'   số cụm '+B.timCumGia(s).length);
});

console.log('\n=== 3. Toàn bộ 19 tin Honda CRV 2024 trang 1 (giá thật từ Bonbanh)');
const tin=[
 ['e hev rs','1 Tỷ 180 Triệu'],['e hev rs','1 Tỷ 179 Triệu'],['l','945 Triệu'],
 ['l','940 Triệu'],['l','960 Triệu'],['l awd','1 Tỷ 115 Triệu'],
 ['e hev rs','1 Tỷ 179 Triệu'],['e hev rs','1 Tỷ 185 Triệu'],['e hev rs','1 Tỷ 99 Triệu'],
 ['l','939 Triệu'],['l','970 Triệu'],['e hev rs','1 Tỷ 199 Triệu'],
 ['e hev rs','1 Tỷ 179 Triệu'],['e hev rs','1 Tỷ 205 Triệu'],['l awd','1 Tỷ 110 Triệu'],
 ['l','975 Triệu'],['l','979 Triệu'],['e hev rs','1 Tỷ 165 Triệu'],['e hev rs','1 Tỷ 198 Triệu']];
const nhom={};
tin.forEach(([v,g])=>{(nhom[v]=nhom[v]||[]).push(B.giaDau(g));});
const theoPB=[];
for(const ten in nhom){const t=B.thongKe(nhom[ten]); if(t)theoPB.push({ten,...t});}
theoPB.sort((a,b)=>b.so_tin-a.so_tin);
theoPB.forEach(p=>console.log('   '+p.ten.padEnd(12)+p.so_tin+' tin · trung vị '+V(p.trung_vi).padStart(7)+' · Q1-Q3 '+V(p.q1)+'–'+V(p.q3)));

console.log('\n=== 4. Khớp với CSDL và đối chiếu');
const rows=(D.HONDA['CR-V']||[]).filter(r=>r[0]===2024);
rows.forEach(r=>{
  const k=B.chonPhienBan(theoPB,r[1],3);
  if(!k){console.log('   '+String(r[1]).padEnd(10)+'→ không khớp'); return;}
  const lech=((k.trung_vi-r[2])/r[2]*100).toFixed(1);
  console.log('   '+String(r[1]).padEnd(10)+'→ "'+k.ten+'" ('+k.so_tin+' tin) · thị trường '+V(k.trung_vi)+' vs CSDL '+V(r[2])+' → '+(lech>0?'+':'')+lech+'%');
});

console.log('\n=== 5. Ảnh hưởng của lỗi cũ (bản L AWD và e:HEV RS)');
[['e hev rs',1180],['l awd',1112]].forEach(([ten,dung])=>{
  console.log('   '+ten.padEnd(12)+'trước: 1000tr (bị cắt về đúng 1 tỷ)  →  sau: '+
    V(theoPB.find(p=>p.ten===ten).trung_vi)+'   sai lệch đã sửa: '+
    ((theoPB.find(p=>p.ten===ten).trung_vi/1e6)-1000).toFixed(0)+'tr');
});
