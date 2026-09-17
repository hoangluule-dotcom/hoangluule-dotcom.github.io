/* DBV247 – Leads proxy (an toàn)
   Hàm này chạy phía server trên Netlify, giữ Access Token bí mật,
   không bao giờ gửi token ra trình duyệt. Trang dashboard.html gọi hàm này
   kèm 1 "khoá truy cập" (access key) để xác nhận đúng người trong team.

   Cần khai báo 2 biến môi trường trong Netlify:
   - NETLIFY_ACCESS_TOKEN : Personal Access Token của bạn (User settings > Applications > New access token)
   - DASHBOARD_KEY        : một mật khẩu bất kỳ do bạn tự đặt, chỉ team biết
*/

const SITE_ID = "df7ffacd-8e52-4769-b95b-23c978b36e29"; // site "dbv247" trên Netlify

exports.handler = async function (event) {
  const providedKey = event.headers["x-dashboard-key"] || "";
  const expectedKey = process.env.DASHBOARD_KEY || "";

  if (!expectedKey || providedKey !== expectedKey) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Sai hoặc thiếu khoá truy cập (access key)." }),
    };
  }

  const token = process.env.NETLIFY_ACCESS_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Thiếu biến môi trường NETLIFY_ACCESS_TOKEN trên Netlify." }),
    };
  }

  try {
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!formsRes.ok) {
      return { statusCode: formsRes.status, body: JSON.stringify({ error: "Không lấy được danh sách form." }) };
    }
    const forms = await formsRes.json();

    /* PHẢI LẬT TRANG. API Netlify chặn per_page ở 100 và tự phân trang mọi
       kết quả quá 100 mục. Bản trước gọi /submissions không kèm tham số nào
       nên chỉ nhận được 100 lead — phần còn lại biến mất khỏi CRM mà không có
       lỗi nào hiện ra. Trần 200 trang để một lỗi phía API không treo hàm. */
    async function docHetBanGhi(formId) {
      const ra = [];
      for (let trang = 1; trang <= 200; trang++) {
        const r = await fetch(
          `https://api.netlify.com/api/v1/forms/${formId}/submissions?per_page=100&page=${trang}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!r.ok) break;
        const lo = await r.json();
        if (!Array.isArray(lo) || lo.length === 0) break;
        for (const x of lo) ra.push(x);
        if (lo.length < 100) break;
      }
      return ra;
    }

    let allSubmissions = [];
    for (const form of forms) {
      const subs = await docHetBanGhi(form.id);
      subs.forEach((s) => {
        allSubmissions.push({
          id: s.id,                 // dùng làm leadId để ghép với dữ liệu chăm sóc
          form_name: form.name,
          created_at: s.created_at,
          data: s.data,
        });
      });
    }

    allSubmissions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: allSubmissions.length, submissions: allSubmissions }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
