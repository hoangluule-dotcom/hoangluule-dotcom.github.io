/*!
 * DBV247 — Biểu phí bảo hiểm vật chất xe ô tô
 * Nguồn: QĐ 219/2026/QĐ-DBV, Phụ lục 01. Tỷ lệ % đã gồm VAT.
 *
 * ⚠ BIỂU PHÍ NÀY ĐANG NẰM Ở BA NƠI:
 *     1. file này                          — trang tính phí nội bộ
 *     2. bao-hiem-vat-chat-oto.html        — công cụ tính phí cho khách
 *     3. bao-hiem-oto-dien.html            — công cụ tính phí cho khách
 *
 *   Sửa biểu phí thì phải sửa cả ba. Chạy `node scripts/check_bieu_phi.js`
 *   để đối chiếu — script báo ngay khi ba bản trôi khỏi nhau.
 *
 *   Không gộp về một chỗ được vì hai trang sản phẩm không được phép sửa.
 *
 * NHÓM TUỔI XE (theo năm đăng ký lần đầu, tính theo tháng):
 *   [0] dưới 3 năm · [1] 3–dưới 6 · [2] 6–dưới 10 · [3] 10–dưới 15
 *   Quá mốc cuối -> ngoài phân cấp Chi nhánh, phải trình phê duyệt riêng.
 *
 * null trong bs02 = ĐKBS đó không thuộc phân cấp Chi nhánh cho nhóm tuổi ấy.
 */
(function (global) {
  'use strict';

  var TARIFF = {
    nkd: {
      ten: 'Xe chở người không KDVT đến 9 chỗ',
      uu_dai_hn: true,
      thuan: [0.96, 1.01, 1.15, 1.36],
      bs01: [0.00, 0.10, 0.10, 0.20],
      bs06: [0.10, 0.10, 0.10, 0.10],
      bands: [
        { max: 400e6, base: [1.75, 1.70, 2.10, 2.20], bs02: [0.20, 0.30, null, null] },
        { max: 600e6, base: [1.10, 1.00, 1.05, 1.05], bs02: [0.20, 0.30, null, null] },
        { max: 800e6, base: [0.95, 0.85, 0.90, 0.90], bs02: [0.20, 0.30, null, null] },
        { max: Infinity, base: [0.70, 0.60, 0.65, 0.70], bs02: [0.20, 0.30, 0.40, null] }
      ]
    },
    kd: {
      ten: 'Xe KDVT đến 9 chỗ / taxi công nghệ',
      uu_dai_hn: false,
      thuan: [1.10, 1.21, 1.32, 1.43],
      bs01: [0.00, 0.10, 0.10, 0.20],
      bs06: [0.10, 0.10, 0.10, 0.10],
      bands: [
        { max: 500e6, base: [1.50, 1.50, 1.80, 2.10], bs02: [0.20, 0.30, null, null] },
        { max: Infinity, base: [1.40, 1.45, 1.65, 1.85], bs02: [0.20, 0.30, null, null] }
      ]
    },
    pv: {
      ten: 'Xe pickup / xe van',
      uu_dai_hn: false,
      thuan: [1.13, 1.30, 1.38, 1.48],
      bs01: [0.00, 0.10, 0.10, 0.20],
      bs06: [0.10, 0.10, 0.10, 0.10],
      bands: [
        { max: 500e6, base: [1.20, 1.10, 1.15, 1.15], bs02: [0.20, 0.30, null, null] },
        { max: Infinity, base: [0.91, 0.92, 1.05, 1.05], bs02: [0.20, 0.30, 0.40, null] }
      ]
    }
  };

  var PHI_TOI_THIEU = 6000000;   // đã gồm cả 3 ĐKBS
  var STBH_TOI_THIEU = 50e6;
  var STBH_TOI_DA_DIEN = 10e9;   // xe điện trên mức này phải phê duyệt riêng
  var UU_DAI_HN = 0.10;

  var DKBS = {
    bs01: 'BS01 — Thay mới không khấu hao',
    bs02: 'BS02 — Chọn garage chính hãng',
    bs06: 'BS06 — Thuỷ kích'
  };

  /* ── Nhóm tuổi xe ──────────────────────────────────────────────────────────
     LƯU Ý CÓ MÂU THUẪN GIỮA HAI TRANG SẢN PHẨM:
       bao-hiem-vat-chat-oto.html  -> mọi nhóm xe hết phân cấp ở 15 năm
       bao-hiem-oto-dien.html      -> riêng nhóm kd hết phân cấp ở 10 năm,
                                      chú thích trong code ghi "PL05"
     Ở đây giữ đúng hành vi của từng trang để không lệch với báo giá đã gửi
     khách. Cần hỏi lại phòng nghiệp vụ xem PL05 áp cho cả xe xăng/dầu hay
     chỉ xe điện, rồi sửa cho thống nhất.                                     */
  function nhomTuoi(namDangKy, nhomXe, laXeDien) {
    var y = parseInt(namDangKy, 10);
    if (!y) return -1;
    var now = new Date();
    var thang = (now.getFullYear() - y) * 12 + now.getMonth();
    var motLen = (laXeDien && nhomXe === 'kd') ? 120 : 180;
    if (thang < 36) return 0;
    if (thang < 72) return 1;
    if (thang < 120) return 2;
    if (thang < motLen) return 3;
    return -1;
  }

  /**
   * Tính phí bảo hiểm vật chất.
   * @param {Object} p
   *   nhom_xe      'nkd' | 'kd' | 'pv'
   *   gia_tri_xe   số tiền (VNĐ)
   *   nam_dang_ky  năm đăng ký lần đầu
   *   khu_vuc      'hn' | 'khac'
   *   bs01,bs02,bs06  boolean
   *   xe_dien      boolean
   *   gia_tri_pin  số tiền (chỉ khi thuê pin) — STBH sẽ trừ đi phần này
   */
  function tinhPhi(p) {
    var cat = TARIFF[p.nhom_xe];
    if (!cat) return { ok: false, ly_do: 'nhom_xe_khong_hop_le' };

    var V = Math.round(Number(p.gia_tri_xe) || 0);
    var g = nhomTuoi(p.nam_dang_ky, p.nhom_xe, !!p.xe_dien);

    if (g < 0) {
      var moc = (p.xe_dien && p.nhom_xe === 'kd') ? 10 : 15;
      return {
        ok: false, ly_do: 'ngoai_phan_cap',
        thong_diep: 'Xe từ ' + moc + ' năm sử dụng nằm ngoài phân cấp Chi nhánh — phải trình phê duyệt riêng.'
      };
    }
    if (V < STBH_TOI_THIEU) {
      return { ok: false, ly_do: 'gia_tri_qua_thap', thong_diep: 'Giá trị xe dưới 50 triệu — không áp dụng biểu phí này.' };
    }
    if (p.xe_dien && V > STBH_TOI_DA_DIEN) {
      return { ok: false, ly_do: 'vuot_tran', thong_diep: 'Số tiền bảo hiểm trên 10 tỷ — phải trình phê duyệt riêng.' };
    }

    /* Phân khúc giá tra theo GIÁ TRỊ XE, còn phí tính trên SỐ TIỀN BẢO HIỂM.
       Hai con số này lệch nhau khi khách thuê pin. */
    var band = null;
    for (var i = 0; i < cat.bands.length; i++) { if (V < cat.bands[i].max) { band = cat.bands[i]; break; } }
    if (!band) band = cat.bands[cat.bands.length - 1];

    var r02 = band.bs02[g];
    var bs02Duoc = r02 !== null && r02 !== undefined;

    var giaTriPin = p.xe_dien ? Math.max(0, Math.round(Number(p.gia_tri_pin) || 0)) : 0;
    var STBH = Math.max(V - giaTriPin, 0);

    var d01 = !!p.bs01, d02 = !!p.bs02 && bs02Duoc, d06 = !!p.bs06;

    var tyLeGoc = band.base[g]
      + (d01 ? cat.bs01[g] : 0)
      + (d02 ? r02 : 0)
      + (d06 ? cat.bs06[g] : 0);

    var coUuDai = cat.uu_dai_hn && p.khu_vuc === 'hn' && !p.xe_dien;
    var tyLeSauUuDai = coUuDai ? tyLeGoc * (1 - UU_DAI_HN) : tyLeGoc;

    /* Không được xuống dưới phí thuần dù có ưu đãi. */
    var tyLeApDung = Math.max(tyLeSauUuDai, cat.thuan[g]);
    var chamSan = tyLeApDung > tyLeSauUuDai;

    var phi = STBH * tyLeApDung / 100;

    /* Phí tối thiểu 6 triệu tính cho gói đủ 3 ĐKBS. Bỏ ĐKBS nào thì trừ đi
       đúng phần phí của ĐKBS đó, không thì khách bỏ bớt quyền lợi mà vẫn
       phải đóng nguyên 6 triệu. */
    var phiToiThieu = PHI_TOI_THIEU;
    if (!d01) phiToiThieu -= STBH * cat.bs01[g] / 100;
    if (bs02Duoc && !d02) phiToiThieu -= STBH * r02 / 100;
    if (!d06) phiToiThieu -= STBH * cat.bs06[g] / 100;

    var apSan = false;
    if (phi < phiToiThieu) { phi = phiToiThieu; apSan = true; }

    return {
      ok: true,
      nhom_xe: p.nhom_xe,
      ten_nhom: cat.ten,
      nhom_tuoi: g,
      ten_nhom_tuoi: ['dưới 3 năm', '3 – dưới 6 năm', '6 – dưới 10 năm', '10 – dưới 15 năm'][g],
      gia_tri_xe: V,
      gia_tri_pin: giaTriPin,
      stbh: STBH,
      ty_le_co_ban: band.base[g],
      ty_le_goc: Math.round(tyLeGoc * 1000) / 1000,
      ty_le_ap_dung: Math.round(tyLeApDung * 1000) / 1000,
      uu_dai_hn: coUuDai,
      cham_san_phi_thuan: chamSan,
      phi_thuan: cat.thuan[g],
      bs02_duoc_phep: bs02Duoc,
      dkbs: {
        bs01: { chon: d01, ty_le: cat.bs01[g] },
        bs02: { chon: d02, ty_le: bs02Duoc ? r02 : null },
        bs06: { chon: d06, ty_le: cat.bs06[g] }
      },
      phi: Math.round(phi),
      ap_phi_toi_thieu: apSan,
      phi_toi_thieu_quy_doi: Math.round(phiToiThieu)
    };
  }

  function dinhDangVND(x) {
    return Math.round(Number(x) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  }
  function dinhDangTyLe(x) {
    return Number(x).toFixed(3).replace('.', ',').replace(/,?0+$/, '').replace(/^(\d+)$/, '$1,0') + '%';
  }

  global.BieuPhiDBV = {
    TARIFF: TARIFF,
    DKBS: DKBS,
    PHI_TOI_THIEU: PHI_TOI_THIEU,
    UU_DAI_HN: UU_DAI_HN,
    nhomTuoi: nhomTuoi,
    tinhPhi: tinhPhi,
    dinhDangVND: dinhDangVND,
    dinhDangTyLe: dinhDangTyLe,
    nguon: 'QĐ 219/2026/QĐ-DBV, Phụ lục 01'
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).BieuPhiDBV;
}
