# Cấu hình đo lường DBV247

Ghi lại để tránh nhầm lẫn giữa các tài khoản Google. Cập nhật file này mỗi khi đổi mã.

---

## Mã đang dùng

| Sản phẩm | Mã | Ghi vào đâu |
|---|---|---|
| Google Tag Manager | `GTM-53NZ4XR4` | Gắn cứng trong `<head>` của 32 file HTML |
| Google Analytics 4 | `G-PDKMDT4G60` | **Chỉ nằm trong GTM**, không có trong code |
| Google Search Console | `tkLb-61GRi72aV0BqxfX1Ygl0r6iiXM4c8k87rarVrU` | Meta tag trong `index.html` |
| Google Ads | _(chưa có)_ | — |

### Mã đã ngừng dùng

| Mã | Lý do |
|---|---|
| `G-DY2WX5NWWC` | Property GA4 cũ, thuộc tài khoản khác. Đã gỡ khỏi toàn site ngày 31/07/2026. Dữ liệu lịch sử vẫn nằm ở property này nhưng không dùng nữa. |

### Tài khoản Google sở hữu

Điền vào sau khi kiểm tra, để không phải mò lại:

- GTM: `________________@gmail.com`
- GA4: `________________@gmail.com`
- Google Ads: `________________@gmail.com`

---

## Nguyên tắc quan trọng

**Không bao giờ gắn mã GA4 trực tiếp vào HTML.** Toàn bộ thẻ đo lường đi qua GTM. Nếu vừa gắn cứng vừa để trong GTM thì mỗi lượt xem bị đếm hai lần, số liệu sai gấp đôi.

Muốn đổi mã đo lường hoặc thêm thẻ mới (Facebook Pixel, Google Ads, TikTok...) — làm trong GTM, không cần sửa code và push lại.

---

## Vị trí mã GTM trong file HTML

Thứ tự trong `<head>` phải giữ đúng:

```html
<head>
<meta charset="UTF-8">              <!-- Phải đứng trước GTM -->
<meta name="viewport" ...>
<!-- Google Tag Manager -->
<script>...GTM-53NZ4XR4...</script>
<!-- End Google Tag Manager -->
...
```

Charset đứng trước vì trang tiếng Việt có dấu — khai báo mã hoá phải nằm trong 1024 byte đầu file, đặt sau script dài sẽ có rủi ro hiển thị lỗi font.

Đoạn `<noscript>` nằm ngay sau thẻ `<body>`.

Các file **không** gắn GTM: `google067cc8913a387cda.html` (file xác minh), `index-test.html`, `bao-hiem-du-lich-quoc-te-demo.html`, và toàn bộ thư mục `admin/`.

---

## Việc cần làm trong GTM

### Đã xong
- [x] Cài mã GTM lên website

### Cần làm
- [ ] Tạo thẻ GA4 với mã `G-PDKMDT4G60`, trình kích hoạt All Pages → **Xuất bản**
- [ ] Theo dõi sự kiện gửi form (chuyển đổi chính)
- [ ] Theo dõi click nút Zalo / Messenger
- [ ] Liên kết GA4 với Google Ads khi bắt đầu chạy quảng cáo

---

## Các form trên website

Dùng khi cấu hình theo dõi chuyển đổi trong GTM.

| Tên form | Vị trí |
|---|---|
| `hero-form` | Form nhanh trên banner trang chủ (SĐT + nhu cầu) |
| `lead-form` | Form đầy đủ cuối trang chủ |
| `dbv-tuvan` | Form tư vấn trên landing page sản phẩm |
| `dbv-float` | Form nút nổi trên landing page |
| `dbv-suckhoe` | Form riêng trang bảo hiểm sức khỏe |
| `dbv-float-sk` | Form nút nổi trang sức khỏe |

Lead từ các form này đổ về Netlify Forms và hiện trong CRM tại `/admin/dashboard.html`.
