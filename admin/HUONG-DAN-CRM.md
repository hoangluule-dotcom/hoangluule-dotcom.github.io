# Hướng dẫn CRM DBV247

Trang: `https://dbv247.com.vn/admin/dashboard.html`

---

## 1. Cần làm gì trước khi dùng

### Bước 1 — Kiểm tra biến môi trường trên Netlify

Vào **Netlify → Site configuration → Environment variables**, đảm bảo có đủ 2 biến:

| Tên biến | Giá trị | Ghi chú |
|---|---|---|
| `NETLIFY_ACCESS_TOKEN` | Personal Access Token | Đã có sẵn từ trước |
| `DASHBOARD_KEY` | Mật khẩu chung của team | Đã có sẵn từ trước — đây là khoá 4 người cùng dùng |

Nếu 2 biến này đã chạy được với dashboard cũ thì không cần đổi gì.

### Bước 2 — Push code lên GitHub

Netlify sẽ tự động:
- Cài `@netlify/blobs` (khai báo trong `package.json` mới)
- Deploy 2 function: `leads` và `lead-status`
- Bật Netlify Blobs (tự động, không cần cấu hình)

### Bước 3 — Sửa danh sách nhân viên

Mở `admin/dashboard.html`, tìm dòng gần cuối file:

```js
var STAFF = ["Hoàng", "Tư vấn viên 2", "Tư vấn viên 3", "Tư vấn viên 4"];
```

Thay bằng tên thật của 4 người. Ví dụ:

```js
var STAFF = ["Hoàng", "Tuấn Anh", "Minh Hà", "Thu Trang"];
```

Muốn đổi ngưỡng cảnh báo đỏ (mặc định 4 giờ) thì sửa dòng ngay dưới:

```js
var SLA_HOURS = 4;
```

---

## 2. Cách dùng hằng ngày

### Đăng nhập

Nhập **khoá truy cập** (chung cho cả team) rồi **chọn tên bạn** trong danh sách.

Trình duyệt nhớ lựa chọn này, lần sau vào thẳng không phải nhập lại. Muốn đổi tên người dùng thì bấm vào ô tên ở góc phải trên.

### Nhận lead

Lead chưa ai phụ trách hiện nút **Nhận lead** màu cam. Bấm vào là:
- Tên bạn được gán vào lead đó
- Trạng thái tự chuyển sang "Đã liên hệ"
- Lịch sử ghi lại "Đã nhận lead"

### Cập nhật tiến độ

Bấm vào bất kỳ dòng nào để mở panel chi tiết bên phải. Trong đó:

- **Gọi ngay / Nhắn Zalo** — mở app gọi hoặc Zalo với số của khách
- **Trạng thái** — Mới → Đã liên hệ → Đang tư vấn → Chốt / Không thành
- **Hẹn liên hệ lại** — đặt ngày giờ, hệ thống sẽ báo khi quá hẹn
- **Ghi chú lần này** — mỗi lần lưu sẽ tạo một dòng mới trong lịch sử

Bấm **Lưu cập nhật** để ghi lại.

### Đọc cảnh báo

| Màu | Ý nghĩa |
|---|---|
| Đỏ "Chưa gọi · N giờ" | Lead mới, chưa ai gọi quá 4 tiếng — cần xử lý ngay |
| Đỏ "Quá hẹn" | Đã hẹn gọi lại nhưng qua giờ rồi |
| Cam "Hẹn: ..." | Có lịch hẹn gọi lại sắp tới |
| Xám "Cập nhật ..." | Lần chăm sóc gần nhất |

### Thẻ chỉ số

Bấm vào thẻ để lọc nhanh:
- **Lead mới** → xem các lead chưa xử lý
- **Quá hạn gọi** → xem lead bị bỏ quên
- **Đang chăm sóc** → lead đang tư vấn dở
- **Chốt hợp đồng** → lead đã thành công

---

## 3. Dữ liệu nằm ở đâu

| Loại | Nơi lưu | Ghi chú |
|---|---|---|
| Thông tin lead gốc (tên, SĐT, nhu cầu) | Netlify Forms | Không bị sửa, giữ nguyên bản gốc |
| Trạng thái, người phụ trách, ghi chú, lịch hẹn | Netlify Blobs | Do CRM ghi vào |

Hai nguồn ghép với nhau theo mã lead khi hiển thị.

**Xuất dữ liệu**: bấm nút "Xuất CSV" để tải toàn bộ danh sách (theo bộ lọc đang xem) về Excel.

---

## 4. Xử lý sự cố

**"Sai hoặc thiếu khoá truy cập"**
→ Kiểm tra lại `DASHBOARD_KEY` trên Netlify, hoặc gõ lại khoá cho đúng.

**Bảng hiện lead nhưng trạng thái không lưu được**
→ Function `lead-status` chưa deploy. Kiểm tra Netlify → Functions xem có `lead-status` không. Nếu không có, kiểm tra build log xem `@netlify/blobs` đã cài chưa.

**Hai người cùng sửa một lead**
→ Người lưu sau sẽ ghi đè trạng thái. Nhưng ghi chú thì không mất — mọi ghi chú đều được giữ trong lịch sử.

**Muốn thêm người thứ 5**
→ Thêm tên vào mảng `STAFF` trong `dashboard.html`, push lại.

---

## 5. Nếu sau này cần nâng cấp

Thiết kế hiện tại phù hợp với đội nhỏ và tin tưởng nhau. Khi nào cần những thứ sau thì nên chuyển sang Supabase:

- Mỗi người một mật khẩu riêng
- Nhân viên chỉ được xem lead của mình
- Báo cáo doanh số theo người, theo tháng
- Lịch sử ai sửa gì (audit log)

Dữ liệu hiện tại xuất CSV được nên việc chuyển đổi không mất mát gì.
