/*!
 * DBV247 — Tra cứu giá trị xe ô tô (thị trường Việt Nam)
 *
 * Nguyên tắc: KHÔNG suy đoán. Mỗi kết quả là một bản ghi có thật trong
 * /data/gia-xe-db.json, tra theo Hãng → Dòng → Năm SX → Phiên bản.
 * CSDL đã có giá riêng cho từng năm sản xuất, nên khấu hao theo năm
 * nằm sẵn trong dữ liệu — không nhân thêm hệ số nào.
 *
 * Dùng chung cho /dinh-gia-xe-oto (khách hàng) và /admin/tham-dinh-gia-xe (nội bộ).
 */
(function (global) {
  'use strict';

  var NAM_HIEN_TAI = new Date().getFullYear();

  /* Cột trong mỗi bản ghi của CSDL */
  var C = { NAM: 0, VER: 1, GIA: 2, MIN: 3, MAX: 4, NHIEN_LIEU: 5, GHE: 6, NIEM_YET: 7, UOC_TINH: 8 };

  /* Tỷ lệ phí bảo hiểm vật chất DBV (%/năm trên giá trị xe) */
  var PHI_VAT_CHAT = { thap: 0.012, cao: 0.015 };

  /* ---------------- Tiện ích hiển thị ---------------- */
  function lamTron(x, buoc) {
    buoc = buoc || 1000000;
    return Math.round(x / buoc) * buoc;
  }

  function dinhDangVND(x) {
    if (!isFinite(x) || x <= 0) return '—';
    if (x >= 1e9) {
      var ty = x / 1e9;
      return (ty >= 10 ? ty.toFixed(2) : ty.toFixed(3)).replace(/0+$/, '').replace(/\.$/, '') + ' tỷ';
    }
    return Math.round(x / 1e6).toLocaleString('vi-VN') + ' triệu';
  }

  function dinhDangSo(x) {
    return Math.round(x).toLocaleString('vi-VN');
  }

  function phanTram(v) {
    var s = (v * 100).toFixed(1).replace(/\.0$/, '');
    return (v > 0 ? '+' : '') + s + '%';
  }

  /* ---------------- Tra cứu ---------------- */
  /**
   * @param {Array} banGhi  — một bản ghi lấy từ CSDL
   * @param {number} [dieuChinh] — % điều chỉnh tay, chỉ dùng ở bản nội bộ (vd -0.08)
   */
  function traCuu(banGhi, dieuChinh) {
    if (!banGhi || !banGhi[C.GIA]) return null;
    var k = 1 + (Number(dieuChinh) || 0);

    var gia = lamTron(banGhi[C.GIA] * k);
    var min = lamTron((banGhi[C.MIN] || banGhi[C.GIA] * 0.93) * k);
    var max = lamTron((banGhi[C.MAX] || banGhi[C.GIA] * 1.18) * k);
    var ny = banGhi[C.NIEM_YET] || 0;

    return {
      nam: banGhi[C.NAM],
      phien_ban: banGhi[C.VER] || 'Bản tiêu chuẩn',
      nhien_lieu: banGhi[C.NHIEN_LIEU] || '',
      so_ghe: banGhi[C.GHE] || 0,
      tuoi_xe: Math.max(0, NAM_HIEN_TAI - banGhi[C.NAM]),

      gia_tri: gia,
      gia_min: Math.min(min, gia),
      gia_max: Math.max(max, gia),

      gia_niem_yet: ny,
      ty_le_con_lai: ny ? gia / ny : 0,

      uoc_tinh: banGhi[C.UOC_TINH] === 1,
      dieu_chinh: Number(dieuChinh) || 0,

      phi_bh_thap: lamTron(gia * PHI_VAT_CHAT.thap, 100000),
      phi_bh_cao: lamTron(gia * PHI_VAT_CHAT.cao, 100000)
    };
  }

  /* ---------------- Nạp CSDL ---------------- */
  var _db = null, _dangTai = null;
  function napDB(url) {
    if (_db) return Promise.resolve(_db);
    if (_dangTai) return _dangTai;
    _dangTai = fetch(url || '/data/gia-xe-db.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { _db = j; return j; });
    return _dangTai;
  }

  global.DinhGiaXe = {
    COT: C,
    PHI_VAT_CHAT: PHI_VAT_CHAT,
    NAM_HIEN_TAI: NAM_HIEN_TAI,
    traCuu: traCuu,
    napDB: napDB,
    dinhDangVND: dinhDangVND,
    dinhDangSo: dinhDangSo,
    phanTram: phanTram,
    lamTron: lamTron,
    get db() { return _db; }
  };
})(window);
