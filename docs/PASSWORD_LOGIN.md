# Đăng nhập và đăng ký bằng mật khẩu

> Cập nhật 29/10: mật khẩu mới dùng Bcrypt cost 12; hash scrypt lịch sử vẫn xác minh được. OTP cho hồ sơ/đổi SĐT/khôi phục hết hạn 120 giây, tối đa 3 yêu cầu/15 phút/số. Giới hạn 3 phiên local chưa phải quản lý thiết bị native/cloud. Quyền cấp Admin chuyển sang Root theo SRS hợp nhất.

- `/dang-nhap`: số điện thoại + mật khẩu.
- `/dang-ky`: họ tên, số điện thoại, mật khẩu, nhập lại mật khẩu và OTP đăng ký. API mật khẩu cũng bắt buộc mã OTP đúng số/purpose, dùng một lần; thành công lưu `phoneVerifiedAt` và đăng nhập ngay. Tài khoản cũ không tự được đánh dấu đã xác minh, Google vẫn là luồng riêng.
- Backend: `POST /api/v1/auth/password/login` và `POST /api/v1/auth/password/register`. Tự đăng ký chỉ tạo vai trò khách hàng; không chấp nhận vai trò do client gửi.
- Mật khẩu từ 8 đến 32 ký tự, tối đa 72 byte UTF-8, phải có chữ hoa, chữ thường, số và ký tự đặc biệt; mật khẩu mới băm bằng Bcrypt cost 12, lưu riêng trong `password_credentials`, không gửi hash trong dữ liệu ứng dụng. Hash scrypt cũ vẫn xác minh được. Sai 5 lần thì khóa đăng nhập mật khẩu 15 phút theo tài khoản. Phiên đăng nhập, phân quyền và đăng xuất dùng cơ chế backend hiện có.
- Chỉ khi `DEMO_MODE=true`, các tài khoản mẫu gốc dùng mật khẩu `Dacsan@123`. Tài khoản khách hàng mới phải dùng mật khẩu tự đặt. Không áp dụng mật khẩu mẫu cho tài khoản thật hoặc khi tắt demo.
- Tài khoản cũ chưa có mật khẩu không tự động được cấp mật khẩu chung. Root/Vận hành cấp liên kết dùng một lần, hạn 24 giờ ở mục Bảo mật tài khoản. Vận hành không được cấp liên kết cho Root. Đổi mật khẩu yêu cầu mật khẩu cũ và hủy các phiên; đặt lại cũng hủy phiên và liên kết cũ.
- Quên mật khẩu: `POST /api/v1/auth/password/forgot`; đặt lại: `/reset`. Demo hiển thị liên kết; chế độ thật cần `ACCOUNT_LINK_DELIVERY_URL` và `ACCOUNT_LINK_DELIVERY_TOKEN` để gửi riêng đến SĐT đã đăng ký. Chưa cấu hình thì báo 503. Phản hồi không tiết lộ SĐT có tồn tại hay không.
- Khởi tạo Root lần đầu: cấu hình `BOOTSTRAP_ADMIN_PHONE`, `PUBLIC_URL`, database và khóa mã hóa như khi chạy server, rồi chạy `npm.cmd run account:bootstrap` trên máy chủ. CLI chỉ cấp liên kết cho `bootstrap-root` chưa có mật khẩu, không thay mật khẩu của tài khoản đã kích hoạt. Mở liên kết được in trong terminal để tự đặt mật khẩu. Không lưu liên kết vào tài liệu chia sẻ.
- Supabase email cũng chuyển sang mật khẩu. Nếu dự án Supabase bật xác nhận email, người đăng ký mở liên kết xác nhận, không nhập mã OTP. Cấu hình cloud chưa được kiểm thử thực vì chưa có project.
- SQLite tạo bảng khi khởi động. Với Supabase/PostgreSQL chạy `npm run supabase:migrate` để áp dụng cả migration mật khẩu và `202610280001_account_security.sql`.

API OTP cũ được giữ tương thích cho các nghiệp vụ xác minh khác và các client cũ; không xuất hiện trong trang đăng nhập/đăng ký mới. Đăng ký hồ sơ HTX là quy trình thẩm định riêng, không phải đăng ký tài khoản khách hàng.
