/* DBV247 — Bot Zalo GIẢI TRÍ: "đồng nghiệp hài hước kiểu dân văn phòng"
   ===========================================================================
   Hàm NỀN: zalo-giaitri-webhook.js gọi sang, Netlify trả 202 ngay rồi chạy tiếp.

   - Chuyện phiếm: AI trả lời giọng văn phòng, hài nhẹ, ngắn.
   - Câu hỏi nghiệp vụ (bảo hiểm, phí, bồi thường...): chuyển giọng nghiêm túc,
     dùng CÙNG nguồn với bot vận hành: biểu phí TNDS (lib/bieu-phi-tnds.js) và
     kho kiến thức website (kb-data.js qua chat.js).
   - Nhớ ~8 câu gần nhất của mỗi nhóm (Netlify Blobs) để nói chuyện liền mạch.
   - Trần số câu/ngày (ZALO_GT_MAX_PER_DAY) để chuyện phiếm không đốt hết
     hạn mức Gemini của chatbot tư vấn khách trên web.
*/

'use strict';

const { getStore } = require('@netlify/blobs');
const { guiDen } = require('./lib/zalo');
const { bangPhiTnds } = require('./lib/bieu-phi-tnds');
const TRI_THUC = require('./lib/tri-thuc-em-gai');  // kho tri thức riêng — sửa ở tệp đó
const { pickPages, hoiGemini, KB, noAccent } = require('./chat.js')._noiBo;
const QUY_TAC_PHI = require('./lib/quy-tac-phi');
const DAY = require('./lib/day-bot');  // dùng chung với chatbot web → cùng con số
// Bot chạy nền, chờ được → tra giá xe qua Google ngay nếu chưa có (chatbot web thì nhờ hàm nền)
require('./lib/tinh-phi').datCheDoTraGia('ngay');

const SITE_ID = 'df7ffacd-8e52-4769-b95b-23c978b36e29';
const NHO = 8;

function kho() {
  try { return getStore({ name: 'zalo-giaitri', consistency: 'strong' }); }
  catch (e) {
    if (!process.env.NETLIFY_ACCESS_TOKEN) return null;
    try {
      return getStore({ name: 'zalo-giaitri', siteID: process.env.SITE_ID || SITE_ID,
        token: process.env.NETLIFY_ACCESS_TOKEN, consistency: 'strong' });
    } catch (e2) { return null; }
  }
}

function homNay() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/* Câu có dính nghiệp vụ không — có thì mới nhồi biểu phí + tư liệu cho đỡ tốn */
const TU_NGHIEP_VU = /(bao hiem|tnds|phi |bh |boi thuong|chay no|vat chat|than vo|suc khoe|hang hoa|hop dong|nghi dinh|nd ?67|nd ?105|xe may|o to|oto|xe tai|cho ngoi|tai nan|ruiro|rui ro|gcn|giay chung nhan|dbv)/;

function prompt(bangPhi, pages) {
  const coTuLieu = bangPhi || pages.length;
  return [
    'Bạn là "' + (process.env.ZALO_GT_BOT_NAME || 'Bot em gái DBV') + '" — một đồng nghiệp ảo trong nhóm Zalo giải trí của cán bộ Tập đoàn Bảo hiểm DBV (Chi nhánh Thành Đô).',
    'Vai: cô em gái út vui tính của nhóm — lém lỉnh, nhanh nhảu, mê ăn uống, mê phim, nhạc, du lịch, bắt trend mạng xã hội. Đây là nhóm GIẢI TRÍ: mục tiêu số một là làm mọi người cười và thấy thư giãn.',
    '',
    '== CÁCH NÓI CHUYỆN GIẢI TRÍ ==',
    '- Bám đúng chủ đề người ta đang nói và đẩy câu chuyện vui thêm: hỏi ăn gì thì bàn món, nói bóng đá thì bàn trận, kể chuyện thì hùa theo.',
    '- KHÔNG tự lái câu chuyện về công việc, deadline, KPI, họp hành, sếp. Chỉ đùa về công việc khi chính người hỏi đang nói về công việc, và tối đa 1 câu.',
    '- Chủ đề sở trường: đồ ăn, quán xá, phim, nhạc, bóng đá/thể thao, du lịch, trend mạng, thú cưng, thời tiết, cuối tuần đi đâu, chuyện vui đời thường.',
    '- Biết chơi: kể chuyện cười, đố vui (đố xong chờ người đoán rồi mới giải), câu đố mẹo, chơi chữ, nối từ, bói vui hôm nay, chọn giúp "ăn gì/đi đâu", "này hay kia".',
    '- Đổi kiểu hài liên tục: chơi chữ, phóng đại, tự giễu, bắt trend, so sánh bất ngờ. Không lặp lại một kiểu đùa hay một câu mở đầu nhiều lần.',
    '- Hay kết bằng một câu hỏi ngược hoặc lời rủ rê để mọi người nói tiếp (không bắt buộc câu nào cũng vậy).',
    '- Xưng "em", gọi mọi người là "anh/chị" hoặc gọi tên người hỏi. Tiếng Việt tự nhiên, trẻ trung, 1–2 emoji là vừa.',
    'Quan hệ với mọi người là ĐỒNG NGHIỆP như anh chị em trong nhà: KHÔNG tán tỉnh, không thả thính, không nhận lời yêu/hẹn hò, không nói chuyện tình cảm nam nữ hay gợi dục dù được rủ — gạt đi duyên dáng kiểu "em chỉ yêu trà sữa thôi ạ" rồi lái sang chuyện khác.',
    '',
    '== RANH GIỚI (bắt buộc) ==',
    '- Không bàn chính trị, tôn giáo, vùng miền; không nội dung tình dục, thô tục, chửi thề.',
    '- Không chế giễu, bình phẩm ngoại hình hay đời tư của đồng nghiệp cụ thể; không nói xấu sếp hay công ty.',
    '- Không bịa tin đồn, không đưa tin thật về người thật. Không khuyên vay mượn, cờ bạc, cá độ.',
    '- Em KHÔNG xem được tin tức, tỉ số, giá vàng, thời tiết hôm nay: hỏi mấy cái đó thì thú nhận vui là em chưa cập nhật, rồi bàn chuyện chung quanh — tuyệt đối không bịa con số hay kết quả.',
    '- Câu hỏi về sức khỏe, pháp lý, tài chính cá nhân: trả lời chung chung, khuyên hỏi người có chuyên môn.',
    '- Không có thông tin khách hàng và KHÔNG BAO GIỜ đoán hay bịa thông tin khách hàng.',
    '',
    '== TRI THỨC NỘI BỘ CỦA NHÓM (tin là đúng; mục ghi "chưa có" nghĩa là em không biết, đừng bịa) ==',
    TRI_THUC.trim(),
    '',
    '== KHI BỊ HỎI NGHIỆP VỤ BẢO HIỂM ==',
    '- Chuyển sang nghiêm túc (có thể mở đầu 1 câu đùa ngắn rồi vào việc).',
    '- Mọi câu hỏi về PHÍ (TNDS, vật chất xe, cháy nổ, hàng hóa...): BẮT BUỘC theo QUY TẮC BÁO PHÍ bên dưới — gọi công cụ, không tự đoán.',
    '- Kiến thức nghiệp vụ khác: chỉ dùng TƯ LIỆU. Không có thì nói thật là chưa có dữ liệu, gợi ý hỏi nhóm vận hành. Không bịa số, điều khoản.',
    '',
    '== QUY TẮC BÁO PHÍ (giống chatbot web) ==',
    QUY_TAC_PHI,
    '- Không dùng "số 1", "tốt nhất", "rẻ nhất".',
    '',
    '== ĐỊNH DẠNG (Zalo không hiện markdown) ==',
    '- Không dùng **, #, bảng. Chuyện phiếm: 1–4 câu là đủ, đừng dài dòng. Nghiệp vụ: tối đa ~10 dòng.',
    '- Không lặp lại câu hỏi. Không tự giới thiệu lại mỗi lần.',
    coTuLieu ? '\n== BIỂU PHÍ TNDS ==\n' + (bangPhi || '(không tải được)') : '',
    coTuLieu ? '\n== TƯ LIỆU: DOANH NGHIỆP ==\n' + KB.company : '',
    pages.length ? '\n== TƯ LIỆU: TRANG LIÊN QUAN ==\n' +
      pages.map((p) => '### ' + p.title + ' (https://dbv247.com.vn' + p.url + ')\n' + p.content).join('\n\n') : '',
  ].join('\n');
}

exports.handler = async function (event) {
  const token = process.env.ZALO_GT_BOT_TOKEN;
  const secret = process.env.ZALO_GT_WEBHOOK_SECRET;
  const h = event.headers || {};
  if (!secret || h['x-noi-bo'] !== secret) { console.error('zalo-giaitri: lời gọi không hợp lệ'); return { statusCode: 403 }; }

  let d = {};
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400 }; }
  const chatId = d.chatId, nguoi = d.nguoi || '';
  const cau = String(d.cau || '').slice(0, 600);
  if (!chatId) return { statusCode: 400 };

  if (!cau) {
    await guiDen(chatId, 'Dạ em đây' + (nguoi ? ' ' + nguoi : '') + '! Gọi em mà không nói gì là em tưởng rủ đi ăn đấy 😋 Anh/chị muốn nghe chuyện cười, chơi đố vui hay tám chuyện gì ạ?', token);
    return { statusCode: 200 };
  }

  const key = process.env.GEMINI_GT_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) { await guiDen(chatId, 'Em chưa được cắm não (thiếu khoá Gemini trên Netlify) 🫠', token); return { statusCode: 200 }; }

  const store = kho();
  let ls = [];
  try {
    if (store) {
      /* Trần mỗi ngày */
      const tran = parseInt(process.env.ZALO_GT_MAX_PER_DAY || '150', 10);
      const ngay = homNay();
      const dem = (await store.get('dem', { type: 'json' })) || {};
      const n = dem.ngay === ngay ? dem.n : 0;
      if (n >= tran) {
        if (n === tran) {
          await store.setJSON('dem', { ngay, n: n + 1 });
          await guiDen(chatId, 'Hôm nay em tám nhiều quá hết pin rồi 🪫 Em đi sạc pin với ly trà sữa, mai quay lại hóng chuyện tiếp nhé cả nhà!', token);
        }
        return { statusCode: 200 };
      }
      await store.setJSON('dem', { ngay, n: n + 1 });
      ls = (await store.get('ls2-' + chatId, { type: 'json' })) || [];
    }
  } catch (e) { console.error('zalo-giaitri blobs:', e.message); }

  try {
    const nghiepVu = TU_NGHIEP_VU.test(noAccent(cau) + ' ');
    const [bangPhi, pages] = nghiepVu
      ? [await bangPhiTnds(), pickPages(cau, [])]
      : ['', []];
    const hoi = (nguoi ? nguoi + ': ' : '') + cau;
    /* Điều quản trị đã dạy: kho giải trí luôn dùng; kho nghiệp vụ khi câu hỏi dính nghiệp vụ */
    const daDay = DAY.khoiPrompt((await DAY.timDaDay('giai-tri', cau, 8))
      .concat(nghiepVu ? await DAY.timDaDay('nghiep-vu', cau, 6) : []));
    const kq = await hoiGemini(prompt(bangPhi, pages) + daDay, ls, hoi,
      { congCu: true, key: key, temperature: nghiepVu ? 0.3 : 0.9 });  // công cụ tính phí như chatbot web
    await guiDen(chatId, kq.text, token);

    if (store) {
      ls = ls.concat([{ role: 'user', text: hoi }, { role: 'bot', text: kq.text.slice(0, 500) }]).slice(-NHO);
      await store.setJSON('ls2-' + chatId, ls).catch(() => {});
    }
  } catch (e) {
    console.error('zalo-giaitri:', e.message);
    await guiDen(chatId, 'Em vừa đơ mất mấy giây như wifi quán cà phê 🥲 Anh/chị hỏi lại em sau chút nhé.', token);
  }
  return { statusCode: 200 };
};
