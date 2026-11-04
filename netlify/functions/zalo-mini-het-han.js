/* DBV247 — Tự huỷ đơn Mini App quá hạn chuyển khoản (chạy theo lịch)
   ---------------------------------------------------------------------------
   Vì sao có: Zalo yêu cầu giao dịch Checkout SDK không được treo mãi ở
   "Đang chờ kết quả". Với chuyển khoản ngân hàng, Zalo chỉ đổi trạng thái khi
   ta gọi updateOrderStatus (bank-callback-payment):
     • kế toán bấm "Đã nhận tiền"  → resultCode 1  (zalo-mini-admin.js)
     • kế toán bấm "Huỷ đơn"        → resultCode -1 (zalo-mini-admin.js)
     • quá hạn mà chưa ai xác nhận  → resultCode -1 (HÀM NÀY)

   Hạn: ZALO_HAN_THANH_TOAN_PHUT (mặc định 60 phút, tối thiểu 15).
   Sổ quét: ctt/<maDon> — ghi khi tạo đơn trong zalo-mini.js.
   Khách chuyển muộn sau khi đơn đã huỷ: kế toán vẫn bấm "Đã nhận tiền" được,
   đơn chuyển sang đã nhận tiền như bình thường.

   Lịch trong netlify.toml:
     [functions."zalo-mini-het-han"]
       schedule = "mỗi 10 phút" (xem netlify.toml)
   Netlify cắt scheduled function sau 30 giây → mỗi lượt xử lý tối đa 40 đơn.
*/
'use strict';

const C = require('./lib/zalo-mini-chung');

const MOI_LUOT = 40;
const THU_LAI_TOI_DA = 12; // gọi Zalo lỗi thì thử lại ở các lượt sau (~2 giờ)

async function quet(kho, bayGio) {
  const han = C.hanThanhToanPhut() * 60000;
  const { blobs } = await kho.list({ prefix: 'ctt/' });
  const kq = { xem: 0, huy: 0, xong: 0, loiZalo: 0 };
  for (const b of blobs.slice(0, MOI_LUOT)) {
    kq.xem++;
    const c = await kho.get(b.key, { type: 'json' });
    const d = c && (await kho.get('don/' + c.maDon, { type: 'json' }));
    if (!d) { await kho.delete(b.key); continue; }

    if (d.trangThai === 'cho_thanh_toan') {
      if (bayGio - Date.parse(d.taoLuc) < han) continue;
      const { zalo } = await C.huyDonChuaTra(kho, d, 'qua_han_thanh_toan', 'tự động');
      kq.huy++;
      if (zalo.ok) await kho.delete(b.key);
      else { kq.loiZalo++; await kho.setJSON(b.key, Object.assign({}, c, { thu: 1 })); }
      continue;
    }

    /* Đơn đã huỷ nhưng lần trước gọi Zalo lỗi → thử lại. */
    if (d.trangThai === 'huy' && d.maDonZalo && d.zaloCapNhat && !d.zaloCapNhat.ok && (c.thu || 0) < THU_LAI_TOI_DA) {
      const r = await C.baoZaloDaThanhToan(d.maDonZalo, -1).catch((e) => ({ ok: false, kq: String(e.message || e) }));
      d.zaloCapNhat = { luc: new Date(bayGio).toISOString(), resultCode: -1, ok: r.ok, ghiChu: r.ok ? 'Đã báo Zalo: giao dịch không thành công' : 'Zalo trả: ' + JSON.stringify(r.kq).slice(0, 200) };
      await kho.setJSON('don/' + d.maDon, d);
      if (r.ok) await kho.delete(b.key);
      else { kq.loiZalo++; await kho.setJSON(b.key, Object.assign({}, c, { thu: (c.thu || 0) + 1 })); }
      continue;
    }

    /* Đã nhận tiền / đã cấp GCN / hết lượt thử → bỏ khỏi sổ. */
    await kho.delete(b.key);
    kq.xong++;
  }
  return kq;
}

exports.handler = async function () {
  try {
    const kq = await quet(C.moKho(), Date.now());
    if (kq.huy || kq.loiZalo) console.log('zalo-mini-het-han:', JSON.stringify(kq));
    return { statusCode: 200, body: JSON.stringify(kq) };
  } catch (err) {
    console.error('zalo-mini-het-han:', err);
    return { statusCode: 500, body: 'loi' };
  }
};

exports._quet = quet;
