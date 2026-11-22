/* DBV247 — CÁC TẦNG 2–7 CỦA DBV BUILDING trong văn phòng 3D
   ===========================================================================
   Tệp này CHỈ được tải khi khách bấm thang máy và chọn một tầng trên (xem index.html,
   mục THANG MÁY). Khách chỉ dạo tầng 1 thì không tải phần này.

   Mỗi tầng dựng đúng theo mặt bằng đã chốt (canvas "DBV Building — Mặt bằng các tầng"):
   sàn 30 × 24 m nằm trong khối tháp (x -15…15, z -12.9…11.1), lõi thang máy + thang bộ
   + WC trùng vị trí tầng 1. Tường giáp mặt ngoài tòa nhà là vách kính trong suốt, nhìn ra
   phố thật ở đúng độ cao của tầng.
   Tọa độ mặt bằng (u, v) → thế giới: x = u − 15, z = v − 12.9. Tầng n: sàn ở y = 6 + (n−2)·3,6.
   Một tầng chỉ dựng lần đầu khách tới, rồi giữ lại (ẩn khi rời tầng). */
(function () {
'use strict';
const PLAN = {"core":[["Thang máy 1","",11.4,0,13.6,2.5,"core"],["Thang máy 2","",13.6,0,15.8,2.5,"core"],["Sảnh thang máy","",11.4,2.5,15.8,6.6,"core"],["Thang bộ","",15.8,0,18.6,6.6,"core"],["WC Nam","",18.6,0,20.4,6.6,"svc"],["WC Nữ","",20.4,0,22.2,6.6,"svc"]],"coreDoors":[["h",13.6,6.6,3.6,"open"],["h",17.2,6.6,1.2],["h",19.5,6.6,0.9],["h",21.3,6.6,0.9],["h",12.5,2.5,1.2],["h",14.7,2.5,1.2]],"floors":{"2":{"title":"Tầng 2 — Ban Giám đốc","sub":"1 Giám đốc · 1 Phó Giám đốc","rooms":[["Phòng họp trực tuyến","8 chỗ · họp với tập đoàn",0,0,11.4,6.6,"meet"],["Kho hồ sơ mật – lưu trữ","",22.2,0,30,6.6,"store"],["Phòng tiếp khách VIP","",0,8.6,11,13.6,"lead"],["Pantry","",25,8.6,30,13.6,"svc"],["Phòng Giám đốc","",0,13.6,11,24,"lead"],["Phòng nghỉ","",0,19.8,3.4,24,"lead"],["WC riêng","",3.4,21.8,5.6,24,"svc"],["Phòng họp Ban GĐ","16 chỗ",11,13.6,22,24,"meet"],["Phòng Phó Giám đốc","",22,13.6,30,24,"lead"]],"zones":[["","",22.2,6.6,30,8.6,"zone"],["Sảnh tầng · khu chờ","",11,8.6,25,13.6,"zone"]],"furn":[["Bàn họp 8 chỗ",1.6,2,7.6,4.6],["Màn hình + camera hội nghị",8.6,1.6,10.8,5],["Kệ hồ sơ",22.6,1.6,29.6,2.6],["Tủ hồ sơ (khóa)",22.6,4.4,27,5.6],["Két",28.2,4.4,29.6,6],["Sofa VIP",0.6,10,5.4,12.8],["Bàn trà",6,10.6,7.8,12.2,"o"],["Tủ trưng bày",8.4,10,10.6,11.2],["Sofa chờ",11.6,10,14.8,12.4],["Ghế chờ",15.6,10,18,11.2],["Cây xanh",23,10,24.4,11.4,"o"],["Tường logo DBV",15,12.8,21.6,13.4,"hl"],["Quầy pha chế",25.4,10,29.6,11],["Tủ lạnh",28.2,11.8,29.6,13.2],["Tủ tựa lưng",0.3,14.8,0.9,19.4],["Ghế GĐ",1.1,16.3,2.1,17.5,"hl"],["Bàn GĐ · nhìn ra cửa →",2.3,15.2,4.1,18.6,"hl"],["Ghế khách",4.6,15.8,5.6,16.8],["Ghế khách",4.6,17,5.6,18],["Sofa tiếp khách",6.2,20.4,10.6,23.4],["Giường",0.4,21.2,2.6,23.6],["Bàn họp 16 chỗ",13,16.4,20,21],["Màn hình LED",13.4,23.2,19.6,23.7,"hl"],["Tủ âm tường",21.2,15.4,21.8,22.4],["Tủ tựa lưng",29.1,14.8,29.7,19.4],["Ghế PGĐ",27.9,16.3,28.9,17.5,"hl"],["← nhìn ra cửa · Bàn PGĐ",25.9,15.2,27.7,18.6,"hl"],["Ghế khách",24.4,15.8,25.4,16.8],["Ghế khách",24.4,17,25.4,18],["Sofa",23.2,20.6,28,22.4],["Bàn trà",24.6,22.8,26.6,23.6]],"doors":[["h",9.5,6.6,1.2],["h",25,6.6,1.2],["h",9.4,8.6,1.2],["h",27.6,8.6,1],["h",10,13.6,1.2],["v",11,15.4,1],["h",16.5,13.6,1.8],["h",23.4,13.6,1.1],["v",3.4,20.8,0.9],["h",4.5,21.8,0.8]],"skip":["Phòng nghỉ","WC riêng"]},"3":{"title":"Tầng 3 — Tài chính – Kế toán","sub":"quản lý thu chi, phí bảo hiểm, bồi thường","rooms":[["Kho lưu trữ chứng từ","",0,0,7,6.6,"store"],["In – scan – hủy tài liệu","",7,0,11.4,6.6,"svc"],["Phòng ngân quỹ","cửa từ · camera",22.2,0,30,6.6,"store"],["Kế toán trưởng","",0,8.6,7,13.6,"lead"],["Phòng họp đối soát","8 chỗ",16,8.6,23,13.6,"meet"],["Trưởng phòng TC – KT","",23,8.6,30,14,"lead"],["Kiểm soát nội bộ","",23,14,30,19,"work"],["Pantry – góc nghỉ","",23,19,30,24,"social"]],"zones":[["","",22.2,6.6,30,8.6,"zone"],["Quầy giao dịch nội bộ","nộp chứng từ, hồ sơ thanh toán",7,8.6,16,11.6,"zone"],["Khu làm việc Kế toán","",0,13.6,23,24,"work"]],"furn":[["Kệ di động",0.5,1.6,6.5,2.6],["Kệ di động",0.5,3.4,6.5,4.4],["Máy in A3",7.4,1.8,9.4,3],["Máy hủy",9.8,1.8,11,3],["Bàn scan",7.4,4.4,11,5.6],["Két sắt",22.6,1.6,24.2,3],["Két sắt",24.6,1.6,26.2,3],["Bàn kiểm đếm · máy đếm tiền",26.6,1.6,29.6,3.4],["Tủ ấn chỉ",22.6,4.6,25.6,5.8],["Bàn KTT",2,10.4,5.6,11.6],["Tủ hồ sơ",0.4,9.8,1.2,13.2],["Quầy kính 3 ô",8,10.2,15,11.2,"hl"],["Tủ hồ sơ đang xử lý",8,12,15,13.2],["Bàn họp 8 chỗ",17.6,10.6,21.4,12.4],["Bàn TP",24.4,10.6,28.4,12],["Bàn KSNB ×2",24,15.8,29,17.2],["Quầy pha trà",23.6,20.4,26.6,21.4],["Bàn ăn nhẹ",26.8,21.4,29.2,23.2,"o"],["Kế toán tổng hợp · 6 chỗ",1,15,6.4,18],["Thanh toán – công nợ · 6 chỗ",8.6,15,14,18],["Thuế – báo cáo · 4 chỗ",16.2,15,21.6,18],["Thu phí bảo hiểm · 6 chỗ",1,19.8,6.4,22.8],["Chi bồi thường · 6 chỗ",8.6,19.8,14,22.8],["Hoa hồng CTV – đại lý · 4 chỗ",16.2,19.8,21.6,22.8]],"doors":[["h",4,6.6,1.2],["h",9.2,6.6,1],["h",26,6.6,1.2],["h",5.6,8.6,1],["h",3,13.6,1],["h",21.6,8.6,1],["h",28.4,8.6,1],["v",23,16.4,1],["v",23,21.4,1],["h",11.5,11.6,4,"open"]],"skip":[]},"4":{"title":"Tầng 4 — Nhân sự – Tổng hợp","sub":"nhân sự, hành chính, pháp chế, IT","rooms":[["Phòng IT – máy chủ","",0,0,5,6.6,"svc"],["Kho VPP – thiết bị","",5,0,11.4,6.6,"store"],["Văn thư – lưu trữ hồ sơ nhân sự","",22.2,0,30,6.6,"store"],["TP Nhân sự","",0,8.6,6,13,"lead"],["Phòng trao đổi 1:1","",6,8.6,10,13,"meet"],["Phỏng vấn 1","",10,8.6,13.4,12,"meet"],["Phỏng vấn 2","",13.4,8.6,16.8,12,"meet"],["TP Hành chính – Tổng hợp","",24,8.6,30,13,"lead"],["Phòng đào tạo","36 chỗ · đào tạo nhân viên, CTV",0,13,10,24,"meet"]],"zones":[["","",22.2,6.6,30,8.6,"zone"],["Chờ ứng viên","",16.8,8.6,20,12,"zone"],["Quầy hỗ trợ nhân viên","",20,8.6,24,13,"zone"],["Khu làm việc Nhân sự","",10,12,20,24,"work"],["Khu Hành chính – Tổng hợp","",20,13,30,24,"work"]],"furn":[["Tủ rack máy chủ",0.5,1.6,2.4,3],["Điều hòa chính xác",2.8,1.6,4.6,2.6],["Bàn IT",0.5,4.6,4.6,5.8],["Kệ VPP",5.4,1.6,11,2.6],["Kệ thiết bị",5.4,3.8,11,4.8],["Tủ hồ sơ nhân sự (khóa)",22.6,1.6,29.6,2.6],["Bàn văn thư",22.6,4.2,26,5.4],["Máy photo",27,4.2,29.6,5.6],["Bàn TP",1,10.2,4.6,11.4],["Bàn tròn 2 ghế",7,10.4,9,12.2,"o"],["Bàn PV",10.6,10,12.8,11.2],["Bàn PV",14,10,16.2,11.2],["Ghế chờ",17.2,10.2,19.6,11.4],["Quầy cấp phát VPP · thẻ ra vào",20.4,11.6,23.6,12.6,"hl"],["Bàn TP",25.2,10.2,28.8,11.4],["Màn chiếu",1.6,14.4,8.4,14.8,"hl"],["Bàn học · 3 dãy",1,16,9,21.4],["Bàn giảng viên",3.4,22.2,6.6,23.4],["Tuyển dụng · 4 chỗ",11,14.2,15,16.8],["C&B – lương thưởng · 4 chỗ",15.6,14.2,19.4,16.8],["Đào tạo – phát triển · 4 chỗ",11,18.4,15,21],["Tủ hồ sơ",15.6,18.4,19.4,19.4],["Hành chính · 4 chỗ",21,14.4,25,17],["Pháp chế · 2 chỗ",26,14.4,29.4,17],["IT helpdesk · 2 chỗ",21,18.6,25,21.2],["Máy in chung",26,18.6,29.4,19.8],["Cây xanh",26.6,21.6,28.4,23.2,"o"]],"doors":[["h",2.5,6.6,1],["h",9,6.6,1.2],["h",25,6.6,1.2],["h",4.6,8.6,1],["h",8.6,8.6,1],["h",12.4,8.6,1],["h",15.8,8.6,1],["h",28.6,8.6,1],["v",10,15,1.6],["h",18.4,12,3,"open"],["h",22,13,3.6,"open"]],"skip":[]},"5":{"title":"Tầng 5 — Marketing","sub":"nội dung, thiết kế, quảng cáo, website","rooms":[["Studio quay – chụp","",0,0,7.6,6.6,"meet"],["Phòng thu – lồng tiếng","cách âm",7.6,0,11.4,6.6,"svc"],["Kho ấn phẩm – quà tặng","standee, tờ rơi",22.2,0,30,6.6,"store"],["Phòng livestream","",0,8.6,5,13.6,"social"],["Phòng họp sáng tạo","10 chỗ",5,8.6,11,13.6,"meet"],["Phòng dựng video","",19,8.6,24,13.6,"svc"],["TP Marketing","",24,8.6,30,13.6,"lead"]],"zones":[["","",22.2,6.6,30,8.6,"zone"],["Sảnh trưng bày ấn phẩm","",11,8.6,19,11.6,"zone"],["Khu làm việc Marketing","",0,13.6,30,24,"work"]],"furn":[["Phông xanh",0.4,1.4,4,2],["Đèn",4.6,1.6,5.6,2.6,"o"],["Đèn",6.2,1.6,7.2,2.6,"o"],["Máy quay",2,4.4,3.6,5.6],["Bàn sản phẩm",4.4,4.2,7,5.4],["Buồng thu",8,1.4,11,3.4],["Bàn mix",8,4.6,11,5.8],["Kệ ấn phẩm",22.6,1.6,29.6,2.6],["Standee",22.6,3.6,25,4.4],["Thùng quà tặng",25.6,3.6,29.6,4.8],["Bàn + đèn ring",0.6,10.6,4.4,12.2],["Bàn họp",6,10.6,10,12.2],["Tường kính viết bảng",5.2,13,10.8,13.4,"hl"],["Kệ trưng bày ấn phẩm DBV",11.6,9.4,15,10.4,"hl"],["Màn hình chiến dịch",15.6,9.4,18.6,10.4,"hl"],["Máy dựng ×2",19.6,10.4,23.4,11.8],["Bàn TP",25.2,10.4,28.8,11.6],["Content & Social · 6 chỗ",1,15.2,6.6,18],["Thiết kế · 5 chỗ",8,15.2,13.6,18],["Video · 4 chỗ",15,15.2,20.6,18],["Quảng cáo Ads · 4 chỗ",22,15.2,27.6,18],["Website – SEO · 4 chỗ",1,19.8,6.6,22.6],["CRM – dữ liệu khách · 3 chỗ",8,19.8,13.6,22.6],["Bàn in mẫu – duyệt",15,19.8,19,21.4],["Lounge sáng tạo · ghế lười",21,19.6,29.2,23.2,"o"]],"doors":[["h",4,6.6,1.2],["h",9.6,6.6,1],["h",25,6.6,1.2],["h",3.6,8.6,1],["h",9.6,8.6,1],["h",20.2,8.6,1],["h",28.6,8.6,1],["h",15,11.6,6,"open"]],"skip":[]},"6":{"title":"Tầng 6 — Phòng ăn","sub":"nhà ăn nhân viên ~150 chỗ","rooms":[["Bếp chính","",0,0,8,8.6,"svc"],["Kho thực phẩm – kho lạnh","",8,0,11.4,5,"store"],["Phòng nghỉ trưa","ghế ngả",22.2,0,30,6.6,"lead"],["Phòng ăn riêng","12 chỗ · Ban GĐ, tiếp khách",22,8.6,30,14,"lead"]],"zones":[["","",22.2,6.6,30,8.6,"zone"],["Quầy chia suất","",0,8.6,11.4,11.6,"core"],["Trả khay","",11.4,8.6,13.4,11.6,"zone"],["Rửa tay","",13.4,8.6,16,11.6,"zone"],["Quầy café – đồ uống","",16,8.6,22,11.6,"zone"],["Khu ăn chung","",0,11.6,30,24,"work"]],"furn":[["Bếp nấu công nghiệp",0.4,1.4,7.6,2.6],["Bàn sơ chế",0.4,4,3.6,5.2],["Chậu rửa",4.2,4,7.6,5.2],["Tủ hấp cơm",0.4,6.4,3,7.6],["Bàn ra món",3.6,6.4,7.6,7.6],["Tủ đông",8.4,1.4,11,2.6],["Kệ khô",8.4,3.2,11,4.4],["Lối giao hàng",8.4,5.4,11,6.2,"hl"],["Ghế ngả",22.6,1.6,24.6,3.4],["Ghế ngả",25,1.6,27,3.4],["Ghế ngả",27.4,1.6,29.4,3.4],["Ghế ngả",22.6,4,24.6,5.8],["Ghế ngả",25,4,27,5.8],["Quầy chia suất · tự chọn",0.6,9.6,10.8,10.8,"hl"],["Quầy trả khay",11.6,9.6,13.2,10.8],["Bồn rửa tay",13.6,9.6,15.8,10.4],["Quầy café",16.4,10,21.6,11],["Bàn ăn riêng 12 chỗ",23.4,10.8,28.6,12.8],["Bàn 6",1,13,3.6,15],["Bàn 6",5,13,7.6,15],["Bàn 6",9,13,11.6,15],["Bàn 6",13,13,15.6,15],["Bàn 6",17,13,19.6,15],["Bàn 6",1,16.4,3.6,18.4],["Bàn 6",5,16.4,7.6,18.4],["Bàn 6",9,16.4,11.6,18.4],["Bàn 6",13,16.4,15.6,18.4],["Bàn 6",17,16.4,19.6,18.4],["Bàn 6",1,19.8,3.6,21.8],["Bàn 6",5,19.8,7.6,21.8],["Bàn 6",9,19.8,11.6,21.8],["Bàn 6",13,19.8,15.6,21.8],["Bàn 6",17,19.8,19.6,21.8],["Bàn 4",21.4,15.2,23.4,17.2,"o"],["Bàn 4",24.4,15.2,26.4,17.2,"o"],["Bàn 4",27.4,15.2,29.4,17.2,"o"],["Bàn 4",21.4,18.4,23.4,20.4,"o"],["Bàn 4",24.4,18.4,26.4,20.4,"o"],["Bàn 4",27.4,18.4,29.4,20.4,"o"],["Quầy bar cửa sổ · 24 ghế",1,22.8,29,23.6]],"doors":[["v",11.4,7.4,1.2],["h",25,6.6,1.2],["h",28.4,8.6,1],["h",5.7,8.6,7,"open"]],"skip":["Trả khay","Rửa tay"]},"7":{"title":"Tầng 7 — Phòng Relax","sub":"phòng giải trí nhân viên · cửa nhập mã","rooms":[["Quầy trà chiều","đố vui 15:00",0,0,11.4,6.6,"social"],["Góc thư giãn","yên tĩnh",22.2,0,30,6.6,"lead"]],"zones":[["Khu Relax","",0,6.6,11.4,24,"social"],["","",11.4,6.6,22.2,24,"social"],["","",22.2,6.6,30,24,"social"]],"furn":[["Bảng đen đố vui",0.6,1.4,5.6,2,"hl"],["Quầy trà",6.2,1.4,10.8,2.6],["Bàn cao",1,3.6,3,5.6,"o"],["Bàn cao",4,3.6,6,5.6,"o"],["Bàn cao",7,3.6,9,5.6,"o"],["Ghế thư giãn",22.8,1.6,25,3.6,"hl"],["Ghế thư giãn",25.4,1.6,27.6,3.6,"hl"],["Ghế thư giãn",22.8,4,25,6],["Ghế thư giãn",25.4,4,27.6,6],["Cây",28.2,2,29.6,3.6,"o"],["Cửa nhập mã · biển KHU NHÂN VIÊN",11.6,6.9,15.6,7.9,"hl"],["Bảng giấy nhớ",0.4,8.2,1,13.4],["Góc chụp ảnh",1.6,8.6,6,12.6,"hl"],["Phi tiêu KPI",0.4,14.4,1,17.6],["Vạch đứng",3.2,15.6,4.4,16.4],["Ném giấy · bàn + thùng",1.6,19,6.4,22.4,"hl"],["Máy gắp thú",7.4,8.6,9.4,10.6,"hl"],["Máy gắp thú",9.8,8.6,11.8,10.6],["Sofa chung",7.6,13.6,15.2,15.4],["Bàn trà",9.4,16.2,13.4,17.4],["Sofa",7.6,18.2,15.2,19.6],["Bot em gái DBV · màn hình + neon",11,22.2,19,23.6,"hl"],["Khán đài ghế đệm",12,19.8,18,21.2],["Tường sinh nhật",17,8.4,23,9,"hl"],["Máy nghe nhạc",28.6,8.6,29.6,10.6,"hl"],["Bóng bàn",19.6,11.8,23.4,14],["Bi lắc",25.6,11.8,28.6,13.4],["Ghế lười · board game",20,16.4,29.4,20.4,"o"],["Quầy ăn vặt",24,22.2,29.4,23.4]],"doors":[["h",9,6.6,1.6],["h",25,6.6,1.2],["h",13.6,6.6,3.6,"open"]],"skip":["Khu Relax",""]}}};
let A = null, THREE = null, V3 = null;
const FL = {};            // FL[n] = { root, set, walk, obs, Y, doors, stations }
let cur = 1, F1 = null;   // lưới va chạm của tầng 1, cất lại khi lên tầng trên
const CH = 3.22;          // trần (tính từ mặt sàn tầng)
const wx = (u) => u - 15, wz = (v) => v - 12.9;
const Yof = (n) => 6 + (n - 2) * 3.6 + .11;
const F = '"Be Vietnam Pro",sans-serif';
const $ = (id) => document.getElementById(id);

/* ───────────────────────── Vật liệu ───────────────────────── */
const MT = {}; let TEXS = null;
function canvasTex(w, h, draw, rep) { const t = A.ctex(w, h, draw); if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
function mats() {
  if (MT.ok) return; MT.ok = 1; const s = A.std, AM = A.AM;
  MT.wall = s('#F3F0E8', { roughness: .9 }); MT.wallCore = s('#E4DED1', { roughness: .8 }); MT.skirt = s('#084C38', { roughness: .5 });
  MT.frame = A.M.frame; MT.glass = A.M.glass;
  MT.curtain = new THREE.MeshStandardMaterial({ color: '#dcebf5', transparent: true, opacity: .14, roughness: .03, metalness: .2, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide });
  MT.spandrel = s('#26332f', { roughness: .6 }); MT.ceil = s(A.AIRY ? '#f6f3ea' : '#FBFCF9', { roughness: .95 });
  MT.lamp = new THREE.MeshBasicMaterial({ color: '#fff4e0', toneMapped: false });
  MT.oak = AM.oak; MT.oakL = AM.oakL; MT.oakD = s('#6b4a2e', { roughness: .55 }); MT.walnut = s('#4a3324', { roughness: .5 });
  MT.stone = AM.stone; MT.brass = AM.brass; MT.greenD = AM.dark;
  MT.white = s('#F5F4F0', { roughness: .35 }); MT.offW = s('#E9E6DE', { roughness: .6 }); MT.grey = s('#9aa1a8', { roughness: .6 });
  MT.metal = s('#c9ced4', { metalness: .85, roughness: .28 }); MT.metalD = s('#2b3036', { metalness: .4, roughness: .45 });
  MT.steel = s('#d4d8dc', { metalness: .8, roughness: .3 }); MT.black = s('#16191d', { roughness: .4 });
  MT.screen = s('#0e1115', { roughness: .25, metalness: .2 });
  MT.fabG = s('#2E6B52', { roughness: .95 }); MT.fabGD = s('#1f4a3a', { roughness: .95 }); MT.fabC = s('#D8CCB4', { roughness: 1 });
  MT.fabS = s('#7d8b86', { roughness: 1 }); MT.fabO = s('#E8920A', { roughness: .9 }); MT.fabB = s('#3b4f6b', { roughness: .95 });
  MT.leather = s('#3a2a20', { roughness: .45 }); MT.leatherL = s('#8a6446', { roughness: .5 });
  MT.chair = s('#26302d', { roughness: .8 }); MT.mesh = s('#3a403f', { roughness: .9 });
  MT.cushion = [s('#E8920A', { roughness: .95 }), s('#0FA968', { roughness: .95 }), s('#F7F1E6', { roughness: .95 }), s('#2E6B52', { roughness: .95 }), s('#F6C344', { roughness: .95 })];
  MT.binder = ['#084C38', '#007437', '#E8920A', '#3b4f6b', '#C8102E', '#F5F4F0', '#8a6446', '#0E9AA7'].map((c) => s(c, { roughness: .6 }));
  MT.paper = s('#fbfaf6', { roughness: .9 }); MT.ceramic = A.M.ceramic; MT.chrome = A.M.chrome;
  MT.plantPot = s('#F4F1EC', { roughness: .35 }); MT.rug = s('#d9cfbb', { roughness: 1 });
  MT.led = new THREE.MeshBasicMaterial({ color: '#4dff9a', toneMapped: false }); MT.ledO = new THREE.MeshBasicMaterial({ color: '#ffb547', toneMapped: false });
  MT.green = s('#2fb24c', { roughness: .9 }); MT.red = s('#C8102E', { roughness: .5 }); MT.blue = s('#1554F0', { roughness: .5 });
  MT.felt = s('#1f6b46', { roughness: .95 }); MT.ppBlue = s('#1f4f8f', { roughness: .5 });
  MT.cork = s('#C89B66', { roughness: 1 });
  // sàn
  const T = TEXS = {};
  T.wood = canvasTex(512, 512, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(32,${26 + (i % 3) * 4}%,${60 + (i * 13) % 8}%)`; x.fillRect(0, i * 64, w, 64); x.fillStyle = 'rgba(70,40,15,.22)'; x.fillRect(0, i * 64, w, 2); const o = (i * 137) % w; x.fillRect(o, i * 64, 2, 64); }
    x.globalAlpha = .07; for (let k = 0; k < 260; k++) { x.fillStyle = '#3a2410'; x.fillRect(Math.random() * w, Math.random() * h, Math.random() * 140, 1); } }, true);
  T.carpet = canvasTex(256, 256, (x, w) => { x.fillStyle = '#5d6870'; x.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .07})`; x.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
    x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; x.strokeRect(0, 0, w, w); x.fillStyle = 'rgba(0,116,55,.18)'; x.fillRect(0, w * .46, w, 6); }, true);
  T.stone = canvasTex(512, 512, (x, w) => { x.fillStyle = '#e7e1d4'; x.fillRect(0, 0, w, w); for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(${120 + Math.random() * 60},${110 + Math.random() * 50},${90 + Math.random() * 40},${.15 + Math.random() * .2})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * w, Math.random() * 2.4, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(160,150,130,.45)'; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true);
  T.tile = canvasTex(256, 256, (x, w) => { x.fillStyle = '#eef0f1'; x.fillRect(0, 0, w, w); x.strokeStyle = '#c9d0d6'; x.lineWidth = 4; x.strokeRect(0, 0, w, w); }, true);
  T.vinyl = canvasTex(256, 256, (x, w) => { x.fillStyle = '#b9bdbf'; x.fillRect(0, 0, w, w); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .12})`; x.fillRect(Math.random() * w, Math.random() * w, 3, 1); } x.strokeStyle = 'rgba(0,0,0,.1)'; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true);
  T.woodW = canvasTex(512, 512, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(28,${34 + (i % 3) * 5}%,${44 + (i * 11) % 8}%)`; x.fillRect(0, i * 64, w, 64); x.fillStyle = 'rgba(40,20,5,.3)'; x.fillRect(0, i * 64, w, 2); } }, true);
}
const FLOORMAT = {};
function floorMat(kind, w, d) {
  const T = TEXS, k = kind + '|' + Math.round(w * 10) + 'x' + Math.round(d * 10); if (FLOORMAT[k]) return FLOORMAT[k];
  const src = { wood: T.wood, carpet: T.carpet, stone: T.stone, tile: T.tile, vinyl: T.vinyl, woodW: T.woodW }[kind] || T.stone;
  const sc = { wood: 2.2, carpet: .6, stone: 1.2, tile: .6, vinyl: .9, woodW: 2.2 }[kind] || 1.2;
  const t = src.clone(); t.needsUpdate = true; t.repeat.set(w / sc, d / sc);
  return (FLOORMAT[k] = A.std('#ffffff', { map: t, roughness: kind === 'carpet' ? 1 : kind === 'tile' ? .25 : .5 }));
}

/* ───────────────────────── Gộp hình học (ít lệnh vẽ) ───────────────────────── */
let UB = null, UP = null;
let M4, Q, E, P3, S3;
function geoInit() { M4 = new THREE.Matrix4(); Q = new THREE.Quaternion(); E = new THREE.Euler(); P3 = new V3(); S3 = new V3(); UB = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); UP = new THREE.PlaneGeometry(1, 1).toNonIndexed(); }
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const CYLC = {};
function CYL(rt, rb, h, seg) { const k = [rt, rb, h, seg || 16].join(','); return CYLC[k] || (CYLC[k] = ni(new THREE.CylinderGeometry(rt, rb, h, seg || 16))); }
const SPHC = {};
function SPH(r, ws, hs) { const k = [r, ws, hs].join(','); return SPHC[k] || (SPHC[k] = ni(new THREE.SphereGeometry(r, ws || 12, hs || 8))); }
function xf(g, x, y, z, ry, rx, rz, sx, sy, sz) { const c = g.clone(); E.set(rx || 0, ry || 0, rz || 0, 'YXZ'); Q.setFromEuler(E); P3.set(x, y, z); S3.set(sx || 1, sy || 1, sz || 1); M4.compose(P3, Q, S3); c.applyMatrix4(M4); return c; }
function Batch() { this.m = new Map(); }
Batch.prototype.push = function (g, mat) { if (!mat) { console.warn('tang-tren: thiếu vật liệu'); mat = MT.oak; } let a = this.m.get(mat); if (!a) { a = []; this.m.set(mat, a); } a.push(g); };
Batch.prototype.box = function (w, h, d, mat, x, y, z, ry, rx, rz) { this.push(xf(UB, x, y, z, ry, rx, rz, w, h, d), mat); };
Batch.prototype.geo = function (g, mat, x, y, z, ry, rx, rz, sx, sy, sz) { this.push(xf(g, x, y, z, ry, rx, rz, sx, sy, sz), mat); };
Batch.prototype.flush = function (parent) {
  this.m.forEach((L, mat) => { for (let i = 0; i < L.length; i += 3000) { const part = L.slice(i, i + 3000).map((g) => { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; });
    const geo = THREE.BufferGeometryUtils.mergeBufferGeometries(part); const me = new THREE.Mesh(geo, mat); me.matrixAutoUpdate = false; me.updateMatrix(); if (mat.transparent) me.renderOrder = 2; parent.add(me); } });
  this.m.clear(); };
// khung toạ độ của một món đồ: tâm (x, z), hướng a (người dùng món đồ nhìn theo +z cục bộ → (sin a, cos a))
function fr(B, x, z, a) { const c = Math.cos(a), s = Math.sin(a); const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  return { P, a, x, z,
    b(w, h, d, mat, lx, ly, lz, lry, rx, rz) { const p = P(lx, lz); B.box(w, h, d, mat, p[0], ly, p[1], a + (lry || 0), rx, rz); },
    g(geo, mat, lx, ly, lz, lry, rx, rz, sx, sy, sz) { const p = P(lx, lz); B.geo(geo, mat, p[0], ly, p[1], a + (lry || 0), rx, rz, sx, sy, sz); } }; }
let rs = 11; const rnd = () => { rs = (rs * 16807) % 2147483647; return (rs - 1) / 2147483646; };

/* ───────────────────────── Bảng chữ / màn hình (canvas) ───────────────────────── */
const TXC = {};
function texOnce(key, w, h, draw) { return TXC[key] || (TXC[key] = A.ctex(w, h, draw)); }
function signTexRoom(name) { return texOnce('sign|' + name, 640, 180, (x, w, h) => { x.fillStyle = '#084C38'; A.rr(x, 0, 0, w, h, 18); x.fill(); x.fillStyle = '#E8920A'; x.fillRect(0, h - 12, w, 12);
  x.fillStyle = '#fff'; x.textBaseline = 'middle'; let fs = 60; x.font = `800 ${fs}px ${F}`; while (x.measureText(name).width > w - 60 && fs > 26) { fs -= 2; x.font = `800 ${fs}px ${F}`; } x.fillText(name, 30, h / 2 - 4); }); }
function logoTex(sub) { return texOnce('logo|' + sub, 1600, 600, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); const L = A.IMG.full;
  if (L) { const lh = 300, lw = L.width * lh / L.height; x.drawImage(L, w / 2 - lw / 2, 60, lw, lh); }
  x.fillStyle = '#007437'; x.font = `800 74px ${F}`; x.textAlign = 'center'; x.fillText(sub || 'CHI NHÁNH THÀNH ĐÔ', w / 2, 470); x.fillStyle = '#E8920A'; x.fillRect(w / 2 - 80, 510, 160, 10); }); }
function screenTex(kind) {
  return texOnce('scr|' + kind, 512, 300, (x, w, h) => {
    x.fillStyle = kind === 'code' ? '#14202b' : '#f7f8f6'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#084C38'; x.fillRect(0, 0, w, 26); x.fillStyle = '#E8920A'; x.fillRect(10, 8, 40, 10);
    if (kind === 'sheet') { x.strokeStyle = '#d3d9d6'; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(0, 40 + i * 22); x.lineTo(w, 40 + i * 22); x.stroke(); } for (let j = 0; j < 6; j++) { x.beginPath(); x.moveTo(20 + j * 85, 30); x.lineTo(20 + j * 85, h); x.stroke(); }
      x.fillStyle = '#3a4640'; for (let i = 0; i < 11; i++) for (let j = 0; j < 5; j++) if (rnd() > .25) x.fillRect(28 + j * 85, 46 + i * 22, 30 + rnd() * 40, 8); }
    else if (kind === 'chart') { x.fillStyle = '#e8eeea'; x.fillRect(16, 40, w - 32, h - 56); const c = ['#007437', '#E8920A', '#0E9AA7']; for (let i = 0; i < 10; i++) { x.fillStyle = c[i % 3]; const bh = 40 + rnd() * 160; x.fillRect(36 + i * 46, h - 26 - bh, 28, bh); } }
    else if (kind === 'code') { const c = ['#8ED1A9', '#E8C27A', '#9cc9f0', '#e9edf0']; for (let i = 0; i < 11; i++) { x.fillStyle = c[i % 4]; x.fillRect(20 + (i % 3) * 16, 40 + i * 22, 80 + rnd() * 260, 9); } }
    else { x.fillStyle = '#e4ece8'; x.fillRect(16, 40, 200, 120); x.fillStyle = '#0FA968'; x.fillRect(16, 40, 200 * (.4 + rnd() * .5), 120); x.fillStyle = '#3a4640'; for (let i = 0; i < 6; i++) x.fillRect(240, 46 + i * 22, 140 + rnd() * 100, 9); x.fillStyle = '#E8920A'; x.fillRect(16, 180, w - 32, 80); }
  });
}
const SCRK = ['sheet', 'chart', 'doc', 'code'];
function bigScreenTex(kind) {
  return texOnce('big|' + kind, 1280, 720, (x, w, h) => {
    if (kind === 'meet') { x.fillStyle = '#0b1a14'; x.fillRect(0, 0, w, h); const cols = ['#2E6B52', '#3b4f6b', '#6b4a2e', '#084C38', '#1f4a3a', '#5d6870']; for (let i = 0; i < 6; i++) { const X = 30 + (i % 3) * 410, Y = 60 + Math.floor(i / 3) * 320; x.fillStyle = cols[i]; A.rr(x, X, Y, 390, 300, 18); x.fill(); x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(X + 195, Y + 130, 58, 0, 7); x.fill(); x.fillRect(X + 120, Y + 200, 150, 60); x.fillStyle = '#fff'; x.font = `600 24px ${F}`; x.fillText(['DBV Tập đoàn', 'CN Hà Nội', 'CN Thành Đô', 'Ban Pháp chế', 'Ban Bồi thường', 'Ban Kinh doanh'][i], X + 18, Y + 286); }
      x.fillStyle = '#E8920A'; x.font = `800 34px ${F}`; x.fillText('Họp trực tuyến · DBV Insurance', 30, 40); return; }
    if (kind === 'dash') { x.fillStyle = '#0d1c17'; x.fillRect(0, 0, w, h); x.fillStyle = '#E8920A'; x.font = `800 44px ${F}`; x.fillText('CHIẾN DỊCH THÁNG 11 · DBV247', 40, 70);
      const kp = [['Lượt tiếp cận', '1,2 triệu'], ['Khách để lại SĐT', '3.480'], ['Đơn TNDS', '1.126'], ['Chi phí / khách', '42.000đ']]; kp.forEach((k, i) => { const X = 40 + i * 305; x.fillStyle = '#163a2e'; A.rr(x, X, 110, 285, 150, 16); x.fill(); x.fillStyle = '#A8D5BD'; x.font = `600 24px ${F}`; x.fillText(k[0], X + 20, 150); x.fillStyle = '#fff'; x.font = `800 48px ${F}`; x.fillText(k[1], X + 20, 220); });
      x.strokeStyle = '#0FA968'; x.lineWidth = 6; x.beginPath(); for (let i = 0; i <= 30; i++) { const X = 60 + i * 38, Y = 620 - (Math.sin(i * .4) * 60 + i * 7); i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke(); return; }
    if (kind === 'menu') { x.fillStyle = '#1f2a24'; x.fillRect(0, 0, w, h); x.fillStyle = '#F6E7B0'; x.font = `900 66px ${F}`; x.fillText('THỰC ĐƠN HÔM NAY', 50, 100); x.fillStyle = '#E8920A'; x.fillRect(50, 125, 220, 8);
      ['Cơm gà xối mỡ · canh bí', 'Bún chả que tre', 'Cá kho tộ · rau luộc', 'Đậu sốt cà chua (chay)', 'Tráng miệng: dưa hấu, sữa chua'].forEach((t, i) => { x.fillStyle = '#fff'; x.font = `600 46px ${F}`; x.fillText('• ' + t, 60, 220 + i * 92); }); return; }
    if (kind === 'train') { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#084C38'; x.fillRect(0, 0, w, 120); x.fillStyle = '#fff'; x.font = `800 54px ${F}`; x.fillText('ĐÀO TẠO CTV – ĐẠI LÝ · TNDS Ô TÔ, XE MÁY', 40, 80);
      ['1. Quy định bắt buộc theo NĐ 67/2023', '2. Cách tư vấn khách trong 3 câu hỏi', '3. Cấp đơn điện tử, giấy chứng nhận qua Zalo', '4. Chính sách hoa hồng giai đoạn 1'].forEach((t, i) => { x.fillStyle = '#1C1C1C'; x.font = `600 46px ${F}`; x.fillText(t, 60, 220 + i * 100); }); return; }
    if (kind === 'led') { x.fillStyle = '#063A2B'; x.fillRect(0, 0, w, h); const L = A.IMG.full; x.fillStyle = '#fff'; A.rr(x, w / 2 - 330, 120, 660, 260, 30); x.fill(); if (L) { const lh = 200, lw = L.width * lh / L.height; x.drawImage(L, w / 2 - lw / 2, 150, lw, lh); }
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `800 58px ${F}`; x.fillText('HỌP GIAO BAN THÁNG 11', w / 2, 500); x.fillStyle = '#A8D5BD'; x.font = `600 36px ${F}`; x.fillText('Ban Giám đốc · Chi nhánh Thành Đô', w / 2, 570); return; }
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  });
}
function dirTex(n) { return texOnce('dir|' + n, 768, 1024, (x, w, h) => { x.fillStyle = '#084C38'; x.fillRect(0, 0, w, h); x.fillStyle = '#E8920A'; x.fillRect(0, 150, w, 10);
  x.fillStyle = '#fff'; x.font = `900 60px ${F}`; x.fillText('DBV BUILDING', 50, 100);
  FLOOR_LIST.slice().reverse().forEach((f, i) => { const Y = 230 + i * 112, me = f[0] === n; if (me) { x.fillStyle = '#E8920A'; A.rr(x, 30, Y - 62, w - 60, 98, 16); x.fill(); }
    x.fillStyle = me ? '#063A2B' : '#A8D5BD'; x.font = `900 54px ${F}`; x.fillText(String(f[0]), 60, Y); x.fillStyle = me ? '#063A2B' : '#fff'; x.font = `700 40px ${F}`; x.fillText(f[1], 140, Y); }); }); }
function floorSignTex(n) { return texOnce('fs|' + n, 1400, 420, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); const L = A.IMG.full; if (L) { const lh = 150, lw = L.width * lh / L.height; x.drawImage(L, 60, 40, lw, lh); }
  x.fillStyle = '#084C38'; x.font = `900 130px ${F}`; x.fillText('TẦNG ' + n, 60, 330); const nm = FLOOR_LIST[n - 1][1].toUpperCase(); x.fillStyle = '#E8920A'; x.fillRect(560, 238, 10, 100); x.fillStyle = '#007437'; let fs = 74; x.font = `800 ${fs}px ${F}`; while (x.measureText(nm).width > w - 640 && fs > 40) { fs -= 2; x.font = `800 ${fs}px ${F}`; } x.fillText(nm, 600, 315); }); }
function panelMesh(root, tex, w, h, x, y, z, ry, std) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std ? A.std('#ffffff', { map: tex, roughness: .6 }) : A.basic(tex)); m.position.set(x, y, z); m.rotation.y = ry || 0; root.add(m); return m; }

/* ───────────────────────── Khung tầng: sàn, trần, vách kính ───────────────────────── */
function floorKind(r) { const n = r[0], k = r[6];
  if (/WC/.test(n)) return 'tile'; if (/Bếp|Kho thực phẩm/.test(n)) return 'tile'; if (/Kho|IT – máy chủ|lưu trữ|Văn thư|In – scan/.test(n)) return 'vinyl';
  if (/Studio|thu – lồng/.test(n)) return 'vinyl'; if (/Khu ăn chung|Phòng ăn riêng|Quầy café|Relax|Góc thư giãn|Quầy trà/.test(n) || k === 'social') return 'woodW';
  if (/Sảnh|Hành lang|Chờ|Quầy|Rửa tay|Trả khay|Khu chờ/.test(n) || k === 'core' || k === 'zone') return 'stone';
  if (k === 'lead' || k === 'meet') return 'wood'; if (k === 'svc') return 'tile'; if (k === 'store') return 'vinyl'; if (k === 'work') return 'carpet'; return 'stone'; }
function addFloorPlane(root, u0, v0, u1, v1, kind, y) { const w = u1 - u0, d = v1 - v0; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat(kind, w, d)); m.rotation.x = -Math.PI / 2; m.position.set(wx((u0 + u1) / 2), y, wz((v0 + v1) / 2)); root.add(m); m.userData.floor = true; A.clickables.push(m); return m; }
function buildShell(n, root, B) {
  const fl = PLAN.floors[n];
  addFloorPlane(root, 0, 0, 30, 24, 'stone', .002);
  fl.zones.forEach((z) => addFloorPlane(root, z[2], z[3], z[4], z[5], floorKind(z), .004));
  PLAN.core.concat(fl.rooms).forEach((r) => { if (/^Thang máy/.test(r[0])) return; const nested = fl.rooms.some((o) => o !== r && o[2] <= r[2] && o[3] <= r[3] && o[4] >= r[4] && o[5] >= r[5] && (o[4] - o[2]) * (o[5] - o[3]) > (r[4] - r[2]) * (r[5] - r[3]));
    addFloorPlane(root, r[2], r[3], r[4], r[5], floorKind(r), nested ? .008 : .006); });
  // trần + đèn panel
  { const c = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), MT.ceil); c.rotation.x = Math.PI / 2; c.position.set(0, CH, wz(12)); root.add(c); }
  for (let u = 1.5; u < 30; u += 3) for (let v = 1.6; v < 24; v += 2.7) { if (u > 11 && u < 22.6 && v < 6.8) continue; B.geo(UP, MT.lamp, wx(u), CH - .006, wz(v), 0, Math.PI / 2, 0, 1.2, .6, 1); }
  // vách kính bao quanh (mặt ngoài tòa nhà) — trừ đoạn lõi thang phía sau
  const glassRun = (axis, fixed, a, b, inward) => { const L = b - a, mid = (a + b) / 2;
    if (axis === 'x') { B.box(L, CH - .08, .02, MT.curtain, mid, CH / 2, fixed); B.box(L, .08, .14, MT.frame, mid, .04, fixed); B.box(L, .08, .14, MT.frame, mid, CH - .04, fixed); B.box(L, .04, .2, MT.frame, mid, 1.05, fixed + inward * .02);
      for (let p = a; p <= b + .01; p += 1.5) B.box(.07, CH, .14, MT.frame, Math.min(b, p), CH / 2, fixed); A.obstacle(a, fixed - .3, b, fixed + .3); }
    else { B.box(.02, CH - .08, L, MT.curtain, fixed, CH / 2, mid); B.box(.14, .08, L, MT.frame, fixed, .04, mid); B.box(.14, .08, L, MT.frame, fixed, CH - .04, mid); B.box(.2, .04, L, MT.frame, fixed + inward * .02, 1.05, mid);
      for (let p = a; p <= b + .01; p += 1.5) B.box(.14, CH, .07, MT.frame, fixed, CH / 2, Math.min(b, p)); A.obstacle(fixed - .3, a, fixed + .3, b); } };
  glassRun('x', wz(24), wx(0), wx(30), -1);
  glassRun('z', wx(0), wz(0), wz(24), 1); glassRun('z', wx(30), wz(0), wz(24), -1);
  glassRun('x', wz(0), wx(0), wx(11.4), 1); glassRun('x', wz(0), wx(22.2), wx(30), 1);
  B.box(10.8, CH, .2, MT.wallCore, wx(16.8), CH / 2, wz(0) + .1); A.obstacle(wx(11.4), wz(0), wx(22.2), wz(0) + .2);
}

/* ───────────────────────── Tường trong + cửa + biển phòng ───────────────────────── */
const GLASS_ROOM = /Phòng họp Ban GĐ|Phòng họp đối soát|Phòng họp sáng tạo|Phòng ăn riêng|^TP |Trưởng phòng|Kế toán trưởng|Kiểm soát nội bộ|Phỏng vấn/;
function buildWalls(n, root, B, info) {
  const fl = PLAN.floors[n], rooms = PLAN.core.concat(fl.rooms);
  const H = {}, Vv = {}; const key = (v) => Math.round(v * 100);
  const mark = (map, line, a, b, i) => { const k = key(line); const L = map[k] || (map[k] = { line, c: new Map() }); for (let t = Math.round(a * 10); t < Math.round(b * 10); t++) { const s = L.c.get(t) || []; s.push(i); L.c.set(t, s); } };
  rooms.forEach((r, i) => { mark(H, r[3], r[2], r[4], i); mark(H, r[5], r[2], r[4], i); mark(Vv, r[2], r[3], r[5], i); mark(Vv, r[4], r[3], r[5], i); });
  // bỏ chu vi (vách kính) và các vách quanh cabin thang máy (do lõi thang tự dựng)
  delete H[key(0)]; delete H[key(24)]; delete Vv[key(0)]; delete Vv[key(30)];
  const kill = (L, a, b) => { if (!L) return; for (let t = Math.round(a * 10); t < Math.round(b * 10); t++) L.c.delete(t); };
  kill(H[key(2.5)], 11.4, 15.8); kill(Vv[key(13.6)], 0, 2.5);
  // cửa
  const doors = PLAN.coreDoors.concat(fl.doors).filter((d) => !(d[0] === 'h' && Math.abs(d[2] - 2.5) < .01));
  const DM = { h: {}, v: {} };
  doors.forEach((d, di) => { const [t, a, b, w] = d; const line = t === 'h' ? b : a, c = t === 'h' ? a : b; const m = DM[t][key(line)] || (DM[t][key(line)] = new Map());
    for (let s = Math.round((c - w / 2) * 10); s < Math.round((c + w / 2) * 10); s++) m.set(s, di); });
  const solidMat = MT.wall;
  const seg = (axis, line, a, b, kind) => { // axis 'h': chạy theo u tại v=line ; 'v': chạy theo v tại u=line
    const L = b - a; if (L < .02) return; const mid = (a + b) / 2;
    const X = axis === 'h' ? wx(mid) : wx(line), Z = axis === 'h' ? wz(line) : wz(mid);
    const sx = axis === 'h' ? L : .12, sz = axis === 'h' ? .12 : L;
    if (kind === 'glass') { B.box(axis === 'h' ? L : .02, CH - .1, axis === 'h' ? .02 : L, MT.glass, X, CH / 2, Z); B.box(sx * (axis === 'h' ? 1 : .6), .06, sz * (axis === 'h' ? .6 : 1), MT.frame, X, .03, Z); B.box(sx * (axis === 'h' ? 1 : .6), .06, sz * (axis === 'h' ? .6 : 1), MT.frame, X, CH - .05, Z);
      const nn = Math.max(1, Math.round(L / 1.6)); for (let k = 0; k <= nn; k++) { const p = a + L * k / nn; axis === 'h' ? B.box(.05, CH, .08, MT.frame, wx(p), CH / 2, Z) : B.box(.08, CH, .05, MT.frame, X, CH / 2, wz(p)); }
      B.box(axis === 'h' ? L : .03, .1, axis === 'h' ? .03 : L, MT.skirt, X, 1.3, Z); }
    else { B.box(sx, CH, sz, solidMat, X, CH / 2, Z); B.box(axis === 'h' ? L : .15, .1, axis === 'h' ? .15 : L, MT.skirt, X, .05, Z); }
    if (axis === 'h') A.obstacle(wx(a), wz(line) - .07, wx(b), wz(line) + .07); else A.obstacle(wx(line) - .07, wz(a), wx(line) + .07, wz(b)); };
  const doorway = (axis, line, a, b, d, owners, glass) => {
    const w = b - a, mid = (a + b) / 2, X = axis === 'h' ? wx(mid) : wx(line), Z = axis === 'h' ? wz(line) : wz(mid), op = d[4] === 'open';
    if (op) return; const hd = 2.25;
    // lanh tô phía trên cửa
    if (glass) B.box(axis === 'h' ? w : .02, CH - hd, axis === 'h' ? .02 : w, MT.glass, X, (CH + hd) / 2, Z); else B.box(axis === 'h' ? w : .12, CH - hd, axis === 'h' ? .12 : w, MT.wall, X, (CH + hd) / 2, Z);
    // khung cửa
    const fm = glass ? MT.frame : MT.walnut;
    if (axis === 'h') { B.box(w + .08, .06, .16, fm, X, hd, Z);[a, b].forEach((p) => B.box(.05, hd, .16, fm, wx(p), hd / 2, Z)); }
    else { B.box(.16, .06, w + .08, fm, X, hd, Z);[a, b].forEach((p) => B.box(.16, hd, .05, fm, X, hd / 2, wz(p))); }
    // cánh cửa mở 90° vào phòng
    const ow = owners.length ? rooms[owners[0]] : null; let side = 1;
    if (ow) side = axis === 'h' ? (Math.abs(ow[3] - line) < .01 ? 1 : -1) : (Math.abs(ow[2] - line) < .01 ? 1 : -1);
    const lockName = owners.map((o) => rooms[o][0]).find((nm) => LOCK[nm] && !UNL.has(nm));
    if (lockName) lockLeaf(root, axis, line, a, b, side, hd, lockName, info);
    const leaves = w > 1.35 ? [[a, (a + b) / 2, 1], [b, (a + b) / 2, -1]] : [[a, b, 1]];
    if (!lockName) leaves.forEach(([h0, h1]) => { const lw = Math.abs(h1 - h0) - .03, dir = Math.sign(h1 - h0);
      const lm = glass ? MT.glass : MT.oakD;
      if (axis === 'h') { const hx = wx(h0 + dir * .02), hz = wz(line); B.box(.045, hd - .03, lw, lm, hx, (hd - .03) / 2, hz + side * (lw / 2 + .05)); B.box(.06, .02, .12, MT.chrome, hx + dir * .06, 1.02, hz + side * (lw - .08)); if (glass) B.box(.05, hd - .03, .04, MT.frame, hx, (hd - .03) / 2, hz + side * (lw + .05)); }
      else { const hz = wz(h0 + dir * .02), hx = wx(line); B.box(lw, hd - .03, .045, lm, hx + side * (lw / 2 + .05), (hd - .03) / 2, hz); B.box(.12, .02, .06, MT.chrome, hx + side * (lw - .08), 1.02, hz + dir * .06); if (glass) B.box(.04, hd - .03, .05, MT.frame, hx + side * (lw + .05), (hd - .03) / 2, hz); } });
    // biển tên phòng (phía ngoài)
    owners.forEach((oi) => { const r = rooms[oi]; if (/^Thang|Sảnh thang/.test(r[0])) return;
      const inS = axis === 'h' ? (Math.abs(r[3] - line) < .01 ? 1 : -1) : (Math.abs(r[2] - line) < .01 ? 1 : -1); const out = -inS;
      const tex = signTexRoom(r[0]); const sw = .62, sh = .175; const along = b + .38 <= (axis === 'h' ? r[4] : r[5]) - .05 ? b + .38 : a - .38;
      if (axis === 'h') panelMesh(root, tex, sw, sh, wx(along), 1.62, wz(line) + out * .075, out > 0 ? 0 : Math.PI);
      else panelMesh(root, tex, sw, sh, wx(line) + out * .075, 1.62, wz(along), out > 0 ? Math.PI / 2 : -Math.PI / 2);
      info.doorOf[r[0]] = info.doorOf[r[0]] || { axis, line, c: mid, out }; });
  };
  const run = (axis, map) => Object.keys(map).forEach((k) => { const L = map[k], line = L.line, dm = DM[axis][k] || new Map();
    const cells = [...L.c.keys()].sort((p, q) => p - q); let i = 0;
    while (i < cells.length) { const t0 = cells[i], state = (t) => { if (dm.has(t)) return 'd' + dm.get(t); const own = L.c.get(t); return own.every((o) => GLASS_ROOM.test(rooms[o][0])) ? 'glass' : 'solid'; };
      const st = state(t0); let j = i; while (j + 1 < cells.length && cells[j + 1] === cells[j] + 1 && state(cells[j + 1]) === st) j++;
      const a = t0 / 10, b = (cells[j] + 1) / 10;
      if (st[0] === 'd') { const d = doors[+st.slice(1)], own = [...new Set(cells.slice(i, j + 1).flatMap((t) => L.c.get(t)))]; doorway(axis, line, a, b, d, own, own.length && own.every((o) => GLASS_ROOM.test(rooms[o][0]))); }
      else seg(axis, line, a, b, st);
      i = j + 1; } });
  run('h', H); run('v', Vv);
}

/* ───────────────────────── Đồ nội thất ───────────────────────── */
function officeChair(B, x, z, a, exec) { const f = fr(B, x, z, a), fab = exec ? MT.leather : MT.chair;
  f.b(.5, .09, .48, fab, 0, .48, 0); f.b(.5, exec ? .78 : .56, .08, fab, 0, exec ? .95 : .82, -.26, 0, -.08);
  if (exec) f.b(.3, .12, .1, fab, 0, 1.36, -.29);
  f.g(CYL(.025, .025, .36, 8), MT.metalD, 0, .27, 0); for (let i = 0; i < 5; i++) { const t = i / 5 * 6.283; f.b(.04, .03, .3, MT.metalD, Math.sin(t) * .15, .07, Math.cos(t) * .15, t); f.g(SPH(.03, 6, 4), MT.black, Math.sin(t) * .29, .03, Math.cos(t) * .29); }
  [-1, 1].forEach((s) => { f.b(.05, .04, .3, MT.metalD, s * .27, .68, 0); f.b(.03, .18, .03, MT.metalD, s * .27, .58, -.05); }); }
function guestChair(B, x, z, a, mat) { const f = fr(B, x, z, a), m = mat || MT.fabG;
  f.b(.48, .08, .46, m, 0, .46, 0); f.b(.48, .44, .07, m, 0, .76, -.22, 0, -.1);[[-.2, -.19], [.2, -.19], [-.2, .19], [.2, .19]].forEach(([p, q]) => f.g(CYL(.014, .012, .44, 6), MT.metalD, p, .22, q)); }
function stool(B, x, z, h, mat) { B.geo(CYL(.18, .18, .06, 14), mat || MT.leather, x, h, z); B.geo(CYL(.025, .025, h, 8), MT.metalD, x, h / 2, z); B.geo(CYL(.2, .2, .02, 14), MT.metalD, x, .01, z); B.geo(CYL(.15, .15, .02, 12), MT.metalD, x, h * .4, z); }
function monitor(B, f, lx, lz, k, root, wide) { const w = wide ? .62 : .54; f.b(w, .34, .03, MT.screen, lx, 1.04, lz); f.b(.05, .2, .05, MT.metalD, lx, .85, lz - .03); f.b(.22, .012, .16, MT.metalD, lx, .755, lz - .03);
  const p = f.P(lx, lz - .017); B.geo(UP, scrMat(k), p[0], 1.04, p[1], f.a + Math.PI, 0, 0, w - .04, .3, 1); }
const SCRM = {}; function scrMat(k) { return SCRM[k] || (SCRM[k] = A.basic(screenTex(SCRK[k % SCRK.length]))); }
function desk(B, x, z, w, d, a, o) { o = o || {}; const f = fr(B, x, z, a), top = o.exec ? MT.walnut : MT.oak;
  f.b(w, .04, d, top, 0, .74, 0);
  if (o.exec) { f.b(w - .06, .66, .04, MT.walnut, 0, .38, d / 2 - .05);[-1, 1].forEach((s) => f.b(.05, .72, d - .02, MT.walnut, s * (w / 2 - .03), .36, 0)); f.b(.44, .6, d - .14, MT.oakD, w / 2 - .3, .32, 0); f.b(.4, .01, .02, MT.brass, w / 2 - .3, .5, -d / 2 + .065); }
  else { [-1, 1].forEach((s) => { f.b(.05, .72, .05, MT.metalD, s * (w / 2 - .06), .36, d / 2 - .08); f.b(.05, .72, .05, MT.metalD, s * (w / 2 - .06), .36, -d / 2 + .08); f.b(.05, .04, d - .16, MT.metalD, s * (w / 2 - .06), .1, 0); }); f.b(w - .12, .35, .02, MT.offW, 0, .55, d / 2 - .06); }
  if (!o.noPc) { monitor(B, f, o.exec ? -.25 : 0, d / 2 - .16, o.k || 0, null, o.exec); if (o.dual) monitor(B, f, .6, d / 2 - .2, (o.k || 0) + 1); f.b(.42, .02, .14, MT.black, 0, .77, .0); f.b(.06, .02, .1, MT.black, .32, .77, 0); }
  f.b(.22, .03, .3, MT.paper, -w / 2 + .3, .775, .05, .2); f.g(CYL(.04, .035, .09, 12), MT.ceramic, w / 2 - .22, .8, -.08);
  if (o.lamp) { f.g(CYL(.08, .08, .02, 12), MT.brass, w / 2 - .25, .77, d / 2 - .2); f.g(CYL(.01, .01, .4, 6), MT.brass, w / 2 - .25, .97, d / 2 - .2); f.g(CYL(.06, .12, .14, 14), MT.offW, w / 2 - .25, 1.18, d / 2 - .2); }
  if (o.chair !== false) officeChair(B, f.P(0, -d / 2 - .38)[0], f.P(0, -d / 2 - .38)[1], a, o.exec); }
function sofa(B, x, z, len, a, mat, depth) { const f = fr(B, x, z, a), m = mat || MT.fabG, D = depth || .9;
  f.b(len, .22, D, MT.walnut, 0, .13, 0); f.b(len - .3, .16, D - .25, m, 0, .32, .06); f.b(len, .5, .2, m, 0, .58, -D / 2 + .1, 0, -.06);[-1, 1].forEach((s) => f.b(.18, .38, D, m, s * (len / 2 - .09), .43, 0));
  const nc = Math.max(1, Math.round((len - .4) / .7)); for (let i = 0; i < nc; i++) { const px = -len / 2 + .2 + (len - .4) * (i + .5) / nc; f.b((len - .4) / nc - .04, .16, D - .3, m, px, .46, .07); f.b(.36, .3, .1, MT.cushion[(((i + Math.round(x * 3)) % 5) + 5) % 5], px, .66, -D / 2 + .26, 0, -.25); }
  [-1, 1].forEach((s) => f.g(CYL(.02, .02, .06, 6), MT.brass, s * (len / 2 - .1), .03, D / 2 - .1)); }
function armchair(B, x, z, a, mat) { sofa(B, x, z, .95, a, mat || MT.fabC, .85); }
function coffeeTable(B, x, z, w, d, round) { if (round) { const r = Math.min(w, d) / 2 * .85; B.geo(CYL(r, r, .04, 28), MT.stone, x, .44, z); B.geo(CYL(.05, .05, .4, 10), MT.brass, x, .22, z); B.geo(CYL(r * .55, r * .55, .02, 20), MT.brass, x, .01, z); }
  else { B.box(w * .85, .04, d * .8, MT.stone, x, .42, z); [-1, 1].forEach((s) => [-1, 1].forEach((t) => B.box(.04, .4, .04, MT.brass, x + s * (w * .4), .2, z + t * (d * .36)))); }
  B.box(.25, .03, .18, MT.paper, x + .1, .47, z); B.geo(CYL(.05, .04, .16, 12), MT.ceramic, x - .15, .54, z - .05); }
function shelf(B, x, z, w, d, a, h, kind) { const f = fr(B, x, z, a), H = h || 2.1, levels = Math.round(H / .38), carc = kind === 'steel' ? MT.steel : MT.white;
  [-1, 1].forEach((s) => f.b(.03, H, d, carc, s * (w / 2 - .015), H / 2, 0)); f.b(w, H, .02, carc, 0, H / 2, -d / 2 + .01);
  for (let i = 0; i <= levels; i++) { const y = .05 + i * (H - .05) / levels; f.b(w, .025, d, carc, 0, y, 0); if (i === levels) break;
    let p = -w / 2 + .05; while (p < w / 2 - .12) { const bw = kind === 'box' ? .3 + rnd() * .1 : .06 + rnd() * .03, bh = (H - .05) / levels * (kind === 'box' ? .55 : .78), m = kind === 'box' ? MT.fabC : MT.binder[Math.floor(rnd() * MT.binder.length)];
      if (rnd() > .1) f.b(bw - .008, bh, d * .8, m, p + bw / 2, y + .013 + bh / 2, .02); p += bw; } } }
function cabinet(B, x, z, w, d, a, h, mat) { const f = fr(B, x, z, a), H = h || 1.1, m = mat || MT.white; f.b(w, H, d, m, 0, H / 2, 0); const nd = Math.max(1, Math.round(w / .5)); for (let i = 0; i < nd; i++) { const px = -w / 2 + w * (i + .5) / nd; f.b(w / nd - .02, H - .06, .01, m, px, H / 2, d / 2 + .005); f.b(.02, .14, .02, MT.chrome, px + (i % 2 ? -1 : 1) * (w / nd / 2 - .06), H / 2 + .1, d / 2 + .02); } }
function plantAt(root, x, z, k, s) { const g = A.plant(x, z, k, s); return g; }
function screenWall(root, B, tex, x, z, a, w, h, y) { const f = fr(B, x, z, a); f.b(w + .06, h + .06, .05, MT.black, 0, y, 0); const p = f.P(0, .03); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), A.basic(tex)); m.position.set(p[0], y, p[1]); m.rotation.y = a; root.add(m); return m; }
function meetingTable(B, x, z, w, d, n, a, root) { // bàn họp nằm dọc theo trục dài; ghế hai bên
  const long = w >= d, L = (long ? w : d) - 1.3, S = Math.max(.9, (long ? d : w) - 1.5); const ang = long ? 0 : Math.PI / 2; const f = fr(B, x, z, ang);
  f.b(L, .05, S, MT.walnut, 0, .75, 0); f.b(L * .7, .7, .12, MT.oakD, 0, .37, 0); f.b(L * .5, .01, .14, MT.brass, 0, .78, 0);
  const per = Math.max(1, Math.round((n - (n >= 10 ? 2 : 0)) / 2)); for (let i = 0; i < per; i++) { const px = -L / 2 + L * (i + .5) / per;[-1, 1].forEach((s) => { const p = f.P(px, s * (S / 2 + .42)); officeChair(B, p[0], p[1], ang + (s > 0 ? Math.PI : 0), false); }); }
  if (n >= 10) [-1, 1].forEach((s) => { const p = f.P(s * (L / 2 + .45), 0); officeChair(B, p[0], p[1], ang + (s > 0 ? -Math.PI / 2 : Math.PI / 2), true); });
  for (let i = 0; i < per; i++) { const px = -L / 2 + L * (i + .5) / per;[-1, 1].forEach((s) => { const p = f.P(px, s * (S / 2 - .22)); B.box(.21, .01, .3, MT.paper, p[0], .78, p[1], ang + .1 * s); }); }
  B.geo(CYL(.08, .06, .2, 12), MT.ceramic, x, .88, z); }
function cluster(B, root, x, z, w, d, n, k, people) { const long = w >= d, L = long ? w : d, S = long ? d : w, ang = long ? 0 : Math.PI / 2, f = fr(B, x, z, ang);
  const cols = Math.ceil(n / 2), dw = L / cols, dd = Math.min(.75, S / 2 - .55);
  f.b(L - .1, 1.12, .05, MT.fabGD, 0, .56, 0); f.b(L - .1, .03, .07, MT.brass, 0, 1.13, 0);
  let seat = 0; for (let c = 0; c < cols; c++) [-1, 1].forEach((s) => { if (seat >= n) return; seat++; const px = -L / 2 + dw * (c + .5), p = f.P(px, s * (dd / 2 + .03));
    desk(B, p[0], p[1], dw - .06, dd, ang + (s > 0 ? Math.PI : 0), { k: k + seat, noChairFix: true });
    if (people && rnd() < .55) { const q = f.P(px, s * (dd + .42)); people.push([q[0], q[1], ang + (s > 0 ? Math.PI : 0)]); } }); }
function dining(B, x, z, w, d, seats, people) { const long = w >= d, ang = long ? 0 : Math.PI / 2, f = fr(B, x, z, ang), L = (long ? w : d) - .7, S = .9;
  f.b(L, .05, S, MT.oak, 0, .74, 0);[-1, 1].forEach((s) => [-1, 1].forEach((t) => f.b(.05, .72, .05, MT.metalD, s * (L / 2 - .08), .36, t * (S / 2 - .08))));
  const per = Math.round(seats / 2); for (let i = 0; i < per; i++) { const px = -L / 2 + L * (i + .5) / per;[-1, 1].forEach((s) => { const p = f.P(px, s * (S / 2 + .3)); guestChair(B, p[0], p[1], ang + (s > 0 ? Math.PI : 0), MT.oakL);
    const t = f.P(px, s * (S / 2 - .22)); B.box(.34, .015, .26, MT.steel, t[0], .775, t[1], ang); if (people && rnd() < .3) people.push([p[0], p[1], ang + (s > 0 ? Math.PI : 0)]); }); } }
function roundTable(B, x, z, r, seats, people, mat) { B.geo(CYL(r, r, .04, 24), mat || MT.oak, x, .74, z); B.geo(CYL(.05, .05, .72, 10), MT.metalD, x, .37, z); B.geo(CYL(.3, .3, .02, 16), MT.metalD, x, .01, z);
  for (let i = 0; i < seats; i++) { const t = i / seats * 6.283 + .4, px = x + Math.sin(t) * (r + .32), pz = z + Math.cos(t) * (r + .32); guestChair(B, px, pz, t + Math.PI, MT.oakL); if (people && rnd() < .3) people.push([px, pz, t + Math.PI]); } }
function counter(B, x, z, w, d, a, h, top, body) { const f = fr(B, x, z, a), H = h || 1.0; f.b(w, H - .05, d, body || MT.oakD, 0, (H - .05) / 2, 0); f.b(w + .04, .05, d + .04, top || MT.stone, 0, H - .025, 0); f.b(w, .06, .02, MT.brass, 0, H - .25, d / 2 + .01); return f; }
function printer(B, x, z, a, big) { const f = fr(B, x, z, a), s = big ? 1.25 : 1; f.b(.6 * s, .9 * s, .6, MT.offW, 0, .45 * s, 0); f.b(.5 * s, .04, .4, MT.grey, 0, .9 * s + .02, .05); f.b(.3, .06, .02, MT.black, -.12, .82 * s, .31); f.b(.4 * s, .02, .3, MT.paper, 0, .6 * s, .32); }
function bed(B, x, z, w, d) { const long = d >= w, ang = long ? 0 : Math.PI / 2, L = long ? d : w, W = long ? w : d, f = fr(B, x, z, ang);
  f.b(W, .3, L, MT.walnut, 0, .15, 0); f.b(W - .08, .2, L - .1, MT.white, 0, .4, .02); f.b(W - .06, .06, L * .6, MT.fabG, 0, .52, .2 * L); f.b(W + .1, .9, .08, MT.walnut, 0, .45, -L / 2); f.b(W * .38, .12, .35, MT.offW, -W * .22, .58, -L / 2 + .3); f.b(W * .38, .12, .35, MT.offW, W * .22, .58, -L / 2 + .3); }
function toilet(B, x, z, a) { const f = fr(B, x, z, a); f.b(.38, .38, .5, MT.ceramic, 0, .2, .05); f.b(.4, .04, .52, MT.white, 0, .41, .05); f.b(.4, .45, .18, MT.ceramic, 0, .62, -.2); f.b(.08, .03, .04, MT.chrome, .12, .86, -.2); }
function sinkUnit(B, x, z, w, a, root) { const f = fr(B, x, z, a); f.b(w, .08, .52, MT.stone, 0, .84, 0); f.b(w, .5, .48, MT.walnut, 0, .55, -.02); const n = Math.max(1, Math.round(w / .8));
  for (let i = 0; i < n; i++) { const px = -w / 2 + w * (i + .5) / n; f.g(CYL(.18, .14, .1, 18), MT.ceramic, px, .93, .02); f.g(CYL(.015, .015, .22, 8), MT.chrome, px, 1.0, -.18); f.b(.02, .02, .14, MT.chrome, px, 1.1, -.12); }
  f.b(w, .9, .015, MT.chrome, 0, 1.6, -.25); }
function safe(B, x, z, a, s) { const f = fr(B, x, z, a), k = s || 1; f.b(.6 * k, .8 * k, .55, MT.metalD, 0, .4 * k, 0); f.b(.5 * k, .7 * k, .02, MT.grey, 0, .4 * k, .28); f.g(CYL(.07, .07, .03, 18), MT.chrome, 0, .45 * k, .3, 0, Math.PI / 2); f.b(.03, .14, .04, MT.chrome, .18 * k, .45 * k, .3); }
function rack(B, x, z, a) { const f = fr(B, x, z, a); f.b(.62, 2.0, .9, MT.black, 0, 1.0, 0); for (let i = 0; i < 14; i++) { f.b(.54, .08, .02, MT.metalD, 0, .2 + i * .12, .46); f.b(.02, .02, .01, i % 3 ? MT.led : MT.ledO, .2, .2 + i * .12, .475); f.b(.02, .02, .01, MT.led, .14, .2 + i * .12, .475); } }
function fridge(B, x, z, a, w) { const f = fr(B, x, z, a), W = w || .7; f.b(W, 1.85, .7, MT.steel, 0, .925, 0); f.b(.01, 1.8, .01, MT.metalD, 0, .925, .356); f.b(.03, .6, .04, MT.chrome, -.06, 1.2, .37); f.b(.03, .6, .04, MT.chrome, .06, 1.2, .37); }
function coffeeMachine(B, f, lx, lz, h) { f.b(.34, .42, .36, MT.black, lx, h + .21, lz); f.b(.2, .04, .1, MT.chrome, lx, h + .2, lz + .18); f.g(CYL(.04, .035, .09, 10), MT.ceramic, lx, h + .05, lz + .16); }

/* gọi ghế ngồi + người (ma-nơ-canh ngồi) */
function seatPeople(root, list, max) { let n = 0; for (const [x, z, a] of list) { if (n >= max) break; try { const p = A.customer({ x, z, ry: a, seat: .5, talk: rnd() < .3 }); if (p) n++; } catch (e) { /* mẫu người chưa nạp */ } } }

/* ───────────────────────── Bố trí đồ theo nhãn mặt bằng ───────────────────────── */
function roomAt(n, u, v) { const fl = PLAN.floors[n]; let best = null, ba = 1e9; fl.rooms.concat(fl.zones).forEach((r) => { if (u >= r[2] - .01 && u <= r[4] + .01 && v >= r[3] - .01 && v <= r[5] + .01) { const ar = (r[4] - r[2]) * (r[5] - r[3]); if (ar < ba) { ba = ar; best = r; } } }); return best; }
// hướng "quay mặt về phía trong phòng" cho món đồ sát tường / bảng mỏng
function faceIn(n, cu, cv, w, d) { const r = roomAt(n, cu, cv); const ru = r ? (r[2] + r[4]) / 2 : 15, rv = r ? (r[3] + r[5]) / 2 : 12; if (w >= d) return cv <= rv ? 0 : Math.PI; return cu <= ru ? Math.PI / 2 : -Math.PI / 2; }
function placeAll(n, root, B, stations, people) {
  const fl = PLAN.floors[n]; const items = fl.furn;
  const chairs = items.filter((it) => /^Ghế (GĐ|PGĐ)/.test(it[0]));
  items.forEach((it) => {
    const [lab, u0, v0, u1, v1, fl2] = it; const w = u1 - u0, d = v1 - v0, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, x = wx(cu), z = wz(cv), long = w >= d, L = long ? w : d, S = long ? d : w;
    const fin = faceIn(n, cu, cv, w, d); const m = /· (\d+) chỗ/.exec(lab), seats = m ? +m[1] : 0; const r = roomAt(n, cu, cv);
    let hit = null; const hitL = (o) => { hit = o; };
    // ---- bàn lãnh đạo (hướng theo ghế đi kèm)
    if (/Bàn (Giám đốc|GĐ|PGĐ|Phó GĐ)|Bàn PGĐ/.test(lab)) { const ch = chairs.find((c) => roomAt(n, (c[1] + c[3]) / 2, (c[2] + c[4]) / 2) === r); let a = 0;
      if (ch) { const cx2 = (ch[1] + ch[3]) / 2, cz2 = (ch[2] + ch[4]) / 2; a = Math.atan2(cu - cx2, cv - cz2); a = Math.round(a / (Math.PI / 2)) * (Math.PI / 2); }
      const dw = Math.abs(Math.sin(a)) > .5 ? d : w, dd = Math.abs(Math.sin(a)) > .5 ? w : d;
      desk(B, x, z, Math.min(dw, 2.2), Math.min(dd, 1.0), a, { exec: true, chair: false, lamp: true, k: n });
      const fx = fr(B, x, z, a); fx.b(.26, .04, .34, MT.leatherL, .55, .77, .05); fx.b(.12, .2, .02, MT.brass, -.7, .87, .25);
      return; }
    if (/^Ghế (GĐ|PGĐ)/.test(lab)) { const dk = items.find((o) => /Bàn (Giám đốc|GĐ|PGĐ|Phó GĐ)|Bàn PGĐ/.test(o[0]) && roomAt(n, (o[1] + o[3]) / 2, (o[2] + o[4]) / 2) === r);
      let a = 0; if (dk) { a = Math.atan2((dk[1] + dk[3]) / 2 - cu, (dk[2] + dk[4]) / 2 - cv); a = Math.round(a / (Math.PI / 2)) * (Math.PI / 2); }
      officeChair(B, x, z, a, true); people.push([x, z, a, 'vip']); return; }
    // ---- cụm bàn làm việc
    if (seats && /· \d+ chỗ/.test(lab) && !/Bàn họp|Quầy bar/.test(lab)) { cluster(B, root, x, z, w, d, seats, n * 3 + Math.round(cu), people); return; }
    if (/Bàn họp|Bàn ăn riêng/.test(lab)) { const nn = /(\d+) chỗ/.exec(lab); meetingTable(B, x, z, w, d, nn ? +nn[1] : Math.max(6, Math.round(L / .75) * 2), 0, root); return; }
    if (/^Bàn 6/.test(lab)) { dining(B, x, z, w, d, 6, people); return; }
    if (/^Bàn 4/.test(lab)) { roundTable(B, x, z, .5, 4, people); return; }
    if (/Bàn tròn 2 ghế/.test(lab)) { roundTable(B, x, z, .4, 2, null, MT.white); return; }
    if (/Bàn cao/.test(lab)) { B.geo(CYL(.32, .32, .04, 20), MT.oak, x, 1.05, z); B.geo(CYL(.04, .04, 1.03, 8), MT.metalD, x, .52, z); B.geo(CYL(.25, .25, .02, 14), MT.metalD, x, .01, z); [0, 2.1, 4.2].forEach((t) => stool(B, x + Math.sin(t) * .55, z + Math.cos(t) * .55, .72)); return; }
    if (/Bàn học/.test(lab)) { for (let row = 0; row < 3; row++) { const zz = wz(v0 + .5 + row * (d - .8) / 2.4); for (let t = 0; t < 2; t++) { const xx = wx(u0 + w * (t + .5) / 2); B.box(w / 2 - .3, .04, .5, MT.white, xx, .74, zz); [-1, 1].forEach((s) => B.box(.04, .72, .45, MT.metalD, xx + s * (w / 4 - .2), .36, zz));
      for (let c = 0; c < 6; c++) { const cx3 = xx - (w / 2 - .3) / 2 + (w / 2 - .3) * (c + .5) / 6; guestChair(B, cx3, zz + .55, Math.PI, MT.fabB); if (rnd() < .35) people.push([cx3, zz + .55, Math.PI]); } } } return; }
    if (/Khán đài/.test(lab)) { for (let i = 0; i < 3; i++) B.box(w, .3 + i * .3, d / 3, i % 2 ? MT.fabC : MT.oak, x, (.3 + i * .3) / 2, wz(v0 + d * (i + .5) / 3) ); for (let i = 0; i < 6; i++) B.box(.5, .12, .5, MT.cushion[i % 5], wx(u0 + .6 + i * (w - 1.2) / 5), .36 + (i % 3) * .3 + .06, wz(v0 + d * ((i % 3) + .5) / 3)); return; }
    // ---- bàn đơn có máy tính
    if (/^(Bàn (TP|KTT|IT|văn thư|PV|KSNB|giảng viên|scan|sản phẩm|in mẫu|mix)|Máy dựng|Bàn \+ đèn ring|Bàn kiểm đếm)/.test(lab)) {
      // người ngồi quay mặt ra cửa phòng nếu biết, không thì quay vào giữa phòng
      let a = long ? (r && cv > (r[3] + r[5]) / 2 ? Math.PI : 0) : (r && cu > (r[2] + r[4]) / 2 ? -Math.PI / 2 : Math.PI / 2);
      const dr = r && INFO.doorOf[r[0]]; if (dr) { const dv = dr.axis === 'h' ? dr.line : dr.c, du = dr.axis === 'h' ? dr.c : dr.line; a = long ? (dv < cv ? Math.PI : 0) : (du < cu ? -Math.PI / 2 : Math.PI / 2); }
      // ghế đặt phía sau bàn; người ngồi nhìn theo hướng a → ghế ở phía ngược
      const ang = a + Math.PI; const dd = Math.min(.8, S - .1);
      if (/KSNB ×2|Máy dựng ×2/.test(lab)) { [-1, 1].forEach((s) => { const p = fr(B, x, z, ang).P(s * L / 4, 0); desk(B, p[0], p[1], L / 2 - .1, dd, ang, { k: n + s + 3, dual: /dựng/.test(lab) }); people.push([fr(B, p[0], p[1], ang).P(0, -dd / 2 - .38)[0], fr(B, p[0], p[1], ang).P(0, -dd / 2 - .38)[1], ang]); }); return; }
      desk(B, x, z, Math.min(L, 2.0), dd, ang, { k: n + Math.round(cu), dual: /mix|TP/.test(lab), noPc: /giảng viên|sản phẩm|in mẫu/.test(lab) });
      if (/kiểm đếm/.test(lab)) { const f2 = fr(B, x, z, ang); f2.b(.32, .22, .3, MT.offW, .5, .87, .1); f2.b(.16, .06, .08, MT.green, .5, .99, .1); }
      if (/sản phẩm/.test(lab)) { const f2 = fr(B, x, z, ang);['#E8920A', '#007437', '#fff', '#084C38'].forEach((c, i) => f2.b(.18, .26, .12, A.std(c), -.5 + i * .3, .89, .1)); }
      if (/đèn ring/.test(lab)) { const f2 = fr(B, x, z, ang); f2.g(CYL(.012, .012, 1.0, 6), MT.metalD, 0, 1.26, .2); const rg = new THREE.TorusGeometry(.22, .025, 8, 28); f2.g(ni(rg), MT.lamp, 0, 1.75, .2); }
      if (/PV/.test(lab)) { const p = fr(B, x, z, ang).P(0, dd / 2 + .4); guestChair(B, p[0], p[1], ang + Math.PI, MT.fabC); }
      if (/^Bàn TP|KTT/.test(lab)) { [-1, 1].forEach((s) => { const p = fr(B, x, z, ang).P(s * .45, dd / 2 + .45); guestChair(B, p[0], p[1], ang + Math.PI, MT.fabC); }); }
      if (!/sản phẩm|in mẫu|mix|giảng/.test(lab)) people.push([fr(B, x, z, ang).P(0, -dd / 2 - .38)[0], fr(B, x, z, ang).P(0, -dd / 2 - .38)[1], ang]);
      return; }
    // ---- ghế
    if (/^Ghế khách/.test(lab)) { const dk = items.filter((o) => /^Bàn/.test(o[0])).map((o) => [o, Math.hypot((o[1] + o[3]) / 2 - cu, (o[2] + o[4]) / 2 - cv)]).sort((p, q) => p[1] - q[1])[0];
      let a = 0; if (dk) { a = Math.atan2((dk[0][1] + dk[0][3]) / 2 - cu, (dk[0][2] + dk[0][4]) / 2 - cv); a = Math.round(a / (Math.PI / 2)) * (Math.PI / 2); } guestChair(B, x, z, a, MT.fabC); return; }
    if (/^Ghế đơn/.test(lab)) { armchair(B, x, z, fin, MT.fabC); return; }
    if (/^Ghế chờ/.test(lab)) { const nn = Math.max(2, Math.floor(L / .62)); const f2 = fr(B, x, z, long ? fin : fin); for (let i = 0; i < nn; i++) { const px = -L / 2 + L * (i + .5) / nn; const p = f2.P(px, 0); guestChair(B, p[0], p[1], fin, MT.fabG); } return; }
    if (/^Ghế ngả|^Ghế thư giãn/.test(lab)) { const a = /thư giãn/.test(lab) ? Math.PI : fin; const f2 = fr(B, x, z, a); const m2 = /thư giãn/.test(lab) ? MT.fabGD : MT.fabC;
      f2.b(.7, .35, .9, m2, 0, .22, .05); f2.b(.7, .75, .2, m2, 0, .75, -.42, 0, -.45); f2.b(.6, .14, .5, m2, 0, .3, .62, 0, .3);[-1, 1].forEach((s) => f2.b(.14, .32, .9, m2, s * .36, .5, 0)); f2.b(.4, .14, .1, MT.fabO, 0, 1.08, -.5, 0, -.45);
      if (/thư giãn/.test(lab)) { hitL({ g: 'thugian', label: 'Ghế thư giãn — nghỉ 1, 3 hoặc 5 phút' }); if (!stations.some((q) => q.id === 'thugian')) stations.push({ id: 'thugian', name: 'Ghế thư giãn', x, z, a, sit: true }); }
      if (hit) addHit(root, w + .3, 1.4, d + .3, x, .7, z, hit); return; }
    if (/^Sofa|Sofa VIP|Sofa chờ/.test(lab)) { const big = /VIP|tiếp khách|chung/.test(lab); sofa(B, x, z, L, fin, /VIP/.test(lab) ? MT.leatherL : /chờ/.test(lab) ? MT.fabS : /chung/.test(lab) ? MT.fabO : MT.fabG, Math.min(.95, S));
      if (big && S > 1.6) { const f2 = fr(B, x, z, fin); [-1, 1].forEach((s) => { const p = f2.P(s * (L / 2 + .55), S / 2 - .2); armchair(B, p[0], p[1], fin + s * -Math.PI / 2, MT.fabC); }); }
      if (/chung/.test(lab)) people.push([x, z, fin]); return; }
    if (/^Bàn trà|^Bàn ăn nhẹ/.test(lab)) { coffeeTable(B, x, z, w, d, fl2 === 'o'); return; }
    if (/^Giường/.test(lab)) { bed(B, x, z, w, d); return; }
    // ---- tủ, kệ
    if (/^Kệ di động/.test(lab)) { const f2 = fr(B, x, z, 0); shelf(B, x, z, L, S, fin, 2.2); f2.g(CYL(.12, .12, .03, 16), MT.chrome, L / 2 + .05, 1.1, 0, 0, 0, Math.PI / 2); return; }
    if (/^Kệ (khô|VPP|thiết bị|ấn phẩm|hồ sơ)|^Kệ$/.test(lab)) { shelf(B, x, z, L, Math.min(S, .5), fin, /khô|thiết bị/.test(lab) ? 2.0 : 2.1, /khô|VPP|thiết bị|ấn phẩm/.test(lab) ? (/khô/.test(lab) ? 'steel' : 'box') : 'binder'); return; }
    if (/^Kệ trưng bày/.test(lab)) { shelf(B, x, z, L, Math.min(S, .45), fin, 1.6, 'box'); const f2 = fr(B, x, z, fin); for (let i = 0; i < 6; i++) f2.b(.2, .28, .01, MT.cushion[i % 5], -L / 2 + .3 + i * (L - .6) / 5, 1.75, 0, 0, -.15); return; }
    if (/^Tủ rack/.test(lab)) { rack(B, x - .4, z, fin); rack(B, x + .4, z, fin); return; }
    if (/^Tủ lạnh/.test(lab)) { fridge(B, x, z, fin); return; }
    if (/^Tủ đông/.test(lab)) { fridge(B, x - .55, z, fin, 1.1); fridge(B, x + .55, z, fin, 1.1); return; }
    if (/^Tủ hấp cơm/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(L, 1.7, S, MT.steel, 0, .85, 0); for (let i = 0; i < 4; i++) f2.b(L - .1, .02, .01, MT.metalD, 0, .3 + i * .36, S / 2 + .005); return; }
    if (/^Tủ trưng bày/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(L, .9, S, MT.walnut, 0, .45, 0); f2.b(L, 1.0, S, MT.glass, 0, 1.4, 0); f2.b(L, .04, S, MT.walnut, 0, 1.92, 0);
      for (let i = 0; i < 4; i++) { f2.g(CYL(.05, .08, .12, 12), MT.brass, -L / 2 + .3 + i * (L - .6) / 3, .97, 0); f2.g(SPH(.08, 12, 8), MT.brass, -L / 2 + .3 + i * (L - .6) / 3, 1.12, 0); f2.b(.24, .3, .02, MT.white, -L / 2 + .3 + i * (L - .6) / 3, 1.5, -.05); } return; }
    if (/^Tủ âm tường|^Tủ tựa lưng|^Tủ tài liệu|^Tủ$|^Tủ hồ sơ/.test(lab)) { const tall = /âm tường|tựa lưng|tài liệu|nhân sự/.test(lab) ? 2.1 : 1.2; if (tall > 2) { shelf(B, x, z, L, Math.min(S, .45), fin, tall, 'binder'); const f2 = fr(B, x, z, fin); f2.b(L, .9, Math.min(S, .45) + .02, MT.walnut, 0, .45, .01); }
      else cabinet(B, x, z, L, Math.min(S, .6), fin, tall, /khóa/.test(lab) ? MT.grey : MT.white); return; }
    if (/^Tủ ấn chỉ|^Điều hòa/.test(lab)) { cabinet(B, x, z, L, Math.min(S, .6), fin, /Điều hòa/.test(lab) ? 1.9 : 1.2, /Điều hòa/.test(lab) ? MT.white : MT.grey); if (/Điều hòa/.test(lab)) { const f2 = fr(B, x, z, fin); for (let i = 0; i < 8; i++) f2.b(L - .1, .02, .01, MT.grey, 0, 1.2 + i * .07, Math.min(S, .6) / 2 + .01); } return; }
    if (/^Két/.test(lab)) { safe(B, x, z, fin, /sắt/.test(lab) ? 1.15 : 1); return; }
    // ---- quầy
    if (/^Quầy/.test(lab)) { const bar = /bar cửa sổ/.test(lab); const a = bar ? Math.PI : fin; const h = bar ? 1.08 : 1.0;
      const body = /chia suất|trả khay/.test(lab) ? MT.steel : /café|trà|ăn vặt|pha/.test(lab) ? MT.oakD : MT.oakD; const f2 = counter(B, x, z, L, Math.min(S, bar ? .45 : .75), a, h, MT.stone, body);
      if (bar) { const nn = 24; for (let i = 0; i < nn; i++) { const p = f2.P(-L / 2 + L * (i + .5) / nn, -.55); stool(B, p[0], p[1], .78); } }
      if (/kính/.test(lab)) { f2.b(L, .8, .02, MT.glass, 0, 1.4, 0); for (let i = 0; i <= 3; i++) f2.b(.04, .8, .05, MT.frame, -L / 2 + L * i / 3, 1.4, 0); for (let i = 0; i < 3; i++) { f2.b(.3, .02, .08, MT.metalD, -L / 2 + L * (i + .5) / 3, 1.03, .35); const p = f2.P(-L / 2 + L * (i + .5) / 3, -.75); officeChair(B, p[0], p[1], a + Math.PI); people.push([p[0], p[1], a + Math.PI]); const q = f2.P(-L / 2 + L * (i + .5) / 3, -.3); monitor(B, fr(B, q[0], q[1], a + Math.PI), 0, -.1, i, null); } }
      if (/chia suất/.test(lab)) { f2.b(L, .5, .02, MT.glass, 0, 1.35, .15, 0, -.4); for (let i = 0; i < 8; i++) { f2.b(L / 8 - .1, .06, .42, MT.chrome, -L / 2 + L * (i + .5) / 8, 1.0, 0); f2.b(L / 8 - .2, .04, .34, MT.cushion[i % 5], -L / 2 + L * (i + .5) / 8, 1.03, 0); }
        screenWall(root, B, bigScreenTex('menu'), x, z - .1, a, 2.4, 1.35, 2.35); for (let i = 0; i < 3; i++) { const p = f2.P(-2.5 + i * 2.5, -.75); people.push([p[0], p[1], a + Math.PI, 'stand']); } }
      if (/trả khay/.test(lab)) { for (let i = 0; i < 5; i++) f2.b(L - .1, .02, .4, MT.offW, 0, 1.06 + i * .08, 0); }
      if (/café|pha|trà/.test(lab)) { coffeeMachine(B, f2, -L / 2 + .35, 0, h); for (let i = 0; i < 6; i++) f2.g(CYL(.04, .033, .09, 10), MT.ceramic, -L / 2 + .8 + i * .14, h + .05, .15);
        if (/trà/.test(lab)) { f2.g(SPH(.13, 16, 10), MT.ceramic, L / 2 - .4, h + .12, 0); } }
      if (/ăn vặt/.test(lab)) { for (let i = 0; i < 5; i++) f2.g(CYL(.1, .1, .28, 14), MT.glass, -L / 2 + .4 + i * .5, h + .14, 0); fridge(B, f2.P(L / 2 - .2, -.9)[0], f2.P(L / 2 - .2, -.9)[1], a + Math.PI, .6); }
      if (/cấp phát/.test(lab)) { monitor(B, f2, 0, -.15, 2, null); }
      return; }
    // ---- bảng / màn hình / tường trang trí
    if (/Màn hình LED|Màn hình \+ camera|Màn chiếu|Màn hình chiến dịch|Tường logo|Tường kính viết bảng/.test(lab)) {
      const kind = /LED/.test(lab) ? 'led' : /camera/.test(lab) ? 'meet' : /chiếu/.test(lab) ? 'train' : /chiến dịch/.test(lab) ? 'dash' : null;
      if (/camera/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(.8, .9, .45, MT.walnut, 0, .45, 0); screenWall(root, B, bigScreenTex('meet'), f2.P(0, -.05)[0], f2.P(0, -.05)[1], fin, 1.9, 1.07, 1.5); f2.b(.5, .07, .07, MT.black, 0, 2.1, .02); return; }
      if (/logo/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(L, 2.6, .08, MT.walnut, 0, 1.3, -.02); panelMesh(root, logoTex('CHI NHÁNH THÀNH ĐÔ'), Math.min(L - .4, 4), Math.min(L - .4, 4) * .375, f2.P(0, .03)[0], 1.55, f2.P(0, .03)[1], fin); return; }
      if (/kính viết bảng/.test(lab)) { const t = texOnce('wb', 1024, 256, (x2, W2, H2) => { x2.clearRect(0, 0, W2, H2); x2.strokeStyle = '#E8920A'; x2.lineWidth = 6; x2.strokeRect(40, 40, 260, 160); x2.fillStyle = '#084C38'; x2.font = `700 44px ${F}`; x2.fillText('Ý tưởng tuần này', 340, 90); x2.font = `500 34px ${F}`; ['• Trà Đá Bảo Hiểm tập 12', '• TNDS 10 giây — A/B', '• Livestream thứ 6'].forEach((s, i) => x2.fillText(s, 340, 140 + i * 40)); });
        const m2 = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.1), A.basic(t, { transparent: true })); const f2 = fr(B, x, z, fin); const p = f2.P(0, .04); m2.position.set(p[0], 1.55, p[1]); m2.rotation.y = fin; root.add(m2); return; }
      screenWall(root, B, bigScreenTex(kind), x, z, fin, Math.min(L, /chiếu/.test(lab) ? 3.6 : 3.4), Math.min(L, 3.4) * .5625 * (/chiếu/.test(lab) ? .9 : 1), /chiếu/.test(lab) ? 1.85 : 1.75); return; }
    // ---- máy móc
    if (/^Máy in|Máy photo/.test(lab)) { printer(B, x, z, fin, /A3|photo/.test(lab)); return; }
    if (/^Máy hủy/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(.42, .62, .34, MT.metalD, 0, .31, 0); f2.b(.3, .02, .02, MT.black, 0, .63, 0); return; }
    if (/^Máy quay/.test(lab)) { [0, 2.1, 4.2].forEach((t) => B.box(.025, 1.4, .025, MT.metalD, x + Math.sin(t) * .25, .7, z + Math.cos(t) * .25, 0, Math.sin(t) * .18, -Math.cos(t) * .18)); B.box(.32, .2, .4, MT.black, x, 1.48, z); B.geo(CYL(.06, .07, .14, 14), MT.black, x, 1.48, z - .26, 0, Math.PI / 2); return; }
    if (/^Đèn$/.test(lab)) { B.geo(CYL(.015, .015, 1.9, 6), MT.metalD, x, .95, z);[0, 2.1, 4.2].forEach((t) => B.box(.02, .02, .45, MT.metalD, x + Math.sin(t) * .2, .05, z + Math.cos(t) * .2, t)); B.box(.6, .6, .3, MT.black, x, 1.95, z); B.box(.56, .56, .01, MT.lamp, x, 1.95, z + .16); return; }
    if (/^Phông xanh/.test(lab)) { B.box(L, 2.8, .05, MT.green, x, 1.4, z + .1); B.box(L, .05, 1.6, MT.green, x, .03, z + .9); [-1, 1].forEach((s) => B.geo(CYL(.02, .02, 2.9, 6), MT.metalD, x + s * L / 2, 1.45, z + .05)); return; }
    if (/^Buồng thu/.test(lab)) { B.box(w, 2.3, d, MT.glass, x, 1.15, z); B.box(w, .06, d, MT.frame, x, 2.3, z); B.box(.08, 2.3, .08, MT.frame, x - w / 2, 1.15, z - d / 2); B.box(.08, 2.3, .08, MT.frame, x + w / 2, 1.15, z - d / 2); B.box(.08, 2.3, .08, MT.frame, x - w / 2, 1.15, z + d / 2); B.box(.08, 2.3, .08, MT.frame, x + w / 2, 1.15, z + d / 2);
      B.geo(CYL(.012, .012, 1.5, 6), MT.metalD, x, .75, z); B.geo(CYL(.045, .045, .14, 12), MT.black, x, 1.55, z); B.geo(CYL(.12, .12, .01, 18), MT.fabS, x, 1.55, z + .12, 0, Math.PI / 2); for (let i = 0; i < 6; i++) B.box(.5, .5, .05, MT.fabGD, x - w / 2 + .3 + (i % 3) * (w - .6) / 2, 1.0 + Math.floor(i / 3) * .7, z - d / 2 + .06); return; }
    if (/^Standee/.test(lab)) { const t = texOnce('stdee', 400, 1000, (x2, W2, H2) => { x2.fillStyle = '#084C38'; x2.fillRect(0, 0, W2, H2); const Lg = A.IMG.full; x2.fillStyle = '#fff'; A.rr(x2, 30, 40, W2 - 60, 160, 20); x2.fill(); if (Lg) { const lw = W2 - 100, lh = lw * Lg.height / Lg.width; x2.drawImage(Lg, 50, 40 + (160 - lh) / 2, lw, lh); }
        x2.fillStyle = '#fff'; x2.font = `900 64px ${F}`; x2.fillText('TNDS Ô TÔ', 40, 340); x2.fillText('10 GIÂY', 40, 420); x2.fillStyle = '#E8920A'; x2.font = `800 48px ${F}`; x2.fillText('dbv247.com.vn', 40, 900); });
      [-.6, 0, .6].forEach((o) => { const m2 = new THREE.Mesh(new THREE.PlaneGeometry(.6, 1.6), A.basic(t)); m2.position.set(x + o, .85, z); m2.rotation.y = fin; root.add(m2); B.box(.62, .04, .3, MT.metalD, x + o, .02, z); }); return; }
    if (/^Thùng quà tặng/.test(lab)) { for (let i = 0; i < 6; i++) B.box(.5, .4, .4, i % 2 ? MT.fabO : MT.fabC, x - L / 2 + .3 + (i % 3) * (L - .6) / 2, .2 + Math.floor(i / 3) * .4, z); return; }
    // ---- bếp
    if (/^Bếp nấu/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(L, .85, S, MT.steel, 0, .425, 0); for (let i = 0; i < 6; i++) { f2.g(CYL(.22, .22, .04, 20), MT.black, -L / 2 + .6 + i * (L - 1.2) / 5, .87, 0); f2.g(CYL(.26, .2, .3, 18), MT.chrome, -L / 2 + .6 + i * (L - 1.2) / 5, 1.05, 0); } f2.b(L + .2, .5, S + .3, MT.steel, 0, 2.55, -.05); f2.b(L, .02, S, MT.metalD, 0, 2.3, -.05); people.push([f2.P(-1, .95)[0], f2.P(-1, .95)[1], fin + Math.PI, 'stand']); return; }
    if (/^Bàn sơ chế|^Bàn ra món/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(L, .05, S, MT.steel, 0, .88, 0); f2.b(L - .1, .03, S - .1, MT.steel, 0, .25, 0);[-1, 1].forEach((s) => [-1, 1].forEach((t) => f2.b(.05, .88, .05, MT.steel, s * (L / 2 - .05), .44, t * (S / 2 - .05)))); for (let i = 0; i < 4; i++) f2.b(.4, .12, .3, i % 2 ? MT.offW : MT.green, -L / 2 + .4 + i * (L - .8) / 3, .97, 0); return; }
    if (/^Chậu rửa|^Bồn rửa tay/.test(lab)) { sinkUnit(B, x, z, L, fin, root); return; }
    if (/Lối giao hàng/.test(lab)) { for (let i = 0; i < 8; i++) B.box(L / 8, .005, S, i % 2 ? MT.black : A.std('#F6C344'), x - L / 2 + L * (i + .5) / 8, .01, z); return; }
    // ---- trang trí, cây
    if (/^Cây/.test(lab)) { plantAt(root, x, z, rnd() < .5 ? 'ficus' : 'bush', Math.min(1.25, .7 + S * .3)); return; }
    if (/Lounge|Ghế lười/.test(lab)) { B.geo(CYL(Math.min(w, d) / 2 * .95, Math.min(w, d) / 2 * .95, .01, 40), MT.rug, x, .006, z, 0, 0, 0, w / Math.min(w, d), 1, d / Math.min(w, d)); const nb = 6;
      for (let i = 0; i < nb; i++) { const t = i / nb * 6.283, px = x + Math.sin(t) * w * .32, pz = z + Math.cos(t) * d * .3; B.geo(SPH(.42, 16, 10), MT.cushion[i % 5], px, .26, pz, 0, 0, 0, 1, .62, 1); if (rnd() < .4) people.push([px, pz, t + Math.PI, 'bag']); }
      coffeeTable(B, x, z, 1.2, 1.2, true); return; }
    // ---- Tầng 7: các trò của Phòng Relax
    if (n === 7) { if (relax(lab, root, B, x, z, w, d, L, S, fin, stations, people)) return; }
    // ---- mặc định: khối gỗ đơn giản
    B.box(w * .9, .75, d * .9, MT.oak, x, .375, z);
  });
}
function addHit(root, w, h, d, x, y, z, o) { const m = A.hitBox(w, h, d, x, y, z, { type: 'st', id: 'u7_' + o.g, label: o.label }); return m; }

/* Tầng 7 — đồ của Phòng Relax (gắn đúng 10 trò đã có trong giai-tri.js) */
let TX7 = null;
function relax(lab, root, B, x, z, w, d, L, S, fin, stations, people) {
  const tx = TX7 || {}; const game = (g, label, sx, sz, extra) => { addHit(root, Math.max(w, .8) + .3, 2.2, Math.max(d, .8) + .3, x, 1.1, z, { g, label }); stations.push(Object.assign({ id: g, name: label.split(' — ')[0], x, z, a: fin }, extra || {})); };
  if (/Bảng đen đố vui/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(L + .1, 1.9, .06, MT.walnut, 0, 1.75, -.02); if (tx.board) { const m = panelMesh(root, tx.board, L - .1, (L - .1) * .625, f2.P(0, .02)[0], 1.78, f2.P(0, .02)[1], fin); m.material.toneMapped = false; } game('dovui', 'Đố vui trà chiều — câu đố 15:00 các ngày làm việc'); return true; }
  if (/Tường sinh nhật/.test(lab)) { const f2 = fr(B, x, z, fin); f2.b(L, 2.6, .12, MT.wall, 0, 1.3, 0); if (tx.bday) { const m = panelMesh(root, tx.bday, L - .4, (L - .4) * .625, f2.P(0, .07)[0], 1.55, f2.P(0, .07)[1], fin); m.material.toneMapped = false; }
    // bánh kem trên kệ
    const p = f2.P(L / 2 - .5, .45); B.box(.7, .8, .45, MT.oak, p[0], .4, p[1]); B.geo(CYL(.18, .18, .16, 24), MT.white, p[0], .88, p[1]); B.geo(CYL(.13, .13, .1, 24), A.std('#F7C9D3'), p[0], 1.01, p[1]); for (let i = 0; i < 5; i++) B.geo(CYL(.008, .008, .08, 6), MT.white, p[0] + Math.cos(i * 1.26) * .08, 1.1, p[1] + Math.sin(i * 1.26) * .08);
    for (let i = 0; i < 6; i++) B.geo(SPH(.16, 12, 10), MT.cushion[i % 5], x - L / 2 + .3 + i * .25, 2.6 + (i % 2) * .15, z + .3);
    game('sinhnhat', 'Tường sinh nhật — thổi nến, gửi lời chúc'); return true; }
  if (/Bảng giấy nhớ/.test(lab)) { const a = Math.PI / 2; const f2 = fr(B, x, z, a); f2.b(L + .1, 1.9, .06, MT.walnut, 0, 1.45, 0); [-1, 1].forEach((s) => f2.b(.06, 1.0, .5, MT.metalD, s * (L / 2 - .1), .5, 0)); if (tx.cork) panelMesh(root, tx.cork, L - .1, (L - .1) * .625, f2.P(0, .035)[0], 1.5, f2.P(0, .035)[1], a, true);
    game('giaynho', 'Bảng giấy nhớ — dán lời nhắn, thả tim'); return true; }
  if (/Máy nghe nhạc/.test(lab)) { const a = -Math.PI / 2, f2 = fr(B, x, z, a); f2.b(.9, 1.5, .6, MT.walnut, 0, .75, 0); f2.g(CYL(.45, .45, .6, 24, 1), MT.walnut, 0, 1.5, 0, 0, Math.PI / 2); for (let i = 0; i < 6; i++) f2.b(.06, 1.2, .02, MT.ledO, -.35 + i * .14, .8, .31); if (tx.juke) panelMesh(root, tx.juke, .5, .5, f2.P(0, .31)[0], 1.25, f2.P(0, .31)[1], a);
    game('nhac', 'Máy nghe nhạc — chọn nhạc cho cả phòng'); return true; }
  if (/Máy gắp thú/.test(lab)) { const f2 = fr(B, x, z, Math.PI); f2.b(1.0, .9, .9, MT.red, 0, .45, 0); f2.b(.96, 1.0, .86, MT.glass, 0, 1.4, 0); f2.b(1.0, .3, .9, MT.red, 0, 2.05, 0); f2.b(.9, .2, .02, MT.ledO, 0, 2.05, .46);
    for (let i = 0; i < 9; i++) f2.g(SPH(.11, 10, 8), MT.cushion[i % 5], -.3 + (i % 3) * .3, 1.0, -.25 + Math.floor(i / 3) * .25); f2.g(CYL(.01, .01, .4, 6), MT.chrome, 0, 1.7, 0); f2.g(SPH(.06, 10, 8), MT.chrome, 0, 1.5, 0);
    if (!stations.some((s) => s.id === 'gap')) game('gap', 'Máy gắp thú — 3 lượt mỗi ngày'); return true; }
  if (/Góc chụp ảnh/.test(lab)) { const t = texOnce('photo', 1024, 768, (x2, W2, H2) => { const g = x2.createLinearGradient(0, 0, W2, H2); g.addColorStop(0, '#FFF6EA'); g.addColorStop(1, '#DCEFE3'); x2.fillStyle = g; x2.fillRect(0, 0, W2, H2); x2.fillStyle = '#E8920A'; for (let i = 0; i < 40; i++) { x2.beginPath(); x2.arc(rnd() * W2, rnd() * H2, 6 + rnd() * 14, 0, 7); x2.fill(); }
      x2.fillStyle = '#084C38'; x2.font = `900 96px ${F}`; x2.textAlign = 'center'; x2.fillText('DBV TEAM', W2 / 2, 300); x2.fillStyle = '#007437'; x2.font = `700 52px ${F}`; x2.fillText('#ThanhDo #DBV247', W2 / 2, 380); });
    B.box(L - .4, 2.5, .08, MT.white, x, 1.25, z - S / 2 + .1);
    panelMesh(root, t, L - .6, (L - .6) * .75 > 2.3 ? 2.3 : (L - .6) * .75, x, 1.3, z - S / 2 + .16, 0); [-1, 1].forEach((s) => { B.geo(CYL(.015, .015, 1.8, 6), MT.metalD, x + s * (L / 2 - .3), .9, z + .4); B.box(.4, .4, .2, MT.black, x + s * (L / 2 - .3), 1.85, z + .4, s * -.5); B.box(.36, .36, .01, MT.lamp, x + s * (L / 2 - .3) - s * .05, 1.85, z + .5, s * -.5); });
    B.box(.6, .45, .6, MT.fabO, x, .23, z + .2); game('anh', 'Góc chụp ảnh — khung DBV, sinh nhật, polaroid'); return true; }
  if (/Phi tiêu KPI/.test(lab)) { const a = Math.PI / 2, f2 = fr(B, x, z, a); f2.b(L, 2.2, .1, MT.walnut, 0, 1.1, 0); const t = texOnce('dart', 512, 512, (x2, W2) => { const c = W2 / 2, R0 = W2 / 2 - 6; x2.fillStyle = '#1d2433'; x2.beginPath(); x2.arc(c, c, R0, 0, 7); x2.fill(); [[1, '#F7F1E6'], [.85, '#0E3B2C'], [.55, '#F7F1E6'], [.3, '#007437'], [.1, '#E8920A']].forEach(([r, col]) => { x2.fillStyle = col; x2.beginPath(); x2.arc(c, c, R0 * r * .94, 0, 7); x2.fill(); }); x2.fillStyle = '#fff'; x2.font = `900 30px ${F}`; x2.textAlign = 'center'; x2.fillText('KPI', c, c + 10); });
    const m = new THREE.Mesh(new THREE.CircleGeometry(.45, 40), A.basic(t)); const p = f2.P(0, .06); m.position.set(p[0], 1.6, p[1]); m.rotation.y = a; root.add(m); game('phitieu', 'Phi tiêu KPI — 5 phi tiêu, bảng xếp hạng tuần'); return true; }
  if (/Vạch đứng/.test(lab)) { B.box(S, .006, L, MT.ledO, x, .01, z); return true; }
  if (/Ném giấy/.test(lab)) { B.box(L - .6, .04, .8, MT.oak, x, .74, z - .3); [-1, 1].forEach((s) => B.box(.05, .72, .7, MT.metalD, x + s * (L / 2 - .4), .36, z - .3)); for (let i = 0; i < 10; i++) B.geo(SPH(.04, 8, 6), MT.paper, x - .8 + (i % 5) * .12, .8, z - .4 + Math.floor(i / 5) * .12);
    B.geo(CYL(.22, .18, .55, 20, 1), MT.metalD, x + L / 2 - .5, .28, z + S / 2 - .4); B.box(.5, .02, .02, MT.ledO, x + L / 2 - .5, .56, z + S / 2 - .2);
    B.geo(CYL(.02, .02, 1.2, 6), MT.metalD, x - L / 2 + .3, .6, z + .5); B.geo(CYL(.25, .25, .1, 20), MT.white, x - L / 2 + .3, 1.25, z + .5, 0, Math.PI / 2); game('nem', 'Ném giấy vào thùng — 10 viên, có gió quạt'); return true; }
  if (/Bot em gái DBV/.test(lab)) { B.box(L, .25, S + 1, MT.walnut, x, .125, z - .3); B.box(L, .03, .05, MT.ledO, x, .25, z - S / 2 - .8);
    const neon = texOnce('neon', 1600, 300, (x2, W2, H2) => { x2.clearRect(0, 0, W2, H2); x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.font = `900 150px ${F}`; x2.shadowColor = '#FFB547'; x2.shadowBlur = 40; x2.fillStyle = '#FFE2A8'; x2.fillText('PHÒNG RELAX', W2 / 2, H2 / 2 - 10); x2.shadowColor = '#5FE0A2'; x2.shadowBlur = 22; x2.fillStyle = '#C9F5DD'; x2.font = `700 46px ${F}`; x2.fillText('Làm hết sức · Chơi hết mình', W2 / 2, H2 - 34); });
    const nm = panelMesh(root, neon, 5.2, .98, x, 2.75, z + S / 2 - .1, Math.PI); nm.material.transparent = true;
    const scr = texOnce('botscr', 1280, 720, (x2, W2, H2) => { const g = x2.createLinearGradient(0, 0, W2, H2); g.addColorStop(0, '#0B5A3A'); g.addColorStop(1, '#123A2C'); x2.fillStyle = g; x2.fillRect(0, 0, W2, H2); x2.fillStyle = '#F6E7B0'; x2.font = `900 90px ${F}`; x2.textAlign = 'center'; x2.fillText('Bot em gái DBV', W2 / 2, 300); x2.fillStyle = '#A8D5BD'; x2.font = `600 48px ${F}`; x2.fillText('Chuyện cười · bói vui · tám chuyện', W2 / 2, 400); x2.fillStyle = '#E8920A'; x2.fillText('Bấm để trò chuyện', W2 / 2, 520); });
    screenWall(root, B, scr, x, z + S / 2 - .15, Math.PI, 3.2, 1.8, 1.55);
    let bot = null; try { bot = A.person({ female: true, suit: '#007437', accent: '#E8920A', hair: '#2b1a12', pants: '#1f2a3d', tag: true }, x + 2.2, z, Math.PI); bot.g.position.y = .25; } catch (e) { bot = null; }
    FL7OBJ.bot = bot; game('bot', 'Bot em gái DBV — trò chuyện, kể chuyện cười, bói vui', 0, 0, { look: new V3(x, 1.6, z + S / 2) }); return true; }
  if (/Cửa nhập mã/.test(lab)) { const f2 = fr(B, x, z, 0); [-1, 1].forEach((s) => f2.b(.14, 2.7, .3, MT.walnut, s * (L / 2 + .1), 1.35, 0)); f2.b(L + .4, .5, .3, MT.greenD, 0, 2.95, 0);
    const t = texOnce('relaxgate', 1024, 160, (x2, W2, H2) => { x2.fillStyle = '#084C38'; x2.fillRect(0, 0, W2, H2); x2.fillStyle = '#E8920A'; x2.fillRect(0, H2 - 12, W2, 12); x2.fillStyle = '#fff'; x2.textAlign = 'center'; x2.font = `800 64px ${F}`; x2.fillText('KHU NHÂN VIÊN · PHÒNG RELAX', W2 / 2, 96); });
    panelMesh(root, t, L + .3, .47, x, 2.95, z + .16, 0); panelMesh(root, t, L + .3, .47, x, 2.95, z - .16, Math.PI); return true; }
  if (/Bóng bàn/.test(lab)) { const long = w >= d, f2 = fr(B, x, z, long ? Math.PI / 2 : 0); f2.b(1.52, .04, 2.74, MT.ppBlue, 0, .76, 0); f2.b(1.52, .005, .02, MT.white, 0, .785, 0); f2.b(.02, .005, 2.74, MT.white, 0, .785, 0); f2.b(1.7, .15, .02, MT.white, 0, .86, 0);[-1, 1].forEach((s) => [-1, 1].forEach((t) => f2.b(.05, .74, .05, MT.metalD, s * .65, .37, t * 1.1)));
    f2.b(.15, .02, .25, MT.red, .4, .8, .9); f2.g(SPH(.02, 8, 6), MT.white, -.2, .85, .3); people.push([f2.P(0, 1.8)[0], f2.P(0, 1.8)[1], f2.a + Math.PI, 'stand']); return true; }
  if (/Bi lắc/.test(lab)) { const f2 = fr(B, x, z, 0); f2.b(L - .2, .3, S, MT.walnut, 0, .75, 0); f2.b(L - .3, .02, S - .1, MT.felt, 0, .9, 0);[-1, 1].forEach((s) => [-1, 1].forEach((t) => f2.b(.07, .6, .07, MT.walnut, s * (L / 2 - .2), .3, t * (S / 2 - .1))));
    for (let i = 0; i < 6; i++) { f2.b(.02, .02, S + .6, MT.chrome, -L / 2 + .4 + i * (L - .8) / 5, .95, 0); f2.b(.06, .06, .12, MT.black, -L / 2 + .4 + i * (L - .8) / 5, .95, S / 2 + .3); for (let k = 0; k < 3; k++) f2.b(.05, .14, .04, i % 2 ? MT.red : MT.blue, -L / 2 + .4 + i * (L - .8) / 5, .93, -S / 2 + .2 + k * (S - .4) / 2); } return true; }
  return false;
}
const FL7OBJ = {};

/* ───────────────────────── Lõi thang: biển tầng, bảng chỉ dẫn, WC ───────────────────────── */
function buildCoreDecor(n, root, B) {
  // bảng chỉ dẫn các tầng trên vách trái sảnh thang máy, biển tầng trên vách phải
  panelMesh(root, dirTex(n), .9, 1.2, wx(11.4) + .08, 1.55, wz(4.6), Math.PI / 2);
  panelMesh(root, floorSignTex(n), 2.4, .72, wx(15.8) - .08, 1.75, wz(4.55), -Math.PI / 2);
  B.box(.04, .8, 2.5, MT.walnut, wx(15.8) - .05, 1.75, wz(4.55));
  plantAt(root, wx(15.4), wz(6.2), 'snake', .9);
  // WC Nam / Nữ
  [[18.6, 20.4, 'nam'], [20.4, 22.2, 'nu']].forEach(([a, b, k]) => { const cx = wx((a + b) / 2);
    sinkUnit(B, cx, wz(5.0), 1.2, Math.PI, root);
    B.box(b - a - .14, 2.0, .04, MT.oakL, cx, 1.05, wz(2.6)); // vách ngăn buồng
    toilet(B, cx, wz(.45), 0); if (k === 'nam') { B.box(.36, .6, .3, MT.ceramic, cx - .45, .9, wz(3.25)); B.box(.36, .6, .3, MT.ceramic, cx + .45, .9, wz(3.25)); }
    B.box(.8, 2.0, .04, MT.oakD, cx + .2, 1.0, wz(2.62) + .3, .9); });
}

/* ───────────────────────── Dựng một tầng ───────────────────────── */
let INFO = { doorOf: {}, locks: {} };
const DESC = {
  'Phòng Giám đốc': 'Phòng làm việc của Giám đốc chi nhánh ở góc mặt tiền, hai mặt kính nhìn ra phố. Bàn làm việc lưng tựa tủ, nhìn về hai cửa; có sofa tiếp khách, phòng nghỉ và WC riêng.',
  'Phòng Phó Giám đốc': 'Phòng Phó Giám đốc ở góc mặt tiền bên phải, lưng tựa tủ, nhìn về cửa vào.',
  'Phòng họp Ban GĐ': 'Phòng họp 16 chỗ giữa mặt tiền, màn hình LED trình chiếu, vách kính về phía sảnh tầng.',
  'Phòng tiếp khách VIP': 'Đón khách lớn, đối tác doanh nghiệp trước khi vào gặp Giám đốc.',
  'Phòng họp trực tuyến': 'Họp trực tuyến với tập đoàn và các chi nhánh — màn hình, camera hội nghị, cách âm.',
  'Kho hồ sơ mật – lưu trữ': 'Lưu hồ sơ hợp đồng, quyết định của Ban Giám đốc, có két và tủ khóa.',
  'Pantry': 'Pha trà, cà phê phục vụ phòng họp và khách của Ban Giám đốc.',
  'Quầy giao dịch nội bộ': 'Nhân viên các phòng và CTV nộp chứng từ, hồ sơ thanh toán qua quầy kính 3 ô.',
  'Khu làm việc Kế toán': '6 nhóm theo dòng tiền bảo hiểm: thu phí, chi bồi thường, hoa hồng CTV – đại lý, thuế, công nợ, tổng hợp.',
  'Phòng ngân quỹ': 'Két sắt, máy đếm tiền, tủ ấn chỉ; cửa từ và camera, gần thang máy để chuyển tiền an toàn.',
  'Phòng đào tạo': '36 chỗ, màn chiếu — đào tạo nhân viên mới và lớp CTV – đại lý.',
  'Khu làm việc Nhân sự': 'Tuyển dụng, C&B – lương thưởng, đào tạo – phát triển.',
  'Khu Hành chính – Tổng hợp': 'Hành chính, pháp chế, IT helpdesk, máy in chung.',
  'Studio quay – chụp': 'Phông xanh, đèn, máy quay — quay video "Trà Đá Bảo Hiểm", chụp ảnh sản phẩm.',
  'Phòng thu – lồng tiếng': 'Buồng thu cách âm và bàn mix để lồng tiếng video.',
  'Phòng livestream': 'Livestream TikTok, Facebook với đèn ring, nhìn ra mặt tiền.',
  'Khu làm việc Marketing': 'Content & Social, Thiết kế, Video, Quảng cáo, Website – SEO, CRM – dữ liệu khách hàng.',
  'Khu ăn chung': 'Khoảng 150 chỗ: bàn 6, bàn 4, quầy bar cửa sổ nhìn ra phố.',
  'Bếp chính': 'Bếp công nghiệp, khu sơ chế, chậu rửa, tủ hấp cơm — mở thẳng ra quầy chia suất.',
  'Phòng ăn riêng': 'Phòng ăn 12 chỗ cho Ban Giám đốc và tiếp khách.',
  'Phòng nghỉ trưa': 'Ghế ngả yên tĩnh để nghỉ trưa.',
  'Quầy trà chiều': 'Quầy trà và bảng đố vui 15:00 — trả lời ở đây tính điểm chung với nhóm Zalo.',
  'Góc thư giãn': 'Ghế thư giãn nhìn ra cửa sổ phía sau, nghỉ 1, 3 hoặc 5 phút.',
};
function build(n) {
  mats(); INFO = { doorOf: {}, locks: {} };
  const fl = PLAN.floors[n], Y = Yof(n), root = new THREE.Group(); root.position.y = Y; A.scene.add(root);
  const before = new Set(A.scene.children); const saveObs = A.OBS.splice(0); const clickBefore = A.clickables.length; const B = new Batch(); rs = 11 + n * 97;
  buildShell(n, root, B);
  buildWalls(n, root, B, INFO);
  const liftDoors = liftCore(n, root, B);
  buildCoreDecor(n, root, B);
  const stations = [], people = [];
  if (n === 7) { try { TX7 = window.GT3D && window.GT3D.tx ? window.GT3D.tx() : null; } catch (e) { TX7 = null; } }
  placeAll(n, root, B, stations, people);
  B.flush(root);
  // người: ngồi ở ghế (tối đa 12/tầng), vài người đứng
  const sit = people.filter((p) => !p[3] || p[3] === 'vip'), stand = people.filter((p) => p[3] === 'stand');
  sit.sort((p, q) => (p[3] === 'vip' ? -1 : 0) - (q[3] === 'vip' ? -1 : 0)); seatPeople(root, sit, n === 6 ? 14 : 12);
  stand.slice(0, 4).forEach(([x, z, a]) => { try { A.customer({ x, z, ry: a, talk: true }); } catch (e) { /* bỏ qua */ } });
  // gom mọi thứ vừa thêm vào cảnh vào nhóm của tầng
  A.scene.children.filter((c) => !before.has(c) && c !== root).forEach((c) => root.add(c));
  const set = new Set(); root.traverse((o) => set.add(o)); root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const obs = A.OBS.splice(0); A.OBS.push(...saveObs);
  const dyn = {}; Object.keys(INFO.locks).forEach((nm) => INFO.locks[nm].forEach((L) => { dyn[L.key] = L.rect; }));
  const f = FL[n] = { root, set, Y, obs, dyn, locks: INFO.locks, walk: [[-14.85, -12.75, 14.85, 10.95]], doors: liftDoors, stations: [], rooms: fl.rooms.concat(fl.zones) };
  registerStations(n, f, stations);
  return f;
}
function registerStations(n, f, games) {
  const fl = PLAN.floors[n], E = f.Y + 1.62, skip = new Set(fl.skip || []);
  const list = fl.rooms.concat(fl.zones).filter((r) => r[0] && !skip.has(r[0]) && !/^Hành lang$/.test(r[0]) && !(n === 7 && /Khu Relax/.test(r[0])));
  list.forEach((r, i) => { const id = 'u' + n + '_' + i, cu = (r[2] + r[4]) / 2, cv = (r[3] + r[5]) / 2, dr = INFO.doorOf[r[0]];
    let su = cu, sv = cv; if (dr) { if (dr.axis === 'h') { su = dr.c; sv = dr.line + (dr.out > 0 ? -1.1 : 1.1); } else { sv = dr.c; su = dr.line + (dr.out > 0 ? -1.1 : 1.1); } }
    else { sv = Math.min(r[5] - .9, Math.max(r[3] + .9, 7.6)); }
    const stand = new V3(wx(su), E, wz(sv)), look = new V3(wx(cu + (cu - su) * .3), f.Y + 1.2, wz(cv + (cv - sv) * .3));
    const area = Math.round((r[4] - r[2]) * (r[5] - r[3]));
    const infoOpen = () => A.openInfo({ title: r[0], tag: 'Tầng ' + n + ' · ' + FLOOR_LIST[n - 1][1], icon: iconOf(r), color: '#084C38', soft: '#EFF8F2', intro: (DESC[r[0]] || (r[1] ? r[1].replace(/^./, (c) => c.toUpperCase()) + '.' : 'Thuộc ' + FLOOR_LIST[n - 1][1] + '.')),
        body: `<div class="sp"><b>Diện tích</b><p>Khoảng ${area} m² · tầng ${n} DBV Building</p></div>` + (r[1] && DESC[r[0]] ? `<div class="sp"><b>Ghi chú</b><p>${r[1]}</p></div>` : '') + '<p class="note">Bấm sàn để đi lại, phím mũi tên để dạo quanh phòng.</p>',
        ft2: ['Thang máy', liftPanel, 'lift'] });
    A.STATIONS[id] = { name: r[0], kind: 'info', walk: stand.clone(), stand, look, back: stand.clone(), open: infoOpen };
    if (LOCK[r[0]] && !UNL.has(r[0])) { const inside = { walk: stand.clone(), stand: stand.clone(), look: look.clone() };
      const o = dr ? (dr.axis === 'h' ? new V3(wx(dr.c), E, wz(dr.line + dr.out * 2.2)) : new V3(wx(dr.line + dr.out * 2.2), E, wz(dr.c))) : stand.clone();
      const lk = dr ? (dr.axis === 'h' ? new V3(wx(dr.c), f.Y + 1.45, wz(dr.line)) : new V3(wx(dr.line), f.Y + 1.45, wz(dr.c))) : look;
      Object.assign(A.STATIONS[id], { walk: o.clone(), stand: o, look: lk, back: o.clone(), open: () => (UNL.has(r[0]) ? infoOpen() : askCode(n, r[0], id, inside)) });
      (f.locks[r[0]] || []).forEach((L) => { const p = L.axis === 'h' ? [wx(L.c), wz(L.line)] : [wx(L.line), wz(L.c)]; const hb = A.hitBox(1.3, 2.4, .5, p[0], f.Y + 1.2, p[1], { type: 'st', id, label: r[0] + ' — nhập mã để mở cửa' }, L.axis === 'h' ? 0 : Math.PI / 2); f.root.attach(hb); f.set.add(hb); }); }
    f.stations.push({ id, name: r[0], icon: iconOf(r), lock: !!LOCK[r[0]] }); });
  A.STATIONS['u' + n + '_lift'] = { name: 'Thang máy', kind: 'info', walk: new V3(-.6, E, -8.6), stand: new V3(-.6, E, -8.6), look: new V3(-1.4, f.Y + 1.5, -10.4), back: new V3(-.6, E, -8.2), open: liftPanel };
  games.forEach((g) => { const id = 'u7_' + g.id, dist = g.id === 'bot' ? 4.6 : /dovui|sinhnhat|giaynho/.test(g.id) ? 2.8 : 1.7; const back = new V3(g.x + Math.sin(g.a) * dist, E, g.z + Math.cos(g.a) * dist);
    A.STATIONS[id] = { name: g.name, kind: 'info', walk: back.clone(), stand: g.sit ? new V3(g.x, f.Y + 1.22, g.z) : back.clone(), look: g.look ? g.look.clone().setY(f.Y + g.look.y) : new V3(g.x, f.Y + 1.4, g.z), back: back.clone(),
      open: () => { if (window.GT3D && window.GT3D.mo) window.GT3D.mo(g.id); else A.toast('Phòng Relax đang tải, thử lại sau giây lát'); } };
    f.stations.push({ id, name: g.name, icon: { dovui: 'cup', bot: 'smile', sinhnhat: 'cake', nhac: 'music', nem: 'trash', phitieu: 'target', gap: 'gift', thugian: 'leaf', anh: 'camera', giaynho: 'note' }[g.id] || 'users', game: true }); });
}
function iconOf(r) { const n = r[0]; if (/họp|Phỏng vấn|đào tạo|1:1/.test(n)) return 'meet'; if (/Giám đốc|TP|Trưởng|Kế toán trưởng/.test(n)) return 'user'; if (/Kho|lưu trữ|Văn thư/.test(n)) return 'box'; if (/ăn|Bếp|Pantry|café|trà|chia suất/.test(n)) return 'cup'; if (/Khu làm việc|Khu Hành chính/.test(n)) return 'users'; if (/ngân quỹ|giao dịch/.test(n)) return 'cash'; if (/thư giãn|nghỉ|chờ|Sảnh/.test(n)) return 'sofa'; return 'home'; }

/* ───────────────────────── Thanh điều hướng + vị trí ───────────────────────── */
function floorNav(n) { const N = $('nav'); N.innerHTML = ''; const f = FL[n];
  const mk = (id, label, icon, fn) => { const b = document.createElement('button'); b.dataset.id = id; b.innerHTML = A.ic(icon, 17) + `<span>${label}</span>`; b.onclick = fn; N.appendChild(b); };
  mk('lift', 'Thang máy', 'lift', () => A.goStation('u' + n + '_lift')); const s = document.createElement('div'); s.className = 'sep'; N.appendChild(s);
  const short = (t) => t.replace(/^Phòng /, '').replace(/^Khu làm việc /, 'KV ').replace(/ – .*$/, '').replace(/ ·.*$/, '').replace(/^Trưởng phòng TC.*/, 'Trưởng phòng');
  const list = n === 7 ? f.stations.filter((x) => x.game) : f.stations;
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  list.forEach((x) => mk(x.id, cap(x.game ? x.name.split(' — ')[0] : short(x.name)), x.icon, () => A.goStation(x.id))); }
function where(p) { if (cur < 2) return null; const f = FL[cur]; if (!f) return null; const u = p.x + 15, v = p.z + 12.9; let best = null, ba = 1e9;
  f.rooms.concat(PLAN.core).forEach((r) => { if (r[0] && u > r[2] && u < r[4] && v > r[3] && v < r[5]) { const a = (r[4] - r[2]) * (r[5] - r[3]); if (a < ba) { ba = a; best = r; } } });
  return 'Tầng ' + cur + ' · ' + (best ? best[0] : 'Hành lang'); }

/* ───────────────────────── Chuyển tầng ───────────────────────── */
function setGrid(walk, obs, dyn) { A.WALK.length = 0; A.WALK.push(...walk); A.OBS.length = 0; A.OBS.push(...obs); Object.keys(A.DYN).forEach((k) => delete A.DYN[k]); if (dyn) Object.assign(A.DYN, dyn); A.rebuildGrid(); }
async function go(n) {
  if (n === cur) return;
  if (cur === 1) F1 = { walk: A.WALK.slice(), obs: A.OBS.slice(), dyn: Object.assign({}, A.DYN) };
  if (cur === 7 && window.GT3D && window.GT3D.roi) { try { window.GT3D.roi(); } catch (e) { /* bỏ qua */ } }
  if (cur > 1 && FL[cur]) FL[cur].root.visible = false;
  const bm = $('bMap');
  if (n === 1) { if (tower()) tower().visible = true; setGrid(F1.walk, F1.obs, F1.dyn); A.setEye(1.62); cur = 1; const N = $('nav'); N.innerHTML = ''; A.buildNav(); A.setNav(null); if (bm) bm.style.display = ''; return; }
  const f = FL[n] || build(n); f.root.visible = true; setGrid(f.walk, f.obs, f.dyn); if (tower()) tower().visible = false; A.setEye(f.Y + 1.62); cur = n; floorNav(n); if (bm) bm.style.display = 'none';
}
function pickOk(o) { if (cur === 1) { for (const k in FL) if (FL[k].set.has(o)) return false; return true; } const f = FL[cur]; return !!(f && f.set.has(o)); }
function init(api) {
  A = api; THREE = A.THREE; V3 = A.V3; geoInit();
  Object.assign(A.ICONS, { lift: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 9l3-3 3 3M9 15l3 3 3-3"/>', cup: '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/>', box: A.ICONS.box || '<rect x="4" y="6" width="16" height="13" rx="2"/>' });
  A.UP.pickOk = pickOk; A.UP.where = where; A.UP.tick = (dt, t) => { if (cur === 7 && HK.tick) HK.tick(dt, t); };
  FLOOR_LIST = [[1, 'Sảnh giao dịch']].concat(A.UPPER.slice().reverse().map(([f, nm]) => [+f.replace(/\D/g, ''), nm]));
}

/* ───────────────────────── Thang máy các tầng trên ───────────────────────── */
let FLOOR_LIST = [];
function liftCore(n, root, B) {
  const h = CH, ss = MT.steel, pan = A.std(A.AIRY ? '#d8cbb3' : '#e3e6e8', { roughness: .5 }), car = A.std(A.AIRY ? '#b89a72' : '#c7b08a', { roughness: .45 }), dark = A.std('#3b4046', { roughness: .4 });
  // vách phía cabin (z -10.4) có 2 ô cửa, vách ngăn giữa 2 cabin
  [[-3.6, -3.075], [-1.925, -.875], [.275, .8]].forEach(([a, b]) => { B.box(b - a, h, .14, pan, (a + b) / 2, h / 2, -10.4); A.obstacle(a, -10.48, b, -10.32); });
  [-2.5, -.3].forEach((cx) => B.box(1.15, h - 2.35, .14, pan, cx, (2.35 + h) / 2, -10.4));
  B.box(.12, h, 2.5, pan, -1.4, h / 2, -11.65);
  const doors = [];
  [-2.5, -.3].forEach((cx) => {
    B.box(1.35, .12, .08, ss, cx, 2.41, -10.28);[-1, 1].forEach((s) => B.box(.1, 2.41, .08, ss, cx + s * .62, 1.205, -10.28));
    B.box(2.0, .02, 2.3, dark, cx, .01, -11.65); B.box(1.96, 2.62, .04, car, cx, 1.31, -12.8); B.box(1.1, 1.3, .01, MT.chrome, cx, 1.45, -12.77);
    [-1, 1].forEach((s) => { B.box(.04, 2.62, 2.3, car, cx + s * .97, 1.31, -11.65); B.box(.04, .04, 1.9, ss, cx + s * .93, .95, -11.65); });
    B.box(1.9, .04, .04, ss, cx, .95, -12.74); B.box(1.98, .04, 2.32, ss, cx, 2.64, -11.65); B.geo(UP, MT.lamp, cx, 2.615, -11.65, 0, Math.PI / 2, 0, 1.4, 1.6, 1);
    const mk = (x) => { const m = new THREE.Mesh(UB, ss); m.scale.set(.58, 2.33, .03); m.position.set(x, 1.17, -10.33); root.add(m); return m; };
    doors.push({ l: mk(cx - .29), r: mk(cx + .29), cx, o: 0 });
    A.obstacle(cx - .6, -10.55, cx + .6, -10.22);
    const it = A.ctex(256, 96, (x, w, hh) => { x.fillStyle = '#0b0f14'; x.fillRect(0, 0, w, hh); x.fillStyle = '#E8920A'; x.font = '800 64px "Be Vietnam Pro",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), w / 2 - 20, hh / 2 + 3); x.font = '700 44px sans-serif'; x.fillText('⇅', w / 2 + 60, hh / 2 + 2); });
    panelMesh(root, it, .36, .135, cx, 2.62, -10.235, 0);
    const hb = A.hitBox(1.2, 2.4, .4, cx, 1.2, -10.15, { type: 'st', id: 'u' + n + '_lift', label: 'Thang máy — chọn tầng' }); root.add(hb); });
  const cp = A.ctex(128, 256, (x, w, hh) => { x.fillStyle = '#d9dde3'; x.fillRect(0, 0, w, hh); x.fillStyle = '#1d2433'; A.rr(x, 24, 40, 80, 176, 16); x.fill();[[90, '▲'], [166, '▼']].forEach(([y, t]) => { x.fillStyle = '#E8920A'; x.beginPath(); x.arc(64, y, 26, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '700 28px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 64, y + 2); }); });
  const cpm = panelMesh(root, cp, .14, .28, -1.4, 1.2, -10.32, 0); A.clickable(cpm, { type: 'st', id: 'u' + n + '_lift', label: 'Nút gọi thang máy — chọn tầng' });
  // thang bộ: một vế thẳng, tay vịn kính
  const stepM = A.std(A.AIRY ? '#d9d1c1' : '#cfd3d6', { roughness: .5 }), N = Math.round(h / .18), rise = h / N, run = Math.min(.29, 5.4 / N);
  for (let i = 0; i < N; i++) { const z = -7.4 - i * run; B.box(2.5, rise * (i + 1), run, stepM, 2.2, rise * (i + 1) / 2, z - run / 2); B.box(2.5, .02, .04, MT.metalD, 2.2, rise * (i + 1) + .01, z - .02); }
  { const L = N * run, ang = Math.atan2(h, L), len = Math.hypot(h, L);[1.0, 3.42].forEach((x) => { B.box(.02, .9, len, MT.glass, x, h / 2 + .5, -7.4 - L / 2, 0, ang); B.box(.05, .05, len, ss, x, h / 2 + .95, -7.4 - L / 2, 0, ang); }); }
  A.obstacle(.8, -12.9, 3.6, -7.3);
  const sh = A.hitBox(2.6, 2.4, 5.4, 2.2, 1.2, -10.1, { type: 'st', id: 'u' + n + '_lift', label: 'Thang bộ — đi thang máy cho nhanh' }); root.add(sh);
  return doors;
}
function liftDoorAnim(k, v) { const f = FL[cur]; const D = f && f.doors[k]; if (!D) return Promise.resolve(); const a = D.o;
  return A.tween(.6, (q) => { const o = a + (v - a) * A.ease(q); D.o = o; D.l.position.x = D.cx - .29 - o * .56; D.r.position.x = D.cx + .29 + o * .56; }); }
const CAR_K = 1, CAR_X = -.3;
async function carIn() { const E = A.getEye(), p = A.findPath(A.cam.pos, new V3(CAR_X, E, -9.4)); if (p) await A.walkPath(p); await A.flyTo(new V3(CAR_X, E, -9.4), new V3(CAR_X, E - .1, -12.5), .5);
  await liftDoorAnim(CAR_K, 1); await A.flyTo(new V3(CAR_X, E, -11.9), new V3(CAR_X, E - .05, -5), 1.0); await liftDoorAnim(CAR_K, 0); }
function carPlace() { A.cam.pos.set(CAR_X, A.getEye(), -11.9); A.cam.yaw = Math.PI; A.cam.pitch = -.03; }
async function carOut() { const E = A.getEye(); await liftDoorAnim(CAR_K, 1); await A.flyTo(new V3(-.9, E, -8.3), new V3(-.9, E - .15, 3), 1.0); liftDoorAnim(CAR_K, 0); }
function liftPanel() { const n = cur;
  A.openInfo({ title: 'Thang máy', tag: 'Tầng ' + n, icon: 'lift', color: '#475467', soft: '#EEF0F3', intro: 'Chọn tầng muốn đến.',
    body: '<div class="colh">Chọn tầng</div>' + FLOOR_LIST.slice().reverse().map(([k, nm]) => `<button class="sp liftgo" data-f="Tầng ${k}" data-n="${nm}" style="display:block;width:100%;text-align:left;cursor:pointer;background:${k === n ? '#EFF8F2' : '#fff'}"><b>Tầng ${k} · ${nm}</b>${k === n ? ' — đang ở đây' : ''}</button>`).join(''),
    after: () => document.querySelectorAll('.liftgo').forEach((b) => b.onclick = () => A.liftRide(b.dataset.f, b.dataset.n)),
    ft2: ['Về tầng 1', () => A.liftRide('Tầng 1', 'Sảnh giao dịch'), 'lift'] }); }

/* ───────────────────────── Phòng cần mã (Giám đốc, Phó Giám đốc) ───────────────────────── */
const LOCK = { 'Phòng Giám đốc': { code: '1603', hint: 'Gợi ý nhỏ: ngày tháng sinh nhật của Giám đốc.' }, 'Phòng Phó Giám đốc': { code: '2103', hint: 'Gợi ý nhỏ: ngày tháng sinh nhật của Phó Giám đốc.' } };
const UNL = new Set();
function lockLeaf(root, axis, line, a, b, side, hd, name, info) { const lw = b - a - .03, g = new THREE.Group(), m = new THREE.Mesh(UB, MT.oakD), hn = new THREE.Mesh(UB, MT.chrome);
  if (axis === 'h') { g.position.set(wx(a + .015), 0, wz(line)); m.scale.set(lw, hd - .03, .045); m.position.set(lw / 2, (hd - .03) / 2, 0); hn.scale.set(.12, .02, .1); hn.position.set(lw - .1, 1.02, 0); }
  else { g.position.set(wx(line), 0, wz(a + .015)); m.scale.set(.045, hd - .03, lw); m.position.set(0, (hd - .03) / 2, lw / 2); hn.scale.set(.1, .02, .12); hn.position.set(0, 1.02, lw - .1); }
  g.add(m); g.add(hn); root.add(g);
  const th = axis === 'h' ? -side * Math.PI / 2 : side * Math.PI / 2; info.lk = (info.lk || 0) + 1;
  const rect = axis === 'h' ? [wx(a), wz(line) - .1, wx(b), wz(line) + .1] : [wx(line) - .1, wz(a), wx(line) + .1, wz(b)];
  (info.locks[name] = info.locks[name] || []).push({ g, th, key: 'lk' + info.lk + '_' + name.length, rect, axis, line, c: (a + b) / 2 }); }
function askCode(n, name, id, inside) { const L = LOCK[name];
  A.openInfo({ title: name, tag: 'Tầng ' + n + ' · Cần mã', icon: 'user', color: '#084C38', soft: '#EFF8F2', intro: 'Phòng làm việc riêng. Nhập mã để mở cửa.',
    body: `<div class="lead" id="pcL"><b>Mã mở cửa</b><p>${L.hint}</p><form id="pcF" novalidate><input id="pcI" type="password" inputmode="numeric" placeholder="Nhập mã 4 số" maxlength="4" autocomplete="off"><button>Mở cửa</button></form><div class="err" id="pcE"></div></div>`,
    after: () => { setTimeout(() => { const I = $('pcI'); if (I && innerWidth > 720) I.focus(); }, 250);
      $('pcF').onsubmit = (e) => { e.preventDefault(); const I = $('pcI'); if (I.value.trim() === L.code) unlock(n, name, id, inside); else { $('pcE').textContent = 'Mã chưa đúng, anh/chị thử lại.'; I.value = ''; I.focus(); } }; },
    ft2: ['Thang máy', liftPanel, 'lift'] }); }
async function unlock(n, name, id, inside) { UNL.add(name); A.closePanel(); const f = FL[n];
  (f.locks[name] || []).forEach((L) => { delete f.dyn[L.key]; delete A.DYN[L.key]; A.tween(.8, (k) => { L.g.rotation.y = L.th * A.ease(k); }); });
  A.rebuildGrid(); Object.assign(A.STATIONS[id], { walk: inside.walk.clone(), stand: inside.stand.clone(), look: inside.look.clone(), back: inside.stand.clone() });
  A.toast('Đã mở cửa ' + name); await new Promise((r) => setTimeout(r, 850)); A.st.mode = 'lobby'; A.st.curSt = null; A.st.busy = false; A.goStation(id); }

/* ───────────────────────── Tầng 7: nạp giai-tri.js, chỉ hỏi tên (không hỏi mã) ───────────────────────── */
const GT_URL = '/.netlify/functions/giai-tri-3d', GT_MA = '1986'; // mã phòng giải trí cũ (máy chủ đọc biến GIAI_TRI_3D_MA nếu có)
const HK = {}; let S7 = null, GTL = null;
function loadGT() { if (GTL) return GTL; GTL = new Promise((ok, no) => { if (window.GT3D) return ok(); const s = document.createElement('script'); s.src = 'giai-tri.js?v=2';
  s.onload = () => { if (!window.GT3D) return no(new Error('thiếu GT3D')); try { window.GT3D.init(Object.assign({}, A, { EYE: 1.62, hook: HK, gtUrl: GT_URL, fade: () => Promise.resolve(), door: () => {}, logout: () => { S7 = null; try { localStorage.removeItem('dbv_gt3d'); } catch (e) { /* bỏ qua */ } } })); ok(); } catch (e) { no(e); } };
  s.onerror = () => { GTL = null; no(new Error('không tải được giai-tri.js')); }; document.head.appendChild(s); }); return GTL; }
function askName(ds) { return new Promise((res) => { const g = document.createElement('div'); g.className = 'ovl open'; g.style.zIndex = 70;
  g.innerHTML = `<div class="card"><h3>Phòng Relax · Tầng 7</h3><p style="font-size:14px;line-height:1.55;color:#475467;margin:-4px 0 12px">Anh/chị là ai? Tên dùng cho bảng điểm, lời chúc và giấy nhớ. Nhập một lần, lần sau vào thẳng.</p>
    <form id="u7F" novalidate style="display:flex;gap:8px"><label for="u7T" style="position:absolute;left:-9999px">Họ tên</label><input id="u7T" list="u7D" maxlength="40" autocomplete="off" placeholder="Chọn hoặc gõ họ tên" style="flex:1;min-width:0;height:44px;border:1.5px solid #D0D5DD;border-radius:10px;padding:0 12px;font:inherit;font-size:16px"><button style="height:44px;padding:0 18px;border-radius:10px;background:#084C38;color:#fff;font-weight:700">Vào</button></form>
    <datalist id="u7D">${ds.map((x) => `<option value="${A.esc(x)}">`).join('')}</datalist><div id="u7E" style="color:#B42318;font-size:13px;margin-top:8px;min-height:18px"></div>
    <button id="u7X" style="margin-top:6px;width:100%;height:42px;border-radius:10px;border:1.5px solid #D0D5DD;background:#fff;font-weight:600;color:#344054">Để sau</button></div>`;
  document.body.appendChild(g); setTimeout(() => $('u7T') && $('u7T').focus(), 80); const done = (v) => { g.remove(); res(v); };
  $('u7X').onclick = () => done(null); g.onclick = (e) => { if (e.target === g) done(null); };
  $('u7F').onsubmit = (e) => { e.preventDefault(); const t = $('u7T').value.replace(/\s+/g, ' ').trim(); if (t.length < 2) { $('u7E').textContent = 'Nhập họ tên của anh/chị.'; return; } done(t); }; }); }
async function post(b) { try { const r = await fetch(GT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); let j = {}; try { j = await r.json(); } catch (e) { /* bỏ qua */ } return { s: r.status, j }; } catch (e) { return { s: 0, j: {} }; } }
async function sess7() { if (S7) return S7; try { const s = JSON.parse(localStorage.getItem('dbv_gt3d') || 'null'); if (s && s.tok) return (S7 = s); } catch (e) { /* bỏ qua */ }
  const real = /(^|\.)dbv247\.com\.vn$/.test(location.hostname); let { s, j } = await post({ hanh_dong: 'vao', ma: GT_MA }); let demo = false, ds = [];
  if (s === 200 && j.ok) ds = j.ds || []; else if (!real) { demo = true; ds = ['Nguyễn Thu Trang', 'Trần Minh Anh', 'Lê Hoàng Nam', 'Phạm Thị Hà']; } else { A.toast(j.loi || 'Chưa kết nối được Phòng Relax, thử lại sau nhé'); return null; }
  for (;;) { const ten = await askName(ds); if (!ten) return null; let ss = null;
    if (demo) ss = { tok: 'demo', ten, demo: true }; else { const r = await post({ hanh_dong: 'vao', ma: GT_MA, ten }); if (r.s === 200 && r.j.tok) ss = { tok: r.j.tok, ten: r.j.ten, qt: !!r.j.qt }; else { A.toast(r.j.loi || 'Chưa vào được, thử lại nhé'); continue; } }
    S7 = ss; try { localStorage.setItem('dbv_gt3d', JSON.stringify(ss)); } catch (e) { /* bỏ qua */ } return ss; } }
async function before(n) { if (n !== 7) return true; try { await loadGT(); } catch (e) { console.error(e); A.toast('Chưa mở được Phòng Relax, thử lại sau nhé'); return false; } return !!(await sess7()); }
function arrived() { if (cur === 7 && window.GT3D && window.GT3D.gan && S7) { try { window.GT3D.gan(S7, { ra: liftPanel, obj: FL7OBJ }); } catch (e) { console.error(e); } }
  else A.toast('Tầng ' + cur + ' · ' + FLOOR_LIST[cur - 1][1] + ' — bấm thanh dưới để tới từng phòng'); }
let TOWER = null;
function tower() { if (TOWER) return TOWER; TOWER = A.scene.children.find((o) => o.isMesh && o.geometry && o.geometry.type === 'BoxGeometry' && o.geometry.parameters && Math.abs(o.geometry.parameters.width - 30) < .01 && o.geometry.parameters.height > 30) || null; return TOWER; }

window.TANG3D = { init, go, before, arrived, carIn, carPlace, carOut, build: (n) => FL[n] || build(n) };
})();
