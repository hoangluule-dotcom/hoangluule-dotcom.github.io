/* DBV247 — Cháy nổ bắt buộc cho toà nhà: chọn vai trò, kiểm tra ngưỡng, tính phí nhanh, gửi lead Netlify. 07/10/2026 */
(()=>{'use strict';
const root=document.querySelector('.fire-tn');if(!root)return;
const $=id=>document.getElementById(id);
const UNIT=12000000; // đ/m² — ước tính nội bộ khi khách chưa có giá trị xây dựng (không hiển thị)
const T={
 cc:{n:'Chung cư, nhà ở tập thể',muc:1,floors:5,area:1000,s:[.05,.1]},
 vp:{n:'Toà nhà văn phòng, trụ sở làm việc',muc:19,floors:3,area:500,r:.05},
 hh:{n:'Nhà đa năng, nhà hỗn hợp',muc:20,floors:3,area:500,s:[.05,.1]},
 ks:{n:'Căn hộ dịch vụ, cơ sở lưu trú',muc:17,floors:3,area:500,s:[.05,.1]}
};
const ROLE_TYPE={vp:'vp',cc:'cc',dv:'ks'};
const fmt=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Math.round(n));
const money=n=>fmt(n)+' đ';
const pct=v=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(v)+'%';
const num=id=>{const v=$(id).value.replace(/[^\d]/g,'');return v?Number(v):0;};

/* ── Vai trò ── */
function setRole(r){root.dataset.role=r;
 root.querySelectorAll('.tn-role').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===r)));
 const note=$('tn-role-note');note.hidden=!r;note.querySelectorAll('[data-for]').forEach(d=>d.hidden=d.dataset.for!==r);
 const t=ROLE_TYPE[r];if(t){if(!$('tn-type').value)$('tn-type').value=t;$('tn-lead-type').value=$('tn-type').value;}
 $('tn-lead-role').value=r||'';
 root.querySelectorAll('.tn-type').forEach(a=>a.classList.toggle('is-hl',a.dataset.forType===t));
 const faq=root.querySelector('.fire-faq');[...faq.children].filter(d=>d.dataset.for&&d.dataset.for.split(' ').includes(r)).reverse().forEach(d=>faq.prepend(d));
 onType();}
root.querySelectorAll('.tn-role').forEach(b=>b.addEventListener('click',()=>{setRole(b.dataset.role);if(window.dataLayer)dataLayer.push({event:'tn_chon_vai_tro',vai_tro:b.dataset.role});}));
$('tn-lead-role').addEventListener('change',e=>{if(ROLE_TYPE[e.target.value])setRole(e.target.value);});

/* ── Tính phí ── */
['tn-floors','tn-area','tn-bv','tn-equip','tn-other'].forEach(id=>{const el=$(id);el.addEventListener('input',()=>{const d=el.value.replace(/[^\d]/g,'');el.value=d?(id==='tn-floors'?d:fmt(Number(d))):'';update();});});
function onType(){const t=T[$('tn-type').value];$('tn-spk-wrap').hidden=!(t&&t.s);
 $('tn-type-hint').textContent=t?'Mục '+t.muc+' Phụ lục VII · bắt buộc khi cao từ '+t.floors+' tầng hoặc tổng diện tích sàn từ '+fmt(t.area)+' m²':'Chọn đúng công năng ghi trong hồ sơ PCCC của toà nhà.';
 if($('tn-type').value)$('tn-lead-type').value=$('tn-type').value;update();}
$('tn-type').addEventListener('change',onType);
$('tn-lead-type').addEventListener('change',e=>{if(T[e.target.value]){$('tn-type').value=e.target.value;onType();}});
root.querySelectorAll('[name="tn-spk"]').forEach(i=>i.addEventListener('change',update));
function quote(){
 const k=$('tn-type').value,t=T[k],fl=num('tn-floors'),area=num('tn-area'),bv=num('tn-bv'),build=bv||area*UNIT,est=!bv&&build>0,equip=num('tn-equip'),other=num('tn-other'),total=build+equip+other;
 const q={k,t,fl,area,build,est,equip,other,total,elig:'none',eligTxt:'Nhập loại toà nhà, số tầng và diện tích để kiểm tra ngưỡng bắt buộc.',rateTxt:'—',title:'Nhập thông tin để xem phí',detail:'Phí dự kiến sẽ hiện ở đây.',save:''};
 if(!t){q.title='Chọn loại toà nhà';return q;}
 if(fl||area){const hit=(fl&&fl>=t.floors)||(area&&area>=t.area);
  if(hit){q.elig='yes';q.eligTxt='Toà nhà đạt ngưỡng mục '+t.muc+' ('+(fl>=t.floors&&fl?fl+' tầng':'')+(fl>=t.floors&&fl&&area>=t.area?', ':'')+(area>=t.area?fmt(area)+' m² sàn':'')+') — có thể thuộc diện phải mua bảo hiểm cháy nổ bắt buộc.';}
  else if(fl&&area){q.elig='no';q.eligTxt='Chưa đạt ngưỡng mục '+t.muc+' (từ '+t.floors+' tầng hoặc '+fmt(t.area)+' m² sàn). Toà nhà vẫn có thể mua bảo hiểm cháy nổ tự nguyện.';}
  else{q.elig='part';q.eligTxt='Nhập thêm '+(fl?'diện tích sàn':'số tầng')+' để kiểm tra đủ hai ngưỡng của mục '+t.muc+'.';}}
 let rate,sp='';
 if(t.s){sp=root.querySelector('[name="tn-spk"]:checked').value;rate=sp==='yes'?t.s[0]:t.s[1];
  q.rateTxt=pct(rate)+'/năm'+(sp==='yes'?' (có chữa cháy tự động)':' (không có chữa cháy tự động)');}
 else{rate=t.r;q.rateTxt=pct(rate)+'/năm';}
 if(!total){q.title='Nhập diện tích sàn';q.detail='Nhập tổng diện tích sàn (hoặc giá trị xây dựng) để tính phí.';return q;}
 if(total>=1e12){q.title='Cần đánh giá riêng';q.detail='Tổng số tiền bảo hiểm từ 1.000 tỷ đồng áp dụng cơ chế thoả thuận phí riêng — chuyên viên DBV sẽ tư vấn.';return q;}
 const a=total*rate/100;
 q.title='≈ '+money(a)+' / năm';
 q.detail='Chưa gồm VAT 10% (≈ '+money(a*1.1)+' đã gồm VAT).'+(est?' Giá trị toà nhà đang được ước tính theo diện tích — nhập số liệu kế toán để kết quả sát hơn.':'');
 if(t.s&&sp!=='yes')q.save=(sp==='unknown'?'Nếu toà nhà có hệ thống chữa cháy tự động':'Nếu lắp hệ thống chữa cháy tự động')+', phí còn khoảng '+money(total*t.s[0]/100)+'/năm (giảm '+money(total*(t.s[1]-t.s[0])/100)+').';
 return q;}
function update(){const q=quote();
 $('tn-elig').textContent=q.eligTxt;$('tn-elig').dataset.state=q.elig;
 $('ts-build').textContent=q.build?money(q.build)+(q.est?' (ước tính)':''):'—';$('ts-equip').textContent=q.equip?money(q.equip):'—';$('ts-other').textContent=q.other?money(q.other):'—';$('ts-total').textContent=q.total?money(q.total):'—';
 $('tn-rate').textContent=q.rateTxt;$('fire-estimate').textContent=q.title;$('tn-detail').textContent=q.detail;
 $('tn-save').hidden=!q.save;$('tn-save').textContent=q.save;
 if(q.fl||q.area)$('tn-lead-size').value=[q.fl?q.fl+' tầng':'',q.area?fmt(q.area)+' m²':''].filter(Boolean).join(', ');
 $('fire-lead-summary').textContent=(q.t||root.dataset.role)?'Thông tin toà nhà và phí dự kiến ở trên sẽ được gửi kèm yêu cầu.':'';}
function summary(){const q=quote(),sp=root.querySelector('[name="tn-spk"]:checked').value,roleSel=$('tn-lead-role');return [
 'Vai trò: '+(roleSel.value?roleSel.options[roleSel.selectedIndex].text:'Chưa chọn'),
 'Loại toà nhà (tính phí): '+(q.t?q.t.n+' — mục '+q.t.muc:'Chưa chọn'),
 'Số tầng: '+(q.fl||'—')+' · Diện tích sàn: '+(q.area?fmt(q.area)+' m²':'—'),
 'Ngưỡng bắt buộc: '+q.eligTxt,
 'Giá trị xây dựng: '+(q.build?money(q.build)+(q.est?' (ước tính theo diện tích)':' (khách cung cấp)'):'—')+' · Hệ thống kỹ thuật: '+(q.equip?money(q.equip):'—')+' · Tài sản khác: '+(q.other?money(q.other):'—'),
 'Tổng số tiền bảo hiểm: '+(q.total?money(q.total):'—'),
 'Chữa cháy tự động: '+({yes:'Có',no:'Không',unknown:'Chưa rõ'}[sp]),
 'Tỷ lệ phí: '+q.rateTxt,'Phí dự kiến: '+q.title+' — '+q.detail+(q.save?' '+q.save:'')].join('\n');}

/* ── Gửi lead (Netlify Forms, form dbv-tuvan) ── */
let busy=false;
const form=$('fire-lead'),phone=form.elements['dien-thoai'],status=$('fire-form-status'),submit=form.querySelector('[type=submit]');
phone.addEventListener('input',()=>phone.setCustomValidity(''));
form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;
 let p=phone.value.replace(/[\s().-]/g,'');p=p.replace(/^\+?84/,'0');
 if(!/^0[35789]\d{8}$/.test(p)){phone.setCustomValidity('Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.');phone.reportValidity();return;}
 if(!form.reportValidity())return;if(form.elements['bot-field'].value)return;
 busy=true;submit.disabled=true;status.dataset.error='false';status.textContent='Đang gửi yêu cầu…';
 const data=new FormData(form);data.delete('consent');data.set('dien-thoai',p);
 ['loai-hinh-kd','loai-hinh'].forEach(n=>{const s=form.elements[n];data.set(n,s.value?s.selectedOptions[0].text:'');});
 data.set('ghi-chu',summary());data.set('trang',location.href);data.set('nguon','Trang cháy nổ toà nhà');data.set('dong-y-chinh-sach','Có');data.set('thoi-diem-dong-y',new Date().toISOString());
 const params=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid'].forEach(k=>{if(params.has(k))data.set(k,params.get(k));});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{if(['localhost','127.0.0.1',''].includes(location.hostname))throw new Error('preview');const r=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString(),signal:controller.signal});if(!r.ok)throw new Error('server');status.textContent='Đã gửi yêu cầu. Chuyên viên DBV247 sẽ liên hệ tư vấn cho toà nhà của bạn.';submit.textContent='Đã gửi yêu cầu';}
 catch(err){status.dataset.error='true';status.textContent=err.message==='preview'?'Đây là bản xem trước: thông tin chưa được gửi.':'Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi 0869 656 561.';submit.disabled=false;busy=false;}
 finally{clearTimeout(timeout);}
});
const sticky=document.querySelector('.fire-sticky');if(sticky&&'IntersectionObserver'in window)new IntersectionObserver(en=>sticky.classList.toggle('is-hidden',en[0].isIntersecting),{threshold:0}).observe($('contact'));
const qr=new URLSearchParams(location.search).get('vai-tro');if(qr&&ROLE_TYPE[qr])setRole(qr);
update();
})();
