(function () {
  'use strict';
  const normalize = text => (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
  function selectProducts(products, state) {
    const words = normalize(state.query).split(/\s+/).filter(Boolean);
    const result = products.filter(p => (state.audience === 'all' || p.audience.split(' ').includes(state.audience)) && (!state.categories.length || state.categories.includes(p.category)) && words.every(w => normalize(p.name + ' ' + p.description).includes(w)));
    return state.sort === 'name' ? result.sort((a, b) => a.name.localeCompare(b.name, 'vi')) : result;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {normalize, selectProducts};
  if (typeof document === 'undefined') return;
  const root = document.getElementById('dc-catalog');
  if (!root) return;
  const byId = id => document.getElementById(id);
  const grid = byId('dc-grid'), query = byId('dc-query'), more = byId('dc-more'), count = byId('dc-count');
  const products = Array.from(grid.querySelectorAll('.dc-card')).map(el => ({el, name:el.querySelector('h3').textContent, description:el.querySelector('.dc-desc').textContent, category:el.dataset.category, audience:el.dataset.audience}));
  const state = {audience:'all', query:'', categories:[], sort:'default', limit:9};
  const params = new URLSearchParams(location.search);
  const requested = params.get('nhom');
  if (['cn','ca-nhan'].includes(requested)) state.audience='cn';
  if (['dn','doanh-nghiep'].includes(requested)) state.audience='dn';
  query.value=params.get('q') || ''; state.query=query.value;
  const checks=Array.from(root.querySelectorAll('[name="dc-category"]'));
  if (params.get('loai') && checks.some(c=>c.value===params.get('loai'))) state.categories=[params.get('loai')];
  function render(focusIndex) {
    const filtered=selectProducts(products,state);
    const visible=filtered.slice(0,state.limit);
    products.forEach(p=>{p.el.hidden=!visible.includes(p);});
    filtered.forEach(p=>grid.append(p.el));
    count.textContent=filtered.length ? 'Hiển thị '+visible.length+' / '+filtered.length+' sản phẩm' : 'Không có sản phẩm phù hợp';
    more.hidden=filtered.length<=state.limit;
    byId('dc-empty').hidden=filtered.length>0;
    root.querySelectorAll('[data-audience]').forEach(b=>{if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset.audience===state.audience));});
    checks.forEach(c=>{c.checked=state.categories.includes(c.value);});
    byId('dc-filter-label').textContent='Bộ lọc'+(state.categories.length ? ' ('+state.categories.length+')' : '');
    byId('dc-apply').textContent='Xem '+filtered.length+' sản phẩm';
    if (focusIndex!==undefined && visible[focusIndex]) visible[focusIndex].el.focus();
  }
  root.classList.add('dc-ready');
  root.querySelectorAll('button[data-audience]').forEach(b=>b.addEventListener('click',()=>{state.audience=b.dataset.audience;state.limit=9;render();}));
  query.addEventListener('input',()=>{state.query=query.value;state.limit=9;render();});
  byId('dc-search').addEventListener('submit',e=>{e.preventDefault();state.query=query.value;state.limit=9;render();byId('dc-results').focus();byId('dc-results').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  checks.forEach(c=>c.addEventListener('change',()=>{state.categories=checks.filter(x=>x.checked).map(x=>x.value);state.limit=9;render();}));
  byId('dc-sort').addEventListener('change',e=>{state.sort=e.target.value;state.limit=9;render();});
  root.querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',()=>{state.audience='all';state.categories=[];state.query='';query.value='';state.sort='default';byId('dc-sort').value='default';state.limit=9;render();}));
  more.addEventListener('click',()=>{const first=state.limit;state.limit+=9;render(first);});
  const dialog=byId('dc-filter-dialog'), sidebar=byId('dc-sidebar'), home=byId('dc-filter-home'), open=byId('dc-filter-open');
  let priorOverflow='';
  let focusConsult=false;
  sidebar.querySelector('a[href="#dc-consult"]').addEventListener('click',()=>{if(dialog.open){focusConsult=true;dialog.close();}});
  open.addEventListener('click',()=>{byId('dc-dialog-content').append(sidebar);priorOverflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow='hidden';});
  byId('dc-filter-close').addEventListener('click',()=>dialog.close());
  byId('dc-apply').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{home.append(sidebar);document.body.style.overflow=priorOverflow;if(focusConsult){focusConsult=false;byId('dc-phone').focus();}else if(matchMedia('(max-width:767px)').matches)open.focus();});
  matchMedia('(min-width:768px)').addEventListener('change',e=>{if(e.matches&&dialog.open)dialog.close();});
  render();
  const form=byId('dc-form'), status=byId('dc-form-status');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const phone=byId('dc-phone');
    phone.setCustomValidity('');
    if(!/^(0\d{9}|\+84\d{9})$/.test(phone.value.replace(/[\s().-]/g,''))) phone.setCustomValidity('Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
    if(!form.reportValidity()) return;
    const button=form.querySelector('button[type=submit]');
    if(button.disabled)return;
    button.disabled=true;button.textContent='Đang gửi…';status.textContent='';status.dataset.error='false';
    const data=new FormData(form);
    data.set('trang',location.href);
    data.set('dong-y-chinh-sach','Đã đồng ý Chính sách bảo vệ dữ liệu cá nhân');
    data.set('thoi-diem-dong-y',new Date().toISOString());
    try {
      const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString()});
      if(!response.ok)throw new Error('Submit failed');
      form.hidden=true;
      status.textContent='Đã nhận thông tin. Chuyên viên DBV247 sẽ liên hệ tư vấn cho bạn.';
    } catch(error) {
      status.dataset.error='true';status.textContent='Chưa gửi được thông tin. Vui lòng thử lại hoặc gọi 0869 656 561.';
    } finally {button.disabled=false;button.textContent='Nhận tư vấn';}
  });
  byId('dc-phone').addEventListener('input',e=>e.target.setCustomValidity(''));
})();
