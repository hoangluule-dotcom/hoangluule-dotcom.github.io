/* DBV247 — Hàm NỀN tra giá xe qua Google rồi ghi vào bộ nhớ dùng chung.
   Chatbot web không chờ được 7 giây tra Google (giới hạn 10 giây), nên nó
   dùng CSDL cho lần trả lời hiện tại và gọi hàm này tra hộ — lần hỏi sau về
   cùng xe, cùng năm sẽ có giá thị trường mới. Xem lib/gia-xe-chung.js. */
'use strict';
const G = require('./lib/gia-xe-chung');

exports.handler = async function (event) {
  const h = event.headers || {};
  if (!process.env.GEMINI_API_KEY || h['x-noi-bo'] !== G.khoaNoiBo()) return { statusCode: 403 };
  let d = {};
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400 }; }
  const hang = String(d.hang || '').toUpperCase().slice(0, 40);
  const dong = String(d.dong || '').toUpperCase().slice(0, 40);
  const nam = parseInt(d.nam, 10);
  if (!hang || !dong || !nam) return { statusCode: 400 };

  // Có người vừa tra rồi thì thôi
  const store = G.openStore();
  if (store) {
    try {
      const c = await store.get(G.khoaCache(hang, dong, nam), { type: 'json' });
      if (c && G.conHan(c, G.CACHE_GIO)) return { statusCode: 200 };
    } catch (e) { /* tra tiếp */ }
  }
  if (!(await G.conLuotNoiBo())) return { statusCode: 200 };
  const kq = await G.traMoiVaLuu(hang, dong, nam, '', 20000);
  console.log('gia-xe-lam-moi:', hang, dong, nam, kq.ok ? kq.trung_vi : kq.ly_do);
  return { statusCode: 200 };
};
