const B=require('../netlify/functions/lib/bonbanh.js');
const F=require('./test_bonbanh_fixture.js');
const vnd=x=>Math.round(x/1e6)+'tr';

console.log('=== 1. Bóc từ title (chiến lược A)');
const a=B.bocTuTitle(F.html);
console.log('   đọc được',a.length,'tin · vd:',JSON.stringify(a[0]));

console.log('=== 2. Bóc từ text (chiến lược B)');
const b=B.bocTuText(F.html);
console.log('   đọc được',b.length,'tin · vd:',JSON.stringify(b[0]));

console.log('=== 3. Hợp nhất');
const h=B.hopNhat(a,b);
console.log('   tổng',h.length,'tin duy nhất · có ODO:',h.filter(x=>x.so_km>0).length,'· có hộp số:',h.filter(x=>x.hop_so).length);

console.log('=== 4. Tổng tin trang báo:',B.bocTongTin(F.html));

console.log('=== 5. Lọc ngoại lai + thống kê');
const gia=h.map(x=>x.gia);
console.log('   giá thô ('+gia.length+'):',gia.map(vnd).join(' '));
const tk=B.thongKe(gia);
console.log('   sau lọc:',tk.so_tin,'tin, loại',tk.so_tin_bi_loai);
console.log('   trung vị',vnd(tk.trung_vi),'| Q1',vnd(tk.q1),'| Q3',vnd(tk.q3),'| min',vnd(tk.thap_nhat),'| max',vnd(tk.cao_nhat));

console.log('=== 6. Đối chiếu CSDL (Vios 2020)');
const csdl={'1.5E MT':296.7,'1.5E CVT':367.5,'1.5G':405.3};
const nhom={};
h.forEach(x=>{const v=x.ver_slug?x.ver_slug.replace('toyota-vios-','').toUpperCase().replace(/-/g,' '):'?';(nhom[v]=nhom[v]||[]).push(x.gia);});
for(const v in nhom){
  const t=B.thongKe(nhom[v]); if(!t)continue;
  const c=csdl[v];
  console.log('   '+v.padEnd(11)+' trung vị '+vnd(t.trung_vi).padStart(6)+' ('+nhom[v].length+' tin)'
    +(c?'  vs CSDL '+c+'tr → '+(((t.trung_vi/1e6-c)/c*100).toFixed(1))+'%':''));
}

console.log('=== 7. Chống hỏng: Bonbanh đổi giao diện');
console.log('   title:',B.bocTuTitle(F.htmlDoiGiaoDien).length,'| text:',B.bocTuText(F.htmlDoiGiaoDien).length,'→ phải = 0 để kích hoạt AI dự phòng');
console.log('   trang rỗng:',B.hopNhat(B.bocTuTitle(F.htmlRong),B.bocTuText(F.htmlRong)).length,'→ phải = 0');

console.log('=== 8. Sinh slug');
[['MERCEDES-BENZ','C-CLASS'],['TOYOTA','COROLLA CROSS'],['TOYOTA','YARIS CROSS'],['LAND ROVER','RANGE ROVER'],['HONDA','CR-V']]
 .forEach(([hg,dg])=>console.log('   '+(hg+' / '+dg).padEnd(30),'→',B.ungVienSlug(hg)[0]+'-'+B.ungVienSlug(dg).join(' | ')));

console.log('=== 9. Đổi tiền');
[['310','Triệu'],['1,25','Tỷ'],['1.250','Triệu'],['99','Tỷ']].forEach(([s,d])=>
  console.log('   '+s+' '+d+' →',B.doiTienVND(s,d).toLocaleString('vi-VN')));
