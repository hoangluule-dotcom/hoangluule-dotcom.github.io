/* Đối chiếu module tính phí với đúng logic đang chạy trên trang sản phẩm.
   Logic dưới đây chép nguyên từ calcFee() của bao-hiem-vat-chat-oto.html,
   chỉ đổi cách lấy input. Nếu hai bên ra khác nhau nghĩa là module sai. */
const path=require('path');
const P=require(path.join(__dirname,'..','assets','bieu-phi-dbv.js'));
const T=P.TARIFF, MIN_FEE=6000000;

function ageGroupGoc(y, catKey, laDien){
  const now=new Date();
  const months=(now.getFullYear()-y)*12+now.getMonth();
  const esc=(laDien&&catKey==='kd')?120:180;
  if(months<36)return 0; if(months<72)return 1; if(months<120)return 2; if(months<esc)return 3;
  return -1;
}
function calcFeeGoc(catKey,V,namDK,kv,s01,s02,s06,laDien,pinVal){
  const cat=T[catKey], g=ageGroupGoc(namDK,catKey,laDien);
  if(g<0)return {ngoai:true};
  if(V<50e6)return {thap:true};
  if(laDien&&V>10e9)return {tran:true};
  const band=cat.bands.find(b=>V<b.max);
  const r02=band.bs02[g];
  const d02=(r02===null)?false:s02;
  let STBH=V;
  if(laDien&&pinVal>0)STBH=Math.max(V-pinVal,0);
  const rate=band.base[g]+(s01?cat.bs01[g]:0)+(d02?r02:0)+(s06?cat.bs06[g]:0);
  const hn=cat.uu_dai_hn&&kv==='hn'&&!laDien;
  const rateDisc=hn?rate*0.9:rate;
  const applied=Math.max(rateDisc,cat.thuan[g]);
  let fee=STBH*applied/100;
  let minFee=MIN_FEE;
  if(!s01)minFee-=STBH*cat.bs01[g]/100;
  if(r02!==null&&!d02)minFee-=STBH*r02/100;
  if(!s06)minFee-=STBH*cat.bs06[g]/100;
  if(fee<minFee)fee=minFee;
  return {phi:Math.round(fee),ty_le:applied};
}

const NAM=new Date().getFullYear();
const nhoms=['nkd','kd','pv'];
const giatri=[80e6,250e6,450e6,550e6,700e6,900e6,1.5e9,3e9];
const namDKs=[NAM,NAM-2,NAM-4,NAM-7,NAM-11,NAM-14,NAM-16];
const kvs=['hn','khac'];
const bs=[[1,1,1],[1,0,1],[0,0,0],[1,1,0],[0,1,1]];
let n=0,lech=0,mau=[];
for(const dien of [false,true])
for(const c of nhoms) for(const V of giatri) for(const y of namDKs) for(const kv of kvs) for(const b of bs){
  const a=calcFeeGoc(c,V,y,kv,!!b[0],!!b[1],!!b[2],dien,0);
  const m=P.tinhPhi({nhom_xe:c,gia_tri_xe:V,nam_dang_ky:y,khu_vuc:kv,xe_dien:dien,
                     bs01:!!b[0],bs02:!!b[1],bs06:!!b[2],gia_tri_pin:0});
  n++;
  const aOK=!a.ngoai&&!a.thap&&!a.tran;
  if(aOK!==m.ok){lech++;if(mau.length<4)mau.push(`${dien?'ĐIỆN':'XĂNG'} ${c} ${V/1e6}tr ${y} — trạng thái lệch (gốc ${aOK?'tính được':'không'} / module ${m.ok?'tính được':'không'})`);continue;}
  if(!aOK)continue;
  if(Math.abs(a.phi-m.phi)>1||Math.abs(a.ty_le-m.ty_le_ap_dung)>1e-9){
    lech++;
    if(mau.length<4)mau.push(`${dien?'ĐIỆN':'XĂNG'} ${c} ${V/1e6}tr ${y} ${kv} BS[${b}] — gốc ${a.phi} (${a.ty_le}%) vs module ${m.phi} (${m.ty_le_ap_dung}%)`);
  }
}
console.log('1) Đối chiếu module với logic trang sản phẩm');
console.log('   đã chạy '+n.toLocaleString('vi-VN')+' tổ hợp · lệch: '+lech);
if(mau.length)mau.forEach(x=>console.log('   '+x));

console.log('\n2) Xe điện — thuê pin (STBH trừ giá trị pin)');
[[0,'mua đứt'],[200e6,'thuê pin 200tr']].forEach(([pin,ten])=>{
  const m=P.tinhPhi({nhom_xe:'nkd',gia_tri_xe:900e6,nam_dang_ky:NAM-2,khu_vuc:'khac',xe_dien:true,bs01:1,bs02:1,bs06:1,gia_tri_pin:pin});
  console.log('   '+ten.padEnd(16)+'STBH '+P.dinhDangVND(m.stbh).padStart(14)+' → phí '+P.dinhDangVND(m.phi));
});

console.log('\n3) Các mốc chặn');
[['nkd',900e6,NAM-16,false,'xe 16 năm (xăng)'],
 ['kd',900e6,NAM-12,true,'xe KDVT 12 năm (điện)'],
 ['kd',900e6,NAM-12,false,'xe KDVT 12 năm (xăng)'],
 ['nkd',30e6,NAM-2,false,'giá trị 30tr'],
 ['nkd',12e9,NAM-2,true,'giá trị 12 tỷ (điện)']].forEach(([c,V,y,d,ten])=>{
  const m=P.tinhPhi({nhom_xe:c,gia_tri_xe:V,nam_dang_ky:y,khu_vuc:'khac',xe_dien:d,bs01:1,bs02:1,bs06:1});
  console.log('   '+ten.padEnd(26)+(m.ok?'tính được → '+P.dinhDangVND(m.phi):'CHẶN — '+m.ly_do));
});

console.log('\n4) Ưu đãi Hà Nội và sàn phí thuần (nkd, 700tr)');
[[NAM-1,'dưới 3 năm'],[NAM-4,'3-6 năm'],[NAM-7,'6-10 năm']].forEach(([y,ten])=>{
  const hn=P.tinhPhi({nhom_xe:'nkd',gia_tri_xe:700e6,nam_dang_ky:y,khu_vuc:'hn',bs01:1,bs02:1,bs06:1});
  const kh=P.tinhPhi({nhom_xe:'nkd',gia_tri_xe:700e6,nam_dang_ky:y,khu_vuc:'khac',bs01:1,bs02:1,bs06:1});
  console.log('   '+ten.padEnd(12)+'HN '+P.dinhDangTyLe(hn.ty_le_ap_dung).padStart(7)+(hn.cham_san_phi_thuan?' (chạm sàn)':'          ')
    +'  Tỉnh '+P.dinhDangTyLe(kh.ty_le_ap_dung).padStart(7)+'  → chênh '+P.dinhDangVND(kh.phi-hn.phi));
});

console.log('\n5) Phí tối thiểu 6tr — bỏ bớt ĐKBS thì sàn giảm theo');
[[1,1,1],[1,0,1],[0,0,0]].forEach(b=>{
  const m=P.tinhPhi({nhom_xe:'nkd',gia_tri_xe:300e6,nam_dang_ky:NAM-1,khu_vuc:'khac',bs01:!!b[0],bs02:!!b[1],bs06:!!b[2]});
  console.log('   BS['+b+'] → phí '+P.dinhDangVND(m.phi).padStart(13)+(m.ap_phi_toi_thieu?'  (áp sàn '+P.dinhDangVND(m.phi_toi_thieu_quy_doi)+')':''));
});
