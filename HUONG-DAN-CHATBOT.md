# Chatbot tư vấn DBV247 — hướng dẫn cài đặt và vận hành

## 1. Cần làm gì trước khi chatbot chạy được

Chatbot chưa hoạt động cho tới khi có khoá API. Ba bước, làm một lần:

**Bước 1 — Lấy khoá Gemini**

1. Vào https://aistudio.google.com/apikey
2. Đăng nhập bằng tài khoản Google (nên dùng đúng tài khoản đang quản lý GTM/GA4 để sau này dễ tra)
3. Bấm **Create API key** → chọn dự án → copy chuỗi khoá

> ### Khoá bắt đầu bằng `AQ.` là đúng
>
> Google có hai loại khoá. Khoá mới tạo trong AI Studio bắt đầu bằng **`AQ.`**
> (auth key) — đây là loại **đúng và hiện hành**. Khoá kiểu cũ bắt đầu bằng
> `AIza` (standard key) sẽ bị Gemini API **từ chối từ tháng 9/2026**, nên đừng
> cố đi tạo loại đó.
>
> Nếu bạn đọc thấy trên diễn đàn rằng khoá `AQ.` bị lỗi 401, đó là chuyện của
> giai đoạn chuyển đổi trước đây và của riêng endpoint tương thích OpenAI.
> Chatbot này gọi endpoint gốc `generativelanguage.googleapis.com` với header
> `x-goog-api-key` — đúng như tài liệu Google hướng dẫn, khoá `AQ.` chạy bình thường.

**Bước 2 — Dán khoá vào Netlify**

Netlify → site `dbv247` → **Site configuration** → **Environment variables** → **Add a variable**:

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | chuỗi khoá vừa copy |

Tên biến phải đúng từng ký tự là **`GEMINI_API_KEY`**. Đặt là `GEMINI` hay
`GEMINI_KEY` thì code không đọc được và chatbot báo chưa cấu hình.

Hai biến dưới đây là tuỳ chọn, không khai thì dùng mặc định:

| Key | Mặc định | Ý nghĩa |
|---|---|---|
| `GEMINI_MODEL` | `gemini-3.6-flash` | Đổi model mà không cần sửa code |
| `CHAT_MAX_PER_HOUR` | `30` | Số lượt tối đa mỗi người mỗi giờ |
| `CHAT_MAX_PER_DAY` | `150` | Số lượt tối đa toàn site mỗi ngày |

Muốn rẻ hơn thì đặt `GEMINI_MODEL` = `gemini-3.5-flash-lite`. Muốn trả lời sâu
hơn thì `gemini-3.5-flash`. Google đổi tên model khá thường xuyên — khi model
mặc định bị khai tử, chỉ cần sửa biến này, không phải đụng vào code.

**Bước 3 — Deploy lại**

Biến môi trường chỉ có hiệu lực sau khi build lại. Netlify → **Deploys** → **Trigger deploy** → **Deploy site**.

> **Không bao giờ dán khoá API vào file HTML.** Khoá nằm trong biến môi trường, chỉ hàm phía server đọc được. Dán vào HTML là ai xem mã nguồn trang cũng lấy được và dùng hết hạn mức của bạn.

---

## 2. Chi phí

**Hiện tại đang chạy hoàn toàn miễn phí.** Với lưu lượng dự kiến khoảng 300 lượt/tháng
(~10 lượt/ngày), hạn mức miễn phí của Gemini thừa sức gánh. **Không cần bật
Cloud Billing.**

Chỉ cần cân nhắc trả phí khi nào:

- Lượng khách hỏi vượt khoảng 100 lượt/ngày, hoặc
- Bạn thấy chatbot báo lỗi vào buổi chiều đều đặn (dấu hiệu chạm hạn mức Google)

Khi đó mới bật thanh toán để lên Tier 1. Chi phí tham khảo: mỗi lượt hỏi gửi đi
khoảng 7.400 token đầu vào, ước chừng **50–150 đồng một lượt**. 1.000 lượt trong
tháng khoảng 100.000 đồng.

> **Gói Gemini Pro cá nhân KHÔNG dùng được cho chatbot này.**
> Quyền lợi của gói AI Pro chỉ áp dụng trong giao diện web của AI Studio (khi bạn
> ngồi chat thử trong Playground). Gọi API từ website được tính riêng hoàn toàn.
> Xem [Google AI Plans](https://ai.google.dev/gemini-api/docs/google-ai-plans).

### Hai lớp chặn để bảo vệ hạn mức miễn phí

| Lớp | Mặc định | Chặn chuyện gì |
|---|---|---|
| Theo IP, theo giờ | 30 lượt | Một người ngồi gõ liên tục |
| Toàn site, theo ngày | 150 lượt | Một đợt spam đốt sạch quota, chatbot chết cả ngày |

Trần theo ngày đếm theo **giờ Thái Bình Dương**, trùng nhịp reset của Google.
Chạm trần tự đặt thì khách nhận được lời nhắn tử tế kèm số hotline; để Google
chặn thì chỉ nhận về lỗi kỹ thuật.

Với 10 lượt/ngày, bạn còn cách trần rất xa. Cứ để nguyên mặc định.

> ### Chế độ suy nghĩ ăn token
>
> Các model Gemini 3 mặc định bật "thinking", và **token suy nghĩ bị tính tiền
> như token trả lời**, đồng thời trừ vào ngân sách đầu ra. Nếu để ngân sách hẹp
> thì model nghĩ hết sạch rồi câu trả lời bị cắt ngang giữa chừng.
>
> Code đã đặt `thinkingLevel: "low"` và nới ngân sách lên 2.400 token nên không
> còn bị cắt. Muốn tiết kiệm hơn nữa thì đặt `GEMINI_MODEL` =
> `gemini-3.5-flash-lite` — model này mặc định suy nghĩ ở mức tối thiểu.

Google có hạn mức miễn phí cho Gemini Flash, nhưng giới hạn số lượt mỗi ngày. Nếu website đông khách thì nên bật thanh toán trong Google AI Studio để không bị chặn giữa chừng.

Hai lớp chặn lạm phí đã có sẵn:

- Mỗi IP tối đa 30 lượt/giờ (đổi qua `CHAT_MAX_PER_HOUR`)
- Câu hỏi dài quá 600 ký tự bị cắt, chỉ gửi 10 lượt hội thoại gần nhất

---

## 3. Chatbot biết gì và không được nói gì

Kiến thức nền rút tự động từ chính nội dung website — 39 trang, gồm trang sản phẩm, trang bồi thường, và các bài tin tức. Mỗi lượt hỏi, hệ thống chọn 3 trang liên quan nhất gửi kèm câu hỏi, không gửi hết 135 KB.

Chỉ dẫn hệ thống buộc chatbot:

- Chỉ nói những gì có trong tư liệu. Không có thì trả lời thẳng là chưa có thông tin.
- **Không tự báo giá** cho một chiếc xe hay một người cụ thể. Riêng biểu phí TNDS bắt buộc thì được nêu vì đó là mức Nhà nước quy định.
- **Không khẳng định một tình huống cụ thể có hay không được bồi thường.** Được nêu nguyên tắc chung, nhưng phải kết lại rằng căn cứ chính thức là hợp đồng và hồ sơ thực tế.
- Không bịa con số, tên gara, tên bệnh viện, điều khoản, ngày tháng.
- Gặp khách đang cần bồi thường gấp thì đưa ngay 1900 969 690 lên đầu.

Đây là phần quan trọng nhất. Site bảo hiểm mà chatbot nói sai phạm vi bảo hiểm, khách tin theo rồi mua nhầm, đến lúc xảy ra chuyện mới biết không được bồi thường — thiệt hại đó không sửa được bằng một dòng đính chính.

**Nên kiểm tra sau khi bật.** Thử hỏi vài câu mà bạn biết chắc câu trả lời đúng, và vài câu bẫy kiểu "xe tôi bị ngập nước có được đền không". Nếu chatbot trả lời chắc nịch thay vì dẫn về tư vấn viên, báo lại để siết thêm chỉ dẫn.

---

## 4. Lead từ chatbot vào CRM ở đâu

Sau 2 lượt trao đổi, khung xin số điện thoại hiện ra. Khách nhập số → lead chảy vào Netlify Forms dưới tên form **`chatbot-lead`** → hiện ngay trong dashboard CRM cùng các lead khác.

Mỗi lead kèm theo:

- Số điện thoại
- Trang khách đang xem lúc chat
- **Nội dung 8 lượt chat gần nhất** — tư vấn viên gọi lại biết khách đang quan tâm gì, không phải hỏi lại từ đầu

Form ẩn `chatbot-lead` nằm cuối `index.html`. Netlify chỉ ghi nhận form nào nó thấy trong HTML lúc build, nên **xoá form ẩn đó đi là lead chatbot mất đường vào**.

---

## 5. Cập nhật kiến thức khi thêm bài viết mới

Chatbot không tự đọc trang mới. Sau khi thêm bài tin tức hoặc sửa nội dung sản phẩm:

```
cd G:\DBV247\netlify_upload
python _build_kb.py
```

Script ghi lại `netlify/functions/kb-data.js`. Push lên GitHub là xong.

Trang mới tự có khung chat nhờ skill `dbv-layout-sync` — chạy đồng bộ layout là script tự chèn thẻ `<script>` vào trang mới.

---

## 6. Theo dõi hiệu quả

Ba sự kiện được đẩy vào `dataLayer`, bạn tạo tag trong GTM để đưa sang GA4:

| Sự kiện | Khi nào | Dùng để |
|---|---|---|
| `chatbot_open` | Khách mở khung chat | Đo tỷ lệ khách quan tâm |
| `chatbot_reply` | Mỗi lượt trả lời | Đo độ sâu hội thoại |
| `generate_lead` (`lead_source: chatbot`) | Khách để lại số | Đo tỷ lệ chuyển đổi |

Con số đáng nhìn nhất: **bao nhiêu phần trăm người mở chat thì để lại số**. Dưới 5% nghĩa là chatbot trả lời xong khách thấy đủ rồi đi luôn — lúc đó cần chỉnh lời mời để lại số, chứ không phải chỉnh nội dung trả lời.

---

## 7. Khi chatbot báo "Trợ lý đang bận"

Đó là câu chung chung cố ý — khách không cần thấy lỗi kỹ thuật. Để xem lỗi thật,
mở Console của trình duyệt (F12) trên trang web và chạy:

```js
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-dashboard-key': 'KHOA_DASHBOARD_CUA_BAN' },
  body: JSON.stringify({ message: 'test' })
}).then(r => r.json()).then(console.log)
```

Có khoá dashboard thì hàm trả về lỗi gốc từ Google kèm tên model đang dùng.
Không có khoá thì vẫn chỉ thấy câu xin lỗi như khách thường.

Vài lỗi hay gặp:

| Lỗi gốc | Nguyên nhân |
|---|---|
| `Gemini 404: models/... is not found` | Tên model sai hoặc đã bị khai tử → sửa `GEMINI_MODEL` |
| `Gemini 429` | Hết hạn mức miễn phí → bật thanh toán trong AI Studio |
| `Gemini 400: API key not valid` | Khoá sai hoặc đã bị xoá |
| `finishReason: MAX_TOKENS` | Model nghĩ hết ngân sách → đổi sang `gemini-3.5-flash-lite` |
| Báo thiếu `GEMINI_API_KEY` | Sai tên biến, hoặc chưa deploy lại sau khi thêm biến |

Ngoài ra Netlify → **Functions** → `chat` có toàn bộ log, xem được cả khi không
dùng chế độ chẩn đoán.

## 8. Tệp liên quan

| Tệp | Vai trò |
|---|---|
| `netlify/functions/chat.js` | Gọi Gemini, lọc kiến thức, chặn lạm dụng |
| `netlify/functions/chat-lead.js` | Nhận số điện thoại, đẩy vào Netlify Forms |
| `netlify/functions/kb-data.js` | Kiến thức nền (sinh tự động, đừng sửa tay) |
| `assets/dbv-chatbot.js` | Khung chat phía trình duyệt |
| `_build_kb.py` | Sinh lại kiến thức nền |
| `_add_chatbot.py` | Nhúng khung chat vào toàn bộ trang |
