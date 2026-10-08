/* DBV247 — Nhận đánh giá 👍/👎 của khách cho từng câu trả lời của chatbot.
   Ghi vào nhật ký phiên (lib/nhat-ky.js). Báo cáo tuần gom các câu bị 👎. */
'use strict';
const { danhGia, sidHopLe } = require('./lib/nhat-ky.js');

const json = (c, d) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(d) });

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Chỉ nhận POST.' });
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'JSON lỗi' }); }
  const i = parseInt(p.luot, 10), vote = Number(p.vote);
  if (!sidHopLe(p.sid) || !(i >= 0 && i < 60) || (vote !== 1 && vote !== -1)) return json(400, { error: 'Thiếu thông tin' });
  const ok = await danhGia(p.sid, i, vote, String(p.lyDo || '').slice(0, 300));
  return json(200, { ok });
};
