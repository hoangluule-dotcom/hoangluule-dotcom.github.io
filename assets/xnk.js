/* DBV247 cargo page: điều hướng ICC/FAQ, thanh CTA mobile, form liên hệ (#contact). Phí ước tính nằm ở assets/xnk-calc.js. */
(()=>{'use strict';const root=document.querySelector('.cargo');if(!root)return;const $=id=>document.getElementById(id);
/* 05/10/2026: bỏ khối #lo-hang. Thông tin lô hàng gửi kèm form liên hệ giờ lấy từ công cụ tính phí
   (#tinh-phi, assets/xnk-calc.js qua window.dbvXnkTinhPhi) + lựa chọn ICC / tần suất bấm trên trang. */
let busy=false,iccChon='',tanSuat='Từng lô hàng';
function tuCongCu(){return (typeof window.dbvXnkTinhPhi==='function'&&window.dbvXnkTinhPhi())||{quanTam:'',tomTat:''};}
function summary(){const c=tuCongCu();return [
 'Lô hàng (công cụ tính phí): '+(c.tomTat||'Chưa dùng công cụ tính phí'),
 'Điều kiện bảo hiểm: '+(iccChon||'Cần tư vấn'),
 'Tần suất: '+tanSuat
 ].join('\n');}
function update(){const r=$('cargo-lead-recap');if(r)r.textContent=summary();}
document.addEventListener('xnk-tinh-phi',update);
function openAncestors(el){let p=el.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}}
function go(id){const el=$(id);if(!el)return;openAncestors(el);if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const focus=el.tagName==='DETAILS'?el.querySelector('summary'):null;if(focus)focus.focus({preventScroll:true});}
root.querySelectorAll('[data-open]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.dataset.open);}));
root.querySelectorAll('[data-pick-icc]').forEach(b=>b.addEventListener('click',()=>{iccChon=b.dataset.pickIcc;update();go('contact');}));
root.querySelectorAll('[data-frequency]').forEach(b=>b.addEventListener('click',()=>{tanSuat=b.dataset.frequency;update();go('contact');}));
function revealHash(){if(/^#icc-[abc]$/.test(location.hash))go(location.hash.slice(1));}
window.addEventListener('hashchange',revealHash);revealHash();
const sticky=document.querySelector('.cargo-sticky');if(sticky&&$('contact')&&'IntersectionObserver'in window)new IntersectionObserver(e=>sticky.classList.toggle('is-hidden',e[0].isIntersecting),{threshold:0}).observe($('contact'));
const form=$('cargo-lead'),phone=form.elements['dien-thoai'],status=$('cargo-form-status'),button=form.querySelector('[type=submit]');phone.addEventListener('input',()=>phone.setCustomValidity(''));
form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const normalized=phone.value.replace(/[\s().-]/g,'').replace(/^\+?84/,'0');
 if(!/^0[35789]\d{8}$/.test(normalized)){phone.setCustomValidity('Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.');phone.reportValidity();return;}
 if(!form.reportValidity()||form.elements['bot-field'].value)return;
 busy=true;button.disabled=true;status.dataset.error='false';status.textContent='Đang gửi yêu cầu…';
 const data=new FormData(form);data.set('dien-thoai',normalized);data.set('loai-hinh',tuCongCu().quanTam);data.set('muc-quan-tam',iccChon||'Tư vấn điều kiện bảo hiểm');data.set('ghi-chu',summary());data.set('trang',location.href);data.set('dong-y-chinh-sach','Có');data.set('thoi-diem-dong-y',new Date().toISOString());
 const params=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid'].forEach(k=>{if(params.has(k))data.set(k,params.get(k));});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{if(['localhost','127.0.0.1',''].includes(location.hostname))throw new Error('preview');const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString(),signal:controller.signal});if(!response.ok)throw new Error('server');status.textContent='Đã gửi yêu cầu. Chuyên viên DBV247 sẽ liên hệ tư vấn cho bạn.';button.textContent='Đã gửi yêu cầu';}
 catch(error){status.dataset.error='true';status.textContent=error.message==='preview'?'Đây là bản xem trước: thông tin chưa được gửi.':'Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi 0869 656 561.';button.disabled=false;busy=false;}
 finally{clearTimeout(timeout);}
});update();})();
