# Hướng dẫn CRM DBV247

Trang: `https://dbv247.com.vn/admin/dashboard.html`

---

## 1. Cần làm gì trước khi dùng

### Bước 1 — Kiểm tra biến môi trường trên Netlify

Vào **Netlify → Site configuration → Environment variables**, đảm bảo có đủ 2 biến:

| Tên biến | Giá trị | Ghi chú |
|---|---|---|
| `NETLIFY_ACCESS_TOKEN` | Personal Access Token | Đã có sẵn từ trước |
| `DASHBOARD_KEY` | Mật khẩu chung của team | Đã có sẵn từ trước — khoá chung cho cả 6 người |

Nếu 2 biến này đã chạy được với dashboard cũ thì không cần đổi gì.

### Bước 2 — Push code lên GitHub

Netlify sẽ tự động:
- Chạy `npm install` (đã khai báo trong `netlify.toml`) để cài `@netlify/blobs`
- Deploy 2 function: `leads` và `lead-status`
- Bật Netlify Blobs (tự động, không cần cấu hình)

### Bước 3 — Kiểm tra danh sách nhân viên

Mở `admin/dashboard.html`, tìm dòng gần cuối file:

```js
var STAFF = [
  "Trần Xuân Lộc",
  "Lê Văn Thạch",
  "Mai Văn Ngọc",
  "Phạm Thị Thanh Kiều",
  "Lưu Lê Hoàng",
  "Phạm An"
];
```

Thêm hoặc bớt người thì sửa ngay tại đây rồi push lại.

Hai ngưỡng cảnh báo nằm ở dòng dưới:

```js
var SLA_HOURS = 4;    // lead mới chưa ai gọi quá 4 giờ → báo đỏ
var RENEW_DAYS = 45;  // hợp đồng còn dưới 45 ngày → báo sắp tái tục
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
- **Đã chốt** → chuyển sang mục Khách hàng

---

## 3. Dữ liệu nằm ở đâu

| Loại | Nơi lưu | Ghi chú |
|---|---|---|
| Thông tin lead gốc (tên, SĐT, nhu cầu) | Netlify Forms | Không bị sửa, giữ nguyên bản gốc |
| Trạng thái, người phụ trách, ghi chú, lịch hẹn | Netlify Blobs | Do CRM ghi vào |
| Số GCN, ngày hết hạn, phí, hoa hồng | Netlify Blobs | Do CRM ghi vào |

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

**Muốn thêm người mới**
→ Thêm tên vào mảng `STAFF` trong `dashboard.html`, push lại.

**Khách đã chốt nhưng không thấy trong mục Khách hàng**
→ Kiểm tra trạng thái có đúng là "Chốt hợp đồng" không. Chỉ trạng thái này mới chuyển sang mục Khách hàng.

**Không có cảnh báo tái tục**
→ Do chưa nhập ngày hết hạn. Vào tab "Chưa rõ hạn" để xem những hợp đồng còn thiếu.

---

## 5. Quản lý khách hàng đã ký

CRM có 2 chế độ xem, chuyển bằng thanh nút ở đầu trang:

| Chế độ | Chứa gì | Dùng khi nào |
|---|---|---|
| **Lead đang xử lý** | Lead chưa chốt được | Công việc bán hàng hằng ngày |
| **Khách hàng** | Lead đã chuyển sang "Chốt hợp đồng" | Chăm sóc và tái tục |

Khi bạn đổi trạng thái một lead sang **Chốt hợp đồng**, nó tự động rời khỏi danh sách lead và chuyển sang mục Khách hàng.

### Nhập thông tin hợp đồng

Chọn trạng thái "Chốt hợp đồng" trong panel chi tiết, sẽ hiện thêm khung nhập:

- **Số GCN / hợp đồng** — để tra cứu nhanh khi khách gọi báo tổn thất
- **Ngày hết hạn** — quan trọng nhất, sinh ra toàn bộ cảnh báo tái tục
- **Phí bảo hiểm** — số tiền khách đóng
- **Hoa hồng** — phần DBV247 nhận

Ô tiền tự chèn dấu chấm phân cách khi gõ, chỉ cần nhập số.

### Vòng tái tục

Bảo hiểm là nghiệp vụ lặp lại hằng năm. Khách đã ký hôm nay là nguồn doanh thu của những năm sau — nếu có người nhớ gọi trước khi hết hạn.

Tab trong mục Khách hàng chia theo tình trạng hiệu lực:

| Tab | Nghĩa |
|---|---|
| **Sắp tái tục** | Còn dưới 45 ngày là hết hạn — cần gọi ngay |
| **Đang hiệu lực** | Còn trên 45 ngày, chưa cần làm gì |
| **Đã hết hạn** | Đã qua hạn mà chưa tái tục — liên hệ gấp |
| **Chưa rõ hạn** | Quên nhập ngày hết hạn — cần bổ sung |

Gợi ý mốc liên hệ: trước 45 ngày gọi thăm hỏi và báo phí kỳ mới, trước 30 ngày gửi báo giá, trước 7 ngày nhắc chốt.

Nhóm "Chưa rõ hạn" đáng chú ý — đó là những khách hàng sẽ bị bỏ quên vì hệ thống không biết khi nào cần nhắc.

### Thẻ chỉ số ở mục Khách hàng

- **Tổng khách hàng** — số hợp đồng đã ký
- **Sắp tái tục** — bấm vào ra danh sách cần gọi, nên xem mỗi sáng
- **Đã hết hạn** — khách đang không được bảo vệ
- **Tổng phí** — tổng phí bảo hiểm và hoa hồng của nhóm đang xem

### Xuất báo cáo

Nút "Xuất CSV" xuất theo chế độ đang xem. Ở mục Khách hàng, file gồm số GCN, ngày hết hạn, số ngày còn lại, phí và hoa hồng — mở bằng Excel để làm báo cáo doanh thu hoặc lên danh sách gọi tái tục.

---

## 6. Vì sao nên ghi phí bảo hiểm

Không phải để chấm công nhân viên, mà để trả lời câu hỏi: tiền quảng cáo nên đổ vào dòng sản phẩm nào.

Nếu chỉ đếm số lead thì mọi sản phẩm trông như nhau. Nhưng một hợp đồng cháy nổ nhà máy có phí bằng vài chục hợp đồng TNDS xe máy. Không ghi phí, bạn sẽ tưởng TNDS xe máy là dòng hiệu quả nhất chỉ vì nó nhiều lead nhất.

Kết hợp bộ lọc sản phẩm với cột phí, bạn biết được dòng nào thực sự mang tiền về, và tổng phí sắp đến hạn tái tục trong quý tới là bao nhiêu.

---

## 7. Nếu sau này cần nâng cấp

Thiết kế hiện tại phù hợp với đội nhỏ và tin tưởng nhau. Khi nào cần những thứ sau thì nên chuyển sang Supabase:

- Mỗi người một mật khẩu riêng
- Nhân viên chỉ được xem lead của mình
- Báo cáo doanh số theo người, theo tháng
- Lịch sử ai sửa gì (audit log)

Dữ liệu hiện tại xuất CSV được nên việc chuyển đổi không mất mát gì.
