/* Nguồn: Carmudi.vn — dùng để ĐỐI CHỨNG, không phải nguồn giá chính
   ---------------------------------------------------------------------------
   robots.txt: Allow / (chỉ chặn /api, /login, /storage…). Trang danh sách
   render sẵn phía server nên đọc được bằng fetch thường.

   BA GIỚI HẠN ĐÃ ĐO, phải biết trước khi tin vào nguồn này:

   1. Bộ lọc năm trong URL KHÔNG có tác dụng — canonical trả về trang không
      kèm tham số, kết quả trộn mọi đời xe. Nên phải lọc năm từ tiêu đề tin.

   2. Dữ liệu ODO và hộp số sai rất nhiều: 14/15 tin ghi ODO là "Xe mới" kể
      cả xe đời 2008; 9/15 tin ghi "Số sàn" trong khi tên xe có CVT/AT.
      => Adapter này CỐ Ý không đọc hai trường đó. Thà thiếu còn hơn sai.

   3. Dữ liệu mỏng: 36 tin cho TẤT CẢ các đời Vios, tức mỗi đời chỉ vài tin.
      Nên đây là nguồn đối chứng giá, không phải nguồn thống kê.

   Thứ Carmudi làm tốt: tiêu đề tin có đủ hãng + dòng + phiên bản + năm, và
   giá là con số rõ ràng. Đúng ba thứ cần để đối chứng với Bonbanh.
*/

"use strict";

const GOC = "https://www.carmudi.vn";
const UA =
  "DBV247-PriceBot/1.0 (+https://dbv247.com.vn; lien-he@dbv247.com.vn)";
const TIMEOUT_MS = 5000;

const DAU_TO_HOP = new RegExp("[\\u0300-\\u036f]", "g");
function boDau(s) {
  return String(s || "").normalize("NFD").replace(DAU_TO_HOP, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function boThe(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
}

/* Carmudi viết giá dạng "945 triệu" hoặc "1,2 tỷ". Vẫn dùng cách gom cụm
   giống Bonbanh để phòng trường hợp họ đổi sang "1 tỷ 200 triệu". */
const RE_GIA = /(\d[\d.,]*)\s*(t[yỷỹ]|tri[êệe]u)(?![a-zà-ỹ])/gi;
function doiTien(so, dv) {
  const n = parseFloat(String(so).replace(/\./g, "").replace(/,/g, "."));
  if (!isFinite(n)) return 0;
  const d = boDau(dv).toLowerCase();
  if (d.startsWith("ty")) return Math.round(n * 1e9);
  if (d.startsWith("tri")) return Math.round(n * 1e6);
  return 0;
}
function docGia(chuoi) {
  const s = String(chuoi || "");
  const cap = [];
  let m;
  RE_GIA.lastIndex = 0;
  while ((m = RE_GIA.exec(s)) !== null) cap.push({ so: m[1], dv: m[2], dau: m.index, cuoi: m.index + m[0].length });
  if (!cap.length) return 0;
  let tong = doiTien(cap[0].so, cap[0].dv);
  for (let i = 1; i < cap.length; i++) {
    const lienNhau = cap[i].dau - cap[i - 1].cuoi <= 3;
    const tyRoiTrieu = boDau(cap[i - 1].dv).toLowerCase().startsWith("ty") &&
                       boDau(cap[i].dv).toLowerCase().startsWith("tri");
    if (lienNhau && tyRoiTrieu) tong += doiTien(cap[i].so, cap[i].dv);
    else break;
  }
  return tong;
}

function slugHang(s) {
  return boDau(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function taiTrang(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "vi-VN,vi;q=0.9" },
      signal: ctrl.signal
    });
    if (!r.ok) return null;
    return await r.text();
  } catch (_) { return null; } finally { clearTimeout(t); }
}

/* Tách phiên bản khỏi tiêu đề: "Toyota Vios 1.5E MT 2020" -> "1.5e mt"
   Cũng xử lý dạng đảo: "2020 Toyota Vios 1.5G" -> "1.5g"                    */
function tachTuTieuDe(tieuDe, hang, dong) {
  const raw = String(tieuDe || "").trim();
  const namM = raw.match(/\b(19[89]\d|20[0-4]\d)\b/);
  const nam = namM ? +namM[1] : 0;

  let s = boDau(raw).toLowerCase();
  s = s.replace(/\b(19[89]\d|20[0-4]\d)\b/g, " ");
  for (const tu of [boDau(hang).toLowerCase(), boDau(dong).toLowerCase()]) {
    s = s.replace(new RegExp("\\b" + tu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"), " ");
  }
  const phienBan = s.replace(/[^a-z0-9. ]+/g, " ").replace(/\s+/g, " ").trim();
  return { nam, phien_ban: phienBan };
}

const adapter = {
  ma: "carmudi",
  ten: "Carmudi.vn",
  tin_moi_trang: 15,
  uu_tien: 2,          // tin cậy thấp hơn Bonbanh khi hai nguồn lệch
  ghi_chu: "chỉ dùng giá, năm và phiên bản — ODO và hộp số của nguồn này không đáng tin",

  async quet({ hang, dong, nam }) {
    const url = `${GOC}/xe-o-to-${slugHang(hang)}-${slugHang(dong)}/`;
    const html = await taiTrang(url);
    if (!html) return { tin: [], url_goc: url };

    /* Mỗi tin là một link /ban-xe-oto-...-{id}/ kèm thuộc tính title chứa
       tên đầy đủ. Quét link trước, rồi lấy giá từ text phía sau. */
    const text = boThe(html);
    const tin = [];
    const daCo = new Set();

    const reLink = /\/ban-xe-oto-[a-z0-9-]*?(\d{5,})\/?["'][^>]*title="([^"]+)"/gi;
    let m;
    while ((m = reLink.exec(html)) !== null) {
      const [, ma, tieuDe] = m;
      if (daCo.has(ma)) continue;
      daCo.add(ma);

      const { nam: namTin, phien_ban } = tachTuTieuDe(tieuDe, hang, dong);
      if (nam && namTin && namTin !== nam) continue;   // lọc năm ở phía mình

      /* Giá nằm sau tiêu đề trong text phẳng. Tìm vị trí tiêu đề rồi đọc
         cụm giá đầu tiên xuất hiện sau đó. */
      const viTri = text.indexOf(tieuDe.trim());
      const doan = viTri >= 0 ? text.slice(viTri, viTri + 400) : "";
      const gia = docGia(doan);
      if (!gia) continue;

      tin.push({ ma, gia, nam: namTin || nam, phien_ban });
    }

    const tongM = /(\d[\d.,]*)\s*tin b[aá]n xe/i.exec(text);
    return {
      tin,
      tong_tin_trang: tongM ? parseInt(tongM[1].replace(/[.,]/g, ""), 10) : null,
      url_goc: url
    };
  }
};

module.exports = adapter;
module.exports._noiBo = { docGia, tachTuTieuDe, slugHang };
