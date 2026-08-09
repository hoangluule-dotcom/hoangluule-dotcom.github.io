const B=require('../netlify/functions/lib/bonbanh.js');
const D=JSON.parse(require('fs').readFileSync(__dirname+'/../data/gia-xe-db.json','utf8')).data;

/* Tên phiên bản THẬT lấy từ trang Bonbanh */
const THAT={
 'TOYOTA|FORTUNER|2022':['2.7l 4x2 at','2.7l 4x4 at','2.8l 4x4 at','legender 2.8l 4x4 at','2.4l 4x2 mt','2.4l 4x2 at','legender 2.4l 4x2 at'],
 'TOYOTA|VIOS|2020':['1.5e mt','1.5e cvt','1.5g'],
};

console.log('=== 1. Các ca PHẢI LOẠI (khác dung tích hoặc dẫn động)');
[['2.7 LEGENDER 4X4 AT','legender 2.8l 4x4 at','khác dung tích 2.7 vs 2.8'],
 ['2.4G 4X2 AT','2.4l 4x4 at','khác dẫn động 4x2 vs 4x4'],
 ['1.5E MT','1.5g','khác cấp E vs G'],
 ['1.5E MT','1.5e cvt','khác hộp số MT vs CVT'],
 ['2.0 AT','2.5 AT','khác dung tích 2.0 vs 2.5']].forEach(([a,b,vs])=>{
  const d=B.diemKhop(a,b);
  console.log('   '+(a+'  ~  '+b).padEnd(46)+'điểm '+String(d).padEnd(7)+(d<0.5?'LOẠI ✓':'✗ VẪN NHẬN — SAI')+'   ('+vs+')');
});

console.log('\n=== 2. Các ca PHẢI NHẬN (cùng xe, viết khác)');
[['2.4G 4X2 AT','2.4l 4x2 at','CSDL ghi G, Bonbanh ghi L'],
 ['2.8V 4X4 AT','2.8l 4x4 at','CSDL ghi V, Bonbanh ghi L'],
 ['2.4 LEGENDER 4X2 AT','legender 2.4l 4x2 at','thứ tự chữ khác'],
 ['1.5E MT','1.5e mt','trùng khít'],
 ['1.5G CVT','1.5g','Bonbanh lược hộp số'],
 ['GR-S 1.5 CVT','gr s','Bonbanh lược dung tích'],
 ['LIMO','limo','không có dung tích']].forEach(([a,b,vs])=>{
  const d=B.diemKhop(a,b);
  console.log('   '+(a+'  ~  '+b).padEnd(46)+'điểm '+String(d).padEnd(7)+(d>=0.5?'NHẬN ✓':'✗ BỊ LOẠI — SAI')+'   ('+vs+')');
});

console.log('\n=== 3. Tỷ lệ khớp trên tên thật');
let tongOK=0,tongCase=0;
for(const key in THAT){
  const [hang,dong,nam]=key.split('|');
  const rows=(D[hang][dong]||[]).filter(r=>r[0]===+nam);
  const nhom=THAT[key].map(t=>({ten:t,so_tin:5}));
  let ok=0;
  console.log('   '+hang+' '+dong+' '+nam);
  for(const r of rows){
    const k=B.chonPhienBan(nhom,r[1],3);
    console.log('      '+(r[1]||'?').padEnd(24)+(k?'→ '+k.ten.padEnd(22)+'điểm '+k.diem_khop:'→ không khớp (an toàn, sẽ lùi về CSDL)'));
    if(k)ok++;
  }
  console.log('      ==> '+ok+'/'+rows.length);
  tongOK+=ok;tongCase+=rows.length;
}
console.log('\n   TỔNG: khớp '+tongOK+'/'+tongCase+' (trước khi sửa: 5/8, trong đó 1 ca khớp NHẦM sang xe khác)');
