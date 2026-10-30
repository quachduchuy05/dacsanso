# Đối chiếu backend với thư mục đặc tả

> Cập nhật 28/10/2026: xem [phần bổ sung và công việc còn lại](SPEC_COMPLETION_2026-10-28.md). Bảng lịch sử bên dưới chưa phản ánh các module mới và không nên dùng để kết luận tính năng hiện tại.

> **Bản rà soát mới hơn:** [SPEC_AUDIT_2026-10-27.md](SPEC_AUDIT_2026-10-27.md), sau các thay đổi đăng nhập mật khẩu/Google và giao diện catalog. Các dòng bên dưới ghi “chưa có mật khẩu”, số kiểm thử và quyết định dùng OTP là trạng thái lịch sử, không còn mô tả đầy đủ bản hiện tại.

**Cập nhật Supabase:** đã bổ sung PostgreSQL adapter, migration RLS/schema riêng, Supabase Auth và Storage riêng tư. Các giới hạn nghiệp vụ trong bảng bên dưới vẫn giữ nguyên; thay nhà cung cấp lưu trữ không tự hoàn thành các tính năng còn thiếu. Xem [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Kiểm tra hiện tại gồm 251 unit test, 34 test backend và 5 kịch bản Chromium; phần Auth/Storage cloud dùng adapter giả lập do chưa có project thật.

Nguồn: [thư mục Google Drive người dùng cung cấp](https://drive.google.com/drive/folders/1z64JhV2oI3D6hHccbSv4zrlhvk7H0CTZ). Đã đọc 16 tài liệu và lưu bản text trong `docs/specifications/01.txt` đến `16.txt`, mỗi file có tên và link nguồn. Bảng dưới mô tả phạm vi thực tế, không coi toàn bộ đặc tả đã được nghiệm thu.

| Nhóm yêu cầu | Đã triển khai tại backend | Giới hạn/cần bổ sung |
|---|---|---|
| TK/ACC: tài khoản, OTP, đăng ký/đăng nhập, khóa, phân quyền | OTP do server kiểm tra, giới hạn gửi/thử, phiên access/refresh thu hồi được, khóa hủy mọi phiên, khách chỉ tự tạo role customer, root/operations/quality/cskh/finance được kiểm tra tại API | OTP thật cần adapter SMS. Chưa có đăng nhập mật khẩu/biometric, đăng ký thiết bị và FCM native |
| MH: danh mục, xem công khai, giỏ, đặt hàng | Catalog public, xem trước khi đăng nhập, bắt đăng nhập khi mua; giỏ riêng ready/preorder, giá/tồn kiểm tra tại server, giá trị tiền tính lại, xử lý tranh chấp giữ hàng bằng transaction | Mô hình sẵn có chia ready/preorder thành các sản phẩm; chưa tự chuyển mọi sản phẩm hết tồn thành một đợt preorder khi chưa có lịch giao. Chưa có catalog động do HTX tự tạo |
| TK/HTX: hồ sơ người bán | Nộp/tra cứu bằng OTP đúng SĐT, thẩm định/checklist, yêu cầu bổ sung, duyệt/từ chối, tạo tài khoản, quyền bán | Giữ 4 mục thẩm định và địa danh Lào Cai theo source. Chưa tích hợp kiểm tra MST/giấy phép với cơ quan cấp; thiếu trường MST duy nhất theo tài liệu mobile |
| SP: sản phẩm, giá, tồn, chứng nhận, kiểm duyệt | Tạo/chờ duyệt, thay đổi nội dung/giá/preorder cần duyệt; quyền sở hữu, điều kiện HTX hoạt động, tên/mô tả/giá/không trùng theo BR-SP, hết hạn chứng nhận bị chặn; cập nhật tồn không thấp hơn đã giữ | Chưa có nháp 30 ngày, bộ ảnh 1–6 cho sản phẩm, đầy đủ số/ngày cấp chứng nhận, chuẩn bị/hạn dùng/tháng thu hoạch và khóa biên tập có TTL. Giữ form sản phẩm đang có |
| DH: đơn, giao nhận, hủy, giao lại, trả hàng | Server chạy state machine, xác nhận/từ chối đúng HTX, sửa/hủy/nhận hàng đúng khách, snapshot giá/chính sách, giới hạn SLA; phân công shipper và thu/nộp COD; job tự động chạy 5 giây kể cả khi không có trình duyệt | Vận chuyển ngoài cần adapter outbound theo hãng. Chưa hỗ trợ đầy đủ đổi hàng/bù hàng ngoài luồng trả/hoàn hiện có |
| Thanh toán/hoàn tiền | Chống trùng checkout và yêu cầu, kiểm tra amount/currency, webhook HMAC chống phát lại, hoàn thành công chỉ từ webhook hoặc công cụ demo được cấp quyền | Chưa có merchant/provider thật và API tạo yêu cầu thanh toán/hoàn/chi trả. Nút demo bị chặn ở chế độ thật |
| CSKH/review/chat | Ticket đúng người/HTX, kết luận bởi CSKH, duyệt hoàn, review của đơn đã giao, ẩn đúng lý do, chat theo đơn/HTX, thông báo lưu server | Chưa có push/email thật, video bằng chứng, quy trình SLA nâng cao hoặc khóa kiểm duyệt theo người xử lý |
| DT/AD: đối soát, kỳ chi trả | Tính theo nghiệp vụ sẵn có, chốt kỳ, chỉ Tài chính được thao tác, HTX chỉ thấy kỳ của mình, không tự xác nhận chi trả thật, ledger và audit qua server | Chưa có bộ sổ quan hệ chuẩn hóa chỉ thêm, nhập đối soát CSV đối tác, bảng chênh lệch/tạm giữ/công nợ và luồng hai người duyệt đầy đủ trong module AD |
| HT: tham số, ưu đãi | Quản lý theo nhóm quyền, lý do/lịch sử, snapshot tham số cho đơn cũ, voucher kiểm lại trên dữ liệu thật khi đặt | Một số công thức tài chính/ngưỡng còn [CẦN CHỐT] trong tài liệu: tiếp tục dùng tham số hiện có, không tự tuyên bố đã được duyệt |
| HT-03: nhật ký | Bảng audit_events chỉ thêm, trigger chặn update/delete, Root đọc có phân trang, ghi đăng nhập/ghi nghiệp vụ/từ chối/xuất/tải | Chưa có outbox/DLQ đa dịch vụ, retention nhiều năm, bộ lọc truy vết nâng cao; không có chứng nhận hiệu năng 1 triệu dòng |
| BCTK: thống kê/xuất | Số liệu tính server; QLNN chỉ nhận tổng hợp, không đọc đơn/ticket cá nhân; job xuất riêng theo người, CSV BOM/chống công thức/hết hạn, ghi lượt tải | Hiện hỗ trợ summary/orders toàn bộ dữ liệu tại thời điểm xuất. Chưa có toàn bộ bộ lọc địa bàn/data_as_of từ dashboard, XLSX/PDF, hàng đợi xuất lớn, SLA và phạm vi địa bàn theo người dùng |
| Dữ liệu/bảo mật | SQLite WAL, transaction nguyên tử, server cấp ID/thời gian/quyền, idempotency, không nhận state PUT, không ghi bí mật vào audit, AES-256-GCM khi cấu hình key | Một aggregate nghiệp vụ, một máy chủ; chưa phải SQL chuẩn hóa, HA nhiều replica, migration framework, lịch sao lưu/khôi phục vận hành hoặc kiểm thử tải |

## Các quyết định khi tài liệu chưa thống nhất

1. Giữ nhận diện và dữ liệu Lào Cai của dự án; tài liệu nguồn có Bắc Giang/Vinhomes Smart City. Không tự đổi toàn bộ nội dung hoặc danh sách vùng.
2. Dùng đăng nhập OTP và opaque access/refresh token để thu hồi tức thì; tài liệu mobile đề xuất JWT, nhưng các kiểm soát xác thực/thu hồi vẫn thực hiện phía server.
3. Giữ cơ chế nhóm Admin hiện tại; Root có thể gọi các chức năng quản trị với quyền tương ứng ở server. QLNN chỉ nhận tổng hợp, không nhận các đơn ẩn danh riêng lẻ.
4. Giữ các tham số nghiệp vụ hiện có đối với các mục chưa phê duyệt; không coi các giả định tài chính trong tài liệu AD/BCTK là chính sách đã chốt.
5. DEMO_MODE là lựa chọn có chủ ý để chạy đồ án không cần tài khoản dịch vụ. Chế độ thật không tự hạ xuống OTP hay xác nhận tiền mô phỏng.

## Kiểm thử

Kết quả kiểm tra ngày 27/10/2026: TypeScript đạt, Vite build đạt, **251/251 unit test**, **28/28 test backend**, **4/4 kịch bản Chromium** đạt. Có 94 thao tác nghiệp vụ được đăng ký tại server.

- TypeScript và Vite build được chạy trực tiếp trên máy.
- Bộ unit test hiện có: 35 file, 251 test.
- Bộ HTTP backend mới: xác thực, quyền chéo vai trò, transaction rollback, idempotency, đặt đồng thời món cuối, lưu/khởi động lại, audit, xuất file, expiry, webhook và chặn giả kết quả thanh toán.
- Chromium mới: sửa hồ sơ và reload; giỏ → đặt hàng → thanh toán mô phỏng với ID server; xem hàng công khai rồi yêu cầu đăng nhập khi mua.
- Kiểm tra thêm màn HTX, Quản trị gốc, Tài chính, QLNN và Shipper bằng phiên riêng.
- Không tuyên bố đã chạy lại toàn bộ 19 kịch bản e2e cũ vì chúng dùng `/api/state` và mô hình chia sẻ dữ liệu demo đã bị loại bỏ.
