/* DBV247 — Quản trị đơn Zalo Mini App (cho nhóm vận hành)
   ---------------------------------------------------------------------------
   Trang: /admin/zalo-mini.html     Khoá: header x-dashboard-key = DASHBOARD_KEY
   (cùng khoá với CRM và /admin/ctv — mở được CRM là mở được trang này)

   GET  ?viec=ds                         danh sách đơn Mini App mới nhất
   POST ?viec=gan-gcn      {maDon, ten, base64}   gắn PDF giấy chứng nhận
   POST ?viec=da-nhan-tien {maDon}               báo Zalo đơn chuyển khoản đã nhận tiền

   "Đã nhận tiền" chỉ bấm SAU khi kế toán thấy dòng sao kê. Nó đóng đơn phía
   Zalo cho khách thấy "thành công"; nó KHÔNG sinh hoa hồng — hoa hồng vẫn do
   Apps Script sinh từ sao kê như đơn website.
*/

'use strict';

const C = require('./lib/zalo-mini-chung');

function kiemKhoa(event) {
  const h = event.headers || {};
  const gui = h['x-dashboard-key'] || h['X-Dashboard-Key'] || '';
  const mong = process.env.DASHBOARD_KEY || '';
  if (!mong) return 'Thiếu biến môi trường DASHBOARD_KEY trên Netlify.';
  if (!gui || gui !== mong) return 'Sai khoá quản trị.';
  return null;
}

async function danhSach(kho) {
  const { blobs } = await kho.list({ prefix: 'don/' });
  const ds = [];
  for (const b of blobs.slice(-300)) {
    const d = await kho.get(b.key, { type: 'json' });
    if (!d) continue;
    ds.push({
      maDon: d.maDon, taoLuc: d.taoLuc, sanPham: d.sanPham, bienSo: d.bienSo, phi: d.phi,
      hoTen: d.hoTen, sdt: d.sdt, email: d.email, maCtv: d.maCtv, noiDungCk: d.noiDungCk,
      trangThai: d.trangThai, maDonZalo: d.maDonZalo, kenh: d.kenhThanhToan || '',
      soChinh: d.soChinh, soGcn: (d.gcn || []).length,
    });
  }
  ds.sort((a, b) => String(b.taoLuc).localeCompare(String(a.taoLuc)));
  return ds;
}

exports.handler = async function (event) {
  const loiKhoa = kiemKhoa(event);
  if (loiKhoa) return C.json(401, { error: loiKhoa });
  const viec = (event.queryStringParameters || {}).viec;
  const kho = C.moKho();

  try {
    if (event.httpMethod === 'GET' && viec === 'ds') return C.json(200, { ok: true, don: await danhSach(kho) });
    if (event.httpMethod !== 'POST') return C.json(405, { error: 'Không hỗ trợ.' });

    const p = JSON.parse(event.body || '{}');
    const d = await kho.get('don/' + String(p.maDon || ''), { type: 'json' });
    if (!d) return C.json(404, { error: 'Không tìm thấy đơn ' + p.maDon });

    if (viec === 'gan-gcn') {
      const buf = Buffer.from(String(p.base64 || ''), 'base64');
      if (buf.slice(0, 5).toString('latin1') !== '%PDF-') return C.json(415, { error: 'Chỉ nhận file PDF.' });
      if (buf.length > 4.5 * 1024 * 1024) return C.json(413, { error: 'File quá 4,5 MB.' });
      const maTep = C.ngauNhien(12);
      const ten = (String(p.ten || 'GCN-' + d.maDon).replace(/[\u0000-\u001f"<>|*?:\\/]/g, '').replace(/\.pdf$/i, '') + '.pdf').slice(0, 120);
      await kho.set('tep/' + maTep, buf, { metadata: { mime: 'application/pdf', ten } });
      await kho.setJSON('kh/' + d.zaloId + '/tep/' + maTep, {
        maTep, ten, kich: buf.length, mime: 'application/pdf', luc: new Date().toISOString(), nguon: 'dbv', maDon: d.maDon,
      });
      d.gcn = (d.gcn || []).concat([{ maTep, ten, luc: new Date().toISOString() }]);
      d.trangThai = 'hieu_luc';
      await kho.setJSON('don/' + d.maDon, d);
      return C.json(200, { ok: true, maTep });
    }

    if (viec === 'da-nhan-tien') {
      let zalo = { ok: false, ghiChu: 'Đơn chưa có mã Zalo (khách chưa qua bước thanh toán trong app).' };
      if (d.maDonZalo) {
        const kq = await C.baoZaloDaThanhToan(d.maDonZalo, 1);
        zalo = { ok: kq.ok, ghiChu: kq.ok ? 'Đã báo Zalo' : 'Zalo trả: ' + JSON.stringify(kq.kq).slice(0, 200) };
      }
      if (d.trangThai === 'cho_thanh_toan') d.trangThai = 'da_thanh_toan';
      d.daNhanTienLuc = new Date().toISOString();
      await kho.setJSON('don/' + d.maDon, d);
      return C.json(200, { ok: true, zalo });
    }
    return C.json(400, { error: 'Việc không hợp lệ.' });
  } catch (err) {
    console.error('zalo-mini-admin:', err);
    return C.json(500, { error: String(err.message || err) });
  }
};
