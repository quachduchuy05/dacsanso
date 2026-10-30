# Bổ sung Web Push và phiên thanh toán — 29/10/2026

Đợt này hoàn thiện mã cho FR-CSKH-10 và bổ sung đường kết nối outbound dùng chung cho thanh toán mua sẵn, cọc và phần còn lại. Chưa tuyên bố đã tích hợp một ngân hàng hoặc thu tiền thật. Xem trạng thái hiện hành tại [bảng đối chiếu](SRS_UNIFIED_COVERAGE_2026-10-29.md).

## Thông báo theo thiết bị

- Bảo mật tài khoản → Thông báo trên thiết bị: bật, tắt, xem/xóa thiết bị. Chỉ hỏi quyền trình duyệt khi người dùng bấm bật; tối đa 5 thiết bị/tài khoản. Root cũng quản lý được thiết bị của mình, không được thao tác nghiệp vụ.
- `GET/POST /api/v1/me/push` yêu cầu phiên đăng nhập; không nhận chủ tài khoản do client khai. Endpoint và khóa đăng ký không trả về trong danh sách thiết bị. Tài khoản khác không được chuyển chủ hoặc xóa đăng ký.
- Endpoint chỉ nhận HTTPS của các dịch vụ trình duyệt được hỗ trợ: FCM, Mozilla, Apple, Windows. Kiểm tra khóa P-256 và auth secret; hạn chế yêu cầu và không cho gửi đến URL nội bộ tùy ý.
- Service worker không lưu cache dữ liệu tài khoản. Thông báo chỉ nhắc mở ứng dụng; không đưa địa chỉ, số tiền, nội dung chat hay chi tiết đơn lên màn hình khóa. Đăng xuất gỡ đăng ký tại server và trình duyệt theo khả năng kết nối; tài khoản khóa/đóng/hết hạn không được gửi tiếp.
- Worker xử lý tối đa 10 lượt/tick, timeout gửi 5 giây, tối đa 5 lần thử có backoff; claim bằng transaction, metadata lưu trong `feature_records`. Mã thông báo ổn định giúp gộp lần gửi lại; không cam kết exactly-once nếu tiến trình dừng sau khi gửi trước khi lưu kết quả. Không phát lại thông báo cũ trước đăng ký hoặc quá 24 giờ. Dọn endpoint hết hiệu lực (404/410).
- Dùng cặp VAPID ổn định của đơn vị vận hành: `WEB_PUSH_SUBJECT` (email liên hệ dạng `mailto:` hoặc URL HTTPS), `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`. Chỉ public key được gửi đến frontend. Không đổi private key mỗi lần khởi động.
- Tạo cặp khóa bằng `npx web-push generate-vapid-keys`; lưu private key vào secret môi trường máy chủ, không đưa vào Git/chat. Không tự tạo danh tính liên hệ của doanh nghiệp.
- HTTPS là điều kiện của trình duyệt; localhost dùng để phát triển. Điện thoại qua IP LAN HTTP có thể không hỗ trợ. Cần nghiệm thu thêm trên thiết bị thật; iOS có thể yêu cầu cài web vào màn hình chính.

Tham khảo triển khai: [Web Push Node](https://github.com/web-push-libs/web-push), [đăng ký PushManager](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe).

## Kết nối phiên thanh toán

- `POST /api/v1/transactions/:id/session` chỉ cho khách sở hữu giao dịch đang chờ và còn hạn. Số tiền, loại thanh toán, hạn và mã giao dịch lấy từ database; không tin số tiền client gửi.
- Máy chủ gửi POST đến `PAYMENT_SESSION_URL`, bearer `PAYMENT_SESSION_TOKEN`, header `Idempotency-Key: payment-session:<transactionId>`, không theo redirect. Adapter do doanh nghiệp kiểm soát phải lưu khóa này và trả cùng phiên khi gửi lại, kể cả sau timeout.
- Payload: `{transactionId, kind, amount, currency:'VND', expiresAt, returnUrl}`. Không gửi số điện thoại, địa chỉ hoặc nội dung đơn không cần thiết.
- Phản hồi: `{transactionId, amount, currency:'VND', checkoutUrl, expiresAt}`. Giá trị phải khớp, hạn không được dài hơn giao dịch, URL phải HTTPS và origin nằm trong `PAYMENT_CHECKOUT_ORIGINS` (danh sách origin phân cách dấu phẩy). `PUBLIC_URL` phải HTTPS.
- Lưu và dùng lại phiên đã tạo; retry không kéo dài giữ hàng. Backend không đánh dấu đã trả tiền khi tạo phiên hoặc khi khách quay lại web. Chỉ webhook đã xác thực mới cập nhật kết quả như trước.
- Giao diện production có nút tiếp tục tới cổng thật; không hiện nút tự giả thành công/thất bại hoặc nhãn mô phỏng. Demo vẫn dùng QR và kết quả giả lập rõ ràng.
- Đây là hợp đồng kết nối adapter, **chưa phải adapter merchant của VNPay/MoMo/ngân hàng cụ thể**. Cần lựa chọn nhà cung cấp, triển khai phía adapter, cấu hình secret callback và thử giao dịch/hoàn tiền thật trước phát hành. Không tự ghi nhận tiền chỉ vì adapter nhận yêu cầu.

## Những phần không được tự coi đã duyệt

Các luồng hộp quà, khoảng ngày đặt trước, đổi/giao bù, điểm bàn giao và chứng từ chi trả đã có mã từ trước. Phạm vi kinh doanh, nơi nhận thật và đơn vị chịu phí vẫn cần dữ liệu vận hành. Chưa có căn cứ để tự xóa/ẩn danh dữ liệu lịch sử hoặc áp tỷ lệ giữ tiền của HTX.

Đề xuất cho giai đoạn đầu để chủ dự án xem xét: chưa thu thêm phí cổng từ HTX, chưa áp holdback hoặc ngưỡng tối thiểu; chỉ đưa vào kỳ các đơn đã đủ điều kiện hoàn tất như hiện tại. Đây là đề xuất, không phải chính sách đã kích hoạt. Thời hạn lưu dữ liệu cần đơn vị chịu trách nhiệm xác nhận; không tự đặt số năm.

Chưa sẵn sàng bán hàng thật nếu thiếu SMS, merchant, HTTPS, VAPID và nghiệm thu backup/khôi phục/tải. `npm run check:production` tiếp tục báo các mục chưa đủ, không bị sửa để vượt kiểm tra.

## Kết quả kiểm tra

- 259 kiểm thử nghiệp vụ và 96 kiểm thử backend đạt, bao gồm SQLite, PostgreSQL, quyền sở hữu, chống gửi/thu lặp, retry và từ chối thông tin gateway sai.
- 30 kiểm thử trình duyệt hiện có đạt; thêm 1 kiểm thử bật thông báo và gỡ thiết bị khi đăng xuất đạt. Transport Web Push ở bài kiểm thử được giả lập, không khẳng định thiết bị thật đã nhận.
- Sửa đăng xuất để xóa phiên local ngay trước khi chờ mạng gỡ thiết bị/thu hồi phiên. Không còn phụ thuộc tốc độ mạng mới đưa người dùng về trạng thái đã đăng xuất.
- Kiểm tra production chạy được và trả `ready:false` đúng với các cấu hình thật còn thiếu. Số FR còn mở trong bảng hiện là 8/82; chưa tính việc nghiệm thu dịch vụ và NFR.
