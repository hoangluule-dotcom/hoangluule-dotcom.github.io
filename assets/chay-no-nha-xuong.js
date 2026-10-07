/* DBV247 — Cháy nổ bắt buộc cho nhà xưởng: kiểm tra diện theo hạng nguy hiểm, tính phí nhanh, gửi lead. 07/10/2026 — tỷ lệ phí theo Phụ lục VI NĐ 105/2025 (mục 35) */
(()=>{'use strict';
const root=document.querySelector('.fire-nx');if(!root)return;
const $=id=>document.getElementById(id);
const UNIT=12000000; // đ/m² — ước tính nội bộ khi khách chưa có giá trị xây dựng (không hiển thị)
const HANG={ab:{n:'Hạng A, B',muc:25,all:1},c:{n:'Hạng C',muc:26,all:1},de:{n:'Hạng D, E',muc:27,all:0},vln:{n:'Sản xuất vật liệu nổ, vũ khí',muc:24,all:1},unk:{n:'Chưa biết hạng'}};
const NGANH={k:{n:'Ngành khác (hoá chất, nhựa, sơn, in, vật liệu xây dựng…)',r:.2},dm:{n:'Dệt may',r:.25},giay:{n:'Giày dép',r:.35},gb:{n:'Giấy, bao bì, tã lót, băng vệ sinh',r:.35},go:{n:'Gỗ, mây tre, diêm, hương, vàng mã',r:.5}};
const R_DE=.15,R_VLN=.5;
const fmt=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Math.round(n));
const money=n=>fmt(n)+' đ';const pct=v=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(v)+'%';
const num=id=>{const v=$(id).value.replace(/[^\d]/g,'');return v?Number(v):0;};
['nx-area','nx-vol','nx-bv','nx-mach','nx-stock'].forEach(id=>{const el=$(id);el.addEventListener('input',()=>{const d=el.value.replace(/[^\d]/g,'');el.value=d?fmt(Number(d)):'';update();});});
['nx-hang','nx-nganh'].forEach(id=>$(id).addEventListener('change',()=>{$('nx-vol-wrap').hidden=$('nx-hang').value!=='de';
 if(id==='nx-hang'){$('lead-hang').value=$('nx-hang').value;root.querySelectorAll('.tn-type').forEach(a=>a.classList.toggle('is-hl',a.dataset.forType===$('nx-hang').value));}
 if(id==='nx-nganh'&&NGANH[$('nx-nganh').value]&&!$('lead-nganh').value)$('lead-nganh').value=NGANH[$('nx-nganh').value].n;update();}));
function quote(){
 const h=$('nx-hang').value,H=HANG[h],g=$('nx-nganh').value,G=NGANH[g],area=num('nx-area'),vol=num('nx-vol'),bv=num('nx-bv'),build=bv||area*UNIT,est=!bv&&build>0,mach=num('nx-mach'),stock=num('nx-stock'),total=build+mach+stock;
 const q={h,H,g,G,area,vol,build,est,mach,stock,total,elig:'none',eligTxt:'Chọn hạng nguy hiểm để kiểm tra diện bắt buộc.',rateTxt:'—',title:'Nhập thông tin để xem phí',detail:'Phí dự kiến sẽ hiện ở đây.',alt:'',tip:''};
 if(H){if(h==='unk'){q.elig='part';q.eligTxt='Hạng A, B, C: bắt buộc ở mọi quy mô. Hạng D, E: bắt buộc từ 1.000 m² sàn hoặc 5.000 m³. Hạng ghi trong hồ sơ thẩm duyệt PCCC — chuyên viên có thể tra giúp.';}
  else if(H.all){q.elig='yes';q.eligTxt=H.n+' (mục '+H.muc+'): thuộc diện bắt buộc ở mọi quy mô, không phụ thuộc diện tích.';}
  else if(area||vol){if(area>=1000||vol>=5000){q.elig='yes';q.eligTxt='Đạt ngưỡng mục 27 ('+(area>=1000?fmt(area)+' m² sàn':fmt(vol)+' m³')+') — có thể thuộc diện bắt buộc.';}
   else if(area&&vol){q.elig='no';q.eligTxt='Chưa đạt ngưỡng mục 27 (1.000 m² sàn hoặc 5.000 m³). Nhà xưởng vẫn có thể mua bảo hiểm cháy nổ tự nguyện.';}
   else{q.elig='part';q.eligTxt='Diện tích chưa tới 1.000 m² — nhập thêm khối tích để kiểm tra ngưỡng 5.000 m³.';}}
  else{q.elig='part';q.eligTxt='Hạng D, E bắt buộc từ 1.000 m² sàn hoặc 5.000 m³ — nhập diện tích để kiểm tra.';}}
 if(!h){q.title='Chọn hạng nguy hiểm';return q;}
 const rABC=G?G.r:.2;let rate,alt=null;
 if(h==='vln')rate=R_VLN;else if(h==='de')rate=R_DE;else{rate=rABC;if(h==='unk')alt=R_DE;}
 q.rateTxt=pct(rate)+'/năm'+(h==='de'?' (sản xuất hạng D, E)':h==='vln'?'':' ('+(G?G.n.split(' (')[0].toLowerCase():'ngành sản xuất chung')+')');
 if(!total){q.title='Nhập diện tích nhà xưởng';q.detail='Nhập diện tích (hoặc giá trị xây dựng) và giá trị máy móc, hàng hoá nếu có để tính tổng số tiền bảo hiểm.';return q;}
 if(total>=1e12){q.title='Cần đánh giá riêng';q.detail='Tổng số tiền bảo hiểm từ 1.000 tỷ đồng áp dụng cơ chế thoả thuận phí riêng — chuyên viên DBV sẽ tư vấn.';return q;}
 const a=total*rate/100;
 q.title='≈ '+money(a)+' / năm';
 q.detail='Chưa gồm VAT 10% (≈ '+money(a*1.1)+' đã gồm VAT).'+(est?' Giá trị nhà xưởng đang được ước tính theo diện tích — nhập số liệu kế toán để kết quả sát hơn.':'');
 if(alt!=null)q.alt='Nếu nhà xưởng thuộc hạng D, E, phí còn khoảng '+money(total*alt/100)+'/năm.';
 else if((h==='ab'||h==='c')&&!G)q.alt='Chọn ngành sản xuất để áp đúng tỷ lệ: dệt may 0,25%, giày dép và giấy 0,35%, gỗ 0,5%.';
 if(!stock)q.tip='Bạn chưa nhập hàng hoá, nguyên vật liệu. Thiếu nhóm này, khi tổn thất có thể chỉ được bồi thường theo tỷ lệ.';
 else if(!mach)q.tip='Bạn chưa nhập máy móc, thiết bị — hãy kê theo giá trị mua mới tương đương.';
 return q;}
function update(){const q=quote();
 $('nx-elig').textContent=q.eligTxt;$('nx-elig').dataset.state=q.elig;
 $('ns-build').textContent=q.build?money(q.build)+(q.est?' (ước tính)':''):'—';$('ns-mach').textContent=q.mach?money(q.mach):'—';$('ns-stock').textContent=q.stock?money(q.stock):'—';$('ns-total').textContent=q.total?money(q.total):'—';
 $('nx-rate').textContent=q.rateTxt;$('fire-estimate').textContent=q.title;$('nx-detail').textContent=q.detail;$('nx-alt').hidden=!q.alt;$('nx-alt').textContent=q.alt;$('nx-nganh-wrap').hidden=q.h==='de'||q.h==='vln';$('nx-tip').hidden=!q.tip;$('nx-tip').textContent=q.tip;
 if(q.area||q.total)$('lead-size').value=[q.area?fmt(q.area)+' m²':'',q.total?'tổng '+money(q.total):''].filter(Boolean).join(', ');
 $('fire-lead-summary').textContent=(q.H||q.total)?'Thông tin nhà xưởng và phí dự kiến ở trên sẽ được gửi kèm yêu cầu.':'';}
function summary(){const q=quote();return ['Hạng nguy hiểm: '+(q.H?q.H.n:'Chưa chọn'),'Ngành (tính phí): '+(q.G?q.G.n:'Chưa chọn'),'Diện tích: '+(q.area?fmt(q.area)+' m²':'—')+(q.vol?' · Khối tích: '+fmt(q.vol)+' m³':''),'Diện bắt buộc: '+q.eligTxt,
 'Nhà xưởng: '+(q.build?money(q.build)+(q.est?' (ước tính theo diện tích)':' (khách cung cấp)'):'—')+' · Máy móc: '+(q.mach?money(q.mach):'—')+' · Hàng hoá: '+(q.stock?money(q.stock):'—'),'Tổng số tiền bảo hiểm: '+(q.total?money(q.total):'—'),'Tỷ lệ phí: '+q.rateTxt,'Phí dự kiến: '+q.title+' — '+q.detail+(q.alt?' '+q.alt:'')].join('\n');}
$('lead-hang').addEventListener('change',e=>{if(HANG[e.target.value]){$('nx-hang').value=e.target.value;$('nx-hang').dispatchEvent(new Event('change'));}});
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
dbvLead(summary,'Trang cháy nổ nhà xưởng','Đã gửi yêu cầu. Chuyên viên DBV247 sẽ liên hệ hẹn lịch khảo sát nhà xưởng.');
update();
})();
