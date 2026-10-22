/* DBV247 — Quản trị đơn Zalo Mini App (cho nhóm vận hành)
   ---------------------------------------------------------------------------
   Trang: /admin/zalo-mini.html     Khoá: header x-dashboard-key = DASHBOARD_KEY
   (cùng khoá với CRM và /admin/ctv — mở được CRM là mở được trang này)

   GET  ?viec=ds                         danh sách đơn Mini App mới nhất
   POST ?viec=gan-gcn      {maDon, ten, base64}   gắn PDF giấy chứng nhận
   POST ?viec=da-nhan-tien {maDon}               báo Zalo đơn chuyển khoản đã nhận tiền
   POST ?viec=nhan-lai     {maDon}               gửi lại tin OA "giấy chứng nhận đã sẵn sàng"
   GET  ?viec=oa                                 đã kết nối Zalo OA chưa

   Gắn giấy chứng nhận xong, OA DBV247 TỰ NHẮN khách (lib/zalo-oa.js). Không
   nhắn được (khách chưa Quan tâm OA, quá 7 ngày không tương tác, chưa kết nối
   OA…) thì trang quản trị hiện lý do để nhân viên gọi/nhắn khách thủ công.

   "Đã nhận tiền" chỉ bấm SAU khi kế toán thấy dòng sao kê. Nó đóng đơn phía
   Zalo cho khách thấy "thành công"; nó KHÔNG sinh hoa hồng — hoa hồng vẫn do
   Apps Script sinh từ sao kê như đơn website.
*/

'use strict';

const C = require('./lib/zalo-mini-chung');
const OA = require('./lib/zalo-oa');

const LINK_APP = 'https://zalo.me/s/' + C.MINI_APP_ID + '/';

/* Tin nhắn cố ý KHÔNG có tên, biển số, SĐT — chỉ mã đơn. */
function noiDungTin(d) {
  const dau = 'DBV247 xin thông báo: giấy chứng nhận bảo hiểm của đơn ' + d.maDon + ' đã sẵn sàng.\n';
  const cuoi = 'Cần hỗ trợ, anh/chị nhắn ngay tại đây hoặc gọi ' + C.HOTLINE + '.';
  /* Đơn không gắn được tài khoản Zalo thì file không hiện trong "Đơn của tôi" —
     nhân viên gửi file PDF trong khung chat OA này. */
  if (!d.zaloId) return dau + 'Nhân viên DBV247 sẽ gửi file PDF cho anh/chị ngay trong khung chat này.\n' + cuoi;
  return dau + 'Anh/chị mở Mini App "Bảo hiểm DBV247" → Đơn của tôi để xem và tải file PDF:\n' + LINK_APP + '\n' + cuoi;
}

async function nhanKhach(kho, d) {
  let idOA = d.idOA;
  if (!idOA && d.zaloId) {
    const oa = await kho.get('kh/' + d.zaloId + '/oa', { type: 'json' });
    if (oa && oa.idOA) idOA = d.idOA = oa.idOA;
  }
  const kq = idOA
    ? await OA.guiTinTuVan(idOA, noiDungTin(d))
    : { ok: false, loi: 'Khách chưa Quan tâm OA trong Mini App nên OA chưa nhắn được.' };
  d.tinOA = Object.assign({ luc: new Date().toISOString() }, kq);
  if (!kq.ok) console.error('zalo-mini-admin: chưa nhắn được khách', d.maDon, kq.loi);
  return d.tinOA;
}

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
      coOA: !!d.idOA, tinOA: d.tinOA || null,
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
    if (event.httpMethod === 'GET' && viec === 'oa') return C.json(200, Object.assign({ ok: true }, await OA.trangThai()));
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
      if (d.zaloId) {
        await kho.setJSON('kh/' + d.zaloId + '/tep/' + maTep, {
          maTep, ten, kich: buf.length, mime: 'application/pdf', luc: new Date().toISOString(), nguon: 'dbv', maDon: d.maDon,
        });
      }
      d.gcn = (d.gcn || []).concat([{ maTep, ten, luc: new Date().toISOString() }]);
      d.trangThai = 'hieu_luc';
      const tinOA = await nhanKhach(kho, d);
      await kho.setJSON('don/' + d.maDon, d);
      return C.json(200, { ok: true, maTep, tinOA, coTrongApp: !!d.zaloId });
    }

    if (viec === 'nhan-lai') {
      if (!(d.gcn || []).length) return C.json(400, { error: 'Đơn chưa có giấy chứng nhận.' });
      const tinOA = await nhanKhach(kho, d);
      await kho.setJSON('don/' + d.maDon, d);
      return C.json(200, { ok: true, tinOA });
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
