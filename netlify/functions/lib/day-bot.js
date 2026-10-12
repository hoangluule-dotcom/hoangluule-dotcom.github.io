/* DBV247 — "Dạy bot ngay trong Zalo"
   ===========================================================================
   Quản trị viên nhắn cho bot (trong nhóm hoặc chat riêng):
     học: <câu hỏi> | <câu trả lời>     → bot ghi nhớ (trùng câu hỏi thì cập nhật)
     đã học                              → xem danh sách kèm số thứ tự
     quên: [số thứ tự], vd quên: 3                          → xoá một mục
     tôi là ai                           → ai cũng dùng được, trả về ID Zalo của mình

   Hai kho tách biệt (Netlify Blobs "dbv247-day-bot"):
     'nghiep-vu' — dạy qua Bot DBV247 → dùng cho chatbot web + 2 bot Zalo
     'giai-tri'  — dạy qua Bot em gái DBV → chỉ bot giải trí dùng
   (chuyện quán ăn trong nhóm không lọt sang chatbot trả lời khách hàng)

   Chỉ ID trong biến môi trường mới được dạy:
     ZALO_ADMIN_ID     cho Bot DBV247        (nhiều người: cách nhau dấu phẩy)
     ZALO_GT_ADMIN_ID  cho Bot em gái DBV
   ID Zalo của một người KHÁC NHAU giữa 2 bot — lấy bằng lệnh "tôi là ai" ở từng bot.

   Những gì dạy ở đây được ƯU TIÊN hơn kien-thuc/hoi-dap.md và nội dung trang web.
*/
'use strict';

const { getStore } = require('@netlify/blobs');
const SITE_ID = 'df7ffacd-8e52-4769-b95b-23c978b36e29';
const STORE = 'dbv247-day-bot';
const TOI_DA = 300;

function kho() {
  try { return getStore({ name: STORE, consistency: 'strong' }); }
  catch (e) {
    if (!process.env.NETLIFY_ACCESS_TOKEN) return null;
    try { return getStore({ name: STORE, siteID: process.env.SITE_ID || SITE_ID, token: process.env.NETLIFY_ACCESS_TOKEN, consistency: 'strong' }); }
    catch (e2) { return null; }
  }
}
const boDau = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const tu = (s) => boDau(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 2);

async function doc(ten) {
  const k = kho(); if (!k) return [];
  try { return (await k.get(ten, { type: 'json' })) || []; } catch (e) { return []; }
}
async function ghi(ten, ds) {
  const k = kho(); if (!k) throw new Error('Không mở được kho lưu (Netlify Blobs).');
  await k.setJSON(ten, ds);
}

/* Chọn các mục khớp câu hỏi nhất để đưa vào prompt */
async function timDaDay(ten, cau, toiDa) {
  const ds = await doc(ten);
  if (!ds.length) return [];
  if (ds.length <= (toiDa || 8)) return ds;
  const q = new Set(tu(cau));
  return ds.map((m) => {
    const w = tu(m.q + ' ' + m.q + ' ' + m.a);
    let d = 0; w.forEach((x) => { if (q.has(x)) d++; });
    return { m, d };
  }).filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, toiDa || 8).map((x) => x.m);
}

/* Đoạn chèn vào prompt */
function khoiPrompt(ds) {
  if (!ds.length) return '';
  return '\n\n== HỎI ĐÁP DO QUẢN TRỊ VIÊN DẠY (ưu tiên cao nhất, đúng hơn mọi tư liệu khác) ==\n' +
    ds.map((m) => 'Hỏi: ' + m.q + '\nĐáp: ' + m.a).join('\n\n');
}

const laAdmin = (bienEnv, idNguoi) =>
  !!idNguoi && String(process.env[bienEnv] || '').split(',').map((s) => s.trim()).filter(Boolean).includes(idNguoi);

/* Xử lý lệnh dạy. Trả về câu trả lời (chuỗi) nếu là lệnh, null nếu không phải. */
async function xuLyLenh(cau, { ten, bienAdmin, idNguoi, tenNguoi }) {
  const c = String(cau || '').trim();
  const kd = boDau(c);

  if (/^(toi la ai|id toi|my ?id)\s*\??$/.test(kd)) {
    return 'ID Zalo của ' + (tenNguoi || 'anh/chị') + ' với bot này:\n' + (idNguoi || '(không đọc được)') +
      '\n\nMuốn dạy bot: khai ID này vào biến ' + bienAdmin + ' trên Netlify rồi Trigger deploy.';
  }

  const laHoc = /^(hoc|day)\s*:/.test(kd);
  const laQuen = /^(quen|xoa)\s*:/.test(kd);
  const laXem = /^(da hoc|danh sach hoc|ds hoc)\s*$/.test(kd);
  const laLuu = /^luu(\s+[\d,\s]+)?\s*$/.test(kd);       // lưu  |  lưu 1,3,5
  const laHuy = /^huy\s*$/.test(kd);
  if (!laHoc && !laQuen && !laXem && !laLuu && !laHuy) return null;

  if (!laAdmin(bienAdmin, idNguoi)) {
    return 'Chỉ quản trị viên mới dạy được bot ạ. (Nhắn "tôi là ai" để lấy ID, rồi nhờ quản trị khai vào ' + bienAdmin + '.)';
  }

  /* ── Học từ tài liệu (link): bước duyệt "lưu" / "huỷ" ── */
  const khoaCho = 'cho-luu/' + ten + '/' + idNguoi;
  if (laHuy) {
    const k = kho(); if (k) await k.delete(khoaCho).catch(() => {});
    return 'Đã huỷ, không lưu gì từ tài liệu vừa rồi.';
  }
  if (laLuu) {
    const k = kho();
    const cho = k ? await k.get(khoaCho, { type: 'json' }).catch(() => null) : null;
    if (!cho || !cho.muc || !cho.muc.length) return 'Không có tài liệu nào đang chờ lưu. Gửi: học: [link tài liệu]';
    const chon = (c.match(/\d+/g) || []).map(Number);
    const lay = chon.length ? cho.muc.filter((m, i) => chon.includes(i + 1)) : cho.muc;
    if (!lay.length) return 'Số thứ tự không khớp. Gõ "lưu" để lưu hết, hoặc "lưu 1,3" để lưu mục 1 và 3.';
    const ds0 = await doc(ten);
    let id = ds0.reduce((m, x) => Math.max(m, x.id || 0), 0);
    const luc = new Date().toISOString();
    let moi = 0, capNhat = 0;
    for (const m of lay) {
      const cu = ds0.find((x) => boDau(x.q).replace(/[^a-z0-9]/g, '') === boDau(m.q).replace(/[^a-z0-9]/g, ''));
      if (cu) { Object.assign(cu, { a: m.a, nguoi: tenNguoi || '', luc, nguon: cho.nguon }); capNhat++; }
      else if (ds0.length < TOI_DA) { ds0.push({ id: ++id, q: m.q, a: m.a, nguoi: tenNguoi || '', luc, nguon: cho.nguon }); moi++; }
    }
    await ghi(ten, ds0);
    await k.delete(khoaCho).catch(() => {});
    return 'Đã lưu ✓ ' + moi + ' mục mới' + (capNhat ? ', cập nhật ' + capNhat + ' mục' : '') +
      (moi + capNhat < lay.length ? ' (kho đã đầy ' + TOI_DA + ' mục, bỏ bớt phần thừa)' : '') + '. Nhắn "đã học" để xem.';
  }

  /* học: <link>  → chuyển sang hàm nền đọc tài liệu (mất 10–40 giây) */
  if (laHoc && !c.includes('|')) {
    const m = c.match(/https?:\/\/\S+/i) || c.match(/(?:www\.|docs\.google\.com|drive\.google\.com|[a-z0-9-]+\.(?:com|vn|net|org)(?:\.vn)?\/)\S*/i);
    if (m) {
      let url = m[0].replace(/[)\].,;]+$/, '');
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      if (/(^|\.)(facebook\.com|fb\.com|fb\.watch|instagram\.com|tiktok\.com|zalo\.me)\//i.test(url.replace(/^https?:\/\//, '') + '/')) {
        return 'Facebook/Instagram/TikTok/Zalo chặn bot đọc nội dung (phải đăng nhập), nên em không học được từ link này.\n' +
          'Cách thay thế:\n- Copy nội dung bài viết, dạy em bằng: học: câu hỏi | câu trả lời\n' +
          '- Hoặc dán nội dung nhiều bài vào một Google Docs (chia sẻ "Bất kỳ ai có đường liên kết") rồi gửi: học: link Google Docs';
      }
      return { docTaiLieu: url };
    }
  }

  const ds = await doc(ten);

  if (laXem) {
    if (!ds.length) return 'Chưa có gì được dạy. Cú pháp: học: câu hỏi | câu trả lời';
    const cuoi = ds.slice(-25);
    return 'Đã học ' + ds.length + ' mục' + (ds.length > 25 ? ' (hiện 25 mục mới nhất)' : '') + ':\n' +
      cuoi.map((m) => m.id + '. ' + m.q).join('\n') + '\n\nXoá: quên: [số thứ tự], vd quên: 3';
  }

  if (laQuen) {
    const so = parseInt(c.replace(/^[^:]*:/, '').trim(), 10);
    const i = ds.findIndex((m) => m.id === so);
    if (i < 0) return 'Không thấy mục số ' + (so || '?') + '. Nhắn "đã học" để xem số thứ tự.';
    const bo = ds.splice(i, 1)[0];
    await ghi(ten, ds);
    return 'Đã quên mục ' + so + ': ' + bo.q;
  }

  // học: câu hỏi | câu trả lời
  const than = c.replace(/^[^:]*:/, '').trim();
  const cat = than.split('|');
  if (cat.length < 2 || !cat[0].trim() || !cat.slice(1).join('|').trim()) {
    return 'Sai cú pháp. Có 2 cách dạy:\n' +
      '1) học: câu hỏi | câu trả lời\n   vd: học: Phí TNDS xe máy điện bao nhiêu? | 60.500đ/năm đã gồm VAT\n' +
      '2) học: link tài liệu (Google Docs/Sheets/Slides, file PDF trên Google Drive, hoặc trang web)\n   vd: học: https://docs.google.com/document/d/...';
  }
  const q = cat[0].trim().slice(0, 300);
  const a = cat.slice(1).join('|').trim().slice(0, 1500);
  const luc = new Date().toISOString();
  const cu = ds.find((m) => boDau(m.q).replace(/[^a-z0-9]/g, '') === boDau(q).replace(/[^a-z0-9]/g, ''));
  if (cu) {
    Object.assign(cu, { a, nguoi: tenNguoi || '', luc });
    await ghi(ten, ds);
    return 'Đã cập nhật mục ' + cu.id + ' ✓\nHỏi: ' + q + '\nĐáp: ' + a;
  }
  if (ds.length >= TOI_DA) return 'Kho đã đủ ' + TOI_DA + ' mục. Xoá bớt (quên: [số thứ tự], vd quên: 3) hoặc chuyển các mục ổn định vào kien-thuc/hoi-dap.md.';
  const id = ds.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
  ds.push({ id, q, a, nguoi: tenNguoi || '', luc });
  await ghi(ten, ds);
  return 'Đã học mục ' + id + ' ✓\nHỏi: ' + q + '\nĐáp: ' + a;
}

module.exports = { xuLyLenh, timDaDay, khoiPrompt, doc, kho, boDau, TOI_DA };
