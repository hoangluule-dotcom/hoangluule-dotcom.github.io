/* Nguồn: Bonbanh.com — nguồn giá chính
   ---------------------------------------------------------------------------
   Bọc lại thư viện lib/bonbanh.js cho khớp giao diện adapter. Toàn bộ logic
   đọc trang vẫn nằm ở file cũ; ở đây chỉ đổi hình dạng dữ liệu trả ra.

   Vì sao Bonbanh là nguồn chính: robots.txt cho phép, trang render sẵn phía
   server, có URL riêng cho từng đời xe, và số tin dày nhất trong các nguồn đã
   khảo sát — 46 tin cho riêng Vios 2020, so với 2 tin của Carmudi.
*/

"use strict";

const BB = require("../bonbanh.js");

module.exports = {
  ma: "bonbanh",
  ten: "Bonbanh.com",
  tin_moi_trang: 20,
  uu_tien: 1,

  async quet({ hang, dong, nam, slugDaBiet }) {
    const kq = await BB.docGiaThiTruong({ hang, dong, nam, soTrang: 2, slugDaBiet });
    if (!kq.ok) {
      return { tin: [], url_goc: kq.url_goc || null, ly_do: kq.ly_do, chan_doan: kq.chan_doan };
    }
    return {
      tin: kq.tin_tho || [],
      tong_tin_trang: kq.chan_doan ? kq.chan_doan.tong_tin_trang : null,
      url_goc: kq.url_goc,
      slug: kq.slug
    };
  }
};
