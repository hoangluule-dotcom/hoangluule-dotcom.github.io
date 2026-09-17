/* DBV247 — Cầu nối Netlify → Google Apps Script
   ===========================================================================
   Hai biến môi trường, khai trên Netlify → Site settings → Environment variables:

     GAS_URL            URL Web App của Apps Script, kết thúc bằng /exec
     GAS_KHOA_NOI_BO    đúng chuỗi đã đặt ở Script Properties KHOA_NOI_BO

   KHOÁ NỘI BỘ KHÔNG BAO GIỜ RỜI KHỎI MÁY CHỦ.
   Web App của Apps Script buộc phải mở cho "Anyone" thì hàm Netlify mới gọi
   được — nhưng không có khoá thì Apps Script từ chối ngay dòng đầu. Đó là lớp
   bảo vệ duy nhất của endpoint đó, nên khoá lọt vào mã frontend là mất hẳn.

   VÌ SAO KHÔNG GỌI THẲNG TỪ TRÌNH DUYỆT
   Xem lời giải thích đầy đủ ở apps-script/CauHinh.gs. Tóm tắt: đặc tả mục 23
   cấm secret trong frontend, mục 13 đòi CTV_ID xác định phía máy chủ, và mục 17
   cho phép đúng cách làm này.
*/

'use strict';

/* Apps Script trả 302 sang script.googleusercontent.com rồi mới ra JSON.
   fetch của Node tự đi theo, nhưng thỉnh thoảng nó trả về trang HTML lỗi của
   Google thay vì JSON — phải bắt được chuyện đó chứ không để JSON.parse ném ra
   một thông báo vô nghĩa. */
const CHO_TOI_DA = 20000;

function cauHinh() {
  const url = process.env.GAS_URL;
  const khoa = process.env.GAS_KHOA_NOI_BO;
  if (!url) throw new Error('Thiếu biến môi trường GAS_URL trên Netlify.');
  if (!khoa) throw new Error('Thiếu biến môi trường GAS_KHOA_NOI_BO trên Netlify.');
  if (!/\/exec$/.test(url)) {
    throw new Error('GAS_URL phải kết thúc bằng /exec (URL Web App đã deploy).');
  }
  return { url, khoa };
}

async function doc(phanHoi) {
  const tho = await phanHoi.text();

  /* MÃ HTTP PHẢI KIỂM TRƯỚC KHI ĐỌC NỘI DUNG.
     Apps Script trả 200 kèm {ok:false} cho lỗi nghiệp vụ ("mã CTV đã tồn tại")
     — đó là câu trả lời hợp lệ, gọi bên ngoài xử lý được. Nhưng 4xx/5xx là hạ
     tầng hỏng, kể cả khi thân phản hồi tình cờ là JSON. Không phân biệt hai ca
     này thì một sự cố của Google sẽ hiện ra với khách thành "đơn của bạn bị
     từ chối", và trang web không rơi sang đường dự phòng. */
  if (!phanHoi.ok) {
    throw new Error('Apps Script trả HTTP ' + phanHoi.status + ': ' +
                    tho.slice(0, 200).replace(/\s+/g, ' '));
  }

  try {
    return JSON.parse(tho);
  } catch (err) {
    /* Gần như luôn là một trong hai: chưa deploy lại sau khi sửa mã, hoặc
       quyền truy cập Web App không phải "Anyone". Nói thẳng ra để khỏi mò. */
    const dau = tho.slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(
      'Apps Script không trả về JSON (HTTP ' + phanHoi.status + '). ' +
      'Thường là do chưa Deploy lại sau khi sửa mã, hoặc quyền Web App chưa đặt ' +
      '"Anyone". Nội dung nhận được: ' + dau
    );
  }
}

/** POST — dùng application/x-www-form-urlencoded theo đúng đặc tả mục 17. */
async function goiPost(hanhDong, thamSo) {
  const { url, khoa } = cauHinh();
  const than = new URLSearchParams(
    Object.assign({ action: hanhDong, khoa: khoa }, thamSo || {})
  );
  const huy = AbortSignal.timeout ? AbortSignal.timeout(CHO_TOI_DA) : undefined;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: than.toString(),
    signal: huy,
  });
  return doc(r);
}

/** GET — tham số đi trên URL. */
async function goiGet(hanhDong, thamSo) {
  const { url, khoa } = cauHinh();
  const q = new URLSearchParams(
    Object.assign({ action: hanhDong, khoa: khoa }, thamSo || {})
  );
  const huy = AbortSignal.timeout ? AbortSignal.timeout(CHO_TOI_DA) : undefined;
  const r = await fetch(url + '?' + q.toString(), { method: 'GET', signal: huy });
  return doc(r);
}

/* Trả lời HTTP. Không đặt CORS: mọi trang gọi hàm này đều cùng tên miền. */
function json(ma, than) {
  return {
    statusCode: ma,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(than),
  };
}

module.exports = { goiPost, goiGet, json };
