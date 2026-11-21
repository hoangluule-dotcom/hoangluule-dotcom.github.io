/* DBV247 — Máy chủ cho PHÒNG GIẢI TRÍ NHÂN VIÊN trong văn phòng 3D
   ===========================================================================
   Trang /van-phong-3d/ chỉ có cánh cửa "Khu nhân viên". Nhập đúng mã thì trình
   duyệt mới tải giai-tri.js (phòng + 10 trò chơi) và gọi hàm này lấy dữ liệu.

   BIẾN MÔI TRƯỜNG (Netlify > Site configuration > Environment variables):
     GIAI_TRI_3D_MA      mã vào phòng (tuỳ chọn). Không đặt thì dùng mã mặc định 1986
                         (phòng chỉ để giải trí, không cần bảo mật — Hoàng chọn 21/11/2026)
     GIAI_TRI_3D_MA_QT   mã quản trị (tuỳ chọn): vào bằng mã này thì xoá được
                         giấy nhớ, lời chúc của bất kỳ ai
   Đổi mã → mọi người phải nhập lại mã mới (phiên cũ hết hiệu lực ngay).

   DÙNG CHUNG VỚI BOT EM GÁI DBV (kho "dbv247-day-bot"):
     - Câu đố trà chiều 15:00 của nhóm Zalo (ZALO_GT_CHAT_ID). Trả lời trong phòng
       3D được tính điểm y như trả lời trong Zalo, vào CHUNG bảng xếp hạng tháng;
       ai trả lời đúng thì bot báo vào nhóm Zalo.
     - Danh sách nhân sự (để chọn tên) và danh sách sinh nhật (chỉ ngày/tháng).
   Dữ liệu riêng của phòng (điểm trò chơi, máy gắp, lời chúc, giấy nhớ): kho "giai-tri-3d".

   Gọi: POST /.netlify/functions/giai-tri-3d  { hanh_dong, tok, ... }
*/
'use strict';

const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');
const DAY = require('./lib/day-bot');
const G = require('./lib/giai-tri-tu-dong');
const SN = require('./lib/sinh-nhat');
const NS = require('./lib/nhan-su');
const { guiDen } = require('./lib/zalo');
const { vietAI } = require('./lib/gt-ai');
const TRI_THUC = require('./lib/tri-thuc-em-gai');

const SITE_ID = 'df7ffacd-8e52-4769-b95b-23c978b36e29';
const HAN_PHIEN = 60 * 24 * 3600 * 1000;      // nhập mã một lần, dùng 60 ngày
const LUOT_GAP = 3;                            // máy gắp thú: 3 lượt/người/ngày
const TRAN_CHAT = 250;                         // tin nhắn với bot mỗi ngày (cả phòng)
const MA_MAC_DINH = '1986';                    // mã vào phòng khi chưa đặt biến GIAI_TRI_3D_MA

function kho() {
  try { return getStore({ name: 'giai-tri-3d', consistency: 'strong' }); }
  catch (e) {
    if (!process.env.NETLIFY_ACCESS_TOKEN) return null;
    try { return getStore({ name: 'giai-tri-3d', siteID: process.env.SITE_ID || SITE_ID, token: process.env.NETLIFY_ACCESS_TOKEN, consistency: 'strong' }); }
    catch (e2) { return null; }
  }
}
async function doc(k, mac) { const s = kho(); if (!s) return mac; try { const v = await s.get(k, { type: 'json' }); return v == null ? mac : v; } catch (e) { return mac; } }
async function ghi(k, v) { const s = kho(); if (!s) throw new Error('Không mở được kho lưu'); await s.setJSON(k, v); }

const bd = (s) => DAY.boDau(s);
const slug = (s) => bd(s).replace(/[^a-z0-9]+/g, '');
const sach = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const dd = (n) => String(n).padStart(2, '0');

function bayGio() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' })
    .formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
  const thu = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  // tuần bắt đầu thứ Hai — khoá tuần là ngày thứ Hai đó
  const t = new Date(Date.UTC(+p.year, +p.month - 1, +p.day - ((thu + 6) % 7)));
  return { d: +p.day, m: +p.month, y: +p.year, ngay: p.year + '-' + p.month + '-' + p.day, thang: p.year + '-' + p.month,
    tuan: t.getUTCFullYear() + '-' + dd(t.getUTCMonth() + 1) + '-' + dd(t.getUTCDate()) };
}

/* ── Phiên đăng nhập: chuỗi ký HMAC, khoá gắn với mã → đổi mã là phiên cũ hết hạn ── */
const khoaKy = () => 'gt3d|' + (process.env.GIAI_TRI_3D_MA || MA_MAC_DINH) + '|' + (process.env.GIAI_TRI_3D_MA_QT || '');
const b64 = (s) => Buffer.from(s).toString('base64url');
function kyPhien(ten, qt) {
  const than = b64(JSON.stringify({ t: ten, q: qt ? 1 : 0, e: Date.now() + HAN_PHIEN }));
  return than + '.' + crypto.createHmac('sha256', khoaKy()).update(than).digest('base64url');
}
function docPhien(tok) {
  const [than, ky] = String(tok || '').split('.');
  if (!than || !ky) return null;
  const dung = crypto.createHmac('sha256', khoaKy()).update(than).digest('base64url');
  if (ky.length !== dung.length || !crypto.timingSafeEqual(Buffer.from(ky), Buffer.from(dung))) return null;
  try { const p = JSON.parse(Buffer.from(than, 'base64url').toString()); return p.e > Date.now() && p.t ? { ten: p.t, qt: !!p.q, id: slug(p.t) } : null; }
  catch (e) { return null; }
}
const bangMa = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/* Chặn dò mã: quá 12 lần sai/giờ từ một địa chỉ thì khoá đến hết giờ */
async function demSai(ip, cong) {
  const k = 'sai/' + slug(ip || 'x') + '/' + new Date().toISOString().slice(0, 13);
  const n = await doc(k, 0);
  if (cong) await ghi(k, n + 1).catch(() => {});
  return n;
}

const tra = (code, o) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(o) });

/* ── Câu đố trà chiều (nhóm Zalo đầu tiên trong ZALO_GT_CHAT_ID) ── */
const nhomZalo = () => String(process.env.ZALO_GT_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean)[0] || '';
async function cauDoHomNay() {
  const chatId = nhomZalo(); if (!chatId) return null;
  const cd = await G.doc('do-vui/' + chatId, null);
  if (!cd || cd.ngay !== bayGio().ngay) return null;
  const phuMo = !!(cd.xong && cd.phu && cd.phu_mo && !cd.phu_xong);
  return {
    kieu: cd.kieu === 'web' ? 'Nghiệp vụ' : 'Suy luận', trang: cd.trang || '',
    cau_hoi: cd.cau_hoi, xong: !!cd.xong, nguoi: cd.nguoi || '',
    dap_an: cd.xong ? cd.dap_an : '', giai_thich: cd.xong ? (cd.giai_thich || '') : '',
    phu: phuMo ? cd.phu.cau_hoi : '', phu_xong: !!cd.phu_xong, nguoi_phu: cd.nguoi_phu || '',
    dap_an_phu: cd.phu_xong && cd.phu ? cd.phu.dap_an : '',
  };
}
async function bxhThang() {
  const diem = await G.diemThang(bayGio().thang);
  return Object.values(diem).sort((a, b) => b.diem - a.diem || (b.dung || 0) - (a.dung || 0)).slice(0, 10)
    .map((x) => ({ ten: x.ten, diem: x.diem, dung: x.dung || 0 }));
}

/* ── Máy gắp thú: máy chủ quyết định trúng/trượt và món quà (không gian lận được) ── */
const QUA = [
  ['gau', 'Gấu bông xanh', 30], ['meo', 'Mèo thần tài chốt đơn', 20], ['ca', 'Cá voi ôm hợp đồng', 18],
  ['vit', 'Vịt vàng deadline', 14], ['tho', 'Thỏ trà đá', 10], ['rong', 'Rồng vàng KPI', 6], ['sao', 'Ngôi sao tái tục', 2],
];
const hiem = (w) => (w >= 18 ? 'Thường' : w >= 10 ? 'Hiếm' : w >= 5 ? 'Rất hiếm' : 'Huyền thoại');
function boc() { const tong = QUA.reduce((a, q) => a + q[2], 0); let r = Math.random() * tong; for (const q of QUA) { r -= q[2]; if (r <= 0) return q; } return QUA[0]; }

async function bangTro(tro, tuan) {
  const b = await doc('tro/' + tro + '/' + tuan, {});
  return Object.values(b).sort((a, c) => c.diem - a.diem || a.luc - c.luc).slice(0, 10).map((x) => ({ ten: x.ten, diem: x.diem }));
}
async function gapCuaToi(id) {
  const g = await doc('gap/' + id, { ngay: '', dung: 0, bst: {} });
  return { con_luot: g.ngay === bayGio().ngay ? Math.max(0, LUOT_GAP - g.dung) : LUOT_GAP, bst: g.bst || {} };
}

/* ── Bot em gái DBV trò chuyện trong phòng ── */
function promptBot(nguoi, doVui) {
  return [
    'Em đang đứng ở quầy của em trong PHÒNG GIẢI TRÍ NHÂN VIÊN của văn phòng 3D (website DBV247). Người đang nói chuyện với em: ' + nguoi + ' — đồng nghiệp trong chi nhánh.',
    'Vai: cô em gái út vui tính của nhóm — lém lỉnh, nhanh nhảu, mê ăn uống, phim, nhạc, du lịch, bắt trend. Mục tiêu số một là làm mọi người cười và thư giãn.',
    '- Bám đúng chủ đề người ta nói và đẩy câu chuyện vui thêm. KHÔNG tự lái về công việc, deadline, KPI, họp hành, sếp.',
    '- Biết chơi: kể chuyện cười, đố vui (đố xong chờ người đoán rồi mới giải), câu đố mẹo, chơi chữ, nối từ, bói vui hôm nay, chọn giúp "ăn gì/đi đâu", "này hay kia".',
    '- Đổi kiểu hài liên tục, không lặp lại hình ảnh hay câu mở đầu đã dùng trong lịch sử. Hạn chế nhắc trà sữa.',
    '- Trong phòng có: quầy trà chiều (đố vui 15:00), máy gắp thú, ném giấy vào thùng rác, phi tiêu bảng KPI, máy nghe nhạc, ghế thư giãn, góc chụp ảnh, tường sinh nhật, bảng giấy nhớ. Khi hợp ngữ cảnh có thể rủ người ta chơi (đừng nhắc quá dày).',
    '- Quan hệ đồng nghiệp: không tán tỉnh, không chuyện tình cảm nam nữ hay gợi dục — gạt đi duyên dáng rồi đổi chủ đề.',
    '- Không chính trị, tôn giáo, vùng miền; không chê ngoại hình, đời tư; không đùa về tuổi; không nói xấu sếp hay công ty; không bịa tin tức, tỉ số, giá vàng, thời tiết hôm nay.',
    '- Câu hỏi nghiệp vụ bảo hiểm: trả lời ngắn, chung, rủ hỏi nhóm vận hành hoặc xem dbv247.com.vn — không bịa con số phí.',
    '- 1–4 câu, văn bản thường, không markdown, 1–2 emoji.',
    'Hôm nay: ' + new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) + '.',
    '== TRI THỨC NỘI BỘ CỦA NHÓM (mục "chưa có" = em không biết, đừng bịa) ==', String(TRI_THUC).trim(),
    doVui ? '== CÂU ĐỐ TRÀ CHIỀU ĐANG MỞ (em không biết đáp án, đừng đoán hộ; muốn trả lời thì ra quầy trà chiều trong phòng) ==\n' + doVui : '',
  ].filter(Boolean).join('\n');
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return tra(405, { loi: 'Chỉ nhận POST' });
  let d = {};
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return tra(400, { loi: 'Dữ liệu không hợp lệ' }); }
  const MA = process.env.GIAI_TRI_3D_MA || MA_MAC_DINH, MA_QT = process.env.GIAI_TRI_3D_MA_QT;
  const hd = String(d.hanh_dong || '');
  const t = bayGio();

  try {
    /* 1) Nhập mã → (chưa có tên) trả danh sách tên để chọn · (có tên) cấp phiên */
    if (hd === 'vao') {
      if (!MA) return tra(503, { loi: 'Phòng giải trí chưa được mở (chưa đặt mã trên Netlify).' });
      const ip = (event.headers || {})['x-nf-client-connection-ip'] || (event.headers || {})['client-ip'] || '';
      if ((await demSai(ip, false)) >= 12) return tra(429, { loi: 'Nhập sai quá nhiều lần. Thử lại sau ít phút nhé.' });
      const ma = String(d.ma || '').trim();
      const qt = !!(MA_QT && ma && bangMa(ma, MA_QT));
      if (!qt && !(ma && bangMa(ma, MA))) { await demSai(ip, true); return tra(401, { loi: 'Mã chưa đúng.' }); }
      const ten = sach(d.ten, 40);
      if (!ten) {
        const ns = (await NS.docNs()).map((x) => x.ten), sn = (await SN.docDs()).map((x) => x.ten);
        const ds = Array.from(new Set(ns.concat(sn).map((x) => sach(x, 40)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi'));
        return tra(200, { ok: true, ds });
      }
      if (ten.length < 2) return tra(400, { loi: 'Nhập họ tên của anh/chị.' });
      return tra(200, { ok: true, tok: kyPhien(ten, qt), ten, qt });
    }

    const me = docPhien(d.tok);
    if (!me) return tra(401, { loi: 'Phiên đã hết hạn, nhập lại mã nhé.', het_phien: true });

    /* 2) Toàn bộ dữ liệu khi vào phòng */
    if (hd === 'tong_quan') {
      const sn = (await SN.docDs()).filter((x) => x.m === t.m).sort((a, b) => a.d - b.d).map((x) => ({ ten: x.ten, d: x.d, m: x.m, nay: x.d === t.d }));
      const [doVui, bxh, giai, chuc, nem, phitieu, gap, notes] = await Promise.all([
        cauDoHomNay(), bxhThang(), G.giaiThuong(), doc('chuc/' + t.thang, []), bangTro('nem', t.tuan), bangTro('phitieu', t.tuan), gapCuaToi(me.id), doc('giay-nho', []),
      ]);
      return tra(200, {
        ok: true, ten: me.ten, qt: me.qt, hom_nay: { d: t.d, m: t.m, y: t.y },
        do_vui: doVui, bxh, giai, sinh_nhat: sn, loi_chuc: chuc.slice(-80),
        tro: { nem, phitieu }, gap: Object.assign(gap, { qua: QUA.map((q) => ({ id: q[0], ten: q[1], hiem: hiem(q[2]) })) }),
        giay_nho: notes.slice(-40).map((n) => ({ id: n.id, ten: n.ten, nd: n.nd, mau: n.mau, luc: n.luc, thich: (n.thich || []).length, toi_thich: (n.thich || []).includes(me.id), cua_toi: n.uid === me.id })),
      });
    }

    /* 3) Trả lời câu đố trà chiều — tính điểm chung với nhóm Zalo */
    if (hd === 'do_vui') {
      const chatId = nhomZalo();
      const tl = sach(d.tra_loi, 60);
      if (!tl) return tra(400, { loi: 'Nhập câu trả lời.' });
      const cd = await cauDoHomNay();
      if (!chatId || !cd) return tra(200, { ok: true, ket_qua: 'chua_co', text: 'Hôm nay chưa có câu đố. Câu đố trà chiều ra lúc 15:00 các ngày làm việc nhé!' });
      if (cd.xong && !cd.phu) return tra(200, { ok: true, ket_qua: 'da_xong', text: 'Câu hôm nay đã có người giải rồi. Hẹn 15:00 ngày mai nhé!', do_vui: cd });
      const kq = await G.kiemTraDapAn(chatId, tl, { id: 'web3d:' + me.id, ten: me.ten });
      const sau = await cauDoHomNay();
      if (kq && /^(🎉|⭐)/.test(kq)) {
        await guiDen(chatId, '🏢 Từ Phòng giải trí 3D:\n' + kq, process.env.ZALO_GT_BOT_TOKEN).catch(() => false);
        return tra(200, { ok: true, ket_qua: 'dung', text: kq, do_vui: sau, bxh: await bxhThang() });
      }
      if (kq) return tra(200, { ok: true, ket_qua: 'khong_tinh', text: kq, do_vui: sau });
      return tra(200, { ok: true, ket_qua: 'sai', text: 'Chưa đúng rồi 😅 Đoán là đã có +1 điểm tham gia hôm nay. Nghĩ thêm chút nữa nha!', do_vui: sau, bxh: await bxhThang() });
    }

    /* 4) Điểm trò ném giấy / phi tiêu — giữ điểm cao nhất của tuần */
    if (hd === 'diem') {
      const tro = d.tro === 'phitieu' ? 'phitieu' : d.tro === 'nem' ? 'nem' : '';
      if (!tro) return tra(400, { loi: 'Trò không hợp lệ' });
      const tran = tro === 'nem' ? 16 : 500;
      const so = Math.max(0, Math.min(tran, Math.round(+d.diem || 0)));
      const k = 'tro/' + tro + '/' + t.tuan, b = await doc(k, {});
      const cu = b[me.id];
      const ky_luc = !cu || so > cu.diem;
      if (ky_luc) { b[me.id] = { ten: me.ten, diem: so, luc: Date.now() }; await ghi(k, b); }
      return tra(200, { ok: true, ky_luc, cao_nhat: ky_luc ? so : cu.diem, bang: await bangTro(tro, t.tuan) });
    }

    /* 5) Máy gắp thú */
    if (hd === 'gap') {
      const k = 'gap/' + me.id, g = await doc(k, { ngay: '', dung: 0, bst: {} });
      if (g.ngay !== t.ngay) { g.ngay = t.ngay; g.dung = 0; }
      if (g.dung >= LUOT_GAP) return tra(200, { ok: true, het_luot: true, con_luot: 0, bst: g.bst });
      g.dung++;
      const gan = Math.max(0, Math.min(1, +d.gan || 0));
      const trung = Math.random() < 0.12 + 0.62 * gan;
      let qua = null;
      if (trung) { const q = boc(); qua = { id: q[0], ten: q[1], hiem: hiem(q[2]) }; g.bst[q[0]] = (g.bst[q[0]] || 0) + 1; }
      await ghi(k, g);
      return tra(200, { ok: true, trung, qua, con_luot: LUOT_GAP - g.dung, bst: g.bst });
    }

    /* 6) Lời chúc sinh nhật */
    if (hd === 'chuc') {
      const cho = sach(d.cho, 40), loi = sach(d.loi, 200);
      if (!cho || loi.length < 2) return tra(400, { loi: 'Chọn người và viết lời chúc nhé.' });
      const k = 'chuc/' + t.thang, ds = await doc(k, []);
      ds.push({ id: crypto.randomBytes(5).toString('hex'), cho, tu: me.ten, uid: me.id, loi, luc: Date.now() });
      await ghi(k, ds.slice(-300));
      return tra(200, { ok: true, loi_chuc: ds.slice(-80) });
    }

    /* 7) Giấy nhớ: đăng (ghi tên người viết), thả tim, xoá */
    if (hd === 'giay_nho' || hd === 'thich' || hd === 'xoa') {
      const ds = await doc('giay-nho', []);
      if (hd === 'giay_nho') {
        const nd = sach(d.noi_dung, 140);
        if (nd.length < 2) return tra(400, { loi: 'Viết gì đó lên giấy nhớ đã nào.' });
        const mau = ['vang', 'hong', 'xanh', 'cam', 'tim'].includes(d.mau) ? d.mau : 'vang';
        ds.push({ id: crypto.randomBytes(5).toString('hex'), ten: me.ten, uid: me.id, nd, mau, luc: Date.now(), thich: [] });
      } else if (hd === 'thich') {
        const n = ds.find((x) => x.id === d.id); if (!n) return tra(404, { loi: 'Giấy nhớ không còn.' });
        n.thich = n.thich || []; const i = n.thich.indexOf(me.id); if (i >= 0) n.thich.splice(i, 1); else n.thich.push(me.id);
      } else {
        if (d.loai === 'chuc') {
          const k = 'chuc/' + t.thang, cs = await doc(k, []), i = cs.findIndex((x) => x.id === d.id);
          if (i < 0) return tra(404, { loi: 'Không còn lời chúc này.' });
          if (!me.qt && cs[i].uid !== me.id) return tra(403, { loi: 'Chỉ người viết hoặc quản trị mới xoá được.' });
          cs.splice(i, 1); await ghi(k, cs); return tra(200, { ok: true, loi_chuc: cs.slice(-80) });
        }
        const i = ds.findIndex((x) => x.id === d.id); if (i < 0) return tra(404, { loi: 'Giấy nhớ không còn.' });
        if (!me.qt && ds[i].uid !== me.id) return tra(403, { loi: 'Chỉ người viết hoặc quản trị mới gỡ được.' });
        ds.splice(i, 1);
      }
      const giu = ds.slice(-120); await ghi('giay-nho', giu);
      return tra(200, { ok: true, giay_nho: giu.slice(-40).map((n) => ({ id: n.id, ten: n.ten, nd: n.nd, mau: n.mau, luc: n.luc, thich: (n.thich || []).length, toi_thich: (n.thich || []).includes(me.id), cua_toi: n.uid === me.id })) });
    }

    /* 8) Trò chuyện với Bot em gái DBV */
    if (hd === 'chat') {
      const cau = sach(d.cau, 400);
      if (!cau) return tra(400, { loi: 'Nhắn gì đó cho em đi ạ' });
      const dem = await doc('dem-chat', { ngay: '', n: 0 });
      const n = dem.ngay === t.ngay ? dem.n : 0;
      if (n >= TRAN_CHAT) return tra(200, { ok: true, text: 'Hôm nay em tám nhiều quá hết pin rồi 🪫 Mai mình nói chuyện tiếp nha!' });
      await ghi('dem-chat', { ngay: t.ngay, n: n + 1 }).catch(() => {});
      const ls = (Array.isArray(d.ls) ? d.ls : []).slice(-8).map((x) => (x.r === 'u' ? me.ten : 'Em') + ': ' + sach(x.t, 300)).join('\n');
      let daDay = '';
      try { daDay = DAY.khoiPrompt(await DAY.timDaDay('giai-tri', cau, 8)); } catch (e) { /* bỏ qua */ }
      let doVui = '';
      try { const cd = await cauDoHomNay(); if (cd && !cd.xong) doVui = cd.cau_hoi; } catch (e) { /* bỏ qua */ }
      try {
        const text = await vietAI((ls ? 'Lịch sử gần đây:\n' + ls + '\n\n' : '') + me.ten + ' nhắn: ' + cau + '\n\nTrả lời tin nhắn cuối.', { them: promptBot(me.ten, doVui) + daDay, nhiet: 0.95, hetGio: 25000 });
        return tra(200, { ok: true, text: String(text).slice(0, 900) });
      } catch (e) {
        console.error('giai-tri-3d chat:', e.message);
        return tra(200, { ok: true, text: 'Em vừa đơ mất mấy giây như wifi quán cà phê 🥲 Anh/chị nhắn lại em sau chút nhé.' });
      }
    }

    return tra(400, { loi: 'Hành động không hợp lệ' });
  } catch (e) {
    console.error('giai-tri-3d:', hd, e.message);
    return tra(500, { loi: 'Máy chủ đang bận, thử lại sau nhé.' });
  }
};
