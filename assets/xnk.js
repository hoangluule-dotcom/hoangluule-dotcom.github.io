/* DBV247 cargo planner: collect context, never synthesize an insurance quote. */
(()=>{'use strict';const root=document.querySelector('.cargo');if(!root)return;const $=id=>document.getElementById(id);
let direction='import',busy=false;const routes={import:{origin:'',destination:'Việt Nam'},export:{origin:'Việt Nam',destination:''}};
function currentDirection(){return root.querySelector('[name="cargo-direction"]:checked').value;}
function selected(id){return $(id).value.trim();}
function summary(){return [
 'Hướng vận chuyển: '+(currentDirection()==='import'?'Nhập khẩu':'Xuất khẩu'),
 'Loại hàng: '+(selected('cargo-goods')||'Chưa chọn'),
 'Phương thức: '+(selected('cargo-mode')||'Chưa chọn'),
 'Nơi đi: '+(selected('cargo-origin')||'Chưa nhập'),
 'Nơi đến: '+(selected('cargo-destination')||'Chưa nhập'),
 'Giá trị hàng hóa khai báo: '+(selected('cargo-value')?selected('cargo-value')+' '+selected('cargo-currency'):'Chưa nhập'),
 'Khởi hành: '+(selected('cargo-date')||'Chưa xác định'),
 'Điều kiện giao hàng: '+(selected('cargo-incoterms')||'Chưa xác định'),
 'Điều kiện bảo hiểm: '+(selected('cargo-icc')||'Cần tư vấn'),
 'Tần suất: '+root.querySelector('[name="cargo-frequency"]:checked').value,
 'Yêu cầu bổ sung: '+(selected('cargo-request')||'Chưa nhập')
 ].join('\n');}
function update(){
 $('cargo-route-summary').textContent=(selected('cargo-origin')||'Nơi đi')+' → '+(selected('cargo-destination')||'Nơi đến');
 $('cargo-goods-summary').textContent=selected('cargo-goods')||'Chưa chọn loại hàng hóa';$('cargo-mode-summary').textContent=selected('cargo-mode')||'Chưa chọn phương thức';
 $('cargo-value-summary').hidden=!selected('cargo-value');$('cargo-value-summary').textContent='Giá trị hàng: '+selected('cargo-value')+' '+selected('cargo-currency');
 $('cargo-icc-summary').hidden=!selected('cargo-icc');$('cargo-icc-summary').textContent='Quan tâm: '+selected('cargo-icc');
 $('cargo-lead-recap').textContent=summary();
 const now=new Date(),localDate=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 $('cargo-date-note').hidden=!(selected('cargo-date')&&selected('cargo-date')<localDate);
}
root.querySelectorAll('[name="cargo-direction"]').forEach(r=>r.addEventListener('change',()=>{
 routes[direction]={origin:selected('cargo-origin'),destination:selected('cargo-destination')};direction=currentDirection();$('cargo-origin').value=routes[direction].origin;$('cargo-destination').value=routes[direction].destination;update();
}));
root.querySelectorAll('#lo-hang input,#lo-hang select,#lo-hang textarea').forEach(x=>{x.addEventListener('input',update);x.addEventListener('change',update);});
function openAncestors(el){let p=el.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}}
function go(id){const el=$(id);if(!el)return;openAncestors(el);if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const focus=el.tagName==='DETAILS'?el.querySelector('summary'):null;if(focus)focus.focus({preventScroll:true});}
root.querySelectorAll('[data-open]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.dataset.open);}));
root.querySelectorAll('[data-pick-icc]').forEach(b=>b.addEventListener('click',()=>{$('cargo-icc').value=b.dataset.pickIcc;update();go('contact');}));
root.querySelectorAll('[data-frequency]').forEach(b=>b.addEventListener('click',()=>{root.querySelectorAll('[name="cargo-frequency"]').forEach(r=>r.checked=r.value===b.dataset.frequency);update();go('lo-hang');}));
function revealHash(){if(/^#icc-[abc]$/.test(location.hash))go(location.hash.slice(1));}
window.addEventListener('hashchange',revealHash);revealHash();
const sticky=document.querySelector('.cargo-sticky');if('IntersectionObserver'in window)new IntersectionObserver(e=>sticky.classList.toggle('is-hidden',e[0].isIntersecting),{threshold:0}).observe($('contact'));
const form=$('cargo-lead'),phone=form.elements['dien-thoai'],status=$('cargo-form-status'),button=form.querySelector('[type=submit]');phone.addEventListener('input',()=>phone.setCustomValidity(''));
form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const normalized=phone.value.replace(/[\s().-]/g,'').replace(/^\+?84/,'0');
 if(!/^0[35789]\d{8}$/.test(normalized)){phone.setCustomValidity('Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.');phone.reportValidity();return;}
 if(!form.reportValidity()||form.elements['bot-field'].value)return;
 busy=true;button.disabled=true;status.dataset.error='false';status.textContent='Đang gửi yêu cầu…';
 const data=new FormData(form);data.set('dien-thoai',normalized);data.set('loai-hinh',selected('cargo-goods'));data.set('muc-quan-tam',selected('cargo-icc')||'Tư vấn điều kiện bảo hiểm');data.set('ghi-chu',summary());data.set('trang',location.href);data.set('dong-y-chinh-sach','Có');data.set('thoi-diem-dong-y',new Date().toISOString());
 const params=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid'].forEach(k=>{if(params.has(k))data.set(k,params.get(k));});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{if(['localhost','127.0.0.1',''].includes(location.hostname))throw new Error('preview');const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString(),signal:controller.signal});if(!response.ok)throw new Error('server');status.textContent='Đã gửi yêu cầu. Chuyên viên DBV247 sẽ liên hệ tư vấn cho bạn.';button.textContent='Đã gửi yêu cầu';}
 catch(error){status.dataset.error='true';status.textContent=error.message==='preview'?'Đây là bản xem trước: thông tin chưa được gửi.':'Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi 0869 656 561.';button.disabled=false;busy=false;}
 finally{clearTimeout(timeout);}
});update();})();
