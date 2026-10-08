/* DBV247 — Báo cáo chatbot gửi nhóm Zalo vận hành (+ Telegram)
   ===========================================================================
   Hàm NỀN (chạy tối đa 15 phút). Ai gọi:
   - chat-bao-cao.js: lịch 8:00 sáng thứ Hai hằng tuần (giờ VN).
   - Gọi tay: mở https://dbv247.com.vn/.netlify/functions/chat-bao-cao-background?key=<DASHBOARD_KEY>&ngay=7
     (ngay = số ngày gần nhất, tối đa 30). Báo cáo về nhóm Zalo sau ít giây.

   Nội dung: số phiên, số câu, tỷ lệ để lại SĐT, nhóm sản phẩm hỏi nhiều, số lần
   báo phí bằng công cụ, các câu bot CHƯA trả lời được, các câu bị 👎, và gợi ý
   câu hỏi nên thêm vào kien-thuc/hoi-dap.md. Xong thì xoá nhật ký quá 90 ngày.
*/
'use strict';

const { docPhien, donCu, ngayVN } = require('./lib/nhat-ky.js');
const { guiZalo, chuThuong } = require('./lib/zalo.js');

const TEN_NHOM = { 'tnds': 'TNDS', 'vat-chat-oto': 'Vật chất ô tô', 'tai-san': 'Cháy nổ/tài sản', 'hang-hoa': 'Hàng hóa',
  'cong-trinh': 'Xây dựng/lắp đặt', 'con-nguoi': 'Sức khỏe/tai nạn', 'du-lich': 'Du lịch', 'trach-nhiem': 'Trách nhiệm',
  'tau': 'Tàu thủy', 'boi-thuong': 'Bồi thường', 'chung': 'Chưa rõ' };

function hopLe(event) {
  const h = event.headers || {}, q = event.queryStringParameters || {};
  const noiBo = process.env.PHIEU_SECRET || process.env.ZALO_WEBHOOK_SECRET || process.env.DASHBOARD_KEY;
  if (noiBo && h['x-noi-bo'] === noiBo) return true;
  return !!(process.env.DASHBOARD_KEY && q.key === process.env.DASHBOARD_KEY);
}

const cat = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const dm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

async function goiY(cauHoi) {
  if (!process.env.GEMINI_API_KEY || !cauHoi.length) return '';
  try {
    const { askGemini } = require('./chat.js')._noiBo;
    const t = await askGemini(
      'Bạn giúp nhóm vận hành DBV247 cải thiện chatbot bảo hiểm. Viết chữ thường, không dùng ** hay #, gạch đầu dòng bằng "- ".',
      [],
      'Dưới đây là các câu khách hỏi mà chatbot chưa trả lời được hoặc bị khách chê. ' +
      'Gom thành tối đa 5 CÂU HỎI CHUNG nên bổ sung câu trả lời vào tệp hỏi–đáp, xếp theo số khách hỏi nhiều nhất. ' +
      'Chỉ liệt kê câu hỏi, KHÔNG tự viết câu trả lời (nhân viên sẽ viết cho đúng nghiệp vụ). Tối đa 6 dòng.\n\n' +
      cauHoi.slice(0, 60).map((q) => '- ' + q).join('\n'));
    return chuThuong(t);
  } catch (e) { console.error('bao-cao goi y:', e.message); return ''; }
}

async function lapBaoCao(soNgay) {
  const ds = await docPhien(soNgay);
  const luot = [];
  ds.forEach((p) => p.luot.forEach((l) => luot.push(Object.assign({ page: p.page }, l))));
  const lead = ds.filter((p) => p.lead).length;
  const nhom = {}, cc = {};
  luot.forEach((l) => { nhom[l.nhom || 'chung'] = (nhom[l.nhom || 'chung'] || 0) + 1; (l.cc || []).forEach((c) => { cc[c] = (cc[c] || 0) + 1; }); });
  const len = luot.filter((l) => l.vote === 1).length, xuong = luot.filter((l) => l.vote === -1);
  const khongBiet = luot.filter((l) => l.kb);

  const tu = ngayVN(Date.now() - (soNgay - 1) * 864e5), den = ngayVN();
  const L = [];
  L.push('📊 BÁO CÁO CHATBOT DBV247 — ' + soNgay + ' ngày (' + dm(tu) + ' – ' + dm(den) + ')');
  if (!ds.length) { L.push('Chưa có cuộc chat nào được ghi trong khoảng này.'); return L.join('\n'); }
  L.push('- Phiên chat: ' + ds.length + ' · Câu hỏi: ' + luot.length);
  L.push('- Để lại SĐT: ' + lead + ' phiên (' + Math.round(lead * 100 / ds.length) + '%)');
  L.push('- Đánh giá: 👍 ' + len + ' · 👎 ' + xuong.length);
  const tongCc = Object.values(cc).reduce((a, b) => a + b, 0);
  if (tongCc) L.push('- Báo phí bằng công cụ: ' + tongCc + ' lần (' + Object.entries(cc).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ') + ')');
  L.push('- Khách quan tâm: ' + Object.entries(nhom).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([k, v]) => (TEN_NHOM[k] || k) + ' ' + Math.round(v * 100 / luot.length) + '%').join(' · '));

  const uniq = (arr) => { const s = new Set(); return arr.filter((l) => { const k = l.q.toLowerCase().slice(0, 80); if (s.has(k)) return false; s.add(k); return true; }); };
  const kb = uniq(khongBiet);
  L.push('', '❓ CÂU BOT CHƯA TRẢ LỜI ĐƯỢC (' + kb.length + ')');
  if (!kb.length) L.push('- Không có');
  kb.slice(0, 12).forEach((l) => L.push('- ' + cat(l.q, 140)));
  const xd = uniq(xuong);
  L.push('', '👎 CÂU BỊ KHÁCH CHÊ (' + xd.length + ')');
  if (!xd.length) L.push('- Không có');
  xd.slice(0, 8).forEach((l) => L.push('- Hỏi: ' + cat(l.q, 110) + '\n  Bot: ' + cat(l.a, 120) + (l.lyDo ? '\n  Lý do: ' + cat(l.lyDo, 100) : '')));

  const gy = await goiY(kb.concat(xd).map((l) => l.q));
  if (gy) L.push('', '💡 NÊN BỔ SUNG VÀO kien-thuc/hoi-dap.md', gy);
  L.push('', 'Cách bổ sung: mở tệp kien-thuc/hoi-dap.md trong netlify_upload, thêm "## câu hỏi" + câu trả lời, rồi deploy.');
  return L.join('\n');
}

exports.handler = async function (event) {
  if (!hopLe(event)) { console.error('bao-cao: lời gọi không hợp lệ'); return { statusCode: 403 }; }
  const q = event.queryStringParameters || {};
  const soNgay = Math.max(1, Math.min(30, parseInt(q.ngay, 10) || 7));
  try {
    const text = await lapBaoCao(soNgay);
    await guiZalo(text);
    const tk = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
    if (tk && chat) {
      const t = chuThuong(text);
      for (let i = 0; i < t.length; i += 4000) {
        await fetch('https://api.telegram.org/bot' + tk + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chat, text: t.slice(i, i + 4000), disable_web_page_preview: true }) }).catch(() => {});
      }
    }
    const xoa = await donCu(90);
    if (xoa) console.log('bao-cao: đã xoá', xoa, 'phiên quá 90 ngày');
  } catch (e) {
    console.error('bao-cao:', e.message);
    await guiZalo('Báo cáo chatbot tuần này lỗi: ' + e.message).catch(() => {});
  }
  return { statusCode: 200 };
};

exports._noiBo = { lapBaoCao };
