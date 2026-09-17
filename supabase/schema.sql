-- ===========================================================================
-- DBV247 — Cơ sở dữ liệu cổng cộng tác viên (Supabase / PostgreSQL)
-- Phiên bản 1.0 — giai đoạn 1: chỉ TNDS, chỉ năm đầu, chưa có tái tục
--
-- CÁCH CHẠY: Supabase → SQL Editor → dán toàn bộ tệp này → Run.
-- Chạy lại được nhiều lần (idempotent) trên cơ sở dữ liệu trống.
--
-- HAI LOẠI DỮ LIỆU, HAI LUẬT TRÁI NGƯỢC — đây là ý tưởng trung tâm:
--
--   HỒ SƠ   ctv · khach_hang · xe · don_hang · giao_dich_ngan_hang
--           Mô tả hiện trạng. Được sửa. Mọi lần sửa có nhật ký.
--
--   SỔ CÁI  so_cai_hoa_hong
--           Chỉ chứa chuyển động tiền. GHI RỒI KHÔNG SỬA, KHÔNG XOÁ —
--           có trigger chặn cứng. Sai thì ghi bút toán ngược.
--           Số dư của cộng tác viên = SUM(so_tien), không bao giờ là một cột.
--
--   KHUNG NHÌN  v_ctv_tong_hop · v_don_cua_ctv
--           Dashboard CHỈ đọc từ đây. Không tính toán, không lưu bản sao.
--
-- DOANH THU KHÔNG PHẢI BÚT TOÁN: doanh thu suy ra từ đơn ở trạng thái
-- da_nhan_tien. Chỉ hoa hồng vào sổ cái, vì chỉ nó là tiền DBV nợ CTV.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ── Kiểu liệt kê ───────────────────────────────────────────────────────────
-- Trạng thái đơn là máy trạng thái có hướng, không phải ô chữ tự do:
--   nhap → cho_chuyen_khoan → da_nhan_tien → da_cap_don
--                                  ↓
--                            huy / hoan_phi
do $$ begin
  create type trang_thai_don as enum
    ('nhap','cho_chuyen_khoan','da_nhan_tien','da_cap_don','huy','hoan_phi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type loai_but_toan as enum ('tich_luy','dieu_chinh','thu_hoi','chi_tra');
exception when duplicate_object then null; end $$;

-- ===========================================================================
-- HỒ SƠ
-- ===========================================================================

create table if not exists ctv (
  id             bigint generated always as identity primary key,
  ma_ctv         text not null unique check (ma_ctv ~ '^[A-Z0-9]{4}$'),
  sdt            text not null unique check (sdt ~ '^0[35789][0-9]{8}$'),
  ho_ten         text not null check (length(btrim(ho_ten)) >= 2),
  email          text,
  mat_khau_bam   text not null,
  muoi           text not null,
  trang_thai     text not null default 'hoat_dong'
                 check (trang_thai in ('hoat_dong','tam_khoa')),
  ngan_hang      text,
  so_tai_khoan   text,
  chu_tai_khoan  text,
  sai_lien_tiep  int  not null default 0,
  khoa_den       timestamptz,
  dang_nhap_cuoi timestamptz,
  ngay_tao       timestamptz not null default now()
);
comment on table ctv is 'Hồ sơ cộng tác viên. Số điện thoại là tên đăng nhập.';

-- DỮ LIỆU CÁ NHÂN CỦA KHÁCH. Cộng tác viên KHÔNG BAO GIỜ được đọc bảng này.
-- Bảo đảm không nằm ở chỗ nhớ đừng viết sai câu lệnh, mà ở chỗ: khung nhìn
-- dành cho CTV (v_don_cua_ctv) không hề nối tới bảng này, nên dù mã có lỗi
-- thì cũng không có cột nào để rò ra.
create table if not exists khach_hang (
  id       bigint generated always as identity primary key,
  ho_ten   text not null,
  sdt      text not null,
  email    text,
  cccd     text,
  dia_chi  text,
  ngay_tao timestamptz not null default now()
);
create index if not exists khach_hang_sdt_idx on khach_hang (sdt);
comment on table khach_hang is 'DỮ LIỆU CÁ NHÂN — NĐ 13/2023. CTV không đọc được.';

create table if not exists xe (
  id            bigint generated always as identity primary key,
  khach_hang_id bigint not null references khach_hang(id) on delete restrict,
  bien_so       text,
  so_khung      text,
  so_may        text,
  hieu_xe       text,
  nam_sx        int check (nam_sx between 1950 and 2100),
  loai_xe       text not null check (loai_xe in ('oto','moto')),
  nhom_xe       text,
  so_cho        int,
  ngay_tao      timestamptz not null default now()
);
create index if not exists xe_bien_so_idx on xe (bien_so);

create table if not exists don_hang (
  id                  bigint generated always as identity primary key,
  ma_don              text not null unique,
  ctv_id              bigint references ctv(id) on delete restrict,
  -- Ảnh chụp mã CTV tại thời điểm tạo đơn. Giữ riêng khỏi ctv_id để khi có
  -- khiếu nại còn thấy đơn ĐÃ mang mã gì, kể cả khi mã đó không khớp CTV nào.
  ma_ctv_ghi_nhan     text,
  nguon_ghi_nhan      text check (nguon_ghi_nhan in
                        ('khach_tu_nhap','tham_so_url','cookie_link')),
  khach_hang_id       bigint not null references khach_hang(id) on delete restrict,
  xe_id               bigint references xe(id) on delete restrict,
  san_pham            text not null default 'TNDS',
  loai_xe             text not null check (loai_xe in ('oto','moto')),
  chi_tiet_xe         text,
  thoi_han_nam        int  not null default 1 check (thoi_han_nam between 1 and 3),
  phi_goc             numeric(14,0) not null check (phi_goc >= 0),
  vat                 numeric(14,0) not null default 0 check (vat >= 0),
  tong_phi            numeric(14,0) not null check (tong_phi > 0),
  ngay_hieu_luc       date,
  ngay_het_han        date,
  trang_thai          trang_thai_don not null default 'cho_chuyen_khoan',
  thoi_diem_tao       timestamptz not null default now(),
  thoi_diem_nhan_tien timestamptz,
  -- Không thể ở trạng thái đã nhận tiền mà không có mốc thời gian nhận
  constraint nhan_tien_phai_co_moc check (
    thoi_diem_nhan_tien is not null
    or trang_thai not in ('da_nhan_tien','da_cap_don')
  )
);
create index if not exists don_hang_ctv_idx    on don_hang (ctv_id);
create index if not exists don_hang_tt_idx     on don_hang (trang_thai);
create index if not exists don_hang_thoi_diem  on don_hang (thoi_diem_tao desc);

-- ===========================================================================
-- ĐỐI SOÁT SAO KÊ
-- ===========================================================================

-- so_tham_chieu là KHOÁ CHỐNG TRÙNG. Kế toán lỡ tay tải lên lại tệp hôm qua
-- thì không có dòng nào được cộng hai lần. Đây là lỗi tốn tiền thật và không
-- có cách phòng nào khác ngoài ràng buộc ở tầng dữ liệu.
create table if not exists giao_dich_ngan_hang (
  id                bigint generated always as identity primary key,
  so_tham_chieu     text not null unique,
  ngay_giao_dich    date not null,
  so_tien           numeric(14,0) not null check (so_tien > 0),
  noi_dung          text,
  ten_doi_ung       text,
  tai_khoan_doi_ung text,
  ten_file_nguon    text,
  nguoi_tai_len     text,
  thoi_diem_tai_len timestamptz not null default now(),
  trang_thai        text not null default 'chua_khop'
                    check (trang_thai in ('chua_khop','da_khop','bo_qua'))
);
create index if not exists gdnh_trang_thai_idx on giao_dich_ngan_hang (trang_thai);
create index if not exists gdnh_ngay_idx       on giao_dich_ngan_hang (ngay_giao_dich);

-- Một dòng sao kê khớp đúng một đơn, và một đơn khớp đúng một dòng sao kê.
-- GIỚI HẠN CÓ CHỦ Ý của bản 1.0: chưa hỗ trợ trả góp hay một lần chuyển
-- khoản trả cho hai đơn. Gặp ca đó thì xử lý tay và ghi chú, đừng nới ràng
-- buộc — nới ra là mở đường cho hoa hồng trùng.
create table if not exists doi_soat (
  id           bigint generated always as identity primary key,
  giao_dich_id bigint not null unique references giao_dich_ngan_hang(id) on delete restrict,
  don_hang_id  bigint not null unique references don_hang(id) on delete restrict,
  nguoi_duyet  text not null,
  ghi_chu      text,
  thoi_diem    timestamptz not null default now()
);

-- ===========================================================================
-- TỶ LỆ HOA HỒNG — CÓ HIỆU LỰC THEO NGÀY
-- ===========================================================================
-- Đổi xe máy từ 40% xuống 35% chỉ áp cho đơn mới. Đơn cũ giữ nguyên tỷ lệ đã
-- ghi vào bút toán, nên lịch sử không bao giờ bị viết lại.
create table if not exists ty_le_hoa_hong (
  id            bigint generated always as identity primary key,
  nhom_xe       text not null check (nhom_xe in ('oto','moto')),
  ty_le         numeric(5,4) not null check (ty_le >= 0 and ty_le <= 1),
  hieu_luc_tu   date not null,
  ghi_chu       text,
  nguoi_tao     text,
  thoi_diem_tao timestamptz not null default now(),
  unique (nhom_xe, hieu_luc_tu)
);

-- ===========================================================================
-- CHI TRẢ
-- ===========================================================================
create table if not exists dot_chi_tra (
  id             bigint generated always as identity primary key,
  ky             text not null,
  trang_thai     text not null default 'mo'
                 check (trang_thai in ('mo','da_chot','da_chuyen')),
  nguoi_tao      text not null,
  thoi_diem_tao  timestamptz not null default now(),
  nguoi_chot     text,
  thoi_diem_chot timestamptz
);

-- ===========================================================================
-- SỔ CÁI HOA HỒNG — GHI THÊM, KHÔNG SỬA
-- ===========================================================================
create table if not exists so_cai_hoa_hong (
  id             bigint generated always as identity primary key,
  ctv_id         bigint not null references ctv(id) on delete restrict,
  don_hang_id    bigint references don_hang(id) on delete restrict,
  loai           loai_but_toan not null,
  so_tien        numeric(14,0) not null check (so_tien <> 0),
  ty_le_ap_dung  numeric(5,4),
  dot_chi_tra_id bigint references dot_chi_tra(id) on delete restrict,
  dien_giai      text not null,
  nguoi_tao      text not null,
  thoi_diem      timestamptz not null default now(),
  -- Dấu của tiền phải khớp với loại bút toán, để không bao giờ có dòng
  -- "chi trả" mang số dương làm số dư phình lên.
  constraint dau_tien_khop_loai check (
    (loai = 'tich_luy'                and so_tien > 0) or
    (loai in ('thu_hoi','chi_tra')    and so_tien < 0) or
    (loai = 'dieu_chinh')
  )
);
create index if not exists so_cai_ctv_idx on so_cai_hoa_hong (ctv_id, thoi_diem desc);

-- RÀNG BUỘC QUAN TRỌNG NHẤT CỦA CẢ LƯỢC ĐỒ:
-- một đơn chỉ được sinh hoa hồng ĐÚNG MỘT LẦN. Bấm duyệt hai lần, gọi API
-- hai lần, chạy lại tệp sao kê — đều không tạo được bút toán tích luỹ thứ hai.
create unique index if not exists so_cai_mot_tich_luy_moi_don
  on so_cai_hoa_hong (don_hang_id) where loai = 'tich_luy';

-- Chặn cứng việc sửa/xoá. Sổ cái chỉ có giá trị khi nó không sửa được — cho
-- sửa một dòng là nó thành bảng tính thường, và câu "tháng 8 anh được 4,2
-- triệu" không còn chứng minh được nữa.
create or replace function chan_sua_so_cai() returns trigger
language plpgsql as $$
begin
  raise exception
    'Sổ cái chỉ được ghi thêm. Sai thì ghi bút toán ngược (dieu_chinh/thu_hoi), không sửa hay xoá dòng cũ.';
end $$;

drop trigger if exists so_cai_khong_sua on so_cai_hoa_hong;
create trigger so_cai_khong_sua
  before update or delete on so_cai_hoa_hong
  for each row execute function chan_sua_so_cai();

-- ===========================================================================
-- LƯỢT BẤM LINK + NHẬT KÝ
-- ===========================================================================
create table if not exists luot_bam_link (
  ctv_id  bigint not null references ctv(id) on delete cascade,
  ngay    date not null,
  so_luot int not null default 0 check (so_luot >= 0),
  primary key (ctv_id, ngay)
);

create table if not exists nhat_ky (
  id              bigint generated always as identity primary key,
  bang            text not null,
  ban_ghi_id      text,
  hanh_dong       text not null,
  du_lieu_cu      jsonb,
  du_lieu_moi     jsonb,
  nguoi_thuc_hien text,
  thoi_diem       timestamptz not null default now()
);
create index if not exists nhat_ky_bang_idx on nhat_ky (bang, thoi_diem desc);

-- ===========================================================================
-- HAI THAO TÁC TIỀN — MỖI THAO TÁC LÀ MỘT GIAO DỊCH TRỌN VẸN
-- ===========================================================================

-- Kế toán bấm duyệt một dòng sao kê khớp một đơn.
-- Đánh dấu đơn đã nhận tiền VÀ sinh bút toán hoa hồng: cùng thành công hoặc
-- cùng không. Không có trạng thái nửa vời — đó là lý do nó nằm trong một hàm
-- của cơ sở dữ liệu chứ không phải ba lệnh rời rạc trong mã JavaScript.
create or replace function xac_nhan_thanh_toan(
  p_don_id      bigint,
  p_giao_dich_id bigint,
  p_nguoi_duyet  text,
  p_ghi_chu      text default null
) returns bigint
language plpgsql as $$
declare
  v_don         don_hang;
  v_gd          giao_dich_ngan_hang;
  v_ty_le       numeric(5,4);
  v_but_toan_id bigint;
begin
  select * into v_don from don_hang where id = p_don_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn id=%', p_don_id;
  end if;
  if v_don.trang_thai <> 'cho_chuyen_khoan' then
    raise exception 'Đơn % đang ở trạng thái "%" — chỉ xác nhận được đơn đang chờ chuyển khoản',
      v_don.ma_don, v_don.trang_thai;
  end if;

  select * into v_gd from giao_dich_ngan_hang where id = p_giao_dich_id for update;
  if not found then
    raise exception 'Không tìm thấy giao dịch id=%', p_giao_dich_id;
  end if;
  if v_gd.trang_thai = 'da_khop' then
    raise exception 'Giao dịch % đã khớp với đơn khác rồi', v_gd.so_tham_chieu;
  end if;
  if v_gd.so_tien <> v_don.tong_phi then
    raise exception 'Số tiền lệch: sao kê % đ, đơn % đ. Xử lý tay, đừng ép khớp.',
      v_gd.so_tien, v_don.tong_phi;
  end if;

  update don_hang
     set trang_thai = 'da_nhan_tien', thoi_diem_nhan_tien = now()
   where id = p_don_id;
  update giao_dich_ngan_hang set trang_thai = 'da_khop' where id = p_giao_dich_id;

  insert into doi_soat (giao_dich_id, don_hang_id, nguoi_duyet, ghi_chu)
  values (p_giao_dich_id, p_don_id, p_nguoi_duyet, p_ghi_chu);

  insert into nhat_ky (bang, ban_ghi_id, hanh_dong, du_lieu_moi, nguoi_thuc_hien)
  values ('don_hang', p_don_id::text, 'xac_nhan_thanh_toan',
          jsonb_build_object('giao_dich', v_gd.so_tham_chieu, 'so_tien', v_gd.so_tien),
          p_nguoi_duyet);

  -- Đơn không mang mã CTV: vẫn xác nhận thanh toán, chỉ là không có hoa hồng.
  if v_don.ctv_id is null then
    return null;
  end if;

  select ty_le into v_ty_le
    from ty_le_hoa_hong
   where nhom_xe = v_don.loai_xe
     and hieu_luc_tu <= v_don.thoi_diem_tao::date
   order by hieu_luc_tu desc
   limit 1;

  -- Thà dừng lại còn hơn đoán một tỷ lệ. Hoa hồng sai thì phải đi xin lại tiền
  -- của cộng tác viên — chuyện đó không có cách làm êm.
  if v_ty_le is null then
    raise exception 'Chưa khai tỷ lệ hoa hồng cho "%" có hiệu lực trước ngày %',
      v_don.loai_xe, v_don.thoi_diem_tao::date;
  end if;

  -- CĂN CỨ TÍNH HOA HỒNG LÀ PHÍ GỐC, KHÔNG PHẢI TỔNG PHÍ.
  -- VAT là tiền DBV thu hộ rồi nộp nhà nước, không phải doanh thu của DBV,
  -- nên không chia hoa hồng trên phần đó. Với xe dưới 6 chỗ: 40% × 437.000 =
  -- 174.800đ, chứ không phải 40% × 480.700.
  -- Đổi chỗ này thành tong_phi là đội hoa hồng lên ~10% mỗi đơn, và phát hiện
  -- ra sau khi đã chi tiền thì phải đi đòi lại của cộng tác viên.
  insert into so_cai_hoa_hong
    (ctv_id, don_hang_id, loai, so_tien, ty_le_ap_dung, dien_giai, nguoi_tao)
  values
    (v_don.ctv_id, p_don_id, 'tich_luy',
     round(v_don.phi_goc * v_ty_le), v_ty_le,
     'Hoa hồng đơn ' || v_don.ma_don, p_nguoi_duyet)
  returning id into v_but_toan_id;

  return v_but_toan_id;
end $$;

-- Khách huỷ đơn hoặc hoàn phí sau khi đã nhận tiền.
-- KHÔNG xoá bút toán tích luỹ — ghi một bút toán ngược. Sổ cái giữ nguyên
-- dấu vết cả hai chiều, nên khi cộng tác viên hỏi "sao tháng này ít đi" thì
-- chỉ đúng được vào dòng nào.
create or replace function thu_hoi_hoa_hong(
  p_don_id    bigint,
  p_nguoi_tao text,
  p_ly_do     text
) returns bigint
language plpgsql as $$
declare
  v_don     don_hang;
  v_tich    so_cai_hoa_hong;
  v_moi_id  bigint;
begin
  select * into v_don from don_hang where id = p_don_id for update;
  if not found then raise exception 'Không tìm thấy đơn id=%', p_don_id; end if;
  if v_don.trang_thai not in ('da_nhan_tien','da_cap_don') then
    raise exception 'Đơn % chưa nhận tiền, không có gì để thu hồi', v_don.ma_don;
  end if;

  update don_hang set trang_thai = 'hoan_phi' where id = p_don_id;

  select * into v_tich from so_cai_hoa_hong
   where don_hang_id = p_don_id and loai = 'tich_luy';
  if not found then
    return null;   -- đơn không có CTV, không có gì để thu hồi
  end if;

  insert into so_cai_hoa_hong
    (ctv_id, don_hang_id, loai, so_tien, ty_le_ap_dung, dien_giai, nguoi_tao)
  values
    (v_tich.ctv_id, p_don_id, 'thu_hoi', -v_tich.so_tien, v_tich.ty_le_ap_dung,
     'Thu hồi hoa hồng đơn ' || v_don.ma_don || ' — ' || p_ly_do, p_nguoi_tao)
  returning id into v_moi_id;

  return v_moi_id;
end $$;

-- ===========================================================================
-- KHUNG NHÌN — DASHBOARD CHỈ ĐỌC TỪ ĐÂY
-- ===========================================================================

-- Dành cho bảng điều khiển của cộng tác viên.
-- KHÔNG nối tới khach_hang. Đây là bảo đảm mang tính cấu trúc: không có cột
-- tên/điện thoại/CCCD/địa chỉ nào tồn tại trong khung nhìn này, nên không có
-- lỗi lập trình nào làm rò được chúng.
create or replace view v_don_cua_ctv as
select
  d.id,
  d.ma_don,
  d.ctv_id,
  c.ma_ctv,
  d.thoi_diem_tao,
  d.thoi_diem_nhan_tien,
  x.bien_so,
  d.loai_xe,
  d.chi_tiet_xe,
  d.thoi_han_nam,
  d.tong_phi,
  d.trang_thai,
  d.nguon_ghi_nhan
from don_hang d
join ctv c on c.id = d.ctv_id
left join xe x on x.id = d.xe_id;

-- Dành cho dashboard quản trị: mỗi cộng tác viên một dòng.
-- Mọi con số ở đây là KẾT QUẢ CỘNG, không phải cột lưu sẵn — nên không có
-- chỗ nào để hai màn hình cho ra hai con số khác nhau.
create or replace view v_ctv_tong_hop as
select
  c.id,
  c.ma_ctv,
  c.ho_ten,
  c.sdt,
  c.trang_thai,
  c.ngay_tao,
  coalesce(b.luot_bam_90n, 0)         as luot_bam_90n,
  coalesce(d.so_don, 0)               as so_don,
  coalesce(d.so_don_da_nhan_tien, 0)  as so_don_da_nhan_tien,
  coalesce(d.doanh_thu, 0)            as doanh_thu,
  coalesce(d.doanh_thu_cho, 0)        as doanh_thu_cho,
  coalesce(s.tich_luy, 0)             as hoa_hong_tich_luy,
  coalesce(-s.da_chi, 0)              as hoa_hong_da_chi,
  coalesce(s.so_du, 0)                as hoa_hong_kha_dung,
  /* Tài khoản nhận tiền của CHÍNH cộng tác viên — cần cho màn hình chi trả.
     Đây là dữ liệu của họ, không phải của khách, nên nằm ở đây là đúng chỗ.
     Thêm ở CUỐI danh sách cột là cố ý: create or replace view chỉ cho phép
     nối thêm cột vào cuối, chèn vào giữa sẽ bị từ chối. */
  c.ngan_hang,
  c.so_tai_khoan,
  c.chu_tai_khoan
from ctv c
left join lateral (
  select sum(so_luot) as luot_bam_90n
    from luot_bam_link l
   where l.ctv_id = c.id and l.ngay >= current_date - 90
) b on true
left join lateral (
  select
    count(*)                                                              as so_don,
    count(*) filter (where trang_thai in ('da_nhan_tien','da_cap_don'))   as so_don_da_nhan_tien,
    sum(tong_phi) filter (where trang_thai in ('da_nhan_tien','da_cap_don')) as doanh_thu,
    sum(tong_phi) filter (where trang_thai = 'cho_chuyen_khoan')          as doanh_thu_cho
  from don_hang dh where dh.ctv_id = c.id
) d on true
left join lateral (
  select
    sum(so_tien) filter (where loai = 'tich_luy') as tich_luy,
    sum(so_tien) filter (where loai = 'chi_tra')  as da_chi,
    sum(so_tien)                                  as so_du
  from so_cai_hoa_hong sc where sc.ctv_id = c.id
) s on true;

-- ===========================================================================
-- KHOÁ CỬA: bật RLS, KHÔNG khai chính sách nào
-- ===========================================================================
-- Hệ quả: khoá công khai (publishable / anon) KHÔNG đọc được gì hết. Mọi truy
-- cập đi qua hàm Netlify dùng khoá bí mật (secret / service_role).
--
-- ⚠ Khoá bí mật BỎ QUA RLS hoàn toàn. Nó chỉ được nằm trong biến môi trường
-- của Netlify — không bao giờ trong HTML, trong JS gửi xuống trình duyệt, hay
-- trong repo. Lộ khoá này là lộ toàn bộ dữ liệu khách hàng.
alter table ctv                 enable row level security;
alter table khach_hang          enable row level security;
alter table xe                  enable row level security;
alter table don_hang            enable row level security;
alter table giao_dich_ngan_hang enable row level security;
alter table doi_soat            enable row level security;
alter table ty_le_hoa_hong      enable row level security;
alter table dot_chi_tra         enable row level security;
alter table so_cai_hoa_hong     enable row level security;
alter table luot_bam_link       enable row level security;
alter table nhat_ky             enable row level security;

-- ===========================================================================
-- TỶ LỆ HOA HỒNG — KHAI TRƯỚC KHI XÁC NHẬN ĐƠN ĐẦU TIÊN
-- ===========================================================================
-- CHƯA khai sẵn vì tỷ lệ chưa chốt (xe máy 40% hay 35%). Chưa có dòng nào thì
-- xac_nhan_thanh_toan() sẽ dừng lại và báo rõ — đúng như mong muốn: thà dừng
-- còn hơn ghi một con số đoán vào sổ cái.
--
-- Khi chốt, chạy (sửa số cho đúng):
--
--   insert into ty_le_hoa_hong (nhom_xe, ty_le, hieu_luc_tu, ghi_chu, nguoi_tao)
--   values ('oto',  0.2000, '2026-09-15', 'Mức khởi điểm', 'hoang'),
--          ('moto', 0.4000, '2026-09-15', 'Mức khởi điểm', 'hoang');
--
-- Đổi tỷ lệ sau này thì THÊM DÒNG MỚI với hieu_luc_tu mới, KHÔNG sửa dòng cũ:
--
--   insert into ty_le_hoa_hong (nhom_xe, ty_le, hieu_luc_tu, ghi_chu, nguoi_tao)
--   values ('moto', 0.3500, '2026-12-01', 'Giảm từ 40% xuống 35%', 'hoang');
