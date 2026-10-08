/* DBV247 — Công cụ tính phí cho chatbot (Gemini function calling)
   ===========================================================================
   Nguyên tắc: AI KHÔNG tự tính. AI chỉ gom thông tin khách nói, gọi hàm ở đây,
   rồi đọc lại kết quả. Mọi con số lấy từ CHÍNH các tệp công cụ tính phí trên
   website — sửa biểu phí trên web là bot tự theo, không có bản thứ hai để lệch:

     TNDS            /assets/cap-don-tnds.js      (qua lib/bieu-phi-tnds.js)
     Vật chất ô tô   /assets/bieu-phi-dbv.js      (QĐ 219/2026, Phụ lục 01)
     Giá trị xe      /data/gia-xe-db.json         (CSDL giá xe DBV247)
     Cháy nổ         /assets/chay-no.js           (Phụ lục VI–VII NĐ 105/2025)
     Hàng nội địa    /assets/vc.js                (Biểu phí PL4/2026 mục II.A)
     Hàng XNK        /assets/xnk-calc.js          (Biểu phí PL4/2026 mục II.B)

   Kết quả trả cho AI chỉ có MỨC PHÍ — không có tỷ lệ giảm, hệ số, đơn giá m²
   (những thứ trang web cũng không hiển thị).
*/
'use strict';

const { bangPhiTnds } = require('./bieu-phi-tnds');

const SONG = 30 * 60 * 1000;
const cache = {};

/* Tải tệp từ website (hoặc từ ổ đĩa khi chạy thử: TINH_PHI_ROOT=...) */
async function taiTep(duong) {
  const c = cache[duong];
  if (c && Date.now() - c.luc < SONG) return c.noiDung;
  let s;
  if (process.env.TINH_PHI_ROOT) {
    s = require('fs').readFileSync(require('path').join(process.env.TINH_PHI_ROOT, duong), 'utf8');
  } else {
    const goc = (process.env.URL || 'https://dbv247.com.vn').replace(/\/$/, '');
    const r = await fetch(goc + duong, { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error('Không tải được ' + duong + ': ' + r.status);
    s = await r.text();
  }
  cache[duong] = { noiDung: s, luc: Date.now() };
  return s;
}

/* Cắt một khối mã từ dấu mở tới dấu đóng tương ứng (đếm ngoặc, bỏ qua chuỗi) */
function catKhoi(s, batDau) {
  const i = s.indexOf(batDau);
  if (i < 0) throw new Error('Không thấy "' + batDau + '"');
  let j = i + batDau.length;
  while (/\s/.test(s[j])) j++;
  const mo = s[j], dong = mo === '{' ? '}' : ']';
  let sau = 0, chuoi = null;
  for (let k = j; k < s.length; k++) {
    const ch = s[k];
    if (chuoi) { if (ch === '\\') { k++; continue; } if (ch === chuoi) chuoi = null; continue; }
    if (ch === '"' || ch === "'") { chuoi = ch; continue; }
    if (ch === mo) sau++;
    else if (ch === dong) { sau--; if (sau === 0) return s.slice(j, k + 1); }
  }
  throw new Error('Khối "' + batDau + '" không đóng');
}
const giaTri = (src) => new Function('return (' + src + ');')();
const soTrongDong = (s, ten) => {
  const m = s.match(new RegExp('\\b' + ten + '\\s*=\\s*([0-9.]+)'));
  if (!m) throw new Error('Không thấy hằng ' + ten);
  return Number(m[1]);
};

function boDau(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}
const tu = (s) => boDau(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((w) => w.length > 1);
function diemKhop(cau, mau) {
  const a = tu(cau), b = ' ' + tu(mau).join(' ') + ' ';
  if (!a.length) return 0;
  let d = 0;
  a.forEach((w) => { if (b.includes(' ' + w + ' ')) d += 1; else if (b.includes(' ' + w)) d += 0.5; });
  return d / a.length;
}
const VND = (n) => Math.round(n).toLocaleString('vi-VN') + 'đ';
const so = (x) => { const n = Number(String(x == null ? '' : x).replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0; };

/* ── 1. TNDS ─────────────────────────────────────────────────────────────── */
async function bieu_phi_tnds() {
  return { bieu_phi: await bangPhiTnds(), luu_y: 'Chép đúng con số trong bảng, không tự nhân chia ngoài việc nhân số năm.' };
}

/* ── 2. Giá trị xe ───────────────────────────────────────────────────────── */
let DB_XE = null;
async function dbXe() {
  if (!DB_XE) DB_XE = JSON.parse(await taiTep('/data/gia-xe-db.json'));
  return DB_XE;
}
const chuanXe = (s) => boDau(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
async function tra_gia_xe(a) {
  const db = await dbXe();
  const H = chuanXe(a.hang), D = chuanXe(a.dong), nam = parseInt(a.nam, 10) || 0;
  if (!D) return { ok: false, thong_diep: 'Cần tên dòng xe (vd Vios, CR-V, VF 5).' };
  const ung = [];
  Object.keys(db.data).forEach((hang) => {
    const hk = chuanXe(hang);
    if (H && !(hk.includes(H) || H.includes(hk))) return;
    Object.keys(db.data[hang]).forEach((dong) => {
      const dk = chuanXe(dong);
      if (dk === D) ung.push({ hang, dong, d: 3 });
      else if (dk.startsWith(D) || D.startsWith(dk)) ung.push({ hang, dong, d: 2 });
      else if (dk.includes(D)) ung.push({ hang, dong, d: 1 });
    });
  });
  if (!ung.length) return { ok: false, thong_diep: 'Không tìm thấy dòng xe này trong cơ sở dữ liệu giá xe. Hỏi khách giá trị xe ước tính hoặc giá mua.' };
  ung.sort((x, y) => y.d - x.d);
  const { hang, dong } = ung[0];
  let rows = db.data[hang][dong];
  if (nam) {
    const gan = rows.reduce((m, r) => Math.min(m, Math.abs(r[0] - nam)), 99);
    rows = rows.filter((r) => Math.abs(r[0] - nam) === gan);
  } else {
    const moi = Math.max.apply(null, rows.map((r) => r[0]));
    rows = rows.filter((r) => r[0] >= moi - 2);
  }
  return {
    ok: true, hang, dong,
    nguon: db.meta && db.meta.nguon,
    phien_ban: rows.slice(0, 10).map((r) => ({
      nam: r[0], phien_ban: r[1], gia_tri_tham_khao: VND(r[2]), gia_tri_so: r[2],
      khoang: VND(r[3]) + ' – ' + VND(r[4]), nhien_lieu: r[5], so_ghe: r[6],
    })),
    luu_y: (nam && rows.length && rows[0][0] !== nam ? 'Không có đúng năm ' + nam + ', đang dùng năm gần nhất. ' : '') +
      'Giá trị tham khảo thị trường; giá trị bảo hiểm chính thức xác định khi giám định xe.',
    dong_khac: ung.slice(1, 4).map((u) => u.hang + ' ' + u.dong),
  };
}

/* ── 3. Vật chất ô tô ────────────────────────────────────────────────────── */
let BIEU_VC = null;
async function bieuVc() {
  if (!BIEU_VC) {
    const js = await taiTep('/assets/bieu-phi-dbv.js');
    const m = { exports: {} };
    new Function('module', 'window', js)(m, undefined);
    BIEU_VC = m.exports && m.exports.tinhPhi ? m.exports : globalThis.BieuPhiDBV;
  }
  return BIEU_VC;
}
async function phi_vat_chat_oto(a) {
  const B = await bieuVc();
  const nhom = { gia_dinh: 'nkd', kinh_doanh: 'kd', pickup_van: 'pv' }[a.muc_dich] || 'nkd';
  const p = {
    nhom_xe: nhom, gia_tri_xe: so(a.gia_tri_xe), nam_dang_ky: parseInt(a.nam_dang_ky, 10),
    khu_vuc: a.o_ha_noi ? 'hn' : 'khac', xe_dien: !!a.xe_dien,
  };
  const day = B.tinhPhi(Object.assign({}, p, { bs01: true, bs02: true, bs06: true }));
  if (!day.ok) return { ok: false, thong_diep: day.thong_diep || day.ly_do };
  const coBan = B.tinhPhi(Object.assign({}, p, { bs01: false, bs02: false, bs06: false }));
  return {
    ok: true,
    nhom_xe: day.ten_nhom, tuoi_xe: day.ten_nhom_tuoi, gia_tri_xe: VND(day.gia_tri_xe),
    phi_goi_day_du: VND(day.phi) + '/năm',
    goi_day_du_gom: 'Thay mới không khấu hao, sửa garage chính hãng' + (day.dkbs.bs02.chon ? '' : ' (không áp dụng cho tuổi xe này)') + ', thủy kích',
    phi_goi_co_ban: coBan.ok ? VND(coBan.phi) + '/năm' : null,
    ap_phi_toi_thieu: day.ap_phi_toi_thieu,
    luu_y: (day.ap_phi_toi_thieu ? 'Đang áp phí tối thiểu 6.000.000đ cho gói đầy đủ. ' : '') +
      'Phí tham khảo (đã gồm VAT) theo biểu phí DBV; phí chính thức sau khi tư vấn viên xem đăng ký/đăng kiểm và có thể giám định xe.',
  };
}

/* ── 4. Cháy nổ ──────────────────────────────────────────────────────────── */
let CN = null;
async function duLieuCn() {
  if (!CN) {
    const js = await taiTep('/assets/chay-no.js');
    const D = giaTri(catKhoi(js, 'const D='));
    const ds = [];
    Object.values(D.items).forEach((it) => it.v.forEach(([k, vn, rate]) =>
      ds.push({ k, ten: (vn ? it.n + ' — ' + vn : it.n), muc: it.m, nguong: it.all ? 'mọi quy mô' : it.th, rate })));
    CN = { ds, donGia: soTrongDong(js, 'UNIT_BUILD') };
  }
  return CN;
}
/* Khách không nói theo tên Phụ lục ("cơ sở sản xuất hạng C") mà nói "nhà xưởng may".
   Mở rộng câu của khách bằng từ đồng nghĩa trước khi so khớp. */
const DONG_NGHIA_CN = [
  [/nha xuong|xuong|nha may|san xuat|che bien/, 'co so san xuat cong nghiep nganh san xuat'],
  [/may mac|quan ao|det|soi|vai/, 'det may'],
  [/giay dep|da giay/, 'giay dep'],
  [/kho|nha kho|kho bai/, 'kho hang tong hop'],
  [/cua hang|tap hoa|shop|buon ban|ban le|ho kinh doanh/, 'kinh doanh hang hoa de chay'],
  [/chung cu|can ho/, 'nha chung cu'],
  [/van phong|tru so|cong ty/, 'tru so nha lam viec doanh nghiep'],
  [/khach san|nha nghi|homestay|nha tro/, 'khach san nha nghi co so luu tru'],
  [/nha hang|quan an|cafe|ca phe|quan nhau/, 'nha hang dich vu an uong'],
  [/truong hoc|truong/, 'truong'],
  [/gara|garage|sua xe|rua xe/, 'sua chua bao duong phuong tien co gioi'],
  [/sieu thi|trung tam thuong mai|tttm|cho\b/, 'cho trung tam thuong mai sieu thi'],
  [/phong kham|nha thuoc|benh vien/, 'phong kham benh vien'],
];
const BO_QUA_CN = new Set(['nha', 'co', 'so', 'cua', 'toi', 'minh', 'cho', 'la', 'va', 'cac', 'loai', 'khac', 'hang', 'kinh', 'doanh']);
function khopCn(cau, ten) {
  let q = boDau(cau);
  DONG_NGHIA_CN.forEach(([re, them]) => { if (re.test(q)) q += ' ' + them; });
  const a = Array.from(new Set(tu(q))).filter((w) => !BO_QUA_CN.has(w));
  const b = ' ' + tu(ten).join(' ') + ' ';
  let d = 0;
  a.forEach((w) => { if (b.includes(' ' + w + ' ')) d += 1; });
  return d;
}
async function phi_chay_no(a) {
  const { ds, donGia } = await duLieuCn();
  const xep = ds.map((x) => ({ x, d: khopCn(a.loai_co_so, x.ten) })).filter((y) => y.d > 0)
    .sort((p, q) => q.d - p.d || p.x.ten.length - q.x.ten.length);
  if (!xep.length || xep[0].d < 2) {
    return { ok: false, thong_diep: 'Chưa xác định được loại cơ sở. Hỏi khách cơ sở dùng để làm gì (vd nhà xưởng may, kho hàng, cửa hàng tạp hóa, chung cư).',
      goi_y: xep.slice(0, 5).map((y) => y.x.ten) };
  }
  const v = xep[0].x;
  const v0 = xep[0].x, duoi = (t) => t.split(' — ')[1] || '';
  // Chỉ coi là "nhiều loại" khi cùng một mục, hoặc cùng ngành nhưng khác hạng nguy hiểm
  const cung = xep.filter((y) => y.d === xep[0].d && (y.x.muc === v0.muc || (duoi(y.x.ten) && duoi(y.x.ten) === duoi(v0.ten))))
    .slice(0, 4).map((y) => y.x);
  const ketQua = { ok: true, loai_co_so: v.ten, muc_phu_luc: 'Mục ' + v.muc + ' Phụ lục VII NĐ 105/2025', nguong_bat_buoc: v.nguong,
    loai_gan_giong: cung.slice(1).map((x) => x.ten),
    ghi_chu_phan_loai: cung.length > 1 ? 'Có nhiều loại khớp (thường do hạng nguy hiểm cháy nổ A,B / C / D,E tùy vật liệu sản xuất, lưu trữ) — chuyên viên xác định hạng chính xác; nêu cho khách mức phí theo từng hạng.' : undefined };
  const gtxd = so(a.gia_tri_xay_dung), dt = so(a.dien_tich_m2);
  const build = gtxd || dt * donGia;
  const tong = build + so(a.tai_san) + so(a.hang_hoa);
  if (!v.rate) return Object.assign(ketQua, { phi: null, thong_diep: 'Loại cơ sở này chưa có tỷ lệ phí cố định — chuyên viên báo phí theo hồ sơ.' });
  if (!tong) return Object.assign(ketQua, { phi: null, thong_diep: 'Cần diện tích (m²) hoặc giá trị xây dựng, cộng giá trị máy móc/tài sản và hàng hóa (nếu có) để ước tính phí.' });
  if (tong >= 1e12) return Object.assign(ketQua, { phi: null, thong_diep: 'Tổng giá trị từ 1.000 tỷ: thỏa thuận phí riêng, chuyên viên tư vấn.' });
  const tinh = (r) => ({ chua_vat: VND(tong * r / 100), gom_vat: VND(tong * r / 100 * 1.1) });
  let phi;
  if (v.rate.s) {
    if (a.chua_chay_tu_dong === true) phi = { co_chua_chay_tu_dong: tinh(v.rate.s[0]) };
    else if (a.chua_chay_tu_dong === false) phi = { khong_co_chua_chay_tu_dong: tinh(v.rate.s[1]) };
    else phi = { neu_co_chua_chay_tu_dong: tinh(v.rate.s[0]), neu_khong_co: tinh(v.rate.s[1]) };
  } else phi = tinh(v.rate.r[0]);
  if (cung.length > 1) {
    const theoHang = {};
    cung.forEach((x) => { if (x.rate) theoHang[x.ten] = x.rate.s ? { neu_co_chua_chay_tu_dong: tinh(x.rate.s[0]), neu_khong_co: tinh(x.rate.s[1]) } : tinh(x.rate.r[0]); });
    if (Object.keys(theoHang).length) phi = theoHang;
  }
  return Object.assign(ketQua, {
    tong_gia_tri_bao_hiem: VND(tong) + (gtxd || !dt ? '' : ' (giá trị xây dựng đang ước tính theo diện tích)'),
    phi_nam: phi,
    luu_y: 'Phí tham khảo/năm theo biểu phí NĐ 105/2025. KHÔNG nêu cách ước tính giá trị theo m². Cháy nổ bắt buộc không có khuyến mại.',
  });
}

/* ── 5. Hàng hóa vận chuyển nội địa ──────────────────────────────────────── */
let VC = null;
async function duLieuVc() {
  if (!VC) {
    const js = await taiTep('/assets/vc.js');
    VC = { HE_SO: giaTri(catKhoi(js, 'var HE_SO=')), PT: giaTri(catKhoi(js, 'var PT=')), HANG: giaTri(catKhoi(js, 'var HANG=')),
      VAT: soTrongDong(js, 'VAT'), MIN: soTrongDong(js, 'MIN') };
  }
  return VC;
}
async function phi_hang_hoa_noi_dia(a) {
  const C = await duLieuVc();
  const v = so(a.gia_tri);
  const pt = C.PT[a.phuong_thuc] || C.PT.bo;
  let hk = null, d = 0;
  Object.keys(C.HANG).forEach((k) => { const x = diemKhop(a.nhom_hang || '', C.HANG[k].ten); if (x > d) { d = x; hk = k; } });
  const h = d >= 0.34 ? C.HANG[hk] : null;
  if (h && h.lienHe) return { ok: true, nhom_hang: h.ten, phi: null, thong_diep: 'Nhóm hàng này chào phí riêng — chuyên viên tư vấn.' };
  if (!v) return { ok: false, thong_diep: 'Cần giá trị lô hàng (hoặc tổng giá trị vận chuyển dự kiến cả năm).' };
  const heSo = a.thuong_xuyen ? C.HE_SO.thang : C.HE_SO.chuyen;
  const rate = Math.max(pt.r, (h && h.r) || 0) * heSo;
  const tong = Math.round(v * rate / 100 * (1 + C.VAT) / 1000) * 1000;
  return {
    ok: true, phuong_thuc: pt.ten, hinh_thuc: a.thuong_xuyen ? 'Vận chuyển thường xuyên' : 'Từng chuyến',
    nhom_hang: h ? h.ten : 'Hàng thông thường', gia_tri: VND(v),
    phi: VND(Math.max(tong, C.MIN)) + ' (đã gồm VAT)', ap_phi_toi_thieu: tong < C.MIN,
    luu_y: [h && h.canhBao, h && h.luu, 'Phí tham khảo; chưa gồm điều khoản mở rộng (xếp dỡ, ướt hàng, lưu kho...). KHÔNG nêu % giảm hay công thức.'].filter(Boolean).join(' '),
  };
}

/* ── 6. Hàng hóa xuất nhập khẩu ──────────────────────────────────────────── */
let XNK = null;
async function duLieuXnk() {
  if (!XNK) {
    const js = await taiTep('/assets/xnk-calc.js');
    XNK = { NHOM: giaTri(catKhoi(js, 'var NHOM=')), MIN: giaTri(catKhoi(js, 'MIN=')),
      HE_SO: soTrongDong(js, 'HE_SO'), VAT: soTrongDong(js, 'VAT'), B: soTrongDong(js, 'RATE_B'), C: soTrongDong(js, 'RATE_C') };
  }
  return XNK;
}
async function phi_hang_hoa_xnk(a) {
  const X = await duLieuXnk();
  const cur = String(a.tien_te || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
  const v = so(a.gia_tri);
  let g = null, it = null, best = 0;
  X.NHOM.forEach((n) => {
    const d = diemKhop(a.nhom_hang || '', n.ten + ' ' + (n.vd || '') + ' ' + (n.kw || ''));
    if (d > best) { best = d; g = n; it = null; }
    (n.items || []).forEach((x) => { const e = diemKhop(a.nhom_hang || '', x.n + ' ' + (x.kw || '')); if (e > best) { best = e; g = n; it = x; } });
  });
  if (!g || best < 0.34) return { ok: false, thong_diep: 'Chưa xác định được nhóm hàng. Hỏi khách cụ thể mặt hàng.', goi_y: X.NHOM.map((n) => n.ten) };
  if (g.lienHe) return { ok: true, nhom_hang: g.ten, phi: null, thong_diep: 'Nhóm hàng này chào phí riêng — chuyên viên tư vấn.' };
  if (!v) return { ok: false, nhom_hang: g.ten, thong_diep: 'Cần giá trị hóa đơn lô hàng (VND hoặc USD).' };
  const stbh = v * 1.1;
  const tinh = (r) => {
    let p = stbh * r / 100 * X.HE_SO * (1 + X.VAT);
    p = cur === 'VND' ? Math.round(p / 1000) * 1000 : Math.round(p * 100) / 100;
    p = Math.max(p, X.MIN[cur]);
    return cur === 'VND' ? VND(p) : p.toFixed(2) + ' USD';
  };
  const out = { ok: true, nhom_hang: it ? g.ten + ' / ' + it.n : g.ten, so_tien_bao_hiem: (cur === 'VND' ? VND(stbh) : stbh.toFixed(2) + ' USD') + ' (110% giá trị hóa đơn)', phi_gom_vat: {} };
  if (g.chiC) out.phi_gom_vat.dieu_kien_C = tinh(g.c);
  else {
    const rA = it ? it.r : (Array.isArray(g.a) ? g.a[0] : g.a);
    out.phi_gom_vat.dieu_kien_A_toan_dien = tinh(rA);
    if (!g.chiA) { out.phi_gom_vat.dieu_kien_B = tinh(X.B); out.phi_gom_vat.dieu_kien_C = tinh(X.C); }
  }
  out.luu_y = [g.luu, it && it.note, g.thamDinh ? 'Cần thẩm định phương án xếp dỡ trước khi chốt phí.' : '',
    'Bảo hiểm phải có hiệu lực trước khi hàng khởi hành. Phí tham khảo; KHÔNG nêu % giảm hay hệ số.'].filter(Boolean).join(' ');
  return out;
}

/* ── Khai báo cho Gemini ─────────────────────────────────────────────────── */
const S = (d, e) => (e ? { type: 'STRING', description: d, enum: e } : { type: 'STRING', description: d });
const N = (d) => ({ type: 'NUMBER', description: d });
const BL = (d) => ({ type: 'BOOLEAN', description: d });
const KHAI_BAO = [
  { name: 'bieu_phi_tnds', description: 'Biểu phí TNDS bắt buộc ô tô, xe máy, xe tải... theo NĐ 67/2023 (đã tính VAT). Gọi khi khách hỏi phí TNDS/bảo hiểm bắt buộc xe.',
    parameters: { type: 'OBJECT', properties: { loai_xe: S('Loại xe khách hỏi, vd "ô tô 7 chỗ không kinh doanh"') } } },
  { name: 'tra_gia_xe', description: 'Tra giá trị thị trường tham khảo của xe ô tô theo hãng, dòng, năm sản xuất (CSDL giá xe DBV247). Gọi trước phi_vat_chat_oto khi khách chưa biết giá trị xe.',
    parameters: { type: 'OBJECT', properties: { hang: S('Hãng xe, vd Toyota'), dong: S('Dòng xe, vd Vios'), nam: N('Năm sản xuất') }, required: ['dong'] } },
  { name: 'phi_vat_chat_oto', description: 'Ước tính phí bảo hiểm vật chất (thân vỏ) ô tô theo biểu phí DBV. Cần giá trị xe (VNĐ) và năm đăng ký lần đầu.',
    parameters: { type: 'OBJECT', properties: {
      gia_tri_xe: N('Giá trị xe, số VNĐ đầy đủ (vd 450000000)'), nam_dang_ky: N('Năm đăng ký lần đầu (gần bằng năm sản xuất)'),
      muc_dich: S('Mục đích sử dụng', ['gia_dinh', 'kinh_doanh', 'pickup_van']), o_ha_noi: BL('Xe đăng ký/hoạt động ở Hà Nội'), xe_dien: BL('Xe điện') },
      required: ['gia_tri_xe', 'nam_dang_ky'] } },
  { name: 'phi_chay_no', description: 'Ước tính phí bảo hiểm cháy nổ bắt buộc theo loại cơ sở và giá trị (NĐ 105/2025). Cũng cho biết ngưỡng thuộc diện bắt buộc.',
    parameters: { type: 'OBJECT', properties: {
      loai_co_so: S('Loại cơ sở, vd "nhà xưởng may mặc", "kho hàng", "căn hộ chung cư", "cửa hàng tạp hóa"'),
      gia_tri_xay_dung: N('Giá trị xây dựng nhà/công trình (VNĐ) nếu khách biết'), dien_tich_m2: N('Tổng diện tích sàn m² nếu khách không biết giá trị xây dựng'),
      tai_san: N('Giá trị máy móc, thiết bị, tài sản cố định (VNĐ)'), hang_hoa: N('Giá trị hàng hóa tồn kho (VNĐ)'), chua_chay_tu_dong: BL('Có hệ thống chữa cháy tự động (sprinkler) không') },
      required: ['loai_co_so'] } },
  { name: 'phi_hang_hoa_noi_dia', description: 'Ước tính phí bảo hiểm hàng hóa vận chuyển trong nước.',
    parameters: { type: 'OBJECT', properties: {
      gia_tri: N('Giá trị lô hàng (VNĐ), hoặc tổng giá trị dự kiến cả năm nếu vận chuyển thường xuyên'),
      phuong_thuc: S('Phương thức', ['bo', 'sat', 'thuy', 'da']), thuong_xuyen: BL('Vận chuyển thường xuyên (hợp đồng cả năm) thay vì từng chuyến'),
      nhom_hang: S('Loại hàng, vd "máy móc", "nông sản", "hàng dễ vỡ"') }, required: ['gia_tri'] } },
  { name: 'phi_hang_hoa_xnk', description: 'Ước tính phí bảo hiểm hàng hóa xuất nhập khẩu theo nhóm hàng, điều kiện A/B/C.',
    parameters: { type: 'OBJECT', properties: {
      gia_tri: N('Giá trị hóa đơn lô hàng'), tien_te: S('Đơn vị', ['VND', 'USD']), nhom_hang: S('Mặt hàng, vd "cà phê", "máy móc", "sắt thép"') },
      required: ['gia_tri', 'nhom_hang'] } },
];
const HAM = { bieu_phi_tnds, tra_gia_xe, phi_vat_chat_oto, phi_chay_no, phi_hang_hoa_noi_dia, phi_hang_hoa_xnk };

async function goiHam(ten, thamSo) {
  const f = HAM[ten];
  if (!f) return { ok: false, thong_diep: 'Không có công cụ ' + ten };
  try { return await f(thamSo || {}); }
  catch (e) { console.error('tinh-phi', ten, e.message); return { ok: false, thong_diep: 'Công cụ tính phí tạm lỗi — mời khách để lại số để tư vấn viên báo phí.' }; }
}

module.exports = { KHAI_BAO, goiHam, HAM };
