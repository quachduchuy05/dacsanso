# Redesign Đặc Sản Số — 09/11/2026

Nguồn yêu cầu: tài liệu “YÊU CẦU REDESIGN TOÀN DIỆN WEBSITE ĐẶC SẢN SỐ” người dùng đính kèm ngày 09/11/2026. Bản này thay hướng màu kem–mật ong trước đó bằng xanh rừng–ngà ấm; không thay kiến trúc dữ liệu hoặc backend.

## Nhận diện

Token tại `src/forest-commerce.css`: Forest `#163D2B`, Deep `#10291F`, Paper `#F7F4EC`, Gold `#B69A64`, Ink `#252923`, Sage `#DCE5D8`. Newsreader cho tiêu đề, Plus Jakarta Sans cho giá/biểu mẫu và điều khiển. Thay stylesheet `warm-theme.css`; giữ các thành phần và API hiện hành.

## Thay đổi trải nghiệm

- Hero bất đối xứng, ảnh sản vật tĩnh, một CTA “Khám phá đặc sản”, liên kết câu chuyện phụ. Tiêu đề/nội dung từ cấu hình trang chủ vẫn hoạt động. Không thêm carousel tự chạy.
- Header sticky có trạng thái khi cuộn, tìm kiếm và giỏ khách vãng lai giữ nguyên; điều hướng tôn trọng reduced motion, điểm neo có khoảng trống dưới header.
- Thẻ sản phẩm tối giản, giá bằng sans-serif, vùng miền, tồn có thể mua hoặc trạng thái đặt trước; ảnh do máy chủ duyệt được ưu tiên. Loại bỏ đường ảnh phong cảnh gán cứng theo mã sản phẩm ở thẻ, dùng ảnh sản phẩm hoặc concept hiện có khi thiếu ảnh.
- Vùng miền dùng sản phẩm thực trong danh mục, ảnh bất đối xứng và liên kết trực tiếp vào tìm kiếm; không tự khẳng định địa điểm chụp hoặc người sản xuất. Những vùng còn lại là liên kết chữ, không bỏ dữ liệu vùng.
- Tuyển tập có chủ đề do Admin gán và đủ ảnh đã duyệt giữ điều kiện cũ; gom thành một khu vực với lựa chọn chủ đề, tránh ba băng chuyền lặp liên tiếp. Không tự bịa số bán hay xếp hạng.
- Chân trang chung cho home/catalog có điều hướng, giỏ, đăng nhập, hỗ trợ và bảng chính sách. Thời hạn đổi trả/cọc lấy từ tham số hệ thống; không tạo địa chỉ, SĐT hay chứng nhận giả.
- Danh mục có trạng thái đang tải/lỗi và thử lại. Mobile có nút đóng bộ lọc, Escape và aria-controls. “Đặt lại/Xem tất cả” bỏ toàn bộ điều kiện và từ khoá; không đổi quy tắc lọc, giá hoặc API.
- Chi tiết thêm sản phẩm liên quan cùng danh mục/nhà cung cấp khi có, loại trừ nhóm quy cách đang xem, chỉ dùng sản phẩm đang bán; mở bằng modal hiện hành. Các luồng tồn, đặt hàng, cọc 30%, callback, 3D và quyền Admin không thay đổi.
- Nền/biểu mẫu/giỏ/checkout/login cùng nhận diện; màu trạng thái lỗi vẫn phân biệt. Workspace Admin/HTX/Shipper không đổi cấu trúc.

## Kiểm tra

Trình duyệt kiểm tra home/catalog/login ở 320, 375, 768, 1024, 1440, 1920 px: không tràn ngang. Axe WCAG A/AA trên ba trang không ghi nhận vi phạm tại lượt đo; không thay thế đánh giá accessibility thủ công toàn bộ app.

Các kịch bản trong `e2e/phase2.e2e.ts` gồm vùng miền → tìm kiếm → bộ lọc mobile → chính sách, giỏ khách, đăng nhập, phản hồi chậm/rollback, mua ngay, tạo cọc 30%, 3D tải khi kích hoạt và dự phòng 360°. Dữ liệu mô phỏng chỉ có trong kiểm thử, không đưa vào API chạy thật.

Ảnh chụp kiểm tra nằm trong thư mục `artifacts/forest-commerce` được gitignore. Bộ ảnh đã tạo trước đó giữ nguyên nguồn/prompt tại các tài liệu GENERATED_3D và WARM_STOREFRONT_THEME; không có ảnh AI mới phát sinh trong redesign này.
