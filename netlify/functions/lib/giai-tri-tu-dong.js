/* DBV247 — Các tính năng gắn kết tự động của Bot em gái DBV
   ===========================================================================
   LỊCH (giờ Việt Nam, do zalo-giaitri-lich.js gọi mỗi giờ):
     8:00 mỗi ngày   le        ngày lễ (dương + âm lịch) và ngày thành lập
                     thamnien  kỷ niệm ngày vào DBV (tròn năm)
     8:00 ngày 1     tongket   bảng xếp hạng đố vui + ngôi sao được khen tháng trước
     8:00 thứ Hai    thuhai    chào tuần mới + sinh nhật trong tuần + cà phê ghép đôi
     15:00 T2,T3,T4,T6  dovui  đố vui trà chiều (reply đúng đầu tiên +1 điểm)
     15:00 thứ Năm   dovuisp   đố vui sản phẩm DBV (lấy từ nội dung website)
     16:00 thứ Sáu   thusau    tạm biệt tuần + rủ kể chuyện vui
   (Sinh nhật: zalo-sinh-nhat-cron.js, 8:00 — tính năng riêng.)

   THEO LỆNH (tag bot):
     khen: Tên + lý do        ai cũng dùng được → bot đăng lời khen, cuối tháng tổng kết
     bxh                       bảng xếp hạng đố vui tháng này
     chào mừng: Tên, Phòng     (quản trị) chào thành viên mới
     thử: dovui|dovuisp|thuhai|thusau|caphe|le|thamnien|tongket   (quản trị) chạy thử vào chính chat này

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

/* ── Đố vui ──────────────────────────────────────────────────────────────── */
const kq = (chatId) => 'do-vui/' + chatId;
const chuanDap = (s) => ' ' + bd(s).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
function dungDapAn(traLoi, cd) {
  const t = chuanDap(traLoi);
  return [cd.dap_an].concat(cd.chap_nhan || []).some((a) => {
    const x = chuanDap(a).trim();
    if (!x) return false;
    if (/^\d+$/.test(x)) return new RegExp('(^| )' + x + '( |$)').test(t.trim());
    return x.length >= 2 && t.includes(' ' + x + ' ');
  });
}
async function taoCauDo(loai) {
  const lichSu = await doc('do-vui-lich-su', []);
  let tuLieu = '';
  if (loai === 'dovuisp') {
    const { KB } = require('./kien-thuc');
    // Chọn ngẫu nhiên một trang SẢN PHẨM, gom các đoạn nội dung của trang đó
    const trang = KB.pages.filter((p) => p.sp && KB.chunks.some((c) => c.u === p.url));
    const p = trang[Math.floor(Math.random() * trang.length)];
    const noiDung = KB.chunks.filter((c) => c.u === p.url).map((c) => (c.h ? '[' + c.h + '] ' : '') + c.x).join('\n');
    tuLieu = '\nTƯ LIỆU (chỉ hỏi điều có trong đây):\n' + p.title + '\n' + noiDung.slice(0, 3500);
  }
  const yc = (loai === 'dovuisp'
    ? 'Ra MỘT câu đố vui về sản phẩm/nghiệp vụ bảo hiểm DBV dựa trên tư liệu, kiểu "học mà chơi", dễ vừa phải.'
    : 'Ra MỘT câu đố vui trà chiều cho dân văn phòng: câu đố mẹo, đố chữ, đố vui dân gian hoặc kiến thức thú vị. Lành mạnh, ai cũng chơi được.') +
    '\nĐáp án phải NGẮN (1–4 chữ hoặc một con số) để so khớp được.' +
    '\nKhông lặp các câu đã ra: ' + (lichSu.slice(-25).join(' | ') || '(chưa có)') + tuLieu +
    '\nTrả JSON: {"cau_hoi": "câu đố, có mở đầu vui", "dap_an": "đáp án ngắn", "chap_nhan": ["các cách viết khác cùng nghĩa, không dấu, số/chữ"], "giai_thich": "1–2 câu giải thích vui"}';
  const q = await vietAI(yc, { json: true, nhiet: 1 });
  if (!q.cau_hoi || !q.dap_an) throw new Error('câu đố thiếu nội dung');
  await ghi('do-vui-lich-su', lichSu.concat([String(q.cau_hoi).slice(0, 120)]).slice(-40));
  return q;
}
async function diemThang(thang) { return doc('diem/' + thang, {}); }
function bangXep(diem, n) {
  return Object.values(diem).sort((a, b) => b.diem - a.diem).slice(0, n || 5)
    .map((x, i) => (['🥇', '🥈', '🥉'][i] || (i + 1) + '.') + ' ' + x.ten + ': ' + x.diem + ' điểm').join('\n');
}

/* Gọi từ webhook với MỌI tin vào nhóm: đúng đáp án câu đố đang mở → chúc mừng + cộng điểm */
async function kiemTraDapAn(chatId, cau, nguoi) {
  if (tat('dovui') && tat('dovuisp')) return null;
  const cd = await doc(kq(chatId), null);
  const t = bayGio();
  if (!cd || cd.xong || cd.ngay !== t.ngay || !nguoi.id) return null;
  if (!dungDapAn(cau, cd)) return null;
  cd.xong = true; cd.nguoi = nguoi.ten; await ghi(kq(chatId), cd);
  const diem = await diemThang(t.thang);
  const r = diem[nguoi.id] || { ten: nguoi.ten, diem: 0 };
  r.ten = nguoi.ten || r.ten; r.diem += 1; diem[nguoi.id] = r;
  await ghi('diem/' + t.thang, diem);
  return '🎉 CHÍNH XÁC! ' + (nguoi.ten || 'Anh/chị') + ' nhanh tay nhất, +1 điểm (tháng này: ' + r.diem + ' điểm).\n' +
    'Đáp án: ' + cd.dap_an + (cd.giai_thich ? '\n💡 ' + cd.giai_thich : '') +
    '\n\n🏆 Bảng xếp hạng tháng:\n' + bangXep(diem, 3) + '\nHẹn cả nhà 15:00 mai nhé!';
}
async function cauDoDangMo(chatId) {
  const cd = await doc(kq(chatId), null);
  return cd && !cd.xong && cd.ngay === bayGio().ngay ? cd.cau_hoi : null;
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
    const loi = await vietAI('Viết lời tổng kết tháng vui, vinh danh (tối đa 4 câu), KHÔNG lặp lại bảng số liệu (em sẽ dán kèm). Dữ liệu:\n' + thongTin);
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
      phan.push(await vietAI('Viết lời chào sáng thứ Hai đầu tuần cho cả nhóm (tối đa 4 câu), tiếp năng lượng, hài hước nhẹ.' +
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
  if (ten === 'dovui' || ten === 'dovuisp') {
    const out = [];
    for (const chatId of o.nhom) {
      const cu = await doc(kq(chatId), null);
      const lo = cu && !cu.xong ? '📖 Đáp án câu đố trước: ' + cu.dap_an + (cu.giai_thich ? ' — ' + cu.giai_thich : '') + '\n\n' : '';
      const q = await taoCauDo(ten);
      await ghi(kq(chatId), Object.assign({}, q, { ngay: t.ngay, loai: ten, xong: false }));
      out.push({ chatId, text: lo + (ten === 'dovuisp' ? '🧠 ĐỐ VUI SẢN PHẨM DBV' : '🍵 ĐỐ VUI TRÀ CHIỀU') + '\n' + q.cau_hoi +
        '\n\n👉 Reply tin này để trả lời. Ai đúng đầu tiên +1 điểm vào bảng xếp hạng tháng!' });
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

module.exports = { bayGio, viec, viecTheoGio, kiemTraDapAn, cauDoDangMo, khen, vietKhen, chaoMung, diemThang, bangXep, tat, leHomNay, dungDapAn, ghepDoi, doc, ghi };
