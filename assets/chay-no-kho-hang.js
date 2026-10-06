/* DBV247 — Cháy nổ bắt buộc cho kho hàng: vai trò, kiểm tra diện, tính phí theo hàng tồn cao điểm, gửi lead. 06/10/2026 */
(()=>{'use strict';
const root=document.querySelector('.fire-kv');if(!root)return;
const $=id=>document.getElementById(id);
const UNIT=15000000;
const LOAI={abc:{n:'Kho hàng cháy được (hạng A, B, C)',muc:28,min:200,r:[.2,.5]},de:{n:'Kho hàng khó cháy, không cháy (hạng D, E)',muc:30,min:1000,vol:5000,r:null},kd:{n:'Kinh doanh hàng hoá dễ cháy',muc:13,min:200,r:[.08,.08]},unk:{n:'Chưa biết hạng',r:null}};
const ROLE={own:'Chủ kho tự vận hành',lease:'Chủ kho cho thuê',tenant:'Doanh nghiệp thuê kho, gửi hàng'};
const fmt=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Math.round(n));
const money=n=>fmt(n)+' đ';const pct=v=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(v)+'%';
const num=id=>{const v=$(id).value.replace(/[^\d]/g,'');return v?Number(v):0;};
['kv-area','kv-vol','kv-equip','kv-peak','kv-avg'].forEach(id=>{const el=$(id);el.addEventListener('input',()=>{const d=el.value.replace(/[^\d]/g,'');el.value=d?fmt(Number(d)):'';update();});});
function setRole(r){root.dataset.role=r||'';
 root.querySelectorAll('.tn-role').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===r)));
 const note=$('tn-role-note');note.hidden=!r;note.querySelectorAll('[data-for]').forEach(d=>d.hidden=d.dataset.for!==r);
 $('kv-role').value=r||'';$('tn-lead-role').value=r||'';
 const faq=root.querySelector('.fire-faq');[...faq.children].filter(d=>d.dataset.for&&d.dataset.for.split(' ').includes(r)).reverse().forEach(d=>faq.prepend(d));
 update();}
root.querySelectorAll('.tn-role').forEach(b=>b.addEventListener('click',()=>{setRole(b.dataset.role);if(window.dataLayer)dataLayer.push({event:'kv_chon_vai_tro',vai_tro:b.dataset.role});}));
$('kv-role').addEventListener('change',e=>setRole(e.target.value));
$('tn-lead-role').addEventListener('change',e=>setRole(e.target.value));
function onLoai(v){$('kv-loai').value=v;$('lead-loai').value=v;$('kv-vol-wrap').hidden=v!=='de';root.querySelectorAll('.tn-type').forEach(a=>a.classList.toggle('is-hl',a.dataset.forType===v));update();}
$('kv-loai').addEventListener('change',e=>onLoai(e.target.value));
$('lead-loai').addEventListener('change',e=>onLoai(e.target.value));
function quote(){
 const role=$('kv-role').value,l=$('kv-loai').value,L=LOAI[l],area=num('kv-area'),vol=num('kv-vol'),tenant=role==='tenant';
 const build=tenant?0:area*UNIT,equip=num('kv-equip'),peak=num('kv-peak'),avg=num('kv-avg'),total=build+equip+peak;
 const q={role,l,L,area,vol,build,equip,peak,avg,total,tenant,elig:'none',eligTxt:'Chọn loại kho để kiểm tra diện bắt buộc.',rateTxt:'—',title:'Nhập thông tin để xem phí',detail:'Phí dự kiến sẽ hiện ở đây.',tip:''};
 if(L){if(l==='unk'){q.elig='part';q.eligTxt='Kho hàng cháy được (A, B, C) bắt buộc từ 200 m²; kho hàng khó cháy, không cháy (D, E) từ 1.000 m² hoặc 5.000 m³. Hạng ghi trong hồ sơ PCCC — chuyên viên có thể tra giúp.';}
  else if(!area&&!vol){q.elig='part';q.eligTxt=L.n+' (mục '+L.muc+'): bắt buộc từ '+fmt(L.min)+' m²'+(L.vol?' hoặc '+fmt(L.vol)+' m³':'')+' — nhập diện tích để kiểm tra.';}
  else if(area>=L.min||(L.vol&&vol>=L.vol)){q.elig='yes';q.eligTxt='Đạt ngưỡng mục '+L.muc+' ('+(area>=L.min?fmt(area)+' m²':fmt(vol)+' m³')+') — có thể thuộc diện bắt buộc.';}
  else if(L.vol&&!vol){q.elig='part';q.eligTxt='Diện tích chưa tới '+fmt(L.min)+' m² — nhập thêm khối tích để kiểm tra ngưỡng '+fmt(L.vol)+' m³.';}
  else{q.elig='no';q.eligTxt='Chưa đạt ngưỡng mục '+L.muc+'. Kho vẫn có thể mua bảo hiểm cháy nổ tự nguyện để bảo vệ hàng hoá.';}
  if(tenant&&q.elig==='yes')q.eligTxt+=' Nghĩa vụ mua thuộc cơ sở kho; phần hàng hoá của bạn cần thống nhất với chủ kho.';}
 if(!l){q.title='Chọn loại kho';return q;}
 let r=L.r,general=false;
 if(!r){r=[.05,.5];general=true;q.rateTxt='Cần xác định theo hồ sơ (khung chung 0,05% – 0,5%)';}
 else q.rateTxt=r[0]===r[1]?pct(r[0])+'/năm':pct(r[0])+' – '+pct(r[1])+'/năm';
 if(!total){q.title=tenant?'Nhập giá trị hàng tồn':'Nhập diện tích kho';q.detail=tenant?'Bạn thuê kho: nhập giá trị hàng hoá lúc cao điểm để tính phí cho phần hàng của bạn.':'Nhập diện tích (và giá trị thiết bị, hàng tồn nếu có) để tính tổng số tiền bảo hiểm.';return q;}
 if(total>=1e12){q.title='Cần đánh giá riêng';q.detail='Tổng số tiền bảo hiểm từ 1.000 tỷ đồng áp dụng cơ chế thoả thuận phí riêng — chuyên viên DBV sẽ tư vấn.';return q;}
 const a=total*r[0]/100,b=total*r[1]/100;
 q.title=a===b?money(a)+' / năm':money(a)+' – '+money(b)+' / năm';
 q.detail=(general?'Khoảng tham khảo theo khung chung — tỷ lệ chính xác cần chuyên viên đối chiếu loại hàng. ':'')+'Chưa gồm VAT 10%'+(a===b?' (≈ '+money(a*1.1)+' đã gồm VAT).':' (≈ '+money(a*1.1)+' – '+money(b*1.1)+' đã gồm VAT).');
 if(avg&&peak&&avg<peak)q.tip='Nếu chỉ khai theo mức bình quân '+money(avg)+', lúc kho đầy hàng hoá chỉ được bảo hiểm khoảng '+Math.round(avg/peak*100)+'% giá trị — phí trên đã tính theo mức cao điểm.';
 else if(!peak&&role!=='lease')q.tip='Bạn chưa nhập hàng tồn cao điểm. Thiếu nhóm này, khi tổn thất có thể chỉ được bồi thường theo tỷ lệ.';
 else if(role==='lease'&&peak)q.tip='Bạn cho thuê kho: hãy kiểm tra hàng hoá đã nhập có phải của bạn hay của khách thuê để tránh trùng lặp.';
 return q;}
function update(){const q=quote(),lease=q.role==='lease';
 $('kv-build').textContent=q.tenant?'Bạn thuê kho: công trình nhà kho thường do chủ kho bảo hiểm, không tính ở đây.':(q.area?fmt(q.area)+' m² × 15.000.000 đ = '+money(q.build):'Giá trị nhà kho ước tính = diện tích × 15.000.000 đ/m²');
 $('kv-peak').placeholder=lease?'Chỉ nhập nếu hàng là của bạn':'Giá trị hàng lúc kho đầy nhất';
 $('kv-elig').textContent=q.eligTxt;$('kv-elig').dataset.state=q.elig;
 $('ks-build').textContent=q.build?money(q.build):'—';$('ks-equip').textContent=q.equip?money(q.equip):'—';$('ks-stock').textContent=q.peak?money(q.peak):'—';$('ks-total').textContent=q.total?money(q.total):'—';
 $('kv-rate').textContent=q.rateTxt;$('fire-estimate').textContent=q.title;$('kv-detail').textContent=q.detail;$('kv-tip').hidden=!q.tip;$('kv-tip').textContent=q.tip;
 $('lead-size').value=[q.area?fmt(q.area)+' m²':'',q.total?'tổng '+money(q.total):''].filter(Boolean).join(', ');
 $('fire-lead-summary').textContent=(q.L||q.total||q.role)?'Thông tin kho và phí dự kiến ở trên sẽ được gửi kèm yêu cầu.':'';}
function summary(){const q=quote();return ['Vai trò: '+(ROLE[q.role]||'Chưa chọn'),'Loại kho: '+(q.L?q.L.n:'Chưa chọn'),'Diện tích: '+(q.area?fmt(q.area)+' m²':'—')+(q.vol?' · Khối tích: '+fmt(q.vol)+' m³':''),'Diện bắt buộc: '+q.eligTxt,
 'Nhà kho: '+(q.build?money(q.build):'—')+' · Thiết bị: '+(q.equip?money(q.equip):'—')+' · Hàng cao điểm: '+(q.peak?money(q.peak):'—')+(q.avg?' · Hàng bình quân: '+money(q.avg):''),'Tổng số tiền bảo hiểm: '+(q.total?money(q.total):'—'),'Tỷ lệ phí: '+q.rateTxt,'Phí dự kiến: '+q.title+' — '+q.detail].join('\n');}
/* ── Gửi lead (Netlify Forms, form dbv-tuvan) ── */
function dbvLead(summary,nguon,okMsg){
 const form=$('fire-lead');if(!form)return;let busy=false;
 const phone=form.elements['dien-thoai'],status=$('fire-form-status'),submit=form.querySelector('[type=submit]');
 phone.addEventListener('input',()=>phone.setCustomValidity(''));
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;
  let p=phone.value.replace(/[\s().-]/g,'');p=p.replace(/^\+?84/,'0');
  if(!/^0[35789]\d{8}$/.test(p)){phone.setCustomValidity('Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.');phone.reportValidity();return;}
  if(!form.reportValidity())return;if(form.elements['bot-field'].value)return;
  busy=true;submit.disabled=true;status.dataset.error='false';status.textContent='Đang gửi yêu cầu…';
  const data=new FormData(form);data.delete('consent');data.set('dien-thoai',p);
  form.querySelectorAll('select[name]').forEach(s=>data.set(s.name,s.value?s.selectedOptions[0].text:''));
  data.set('ghi-chu',summary());data.set('trang',location.href);data.set('nguon',nguon);data.set('dong-y-chinh-sach','Có');data.set('thoi-diem-dong-y',new Date().toISOString());
  const params=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid'].forEach(k=>{if(params.has(k))data.set(k,params.get(k));});
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{if(['localhost','127.0.0.1',''].includes(location.hostname))throw new Error('preview');const r=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString(),signal:controller.signal});if(!r.ok)throw new Error('server');status.textContent=okMsg;submit.textContent='Đã gửi yêu cầu';}
  catch(err){status.dataset.error='true';status.textContent=err.message==='preview'?'Đây là bản xem trước: thông tin chưa được gửi.':'Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi 0869 656 561.';submit.disabled=false;busy=false;}
  finally{clearTimeout(timeout);}
 });
 const sticky=document.querySelector('.fire-sticky');if(sticky&&'IntersectionObserver'in window)new IntersectionObserver(en=>sticky.classList.toggle('is-hidden',en[0].isIntersecting),{threshold:0}).observe($('contact'));
}
dbvLead(summary,'Trang cháy nổ kho hàng','Đã gửi yêu cầu. Chuyên viên DBV247 sẽ liên hệ để đánh giá kho và gửi phương án.');
update();
})();
