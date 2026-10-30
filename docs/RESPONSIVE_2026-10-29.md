# Kiểm tra giao diện responsive — 29/10/2026

Giao diện sử dụng bố cục co giãn cho điện thoại, tablet và máy tính. Bảng dữ liệu cuộn ngang trong khung riêng; nội dung dài xuống dòng. Hộp thoại dùng chiều cao viewport động, giữ phần nội dung có thể cuộn và các nút thao tác có thể tiếp cận trên màn hình ngang thấp. Nút Google được vẽ lại khi kích thước vùng chứa thay đổi.

## Phạm vi kiểm thử tự động

- Trang chủ, sản phẩm, đăng nhập: chiều rộng 320, 360, 390, 600, 768, 820, 1024, 1280, 1440, 1920 và 2560 px.
- Các tab của tám vai trò: vận hành, kiểm duyệt, CSKH, tài chính, quản trị gốc, HTX, cơ quan quản lý và shipper; chiều rộng 320, 600, 768, 1024, 1440 và 2560 px.
- Hộp thoại sản phẩm: 320×568, 390×844, 768×1024, 844×390, 1280×720, 1920×1080; kiểm tra tên dài liền mạch và vị trí nút mua.
- Nút Google: kiểm tra kích thước khi thay đổi viewport bằng bộ giả lập giao diện Google; không xác minh OAuth thật trong bài kiểm thử này.
- Kiểm tra tràn ngang của tài liệu và phần tử thoát khỏi khung; bảng và thanh điều hướng được phép cuộn nội bộ.

Chạy bằng `npm run e2e`. Các bài kiểm thử nằm trong `e2e/responsive.e2e.ts`, chạy cùng kiểm thử nghiệp vụ hiện có trên cơ sở dữ liệu thử riêng.

Kết quả ngày 29/10/2026: 29/29 kiểm thử trình duyệt đạt (11 bài responsive), kiểm tra TypeScript và build thành công.

## Giới hạn

Kiểm thử dùng Chromium với viewport mô phỏng. Đây chưa phải xác nhận trên mọi thiết bị hoặc trình duyệt. Trước khi phát hành cần thử thêm Safari/iOS, Firefox, bàn phím ảo, phóng to chữ và thiết bị thật. Các kích thước nằm giữa mốc kiểm thử được xử lý bằng CSS co giãn, chưa được kiểm tra từng pixel.
