/* DBV247 — Phiếu tư vấn cho sale từ lead chatbot
   ===========================================================================
   Khách để lại số trong khung chat → chat-lead.js gọi hàm NỀN này (Netlify
   trả 202 ngay, hàm chạy tiếp tối đa 15 phút — đủ để gọi AI).

   Hàm đọc toàn bộ hội thoại, dựng PHIẾU GỌI LẠI và gửi vào nhóm Zalo vận hành
   (+ Telegram nếu có khai báo):
     - mức độ nóng của lead
     - những gì khách ĐÃ nói / những gì CÒN THIẾU phải hỏi
     - kịch bản gọi: câu mở đầu, câu hỏi, cách đáp phản đối, bước chốt
   Mục đích: sale chưa giỏi khai thác vẫn có "đề bài" cho đúng khách đó trước
   khi bấm gọi.

   AI lỗi → vẫn gửi bản thô (SĐT + hội thoại). Không bao giờ để mất lead.

   Chỉ nhận lời gọi nội bộ: header x-noi-bo = khoá nội bộ (xem khoaNoiBo()).
   Dùng chung GEMINI_API_KEY với chatbot web.
*/

'use strict';

const { guiZalo, chuThuong } = require('./lib/zalo');
const { bangPhiTnds } = require('./lib/bieu-phi-tnds');
const { nhanDien } = require('./lib/kich-ban-khai-thac');
const { pickPages, askGemini, KB } = require('./chat.js')._noiBo;

function khoaNoiBo() {
  return process.env.PHIEU_SECRET || process.env.ZALO_WEBHOOK_SECRET || process.env.DASHBOARD_KEY || '';
}

/* Giờ Việt Nam — để nhắc sale gọi ngay hay đầu giờ sáng mai */
function gioVN() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  const h = d.getUTCHours(), m = d.getUTCMinutes(), thu = d.getUTCDay();
  const nhan = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') +
    ' ' + String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
  const trongGio = thu !== 0 && (h > 7 || (h === 7 && m >= 30)) && (h < 17 || (h === 17 && m <= 30));
  return { nhan, trongGio };
}

function promptPhieu(nhom, bangPhi, pages) {
  const tl = pages.length
    ? pages.map((p) => '### ' + p.title + '\n' + p.content).join('\n\n')
    : '(không có)';
  return [
    'Bạn là trưởng nhóm sale giàu kinh nghiệm của DBV247 (Tập đoàn Bảo hiểm DBV — Chi nhánh Thành Đô).',
    'Nhiệm vụ: đọc hội thoại giữa khách và chatbot trên website, rồi viết PHIẾU GỌI LẠI ngắn gọn cho một nhân viên sale còn non kinh nghiệm.',
    'Phiếu phải giúp nhân viên gọi một cuộc gọi tự tin: biết khách cần gì, hỏi đúng câu, đáp được phản đối, chốt được bước tiếp theo.',
    '',
    '== QUY TẮC ==',
    '1. Chỉ ghi điều khách THỰC SỰ nói trong hội thoại vào mục ĐÃ BIẾT. Không suy diễn thành sự thật. Suy đoán thì ghi "(có thể)".',
    '2. Không bịa con số. Phí chỉ được ước tính khi có căn cứ trong LƯU Ý NỘI BỘ / BIỂU PHÍ / TƯ LIỆU bên dưới, và luôn ghi "ước tính, chờ báo phí chính thức".',
    '3. Câu nói mẫu cho sale: không dùng "số 1", "tốt nhất", "rẻ nhất", không hứa "chắc chắn được bồi thường", không hứa giảm giá ngoài biểu phí.',
    '4. Viết chữ thường, KHÔNG dùng **, #, bảng. Gạch đầu dòng bằng "- ". Tổng phiếu tối đa khoảng 30 dòng.',
    '5. Câu mở đầu phải nhắc lại đúng điều khách đã hỏi trên web để khách thấy được nhớ, không chào bán chung chung.',
    '',
    '== MỨC ĐỘ LEAD ==',
    '- NÓNG: hỏi phí/muốn mua, hoặc có hạn gấp (hết hạn trong 30 ngày, hàng sắp chạy, sắp nộp visa), hoặc đang cần bồi thường.',
    '- ẤM: có nhu cầu cụ thể nhưng chưa gấp.',
    '- LẠNH: hỏi chung chung, chưa rõ nhu cầu.',
    '',
    '== ĐỊNH DẠNG BẮT BUỘC (giữ đúng các tiêu đề) ==',
    'MỨC ĐỘ: <NÓNG/ẤM/LẠNH> — <lý do 1 dòng>',
    'SẢN PHẨM: <sản phẩm khách quan tâm>',
    'KHÁCH ĐÃ CHO BIẾT:',
    '- ...',
    'CẦN HỎI THÊM KHI GỌI:',
    '- ... (chỉ những thông tin còn thiếu, theo thứ tự quan trọng, tối đa 4)',
    'KỊCH BẢN GỌI:',
    '- Mở đầu: "<câu nói mẫu>"',
    '- Hỏi: "<1–2 câu hỏi mẫu cho thông tin quan trọng nhất còn thiếu>"',
    '- Nếu khách nói "<phản đối dễ gặp nhất với khách này>": "<cách đáp>"',
    '- Chốt: <bước tiếp theo cụ thể: xin ảnh giấy tờ qua Zalo 0869 656 561, gửi báo phí, hẹn giờ gọi lại...>',
    'LƯU Ý: <1–3 dòng: ước tính phí nếu có căn cứ, điều nên/không nên nói, cơ hội bán thêm hợp lý>',
    '',
    '== NHÓM SẢN PHẨM HỆ THỐNG NHẬN DIỆN: ' + nhom.ten + ' ==',
    'Thông tin cần khai thác:',
    nhom.hoi.map((h) => '- ' + h).join('\n'),
    'LƯU Ý NỘI BỘ (chỉ cho sale):',
    nhom.noiBo.map((h) => '- ' + h).join('\n') || '- (không có)',
    'PHẢN ĐỐI THƯỜNG GẶP VÀ CÁCH ĐÁP:',
    nhom.phanDoi.map((x) => '- Khách: "' + x[0] + '" → ' + x[1]).join('\n') || '- (không có)',
    '(Nếu hội thoại cho thấy khách quan tâm sản phẩm khác nhóm trên, theo hội thoại.)',
    '',
    bangPhi ? '== BIỂU PHÍ TNDS (chỉ dùng khi khách hỏi TNDS) ==\n' + bangPhi + '\n' : '',
    '== THÔNG TIN DOANH NGHIỆP ==',
    KB.company,
    '',
    '== TƯ LIỆU SẢN PHẨM LIÊN QUAN ==',
    tl,
  ].join('\n');
}

function dauPhieu(d, gio) {
  const L = ['📋 PHIẾU GỌI LẠI — KHÁCH TỪ CHATBOT WEB'];
  L.push('SĐT: ' + d.phone + (d.name ? ' · ' + d.name : ''));
  L.push('Lúc: ' + gio.nhan + (gio.trongGio ? ' → gọi ngay trong 15 phút' : ' → ngoài giờ, gọi đầu giờ làm việc kế tiếp'));
  if (d.page) L.push('Trang khách đang xem: https://dbv247.com.vn' + d.page);
  if (d.ctv) L.push('Mã CTV giới thiệu: ' + d.ctv);
  return L.join('\n');
}

function banTho(d) {
  return (d.transcript ? 'Hội thoại gần nhất:\n' + d.transcript : '(không có hội thoại)');
}

async function guiTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  // Telegram giới hạn 4096 ký tự/tin. Gửi chữ thường (không parse_mode) cho chắc.
  const t = chuThuong(text);
  for (let i = 0; i < t.length; i += 4000) {
    try {
      const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: t.slice(i, i + 4000), disable_web_page_preview: true }),
      });
      if (!r.ok) console.error('phieu: Telegram lỗi', r.status, await r.text());
    } catch (e) { console.error('phieu: không gọi được Telegram', e.message); }
  }
}

async function guiMoiNoi(text) {
  await guiZalo(text);
  await guiTelegram(text);
}

/* Dựng nội dung phiếu (không gửi) — tách riêng để chạy thử được */
async function dungPhieu(d) {
  const gio = gioVN();
  const dau = dauPhieu(d, gio);
  if (!process.env.GEMINI_API_KEY || !d.transcript) {
    return { text: dau + '\n\n' + banTho(d), ai: false };
  }
  const loiKhach = d.transcript.split('\n').filter((l) => l.startsWith('Khách:')).join(' ');
  const nhom = nhanDien(loiKhach, d.page);
  try {
    const [bangPhi, pages] = await Promise.all([
      nhom.ma === 'tnds' ? bangPhiTnds().catch(() => '') : Promise.resolve(''),
      Promise.resolve(pickPages(loiKhach.slice(-1500), [])),
    ]);
    const than = await askGemini(promptPhieu(nhom, bangPhi, pages), [],
      'HỘI THOẠI TRÊN WEBSITE:\n' + d.transcript + '\n\nViết phiếu gọi lại theo đúng định dạng.');
    return {
      text: dau + '\n\n' + chuThuong(than) +
        '\n\n— Phiếu do AI soạn từ hội thoại, kiểm tra lại khi gọi. Bản hội thoại đầy đủ: Netlify Forms › chatbot-lead.',
      ai: true,
    };
  } catch (e) {
    console.error('phieu: AI lỗi —', e.message);
    return { text: dau + '\n(AI chưa soạn được phiếu, gửi bản thô)\n\n' + banTho(d), ai: false };
  }
}

exports.handler = async function (event) {
  const khoa = khoaNoiBo();
  const h = event.headers || {};
  if (!khoa || h['x-noi-bo'] !== khoa) {
    console.error('phieu: lời gọi không hợp lệ');
    return { statusCode: 403 };
  }
  let d = {};
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400 }; }
  if (!d.phone) return { statusCode: 400 };

  const phieu = await dungPhieu(d);
  await guiMoiNoi(phieu.text);
  return { statusCode: 200 };
};

exports._noiBo = { dungPhieu, khoaNoiBo, promptPhieu };
