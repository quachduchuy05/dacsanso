# Thiết kế giao diện khách hàng — Phase 2

Ghi chú thiết kế ban đầu. Các chức năng mua hàng và phương tiện đã được bổ sung sau đó; xem trạng thái hiện tại trong [PHASE2_IMPLEMENTATION.md](PHASE2_IMPLEMENTATION.md).

Tham chiếu: SRS – Trải nghiệm chọn mua hàng (Phase 2), bản 1.1 ngày 04/11/2026, đặc biệt mục 7. Đây là thay đổi thiết kế giao diện, không phải biên bản nghiệm thu toàn bộ chức năng Phase 2.

## Hướng thiết kế

- Chàm `#171D30` cho khu trưng bày; trắng ngà `#F5F0E7` cho phần đọc; đồng `#946D39` cho chữ nhấn trên nền sáng, champagne `#D9BA84` cho nút trên nền tối.
- Tiêu đề Newsreader và nội dung Plus Jakarta Sans, dùng bộ chữ tiếng Việt hiện có.
- Trang chủ lấy sản phẩm từ danh mục đang hoạt động làm tâm điểm. Không dùng banner phong cảnh, không thêm ảnh mạng hoặc lời chứng thực giả.
- Một nền nội dung liên tục nối chọn mua, nguồn gốc, vùng sản xuất và cách thưởng thức; giảm các khối thẻ và các dải màu ngắt quãng.
- Thẻ sản phẩm khung 4:5, hình vòm, có vùng, quy cách, giá, yêu thích và thao tác giỏ hiện có. Ảnh thiếu vẫn dùng minh họa và nhãn hiện có.

## Phần đã áp dụng

Trang chủ mới; dải danh mục vuốt ngang có snap, nút mũi tên, bàn phím và kéo chuột; lọc mua sẵn/đặt trước; tối đa 11 món và một thẻ Xem tất cả. Tên và vùng lấy từ dữ liệu thật, không tự gán nhãn Bán chạy/Quà biếu.

Đồng bộ header, danh mục, đăng nhập, thanh điều hướng điện thoại, cửa sổ sản phẩm, giỏ và đặt hàng. Bề mặt đặt hàng dùng nền ngà; nút mua chính champagne; nút thêm giỏ có viền. Đổi quy cách xóa ảnh đang chọn của quy cách cũ.

Giao diện có bố cục điện thoại, tablet, desktop; tôn trọng reduced motion. Không sửa giá, tồn, tài khoản, thanh toán, cơ sở dữ liệu hoặc quyền Admin.

## Giới hạn của đợt thiết kế

Dải mới là danh mục thường, không phải băng chuyền nổi bật được quản trị theo chủ đề. Chưa thay thế dữ liệu phương tiện bằng luồng duyệt Phase 2 hoặc xác nhận đủ 5 ảnh. Không thêm nút 3D giả, mô hình minh họa giả hay chứng nhận không có hồ sơ.

Các phần cần triển khai nghiệp vụ riêng theo SRS: quản trị phương tiện và duyệt quyền hình ảnh, chủ đề/sắp thứ tự, mô hình 3D thật, thư viện video/360°, bảng chọn nhanh có hoàn tác, checkout một màn và đo sự kiện. Checkout hiện tại vẫn là luồng đã có; đợt này chỉ đồng bộ bề mặt.

## Kiểm tra

- TypeScript và build sản xuất.
- Chromium với dữ liệu seed giả lập API, không ghi vào Supabase: trang chủ ở 320/375/768/1024/1440/1920 px; danh mục ở 375/1440 px không tràn ngang.
- Kiểm tra điều khiển băng chuyền bằng phím, lọc đặt trước, mở chi tiết và đi đến danh mục.
- axe WCAG 2 A/AA trên trang chủ; kiểm tra lỗi JavaScript.
- Ảnh xem trước lưu trong `artifacts/signature/` (không đưa vào Git). Kiểm tra trình duyệt không thay thế việc thử trên iPhone/Android thật.
