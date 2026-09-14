/* ══════════════════════════════════════════════════════════════════════════
   DBV247 — Công cụ cấp đơn TNDS (bản dùng chung cho mọi trang)

   Đây là BẢN GỐC DUY NHẤT của biểu phí và logic cấp đơn. Trước ngày
   12/09/2026 mã này nằm inline trong bao-hiem-tnds-oto.html và một bản sao
   nữa ở tên miền phụ tnds.dbv247.com.vn — sửa phí một chỗ là lệch chỗ kia.
   Nay gom về một file, các trang chỉ nhúng:

     <link rel="stylesheet" href="/assets/cap-don-tnds.css">
     <section id="cap-don" data-loai-xe="moto"> ...khối HTML... </section>
     <script src="/assets/cap-don-tnds.js" defer></script>

   Khối HTML vẫn nằm trong từng trang (để Google đọc được nội dung, không
   dựng bằng JS) và được đồng bộ từ cap-don-tnds.html bằng
   scripts/sync_capdon.py — ĐỪNG sửa khối đó bằng tay ở từng trang.

   Sửa biểu phí thì sửa ở file này, rồi chạy lại sync_capdon.py nếu khối HTML
   cũng đổi theo.
   ══════════════════════════════════════════════════════════════════════════ */

/* Công cụ cấp đơn TNDS — đóng gói trong IIFE, chỉ lộ ra window.CD
   để không đụng tên hàm với JS sẵn có của landing page. */
(function(){
/* ══════════════════════════════════════════════════════════════════════════
   ⚙️  CẤU HÌNH TÀI KHOẢN NHẬN TIỀN — SỬA 4 DÒNG DƯỚI ĐÂY LÀ CHẠY ĐƯỢC
   ──────────────────────────────────────────────────────────────────────────
   bankId : mã ngân hàng theo chuẩn VietQR (BIN hoặc short name).
            VD: 'VCB' Vietcombank · 'BIDV' · 'TCB' Techcombank · 'MB' MBBank
                'ACB' · 'VPB' VPBank · 'STB' Sacombank · 'ICB' VietinBank
            Tra đầy đủ tại https://api.vietqr.io/v2/banks
   Đổi số tài khoản thì KHÔNG cần sửa gì thêm — mã QR tự sinh lại theo
   số tiền và mã đơn của từng khách.
   ══════════════════════════════════════════════════════════════════════════ */
var BANK = {
  bankId     : 'TCB',          /* Techcombank — BIN 970407, dùng '970407' cũng được */
  bankName   : 'Techcombank',
  accountNo  : '123568568',
  /* Tên hiện trên trang cho khách đối chiếu */
  accountName: 'Công ty cổ phần Tập đoàn Bảo hiểm DBV - Chi nhánh DBV Thành Đô',
  /* Tên không dấu, viết hoa — chuẩn VietQR yêu cầu, đừng thêm dấu vào đây */
  accountNameQR: 'CONG TY CO PHAN TAP DOAN BAO HIEM DBV - CHI NHANH DBV THANH DO'
};
var HOTLINE = '0869656561';
var ZALO    = 'https://zalo.me/1283738895804393564';
var QR_MINUTES = 15;

/* ══════════ BIỂU PHÍ — Phụ lục I, Nghị định 67/2023/NĐ-CP ══════════
   Đơn vị: đồng/năm, CHƯA gồm VAT. Không sửa nếu chưa có nghị định mới. */
var MOTO = {
  m2_50 :{t:'Mô tô 2 bánh dưới 50 cc',            f:55000},
  m2_50p:{t:'Mô tô 2 bánh từ 50 cc trở lên',      f:60000},
  mdien :{t:'Xe máy điện',                        f:55000},
  m3b   :{t:'Mô tô 3 bánh',                       f:290000},
  mkhac :{t:'Xe gắn máy & xe cơ giới tương tự',   f:290000}
};

/* IV — ô tô KHÔNG kinh doanh vận tải */
var NKD = {
  d6    :{t:'Xe dưới 6 chỗ',                      f:437000},
  c611  :{t:'Xe từ 6 đến 11 chỗ',                 f:794000},
  c1224 :{t:'Xe từ 12 đến 24 chỗ',                f:1270000},
  t24   :{t:'Xe trên 24 chỗ',                     f:1825000},
  pickup:{t:'Pickup / minivan (vừa chở người vừa chở hàng)', f:437000}
};

/* V — ô tô KINH DOANH vận tải: phí theo số chỗ đăng ký */
var KD_SEAT = {
  1:756000,2:756000,3:756000,4:756000,5:756000,
  6:929000,7:1080000,8:1253000,9:1404000,10:1512000,
  11:1656000,12:1822000,13:2049000,14:2221000,15:2394000,
  16:3054000,17:2718000,18:2869000,19:3041000,20:3191000,
  21:3364000,22:3515000,23:3688000,24:4632000,25:4813000
};
function phiKD(seats){
  seats = parseInt(seats,10);
  if(!seats || seats < 1) return 0;
  if(seats <= 25) return KD_SEAT[seats] || 0;
  return 4813000 + 30000 * (seats - 25);   /* mục V.22 */
}

/* VI — ô tô chở hàng (xe tải) */
var TAI = {
  t3  :{t:'Xe tải dưới 3 tấn',        f:853000},
  t38 :{t:'Xe tải từ 3 đến 8 tấn',    f:1660000},
  t815:{t:'Xe tải trên 8 đến 15 tấn', f:2746000},
  t15 :{t:'Xe tải trên 15 tấn',       f:3200000}
};

/* VII — các trường hợp tính theo hệ số */
var KHAC = {
  taxi   :{t:'Xe taxi',                        base:'kdseat', k:1.70, seats:true,
           note:'170% phí xe kinh doanh cùng số chỗ (mục VII.2)'},
  taplai :{t:'Xe tập lái (xe con dưới 6 chỗ)', base:437000,  k:1.20,
           note:'120% phí xe không KDVT cùng chủng loại (mục VII.1)'},
  buyt   :{t:'Xe buýt',                        base:'buyt',  k:1.00, seats:true,
           note:'Bằng phí xe không KDVT cùng số chỗ (mục VII.6)'},
  cuuthuong:{t:'Xe cứu thương',                base:933000,  k:1.20,
           note:'120% phí pickup/minivan kinh doanh (mục VII.3a)'},
  chotien:{t:'Xe chở tiền',                    base:437000,  k:1.20,
           note:'120% phí xe dưới 6 chỗ không KDVT (mục VII.3b)'},
  cd3    :{t:'Xe chuyên dùng khác — dưới 3 tấn',  base:853000, k:1.20, note:'120% phí xe tải cùng trọng tải (mục VII.3c)'},
  cd38   :{t:'Xe chuyên dùng khác — 3 đến 8 tấn', base:1660000,k:1.20, note:'120% phí xe tải cùng trọng tải (mục VII.3c)'},
  cd815  :{t:'Xe chuyên dùng khác — trên 8 đến 15 tấn', base:2746000,k:1.20, note:'120% phí xe tải cùng trọng tải (mục VII.3c)'},
  cd15   :{t:'Xe chuyên dùng khác — trên 15 tấn', base:3200000,k:1.20, note:'120% phí xe tải cùng trọng tải (mục VII.3c)'},
  daukeo :{t:'Đầu kéo rơ-moóc',                base:3200000, k:1.50,
           note:'150% phí xe tải trên 15 tấn — đã gồm cả rơ-moóc (mục VII.4)'},
  maykeo :{t:'Máy kéo',                        base:853000,  k:1.20,
           note:'120% phí xe tải dưới 3 tấn — đã gồm rơ-moóc (mục VII.5)'}
};

/* phí xe buýt = phí xe không KDVT cùng số chỗ (mục IV) */
function phiNkdTheoCho(seats){
  seats = parseInt(seats,10);
  if(!seats||seats<1) return 0;
  if(seats < 6)  return 437000;
  if(seats <= 11) return 794000;
  if(seats <= 24) return 1270000;
  return 1825000;
}

/* ══════════ TRẠNG THÁI ══════════ */
var S = { veh:'', group:'', sub:'', seats:'', years:1, start:'',
          phiGoc:0, vat:0, tong:0, label:'', note:'', code:'', sent:false };

var VND = function(n){ return (Math.round(n)||0).toLocaleString('vi-VN') + ' đ'; };
function $(id){ return document.getElementById(id); }
function val(id){ var e=$(id); return e ? (e.value||'').trim() : ''; }

/* ══════════ BƯỚC 1 ══════════ */
function pickVeh(v){
  S.veh = v; S.group=''; S.sub=''; S.seats='';
  $('cdvt-oto').classList.toggle('on', v==='oto');
  $('cdvt-moto').classList.toggle('on', v==='moto');
  $('cdoto-opts').style.display  = v==='oto'  ? 'block':'none';
  $('cdmoto-opts').style.display = v==='moto' ? 'block':'none';
  $('cdterm-wrap').style.display = 'block';
  $('cdf-group').value=''; $('cdf-moto').value=''; $('cdf-sub').innerHTML='<option value="">— Chọn —</option>';
  $('cdwrap-seats').style.display='none';
  $('cdcov-ts').textContent = (v==='moto') ? '50 triệu đ' : '100 triệu đ';
  if(!$('cdf-start').value) setDefaultDate();
  calc();
}

function setDefaultDate(){
  var d = new Date(); d.setDate(d.getDate()+1);
  var iso = d.toISOString().slice(0,10);
  $('cdf-start').value = iso;
  var t = new Date(); t.setDate(t.getDate());
  $('cdf-start').min = t.toISOString().slice(0,10);
}

function onGroup(){
  var g = $('cdf-group').value; S.group = g;
  var sel = $('cdf-sub'), html = '<option value="">— Chọn —</option>', needSeats = false;
  if(g==='nkd'){ for(var k in NKD) html += '<option value="'+k+'">'+NKD[k].t+'</option>'; }
  else if(g==='kd'){
    html += '<option value="kdseat">Xe chở người kinh doanh — theo số chỗ</option>';
    html += '<option value="kdpickup">Pickup / minivan kinh doanh vận tải</option>';
  }
  else if(g==='tai'){ for(var k2 in TAI) html += '<option value="'+k2+'">'+TAI[k2].t+'</option>'; }
  else if(g==='khac'){ for(var k3 in KHAC) html += '<option value="'+k3+'">'+KHAC[k3].t+'</option>'; }
  sel.innerHTML = html; sel.value=''; S.sub='';
  $('cdwrap-seats').style.display = 'none';
  calc();
}

function pickTerm(el){
  var c = document.querySelectorAll('#cdchips .chip');
  for(var i=0;i<c.length;i++) c[i].classList.remove('on');
  el.classList.add('on');
  S.years = parseInt(el.getAttribute('data-y'),10) || 1;
  calc();
}

/* tính phí gốc 1 năm theo lựa chọn hiện tại */
function phiNam(){
  S.note = '';
  if(S.veh === 'moto'){
    var m = MOTO[ val('cdf-moto') ];
    if(!m) return 0;
    S.label = m.t; return m.f;
  }
  var g = $('cdf-group') ? $('cdf-group').value : '';
  var sub = val('cdf-sub');
  S.sub = sub;
  if(!g || !sub) return 0;

  if(g==='nkd'){ S.label = NKD[sub].t; return NKD[sub].f; }
  if(g==='tai'){ S.label = TAI[sub].t; return TAI[sub].f; }

  if(g==='kd'){
    if(sub==='kdpickup'){ S.label='Pickup / minivan kinh doanh vận tải'; return 933000; }
    if(sub==='kdseat'){
      $('cdwrap-seats').style.display='block';
      var s = val('cdf-seats');
      if(!s) return 0;
      S.label = 'Xe kinh doanh vận tải ' + s + ' chỗ';
      if(parseInt(s,10) > 25) S.note = 'Trên 25 chỗ: 4.813.000 + 30.000 × (' + s + ' − 25)';
      return phiKD(s);
    }
  }

  if(g==='khac'){
    var o = KHAC[sub];
    if(!o) return 0;
    S.label = o.t; S.note = o.note;
    if(o.seats){
      $('cdwrap-seats').style.display='block';
      var sq = val('cdf-seats');
      if(!sq) return 0;
      S.label = o.t + ' — ' + sq + ' chỗ';
      var b = (o.base==='kdseat') ? phiKD(sq) : phiNkdTheoCho(sq);
      return Math.round(b * o.k);
    }
    return Math.round(o.base * o.k);
  }
  return 0;
}

function calc(){
  /* hiện/ẩn ô số chỗ */
  var g = $('cdf-group') ? $('cdf-group').value : '', sub = val('cdf-sub');
  var needSeats = (S.veh==='oto') && ((g==='kd' && sub==='kdseat') || (g==='khac' && KHAC[sub] && KHAC[sub].seats));
  $('cdwrap-seats').style.display = needSeats ? 'block' : 'none';

  var base = phiNam();
  S.phiGoc = Math.round(base * S.years);
  S.vat    = Math.round(S.phiGoc * 0.10);
  S.tong   = S.phiGoc + S.vat;
  S.start  = val('cdf-start');

  var box = $('cdfee');
  if(!base){
    box.className = 'fee empty';
    box.innerHTML = '<div class="fee-lbl">Phí bảo hiểm</div><div class="fee-num">Chọn đủ thông tin để xem phí</div>';
    $('cdcov').style.display='none';
    $('cdb1').disabled = true;
  }else{
    box.className = 'fee';
    box.innerHTML =
      '<div class="fee-lbl">Tổng phí phải trả · '+S.years+' năm</div>'+
      '<div class="fee-num">'+VND(S.tong)+'</div>'+
      '<div class="fee-rows">'+
        '<div class="fee-row"><span>Phí bảo hiểm ('+VND(base)+'/năm × '+S.years+')</span><b>'+VND(S.phiGoc)+'</b></div>'+
        '<div class="fee-row"><span>Thuế GTGT 10%</span><b>'+VND(S.vat)+'</b></div>'+
      '</div>'+
      '<div class="fee-note">'+(S.note? S.note+'<br>' : '')+'Biểu phí Nhà nước quy định tại Phụ lục I, Nghị định 67/2023/NĐ-CP — mọi công ty bảo hiểm đều bán cùng mức phí này.</div>';
    $('cdcov').style.display='grid';
    $('cdb1').disabled = !S.start;
  }
  drawSummary();
}

function hetHan(){
  if(!S.start) return '';
  var d = new Date(S.start);
  d.setFullYear(d.getFullYear() + S.years);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('vi-VN');
}
function ngayVN(iso){ return iso ? new Date(iso).toLocaleDateString('vi-VN') : ''; }

function drawSummary(){
  var r = $('cdsum-rows');
  if(!S.tong){ r.innerHTML = '<div class="sum-empty">Chọn loại xe để bắt đầu</div>'; $('cdsum-tot').textContent='0 đ'; return; }
  var h = '';
  h += '<div class="sum-r"><span>Sản phẩm</span><b>TNDS bắt buộc</b></div>';
  h += '<div class="sum-r"><span>Loại xe</span><b>'+S.label+'</b></div>';
  h += '<div class="sum-r"><span>Thời hạn</span><b>'+S.years+' năm</b></div>';
  if(S.start) h += '<div class="sum-r"><span>Hiệu lực</span><b>'+ngayVN(S.start)+' → '+hetHan()+'</b></div>';
  if(val('cdf-plate')) h += '<div class="sum-r"><span>Biển số</span><b>'+val('cdf-plate')+'</b></div>';
  if(val('cdf-name'))  h += '<div class="sum-r"><span>Chủ xe</span><b>'+val('cdf-name')+'</b></div>';
  h += '<div class="sum-r"><span>Phí bảo hiểm</span><b>'+VND(S.phiGoc)+'</b></div>';
  h += '<div class="sum-r"><span>VAT 10%</span><b>'+VND(S.vat)+'</b></div>';
  r.innerHTML = h;
  $('cdsum-tot').textContent = VND(S.tong);
}

/* ══════════ ĐIỀU HƯỚNG ══════════ */
function go(n){
  if(n===2 && !S.tong) return;
  if(n===3 && !validVeh()) return;
  if(n===4 && !validOwner()) return;

  var p=[1,2,3,4,5];
  for(var i=0;i<p.length;i++){ var el=$('cdp'+p[i]); if(el) el.classList.remove('on'); }
  $('cdp'+n).classList.add('on');

  var st = document.querySelectorAll('#cdsteps .cd-step');
  for(var j=0;j<st.length;j++){
    var s = parseInt(st[j].getAttribute('data-s'),10);
    st[j].classList.toggle('on', s===n);
    st[j].classList.toggle('done', s<n);
  }
  if(n===4){ buildReview(); makeQR(); startClock(); }
  drawSummary();
  var top = document.querySelector('.cd-wrap');
  if(top) window.scrollTo({ top: top.offsetTop - 12, behavior:'smooth' });
}

function mark(id, ok){
  var e=$(id); if(!e) return ok;
  e.classList.toggle('err', !ok);
  if(e.parentNode) e.parentNode.classList.toggle('bad', !ok);
  return ok;
}
function validVeh(){
  var ok = true;
  /* Chỉ thu 8 ký tự cuối của số khung / số máy. Cho phép 6–8 để không chặn
     nhầm những xe có dãy số ngắn hơn 8 ký tự. */
  var re8 = /^[A-Za-z0-9]{6,8}$/;
  ok = mark('cdf-vin', re8.test(val('cdf-vin').replace(/[\s.\-]/g,''))) && ok;
  ok = mark('cdf-eng', re8.test(val('cdf-eng').replace(/[\s.\-]/g,''))) && ok;
  if(!ok){ var b=document.querySelector('#cdp2 .err'); if(b) b.focus(); }
  return ok;
}
function validOwner(){
  var ok = true;
  ok = mark('cdf-name', val('cdf-name').length >= 3) && ok;
  ok = mark('cdf-phone', /^0\d{8,10}$/.test(val('cdf-phone').replace(/[\s.\-]/g,''))) && ok;
  ok = mark('cdf-email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('cdf-email'))) && ok;
  if(!ok){ var b=document.querySelector('#cdp3 .err'); if(b) b.focus(); }
  return ok;
}
function toggleVat(){ $('cdvat-box').style.display = $('cdf-vat').checked ? 'block' : 'none'; }

/* ══════════ REVIEW ══════════ */
function row(l,v){ return v ? '<div class="rev-r"><span>'+l+'</span><b>'+v+'</b></div>' : ''; }
function buildReview(){
  $('cdrev-order').innerHTML =
    row('Sản phẩm','Bảo hiểm bắt buộc TNDS chủ xe cơ giới') +
    row('Loại xe', S.label) +
    row('Thời hạn', S.years + ' năm') +
    row('Hiệu lực', ngayVN(S.start) + ' → ' + hetHan()) +
    row('Phí bảo hiểm', VND(S.phiGoc)) +
    row('VAT 10%', VND(S.vat)) +
    row('Tổng thanh toán', VND(S.tong));

  $('cdrev-veh').innerHTML =
    row('Biển kiểm soát', val('cdf-plate') || 'Chưa có biển số') +
    row('Số khung (8 số cuối)', val('cdf-vin')) +
    row('Số máy (8 số cuối)', val('cdf-eng')) +
    row('Hãng / dòng xe', val('cdf-brand')) +
    row('Năm sản xuất', val('cdf-year'));

  $('cdrev-own').innerHTML =
    row('Họ tên', val('cdf-name')) +
    row('Điện thoại', val('cdf-phone')) +
    row('Email', val('cdf-email')) +
    row('Địa chỉ', val('cdf-addr')) +
    ($('cdf-vat').checked ? row('Hoá đơn VAT', val('cdf-cty') + (val('cdf-mst') ? ' — MST ' + val('cdf-mst') : '')) : '');
}

/* ══════════ MÃ ĐƠN + QR ══════════ */
function maDon(){
  var d = new Date(), p = function(x){ return (x<10?'0':'')+x; };
  var stamp = String(d.getFullYear()).slice(2) + p(d.getMonth()+1) + p(d.getDate());
  var rnd = '';
  var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(var i=0;i<4;i++) rnd += A.charAt(Math.floor(Math.random()*A.length));
  return 'TNDS' + stamp + rnd;
}

function makeQR(){
  if(!S.code) S.code = maDon();
  /* Nội dung chuyển khoản: "TNDS <biển số>".
     Xe mới chưa có biển thì thay bằng mã đơn để chuyên viên vẫn đối soát được. */
  var plate = val('cdf-plate').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
  var info  = 'TNDS ' + (plate || S.code);

  var url = 'https://img.vietqr.io/image/' +
            encodeURIComponent(BANK.bankId) + '-' +
            encodeURIComponent(BANK.accountNo) + '-compact2.png' +
            '?amount=' + S.tong +
            '&addInfo=' + encodeURIComponent(info) +
            '&accountName=' + encodeURIComponent(BANK.accountNameQR || BANK.accountName);

  $('cdqr-img').src = url;
  $('cdqr-amt').textContent = VND(S.tong);
  $('cdqr-bank-name').textContent = BANK.bankName;
  $('cdqr-acc').textContent = BANK.accountNo;
  $('cdqr-owner').textContent = BANK.accountName;
  $('cdqr-info').textContent = info;

  /* lưu đơn ngay khi tạo QR — không mất lead nếu khách bỏ giữa chừng.
     Chỉ gửi một lần cho mỗi mã đơn, tránh trùng khi khách quay lại sửa. */
  if(!S.sent){ S.sent = true; send('Chờ thanh toán'); }
}

function cp(id, btn){
  var t = $(id).textContent;
  var done = function(){ var o=btn.textContent; btn.textContent='Đã copy'; setTimeout(function(){btn.textContent=o;},1400); };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done, done); }
  else{
    var ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta);
    ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); done();
  }
}

var clockT = null;
function startClock(){
  if(clockT) return;
  var left = QR_MINUTES * 60;
  var tick = function(){
    var m = Math.floor(left/60), s = left%60;
    $('cdqr-clock').textContent = m + ':' + (s<10?'0':'') + s;
    if(left <= 0){
      clearInterval(clockT); clockT=null;
      $('cdqr-clock').textContent = 'đã hết hạn';
      var w = document.querySelector('.qr-timer');
      if(w) w.innerHTML = 'Mã đã hết hạn — <a href="javascript:CD.refreshQR()" style="color:var(--g);font-weight:800;text-decoration:underline">tạo mã mới</a>';
      return;
    }
    left--;
  };
  tick(); clockT = setInterval(tick, 1000);
}
function refreshQR(){
  S.code=''; S.sent=false;
  if(clockT){ clearInterval(clockT); clockT=null; }
  var w = document.querySelector('.qr-timer');
  if(w) w.innerHTML = 'Mã có hiệu lực trong <b id="cdqr-clock">15:00</b>';
  makeQR(); startClock();
}

/* ══════════ GỬI ĐƠN ══════════ */
function payload(status){
  return {
    'form-name'   : 'dbv-capdon-tnds',
    'ma-don'      : S.code,
    'san-pham'    : 'Bảo hiểm bắt buộc TNDS chủ xe cơ giới',
    'loai-xe'     : S.veh === 'moto' ? 'Xe máy / mô tô' : 'Ô tô',
    'nhom-xe'     : S.group || (S.veh==='moto' ? 'moto' : ''),
    'chi-tiet-xe' : S.label,
    'so-cho'      : val('cdf-seats'),
    'thoi-han'    : S.years + ' năm',
    'phi-goc'     : String(S.phiGoc),
    'vat'         : String(S.vat),
    'tong-phi'    : String(S.tong),
    'bien-so'     : val('cdf-plate'),
    'so-khung'    : val('cdf-vin'),
    'so-may'      : val('cdf-eng'),
    'hieu-xe'     : val('cdf-brand'),
    'nam-sx'      : val('cdf-year'),
    'ngay-hieu-luc': ngayVN(S.start),
    'ngay-het-han': hetHan(),
    'ho-ten'      : val('cdf-name'),
    'sdt'         : val('cdf-phone'),
    'email'       : val('cdf-email'),
    'dia-chi'     : val('cdf-addr'),
    'xuat-hoa-don': $('cdf-vat').checked ? 'Có' : 'Không',
    'ten-cty'     : val('cdf-cty'),
    'mst'         : val('cdf-mst'),
    'dia-chi-cty' : val('cdf-ctyaddr'),
    'email-hd'    : val('cdf-emailhd'),
    'dia-chi-giao': val('cdf-ship'),
    'nguoi-nhan'  : val('cdf-shipname'),
    'sdt-nhan'    : val('cdf-shipphone'),
    'trang-thai'  : status,
    'ma-ctv'      : maCtvHienTai(),
    'nguon-ghi-nhan': NGUON,
    'ghi-chu'     : val('cdf-note')
  };
}
function send(status){
  try{
    fetch('/', {
      method : 'POST',
      headers: { 'Content-Type':'application/x-www-form-urlencoded' },
      body   : new URLSearchParams(payload(status)).toString()
    }).catch(function(){});
  }catch(e){}
  try{
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event:'tnds_capdon', trang_thai:status, ma_don:S.code,
      gia_tri:S.tong, loai_xe:S.label
    });
  }catch(e){}
}

/* Khách điền địa chỉ nhận bản giấy sau khi đã báo chuyển khoản.
   Gửi thành một bản ghi riêng cùng mã đơn để bộ phận phát hành biết cần in
   và chuyển phát; không chặn luồng nếu khách bỏ qua. */
function guiDiaChi(){
  var a = val('cdf-ship');
  if(!a){ mark('cdf-ship', false); $('cdf-ship').focus(); return; }
  mark('cdf-ship', true);
  var b = $('cdb5');
  b.disabled = true; b.textContent = 'Đang gửi...';
  send('Đăng ký nhận bản giấy');
  $('cdok-ship-done').style.display = 'block';
  b.style.display = 'none';
}

function finish(){
  var b = $('cdb4');
  b.disabled = true; b.textContent = 'Đang gửi...';
  send('Khách báo đã chuyển khoản');
  setTimeout(function(){
    $('cdok-code').textContent  = S.code;
    $('cdok-email').textContent = val('cdf-email');
    $('cdok-phone').textContent = val('cdf-phone');
    $('cdok-zalo').href = ZALO;
    go(5);
    if(clockT){ clearInterval(clockT); clockT=null; }
  }, 500);
}

/* ══════════════════════════════════════════════════════════════════════════
   GHI NHẬN CỘNG TÁC VIÊN
   ──────────────────────────────────────────────────────────────────────────
   Thứ tự ưu tiên, đúng theo mục 2A.1 của đặc tả:
     1. Mã khách TỰ NHẬP vào ô "Mã giới thiệu"  → thắng tất cả
     2. Tham số ?ctv= trên URL                  → khách vừa bấm link
     3. Cookie dbv_ctv                          → đã bấm link trước đó, 30 ngày
     4. Không có                                → đơn thuộc DBV

   Cookie do HÀM MÁY CHỦ /r/<MÃ> đặt bằng Set-Cookie, KHÔNG đặt bằng
   document.cookie. Safari ITP cắt cookie do JavaScript đặt xuống còn 7 ngày —
   công bố 30 ngày với CTV mà thực tế 7 ngày trên mọi iPhone là thất thoát im
   lặng, không log, không ai biết.

   Cookie KHÔNG đặt cờ HttpOnly (khác đặc tả bản 2.4): giá trị bên trong chỉ là
   mã công khai 4 ký tự, vốn đã nằm trong link giới thiệu và sẽ nằm trong nội
   dung chuyển khoản. Để JavaScript đọc được thì điền sẵn được vào ô mã giới
   thiệu mà không phải gọi thêm máy chủ.
   ══════════════════════════════════════════════════════════════════════════ */

var COOKIE_CTV = 'dbv_ctv';
var NGUON = '';   /* nhánh nào trong 2A.1 đã quyết — gửi kèm đơn để xử khiếu nại */

function docCookie(ten){
  var m = document.cookie.match(new RegExp('(?:^|; )' + ten + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

function chuanHoaMa(v){
  return String(v || '').toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 4);
}

/* Đặt cookie từ trình duyệt — CHỈ dùng khi khách vào bằng ?ctv= mà không qua
   /r/. Trường hợp này cookie sống ngắn hơn trên Safari; chấp nhận vì đây là
   đường dự phòng, không phải đường chính. */
function datCookieDuPhong(ma){
  try{
    document.cookie = COOKIE_CTV + '=' + encodeURIComponent(ma) +
      '; path=/; max-age=2592000; samesite=lax' +
      (location.protocol === 'https:' ? '; secure' : '');
  }catch(e){}
}

/* Hiện tên CTV để khách xác nhận đúng người giới thiệu. Không hiện số điện
   thoại — đó là dữ liệu cá nhân của CTV, không việc gì phải phơi cho khách. */
function hienTenCtv(ma){
  var o = $('cdctv-hint');
  if(!o) return;
  if(!ma){ o.textContent = 'Để trống nếu bạn tự tìm đến trang này.'; o.style.color = ''; return; }
  o.textContent = 'Đang kiểm tra mã…'; o.style.color = '';
  fetch('/.netlify/functions/ctv-ten?ma=' + encodeURIComponent(ma))
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d && d.ho_ten){
        o.textContent = 'Người giới thiệu: ' + d.ho_ten;
        o.style.color = 'var(--g)';
      }else{
        o.textContent = 'Không tìm thấy mã này. Kiểm tra lại hoặc để trống.';
        o.style.color = 'var(--do, #D92D20)';
      }
    })
    .catch(function(){ o.textContent = 'Chưa kiểm tra được mã, đơn vẫn gửi được bình thường.'; });
}

/* Mã dùng cho đơn, tính lại mỗi lần gửi để khách sửa tay là ăn ngay */
function maCtvHienTai(){
  var o = $('cdf-ctv');
  var tay = chuanHoaMa(o ? o.value : '');
  if(tay){ NGUON = (tay === maTuLink) ? (nguonLink || 'khach_tu_nhap') : 'khach_tu_nhap'; return tay; }
  NGUON = '';
  return '';
}

var maTuLink = '';
var nguonLink = '';

function khoiTaoGhiNhan(){
  var o = $('cdf-ctv');
  if(!o) return;

  var q = '';
  try{ q = chuanHoaMa(new URLSearchParams(location.search).get('ctv')); }catch(e){}

  if(q){
    maTuLink = q; nguonLink = 'tham_so_url';
    datCookieDuPhong(q);
  }else{
    var c = chuanHoaMa(docCookie(COOKIE_CTV));
    if(c){ maTuLink = c; nguonLink = 'cookie_link'; }
  }

  if(maTuLink){ o.value = maTuLink; hienTenCtv(maTuLink); }

  var goTre = null;
  o.addEventListener('input', function(){
    this.value = chuanHoaMa(this.value);
    var v = this.value;
    if(goTre) clearTimeout(goTre);
    goTre = setTimeout(function(){ hienTenCtv(v); }, 400);
  });
}

/* ══════════ KHỞI TẠO ══════════ */

/* Loại xe mở sẵn khi vào trang.
   Ưu tiên: ?loai=moto trên URL  →  data-loai-xe trên <section id="cap-don">.
   Nhờ vậy trang bảo hiểm xe máy mở sẵn tab xe máy, trang ô tô mở sẵn ô tô,
   mà vẫn dùng chung đúng một bộ mã. */
function thamSo(ten){
  try{ return new URLSearchParams(location.search).get(ten) || ''; }catch(e){ return ''; }
}
function thuocTinh(ten){
  var sec = document.getElementById('cap-don');
  return (sec && sec.getAttribute(ten)) || '';
}

function loaiXeMacDinh(){
  var q = thamSo('loai');
  if(q === 'moto' || q === 'oto') return q;
  var v = thuocTinh('data-loai-xe');
  return (v === 'moto' || v === 'oto') ? v : '';
}

/* Trang landing theo từ khoá quảng cáo chọn sẵn tới tận loại xe cụ thể, để phí
   hiện ngay khi mở trang. Khách vẫn đổi được mọi lựa chọn — đây chỉ là điểm
   xuất phát. Ví dụ trang "xe 5 chỗ": data-nhom="nkd" data-chi-tiet="d6". */
function chonSanChiTiet(){
  var nhom = thamSo('nhom') || thuocTinh('data-nhom');
  if(!nhom) return;
  var g = $('cdf-group');
  if(!g) return;
  g.value = nhom;
  if(g.value !== nhom) return;        /* nhóm không tồn tại thì thôi */
  onGroup();

  var ct = thamSo('chi_tiet') || thuocTinh('data-chi-tiet');
  if(!ct) return;
  var sub = $('cdf-sub');
  if(!sub) return;
  sub.value = ct;
  if(sub.value !== ct) return;        /* loại xe không tồn tại thì thôi */
  calc();
}

(function(){
  setDefaultDate();
  var live = ['cdf-plate','cdf-name'];
  for(var i=0;i<live.length;i++){
    var e=$(live[i]); if(e) e.addEventListener('input', drawSummary);
  }
  /* viết hoa biển số cho gọn */
  var pl=$('cdf-plate');
  if(pl) pl.addEventListener('blur', function(){ this.value = this.value.toUpperCase(); drawSummary(); });
  var vin=$('cdf-vin');
  if(vin) vin.addEventListener('blur', function(){ this.value = this.value.toUpperCase(); });

  var md = loaiXeMacDinh();
  if(md){ pickVeh(md); if(md === 'oto') chonSanChiTiet(); }

  khoiTaoGhiNhan();
})();
window.CD = { pickVeh:pickVeh, onGroup:onGroup, calc:calc, pickTerm:pickTerm, guiDiaChi:guiDiaChi,
              go:go, toggleVat:toggleVat, cp:cp, finish:finish, refreshQR:refreshQR };
})();
