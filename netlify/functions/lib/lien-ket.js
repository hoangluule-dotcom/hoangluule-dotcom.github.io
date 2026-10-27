/* DBV247 — Mã liên kết hợp đồng cho khách mua ngoài Zalo
   ---------------------------------------------------------------------------
   Khách nhập: SỐ ĐIỆN THOẠI đã mua bảo hiểm + MÃ 4 SỐ nhân viên nhắn.
   Dễ nhớ (khách vốn thuộc số của mình) mà vẫn an toàn:
   • mã gắn với đúng SĐT, 4 số ngẫu nhiên, hạn 30 ngày, dùng xong là huỷ;
   • sai 5 lần với một SĐT → khoá SĐT đó 1 giờ; một máy sai 20 lần/ngày → khoá máy.
   Liên kết xong, SĐT được ghi nhớ (sdt/<sdt> → máy khách): hợp đồng mới
   nhân viên gắn theo số này hiện thẳng trong app, không cần mã nữa.

   Kho: lk/<sdt> {ma, het, chuyen, boi, luc} · thu/<sdt> · thu-tb/<id>
*/
'use strict';

const crypto = require('node:crypto');

const HAN_MA = 30 * 86400000;
const SAI_SDT = 5;
const KHOA_SDT = 3600000;
const SAI_MAY = 20;
const KHOA_MAY = 86400000;

function ma4() {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}

/** Lấy mã còn hạn của SĐT, hoặc tạo mới. moi=true: luôn tạo mã mới (cấp lại). */
async function capMa(kho, sdt, { moi = false, chuyen = false, boi = '' } = {}) {
  const cu = await kho.get('lk/' + sdt, { type: 'json' });
  if (!moi && cu && cu.het > Date.now()) {
    if (chuyen && !cu.chuyen) {
      cu.chuyen = true;
      await kho.setJSON('lk/' + sdt, cu);
    }
    return cu.ma;
  }
  const m = { ma: ma4(), het: Date.now() + HAN_MA, chuyen: !!chuyen, boi, luc: new Date().toISOString() };
  await kho.setJSON('lk/' + sdt, m);
  return m.ma;
}

async function maConHan(kho, sdt) {
  const m = await kho.get('lk/' + sdt, { type: 'json' });
  return m && m.het > Date.now() ? m.ma : '';
}

async function biKhoa(kho, khoa) {
  const t = await kho.get(khoa, { type: 'json' });
  return t && t.den > Date.now() ? t : null;
}

async function ghiSai(kho, khoa, gioiHan, thoiGian) {
  const t = (await kho.get(khoa, { type: 'json' })) || { sai: 0, den: 0 };
  if (t.den && t.den < Date.now() && t.sai >= gioiHan) t.sai = 0;
  t.sai += 1;
  if (t.sai >= gioiHan) t.den = Date.now() + thoiGian;
  await kho.setJSON(khoa, t);
}

/** Kiểm mã. Trả {ok, lk} hoặc {loi, ma(http)}. Tự ghi số lần sai. */
async function kiemMa(kho, sdt, ma, idMay) {
  if (await biKhoa(kho, 'thu/' + sdt)) return { ma: 429, loi: 'Nhập sai nhiều lần. Anh/chị thử lại sau 1 giờ hoặc nhắn DBV.' };
  if (await biKhoa(kho, 'thu-tb/' + idMay)) return { ma: 429, loi: 'Nhập sai quá nhiều lần hôm nay. Anh/chị nhắn DBV để được hỗ trợ.' };
  const lk = await kho.get('lk/' + sdt, { type: 'json' });
  if (!lk || lk.het < Date.now() || lk.ma !== ma) {
    await ghiSai(kho, 'thu/' + sdt, SAI_SDT, KHOA_SDT);
    await ghiSai(kho, 'thu-tb/' + idMay, SAI_MAY, KHOA_MAY);
    return { ma: 404, loi: 'Số điện thoại hoặc mã chưa đúng (hoặc mã đã hết hạn). Anh/chị kiểm tra lại tin nhắn của DBV.' };
  }
  await kho.delete('thu/' + sdt);
  return { ok: true, lk };
}

module.exports = { capMa, maConHan, kiemMa, ma4 };
