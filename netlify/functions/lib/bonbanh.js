/* DBV247 — Thư viện đọc giá thị trường xe cũ từ Bonbanh.com
   ---------------------------------------------------------------------------
   PHẠM VI DỮ LIỆU — đọc kỹ trước khi sửa:

   Quy chế hoạt động của Bonbanh (mục IX.1) cấm sao chép và phổ biến lại nội
   dung của họ. robots.txt thì cho phép truy cập (Allow: /). Ranh giới an toàn
   mà module này bám theo:

     ĐƯỢC   — đọc trang công khai, tính ra số liệu thống kê (trung vị, tứ phân
              vị, số tin) rồi chỉ lưu mấy con số đó.
     KHÔNG  — không lưu và không hiển thị lại tiêu đề tin, mô tả, ảnh, tên
              salon, số điện thoại, hay bất cứ nội dung nào của tin đăng.

   Giá là dữ kiện; tin đăng là nội dung. Module chỉ giữ phần dữ kiện.
   Mọi kết quả đều kèm link về trang gốc để người xem tự đối chiếu.

   Đây không phải tư vấn pháp lý. Trước khi mở tính năng này ra trang khách
   hàng, nên liên hệ Công ty CP Kypernet Việt Nam (chủ Bonbanh) xin chấp thuận.
   ---------------------------------------------------------------------------
   LƯU Ý KỸ THUẬT: parser bám vào HTML của bên thứ ba nên sẽ hỏng khi họ đổi
   giao diện. Vì vậy mỗi lần chạy đều trả về `chan_doan` để biết còn đọc được
   bao nhiêu tin. Khi số tin đọc được tụt về 0 mà trang vẫn báo có tin, cron
   sẽ ghi cảnh báo — xem netlify/functions/gia-thi-truong-cron.js
*/

"use strict";

const GOC = "https://bonbanh.com";

/* Tự giới thiệu rõ ràng thay vì giả dạng trình duyệt. Nếu Bonbanh muốn chặn,
   họ chặn được ngay — đó là cách làm sòng phẳng. */
const UA =
  "DBV247-PriceBot/1.0 (+https://dbv247.com.vn/dinh-gia-xe-oto; lien-he@dbv247.com.vn)";

/* Function đồng bộ của Netlify bị cắt sau 10 GIÂY. Mọi con số dưới đây phải
   nằm gọn trong đó, kể cả trường hợp xấu nhất là phải dò slug.

   Lỗi đã từng có: timeout 12s cho MỘT request, cộng nghỉ 1,2s giữa các lần dò.
   Mercedes-Benz C-Class sinh 9 tổ hợp URL -> ~20 giây -> Netlify cắt ngang,
   trình duyệt nhận lỗi mạng, trang lặng lẽ lùi về bảng giá nội bộ mà không ai
   biết vì sao. */
const TIMEOUT_MS = 6000;             // một request đơn lẻ
const NGAN_SACH_TONG_MS = 8000;      // toàn bộ lần gọi, chừa 2s trả kết quả
const NGHI_GIUA_2_REQUEST_MS = 900;  // khi đã biết slug, chỉ nghỉ giữa các trang
const NGHI_KHI_DO_SLUG_MS = 150;     // lúc dò slug thì gấp, nghỉ ngắn thôi

/* ── Tiện ích ────────────────────────────────────────────────────────────── */

const nghi = (ms) => new Promise((r) => setTimeout(r, ms));

/* Dấu tiếng Việt sau normalize("NFD") là các ký tự tổ hợp U+0300–U+036F.
   Dựng regex bằng RegExp() với chuỗi escape, không viết ký tự tổ hợp trực tiếp
   vào source — viết thẳng thì editor hoặc bước copy file dễ làm hỏng, mà hỏng
   thì im lặng chứ không báo lỗi gì. */
const DAU_TO_HOP = new RegExp("[\\u0300-\\u036f]", "g");

function boDau(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(DAU_TO_HOP, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/* Bỏ thẻ HTML, trả về text phẳng đã chuẩn hoá khoảng trắng. */
function boThe(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/* "310" + "Triệu" -> 310000000 ; "1 tỷ 250" -> 1250000000 */
function doiTienVND(so, donVi) {
  const n = parseFloat(String(so).replace(/\./g, "").replace(/,/g, "."));
  if (!isFinite(n)) return 0;
  const d = boDau(donVi).toLowerCase();
  if (d.startsWith("ty")) return Math.round(n * 1e9);
  if (d.startsWith("tri")) return Math.round(n * 1e6);
  return 0;
}

/* ── Thống kê ────────────────────────────────────────────────────────────── */

function phanVi(mangDaSapXep, p) {
  if (!mangDaSapXep.length) return 0;
  const i = (mangDaSapXep.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  if (lo === hi) return mangDaSapXep[lo];
  return mangDaSapXep[lo] + (mangDaSapXep[hi] - mangDaSapXep[lo]) * (i - lo);
}

/* Loại bỏ giá bất thường bằng luật IQR — tin rao hay có giá 1 đồng để câu view,
   hoặc giá cả chục tỷ do gõ nhầm. Không lọc thì trung vị vẫn ổn nhưng khoảng
   giá bị kéo méo. */
function locNgoaiLai(gia) {
  const s = [...gia].sort((a, b) => a - b);
  if (s.length < 5) return s;
  const q1 = phanVi(s, 0.25), q3 = phanVi(s, 0.75);
  const iqr = q3 - q1;
  const min = q1 - 1.5 * iqr, max = q3 + 1.5 * iqr;
  const loc = s.filter((x) => x >= min && x <= max);
  return loc.length >= 3 ? loc : s;
}

function thongKe(giaThoc) {
  const g = locNgoaiLai(giaThoc.filter((x) => x >= 30e6 && x <= 60e9));
  if (!g.length) return null;
  const lamTron = (x) => Math.round(x / 1e6) * 1e6;
  return {
    so_tin: g.length,
    so_tin_bi_loai: giaThoc.length - g.length,
    trung_vi: lamTron(phanVi(g, 0.5)),
    q1: lamTron(phanVi(g, 0.25)),
    q3: lamTron(phanVi(g, 0.75)),
    thap_nhat: lamTron(g[0]),
    cao_nhat: lamTron(g[g.length - 1])
  };
}

/* ── Sinh slug URL ───────────────────────────────────────────────────────────
   Slug của Bonbanh không suy ra được bằng một quy tắc duy nhất:
     toyota-corolla_cross   (gạch dưới)
     toyota-yaris-cross     (gạch ngang)
     landrover              (dính liền)
     mercedes_benz          (gạch dưới)
   Nên sinh nhiều ứng viên rồi thử lần lượt, ứng viên nào ra tin thì ghi nhớ
   lại vào Blobs để lần sau đi thẳng. Cách này tự sửa được khi Bonbanh thêm
   dòng xe mới, không cần ai bảo trì bảng ánh xạ bằng tay.                    */

/* Vài trường hợp tên trong CSDL khác hẳn tên Bonbanh, đoán không ra. */
const DOI_TEN = {
  hang: {
    "MERCEDES-BENZ": "mercedes_benz",
    "ROLLS-ROYCE": "rolls_royce",
    "LAND ROVER": "landrover",
    "LYNK & CO": "lynk_co",
    "VM MOTORS": "vm_motors",
    "ALFA ROMEO": "alfa_romeo",
    "ASTON MARTIN": "aston_martin"
  },
  dong: {
    "CR-V": "crv",
    "HR-V": "hrv",
    "BR-V": "br_v",
    BRV: "br_v",
    "X-TRAIL": "x_trail",
    "CX-5": "cx5",
    "CX-3": "cx3",
    "CX-8": "cx8",
    "CX-9": "cx9",
    CX30: "cx_30",
    SANTAFE: "santafe",
    "LUX A2.0": "lux_a_2.0",
    "LUX SA2.0": "lux_sa_2.0",
    VFE34: "vf_e34",
    "COROLLA ALTIS": "corolla_altis",
    "AVANZA PREMIO": "avanza",
    "VELOZ CROSS": "veloz",
    "INNOVA CROSS": "innova"
  }
};

function ungVienSlug(ten) {
  const t = boDau(ten).toLowerCase().trim();
  const goc = t.replace(/[^a-z0-9 .+&-]/g, "");
  const ds = [
    goc.replace(/[\s-]+/g, "_"),   // corolla cross -> corolla_cross
    goc.replace(/[\s_]+/g, "-"),   // yaris cross   -> yaris-cross
    goc.replace(/[\s_-]+/g, ""),   // land rover    -> landrover
    goc.replace(/\s+/g, "_")
  ];
  return [...new Set(ds)].filter(Boolean);
}

/* ── Khớp phiên bản ──────────────────────────────────────────────────────────
   Vì sao phải có phần này: CSDL lưu giá theo TỪNG PHIÊN BẢN (Vios 2020 có
   1.5E MT 296,7tr — 1.5E CVT 367,5tr — 1.5G 405,3tr), trong khi trang Bonbanh
   liệt kê chung mọi phiên bản của một đời xe. Gộp hết lại lấy trung vị ra
   317tr rồi đem so với 405tr là so hai thứ khác nhau — kết quả "lệch 22%"
   hoàn toàn vô nghĩa.

   Nên phải nhóm tin rao theo phiên bản, rồi khớp nhóm đó với tên phiên bản
   trong CSDL. Tên hai bên không bao giờ trùng khít ("1.5G CVT" bên CSDL vs
   "1.5g" bên Bonbanh), nên dùng khớp mờ có trọng số.                          */

const TOKEN_HOP_SO = ["mt", "at", "cvt", "dct", "amt"];

function tachToken(ten) {
  return boDau(String(ten || ""))
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .split(" ")
    .filter((x) => x && x.length <= 12);
}

/* Tách tên phiên bản thành các đặc trưng có ý nghĩa khác nhau.

   Vì sao phải tách thay vì so token thô: hai bên viết khác nhau một cách có
   hệ thống. Bonbanh ghi "2.4L" (L = lít), CSDL ghi "2.4G" (G = cấp trang bị).
   So token thô thì "2.4g" khác "2.4l" nên trượt, trong khi thực chất là cùng
   một chiếc xe. Ngược lại "2.7" và "2.8l" chỉ khác đúng con số dung tích mà
   phần còn lại giống hệt, nên điểm vẫn đủ cao để nhận nhầm.

   Lỗi thật đã xảy ra: bản 2.7 Legender bị khớp sang 2.8 Legender, trả về giá
   của một chiếc xe khác.                                                     */
function tachDacTrung(ten) {
  const tk = tachToken(ten);
  let dungTich = null, danDong = null, hopSo = null, cap = null;
  const con = [];

  for (const t of tk) {
    const m = /^(\d(?:\.\d)?)([a-z]{0,3})$/.exec(t);
    if (m) {
      if (dungTich === null) dungTich = m[1];
      /* Chữ "l" sau số là đơn vị lít, không phải cấp trang bị — bỏ đi.
         Các chữ khác (g, e, v, j) mới là cấp trang bị, phải so. */
      const chu = m[2];
      if (chu && chu !== "l" && cap === null) cap = chu;
      continue;
    }
    if (/^4x\d$/.test(t)) { danDong = t; continue; }
    if (TOKEN_HOP_SO.indexOf(t) >= 0) { hopSo = t; continue; }
    con.push(t);
  }
  return { dungTich, danDong, hopSo, cap, con };
}

function diceToken(a, b) {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let chung = 0;
  const daDem = new Set();
  for (const t of a) if (setB.has(t) && !daDem.has(t)) { chung++; daDem.add(t); }
  return (2 * chung) / (a.length + b.length);
}

/**
 * Điểm giống nhau giữa hai tên phiên bản, 0 đến 1.
 * Dung tích máy và dẫn động là hai thứ KHÔNG được sai — lệch là loại thẳng,
 * vì đó chính là chỗ phân biệt hai chiếc xe có giá chênh nhau hàng trăm triệu.
 */
function diemKhop(tenA, tenB) {
  const A = tachDacTrung(tenA), B = tachDacTrung(tenB);
  if (!tachToken(tenA).length || !tachToken(tenB).length) return 0;

  if (A.dungTich && B.dungTich && A.dungTich !== B.dungTich) return 0;
  if (A.danDong && B.danDong && A.danDong !== B.danDong) return 0;

  let d = 1;
  if (A.hopSo && B.hopSo && A.hopSo !== B.hopSo) d *= 0.35;
  if (A.cap && B.cap && A.cap !== B.cap) d *= 0.30;

  /* Phần chữ còn lại: legender, trd, sportivo, limo, gr, s… */
  d *= 0.55 + 0.45 * diceToken(A.con, B.con);

  /* Thiếu dung tích ở một bên thì bớt tự tin đi một chút. */
  if (!A.dungTich || !B.dungTich) d *= 0.85;

  return Math.round(d * 1000) / 1000;
}

/* Cắt tiền tố hãng-dòng khỏi slug tin rao: "toyota-vios-1.5e-mt" -> "1.5e mt" */
function tenPhienBanTuSlug(verSlug, hangSlug, dongSlug) {
  let s = String(verSlug || "");
  const tienTo = `${hangSlug}-${dongSlug}-`;
  if (s.indexOf(tienTo) === 0) s = s.slice(tienTo.length);
  else s = s.replace(new RegExp("^" + hangSlug + "-"), "").replace(new RegExp("^" + dongSlug + "-"), "");
  return s.replace(/-/g, " ").trim();
}

/**
 * Chọn nhóm phiên bản khớp nhất với tên phiên bản trong CSDL.
 * Trả về null khi không nhóm nào đủ giống hoặc nhóm khớp quá ít tin —
 * lúc đó gọi bên ngoài tự lùi về số liệu cả dòng xe.
 */
function chonPhienBan(theoPhienBan, tenCSDL, toiThieuTin) {
  if (!Array.isArray(theoPhienBan) || !theoPhienBan.length || !tenCSDL) return null;
  const min = toiThieuTin || 3;

  const chamDiem = theoPhienBan
    .map((n) => ({ ...n, diem_khop: diemKhop(tenCSDL, n.ten) }))
    .sort((x, y) => y.diem_khop - x.diem_khop || y.so_tin - x.so_tin);

  /* Ngưỡng 0,6 chứ không phải 0,5. Ở mức 0,5 thì "2.7 LEGENDER 4X4 AT" khớp
     được sang "2.7l 4x4 at" — cùng máy cùng dẫn động nhưng khác cấp trang bị
     Legender, giá chênh cả trăm triệu. Mọi ca khớp đúng đều đạt từ 0,85 trở
     lên, nên nâng ngưỡng không mất gì. */
  const tot = chamDiem[0];
  if (!tot || tot.diem_khop < 0.6 || tot.so_tin < min) return null;
  return tot;
}

function duongDan(hangSlug, dongSlug, nam, phienBanSlug) {
  const phan = [hangSlug, dongSlug];
  if (phienBanSlug) phan.push(phienBanSlug);
  return `${GOC}/oto/${phan.join("-")}${nam ? `-nam-${nam}` : ""}`;
}

/* ── Tải trang ───────────────────────────────────────────────────────────── */

async function taiTrang(url) {
  const ctrl = new AbortController();
  const hetGio = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "vi-VN,vi;q=0.9"
      },
      signal: ctrl.signal
    });
    if (!r.ok) return { ok: false, ma: r.status, html: "" };
    return { ok: true, ma: 200, html: await r.text() };
  } catch (e) {
    return { ok: false, ma: 0, loi: String(e && e.message), html: "" };
  } finally {
    clearTimeout(hetGio);
  }
}

/* ── Bóc dữ liệu ─────────────────────────────────────────────────────────────
   Ba chiến lược độc lập, chạy cả ba rồi hợp nhất theo mã tin. Một chiến lược
   chết vì đổi giao diện thì hai cái còn lại vẫn cho ra số. */

/* Chiến lược A — thuộc tính title của thẻ <a> trỏ tới trang chi tiết.
   Định dạng: title="Ban xe oto cu Toyota Vios 2020 1.5E MT gia 310 Triệu - TP HCM"
   Đây là chuỗi SEO, ít khi đổi cấu trúc.                                     */
function bocTuTitle(html) {
  const ra = [];
  const re = /<a[^>]+href="[^"]*\/xe-([a-z0-9._-]+?)-(\d{4})-(\d{4,})"[^>]*title="([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, verSlug, nam, ma, title] = m;
    const g = /\bgia\s+([\d.,]+)\s*(tri[eệ]u|t[yỷ])/i.exec(boDau(title));
    if (!g) continue;
    ra.push({ ma, nam: +nam, ver_slug: verSlug, gia: doiTienVND(g[1], g[2]) });
  }
  return ra;
}

/* Chiến lược B — text phẳng, cắt theo "Mã: {số}".
   Mỗi mẩu chứa giá, ODO, hộp số, xuất xứ.

   Lưu ý đã từng sai: KHÔNG đòi có chữ "giá" đứng trước con số. Chữ "giá" chỉ
   nằm trong thuộc tính title/alt của thẻ — mà boThe() xoá sạch thuộc tính.
   Trong text phẳng, giá xuất hiện trần trụi dạng "310 Triệu". Nên bắt mẫu số
   + đơn vị, rồi lấy lần xuất hiện GẦN "Mã:" nhất về phía trước.              */
function bocTuText(html) {
  const text = boThe(html);
  const ra = [];
  const re = /M[ãa]:\s*(\d{4,})([\s\S]{0,700}?)(?=M[ãa]:\s*\d{4,}|$)/g;
  const reGia = /([\d][\d.,]*)\s*(Tri[êệe]u|T[yỷỹ])\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const ma = m[1];
    const than = m[2];
    const truoc = text.slice(Math.max(0, m.index - 400), m.index);
    const kho = boDau(truoc + " " + than).toLowerCase();

    /* Lấy giá cuối cùng trước "Mã:" — gần tin nhất, ít lẫn sang tin kề bên. */
    let g = null, x;
    reGia.lastIndex = 0;
    while ((x = reGia.exec(truoc)) !== null) g = x;
    if (!g) continue;

    const gia = doiTienVND(g[1], g[2]);
    if (!gia) continue;

    const odo = /da di\s+([\d][\d.,]*)\s*km/.exec(kho);
    const nam = /\b(19[89]\d|20[0-4]\d)\b/g;
    let ny = null, y;
    while ((y = nam.exec(truoc)) !== null) ny = y[1];

    ra.push({
      ma,
      gia,
      nam: ny ? +ny : 0,
      so_km: odo ? parseInt(odo[1].replace(/[.,]/g, ""), 10) : 0,
      hop_so: /so tu dong/.test(kho) ? "AT" : /so tay/.test(kho) ? "MT" : "",
      nhap_khau: /xe nhap khau/.test(kho) ? 1 : 0
    });
  }
  return ra;
}

/* Chiến lược C — tổng số tin trang báo ra. Dùng để biết parser có sót không. */
function bocTongTin(html) {
  const t = boThe(html);
  const m = /T[ổo]ng:\s*([\d.,]+)\s*tin/i.exec(t);
  return m ? parseInt(m[1].replace(/[.,]/g, ""), 10) : null;
}

function hopNhat(a, b) {
  const map = new Map();
  for (const x of a) map.set(x.ma, { ...x });
  for (const y of b) {
    const cu = map.get(y.ma);
    if (cu) Object.assign(cu, { ...y, ...cu, so_km: y.so_km || cu.so_km, hop_so: y.hop_so || cu.hop_so });
    else map.set(y.ma, { ...y });
  }
  return [...map.values()].filter((x) => x.gia > 0);
}

/* ── Đọc một dòng xe / một năm ───────────────────────────────────────────── */

/**
 * @param {Object} p
 *   hang, dong           — tên như trong CSDL (vd "TOYOTA", "VIOS")
 *   nam                  — năm sản xuất
 *   soTrang              — số trang tối đa (mặc định 2, mỗi trang ~20 tin)
 *   slugDaBiet           — {hang, dong} đã học được từ lần trước
 */
async function docGiaThiTruong(p) {
  const { hang, dong, nam, soTrang = 2, slugDaBiet = null } = p;

  const hangUV = slugDaBiet?.hang
    ? [slugDaBiet.hang]
    : [...new Set([DOI_TEN.hang[hang], ...ungVienSlug(hang)].filter(Boolean))];
  const dongUV = slugDaBiet?.dong
    ? [slugDaBiet.dong]
    : [...new Set([DOI_TEN.dong[dong], ...ungVienSlug(dong)].filter(Boolean))];

  /* Trần số tổ hợp được dò trong một lần gọi. Ứng viên xếp theo thứ tự khả dĩ
     giảm dần, nên cắt đuôi hầu như không mất gì mà chặn được trường hợp
     3 × 3 = 9 tổ hợp kéo dài quá giới hạn của Netlify. */
  const TRAN_TO_HOP = 6;

  const batDau = Date.now();
  const conThoiGian = () => Date.now() - batDau < NGAN_SACH_TONG_MS;

  const daThu = [];
  let dungHang = null, dungDong = null, html = "", url = "", tongTin = null;
  let hetGio = false;

  ngoai: for (const h of hangUV) {
    for (const d of dongUV) {
      if (daThu.length >= TRAN_TO_HOP) { hetGio = true; break ngoai; }
      if (!conThoiGian()) { hetGio = true; break ngoai; }
      const u = duongDan(h, d, nam);
      const r = await taiTrang(u);
      daThu.push({ url: u, ma: r.ma });
      if (r.ok) {
        const tong = bocTongTin(r.html);
        const thu = hopNhat(bocTuTitle(r.html), bocTuText(r.html));
        if (thu.length > 0) {
          dungHang = h; dungDong = d; html = r.html; url = u; tongTin = tong;
          break ngoai;
        }
      }
      /* Đang dò thì nghỉ ngắn. Chỉ dò một lần cho mỗi dòng xe rồi ghi nhớ,
         nên đây không phải là kiểu gọi dồn dập kéo dài. */
      await nghi(NGHI_KHI_DO_SLUG_MS);
    }
  }

  if (!dungHang) {
    return {
      ok: false,
      ly_do: hetGio ? "het_thoi_gian" : "khong_tim_thay",
      thong_diep: hetGio
        ? "Hết ngân sách thời gian khi dò địa chỉ trang. Bấm tra lại — lần sau đã nhớ được địa chỉ nên sẽ nhanh."
        : "Không tìm thấy dòng xe này trên Bonbanh.",
      chan_doan: { da_thu: daThu.slice(0, 6), giay: Math.round((Date.now() - batDau) / 100) / 10 }
    };
  }

  let tin = hopNhat(bocTuTitle(html), bocTuText(html));

  /* Lấy thêm trang 2, 3… nếu tin trang 1 còn ít mà tổng tin thì nhiều.
     Chỉ đi tiếp khi còn thời gian — thà ít tin còn hơn bị Netlify cắt. */
  for (let tr = 2; tr <= soTrang && tongTin && tin.length < Math.min(tongTin, 40); tr++) {
    if (!conThoiGian()) break;
    await nghi(NGHI_GIUA_2_REQUEST_MS);
    const r = await taiTrang(`${url}/page,${tr}`);
    if (!r.ok) break;
    const them = hopNhat(bocTuTitle(r.html), bocTuText(r.html));
    if (!them.length) break;
    tin = hopNhat(tin, them);
  }

  /* Chỉ giữ tin đúng năm cần tra (trang có thể lẫn tin "tương tự"). */
  const dungNam = tin.filter((x) => !x.nam || x.nam === nam);
  const dung = dungNam.length >= 3 ? dungNam : tin;

  const tk = thongKe(dung.map((x) => x.gia));
  if (!tk) {
    return { ok: false, ly_do: "khong_du_du_lieu", chan_doan: { doc_duoc: tin.length, tong_tin_trang: tongTin } };
  }

  const odoCuaNhom = (ds) => {
    const o = ds.map((x) => x.so_km).filter((x) => x > 0).sort((a, b) => a - b);
    return o.length ? o[Math.floor(o.length / 2)] : 0;
  };

  /* Nhóm theo phiên bản. Đây là phần khiến số liệu so sánh được với CSDL. */
  const nhom = new Map();
  for (const x of dung) {
    const ten = tenPhienBanTuSlug(x.ver_slug, dungHang, dungDong) || "khong ro";
    if (!nhom.has(ten)) nhom.set(ten, []);
    nhom.get(ten).push(x);
  }

  const theoPhienBan = [];
  for (const [ten, ds] of nhom) {
    const t = thongKe(ds.map((x) => x.gia));
    if (t) theoPhienBan.push({ ten, ...t, odo_trung_vi: odoCuaNhom(ds) });
  }
  theoPhienBan.sort((a, b) => b.so_tin - a.so_tin);

  return {
    ok: true,
    nguon: "bonbanh.com",
    url_goc: url,
    hang, dong, nam,
    slug: { hang: dungHang, dong: dungDong },
    tong_hop: { ...tk, odo_trung_vi: odoCuaNhom(dung) },
    theo_phien_ban: theoPhienBan,
    doc_luc: new Date().toISOString(),
    chan_doan: {
      doc_duoc: tin.length,
      dung_nam: dungNam.length,
      tong_tin_trang: tongTin,
      so_phien_ban: theoPhienBan.length,
      ty_le_boc: tongTin ? Math.round((tin.length / Math.min(tongTin, 20 * soTrang)) * 100) : null
    }
  };
}

/**
 * Dàn kết quả ra mức phù hợp nhất cho phiên bản đang thẩm định.
 * Tách riêng khỏi docGiaThiTruong() để dùng được cả với bản ghi lấy từ cache —
 * cron quét theo dòng xe, không biết trước khách sẽ tra phiên bản nào.
 */
function apPhienBan(kq, tenPhienBan) {
  if (!kq || !kq.ok) return kq;
  const khop = chonPhienBan(kq.theo_phien_ban, tenPhienBan, 3);
  const goc = khop || kq.tong_hop;

  return {
    ...kq,
    muc: khop ? "phien_ban" : "dong_xe",
    phien_ban_khop: khop ? khop.ten : null,
    diem_khop: khop ? khop.diem_khop : 0,
    so_tin: goc.so_tin,
    so_tin_bi_loai: goc.so_tin_bi_loai,
    trung_vi: goc.trung_vi,
    q1: goc.q1,
    q3: goc.q3,
    thap_nhat: goc.thap_nhat,
    cao_nhat: goc.cao_nhat,
    odo_trung_vi: goc.odo_trung_vi || 0
  };
}

module.exports = {
  docGiaThiTruong,
  apPhienBan,
  chonPhienBan,
  diemKhop,
  tachToken,
  tachDacTrung,
  tenPhienBanTuSlug,
  thongKe,
  ungVienSlug,
  duongDan,
  boThe,
  boDau,
  doiTienVND,
  locNgoaiLai,
  bocTuTitle,
  bocTuText,
  bocTongTin,
  hopNhat,
  GOC,
  UA
};
