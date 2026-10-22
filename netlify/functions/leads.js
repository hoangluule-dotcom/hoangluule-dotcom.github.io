/* DBV247 – Leads proxy (an toàn)
   Hàm này chạy phía server trên Netlify, giữ Access Token bí mật,
   không bao giờ gửi token ra trình duyệt. Trang dashboard.html gọi hàm này
   kèm 1 "khoá truy cập" (access key) để xác nhận đúng người trong team.

   Cần khai báo 2 biến môi trường trong Netlify:
   - NETLIFY_ACCESS_TOKEN : Personal Access Token của bạn (User settings > Applications > New access token)
   - DASHBOARD_KEY        : một mật khẩu bất kỳ do bạn tự đặt, chỉ team biết
*/

const SITE_ID = "df7ffacd-8e52-4769-b95b-23c978b36e29"; // site "dbv247" trên Netlify

const A = require("./lib/quan-tri-auth");
const crypto = require("node:crypto");

/* ── KHÁCH NHẬP TAY (22/10/2026) ───────────────────────────────────────────
   Khách từ Messenger, tin nhắn/bình luận TikTok, hotline… không đi qua form
   website. Nhân viên nhập ở CRM → nút "Thêm khách". Lưu ở Netlify Blobs (kho
   "dbv247-leads", khoá thu-cong/<id>) — KHÔNG đẩy vào Netlify Forms để không
   tốn hạn mức form và không bắn thông báo Telegram cho khách đã có người lo.
   Hàm GET gộp các khách này vào cùng danh sách với lead form, form_name =
   "thu-cong", nên CRM, bộ lọc, xuất CSV, tổng quan đều thấy như lead thường. */
const KENH_HOP_LE = ["messenger", "binh-luan-fb", "form-fb", "tiktok-tin-nhan", "binh-luan-tiktok",
  "form-tiktok", "zalo", "hotline", "gioi-thieu", "khac"];

function moKhoLead() {
  const { getStore } = require("@netlify/blobs");
  try {
    return getStore({ name: "dbv247-leads", consistency: "strong" });
  } catch (err) {
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!token) throw err;
    return getStore({ name: "dbv247-leads", siteID: process.env.SITE_ID || SITE_ID, token, consistency: "strong" });
  }
}

async function docKhachThuCong() {
  try {
    const kho = moKhoLead();
    const { blobs } = await kho.list({ prefix: "thu-cong/" });
    const ds = await Promise.all(blobs.map((b) => kho.get(b.key, { type: "json" }).catch(() => null)));
    return ds.filter(Boolean);
  } catch (err) {
    console.error("leads: không đọc được khách nhập tay", err.message);
    return [];
  }
}

async function themKhach(k, nv) {
  const sdtTho = String(k.dienThoai || "").replace(/[^\d+]/g, "");
  let sdt = sdtTho.startsWith("+84") ? "0" + sdtTho.slice(3) : sdtTho;
  if (/^84\d{9}$/.test(sdt)) sdt = "0" + sdt.slice(2);
  if (!/^0\d{9,10}$/.test(sdt)) return { statusCode: 400, body: JSON.stringify({ error: "Số điện thoại chưa đúng." }) };
  if (KENH_HOP_LE.indexOf(k.kenh) < 0) return { statusCode: 400, body: JSON.stringify({ error: "Chọn khách đến từ đâu." }) };
  const cat = (v, n) => String(v || "").trim().slice(0, n);
  const id = "tc-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
  const lead = {
    id, form_name: "thu-cong", created_at: new Date().toISOString(),
    data: {
      "ho-ten": cat(k.hoTen, 80), "dien-thoai": sdt, "san-pham": cat(k.sanPham, 120),
      "kenh-thu-cong": k.kenh, "chien-dich": cat(k.chienDich, 120), "ghi-chu": cat(k.ghiChu, 1000),
      "nhap-boi": nv.khoaChung ? cat(k.nguoiNhap, 80) || "Khoá chung" : nv.hoTen,
    },
  };
  await moKhoLead().setJSON("thu-cong/" + id, lead);
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, lead }) };
}

exports.handler = async function (event) {
  /* Quyền: Quản lý, Vận hành (xem lib/quan-tri-auth.js). Header x-dashboard-key
     nhận vé đăng nhập /quan-tri, hoặc khoá chung khi chưa tắt. */
  const q = await A.kiemQuyen(event, ["quan-ly", "van-hanh"]);
  if (q.loi) {
    return { statusCode: q.ma, body: JSON.stringify({ error: q.loi }) };
  }

  if (event.httpMethod === "POST") {
    let p = {};
    try { p = JSON.parse(event.body || "{}"); } catch (e) { /* bỏ qua */ }
    if (!p.khachMoi) return { statusCode: 400, body: JSON.stringify({ error: "Thiếu thông tin khách." }) };
    try {
      return await themKhach(p.khachMoi, q.nv);
    } catch (err) {
      console.error("leads: không lưu được khách nhập tay", err);
      return { statusCode: 500, body: JSON.stringify({ error: "Không lưu được, thử lại sau." }) };
    }
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

    (await docKhachThuCong()).forEach((l) => allSubmissions.push(l));

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
