/* DBV247 — Kho file PDF bảo hiểm của khách trong Zalo Mini App
   ---------------------------------------------------------------------------
   GET  /.netlify/functions/zalo-mini-tep?ve=<vé xem>   → trả nội dung file
   POST /.netlify/functions/zalo-mini-tep?ve=<vé lên>   → nhận file từ
        openMediaPicker({ type:'file', serverUploadUrl }) (multipart/form-data)

   Vé do zalo-mini.js ký (HMAC, hạn ngắn), gắn với đúng Zalo ID đã xác minh.
   openDocument, downloadFile và openMediaPicker chỉ nhận URL — không gắn được
   header — nên quyền phải nằm trong URL.

   Chỉ nhận PDF, JPG, PNG, tối đa 5 MB (giới hạn thân request của Netlify
   Functions là 6 MB sau khi mã hoá).
*/

'use strict';

const C = require('./lib/zalo-mini-chung');

const TOI_DA = 5 * 1024 * 1024;
const TOI_DA_MOI_KHACH = 30;

function loaiTep(buf) {
  if (buf.length > 4 && buf.slice(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', duoi: 'pdf' };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', duoi: 'jpg' };
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', duoi: 'png' };
  return null;
}

/* Tách phần file đầu tiên trong multipart/form-data. Không phụ thuộc tên
   trường — tài liệu Zalo không nói rõ openMediaPicker đặt tên trường là gì. */
function tachMultipart(than, kieu) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(kieu || '');
  if (!m) return null;
  const ranh = Buffer.from('--' + (m[1] || m[2]).trim());
  let i = than.indexOf(ranh);
  while (i >= 0) {
    const dauHeader = i + ranh.length + 2; // bỏ CRLF
    const cuoiHeader = than.indexOf(Buffer.from('\r\n\r\n'), dauHeader);
    if (cuoiHeader < 0) return null;
    const header = than.slice(dauHeader, cuoiHeader).toString('utf8');
    const ke = than.indexOf(ranh, cuoiHeader + 4);
    if (ke < 0) return null;
    if (/filename="/i.test(header)) {
      const ten = (/filename="([^"]*)"/i.exec(header) || [])[1] || 'tai-lieu';
      return { ten, noiDung: than.slice(cuoiHeader + 4, ke - 2) }; // bỏ CRLF trước ranh giới
    }
    i = ke;
  }
  return null;
}

function tenSach(ten, duoi) {
  let s = String(ten || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f"<>|*?:]/g, '').trim();
  if (!s) s = 'tai-lieu';
  if (!new RegExp('\\.' + duoi + '$', 'i').test(s)) s = s.replace(/\.[a-z0-9]{1,5}$/i, '') + '.' + duoi;
  return s.slice(0, 120);
}

async function nhanFile(event, ve) {
  const kieu = event.headers['content-type'] || event.headers['Content-Type'] || '';
  const than = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'binary');
  const phan = tachMultipart(than, kieu);
  if (!phan || !phan.noiDung.length) return C.json(400, { ok: false, error: 'Không đọc được file gửi lên.' });
  if (phan.noiDung.length > TOI_DA) return C.json(413, { ok: false, error: 'File quá 5 MB.' });
  const loai = loaiTep(phan.noiDung);
  if (!loai) return C.json(415, { ok: false, error: 'Chỉ nhận file PDF, JPG hoặc PNG.' });

  const kho = C.moKho();
  const { blobs } = await kho.list({ prefix: 'kh/' + ve.z + '/tep/' });
  if (blobs.length >= TOI_DA_MOI_KHACH) {
    return C.json(400, { ok: false, error: 'Đã lưu tối đa ' + TOI_DA_MOI_KHACH + ' file. Xoá bớt file cũ giúp mình.' });
  }

  const maTep = C.ngauNhien(12);
  const ten = tenSach(phan.ten, loai.duoi);
  await kho.set('tep/' + maTep, phan.noiDung, { metadata: { mime: loai.mime, ten } });
  await kho.setJSON('kh/' + ve.z + '/tep/' + maTep, {
    maTep, ten, kich: phan.noiDung.length, mime: loai.mime, luc: new Date().toISOString(), nguon: 'khach',
  });
  return C.json(200, { ok: true, error: 0, maTep, ten });
}

async function guiFile(ve) {
  const kho = C.moKho();
  /* Vé phải khớp cả mã file lẫn chủ file: file phải nằm trong danh mục của
     đúng Zalo ID ghi trong vé. */
  const tt = await kho.get('kh/' + ve.z + '/tep/' + ve.t, { type: 'json' });
  if (!tt) return { statusCode: 404, headers: C.CORS, body: 'Không tìm thấy file.' };
  const r = await kho.getWithMetadata('tep/' + ve.t, { type: 'arrayBuffer' });
  if (!r || !r.data) return { statusCode: 404, headers: C.CORS, body: 'Không tìm thấy file.' };
  const mime = (r.metadata && r.metadata.mime) || tt.mime || 'application/pdf';
  const ten = (r.metadata && r.metadata.ten) || tt.ten || 'tai-lieu.pdf';
  return {
    statusCode: 200,
    headers: Object.assign({}, C.CORS, {
      'Content-Type': mime,
      'Content-Disposition': "inline; filename*=UTF-8''" + encodeURIComponent(ten),
      'Cache-Control': 'private, no-store',
    }),
    body: Buffer.from(r.data).toString('base64'),
    isBase64Encoded: true,
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: C.CORS, body: '' };
  const ve = C.giaiVe((event.queryStringParameters || {}).ve);
  if (!ve || !ve.z) return C.json(403, { ok: false, error: 'Link đã hết hạn. Anh/chị mở lại mục Đơn của tôi.' });
  try {
    if (event.httpMethod === 'GET' && ve.k === 'xem' && ve.t) return await guiFile(ve);
    if (event.httpMethod === 'POST' && ve.k === 'len') return await nhanFile(event, ve);
    return C.json(405, { ok: false, error: 'Không hỗ trợ.' });
  } catch (err) {
    console.error('zalo-mini-tep:', err);
    return C.json(500, { ok: false, error: 'Hệ thống đang bận, anh/chị thử lại sau.' });
  }
};

module.exports._tachMultipart = tachMultipart;
module.exports._loaiTep = loaiTep;
