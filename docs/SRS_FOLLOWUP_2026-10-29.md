# Bổ sung tiếp SRS hợp nhất — 29/10/2026

> Đợt bổ sung mới hơn về điểm nhận và chứng từ hoàn ngân hàng đã được ghi riêng tại [SRS_HANDOVER_REFUNDS_2026-10-29.md](SRS_HANDOVER_REFUNDS_2026-10-29.md). Bảng hiện tại còn 10 FR mở; các con số 11 và kết quả kiểm tra bên dưới là của đợt trước.

Ban đầu có 15/82 FR được đánh dấu mở/khác đặc tả; sau đợt trước còn 13, hiện còn **11/82 FR** sau khi thêm OTP đăng ký và bút toán chênh lệch. Con số theo tiêu chí trạng thái trong [bảng đối chiếu tự sinh](SRS_UNIFIED_COVERAGE_2026-10-29.md), không bao gồm nghiệm thu mọi nhánh UC/NFR.

## Phần đã làm tiếp

### FR-CSKH-11 — Đánh giá HTX độc lập

- Khách đánh giá từ trang shop khi có đơn Đã giao của mình, mỗi đơn một lần; HTX lấy từ đơn ở server, không nhận HTX do client gán.
- Điểm HTX riêng với điểm sản phẩm. Một khách có nhiều đơn có thể đánh giá nhiều lần; đây là mặc định theo giao dịch trong khi FR Could chưa có UC riêng.
- Dùng chung cửa sổ đánh giá, chế độ chờ duyệt, số sao 1–5 và quy tắc nhận xét 1–2 sao của đánh giá sản phẩm. Tối đa 500 ký tự, không kèm ảnh ở phiên bản này.
- HTX phản hồi một lần; CSKH duyệt/ẩn với lý do vi phạm hợp lệ. Không có lý do “sao thấp”. Root/nhóm khác không được kiểm duyệt.
- Phản hồi công khai không chứa mã khách, mã đơn, số điện thoại hay địa chỉ; server xác nhận nhãn Đã mua hàng. Như đánh giá sản phẩm, nội dung tự nhập vẫn cần CSKH kiểm duyệt nếu khách tự viết thông tin cá nhân.
- UI có tại trang shop, tab Đánh giá của HTX và CSKH. Điểm tổng hợp sản phẩm trên đầu shop vẫn được giữ, có bảng điểm HTX riêng bên dưới.

### FR-TK-05 — Tiếp nhận yêu cầu xóa tài khoản

- Khách/HTX xác nhận mật khẩu và gửi lý do; chỉ gửi yêu cầu cho tài khoản đã xác thực, không nhận userId của client. Tài khoản Google chưa có mật khẩu riêng cần thiết lập trước.
- Chống gửi yêu cầu đang mở trùng; chủ tài khoản xem lịch sử và rút yêu cầu. Chỉ Vận hành thấy danh sách và yêu cầu bổ sung, chuyển kiểm tra lưu trữ hoặc từ chối với ghi chú.
- Có lịch sử người xử lý và audit; không nhận trạng thái “đã xóa” giả. UI trong Bảo mật tài khoản của khách/HTX/Vận hành.
- Chưa xóa tài khoản, bản ghi đơn, sổ, ảnh, phiên Auth ngoài hệ thống hoặc backup. Tài khoản vẫn hoạt động khi gửi yêu cầu. FR này còn mở đến khi OI-19 xác nhận cách ẩn danh và lịch lưu trữ, sau đó phải triển khai/kiểm chứng thực thi.

### FR-BCTK-03 — Xuất báo cáo nền, thất bại và thử lại

- Có tùy chọn Xuất nền trong các nút xuất; lịch sử tự làm mới khi đang chờ, tải tệp khi thành công và thử lại khi FAILED còn hạn.
- Job và snapshot được lưu trong database. Worker chạy một job/lượt trong lịch backend 5 giây; claim và kết quả cùng transaction, tiến trình dừng trước commit thì job vẫn QUEUED để chạy lại. Có kiểm chứng SQLite và PostgreSQL.
- Quyền hiện tại và phạm vi HTX được kiểm tra khi xếp hàng, khi chạy, thử lại và tải; job thuộc riêng người tạo. Số liệu cố định theo snapshot lúc xếp hàng, không tự đổi khi thử lại.
- CSV/XLSX, checksum, giới hạn 50.000 dòng/10 MB. Tối đa 3 job đang chờ và 10 yêu cầu/15 phút/người; thử lại cũng có giới hạn. Snapshot nguồn bị dọn khi hết hạn 24 giờ; metadata lịch sử tiếp tục theo cơ chế hiện hành, chưa có chính sách lưu audit chung OI-19.
- Đây là hàng đợi database giới hạn, chưa là streaming/distributed worker, chưa chứng minh hiệu năng dữ liệu lớn. Worker vẫn chạy trong tiến trình backend và có thể giữ transaction trong thời gian tạo tệp; cần đo tải trên hạ tầng thật.

## Phần còn mở

11 FR được liệt kê trực tiếp trong bảng đối chiếu: thực thi xóa dữ liệu theo OI-19; cọc/online/thanh toán còn lại/hoàn tiền cần merchant thật; phạm vi hộp quà, đổi hàng, chặng trung chuyển và quyền Admin làm thay; push theo thiết bị; holdback/phí. OTP đăng ký và đề xuất/duyệt bút toán đã có mã, nhưng phương thức đăng nhập cuối OI-03 và quy trình kế toán vẫn cần nghiệm thu.

## Bổ sung tiếp theo yêu cầu làm nốt

### FR-TK-01 — OTP bắt buộc khi đăng ký số điện thoại

- Màn đăng ký gửi OTP, có thời gian chờ gửi lại 60 giây và hiển thị thời hạn 120 giây. Backend kiểm tra purpose `register`, đúng số, một lần dùng; không thể bỏ qua bằng cách gọi API mật khẩu trực tiếp.
- Đăng ký khách tạo tài khoản sau khi mã hợp lệ, lưu `phoneVerifiedAt`; không tự nâng vai trò từ payload. HTX dùng hồ sơ đăng ký có OTP và chờ duyệt như trước.
- Đăng nhập mật khẩu được giữ; Google/Supabase email là luồng danh tính riêng, không suy ra đã xác minh SĐT. Tài khoản lịch sử không bị tự sửa hoặc gán thời điểm xác minh giả.
- Production cần cấu hình adapter SMS thật. Test có challenge demo hoặc adapter HTTP giả lập, không là bằng chứng đã gửi SMS thật.

### FR-DT-05 — Đề xuất và duyệt bút toán xử lý chênh lệch

- Từ dòng CSV chênh lệch/thiếu bảng kê đối tác có đơn và số tiền xác định, Tài chính lập đề xuất kèm mã chứng từ, giải trình và xác nhận kiểm tra. Dòng trùng tham chiếu/không tìm thấy đơn không được tự ghi bút toán.
- Số tiền server suy từ snapshot chênh lệch, không nhận giá trị tùy ý. Hoàn tiền đảo dấu so với thu tiền. Một chênh lệch trùng đối tác/loại/đơn/tham chiếu/số tiền không được lập hoặc ghi lặp.
- Người lập chỉ được rút; một nhân viên Tài chính khác duyệt hoặc từ chối kèm căn cứ. Khi duyệt phải kiểm tra người lập còn hoạt động và còn quyền. Đây là mặc định kiểm soát thận trọng, cần đơn vị vận hành duyệt quy trình; không giả định SRS đã mô tả chi tiết nguyên tắc hai người.
- Duyệt thêm đúng một dòng `reconciliation_adjustment`, liên kết phiên CSV và chứng từ/người lập/người duyệt. Gửi lại duyệt không thêm dòng. Đơn, tiền thu/hoàn gốc và kỳ chi trả cũ giữ nguyên; không tự chuyển tiền, thu thêm khách hoặc cộng/trừ số phải trả HTX.
- UI ở Tài chính → Đối soát HTX → Nhập đối soát từ đối tác; có danh sách đề xuất để duyệt/rút. Root không thao tác thay Tài chính. Sổ giao dịch và file xuất bao gồm loại điều chỉnh riêng.
- Chưa gắn bút toán vào chính sách phân bổ công nợ/chi trả kỳ sau khi OI-16 chưa được chốt; cần đối chiếu bảng kê thật và phê duyệt kế toán trước khi dùng vận hành.

Việc kết nối SMS, thanh toán/hoàn tiền, push, cloud/Maps và nghiệm thu vận hành không được đánh dấu hoàn tất qua adapter giả lập hoặc bằng cách tắt kiểm tra production. Giai đoạn 1 dùng shipper nội bộ và ghi nhận chi trả thủ công theo SRS.

Tái tạo bảng: `node scripts/audit-unified-srs.mjs`.

## Chạy và kiểm chứng

- SQLite tự tạo index khi khởi động. PostgreSQL/Supabase chạy `npm.cmd run supabase:migrate` trên môi trường đã cấu hình; script đã thêm `202610290001_srs_followup.sql` cho index hàng đợi và lookup tính năng. Không cần chạy lại dữ liệu mẫu, không sửa migration gốc để ghi đè dữ liệu bán hàng.
- Đã đạt TypeScript (`npm.cmd run lint`) và build; build còn cảnh báo bundle chính trên 500 kB.
- 258/258 kiểm thử nghiệp vụ, 75/75 kiểm thử backend, gồm hàng đợi/bút toán với PostgreSQL/PGlite, OTP đăng ký và các quyền/ẩn danh/chống lặp mới.
- 16/16 kiểm thử trình duyệt đạt, có OTP đăng ký, lập/rút đề xuất bút toán, gửi đánh giá HTX tại shop, gửi/rút yêu cầu xóa, xuất nền và tải tệp trong lịch sử.
- Chỉ chạy môi trường kiểm thử; chưa chạy migration lên Supabase thật, gửi SMS, chuyển tiền hoặc triển khai production.
- `npm.cmd run check:production` vẫn trả `ready:false`: thiếu cấu hình khóa mã hóa, HTTPS/origin, SMS, kênh gửi link khôi phục, secrets webhook payment/refund và adapter thu/hoàn tiền thật. Đây là kiểm tra cấu hình chưa đạt, tách biệt với các kiểm thử mã đã đạt; chưa được nhận giao dịch thật.
