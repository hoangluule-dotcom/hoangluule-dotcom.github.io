/* DBV247 — MỌI truy vấn phục vụ cộng tác viên nằm ở đây, không chỗ nào khác
   ===========================================================================
   VÌ SAO CÓ TỆP RIÊNG NÀY

   Hàm Netlify kết nối Supabase bằng khoá bí mật, mà khoá bí mật bỏ qua RLS.
   Nghĩa là cơ sở dữ liệu KHÔNG tự chặn được việc một câu lệnh viết ẩu đọc ra
   họ tên, số điện thoại, CCCD hay địa chỉ khách rồi gửi xuống bảng điều khiển
   của cộng tác viên.

   Nên bảo đảm được dựng bằng hình dạng của mã, không bằng trí nhớ:

     1. Tệp này CHỈ đọc hai khung nhìn: v_don_cua_ctv và v_ctv_tong_hop.
        Hai khung nhìn đó KHÔNG hề nối tới bảng khach_hang — chúng không có
        cột nào mang dữ liệu cá nhân, nên không có gì để rò.
     2. Tệp này KHÔNG BAO GIỜ nhắc tới khach_hang, và không đọc thẳng
        don_hang hay xe.
     3. scripts/test_supabase_ctv.mjs đọc chính mã nguồn tệp này và bắt trượt
        nếu quy tắc 1–2 bị phá. Kỷ luật được máy soát, không phải người nhớ.

   Muốn thêm một trường cho cộng tác viên xem: sửa KHUNG NHÌN trong schema.sql
   trước, rồi mới đọc ở đây. Đừng đi vòng qua bảng gốc — đường vòng đó chính là
   chỗ dữ liệu cá nhân rò ra.
*/

'use strict';

const { moKetNoi } = require('./supabase');

const KN_DON = 'v_don_cua_ctv';
const KN_TONG_HOP = 'v_ctv_tong_hop';

/* Các cột được phép gửi về trình duyệt của cộng tác viên.
   Liệt kê tường minh, KHÔNG dùng '*': thêm cột mới vào khung nhìn sau này thì
   nó không tự động chảy ra ngoài. */
const COT_DON = [
  'ma_don', 'thoi_diem_tao', 'thoi_diem_nhan_tien', 'bien_so',
  'loai_xe', 'chi_tiet_xe', 'thoi_han_nam', 'tong_phi',
  'trang_thai', 'nguon_ghi_nhan',
].join(', ');

const COT_TONG_HOP = [
  'ma_ctv', 'luot_bam_90n', 'so_don', 'so_don_da_nhan_tien',
  'doanh_thu', 'doanh_thu_cho',
  'hoa_hong_tich_luy', 'hoa_hong_da_chi', 'hoa_hong_kha_dung',
].join(', ');

/* Đơn của đúng một cộng tác viên. */
async function donCuaCtv(maCtv, gioiHan) {
  const { data, error } = await moKetNoi()
    .from(KN_DON)
    .select(COT_DON)
    .eq('ma_ctv', maCtv)
    .order('thoi_diem_tao', { ascending: false })
    .limit(gioiHan || 200);
  if (error) throw new Error('Đọc đơn của cộng tác viên: ' + error.message);
  return data || [];
}

/* Chỉ số tổng hợp của đúng một cộng tác viên.
   Mọi con số ở đây là kết quả CỘNG trong khung nhìn — bảng điều khiển chỉ
   hiển thị, không nhân tỷ lệ, không tự tính lại. */
async function tongHopCtv(maCtv) {
  const { data, error } = await moKetNoi()
    .from(KN_TONG_HOP)
    .select(COT_TONG_HOP)
    .eq('ma_ctv', maCtv)
    .maybeSingle();
  if (error) throw new Error('Đọc chỉ số cộng tác viên: ' + error.message);
  return data || null;
}

/* Danh sách cho màn hình quản trị. Vẫn là khung nhìn tổng hợp, không phải
   bảng gốc — quản trị cần số liệu kinh doanh, không cần dữ liệu cá nhân khách
   (thông tin khách xem ở CRM). */
async function toanBoCtv() {
  const { data, error } = await moKetNoi()
    .from(KN_TONG_HOP)
    .select('id, ' + COT_TONG_HOP + ', ho_ten, sdt, trang_thai, ngay_tao')
    .order('doanh_thu', { ascending: false });
  if (error) throw new Error('Đọc danh sách cộng tác viên: ' + error.message);
  return data || [];
}

module.exports = { donCuaCtv, tongHopCtv, toanBoCtv, KN_DON, KN_TONG_HOP };
