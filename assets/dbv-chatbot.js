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
  var HOTLINE = "0869656561";
  var MAX_LEN = 600;

  var history = [];      // [{role:'user'|'bot', text}]
  var busy = false;
  var leadSent = false;
  var opened = false;

  var GREETING =
    "Chào anh/chị, em là trợ lý của DBV247. Anh/chị đang quan tâm bảo hiểm gì ạ? " +
    "Em giải đáp nhanh, còn phần báo phí cụ thể thì tư vấn viên sẽ gọi lại cho chính xác.";

  var SUGGESTS = [
    "Bảo hiểm vật chất ô tô gồm những gì?",
    "Phí bảo hiểm TNDS bắt buộc ô tô bao nhiêu?",
    "Thủ tục khai báo bồi thường thế nào?",
    "Bảo hiểm DBV có uy tín không?",
  ];

  /* ── CSS ──────────────────────────────────────────────────────────────── */
  var css = [
    "#dbvchat-btn{position:fixed;right:20px;bottom:56px;z-index:395;width:56px;height:56px;border-radius:50%;",
      "border:none;cursor:pointer;background:linear-gradient(135deg,#007437,#005a2b);",
      "box-shadow:0 6px 20px rgba(0,116,55,.4);display:flex;align-items:center;justify-content:center;",
      "transition:transform .2s,box-shadow .2s;padding:0}",
    "#dbvchat-btn:hover{transform:scale(1.07);box-shadow:0 8px 26px rgba(0,116,55,.5)}",
    "#dbvchat-btn:focus-visible{outline:3px solid #E8920A;outline-offset:3px}",
    "#dbvchat-btn .dbvc-close{display:none}",
    "#dbvchat-btn.open .dbvc-open{display:none}",
    "#dbvchat-btn.open .dbvc-close{display:block}",
    /* chấm đỏ mời chào, tắt khi đã mở lần đầu */
    "#dbvchat-dot{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;",
      "background:#E8920A;border:2px solid #fff;animation:dbvcPulse 2s infinite}",
    "@keyframes dbvcPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:.75}}",
    "@media(prefers-reduced-motion:reduce){#dbvchat-dot{animation:none}}",

    "#dbvchat-panel{position:fixed;right:20px;bottom:122px;z-index:396;width:370px;max-width:calc(100vw - 32px);",
      "height:520px;max-height:calc(100vh - 190px);background:#fff;border-radius:16px;",
      "box-shadow:0 16px 50px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;",
      "font-family:inherit;border:1px solid #E2E8F0}",
    "#dbvchat-panel.show{display:flex}",

    "#dbvchat-head{background:linear-gradient(135deg,#007437,#005a2b);color:#fff;padding:13px 16px;",
      "display:flex;align-items:center;gap:10px;flex-shrink:0}",
    "#dbvchat-head .dbvc-av{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);",
      "display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    "#dbvchat-head b{font-size:.92rem;display:block;line-height:1.3}",
    "#dbvchat-head span{font-size:.72rem;opacity:.85;display:flex;align-items:center;gap:5px}",
    "#dbvchat-head i{width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block}",
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
    ".dbvc-typing s{width:6px;height:6px;border-radius:50%;background:#a0aec0;display:block;",
      "animation:dbvcBounce 1.3s infinite}",
    ".dbvc-typing s:nth-child(2){animation-delay:.18s}",
    ".dbvc-typing s:nth-child(3){animation-delay:.36s}",
    "@keyframes dbvcBounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}",

    "#dbvchat-sug{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;background:#f7faf8;flex-shrink:0}",
    "#dbvchat-sug button{background:#fff;border:1px solid #cbe5d5;color:#007437;font-size:.74rem;",
      "font-weight:600;padding:6px 11px;border-radius:20px;cursor:pointer;font-family:inherit;text-align:left}",
    "#dbvchat-sug button:hover{background:#e8f5e9;border-color:#007437}",

    /* Khối xin số điện thoại — hiện sau vài lượt trao đổi */
    "#dbvchat-lead{display:none;padding:11px 14px;background:#fffaf0;border-top:1px solid #f6e0b8;flex-shrink:0}",
    "#dbvchat-lead.show{display:block}",
    "#dbvchat-lead p{margin:0 0 8px;font-size:.78rem;color:#744210;line-height:1.45}",
    "#dbvchat-lead .dbvc-row{display:flex;gap:6px}",
    "#dbvchat-lead input{flex:1;min-width:0;padding:8px 11px;border:1px solid #E2E8F0;border-radius:8px;",
      "font-size:.85rem;font-family:inherit}",
    "#dbvchat-lead input:focus{outline:none;border-color:#007437;box-shadow:0 0 0 2px rgba(0,116,55,.15)}",
    "#dbvchat-lead button{background:#E8920A;color:#fff;border:none;border-radius:8px;padding:8px 15px;",
      "font-weight:700;font-size:.82rem;cursor:pointer;font-family:inherit;white-space:nowrap}",
    "#dbvchat-lead button:hover{background:#c97d08}",
    "#dbvchat-lead button:disabled{opacity:.6;cursor:default}",
    "#dbvchat-leadmsg{font-size:.75rem;margin:7px 0 0;line-height:1.4}",

    "#dbvchat-foot{padding:9px 11px;border-top:1px solid #E2E8F0;background:#fff;flex-shrink:0}",
    "#dbvchat-form{display:flex;gap:7px;align-items:flex-end}",
    "#dbvchat-input{flex:1;min-width:0;border:1px solid #E2E8F0;border-radius:20px;padding:9px 14px;",
      "font-size:.86rem;font-family:inherit;resize:none;max-height:88px;line-height:1.45}",
    "#dbvchat-input:focus{outline:none;border-color:#007437;box-shadow:0 0 0 2px rgba(0,116,55,.15)}",
    "#dbvchat-send{background:#007437;border:none;border-radius:50%;width:36px;height:36px;flex-shrink:0;",
      "cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}",
    "#dbvchat-send:hover{background:#005a2b}",
    "#dbvchat-send:disabled{opacity:.45;cursor:default}",
    "#dbvchat-note{font-size:.66rem;color:#718096;text-align:center;margin:6px 0 0;line-height:1.4}",

    /* Mobile: nhường chỗ cho thanh CTA dưới đáy, tránh đè lên nhau */
    "@media(max-width:640px){",
      "#dbvchat-btn{width:50px;height:50px;right:14px;bottom:66px}",
      "#dbvchat-panel{right:8px;left:8px;width:auto;bottom:66px;height:auto;top:66px;max-height:none;border-radius:14px}",
    "}",
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
      '<svg class="dbvc-open" width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">' +
        '<path d="M12 2C6.48 2 2 6.02 2 11c0 2.6 1.23 4.93 3.2 6.55L4.5 21.5l4.2-2.2c1.03.28 2.14.43 3.3.43 5.52 0 10-4.02 10-9S17.52 2 12 2zM8 12.2a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm4 0a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm4 0a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4z"/>' +
      '</svg>' +
      '<svg class="dbvc-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M18 6 6 18M6 6l12 12"/></svg>' +
    '</button>' +
    '<div id="dbvchat-panel" role="dialog" aria-label="Chat tư vấn DBV247" aria-modal="false">' +
      '<div id="dbvchat-head">' +
        '<div class="dbvc-av">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">' +
          '<path d="M12 2 3 6v6c0 5 3.8 9.3 9 10 5.2-.7 9-5 9-10V6l-9-4zm0 5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm0 11.5c-2 0-3.8-1-4.9-2.6.1-1.6 3.3-2.5 4.9-2.5s4.8.9 4.9 2.5A5.9 5.9 0 0112 18.5z"/></svg>' +
        '</div>' +
        '<div><b>Trợ lý DBV247</b><span><i></i>Thường trả lời ngay</span></div>' +
        '<button id="dbvchat-min" type="button" aria-label="Thu nhỏ khung chat">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 12h12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div id="dbvchat-body" role="log" aria-live="polite" aria-atomic="false"></div>' +
      '<div id="dbvchat-sug"></div>' +
      '<div id="dbvchat-lead">' +
        '<p>Để tư vấn viên báo phí chính xác và gọi lại trong giờ làm việc, anh/chị để lại số điện thoại giúp em nhé.</p>' +
        '<div class="dbvc-row">' +
          '<input id="dbvchat-phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="Số điện thoại" aria-label="Số điện thoại">' +
          '<button id="dbvchat-leadbtn" type="button">Gửi</button>' +
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
        '<p id="dbvchat-note">Trợ lý tự động — thông tin mang tính tham khảo. ' +
          'Phí và quyền lợi chính thức căn cứ hợp đồng. Gọi <a href="tel:' + HOTLINE + '">0869 656 561</a>.</p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);

  var $ = function (id) { return document.getElementById(id); };
  var btn = $("dbvchat-btn"), panel = $("dbvchat-panel"), body = $("dbvchat-body"),
      sug = $("dbvchat-sug"), form = $("dbvchat-form"), input = $("dbvchat-input"),
      send = $("dbvchat-send"), leadBox = $("dbvchat-lead"), dot = $("dbvchat-dot");

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

  function ask(text) {
    text = String(text || "").trim().slice(0, MAX_LEN);
    if (!text || busy) return;

    busy = true;
    send.disabled = true;
    sug.innerHTML = "";
    add("user", text);
    typing(true);

    var payload = { message: text, history: history.slice(-10) };
    history.push({ role: "user", text: text });

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

        // Sau 2 lượt trao đổi thì mời để lại số — đủ để khách thấy có ích trước
        // khi bị hỏi thông tin, mà chưa lâu tới mức khách bỏ đi.
        if (!leadSent && history.length >= 4) leadBox.classList.add("show");

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

  /* ── Gửi số điện thoại ────────────────────────────────────────────────── */

  $("dbvchat-leadbtn").onclick = function () {
    var phoneEl = $("dbvchat-phone"), msg = $("dbvchat-leadmsg"), b = this;
    var phone = phoneEl.value.trim();
    if (!/^(0|\+84|84)\d{8,10}$/.test(phone.replace(/[\s.\-]/g, ""))) {
      msg.hidden = false;
      msg.style.color = "#9b2c2c";
      msg.textContent = "Số điện thoại chưa đúng. Anh/chị nhập lại giúp em (10 số, bắt đầu bằng 0).";
      return;
    }
    b.disabled = true;
    b.textContent = "Đang gửi...";
    msg.hidden = true;

    fetch(API_LEAD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone,
        history: history.slice(-8),
        page: location.pathname,
      }),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || res.j.error) throw new Error(res.j.error || "");
        leadSent = true;
        leadBox.classList.remove("show");
        add("bot", "Em nhận được số của anh/chị rồi ạ. Tư vấn viên sẽ gọi lại trong giờ làm việc. " +
                   "Trong lúc chờ, anh/chị cứ hỏi tiếp em nhé.");
        if (window.dataLayer) window.dataLayer.push({ event: "generate_lead", lead_source: "chatbot" });
      })
      .catch(function (e) {
        b.disabled = false;
        b.textContent = "Gửi";
        msg.hidden = false;
        msg.style.color = "#9b2c2c";
        msg.textContent = String(e.message) || "Chưa gửi được. Anh/chị gọi giúp 0869 656 561 nhé.";
      });
  };

  /* ── Đóng mở ──────────────────────────────────────────────────────────── */

  function toggle(open) {
    var willOpen = open === undefined ? !panel.classList.contains("show") : open;
    panel.classList.toggle("show", willOpen);
    btn.classList.toggle("open", willOpen);
    btn.setAttribute("aria-expanded", String(willOpen));
    btn.setAttribute("aria-label", willOpen ? "Đóng khung chat tư vấn" : "Mở khung chat tư vấn");
    if (willOpen) {
      if (dot) dot.remove();
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
})();
