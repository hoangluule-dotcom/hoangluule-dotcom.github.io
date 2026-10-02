(function(){
  'use strict';
  const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
  function selectArticles(items,state){
    const words=normalize(state.query).split(/\s+/).filter(Boolean);
    const result=items.filter(x=>(state.category==='all'||x.category===state.category)&&words.every(w=>normalize(x.title+' '+x.description).includes(w)));
    return state.sort==='suggested'?result:result.sort((a,b)=>state.sort==='title'?a.title.localeCompare(b.title,'vi'):state.sort==='oldest'?a.date-b.date:b.date-a.date);
  }
  if(typeof module!=='undefined')module.exports={normalize,selectArticles};
  if(typeof document==='undefined')return;
  const root=document.getElementById('nt-page');if(!root)return;
  const id=x=>document.getElementById(x),grid=id('newsGrid'),query=id('nt-query');
  const items=Array.from(grid.querySelectorAll('.guide-card')).map(el=>{const d=el.querySelector('.guide-card-date').textContent.trim().split('/');return{el,title:el.querySelector('h3').textContent,description:el.querySelector('p').textContent,category:el.dataset.cat,date:Date.UTC(+d[2],+d[1]-1,+d[0])||0};});
  const tabs=Array.from(id('newsTabs').querySelectorAll('button'));
  // The existing index builder emits tab roles. These are filter buttons, not tab panels.
  tabs.forEach(b=>{b.removeAttribute('role');b.removeAttribute('aria-selected');});
  const params=new URLSearchParams(location.search),state={category:'all',query:params.get('q')||'',sort:'suggested',limit:6};
  if(tabs.some(b=>b.dataset.cat===params.get('cat')))state.category=params.get('cat');
  query.value=state.query;
  function render(focusIndex){
    const found=selectArticles(items,state),visible=found.slice(0,state.limit);
    items.forEach(x=>{x.el.hidden=!visible.includes(x);});found.forEach(x=>grid.append(x.el));
    tabs.forEach(b=>{const on=b.dataset.cat===state.category;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
    id('nt-count').textContent=found.length?'Hiển thị '+visible.length+' / '+found.length+' bài viết':'Không có bài viết phù hợp';
    id('newsEmpty').hidden=found.length>0;id('nt-more').hidden=found.length<=state.limit;
    id('nt-featured').hidden=state.category!=='all'||normalize(state.query)!=='';
    if(focusIndex!==undefined&&visible[focusIndex])visible[focusIndex].el.focus();
  }
  tabs.forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.cat;state.limit=6;render();b.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}));
  query.addEventListener('input',()=>{state.query=query.value;state.limit=6;render();});
  id('nt-search').addEventListener('submit',e=>{e.preventDefault();state.query=query.value;state.limit=6;render();id('nt-results').focus();id('nt-results').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  id('nt-sort').addEventListener('change',e=>{state.sort=e.target.value;state.limit=6;render();});
  id('nt-more').addEventListener('click',()=>{const first=state.limit;state.limit+=6;render(first);});
  id('nt-reset').addEventListener('click',()=>{state.query='';state.category='all';state.sort='suggested';state.limit=6;query.value='';id('nt-sort').value='suggested';render();});
  root.classList.add('nt-ready');render();
})();
