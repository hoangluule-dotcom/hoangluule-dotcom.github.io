/* DBV247 — eligibility orientation, indicative estimate, and existing Netlify lead flow. */
(()=>{'use strict';
const root=document.querySelector('.fire');if(!root)return;
const $=id=>document.getElementById(id);
const types={
 'nha-may':{label:'Nhà máy',rate:'factory',note:'Cần đối chiếu ngành sản xuất, hạng nguy hiểm cháy nổ, diện tích và khối tích trong hồ sơ PCCC.'},
 'kho-hang':{label:'Kho hàng',rate:'factory',note:'Cần đối chiếu loại hàng lưu trữ, hạng nguy hiểm cháy nổ, tổng diện tích và khối tích kho.'},
 'khach-san':{label:'Khách sạn',rate:'hotel',note:'Cần đối chiếu số tầng, tổng diện tích sàn, công năng thực tế và hồ sơ của cơ sở.'},
 'chung-cu':{label:'Chung cư',rate:'residential',note:'Cần phân biệt chung cư, nhà ở tập thể và nhà hỗn hợp, đồng thời đối chiếu số tầng và tổng diện tích sàn.'},
 'van-phong':{label:'Văn phòng',rate:'other',note:'Cần đối chiếu công năng sử dụng, chiều cao, số tầng, tổng diện tích và hồ sơ PCCC.'},
 'sieu-thi':{label:'Siêu thị · Chợ',rate:'other',note:'Cần phân biệt chợ, siêu thị và trung tâm thương mại; không dùng chung một tỷ lệ phí cho cả nhóm.'},
 'xang-dau':{label:'Xăng dầu',rate:'fuel',note:'Cần xác nhận loại hình xăng dầu hoặc khí đốt và quy mô tồn chứa để đối chiếu đúng danh mục.'},
 'khac':{label:'Loại khác',rate:'other',note:'Gửi ngành nghề, địa chỉ và quy mô cơ sở để chuyên viên đối chiếu danh mục và điều kiện áp dụng.'}
};
let selected='',busy=false;
const money=v=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(v)+' đ';
function value(){const raw=$('fire-value').value.trim();if(!raw)return null;if(!/^[\d.\s]+$/.test(raw))return NaN;return Number(raw.replace(/[.\s]/g,''));}
function quote(){
 const v=value(),type=$('fire-rate-type').value,sprinkler=root.querySelector('[name="fire-sprinkler"]:checked').value,term=$('fire-term').value;
 if(term!=='12')return {title:'Cần tư vấn theo thời hạn',detail:'Chuyên viên xác định phí cho thời hạn bảo hiểm bạn cần.'};
 if(v!==null&&(!Number.isFinite(v)||v<=0))return {title:'Kiểm tra giá trị tài sản',detail:'Nhập số tiền VNĐ lớn hơn 0; có thể dùng dấu chấm để phân cách hàng nghìn.'};
 if(v>=1000000000000)return {title:'Cần đánh giá riêng',detail:'Với số tiền bảo hiểm từ 1.000 tỷ đồng, cần chuyên viên kiểm tra điều kiện tính phí.'};
 // Indicative rates only from the existing page table; never infer a rate for factories/warehouses.
 let rate=null;
 if(['hotel','residential'].includes(type)&&sprinkler!=='unknown')rate=sprinkler==='yes'?.0005:.001;
 if(type==='school')rate=.0005;
 if(type==='fuel')rate=.003;
 if(type==='market')rate=.005;
 if(rate===null)return {title:'Cần xác định tỷ lệ áp dụng',detail:['hotel','residential'].includes(type)?'Bổ sung tình trạng hệ thống chữa cháy tự động để xem mức tham khảo.':'Chọn ngành nghề cụ thể; với nhóm chưa rõ tỷ lệ, chuyên viên sẽ đối chiếu hồ sơ.'};
 if(v===null)return {title:'Nhập giá trị tài sản dự kiến',detail:'Tỷ lệ tham khảo '+new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(rate*100)+'%/năm, cần xác nhận theo hồ sơ.'};
 return {title:money(Math.round(v*rate))+' / năm',detail:'Tạm tính với tỷ lệ '+new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(rate*100)+'%/năm, chưa gồm thuế. Không phải báo giá chính thức.'};
}
function summary(){const q=quote(),type=$('fire-rate-type'),lead=$('fire-lead-type');return [
 'Loại cơ sở: '+(lead.options[lead.selectedIndex].text||'Chưa chọn'),
 'Quy mô: '+($('fire-scale').value.trim()||'Chưa rõ'),
 'Nhóm tính phí: '+type.options[type.selectedIndex].text,
 'Giá trị tài sản: '+($('fire-value').value.trim()||'Chưa nhập'),
 'Chữa cháy tự động: '+({yes:'Có',no:'Không',unknown:'Chưa rõ'}[root.querySelector('[name="fire-sprinkler"]:checked').value]),
 'Thời hạn: '+$('fire-term').options[$('fire-term').selectedIndex].text,
 'Dự toán tham khảo: '+q.title+' — '+q.detail
 ].join('\n');}
function update(){const q=quote();$('fire-estimate').textContent=q.title;$('fire-estimate-detail').textContent=q.detail;const any=selected||$('fire-value').value||$('fire-scale').value;$('fire-lead-summary').textContent=any?'Thông tin kiểm tra và dự toán ở trên sẽ được gửi kèm yêu cầu.':'';}
function choose(k,syncRate=true){selected=k;root.querySelectorAll('[data-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===k)));$('fire-lead-type').value=k;const d=types[k];$('fire-condition').hidden=!d;$('fire-condition').textContent=d?d.note:'';$('fire-check-title').textContent=d?d.label+' — cần đối chiếu hồ sơ':'Cần đối chiếu thêm thông tin';if(d&&syncRate)$('fire-rate-type').value=d.rate;update();}
root.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.type)));
$('fire-unknown').addEventListener('click',()=>{$('fire-scale').value='Chưa rõ thông tin';update();});
$('fire-lead-type').addEventListener('change',e=>choose(e.target.value));
$('fire-rate-type').addEventListener('change',e=>{const map={hotel:'khach-san',residential:'chung-cu',fuel:'xang-dau',market:'sieu-thi',school:'khac',factory:['nha-may','kho-hang'].includes(selected)?selected:'nha-may',other:'khac'};choose(map[e.target.value]||'',false);});
['fire-value','fire-scale'].forEach(id=>$(id).addEventListener('input',update));
$('fire-term').addEventListener('change',update);root.querySelectorAll('[name="fire-sprinkler"]').forEach(i=>i.addEventListener('change',update));
$('fire-value').addEventListener('blur',()=>{const n=value();if(n!==null&&Number.isFinite(n)&&n>0)$('fire-value').value=new Intl.NumberFormat('vi-VN').format(n);update();});
const form=$('fire-lead'),phone=form.elements['dien-thoai'],status=$('fire-form-status'),submit=form.querySelector('[type=submit]');
phone.addEventListener('input',()=>phone.setCustomValidity(''));
form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;
 let p=phone.value.replace(/[\s().-]/g,'');p=p.replace(/^\+?84/,'0');
 if(!/^0[35789]\d{8}$/.test(p)){phone.setCustomValidity('Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.');phone.reportValidity();return;}
 if(!form.reportValidity())return;if(form.elements['bot-field'].value)return;
 busy=true;submit.disabled=true;status.dataset.error='false';status.textContent='Đang gửi yêu cầu…';
 const data=new FormData(form);data.set('dien-thoai',p);data.set('loai-hinh-kd',form.elements['loai-hinh-kd'].selectedOptions[0].text);data.set('ghi-chu',summary());data.set('trang',location.href);data.set('dong-y-chinh-sach','Có');data.set('thoi-diem-dong-y',new Date().toISOString());
 const params=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid'].forEach(k=>{if(params.has(k))data.set(k,params.get(k));});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{if(['localhost','127.0.0.1',''].includes(location.hostname))throw new Error('preview');const r=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString(),signal:controller.signal});if(!r.ok)throw new Error('server');status.textContent='Đã gửi yêu cầu. Chuyên viên DBV247 sẽ liên hệ tư vấn cho bạn.';submit.textContent='Đã gửi yêu cầu';}
 catch(err){status.dataset.error='true';status.textContent=err.message==='preview'?'Đây là bản xem trước: thông tin chưa được gửi.':'Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi 0869 656 561.';submit.disabled=false;busy=false;}
 finally{clearTimeout(timeout);}
});
const sticky=document.querySelector('.fire-sticky');if('IntersectionObserver'in window)new IntersectionObserver(entries=>sticky.classList.toggle('is-hidden',entries[0].isIntersecting),{threshold:0}).observe($('contact'));
update();
})();
