# Trang danh sách sản phẩm

Đường dẫn `/san-pham`, mở từ menu Sản phẩm hoặc gửi biểu mẫu tìm kiếm ở header. Thiết kế dựa theo ảnh, HTML và bảng màu người dùng cung cấp: banner xanh, sidebar, thanh bộ lọc đang áp dụng, lưới ba cột, phân trang và footer. Điện thoại dùng hai cột và nút mở bộ lọc.

Danh mục, vùng miền, số lượng, giá, tình trạng và quy cách lấy từ backend hiện có. Không thêm sản phẩm hoặc giá giả từ mẫu. Mỗi trang có sáu nhóm sản phẩm. Bộ lọc chỉ áp dụng sau khi nhấn nút; các chip cho phép bỏ từng điều kiện. Tìm kiếm và sắp xếp áp dụng trực tiếp. Không gắn nhãn bán chạy hoặc giá gạch ngang khi chưa có dữ liệu chứng minh.

Ảnh thảo quả được tải từ URL trong HTML mẫu; nguồn ghi trong `public/images/catalog/sources.json`. Banner dùng ảnh phong cảnh của mẫu trang chủ đã nhập trước đó. Các sản phẩm thiếu ảnh giữ minh hoạ sẵn có. Script `scripts/import-catalog-assets.mjs <đường dẫn code.html>` hỗ trợ nhập các ảnh tương ứng khi có file nguồn trên máy.

Thẻ sản phẩm tái sử dụng các thao tác giỏ hàng, yêu thích, chọn quy cách và xem chi tiết hiện có. Footer dẫn đến chức năng thật của ứng dụng. Kiểm thử trình duyệt bao gồm phân trang, áp dụng/bỏ bộ lọc, sắp xếp, chi tiết, trở về trang chủ và quay lại bằng lịch sử trình duyệt tại 1440px và 390px.
