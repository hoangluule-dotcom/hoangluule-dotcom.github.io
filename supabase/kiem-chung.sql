-- ===========================================================================
-- DBV247 — Kiểm chứng lược đồ cổng cộng tác viên
-- Chạy sau khi đã chạy schema.sql. Dán vào Supabase → SQL Editor → Run.
--
-- TỆP NÀY KHÔNG ĐỂ LẠI DỮ LIỆU NÀO.
-- Nó tạo dữ liệu thử, kiểm mọi ràng buộc, rồi cố ý ném lỗi ở cuối để
-- PostgreSQL cuộn ngược toàn bộ. Vì vậy:
--
--   ⚠ Supabase sẽ hiện chữ "ERROR" màu đỏ — ĐÓ LÀ CỐ Ý.
--     Bảng kết quả nằm NGAY TRONG nội dung lỗi đó. Đọc nó.
--
-- Chạy được ở BẤT KỲ thời điểm nào: trước hay sau khi khai tỷ lệ hoa hồng,
-- trên cơ sở dữ liệu trống hay đã có đơn thật. Nó tự đọc tỷ lệ đang áp dụng
-- rồi tính theo đó, thay vì giả định bảng tỷ lệ còn trống.
-- ===========================================================================

do $$
declare
  bao_cao   text := '';
  so_dat    int := 0;
  so_truot  int := 0;
  v_ctv     bigint;
  v_kh      bigint;
  v_xe      bigint;
  v_don     bigint;
  v_don0    bigint;
  v_don2    bigint;
  v_don3    bigint;
  v_gd      bigint;
  v_gd0     bigint;
  v_gd2     bigint;
  v_gd3     bigint;
  v_bt      bigint;
  v_so      numeric;
  v_n       int;
  v_txt     text;
  v_ty_le   numeric(5,4);
  v_hh_mong numeric;          -- hoa hồng kỳ vọng, tính từ tỷ lệ đang áp dụng
  v_ngay_cu date;             -- ngày chắc chắn TRƯỚC mọi tỷ lệ đã khai
  v_tu_khai boolean := false; -- có phải tỷ lệ do chính phép thử này tạo ra
begin
  -- ─────────────────────────────────────────────────────────────────────
  -- Dựng dữ liệu nền
  -- ─────────────────────────────────────────────────────────────────────
  insert into ctv (ma_ctv, sdt, ho_ten, mat_khau_bam, muoi)
  values ('ZZ99', '0999999901', 'Cộng Tác Viên Thử', 'bam-gia', 'muoi-gia')
  returning id into v_ctv;

  insert into khach_hang (ho_ten, sdt, cccd, dia_chi)
  values ('Khách Thử', '0912000111', '001200000111', 'Hà Nội')
  returning id into v_kh;

  insert into xe (khach_hang_id, bien_so, loai_xe, nhom_xe, so_cho)
  values (v_kh, '30A-999.99', 'oto', 'nkd', 5)
  returning id into v_xe;

  -- Tỷ lệ ĐANG áp dụng cho ô tô hôm nay. Nếu chưa khai thì tạm khai mức thử
  -- (cũng sẽ bị cuộn ngược như mọi thứ khác trong tệp này).
  select ty_le into v_ty_le
    from ty_le_hoa_hong
   where nhom_xe = 'oto' and hieu_luc_tu <= current_date
   order by hieu_luc_tu desc limit 1;

  if v_ty_le is null then
    insert into ty_le_hoa_hong (nhom_xe, ty_le, hieu_luc_tu, ghi_chu, nguoi_tao)
    values ('oto', 0.4000, current_date - 1, 'mức thử', 'kiem-chung')
    on conflict (nhom_xe, hieu_luc_tu) do nothing;
    v_ty_le := 0.4000;
    v_tu_khai := true;
  end if;

  v_hh_mong := round(437000 * v_ty_le);
  bao_cao := bao_cao || E'\n  (tỷ lệ ô tô đang áp dụng: ' ||
             (v_ty_le * 100)::numeric(5,2) || '%' ||
             case when v_tu_khai then ' — mức thử, bảng tỷ lệ đang trống' else '' end || ')';

  -- Ngày chắc chắn nằm trước mọi tỷ lệ đã khai, để thử ca "chưa có tỷ lệ"
  select coalesce(min(hieu_luc_tu), current_date) - 1 into v_ngay_cu from ty_le_hoa_hong;

  insert into don_hang (ma_don, ctv_id, ma_ctv_ghi_nhan, nguon_ghi_nhan,
                        khach_hang_id, xe_id, loai_xe, chi_tiet_xe,
                        phi_goc, vat, tong_phi, thoi_diem_tao)
  values ('KC-001', v_ctv, 'ZZ99', 'cookie_link', v_kh, v_xe, 'oto',
          'Không KDVT · dưới 6 chỗ', 437000, 43700, 480700, now())
  returning id into v_don;

  insert into giao_dich_ngan_hang (so_tham_chieu, ngay_giao_dich, so_tien, noi_dung, nguoi_tai_len)
  values ('FT99999001', current_date, 480700, 'ZZ99 KC-001', 'ke-toan-thu')
  returning id into v_gd;

  -- ─────────────────────────────────────────────────────────────────────
  -- 1. Dòng sao kê trùng số tham chiếu phải bị chặn
  -- ─────────────────────────────────────────────────────────────────────
  begin
    insert into giao_dich_ngan_hang (so_tham_chieu, ngay_giao_dich, so_tien, nguoi_tai_len)
    values ('FT99999001', current_date, 480700, 'ke-toan-thu');
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  tải lên lại cùng dòng sao kê → LẼ RA phải bị chặn';
  exception when unique_violation then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    tải lên lại cùng dòng sao kê bị chặn (chống cộng tiền hai lần)';
  end;

  -- ─────────────────────────────────────────────────────────────────────
  -- 2. Đơn có ngày tạo nằm trước mọi tỷ lệ → phải DỪNG, không được đoán
  --    Dùng một đơn RIÊNG cho phép thử này. Bản trước dùng chung đơn KC-001
  --    và giả định bảng tỷ lệ còn trống; chạy sau khi đã khai tỷ lệ thì lệnh
  --    này THÀNH CÔNG, KC-001 bị chuyển sang "đã nhận tiền", và phép thử số 3
  --    đổ ngay sau đó. Đó là lỗi của tệp kiểm chứng, không phải của lược đồ.
  -- ─────────────────────────────────────────────────────────────────────
  insert into don_hang (ma_don, ctv_id, khach_hang_id, xe_id, loai_xe,
                        phi_goc, vat, tong_phi, thoi_diem_tao)
  values ('KC-000', v_ctv, v_kh, v_xe, 'oto', 437000, 43700, 480700, v_ngay_cu::timestamptz)
  returning id into v_don0;

  insert into giao_dich_ngan_hang (so_tham_chieu, ngay_giao_dich, so_tien, nguoi_tai_len)
  values ('FT99999000', current_date, 480700, 'ke-toan-thu')
  returning id into v_gd0;

  begin
    v_bt := xac_nhan_thanh_toan(v_don0, v_gd0, 'ke-toan-thu');
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  đơn không có tỷ lệ nào hiệu lực mà vẫn sinh hoa hồng';
  exception when others then
    if sqlerrm like '%tỷ lệ hoa hồng%' then
      so_dat := so_dat + 1;
      bao_cao := bao_cao || E'\n  đạt    không có tỷ lệ hiệu lực thì dừng lại và nói rõ, không đoán một con số';
    else
      so_truot := so_truot + 1;
      bao_cao := bao_cao || E'\n  TRƯỢT  dừng vì lý do khác: ' || sqlerrm;
    end if;
  end;

  -- ─────────────────────────────────────────────────────────────────────
  -- 3. Xác nhận thanh toán: đơn đổi trạng thái VÀ sinh bút toán, cùng lúc
  -- ─────────────────────────────────────────────────────────────────────
  v_bt := xac_nhan_thanh_toan(v_don, v_gd, 'ke-toan-thu', 'khớp tay');

  select trang_thai::text into v_txt from don_hang where id = v_don;
  if v_txt = 'da_nhan_tien' then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    đơn chuyển sang "đã nhận tiền"';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  trạng thái đơn = ' || v_txt;
  end if;

  select so_tien into v_so from so_cai_hoa_hong where id = v_bt;
  if v_so = v_hh_mong then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    hoa hồng tính trên PHÍ GỐC: ' || v_hh_mong ||
               'đ (437.000 × ' || (v_ty_le*100)::numeric(5,2) || '%), không dính VAT';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  hoa hồng = ' || v_so || ', đáng lẽ ' || v_hh_mong;
  end if;

  select trang_thai into v_txt from giao_dich_ngan_hang where id = v_gd;
  if v_txt = 'da_khop' then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    dòng sao kê được đánh dấu đã khớp';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  dòng sao kê vẫn ở trạng thái ' || v_txt;
  end if;

  -- ─────────────────────────────────────────────────────────────────────
  -- 4. Bấm duyệt lần thứ hai cùng một đơn — phải bị chặn
  -- ─────────────────────────────────────────────────────────────────────
  insert into giao_dich_ngan_hang (so_tham_chieu, ngay_giao_dich, so_tien, nguoi_tai_len)
  values ('FT99999002', current_date, 480700, 'ke-toan-thu')
  returning id into v_gd2;

  begin
    v_bt := xac_nhan_thanh_toan(v_don, v_gd2, 'ke-toan-thu');
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  duyệt lần hai vẫn lọt → hoa hồng trả hai lần';
  exception when others then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    duyệt lần hai bị chặn (đơn không còn chờ chuyển khoản)';
  end;

  -- ─────────────────────────────────────────────────────────────────────
  -- 5. Chèn thẳng bút toán tích luỹ thứ hai cho cùng đơn — chỉ mục chặn
  -- ─────────────────────────────────────────────────────────────────────
  begin
    insert into so_cai_hoa_hong (ctv_id, don_hang_id, loai, so_tien, dien_giai, nguoi_tao)
    values (v_ctv, v_don, 'tich_luy', v_hh_mong, 'cố tình trùng', 'kiem-chung');
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  ghi được hai bút toán tích luỹ cho một đơn';
  exception when unique_violation then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    một đơn chỉ sinh hoa hồng được đúng một lần';
  end;

  -- ─────────────────────────────────────────────────────────────────────
  -- 6. Sổ cái không sửa, không xoá
  -- ─────────────────────────────────────────────────────────────────────
  begin
    update so_cai_hoa_hong set so_tien = 999999 where don_hang_id = v_don;
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  SỬA được dòng sổ cái';
  exception when others then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    không sửa được dòng sổ cái';
  end;

  begin
    delete from so_cai_hoa_hong where don_hang_id = v_don;
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  XOÁ được dòng sổ cái';
  exception when others then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    không xoá được dòng sổ cái';
  end;

  -- ─────────────────────────────────────────────────────────────────────
  -- 7. Dấu tiền phải khớp loại bút toán
  -- ─────────────────────────────────────────────────────────────────────
  begin
    insert into so_cai_hoa_hong (ctv_id, loai, so_tien, dien_giai, nguoi_tao)
    values (v_ctv, 'chi_tra', 500000, 'chi trả mang số dương', 'kiem-chung');
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  ghi được bút toán chi trả mang số DƯƠNG';
  exception when check_violation then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    bút toán chi trả buộc phải mang số âm';
  end;

  -- ─────────────────────────────────────────────────────────────────────
  -- 8. Số tiền sao kê lệch số tiền đơn — không ép khớp
  -- ─────────────────────────────────────────────────────────────────────
  insert into don_hang (ma_don, ctv_id, ma_ctv_ghi_nhan, khach_hang_id, xe_id,
                        loai_xe, phi_goc, vat, tong_phi)
  values ('KC-002', v_ctv, 'ZZ99', v_kh, v_xe, 'oto', 437000, 43700, 480700)
  returning id into v_don2;

  insert into giao_dich_ngan_hang (so_tham_chieu, ngay_giao_dich, so_tien, nguoi_tai_len)
  values ('FT99999003', current_date, 400000, 'ke-toan-thu')
  returning id into v_gd3;

  begin
    v_bt := xac_nhan_thanh_toan(v_don2, v_gd3, 'ke-toan-thu');
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  số tiền lệch mà vẫn khớp được';
  exception when others then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    số tiền lệch thì từ chối, để người xử lý tay';
  end;

  -- ─────────────────────────────────────────────────────────────────────
  -- 9. Thu hồi khi hoàn phí: ghi bút toán ngược, KHÔNG xoá bút toán cũ
  -- ─────────────────────────────────────────────────────────────────────
  v_bt := thu_hoi_hoa_hong(v_don, 'ke-toan-thu', 'khách huỷ đơn');

  select count(*) into v_n from so_cai_hoa_hong where don_hang_id = v_don;
  select coalesce(sum(so_tien), 0) into v_so from so_cai_hoa_hong where ctv_id = v_ctv;

  if v_n = 2 and v_so = 0 then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    thu hồi ghi bút toán ngược: còn đủ 2 dòng, số dư về 0';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  sau thu hồi: ' || v_n || ' dòng, số dư ' || v_so;
  end if;

  -- ─────────────────────────────────────────────────────────────────────
  -- 10. Tỷ lệ theo hiệu lực: tỷ lệ của TƯƠNG LAI không đụng tới đơn hôm nay
  -- ─────────────────────────────────────────────────────────────────────
  insert into ty_le_hoa_hong (nhom_xe, ty_le, hieu_luc_tu, ghi_chu, nguoi_tao)
  values ('oto', 0.0500, '2099-12-31', 'mức thử của tương lai', 'kiem-chung')
  on conflict (nhom_xe, hieu_luc_tu) do nothing;

  insert into don_hang (ma_don, ctv_id, khach_hang_id, xe_id, loai_xe,
                        phi_goc, vat, tong_phi, thoi_diem_tao)
  values ('KC-003', v_ctv, v_kh, v_xe, 'oto', 437000, 43700, 480700, now())
  returning id into v_don3;

  insert into giao_dich_ngan_hang (so_tham_chieu, ngay_giao_dich, so_tien, nguoi_tai_len)
  values ('FT99999004', current_date, 480700, 'ke-toan-thu')
  returning id into v_gd3;

  v_bt := xac_nhan_thanh_toan(v_don3, v_gd3, 'ke-toan-thu');
  select ty_le_ap_dung into v_so from so_cai_hoa_hong where id = v_bt;
  if v_so = v_ty_le then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    đơn hôm nay giữ tỷ lệ hiện hành, không dính mức 5% hiệu lực năm 2099';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  tỷ lệ áp dụng = ' || v_so || ', đáng lẽ ' || v_ty_le;
  end if;

  -- ─────────────────────────────────────────────────────────────────────
  -- 11. Đơn KHÔNG có cộng tác viên: vẫn thu tiền được, không sinh hoa hồng
  -- ─────────────────────────────────────────────────────────────────────
  insert into don_hang (ma_don, khach_hang_id, xe_id, loai_xe, phi_goc, vat, tong_phi)
  values ('KC-004', v_kh, v_xe, 'oto', 437000, 43700, 480700)
  returning id into v_don2;

  insert into giao_dich_ngan_hang (so_tham_chieu, ngay_giao_dich, so_tien, nguoi_tai_len)
  values ('FT99999005', current_date, 480700, 'ke-toan-thu')
  returning id into v_gd3;

  v_bt := xac_nhan_thanh_toan(v_don2, v_gd3, 'ke-toan-thu');
  select trang_thai::text into v_txt from don_hang where id = v_don2;
  if v_bt is null and v_txt = 'da_nhan_tien' then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    đơn không gắn mã vẫn thu tiền được, không sinh hoa hồng';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  đơn không gắn mã: bút toán=' || coalesce(v_bt::text,'null') || ', trạng thái=' || v_txt;
  end if;

  -- ─────────────────────────────────────────────────────────────────────
  -- 12. Khung nhìn của CTV KHÔNG chứa dữ liệu cá nhân của khách
  -- ─────────────────────────────────────────────────────────────────────
  select count(*) into v_n
    from information_schema.columns
   where table_name = 'v_don_cua_ctv'
     and column_name in ('ho_ten','sdt','email','cccd','dia_chi','khach_hang_id');
  if v_n = 0 then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    v_don_cua_ctv không có cột tên/điện thoại/CCCD/địa chỉ khách';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  v_don_cua_ctv lộ ' || v_n || ' cột dữ liệu cá nhân';
  end if;

  -- ─────────────────────────────────────────────────────────────────────
  -- 13. Khung nhìn tổng hợp cộng đúng
  -- ─────────────────────────────────────────────────────────────────────
  select hoa_hong_kha_dung into v_so from v_ctv_tong_hop where id = v_ctv;
  -- KC-001: +hh rồi −hh (thu hồi) = 0 ; KC-003: +hh → tổng bằng đúng một lần hh
  if v_so = v_hh_mong then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    v_ctv_tong_hop cộng đúng số dư từ sổ cái (' || v_hh_mong || 'đ)';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  số dư khung nhìn = ' || v_so || ', đáng lẽ ' || v_hh_mong;
  end if;

  select doanh_thu into v_so from v_ctv_tong_hop where id = v_ctv;
  -- KC-003 đã nhận tiền (480.700). KC-001 đã chuyển sang hoan_phi nên không tính.
  if v_so = 480700 then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    doanh thu chỉ tính đơn đã nhận tiền, đơn hoàn phí bị loại';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  doanh thu khung nhìn = ' || v_so;
  end if;

  -- ─────────────────────────────────────────────────────────────────────
  -- 14. RLS đã bật trên mọi bảng
  -- ─────────────────────────────────────────────────────────────────────
  select count(*) into v_n
    from pg_tables t
   where t.schemaname = 'public'
     and t.tablename in ('ctv','khach_hang','xe','don_hang','giao_dich_ngan_hang',
                         'doi_soat','ty_le_hoa_hong','dot_chi_tra','so_cai_hoa_hong',
                         'luot_bam_link','nhat_ky')
     and not t.rowsecurity;
  if v_n = 0 then
    so_dat := so_dat + 1;
    bao_cao := bao_cao || E'\n  đạt    RLS đã bật trên cả 11 bảng (khoá công khai không đọc được gì)';
  else
    so_truot := so_truot + 1;
    bao_cao := bao_cao || E'\n  TRƯỢT  còn ' || v_n || ' bảng chưa bật RLS';
  end if;

  -- ─────────────────────────────────────────────────────────────────────
  -- Báo cáo, rồi cuộn ngược tất cả
  -- ─────────────────────────────────────────────────────────────────────
  raise exception E'\n════════ KẾT QUẢ KIỂM CHỨNG ════════%\n\n%  — %  đạt, %  trượt\n\n(Dòng "ERROR" này là CỐ Ý: nó cuộn ngược toàn bộ dữ liệu thử.\n Không có gì được ghi vào cơ sở dữ liệu của anh.)',
    '', bao_cao, so_dat, so_truot;
end $$;
