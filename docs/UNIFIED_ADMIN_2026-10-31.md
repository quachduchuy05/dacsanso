# Admin tổng hợp — quyết định ngày 31/10/2026

Người dùng xác nhận: “Một tài khoản Admin làm tất cả: vận hành, sản phẩm, CSKH, tài chính và quản lý tài khoản.” Quyết định này thay hạn chế Root chỉ phân quyền/xem audit trong SRS ngày 29/10. Bản SRS gốc được giữ làm lịch sử.

## Cách sử dụng

Đăng nhập bằng tài khoản Admin gốc hiện có (`adminGroup: root`). Giao diện hiển thị “Quản trị tổng hợp” với 21 mục: tổng quan, đơn hàng, giao hàng/phân công, tài khoản, tham số, danh mục, nội dung trang chủ, mã ưu đãi, danh sách/hồ sơ HTX, duyệt HTX, sản phẩm/giá, khiếu nại, đánh giá, hoàn tiền, đối soát, sổ tiền, COD, hóa đơn, phân quyền Admin và nhật ký.

Tài khoản demo gốc theo seed: số điện thoại `0900000209`, mật khẩu demo `Dacsan@123`. Đây chỉ là thông tin seed; không tự đặt lại mật khẩu hoặc thay đổi tài khoản đang lưu trong database. Nếu máy đã đổi thông tin, dùng tài khoản gốc thực tế của hệ thống.

## Quyền và dữ liệu

- `adminGroupCan` dùng chung trong domain và server: Root có đủ các nhóm nghiệp vụ. Tài khoản khách, HTX, QLNN, shipper và nhân viên theo nhóm vẫn được giới hạn như trước.
- API kiểm tra vai trò từ phiên đăng nhập ở server, không nhận nhóm quyền từ payload. RPC giữ nguyên actor thật của Root; nhật ký có đúng userId và nhóm root, không giả actor thành một tài khoản/nhóm khác.
- Root xem và xử lý dữ liệu vận hành, sản phẩm, CSKH, tài chính; xuất được báo cáo tương ứng, xem audit và quản lý các loại tài khoản. Cấp liên kết mật khẩu vẫn yêu cầu phiên hợp lệ và lưu nhật ký.
- Tài khoản nhân viên cũ được giữ để không mất liên kết đơn/nhật ký; không tự nâng các tài khoản này lên toàn quyền và không xóa tài khoản hoặc database.
- Chỉ shipper được phân công báo lấy hàng/giao hàng. Root chỉ phân công và quản lý điểm bàn giao; vẫn cấm RPC carrierSimulate, không làm thay khách/HTX/shipper.
- Chứng từ, số tiền, chống ghi lặp, khóa kỳ đã chốt và nguyên tắc không tự duyệt đề xuất chênh lệch do chính mình lập vẫn được giữ. Gộp giao diện và quyền Admin không bỏ kiểm soát giao dịch.

Không cần migration dữ liệu hoặc reset dữ liệu để bật Admin tổng hợp. Cần triển khai lại frontend và backend cùng phiên bản; chỉ cập nhật frontend sẽ không mở quyền của API cũ.

## Kiểm tra

259 kiểm thử nghiệp vụ và 100 kiểm thử backend đạt. Kiểm tra trình duyệt: 30 bài còn lại đạt trong lượt đầy đủ, bài giao diện Admin được cập nhật selector và chạy lại đạt; tổng 31 bài đã được xác minh. TypeScript và build thành công. Các bài mới kiểm tra Root tạo/sửa sản phẩm, chạy tham số, xuất báo cáo các nhóm, ghi chứng từ một lần, cấp/kích hoạt shipper, giữ actor thật và chặn làm thay khách/shipper. Kiểm tra responsive bao gồm giao diện Root tổng hợp ở 320–2560 px.
