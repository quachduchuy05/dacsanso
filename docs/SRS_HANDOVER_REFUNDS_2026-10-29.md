# Đối chiếu và bổ sung bàn giao / hoàn tiền — 29/10/2026

> Đợt sau đã chốt chỉ shipper tự cập nhật và bổ sung đóng quyền truy cập theo yêu cầu. [Kết quả mới nhất](SRS_ACCESS_DECISION_2026-10-29.md) và bảng đối chiếu hiện ghi 9 FR mở; số 10 bên dưới là của đợt bàn giao/hoàn tiền.

Đối chiếu nguồn SRS hợp nhất đã lưu trong repo. Hai khoảng trống được bổ sung: thông tin điểm nhận cụ thể của đơn và ghi nhận chứng từ hoàn ngân hàng ngoài hệ thống. [Bảng FR hiện tại](SRS_UNIFIED_COVERAGE_2026-10-29.md) còn 10/82 FR đánh dấu mở/khác đặc tả; số này không thay cho nghiệm thu UC/NFR hoặc xác nhận đã sẵn sàng bán hàng thật.

## Điểm nhận, bàn giao hàng — FR-DH-09

- Vận hành vào **Giao hàng**, nhập tên điểm, địa chỉ, người/SĐT bàn giao, hướng dẫn và lý do cho từng đơn. Không tự điền hub/địa chỉ thực chưa được đơn vị vận hành xác nhận.
- Cho nhập khi đơn đã xác nhận, chờ thu hoạch, chuẩn bị hoặc đang giao nhưng shipper chưa lấy; chặn sau lấy hàng, sau báo giao thành công hoặc khi đơn kết thúc.
- HTX của đơn và shipper được phân công nhận thông báo và xem điểm nhận trong chi tiết đơn. Người mua, shipper khác và các nhóm Admin không xử lý vận chuyển không nhận object điểm nhận qua state API.
- Có link gọi người bàn giao và mở điểm nhận trên bản đồ; không tự tính hoặc thu phí chặng trung chuyển. Ghi audit trước/sau kèm lý do, không sửa phí hay thông tin giao cho khách.
- FR này vẫn để mở về vận hành: phải chốt địa điểm thật, bên trả cước và trách nhiệm chặng Lào Cai–Hà Nội theo OI-20. Không bắt buộc trường mới cho dữ liệu đơn cũ khi SRS chưa chốt SOP bàn giao.

API: `POST /api/v1/orders/:id/pickup-point` với `{name,address,contactName,contactPhone,note,reason}`; server chỉ nhận tài khoản Vận hành.

## Ghi nhận hoàn ngân hàng — FR-DH-12

- Tài chính vào **Hoàn tiền**, bắt đầu xử lý khoản hoàn, sau đó ghi mã chứng từ/căn cứ cho khoản hoàn có đích tài khoản ngân hàng. Không thay nút xác nhận bằng một thao tác giả chuyển tiền.
- Chỉ ghi khi nhân viên đã kiểm tra chuyển khoản ngoài hệ thống. Server kiểm tra số tiền nguyên VND khớp khoản hoàn, tài khoản hiện tại khớp số đã hiển thị cho nhân viên, có mã chứng từ, căn cứ tối thiểu 20 ký tự và xác nhận rõ ràng.
- Không ghi cho khoản chưa bắt đầu; không áp dụng cho hoàn về nguồn thanh toán ban đầu. Luồng hoàn nguồn gốc tiếp tục chờ kết quả từ cổng.
- Gửi lại cùng khoản/chứng từ không thêm dòng tiền; chứng từ khác cho khoản đã hoàn hoặc chứng từ đã dùng cho khoản khác bị chặn.
- Dòng sổ cũ và kỳ đã chốt giữ nguyên; thêm một dòng hoàn tiền, lưu mã chứng từ thật thay mã mô phỏng và gửi thông báo trạng thái đơn. Bản chứng cứ nội bộ mã hóa trong feature_records, chỉ giữ bốn số cuối tài khoản, không đưa ghi chú chứng từ hoặc số tài khoản vào projection khách/HTX/CSKH.
- Chỉ Tài chính được thực hiện; Root, Vận hành và các vai trò khác bị chặn ở server. Có kiểm chứng cả khi DEMO_MODE=false, không dùng nhánh bỏ qua xác thực.
- Đây là ghi nhận thủ công chứng từ do nhân viên kiểm tra, không phải xác minh tự động từ ngân hàng. Hệ thống không gửi tiền. Vẫn cần lựa chọn/kiểm thử merchant cho thu, cọc, trả phần còn lại và hoàn về nguồn gốc tự động trước production.

API: `POST /api/v1/refunds/:id/record` với `{amount,accountNumber,reference,note,confirmed:true}`. Số tài khoản chỉ phục vụ kiểm tra trùng người nhận hiện tại, không lưu vào bản chứng cứ; frontend chỉ hiển thị tài khoản trong phạm vi Tài chính đã có.

## Phần còn lại

FR-TK-05 (thực thi xóa/ẩn danh theo chính sách lưu trữ); FR-MHTT-03/05/07 (dịch vụ thu/cọc/thanh toán còn lại); FR-MHTT-04 (phạm vi hộp quà); FR-DH-05 (đổi hàng); FR-DH-09 (trung chuyển thực tế); FR-DH-14 (Admin làm thay); FR-CSKH-10 (push thiết bị); FR-DT-02 (holdback/phí/ngưỡng chi trả).

Các phần này có luồng mã hiện hành ở mức khác nhau, không đồng nghĩa còn mười màn hình trắng. Các quyết định chưa chốt và dịch vụ chưa có không được thay bằng giả định tài chính, xóa dữ liệu đơn hoặc mở quyền giả danh.

Không thay cơ sở dữ liệu đang chạy bằng dữ liệu kiểm thử; các trường mới không bắt buộc nên dữ liệu lịch sử tiếp tục đọc được. Cần kiểm thử quy trình với chứng từ/địa điểm thực tế ở môi trường triển khai.

## Kết quả kiểm chứng

- TypeScript và build đạt; bundle chính vẫn có cảnh báo kích thước, chưa chứng minh hiệu năng production.
- 259/259 kiểm thử nghiệp vụ, 79/79 backend (gồm PostgreSQL/PGlite cho hai tính năng mới), 17/17 trình duyệt đạt.
- Kiểm thử HTTP có trường hợp DEMO_MODE=false cho ghi chứng từ hoàn thủ công. Không gửi tiền, SMS, thay dữ liệu Supabase hoặc triển khai production trong lượt này.
