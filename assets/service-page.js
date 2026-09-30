(function(){
  'use strict';
  const root=document.getElementById('sm-page');if(!root)return;
  const id=x=>document.getElementById(x);
  let limit=6,signature='',selected=null;
  function view(mode){root.dataset.view=mode;root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));}
  function showLocation(it,openMap){
    selected=it;
    id('map').replaceChildren();
    const frame=document.createElement('iframe');frame.title='Bản đồ: '+it.t;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.src='https://maps.google.com/maps?q='+encodeURIComponent(it.t+' '+it.a)+'&output=embed';
    id('map').append(frame);
    id('mapNote').textContent='Bản đồ tra cứu theo địa chỉ. Nếu chưa hiển thị, hãy dùng “Chỉ đường” để mở Google Maps.';
    id('mapNote').classList.remove('hide');
    root.querySelectorAll('.rcard').forEach(c=>c.classList.toggle('active',c.dataset.key===it.t+'|'+it.a));
    if(openMap){view('map');if(matchMedia('(max-width:767px)').matches)root.querySelector('.map-wrap').scrollIntoView({block:'start',behavior:'auto'});}
  }
  // Keep the original dataset, filters and deep links; replace only presentation.
  window.render=function(){
    const next=JSON.stringify(state);if(next!==signature){limit=6;signature=next;selected=null;}
    const list=filtered(),visible=list.slice(0,limit),box=id('results');
    id('rhTitle').textContent=TYPE_LABELS[state.type];
    id('rhCount').textContent=visible.length+' / '+list.length+' kết quả';
    id('sm-summary').textContent='Đang xem: '+TYPE_LABELS[state.type]+(state.province?' tại '+state.province:' trên toàn quốc');
    root.querySelectorAll('.tab-btn').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.type===state.type)));
    root.querySelectorAll('.gf-btn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.o===state.o)));
    if(state.type===2)garaCounts();
    box.replaceChildren();id('sm-more').hidden=visible.length>=list.length;
    if(!list.length){const p=document.createElement('p');p.className='empty';p.textContent='Không tìm thấy điểm dịch vụ phù hợp. Hãy thử từ khóa khác hoặc xóa bộ lọc.';box.append(p);id('map').replaceChildren();id('mapNote').textContent='Chọn lại bộ lọc để tìm địa điểm trên bản đồ.';return;}
    visible.forEach((it,i)=>{
      const card=document.createElement('article');card.className='rcard';card.dataset.key=it.t+'|'+it.a;
      const number=document.createElement('span');number.className='sm-number';number.textContent=i+1;card.append(number);
      const body=document.createElement('div');body.className='rcard-body';card.append(body);
      const h=document.createElement('h3');h.className='rcard-name';h.textContent=it.t;body.append(h);
      for(const [value,cls] of [[it.n,'rcard-co'],[it.a,'rcard-addr']])if(value){const p=document.createElement('p');p.className=cls;p.textContent=value;body.append(p);}
      const meta=document.createElement('p');meta.className='sm-meta';meta.textContent=[it.c,it.ty===2?(it.o?'Chính hãng':'Gara đa hãng'):it.h].filter(Boolean).join(' · ');body.append(meta);
      const actions=document.createElement('div');actions.className='sm-card-actions';
      const link=document.createElement('a');link.className='sm-btn';link.href=dirUrl(it);link.target='_blank';link.rel='noopener';link.textContent='Chỉ đường ↗';link.setAttribute('aria-label','Chỉ đường đến '+it.t);
      const button=document.createElement('button');button.type='button';button.className='sm-map-button';button.textContent='Xem bản đồ →';button.setAttribute('aria-label','Xem bản đồ '+it.t);button.addEventListener('click',()=>showLocation(it,true));
      actions.append(link,button);body.append(actions);box.append(card);
    });
    if(!selected||!list.includes(selected))showLocation(list[0],false);
    else root.querySelectorAll('.rcard').forEach(c=>c.classList.toggle('active',c.dataset.key===selected.t+'|'+selected.a));
  };
  id('sm-more').addEventListener('click',()=>{const first=limit;limit+=6;render();const card=id('results').children[first];if(card)card.querySelector('a').focus();});
  id('sm-reset').addEventListener('click',()=>{state.province='';state.q='';state.o='';state.brand='';id('province').value='';id('q').value='';id('brand').value='';id('brand').classList.remove('on');root.querySelectorAll('.gf-btn').forEach(b=>b.classList.toggle('on',b.dataset.o===''));render();});
  root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
  id('q').addEventListener('input',()=>{state.q=norm(id('q').value.trim());render();});
  view('list');
})();
