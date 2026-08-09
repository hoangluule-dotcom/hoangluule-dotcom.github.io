/* Chứng minh bộ bất biến bắt được đúng BA LỖI đã thực sự xảy ra ngày 08/08/2026.
   Mỗi ca dưới đây là dữ liệu mà parser hỏng SẼ trả ra — trông rất bình thường,
   không ném lỗi, không cảnh báo gì. */
const K=require('../netlify/functions/lib/nguon/khung.js');

function bao(ten, tin, ctx, phaiBat){
  const r=K.kiemTraBatBien(tin, ctx);
  const bat=!r.dat;
  const dung=bat===phaiBat;
  console.log('  '+(dung?'✓':'✗ SAI')+'  '+ten.padEnd(46)+(bat?'BẮT ĐƯỢC':'cho qua'));
  if(bat) r.vi_pham.forEach(v=>console.log('          → '+v.ma+': '+v.chi_tiet));
  return dung;
}

const CTX={nam:2024, tong_tin_trang:38, tin_moi_trang:20};
let ok=0,tong=0;

console.log('=== BA LỖI THẬT ĐÃ XẢY RA — bộ bất biến có bắt được không?\n');

/* LỖI 1: giá "1 Tỷ 180 Triệu" bị cắt thành 1 tỷ chẵn */
tong++; ok+=bao('Lỗi 1 — giá tiền tỷ bị cắt cụt',
  [1e9,1e9,945e6,940e6,1e9,1e9,1e9,939e6,1e9,1e9,970e6,1e9,975e6,979e6,1e9,1e9,960e6,1e9,1e9]
    .map((g,i)=>({ma:'m'+i,gia:g,nam:2024,phien_ban:i%3===0?'l':'e hev rs'})), CTX, true);

/* LỖI 2 (biến thể): tin lẫn đời khác — mục "xe tương tự" */
tong++; ok+=bao('Lỗi 2 — lẫn tin của đời xe khác',
  [2024,2024,2017,2023,2025,2008,2022,2020,2019,2012,2018,2021]
    .map((y,i)=>({ma:'m'+i,gia:900e6+i*1e6,nam:y,phien_ban:'l'})), CTX, true);

/* LỖI 3: mọi tin rơi vào nhóm "khong ro" vì không lấy được tên phiên bản */
tong++; ok+=bao('Lỗi 3 — không lấy được tên phiên bản',
  Array.from({length:19},(_,i)=>({ma:'m'+i,gia:900e6+i*7e6,nam:2024,phien_ban:''})), CTX, true);

console.log('\n=== CÁC CA KHÁC\n');

tong++; ok+=bao('Parser trượt phần lớn tin',
  Array.from({length:4},(_,i)=>({ma:'m'+i,gia:900e6,nam:2024,phien_ban:'l'})), CTX, true);

tong++; ok+=bao('Giá vô lý (đọc nhầm sang số khác)',
  Array.from({length:12},(_,i)=>({ma:'m'+i,gia:i<4?900e6:180e6*0.01,nam:2024,phien_ban:'l'})), CTX, true);

tong++; ok+=bao('Quá ít tin để kết luận',
  [{ma:'a',gia:900e6,nam:2024,phien_ban:'l'},{ma:'b',gia:910e6,nam:2024,phien_ban:'l'}], CTX, true);

console.log('\n=== DỮ LIỆU LÀNH — không được báo động giả\n');

const lanh=[945,940,960,939,970,975,979,1180,1179,1185,1099,1199,1205,1165,1198,1115,1110,955,965]
  .map((tr,i)=>({ma:'m'+i,gia:tr*1e6,nam:2024,phien_ban:tr<1000?'l':'e hev rs'}));
tong++; ok+=bao('19 tin thật của Honda CR-V 2024', lanh, CTX, false);

const it=[{ma:'a',gia:900e6,nam:2024,phien_ban:'l'},{ma:'b',gia:910e6,nam:2024,phien_ban:'l'},
          {ma:'c',gia:920e6,nam:2024,phien_ban:'l'},{ma:'d',gia:930e6,nam:2024,phien_ban:'l'}];
tong++; ok+=bao('4 tin nhưng sạch (xe hiếm)', it, {nam:2024,tong_tin_trang:4,tin_moi_trang:20}, false);

console.log('\n'+ok+'/'+tong+' ca đúng');
process.exit(ok===tong?0:1);
