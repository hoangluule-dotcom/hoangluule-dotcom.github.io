/* DBV247 — tra danh mục 44 loại cơ sở (Phụ lục VII NĐ 105/2025), tính phí nhanh, gửi lead Netlify. Cập nhật 07/10/2026. */
(()=>{'use strict';
const root=document.querySelector('.fire');if(!root)return;
const $=id=>document.getElementById(id);
const D={"groups":[["nha-o","Nhà ở & nhà hỗn hợp"],["giao-duc","Giáo dục · Y tế · Xã hội"],["van-hoa","Thể thao · Văn hoá · Giải trí"],["thuong-mai","Thương mại · Lưu trú · Văn phòng"],["cong-nghiep","Sản xuất · Năng lượng · Kho"],["giao-thong","Giao thông · Hạ tầng"]],"items":{"m1":{"m":1,"g":"nha-o","n":"Nhà chung cư, nhà ở tập thể","th":"Cao từ 5 tầng hoặc tổng diện tích sàn từ 1.000 m²","all":0,"v":[["cc",null,{"s":[0.05,0.1]}]]},"m20":{"m":20,"g":"nha-o","n":"Nhà đa năng, nhà hỗn hợp","th":"Cao từ 3 tầng hoặc tổng diện tích sàn từ 500 m²","all":0,"v":[["hh",null,{"s":[0.05,0.1]}]]},"m44":{"m":44,"g":"nha-o","n":"Nhà ở kết hợp sản xuất, kinh doanh","th":"Diện tích phục vụ sản xuất, kinh doanh từ 200 m²","all":0,"v":[["nokd",null,{"r":[0.15,0.15]}]]},"m2":{"m":2,"g":"giao-duc","n":"Nhà trẻ, trường mẫu giáo, mầm non","th":"Từ 50 cháu hoặc tổng diện tích sàn từ 500 m²","all":0,"v":[["mn",null,{"r":[0.05,0.05]}]]},"m3":{"m":3,"g":"giao-duc","n":"Trường tiểu học đến đại học, dạy nghề, cơ sở nghiên cứu","th":"Cao từ 3 tầng hoặc tổng diện tích sàn từ 1.500 m²","all":0,"v":[["th",null,{"r":[0.05,0.05]}]]},"m4":{"m":4,"g":"giao-duc","n":"Bệnh viện","th":"Mọi bệnh viện, không phụ thuộc quy mô","all":1,"v":[["bv",null,{"r":[0.05,0.05]}]]},"m5":{"m":5,"g":"giao-duc","n":"Phòng khám, trạm y tế, nhà hộ sinh, dưỡng lão, phục hồi chức năng","th":"Cao từ 3 tầng hoặc tổng diện tích sàn từ 300 m²","all":0,"v":[["pk",null,{"r":[0.05,0.05]}]]},"m43":{"m":43,"g":"giao-duc","n":"Cơ sở trợ giúp xã hội","th":"Cao từ 3 tầng hoặc tổng diện tích sàn từ 300 m²","all":0,"v":[["tgxh",null,{"r":[0.05,0.05]}]]},"m6":{"m":6,"g":"van-hoa","n":"Sân vận động","th":"Khán đài từ 2.000 chỗ ngồi","all":0,"v":[["svd",null,{"r":[0.06,0.06]}]]},"m7":{"m":7,"g":"van-hoa","n":"Nhà thi đấu, nhà tập luyện, bể bơi, sân có khán đài, trường đua, trường bắn","th":"Từ 1.000 chỗ ngồi hoặc tổng diện tích sàn từ 1.000 m²","all":0,"v":[["ntd",null,{"r":[0.06,0.06]}]]},"m8":{"m":8,"g":"van-hoa","n":"Nhà hát, rạp chiếu phim, rạp xiếc","th":"Mọi quy mô","all":1,"v":[["rap",null,{"r":[0.1,0.1]}]]},"m9":{"m":9,"g":"van-hoa","n":"Trung tâm hội nghị, bảo tàng, thư viện, nhà trưng bày, triển lãm","th":"Cao từ 3 tầng hoặc tổng diện tích sàn từ 500 m²","all":0,"v":[["tv","Thư viện, bảo tàng",{"r":[0.075,0.075]}],["tl","Nhà trưng bày, triển lãm",{"r":[0.12,0.12]}],["hn","Trung tâm hội nghị",{"r":[0.1,0.1]}]]},"m10":{"m":10,"g":"van-hoa","n":"Karaoke, vũ trường, vui chơi giải trí, biểu diễn nghệ thuật, thuỷ cung","th":"Cao từ 2 tầng hoặc tổng diện tích sàn từ 300 m²","all":0,"v":[["kara","Karaoke, vũ trường, vui chơi giải trí",{"r":[0.4,0.4]}],["thc","Thuỷ cung",{"r":[0.05,0.05]}]]},"m11":{"m":11,"g":"thuong-mai","n":"Chợ, trung tâm thương mại, siêu thị","th":"Tổng diện tích sàn từ 300 m²","all":0,"v":[["cho","Chợ",{"r":[0.5,0.5]}],["tttm","Trung tâm thương mại",{"r":[0.06,0.06]}],["st","Siêu thị",{"r":[0.08,0.08]}]]},"m12":{"m":12,"g":"thuong-mai","n":"Nhà hàng, dịch vụ ăn uống, dịch vụ khác","th":"Tổng diện tích sàn từ 300 m²","all":0,"v":[["nh","Nhà hàng, dịch vụ ăn uống",{"r":[0.15,0.15]}],["dvk","Dịch vụ khác",null]]},"m13":{"m":13,"g":"thuong-mai","n":"Kinh doanh hàng hoá dễ cháy (vải, giấy, nhựa, gỗ, mỹ phẩm…)","th":"Tổng diện tích sàn từ 200 m²","all":0,"v":[["hdc",null,{"r":[0.08,0.08]}]]},"m14":{"m":14,"g":"thuong-mai","n":"Kinh doanh hàng khó cháy đựng trong bao bì dễ cháy","th":"Tổng diện tích sàn từ 1.000 m²","all":0,"v":[["hkc",null,{"r":[0.1,0.1]}]]},"m15":{"m":15,"g":"thuong-mai","n":"Kinh doanh khí đốt","th":"Tổng lượng khí đốt tồn chứa trên 500 kg","all":0,"v":[["kd",null,{"r":[0.3,0.3]}]]},"m16":{"m":16,"g":"thuong-mai","n":"Cửa hàng xăng dầu","th":"Mọi quy mô","all":1,"v":[["xd",null,{"r":[0.3,0.3]}]]},"m17":{"m":17,"g":"thuong-mai","n":"Khách sạn, nhà nghỉ, nhà khách, cơ sở lưu trú","th":"Cao từ 3 tầng hoặc tổng diện tích sàn từ 500 m²","all":0,"v":[["ks",null,{"s":[0.05,0.1]}]]},"m18":{"m":18,"g":"thuong-mai","n":"Bưu điện, bưu cục, cơ sở bưu chính, viễn thông","th":"Cao từ 3 tầng hoặc tổng diện tích sàn từ 500 m²","all":0,"v":[["bd",null,{"r":[0.075,0.075]}]]},"m19":{"m":19,"g":"thuong-mai","n":"Trụ sở cơ quan, nhà làm việc của doanh nghiệp, tổ chức","th":"Cao từ 3 tầng hoặc tổng diện tích sàn từ 500 m²","all":0,"v":[["vp",null,{"r":[0.05,0.05]}]]},"m21":{"m":21,"g":"cong-nghiep","n":"Lọc dầu, hoá dầu, chế biến khí, nhiên liệu sinh học; kho dầu, kho khí, trạm chiết nạp","th":"Mọi quy mô","all":1,"v":[["loc","Nhà máy lọc dầu, hoá dầu, nhiên liệu sinh học",{"r":[0.35,0.35]}],["khodau","Kho dầu, kho khí hoá lỏng, trạm chiết nạp, phân phối khí",{"r":[0.3,0.3]}]]},"m22":{"m":22,"g":"cong-nghiep","n":"Nhà máy điện","th":"Mọi quy mô","all":1,"v":[["nd","Nhiệt điện, điện rác, điện mặt trời trên bờ",{"r":[0.15,0.15]}],["tdien","Thuỷ điện, địa nhiệt, biogas",{"r":[0.12,0.12]}],["gb","Điện gió trên bờ",{"r":[0.35,0.35]}],["gk","Điện gió ngoài khơi, điện mặt trời trên mặt nước",{"r":[0.5,0.5]}],["dk","Loại nhà máy điện khác",{"r":[0.12,0.12]}]]},"m23":{"m":23,"g":"cong-nghiep","n":"Trạm biến áp","th":"Điện áp từ 110 kV","all":0,"v":[["tba",null,{"r":[0.2,0.2]}]]},"m24":{"m":24,"g":"cong-nghiep","n":"Sản xuất, kho chứa vật liệu nổ, tiền chất thuốc nổ, vũ khí, công cụ hỗ trợ","th":"Mọi quy mô","all":1,"v":[["vln",null,{"r":[0.5,0.5]}]]},"m25":{"m":25,"g":"cong-nghiep","n":"Cơ sở sản xuất công nghiệp hạng nguy hiểm cháy nổ A, B","th":"Mọi quy mô","all":1,"v":[["sxab-k","Ngành sản xuất khác (hoá chất, nhựa, sơn, in, vật liệu xây dựng…)",{"r":[0.2,0.2]}],["sxab-dm","Dệt may",{"r":[0.25,0.25]}],["sxab-giay","Giày dép",{"r":[0.35,0.35]}],["sxab-gb","Giấy, bao bì, tã lót, băng vệ sinh",{"r":[0.35,0.35]}],["sxab-go","Gỗ, mây tre, diêm, hương, vàng mã",{"r":[0.5,0.5]}]]},"m26":{"m":26,"g":"cong-nghiep","n":"Cơ sở sản xuất công nghiệp hạng nguy hiểm cháy C","th":"Mọi quy mô","all":1,"v":[["sxc-k","Ngành sản xuất khác (hoá chất, nhựa, sơn, in, vật liệu xây dựng…)",{"r":[0.2,0.2]}],["sxc-dm","Dệt may",{"r":[0.25,0.25]}],["sxc-giay","Giày dép",{"r":[0.35,0.35]}],["sxc-gb","Giấy, bao bì, tã lót, băng vệ sinh",{"r":[0.35,0.35]}],["sxc-go","Gỗ, mây tre, diêm, hương, vàng mã",{"r":[0.5,0.5]}]]},"m27":{"m":27,"g":"cong-nghiep","n":"Cơ sở sản xuất công nghiệp hạng nguy hiểm cháy D, E","th":"Khối tích từ 5.000 m³ hoặc tổng diện tích sàn từ 1.000 m²","all":0,"v":[["sxde",null,{"r":[0.15,0.15]}]]},"m28":{"m":28,"g":"cong-nghiep","n":"Kho hàng hạng nguy hiểm cháy và cháy nổ A, B, C","th":"Tổng diện tích sàn từ 200 m²","all":0,"v":[["kabc","Kho hàng tổng hợp, nhựa, hoá chất, nông sản, kho lạnh…",{"r":[0.2,0.2]}],["kabc-vai","Kho vải, len, sản phẩm dệt",{"r":[0.25,0.25]}],["kabc-giay","Kho giấy, bìa, bao bì",{"r":[0.35,0.35]}],["kabc-go","Kho gỗ, sản phẩm gỗ",{"r":[0.5,0.5]}]]},"m29":{"m":29,"g":"cong-nghiep","n":"Kho dự trữ quốc gia","th":"Mọi quy mô","all":1,"v":[["kdtqg",null,{"r":[0.2,0.2]}]]},"m30":{"m":30,"g":"cong-nghiep","n":"Kho hàng hạng nguy hiểm cháy D, E","th":"Khối tích từ 5.000 m³ hoặc tổng diện tích sàn từ 1.000 m²","all":0,"v":[["kde",null,{"r":[0.1,0.1]}]]},"m32":{"m":32,"g":"cong-nghiep","n":"Nhà máy nước, nhà máy xử lý chất thải","th":"Mọi quy mô","all":1,"v":[["nmn",null,{"r":[0.12,0.12]}]]},"m42":{"m":42,"g":"cong-nghiep","n":"Cơ sở hạt nhân","th":"Mọi quy mô","all":1,"v":[["hn42",null,null]]},"m31":{"m":31,"g":"giao-thong","n":"Nhà để xe ô tô, xe máy; nhà trưng bày ô tô, xe máy","th":"Tổng diện tích sàn từ 500 m²","all":0,"v":[["ndx",null,{"r":[0.12,0.12]}]]},"m33":{"m":33,"g":"giao-thong","n":"Nhà ga hành khách, nhà ga hàng hoá cảng hàng không; nhà kỹ thuật máy bay; đài kiểm soát không lưu","th":"Mọi quy mô","all":1,"v":[["hk",null,{"r":[0.08,0.08]}]]},"m34":{"m":34,"g":"giao-thong","n":"Cảng, bến thuỷ nội địa; bến cảng biển","th":"Công trình từ cấp III trở lên","all":0,"v":[["cang",null,{"r":[0.1,0.1]}]]},"m35":{"m":35,"g":"giao-thong","n":"Cảng cạn","th":"Mọi quy mô","all":1,"v":[["cangcan",null,{"r":[0.1,0.1]}]]},"m36":{"m":36,"g":"giao-thong","n":"Cảng cá","th":"Từ loại II","all":0,"v":[["cangca",null,{"r":[0.1,0.1]}]]},"m37":{"m":37,"g":"giao-thong","n":"Bến xe khách, trung tâm đăng kiểm, trạm dừng nghỉ","th":"Tổng diện tích sàn từ 500 m²","all":0,"v":[["bx",null,{"r":[0.1,0.1]}]]},"m38":{"m":38,"g":"giao-thong","n":"Nhà ga đường sắt, depot, nhà ga cáp treo, đường sắt đô thị","th":"Tổng diện tích sàn từ 300 m²","all":0,"v":[["gads","Nhà ga, depot đường sắt, đường sắt đô thị",{"r":[0.12,0.12]}],["gact","Nhà ga cáp treo",{"r":[0.1,0.1]}]]},"m39":{"m":39,"g":"giao-thong","n":"Hầm đường ô tô, hầm đường sắt, hầm đường sắt đô thị","th":"Chiều dài từ 500 m","all":0,"v":[["ham",null,{"r":[0.12,0.12]}]]},"m40":{"m":40,"g":"giao-thong","n":"Sửa chữa, bảo dưỡng phương tiện cơ giới đường bộ (gara)","th":"Tổng diện tích sàn từ 500 m²","all":0,"v":[["gara",null,{"r":[0.15,0.15]}]]},"m41":{"m":41,"g":"giao-thong","n":"Sửa chữa phương tiện thuỷ nội địa, tàu biển","th":"Tổng diện tích sàn từ 1.000 m²","all":0,"v":[["scth",null,{"r":[0.15,0.15]}]]}}};
const UNIT_BUILD=12000000; // đ/m² — đơn giá ước tính nội bộ khi khách chưa có giá trị xây dựng (không hiển thị)
const VARIANT={};Object.values(D.items).forEach(it=>it.v.forEach(([k,vn,rate])=>VARIANT[k]={item:it,name:vn||it.n,rate}));
const fmt=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Math.round(n));
const money=n=>fmt(n)+' đ';
const pct=v=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3}).format(v)+'%';
const norm=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d');
function rateText(r){if(!r)return 'Cần chuyên viên xác định theo hồ sơ';if(r.s)return pct(r.s[0])+'/năm nếu có chữa cháy tự động · '+pct(r.s[1])+'/năm nếu không có';return r.r[0]===r.r[1]?pct(r.r[0])+'/năm':pct(r.r[0])+' – '+pct(r.r[1])+'/năm';}
function itemRateText(it){if(it.v.length===1)return rateText(it.v[0][2]);return it.v.map(([k,vn,r])=>vn+': '+(r?rateText(r):'cần xác định')).join(' · ');}

/* ── 1. Danh mục: nhóm + tìm kiếm ── */
let group=D.groups[0][0],selected='';
const items=[...root.querySelectorAll('.fire-item')],tabs=[...root.querySelectorAll('.fire-tab')];
items.forEach(b=>b.dataset.n=' '+norm(b.dataset.kw||b.textContent).replace(/[^a-z0-9]+/g,' '));
function filter(){const q=norm($('fire-q').value.trim());let shown=0;
 items.forEach(b=>{const ok=q?q.replace(/[^a-z0-9]+/g,' ').trim().split(' ').every(w=>b.dataset.n.includes(' '+w)):b.dataset.group===group;b.hidden=!ok;if(ok)shown++;});
 tabs.forEach(t=>t.setAttribute('aria-selected',String(!q&&t.dataset.group===group)));
 root.querySelector('.fire-tabs').classList.toggle('is-search',!!q);$('fire-empty').hidden=shown>0;}
tabs.forEach(t=>t.addEventListener('click',()=>{group=t.dataset.group;$('fire-q').value='';filter();}));
$('fire-q').addEventListener('input',filter);
function choose(id,scroll){const it=D.items[id];if(!it)return;selected=id;
 items.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
 $('fire-res-tag').textContent='Mục '+it.m+' · Phụ lục VII NĐ 105/2025';
 $('fire-check-title').textContent=it.n;
 $('fire-res-dl').hidden=false;$('fire-res-th').textContent=it.all?'Thuộc diện bắt buộc, không phụ thuộc quy mô':it.th;
 $('fire-res-rate').textContent=itemRateText(it);
 $('fire-check-copy').textContent=it.all?'Loại hình này có thể thuộc diện bắt buộc ngay cả khi quy mô nhỏ. Chuyên viên sẽ xác nhận theo hồ sơ.':'Nếu cơ sở đạt một trong các ngưỡng trên, cơ sở có thể thuộc diện phải mua bảo hiểm cháy nổ bắt buộc.';
 const lt=$('fire-lead-type');if(lt.querySelector('option[value="'+id+'"]'))lt.value=id;
 if(scroll&&window.innerWidth<=900)root.querySelector('#kiem-tra .fire-result').scrollIntoView({behavior:'smooth',block:'start'});
 update();}
items.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.id,true)));
$('fire-go-calc').addEventListener('click',e=>{e.preventDefault();
 if(selected){const k=D.items[selected].v[0][0];if($('fire-rate-type').value===''||!VARIANT[$('fire-rate-type').value]||VARIANT[$('fire-rate-type').value].item!==D.items[selected])$('fire-rate-type').value=k;onType();}
 $('cach-tinh-phi').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>{try{$('fire-area').focus({preventScroll:true})}catch(_){}},500);});

/* ── 2. Tính phí nhanh ── */
const num=id=>{const v=$(id).value.replace(/[^\d]/g,'');return v?Number(v):0;};
function live(id){const el=$(id);el.addEventListener('input',()=>{const d=el.value.replace(/[^\d]/g,'');el.value=d?fmt(Number(d)):'';update();});}
['fire-area','fire-bv','fire-fixed','fire-stock'].forEach(live);
function onType(){const v=VARIANT[$('fire-rate-type').value];$('fire-spk-wrap').hidden=!(v&&v.rate&&v.rate.s);
 $('fire-rate-hint').textContent=v?'Mục '+v.item.m+' · '+rateText(v.rate):'Tỷ lệ phí áp dụng theo loại cơ sở bạn chọn.';
 if(v&&selected!==('m'+v.item.m)){selected='m'+v.item.m;items.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===selected)));const lt=$('fire-lead-type');if(lt.querySelector('option[value="'+selected+'"]'))lt.value=selected;}
 update();}
$('fire-rate-type').addEventListener('change',onType);
root.querySelectorAll('[name="fire-sprinkler"]').forEach(i=>i.addEventListener('change',update));
function quote(){
 const v=VARIANT[$('fire-rate-type').value],area=num('fire-area'),bv=num('fire-bv'),build=bv||area*UNIT_BUILD,est=!bv&&build>0,fixed=num('fire-fixed'),stock=num('fire-stock'),total=build+fixed+stock;
 const q={build,est,fixed,stock,total,area,rateTxt:'—',title:'',detail:'',alt:''};
 if(!v){q.title='Chọn loại cơ sở';q.detail='Chọn loại cơ sở để áp đúng tỷ lệ phí theo Phụ lục VI NĐ 105/2025.';return q;}
 let rate,alt=null,r=v.rate;
 if(!r){q.rateTxt='Cần chuyên viên xác định theo hồ sơ';}
 else if(r.s){const sp=root.querySelector('[name="fire-sprinkler"]:checked').value;
  if(sp==='yes')rate=r.s[0];else{rate=r.s[1];if(sp==='unknown')alt=r.s[0];}
  q.rateTxt=pct(rate)+'/năm'+(sp==='yes'?' (có chữa cháy tự động)':' (không có chữa cháy tự động)');}
 else{rate=r.r[0];q.rateTxt=pct(rate)+'/năm';}
 if(!total){q.title='Nhập diện tích cơ sở';q.detail='Nhập diện tích (hoặc giá trị xây dựng) để tính tổng số tiền bảo hiểm.';return q;}
 if(total>=1e12){q.title='Cần đánh giá riêng';q.detail='Tổng số tiền bảo hiểm từ 1.000 tỷ đồng áp dụng cơ chế thoả thuận phí riêng — chuyên viên DBV sẽ tư vấn.';return q;}
 if(rate==null){q.title='Chuyên viên báo phí';q.detail='Loại cơ sở này chưa có tỷ lệ phí cố định trên công cụ. Gửi thông tin để chuyên viên DBV báo phí theo hồ sơ.';return q;}
 const a=total*rate/100;
 q.title='≈ '+money(a)+' / năm';
 q.detail='Chưa gồm VAT 10% (≈ '+money(a*1.1)+' đã gồm VAT).'+(est?' Giá trị xây dựng đang được ước tính theo diện tích — nhập số liệu thực tế để kết quả sát hơn.':'');
 if(alt!=null)q.alt='Nếu cơ sở có hệ thống chữa cháy tự động, phí còn khoảng '+money(total*alt/100)+'/năm.';
 return q;}
function update(){const q=quote();
 $('fs-build').textContent=q.build?money(q.build)+(q.est?' (ước tính)':''):'—';$('fs-fixed').textContent=q.fixed?money(q.fixed):'—';$('fs-stock').textContent=q.stock?money(q.stock):'—';$('fs-total').textContent=q.total?money(q.total):'—';
 $('fire-rate-val').textContent=q.rateTxt;$('fire-estimate').textContent=q.title;$('fire-estimate-detail').textContent=q.detail;$('fire-estimate-alt').hidden=!q.alt;$('fire-estimate-alt').textContent=q.alt;
 const any=selected||q.total;$('fire-lead-summary').textContent=any?'Thông tin kiểm tra và phí dự kiến ở trên sẽ được gửi kèm yêu cầu.':'';}
function summary(){const q=quote(),t=$('fire-rate-type'),lead=$('fire-lead-type'),sp=root.querySelector('[name="fire-sprinkler"]:checked').value;return [
 'Loại cơ sở (form): '+(lead.value?lead.options[lead.selectedIndex].text:'Chưa chọn'),
 'Loại cơ sở tính phí: '+(t.value?t.options[t.selectedIndex].text:'Chưa chọn'),
 'Diện tích: '+(q.area?fmt(q.area)+' m²':'Chưa nhập'),
 'Giá trị xây dựng: '+(q.build?money(q.build)+(q.est?' (ước tính theo diện tích)':' (khách cung cấp)'):'—'),
 'Tài sản cố định: '+(q.fixed?money(q.fixed):'Không nhập'),
 'Hàng hoá lưu kho: '+(q.stock?money(q.stock):'Không nhập'),
 'Tổng số tiền bảo hiểm: '+(q.total?money(q.total):'—'),
 'Chữa cháy tự động: '+({yes:'Có',no:'Không',unknown:'Chưa rõ'}[sp]),
 'Tỷ lệ phí: '+q.rateTxt,
 'Phí dự kiến: '+q.title+' — '+q.detail+(q.alt?' '+q.alt:'')].join('\n');}
$('fire-lead-type').addEventListener('change',e=>{if(D.items[e.target.value])choose(e.target.value,false);});

/* ── 3. Gửi lead (Netlify Forms, form dbv-tuvan) ── */
let busy=false;
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
const sticky=document.querySelector('.fire-sticky');if(sticky&&'IntersectionObserver'in window)new IntersectionObserver(entries=>sticky.classList.toggle('is-hidden',entries[0].isIntersecting),{threshold:0}).observe($('contact'));
filter();update();
})();
