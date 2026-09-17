/* Kiểm thử tĩnh cho lớp truy vấn Supabase.
   Chạy: node scripts/test_supabase_ctv.mjs

   VÌ SAO LÀ KIỂM THỬ TĨNH, KHÔNG PHẢI GỌI THẬT

   supabase-js nói chuyện với PostgREST chứ không nói thẳng với PostgreSQL, nên
   không dựng lại được trong hộp cát. Phần logic cơ sở dữ liệu — ràng buộc,
   giao dịch, sổ cái không sửa được — đã có supabase/kiem-chung.sql soát trên
   chính Postgres. Tệp này lo phần còn lại, và đó là phần dễ hỏng âm thầm nhất:

   ranh giới dữ liệu cá nhân. Hàm Netlify dùng khoá bí mật nên bỏ qua RLS —
   cơ sở dữ liệu KHÔNG cứu được một câu lệnh viết ẩu. Thứ duy nhất đứng giữa
   hồ sơ khách và bảng điều khiển cộng tác viên là hình dạng của lib/ctv-doc.js.
   Nên chính tệp đó được đem ra soát ở đây.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F_CTV_DOC = path.join(GOC, 'netlify/functions/lib/ctv-doc.js');
const F_SUPA = path.join(GOC, 'netlify/functions/lib/supabase.js');
const F_SCHEMA = path.join(GOC, 'supabase/schema.sql');

let dat = 0, truot = 0;
const kiemTra = (t, dk, ct) => {
  if (dk) { dat++; console.log('  đạt   ' + t); }
  else { truot++; console.log('  TRƯỢT ' + t + (ct ? '  → ' + ct : '')); }
};

const doc = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

/* Bỏ chú thích để soát MÃ THẬT, không soát lời giải thích — nếu không thì
   chính đoạn chú thích nói "không đọc khach_hang" sẽ làm phép thử trượt. */
function boChuThich(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

console.log('\n── Ranh giới dữ liệu cá nhân trong lib/ctv-doc.js ──');
{
  const thoS = doc(F_CTV_DOC);
  kiemTra('tệp lib/ctv-doc.js tồn tại', !!thoS, F_CTV_DOC);
  const s = boChuThich(thoS);

  kiemTra('KHÔNG nhắc tới bảng khach_hang', !/khach_hang/.test(s),
    (s.match(/.{0,40}khach_hang.{0,40}/) || [])[0]);
  kiemTra('KHÔNG đọc thẳng bảng don_hang', !/from\(\s*['"]don_hang/.test(s));
  kiemTra('KHÔNG đọc thẳng bảng xe', !/from\(\s*['"]xe['"]/.test(s));
  kiemTra('KHÔNG dùng select(*) (thêm cột mới sẽ không tự chảy ra ngoài)',
    !/select\(\s*['"]\s*\*/.test(s));

  /* .from() được gọi qua hằng số, nên phải giải hằng ra rồi mới kết luận —
     soát chuỗi trực tiếp sẽ bỏ sót đúng cách viết mà tệp này đang dùng. */
  const hang = {};
  for (const m of s.matchAll(/const\s+([A-Z_0-9]+)\s*=\s*['"]([^'"]+)['"]/g)) {
    hang[m[1]] = m[2];
  }
  const nguon = [...s.matchAll(/\.from\(\s*([A-Za-z_$][\w$]*|['"][^'"]+['"])\s*\)/g)]
    .map((m) => {
      const v = m[1];
      return /^['"]/.test(v) ? v.slice(1, -1) : (hang[v] || ('?' + v));
    });
  kiemTra('mọi truy vấn đều đọc khung nhìn (tên bắt đầu bằng v_)',
    nguon.length > 0 && nguon.every((n) => n.startsWith('v_')), nguon.join(', '));

  const cam = ['ho_ten', 'sdt', 'email', 'cccd', 'dia_chi'];
  const cotDon = (thoS.match(/const COT_DON = \[([\s\S]*?)\]/) || [])[1] || '';
  kiemTra('danh sách cột đơn không chứa trường cá nhân nào',
    !cam.some((c) => new RegExp("'" + c + "'").test(cotDon)),
    cam.filter((c) => new RegExp("'" + c + "'").test(cotDon)).join(', '));
}

console.log('\n── Khung nhìn trong schema.sql giữ đúng lời hứa ──');
{
  const s = doc(F_SCHEMA);
  kiemTra('schema.sql tồn tại', !!s, F_SCHEMA);

  const kn = (s.match(/create or replace view v_don_cua_ctv as([\s\S]*?);/) || [])[1] || '';
  kiemTra('v_don_cua_ctv KHÔNG nối tới khach_hang', kn.length > 0 && !/khach_hang/.test(kn));
  kiemTra('v_don_cua_ctv có cột biển số và tổng phí',
    /bien_so/.test(kn) && /tong_phi/.test(kn));

  kiemTra('sổ cái có trigger chặn sửa/xoá',
    /create trigger so_cai_khong_sua[\s\S]*?before update or delete on so_cai_hoa_hong/.test(s));
  kiemTra('một đơn chỉ sinh hoa hồng một lần (chỉ mục duy nhất có điều kiện)',
    /unique index[\s\S]*?so_cai_hoa_hong \(don_hang_id\) where loai = 'tich_luy'/.test(s));
  kiemTra('dòng sao kê có ràng buộc duy nhất theo số tham chiếu',
    /so_tham_chieu\s+text not null unique/.test(s));
  kiemTra('RLS bật trên bảng khach_hang',
    /alter table khach_hang\s+enable row level security/.test(s));
  kiemTra('KHÔNG khai chính sách RLS nào (chặn mặc định với khoá công khai)',
    !/create policy/i.test(s));
  kiemTra('tỷ lệ hoa hồng có cột hiệu lực theo ngày', /hieu_luc_tu\s+date not null/.test(s));
  kiemTra('chưa cài sẵn tỷ lệ nào (buộc phải chốt trước khi chạy thật)',
    !/^\s*insert into ty_le_hoa_hong/mi.test(s));
}

console.log('\n── Khoá bí mật không rò ra ──');
{
  const s = doc(F_SUPA);
  kiemTra('supabase.js đọc khoá từ biến môi trường', /process\.env\.SUPABASE_SECRET_KEY/.test(s));
  kiemTra('không có khoá nào ghi cứng trong mã',
    !/sb_secret_[A-Za-z0-9]/.test(s) && !/eyJ[A-Za-z0-9_-]{20,}/.test(s));
  kiemTra('báo thiếu biến bằng đúng tên biến, không báo chung chung',
    /Thiếu biến môi trường SUPABASE_URL/.test(s) &&
    /Thiếu biến môi trường SUPABASE_SECRET_KEY/.test(s));

  /* Khoá bí mật lọt vào thư mục deploy là lộ toàn bộ hồ sơ khách. Soát cả
     site, không chỉ soát hai tệp vừa viết. */
  const reKhoa = /sb_secret_[A-Za-z0-9]{10,}/;
  const dinh = [];
  const quet = (thuMuc, sau) => {
    if (sau > 3 || !fs.existsSync(thuMuc)) return;
    for (const t of fs.readdirSync(thuMuc, { withFileTypes: true })) {
      if (t.name === 'node_modules' || t.name === '.git' || t.name === 'sao-luu') continue;
      const p = path.join(thuMuc, t.name);
      if (t.isDirectory()) quet(p, sau + 1);
      else if (/\.(html|js|mjs|css|json|txt)$/.test(t.name)) {
        if (reKhoa.test(fs.readFileSync(p, 'utf8'))) dinh.push(path.relative(GOC, p));
      }
    }
  };
  quet(GOC, 0);
  kiemTra('không tệp nào trong site chứa khoá bí mật Supabase',
    dinh.length === 0, dinh.slice(0, 5).join(', '));
}

console.log('\n' + (truot === 0 ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI') + ' — ' + dat + ' đạt, ' + truot + ' trượt\n');
process.exit(truot === 0 ? 0 : 1);
