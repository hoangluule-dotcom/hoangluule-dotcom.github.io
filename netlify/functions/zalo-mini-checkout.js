/* DBV247 — Webhook Checkout SDK của Zalo Mini App
   ---------------------------------------------------------------------------
   Khai trong Mini App Center → Checkout SDK:
     Callback URL : https://dbv247.com.vn/.netlify/functions/zalo-mini-checkout?loai=callback
     Notify URL   : https://dbv247.com.vn/.netlify/functions/zalo-mini-checkout?loai=notify
                    (ô Notify URL nằm trong phần cấu hình kênh "Chuyển khoản ngân hàng")

   NOTIFY — Zalo gọi khi khách chọn chuyển khoản. Lúc này TIỀN CHƯA VỀ: chỉ ghi
   nhận khách đã chọn kênh, trả returnCode 1 để Zalo hiện thông tin chuyển
   khoản cho khách.

   CALLBACK — Zalo gọi khi giao dịch hoàn tất (dùng khi sau này mở ZaloPay).

   VỚI CHUYỂN KHOẢN, KHÔNG CÓ GÌ TỰ XÁC NHẬN TIỀN VỀ. Kế toán đối soát sao kê
   như đơn trên website (Apps Script). Sau đó nhân viên bấm "Đã nhận tiền" ở
   /admin/zalo-mini để báo Zalo đóng đơn — xem zalo-mini-admin.js.
   Hoa hồng CTV vẫn chỉ sinh từ dòng sao kê đã khớp, không sinh từ webhook này.
*/

'use strict';

const C = require('./lib/zalo-mini-chung');

const traLoi = (code, msg) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ returnCode: code, returnMessage: msg }),
});

async function timDon(kho, maDonZalo, extradata) {
  const z = await kho.get('zdon/' + maDonZalo, { type: 'json' });
  let maDon = z && z.maDon;
  if (!maDon && extradata) {
    try {
      maDon = JSON.parse(decodeURIComponent(extradata)).maDon;
    } catch (e) { /* bỏ qua */ }
  }
  if (!maDon) return null;
  return kho.get('don/' + maDon, { type: 'json' });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Chỉ nhận POST.' };
  let p;
  try {
    p = JSON.parse(event.body || '{}');
  } catch (err) {
    return traLoi(-1, 'Body không hợp lệ');
  }
  const d = p.data || {};
  const loai = (event.queryStringParameters || {}).loai;
  const kho = C.moKho();

  try {
    if (loai === 'notify') {
      const chuoi = 'appId=' + d.appId + '&orderId=' + d.orderId + '&method=' + d.method;
      if (!C.soSanhMac(chuoi, p.mac)) return traLoi(-1, 'Sai MAC');
      const don = await timDon(kho, d.orderId, d.extradata);
      if (don) {
        don.kenhThanhToan = d.method;
        if (!don.maDonZalo) {
          don.maDonZalo = String(d.orderId);
          await kho.setJSON('zdon/' + d.orderId, { maDon: don.maDon });
        }
        await kho.setJSON('don/' + don.maDon, don);
      } else {
        /* Notify tới trước khi Mini App kịp báo mã đơn Zalo — giữ lại để
           gan-don-zalo khớp sau, KHÔNG từ chối (từ chối là khách kẹt giữa chừng). */
        await kho.setJSON('zcho/' + d.orderId, { method: d.method, luc: new Date().toISOString() });
      }
      return traLoi(1, 'OK');
    }

    if (loai === 'callback') {
      const chuoi = 'appId=' + d.appId + '&amount=' + d.amount + '&description=' + d.description +
        '&orderId=' + d.orderId + '&message=' + d.message + '&resultCode=' + d.resultCode + '&transId=' + d.transId;
      if (!C.soSanhMac(chuoi, p.mac)) return traLoi(-1, 'Sai MAC');
      const don = await timDon(kho, d.orderId, d.extradata);
      if (!don) return traLoi(-1, 'Không tìm thấy đơn');
      if (Number(d.amount) !== Number(don.phi)) {
        console.error('zalo-mini-checkout: số tiền lệch', d.amount, don.phi, don.maDon);
        return traLoi(-1, 'Số tiền không khớp');
      }
      if (don.transId && don.transId === d.transId) return traLoi(2, 'Đã xử lý');
      don.transId = d.transId;
      don.kenhThanhToan = d.method;
      if (Number(d.resultCode) === 1) don.trangThai = 'da_thanh_toan';
      await kho.setJSON('don/' + don.maDon, don);
      return traLoi(1, 'OK');
    }
    return traLoi(-1, 'Thiếu loai=notify|callback');
  } catch (err) {
    console.error('zalo-mini-checkout:', err);
    return traLoi(-1, 'Lỗi hệ thống');
  }
};
