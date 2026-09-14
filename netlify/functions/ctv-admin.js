/* DBV247 — API màn hình quản trị cộng tác viên
   ---------------------------------------------------------------------------
   GET /.netlify/functions/ctv-admin
       header: x-dashboard-key: <DASHBOARD_KEY>

   Trả về danh sách cộng tác viên kèm lượt bấm link, số đơn và doanh thu, cộng
   toàn bộ đơn TNDS để màn hình tự lọc.

   Dùng lại đúng khoá DASHBOARD_KEY của dashboard lead — không thêm mật khẩu
   mới phải giữ. Ai mở được CRM thì mở được màn hình này.

   HAI NGUỒN DỮ LIỆU, MỖI NGUỒN MỘT VIỆC
     Netlify Blobs   → hồ sơ cộng tác viên và bộ đếm lượt bấm link
     Netlify Forms   → đơn hàng (form dbv-capdon-tnds)
   Đơn KHÔNG nhân bản sang Blobs. Một nguồn sự thật cho đơn, đúng nơi nó vốn
   nằm, nên không có chuyện hai chỗ lệch nhau.

   CHƯA CÓ HOA HỒNG Ở BẢN NÀY — cố ý.
   Hoa hồng chỉ được sinh khi dòng sao kê ngân hàng đã khớp với đơn (xem
   TU-VAN_MO-HINH-CTV_SDT-QR-SHEETS.md, mục 4). Màn hình này hiển thị DOANH THU
   GHI NHẬN — tức khách đã bấm "tôi đã chuyển khoản" — chứ không phải tiền đã
   về tài khoản. Hai con số đó khác nhau, và gọi nhầm tên là nguồn tranh cãi
   với cộng tác viên.
*/

'use strict';

const K = require('./lib/ctv-kho');

function kiemKhoa(event) {
  const h = event.headers || {};
  const daGui = h['x-dashboard-key'] || h['X-Dashboard-Key'] || '';
  const mong = process.env.DASHBOARD_KEY || '';
  if (!mong) return 'Thiếu biến môi trường DASHBOARD_KEY trên Netlify.';
  if (daGui !== mong) return 'Sai hoặc thiếu khoá truy cập.';
  return null;
}

/* Đọc mọi hồ sơ cộng tác viên trong kho. */
async function docMoiCtv(kho) {
  const ds = await kho.list({ prefix: 'ctv/' });
  const khoa = (ds && ds.blobs ? ds.blobs : []).map((b) => b.key);
  const ban = await Promise.all(
    khoa.map((k) => kho.get(k, { type: 'json' }).catch(() => null))
  );
  return ban.filter(Boolean);
}

exports.handler = async function (event) {
  const loiKhoa = kiemKhoa(event);
  if (loiKhoa) return K.json(401, { error: loiKhoa });

  if (event.httpMethod !== 'GET') return K.json(405, { error: 'Chỉ nhận GET.' });

  let kho;
  try {
    kho = K.moKho();
  } catch (err) {
    return K.json(500, { error: String(err.message || err) });
  }

  let dsCtv, donHang;
  try {
    dsCtv = await docMoiCtv(kho);
  } catch (err) {
    return K.json(500, { error: 'Lỗi đọc danh sách cộng tác viên: ' + String(err.message || err) });
  }

  /* Đơn hàng nằm ở Netlify Forms. Nếu chưa khai NETLIFY_ACCESS_TOKEN thì vẫn
     trả về danh sách cộng tác viên, kèm lời nhắc — thà hiện được một nửa còn
     hơn hiện một trang lỗi trắng. */
  let loiDon = null;
  try {
    donHang = await K.docDonHang();
  } catch (err) {
    donHang = [];
    loiDon = String(err.message || err);
  }

  /* Lead của sản phẩm KHÔNG bán online. Giai đoạn 1 không trả hoa hồng cho
     những sản phẩm này — đếm ở đây là để đo xem có đáng mở rộng phạm vi hay
     không, sau một mùa mới quyết. */
  let lead = [];
  try {
    lead = await K.docLead();
  } catch (err) {
    lead = [];
  }
  const leadTheoMa = {};
  lead.forEach((l) => {
    leadTheoMa[l.ma_ctv] = (leadTheoMa[l.ma_ctv] || 0) + 1;
  });

  /* Gom đơn theo mã cộng tác viên */
  const theoMa = {};
  let donKhongGan = 0;
  let doanhThuKhongGan = 0;

  donHang.forEach((d) => {
    const daCk = d.trang_thai === K.TT_DA_CK;
    if (!d.ma_ctv) {
      donKhongGan++;
      if (daCk) doanhThuKhongGan += d.tong_phi;
      return;
    }
    const o = theoMa[d.ma_ctv] || (theoMa[d.ma_ctv] = {
      so_don: 0, so_don_da_ck: 0, doanh_thu: 0, doanh_thu_cho: 0,
    });
    o.so_don++;
    if (daCk) { o.so_don_da_ck++; o.doanh_thu += d.tong_phi; }
    else { o.doanh_thu_cho += d.tong_phi; }
  });

  /* Lượt bấm link — đọc song song, 90 ngày gần nhất */
  const luot = await Promise.all(
    dsCtv.map((c) => K.demLuotBam(kho, c.ma_ctv, 90).catch(() => 0))
  );

  const ds = dsCtv.map((c, i) => {
    const o = theoMa[c.ma_ctv] || {};
    return {
      ma_ctv: c.ma_ctv,
      ho_ten: c.ho_ten,
      sdt: c.sdt,
      email: c.email || null,
      trang_thai: c.trang_thai,
      ngan_hang: c.ngan_hang || null,
      so_tai_khoan: c.so_tai_khoan || null,
      chu_tai_khoan: c.chu_tai_khoan || null,
      ngay_tao: c.ngay_tao,
      dang_nhap_cuoi: c.dang_nhap_cuoi || null,
      luot_bam_90n: luot[i] || 0,
      so_don: o.so_don || 0,
      so_don_da_ck: o.so_don_da_ck || 0,
      doanh_thu: o.doanh_thu || 0,        // đơn khách đã báo chuyển khoản
      doanh_thu_cho: o.doanh_thu_cho || 0, // đơn còn chờ tiền về
      /* Lead sản phẩm khác — CHƯA sinh hoa hồng, chỉ để đo */
      lead_sp_khac: leadTheoMa[c.ma_ctv] || 0,
    };
  });

  /* Cộng tác viên mới nhất lên trên khi chưa có đơn nào; có đơn thì xếp theo
     doanh thu — người làm được việc phải nhìn thấy đầu tiên. */
  ds.sort((a, b) => (b.doanh_thu - a.doanh_thu) ||
                    (b.so_don - a.so_don) ||
                    String(b.ngay_tao).localeCompare(String(a.ngay_tao)));

  return K.json(200, {
    ok: true,
    cap_nhat: new Date().toISOString(),
    canh_bao_don: loiDon,
    tong: {
      so_ctv: ds.length,
      so_ctv_co_don: ds.filter((x) => x.so_don > 0).length,
      luot_bam_90n: ds.reduce((t, x) => t + x.luot_bam_90n, 0),
      so_don_co_ctv: ds.reduce((t, x) => t + x.so_don, 0),
      so_don_khong_gan: donKhongGan,
      doanh_thu_co_ctv: ds.reduce((t, x) => t + x.doanh_thu, 0),
      doanh_thu_khong_gan: doanhThuKhongGan,
      lead_sp_khac: lead.length,
    },
    /* Nói rõ phạm vi để màn hình không phải đoán, và để sau này mở rộng thì
       chỉ đổi ở một chỗ. */
    pham_vi_hoa_hong: ['TNDS ô tô', 'TNDS xe máy'],
    ctv: ds,
    /* Đơn có gắn mã, mới nhất trước — để màn hình bung chi tiết theo từng CTV */
    don: donHang
      .filter((d) => d.ma_ctv)
      .sort((a, b) => String(b.thoi_diem).localeCompare(String(a.thoi_diem)))
      .slice(0, 500),
    /* Đơn KHÔNG mang mã cộng tác viên.
       Đây là ô cửa sổ để soi đúng một câu hỏi: đơn có về tới hệ thống không,
       và nếu có thì nó mất mã ở đâu. Không có danh sách này thì mỗi lần cộng
       tác viên báo "mất đơn" đều phải mở thẳng Netlify Forms mới trả lời được,
       mà lúc đó thì đã mất niềm tin rồi.
       Chỉ 50 đơn gần nhất, và không mang tên/số điện thoại/CCCD/địa chỉ khách
       — thông tin khách xem ở CRM, không phải ở đây. */
    don_khong_gan: donHang
      .filter((d) => !d.ma_ctv)
      .sort((a, b) => String(b.thoi_diem).localeCompare(String(a.thoi_diem)))
      .slice(0, 50)
      .map((d) => ({
        thoi_diem: d.thoi_diem,
        ma_don: d.ma_don,
        bien_so: d.bien_so,
        chi_tiet_xe: d.chi_tiet_xe,
        loai_xe: d.loai_xe,
        tong_phi: d.tong_phi,
        trang_thai: d.trang_thai,
        /* Trường này gần như luôn rỗng ở đơn không gắn mã — nhưng nếu nó CÓ
           giá trị mà mã lại rỗng thì đó là dấu vết của lỗi phía trình duyệt,
           đáng để nhìn thấy. */
        nguon_ghi_nhan: d.nguon_ghi_nhan,
      })),
    lead: lead
      .sort((a, b) => String(b.thoi_diem).localeCompare(String(a.thoi_diem)))
      .slice(0, 500),
  });
};
