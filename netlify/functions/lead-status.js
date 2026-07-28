/* DBV247 – Lead status store (Netlify Blobs)
   Lưu phần "chăm sóc khách hàng" cho từng lead: trạng thái, người phụ trách,
   lịch hẹn gọi lại, và lịch sử ghi chú.

   Lead gốc vẫn nằm nguyên ở Netlify Forms (hàm leads.js đọc ra) — hàm này
   KHÔNG đụng vào dữ liệu gốc, chỉ lưu thêm phần vận hành rồi ghép lại theo leadId.

   Biến môi trường cần có trên Netlify:
   - DASHBOARD_KEY : mật khẩu chung của team (đã dùng cho leads.js)

   Netlify Blobs tự động khả dụng, không cần cấu hình thêm.

   API:
   GET  /.netlify/functions/lead-status            → trả về toàn bộ { leadId: record }
   POST /.netlify/functions/lead-status            → ghi 1 bản ghi
        body: { leadId, patch: {...}, actor: "Tên nhân viên", activity?: {...} }
*/

const { getStore } = require("@netlify/blobs");

const STORE_NAME = "dbv247-leads";
const BLOB_KEY = "care-records";

const STAGES = ["moi", "da-lien-he", "dang-tu-van", "chot", "khong-thanh"];

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function checkKey(event) {
  const provided = event.headers["x-dashboard-key"] || "";
  const expected = process.env.DASHBOARD_KEY || "";
  if (!expected) return "Thiếu biến môi trường DASHBOARD_KEY trên Netlify.";
  if (provided !== expected) return "Sai hoặc thiếu khoá truy cập.";
  return null;
}

exports.handler = async function (event) {
  const keyError = checkKey(event);
  if (keyError) return json(401, { error: keyError });

  let store;
  try {
    store = getStore({ name: STORE_NAME, consistency: "strong" });
  } catch (err) {
    return json(500, { error: "Không khởi tạo được Netlify Blobs: " + String(err) });
  }

  // ── Đọc toàn bộ bản ghi chăm sóc ──
  if (event.httpMethod === "GET") {
    try {
      const records = (await store.get(BLOB_KEY, { type: "json" })) || {};
      return json(200, { records });
    } catch (err) {
      return json(500, { error: "Lỗi đọc dữ liệu: " + String(err) });
    }
  }

  // ── Ghi 1 bản ghi ──
  if (event.httpMethod === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (err) {
      return json(400, { error: "Body không phải JSON hợp lệ." });
    }

    const { leadId, patch = {}, actor = "Không rõ", activity = null } = payload;
    if (!leadId) return json(400, { error: "Thiếu leadId." });

    if (patch.stage && STAGES.indexOf(patch.stage) === -1) {
      return json(400, { error: "Trạng thái không hợp lệ: " + patch.stage });
    }

    try {
      const records = (await store.get(BLOB_KEY, { type: "json" })) || {};
      const now = new Date().toISOString();

      const current = records[leadId] || {
        stage: "moi",
        owner: null,
        nextFollowUp: null,
        activities: [],
        createdAt: now,
      };

      // Gộp thay đổi
      const updated = {
        ...current,
        ...patch,
        updatedAt: now,
        updatedBy: actor,
      };

      // Thêm dòng lịch sử nếu có
      if (activity && activity.text) {
        updated.activities = [
          {
            at: now,
            actor: actor,
            type: activity.type || "note",
            text: String(activity.text).slice(0, 2000),
          },
          ...(current.activities || []),
        ].slice(0, 200);
      }

      records[leadId] = updated;
      await store.setJSON(BLOB_KEY, records);

      return json(200, { ok: true, leadId, record: updated });
    } catch (err) {
      return json(500, { error: "Lỗi ghi dữ liệu: " + String(err) });
    }
  }

  return json(405, { error: "Method không được hỗ trợ." });
};
