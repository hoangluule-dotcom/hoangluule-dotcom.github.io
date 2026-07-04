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

    let allSubmissions = [];
    for (const form of forms) {
      const subRes = await fetch(
        `https://api.netlify.com/api/v1/forms/${form.id}/submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!subRes.ok) continue;
      const subs = await subRes.json();
      subs.forEach((s) => {
        allSubmissions.push({
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
