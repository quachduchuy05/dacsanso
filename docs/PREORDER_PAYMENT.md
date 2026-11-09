# Thanh toán cọc đặt trước

Ngày 09/11/2026, người dùng xác nhận giữ mức cọc 30% theo SRS. Không thay cấu hình đang vận hành hoặc sửa bản chốt đơn cũ.

- Cọc = 30% × (tiền hàng sau giảm + hộp quà), làm tròn lên theo tham số (mặc định 1.000đ). Không tính phí giao vào cơ sở cọc.
- Phần còn lại = tổng đơn − cọc, đã gồm phí giao. Không cộng phí giao lần nữa khi thu phần còn lại.
- Cọc luôn online; phần còn lại online khi HTX báo sẵn sàng hoặc COD nếu đủ điều kiện hiện hành. Hàng có sẵn giữ luồng thu đủ online hoặc COD, không thu cọc.
- Màn đặt hàng và chi tiết đơn có lịch hai đợt kèm tỷ lệ, cơ sở tính và bước làm tròn. Chi tiết dùng tỷ lệ đã chốt trên đơn. Footer checkout hiện cả khoản online trả sau.
- Cổng thanh toán hiện tỷ lệ cọc của từng đơn và phần còn lại; giao dịch thu phần còn lại nói rõ không thu lại cọc. Chỉ callback máy chủ hợp lệ xác nhận tiền thật; UI không tự đánh dấu đã trả.
- Chặn cấu hình tỷ lệ cọc ngoài (0,100] và bước làm tròn không nguyên dương. Thay cấu hình không đổi số tiền đơn đã tạo.
- Các bài kiểm thử bao gồm 500.000đ → cọc 150.000đ, còn 350.000đ + 28.000đ giao; COD cũng phải cọc online; callback trùng không cộng tiền hai lần; đơn giữ tỷ lệ cũ khi tham số thay đổi. Trình duyệt xác nhận đơn tạo ra giao dịch cọc pending, chưa nhận tiền trước callback.

Nhà cung cấp thanh toán thật chưa được cung cấp. Tài liệu này không xác nhận đã thu tiền thật hoặc đã nghiệm thu merchant.
