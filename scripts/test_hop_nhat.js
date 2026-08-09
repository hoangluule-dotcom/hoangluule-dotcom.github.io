const H=require('./lib/hop_nhat_gia.js');
const {chonPhienBan}=require('../netlify/functions/lib/bonbanh.js');
const tr=H.tr;

/* CSDL Honda CR-V 2024 thật */
const cu=[
 [2024,'EHEV RS',1188e6,1105e6,1402e6,'Xăng',5,0,0],
 [2024,'G',911e6,848e6,1075e6,'Xăng',5,0,0],
 [2024,'L',978e6,910e6,1154e6,'Xăng',7,0,0],
 [2024,'L AWD',1153e6,1073e6,1361e6,'Xăng',7,0,0]];

function chay(ten, quet){
  const r=H.hopNhatMotNam(cu, quet, chonPhienBan, '2026-08');
  const de=r.banGhi.filter((b,i)=>b[2]!==cu[i][2]);
  console.log('  '+ten);
  console.log('     đè '+de.length+' dòng · giữ nguyên '+r.giuNguyen+' · cách ly '+r.cachLy.length+' · cảnh báo '+r.thayDoi.length);
  de.forEach(b=>console.log('        '+b[1].padEnd(10)+tr(cu.find(c=>c[1]===b[1])[2])+' → '+tr(b[2])+'   nguồn: '+b[9]+' ('+b[10]+' tin)'));
  r.cachLy.forEach(x=>console.log('        ⛔ '+x.ten.padEnd(10)+tr(x.gia_cu)+' → '+tr(x.gia_moi)+'   '+x.ly_do));
  return r;
}

console.log('=== 1. Quét bình thường, giá sát bảng nền → đè hết\n');
chay('giá thị trường lệch nhẹ', {ok:true,theo_phien_ban:[
 {ten:'e hev rs',so_tin:9,trung_vi:1180e6,q1:1179e6,q3:1198e6,dong_thuan:'dong_thuan',theo_nguon:[]},
 {ten:'l',so_tin:7,trung_vi:960e6,q1:943e6,q3:973e6,dong_thuan:'dong_thuan',theo_nguon:[]},
 {ten:'l awd',so_tin:5,trung_vi:1113e6,q1:1111e6,q3:1114e6,dong_thuan:'dong_thuan',theo_nguon:[]}]});

console.log('\n=== 2. LỖI GIÁ CẮT CỤT quay lại → phải bị CÁCH LY, không được ghi\n');
chay('e:HEV RS bị đọc thành 1 tỷ chẵn (thật là 1,18 tỷ)', {ok:true,theo_phien_ban:[
 {ten:'e hev rs',so_tin:9,trung_vi:1000e6,q1:1000e6,q3:1000e6,dong_thuan:'dong_thuan',theo_nguon:[]},
 {ten:'l',so_tin:7,trung_vi:960e6,q1:943e6,q3:973e6,dong_thuan:'dong_thuan',theo_nguon:[]}]});

console.log('\n=== 3. Hai nguồn mâu thuẫn → không đè\n');
chay('bonbanh 960tr vs carmudi 1.4 tỷ', {ok:true,theo_phien_ban:[
 {ten:'l',so_tin:10,trung_vi:1200e6,q1:960e6,q3:1400e6,dong_thuan:'mau_thuan',lech_toi_da:45.8,
  theo_nguon:[{nguon:'bonbanh',trung_vi:960e6},{nguon:'carmudi',trung_vi:1400e6}]}]});

console.log('\n=== 4. Giá nhảy 45% → cách ly (ngưỡng 40%)\n');
chay('bản L nhảy từ 978tr lên 1.42 tỷ', {ok:true,theo_phien_ban:[
 {ten:'l',so_tin:8,trung_vi:1420e6,q1:1400e6,q3:1440e6,dong_thuan:'dong_thuan',theo_nguon:[]}]});

console.log('\n=== 5. Đổi 15% → vẫn đè nhưng vào danh sách cần xem\n');
chay('bản L giảm 15%', {ok:true,theo_phien_ban:[
 {ten:'l',so_tin:8,trung_vi:831e6,q1:820e6,q3:845e6,dong_thuan:'dong_thuan',theo_nguon:[]}]});

console.log('\n=== 6. Không quét được → giữ nguyên toàn bộ\n');
chay('nguồn hỏng hết', {ok:false});

console.log('\n=== 7. Nhãn nguồn cho dòng chưa từng đè');
const nhan=H.ganNhanNen([[2024,'G',911e6,848e6,1075e6,'Xăng',5,0,0],[2020,'X',500e6,0,0,'Xăng',5,0,1]]);
nhan.forEach(b=>console.log('   '+b[1].padEnd(4)+'nguồn='+b[9]+'  số tin='+b[10]));

console.log('\n=== 8. Báo cáo Markdown');
const bc=H.dungBaoCao({da_cap_nhat:412,giu_nguyen:11394,da_quet:520,khong_co:38,
 thay_doi:[{xe:'HONDA CR-V',nam:2024,ten:'L',gia_cu:978e6,gia_moi:831e6,lech:-0.15,so_tin:8}],
 cach_ly:[{xe:'HONDA CR-V',nam:2024,ten:'EHEV RS',gia_cu:1188e6,gia_moi:1000e6,ly_do:'nhảy -15.8% so với kỳ trước'}],
 suc_khoe_nguon:[{nguon:'bonbanh',dat:498,hong:22,vi_pham_pho_bien:'qua_it_tin (18)'},
                 {nguon:'carmudi',dat:210,hong:310,vi_pham_pho_bien:'qua_it_tin (280)'}]},'2026-08');
console.log('   dài '+bc.length+' ký tự · có bảng cách ly:'+bc.includes('Bị cách ly')+' · có sức khoẻ nguồn:'+bc.includes('Sức khoẻ'));
