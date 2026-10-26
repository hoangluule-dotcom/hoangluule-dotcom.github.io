/* DBV247 — Cổng quản trị /quan-tri: đăng nhập & tài khoản nhân viên
   ---------------------------------------------------------------------------
   /.netlify/functions/quan-tri?viec=<việc>

   POST dang-nhap    {ten, matKhau}                  → {ve, nv}
   POST khoi-tao     {khoa, ten, hoTen, matKhau}     tạo tài khoản QUẢN LÝ đầu tiên
                     bằng khoá chung DASHBOARD_KEY (chỉ khi chưa có quản lý nào)
   POST khoi-phuc    {ma}                            → danh sách tài khoản quản lý
                     {ma, ten, matKhau}              → đặt lại mật khẩu, vào luôn
                     Quên tên đăng nhập / mật khẩu: ma = biến môi trường
                     QUAN_TRI_MA_KHOI_PHUC (chỉ người có quyền vào Netlify đặt được).
                     Sai 5 lần → khoá 1 giờ. Mỗi lần dùng: ghi nhật ký + báo nhóm Zalo.
   GET  toi                                          → hồ sơ của chính mình
   POST doi-mat-khau {cu, moi}                       → vé mới (vé cũ hết hiệu lực)

   Chỉ quản lý:
   GET  nv-ds                                        danh sách nhân viên + nhật ký
   POST nv-tao       {ten, hoTen, vaiTro, matKhau}   mật khẩu tạm, bắt đổi lần đầu
   POST nv-sua       {ten, hoTen?, vaiTro?, biKhoa?}
   POST nv-dat-lai   {ten, matKhau}                  đặt lại mật khẩu tạm
   POST khoa-chung   {tat: true|false}               tắt/bật khoá chung DASHBOARD_KEY

   Header: x-dashboard-key: <vé phiên>  (trừ dang-nhap, khoi-tao)
*/

'use strict';

const A = require('./lib/quan-tri-auth');

const json = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(payload),
});

async function dangNhap(p) {
  const ten = A.chuanHoaTen(p.ten);
  const nv = await A.layNv(ten);
  const sai = 'Sai tên đăng nhập hoặc mật khẩu.';
  if (!nv) return json(401, { error: sai });
  if (nv.khoaDen && Date.now() < nv.khoaDen) {
    return json(429, { error: 'Nhập sai quá nhiều lần. Thử lại sau ' + Math.ceil((nv.khoaDen - Date.now()) / 60000) + ' phút.' });
  }
  if (!A.dungMatKhau(p.matKhau, nv.matKhau)) {
    nv.saiLan = (nv.saiLan || 0) + 1;
    if (nv.saiLan >= A.SAI_TOI_DA) {
      nv.khoaDen = Date.now() + A.KHOA_PHUT * 60000;
      nv.saiLan = 0;
      await A.ghiNhatKy(nv.ten, 'tam-khoa', 'Sai mật khẩu ' + A.SAI_TOI_DA + ' lần');
    }
    await A.luuNv(nv);
    return json(401, { error: sai });
  }
  if (nv.biKhoa) return json(403, { error: 'Tài khoản đã bị khoá. Liên hệ quản lý.' });
  nv.saiLan = 0;
  nv.khoaDen = 0;
  nv.dangNhapLuc = new Date().toISOString();
  await A.luuNv(nv);
  await A.ghiNhatKy(nv.ten, 'dang-nhap', '');
  return json(200, { ok: true, ve: A.kyVe(nv), nv: A.congKhai(nv) });
}

async function khoiTao(p) {
  const mong = process.env.DASHBOARD_KEY || '';
  if (!mong || String(p.khoa || '') !== mong) return json(401, { error: 'Sai khoá chung (DASHBOARD_KEY).' });
  const ds = await A.dsNv();
  if (ds.some((n) => n.vaiTro === 'quan-ly' && !n.biKhoa)) {
    return json(409, { error: 'Đã có tài khoản quản lý. Nhờ quản lý tạo tài khoản cho anh/chị.' });
  }
  const kq = await taoNv(p, 'quan-ly', false, 'khoi-tao');
  if (kq.error) return json(400, kq);
  await A.ghiNhatKy(kq.nv.ten, 'khoi-tao', 'Tạo tài khoản quản lý đầu tiên bằng khoá chung');
  return json(200, { ok: true, ve: A.kyVe(kq.nv), nv: A.congKhai(kq.nv) });
}

async function taoNv(p, vaiTro, phaiDoi, nguoiTao) {
  const ten = A.chuanHoaTen(p.ten);
  const hoTen = String(p.hoTen || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (ten.length < 3) return { error: 'Tên đăng nhập cần ít nhất 3 ký tự (chữ không dấu, số, dấu chấm).' };
  if (!hoTen) return { error: 'Thiếu họ tên.' };
  if (!A.VAI_TRO[vaiTro]) return { error: 'Vai trò không hợp lệ.' };
  const loiMk = A.matKhauHopLe(p.matKhau);
  if (loiMk) return { error: loiMk };
  if (await A.layNv(ten)) return { error: 'Tên đăng nhập "' + ten + '" đã có người dùng.' };
  const nv = {
    ten, hoTen, vaiTro, matKhau: A.bamMatKhau(p.matKhau), phien: 1,
    phaiDoiMatKhau: !!phaiDoi, biKhoa: false, taoLuc: new Date().toISOString(), taoBoi: nguoiTao,
  };
  await A.luuNv(nv);
  return { nv };
}

async function khoiPhuc(p) {
  const mong = process.env.QUAN_TRI_MA_KHOI_PHUC || '';
  if (mong.length < 12) {
    return json(400, { error: 'Chưa bật khôi phục. Vào Netlify → Site configuration → Environment variables, thêm biến QUAN_TRI_MA_KHOI_PHUC (chuỗi tự đặt, ≥ 12 ký tự), deploy lại rồi thử.' });
  }
  const kho = A.moKho();
  const kp = (await kho.get('khoi-phuc', { type: 'json' })) || { sai: 0, den: 0 };
  if (kp.den && Date.now() < kp.den) {
    return json(429, { error: 'Nhập sai mã khôi phục quá nhiều lần. Thử lại sau ' + Math.ceil((kp.den - Date.now()) / 60000) + ' phút.' });
  }
  const crypto = require('node:crypto');
  const a = Buffer.from(String(p.ma || '')), b = Buffer.from(mong);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    kp.sai = (kp.sai || 0) + 1;
    if (kp.sai >= 5) { kp.den = Date.now() + 3600000; kp.sai = 0; }
    await kho.setJSON('khoi-phuc', kp);
    await A.ghiNhatKy('khoi-phuc', 'khoi-phuc-sai', 'Nhập sai mã khôi phục');
    return json(401, { error: 'Mã khôi phục không đúng.' });
  }
  await kho.setJSON('khoi-phuc', { sai: 0, den: 0 });
  const quanLy = (await A.dsNv()).filter((n) => n.vaiTro === 'quan-ly');
  if (!p.ten) {
    return json(200, { ok: true, quanLy: quanLy.map((n) => ({ ten: n.ten, hoTen: n.hoTen, biKhoa: !!n.biKhoa })) });
  }
  const nv = quanLy.find((n) => n.ten === A.chuanHoaTen(p.ten));
  if (!nv) return json(404, { error: 'Không có tài khoản quản lý này.' });
  const loi = A.matKhauHopLe(p.matKhau);
  if (loi) return json(400, { error: loi });
  nv.matKhau = A.bamMatKhau(p.matKhau);
  nv.phien = (nv.phien || 1) + 1;
  nv.phaiDoiMatKhau = false;
  nv.biKhoa = false;
  nv.saiLan = 0;
  nv.khoaDen = 0;
  nv.dangNhapLuc = new Date().toISOString();
  await A.luuNv(nv);
  await A.ghiNhatKy(nv.ten, 'khoi-phuc', 'Đặt lại mật khẩu bằng mã khôi phục');
  try {
    await require('./lib/zalo').guiZalo('Cổng quản trị DBV247: tài khoản quản lý "' + nv.ten + '" (' + nv.hoTen + ') vừa được đặt lại mật khẩu bằng mã khôi phục. Nếu không phải anh/chị làm, đổi ngay biến QUAN_TRI_MA_KHOI_PHUC trên Netlify.');
  } catch (e) { /* không chặn */ }
  return json(200, { ok: true, ve: A.kyVe(nv), nv: A.congKhai(nv) });
}

async function dsNhatKy() {
  const kho = A.moKho();
  const { blobs } = await kho.list({ prefix: 'nhat-ky/' });
  const moi = blobs.map((b) => b.key).sort().slice(-80).reverse();
  return (await Promise.all(moi.map((k) => kho.get(k, { type: 'json' })))).filter(Boolean);
}

exports.handler = async function (event) {
  const viec = (event.queryStringParameters || {}).viec || '';
  let p = {};
  if (event.httpMethod === 'POST') {
    try {
      p = JSON.parse(event.body || '{}');
    } catch (e) {
      return json(400, { error: 'Dữ liệu gửi lên không đọc được.' });
    }
  }

  try {
    if (viec === 'dang-nhap' && event.httpMethod === 'POST') return await dangNhap(p);
    if (viec === 'khoi-tao' && event.httpMethod === 'POST') return await khoiTao(p);
    if (viec === 'khoi-phuc' && event.httpMethod === 'POST') return await khoiPhuc(p);
    if (viec === 'can-khoi-tao') {
      const ds = await A.dsNv();
      return json(200, { ok: true, canKhoiTao: !ds.some((n) => n.vaiTro === 'quan-ly' && !n.biKhoa) });
    }

    const q = await A.kiemQuyen(event);
    if (q.loi) return json(q.ma, { error: q.loi });
    const toi = q.nv;

    if (viec === 'toi') {
      if (toi.khoaChung) return json(200, { ok: true, nv: { hoTen: 'Khoá chung', vaiTro: 'quan-ly', tenVaiTro: 'Quản lý', khoaChung: true } });
      return json(200, { ok: true, nv: A.congKhai(await A.layNv(toi.ten)) });
    }

    if (viec === 'doi-mat-khau' && event.httpMethod === 'POST') {
      if (toi.khoaChung) return json(400, { error: 'Khoá chung không có mật khẩu riêng để đổi.' });
      const nv = await A.layNv(toi.ten);
      if (!A.dungMatKhau(p.cu, nv.matKhau)) return json(400, { error: 'Mật khẩu hiện tại chưa đúng.' });
      const loi = A.matKhauHopLe(p.moi);
      if (loi) return json(400, { error: loi });
      if (String(p.moi) === String(p.cu)) return json(400, { error: 'Mật khẩu mới phải khác mật khẩu cũ.' });
      nv.matKhau = A.bamMatKhau(p.moi);
      nv.phien = (nv.phien || 1) + 1; // đăng xuất mọi máy khác
      nv.phaiDoiMatKhau = false;
      await A.luuNv(nv);
      await A.ghiNhatKy(nv.ten, 'doi-mat-khau', '');
      return json(200, { ok: true, ve: A.kyVe(nv), nv: A.congKhai(nv) });
    }

    /* ── Chỉ quản lý ── */
    if (toi.vaiTro !== 'quan-ly') return json(403, { error: 'Chỉ quản lý được quản lý tài khoản.' });
    const nguoi = toi.ten || 'khoa-chung';

    if (viec === 'nv-ds') {
      const ds = (await A.dsNv()).map(A.congKhai).sort((a, b) => a.hoTen.localeCompare(b.hoTen, 'vi'));
      return json(200, { ok: true, nv: ds, cauHinh: await A.cauHinh(), nhatKy: await dsNhatKy(), vaiTro: A.VAI_TRO });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Không hỗ trợ.' });

    if (viec === 'nv-tao') {
      const kq = await taoNv(p, p.vaiTro, true, nguoi);
      if (kq.error) return json(400, kq);
      await A.ghiNhatKy(nguoi, 'tao-tai-khoan', kq.nv.ten + ' · ' + A.VAI_TRO[kq.nv.vaiTro]);
      return json(200, { ok: true, nv: A.congKhai(kq.nv) });
    }

    if (viec === 'nv-sua' || viec === 'nv-dat-lai') {
      const nv = await A.layNv(p.ten);
      if (!nv) return json(404, { error: 'Không tìm thấy tài khoản.' });
      const laMinh = nv.ten === toi.ten;
      const doi = [];
      if (viec === 'nv-dat-lai') {
        const loi = A.matKhauHopLe(p.matKhau);
        if (loi) return json(400, { error: loi });
        nv.matKhau = A.bamMatKhau(p.matKhau);
        nv.phaiDoiMatKhau = true;
        nv.saiLan = 0;
        nv.khoaDen = 0;
        nv.phien = (nv.phien || 1) + 1;
        doi.push('đặt lại mật khẩu');
      } else {
        if (p.hoTen !== undefined) {
          const ht = String(p.hoTen).trim().replace(/\s+/g, ' ').slice(0, 60);
          if (!ht) return json(400, { error: 'Họ tên không được trống.' });
          if (ht !== nv.hoTen) doi.push('họ tên: ' + nv.hoTen + ' → ' + ht);
          nv.hoTen = ht;
        }
        if (p.vaiTro !== undefined && p.vaiTro !== nv.vaiTro) {
          if (!A.VAI_TRO[p.vaiTro]) return json(400, { error: 'Vai trò không hợp lệ.' });
          if (laMinh) return json(400, { error: 'Không tự đổi vai trò của chính mình.' });
          doi.push('vai trò: ' + A.VAI_TRO[nv.vaiTro] + ' → ' + A.VAI_TRO[p.vaiTro]);
          nv.vaiTro = p.vaiTro;
          nv.phien = (nv.phien || 1) + 1;
        }
        if (p.biKhoa !== undefined && !!p.biKhoa !== !!nv.biKhoa) {
          if (laMinh) return json(400, { error: 'Không tự khoá tài khoản của chính mình.' });
          nv.biKhoa = !!p.biKhoa;
          nv.phien = (nv.phien || 1) + 1;
          doi.push(nv.biKhoa ? 'khoá tài khoản' : 'mở khoá tài khoản');
        }
      }
      await A.luuNv(nv);
      if (doi.length) await A.ghiNhatKy(nguoi, 'sua-tai-khoan', nv.ten + ': ' + doi.join('; '));
      return json(200, { ok: true, nv: A.congKhai(nv) });
    }

    if (viec === 'khoa-chung') {
      if (toi.khoaChung) return json(400, { error: 'Đăng nhập bằng tài khoản riêng của anh/chị rồi mới tắt khoá chung.' });
      const ch = await A.cauHinh();
      ch.tatKhoaChung = !!p.tat;
      await A.moKho().setJSON('cau-hinh', ch);
      await A.ghiNhatKy(nguoi, 'khoa-chung', ch.tatKhoaChung ? 'Tắt khoá chung' : 'Bật lại khoá chung');
      return json(200, { ok: true, cauHinh: ch });
    }

    return json(400, { error: 'Việc không hợp lệ.' });
  } catch (err) {
    console.error('quan-tri:', err);
    return json(500, { error: 'Hệ thống đang bận, thử lại sau.' });
  }
};
