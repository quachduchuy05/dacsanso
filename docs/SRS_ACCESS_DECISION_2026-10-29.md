# Quyết định bổ sung SRS — quyền giao hàng và đóng truy cập

## Quyền cập nhật giao hàng

Ngày 29/10/2026, khi được hỏi có áp dụng đề xuất Admin Vận hành cập nhật thay shipper không, người dùng trả lời: **“Không, chỉ shipper tự cập nhật”**.

- Áp dụng cho cả demo và production. Vận hành phân công shipper/đổi khi chưa lấy hàng, quản lý điểm nhận; không báo đã lấy/đã giao/thất bại/từ chối thay shipper.
- Chặn RPC `carrierSimulate` và webhook `carrier`, bỏ màn báo ĐVVC mô phỏng trong Vận hành. Các helper domain lịch sử không là API được phép ghi dữ liệu.
- Shipper chỉ cập nhật đơn được phân công, theo thứ tự lấy hàng rồi báo kết quả; ảnh giao thành công vẫn bắt buộc. Xác nhận nhận hàng và tự chuyển Đã giao sau hạn của khách giữ nguyên.
- Quyết định này giải quyết phần mở FR-DH-14; không mở quyền làm thay khách hoặc HTX ở OI-23. SRS gốc được giữ nguyên để tra lịch sử; bảng đối chiếu ghi quyết định mới của người dùng.

## Yêu cầu xóa và đóng quyền truy cập — FR-TK-05

- Hiển thị kiểm tra theo tài khoản: đơn hoạt động, giao dịch chờ, khoản hoàn chưa xong, ticket đang xử lý, kỳ HTX chưa trả, đơn đã giao chưa vào kỳ. Chỉ trả số đếm trong phạm vi chủ tài khoản/Vận hành, không đưa dữ liệu đơn hay số tài khoản của người khác.
- Kiểm tra là thông tin hỗ trợ, không tự tuyên bố được phép xóa. Chính sách lưu trữ luôn còn chờ xác nhận.
- Vận hành có thể đóng quyền truy cập khi có yêu cầu đã được chủ tài khoản xác thực và không còn các nghiệp vụ trên; bắt buộc căn cứ ít nhất 20 ký tự và xác nhận riêng.
- Khi đóng: đánh dấu accessClosedAt, khóa đăng nhập, xóa phiên local/link/OTP/credential, HTX dừng bán. Không mở lại bằng nút Mở khóa thông thường; không kích hoạt lại bán khi đại diện đã đóng và chưa có đại diện hoạt động.
- Danh tính ngoài như Google/Supabase vẫn được giữ liên kết để chặn vào app; API kiểm tra trạng thái đóng. Không tuyên bố đã xóa tài khoản Google/Supabase hoặc thu hồi mọi phiên tại nhà cung cấp.
- Đơn, sổ, tài khoản ngân hàng/danh tính lưu trong dữ liệu lịch sử, ảnh và backup không được tự xóa/ẩn danh. Dữ liệu yêu cầu và audit tiếp tục giữ để rà soát OI-19. FR-TK-05 còn mở; “đóng truy cập” không phải hoàn tất xóa dữ liệu cá nhân.
- Không chạy đóng tài khoản thật trong lượt phát triển; kiểm thử dùng database cách ly.

API `POST /api/v1/account-deletion-requests` thêm `{action:"close_access",id,note,confirmed:true}`; chỉ Vận hành. Gửi lại cùng yêu cầu đã đóng không tạo tác động lần hai. API kiểm tra lại nghĩa vụ ngay trong transaction, không tin kết quả đếm cũ từ giao diện.

Khi khôi phục backup chụp trước thời điểm đóng truy cập, cần đối chiếu và áp dụng lại danh sách đóng từ nhật ký được lưu ngoài bản backup đó. Cờ trạng thái trong snapshot cũ không thể tự phản ánh yêu cầu phát sinh sau ngày sao lưu; việc phục hồi không đồng nghĩa đã thực hiện xóa dữ liệu theo OI-19.

## Kiểm chứng

- TypeScript và build đạt; bundle chính vẫn có cảnh báo kích thước.
- 259/259 kiểm thử nghiệp vụ, 85/85 backend, 18/18 trình duyệt đạt.
- Bao gồm đóng truy cập/thu hồi phiên trên SQLite và PostgreSQL/PGlite, giữ sổ tiền, chặn mở khóa/bán lại HTX, chặn Admin báo giao và callback carrier, kiểm tra chỉ shipper được phân công báo kết quả.
- Bảng đối chiếu hiện còn 9 FR để mở; FR-TK-05 vẫn chưa được coi hoàn tất xóa dữ liệu, FR-DT-02 đang chờ người dùng cung cấp tỷ lệ/thời hạn giữ và ngưỡng chi trả.
