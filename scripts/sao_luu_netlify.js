/* DBV247 — Sao lưu dữ liệu đang nằm ở Netlify
   ===========================================================================
   Chạy:  node scripts/sao_luu_netlify.js
   Biến môi trường:
     NETLIFY_ACCESS_TOKEN   (bắt buộc)  Personal Access Token của Netlify
     SITE_ID                (tuỳ chọn)  mặc định là site dbv247
     THU_MUC_RA             (tuỳ chọn)  mặc định "sao-luu"
     MOC_CU                 (tuỳ chọn)  đường dẫn moc.json của lần chạy trước

   VÌ SAO CÓ TỆP NÀY
   Toàn bộ đơn hàng và lead nằm ở Netlify Forms; hồ sơ cộng tác viên và trạng
   thái chăm sóc khách nằm ở Netlify Blobs. Không có bản sao nào ở nơi khác.
   Mất tài khoản, xoá nhầm site, hoặc đơn giản là muốn đổi nhà cung cấp — cả ba
   tình huống đều bắt đầu bằng cùng một câu hỏi: dữ liệu đâu?

   ⚠ BẢN SAO NÀY CHỨA DỮ LIỆU CÁ NHÂN CỦA KHÁCH (họ tên, số điện thoại, CCCD,
   địa chỉ). Nó KHÔNG được nằm trong thư mục deploy và KHÔNG được commit vào
   repo website — Netlify đưa mọi tệp trong thư mục đó lên internet. Thư mục
   "sao-luu" đã được ghi vào .gitignore, và netlify.toml chặn /sao-luu/* trả
   404 làm lớp dự phòng. Giữ nguyên cả hai lớp đó.

   PHÁT HIỆN MẤT DỮ LIỆU
   Nếu có MOC_CU, script so số bản ghi với lần chạy trước. Số bản ghi giảm là
   bất thường — đơn không tự biến mất — nên script thoát mã 2 để việc chạy tự
   động báo đỏ thay vì âm thầm ghi đè bản sao tốt bằng bản sao thiếu.
*/

'use strict';

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.NETLIFY_ACCESS_TOKEN || '';
const SITE_ID = process.env.SITE_ID || 'df7ffacd-8e52-4769-b95b-23c978b36e29';
const THU_MUC_RA = process.env.THU_MUC_RA || 'sao-luu';
const MOC_CU = process.env.MOC_CU || '';

/* Chỉ sao lưu kho DỮ LIỆU KINH DOANH. Ba kho còn lại (dbv247-chat,
   dbv247-gia-xe, dbv247-gia-xe-cong-khai) là cache — mất thì tự dựng lại,
   sao lưu chúng chỉ làm bản sao phình to mà không mua thêm sự an tâm nào. */
const KHO_CAN_LUU = ['dbv247-ctv', 'dbv247-leads'];

const MOI_TRANG = 100;      // API Netlify chặn per_page ở 100
const TRANG_TOI_DA = 500;   // trần cứng: 50.000 bản ghi mỗi form

const H = { Authorization: 'Bearer ' + TOKEN };

function log(s) { process.stdout.write(s + '\n'); }

function ngayHomNay() {
  /* Giờ Việt Nam, để tên thư mục khớp với ngày người ta nghĩ tới */
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function ghi(duongDan, duLieu) {
  fs.mkdirSync(path.dirname(duongDan), { recursive: true });
  fs.writeFileSync(duongDan, JSON.stringify(duLieu, null, 2), 'utf8');
}

async function xin(url) {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(url.replace(TOKEN, '***') + ' → HTTP ' + r.status);
  return r.json();
}

/* ── Netlify Forms ───────────────────────────────────────────────────────── */

async function docHetBanGhi(formId) {
  const ra = [];
  for (let trang = 1; trang <= TRANG_TOI_DA; trang++) {
    const lo = await xin(
      'https://api.netlify.com/api/v1/forms/' + formId +
      '/submissions?per_page=' + MOI_TRANG + '&page=' + trang
    );
    if (!Array.isArray(lo) || lo.length === 0) break;
    for (const x of lo) ra.push(x);
    if (lo.length < MOI_TRANG) break;
    if (trang === TRANG_TOI_DA) {
      throw new Error('Form ' + formId + ' vượt ' + (TRANG_TOI_DA * MOI_TRANG) +
        ' bản ghi — nâng TRANG_TOI_DA, đừng để bản sao bị cắt cụt.');
    }
  }
  return ra;
}

async function saoLuuForm(goc) {
  const forms = await xin('https://api.netlify.com/api/v1/sites/' + SITE_ID + '/forms');
  const dem = {};
  for (const f of forms) {
    const subs = await docHetBanGhi(f.id);
    dem[f.name] = subs.length;
    ghi(path.join(goc, 'forms', f.name + '.json'), {
      form: { id: f.id, name: f.name, created_at: f.created_at },
      so_ban_ghi: subs.length,
      ban_ghi: subs,
    });
    log('  form  ' + f.name.padEnd(22) + subs.length + ' bản ghi');
  }
  return dem;
}

/* ── Netlify Blobs ───────────────────────────────────────────────────────── */

async function saoLuuBlobs(goc) {
  let getStore;
  try {
    ({ getStore } = require('@netlify/blobs'));
  } catch (err) {
    log('  ! Không nạp được @netlify/blobs — bỏ qua phần Blobs. Chạy "npm install" trước.');
    return {};
  }

  const dem = {};
  for (const ten of KHO_CAN_LUU) {
    try {
      const kho = getStore({ name: ten, siteID: SITE_ID, token: TOKEN, consistency: 'strong' });
      const ds = await kho.list();
      const khoa = (ds && ds.blobs ? ds.blobs : []).map((b) => b.key);
      const noiDung = {};
      for (const k of khoa) {
        noiDung[k] = await kho.get(k, { type: 'json' }).catch(async () =>
          kho.get(k).catch(() => null)   // khoá nào không phải JSON thì lấy thô
        );
      }
      dem[ten] = khoa.length;
      ghi(path.join(goc, 'blobs', ten + '.json'), { kho: ten, so_khoa: khoa.length, du_lieu: noiDung });
      log('  blob  ' + ten.padEnd(22) + khoa.length + ' khoá');
    } catch (err) {
      /* Một kho hỏng không được làm hỏng cả bản sao — ghi nhận rồi đi tiếp,
         nhưng vẫn báo lỗi ở cuối để việc chạy tự động không báo xanh. */
      dem[ten] = null;
      log('  ! Lỗi đọc kho ' + ten + ': ' + String(err.message || err));
    }
  }
  return dem;
}

/* ── So với lần trước ────────────────────────────────────────────────────── */

function soVoiLanTruoc(mocMoi) {
  if (!MOC_CU || !fs.existsSync(MOC_CU)) {
    log('\nChưa có mốc của lần trước — lần chạy đầu, không có gì để so.');
    return [];
  }
  let cu;
  try { cu = JSON.parse(fs.readFileSync(MOC_CU, 'utf8')); } catch (err) { return []; }
  const tut = [];
  for (const nhom of ['forms', 'blobs']) {
    for (const ten of Object.keys((cu[nhom] || {}))) {
      const a = cu[nhom][ten];
      const b = (mocMoi[nhom] || {})[ten];
      if (typeof a === 'number' && typeof b === 'number' && b < a) {
        tut.push(nhom + '/' + ten + ': ' + a + ' → ' + b);
      }
    }
  }
  return tut;
}

/* ── Chạy ────────────────────────────────────────────────────────────────── */

(async function () {
  if (!TOKEN) {
    log('THIẾU NETLIFY_ACCESS_TOKEN. Không có token thì không đọc được gì.');
    process.exit(1);
  }

  const ngay = ngayHomNay();
  const goc = path.join(THU_MUC_RA, ngay);
  log('Sao lưu dữ liệu Netlify → ' + goc + '\n');

  let loi = null;
  let forms = {}, blobs = {};
  try {
    forms = await saoLuuForm(goc);
  } catch (err) {
    loi = 'Forms: ' + String(err.message || err);
    log('  ! ' + loi);
  }
  blobs = await saoLuuBlobs(goc);
  if (Object.values(blobs).some((v) => v === null)) {
    loi = (loi ? loi + ' | ' : '') + 'có kho Blobs không đọc được';
  }

  const moc = {
    thoi_diem: new Date().toISOString(),
    ngay,
    site_id: SITE_ID,
    forms,
    blobs,
    tong_ban_ghi: Object.values(forms).reduce((a, b) => a + (b || 0), 0),
  };
  ghi(path.join(goc, 'moc.json'), moc);
  ghi(path.join(THU_MUC_RA, 'moc.json'), moc);   // mốc mới nhất, để lần sau so

  log('\nTổng: ' + moc.tong_ban_ghi + ' bản ghi form, ' +
      Object.values(blobs).reduce((a, b) => a + (b || 0), 0) + ' khoá blob.');

  const tut = soVoiLanTruoc(moc);
  if (tut.length) {
    log('\n⚠ SỐ BẢN GHI GIẢM SO VỚI LẦN TRƯỚC:');
    tut.forEach((d) => log('   ' + d));
    log('Dữ liệu không tự biến mất. Kiểm tra trước khi tin bản sao này.');
    process.exit(2);
  }

  if (loi) {
    log('\nBản sao KHÔNG đầy đủ: ' + loi);
    process.exit(1);
  }
  log('\nXong.');
  /* Thoát dứt khoát: fetch của Node giữ kết nối sống lại một lúc, để tự nhiên
     thì tiến trình treo thêm vài chục giây trong CI mà không làm gì cả. */
  process.exit(0);
})().catch((err) => {
  log('\nLỗi không lường trước: ' + String(err && err.stack || err));
  process.exit(1);
});
