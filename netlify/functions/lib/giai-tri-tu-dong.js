/* DBV247 — Các tính năng gắn kết tự động của Bot em gái DBV
   ===========================================================================
   LỊCH (giờ Việt Nam, do zalo-giaitri-lich.js gọi mỗi giờ):
     8:00 mỗi ngày   le        ngày lễ (dương + âm lịch) và ngày thành lập
                     thamnien  kỷ niệm ngày vào DBV (tròn năm)
     8:00 ngày 1     tongket   bảng xếp hạng đố vui + ngôi sao được khen tháng trước
     8:00 thứ Hai    thuhai    chào tuần mới + sinh nhật trong tuần + cà phê ghép đôi
     15:00 T2,T4,T6  dovui    đố vui SUY LUẬN tự sáng tác (không tra Google được)
     15:00 T3        dovui    đố vui NGHIỆP VỤ từ website (gợi ý tên trang dbv247.com.vn)
     15:00 thứ Năm   dovuisp  đố vui nghiệp vụ từ website
                     mỗi câu: +1 tham gia, +3 đúng đầu tiên, rồi CÂU BỔ SUNG +2 (người ăn câu chính không tính)
     16:00 thứ Sáu   thusau    tạm biệt tuần + rủ kể chuyện vui
   (Sinh nhật: zalo-sinh-nhat-cron.js, 8:00 — tính năng riêng.)

   THEO LỆNH (tag bot):
     khen: Tên + lý do        ai cũng dùng được → bot đăng lời khen, cuối tháng tổng kết
     bxh                       bảng xếp hạng đố vui tháng này
     chào mừng: Tên, Phòng     (quản trị) chào thành viên mới
     thử: dovui|dovuisp|dovuisl|dovuiweb|thuhai|thusau|caphe|le|thamnien|tongket   (quản trị) chạy thử vào chính chat này

   TẮT từng tính năng: ZALO_GT_TAT=dovui,khen,... (cách nhau dấu phẩy)
   Ngày thành lập để chúc: ZALO_GT_NGAY_THANH_LAP=dd/mm (vd 06/06)
   Cà phê ghép đôi có Ban Giám đốc: ZALO_GT_CAPHE_BGD=on ; số cặp: ZALO_GT_CAPHE_SO_CAP (mặc định 3)
*/
'use strict';

const DAY = require('./day-bot');
const NS = require('./nhan-su');
const SN = require('./sinh-nhat');
const { amLich } = require('./am-lich');
const { vietAI } = require('./gt-ai');

const kho = () => DAY.kho();
const dd = (n) => String(n).padStart(2, '0');
const bd = (s) => DAY.boDau(s);
const tat = (ten) => String(process.env.ZALO_GT_TAT || '').toLowerCase().split(',').map((s) => s.trim()).includes(ten);

function bayGio() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', hour12: false, weekday: 'short' })
    .formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
  const thu = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  return { d: +p.day, m: +p.month, y: +p.year, h: +p.hour % 24, thu, ngay: p.year + '-' + p.month + '-' + p.day, thang: p.year + '-' + p.month };
}
async function doc(k, mac) { const s = kho(); if (!s) return mac; try { const v = await s.get(k, { type: 'json' }); return v == null ? mac : v; } catch (e) { return mac; } }
async function ghi(k, v) { const s = kho(); if (s) await s.setJSON(k, v); }

/* ── Ngày lễ ─────────────────────────────────────────────────────────────── */
const LE_DUONG = {
  '1/1': 'Tết Dương lịch', '8/3': 'Ngày Quốc tế Phụ nữ 8/3 (chúc riêng các chị em trong nhà)',
  '30/4': 'Ngày Giải phóng miền Nam 30/4', '1/5': 'Ngày Quốc tế Lao động 1/5',
  '1/6': 'Ngày Quốc tế Thiếu nhi 1/6 (chúc các bé nhà cán bộ)', '2/9': 'Quốc khánh 2/9',
  '20/10': 'Ngày Phụ nữ Việt Nam 20/10 (chúc riêng các chị em trong nhà)', '20/11': 'Ngày Nhà giáo Việt Nam 20/11',
  '24/12': 'Đêm Giáng sinh',
};
const LE_AM = { '1/1': 'Mùng 1 Tết Nguyên đán', '10/3': 'Giỗ Tổ Hùng Vương (10/3 âm lịch)', '15/8': 'Tết Trung thu (Rằm tháng Tám)', '23/12': 'Ngày ông Công ông Táo (23 tháng Chạp)' };
function leHomNay(t) {
  const ds = [];
  if (LE_DUONG[t.d + '/' + t.m]) ds.push(LE_DUONG[t.d + '/' + t.m]);
  const a = amLich(t.d, t.m, t.y);
  if (!a.nhuan && LE_AM[a.ngay + '/' + a.thang]) ds.push(LE_AM[a.ngay + '/' + a.thang]);
  const tl = String(process.env.ZALO_GT_NGAY_THANH_LAP || '').match(/(\d{1,2})\/(\d{1,2})/);
  if (tl && +tl[1] === t.d && +tl[2] === t.m) ds.push('Ngày thành lập Chi nhánh DBV Thành Đô (sinh nhật chi nhánh)');
  return ds;
}

/* ── Đố vui ──────────────────────────────────────────────────────────────────
   Hai kiểu câu đố (đổi theo thứ trong tuần):
     suyluan  T2, T4, T6  câu đố suy luận TỰ SÁNG TÁC (dãy số, đếm, ai nói dối, tính giờ/tuổi, mật mã…)
                          — không tra Google được, phải nghĩ thật.
     web      T3, T5      câu hỏi nghiệp vụ lấy từ MỘT trang sản phẩm trên dbv247.com.vn, kèm gợi ý
                          tên trang → mọi người vào website tìm đáp án.
   Mỗi câu chính có thêm CÂU BỔ SUNG (+2): mở ra ngay khi câu chính có người đúng; người đã ăn
   điểm câu chính không được tính điểm câu bổ sung (mỗi ngày chỉ ăn điểm "đúng" 1 lần). */
const kq = (chatId) => 'do-vui/' + chatId;
const chuanDap = (s) => ' ' + bd(s).replace(/(\d)[.,](?=\d{3}(\D|$))/g, '$1').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
function dungDapAn(traLoi, cd) {
  if (!cd) return false;
  const t = chuanDap(traLoi).trim();
  return [cd.dap_an].concat(cd.chap_nhan || []).some((a) => {
    const x = chuanDap(a).trim();
    if (!x) return false;
    // Đáp án là số: phải đúng nguyên con số (cho phép đuôi đơn vị: 15s, 500k, 10d, 20tr…)
    if (/^\d+$/.test(x)) return new RegExp('(^| )' + x + '(d|k|s|h|p|tr|ty|trieu|dong|giay|phut|gio|nam|tuoi|cai|xe|don|nguoi|lan)?( |$)').test(t);
    return x.length >= 2 && (' ' + t + ' ').includes(' ' + x + ' ');
  });
}
/* Kho dự phòng (khi Google AI quá tải) — câu suy luận tự soạn, có câu bổ sung */
const DU_PHONG = [
  { cau_hoi: 'Họp đầu tuần phòng Kinh doanh có 5 người, ai cũng bắt tay mỗi người còn lại đúng 1 lần. Có tất cả bao nhiêu cái bắt tay? 🤝', dap_an: '10', chap_nhan: ['muoi'], giai_thich: '5×4÷2 = 10 cái.',
    phu: { cau_hoi: 'Đúng lúc đó sếp vào và bắt tay tất cả 5 người. Giờ tổng cộng có bao nhiêu cái bắt tay?', dap_an: '15', chap_nhan: ['muoi lam', 'muoi nam'], giai_thich: '10 cũ + 5 cái của sếp = 15.' } },
  { cau_hoi: 'Số hợp đồng chị Mai chốt theo từng tuần: 2, 3, 5, 8, 12, … Tuần tiếp theo chị chốt bao nhiêu hợp đồng? 📈', dap_an: '17', chap_nhan: ['muoi bay'], giai_thich: 'Khoảng cách tăng dần 1, 2, 3, 4 → tiếp theo +5: 12 + 5 = 17.',
    phu: { cau_hoi: 'Giữ đúng quy luật đó, tuần sau nữa chị Mai chốt bao nhiêu hợp đồng?', dap_an: '23', chap_nhan: ['hai muoi ba', 'hai ba'], giai_thich: '17 + 6 = 23.' } },
  { cau_hoi: 'Trong pantry có cái cốc bị vỡ. An: "Bình làm vỡ". Bình: "Không phải tôi". Chi: "Không phải tôi". Biết chỉ có ĐÚNG MỘT người nói thật. Ai làm vỡ cốc? ☕', dap_an: 'Chi', chap_nhan: ['chi lam', 'ban chi'], giai_thich: 'Thử từng người: chỉ khi Chi làm vỡ thì mới có đúng 1 câu thật (câu của Bình).',
    phu: { cau_hoi: 'Vậy trong ba người An, Bình, Chi, ai là người duy nhất nói thật?', dap_an: 'Bình', chap_nhan: ['binh'], giai_thich: 'Chi làm vỡ → câu "Không phải tôi" của Bình là câu thật duy nhất.' } },
  { cau_hoi: 'Giao ban bắt đầu lúc 8:45 và kéo dài 95 phút. Mấy giờ thì tan họp? ⏰', dap_an: '10h20', chap_nhan: ['10 20', '10 gio 20', '10h20p'], giai_thich: '8:45 + 1 giờ 35 phút = 10:20.',
    phu: { cau_hoi: 'Nếu cuộc họp bắt đầu muộn 20 phút nhưng được rút ngắn 30 phút thì mấy giờ tan họp?', dap_an: '10h10', chap_nhan: ['10 10', '10 gio 10', '10h10p'], giai_thich: 'Bắt đầu 9:05, họp 65 phút → 10:10.' } },
  { cau_hoi: 'Năm nay tuổi chị Lan gấp 3 lần tuổi con. 10 năm nữa tuổi chị chỉ còn gấp 2 lần tuổi con. Năm nay chị Lan bao nhiêu tuổi? 👩‍👦', dap_an: '30', chap_nhan: ['ba muoi'], giai_thich: 'Con x tuổi: 3x + 10 = 2(x + 10) → x = 10, chị Lan 30.',
    phu: { cau_hoi: 'Cách đây mấy năm thì tuổi chị Lan gấp 5 lần tuổi con?', dap_an: '5', chap_nhan: ['nam'], giai_thich: '30 − y = 5(10 − y) → y = 5 năm trước (chị 25, con 5).' } },
  { cau_hoi: 'Bãi xe khách hàng có ô tô và xe máy, tổng cộng 20 xe và 56 bánh. Có bao nhiêu ô tô? 🚗🏍️', dap_an: '8', chap_nhan: ['tam'], giai_thich: 'Coi hết là xe máy: 40 bánh, dư 16 bánh, mỗi ô tô thêm 2 → 8 ô tô.',
    phu: { cau_hoi: 'Bán bảo hiểm TNDS: mỗi ô tô 1 đơn, còn xe máy cứ 2 xe gộp 1 đơn. Cả bãi cần bao nhiêu đơn?', dap_an: '14', chap_nhan: ['muoi bon'], giai_thich: '8 đơn ô tô + 12 xe máy ÷ 2 = 6 đơn → 14.' } },
  { cau_hoi: 'Mật mã nội bộ: DBV = 4-2-22 (thứ tự chữ cái trong bảng chữ cái tiếng Anh). Vậy "XE" là gì? 🔐', dap_an: '24-5', chap_nhan: ['24 5', '245'], giai_thich: 'X là chữ thứ 24, E là chữ thứ 5.',
    phu: { cau_hoi: 'Cùng mật mã đó, cộng các số của chữ "BAO" lại được bao nhiêu?', dap_an: '18', chap_nhan: ['muoi tam'], giai_thich: 'B 2 + A 1 + O 15 = 18.' } },
  { cau_hoi: 'Đồng hồ treo phòng điểm 3 tiếng "boong" lúc 3 giờ, mất 6 giây tính từ tiếng đầu đến tiếng cuối. Lúc 6 giờ, điểm 6 tiếng thì mất bao nhiêu giây? 🕕', dap_an: '15', chap_nhan: ['muoi lam', 'muoi nam'], giai_thich: '3 tiếng có 2 khoảng → 3 giây/khoảng. 6 tiếng có 5 khoảng → 15 giây.',
    phu: { cau_hoi: 'Vẫn chiếc đồng hồ đó, lúc 12 giờ điểm 12 tiếng thì mất bao nhiêu giây?', dap_an: '33', chap_nhan: ['ba muoi ba', 'ba ba'], giai_thich: '11 khoảng × 3 giây = 33 giây.' } },
];

const YC_SUY_LUAN = 'Tự SÁNG TÁC một câu đố SUY LUẬN NGUYÊN BẢN cho dân văn phòng chơi lúc 15:00.' +
  '\nYÊU CẦU:' +
  '\n- KHÔNG dùng câu đố mẹo, đố chữ dân gian hay câu đố nổi tiếng có sẵn trên mạng (gõ Google ra đáp án là hỏng). Người chơi phải tự nghĩ.' +
  '\n- Chọn MỘT dạng (đổi dạng so với các câu gần đây): dãy số/chữ có quy luật; đếm (bắt tay, đếm bánh xe, chia nhóm); ai nói thật – ai nói dối; xếp thứ tự chỗ ngồi/ai đến trước; tính giờ, tính tuổi; mật mã chữ–số; cân đo, rót nước; xác suất đơn giản.' +
  '\n- Bối cảnh văn phòng DBV Thành Đô cho vui (đồng nghiệp tên hư cấu, phòng ban, hợp đồng, xe cộ, cà phê…). KHÔNG dùng tên thật của ai.' +
  '\n- Giải được trong 1–3 phút, chỉ cần cộng trừ nhân chia; có DUY NHẤT một đáp án. Đáp án là một con số hoặc 1–3 chữ.' +
  '\n- Kèm CÂU BỔ SUNG nối tiếp câu chính (cùng bối cảnh, hơi khác), cũng có đáp án duy nhất, KHÔNG lộ đáp án câu chính.' +
  '\n- Viết "loi_giai" từng bước TRƯỚC, kiểm tra lại cẩn thận rồi mới chốt đáp án. Nếu thấy có hơn một đáp án thì sửa đề.';

function yeuCauWeb(trang) {
  return 'Ra MỘT câu hỏi đố vui NGHIỆP VỤ dựa trên nội dung trang "' + trang.title + '" của website dbv247.com.vn (tư liệu bên dưới).' +
    '\nMục đích: mọi người phải VÀO WEBSITE đọc trang này mới tìm ra đáp án, qua đó hiểu sản phẩm.' +
    '\nYÊU CẦU:' +
    '\n- Hỏi một chi tiết CỤ THỂ CÓ TRONG TƯ LIỆU: con số (mức phí, số tiền, tỷ lệ %, số ngày, độ tuổi, thời hạn), tên quyền lợi/điều khoản, đối tượng được bảo hiểm, trường hợp loại trừ…' +
    '\n- Không hỏi điều ai cũng đoán được, không hỏi điều tư liệu không nói rõ. Không bịa số.' +
    '\n- Đáp án NGẮN (con số hoặc 1–4 chữ) để so khớp.' +
    '\n- Kèm CÂU BỔ SUNG về một chi tiết KHÁC cũng trên trang này.' +
    '\n- Câu hỏi có mở đầu vui, ngắn gọn; KHÔNG ghi đáp án trong câu hỏi.' +
    '\n- Thêm trường "ten_trang": tên trang viết tiếng Việt CÓ DẤU, ngắn gọn (vd "Bảo hiểm vật chất ô tô") để làm gợi ý.';
}

async function taoCauDo(kieu) {
  const lichSu = await doc('do-vui-lich-su', []);
  let yc, trang = null;
  if (kieu === 'web') {
    const { KB } = require('./kien-thuc');
    const ds = KB.pages.filter((p) => p.sp && KB.chunks.some((c) => c.u === p.url));
    if (ds.length) {
      trang = ds[Math.floor(Math.random() * ds.length)];
      const noiDung = KB.chunks.filter((c) => c.u === trang.url).map((c) => (c.h ? '[' + c.h + '] ' : '') + c.x).join('\n');
      yc = yeuCauWeb(trang) + '\nTƯ LIỆU (chỉ hỏi điều có trong đây):\n' + trang.title + '\n' + noiDung.slice(0, 5000);
    } else kieu = 'suyluan';
  }
  if (kieu === 'suyluan') yc = YC_SUY_LUAN;
  yc += '\nKhông lặp các câu đã ra: ' + (lichSu.slice(-25).join(' | ') || '(chưa có)') +
    '\nTrả JSON: {"loi_giai": "giải từng bước câu chính", "cau_hoi": "câu đố", "dap_an": "đáp án ngắn", "chap_nhan": ["các cách viết khác cùng nghĩa: không dấu, số viết bằng chữ, có đơn vị…"], "giai_thich": "1–2 câu giải thích vui",' +
    ' "phu": {"loi_giai": "...", "cau_hoi": "câu bổ sung", "dap_an": "...", "chap_nhan": ["..."], "giai_thich": "..."}}';
  let q;
  try {
    q = await vietAI(yc, kieu === 'suyluan' ? { json: true, nhiet: 1, muc: 'medium', hetGio: 120000 } : { json: true, nhiet: 0.7, hetGio: 90000 });
    if (!q || !q.cau_hoi || !q.dap_an) throw new Error('câu đố thiếu nội dung');
    if (q.phu && (!q.phu.cau_hoi || !q.phu.dap_an)) delete q.phu;
  } catch (e) {
    // AI lỗi/quá tải → lấy câu trong kho dự phòng (chưa ra gần đây) để lịch không bị lỡ
    console.warn('do-vui: AI lỗi, dùng câu dự phòng —', e.message);
    const con = DU_PHONG.filter((x) => !lichSu.includes(x.cau_hoi.slice(0, 120)));
    q = JSON.parse(JSON.stringify((con.length ? con : DU_PHONG)[Math.floor(Math.random() * (con.length || DU_PHONG.length))]));
    kieu = 'suyluan'; trang = null;
  }
  delete q.loi_giai; if (q.phu) delete q.phu.loi_giai;
  q.kieu = kieu; if (trang) q.trang = String(q.ten_trang || trang.title).slice(0, 80); delete q.ten_trang;
  await ghi('do-vui-lich-su', lichSu.concat([String(q.cau_hoi).slice(0, 120)]).slice(-40));
  return q;
}
async function diemThang(thang) { return doc('diem/' + thang, {}); }
function bangXep(diem, n) {
  return Object.values(diem).sort((a, b) => b.diem - a.diem || (b.dung || 0) - (a.dung || 0)).slice(0, n || 5)
    .map((x, i) => (['🥇', '🥈', '🥉'][i] || (i + 1) + '.') + ' ' + x.ten + ': ' + x.diem + ' điểm').join('\n');
}

/* ── Giải thưởng tháng (quản trị đặt bằng lệnh "giải thưởng: ...", lưu Blobs) ── */
async function top3Ngan(thang) {
  const d = await diemThang(thang);
  const ds = Object.values(d).sort((a, b) => b.diem - a.diem || (b.dung || 0) - (a.dung || 0)).slice(0, 3);
  return ds.length ? '\n📊 Đang dẫn đầu: ' + ds.map((x) => x.ten + ' ' + x.diem + 'đ').join(' · ') : '\n📊 Bảng xếp hạng tháng còn trống — ai đoán đầu tiên là lên top luôn!';
}
async function giaiThuong() { const g = await doc('giai-thuong', null); return g && g.noi_dung ? g.noi_dung : ''; }
const dongGiai = async () => { const g = await giaiThuong(); return g ? '\n🎁 GIẢI THÁNG: ' + g : ''; };

/* Cách tính điểm (khuyến khích THAM GIA, không chỉ người giỏi):
     +1  mỗi ngày có đoán câu đố (đúng hay sai, tối đa 1 lần/ngày)
     +3  người trả lời ĐÚNG câu chính đầu tiên
     +2  người trả lời ĐÚNG câu bổ sung đầu tiên (không tính cho người đã ăn điểm câu chính)
   Bằng điểm thì ai đúng nhiều hơn xếp trên. */
const DIEM_THAM_GIA = 1, DIEM_DUNG = 3, DIEM_PHU = 2;
const CACH_TINH = 'đoán là +1 điểm (1 lần/ngày), đúng câu chính đầu tiên +3, đúng câu bổ sung đầu tiên +2 (người đã ăn điểm câu chính không tính).';
function laLuotDoan(cau) {
  const c = bd(cau).trim();
  return c.length > 0 && c.length <= 60 && !/^(khen|bxh|bang xep hang|hoc|day|quen|thu|sinh nhat|nhan su|trang thai|giai thuong|chao mung|id|toi la ai)\b/.test(c);
}
function cong(diem, id, ten, so, dung, ngay) {
  const r = diem[id] || { ten, diem: 0, dung: 0, ngay_choi: '' };
  r.ten = ten || r.ten; r.diem += so; if (dung) r.dung = (r.dung || 0) + 1; if (ngay) r.ngay_choi = ngay;
  diem[id] = r; return r;
}
const goiYWeb = (cd) => cd.kieu === 'web' && cd.trang ? '\n🔎 Gợi ý: đáp án có trên website dbv247.com.vn – trang "' + cd.trang + '"' : '';
const phuMo = (cd) => !!(cd && cd.xong && cd.phu && cd.phu_mo && !cd.phu_xong);

/* Gọi từ webhook với MỌI tin vào nhóm. Trả về câu trả lời (khi đúng) hoặc null.
   Đoán sai vẫn được ghi +1 điểm tham gia (1 lần/ngày) rồi để AI trêu tiếp. */
async function kiemTraDapAn(chatId, cau, nguoi) {
  if (tat('dovui') && tat('dovuisp')) return null;
  const cd = await doc(kq(chatId), null);
  const t = bayGio();
  if (!cd || cd.ngay !== t.ngay || !nguoi.id || !laLuotDoan(cau)) return null;
  if (cd.xong && !phuMo(cd)) return null;
  const ten = nguoi.ten || 'Anh/chị';
  const diem = await diemThang(t.thang);
  const lanDau = !diem[nguoi.id] || diem[nguoi.id].ngay_choi !== t.ngay;
  const thamGia = async () => { if (lanDau) { cong(diem, nguoi.id, nguoi.ten, DIEM_THAM_GIA, false, t.ngay); await ghi('diem/' + t.thang, diem); } return null; };

  /* 1) Câu chính còn mở */
  if (!cd.xong) {
    if (!dungDapAn(cau, cd)) return thamGia();
    const so = DIEM_DUNG + (lanDau ? DIEM_THAM_GIA : 0);
    cd.xong = true; cd.nguoi = nguoi.ten; cd.nguoi_id = nguoi.id; if (cd.phu) cd.phu_mo = true;
    await ghi(kq(chatId), cd);
    const r = cong(diem, nguoi.id, nguoi.ten, so, true, t.ngay);
    await ghi('diem/' + t.thang, diem);
    return '🎉 CHÍNH XÁC! ' + ten + ' nhanh tay nhất, +' + so + ' điểm (tháng này: ' + r.diem + ' điểm).\n' +
      'Đáp án: ' + cd.dap_an + (cd.giai_thich ? '\n💡 ' + cd.giai_thich : '') +
      (cd.phu
        ? '\n\n⭐ CÂU HỎI BỔ SUNG (+2 điểm) — cơ hội cho người CHƯA ăn điểm:\n' + cd.phu.cau_hoi + goiYWeb(cd) +
          '\n👉 Reply tin này để trả lời. (' + ten + ' vừa ăn điểm câu chính rồi nên nhường lượt nha, đừng spoil 🤐)'
        : '\n\n🏆 Bảng xếp hạng tháng:\n' + bangXep(diem, 3) + (await dongGiai()) + '\nHẹn cả nhà 15:00 mai nhé!');
  }

  /* 2) Câu bổ sung đang mở */
  if (!dungDapAn(cau, cd.phu)) return thamGia();
  if (nguoi.id === cd.nguoi_id)
    return '😆 Đúng rồi đó ' + ten + ', nhưng anh/chị đã ăn điểm câu chính hôm nay rồi — câu bổ sung không tính điểm nha, nhường cơ hội cho mọi người! Cả nhà vẫn còn cơ hội +2 điểm đó 💨';
  const so = DIEM_PHU + (lanDau ? DIEM_THAM_GIA : 0);
  cd.phu_xong = true; cd.nguoi_phu = nguoi.ten; await ghi(kq(chatId), cd);
  const r = cong(diem, nguoi.id, nguoi.ten, so, true, t.ngay);
  await ghi('diem/' + t.thang, diem);
  return '⭐ XUẤT SẮC! ' + ten + ' giải được câu bổ sung, +' + so + ' điểm (tháng này: ' + r.diem + ' điểm).\n' +
    'Đáp án: ' + cd.phu.dap_an + (cd.phu.giai_thich ? '\n💡 ' + cd.phu.giai_thich : '') +
    '\n\n🏆 Bảng xếp hạng tháng:\n' + bangXep(diem, 3) + (await dongGiai()) + '\nHẹn cả nhà 15:00 mai nhé!';
}
/* Câu đố còn mở (để AI chat biết mà trêu/gợi ý, KHÔNG lộ đáp án) */
async function cauDoDangMo(chatId) {
  const cd = await doc(kq(chatId), null);
  if (!cd || cd.ngay !== bayGio().ngay) return null;
  if (!cd.xong) return cd.cau_hoi;
  if (phuMo(cd)) return '(Câu bổ sung +2 điểm, ' + (cd.nguoi || 'người') + ' đã giải câu chính nên không tính điểm cho người đó) ' + cd.phu.cau_hoi;
  return null;
}

/* ── Cà phê ghép đôi ─────────────────────────────────────────────────────── */
async function ghepDoi() {
  let ns = await NS.docNs();
  if (String(process.env.ZALO_GT_CAPHE_BGD || '').toLowerCase() !== 'on') ns = ns.filter((x) => !/giam doc/.test(bd(x.phong)));
  if (ns.length < 2) return [];
  const soCap = Math.max(1, parseInt(process.env.ZALO_GT_CAPHE_SO_CAP || '3', 10));
  const cu = new Set(await doc('caphe-lich-su', []));
  const khoa = (a, b) => [a.ten, b.ten].sort().join('+');
  let tot = [];
  for (let lan = 0; lan < 30 && tot.length < soCap; lan++) {
    const tron = ns.slice().sort(() => Math.random() - 0.5), dung = new Set(), cap = [];
    for (const a of tron) {
      if (dung.has(a.ten) || cap.length >= soCap) continue;
      const b = tron.find((x) => !dung.has(x.ten) && x.ten !== a.ten && x.phong !== a.phong && !cu.has(khoa(a, x)));
      if (b) { cap.push([a, b]); dung.add(a.ten); dung.add(b.ten); }
    }
    if (cap.length > tot.length) tot = cap;
  }
  await ghi('caphe-lich-su', Array.from(cu).concat(tot.map(([a, b]) => khoa(a, b))).slice(-24));
  return tot;
}

/* ── Các việc theo lịch: trả về mảng { chatId, text } hoặc text chung ───── */
async function viec(ten, o) {
  const t = bayGio();
  if (ten === 'le') {
    const le = leHomNay(t);
    if (!le.length) return o.thu ? ['(Thử) Hôm nay ' + t.d + '/' + t.m + ' không phải ngày lễ nào em biết.'] : [];
    return [await vietAI('Hôm nay là ' + le.join(' và ') + '. Viết lời chúc ngắn (tối đa 5 câu), ấm áp, vui, hợp không khí văn phòng.')];
  }
  if (ten === 'thamnien') {
    const ns = (await NS.docNs()).filter((x) => x.vao && x.vao.d === t.d && x.vao.m === t.m && x.vao.y < t.y);
    if (!ns.length) return o.thu ? ['(Thử) Hôm nay không có ai tròn năm về nhà DBV.'] : [];
    const ds = ns.map((x) => x.ten + ' (' + x.phong + ') tròn ' + (t.y - x.vao.y) + ' năm');
    return [await vietAI('Hôm nay là kỷ niệm ngày về nhà DBV của: ' + ds.join('; ') +
      '. Viết lời chúc mừng "tròn năm gắn bó" (tối đa 5 câu), cảm ơn sự đồng hành, rủ cả nhà vào chúc. Nhắc đủ tên và số năm. Nếu nhiều người cùng ngày thì nói đây cũng là dịp kỷ niệm chung của chi nhánh.')];
  }
  if (ten === 'tongket') {
    const tr = new Date(Date.UTC(t.y, t.m - 2, 1));
    const thangTruoc = tr.getUTCFullYear() + '-' + dd(tr.getUTCMonth() + 1);
    const diem = await diemThang(thangTruoc);
    const khen = await doc('khen/' + thangTruoc, []);
    if (!Object.keys(diem).length && !khen.length) return o.thu ? ['(Thử) Tháng trước chưa có điểm đố vui hay lời khen nào.'] : [];
    const dem = {};
    khen.forEach((k) => (dem[k.cho] = (dem[k.cho] || 0) + 1));
    const sao = Object.entries(dem).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const thongTin = (Object.keys(diem).length ? 'Bảng xếp hạng đố vui tháng ' + (tr.getUTCMonth() + 1) + ':\n' + bangXep(diem, 5) : '') +
      (sao.length ? '\nNgôi sao được khen nhiều nhất: ' + sao.map(([n, c]) => n + ' (' + c + ' lời khen)').join(', ') + '. Tổng ' + khen.length + ' lời khen.' : '');
    const giai = await giaiThuong();
    const vo = Object.values(diem).sort((a, b) => b.diem - a.diem || (b.dung || 0) - (a.dung || 0))[0];
    const loi = await vietAI('Viết lời tổng kết tháng vui, vinh danh (tối đa 5 câu), KHÔNG lặp lại bảng số liệu (em sẽ dán kèm).' +
      (giai && vo ? ' Công bố người thắng giải tháng là ' + vo.ten + ', phần thưởng: ' + giai + '. Chúc mừng thật long trọng, lịch sự với lãnh đạo.' : '') +
      ' Rủ cả nhà tháng mới chơi đố vui 15:00 để giành giải. Dữ liệu:\n' + thongTin);
    return [loi + '\n\n' + thongTin.trim()];
  }
  if (ten === 'thuhai' || ten === 'caphe') {
    let phan = [];
    if (ten === 'thuhai') {
      const sn = await SN.docDs();
      const trongTuan = [];
      for (let i = 0; i < 7; i++) {
        const x = new Date(Date.UTC(t.y, t.m - 1, t.d + i));
        sn.filter((s) => s.d === x.getUTCDate() && s.m === x.getUTCMonth() + 1).forEach((s) => trongTuan.push(s.ten + ' (' + dd(s.d) + '/' + dd(s.m) + ')'));
      }
      const giai = await giaiThuong();
      phan.push(await vietAI('Viết lời chào sáng thứ Hai đầu tuần cho cả nhóm (tối đa 4 câu), tiếp năng lượng, hài hước nhẹ.' +
        (giai ? ' Nhắc khéo: chơi đố vui 15:00 tích điểm, cuối tháng ' + giai + '.' : '') +
        (trongTuan.length ? ' Nhắc tuần này có sinh nhật: ' + trongTuan.join(', ') + '.' : '')));
    }
    if (!tat('caphe')) {
      const cap = await ghepDoi();
      if (cap.length) phan.push('☕ CÀ PHÊ GHÉP ĐÔI tuần này (khác phòng ngồi chung một bàn nhé):\n' +
        cap.map(([a, b]) => '- ' + a.ten + ' (' + a.phong + ') × ' + b.ten + ' (' + b.phong + ')').join('\n') +
        '\nHẹn nhau một ly trong tuần, chụp ảnh khoe nhóm thì càng vui 📸');
      else if (ten === 'caphe') phan.push('(Thử) Chưa ghép được cặp nào — cần danh sách nhân sự có phòng ban ("nhân sự: ...").');
    }
    return phan.length ? [phan.join('\n\n')] : [];
  }
  if (ten === 'thusau') {
    const sn = await SN.docDs();
    const cuoiTuan = [1, 2].map((i) => new Date(Date.UTC(t.y, t.m - 1, t.d + i)))
      .flatMap((x) => sn.filter((s) => s.d === x.getUTCDate() && s.m === x.getUTCMonth() + 1).map((s) => s.ten));
    const khen = (await doc('khen/' + t.thang, [])).length;
    return [await vietAI('Chiều thứ Sáu 16:00: viết lời tạm biệt tuần làm việc (tối đa 4 câu), vui, rủ mỗi người reply kể MỘT chuyện vui trong tuần.' +
      (cuoiTuan.length ? ' Nhắc cuối tuần này sinh nhật: ' + cuoiTuan.join(', ') + ' — rủ chúc sớm.' : '') +
      (khen ? ' Tháng này nhóm đã gửi nhau ' + khen + ' lời khen qua "Góc khen".' : ''))];
  }
  if (['dovui', 'dovuisp', 'dovuisl', 'dovuiweb'].includes(ten)) {
    // dovuisl / dovuiweb: chỉ để quản trị chạy thử từng kiểu
    const kieu = ten === 'dovuisl' ? 'suyluan' : (ten === 'dovuiweb' || ten === 'dovuisp' || t.thu === 2) ? 'web' : 'suyluan';
    const out = [];
    for (const chatId of o.nhom) {
      const cu = await doc(kq(chatId), null);
      let lo = '';
      if (cu && !cu.xong) lo = '📖 Đáp án câu đố trước: ' + cu.dap_an + (cu.giai_thich ? ' — ' + cu.giai_thich : '') +
        (cu.phu ? '\n📖 Câu bổ sung: ' + cu.phu.dap_an + (cu.phu.giai_thich ? ' — ' + cu.phu.giai_thich : '') : '') + '\n\n';
      else if (cu && cu.phu && !cu.phu_xong) lo = '📖 Đáp án câu bổ sung hôm trước: ' + cu.phu.dap_an + (cu.phu.giai_thich ? ' — ' + cu.phu.giai_thich : '') + '\n\n';
      const q = await taoCauDo(kieu);
      await ghi(kq(chatId), Object.assign({}, q, { ngay: t.ngay, loai: ten, xong: false }));
      out.push({ chatId, text: lo + (q.kieu === 'web' ? '🔎 ĐỐ VUI NGHIỆP VỤ DBV' : '🧩 ĐỐ VUI TRÀ CHIỀU – SUY LUẬN') + '\n' + q.cau_hoi + goiYWeb(q) +
        '\n\n👉 Reply tin này để đoán: đoán là +1 điểm tham gia, ai ĐÚNG đầu tiên +3 điểm!' +
        (q.phu ? '\n⭐ Có người đúng xong em tung tiếp CÂU BỔ SUNG +2 điểm cho những người còn lại.' : '') +
        (await dongGiai()) + await top3Ngan(t.thang) });
    }
    return out;
  }
  return [];
}

/* Lịch theo giờ VN → danh sách việc */
/* Mỗi việc có KHUNG giờ: lỡ lượt đầu (Netlify chạy trễ, AI lỗi) thì giờ sau chạy bù */
function viecTheoGio(t) {
  const v = [];
  if (t.h >= 8 && t.h <= 10) { if (t.thu === 1) v.push('thuhai'); v.push('le', 'thamnien'); if (t.d === 1) v.push('tongket'); }
  if (t.h >= 15 && t.h <= 16 && t.thu >= 1 && t.thu <= 5) v.push(t.thu === 4 ? 'dovuisp' : 'dovui');
  if (t.h >= 16 && t.h <= 17 && t.thu === 5) v.push('thusau');
  return v.filter((x) => !tat(x));
}

/* ── Góc khen, chào mừng (theo lệnh) ─────────────────────────────────────── */
async function khen(cau, nguoi) {
  const than = cau.replace(/^[^:]*:/, '').trim();
  if (than.length < 3) return { loi: 'Viết dạng: khen: Tên + lý do. Vd: khen: chị Thúy vì chốt hợp đồng đội xe hôm qua 👏' };
  const ns = await NS.docNs();
  // Đoán người được khen: tên trong danh sách nhân sự xuất hiện trong câu
  const bo = bd(than);
  let cho = ns.map((x) => x.ten).sort((a, b) => b.length - a.length).find((n) => bo.includes(bd(n)));
  if (!cho) cho = ns.map((x) => x.ten).find((n) => new RegExp('(^|\\s)' + bd(n).split(' ').pop() + '(\\s|$)').test(bo) &&
    ns.filter((y) => bd(y.ten).split(' ').pop() === bd(n).split(' ').pop()).length === 1) || than.split(/\s+(vi|vì|do|đã|da)\s+/i)[0].slice(0, 40);
  const t = bayGio();
  const ds = await doc('khen/' + t.thang, []);
  ds.push({ cho, tu: nguoi.ten || '', ly_do: than.slice(0, 300), luc: new Date().toISOString() });
  await ghi('khen/' + t.thang, ds);
  return { cho, than, tu: nguoi.ten || '' };
}
async function vietKhen(d) {
  return '🌟 GÓC KHEN 🌟\n' + await vietAI((d.tu ? d.tu + ' muốn khen: ' : 'Có người muốn khen: ') + d.than +
    '\nViết lời tuyên dương thật "kêu" kiểu MC (tối đa 4 câu) cho ' + d.cho + ', giữ đúng lý do được khen, không bịa thêm thành tích. Kết bằng rủ cả nhà thả tim.');
}
async function chaoMung(cau) {
  const than = cau.replace(/^[^:]*:/, '').trim();
  const [ten, phong] = than.split(/[,|]/).map((s) => (s || '').trim());
  if (!ten) return null;
  return '🎊 CHÀO MỪNG THÀNH VIÊN MỚI 🎊\n' + await vietAI('Chào mừng thành viên mới ' + ten + (phong ? ' về ' + phong : '') +
    ' gia nhập nhà DBV Thành Đô. Viết lời chào (tối đa 4 câu) và kèm 3 câu hỏi làm quen vui (sở thích, món ruột, biệt tài) để người mới trả lời trong nhóm.');
}

module.exports = { CACH_TINH, giaiThuong, top3Ngan, bayGio, viec, viecTheoGio, kiemTraDapAn, cauDoDangMo, khen, vietKhen, chaoMung, diemThang, bangXep, tat, leHomNay, dungDapAn, ghepDoi, doc, ghi };
