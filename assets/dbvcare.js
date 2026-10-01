(()=>{'use strict';
 const root=document.querySelector('.care');if(!root)return;
 const hero=root.querySelector('.care-hero'),heroText=root.querySelector('.care-hero-text'),heroActions=heroText.querySelector('.care-actions');
 const mobileHero=matchMedia('(max-width:700px)');
 function placeHeroActions(){(mobileHero.matches?hero:heroText).appendChild(heroActions);}
 placeHeroActions();mobileHero.addEventListener('change',placeHeroActions);
 const sizes={under10:'Dưới 10 người','10-49':'10–49 người','50-99':'50–99 người', '100plus':'Từ 100 người'};
 let size='50-99';
 const summary=()=>`${sizes[size]} · Nội trú & phẫu thuật\n${[...root.querySelectorAll('[name="care-needs"]:checked')].map(x=>x.value).join(', ')||'Chưa chọn quyền lợi bổ sung'}\nNgân sách: ${root.querySelector('#care-budget').value.trim()||'Chưa xác định'}`;
 function sync(){root.querySelectorAll('[data-summary]').forEach(x=>x.textContent=summary());root.querySelectorAll('.care-group-select').forEach(x=>x.value=size);root.querySelectorAll('[name="care-size"]').forEach(x=>x.checked=x.value===size);root.querySelector('#care-small-group').hidden=size!=='under10';}
 root.addEventListener('change',e=>{if(e.target.matches('[name="care-size"],.care-group-select'))size=e.target.value;sync();});root.querySelector('#care-budget').addEventListener('input',sync);sync();
 root.querySelectorAll('[data-wait]').forEach(btn=>btn.addEventListener('click',()=>{root.querySelectorAll('[data-wait]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));root.querySelectorAll('.care-wait-row strong').forEach(x=>x.textContent=x.dataset[btn.dataset.wait]);}));
 const wide=matchMedia('(min-width:901px)');function processLayout(){root.querySelectorAll('.care-process details').forEach((d,i)=>d.open=wide.matches||i===0);}processLayout();wide.addEventListener('change',processLayout);
 const sticky=document.querySelector('#care-sticky');if('IntersectionObserver'in window)new IntersectionObserver(entries=>{sticky.classList.toggle('is-hidden',entries[0].isIntersecting);},{threshold:0}).observe(root.querySelector('#dang-ky'));
 root.querySelectorAll('.care-form').forEach(form=>{
  const phone=form.elements['dien-thoai'];phone.addEventListener('input',()=>phone.setCustomValidity(''));
  form.addEventListener('submit',async e=>{e.preventDefault();const normalized=phone.value.replace(/[\s().-]/g,'');if(!/^(?:0|\+84)[0-9]{9,10}$/.test(normalized)){phone.setCustomValidity('Vui lòng nhập số điện thoại hợp lệ.');phone.reportValidity();return;}if(!form.reportValidity())return;
   const status=form.querySelector('.care-form-status'),button=form.querySelector('[type=submit]');button.disabled=true;status.dataset.error='false';status.textContent='Đang gửi yêu cầu…';
   const data=new FormData(form);data.set('dien-thoai',normalized);data.set('so-nguoi',sizes[size]);data.set('ghi-chu',summary());data.set('trang',location.href);data.set('dong-y-chinh-sach','Có');data.set('thoi-diem-dong-y',new Date().toISOString());const params=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid'].forEach(k=>{if(params.has(k))data.set(k,params.get(k));});
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
   try{if(['localhost','127.0.0.1'].includes(location.hostname))throw new Error('preview');const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString(),signal:controller.signal});if(!response.ok)throw new Error('server');status.textContent='Đã gửi yêu cầu thành công. Chuyên viên DBV247 sẽ liên hệ tư vấn cho bạn.';button.textContent='Đã gửi yêu cầu';}
   catch(err){status.dataset.error='true';status.textContent=err.message==='preview'?'Đây là bản xem trước: thông tin chưa được gửi.':'Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi 0869 656 561.';button.disabled=false;}finally{clearTimeout(timeout);}
  });
 });
})();
