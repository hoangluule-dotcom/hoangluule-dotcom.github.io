/* DBV247 — Kết nối Supabase dùng chung cho mọi hàm Netlify
   ---------------------------------------------------------------------------
   Hai biến môi trường, khai trên Netlify → Site settings → Environment variables:

     SUPABASE_URL          https://<mã-project>.supabase.co
     SUPABASE_SECRET_KEY   khoá bí mật (sb_secret_… — bản cũ gọi là service_role)

   ⚠ KHOÁ BÍ MẬT BỎ QUA TOÀN BỘ RLS.
   Nó chỉ được tồn tại trong biến môi trường của Netlify. Không bao giờ trong
   HTML, trong tệp .js gửi xuống trình duyệt, trong repo, trong ảnh chụp màn
   hình gửi qua chat. Lộ khoá này là lộ toàn bộ hồ sơ khách hàng — họ tên, số
   điện thoại, CCCD, địa chỉ. Đó là sự cố phải báo cáo theo NĐ 13/2023, không
   phải một lỗi sửa lại là xong.

   Hàm nào cần đọc dữ liệu cho CỘNG TÁC VIÊN thì KHÔNG dùng trực tiếp tệp này —
   dùng lib/ctv-doc.js. Xem lời giải thích trong tệp đó.
*/

'use strict';

const { createClient } = require('@supabase/supabase-js');

let khach = null;

function moKetNoi() {
  if (khach) return khach;

  const url = process.env.SUPABASE_URL;
  const khoa = process.env.SUPABASE_SECRET_KEY;

  /* Báo thiếu biến bằng tên biến. Thông báo "lỗi kết nối" chung chung làm mất
     nửa buổi dò, mà nguyên nhân chỉ là quên dán một dòng vào Netlify. */
  if (!url) throw new Error('Thiếu biến môi trường SUPABASE_URL trên Netlify.');
  if (!khoa) throw new Error('Thiếu biến môi trường SUPABASE_SECRET_KEY trên Netlify.');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
    throw new Error('SUPABASE_URL sai định dạng — phải là https://<mã-project>.supabase.co');
  }

  khach = createClient(url, khoa, {
    /* Hàm serverless không có phiên đăng nhập và không sống lâu để làm mới
       token. Tắt cả hai, nếu không thư viện giữ trạng thái vô ích giữa các
       lượt gọi trên cùng một container. */
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-dbv-nguon': 'netlify-functions' } },
  });
  return khach;
}

/* Gọi hàm trong cơ sở dữ liệu (xac_nhan_thanh_toan, thu_hoi_hoa_hong).
   Mọi thao tác chạm tiền đi qua đây chứ không phải qua nhiều lệnh update rời
   rạc — một giao dịch trọn vẹn, cùng thành công hoặc cùng không. */
async function goiHam(ten, thamSo) {
  const { data, error } = await moKetNoi().rpc(ten, thamSo);
  if (error) throw new Error(ten + ': ' + error.message);
  return data;
}

module.exports = { moKetNoi, goiHam };
