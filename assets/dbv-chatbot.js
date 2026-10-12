/* DBV247 – Khung chat tư vấn (widget)
   ---------------------------------------------------------------------------
   Nhúng bằng 1 dòng ở cuối trang:
       <script src="/assets/dbv-chatbot.js" defer></script>

   Tự chèn CSS + HTML nên không phải sửa gì trong từng trang, hợp với việc
   website có nhiều trang tin tức thêm liên tục.

   Toàn bộ phần gọi AI nằm ở /.netlify/functions/chat — khoá API không bao giờ
   xuống trình duyệt.
*/
(function () {
  "use strict";
  if (window.__dbvChatLoaded) return;
  window.__dbvChatLoaded = true;

  var API_CHAT = "/.netlify/functions/chat";
  var API_LEAD = "/.netlify/functions/chat-lead";
  var API_VOTE = "/.netlify/functions/chat-danh-gia";

  /* Mã phiên chat (ngẫu nhiên, chỉ sống trong tab này) — để ghép các câu của cùng
     một cuộc chat trong nhật ký và gắn đánh giá 👍/👎. Không chứa thông tin cá nhân. */
  var SID = (function () {
    var k = "dbvchat-sid", v = "";
    try { v = sessionStorage.getItem(k) || ""; } catch (e) {}
    if (!/^[a-z0-9]{16}$/.test(v)) {
      v = "";
      for (var i = 0; i < 16; i++) v += "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36));
      try { sessionStorage.setItem(k, v); } catch (e) {}
    }
    return v;
  })();

  /* Mã cộng tác viên do /r/<MÃ> đặt vào cookie ở cấp tên miền. */
  function maCtvTuCookie() {
    try {
      var m = document.cookie.match(/(?:^|; )dbv_ctv=([^;]*)/);
      return m ? decodeURIComponent(m[1]).toUpperCase()
        .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 4) : '';
    } catch (e) { return ''; }
  }
  var HOTLINE = "0869656561";
  var MAX_LEN = 600;

  var history = [];      // [{role:'user'|'bot', text}]
  var busy = false;
  var leadSent = false;
  var leadAn = false;    // khách bấm "để sau" → thanh xin số ẩn tới khi bot mời lại
  var opened = false;

  var GREETING =
    "Chào anh/chị, em là trợ lý của DBV247. Anh/chị đang cần bảo hiểm cho gì ạ — xe, nhà/tài sản, " +
    "hàng hóa, công trình hay con người? Em giải đáp nhanh và ghi lại nhu cầu, để tư vấn viên gọi " +
    "báo phí chính xác mà anh/chị không phải kể lại từ đầu.";

  var SUGGESTS = [
    "Bảo hiểm vật chất ô tô gồm những gì?",
    "Phí bảo hiểm TNDS bắt buộc ô tô bao nhiêu?",
    "Thủ tục khai báo bồi thường thế nào?",
    "Bảo hiểm DBV có uy tín không?",
  ];

  /* ── CSS ──────────────────────────────────────────────────────────────── */
  var css = [
    /* Nền trắng viền xanh: mascot màu xanh lá đặt trên nút xanh thì chìm nghỉm,
       còn trắng trơn thì mất hút trên các khối nội dung nền trắng của trang. */
    "#dbvchat-btn{position:fixed;right:20px;bottom:56px;z-index:395;width:58px;height:58px;border-radius:var(--radius-circle,50%);",
      "border:3px solid #007437;cursor:pointer;background:#fff;overflow:hidden;",
      "box-shadow:0 6px 20px rgba(0,116,55,.32);display:flex;align-items:center;justify-content:center;",
      "transition:transform .2s,box-shadow .2s;padding:0}",
    "#dbvchat-btn:hover{transform:scale(1.07);box-shadow:0 8px 26px rgba(0,116,55,.45)}",
    "#dbvchat-btn:focus-visible{outline:3px solid #E8920A;outline-offset:3px}",
    "#dbvchat-mascot{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none}",
    "#dbvchat-btn .dbvc-close{display:none}",
    "#dbvchat-btn.open #dbvchat-mascot{display:none}",
    "#dbvchat-btn.open .dbvc-close{display:block}",
    /* chấm đỏ mời chào, tắt khi đã mở lần đầu */
    "#dbvchat-dot{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:var(--radius-circle,50%);",
      "background:#E8920A;border:2px solid #fff;animation:dbvcPulse 2s infinite}",
    "@keyframes dbvcPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:.75}}",
    "@media(prefers-reduced-motion:reduce){#dbvchat-dot{animation:none}}",

    /* Lời chào cạnh nút chat. Đặt fixed riêng thay vì lồng trong nút vì nút là
       hình tròn có overflow bo góc — nhét bong bóng vào trong sẽ bị cắt. */
    "#dbvchat-hello{position:fixed;right:86px;bottom:65px;z-index:394;max-width:210px;",
      "background:#fff;border:1px solid #d7e6dd;border-radius:18px;padding:9px 30px 9px 15px;",
      "font-size:.82rem;line-height:1.35;color:#1C1C1C;cursor:pointer;",
      "box-shadow:0 4px 16px rgba(0,0,0,.13);opacity:0;transform:translateX(8px);",
      "transition:opacity .35s ease,transform .35s ease;pointer-events:none}",
    "#dbvchat-hello.show{opacity:1;transform:none;pointer-events:auto}",
    "#dbvchat-hello:hover{border-color:#007437}",
    /* Mũi nhọn chỉ sang nút chat: 2 lớp để có viền mảnh giống bong bóng */
    "#dbvchat-hello::before,#dbvchat-hello::after{content:'';position:absolute;top:50%;",
      "margin-top:-7px;border:7px solid transparent;border-left-width:8px}",
    "#dbvchat-hello::before{right:-16px;border-left-color:#d7e6dd}",
    "#dbvchat-hello::after{right:-14px;border-left-color:#fff}",
    "#dbvchat-hello b{display:block;font-weight:700;color:var(--g,#007437);margin-bottom:1px}",
    "#dbvchat-hellox{position:absolute;top:4px;right:5px;width:19px;height:19px;border:none;",
      "background:#f1f5f2;color:#718096;border-radius:var(--radius-circle,50%);cursor:pointer;padding:0;line-height:0;",
      "display:flex;align-items:center;justify-content:center}",
    "#dbvchat-hellox:hover{background:#e2e8f0;color:#1C1C1C}",

    "#dbvchat-panel{position:fixed;right:20px;bottom:122px;z-index:396;width:370px;max-width:calc(100vw - 32px);",
      "height:520px;max-height:calc(100vh - 190px);background:#fff;border-radius:var(--radius-panel,24px);",
      "box-shadow:0 16px 50px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;",
      "font-family:inherit;border:1px solid #E2E8F0}",
    "#dbvchat-panel.show{display:flex}",

    "#dbvchat-head{background:linear-gradient(135deg,#007437,#005a2b);color:#fff;padding:13px 16px;",
      "display:flex;align-items:center;gap:10px;flex-shrink:0}",
    "#dbvchat-head .dbvc-av{width:36px;height:36px;border-radius:var(--radius-circle,50%);background:#fff;",
      "display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}",
    "#dbvchat-head .dbvc-av img{width:100%;height:100%;object-fit:contain;display:block}",
    "#dbvchat-head b{font-size:.92rem;display:block;line-height:1.3}",
    "#dbvchat-head span{font-size:.72rem;opacity:.85;display:flex;align-items:center;gap:5px}",
    "#dbvchat-head i{width:7px;height:7px;border-radius:var(--radius-circle,50%);background:#4ade80;display:inline-block}",
    "#dbvchat-min{margin-left:auto;background:none;border:none;color:#fff;cursor:pointer;padding:4px;",
      "border-radius:6px;line-height:0;opacity:.9}",
    "#dbvchat-min:hover{background:rgba(255,255,255,.15)}",

    "#dbvchat-body{flex:1;overflow-y:auto;padding:14px;background:#f7faf8;",
      "display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}",
    ".dbvc-msg{max-width:85%;padding:9px 13px;border-radius:14px;font-size:.855rem;line-height:1.55;",
      "word-wrap:break-word;white-space:pre-wrap}",
    ".dbvc-bot{background:#fff;color:#1C1C1C;border:1px solid #E2E8F0;border-bottom-left-radius:4px;align-self:flex-start}",
    ".dbvc-user{background:#007437;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}",
    ".dbvc-err{background:#fff5f5;color:#9b2c2c;border:1px solid #feb2b2;align-self:flex-start;max-width:92%}",
    ".dbvc-msg a{color:#007437;font-weight:600;text-decoration:underline}",
    ".dbvc-user a{color:#fff}",

    ".dbvc-typing{align-self:flex-start;background:#fff;border:1px solid #E2E8F0;border-radius:14px;",
      "padding:11px 14px;display:flex;gap:4px}",
    ".dbvc-typing s{width:6px;height:6px;border-radius:var(--radius-circle,50%);background:#a0aec0;display:block;",
      "animation:dbvcBounce 1.3s infinite}",
    ".dbvc-typing s:nth-child(2){animation-delay:.18s}",
    ".dbvc-typing s:nth-child(3){animation-delay:.36s}",
    "@keyframes dbvcBounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}",

    "#dbvchat-sug{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;background:#f7faf8;flex-shrink:0}",
    "#dbvchat-sug button{background:#fff;border:1px solid #cbe5d5;color:#007437;font-size:.74rem;",
      "font-weight:600;padding:6px 11px;border-radius:20px;cursor:pointer;font-family:inherit;text-align:left}",
    "#dbvchat-sug button:hover{background:#e8f5e9;border-color:#007437}",

    /* Thanh xin số điện thoại — GỌN: 1 dòng mảnh, bấm mới mở ô nhập.
       Khách cũng có thể gõ số thẳng vào ô chat (tự nhận ra là số điện thoại). */
    "#dbvchat-lead{display:none;border-top:1px solid #f3e3c3;background:#fffaf0;flex-shrink:0}",
    "#dbvchat-lead.show{display:block}",
    "#dbvchat-leadopen{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;padding:8px 14px;",
      "font-family:inherit;font-size:.78rem;font-weight:600;color:#8a5a00;cursor:pointer;text-align:left}",
    "#dbvchat-leadopen:hover{background:#fff3dc}",
    "#dbvchat-leadopen svg{flex-shrink:0}",
    "#dbvchat-leadopen span{flex:1}",
    "#dbvchat-leadopen b{font-weight:700;color:#E8920A}",
    "#dbvchat-leadrow{display:none;align-items:center;gap:6px;padding:7px 10px 7px 14px}",
    "#dbvchat-lead.mo #dbvchat-leadopen{display:none}",
    "#dbvchat-lead.mo #dbvchat-leadrow{display:flex}",
    "#dbvchat-leadrow input{flex:1;min-width:0;height:36px;padding:0 11px;border:1px solid #E2E8F0;border-radius:10px;",
      "font-size:.88rem;font-family:inherit;background:#fff}",
    "#dbvchat-leadrow input:focus{outline:none;border-color:#007437;box-shadow:0 0 0 2px rgba(0,116,55,.15)}",
    "#dbvchat-leadbtn{height:36px;background:#E8920A;color:#1C1C1C;border:none;border-radius:10px;padding:0 14px;",
      "font-weight:700;font-size:.82rem;cursor:pointer;font-family:inherit;white-space:nowrap}",
    "#dbvchat-leadbtn:hover{background:#d88508}",
    "#dbvchat-leadbtn:disabled{opacity:.6;cursor:default}",
    "#dbvchat-leadx{width:28px;height:28px;border:0;background:none;color:#a0aec0;cursor:pointer;border-radius:8px;padding:0;",
      "display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    "#dbvchat-leadx:hover{background:#f6ead2;color:#744210}",
    "#dbvchat-leadmsg{font-size:.72rem;margin:0;padding:0 14px 7px;line-height:1.4;color:#9b2c2c}",
    "#dbvchat-note a{color:inherit}",

    /* Đánh giá câu trả lời */
    ".dbvc-vote{align-self:flex-start;display:flex;align-items:center;gap:4px;margin:-4px 0 0 4px;font-size:.7rem;color:#718096}",
    ".dbvc-vote button{border:1px solid #E2E8F0;background:#fff;border-radius:8px;width:30px;height:26px;padding:0;cursor:pointer;",
      "display:flex;align-items:center;justify-content:center;color:#718096}",
    ".dbvc-vote button:hover{border-color:#007437;color:#007437}",
    ".dbvc-vote button:focus-visible{outline:2px solid #E8920A;outline-offset:1px}",
    "#dbvchat-foot{padding:9px 11px;border-top:1px solid #E2E8F0;background:#fff;flex-shrink:0}",
    "#dbvchat-form{display:flex;gap:7px;align-items:flex-end}",
    "#dbvchat-input{flex:1;min-width:0;border:1px solid #E2E8F0;border-radius:20px;padding:9px 14px;",
      "font-size:.86rem;font-family:inherit;resize:none;max-height:88px;line-height:1.45}",
    "#dbvchat-input:focus{outline:none;border-color:#007437;box-shadow:0 0 0 2px rgba(0,116,55,.15)}",
    "#dbvchat-send{background:#007437;border:none;border-radius:var(--radius-circle,50%);width:36px;height:36px;flex-shrink:0;",
      "cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}",
    "#dbvchat-send:hover{background:#005a2b}",
    "#dbvchat-send:disabled{opacity:.45;cursor:default}",
    "#dbvchat-note{font-size:.66rem;color:#718096;text-align:center;margin:6px 0 0;line-height:1.4}",

    /* Chế độ "gắn vào trang" (banner AI trang chủ desktop): khung chat nằm trong
       một phần tử của trang thay vì nổi góc phải. Ghi đè vị trí fixed. */
    "#dbvchat-panel.dbvc-docked{position:relative;right:auto;bottom:auto;left:auto;top:auto;z-index:2;",
      "width:100%;max-width:none;height:100%;max-height:none;box-shadow:0 18px 44px rgba(8,76,56,.22);",
      "animation:dbvcDock .35s ease}",
    "@keyframes dbvcDock{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}",
    "@media(prefers-reduced-motion:reduce){#dbvchat-panel.dbvc-docked{animation:none}}",
    "body.dbvc-dang-gan #dbvchat-btn,body.dbvc-dang-gan #dbvchat-hello{display:none!important}",
    /* Mobile: nhường chỗ cho thanh CTA dưới đáy, tránh đè lên nhau */
    "@media(max-width:640px){",
      "#dbvchat-btn{width:50px;height:50px;right:14px;bottom:66px}",
      "#dbvchat-panel{right:8px;left:8px;width:auto;bottom:66px;height:auto;top:66px;max-height:none;border-radius:var(--radius-panel,20px)}",
      "#dbvchat-hello{right:72px;bottom:74px;max-width:168px;font-size:.75rem;padding:7px 26px 7px 12px}",
    "}",
    // Màn hình quá hẹp thì bong bóng lấn hết bề ngang, thà bỏ đi
    "@media(max-width:340px){#dbvchat-hello{display:none}}",
  ].join("");

  /* ── Dựng khung ───────────────────────────────────────────────────────── */
  var st = document.createElement("style");
  st.id = "dbvchat-css";
  st.textContent = css;
  document.head.appendChild(st);

  var wrap = document.createElement("div");
  wrap.innerHTML =
    '<button id="dbvchat-btn" type="button" aria-label="Mở khung chat tư vấn" aria-expanded="false">' +
      '<span id="dbvchat-dot"></span>' +
      '<img id="dbvchat-mascot" src="/mascot-chat.webp" alt="" width="52" height="52" aria-hidden="true">' +
      '<svg class="dbvc-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007437" stroke-width="2.8" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M18 6 6 18M6 6l12 12"/></svg>' +
    '</button>' +
    '<div id="dbvchat-hello" role="button" tabindex="0" aria-label="Mở khung chat tư vấn">' +
      '<b>Xin chào!</b>Anh/chị cần tư vấn bảo hiểm gì ạ?' +
      '<button id="dbvchat-hellox" type="button" aria-label="Ẩn lời chào">' +
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div id="dbvchat-panel" role="dialog" aria-label="Chat tư vấn DBV247" aria-modal="false">' +
      '<div id="dbvchat-head">' +
        '<div class="dbvc-av">' +
          '<img src="/mascot-chat.webp" alt="" width="34" height="34" aria-hidden="true">' +
        '</div>' +
        '<div><b>Trợ lý DBV247</b><span><i></i>Thường trả lời ngay</span></div>' +
        '<button id="dbvchat-min" type="button" aria-label="Thu nhỏ khung chat">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 12h12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div id="dbvchat-body" role="log" aria-live="polite" aria-atomic="false"></div>' +
      '<div id="dbvchat-sug"></div>' +
      '<div id="dbvchat-lead">' +
        '<button id="dbvchat-leadopen" type="button">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8920A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>' +
          '<span>Để số, tư vấn viên gọi <b>báo phí chính xác</b></span>' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>' +
        '</button>' +
        '<div id="dbvchat-leadrow">' +
          '<input id="dbvchat-phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="Số điện thoại của anh/chị" aria-label="Số điện thoại">' +
          '<button id="dbvchat-leadbtn" type="button">Gọi tôi</button>' +
          '<button id="dbvchat-leadx" type="button" aria-label="Để sau">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</div>' +
        '<p id="dbvchat-leadmsg" hidden></p>' +
      '</div>' +
      '<div id="dbvchat-foot">' +
        '<form id="dbvchat-form">' +
          '<textarea id="dbvchat-input" rows="1" placeholder="Nhập câu hỏi..." maxlength="' + MAX_LEN + '" aria-label="Câu hỏi của bạn"></textarea>' +
          '<button id="dbvchat-send" type="submit" aria-label="Gửi câu hỏi">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>' +
          '</button>' +
        '</form>' +
        '<p id="dbvchat-note">Trợ lý tự động, thông tin tham khảo. Gửi số điện thoại là đồng ý ' +
          '<a href="/chinh-sach-bao-mat" target="_blank" rel="noopener">chính sách bảo mật</a>. ' +
          'Gọi <a href="tel:' + HOTLINE + '">0869 656 561</a>.</p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);

  var $ = function (id) { return document.getElementById(id); };
  var btn = $("dbvchat-btn"), panel = $("dbvchat-panel"), body = $("dbvchat-body"),
      sug = $("dbvchat-sug"), form = $("dbvchat-form"), input = $("dbvchat-input"),
      send = $("dbvchat-send"), leadBox = $("dbvchat-lead"), dot = $("dbvchat-dot"),
      hello = $("dbvchat-hello");

  /* ── Lời chào cạnh nút chat ───────────────────────────────────────────── */

  function hideHello() {
    if (hello) { hello.classList.remove("show"); }
  }

  // Khách đã bấm tắt thì không chào lại trong phiên duyệt web này nữa. Sang
  // lần truy cập sau mới hiện lại — chào mãi sau khi bị tắt là phiền.
  var helloOff = false;
  try { helloOff = sessionStorage.getItem("dbvchat-hello-off") === "1"; } catch (e) {}

  if (hello && !helloOff) {
    // Chờ một nhịp cho trang tải xong, bong bóng trượt ra mới thấy chuyển động
    setTimeout(function () {
      if (panel.classList.contains("show")) return;
      hello.classList.add("show");

      /* Trên điện thoại bong bóng chiếm gần nửa bề ngang màn hình. Mời chào thì
         cần, nhưng chiếm chỗ mãi thì phiền — nên tự thu lại sau 8 giây, nút chat
         tròn vẫn còn đó. Desktop thừa chỗ nên để nguyên. */
      if (window.matchMedia("(max-width:640px)").matches) {
        setTimeout(hideHello, 8000);
      }
    }, 1200);
  }

  if (hello) {
    hello.onclick = function (e) {
      if (e.target.closest("#dbvchat-hellox")) return;
      toggle(true);
    };
    hello.onkeydown = function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(true); }
    };
    $("dbvchat-hellox").onclick = function (e) {
      e.stopPropagation();
      hideHello();
      try { sessionStorage.setItem("dbvchat-hello-off", "1"); } catch (err) {}
    };
  }

  /* ── Hiển thị tin nhắn ────────────────────────────────────────────────── */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Mô hình trả lời có markdown nhẹ. Chỉ dựng lại đúng 3 thứ cần thiết
     (in đậm, liên kết, gạch đầu dòng) sau khi đã escape — không nhét thẳng
     HTML từ mô hình vào trang. */
  function render(text) {
    var h = esc(text);
    h = h.replace(/\[([^\]]+)\]\((\/[^)\s]*|https?:\/\/[^)\s]+)\)/g,
      function (m, label, url) {
        var ext = /^https?:/.test(url);
        return '<a href="' + url + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + '>' + label + "</a>";
      });
    h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/^\s*[-*]\s+/gm, "• ");
    // Dấu ** lẻ còn sót (khi câu trả lời bị cắt ngang) thì bỏ đi, để nguyên
    // thì khách nhìn thấy ký tự markdown thô ngay trong tin nhắn.
    h = h.replace(/\*\*/g, "");
    return h;
  }

  function add(role, text) {
    var d = document.createElement("div");
    d.className = "dbvc-msg " + (role === "user" ? "dbvc-user" : role === "err" ? "dbvc-err" : "dbvc-bot");
    d.innerHTML = role === "user" ? esc(text) : render(text);
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  function typing(on) {
    var t = document.getElementById("dbvchat-typing");
    if (on) {
      if (t) return;
      t = document.createElement("div");
      t.id = "dbvchat-typing";
      t.className = "dbvc-typing";
      t.innerHTML = "<s></s><s></s><s></s>";
      body.appendChild(t);
      body.scrollTop = body.scrollHeight;
    } else if (t) {
      t.remove();
    }
  }

  function showSuggests(list) {
    sug.innerHTML = "";
    list.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.onclick = function () { sug.innerHTML = ""; ask(q); };
      sug.appendChild(b);
    });
  }

  /* ── Gửi câu hỏi ──────────────────────────────────────────────────────── */

  /* Khách gõ số điện thoại thẳng vào ô chat → gửi làm lead luôn, không cần ô riêng */
  var RE_SDT = /(?:\+?84|0)(?:[\s.\-]?\d){9}\b/;
  function laSoDienThoai(t) {
    var m = String(t).match(RE_SDT);
    return m ? m[0] : "";
  }

  function ask(text) {
    text = String(text || "").trim().slice(0, MAX_LEN);
    if (!text || busy) return;

    var sdt = !leadSent && laSoDienThoai(text);
    if (sdt) {
      add("user", text);
      history.push({ role: "user", text: text });
      sug.innerHTML = "";
      guiSo(sdt, null);
      // Tin nhắn chỉ có số (± vài chữ như "sđt của tôi") thì không cần hỏi AI
      if (text.replace(RE_SDT, "").replace(/[^a-zA-ZÀ-ỹ]/g, "").length < 15) return;
      text = text.replace(RE_SDT, "[đã gửi số]");
    }

    busy = true;
    send.disabled = true;
    sug.innerHTML = "";
    if (!sdt) add("user", text);
    typing(true);

    var payload = { message: text, history: history.slice(-10), page: location.pathname, sid: SID, daCoSo: leadSent };
    if (!sdt) history.push({ role: "user", text: text });

    fetch(API_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        typing(false);
        if (!res.ok || res.j.error) {
          add("err", res.j.error || "Có lỗi xảy ra, anh/chị thử lại giúp em.");
          return;
        }
        add("bot", res.j.reply);
        history.push({ role: "bot", text: res.j.reply });
        if (typeof res.j.luot === "number" && res.j.luot >= 0) nutDanhGia(res.j.luot);

        // Thanh xin số chỉ là 1 dòng mảnh. Hiện sau 2 lượt, hoặc khi bot vừa mời để lại số
        // (kể cả khi khách đã bấm "để sau" trước đó).
        if (!leadSent) {
          var botMoi = /số điện thoại|để lại số|để số/i.test(res.j.reply);
          if (botMoi || (!leadAn && history.length >= 4)) { leadAn = false; leadBox.classList.add("show"); }
        }

        if (window.dataLayer) {
          window.dataLayer.push({ event: "chatbot_reply", chatbot_turn: history.length / 2 });
        }
      })
      .catch(function () {
        typing(false);
        add("err", "Mất kết nối. Anh/chị kiểm tra mạng rồi thử lại, hoặc gọi 0869 656 561 nhé.");
      })
      .finally(function () {
        busy = false;
        send.disabled = false;
        input.focus();
      });
  }

  /* ── Đánh giá 👍/👎 ─────────────────────────────────────────────────────
     Khách bấm 👎 → câu đó vào mục "câu bị chê" của báo cáo tuần trong nhóm Zalo. */
  var ICON_LEN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>';
  var ICON_XUONG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>';
  function nutDanhGia(luot) {
    var d = document.createElement("div");
    d.className = "dbvc-vote";
    d.innerHTML = '<span>Câu trả lời có hữu ích?</span>' +
      '<button type="button" data-v="1" aria-label="Hữu ích">' + ICON_LEN + '</button>' +
      '<button type="button" data-v="-1" aria-label="Chưa hữu ích">' + ICON_XUONG + '</button>';
    d.onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var v = +b.getAttribute("data-v");
      d.innerHTML = '<span>' + (v > 0 ? "Cảm ơn anh/chị!" : "Cảm ơn anh/chị, DBV247 sẽ cải thiện câu trả lời này.") + '</span>';
      fetch(API_VOTE, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: SID, luot: luot, vote: v }) }).catch(function () {});
      if (window.dataLayer) window.dataLayer.push({ event: "chatbot_danh_gia", vote: v });
    };
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }

  /* ── Gửi số điện thoại ────────────────────────────────────────────────── */

  function chuanSo(raw) {
    var x = String(raw || "").replace(/[\s.\-]/g, "");
    return /^(0|\+84|84)\d{8,10}$/.test(x) ? x : "";
  }

  /* Gửi số cho tư vấn viên (dùng chung cho thanh xin số và số gõ trong ô chat).
     nut: nút "Gọi tôi" nếu gửi từ thanh xin số (để bật/tắt trạng thái). */
  function guiSo(phone, nut) {
    var msg = $("dbvchat-leadmsg");
    if (nut) { nut.disabled = true; nut.textContent = "Đang gửi..."; }
    msg.hidden = true;
    fetch(API_LEAD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone,
        history: history.slice(-16),
        page: location.pathname,
        /* Mã cộng tác viên giới thiệu. Lead của khung chat đi qua hàm máy chủ
           chứ không POST thẳng lên Netlify Forms, nên bộ bắt form trong
           dbv-tracking.js không với tới được — phải tự gửi kèm ở đây. */
        ctv: maCtvTuCookie(),
        sid: SID,
      }),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || res.j.error) throw new Error(res.j.error || "");
        leadSent = true;
        leadBox.classList.remove("show", "mo");
        var cam = "Em đã nhận số của anh/chị. Tư vấn viên sẽ gọi lại trong giờ làm việc — trong lúc chờ, anh/chị cứ hỏi tiếp em nhé.";
        add("bot", cam);
        history.push({ role: "bot", text: cam });
        if (window.dataLayer) window.dataLayer.push({ event: "generate_lead", lead_source: "chatbot" });
      })
      .catch(function (e) {
        if (nut) { nut.disabled = false; nut.textContent = "Gọi tôi"; }
        leadBox.classList.add("show", "mo");
        msg.hidden = false;
        msg.textContent = String(e.message) || "Chưa gửi được. Anh/chị gọi giúp 0869 656 561 nhé.";
      });
  }

  $("dbvchat-leadopen").onclick = function () {
    leadBox.classList.add("mo");
    setTimeout(function () { $("dbvchat-phone").focus(); }, 50);
  };
  $("dbvchat-leadx").onclick = function () {
    leadBox.classList.remove("mo", "show");
    $("dbvchat-leadmsg").hidden = true;
    leadAn = true;
  };
  $("dbvchat-phone").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); $("dbvchat-leadbtn").click(); }
  });
  $("dbvchat-leadbtn").onclick = function () {
    var phone = chuanSo($("dbvchat-phone").value), msg = $("dbvchat-leadmsg");
    if (!phone) {
      msg.hidden = false;
      msg.textContent = "Số chưa đúng — anh/chị nhập 10 số, bắt đầu bằng 0.";
      return;
    }
    guiSo(phone, this);
  };

  /* ── Đóng mở ──────────────────────────────────────────────────────────── */

  /* ── Gắn khung chat vào một phần tử của trang (banner AI trang chủ) ── */
  var noiGan = null, khiThao = null;
  function ganVao(el, cbThao) {
    if (!el) return;
    if (noiGan !== el) { el.appendChild(panel); noiGan = el; }
    khiThao = cbThao || null;
    panel.classList.add("dbvc-docked");
    document.body.classList.add("dbvc-dang-gan");
  }
  function thaoRa() {
    if (!noiGan) return;
    wrap.appendChild(panel);
    panel.classList.remove("dbvc-docked");
    document.body.classList.remove("dbvc-dang-gan");
    noiGan = null;
    var cb = khiThao; khiThao = null;
    if (cb) cb();
  }

  function toggle(open) {
    var willOpen = open === undefined ? !panel.classList.contains("show") : open;
    if (!willOpen && noiGan) { panel.classList.remove("show"); thaoRa(); return; }
    panel.classList.toggle("show", willOpen);
    btn.classList.toggle("open", willOpen);
    btn.setAttribute("aria-expanded", String(willOpen));
    btn.setAttribute("aria-label", willOpen ? "Đóng khung chat tư vấn" : "Mở khung chat tư vấn");
    if (willOpen) {
      if (dot) dot.remove();
      // Đã mở chat thì khách biết có trợ lý rồi, không cần bong bóng chào nữa
      hideHello();
      if (!opened) {
        opened = true;
        add("bot", GREETING);
        history.push({ role: "bot", text: GREETING });
        showSuggests(SUGGESTS);
        if (window.dataLayer) window.dataLayer.push({ event: "chatbot_open" });
      }
      setTimeout(function () { input.focus(); }, 120);
    }
  }

  btn.onclick = function () { toggle(); };
  $("dbvchat-min").onclick = function () { toggle(false); };

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("show")) toggle(false);
  });

  form.onsubmit = function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = "";
    input.style.height = "auto";
    ask(v);
  };

  // Ô nhập tự cao dần theo nội dung, tối đa 88px
  input.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 88) + "px";
  });

  // Enter gửi, Shift+Enter xuống dòng
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  /* Cho trang ngoài gọi vào (banner AI trang chủ): mở khung chat và hỏi luôn.
     Đang bận trả lời câu trước thì chờ xong mới hỏi, không nuốt mất câu. */
  function hoiTuNgoai(cau, o) {
    if (o && o.ganVao) ganVao(o.ganVao, o.khiDong);
    toggle(true);
    (function thu(lan) {
      if (!busy) return ask(cau);
      if (lan < 40) setTimeout(function () { thu(lan + 1); }, 250);
    })(0);
  }
  window.dbvChat = { open: function () { toggle(true); }, ask: hoiTuNgoai, close: function () { toggle(false); } };
  // Câu khách bấm trên banner trước khi tệp này kịp tải
  if (window.__dbvChatCho && window.__dbvChatCho.length) {
    var cho = window.__dbvChatCho.pop();
    if (typeof cho === "string") hoiTuNgoai(cho); else hoiTuNgoai(cho.cau, cho.o);
    window.__dbvChatCho = [];
  }
})();
