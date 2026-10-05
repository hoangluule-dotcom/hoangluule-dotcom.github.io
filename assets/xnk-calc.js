/* DBV247 — Công cụ tính phí bảo hiểm hàng hóa XNK (#tinh-phi).
   Nguồn tỷ lệ: Biểu phí PL4/2026, mục II.B (tỷ lệ % chưa VAT, điều kiện A theo nhóm hàng; B 0,10%; C 0,07%).
   Phí hiển thị = STBH × tỷ lệ × HE_SO × (1 + VAT); không thấp hơn phí tối thiểu 260.000đ / 10 USD (đã gồm VAT).
   STBH = 110% giá trị hóa đơn khi ô "Cộng 10% lãi dự tính" bật (mặc định bật).
   Hàng chở xá, xăng dầu, than quặng, vỏ container, hàng hạn chế: không tính — chuyển sang chào phí riêng.
   Lead gửi Netlify form dbv-tuvan bằng fetch('/'); assets/dbv-tracking.js tự gắn nguồn khách, mã CTV
   và tự báo generate_lead — KHÔNG gọi lại generate_lead ở đây kẻo đếm trùng. */
(function(){
'use strict';
var root=document.getElementById('tinh-phi'); if(!root) return;
var HE_SO=0.6, VAT=0.10, MIN={VND:260000, USD:10};
var RATE_B=0.10, RATE_C=0.07;

var NHOM=[
 {id:'nong-san', ten:'Nông sản, thực phẩm', vd:'cà phê, gạo, hạt điều, bánh kẹo, đồ uống', a:0.15,
  luu:'Loại trừ thối mốc do hấp hơi, đổ mồ hôi nếu không do tai nạn trong hành trình.',
  kw:'nong san thuc pham ca phe tieu ho tieu dieu ca cao gao lua mi ngo bap ngu coc duong sua bot banh keo socola ruou bia nuoc giai khat nuoc ngot mi an lien che tra gia vi muoi hai san kho ca kho muc kho nuoc mam do hop thuc an chan nuoi cam ba dau nanh tinh bot san khoai mi hanh toi ot rau qua kho long nhan mat ong dau an'},
 {id:'dong-lanh', ten:'Hàng đông lạnh, tươi sống', vd:'thủy sản, thịt, trái cây và rau củ tươi', a:0.15, chiA:true,
  luu:'Áp dụng điều khoản riêng cho hàng đông lạnh; chuyên viên sẽ tư vấn yêu cầu nhiệt độ container lạnh.',
  kw:'dong lanh tuoi song thuy san tom ca muc thit trai cay tuoi rau cu tuoi hoa qua tuoi cu giong container lanh'},
 {id:'may-moc', ten:'Máy móc, điện tử, xe', vd:'thiết bị, linh kiện, máy tính, ô tô mới', a:[0.15,0.20],
  luu:'Thiết bị chính xác, bóng đèn: loại trừ bể vỡ không do tai nạn. Xe mới: loại trừ trầy xước sơn, mất phụ tùng không khai báo trên vận đơn.',
  items:[
   {n:'Máy móc thiết bị thông thường', r:0.15, kw:'may moc thiet bi may cnc day chuyen may khau'},
   {n:'Hàng điện tử, máy tính, linh kiện', r:0.15, kw:'dien tu may tinh linh kien ban dan may in dien thoai'},
   {n:'Dây, cáp điện, cáp quang', r:0.15, kw:'day dien cap dien cap quang'},
   {n:'Thiết bị chính xác, y tế, quang học', r:0.20, kw:'thiet bi chinh xac y te quang hoc may do kiem tra'},
   {n:'Bóng đèn, cáp cao thế', r:0.20, kw:'bong den den led cap cao the'},
   {n:'Ô tô, xe máy nguyên chiếc mới', r:0.18, kw:'o to xe hoi xe may xe co gioi xe moi'},
   {n:'Săm lốp, xe đạp, dụng cụ cầm tay', r:0.15, kw:'sam lop xe dap dung cu cam tay'}]},
 {id:'tieu-dung', ten:'Dệt may, giày dép, tiêu dùng', vd:'vải, quần áo, mỹ phẩm, đồ nhựa', a:0.15,
  kw:'det may vai quan ao soi chi bong len giay dep my pham nuoc hoa dau goi kem duong xa phong bot giat do nhua do choi van phong pham but tui xach hang da gia da gang tay do gia dung van hoa pham tranh anh sach'},
 {id:'hoa-chat', ten:'Hóa chất, dược phẩm, phân bón', vd:'tân dược, hạt nhựa, sơn, thuốc nhuộm', a:0.15,
  luu:'Hóa chất lỏng, sơn, tinh dầu, keo, mực in: loại trừ cháy nổ tự nhiên.',
  kw:'hoa chat duoc pham tan duoc nguyen lieu thuoc phan bon hat nhua nhua poly son vecni thuoc nhuom thuoc tru sau bao ve thuc vat soda keo dan muc in tinh dau huong lieu'},
 {id:'sat-thep', ten:'Sắt thép, vật liệu xây dựng', vd:'thép cuộn, gạch ốp lát, xi măng, gỗ nguyên liệu', a:0.15,
  luu:'Sắt thép: loại trừ ô-xy hóa, gỉ sét, biến màu tự nhiên nếu không do tai nạn.',
  kw:'sat thep ton thep cuon phoi thep kim loai nhom dong que han gach da op lat xi mang clinker thach cao da voi cat dat set nhua duong go tron go dam go nguyen lieu vat lieu xay dung'},
 {id:'do-go', ten:'Đồ gỗ, mây tre, thủ công', vd:'nội thất, ván sàn, mây tre đan, thảm', a:[0.12,0.22],
  luu:'Đồ gỗ nội thất: loại trừ nứt, cong vênh, trầy xước không do tai nạn. Mây tre: loại trừ nấm mốc do hấp hơi.',
  items:[
   {n:'Đồ gỗ nội thất', r:0.22, kw:'do go noi that ban ghe tu giuong sofa'},
   {n:'Gỗ ván sàn', r:0.15, kw:'van san san go'},
   {n:'Mây tre đan, đũa, tăm, nhang', r:0.12, kw:'may tre dan dua tam nhang huong guoc coi'},
   {n:'Thảm, chiếu, hàng thêu, đồ bạc', r:0.15, kw:'tham chieu coi theu ren to tam do bac thu cong my nghe hoa gia'}]},
 {id:'de-vo', ten:'Hàng dễ vỡ', vd:'gốm sứ, thủy tinh, sơn mài, kính tấm', a:[0.15,0.70],
  luu:'Hàng dễ vỡ: loại trừ bể vỡ không do tai nạn; một số mặt hàng có mức khấu trừ riêng.',
  items:[
   {n:'Ly, tách, chén thủy tinh, sành sứ', r:0.15, kw:'ly tach chen thuy tinh sanh su bat dia', note:'Mức khấu trừ tối thiểu 1% số tiền bảo hiểm.'},
   {n:'Gốm sứ mỹ nghệ', r:0.40, kw:'gom su my nghe binh lo'},
   {n:'Sừng, ngà, sơn mài', r:0.70, kw:'sung nga son mai doi moi'},
   {n:'Kính tấm', r:2.00, kw:'kinh tam kinh xay dung guong', note:'Mức khấu trừ tối thiểu 2% số tiền bảo hiểm.'}]},
 {id:'giay', ten:'Giấy, bao bì', vd:'giấy cuộn, carton, bao tải', a:0.12,
  luu:'Loại trừ ướt mốc do hấp hơi, nhiễm bẩn nếu không do tai nạn.',
  kw:'giay giay cuon carton bao bi thung hop bao tai bot giay'},
 {id:'da-dung', ten:'Hàng cũ, phế liệu, tạm nhập', vd:'máy cũ, sắt phế liệu, tạm nhập tái xuất', chiC:true, c:0.07,
  luu:'Hàng đã qua sử dụng, phế liệu, tạm nhập tái xuất và đồ dùng cá nhân chỉ nhận bảo hiểm điều kiện C; có thể mua thêm rủi ro phụ.',
  kw:'hang cu qua su dung second hand may cu phe lieu sat phe lieu tam nhap tai xuat tam xuat tai nhap do dung ca nhan chuyen nha'},
 {id:'sieu-truong', ten:'Hàng siêu trường, siêu trọng', vd:'cẩu, cánh quạt điện gió, thiết bị dự án', chiC:true, c:0.10, thamDinh:true,
  luu:'Hàng siêu trường, siêu trọng chỉ nhận điều kiện C và cần thẩm định phương án xếp dỡ, chằng buộc trước khi cấp đơn.',
  kw:'sieu truong sieu trong cau gian cau truc canh quat dien gio thiet bi du an hang qua kho'},
 {id:'dac-biet', ten:'Hàng rời & hàng đặc biệt', vd:'chở xá, xăng dầu, than quặng, vỏ container, đồ cổ, đá quý', lienHe:true,
  kw:'hang roi cho xa ham tau xang dau gas khi hoa long than quang khoang san do co tac pham nghe thuat dong vat song da quy vang ngoc trai trien lam hang ca nhan vo container container rong'}
];

var $=function(id){return document.getElementById(id)};
var st={g:null, item:null, cur:'USD', v:0, k110:true};
var fold=function(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim()};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var ga=function(ev,p){ if(typeof window.gtag==='function') window.gtag('event',ev,p); };
function nhom(id){ for(var i=0;i<NHOM.length;i++) if(NHOM[i].id===id) return NHOM[i]; return null; }

/* ô nhóm hàng */
var tiles=$('cargo-calc-tiles'), q=$('cargo-calc-q'), sg=$('cargo-calc-sugg');
NHOM.forEach(function(g){
  var b=document.createElement('button');
  b.type='button'; b.className='cargo-calc-tile'; b.dataset.g=g.id; b.setAttribute('aria-pressed','false');
  b.innerHTML='<b>'+esc(g.ten)+'</b><span>'+esc(g.vd)+'</span>';
  b.addEventListener('click',function(){ q.value=''; chonNhom(g.id,null); });
  tiles.appendChild(b);
});

function chonNhom(id,itemIdx){
  st.g=id; st.item=(itemIdx==null?null:itemIdx);
  [].forEach.call(tiles.children,function(t){ t.setAttribute('aria-pressed',t.dataset.g===id?'true':'false'); });
  var g=nhom(id), box=$('cargo-calc-items'), chips=$('cargo-calc-chips');
  chips.innerHTML='';
  if(g.items){
    g.items.forEach(function(it,i){
      var c=document.createElement('button'); c.type='button'; c.className='cargo-calc-chip';
      c.textContent=it.n; c.setAttribute('aria-pressed',st.item===i?'true':'false');
      c.addEventListener('click',function(){ chonNhom(id, st.item===i?null:i); });
      chips.appendChild(c);
    });
    box.hidden=false;
  } else box.hidden=true;
  ga('hh_xnk_chon_nhom',{nhom:id});
  tinh();
}

/* tìm kiếm theo tên hàng (bỏ dấu) */
var idx=[];
NHOM.forEach(function(g){
  idx.push({g:g.id, i:null, label:g.ten, sub:g.vd, hay:fold(g.ten+' '+g.vd+' '+(g.kw||''))});
  (g.items||[]).forEach(function(it,i){ idx.push({g:g.id, i:i, label:it.n, sub:'Nhóm '+g.ten, hay:fold(it.n+' '+it.kw)}); });
});
var hits=[], cursor=-1;
function dong(){ sg.hidden=true; q.setAttribute('aria-expanded','false'); q.removeAttribute('aria-activedescendant'); cursor=-1; }
q.addEventListener('input',function(){
  var t=fold(q.value); if(t.length<2){ dong(); return; }
  var words=t.split(' ');
  hits=idx.map(function(e){
    var h=' '+e.hay, s=0, du=true;
    words.forEach(function(w){ if(h.indexOf(' '+w)>-1) s+=2; else du=false; });
    if(h.indexOf(' '+t)>-1) s+=3;
    if(e.i!==null) s+=0.5;
    return {e:e, s:du?s:0};
  }).filter(function(x){return x.s>0}).sort(function(a,b){return b.s-a.s});
  if(hits.length){ var top=hits[0].s; hits=hits.filter(function(x){return x.s>=top-2.5}).slice(0,6); }
  sg.innerHTML = hits.length
    ? hits.map(function(h,k){return '<li role="option" id="cargo-calc-o'+k+'" data-k="'+k+'" aria-selected="false">'+esc(h.e.label)+'<small>'+esc(h.e.sub)+'</small></li>'}).join('')
    : '<li role="option" id="cargo-calc-o0" data-k="-1" aria-selected="false">Chưa có trong danh sách<small>Chọn “Hàng rời & hàng đặc biệt” hoặc để lại số điện thoại để được báo phí</small></li>';
  sg.hidden=false; q.setAttribute('aria-expanded','true'); cursor=-1;
});
function chonGoiY(k){
  var tu=q.value;
  if(k<0||!hits[k]) chonNhom('dac-biet',null);
  else { chonNhom(hits[k].e.g, hits[k].e.i); q.value=hits[k].e.label; }
  dong();
  ga('hh_xnk_tim_hang',{tu_khoa:tu});
}
sg.addEventListener('mousedown',function(ev){ var li=ev.target.closest('li'); if(li){ ev.preventDefault(); chonGoiY(+li.dataset.k); } });
q.addEventListener('keydown',function(ev){
  if(sg.hidden) return; var n=sg.children.length;
  if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){
    ev.preventDefault(); cursor=(cursor+(ev.key==='ArrowDown'?1:-1)+n)%n;
    [].forEach.call(sg.children,function(li,i){ li.setAttribute('aria-selected',i===cursor?'true':'false'); });
    q.setAttribute('aria-activedescendant',sg.children[cursor].id);
  } else if(ev.key==='Enter'){ ev.preventDefault(); chonGoiY(+sg.children[cursor<0?0:cursor].dataset.k); }
  else if(ev.key==='Escape') dong();
});
q.addEventListener('blur',function(){ setTimeout(dong,150); });

/* giá trị & đơn vị tiền */
var vIn=$('cargo-calc-v');
function dinhDang(n){ return st.cur==='USD' ? n.toLocaleString('en-US') : n.toLocaleString('vi-VN'); }
vIn.addEventListener('input',function(){
  var raw=vIn.value.replace(/[^\d]/g,'').replace(/^0+/,'').slice(0,15);
  st.v=raw?parseInt(raw,10):0;
  vIn.value=raw?dinhDang(st.v):'';
  tinh();
});
var curBtns=root.querySelectorAll('.cargo-calc-cur button');
[].forEach.call(curBtns,function(b){
  b.addEventListener('click',function(){
    st.cur=b.dataset.cur;
    [].forEach.call(curBtns,function(x){ x.setAttribute('aria-pressed',x===b?'true':'false'); });
    vIn.placeholder=st.cur==='USD'?'VD: 50,000':'VD: 1.200.000.000';
    if(st.v) vIn.value=dinhDang(st.v);
    tinh();
  });
});
$('cargo-calc-110').addEventListener('change',function(){ st.k110=this.checked; tinh(); });

/* tính phí */
function phi(rate,stbh){
  var p=stbh*rate/100*HE_SO*(1+VAT);
  p = st.cur==='VND' ? Math.round(p/1000)*1000 : Math.round(p*100)/100;
  var min=MIN[st.cur];
  return {p:Math.max(p,min), min:p<min};
}
function tien(n){
  return st.cur==='VND' ? Math.round(n).toLocaleString('vi-VN')+'đ'
    : n.toLocaleString('en-US',{minimumFractionDigits:(n%1?2:0),maximumFractionDigits:2})+' USD';
}

var DK={
  A:{ten:'Điều kiện A – Toàn diện', mo:'Mọi rủi ro gây mất mát, hư hỏng hàng hóa, trừ các loại trừ ghi trong điều khoản.'},
  B:{ten:'Điều kiện B – Mở rộng', mo:'Rủi ro của điều kiện C, thêm động đất, sét đánh, nước biển, nước sông tràn vào tàu, container, kho.'},
  C:{ten:'Điều kiện C – Cơ bản', mo:'Cháy nổ, tàu mắc cạn, chìm, lật, đâm va, ném hàng khỏi tàu, tổn thất chung.'}
};
var ICON_OK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
var ICON_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>';

function dongDK(key,html,cls){
  return '<div class="cargo-calc-row '+(cls||'')+'"><h4>'+DK[key].ten+(key==='A'&&cls==='is-rec'?'<span class="cargo-calc-tag">L/C thường yêu cầu</span>':'')+'</h4>'+html+'<p>'+DK[key].mo+'</p></div>';
}
function khongApDung(t){ return '<div class="cargo-calc-price"><small>'+t+'</small></div>'; }
function giaHtml(r1,r2,stbh){
  var a=phi(r1,stbh);
  if(r2==null||r2===r1){
    return '<div class="cargo-calc-price">'+tien(a.p)+(a.min?'<span class="cargo-calc-min">Phí tối thiểu</span>':'')+'</div>';
  }
  var b=phi(r2,stbh);
  if(a.p===b.p) return giaHtml(r1,null,stbh);
  return '<div class="cargo-calc-price">'+tien(a.p)+' – '+tien(b.p)+'<small>tùy mặt hàng cụ thể</small></div>';
}

var tomTat='', quanTam='';
window.dbvXnkTinhPhi=function(){ return {quanTam:quanTam, tomTat:tomTat}; };
function baoThayDoi(){ try{ document.dispatchEvent(new CustomEvent('xnk-tinh-phi')); }catch(e){} }
function tinh(){ tinhPhi(); baoThayDoi(); }
function tinhPhi(){
  var out=$('cargo-calc-out'), notes=$('cargo-calc-notes'), g=st.g?nhom(st.g):null;
  notes.innerHTML='';
  $('cargo-calc-lead-h').textContent='Nhận bản chào phí chính thức';
  quanTam = g ? g.ten : '';
  if(g && g.lienHe){ veLienHe(g); return; }
  if(!g || !st.v){
    out.innerHTML='<div class="cargo-calc-empty">'+(g?'Nhập giá trị lô hàng để xem phí của <b>'+esc(g.ten)+'</b>.':'Chọn loại hàng và nhập giá trị lô hàng,<br>phí của 3 điều kiện bảo hiểm sẽ hiện ở đây.')+'</div>';
    tomTat = g ? 'Nhóm hàng: '+g.ten : '';
    return;
  }
  var stbh=st.v*(st.k110?1.1:1);
  var it=(g.items && st.item!=null) ? g.items[st.item] : null;
  if(it) quanTam=g.ten+' / '+it.n;
  var rA1,rA2;
  if(it){ rA1=rA2=it.r; }
  else if(Array.isArray(g.a)){ rA1=g.a[0]; rA2=g.a[1]; }
  else { rA1=rA2=g.a; }

  var html='', rChinh=g.chiC?g.c:rA1;
  if(g.chiC){
    html+=dongDK('A',khongApDung('Không áp dụng'),'is-off');
    html+=dongDK('B',khongApDung('Không áp dụng'),'is-off');
    html+=dongDK('C',giaHtml(g.c,null,stbh),'is-rec');
  } else {
    html+=dongDK('A',giaHtml(rA1,rA2,stbh),'is-rec');
    if(g.chiA){
      html+=dongDK('B',khongApDung('Dùng điều khoản đông lạnh riêng'),'is-off');
      html+=dongDK('C',khongApDung('Dùng điều khoản đông lạnh riêng'),'is-off');
    } else {
      html+=dongDK('B',giaHtml(RATE_B,null,stbh));
      html+=dongDK('C',giaHtml(RATE_C,null,stbh));
    }
  }
  var chinh=phi(rChinh,stbh), anyMin=chinh.min;
  var stbhHien = st.cur==='VND' ? Math.round(stbh) : Math.round(stbh*100)/100;
  html+='<p class="cargo-calc-protect">Bảo vệ <b>'+tien(stbhHien)+'</b> giá trị hàng hóa'+(anyMin?'':' với chi phí chỉ từ <b>'+tien(chinh.p)+'</b>')+'.</p>';
  out.innerHTML=html;

  var n=[];
  if(anyMin) n.push(['warn','Lô hàng nhỏ đang tính ở mức phí tối thiểu cho một giấy chứng nhận. Nếu doanh nghiệp có nhiều lô trong năm, hãy hỏi chuyên viên phương án bảo hiểm cả năm thay vì cấp lẻ từng lô.']);
  if(g.thamDinh) n.push(['warn','Nhóm hàng này cần chuyên viên thẩm định phương án xếp dỡ, chằng buộc trước khi chốt phí. Gửi số điện thoại để được hỗ trợ sớm.']);
  n.push(['ok','Nhập khẩu theo giá CIF? Người bán chỉ bắt buộc mua điều kiện C, mức thấp nhất. Mua điều kiện A ở trong nước giúp bạn tự chủ phạm vi bảo vệ và được bồi thường ngay tại Việt Nam.']);
  n.push(['ok','Bảo hiểm phải có hiệu lực trước khi hàng bắt đầu được vận chuyển. Gửi yêu cầu sớm để kịp ngày tàu chạy hoặc chuyến bay cất cánh.']);
  var ln=(it&&it.note)?it.note+' ':'';
  if(g.luu||ln) n.push(['info','Lưu ý nhóm hàng: '+ln+(g.luu||'')+' Chuyên viên sẽ giải thích rõ phạm vi trước khi cấp đơn.']);
  notes.innerHTML=n.map(function(x){ return '<li'+(x[0]==='warn'?' class="is-warn"':'')+'>'+(x[0]==='ok'?ICON_OK:ICON_I)+'<span>'+x[1]+'</span></li>'; }).join('');

  var phiA = g.chiC ? '—' : tien(phi(rA1,stbh).p)+(rA2!==rA1?' – '+tien(phi(rA2,stbh).p):'');
  var phiB = (g.chiC||g.chiA) ? '—' : tien(phi(RATE_B,stbh).p);
  var phiC = g.chiA ? '—' : tien(phi(g.chiC?g.c:RATE_C,stbh).p);
  tomTat='Nhóm hàng: '+g.ten+(it?' / '+it.n:'')+' | Giá trị hóa đơn: '+dinhDang(st.v)+' '+st.cur+' | STBH: '+tien(stbhHien)+(st.k110?' (110%)':' (100%)')+' | Phí ước tính (gồm VAT) A: '+phiA+' · B: '+phiB+' · C: '+phiC;
  ga('hh_xnk_xem_phi',{nhom:g.id, tien_te:st.cur});
}
function veLienHe(g){
  $('cargo-calc-out').innerHTML='<div class="cargo-calc-contact"><b>Nhóm hàng này cần chào phí riêng</b>Hàng chở xá trong hầm tàu, xăng dầu, than quặng, vỏ container và hàng hạn chế (đồ cổ, đá quý, động vật sống…) được chào phí theo điều khoản và hành trình cụ thể. Chuyên viên sẽ báo phí sau khi trao đổi ngắn với bạn.</div>';
  $('cargo-calc-lead-h').textContent='Để lại số điện thoại để nhận báo phí';
  tomTat='Nhóm hàng: '+g.ten+' (cần chào phí riêng)'+(st.v?' | Giá trị hóa đơn: '+dinhDang(st.v)+' '+st.cur:'')+(q.value?' | Mô tả: '+q.value:'');
}

/* gửi lead – Netlify Forms dbv-tuvan */
var form=$('cargo-calc-form'), tel=$('cargo-calc-tel'), err=$('cargo-calc-err'), btn=$('cargo-calc-send'), busy=false;
function baoLoi(t){ err.textContent=t; err.hidden=false; }
tel.addEventListener('input',function(){ err.hidden=true; });
form.addEventListener('submit',function(ev){
  ev.preventDefault(); if(busy) return;
  if(form.elements['bot-field'].value) return;
  var so=tel.value.replace(/[\s().\-]/g,'').replace(/^\+?84/,'0');
  if(!/^0[35789]\d{8}$/.test(so)){ baoLoi('Số điện thoại chưa đúng. Ví dụ: 0912 345 678'); tel.focus(); return; }
  err.hidden=true; busy=true; btn.disabled=true; btn.textContent='Đang gửi…';
  var body=new URLSearchParams({
    'form-name':'dbv-tuvan',
    'san-pham':'Bảo Hiểm Hàng Hóa Xuất Nhập Khẩu',
    'dien-thoai':so,
    'muc-quan-tam':quanTam||'Chưa chọn nhóm hàng',
    'nhu-cau':tomTat||'Chưa chọn nhóm hàng, chưa nhập giá trị',
    'trang':location.href,
    'nguon':'Máy tính phí – Hàng hóa XNK'
  }).toString();
  /* Xem trước trên máy (localhost): không gửi thật, chỉ ghi payload ra Console. */
  var xemTruoc=['localhost','127.0.0.1',''].indexOf(location.hostname)>-1;
  var gui;
  if(xemTruoc){ window.__xnkCalcPayload=body; if(window.console) console.info('[xnk-calc] Bản xem trước, chưa gửi:',body); gui=Promise.resolve({ok:true}); }
  else gui=fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});
  gui.then(function(r){
    if(!r.ok) throw new Error(r.status);
    $('cargo-calc-formwrap').hidden=true;
    var ok=$('cargo-calc-ok');
    ok.innerHTML='<b>Đã nhận số '+esc(so)+'.</b><br>Chuyên viên DBV sẽ gọi lại trong giờ làm việc để xác nhận lô hàng và gửi bản chào phí. Cần gấp, gọi ngay 0869 656 561.'+(xemTruoc?'<br><small>(Bản xem trước trên máy: thông tin chưa được gửi thật.)</small>':'');
    ok.hidden=false; ok.focus({preventScroll:true});
  }).catch(function(){
    baoLoi('Chưa gửi được. Vui lòng thử lại hoặc gọi 0869 656 561.');
    busy=false; btn.disabled=false; btn.textContent='Nhận bản chào phí';
  });
});
})();
