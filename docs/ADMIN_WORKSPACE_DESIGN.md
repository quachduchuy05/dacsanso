# Giao diện Admin gọn hơn

- Menu chia 6 nhóm: Tổng quan; Bán hàng & giao nhận; Sản phẩm & nhà cung cấp; CSKH; Tài chính; Hệ thống. Các chức năng được lọc theo nhóm quyền sẵn có, không mở thêm quyền.
- Tìm chức năng không phân biệt dấu; tìm theo tên, nhóm và mô tả. Có trạng thái không tìm thấy và nút xóa tìm kiếm.
- Trang tổng quan hiển thị các hàng đợi theo dữ liệu hiện tại và các lối tắt. Chỉ hiển thị hàng đợi thuộc chức năng tài khoản được truy cập. Số sản phẩm chờ duyệt tính theo trạng thái sản phẩm; không gộp số yêu cầu thay đổi giá cũ.
- Báo cáo/biểu đồ nằm trong phần mở rộng. Chỉ mount và tải báo cáo sau khi mở; giữ các bộ lọc, xuất dữ liệu và kiểm tra snapshot hiện có.
- Trang chức năng có tiêu đề, mô tả ngắn, nhóm hiện tại và nút trở lại Tổng quan.
- Trên điện thoại, menu thu gọn thành nút mở; chọn chức năng tự đóng menu. Bảng rộng cuộn trong vùng bảng.
- Bảo mật tài khoản chuyển từ dải riêng phía trên trang vào nhóm Hệ thống. Chức năng bảo mật của các vai trò khác giữ nguyên.
- Chàm nhạt và nền xám trắng cho không gian làm việc. CSS giới hạn trong `.admin-shell`/`.admin-workspace`, không thay giao diện HTX, QLNN và shipper.

Không đổi nghiệp vụ hoặc API. Admin vẫn chỉ phân công shipper; shipper tự cập nhật giao hàng. Không thay tài khoản, dữ liệu, đối soát hoặc luồng tiền.

Kiểm tra: TypeScript; build qua Playwright webServer; 3 kịch bản `e2e/admin-workspace.e2e.ts` với API giả lập, không ghi Supabase; reflow 320–1440 px; axe WCAG A/AA trên workspace desktop không ghi nhận lỗi. Ảnh xem trước ở `artifacts/admin/` được Git bỏ qua.
