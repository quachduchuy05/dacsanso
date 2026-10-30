# Chuẩn bị vận hành bán hàng thật

Cập nhật: đã có Web Push theo thiết bị và hợp đồng outbound tạo phiên thanh toán. Cần cấu hình VAPID, adapter merchant của doanh nghiệp và nghiệm thu dịch vụ thật; xem [hướng dẫn kết nối](SRS_PUSH_PAYMENT_2026-10-29.md).

Trạng thái hiện tại: **chưa sẵn sàng nhận giao dịch thật**. Có backend, bảo vệ giao dịch, công cụ backup và kiểm tra cấu hình; còn thiếu môi trường triển khai và kết nối nhà cung cấp. Không bật demo để vượt các lỗi cấu hình. Phạm vi hiện hành theo [SRS hợp nhất 29/10](SRS_IMPLEMENTATION_2026-10-29.md): giai đoạn 1 dùng shipper nội bộ và ghi nhận chi trả thủ công có chứng từ; không bắt buộc API hãng vận chuyển hoặc tự động chi tiền.

## Kiểm tra trước triển khai

Chạy từ thư mục chứa `package.json`:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run test:backend
npm.cmd run build
npm.cmd run check:production
```

`check:production` chỉ đọc cấu hình và in trạng thái, không in giá trị khóa/token. Mã thoát 1 nghĩa là còn hạng mục chặn hoặc cần xác minh. Dù điền đủ URL/secret, công cụ vẫn không tuyên bố đã tích hợp nhà cung cấp: outbound thu/hoàn tiền cần được triển khai và kiểm chứng riêng. Chi trả thủ công và shipper nội bộ theo SRS giai đoạn 1 không yêu cầu adapter chi trả/vận chuyển. Chưa đo tải hoặc chứng nhận cloud thật.

## Cấu hình hạ tầng và tài khoản

- `DEMO_MODE=false`, database production riêng, `DATA_ENCRYPTION_KEY` 64 ký tự hex. Giữ khóa trong secret manager/môi trường máy chủ, bản sao khóa ngoài nơi lưu database. Không đưa khóa vào frontend hoặc Git.
- `PUBLIC_URL` là origin HTTPS thực. `ALLOWED_ORIGINS` chỉ gồm origin HTTPS của website. Đặt reverse proxy HTTPS trước backend, dùng ổ lưu bền vững.
- SQLite: một backend, cùng volume database/WAL. Chưa hỗ trợ nhiều replica. PostgreSQL: cấu hình Supabase và chạy `npm.cmd run supabase:migrate`, bao gồm `202610280002_audit_trace.sql`.
- Khi database còn trống, cấu hình SĐT Root bằng `BOOTSTRAP_ADMIN_PHONE`, chạy `npm.cmd run account:bootstrap`, mở link một lần để tự đặt mật khẩu. Chi tiết: `PASSWORD_LOGIN.md`.
- Build Google/Supabase với đúng biến frontend trước khi triển khai. Kiểm thử OAuth trên tên miền thật; kiểm thử giả lập trong repo không thay cho bước này.

## SMS và khôi phục tài khoản

`SMS_OTP_URL` trỏ đến adapter HTTPS do máy chủ kiểm soát, `SMS_OTP_TOKEN` là bearer token riêng. Backend POST JSON `{phone, code, expiresIn:120}`. Adapter chuyển sang API của hãng SMS, chỉ trả 2xx khi nhà cung cấp chấp nhận gửi. Backend không trả mã OTP cho trình duyệt trong production; gửi lỗi thì xóa challenge và trả 502, thiếu cấu hình trả 503.

`ACCOUNT_LINK_DELIVERY_URL` và `ACCOUNT_LINK_DELIVERY_TOKEN` là kênh gửi link đặt lại mật khẩu riêng đến SĐT đã đăng ký; payload `{phone,link,expiresAt}`. Có thể cùng hạ tầng SMS nhưng cần adapter hiểu đúng từng hợp đồng. Không ghi nội dung OTP/link/token vào access log. SĐT khách đăng ký bằng mật khẩu hiện chưa được xác minh quyền sở hữu; chính sách xác minh SĐT cần chốt trước mở đăng ký công khai.

Chưa có tên hãng SMS/Brandname, API endpoint và tài khoản nhà cung cấp được xác nhận. Từ “SMS” không xác định một API cụ thể. Chưa gửi SMS thật từ phiên làm việc này; đã kiểm thử qua HTTP adapter giả lập.

## Sao lưu và khôi phục SQLite

```powershell
npm.cmd run backup:create
npm.cmd run backup:create -- data/backups/ban-sao-rieng.sqlite
npm.cmd run backup:restore -- data/backups/ban-sao-rieng.sqlite data/restored-production.sqlite
```

Sao lưu dùng SQLite Online Backup qua [API Node.js](https://nodejs.org/api/sqlite.html#sqlitebackup-sourcedb-path-options), có thể đọc database đang chạy. Tệp mới không ghi đè tệp đã có. Tạo manifest SHA-256 và kiểm tra SQLite integrity cùng khả năng giải mã dữ liệu trước khi báo thành công. Chỉ sử dụng bản sao có manifest hoàn tất. Nếu việc backup thất bại, có thể còn tệp chưa hoàn chỉnh; chọn tên mới và kiểm tra lỗi thay vì ghi đè.

Khôi phục kiểm tra checksum/khóa, chỉ tạo database đích **chưa tồn tại**, thu hồi phiên local, OTP, link đặt mật khẩu và lease chỉnh sửa; giữ idempotency receipts và ledger/audit. Công cụ không đổi `DATABASE_PATH` và không thay database đang chạy. Quy trình chuyển đổi: dừng backend, khôi phục sang tên mới, kiểm tra, đổi `DATABASE_PATH`, khởi động lại và thử các luồng quan trọng. Giữ database cũ để rollback. Supabase/Auth bên ngoài phải quản lý/thu hồi phiên ở nhà cung cấp riêng.

Lập lịch backup trên máy triển khai sau khi chọn host. Sao chép bản backup và manifest ra vùng lưu riêng có kiểm soát quyền, thử restore định kỳ ở môi trường cách ly. Hash phát hiện thay đổi so với manifest, không là chữ ký số; phải bảo vệ cả manifest và backup. Với PostgreSQL/Supabase dùng backup/PITR của nhà cung cấp và kiểm thử phục hồi riêng; CLI này chủ động từ chối PostgreSQL. Chưa cấu hình lịch backup hoặc lưu ngoài máy chủ từ phiên này.

## Nghiệp vụ và kiểm chứng trước mở bán

- Đối soát CSV: mỗi dòng là tổng tiền của một đơn. Chọn phạm vi **ngày đặt đơn** đầy đủ để tìm đơn thiếu; không dùng ngày giao dịch của đối tác thay cho ngày đặt đơn. Nếu hãng báo từng giao dịch/các khoản thu nhiều lần thì cần bộ chuyển đổi/gộp theo đơn. Ghi kết luận điều tra không tự xác nhận thu/hoàn tiền.
- Kiểm thử các webhook với chứng từ của merchant sandbox, gồm trùng event, lệch số tiền, sai chữ ký, hết hạn, retry. Sau đó kiểm thử số tiền nhỏ bằng merchant thật theo quy trình của đơn vị vận hành.
- Không coi nút demo, CSV tự nhập hoặc việc đặt đơn thành công là bằng chứng đã chuyển tiền. Outbound thật, đối soát ngân hàng đầy đủ và quy trình duyệt tài chính vẫn là hạng mục mở.
- Kiểm thử quyền chéo HTX/khách, SMS thất bại, mất kết nối, backup/restore, thoát/thu hồi phiên và lưu dữ liệu sau restart trên hạ tầng thực.

Các phụ thuộc để làm tiếp: tên hãng SMS/Brandname; merchant thanh toán; quy trình bàn giao shipper nội bộ và chứng từ chi trả; hóa đơn nếu cần; nơi đặt máy chủ/tên miền; chính sách giữ tiền, hoàn một phần, phí, SLA và phạm vi địa bàn. API hãng vận chuyển/chi trả tự động là ngoài phạm vi giai đoạn 1. Cấu hình khóa trực tiếp ở môi trường triển khai, không gửi bí mật trong chat.
