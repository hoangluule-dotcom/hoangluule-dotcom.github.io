/* DBV247 — Bot học từ TÀI LIỆU qua link (hàm NỀN)
   ===========================================================================
   Quản trị nhắn: "học: <link>" → webhook chuyển sang đây (đọc + tóm tắt mất
   10–40 giây, quá giới hạn 10 giây của hàm thường).

   Đọc được:
     - Google Docs / Sheets / Slides (link chia sẻ "Bất kỳ ai có đường liên kết")
     - File trên Google Drive: PDF, ảnh (JPG/PNG), TXT/CSV. File Word/Excel thì
       mở bằng Google Tài liệu/Trang tính rồi gửi link đó.
     - Trang web thường, ảnh qua đường link.
   AI rút thành các cặp hỏi–đáp → gửi bản xem trước → quản trị trả lời
   "lưu" / "lưu 1,3" / "huỷ". Chưa "lưu" thì bot CHƯA dùng (tránh AI đọc sai số).

   Bản xem trước giữ 24 giờ ở Blobs "dbv247-day-bot", khoá cho-luu/<kho>/<id người>.
*/
'use strict';

const { guiDen } = require('./lib/zalo');
const DAY = require('./lib/day-bot');

const TOI_DA_BYTE = 15 * 1024 * 1024;
const TOI_DA_CHU = 120000;

function cauHinh(bot) {
  return bot === 'gt'
    ? { token: process.env.ZALO_GT_BOT_TOKEN, secret: process.env.ZALO_GT_WEBHOOK_SECRET, ten: 'giai-tri',
        key: process.env.GEMINI_GT_API_KEY || process.env.GEMINI_API_KEY }
    : { token: process.env.ZALO_BOT_TOKEN, secret: process.env.ZALO_WEBHOOK_SECRET, ten: 'nghiep-vu',
        key: process.env.GEMINI_API_KEY };
}

/* Đổi link chia sẻ Google sang link tải nội dung */
function linkTai(url) {
  let m;
  if ((m = url.match(/docs\.google\.com\/document\/d\/([\w-]+)/))) return { url: `https://docs.google.com/document/d/${m[1]}/export?format=txt`, loai: 'Google Docs' };
  if ((m = url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/))) {
    const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1];
    return { url: `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv` + (gid ? '&gid=' + gid : ''), loai: 'Google Sheets' };
  }
  if ((m = url.match(/docs\.google\.com\/presentation\/d\/([\w-]+)/))) return { url: `https://docs.google.com/presentation/d/${m[1]}/export/txt`, loai: 'Google Slides' };
  if ((m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]+)/))) return { url: `https://drive.google.com/uc?export=download&id=${m[1]}`, loai: 'Google Drive' };
  return { url, loai: 'Trang web' };
}

const htmlSangChu = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

/* Tải tài liệu → { chu } hoặc { tep: {mime, base64} } hoặc { loi } */
async function taiTaiLieu(url) {
  const t = linkTai(url);
  const r = await fetch(t.url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 DBV247-bot' } });
  if (!r.ok) {
    return { loi: r.status === 401 || r.status === 403 || r.status === 404
      ? 'Không mở được tài liệu (mã ' + r.status + '). Kiểm tra đã bật chia sẻ "Bất kỳ ai có đường liên kết đều xem được" chưa.'
      : 'Không tải được tài liệu (mã ' + r.status + ').' };
  }
  const mime = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > TOI_DA_BYTE) return { loi: 'Tài liệu lớn quá 15MB, anh/chị tách nhỏ giúp em.' };
  // Drive trả trang đăng nhập/cảnh báo thay vì file → thường là chưa chia sẻ công khai
  if (t.loai === 'Google Drive' && mime === 'text/html' && /accounts\.google|ServiceLogin|Sign in/i.test(buf.toString('utf8', 0, 20000))) {
    return { loi: 'File trên Drive chưa chia sẻ công khai. Bật "Bất kỳ ai có đường liên kết đều xem được" rồi gửi lại.' };
  }
  if (mime === 'application/pdf' || mime.startsWith('image/')) return { tep: { mime, base64: buf.toString('base64') }, loai: t.loai };
  if (/officedocument|msword|ms-excel|ms-powerpoint/.test(mime)) {
    return { loi: 'Đây là file Word/Excel/PowerPoint — em chưa đọc trực tiếp được. Anh/chị mở file bằng Google Tài liệu/Trang tính/Trang trình bày (Mở bằng → Google ...) rồi gửi link mới giúp em.' };
  }
  let chu = buf.toString('utf8');
  if (mime === 'text/html') chu = htmlSangChu(chu);
  if (chu.trim().length < 30) return { loi: 'Tài liệu gần như trống, hoặc em không đọc được nội dung.' };
  return { chu: chu.slice(0, TOI_DA_CHU), loai: t.loai, catBot: chu.length > TOI_DA_CHU };
}

const CHI_DAN = (ten) => `Bạn rút KIẾN THỨC từ một tài liệu nội bộ để dạy cho chatbot ${ten === 'nghiep-vu'
  ? 'nghiệp vụ bảo hiểm của DBV247 (trả lời nhân viên và khách hàng)'
  : 'giải trí của nhóm cán bộ công ty (chuyện văn phòng, sự kiện, ăn uống...)'}.

Viết thành các cặp HỎI–ĐÁP, mỗi cặp là một ý độc lập mà người dùng có thể hỏi.
QUY TẮC:
1. CHỈ dùng thông tin CÓ TRONG TÀI LIỆU. Không thêm hiểu biết riêng, không suy đoán.
2. Chép ĐÚNG con số, mức phí, ngày tháng, tên văn bản như tài liệu ghi.
3. Câu hỏi viết tự nhiên như người thật hỏi. Câu trả lời ngắn gọn 1–4 câu, đủ ý.
4. Tối đa 30 cặp; ưu tiên ý quan trọng, hay được hỏi. Bỏ qua mục lục, chữ ký, phần trang trí.
5. Không dùng "số 1", "tốt nhất", "rẻ nhất".
6. Có thông tin cá nhân (CCCD, SĐT, số tài khoản của người cụ thể) thì BỎ QUA, không đưa vào.
Trả về JSON: {"tieu_de": string, "cap": [{"q": string, "a": string}]}`;

async function tomTat(key, ten, tl) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const parts = tl.tep
    ? [{ inline_data: { mime_type: tl.tep.mime, data: tl.tep.base64 } }, { text: 'Rút hỏi–đáp từ tài liệu đính kèm.' }]
    : [{ text: 'TÀI LIỆU:\n' + tl.chu }];
  const body = (thinking) => {
    const gen = { temperature: 0.2, maxOutputTokens: 8000, responseMimeType: 'application/json' };
    if (thinking) gen.thinkingConfig = { thinkingLevel: 'low' };
    return JSON.stringify({ system_instruction: { parts: [{ text: CHI_DAN(ten) }] }, contents: [{ role: 'user', parts }], generationConfig: gen });
  };
  const h = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
  let r = await fetch(url, { method: 'POST', headers: h, body: body(true) });
  if (r.status === 400) { const t = await r.text(); if (/thinking/i.test(t)) r = await fetch(url, { method: 'POST', headers: h, body: body(false) }); else throw new Error('Gemini 400: ' + t.slice(0, 200)); }
  if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const d = await r.json();
  const p = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
  const text = p ? p.filter((x) => !x.thought).map((x) => x.text || '').join('') : '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI không trả JSON');
  const kq = JSON.parse(m[0]);
  const cap = (kq.cap || []).filter((c) => c && c.q && c.a).slice(0, 30)
    .map((c) => ({ q: String(c.q).trim().slice(0, 300), a: String(c.a).trim().slice(0, 1500) }));
  return { tieu_de: kq.tieu_de || '', cap };
}

exports.handler = async function (event) {
  let d = {};
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400 }; }
  const ch = cauHinh(d.bot);
  const h = event.headers || {};
  if (!ch.secret || h['x-noi-bo'] !== ch.secret) { console.error('hoc-tai-lieu: lời gọi không hợp lệ'); return { statusCode: 403 }; }
  const { chatId, idNguoi, url } = d;
  if (!chatId || !idNguoi || !url) return { statusCode: 400 };
  const gui = (t) => guiDen(chatId, t, ch.token);

  try {
    const tl = await taiTaiLieu(url);
    if (tl.loi) { await gui('⚠ ' + tl.loi); return { statusCode: 200 }; }
    if (!ch.key) { await gui('Thiếu khoá Gemini trên Netlify nên chưa đọc được tài liệu.'); return { statusCode: 200 }; }
    const kq = await tomTat(ch.key, ch.ten, tl);
    if (!kq.cap.length) { await gui('Em đọc xong nhưng không rút được ý nào đáng học từ tài liệu này.'); return { statusCode: 200 }; }

    const k = DAY.kho();
    if (!k) throw new Error('Không mở được kho lưu');
    await k.setJSON('cho-luu/' + ch.ten + '/' + idNguoi, { nguon: url, tieu_de: kq.tieu_de, muc: kq.cap, luc: new Date().toISOString() });

    const xem = kq.cap.map((c, i) => (i + 1) + '. ' + c.q + '\n   → ' + c.a).join('\n');
    await gui('📄 Đã đọc ' + tl.loai + (kq.tieu_de ? ': ' + kq.tieu_de : '') +
      (tl.catBot ? ' (tài liệu dài, em chỉ đọc phần đầu)' : '') + '\nRút được ' + kq.cap.length + ' mục, anh/chị kiểm tra giúp em:\n\n' + xem +
      '\n\n👉 Trả lời: "lưu" (lưu hết) · "lưu 1,3,5" (chỉ lưu mục chọn) · "huỷ"\nChưa trả lời "lưu" thì bot CHƯA dùng các mục này.');
  } catch (e) {
    console.error('hoc-tai-lieu:', e.message);
    await gui('Em chưa đọc được tài liệu này (lỗi: ' + String(e.message).slice(0, 120) + '). Anh/chị thử lại sau, hoặc gửi file cho người quản trị hệ thống.');
  }
  return { statusCode: 200 };
};
