/* DBV247 — Quản trị đơn Zalo Mini App (cho nhóm vận hành)
   ---------------------------------------------------------------------------
   Trang: /admin/zalo-mini.html     Khoá: header x-dashboard-key = DASHBOARD_KEY
   (cùng khoá với CRM và /admin/ctv — mở được CRM là mở được trang này)

   GET  ?viec=ds                         danh sách đơn Mini App mới nhất
   POST ?viec=gan-gcn      {maDon, ten, base64}   gắn PDF giấy chứng nhận
   POST ?viec=da-nhan-tien {maDon}               báo Zalo đơn chuyển khoản đã nhận tiền
   POST ?viec=nhan-lai     {maDon}               gửi lại tin OA "giấy chứng nhận đã sẵn sàng"
   GET  ?viec=oa                                 đã kết nối Zalo OA chưa
   POST ?viec=cap-lai-ma   {maDon}               cấp mã liên kết 4 số MỚI cho SĐT của đơn
                                                 (khách đổi máy, xoá Zalo, đơn chưa vào app).
                                                 Khách nhập SĐT + mã → mọi hợp đồng của SĐT
                                                 đó chuyển sang máy đang nhập.
   POST ?viec=sua-don      {maDon, soAnChi?, phuTrachTen?, phuTrachSdt?}
                                                 số ấn chỉ do Tổng công ty cấp (hiện cho khách
                                                 thay mã đơn) + nhân viên chăm sóc đơn.
   POST ?viec=gan-ngoai    {sdt, sanPham, soAnChi, phuTrachTen, phuTrachSdt, bienSo,
                            hieuLucTu, hieuLucDen, phi, hoTen, ten, base64}
                            gắn PDF cho khách mua NGOÀI Zalo. SĐT đã liên kết app
                            → hiện thẳng; chưa → trả MÃ 4 SỐ (lib/lien-ket.js) để
                            nhắn khách: Hợp đồng → Liên kết → nhập SĐT + mã.

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
const LK = require('./lib/lien-ket');

const LINK_APP = 'https://zalo.me/s/' + C.MINI_APP_ID + '/';

/* Tin nhắn cố ý KHÔNG có tên, biển số, SĐT — chỉ mã đơn. */
function noiDungTin(d) {
  const dau = 'DBV247 xin thông báo: giấy chứng nhận bảo hiểm của đơn ' + d.maDon + ' đã sẵn sàng.\n';
  const cuoi = 'Cần hỗ trợ, anh/chị nhắn ngay tại đây hoặc gọi ' + C.HOTLINE + '.';
  /* Đơn không gắn được tài khoản Zalo thì file không hiện trong "Đơn của tôi" —
     nhân viên gửi file PDF trong khung chat OA này. */
  if (!d.zaloId) return dau + 'Nhân viên DBV247 sẽ gửi file PDF cho anh/chị ngay trong khung chat này.\n' + cuoi;
  return dau + 'Anh/chị mở Mini App "Bảo hiểm DBV" → Hợp đồng để xem và tải file PDF:\n' + LINK_APP + '\n' + cuoi;
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

const A = require('./lib/quan-tri-auth');

/* Quyền: xem — mọi vai trò; gắn GCN, nhắn lại — Quản lý, Vận hành;
   đã nhận tiền — Quản lý, Kế toán. */
const QUYEN = {
  'gan-gcn': ['quan-ly', 'van-hanh'],
  'gan-ngoai': ['quan-ly', 'van-hanh'],
  'cap-lai-ma': ['quan-ly', 'van-hanh'],
  'sua-don': ['quan-ly', 'van-hanh'],
  'nhan-lai': ['quan-ly', 'van-hanh'],
  'da-nhan-tien': ['quan-ly', 'ke-toan'],
};

function docPdf(p) {
  const buf = Buffer.from(String(p.base64 || ''), 'base64');
  if (buf.slice(0, 5).toString('latin1') !== '%PDF-') return { loi: [415, 'Chỉ nhận file PDF.'] };
  if (buf.length > 4.5 * 1024 * 1024) return { loi: [413, 'File quá 4,5 MB.'] };
  return { buf };
}
const tenTep = (t, du) => (String(t || du).replace(/[\u0000-\u001f"<>|*?:\\/]/g, '').replace(/\.pdf$/i, '') + '.pdf').slice(0, 120);
const ngayHop = (v) => (/^\d{2}\/\d{2}\/\d{4}$/.test(String(v || '').trim()) ? String(v).trim() : '');

function maDonNgoai() {
  const d = new Date(Date.now() + 7 * 3600000);
  const p2 = (x) => String(x).padStart(2, '0');
  return 'NG' + String(d.getUTCFullYear()).slice(2) + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + C.ngauNhien(4);
}

/* Đơn mua ngoài Zalo: nếu SĐT đã từng được khách xác minh trong Mini App thì
   gắn thẳng vào tài khoản đó; chưa thì chờ ở "cho/<sdt>/" tới khi khách xác minh. */
/* Số ấn chỉ (số GCN/hợp đồng do hệ thống Tổng công ty cấp) — nhập tay cho tới
   khi có API. Chỉ giữ chữ, số và - / . để hiện gọn trên app. */
const soAnChiHop = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9\-\/.]/g, '').slice(0, 40);
function phuTrachHop(ten, sdt, macDinh) {
  const t = String(ten == null ? macDinh || '' : ten).trim().replace(/\s+/g, ' ').slice(0, 60);
  return t ? { ten: t, sdt: C.chuanHoaSdt(sdt) || '' } : null;
}

async function ganNgoai(kho, p, nguoi) {
  const sdt = C.chuanHoaSdt(p.sdt);
  if (!sdt) return C.json(400, { error: 'Số điện thoại khách chưa đúng (10 số, bắt đầu bằng 0).' });
  const sanPham = String(p.sanPham || '').trim().slice(0, 120);
  if (!sanPham) return C.json(400, { error: 'Nhập tên sản phẩm bảo hiểm.' });
  const f = docPdf(p);
  if (f.loi) return C.json(f.loi[0], { error: f.loi[1] });

  const maDon = maDonNgoai();
  const luc = new Date().toISOString();
  const maTep = C.ngauNhien(12);
  const ten = tenTep(p.ten, 'GCN-' + maDon);
  await kho.set('tep/' + maTep, f.buf, { metadata: { mime: 'application/pdf', ten } });

  const d = {
    maDon, nguon: 'ngoai', zaloId: '', taoLuc: luc, taoBoi: nguoi,
    sanPham, bienSo: String(p.bienSo || '').toUpperCase().replace(/\s+/g, '').slice(0, 15),
    phi: Math.max(0, Math.round(Number(String(p.phi || '').replace(/\D/g, '')) || 0)),
    hieuLucTu: ngayHop(p.hieuLucTu), hieuLucDen: ngayHop(p.hieuLucDen),
    hoTen: String(p.hoTen || '').trim().slice(0, 100), sdt, email: '', maCtv: '',
    noiDungCk: '', trangThai: 'hieu_luc', soChinh: 'ngoai', maDonZalo: '',
    gcn: [{ maTep, ten, kich: f.buf.length, luc, nguoi }], idOA: '',
    soAnChi: soAnChiHop(p.soAnChi), phuTrach: phuTrachHop(p.phuTrachTen, p.phuTrachSdt, nguoi === 'Khoá chung' ? '' : nguoi),
  };

  const lk = await kho.get('sdt/' + sdt, { type: 'json' });
  let tinOA = null;
  let maLienKet = '';
  if (lk && lk.zaloId) {
    d.zaloId = lk.zaloId;
    d.lienKetLuc = luc;
    await kho.setJSON('kh/' + lk.zaloId + '/don/' + maDon, { maDon, taoLuc: luc });
    await kho.setJSON('kh/' + lk.zaloId + '/tep/' + maTep, { maTep, ten, kich: f.buf.length, mime: 'application/pdf', luc, nguon: 'dbv', maDon });
    tinOA = await nhanKhach(kho, d);
  } else {
    await kho.setJSON('cho/' + sdt + '/' + maDon, { maDon, luc });
    maLienKet = await LK.capMa(kho, sdt, { boi: nguoi });
  }
  await kho.setJSON('don/' + maDon, d);
  return C.json(200, { ok: true, maDon, sdt, daLienKet: !!d.zaloId, tinOA, maLienKet });
}

async function danhSach(kho) {
  const { blobs } = await kho.list({ prefix: 'don/' });
  const ds = [];
  for (const b of blobs.slice(-300)) {
    const d = await kho.get(b.key, { type: 'json' });
    if (!d) continue;
    /* Đơn ngoài Zalo đang chờ khách liên kết: hiện mã 4 số còn hạn (hết hạn → cấp mới). */
    let maLienKet = '';
    if (!d.zaloId && d.nguon === 'ngoai' && d.sdt) maLienKet = (await LK.maConHan(kho, d.sdt)) || (await LK.capMa(kho, d.sdt));
    ds.push({
      maDon: d.maDon, taoLuc: d.taoLuc, sanPham: d.sanPham, bienSo: d.bienSo, phi: d.phi,
      hoTen: d.hoTen, sdt: d.sdt, email: d.email, maCtv: d.maCtv, noiDungCk: d.noiDungCk,
      trangThai: d.trangThai, maDonZalo: d.maDonZalo, kenh: d.kenhThanhToan || '',
      soChinh: d.soChinh, soGcn: (d.gcn || []).length,
      coOA: !!d.idOA, tinOA: d.tinOA || null,
      nguon: d.nguon || 'zalo', daLienKet: !!d.zaloId, maLienKet,
      soAnChi: d.soAnChi || '', phuTrach: d.phuTrach || null,
    });
  }
  ds.sort((a, b) => String(b.taoLuc).localeCompare(String(a.taoLuc)));
  return ds;
}

exports.handler = async function (event) {
  const viec = (event.queryStringParameters || {}).viec;
  const q = await A.kiemQuyen(event, event.httpMethod === 'POST' ? (QUYEN[viec] || ['quan-ly']) : null);
  if (q.loi) return C.json(q.ma, { error: q.loi });
  const nguoi = q.nv.hoTen;
  const kho = C.moKho();

  try {
    if (event.httpMethod === 'GET' && viec === 'ds') return C.json(200, { ok: true, don: await danhSach(kho) });
    if (event.httpMethod === 'GET' && viec === 'oa') return C.json(200, Object.assign({ ok: true }, await OA.trangThai()));
    if (event.httpMethod !== 'POST') return C.json(405, { error: 'Không hỗ trợ.' });

    const p = JSON.parse(event.body || '{}');
    if (viec === 'gan-ngoai') return await ganNgoai(kho, p, nguoi);
    const d = await kho.get('don/' + String(p.maDon || ''), { type: 'json' });
    if (!d) return C.json(404, { error: 'Không tìm thấy đơn ' + p.maDon });

    if (viec === 'gan-gcn') {
      const f = docPdf(p);
      if (f.loi) return C.json(f.loi[0], { error: f.loi[1] });
      const buf = f.buf;
      const maTep = C.ngauNhien(12);
      const ten = tenTep(p.ten, 'GCN-' + d.maDon);
      await kho.set('tep/' + maTep, buf, { metadata: { mime: 'application/pdf', ten } });
      if (d.zaloId) {
        await kho.setJSON('kh/' + d.zaloId + '/tep/' + maTep, {
          maTep, ten, kich: buf.length, mime: 'application/pdf', luc: new Date().toISOString(), nguon: 'dbv', maDon: d.maDon,
        });
      }
      d.gcn = (d.gcn || []).concat([{ maTep, ten, kich: buf.length, luc: new Date().toISOString(), nguoi }]);
      d.trangThai = 'hieu_luc';
      const tinOA = await nhanKhach(kho, d);
      await kho.setJSON('don/' + d.maDon, d);
      return C.json(200, { ok: true, maTep, tinOA, coTrongApp: !!d.zaloId });
    }

    if (viec === 'cap-lai-ma') {
      if (!d.sdt) return C.json(400, { error: 'Đơn chưa có số điện thoại khách.' });
      if (!d.zaloId) await kho.setJSON('cho/' + d.sdt + '/' + d.maDon, { maDon: d.maDon, luc: new Date().toISOString() });
      else if (!(await kho.get('sdt/' + d.sdt, { type: 'json' }))) {
        /* Đơn mua trong app (gắn theo máy cũ) → ghi nhớ máy cũ để chuyển được sang máy mới. */
        await kho.setJSON('sdt/' + d.sdt, { zaloId: d.zaloId, luc: new Date().toISOString() });
      }
      const maLienKet = await LK.capMa(kho, d.sdt, { moi: true, chuyen: true, boi: nguoi });
      return C.json(200, { ok: true, maLienKet, sdt: d.sdt });
    }

    if (viec === 'sua-don') {
      if (p.soAnChi !== undefined) d.soAnChi = soAnChiHop(p.soAnChi);
      if (p.phuTrachTen !== undefined) d.phuTrach = phuTrachHop(p.phuTrachTen, p.phuTrachSdt, '');
      d.suaLuc = new Date().toISOString();
      d.suaBoi = nguoi;
      await kho.setJSON('don/' + d.maDon, d);
      return C.json(200, { ok: true, soAnChi: d.soAnChi || '', phuTrach: d.phuTrach || null });
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
      d.daNhanTienBoi = nguoi;
      await kho.setJSON('don/' + d.maDon, d);
      return C.json(200, { ok: true, zalo });
    }
    return C.json(400, { error: 'Việc không hợp lệ.' });
  } catch (err) {
    console.error('zalo-mini-admin:', err);
    return C.json(500, { error: String(err.message || err) });
  }
};
