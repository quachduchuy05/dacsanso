# SRS hợp nhất – App Đặc Sản Số

Oct 14, 2026 · @Hoàng Trần

Bản SRS hợp nhất từ tài liệu của nhóm, bám bảng chức năng 08/10. Làm trong 3 đợt: đợt 1 gồm tổng quan, danh mục FR, use case và quy tắc nghiệp vụ; đợt 2 gồm phi chức năng, dữ liệu, màn hình, API, phân quyền; đợt 3 gồm truy vết, nghiệm thu, kiểm thử. Prototype làm sau khi anh duyệt SRS.

## 1. Tổng quan

App Đặc Sản Số bán đặc sản, sản phẩm OCOP có nguồn gốc rõ ràng của HTX Lào Cai (sau sáp nhập, gồm cả Yên Bái cũ) cho cư dân Hà Nội. Giai đoạn 1 thí điểm tại Vinhomes Smart City (Tây Mỗ); Bắc Giang bổ sung ở giai đoạn sau.

### 1.1. Mục đích tài liệu

Gộp yêu cầu từ khoảng 15 tài liệu của nhóm thành một bản chuẩn để đội dev code, tester kiểm thử và làm căn cứ dựng prototype. Tài liệu chỉ ra chức năng nào đã đặc tả, bản nào dùng làm chuẩn, và các chỗ trùng hoặc mâu thuẫn cần Lead chốt. Chi tiết từng use case vẫn nằm trong tài liệu gốc được ghi ở mục 5.

### 1.2. Phạm vi

| Hạng mục | Giai đoạn 1 | Sau giai đoạn 1 | Nguồn |
| --- | --- | --- | --- |
| Sản phẩm | Đặc sản, OCOP của HTX Lào Cai | Bắc Giang, các tỉnh khác | Quyết định đổi hướng 10/2026 |
| Khách hàng | Cư dân Hà Nội, trọng tâm Vinhomes Smart City | Khách mua tại chỗ, du khách nước ngoài mua mang về | Quyết định 09/2026; SOP |
| Người bán | HTX đã được Admin duyệt hồ sơ, mỗi mã số thuế một tài khoản | Chưa xác định | BR-AD-09; BR-HTX-01 |
| Giao hàng | Chỉ địa chỉ trong Hà Nội; giao thường; hoả tốc chờ chốt (OI-02) | Hoả tốc các tỉnh lân cận | Quyết định 09/2026 |
| Thanh toán | COD; online qua một cổng (chưa chọn); cọc đặt trước online | Chưa xác định | BRD Minh Hằng; SOP |
| Kênh | Một app cho mọi vai trò; trang web sản phẩm cho link chia sẻ | — | Quyết định 09/2026; SRS MH v1.1 (OI-04) |
| Không làm ở giai đoạn 1 | Mã ưu đãi do HTX tự tạo; chiến dịch bán hàng của HTX; kết nối tự động với đơn vị vận chuyển; chi trả HTX tự động | — | BR-HT-01; BR-DT-26; ghi chú bảng 08/10 |

### 1.3. Người dùng tài liệu

Lead BA và nhóm BA (rà soát, chốt điểm mở), đội dev (code theo FR, quy tắc, dữ liệu), tester (viết ca kiểm thử), PO và lãnh đạo (duyệt phạm vi, ưu tiên).

### 1.4. Thuật ngữ

| Thuật ngữ | Nghĩa trong tài liệu |
| --- | --- |
| HTX | Hợp tác xã bán hàng trên app; tương đương "người bán", "shop" |
| OCOP, VietGAP | Chứng nhận sản phẩm do cơ quan có thẩm quyền cấp; app chỉ lưu và hiển thị, không cấp |
| Mua sẵn | Mua hàng đang có trong kho của HTX |
| Đặt trước (Preorder) | Đặt hàng chưa vào vụ hoặc hết hàng, trả cọc trước, nhận hàng vào ngày giao đã chọn |
| Lần đặt | Một lần khách bấm Đặt hàng; tách thành nhiều đơn theo HTX và loại đơn |
| Bản chốt (snapshot) | Giá, địa chỉ, tham số được lưu cố định vào đơn lúc tạo, không đổi theo dữ liệu gốc |
| Sổ đối soát 4 khoản | Mỗi đơn ghi riêng tiền hàng, hoa hồng, phí ship, tiền hoàn; dòng đã ghi không sửa, không xoá |
| Giữ lại (holdback) | Một phần tiền chi trả HTX tạm giữ, trả sau 2 kỳ để bù hoàn tiền phát sinh muộn |
| Tham số (PAR) | Con số Admin đổi được không cần sửa code: cọc, thời hạn, phí, hoa hồng |
| Cơ quan QLNN | Cơ quan quản lý nhà nước, chỉ xem số liệu tổng hợp |
| ĐX, CX, OI | Đề xuất mới; điểm cần xác nhận trong từng tài liệu module; vấn đề mở của SRS (mục 15) |

### 1.5. Giả định đang dùng

Các giả định sau chưa được phê duyệt; sai giả định nào thì phải sửa các FR ghi bên cạnh.

| Mã | Giả định | Ảnh hưởng |
| --- | --- | --- |
| GD-01 | Giai đoạn 1 dùng một cổng thanh toán online, chưa chọn nhà cung cấp | FR-MHTT-05, FR-DH-12 |
| GD-02 | Chưa kết nối API đơn vị vận chuyển; trạng thái giao cập nhật thủ công | FR-DH-09, FR-DH-14 |
| GD-03 | Chi trả HTX bằng chuyển khoản ngoài hệ thống, Admin ghi nhận kết quả | FR-DT-04 |
| GD-04 | Mọi con số về cọc, thời hạn, phí, hoa hồng là tham số, giá trị đang là đề xuất | Toàn hệ thống |
| GD-05 | OTP gửi qua SMS hoặc Zalo ZNS, chưa chọn nhà cung cấp | FR-TK-01, 02 |
| GD-06 | Mỗi quy cách đóng gói là một sản phẩm riêng; chưa có sản phẩm nhiều biến thể | FR-SP-02, FR-MHTT-01 |
| GD-07 | Chi phí mã ưu đãi do sàn chịu, HTX nhận đủ tiền hàng | FR-HT-01, FR-DT-02 |

### 1.6. Giới hạn

Giao diện tiếng Việt; tiền VND, số nguyên; thời gian theo giờ Việt Nam (GMT+7). App không lưu số thẻ thanh toán. App không tự cấp chứng nhận hay xác minh nguồn gốc thay cơ quan nhà nước; chỉ lưu, hiển thị và cho Admin đối chiếu.

## 2. Stakeholder và actor

App có 10 nhóm người dùng và 5 hệ thống bên ngoài. "Nhân viên vận hành" và "nhân viên CSKH" trong yêu cầu kiểu sàn thương mại điện tử ứng với các nhóm quyền của Admin, không phải vai trò riêng. Shipper là vai trò riêng, thêm theo quyết định 29/10.

&#91;embedded content: Sơ đồ ngữ cảnh · 5 nhóm người dùng (có Shipper), 5 hệ thống bên ngoài\]

Khung nét đứt là hai phần chưa chốt: chặng chuyển hàng Lào Cai – Hà Nội (OI-20) và nguồn truy xuất của Lào Cai (OI-17).

### 2.1. Người dùng trong app

| Actor | Là ai | Việc chính | Phạm vi dữ liệu | Nguồn |
| --- | --- | --- | --- | --- |
| Khách vãng lai | Người chưa đăng nhập, thường mở từ link chia sẻ | Xem, tìm, chia sẻ sản phẩm; đăng ký | Dữ liệu công khai | Bảng 08/10 |
| Khách hàng | Cư dân Hà Nội đã đăng ký bằng số điện thoại | Mua, đặt trước, thanh toán, theo dõi đơn, khiếu nại, đánh giá | Của mình | Bảng 08/10 |
| HTX | Đại diện HTX đã được duyệt hồ sơ và kích hoạt quyền bán | Báo tồn kho, thu hoạch; xác nhận, đóng gói, bàn giao đơn; nhắn tin khách; phản hồi ticket, đánh giá; xem đối soát, nhận tiền. Không đăng, không sửa sản phẩm | Của HTX mình | Bảng 08/10; quyết định 29/10 |
| Admin – Quản lý vận hành | Bộ phận vận hành của công ty | Tham số, mã ưu đãi, danh mục; cấp tài khoản Cơ quan QLNN, Shipper; khoá tài khoản; phân công shipper | Toàn hệ thống, theo nhóm quyền | SOP; Module AD; quyết định 29/10 |
| Admin – Chất lượng | Bộ phận kiểm soát nguồn cung | Duyệt hồ sơ HTX; đăng sản phẩm, giá, chứng nhận, cấu hình đặt trước | Toàn hệ thống, theo nhóm quyền | SOP; quyết định 29/10 |
| Admin – CSKH | Bộ phận chăm sóc khách hàng | Xử lý, đóng ticket; kết luận trách nhiệm; kiểm duyệt đánh giá | Không thấy tài khoản ngân hàng của khách | SOP |
| Admin – Tài chính | Bộ phận tài chính, kế toán | Đối soát, xác định bên chịu hoàn tiền, chốt kỳ, chi trả HTX; xác nhận tiền COD shipper nộp | Duy nhất thấy tài khoản nhận hoàn tiền của khách | SOP; Module AD |
| Quản trị gốc | Quản trị viên cao nhất | Tạo tài khoản Admin, gán nhóm quyền theo đề nghị của Lead BA; xem nhật ký thao tác (OI-25) | Không thao tác nghiệp vụ | SOP |
| Shipper | Người giao hàng của sàn tại Hà Nội, do Admin – Vận hành cấp tài khoản | Nhận đơn được phân công, lấy hàng, giao, chụp ảnh khi giao, thu COD và nộp lại cho sàn | Đơn được phân công | Quyết định 29/10; SOP |
| Cơ quan QLNN | Cán bộ Sở, ngành được cấp tài khoản có hạn dùng | Xem số liệu giám sát: HTX hoạt động, sản phẩm xác minh, khiếu nại đang xử lý | Chỉ tổng hợp, ẩn dữ liệu cá nhân | Bảng 08/10; SOP |

Vai trò **Shipper** thêm theo quyết định 29/10. SOP gọi là nhân viên giao hàng nội khu, giao từ kho trung chuyển Tây Mỗ. Cách hàng đi từ Lào Cai về tay shipper chưa chốt (OI-20).

### 2.2. Hệ thống bên ngoài

| Hệ thống | Trao đổi với app | Giai đoạn 1 |
| --- | --- | --- |
| Cổng thanh toán | Nhận giao dịch online, trả kết quả; hoàn tiền; báo cáo giao dịch để đối soát | Có tích hợp; chưa chọn nhà cung cấp |
| Nhà cung cấp SMS, Zalo ZNS | Gửi OTP, tin báo | Có tích hợp |
| Đơn vị vận chuyển, nhà xe | Chở hàng từ Lào Cai về Hà Nội. Giao chặng cuối do Shipper của sàn làm trong app | Chưa tích hợp; cách chuyển chờ chốt (OI-20) |
| Dịch vụ thông báo đẩy | Thông báo trạng thái đơn, ticket, kết quả duyệt; ngắt phiên khi khoá tài khoản | Có tích hợp |
| Trang truy xuất nguồn gốc | App mở trang truy xuất qua QR do HTX hoặc hệ thống của tỉnh cung cấp | Liên kết, chưa đồng bộ dữ liệu (OI-17) |

### 2.3. Stakeholder không dùng app

| Stakeholder | Quan tâm | Vai trò trong dự án |
| --- | --- | --- |
| Lãnh đạo công ty, PO | Phạm vi, ưu tiên, mô hình thu phí | Duyệt phạm vi, chốt các câu hỏi kinh doanh (hoa hồng, hoả tốc, hộp quà) |
| Lead BA và nhóm BA | Yêu cầu đầy đủ, nhất quán | Viết, rà soát đặc tả; Lead BA đề nghị cấp quyền Admin |
| Đội dev, tester | Yêu cầu kiểm thử được | Xây dựng, kiểm thử theo SRS |
| Cơ quan cấp chứng nhận (OCOP, VietGAP) | Tính đúng đắn của chứng nhận hiển thị | Nguồn để Admin đối chiếu; cần xác minh đơn vị cụ thể ở Lào Cai |
| HTX chưa lên sàn | Dễ đăng ký, nhận tiền đúng hạn | Nguồn khảo sát nhu cầu; chưa có buổi khảo sát nào được ghi lại |

## 3. Business requirements

Năm vấn đề dẫn tới bảy yêu cầu kinh doanh. Chỉ số thành công về doanh thu, số đơn, số HTX chưa có trong tài liệu nào (OI-14); các chỉ số dưới đây lấy từ cam kết vận hành đã có trong tài liệu nhóm.

### 3.1. Vấn đề hiện tại

| Mã | Vấn đề | Căn cứ | Mức kiểm chứng |
| --- | --- | --- | --- |
| P1 | Người mua ở Hà Nội khó phân biệt đặc sản thật; thị trường có đào, mận nơi khác gắn mác Sa Pa | DS sản phẩm Lào Cai (mục Đào Sa Pa) | Tài liệu nghiên cứu của nhóm |
| P2 | Chứng nhận OCOP, VietGAP của HTX chưa được số hoá đầy đủ trên cổng công khai, khó kiểm chứng | Dự án Đặc sản số Bắc Giang (mục theo dõi chứng nhận) | Nhận định của người khảo sát; chưa kiểm tra riêng cho Lào Cai |
| P3 | Hàng mùa vụ bán trong thời gian ngắn; khách muốn đặt sớm, HTX cần biết trước sản lượng | UX (persona người săn hàng theo mùa); BRD Luồng mua hàng | Persona, chưa phỏng vấn HTX |
| P4 | HTX vùng cao thiếu kênh bán trực tuyến và công cụ quản lý đơn, đối soát | Giả định của dự án | Cần khảo sát HTX để xác minh |
| P5 | Cơ quan quản lý thiếu số liệu giám sát HTX, sản phẩm xác minh, khiếu nại | BRD Quản lý HTX và Giám sát; SOP-GOV-01 | Chưa có ý kiến trực tiếp của cơ quan Lào Cai |

### 3.2. Yêu cầu kinh doanh

Mã BRQ để không nhầm với mã quy tắc nghiệp vụ BR.

| Mã | Yêu cầu | Vấn đề | Chỉ số thành công | Module |
| --- | --- | --- | --- | --- |
| BRQ-01 | Bán đặc sản Lào Cai có nguồn gốc rõ ràng cho cư dân Hà Nội qua app | P1 | Tỷ lệ sản phẩm đang bán có chứng nhận chính thức: cần chốt mục tiêu; nhãn "Cam kết nguồn gốc từ HTX" không tính (BR-MH-38) | TKSP, MHTT |
| BRQ-02 | Số hoá hồ sơ HTX, sản phẩm và chứng nhận; Admin duyệt trước khi bán | P2 | 100% HTX đang bán có hồ sơ đã duyệt; duyệt hồ sơ HTX ≤ 24 giờ làm việc, sản phẩm ≤ 12 giờ làm việc (SOP) | TK, SP |
| BRQ-03 | Cho đặt trước theo mùa vụ có cọc để HTX lên kế hoạch thu hoạch | P3 | Tỷ lệ đơn đặt trước bị huỷ do HTX không cung cấp được: cần chốt ngưỡng | MHTT, SP, DH |
| BRQ-04 | Cho HTX kênh bán hàng, xử lý đơn và nhận tiền đúng kỳ, có đối soát minh bạch | P4 | Chi trả đúng ngày theo chu kỳ; chênh lệch đối soát không tồn quá 7 ngày (BR-AD-57) | DH, DT |
| BRQ-05 | Chăm sóc khách hàng, xử lý khiếu nại và đánh giá sau mua | P1 | Phản hồi ticket thường ≤ 24 giờ, khẩn cấp ≤ 1 giờ (BRD CSKH BR09); kết luận lỗi ≤ 24 giờ làm việc (SOP) | CSKH |
| BRQ-06 | Cung cấp số liệu giám sát chỉ đọc cho Cơ quan QLNN | P5 | Dashboard có 3 chỉ số: số HTX, sản phẩm đã xác nhận nguồn gốc, khiếu nại đang xử lý (BRD Quản lý HTX) | BCTK |
| BRQ-07 | Bảo vệ dữ liệu cá nhân của khách theo Nghị định 13/2023/NĐ-CP | Xuyên suốt | Không màn hình, báo cáo nào của HTX, Cơ quan QLNN hiện dữ liệu cá nhân ngoài phạm vi được phép | Toàn hệ thống |

## 4. Danh mục yêu cầu chức năng

SRS có 82 FR: 61 dòng của bảng chức năng 08/10 và 21 dòng bổ sung. Dòng bổ sung có hai loại: chức năng đã có đặc tả hoặc bắt buộc cho luồng chạy được nhưng bảng 08/10 chưa có mã, và đề xuất mở rộng theo mô hình sàn thương mại điện tử. Mọi dòng bổ sung chờ Lead duyệt.

- Cột Ưu tiên là đề xuất theo MoSCoW (Must, Should, Could); bảng 08/10 chưa có cột ưu tiên.
- Bảng 08/10 đang trùng mã FR-DH-01 đến 06 giữa bộ phía khách và bộ phía HTX, Admin. SRS đổi bộ phía HTX, Admin thành FR-DH-07 đến 12 (cột Ghi chú ghi mã cũ).
- Quyền chi tiết theo vai trò và phạm vi dữ liệu nằm ở mục 11 (đợt 2).

### 4.1. Tài khoản (TK)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-TK-01 | Cho đăng ký bằng số điện thoại và OTP, chọn loại Khách hàng hoặc HTX | Khách vãng lai | Must | Bảng 08/10 ghi vãng lai "—"; người đăng ký thực tế là vãng lai |
| FR-TK-02 | Cho đăng nhập, đăng xuất; đưa mỗi vai trò vào giao diện của mình | Mọi vai trò | Must | Phương thức đăng nhập chưa thống nhất (OI-03) |
| FR-TK-03 | Cho xem, sửa thông tin cá nhân; đổi số điện thoại phải qua OTP | Khách, HTX | Must |  |
| FR-TK-04 | Quản lý sổ địa chỉ: chỉ Hà Nội, chung cư có toà – căn, tối đa 10 địa chỉ | Khách | Must | BR-ACC-010 |
| FR-TK-05 | Cho xoá tài khoản, giữ dữ liệu đơn theo quy định | Khách, HTX, Admin | Should | Chưa có đặc tả |
| FR-TK-06 | Cho HTX khai hồ sơ, tải giấy tờ pháp lý | HTX | Must |  |
| FR-TK-07 | Cho HTX gửi duyệt và theo dõi tình trạng hồ sơ | HTX | Must |  |
| FR-TK-08 | Cho Admin tiếp nhận, xem hồ sơ HTX chờ duyệt | Admin – Chất lượng | Must |  |
| FR-TK-09 | Cho Admin duyệt, từ chối (bắt buộc lý do), yêu cầu bổ sung hồ sơ HTX | Admin – Chất lượng | Must |  |
| FR-TK-10 | Cho cấp tài khoản Admin, Cơ quan QLNN, Shipper; không tự đăng ký | Quản trị gốc (Admin), Admin – Vận hành (QLNN, Shipper) | Must | Thêm Shipper theo quyết định 29/10 |
| FR-TK-11 | Cho gán quyền theo vai trò, nhóm quyền; chặn thao tác ngoài quyền ở máy chủ | Quản trị gốc | Must |  |
| FR-TK-12 | Cho khoá, mở khoá tài khoản kèm lý do, ngắt phiên ngay | Admin – Vận hành | Must | Bổ sung; đã có UC-ACC-07 |
| FR-TK-13 | Cho kích hoạt, tạm khoá quyền bán của HTX | Admin | Must | Bổ sung; mã cũ FR-HTX-04 |
| FR-TK-14 | Cho đặt lại mật khẩu qua OTP | Khách, HTX | Should | Bổ sung theo mô hình sàn; chỉ cần nếu dùng mật khẩu (OI-03) |

### 4.2. Tìm kiếm và xem sản phẩm (TKSP)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-TKSP-01 | Hiển thị danh mục, danh sách sản phẩm đã duyệt, đang bán | Mọi vai trò trừ QLNN | Must |  |
| FR-TKSP-02 | Tìm theo tên sản phẩm, danh mục, HTX; không phân biệt dấu | Vãng lai, Khách | Must |  |
| FR-TKSP-03 | Lọc, sắp xếp (danh mục, HTX, còn hàng, đặt trước, OCOP) | Vãng lai, Khách | Must |  |
| FR-TKSP-04 | Hiển thị chi tiết: ảnh, giá, HTX, chứng nhận, QR nguồn gốc, đánh giá, điều kiện đặt trước | Mọi vai trò | Must |  |
| FR-TKSP-05 | Tạo link chia sẻ mở được trên app và web | Vãng lai, Khách, HTX | Must | Mã giới thiệu chưa thống nhất (OI-09) |
| FR-TKSP-06 | Trang chủ: đặc sản đang vào mùa, OCOP nổi bật, banner | Vãng lai, Khách | Should | Bổ sung mở rộng; nội dung lấy từ FR-HT-05 |
| FR-TKSP-07 | Gợi ý từ khoá khi gõ tìm kiếm | Vãng lai, Khách | Could | Bổ sung mở rộng |
| FR-TKSP-08 | Lưu sản phẩm yêu thích | Khách | Could | Bổ sung mở rộng |
| FR-TKSP-09 | Xem trang HTX, theo dõi HTX | Vãng lai, Khách | Could | Bổ sung; bảng hành trình có "Xem trang HTX" mức Nên có |
| FR-TKSP-10 | Lịch sử sản phẩm đã xem | Khách | Could | Bổ sung mở rộng |

### 4.3. Mua hàng và thanh toán (MHTT)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-MHTT-01 | Quản lý giỏ: thêm, xem, sửa số lượng, xoá; nhóm Mua sẵn và Đặt trước | Khách | Must | Một giỏ hay hai giỏ (OI-10) |
| FR-MHTT-02 | Đặt hàng sẵn có: kiểm tra lại, chọn địa chỉ, cách giao, tách đơn theo HTX | Khách | Must |  |
| FR-MHTT-03 | Đặt trước: chọn ngày giao, đồng ý điều kiện cọc, trả cọc | Khách | Must | Mô hình đặt trước chưa thống nhất (OI-11) |
| FR-MHTT-04 | Chọn hộp quà, viết lời nhắn, gửi người khác | Khách | Should | Chờ lãnh đạo (câu 9 bảng hành trình) |
| FR-MHTT-05 | Thanh toán COD hoặc online; gộp một giao dịch; giữ hàng 15 phút | Khách | Must |  |
| FR-MHTT-06 | Nhập mã ưu đãi tại màn Đặt hàng | Khách | Should | Bổ sung; FR-HT-01 mới có phía Admin |
| FR-MHTT-07 | Trả phần còn lại của đơn đặt trước khi hàng sẵn sàng | Khách | Must | Bổ sung; mã cũ FR-DH-11 |

### 4.4. Đơn hàng (DH)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-DH-01 | Hiển thị danh sách đơn của khách theo tab trạng thái | Khách | Must | Bảng 08/10 gộp cả HTX, Admin, QLNN vào dòng này |
| FR-DH-02 | Cho đổi người nhận, địa chỉ trước khi bàn giao vận chuyển | Khách | Should |  |
| FR-DH-03 | Cho huỷ đơn hoặc gửi yêu cầu huỷ theo trạng thái | Khách | Must |  |
| FR-DH-04 | Cho gửi yêu cầu trả hàng, hoàn tiền trong thời hạn | Khách | Must |  |
| FR-DH-05 | Cho gửi yêu cầu đổi hàng | Khách | Could | Chưa có chính sách đổi hàng (OI-13) |
| FR-DH-06 | Cho mua lại đơn cũ: đưa sản phẩm còn bán vào giỏ | Khách | Could |  |
| FR-DH-07 | Hiển thị danh sách đơn của HTX theo trạng thái, hạn xử lý | HTX; Admin chỉ xem | Must | Mã cũ FR-DH-01 (HTX) |
| FR-DH-08 | Cho HTX xác nhận hoặc từ chối đơn (bắt buộc lý do); quá hạn thì tự huỷ | HTX | Must | Mã cũ FR-DH-02 (HTX). HTX xác nhận: chốt 29/10 |
| FR-DH-09 | Cho HTX ghi nhận đóng gói, bàn giao hàng cho shipper | HTX | Must | Mã cũ FR-DH-03 (HTX). Nơi bàn giao chờ chốt (OI-20) |
| FR-DH-10 | Cho HTX xác nhận, đề xuất với yêu cầu trả hàng và xác nhận nhận lại hàng hoàn | HTX | Must | Mã cũ FR-DH-04 (HTX) |
| FR-DH-11 | Cho Admin duyệt trả hàng, quyết định hoàn tiền | Admin – CSKH | Must | Mã cũ FR-DH-05 (HTX) |
| FR-DH-12 | Ghi nhận kết quả hoàn tiền từ cổng hoặc ngân hàng | Admin – Tài chính; Hệ thống | Must | Mã cũ FR-DH-06 (HTX) |
| FR-DH-13 | Hiển thị chi tiết đơn, lịch sử trạng thái, theo dõi giao hàng | Khách, HTX, Shipper, Admin | Must | Bổ sung |
| FR-DH-14 | Cập nhật trạng thái giao: đang giao, đã giao, giao thất bại, chuyển hoàn | Shipper; Admin – Vận hành sửa thay | Must | Bổ sung; mã cũ FR-DH-06 ma trận. OI-01 có hướng 29/10 |
| FR-DH-15 | Cho khách xác nhận đã nhận hàng; tự chuyển Đã giao khi quá hạn | Khách; Hệ thống | Must | Bổ sung |
| FR-DH-16 | Cho HTX xử lý yêu cầu huỷ khi đơn đang chuẩn bị | HTX | Should | Bổ sung |
| FR-DH-17 | Cho HTX báo thu hoạch, sẵn sàng giao hoặc báo không cung cấp được hàng đặt trước | HTX | Must | Bổ sung |

### 4.5. Chăm sóc khách hàng và đánh giá (CSKH)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-CSKH-01 | Cho gửi yêu cầu hỗ trợ, khiếu nại gắn với một đơn, kèm ảnh | Khách | Must |  |
| FR-CSKH-02 | Hiển thị câu hỏi thường gặp | Vãng lai, Khách | Should |  |
| FR-CSKH-03 | Cho nhắn tin giữa khách và HTX | Khách, HTX | Should | Chưa có đặc tả |
| FR-CSKH-04 | Cho đánh giá sản phẩm trong đơn Đã giao | Khách | Must |  |
| FR-CSKH-05 | Cho HTX phản hồi đánh giá | HTX | Should | Bảng 08/10 ghi Khách "Của mình"; cần làm rõ khách làm gì ở đây |
| FR-CSKH-06 | Cho Admin kiểm duyệt, ẩn đánh giá (bắt buộc lý do) | Admin – CSKH | Must |  |
| FR-CSKH-07 | Hiển thị danh sách ticket; QLNN chỉ xem số liệu tổng hợp | Admin – CSKH; QLNN | Must |  |
| FR-CSKH-08 | Cho phản hồi ticket | HTX (của mình), Admin – CSKH | Must |  |
| FR-CSKH-09 | Cho kết luận trách nhiệm, đóng ticket | Admin – CSKH | Must | HTX không được đóng |
| FR-CSKH-10 | Trung tâm thông báo: trạng thái đơn, ticket, kết quả duyệt, tồn thấp, mời đánh giá | Mọi vai trò đã đăng nhập | Must | Bổ sung; mã cũ FR-CS-10 |
| FR-CSKH-11 | Cho đánh giá HTX | Khách | Could | Bổ sung mở rộng |

### 4.6. Quản lý sản phẩm (SP)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-SP-01 | Quản lý danh mục sản phẩm đang bán | Admin – Vận hành | Should | Đổi tác nhân 29/10 (trước: HTX). Đề xuất gộp vào FR-HT-04 |
| FR-SP-02 | Cho tạo sản phẩm, lưu nháp, đăng bán | Admin – Chất lượng | Must | Đổi tác nhân 29/10 (trước: HTX tạo, gửi duyệt) |
| FR-SP-03 | Cho HTX xem sản phẩm của mình và trạng thái đang bán, ngừng bán | HTX chỉ xem; Admin | Must | Đổi 29/10 (trước: HTX theo dõi tình trạng duyệt) |
| FR-SP-04 | Cho Admin kiểm tra chứng nhận, nguồn gốc trước khi đăng bán | Admin – Chất lượng | Must | Đổi 29/10 (trước: duyệt sản phẩm HTX gửi). Người thứ hai duyệt: OI-21 |
| FR-SP-05 | Cho ẩn, ngừng bán sản phẩm đang bán | Admin – Chất lượng | Must | Đổi 29/10: bỏ quyền HTX |
| FR-SP-06 | Cho sửa sản phẩm; mọi thay đổi ghi nhật ký | Admin – Chất lượng | Must | Đổi tác nhân 29/10 (trước: HTX) |
| FR-SP-07 | Cho HTX cập nhật tồn kho, cảnh báo tồn thấp; cho Admin đặt, đổi giá bán | HTX (tồn kho); Admin – Chất lượng (giá) | Must | Đổi 29/10: giá chuyển sang Admin |
| FR-SP-08 | Quản lý chứng nhận, cảnh báo sắp hết hạn cho Admin và HTX | Admin – Chất lượng; HTX chỉ xem | Must | Đổi 29/10 (trước: HTX quản lý). HTX gửi giấy tờ qua hồ sơ (FR-TK-06) |
| FR-SP-09 | Cấu hình đặt trước, hoả tốc, thời gian chuẩn bị | Admin – Chất lượng | Must | Đổi tác nhân 29/10 (trước: HTX). Số liệu mùa vụ: OI-22 |

### 4.7. Doanh thu và đối soát (DT)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-DT-01 | Hiển thị dashboard doanh thu | HTX (của mình), Admin | Should |  |
| FR-DT-02 | Hiển thị đối soát tiền chi trả, hoa hồng, khoản trừ, tiền giữ lại | HTX, Admin – Tài chính | Must |  |
| FR-DT-03 | Hiển thị đối soát theo đơn, theo HTX; tách 4 khoản | HTX, Admin – Tài chính | Must |  |
| FR-DT-04 | Cho chốt kỳ, duyệt bảng kê, xác nhận chi trả HTX | Admin – Tài chính | Must | Bảng 08/10 ghi Admin "Chỉ xem"; OI-12 có hướng 29/10: Admin – Tài chính thao tác |
| FR-DT-05 | Đối soát với cổng thanh toán và tiền COD shipper nộp; xử lý chênh lệch bằng bút toán riêng | Admin – Tài chính | Should | Bổ sung; mã cũ FR-AD-05. Đổi 29/10: thay đơn vị vận chuyển bằng shipper của sàn |

### 4.8. Quản lý hệ thống (HT)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-HT-01 | Cho tạo, sửa, tạm dừng, kết thúc mã ưu đãi; theo dõi lượt dùng | Admin | Should | Chỉ Admin tạo mã ở giai đoạn 1 |
| FR-HT-02 | Cho cấu hình tham số, lưu lịch sử; chỉ áp cho đơn mới | Admin – Vận hành | Must | Anh Hiếu phụ trách |
| FR-HT-03 | Ghi và cho tra cứu nhật ký thao tác, không sửa, không xoá | Admin | Must |  |
| FR-HT-04 | Quản lý danh mục dùng chung: loại sản phẩm, địa phương, loại chứng nhận, đơn vị tính | Admin | Must | Bổ sung; cần cho FR-SP-02 và bộ lọc |
| FR-HT-05 | Quản lý nội dung trang chủ: banner, bộ sưu tập theo mùa | Admin | Should | Bổ sung mở rộng |
| FR-HT-06 | Quản lý loại hộp quà: ảnh, mô tả, phí, đang dùng | Admin | Should | Bổ sung; cần cho FR-MHTT-04 |

### 4.9. Báo cáo, thống kê (BCTK)

| Mã | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-BCTK-01 | Hiển thị dashboard thống kê HTX, sản phẩm | HTX (của mình), Admin, QLNN (tổng hợp) | Must | Nguồn duy nhất cho QLNN |
| FR-BCTK-02 | Hiển thị báo cáo doanh thu, giao dịch | HTX, Admin, QLNN (tổng hợp) | Should |  |
| FR-BCTK-03 | Xuất báo cáo ra tệp, không chứa dữ liệu cá nhân của khách | HTX, Admin, QLNN | Should |  |

## 5. Danh mục use case

SRS không viết lại use case đã có. Mỗi FR trỏ tới một đặc tả dùng làm chuẩn; các đặc tả trùng được ghi lại để nhóm gộp. Mã UC giữ nguyên như trong tài liệu gốc; việc đánh lại mã thống nhất nằm ở OI-07.

| Tình trạng | Số FR | Ý nghĩa |
| --- | --- | --- |
| Đủ | 49 | Có use case đầy đủ luồng chính, luồng phụ, quy tắc |
| Một phần | 9 | Có use case nhưng thiếu luồng hoặc còn ghi "TBD" |
| Chưa có | 24 | Chưa có use case |

### 5.1. Bảng đối chiếu FR – use case

| FR | Use case dùng làm chuẩn | Tài liệu | Trùng, lệch cần gộp | Tình trạng |
| --- | --- | --- | --- | --- |
| FR-TK-01 đến 04 | UC-ACC-01 đến 05 | Đặc tả tài khoản |  | Đủ |
| FR-TK-05 |  |  |  | Chưa có |
| FR-TK-06 đến 11 | UC-TK-06 đến 11 | Đặc tả UC TK – Nguyễn Khải | Trùng UC-HTX-01 đến 03 (Khải), UC-AD-01 (Module AD) | Đủ, cần gộp |
| FR-TK-12 | UC-ACC-07 | Đặc tả tài khoản |  | Đủ |
| FR-TK-13 | UC-HTX-04 | Đặc tả UC HTX – Nguyễn Khải |  | Đủ |
| FR-TK-14 |  |  | Phụ thuộc OI-03 | Chưa có |
| FR-TKSP-01 đến 05 | UC-MH-01 đến 04, UC-MH-08, 09 | SRS Module MH v1.1 – Cao Nguyên |  | Đủ |
| FR-TKSP-06 đến 10 |  |  |  | Chưa có |
| FR-MHTT-01 | UC-MH-05 đến 07 | SRS Module MH v1.1 – Cao Nguyên | Một giỏ hay hai giỏ lệch với UC-MHTT-02 (OI-10) | Đủ |
| FR-MHTT-02 | UC-MHTT-02 | Đặc tả UC – Module Mua hàng và Thanh toán |  | Đủ |
| FR-MHTT-03 | UC-MHTT-03 | Đặc tả UC – Module Mua hàng và Thanh toán | Mô hình đặt trước lệch với SRS Module MH (OI-11) | Đủ |
| FR-MHTT-04 | UC-MHTT-04 | Đặc tả UC – Module Mua hàng và Thanh toán |  | Đủ |
| FR-MHTT-05 | UC-MHTT-05 | Đặc tả UC – Module Mua hàng và Thanh toán |  | Đủ |
| FR-MHTT-06 | Một bước trong UC-MHTT-02 | Đặc tả UC – Module Mua hàng và Thanh toán | Còn CX-22 | Một phần |
| FR-MHTT-07 | UC-MHTT-05, luồng A4 | Đặc tả UC – Module Mua hàng và Thanh toán |  | Đủ |
| FR-DH-01 | UC-DH-01 | Đặc tả UC – Module Mua hàng và Thanh toán | Mã UC-DH-01 trùng với tài liệu Hoàng Đạt | Đủ |
| FR-DH-02 | UC-DH-10 | Module DH – Thúy Nguyễn |  | Đủ |
| FR-DH-03, 04 |  |  | Quy tắc đã có trong BRD Chính sách đơn hàng | Chưa có |
| FR-DH-05, 06 |  |  | FR-DH-05 chưa có chính sách (OI-13) | Chưa có |
| FR-DH-07 | UC-DH-07 | Đặc tả UC – Tồn kho, giá, chứng nhận, Preorder và danh sách đơn |  | Đủ |
| FR-DH-08 | UC-DH-01 | Đặc Tả – Hoàng Đạt | Trùng UC-DH-03 (Thúy) | Đủ, cần gộp |
| FR-DH-09 | UC-DH-02 | Đặc Tả – Hoàng Đạt | Trùng UC-DH-05 (Thúy) | Đủ, cần gộp |
| FR-DH-10 | UC-DH-04 | Đặc Tả – Hoàng Đạt |  | Một phần |
| FR-DH-11 | UC-DH-03 | Đặc Tả – Hoàng Đạt | Trùng một phần UC-AD-05 (Module AD) | Đủ, cần gộp |
| FR-DH-12 | UC-DH-05, 06 | Đặc Tả – Hoàng Đạt |  | Đủ |
| FR-DH-13 | UC-DH-08, đề xuất đổi thành UC-DH-13 | Đặc tả UC – Tồn kho, giá, chứng nhận, Preorder và danh sách đơn |  | Đủ |
| FR-DH-14 | UC-DH-06 | Module DH – Thúy Nguyễn | Ai cập nhật chờ OI-01 | Đủ |
| FR-DH-15 | UC-DH-07 | Module DH – Thúy Nguyễn |  | Đủ |
| FR-DH-16, 17 |  |  |  | Chưa có |
| FR-CSKH-01 | Gửi yêu cầu hỗ trợ | Module CSKH và Review – Huyền |  | Đủ |
| FR-CSKH-02, 03 |  |  |  | Chưa có |
| FR-CSKH-04, 05 | Luồng đánh giá, phản hồi đánh giá | Module CSKH và Review – Huyền |  | Một phần |
| FR-CSKH-06 đến 09 | Đặc tả chức năng 8–10 | Quỳnh Anh | Nhiều chỗ còn "TBD" | Một phần |
| FR-CSKH-10, 11 |  |  |  | Chưa có |
| FR-SP-01 | Đặc tả chức năng 8–10 | Quỳnh Anh |  | Một phần |
| FR-SP-02 đến 06 | Bộ UC quản lý sản phẩm | Đặc tả UC.pdf | Trùng UC-HTX-05 đến 09 (Khải), UC-AD-02 (Module AD) | Đủ, cần gộp |
| FR-SP-07 đến 09 | UC-SP-07, 08, 09 | Đặc tả UC – Tồn kho, giá, chứng nhận, Preorder và danh sách đơn | Trùng UC-HTX-10 đến 12 (Khải) | Đủ, cần gộp |
| FR-DT-01 đến 04 | UC-DT-01 đến 12 | Đặc tả UC từ FR-DT-01 tới FR-DT-04, FR-HT-01 | Trùng UC-AD-04, 06, 10 đến 12 (Module AD) | Đủ, cần gộp |
| FR-DT-05 | UC-AD-07 đến 09 | Đặc tả UC, BR và NFR – Module AD |  | Đủ |
| FR-HT-01 | UC-HT-01 đến 04 | Đặc tả UC từ FR-DT-01 tới FR-DT-04, FR-HT-01 |  | Đủ |
| FR-HT-02 | UC-AD-03 | Đặc tả UC, BR và NFR – Module AD (anh Hiếu) |  | Đủ |
| FR-HT-03 đến 06 |  |  |  | Chưa có |
| FR-BCTK-01 đến 03 |  |  |  | Chưa có |

### 5.2. Việc cần làm với use case

**Gộp đặc tả trùng (6 nhóm).** Với mỗi nhóm, Lead chọn một bản làm chuẩn; bản còn lại chuyển thành tài liệu tham khảo, không cập nhật tiếp.

| Nhóm | Các bản đang có | Đề xuất bản chuẩn | Lý do |
| --- | --- | --- | --- |
| Duyệt hồ sơ HTX | Khải TK, Khải HTX, Module AD | Khải TK | Khớp mã FR-TK-06 đến 11 |
| Quản lý, duyệt sản phẩm | Đặc tả UC.pdf, Khải HTX, Module AD | Đặc tả UC.pdf | Khớp mã FR-SP |
| Tồn kho, giá, chứng nhận, đặt trước | Đặc tả UC – Tồn kho…, Khải HTX | Đặc tả UC – Tồn kho… | Đã cập nhật theo quyết định mới nhất |
| HTX xử lý đơn | Hoàng Đạt, Thúy | Hoàng Đạt cho xác nhận, đóng gói; Thúy cho cập nhật giao, khách nhận hàng | Mỗi bản đủ ở phần khác nhau |
| Trả hàng, hoàn tiền | Hoàng Đạt, Module AD | Hoàng Đạt; Module AD giữ phần đối soát |  |
| Doanh thu, đối soát | Tài liệu DT/HT, Module AD | Tài liệu DT/HT; Module AD giữ đối soát ĐVVC, cổng |  |

**Viết use case còn thiếu (24 FR).** Đề xuất ưu tiên 7 FR mức Must trước, vì thiếu chúng thì luồng mua bán không chạy trọn:

| FR | Chức năng | Vì sao cần trước |
| --- | --- | --- |
| FR-DH-03 | Khách huỷ đơn | Có quy tắc nhưng chưa có luồng màn hình |
| FR-DH-04 | Khách yêu cầu trả hàng, hoàn tiền | FR-DH-10, 11, 12 phía HTX, Admin đã có, phía khách chưa có |
| FR-DH-17 | HTX báo sẵn sàng giao, báo không cung cấp được | Là điểm bắt đầu của FR-MHTT-07 |
| FR-CSKH-10 | Trung tâm thông báo | Mọi module đều gửi thông báo |
| FR-HT-03 | Nhật ký thao tác | Nhiều quy tắc yêu cầu ghi nhật ký |
| FR-HT-04 | Danh mục dùng chung | Cần cho tạo sản phẩm và bộ lọc |
| FR-BCTK-01 | Dashboard thống kê | Là nguồn dữ liệu duy nhất cho Cơ quan QLNN |

17 FR còn lại (Should, Could) viết sau khi luồng chính ổn định.

## 6. Yêu cầu phi chức năng

Yêu cầu phi chức năng đã đủ trong bảng Non\_Functional\_Requirements\_Dac\_San\_So.xlsx: 25 NFR, trạng thái Draft, dựa trên SOP và nhóm đặc tính ISO/IEC 25010. SRS không chép lại; bảng NFR là bản có hiệu lực. Mục này có mục lục để tra nhanh và các chỗ cần sửa theo quyết định 29/10.

### 6.1. Mục lục bảng NFR

| Nhóm | Mã | Nội dung chính |
| --- | --- | --- |
| Bảo mật | NFR-SEC-001 đến 006 | OTP 6 số, hết hạn 120 giây, gửi lại tối đa 3 lần trong 15 phút; mật khẩu 8–32 ký tự, băm Bcrypt; khoá 15 phút sau 5 lần sai; tối đa 3 thiết bị; kiểm quyền ở máy chủ; bảo vệ dữ liệu cá nhân |
| Toàn vẹn dữ liệu, tài chính | NFR-AUD-001, NFR-DATA-001, 002, NFR-REL-001, NFR-FIN-001 | Nhật ký không sửa, không xoá; bản chốt đơn; sổ tiền không sửa; không thu, hoàn trùng; tính tiền đúng tham số |
| Hiệu năng, tải | NFR-PERF-001, 002, NFR-SCAL-001 | Lưu địa chỉ dưới 3 giây; ghi nhật ký ngay trong thao tác; tải mục tiêu chưa có số |
| Độ tin cậy, phục hồi, giám sát | NFR-AVAIL-001, NFR-REC-001, NFR-OBS-001 | Giám sát thời gian hoạt động; sao lưu, khôi phục; mã lỗi cho giao dịch quan trọng |
| Riêng tư, báo cáo | NFR-PRIV-001, NFR-REPORT-001 | QLNN không thấy dữ liệu cá nhân; số liệu báo cáo đối chiếu được về đơn, dòng sổ |
| Vận hành, sử dụng, tương thích, bảo trì, tích hợp | NFR-OPS-001, 002, NFR-USAB-001, NFR-COMP-001, NFR-MAINT-001, NFR-INTEROP-001 | Ticket tiếp nhận ≤ 2 giờ, kết luận ≤ 24 giờ làm việc; link kích hoạt HTX 24 giờ; một app cho nhiều vai trò; tham số đổi không cần sửa mã; tích hợp có mã tham chiếu |

### 6.2. Cần sửa trong bảng NFR

| NFR | Cần sửa | Lý do |
| --- | --- | --- |
| NFR-SEC-005 | Thêm phạm vi Shipper: chỉ đơn được phân công; thêm ca kiểm thử shipper mở đơn người khác bị từ chối | Mục 11, PQ-04 |
| NFR-SEC-006 | Thêm: Shipper, HTX chỉ thấy tên, SĐT, địa chỉ người nhận của đơn mình | BR-QL-08; mục 11.4 |
| NFR-COMP-001 | Thêm giao diện Shipper vào "một app hợp nhất"; Admin dùng app hay web vẫn chờ OI-04 | Quyết định 29/10 |
| NFR-INTEROP-001 | Bỏ phần đơn vị vận chuyển ở chặng cuối; thêm đối soát phiếu nộp COD của shipper | FR-DT-05, FR-DT-06 |
| NFR-SEC-002, 003 | Chỉ giữ nếu dùng mật khẩu; nếu chỉ đăng nhập bằng OTP thì sửa thành giới hạn nhập sai OTP | OI-03 |

### 6.3. Chỉ tiêu chưa có con số

Bảng NFR tự ghi các chỉ tiêu dưới đây là chưa có số, cần PO và IT chốt trước nghiệm thu: thời gian hoạt động tối thiểu mỗi tháng (NFR-AVAIL-001); mức mất dữ liệu và thời gian khôi phục tối đa (NFR-REC-001); số người dùng cùng lúc và thời gian phản hồi (NFR-SCAL-001); thời hạn lưu nhật ký (NFR-AUD-001, OI-19); lịch giờ làm việc để tính hạn xử lý ticket (NFR-OPS-001).

## 7. Quy tắc nghiệp vụ theo chủ đề

Quy tắc đang nằm rải ở hơn 10 tài liệu. Mục này gom lại theo 13 chủ đề để đội phát triển và kiểm thử tra một chỗ. Mã BR-\<chủ đề> là mã tổng hợp của SRS; cột Nguồn ghi mã gốc và mã gốc vẫn là bản có hiệu lực. Khi cần sửa, sửa ở tài liệu gốc rồi cập nhật bảng này.

| Tình trạng | Số quy tắc | Ý nghĩa |
| --- | --- | --- |
| Đã có | 56 | Có trong đặc tả nhóm, không xung đột |
| Chờ chốt | 23 | Tài liệu lệch nhau hoặc thiếu giá trị; mã OI, CX ghi câu hỏi cần trả lời |
| Đề xuất | 10 | SRS bổ sung để luồng chạy trọn, chờ Lead duyệt |
| Giả định | 1 | Đang dùng tạm để đặc tả, chưa có quyết định |

### 7.1. Vòng đời đơn hàng (VD)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-VD-01 | Đơn có 11 trạng thái: Chờ thanh toán, Chờ xác nhận, Đã xác nhận, Chờ thu hoạch, Đang chuẩn bị, Đang giao, Đã giao, Trả hàng – hoàn tiền, Đang chuyển hoàn, Đã hoàn về, Đã huỷ. Chỉ chuyển theo bảng chuyển trạng thái, không quay ngược; mỗi lần chuyển ghi thời điểm, người hoặc hệ thống thực hiện, lý do | BR-DH-131; mục 8 Đặc tả Mua hàng và Thanh toán | Chờ chốt tên trạng thái (OI-05) |
| BR-VD-02 | Mỗi đơn có hai cột độc lập: trạng thái đơn và tình trạng thanh toán (Chưa thanh toán COD, Chờ thanh toán, Đã thanh toán, Đã cọc – còn lại, Chờ hoàn tiền, Đang hoàn tiền, Đã hoàn tiền) | BR-DH-130 | Đã có |
| BR-VD-03 | Hệ thống tự chuyển: Chờ thanh toán quá PAR-19 phút → Đã huỷ; Chờ xác nhận quá PAR-11 → Đã huỷ, hoàn tiền nếu đã trả; Đang giao mà khách không bấm Đã nhận trong PAR-26 sau khi bên giao báo thành công → Đã giao | BR-DH-132 | Đã có |
| BR-VD-04 | Giao thất bại: ghi lý do, giao lại tối đa PAR-27 lần; hết lượt hoặc khách từ chối nhận → Đang chuyển hoàn → Đã hoàn về; hoàn tiền nếu khách đã trả | BR-DH-133 | Chờ chốt cách xử lý hàng tươi (CX-24) |
| BR-VD-05 | Đơn sang Đã giao thì bắt đầu tính thời hạn khiếu nại, trả hàng và gửi lời mời đánh giá | UC-DH-07 (Thúy) | Đã có |
| BR-VD-06 | Shipper của sàn cập nhật Đang giao, Đã giao (kèm ảnh), giao thất bại, khách từ chối nhận cho đơn được phân công. Admin – Vận hành sửa thay khi shipper không cập nhật được, bắt buộc lý do | Quyết định 29/10; SOP-ORD-03 | Đã chốt có Shipper; Admin sửa thay là đề xuất (OI-23) |

### 7.2. Đặt hàng (DAT)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-DAT-01 | Chỉ tài khoản Khách hàng đã đăng nhập được đặt hàng; HTX, Admin, Cơ quan QLNN không đặt bằng tài khoản của mình | BR-MHTT-01 | Đã có |
| BR-DAT-02 | Một lần đặt tách thành nhiều đơn, mỗi đơn là một HTX và một loại đơn; đơn đặt trước tách thêm theo ngày giao; lỗi của đơn này không ảnh hưởng đơn khác | BR-MHTT-02 | Chờ chốt tách theo ngày giao (CX-23) |
| BR-DAT-03 | Kiểm tra lại khi mở màn Đặt hàng và khi bấm Đặt hàng. Giá giảm: áp giá mới; giá tăng: khách xác nhận lại; tồn ít hơn số đã chọn: giảm về số còn; hết hàng hoặc ngừng bán: bỏ dòng. Chứng nhận hết hạn không chặn mua | BR-MHTT-03; CX-03 | Đã có |
| BR-DAT-04 | Giai đoạn 1 chỉ giao Hà Nội; chung cư bắt buộc toà, căn; nhà mặt đất bắt buộc số nhà; một lần đặt dùng một địa chỉ, trừ đơn quà gửi người khác | BR-MHTT-04; BR-ACC-010 | Đã có |
| BR-DAT-05 | Hoả tốc chỉ hiện khi: đơn Mua sẵn, mọi sản phẩm có cờ hoả tốc đã duyệt, đặt trước giờ chốt PAR-21, địa chỉ trong vùng hoả tốc | BR-MHTT-05; DX-06 | Chờ chốt hoả tốc với hàng từ Lào Cai (OI-02) |
| BR-DAT-06 | Đơn lưu bản chốt lúc tạo: tên, quy cách, đơn giá, phí, giảm giá, địa chỉ, tỷ lệ cọc, điều kiện huỷ, tham số đang áp dụng. Đổi tham số chỉ áp cho đơn mới | BR-MHTT-07; FR-HT-02 | Đã có |
| BR-DAT-07 | Một lần bấm Đặt hàng tạo đúng một lần đặt; bấm lại khi mạng chậm không tạo đơn trùng | BR-MHTT-09 | Đã có |
| BR-DAT-08 | Đặt trước chỉ với sản phẩm đang mở Preorder và còn suất; ngày giao D trong khoảng ngày của HTX và không sớm hơn hôm nay + PAR-08; đổi D tối đa 1 lần | BR-MHTT-10, 11, 16 | Chờ chốt mô hình đặt trước (OI-11) |
| BR-DAT-09 | Hộp quà theo từng đơn; lời nhắn tối đa PAR-22 ký tự, không chứa link và số điện thoại; gửi người khác chỉ trả online, phiếu giao không in giá | BR-MHTT-18 đến 21 | Chờ chốt (CX-20, chờ lãnh đạo) |

### 7.3. Giá (GIA)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-GIA-01 | Giỏ hàng không giữ giá, không giữ hàng; giá tính theo thời điểm tạo đơn | BR-MHTT-03, 08 | Đã có |
| BR-GIA-02 | Chỉ Admin – Chất lượng đặt, đổi giá bán; mỗi lần đổi ghi nhật ký giá trị trước – sau; giá mới áp cho đơn tạo sau lúc đổi. HTX không đổi giá trong app | Quyết định 29/10; thay BR-SP-07, 08 | Đã chốt; nhóm nhập giá chờ OI-21 |
| BR-GIA-03 | Đơn đã tạo, kể cả đơn đặt trước, giữ giá lúc đặt dù giá đổi sau đó | BR-SP-09; BR-MHTT-07 | Đã có |

### 7.4. Tồn kho và suất đặt trước (TON)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-TON-01 | Tồn khả dụng = tồn kho − số đang giữ; HTX không được đặt tồn kho nhỏ hơn số đang giữ | BR-SP-03 | Đã có |
| BR-TON-02 | Giữ hàng từ lúc tạo đơn: đơn COD khi vào Chờ xác nhận, đơn online khi vào Chờ thanh toán; hai khách cùng đặt phần cuối thì đơn tạo trước được giữ | BR-MHTT-08 | Đã có |
| BR-TON-03 | Đơn huỷ hoặc hết hạn thanh toán thì nhả ngay số đang giữ | BR-MHTT-25, 28 | Đã có |
| BR-TON-04 | BR-SP-03 chỉ tính "đang giữ" cho đơn Chờ thanh toán, còn BR-MHTT-08 giữ cả đơn COD. Đề xuất thống nhất: số đang giữ gồm mọi đơn chưa huỷ và chưa bàn giao vận chuyển; khi bàn giao thì trừ hẳn khỏi tồn kho. Như vậy tồn kho luôn khớp số hàng HTX đang cầm | SRS | Đề xuất, cần sửa BR-SP-03 |
| BR-TON-05 | Ngưỡng tồn thấp do HTX đặt, bỏ trống dùng PAR-02; cảnh báo tối đa một lần mỗi ngày cho mỗi sản phẩm | BR-SP-05 | Đã có |
| BR-TON-06 | Tồn khả dụng bằng 0: hiện Hết hàng, hoặc chuyển nhận đặt trước nếu đang mở Preorder | Đặc tả UC – Tồn kho… | Chờ chốt (CX-01) |
| BR-TON-07 | Suất đặt trước bị trừ khi đơn vào Chờ thanh toán, trả lại khi đơn huỷ hoặc hết hạn thanh toán | BR-MHTT-15 | Đã có |
| BR-TON-08 | HTX cập nhật tồn kho có hiệu lực ngay, không cần duyệt, có lịch sử | BR-SP-04, 10 | Đã có |
| BR-TON-09 | Hàng hoàn về không tự cộng lại tồn kho; HTX kiểm hàng rồi tự cập nhật qua FR-SP-07 | SRS (chưa có quy tắc) | Đề xuất |

### 7.5. Tính tiền (TIEN)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-TIEN-01 | Tổng đơn = tiền hàng − giảm giá + phí giao + phụ phí hoả tốc + phí hộp quà. Tổng lần đặt = tổng các đơn. Hiện từng khoản trước khi đặt | BR-MHTT-06 | Đã có |
| BR-TIEN-02 | Tiền cọc = PAR-18 × (tiền hàng sau giảm + phí hộp quà), làm tròn lên theo bước PAR-04. Phí giao không tính vào cọc. Phần còn lại = tổng đơn − tiền cọc | BR-MHTT-12; DX-08 | Đã có; PAR-18 = 30% là giả định |
| BR-TIEN-03 | Phí giao tính theo từng đơn. Bảng phí giao và phụ phí hoả tốc theo bậc khoảng cách (đang ghi 20.000 / 30.000 / 40.000đ cho 0–5 / 5–10 / 10–15 km) chưa chốt | BR-MHTT-06; Danh sách FR và UC – Module AD và TK mục 4 | Chờ chốt |
| BR-TIEN-04 | Mọi số tiền tính và lưu ở máy chủ bằng số nguyên đồng; ứng dụng chỉ hiển thị, không tự tính số gửi lên | SRS | Đề xuất |

### 7.6. Mã ưu đãi (KM)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-KM-01 | Giai đoạn 1 chỉ Admin tạo mã; HTX không tạo mã riêng | FR-HT-01; BR-HT-01 | Đã có |
| BR-KM-02 | Tối đa PAR-28 mã mỗi lần đặt (đang là 1), không cộng dồn | BR-MHTT-29 | Đã có |
| BR-KM-03 | Mã chỉ giảm tiền hàng của các dòng hợp lệ; không giảm phí giao, phụ phí hoả tốc, phí hộp quà | BR-MHTT-19, 29 | Đã có |
| BR-KM-04 | Thứ tự tính: (1) cộng tiền hàng dòng hợp lệ; (2) tính số giảm theo điều kiện mã, không vượt tiền hàng hợp lệ; (3) chia số giảm vào từng đơn theo tỷ lệ tiền hàng hợp lệ, phần lẻ dồn vào đơn lớn nhất; (4) cộng phí giao, phụ phí, phí hộp; (5) tính cọc nếu là đơn đặt trước | BR-MHTT-29 (bước 3); SRS (thứ tự, phần lẻ) | Đề xuất |
| BR-KM-05 | Kiểm tra lại điều kiện mã khi bấm Đặt hàng; mã hết lượt hoặc hết hạn thì báo và bỏ mã | BR-HT-12 | Đã có |
| BR-KM-06 | Lượt dùng giữ khi tạo đơn, nhả khi hết hạn thanh toán. Hoàn lượt khi huỷ trước bàn giao do khách, HTX hoặc hệ thống; không hoàn khi mất cọc hoặc giao thất bại do khách | BR-MHTT-29; DX-09; BR-HT-13 | Chờ chốt (DX-09 đang là nháp) |
| BR-KM-07 | Sàn chịu toàn bộ chi phí mã ưu đãi, không trừ vào tiền của HTX | GD-07 | Giả định |
| BR-KM-08 | Khi hoàn tiền, khách nhận đúng số đã trả cho phần hàng được hoàn, tức đã trừ phần giảm được chia cho phần hàng đó | BR-DH-05-01 (Hoàng Đạt); BR-DT-10 | Đã có |

### 7.7. Thanh toán (TT)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-TT-01 | Đơn Mua sẵn chọn COD hoặc online; cọc đặt trước chỉ online. Ẩn COD khi tổng đơn vượt PAR-23 hoặc đơn quà gửi người khác | BR-MHTT-13, 23 | Chờ chốt giá trị PAR-23 (CX-21) |
| BR-TT-02 | Mọi đơn online và tiền cọc của một lần đặt gộp thành một giao dịch, dùng chung một đồng hồ giữ hàng | BR-MHTT-24 | Đã có |
| BR-TT-03 | Giữ PAR-19 phút từ lúc tạo đơn; thử lại hoặc đổi phương thức không gia hạn; nhắc ở phút PAR-20; quá hạn thì huỷ các đơn trong giao dịch, nhả hàng, suất, lượt mã | BR-MHTT-25 | Đã có |
| BR-TT-04 | Chỉ ghi nhận kết quả cổng gửi về máy chủ, không dựa vào màn hình trả về; một kết quả gửi nhiều lần chỉ xử lý một lần | BR-MHTT-26; NFR-ORD-02 | Đã có |
| BR-TT-05 | Tiền về sau khi đơn đã huỷ: không khôi phục đơn, tự tạo yêu cầu hoàn tiền | BR-MHTT-27 | Đã có |
| BR-TT-06 | Chống trừ tiền hai lần: nếu một giao dịch nhận hai lần trả thành công (khách trả ở hai cửa sổ hoặc hai phương thức), chỉ lần đầu được tính; lần sau tự tạo yêu cầu hoàn 100% và báo khách | SRS, mở rộng BR-MHTT-26, 27 | Đề xuất |
| BR-TT-07 | Thanh toán thành công: đơn sang Chờ xác nhận; hạn HTX xác nhận PAR-11 tính từ lúc này | BR-MHTT-30 | Đã có |
| BR-TT-08 | Phần còn lại của đơn đặt trước: trả trong PAR-24 sau khi HTX báo sẵn sàng; HTX chỉ bàn giao khi đã trả đủ hoặc phần còn lại là COD; quá hạn thì chuyển COD nếu đủ điều kiện, nếu không huỷ như khách huỷ sau mốc | BR-MHTT-17 | Chờ chốt (CX-18) |

### 7.8. Huỷ đơn (HUY)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-HUY-01 | Đơn Chờ thanh toán, Chờ xác nhận: khách tự huỷ, có hiệu lực ngay | SRS, dựa trên BRD Chính sách đơn hàng luồng BF-03 | Đề xuất |
| BR-HUY-02 | Đơn Đã xác nhận, Đang chuẩn bị: khách gửi yêu cầu huỷ, HTX xử lý (FR-DH-16); chi phí đã phát sinh xét theo chính sách | SRS, dựa trên BF-01-E, BF-03-C | Đề xuất |
| BR-HUY-03 | Từ Đang giao trở đi không huỷ được; khách từ chối nhận thì xử lý theo nguyên nhân và trách nhiệm | SRS, dựa trên BRD Chính sách đơn hàng mục 2.6.5 | Đề xuất |
| BR-HUY-04 | HTX từ chối đơn bắt buộc chọn lý do; HTX không xác nhận trong PAR-11 thì đơn tự huỷ; khách đã trả thì hoàn 100% | FR-DH-08; BR-DH-132 | Đã có |
| BR-HUY-05 | Đơn đặt trước: huỷ đến hết 23:59 ngày D − PAR-08 được hoàn 100% cọc, sau mốc không hoàn cọc; HTX từ chối, quá hạn xác nhận hoặc không cung cấp được thì hoàn 100% | BR-MHTT-14; DX-03 | Đã có |
| BR-HUY-06 | Hàng đặt trước giao trễ quá thời hạn cấu hình: khách được huỷ hợp lệ và được hoàn tiền | SOP-SUP-02 | Chờ chốt số ngày trễ |
| BR-HUY-07 | Huỷ đơn thì nhả hàng, suất; lượt mã xử lý theo BR-KM-06; hoàn tiền nếu khách đã trả | BR-MHTT-25, 28; BR-DH-132 | Đã có |

### 7.9. Trả hàng, hoàn tiền, đổi hàng (HOAN)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-HOAN-01 | Hạn gửi yêu cầu trả hàng, hoàn tiền tính từ lúc Đã giao: 24 giờ với hàng tươi sống, đông lạnh; 10 ngày với hàng khô | UC-DH-07 (Thúy); BRD Chính sách đơn hàng mục D | Chờ chốt (các tài liệu đều ghi là đề xuất) |
| BR-HOAN-02 | Căn cứ xem xét hoàn: người bán không cung ứng được, giao thất bại, hàng lỗi hoặc hư hỏng, giao trễ vượt cam kết, hàng không còn dùng được… Không tự động hoàn chỉ vì số ngày trễ; khách đổi ý không phải căn cứ hoàn mặc định | BRD Chính sách đơn hàng mục 2.6 (RF-01 đến 07) | Đã có |
| BR-HOAN-03 | Số tiền hoàn bằng 100% tiền hàng khách đã thực trả cho phần được duyệt; không hoàn khoản chưa thu (COD chưa thu, phần còn lại đặt trước chưa trả) | BR-DH-05-01, 03 (Hoàng Đạt); BR-DT-10 | Đã có |
| BR-HOAN-04 | Hoàn phí giao: đặc tả Hoàng Đạt ghi không hoàn; SOP ghi hoàn khi lỗi không thuộc khách | BR-DH-05-01; SOP-SUP-02 | Chờ chốt (OI-08) |
| BR-HOAN-05 | Đơn online hoàn về nguồn thanh toán ban đầu; đơn COD chuyển khoản vào tài khoản khách đã khai báo; chưa khai báo thì hệ thống nhắc khách bổ sung | BR-DH-05-02; UR-SUP-003 | Đã có |
| BR-HOAN-06 | HTX chỉ xác nhận và đề xuất; Admin – CSKH quyết định hoàn; Admin – Tài chính xác định bên chịu sau khi có kết luận trách nhiệm | BR-AD-33; FR-DH-10, 11 | Đã có |
| BR-HOAN-07 | Hoàn tiền đi qua Chờ hoàn tiền → Đang hoàn tiền → Đã hoàn tiền; chỉ Đã hoàn khi cổng hoặc ngân hàng xác nhận; lỗi kỹ thuật tách khỏi trường hợp không đủ điều kiện | BR-DH-05-04; BR-AD-35 | Đã có |
| BR-HOAN-08 | Mỗi yêu cầu hoàn chỉ thành công một lần; thao tác hoàn lặp lại không tạo thêm dòng tiền | BR-DH-46; BR-AD-36 | Đã có |
| BR-HOAN-09 | Duyệt trả hàng, nhận lại hàng và hoàn tiền là ba kết quả riêng; thực phẩm không an toàn có thể hoàn mà không bắt gửi lại hàng | BR-DH-05-05 | Đã có |
| BR-HOAN-10 | Phí cổng khi hoàn và phí chuyển khoản hoàn đơn COD do bên nào chịu; mặc định ghi riêng, không trừ vào tiền hoàn cho khách | BR-AD-38 | Chờ chốt |
| BR-HOAN-11 | Đổi hàng: chưa có chính sách; BRD chỉ nêu đổi hàng là một phương án xử lý khiếu nại | BRD Chính sách đơn hàng; FR-DH-05 | Chờ chốt (OI-13) |

### 7.10. Khiếu nại, tranh chấp (TCH)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-TCH-01 | Ticket gắn với một đơn, có ảnh bằng chứng; phản hồi tiếp nhận lần đầu không quá 2 giờ; kết luận phân định lỗi không quá 24 giờ làm việc | UR-SUP-001, 002; NFR-OPS-001 (theo SOP) | Chờ chốt định nghĩa giờ làm việc |
| BR-TCH-02 | HTX chỉ xem, phản hồi ticket của HTX mình; không đóng ticket, không tự từ chối hoàn tiền, không sửa nội dung khiếu nại | BRD CSKH, quy tắc 3, 4 | Đã có |
| BR-TCH-03 | Chỉ Admin – CSKH đổi ticket sang Đã xử lý, Từ chối, Đóng; ticket hoàn tiền chỉ sang Đã hoàn tiền khi giao dịch hoàn thành công | BRD CSKH, quy tắc 5, 6 | Đã có |
| BR-TCH-04 | Ticket về hàng quá hạn, dị vật, QR bất thường, nguồn gốc không rõ, ảnh hưởng sức khoẻ tự gắn ưu tiên Khẩn cấp hoặc Cao | BRD CSKH, quy tắc 7 | Đã có |
| BR-TCH-05 | Mọi thay đổi trạng thái, nội dung xử lý, tệp đính kèm và người thực hiện được lưu vào lịch sử ticket | BRD CSKH, quy tắc 9 | Đã có |

### 7.11. Đánh giá (DG)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-DG-01 | Chỉ khách có đơn Đã giao được đánh giá, chỉ sản phẩm trong đơn của mình; mỗi sản phẩm trong một đơn một đánh giá | BR01–03 (Huyền) | Đã có |
| BR-DG-02 | Sao 1–5 bắt buộc; 1–2 sao phải có nhận xét từ 20 ký tự; nhận xét tối đa 500 ký tự; tối đa 5 ảnh JPG, PNG, mỗi ảnh tối đa 5 MB | BR04–07 (Huyền) | Đã có |
| BR-DG-03 | Điểm trung bình sản phẩm chỉ tính đánh giá đang Hiển thị | BR09 (Huyền) | Đã có |
| BR-DG-04 | Admin ẩn đánh giá vi phạm phải ghi lý do; không được ẩn vì sao thấp hoặc nội dung tiêu cực | BR10 (Huyền) | Đã có |
| BR-DG-05 | HTX chỉ xem, phản hồi đánh giá sản phẩm của mình; không sửa, không xoá | BR11 (Huyền) | Đã có |
| BR-DG-06 | Đánh giá nhắc tới hàng hỏng, quá hạn, dị vật, QR bất thường, an toàn thực phẩm được gắn cờ cho CSKH kiểm tra | BR12 (Huyền) | Đã có |
| BR-DG-07 | Đánh giá đăng ngay hay chờ kiểm duyệt (PO cấu hình); khách có được sửa đánh giá không; hạn đánh giá sau khi Đã giao | BRD CSKH, luồng đánh giá bước 15 | Chờ chốt |

### 7.12. Đối soát tiền (TC)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-TC-01 | Phí giao không phải doanh thu của HTX hay sàn; phần HTX phải chịu do lỗi của mình được trừ riêng | BR-DT-04; Danh sách FR và UC – Module AD và TK mục 4 | Đã có |
| BR-TC-02 | Hoa hồng tính trên tiền hàng thực giữ lại, không tính trên phí giao, lấy tỷ lệ tại lúc tạo đơn | Danh sách FR và UC – Module AD và TK mục 4.1 | Chờ chốt tỷ lệ (OI-16) |
| BR-TC-03 | Đơn vào kỳ đối soát khi Đã giao trước giờ cắt kỳ và không còn yêu cầu trả hàng hoặc ticket đang mở; chưa đủ điều kiện thì chuyển sang kỳ sau | BR-DT-18 | Chờ chốt |
| BR-TC-04 | Kỳ đã chốt bị khoá; sổ tiền không sửa, không xoá; sai sót điều chỉnh bằng dòng mới ở kỳ sau | BR-DT-22; BR-AD-37 | Đã có |
| BR-TC-05 | Shipper thu tiền COD và nộp lại cho sàn bằng phiếu nộp tiền; Admin – Tài chính xác nhận đã nhận. HTX không giữ tiền COD; tiền hàng về HTX qua chi trả theo kỳ | Quyết định 29/10 (có Shipper); app hiện tại; BR-DT-08 | Giả định theo app, chờ duyệt (OI-15) |

### 7.13. Quyền, lịch sử và dữ liệu cá nhân (QL)

| Mã | Quy tắc | Nguồn | Tình trạng |
| --- | --- | --- | --- |
| BR-QL-01 | Mọi thao tác được kiểm quyền ở máy chủ; ẩn nút trên giao diện không thay cho kiểm quyền | FR-TK-11; NFR-COMP-001 | Đã có |
| BR-QL-02 | HTX chỉ thấy dữ liệu của HTX mình: sản phẩm, đơn, ticket, đánh giá, đối soát | BR-SP-01; BR11 (Huyền); UR-SUP-002 | Đã có |
| BR-QL-03 | Cơ quan QLNN chỉ xem số liệu tổng hợp; không thấy tên, số điện thoại, địa chỉ, tài khoản ngân hàng của khách; không xem nhật ký thao tác; không sửa | NFR-PRIV-001 | Đã có |
| BR-QL-04 | Tài khoản ngân hàng nhận hoàn tiền của khách chỉ Admin – Tài chính được xem | NFR-SUP-03 | Đã có |
| BR-QL-05 | Nhật ký thao tác ghi người, thời điểm, giá trị trước – sau, lý do; không ai sửa hoặc xoá được | FR-HT-03; BR-DT-27 | Đã có |
| BR-QL-06 | Đánh giá công khai có nhãn "Đã mua hàng" nhưng không hiện số điện thoại, địa chỉ, mã đơn đầy đủ, thông tin thanh toán | BR08 (Huyền) | Đã có |
| BR-QL-07 | Khách đồng ý xử lý dữ liệu cá nhân khi đăng ký; khách xem, sửa, yêu cầu xoá dữ liệu (FR-TK-05); dữ liệu đơn và tiền giữ theo thời hạn lưu trữ bắt buộc rồi ẩn danh. Căn cứ pháp lý về bảo vệ dữ liệu cá nhân và thời hạn lưu cần pháp chế xác nhận | SRS; NFR-DH-04-02 ghi thời hạn lưu chưa quy định | Đề xuất |
| BR-QL-08 | Thông tin người nhận quà chỉ dùng để giao hàng; HTX và bên giao chỉ thấy tên, số điện thoại, địa chỉ giao của đơn được giao cho mình | SRS; NFR-ORD-03 (shipper chỉ thấy đơn được phân công) | Đề xuất |

## 8. Yêu cầu dữ liệu

Phần dữ liệu chờ buổi họp với sếp (quyết định 29/10). Mục này có danh sách đối tượng dữ liệu đã rõ từ FR và quy tắc, và các câu cần hỏi trong buổi họp. Sơ đồ quan hệ dữ liệu (ERD) và thuộc tính chi tiết viết sau buổi họp.

### 8.1. Đối tượng dữ liệu chính

Danh sách là đề xuất, lấy từ mục 4, 7, 11 và dữ liệu trong app của dev.

| Đối tượng | Gồm | Ai tạo, sửa | Liên quan |
| --- | --- | --- | --- |
| Tài khoản | SĐT, vai trò, nhóm quyền Admin, trạng thái, lý do khoá | Khách, HTX tự đăng ký; Quản trị gốc, Admin – Vận hành cấp cho Admin, QLNN, Shipper | FR-TK |
| Khách hàng, sổ địa chỉ | Tên, tối đa 10 địa chỉ Hà Nội có toà – căn, tài khoản nhận hoàn tiền | Khách | BR-DAT-04; BR-QL-04 |
| HTX | Hồ sơ, mã số thuế, người đại diện, số điện thoại, địa chỉ, giấy tờ, trạng thái duyệt, quyền bán, tài khoản nhận tiền | HTX khai; Admin – Chất lượng duyệt | FR-TK-06 đến 09, 13 |
| Sản phẩm, quy cách | Tên, ảnh, mô tả, danh mục, vùng, giá bán, quy cách, trạng thái, lịch sử giá | Admin – Chất lượng | PQ-01; GD-06 |
| Chứng nhận | Loại, số, cơ quan cấp, ngày hết hạn, ảnh, link QR | Admin – Chất lượng | FR-SP-08; OI-17 |
| Tồn kho | Số tồn, số đang giữ, lịch sử cập nhật | HTX | BR-TON |
| Đợt đặt trước, báo thu hoạch | Khoảng ngày giao, số suất, tỷ lệ cọc; ngày thu hoạch, sản lượng, ảnh | Admin cấu hình đợt; HTX báo thu hoạch | OI-11; OI-22 |
| Lần đặt, đơn hàng, dòng đơn | Bản chốt giá, địa chỉ, tham số; trạng thái đơn; tình trạng thanh toán; lịch sử chuyển trạng thái | Khách tạo; HTX, Shipper, Admin cập nhật theo quyền | BR-VD; BR-DAT |
| Giao dịch thanh toán, hoàn tiền | Mã tham chiếu cổng, số tiền, trạng thái, người quyết định, bên chịu | Hệ thống; Admin – CSKH, Tài chính | BR-TT; BR-HOAN |
| Phân công giao, phiếu nộp COD | Shipper, lúc lấy, lúc giao, ảnh giao, lý do thất bại; tiền COD đang giữ, phiếu nộp, người xác nhận | Admin – Vận hành, Shipper, Admin – Tài chính | PQ-04; FR-DT-06 |
| Ticket, đánh giá, tin nhắn | Nội dung, ảnh, trạng thái, lịch sử xử lý | Khách, HTX, Admin – CSKH | BR-TCH; BR-DG |
| Mã ưu đãi, tham số, danh mục dùng chung | Giá trị, hiệu lực, lịch sử đổi | Admin – Vận hành | FR-HT |
| Sổ đối soát 4 khoản, kỳ chi trả | Dòng sổ theo đơn và HTX; kỳ, bảng kê, khoản giữ lại, kết quả chi trả | Hệ thống; Admin – Tài chính | BR-TC |
| Nhật ký thao tác, thông báo | Người, thời điểm, giá trị trước – sau, lý do; nội dung thông báo | Hệ thống | BR-QL-05 |

### 8.2. Câu hỏi cho buổi họp với sếp

| # | Câu hỏi | Vì sao cần | Liên quan |
| --- | --- | --- | --- |
| 1 | Đợt đầu lên sàn có bao nhiêu HTX, sản phẩm nào; ai gửi ảnh, mô tả, giấy chứng nhận để Admin nhập | Admin nhập toàn bộ sản phẩm: cần biết khối lượng việc và nguồn dữ liệu | PQ-01; FR-SP-02 |
| 2 | Giá bán do ai quyết; HTX nhận tiền theo công thức nào: giá bán trừ hoa hồng, hay giá thoả thuận cố định | Quyết định lưu một giá hay hai giá (giá bán, giá trả HTX) và công thức đối soát | OI-16; BR-TC-02 |
| 3 | Hàng đi từ Lào Cai về Hà Nội thế nào: gửi xe về đâu, ai nhận, ai trả cước, hàng hỏng trên đường ai chịu | Dữ liệu điểm nhận, phí chặng, trách nhiệm khi khiếu nại | OI-20 |
| 4 | Shipper là nhân viên công ty hay thuê ngoài; bao nhiêu người; trả công theo đơn hay theo tháng | Dữ liệu công shipper, đối soát với shipper | PQ-04 |
| 5 | Shipper nộp tiền COD bao lâu một lần, tiền mặt hay chuyển khoản; được giữ tối đa bao nhiêu | Quy tắc phiếu nộp COD, cảnh báo giữ tiền quá hạn | FR-DT-06; OI-15 |
| 6 | Chi trả HTX theo tuần hay tháng; giữ lại bao nhiêu; trả vào tài khoản nào | Dữ liệu kỳ chi trả, tài khoản HTX | FR-DT-04; OI-16 |
| 7 | Có xuất hoá đơn cho khách không; sàn hay HTX xuất | Giữ hay bỏ chức năng hoá đơn công ty đang có trong app | Mục 9.2 |
| 8 | Lịch mùa vụ từng sản phẩm; bán đặt trước theo đợt hay khoảng ngày; HTX báo sản lượng dự kiến thế nào | Dữ liệu đợt đặt trước, số suất | OI-11; OI-22 |
| 9 | Hàng nào có sẵn ở Hà Nội để giao hoả tốc | Cờ hoả tốc, tồn kho tại Hà Nội | OI-02 |
| 10 | Thời hạn lưu dữ liệu đơn, dữ liệu cá nhân; ai phụ trách pháp chế | Quy tắc xoá, ẩn danh, sao lưu | OI-19 |
| 11 | Sếp và cơ quan quản lý cần xem chỉ số nào, bao lâu một lần | Dữ liệu báo cáo, dashboard | OI-14; FR-BCTK |
| 12 | Dữ liệu ban đầu có sẵn ở đâu (danh sách sản phẩm, danh sách HTX); ai chịu trách nhiệm đúng sai | Kế hoạch nhập dữ liệu trước khi chạy thử | FR-SP-02; FR-TK-06 |

## 9. Danh sách màn hình

Dev đang code màn hình (quyết định 29/10), nên SRS không vẽ lại. Mục này liệt kê màn hình trong bản app của dev (bản trên GitHub ngày 19/10) để đối chiếu với FR và quyền ở mục 11. Hành vi chi tiết từng màn theo use case gốc (mục 5) và quy tắc (mục 7).

### 9.1. Màn hình theo vai trò

| Vai trò | Màn hình, mục trong app | FR chính | Cần sửa theo 29/10 |
| --- | --- | --- | --- |
| Chung | Đăng nhập bằng SĐT + OTP, đăng nhập Google | FR-TK-01, 02 | Đăng nhập Google chưa có trong SRS (OI-03) |
| Khách | Khám phá: trang chủ, tìm, lọc, chi tiết sản phẩm, trang HTX | FR-TKSP-01 đến 09 |  |
| Khách | Vụ mùa: sản phẩm đặt trước, Báo khi vào mùa | FR-MHTT-03 | "Báo khi vào mùa" chưa có FR (9.2) |
| Khách | Giỏ hàng, Đặt hàng, Thanh toán, Ví mã ưu đãi | FR-MHTT-01 đến 07 |  |
| Khách | Tài khoản: đơn hàng, chi tiết đơn, nhắn HTX, khiếu nại, đánh giá, sổ địa chỉ, tài khoản nhận hoàn, yêu thích, hoá đơn công ty | FR-DH-01 đến 06, 13, 15; FR-CSKH-01, 03, 04; FR-TK-03, 04 | "Hoá đơn công ty" chưa có FR (9.2) |
| HTX | Đăng ký HTX, theo dõi hồ sơ | FR-TK-06, 07 |  |
| HTX | Đơn hàng (xác nhận, đóng gói, báo thu hoạch), Tin nhắn | FR-DH-07 đến 10, 16, 17; FR-CSKH-03 | Giữ nguyên |
| HTX | Sản phẩm: tạo, sửa, quy cách, đổi giá, chứng nhận, đặt trước, hoả tốc, ẩn | FR-SP-02 đến 09 | Sửa: HTX chỉ còn xem sản phẩm và cập nhật tồn kho; phần còn lại chuyển sang Admin – Chất lượng |
| HTX | Bán chạy, Khiếu nại, Đánh giá, Đối soát, Hồ sơ | FR-DT-01 đến 03; FR-CSKH-05, 07, 08; FR-TK-06 |  |
| Admin – Vận hành | Tổng quan, Đơn hàng, Giao hàng (phân công shipper), Cấp và khoá tài khoản, Tham số, Danh mục dùng chung, Mã ưu đãi, Danh sách HTX | FR-DH-07, 18; FR-TK-10, 12; FR-HT-01, 02, 04 | Bỏ quyền tạo tài khoản Admin (chuyển cho Quản trị gốc) |
| Admin – Chất lượng | Duyệt HTX mới, Duyệt sản phẩm và giá, Hồ sơ HTX và quyền bán | FR-TK-08, 09, 13; FR-SP-04 | Sửa: "Duyệt sản phẩm và giá" thành màn quản lý sản phẩm: tạo, sửa, giá, chứng nhận, đặt trước, ngừng bán |
| Admin – CSKH | Ticket khiếu nại, Kiểm duyệt đánh giá | FR-CSKH-06 đến 09; FR-DH-11 |  |
| Admin – Tài chính | Hoàn tiền, Đối soát HTX, Sổ giao dịch, Thu hộ COD, Hoá đơn công ty | FR-DH-12; FR-DT-02 đến 06 |  |
| Quản trị gốc | Phân quyền, Nhật ký, Tham số (chỉ xem) | FR-TK-11; FR-HT-03 | Thêm tạo tài khoản Admin |
| Shipper | Tóm tắt việc giao; đơn theo bước (cần lấy, đang giao, đã giao); chi tiết đơn; tiền thu hộ; phiếu nộp tiền | FR-DH-14, 19; FR-DT-06 |  |
| Cơ quan QLNN | Số liệu tổng hợp, bảng đơn ẩn danh | FR-BCTK-01, 02 | Bảng đơn ẩn danh hiện từng đơn: cần xác nhận có đúng "chỉ tổng hợp" (BR-QL-03) không |

### 9.2. Có trong app nhưng chưa có FR

Lead chọn giữ hay bỏ; giữ thì thêm vào mục 4.

| Chức năng | Ở đâu | Đề xuất |
| --- | --- | --- |
| Đăng nhập bằng Google | Màn đăng nhập | Quyết cùng OI-03; giữ thì ghi vào FR-TK-02 |
| Báo khi vào mùa | Khách, mục Vụ mùa | Giữ, thêm FR mức Could, gửi qua FR-CSKH-10 |
| Hoá đơn công ty | Màn Đặt hàng; Admin – Tài chính | Hỏi sếp ai xuất hoá đơn (8.2 câu 7) rồi quyết |
| Truy xuất theo lô | Chi tiết sản phẩm | Gắn vào FR-TKSP-04; phụ thuộc OI-17 |
| Quy cách (ví dụ 300 g, 500 g) gộp một thẻ | Sản phẩm | Khớp GD-06 (mỗi quy cách là một sản phẩm); ghi thêm vào FR-TKSP-04 |
| Công cụ trình diễn: đổi giờ, mã NEW-01, OTP 123456, cổng thanh toán giả | Toàn app | Bỏ khi lên bản thật |

## 10. Dịch vụ bên ngoài và API

Theo quyết định 29/10, dịch vụ bên ngoài sẽ mua sau. Mục này ghi yêu cầu tối thiểu để chọn nhà cung cấp; đặc tả từng API viết sau khi chọn được nhà cung cấp. Yêu cầu dưới đây là đề xuất của BA, lấy từ quy tắc và NFR đã có; chưa so sánh nhà cung cấp cụ thể.

### 10.1. Dịch vụ cần mua

| Dịch vụ | Dùng cho | Yêu cầu tối thiểu | Căn cứ | Trong app hiện tại |
| --- | --- | --- | --- | --- |
| Cổng thanh toán | Trả online, cọc đặt trước, phần còn lại, hoàn tiền | Báo kết quả về máy chủ có cách xác thực tin báo; gửi lặp không tạo giao dịch trùng; hoàn một phần; tra cứu trạng thái giao dịch; tệp hoặc API đối soát theo ngày; môi trường chạy thử | BR-TT-02 đến 06; BR-HOAN-07, 08; NFR-REL-001; NFR-INTEROP-001 | Mô phỏng |
| SMS hoặc Zalo ZNS | OTP đăng ký, đăng nhập, đổi SĐT; tin báo | Gửi kịp trong hạn OTP 120 giây; báo trạng thái gửi; tên người gửi là tên công ty | NFR-SEC-001; GD-05 | Mô phỏng, OTP cố định |
| Thông báo đẩy | Trạng thái đơn, ticket, kết quả duyệt, đơn phân công cho shipper; ngắt phiên khi khoá | Gửi theo từng thiết bị; tin ẩn để đăng xuất từ xa | FR-CSKH-10; FR-TK-12; NFR-SEC-004 | Thông báo trong app |
| Bản đồ, định vị | Lấy địa chỉ từ vị trí, mở bản đồ cho shipper, tính khoảng cách cho phí giao | Đổi toạ độ thành địa chỉ tiếng Việt; tính quãng đường | FR-TK-04; BR-TIEN-03; FR-DH-19 | Đang dùng Google Maps; cần khoá API của công ty |
| Máy chủ, cơ sở dữ liệu, lưu ảnh | Toàn bộ dữ liệu; ảnh sản phẩm, ảnh giao hàng, giấy tờ HTX | Sao lưu và khôi phục được; nơi đặt dữ liệu theo ý kiến pháp chế | NFR-REC-001; BR-QL-07; OI-19 | Bản demo dùng một kho dữ liệu chung |
| Hoá đơn điện tử (nếu giữ) | Xuất hoá đơn cho khách công ty | Chờ kết luận ai xuất hoá đơn | Mục 9.2 | Mô phỏng |
| Đăng nhập Google (nếu giữ) | Đăng nhập nhanh | Chờ OI-03 | OI-03 | Đã có |

### 10.2. API nội bộ của app

- Bản demo hiện đọc, ghi toàn bộ dữ liệu qua một đường chung và chưa kiểm quyền ở máy chủ (theo báo cáo sửa lỗi của dev). Bản thật cần tách theo từng thao tác và kiểm quyền theo mục 11 ở máy chủ (PQ-06).
- Mọi số tiền tính ở máy chủ (BR-TIEN-04); mọi thao tác đổi trạng thái ghi nhật ký (BR-QL-05).
- Một đường nhận trạng thái giao dùng chung cho shipper và cho đơn vị vận chuyển sau này, để đổi cách giao không phải sửa luồng đơn.
- Đặc tả chi tiết (đường dẫn, dữ liệu vào ra, mã lỗi) do dev viết khi chọn xong nhà cung cấp; BA duyệt theo FR, quy tắc và mục 11.

## 11. Ma trận phân quyền theo vai trò và phạm vi dữ liệu

Mục này viết theo quyết định của Lead ngày 29/10/2026: Admin giữ quyền quản lý toàn bộ; HTX chỉ cung cấp hàng, xác nhận đơn, đóng gói bàn giao và nhận tiền; có thêm vai trò Shipper. Ma trận này thay cho bản 02/10 (bản đó dùng mã cũ FR-MH, FR-HTX, FR-AD). Mã FR theo mục 4.

### 11.1. Nguyên tắc phân quyền

| Mã | Nguyên tắc | Căn cứ | Tình trạng |
| --- | --- | --- | --- |
| PQ-01 | Admin đăng và quản lý toàn bộ nội dung sản phẩm: tên, ảnh, mô tả, giá bán, chứng nhận, cấu hình đặt trước, hoả tốc. HTX không tạo, không sửa sản phẩm | Quyết định 29/10 | Đã chốt |
| PQ-02 | HTX được: cập nhật tồn kho; báo thu hoạch, sẵn sàng giao; xác nhận hoặc từ chối đơn; đóng gói, bàn giao hàng; nhắn tin, gọi khách theo đơn; phản hồi đánh giá, ticket; xem đối soát và nhận tiền. Tất cả chỉ trên dữ liệu của HTX mình | Quyết định 29/10; BR-QL-02 | Đã chốt |
| PQ-03 | Admin chia 5 nhóm quyền: Vận hành, Chất lượng, CSKH, Tài chính, Quản trị gốc. Nhóm nào làm việc của nhóm đó; nhóm khác chỉ xem khi công việc cần. Quản trị gốc tạo tài khoản Admin, gán nhóm, không thao tác nghiệp vụ | Quyết định 29/10; Cách cấp tài khoản cho HTX, Admin, cơ quan quản lý; FR-TK-11 | Đã chốt |
| PQ-04 | Shipper là người giao hàng của sàn, do Admin – Vận hành cấp tài khoản và phân công từng đơn. Shipper chỉ thấy đơn được phân công, cập nhật trạng thái giao, thu tiền COD rồi nộp lại cho sàn; Admin – Tài chính xác nhận đã nhận tiền | Quyết định 29/10 (có Shipper); cách phân công và thu COD lấy theo app hiện tại | Đã chốt có Shipper; cách làm là giả định, chờ duyệt |
| PQ-05 | Cơ quan QLNN chỉ xem số liệu tổng hợp; không sửa; không thấy dữ liệu cá nhân của khách, nhật ký thao tác | BR-QL-03; NFR-PRIV-001 | Đã có |
| PQ-06 | Mọi quyền được kiểm ở máy chủ; ẩn nút trên giao diện không thay cho kiểm quyền | BR-QL-01; NFR-SEC-005 | Đã có |
| PQ-07 | HTX, Shipper, Admin, Cơ quan QLNN không đặt hàng bằng tài khoản của mình | BR-DAT-01 | Đã có |

### 11.2. Ma trận theo chức năng

Ký hiệu trong ô: **Có** = được dùng; **Của mình** = chỉ dữ liệu của mình (Khách: của mình; HTX: của HTX mình; Shipper: đơn được phân công cho mình); **Xem** = chỉ xem; **Tổng hợp** = chỉ số liệu tổng hợp, không có dữ liệu cá nhân; **—** = không có quyền. Cột Admin ghi tên nhóm được thao tác; nhóm không có tên thì không thao tác. Cột Ghi chú bắt đầu bằng "Đổi" là chỗ khác mục 4 hoặc ma trận 02/10.

**Tài khoản (TK)**

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-TK-01 | Đăng ký bằng SĐT + OTP, chọn Khách hoặc HTX | Có | — | — | — | — | — | HTX đăng ký xong phải nộp hồ sơ, chờ duyệt |
| FR-TK-02 | Đăng nhập, đăng xuất | Có | Có | Có | Có | Mọi nhóm | Có | Mỗi vai trò vào giao diện riêng |
| FR-TK-03 | Thông tin cá nhân | — | Của mình | Của mình | Của mình | Của mình | Của mình | Đổi: thêm Shipper |
| FR-TK-04 | Sổ địa chỉ | — | Của mình | — | — | Xem: CSKH | — | HTX, Shipper chỉ thấy địa chỉ giao trên đơn (FR-DH-13) |
| FR-TK-05 | Xoá tài khoản | — | Của mình | Của mình | — | Vận hành xử lý | — | Giữ dữ liệu đơn theo thời hạn lưu (OI-19) |
| FR-TK-06 | Hồ sơ HTX, giấy tờ pháp lý | — | — | Của mình | — | Xem: Chất lượng | — |  |
| FR-TK-07 | Gửi duyệt, theo dõi hồ sơ | — | — | Của mình | — | — | — |  |
| FR-TK-08 | Tiếp nhận hồ sơ HTX chờ duyệt | — | — | — | — | Chất lượng | — | QLNN không xem hồ sơ chờ duyệt |
| FR-TK-09 | Duyệt, từ chối, yêu cầu bổ sung hồ sơ HTX | — | — | — | — | Chất lượng | — | Bắt buộc lý do |
| FR-TK-10 | Cấp tài khoản Admin, QLNN, Shipper | — | — | — | — | Gốc: tài khoản Admin. Vận hành: QLNN, Shipper | — | Đổi: thêm Shipper. Không vai trò nào tự đăng ký |
| FR-TK-11 | Gán vai trò, nhóm quyền | — | — | — | — | Gốc | — |  |
| FR-TK-12 | Khoá, mở khoá tài khoản | — | — | — | — | Vận hành. Gốc: tài khoản Admin | — | Bắt buộc lý do, ngắt phiên ngay. Gốc khoá tài khoản Admin là đề xuất |
| FR-TK-13 | Kích hoạt, tạm khoá quyền bán của HTX | — | — | Xem | — | Chất lượng | — |  |
| FR-TK-14 | Đặt lại mật khẩu qua OTP | — | Của mình | Của mình | Của mình | — | — | Chỉ cần nếu dùng mật khẩu (OI-03) |

**Tìm kiếm và xem sản phẩm (TKSP)**

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-TKSP-01 | Danh mục, danh sách sản phẩm đang bán | Có | Có | Có | — | Mọi nhóm | — | QLNN xem số sản phẩm ở FR-BCTK-01 |
| FR-TKSP-02 | Tìm kiếm sản phẩm | Có | Có | — | — | — | — | Admin tìm trong danh sách quản trị |
| FR-TKSP-03 | Lọc, sắp xếp | Có | Có | — | — | — | — |  |
| FR-TKSP-04 | Chi tiết sản phẩm, QR nguồn gốc | Có | Có | Có | — | Mọi nhóm | Có | Đổi: Shipper không dùng màn mua sắm |
| FR-TKSP-05 | Tạo link chia sẻ | Có | Có | Có | — | — | — |  |
| FR-TKSP-06 | Trang chủ theo mùa, banner | Có | Có | — | — | — | — | Nội dung do Vận hành soạn (FR-HT-05) |
| FR-TKSP-07 | Gợi ý từ khoá | Có | Có | — | — | — | — |  |
| FR-TKSP-08 | Sản phẩm yêu thích | — | Của mình | — | — | — | — |  |
| FR-TKSP-09 | Xem trang HTX, theo dõi HTX | Có | Có | Xem | — | Mọi nhóm | — | Nội dung lấy từ hồ sơ HTX đã duyệt |
| FR-TKSP-10 | Lịch sử sản phẩm đã xem | — | Của mình | — | — | — | — |  |

**Mua hàng và thanh toán (MHTT)**

Chỉ Khách hàng dùng nhóm chức năng này (PQ-07). Admin xem đơn đã tạo ở FR-DH-07, FR-DH-13.

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-MHTT-01 | Giỏ hàng | — | Của mình | — | — | — | — | Vãng lai bấm thêm vào giỏ thì được mời đăng nhập |
| FR-MHTT-02 | Đặt hàng sẵn có | — | Có | — | — | — | — |  |
| FR-MHTT-03 | Đặt trước, trả cọc | — | Có | — | — | — | — |  |
| FR-MHTT-04 | Hộp quà, lời nhắn | — | Có | — | — | — | — | Loại hộp quà do Vận hành quản lý (FR-HT-06) |
| FR-MHTT-05 | Thanh toán COD hoặc online | — | Có | — | — | — | — |  |
| FR-MHTT-06 | Nhập mã ưu đãi | — | Có | — | — | — | — |  |
| FR-MHTT-07 | Trả phần còn lại của đơn đặt trước | — | Của mình | — | — | — | — |  |

**Đơn hàng (DH)**

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-DH-01 | Danh sách đơn của khách | — | Của mình | — | — | — | — |  |
| FR-DH-02 | Đổi người nhận, địa chỉ trước bàn giao | — | Của mình | — | — | — | — |  |
| FR-DH-03 | Huỷ đơn, gửi yêu cầu huỷ | — | Của mình | — | — | — | — | Admin huỷ thay: chờ chốt (OI-23) |
| FR-DH-04 | Gửi yêu cầu trả hàng, hoàn tiền | — | Của mình | — | — | — | — |  |
| FR-DH-05 | Gửi yêu cầu đổi hàng | — | Của mình | — | — | — | — | OI-13 |
| FR-DH-06 | Mua lại đơn cũ | — | Của mình | — | — | — | — |  |
| FR-DH-07 | Danh sách đơn phía HTX, Admin | — | — | Của mình | — | Xem: mọi nhóm | — |  |
| FR-DH-08 | Xác nhận, từ chối đơn | — | — | Của mình | — | Xem | — | HTX xác nhận (chốt 29/10); quá PAR-11 thì tự huỷ |
| FR-DH-09 | Đóng gói, bàn giao hàng | — | — | Của mình | Của mình: xác nhận đã lấy hàng | Vận hành: phân công shipper | — | Đổi: bàn giao cho shipper. Nơi bàn giao chờ chốt (OI-20) |
| FR-DH-10 | Xác nhận, đề xuất với yêu cầu trả hàng; nhận lại hàng hoàn | — | — | Của mình | — | Xem: CSKH | — | HTX chỉ đề xuất (BR-HOAN-06) |
| FR-DH-11 | Duyệt trả hàng, quyết định hoàn tiền | — | — | — | — | CSKH | — |  |
| FR-DH-12 | Ghi nhận kết quả hoàn tiền | — | Xem: của mình | Xem: của mình | — | Tài chính | Tổng hợp |  |
| FR-DH-13 | Chi tiết đơn, lịch sử, theo dõi giao | — | Của mình | Của mình | Của mình | Xem: mọi nhóm | — | HTX, Shipper thấy tên, SĐT, địa chỉ người nhận của đơn mình (BR-QL-08) |
| FR-DH-14 | Cập nhật Đang giao, Đã giao, giao thất bại, chuyển hoàn | — | — | — | Của mình | Vận hành: sửa thay khi shipper không cập nhật được | — | Đổi: mục 4 ghi "Chờ chốt (OI-01)". Đã giao phải kèm ảnh. Vận hành sửa thay là đề xuất, bắt buộc lý do |
| FR-DH-15 | Khách xác nhận đã nhận hàng | — | Của mình | — | — | — | — | Quá PAR-26 thì hệ thống tự chuyển Đã giao |
| FR-DH-16 | Xử lý yêu cầu huỷ khi đơn đang chuẩn bị | — | — | Của mình | — | Xem | — |  |
| FR-DH-17 | Báo thu hoạch, sẵn sàng giao; báo không cung cấp được hàng đặt trước | — | — | Của mình | — | Xem: Vận hành, Chất lượng | — | Báo thu hoạch gồm ngày, sản lượng, ảnh như app hiện tại |

**Chăm sóc khách hàng và đánh giá (CSKH)**

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-CSKH-01 | Gửi khiếu nại, yêu cầu hỗ trợ | — | Của mình | — | — | — | — |  |
| FR-CSKH-02 | Câu hỏi thường gặp | Có | Có | — | — | CSKH soạn nội dung | — | CSKH soạn là đề xuất |
| FR-CSKH-03 | Nhắn tin khách – HTX | — | Của mình | Của mình | — | — | — | Giữ như app hiện tại (chốt 29/10). CSKH có xem khi tranh chấp không: OI-24 |
| FR-CSKH-04 | Đánh giá sản phẩm | — | Của mình | — | — | — | — |  |
| FR-CSKH-05 | Phản hồi đánh giá | — | — | Của mình | — | — | — | Không sửa, không xoá đánh giá (BR-DG-05) |
| FR-CSKH-06 | Kiểm duyệt, ẩn đánh giá | — | — | — | — | CSKH | — | Bắt buộc lý do |
| FR-CSKH-07 | Danh sách ticket | — | Của mình | Của mình | — | CSKH. Xem: Chất lượng, Tài chính | Tổng hợp | Chất lượng xem ticket về an toàn thực phẩm, nguồn gốc |
| FR-CSKH-08 | Phản hồi ticket | — | Của mình | Của mình | — | CSKH | — |  |
| FR-CSKH-09 | Kết luận trách nhiệm, đóng ticket | — | — | — | — | CSKH | — | HTX không được đóng (BR-TCH-02) |
| FR-CSKH-10 | Trung tâm thông báo | — | Của mình | Của mình | Của mình | Của mình | Của mình | Đổi: thêm Shipper (thông báo đơn được phân công) |
| FR-CSKH-11 | Đánh giá HTX | — | Của mình | — | — | — | — |  |

**Quản lý sản phẩm (SP)**

Nhóm này đổi nhiều nhất theo PQ-01. Đề xuất giao cho Admin – Chất lượng vì nhóm này đang giữ việc kiểm chứng nhận, nguồn gốc và trong app hiện tại đang duyệt sản phẩm, giá (OI-21).

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-SP-01 | Danh mục sản phẩm | — | — | — | — | Vận hành | — | Đổi: trước là HTX. Đề xuất gộp vào FR-HT-04 |
| FR-SP-02 | Tạo sản phẩm, lưu nháp, đăng bán | — | — | Xem: của mình | — | Chất lượng | — | Đổi: trước HTX tạo rồi gửi duyệt |
| FR-SP-03 | Theo dõi trạng thái sản phẩm | — | — | Xem: của mình | — | Xem: mọi nhóm | — | Đổi: HTX chỉ xem sản phẩm của mình đang bán, ngừng bán |
| FR-SP-04 | Kiểm tra chứng nhận, nguồn gốc trước khi đăng | — | — | — | — | Chất lượng | — | Đổi: không còn duyệt bài HTX gửi. Có cần người thứ hai duyệt không: OI-21 |
| FR-SP-05 | Ẩn, ngừng bán sản phẩm | — | — | — | — | Chất lượng | — | Đổi: bỏ quyền HTX. HTX đặt tồn kho bằng 0 để dừng nhận đơn mua sẵn |
| FR-SP-06 | Sửa sản phẩm | — | — | — | — | Chất lượng | — | Đổi: trước là HTX |
| FR-SP-07 | Cập nhật tồn kho, giá; cảnh báo tồn thấp | — | — | Của mình: tồn kho | — | Chất lượng: giá bán | — | Đổi: giá chuyển sang Admin. Tồn kho có hiệu lực ngay (BR-TON-08) |
| FR-SP-08 | Chứng nhận, cảnh báo sắp hết hạn | — | — | Xem; gửi giấy tờ qua hồ sơ HTX | — | Chất lượng | — | Đổi: trước HTX quản lý. Cảnh báo hết hạn gửi cả HTX để gia hạn |
| FR-SP-09 | Cấu hình đặt trước, hoả tốc, thời gian chuẩn bị | — | — | Xem | — | Chất lượng | — | Đổi: trước là HTX. HTX báo số liệu mùa vụ thế nào: OI-22 |

**Doanh thu và đối soát (DT)**

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-DT-01 | Dashboard doanh thu | — | — | Của mình | — | Tài chính. Xem: nhóm khác | — |  |
| FR-DT-02 | Đối soát chi trả, hoa hồng, khoản trừ, tiền giữ lại | — | — | Xem: của mình | — | Tài chính | — |  |
| FR-DT-03 | Đối soát theo đơn, theo HTX, tách 4 khoản | — | — | Xem: của mình | — | Tài chính | — |  |
| FR-DT-04 | Chốt kỳ, duyệt bảng kê, xác nhận chi trả HTX | — | — | Xem: của mình | — | Tài chính | — | Trả lời OI-12: Admin – Tài chính được thao tác |
| FR-DT-05 | Đối soát với cổng thanh toán và tiền COD shipper nộp | — | — | — | — | Tài chính | — | Đổi: thay đối soát với đơn vị vận chuyển bằng đối soát tiền COD của shipper |

**Quản lý hệ thống (HT)**

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-HT-01 | Mã ưu đãi | — | — | — | — | Vận hành | — |  |
| FR-HT-02 | Cấu hình tham số | — | — | — | — | Vận hành. Xem: Gốc | — |  |
| FR-HT-03 | Tra cứu nhật ký thao tác | — | — | — | — | Gốc | — | Đổi: mục 4 ghi "Admin", app cho riêng Quản trị gốc (OI-25) |
| FR-HT-04 | Danh mục dùng chung | — | — | — | — | Vận hành | — |  |
| FR-HT-05 | Nội dung trang chủ | — | — | — | — | Vận hành | — |  |
| FR-HT-06 | Loại hộp quà | — | — | — | — | Vận hành | — |  |

**Báo cáo, thống kê (BCTK)**

| Mã | Chức năng | Vãng lai | Khách | HTX | Shipper | Admin | QLNN | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-BCTK-01 | Dashboard thống kê HTX, sản phẩm | — | — | Của mình | — | Mọi nhóm | Tổng hợp | Nguồn duy nhất cho QLNN |
| FR-BCTK-02 | Báo cáo doanh thu, giao dịch | — | — | Của mình | — | Tài chính, Vận hành | Tổng hợp |  |
| FR-BCTK-03 | Xuất báo cáo ra tệp | — | — | Của mình | — | Tài chính, Vận hành | Tổng hợp | Không chứa dữ liệu cá nhân của khách |

### 11.3. Chức năng mới do có Shipper

Ba chức năng dưới đây chưa có trong mục 4, cần cho luồng giao hàng bằng shipper. App hiện tại đã làm cả ba. Sau khi anh duyệt sẽ thêm vào mục 4 (lúc đó SRS có 85 FR).

| Mã đề xuất | Hệ thống phải | Tác nhân | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| FR-DH-18 | Cho Admin – Vận hành phân công shipper cho đơn Đang chuẩn bị, đổi shipper khi cần, kèm ghi chú lấy hàng | Admin – Vận hành | Must | Thay phần "bàn giao vận chuyển" của FR-DH-09 phía sàn |
| FR-DH-19 | Cho Shipper xem đơn được phân công, xác nhận đã lấy hàng, gọi người nhận, mở bản đồ | Shipper | Must | Shipper không thấy đơn khác (BR-QL-08) |
| FR-DT-06 | Cho Shipper lập phiếu nộp tiền COD đang giữ; Admin – Tài chính xác nhận đã nhận | Shipper; Admin – Tài chính | Must | Trả lời OI-15: tiền COD về sàn, không qua HTX |

### 11.4. Phạm vi dữ liệu nhạy cảm

| Dữ liệu | Khách | HTX | Shipper | Admin | QLNN |
| --- | --- | --- | --- | --- | --- |
| Tên, SĐT, địa chỉ người nhận | Của mình | Đơn của HTX mình | Đơn được phân công | Mọi nhóm, khi xử lý đơn | — |
| Tài khoản nhận hoàn tiền của khách | Của mình | — | — | Tài chính xem đủ số; nhóm khác không xem | — |
| SĐT, địa chỉ HTX | — | Của mình | Chờ chốt (OI-20) | Mọi nhóm | — |
| Tin nhắn khách – HTX | Của mình | Của mình | — | Chờ chốt (OI-24) | — |
| Giấy tờ pháp lý HTX | — | Của mình | — | Chất lượng | — |
| Doanh thu, đối soát của HTX | — | Của mình | — | Tài chính; nhóm khác xem tổng | Tổng hợp |
| Tiền COD đang giữ | — | — | Của mình | Tài chính | — |
| Nhật ký thao tác | — | — | — | Gốc (OI-25) | — |

### 11.5. Vấn đề mới phát sinh

Đã thêm vào bảng OI ở mục 15.1.

| Mã | Câu hỏi | Đề xuất mặc định |
| --- | --- | --- |
| OI-20 | Hàng đi từ Lào Cai đến tay shipper thế nào: HTX gửi xe về điểm nhận của sàn ở Hà Nội (SOP ghi kho Tây Mỗ) hay shipper lấy ở đâu; ai nhận hàng ở điểm nhận; ai trả cước chặng Lào Cai – Hà Nội | Hỏi ở buổi họp với sếp. Ảnh hưởng FR-DH-09, phí giao, BR-TC-01, dữ liệu điểm nhận (mục 8) |
| OI-21 | Admin tự đăng sản phẩm, giá: có cần người thứ hai duyệt trước khi lên bán không; nhóm nào nhập giá | Giai đoạn 1 không bắt buộc người thứ hai; Admin – Chất lượng nhập; mọi lần đổi giá ghi nhật ký giá trước – sau |
| OI-22 | Trước mùa vụ, HTX báo khoảng ngày giao, số suất đặt trước cho Admin bằng cách nào | Giai đoạn 1 HTX báo ngoài app (điện thoại, Zalo), Admin nhập; trong app HTX chỉ báo thu hoạch, sẵn sàng giao (FR-DH-17) |
| OI-23 | Admin có được thao tác thay HTX hoặc khách không: huỷ đơn, xác nhận thay khi HTX mất sóng, đổi địa chỉ theo yêu cầu qua hotline | Cho Admin – Vận hành làm thay, bắt buộc lý do, ghi nhật ký, báo cho bên bị làm thay |
| OI-24 | Admin – CSKH có xem tin nhắn khách – HTX khi giải quyết khiếu nại không | Chỉ xem tin nhắn của đơn đang có ticket; mỗi lượt xem ghi nhật ký |
| OI-25 | Ai xem nhật ký thao tác: mục 4 ghi "Admin", ma trận 02/10 ghi "Admin chỉ xem", app cho riêng Quản trị gốc | Quản trị gốc xem toàn bộ |
| OI-26 | Một người Admin có được giữ nhiều nhóm quyền không (app hiện tại: mỗi tài khoản một nhóm) | Cho giữ nhiều nhóm, trừ cặp CSKH và Tài chính: người quyết định hoàn tiền không tự ghi nhận đã hoàn |

### 11.6. Việc dev cần sửa trong app

| Việc | Ở đâu trong app | Lý do |
| --- | --- | --- |
| Chuyển màn tạo, sửa sản phẩm, đổi giá, chứng nhận, cấu hình đặt trước, hoả tốc từ HTX sang Admin – Chất lượng | Mục Sản phẩm của HTX; mục Duyệt sản phẩm và giá của Admin – Chất lượng | PQ-01 |
| HTX giữ: cập nhật tồn kho, báo thu hoạch, xem sản phẩm của mình | Mục Sản phẩm của HTX | PQ-02 |
| Bỏ luồng HTX gửi yêu cầu đổi giá, đổi nội dung, chờ duyệt | Mục Duyệt sản phẩm và giá | PQ-01; BR-GIA-02 cần sửa |
| Bỏ quyền ẩn sản phẩm của HTX | Mục Sản phẩm của HTX | FR-SP-05 |
| Chỉ Quản trị gốc tạo tài khoản Admin; Admin – Vận hành chỉ tạo tài khoản HTX, QLNN, Shipper | Mục Cấp và khoá tài khoản | FR-TK-10; Cách cấp tài khoản cho HTX, Admin, cơ quan quản lý |
| Giữ nguyên: HTX xác nhận đơn, nhắn tin, gọi khách; Shipper; nhóm quyền Admin | — | Chốt 29/10 |

## 15. Giả định và vấn đề chờ xác nhận

Giả định GD-01 đến 07 nằm ở mục 1. Mục này liệt kê các vấn đề (OI) cần Lead, PO hoặc lãnh đạo quyết định. OI là vấn đề đi qua nhiều module hoặc nhiều tài liệu; câu hỏi chỉ thuộc một module vẫn nằm ở danh sách CX của module đó (mục 15.2).

### 15.1. Danh sách vấn đề chờ xác nhận

Cột "Cần chốt trước" cho biết vấn đề chặn việc nào: Đợt 2 (dữ liệu, API, phân quyền), Prototype, hoặc Phát triển (có thể đặc tả tiếp bằng tham số, chốt trước khi lập trình).

| Mã | Vấn đề | Đang lệch giữa | Ảnh hưởng | Hướng xử lý đề xuất | Cần chốt trước |
| --- | --- | --- | --- | --- | --- |
| OI-01 | Ai giao hàng và ai cập nhật trạng thái giao | SOP: Hub Tây Mỗ và nhân viên giao hàng quét QR, thu COD. Hoàng Đạt: nối API đơn vị vận chuyển. Một số đặc tả: HTX, Admin cập nhật tay | Tác nhân Nhân viên giao hàng, FR-DH-14, phí giao, COD, FR-DT-05 | Đã có hướng 29/10: shipper của sàn giao chặng cuối và cập nhật trạng thái (mục 11, PQ-04). Chặng Lào Cai – Hà Nội tách sang OI-20 | Đã có hướng |
| OI-02 | Hoả tốc với hàng đi từ Lào Cai | Quy tắc hoả tốc viết theo bậc khoảng cách 0–15 km, phù hợp khi hàng đã có sẵn ở Hà Nội | BR-DAT-05, BR-TIEN-03, FR-SP-09 | Xác nhận hàng nào có sẵn tại Hà Nội (kho, hub); cờ hoả tốc chỉ bật cho hàng đó (CX-04) | Phát triển |
| OI-03 | Phương thức đăng nhập | Các tài liệu tài khoản: chỉ OTP, hoặc mật khẩu + OTP + sinh trắc học | FR-TK-02, FR-TK-14, chi phí SMS | Chọn một cách cho giai đoạn 1; nếu bỏ mật khẩu thì bỏ FR-TK-14 | Đợt 2 |
| OI-04 | Admin dùng app hay trang web | Quyết định 09/2026: một app cho mọi vai trò. SOP và NFR Module AD: Admin Portal trên web | Màn hình Admin, NFR, prototype | Lead xác nhận. Prototype tạm làm trang Admin riêng trên web và ghi rõ đây là giả định | Prototype |
| OI-05 | Ba bộ tên trạng thái đơn | BRD Chính sách đơn hàng; Module DH – Thúy; Đặc tả Mua hàng và Thanh toán (11 trạng thái) | Mọi module có đơn, báo cáo, đối soát | Dùng bộ 11 trạng thái làm chuẩn, lập bảng đối chiếu tên cũ – tên mới | Đợt 2 |
| OI-06 | Đặc tả trùng | 6 nhóm ở mục 5.2 | Người lập trình không biết theo bản nào | Lead chọn bản chuẩn theo bảng mục 5.2 | Phát triển |
| OI-07 | Trùng mã | FR-DH-01 đến 06 dùng hai lần; UC-DH-xx dùng lại ở ba tài liệu; BR-MH dùng ở hai tài liệu; ma trận cũ còn mã FR-AD, FR-HTX, FR-CS | Truy vết (mục 12), kiểm thử | Lấy mã FR ở mục 4 làm gốc; mã UC theo số FR (ví dụ UC-DH-08 đổi thành UC-DH-13) | Đợt 3 |
| OI-08 | Có hoàn phí giao không | Hoàng Đạt: không hoàn. SOP: hoàn khi lỗi không thuộc khách | BR-HOAN-04, đối soát | PO chọn; cách của SOP công bằng hơn với khách nhưng cần biết bên nào chịu (BR-AD-32) | Phát triển |
| OI-09 | Mã giới thiệu | Cao Nguyên: có ở giai đoạn 1. Minh Hằng: ngoài phạm vi | FR-TKSP-05 | Đề xuất để giai đoạn sau vì chưa có chính sách thưởng | Phát triển |
| OI-10 | Một giỏ hay hai giỏ | SRS Module MH v1.1 và Đặc tả Mua hàng và Thanh toán xử lý khác nhau | FR-MHTT-01, dữ liệu giỏ | Một giỏ, chia hai nhóm Mua sẵn và Đặt trước | Đợt 2 |
| OI-11 | Đặt trước theo khoảng ngày hay theo đợt | Đặc tả hiện dùng khoảng ngày giao do HTX khai; câu hỏi đợt thu hoạch ở CX-08, CX-17 | FR-MHTT-03, FR-SP-09, dữ liệu suất | Hỏi HTX thực tế bán theo mùa vụ thế nào rồi chốt | Đợt 2 |
| OI-12 | Quyền Admin ở FR-DT-04 | Bảng 08/10 ghi Admin "Chỉ xem" nhưng chốt kỳ, chi trả cần Admin thao tác | Ma trận phân quyền (mục 11) | Đã có hướng 29/10: Admin – Tài chính được thao tác (mục 11) | Đã có hướng |
| OI-13 | Chưa có chính sách đổi hàng | FR-DH-05 có trong bảng 08/10 nhưng không tài liệu nào quy định | FR-DH-05, BR-HOAN-11 | Để Could; giai đoạn 1 xử lý bằng hoàn tiền rồi khách đặt lại | Phát triển |
| OI-14 | Chưa có chỉ tiêu kinh doanh | Yêu cầu nghiệp vụ (mục 3) chưa có con số đích | Nghiệm thu, đánh giá dự án | PO đặt chỉ tiêu: số HTX, số sản phẩm, số đơn mỗi tháng, tỷ lệ huỷ, điểm đánh giá | Đợt 3 |
| OI-15 | Ai giữ tiền COD | Bảng phát sinh tiền: đơn vị vận chuyển thu hộ về sàn. BR-MH-42: HTX giữ tiền mặt, hoa hồng trừ kỳ sau | Công thức đối soát, công nợ HTX | Đã có hướng 29/10: shipper thu COD, nộp về sàn; HTX nhận tiền qua chi trả theo kỳ (BR-TC-05). Chờ duyệt cách làm | Đã có hướng |
| OI-16 | Tỷ lệ tiền chưa chốt | Hoa hồng 3–5% (có thể 0% 3–6 tháng đầu), phí cổng 1–1,5%, tỷ lệ giữ lại, ngưỡng chi trả: đều là giả định | FR-DT, FR-HT-02 | Để là tham số; PO chốt giá trị trước khi ký với HTX | Phát triển |
| OI-17 | Nguồn truy xuất nguồn gốc của Lào Cai | Các tài liệu viết theo hệ thống truy xuất của Bắc Giang; chưa xác minh hệ thống tương ứng của Lào Cai sau sáp nhập | FR-TKSP-04 (QR nguồn gốc), FR-SP-08 | Xác minh với Sở Nông nghiệp và Môi trường Lào Cai; tạm thời lưu link QR do HTX cung cấp | Phát triển |
| OI-18 | Số hàng "đang giữ" gồm những đơn nào | BR-SP-03: chỉ đơn Chờ thanh toán. BR-MHTT-08: cả đơn COD Chờ xác nhận | Tồn khả dụng, chống bán quá số hàng | Theo BR-TON-04: giữ đến khi bàn giao, lúc bàn giao mới trừ hẳn | Đợt 2 |
| OI-19 | Căn cứ pháp lý về dữ liệu cá nhân và thời hạn lưu | Chưa tài liệu nào quy định thời hạn lưu (NFR-DH-04-02) | BR-QL-07, FR-TK-05, NFR | Nhờ pháp chế xác nhận văn bản áp dụng, nội dung đồng ý và thời hạn lưu | Đợt 2 |
| OI-20 | Hàng đi từ Lào Cai đến tay shipper ở Hà Nội thế nào | SOP: kho trung chuyển Tây Mỗ. App hiện tại: shipper lấy hàng theo ghi chú, chưa có điểm nhận | FR-DH-09, FR-DH-18, phí giao, BR-TC-01, dữ liệu điểm nhận | Hỏi ở buổi họp với sếp: nơi nhận, người nhận hàng, bên trả cước chặng Lào Cai – Hà Nội | Đợt 2 (mục 8) |
| OI-21 | Admin tự đăng sản phẩm, giá: có cần người thứ hai duyệt; nhóm nào nhập giá | Quyết định 29/10 chưa nói; app hiện tại có bước Admin – Chất lượng duyệt yêu cầu của HTX | FR-SP-02, 04, 07; BR-GIA-02 | Giai đoạn 1 không bắt buộc người thứ hai; Admin – Chất lượng nhập; đổi giá ghi nhật ký | Phát triển |
| OI-22 | HTX báo khoảng ngày giao, số suất đặt trước cho Admin bằng cách nào | Trước đây HTX tự cấu hình (FR-SP-09) | FR-SP-09, FR-DH-17, OI-11 | Giai đoạn 1 HTX báo ngoài app (điện thoại, Zalo), Admin nhập | Phát triển |
| OI-23 | Admin có được thao tác thay HTX, khách, shipper không | "Admin giữ quyền quản lý tất cả" (29/10) chưa nói rõ có làm thay không | FR-DH-03, 08, 14; nhật ký | Cho Admin – Vận hành làm thay, bắt buộc lý do, ghi nhật ký, báo cho bên bị làm thay | Phát triển |
| OI-24 | CSKH có xem tin nhắn khách – HTX khi giải quyết khiếu nại không | Chưa tài liệu nào quy định | FR-CSKH-03, 09; dữ liệu cá nhân | Chỉ xem tin nhắn của đơn đang có ticket; ghi nhật ký mỗi lượt xem | Phát triển |
| OI-25 | Ai xem nhật ký thao tác | Mục 4: Admin. Ma trận 02/10: Admin chỉ xem. App: riêng Quản trị gốc | FR-HT-03 | Quản trị gốc xem toàn bộ | Phát triển |
| OI-26 | Một người Admin giữ nhiều nhóm quyền được không | Tài liệu cách cấp tài khoản: có thể gộp nếu quy mô nhỏ. App: mỗi tài khoản một nhóm | FR-TK-11 | Cho giữ nhiều nhóm, trừ cặp CSKH và Tài chính | Phát triển |

### 15.2. Câu hỏi cần xác nhận trong từng module

| Tài liệu | Mã | Nội dung chính |
| --- | --- | --- |
| Đặc tả UC – Tồn kho, giá, chứng nhận, Preorder và danh sách đơn | CX-01 đến CX-16 | Hình thức bán khi hết hàng, duyệt giá, chứng nhận hết hạn, hoả tốc Lào Cai, tên trạng thái, đợt Preorder, trùng mã FR-DH, ai cập nhật giao, phiếu giao đơn quà |
| Đặc tả UC – Module Mua hàng và Thanh toán | CX-17 đến CX-25 | Mô hình đặt trước, phần còn lại, trạng thái Đã xác nhận, hộp quà, COD hàng xa, mã ưu đãi phía khách, tách đơn theo ngày giao, giao thất bại hàng tươi, cổng thanh toán |
| Đặc tả UC từ FR-DT-01 tới FR-DT-04, FR-HT-01 | Mục 2.2 | Quyền Admin FR-DT-04, tiền COD, phí sàn và phí cổng |
| Đặc tả UC, BR và NFR – Module AD | Các dòng \[CẦN CHỐT\] | Phí cổng khi hoàn (BR-AD-38) và các tham số đối soát |

### 15.3. Việc tiếp theo

| Việc | Nội dung | Điều kiện bắt đầu |
| --- | --- | --- |
| Duyệt đợt 1 | Lead xem mục 1–5, 7, 15; trả lời các OI cần chốt trước Đợt 2 | Đã sẵn sàng |
| Đợt 2 | Mục 6, 9, 10, 11 viết ngày 29/10; mục 8 chờ buổi họp với sếp (câu hỏi ở 8.2) | Lead duyệt mục 11; họp với sếp |
| Thêm 3 FR do có Shipper | Đưa FR-DH-18, 19, FR-DT-06 vào mục 4 | Lead duyệt mục 11.3 |
| App của dev | Sửa theo mục 11.6; chốt giữ hay bỏ các chức năng ở mục 9.2 | Lead duyệt mục 11 |
| Đợt 3 | Mục 12, 13, 14: truy vết, nghiệm thu, kiểm thử | Đợt 2 được duyệt |
| Use case còn thiếu | 7 FR mức Must ở mục 5.2, sau đó 17 FR còn lại; thêm use case cho Shipper | Lead giao người viết |
