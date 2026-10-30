# Triển khai theo SRS hợp nhất — 29/10/2026

Nguồn người dùng cung cấp đã lưu nguyên văn tại [SRS_UNIFIED_2026-10-29.md](SRS_UNIFIED_2026-10-29.md). [Bảng đối chiếu 82 FR](SRS_UNIFIED_COVERAGE_2026-10-29.md) ghi mã, ưu tiên, bằng chứng và giới hạn từng mục; ba FR Shipper đề xuất ở mục 11.3 được ghi riêng. Không dùng số lượng UC “chưa có” trong SRS để kết luận code chưa có tương ứng.

## Thay đổi quyền và luồng sản phẩm

- Chất lượng quản lý tạo/nháp/đăng, nội dung, giá, chứng nhận, đặt trước và hỏa tốc. API mới `/api/v1/catalog/products`; form chọn HTX đã duyệt. Kiểm tra tên/mô tả/giá/ảnh/quyền, ghi lịch sử trước–sau. Nội dung chỉ nhận các trường được phép, không cho chèn giá, tồn, trạng thái hoặc đổi chủ HTX bằng payload sửa mô tả.
- HTX chỉ xem sản phẩm, cập nhật tồn và báo thu hoạch, xem nguồn gốc. Các RPC tạo/sửa/ẩn/đổi giá/chứng nhận/cấu hình sản phẩm của HTX nhận 403. Helper domain cũ còn để tái sử dụng kiểm tra bên trong server và xử lý dữ liệu cũ, không còn là quyền gọi RPC.
- Lease biên tập chuyển sang Chất lượng, vẫn theo nhóm quy cách/TTL 5 phút và token riêng. Nháp sản phẩm thuộc nhân viên Chất lượng; nháp HTX cũ không tự chuyển chủ hoặc công khai cho tài khoản khác.
- Các yêu cầu chờ duyệt từ phiên bản cũ được giữ để Chất lượng xử lý; luồng HTX gửi yêu cầu mới đã đóng. Chọn mặc định nhập/đăng bởi Chất lượng theo hướng OI-21, chưa tuyên bố cơ chế hai người duyệt đã được phê duyệt.
- Root tạo tài khoản Admin, phân quyền, xem audit và tham số chỉ đọc. Không còn cơ chế Root được giả nhóm để làm mọi nghiệp vụ. Vận hành không được tạo hay cấp link lấy lại mật khẩu Admin. Root không cấp tài khoản HTX/QLNN/Shipper hoặc lấy quyền tài khoản người mua/bán bằng link.
- Mỗi HTX chỉ một tài khoản đại diện qua luồng cấp tài khoản; MST duy nhất ở hồ sơ HTX đã có từ đợt trước. QLNN cấp mới cần ngày hết hạn; phiên và đăng nhập bị từ chối khi tài khoản có hạn đã hết. Tài khoản QLNN lịch sử chưa có `expiresAt` cần được rà soát dữ liệu trước production, không tự điền một ngày giả định.

## Tài khoản và bảo mật

- Tên tài khoản tự sửa được cho mọi vai trò. Đổi SĐT yêu cầu mật khẩu riêng hiện tại và OTP mới; kiểm trùng tại server, cập nhật tài khoản/khách và thu hồi phiên local/link cũ. Không thay thông tin người nhận đã chốt trên các đơn cũ. Tài khoản OAuth chưa có mật khẩu riêng cần thiết lập trước; chưa kiểm chứng quản lý thiết bị/thu hồi tất cả phiên ở provider cloud.
- OTP hết hạn 120 giây, giới hạn yêu cầu 3/15 phút theo số; cooldown 60 giây và tối đa 5 lần thử giữ nguyên. Khách/HTX có luồng khôi phục bằng OTP riêng, dùng một lần, không dùng nhầm challenge đăng ký/đổi số. Admin giữ luồng link riêng.
- Mật khẩu mới dùng Bcrypt cost 12; mật khẩu scrypt lịch sử vẫn xác minh được. Không tự thay mật khẩu hoặc làm mất khả năng đăng nhập của người cũ. Giới hạn 8–32 ký tự, kiểm tra giới hạn 72 byte để Bcrypt không cắt ngầm; xem [tài liệu thư viện](https://github.com/dcodeIO/bcrypt.js#security-considerations).
- Tối đa 3 phiên local đang lưu theo tài khoản. Đây chưa phải giới hạn 3 thiết bị native/Supabase: bảng thiết bị/provider phải làm cùng dịch vụ thông báo và Auth đã chọn.
- CSKH/nhóm Admin khác không nhận object ngân hàng hoàn tiền của khách qua projection; khách xem của mình, Tài chính xem đầy đủ. Root không nhận đơn/khách/tài chính nguồn trong state như trước.
- Cập nhật theo yêu cầu làm tiếp SRS: đăng ký SĐT/mật khẩu đã bắt buộc OTP purpose register, đúng số và dùng một lần; lưu phoneVerifiedAt. Đăng nhập mật khẩu/Google vẫn được giữ; tài khoản cũ và tài khoản Google không tự được đánh dấu đã xác minh SĐT. SMS thật và phương thức cuối OI-03 cần nghiệm thu.

## Tài chính và báo cáo

- HTX xuất summary/orders/settlements riêng; server ép coopId đúng tài khoản, chặn đổi phạm vi và kiểm lại khi tải. Không xuất tên/SĐT/địa chỉ người nhận. Root chỉ xuất audit. Tài chính/Vận hành xuất theo nhóm; CSKH giữ phần xuất ticket/review hỗ trợ đã có, không xuất tài chính.
- Chi trả theo GD-03: nhân viên Tài chính chuyển khoản ngoài hệ thống rồi nhập mã chứng từ, số tiền đúng kỳ, căn cứ và xác nhận đã kiểm tra. Không gọi API chuyển tiền hoặc coi click là xác nhận từ ngân hàng. Ghi lặp cùng kỳ/chứng từ không thêm sổ; chứng từ khác cho kỳ đã trả bị từ chối. Cần kiểm chứng vận hành với chứng từ thật khi triển khai.
- Kỳ mới lưu riêng tiền hàng/hoa hồng/phí giao/tiền hoàn; bảng HTX/Tài chính và file đối soát hiển thị bốn khoản. Phí giao không cộng vào tiền HTX. Kỳ lịch sử thiếu phí ship được đánh dấu chưa lưu, không ghi đè snapshot cũ.
- Mọi đường `db.save` bình thường kiểm tra dòng sổ cũ và nội dung kỳ đã chốt không bị sửa/xóa; kỳ đã trả được giữ nguyên. Điều chỉnh phải thêm dòng mới. Reset tài chính chỉ có nhánh server của công cụ reset demo được cấp quyền, không dùng được khi tắt demo. Đây là kiểm soát của lớp ứng dụng với aggregate hiện có, chưa là SQL ledger chuẩn hóa chống sửa bởi quản trị database.
- Số liệu tổng hợp có thêm sản phẩm có chứng nhận đã xác minh còn hạn, dùng cùng thời điểm trong snapshot/xuất. Không gọi chỉ tiêu này là chứng nhận do app tự cấp hoặc tự xác nhận nguồn gốc thay cơ quan nhà nước.

## Nội dung và danh mục

- Vận hành quản lý banner, tiêu đề/mô tả và bộ sưu tập tối đa 12 sản phẩm đang bán; public storefront nhận từ server. Đây là CMS cơ bản một banner/bộ sưu tập, chưa phải hệ thống chiến dịch nâng cao.
- Địa phương, đơn vị tính và loại chứng nhận có danh mục trạng thái; không đổi/ẩn mục đang được dùng ở sản phẩm đang bán. Form sản phẩm gợi ý địa phương/đơn vị. Quản trị danh mục sản phẩm đã có được gắn lại vào màn Danh mục dùng chung.
- Sản phẩm lưu link QR do HTX cung cấp, chỉ HTTP/HTTPS, có thể mở ngoài trang nguồn gốc. Đây là liên kết theo OI-17, không đồng bộ dữ liệu cổng truy xuất của tỉnh.
- FAQ công khai cho khách/vãng lai; tìm kiếm có tên danh mục; lọc còn hàng/suất; đặt lại bộ lọc giữ danh mục. Bổ sung gắn cờ đánh giá nhắc QR/nguồn gốc bất thường, không tự ẩn đánh giá vì sao thấp.

## Những mục chưa được coi là hoàn tất

1. FR-TK-05: đã thêm gửi/rút yêu cầu xóa của khách/HTX và Vận hành kiểm tra, ghi chú/lịch sử; chưa thực thi xóa/ẩn danh tài khoản và lưu đơn/sổ/backup vì chính sách chưa chốt OI-19. Không tự xóa dữ liệu tài chính để đánh dấu đạt FR.
2. FR-CSKH-11 đã được bổ sung thành đánh giá HTX riêng. Luồng Could chưa có UC chi tiết nên các mặc định dùng chung quy tắc đánh giá sản phẩm cần được nghiệm thu.
3. Holdback nhiều kỳ, phí cổng/hoàn/phần trách nhiệm, ngưỡng chi trả, chỉ tiêu kinh doanh, giờ làm việc cho SLA và các OI/CX còn mở chưa tự chốt. Các công thức hiện có tiếp tục là tham số, không coi là đã được PO phê duyệt.
4. Tích hợp cổng online/hoàn tiền, SMS/ZNS, push theo thiết bị và hạ tầng thật theo mục 10 chưa có nhà cung cấp/credentials được xác nhận. Không còn xếp API vận chuyển hoặc chi trả tự động là thiếu bắt buộc giai đoạn 1.
5. Đã có queue xuất nền bền vững với FAILED/retry; khả năng xuất lớn/streaming, phạm vi địa bàn QLNN, thiết bị native/cloud, tải/HA và SLA/RPO/RTO thực tế chưa được chứng minh. Dữ liệu chi tiết/ERD, nhiều quyền Admin, Admin làm thay và CSKH xem chat đang chờ các OI của SRS; không mở thêm quyền theo phỏng đoán.

Vì những ranh giới này, không tuyên bố hoàn thành 100% toàn bộ SRS hay sẵn sàng bán hàng thật chỉ từ kết quả kiểm thử cục bộ.

## Kiểm chứng cuối ngày 29/10

- `npm.cmd run lint`: đạt kiểm tra TypeScript.
- `npm.cmd run build`: thành công; còn cảnh báo bundle chính vượt 500 kB, chưa phải chứng minh hiệu năng production.
- `npm.cmd test`: 258/258 kiểm thử đạt trong 36 file.
- `npm.cmd run test:backend`: 65/65 kiểm thử đạt, gồm quyền Quality/Root, OTP, phạm vi báo cáo, chứng từ chi trả và bảo vệ sổ.
- `npm.cmd run e2e`: 12/12 kiểm thử trình duyệt đạt. Cập nhật kiểm thử tìm kiếm để xác nhận cả tìm danh mục “chế biến” và tìm riêng “chè shan”; tìm không dấu khiến từ “chè” cũng khớp “chế biến” theo hành vi mới.
- `node scripts/audit-unified-srs.mjs`: tạo bảng 82 FR. Đây là đối chiếu mã và khoảng trống, không phải biên bản nghiệm thu mọi nhánh SRS.

Các kiểm tra dùng môi trường thử nghiệm, không gửi SMS hoặc chuyển tiền thật và không triển khai lên máy chủ bán hàng.
