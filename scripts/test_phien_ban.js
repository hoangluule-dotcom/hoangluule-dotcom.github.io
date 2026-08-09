const B=require('../netlify/functions/lib/bonbanh.js');
const F=require('./test_bonbanh_fixture.js');
const vnd=x=>Math.round(x/1e6)+'tr';

console.log('=== 1. Khớp mờ tên phiên bản (CSDL vs Bonbanh)');
const cap=[
 ['1.5E MT','1.5e mt'],['1.5E MT','1.5e cvt'],['1.5E MT','1.5g'],
 ['1.5G CVT','1.5g'],['1.5G CVT','1.5e cvt'],['1.5G CVT','1.5e mt'],
 ['1.5E CVT','1.5e cvt'],['1.5E CVT','1.5e mt'],
 ['GR-S 1.5 CVT','gr s'],['LIMO','limo'],['LIMO','1.5e mt'],
 ['2.4G 4X2 AT','2.4g 4x2 at'],['2.4G 4X2 AT','2.8v 4x4 at'],
];
cap.forEach(([a,b])=>{
  const d=B.diemKhop(a,b);
  const dat=d>=0.5?'NHẬN':'loại';
  console.log('   '+(a+'  ~  '+b).padEnd(34)+' điểm '+String(d).padEnd(6)+dat);
});

console.log('\n=== 2. Nhóm theo phiên bản từ HTML thật');
const tin=B.hopNhat(B.bocTuTitle(F.html),B.bocTuText(F.html));
const nhom=new Map();
tin.forEach(x=>{
  const ten=B.tenPhienBanTuSlug(x.ver_slug,'toyota','vios')||'khong ro';
  if(!nhom.has(ten))nhom.set(ten,[]);
  nhom.get(ten).push(x);
});
const theoPB=[];
for(const [ten,ds] of nhom){
  const t=B.thongKe(ds.map(x=>x.gia));
  if(t)theoPB.push({ten,...t});
}
theoPB.sort((a,b)=>b.so_tin-a.so_tin);
theoPB.forEach(p=>console.log('   '+p.ten.padEnd(10)+p.so_tin+' tin · trung vị '+vnd(p.trung_vi).padStart(6)+' · Q1-Q3 '+vnd(p.q1)+'–'+vnd(p.q3)));

console.log('\n=== 3. Đối chiếu đúng phiên bản với CSDL');
const csdl=[['1.5E MT',296.7],['1.5E CVT',367.5],['1.5G',405.3]];
csdl.forEach(([ten,gia])=>{
  const k=B.chonPhienBan(theoPB,ten,3);
  if(!k){console.log('   '+ten.padEnd(11)+'→ không khớp (lùi về số liệu cả dòng xe)');return;}
  const l=((k.trung_vi/1e6-gia)/gia*100).toFixed(1);
  console.log('   '+ten.padEnd(11)+'→ khớp "'+k.ten+'" (điểm '+k.diem_khop+', '+k.so_tin+' tin) · CSDL '+gia+'tr vs thị trường '+vnd(k.trung_vi)+' → '+(l>0?'+':'')+l+'%');
});

console.log('\n=== 4. So trước / sau khi tách phiên bản (bản 1.5G)');
const gop=B.thongKe(tin.map(x=>x.gia));
console.log('   TRƯỚC: gộp cả dòng xe → '+vnd(gop.trung_vi)+' vs CSDL 405tr → lệch '+(((gop.trung_vi/1e6-405.3)/405.3)*100).toFixed(1)+'%  ← sai, so hai thứ khác nhau');
const g=B.chonPhienBan(theoPB,'1.5G',3);
console.log('   SAU  : riêng 1.5G      → '+vnd(g.trung_vi)+' vs CSDL 405tr → lệch '+(((g.trung_vi/1e6-405.3)/405.3)*100).toFixed(1)+'%  ← đúng');

console.log('\n=== 5. apPhienBan: có khớp và không khớp');
const kq={ok:true,nam:2020,tong_hop:gop,theo_phien_ban:theoPB};
[['1.5G','khớp được'],['3.0 V6 DIESEL','không có bản này']].forEach(([pb,mo])=>{
  const r=B.apPhienBan(kq,pb);
  console.log('   "'+pb+'" ('+mo+') → muc='+r.muc+' · trung vị '+vnd(r.trung_vi)+' · '+r.so_tin+' tin'+(r.phien_ban_khop?' · khớp "'+r.phien_ban_khop+'"':''));
});
