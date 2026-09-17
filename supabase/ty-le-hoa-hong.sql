-- ===========================================================================
-- DBV247 — Khai tỷ lệ hoa hồng cộng tác viên
-- Chạy MỘT LẦN sau schema.sql, TRƯỚC khi xác nhận đơn đầu tiên.
-- Supabase → SQL Editor → dán tệp này → Run.
--
-- Chốt 15/09/2026: 40% cho CẢ ô tô và xe máy.
--
-- CĂN CỨ TÍNH: PHÍ GỐC, KHÔNG GỒM VAT.
-- VAT là tiền thu hộ nộp nhà nước, không phải doanh thu của DBV, nên không
-- chia hoa hồng trên phần đó. Hàm xac_nhan_thanh_toan() nhân với phi_goc.
--
--   Ô tô dưới 6 chỗ   40% × 437.000 = 174.800đ
--   Ô tô 6–11 chỗ     40% × 794.000 = 317.600đ
--   Xe máy 50cc trở lên 40% × 60.000 =  24.000đ
--   Xe máy dưới 50cc   40% × 55.000 =  22.000đ
--
-- VÌ SAO HIỆU LỰC TỪ 01/09/2026 CHỨ KHÔNG PHẢI HÔM NAY:
-- Hàm tra tỷ lệ theo NGÀY TẠO ĐƠN. Khi chuyển dữ liệu đơn cũ từ Netlify Forms
-- sang, những đơn đó mang ngày tạo từ giữa tháng 9 — nếu tỷ lệ chỉ có hiệu lực
-- từ hôm nay thì chúng sẽ không tìm thấy tỷ lệ nào và việc xác nhận thanh toán
-- sẽ báo lỗi. Đặt mốc trước ngày đơn đầu tiên là xử lý xong chuyện đó, mà
-- không ảnh hưởng gì tới đơn mới.
-- ===========================================================================

insert into ty_le_hoa_hong (nhom_xe, ty_le, hieu_luc_tu, ghi_chu, nguoi_tao)
values
  ('oto',  0.4000, '2026-09-01', 'Mức khởi điểm — tính trên phí gốc, không gồm VAT', 'hoang'),
  ('moto', 0.4000, '2026-09-01', 'Mức khởi điểm — tính trên phí gốc, không gồm VAT', 'hoang')
on conflict (nhom_xe, hieu_luc_tu) do nothing;

-- Xem lại những gì vừa khai
select nhom_xe,
       (ty_le * 100)::numeric(5,2) || '%' as ty_le,
       hieu_luc_tu,
       ghi_chu
  from ty_le_hoa_hong
 order by nhom_xe, hieu_luc_tu;

-- ===========================================================================
-- ĐỔI TỶ LỆ SAU NÀY: THÊM DÒNG MỚI, KHÔNG SỬA DÒNG CŨ
-- ===========================================================================
-- Sửa dòng cũ là viết lại lịch sử: đơn đã chốt hoa hồng theo mức cũ sẽ không
-- còn giải thích được nữa. Thêm dòng mới với ngày hiệu lực mới thì đơn cũ giữ
-- nguyên mức đã ghi vào bút toán.
--
--   insert into ty_le_hoa_hong (nhom_xe, ty_le, hieu_luc_tu, ghi_chu, nguoi_tao)
--   values ('moto', 0.3500, '2026-12-01', 'Giảm từ 40% xuống 35%', 'hoang');
--
-- Đơn tạo ngày 30/11 vẫn hưởng 40%. Đơn tạo ngày 01/12 hưởng 35%.
