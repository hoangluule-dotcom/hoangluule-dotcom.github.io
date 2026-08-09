/* HTML dựng theo đúng dữ liệu thật quan sát được từ bonbanh.com/oto/toyota-vios-nam-2020 */
const tin=[
 ['6920202','1.5e-mt',2020,'310','Triệu','Đồng Nai','số tay','84,000'],
 ['6920142','1.5e-mt',2020,'315','Triệu','TP HCM','số tay','84,000'],
 ['6794512','1.5e-mt',2020,'310','Triệu','TP HCM','số tay','82,000'],
 ['6915576','1.5g',2020,'392','Triệu','Bình Dương','số tự động','86,000'],
 ['6919933','1.5g',2020,'379','Triệu','Hà Nội','số tự động','63,000'],
 ['6920783','1.5e-mt',2020,'310','Triệu','TP HCM','số tay','84,000'],
 ['6868922','1.5e-mt',2020,'285','Triệu','Quảng Ninh','số tay','70,000'],
 ['6793741','1.5e-mt',2020,'305','Triệu','Thanh Hóa','số tay','80'],
 ['6860888','1.5g',2020,'361','Triệu','Hải Phòng','số tự động','90,000'],
 ['6923644','1.5e-mt',2020,'300','Triệu','Bình Phước','số tay','97,000'],
 ['6919676','1.5e-mt',2020,'319','Triệu','TP HCM','số tay','84,000'],
 ['6902125','1.5e-cvt',2020,'330','Triệu','TP HCM','số tự động','70,000'],
 ['6926044','1.5g',2020,'383','Triệu','Bình Dương','số tự động','54,000'],
 ['6888118','1.5e-mt',2020,'269','Triệu','TP HCM','số tay','83,000'],
 ['6885870','1.5g',2020,'379','Triệu','Bà Rịa Vũng Tàu','số tự động','92,000'],
 ['6927486','1.5e-mt',2020,'295','Triệu','TP HCM','số tay','44,200'],
 ['6929056','1.5g',2020,'385','Triệu','Cần Thơ','số tự động','65,000'],
 ['6922616','1.5e-cvt',2020,'345','Triệu','Nghệ An','số tự động','120,000'],
 ['6914667','1.5e-mt',2020,'268','Triệu','Hải Phòng','số tay','0'],
 ['6926053','1.5e-cvt',2020,'370','Triệu','Hà Nội','số tự động','68,000'],
 ['9999001','1.5g',2020,'1','Triệu','Hà Nội','số tự động','50,000'],   // tin câu view
 ['9999002','1.5g',2020,'99','Tỷ','Hà Nội','số tự động','50,000'],     // gõ nhầm
];
function li(t){
 const [ma,ver,nam,gia,dv,tinh,hs,odo]=t;
 return `<li class="car-item">
 <a href="/xe-toyota-vios-${ver}-${nam}-${ma}" title="Ban xe oto cu Toyota Vios ${nam} ${ver.toUpperCase()} gia ${gia} ${dv} - ${tinh}">
  <div class="cb1"><h3>Toyota Vios ${ver.toUpperCase()} - ${nam}</h3></div>
  <div class="cb2"><b>${nam}</b></div>
  <div class="cb3">${gia} ${dv}</div>
  <div class="cb4">${tinh}</div>
  <img alt="Bán xe Toyota Vios ${nam} ${ver.toUpperCase()} giá ${gia} ${dv} - ${tinh}" src="/x.jpg"> Mã: ${ma}
  <div class="cb6">Xe lắp ráp trong nước, màu trắng, máy xăng 1.5 L, ${hs}, 5 chỗ , đã đi ${odo} km ... mô tả linh tinh</div>
 </a></li>`;
}
module.exports.html = `<html><body><div class="content">
<h1>Toyota Vios 2020</h1>
<div>Trang 1 / 3 ( <b>Tổng: 46 tin</b> )</div>
<ul class="car-list">${tin.map(li).join('\n')}</ul>
</div></body></html>`;
module.exports.htmlDoiGiaoDien = `<html><body>
<section><article data-id="7000001"><span class="p">450 Triệu</span></article></section>
<div>Trang 1 / 1 ( <b>Tổng: 12 tin</b> )</div>
</body></html>`;
module.exports.htmlRong = `<html><body><h1>Toyota Xyz 2020</h1><p>Không tìm thấy tin nào</p></body></html>`;
