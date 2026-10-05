/* DBV247 — Trang bảo hiểm hàng hóa vận chuyển nội địa: công cụ tính phí + gửi lead.
   Nguồn tỷ lệ: Biểu phí PL4/2026, mục II.A "Hàng hóa vận chuyển nội địa" (tỷ lệ % chưa VAT):
     đường bộ/đường sắt 0,04% · đường thủy 0,06% · đa phương thức 0,07% · siêu trường siêu trọng 0,10%
     Phụ phí: qua nước lân cận / xếp dỡ / lưu kho tạm thời / ướt hàng: +0,02% mỗi điều khoản.
     Chủ hàng đồng thời là người vận chuyển: +10% phí gốc.
   Phí hiển thị = Giá trị × (tỷ lệ gốc + phụ phí) × HE_SO × (1 + VAT); tối thiểu 260.000đ/GCN (đã gồm VAT).
   HE_SO theo hình thức mua (Hoàng chốt 05/10/2026): từng chuyến giảm 10% (0,9); vận chuyển thường xuyên giảm 30% (0,7).
   Thẻ phương thức hiển thị "Từ …%" theo mức thấp hơn (thường xuyên).
   Lead gửi Netlify form dbv-tuvan bằng fetch('/'); assets/dbv-tracking.js tự gắn nguồn khách, mã CTV
   và tự báo generate_lead — KHÔNG gọi lại generate_lead ở đây kẻo đếm trùng. */
(function(){
'use strict';
var root=document.getElementById('tinh-phi'); if(!root) return;

var HE_SO={chuyen:0.9, thang:0.7}, VAT=0.10, MIN=260000, PHU_PHI=0.02, TU_CHO=0.10;
var PT={
  bo:{ten:'Đường bộ', r:0.04},
  sat:{ten:'Đường sắt', r:0.04},
  thuy:{ten:'Đường thủy nội địa', r:0.06},
  da:{ten:'Đa phương thức', r:0.07}
};
var HANG={
  'tieu-dung':{ten:'Hàng tiêu dùng, thực phẩm đóng gói'},
  'may-moc':{ten:'Máy móc, thiết bị, điện tử', luu:'Máy móc, thiết bị chính xác: tổn thất do đóng gói, chằng buộc không phù hợp thường bị loại trừ.'},
  'vlxd':{ten:'Vật liệu xây dựng, sắt thép', luu:'Sắt thép: gỉ sét, ô-xy hóa tự nhiên không do tai nạn thường bị loại trừ.'},
  'nong-san':{ten:'Nông sản, thức ăn chăn nuôi', luu:'Hàng nông sản: hao hụt tự nhiên, ẩm mốc do hấp hơi không do tai nạn thường bị loại trừ.'},
  'det-may':{ten:'Dệt may, giày dép, bao bì'},
  'de-vo':{ten:'Hàng dễ vỡ', canhBao:'Hàng dễ vỡ thường áp dụng mức khấu trừ riêng và yêu cầu đóng gói phù hợp; chuyên viên sẽ xác nhận trước khi cấp đơn.'},
  'dong-lanh':{ten:'Hàng đông lạnh, tươi sống', canhBao:'Hàng đông lạnh, tươi sống áp dụng điều kiện riêng (nhiệt độ, thời gian hành trình); phí có thể điều chỉnh sau khi thẩm định.'},
  'sieu-truong':{ten:'Hàng siêu trường, siêu trọng', r:0.10, canhBao:'Hàng siêu trường, siêu trọng cần thẩm định phương án xếp dỡ, chằng buộc trước khi chốt phí.'},
  'nguy-hiem':{ten:'Xăng dầu, hóa chất, hàng nguy hiểm', lienHe:true},
  'gia-tri-cao':{ten:'Tiền, vàng bạc, đá quý, tác phẩm nghệ thuật', lienHe:true},
  'khac':{ten:'Hàng khác'}
};
var PP_TEN={'xep-do':'Xếp dỡ','uot':'Ướt hàng','luu-kho':'Lưu kho tạm thời','qua-canh':'Qua nước lân cận'};

var $=function(id){return document.getElementById(id)};
var ga=function(ev,p){ if(typeof window.gtag==='function') window.gtag('event',ev,p); };
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var vnd=function(n){ return Math.round(n).toLocaleString('vi-VN')+'đ'; };
var pct=function(r){ return (Math.round(r*10000)/10000).toLocaleString('vi-VN',{maximumFractionDigits:4})+'%'; };
var ICON_OK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
var ICON_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>';

var st={mode:'chuyen', v:0};
var elHang=$('vc-hang'), elPt=$('vc-pt'), elGt=$('vc-gt'), elSo=$('vc-sochuyen');
var tomTat='', ketQua='';

/* hiển thị tỷ lệ trên thẻ phương thức lấy từ cùng bảng phí */
document.querySelectorAll('[data-rate]').forEach(function(b){ var p=PT[b.getAttribute('data-rate')]; if(p) b.textContent=pct(p.r*HE_SO.thang); });

/* ngày mặc định: hôm nay */
var homNay=new Date(); homNay.setHours(0,0,0,0);
var iso=function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };

/* tab */
var tabs=root.querySelectorAll('[role=tab]');
function datMode(m){
  st.mode=m;
  tabs.forEach(function(t){ t.setAttribute('aria-selected', t.getAttribute('data-mode')===m ? 'true':'false'); });
  elGt.closest('.vc-f').style.gridColumn = m==='thang' ? '' : '1 / -1';
  $('vc-f-chuyen').hidden = m!=='thang';
  $('vc-gt-lbl').textContent = m==='thang' ? 'Giá trị trung bình mỗi chuyến (VNĐ)' : 'Giá trị hàng hóa (VNĐ)';
  $('vc-res-unit').textContent = m==='thang' ? '/ tháng' : '/ chuyến';
  var r=document.querySelector('#vc-lead input[name="nhu-cau"][value="'+(m==='thang'?'Vận chuyển thường xuyên':'Một chuyến hàng')+'"]'); if(r) r.checked=true;
  tinh();
}
tabs.forEach(function(t){ t.addEventListener('click',function(){ datMode(t.getAttribute('data-mode')); }); });
root.querySelector('[role=tablist]').addEventListener('keydown',function(e){
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return;
  var m=st.mode==='chuyen'?'thang':'chuyen'; datMode(m); root.querySelector('[data-mode="'+m+'"]').focus();
});

/* giá trị tiền */
function docSo(){ return parseInt((elGt.value||'').replace(/\D/g,''),10)||0; }
function bangChu(n){
  if(!n) return '';
  if(n>=1e9) return '≈ '+(n/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ đồng';
  if(n>=1e6) return '≈ '+(n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu đồng';
  return '';
}
elGt.addEventListener('input',function(){
  var pos=elGt.value.length-elGt.selectionStart;
  var n=docSo(); if(n>999999999999999) n=999999999999999;
  elGt.value = n ? n.toLocaleString('vi-VN') : '';
  try{ var p=Math.max(0,elGt.value.length-pos); elGt.setSelectionRange(p,p); }catch(e){}
  root.querySelectorAll('.vc-quick button').forEach(function(b){ b.classList.toggle('on', +b.getAttribute('data-v')===n); });
  tinh();
});
root.querySelectorAll('.vc-quick button').forEach(function(b){
  b.addEventListener('click',function(){ elGt.value=(+b.getAttribute('data-v')).toLocaleString('vi-VN'); elGt.dispatchEvent(new Event('input')); });
});
[elHang,elPt,elSo].forEach(function(el){ el.addEventListener('change',tinh); });
elSo.addEventListener('input',tinh);
root.querySelectorAll('.vc-checks input').forEach(function(c){ c.addEventListener('change',tinh); });

/* tính phí */
function phi1(v,rate){
  var truoc=v*rate/100, tong=Math.round(truoc*(1+VAT)/1000)*1000;
  return {truoc:truoc, tong:Math.max(tong,MIN), min:tong<MIN};
}
var gaTimer;
function heSo(){ return HE_SO[st.mode]; }
function tinh(){
  var v=docSo(); st.v=v;
  $('vc-gt-chu').textContent=bangChu(v);
  var pt=PT[elPt.value], hk=elHang.value, h=HANG[hk]||null;
  var pp=[].slice.call(root.querySelectorAll('[data-pp]:checked')).map(function(c){return c.value});
  var tuCho=$('vc-tucho').checked, matCap=$('vc-matcap').checked;
  var thang=st.mode==='thang', so=Math.max(1,Math.min(999,parseInt(elSo.value,10)||1));
  var num=$('vc-res-num'), f=$('vc-res-formula'), br=$('vc-res-break'), notes=[];

  /* ghi chú chung */
  if(h&&h.canhBao) notes.push(['warn',h.canhBao]);
  if(h&&h.luu) notes.push(['info',h.luu]);
  if(matCap) notes.push(['warn','Rủi ro mất cắp, thiếu hụt chưa tính trong phí ước tính; chuyên viên báo phí riêng sau khi xem cách đóng gói và phương tiện.']);

  if(h&&h.lienHe){
    num.className='vc-res-num'; num.innerHTML='Cần tư vấn';
    f.textContent=h.ten+' được chào phí riêng theo điều kiện vận chuyển và bảo quản.';
    br.hidden=true;
    ketQua='Cần tư vấn (nhóm hàng đặc biệt)';
  } else if(!v){
    num.className='vc-res-num is-empty'; num.textContent='—';
    f.textContent='Ví dụ: lô hàng 2 tỷ đồng đi '+pt.ten.toLowerCase()+' ≈ '+vnd(phi1(2e9,(Math.max(pt.r,(h&&h.r)||0))*heSo()).tong)+' (gồm VAT)';
    br.hidden=true; ketQua='';
  } else {
    var goc=Math.max(pt.r,(h&&h.r)||0);
    var gocTC=goc*(tuCho?1+TU_CHO:1);
    var rate=(gocTC+pp.length*PHU_PHI)*heSo();
    var p=phi1(v,rate);
    var rows=[
      ['Phí cơ bản ('+pt.ten.toLowerCase()+(h&&h.r?', siêu trường':'')+')', v*goc*heSo()/100],
    ];
    if(tuCho) rows.push(['Chủ hàng tự vận chuyển (+10%)', v*goc*TU_CHO*heSo()/100]);
    pp.forEach(function(k){ rows.push(['Mở rộng: '+PP_TEN[k], v*PHU_PHI*heSo()/100]); });
    var html=rows.map(function(r){ return '<dt>'+r[0]+'</dt><dd>'+vnd(r[1])+'</dd>'; }).join('');
    if(p.min){
      html+='<dt>Áp dụng phí tối thiểu</dt><dd>'+vnd(MIN)+'</dd>';
      notes.unshift(['info','Lô hàng nhỏ được tính theo mức phí tối thiểu 260.000đ cho một giấy chứng nhận.']);
    } else html+='<dt>VAT 10%</dt><dd>'+vnd(p.tong-Math.round(p.truoc))+'</dd>';
    if(thang){
      html+='<dt class="tot">Mỗi chuyến</dt><dd class="tot">'+vnd(p.tong)+'</dd>';
      html+='<dt>'+so+' chuyến / tháng</dt><dd>'+vnd(p.tong*so)+'</dd>';
      html+='<dt>Ước tính 12 tháng</dt><dd>'+vnd(p.tong*so*12)+'</dd>';
      num.className='vc-res-num'; num.innerHTML=vnd(p.tong*so)+' <small>/ tháng</small>';
      f.textContent=so+' chuyến/tháng · '+vnd(p.tong)+'/chuyến (gồm VAT)';
      notes.push(['ok','Doanh nghiệp nhiều chuyến có thể khai báo theo kỳ và thanh toán theo bảng kê; chuyên viên sẽ tư vấn phương án phù hợp.']);
    } else {
      html+='<dt class="tot">Tổng phí (gồm VAT)</dt><dd class="tot">'+vnd(p.tong)+'</dd>';
      num.className='vc-res-num'; num.innerHTML=vnd(p.tong);
      f.textContent='Đã gồm VAT';
    }
    if(v>=50e9) notes.push(['warn','Lô hàng giá trị lớn: chuyên viên cần xác nhận phương tiện và lộ trình trước khi cấp đơn.']);
    br.innerHTML=html; br.hidden=false;
    ketQua=thang ? vnd(p.tong)+'/chuyến, '+vnd(p.tong*so)+'/tháng ('+so+' chuyến)' : vnd(p.tong)+'/chuyến (gồm VAT)';
    clearTimeout(gaTimer); gaTimer=setTimeout(function(){ ga('hh_vcnd_xem_phi',{phuong_thuc:elPt.value, hinh_thuc:st.mode, nhom_hang:hk||'chua-chon'}); },1500);
  }
  if(!notes.length) notes.push(['ok','Bảo hiểm cần có hiệu lực trước khi hàng bắt đầu vận chuyển. Gửi yêu cầu sớm để kịp lịch xếp hàng.']);
  $('vc-res-notes').innerHTML=notes.map(function(n){ return '<li class="'+n[0]+'">'+(n[0]==='ok'?ICON_OK:ICON_I)+'<span>'+n[1]+'</span></li>'; }).join('');

  /* tóm tắt chuyển sang form tư vấn */
  var parts=[];
  parts.push(thang?'Vận chuyển thường xuyên ('+so+' chuyến/tháng)':'Một chuyến hàng');
  if(h) parts.push('Hàng: '+h.ten);
  parts.push('Phương thức: '+pt.ten);
  if(v) parts.push((thang?'Giá trị TB/chuyến: ':'Giá trị: ')+v.toLocaleString('vi-VN')+'đ');
  var mr=pp.map(function(k){return PP_TEN[k]}); if(tuCho) mr.push('Chủ hàng tự vận chuyển'); if(matCap) mr.push('Mất cắp (cần tư vấn)');
  if(mr.length) parts.push('Mở rộng: '+mr.join(', '));
  if(ketQua) parts.push('Phí ước tính: '+ketQua);
  tomTat=parts.join(' | ');
  var ta=$('vc-tomtat'); if(ta && !ta.dataset.sua) ta.value=(v||h)?tomTat:'';
}

/* thẻ phương thức + nút "Tính phí theo tháng" */
function denCongCu(){ root.scrollIntoView({behavior:'smooth',block:'start'}); setTimeout(function(){ elGt.focus({preventScroll:true}); },500); }
document.querySelectorAll('.vc-mode').forEach(function(card){
  card.addEventListener('click',function(){
    var b=card.querySelector('[data-pick]'); elPt.value=b.getAttribute('data-pick'); tinh(); denCongCu();
    ga('hh_vcnd_chon_phuong_thuc',{phuong_thuc:elPt.value});
  });
});
document.querySelectorAll('[data-goto]').forEach(function(b){
  b.addEventListener('click',function(){ datMode(b.getAttribute('data-goto')); denCongCu(); });
});
$('vc-tomtat').addEventListener('input',function(){ this.dataset.sua='1'; });

/* gửi lead */
var xemTruoc=['localhost','127.0.0.1',''].indexOf(location.hostname)>-1;
function chuanSo(s){ return (s||'').replace(/[\s().\-]/g,'').replace(/^\+?84/,'0'); }
function gui(data){
  var body=new URLSearchParams(data).toString();
  if(xemTruoc){ window.__vcPayload=body; if(window.console) console.info('[van-chuyen] Bản xem trước, chưa gửi:',body); return Promise.resolve({ok:true}); }
  return fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});
}
function coBan(){
  return {'form-name':'dbv-tuvan','san-pham':'Bảo Hiểm Vận Chuyển Nội Địa','muc-quan-tam':PT[elPt.value].ten,
    'hang-hoa':(HANG[elHang.value]||{}).ten||'','ket-qua-tinh-phi':ketQua,'trang':location.href,'dong-y-chinh-sach':'Có','thoi-diem-dong-y':new Date().toISOString()};
}
var tbXT=xemTruoc?'<br><small>(Bản xem trước trên máy: thông tin chưa được gửi thật.)</small>':'';

/* (1) số điện thoại trong khung kết quả */
var fc=$('vc-lead-calc'), tc=$('vc-calc-tel'), ec=$('vc-calc-err'), bc=$('vc-calc-send'), busyC=false;
tc.addEventListener('input',function(){ ec.hidden=true; tc.classList.remove('is-bad'); });
fc.addEventListener('submit',function(e){
  e.preventDefault(); if(busyC||fc.elements['bot-field'].value) return;
  var so=chuanSo(tc.value);
  if(!/^0[35789]\d{8}$/.test(so)){ ec.textContent='Số điện thoại chưa đúng. Ví dụ: 0912 345 678'; ec.hidden=false; tc.focus(); return; }
  busyC=true; bc.disabled=true; var txt=bc.innerHTML; bc.textContent='Đang gửi…';
  var d=coBan(); d['dien-thoai']=so; d['nhu-cau']=st.mode==='thang'?'Vận chuyển thường xuyên':'Một chuyến hàng';
  d['ghi-chu']=tomTat||'Chưa nhập thông tin chuyến hàng'; d['nguon']='Máy tính phí – Vận chuyển nội địa';
  gui(d).then(function(r){
    if(!r.ok) throw new Error(r.status);
    $('vc-lead-wrap').hidden=true; var ok=$('vc-calc-ok');
    ok.innerHTML='<b>Đã nhận số '+esc(so)+'.</b><br>Chuyên viên DBV sẽ gọi lại trong giờ làm việc để xác nhận chuyến hàng và gửi báo giá chính thức. Cần gấp, gọi 0869 656 561.'+tbXT;
    ok.hidden=false; ok.focus({preventScroll:true});
  }).catch(function(){
    ec.textContent='Chưa gửi được. Vui lòng thử lại hoặc gọi 0869 656 561.'; ec.hidden=false;
    busyC=false; bc.disabled=false; bc.innerHTML=txt;
  });
});

/* (2) form tư vấn cuối trang */
var fl=$('vc-lead'), el=$('vc-lead-err'), bl=$('vc-lead-send'), busyL=false;
fl.addEventListener('input',function(e){ e.target.classList.remove('is-bad'); el.hidden=true; });
fl.addEventListener('submit',function(e){
  e.preventDefault(); if(busyL||fl.elements['bot-field'].value) return;
  var ten=$('vc-ten'), tel=$('vc-tel'), ta=$('vc-tomtat'), dy=$('vc-dongy'), loi='', dau=null;
  var so=chuanSo(tel.value);
  if(!ten.value.trim()){ loi='Vui lòng nhập họ và tên.'; dau=ten; }
  else if(!/^0[35789]\d{8}$/.test(so)){ loi='Số điện thoại chưa đúng. Ví dụ: 0912 345 678'; dau=tel; }
  else if(!ta.value.trim()){ loi='Vui lòng tóm tắt chuyến hàng (loại hàng, tuyến, giá trị…).'; dau=ta; }
  else if(!dy.checked){ loi='Vui lòng đồng ý để DBV liên hệ tư vấn.'; dau=dy; }
  if(loi){ el.textContent=loi; el.hidden=false; if(dau!==dy) dau.classList.add('is-bad'); dau.focus(); return; }
  busyL=true; bl.disabled=true; var txt=bl.innerHTML; bl.textContent='Đang gửi…';
  var d=coBan(); d['ho-ten']=ten.value.trim(); d['dien-thoai']=so; d['ten-cong-ty']=$('vc-cty').value.trim();
  d['nhu-cau']=(fl.querySelector('input[name="nhu-cau"]:checked')||{}).value||''; d['ghi-chu']=ta.value.trim();
  d['nguon']='Form tư vấn – Vận chuyển nội địa';
  if(!ta.dataset.sua && !ketQua) d['ket-qua-tinh-phi']='';
  gui(d).then(function(r){
    if(!r.ok) throw new Error(r.status);
    fl.hidden=true; var ok=$('vc-lead-ok');
    ok.innerHTML='<b>Cảm ơn '+esc(ten.value.trim())+'!</b><br>DBV đã nhận yêu cầu và sẽ gọi lại số '+esc(so)+' trong giờ làm việc. Cần gấp, gọi 0869 656 561.'+tbXT;
    ok.hidden=false; ok.focus({preventScroll:true});
  }).catch(function(){
    el.textContent='Chưa gửi được. Vui lòng thử lại hoặc gọi 0869 656 561.'; el.hidden=false;
    busyL=false; bl.disabled=false; bl.innerHTML=txt;
  });
});

datMode('chuyen');
})();
