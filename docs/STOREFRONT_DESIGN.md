# Giao diện cửa hàng theo mẫu Stitch

Trang khách hàng dùng bố cục từ `screen.png` và `code.html` người dùng cung cấp: header sáng, banner xanh rừng, vùng miền, danh mục sản phẩm, câu chuyện người làm, giá trị, đánh giá, bài viết và footer. Phông Newsreader và Plus Jakarta Sans được đóng gói trong ứng dụng.

- `src/screens/customer/StorefrontPage.tsx`: trang và thẻ sản phẩm, dùng dữ liệu backend, tồn kho, quy cách và các lệnh giỏ hàng hiện có.
- `src/screens/customer/StorefrontHeader.tsx`: điều hướng, tìm kiếm, tài khoản, thông báo và giỏ hàng.
- `src/app/StorefrontContext.tsx`: tìm kiếm và điều hướng giữa các mục, kể cả từ màn đăng nhập/tài khoản.
- `src/storefront.css`: style riêng cho cửa hàng, responsive trên điện thoại và máy tính.
- `public/images/stitch/sources.json`: nguồn ảnh từ HTML mẫu. `scripts/import-stitch-assets.mjs <thư mục mẫu>` nhập lại ảnh khi cần. Ảnh phong cảnh là minh hoạ; ảnh sản phẩm do HTX cung cấp được ưu tiên. Sản phẩm thiếu ảnh giữ tranh SVG sẵn có.

Trang chủ mở cho khách chưa đăng nhập. Nút tài khoản mở đăng nhập; mua hàng vẫn yêu cầu tài khoản. Các vai trò quản trị, HTX, QLNN và shipper tiếp tục dùng màn nghiệp vụ hiện có. Không thay đổi catalog, giá hay số liệu backend để khớp số liệu trang mẫu. Phần đánh giá chỉ hiển thị khi backend cung cấp đánh giá công khai.

Kiểm thử: `npm run lint`, `npm run build`, `npm test`, `npm run e2e`. Kiểm thử trình duyệt bao gồm tìm kiếm, giá, vùng miền, tải ảnh, bài viết, tràn ngang ở 1440px/390px và các luồng mua hàng/đăng nhập hiện có. Ảnh chụp nằm trong `test-results` sau khi chạy e2e.
