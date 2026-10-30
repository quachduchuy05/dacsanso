# Đặc Sản Số – frontend và backend

**Bổ sung bàn giao/hoàn tiền:** Vận hành nhập điểm nhận theo đơn; HTX/shipper được phân công xem và nhận thông báo. Tài chính ghi chứng từ hoàn ngân hàng đã kiểm tra, chống trùng. [Chi tiết và phần còn mở](docs/SRS_HANDOVER_REFUNDS_2026-10-29.md); bảng đối chiếu mới nhất còn 9/82 FR để mở, không phải xác nhận nghiệm thu toàn bộ dự án.

**Bổ sung tiếp SRS:** có đánh giá HTX riêng, tiếp nhận/rút/xử lý yêu cầu xóa tài khoản, xuất báo cáo nền có thử lại, OTP bắt buộc khi đăng ký SĐT và đề xuất/duyệt bút toán chênh lệch. [Chi tiết bổ sung và giới hạn](docs/SRS_FOLLOWUP_2026-10-29.md). Bảng hiện ghi 9/82 FR còn mở/khác đặc tả; chưa thực thi xóa dữ liệu khi OI-19 chưa chốt.

**SRS hợp nhất 29/10:** đã chuyển quản lý sản phẩm sang Admin – Chất lượng, giới hạn Root và sửa luồng tài khoản/tài chính. Xem [thay đổi và phần còn mở](docs/SRS_IMPLEMENTATION_2026-10-29.md) và [bảng đối chiếu 82 FR](docs/SRS_UNIFIED_COVERAGE_2026-10-29.md). Các mô tả prototype cũ không thay thế quyền hiện hành.

**Chuẩn bị bán hàng thật:** xem [hướng dẫn vận hành](docs/PRODUCTION_RUNBOOK.md). Có kiểm tra `npm run check:production`, backup/restore SQLite, khóa sửa sản phẩm, snapshot báo cáo và audit truy vết. Hiện cấu hình/provider thật chưa đủ; không coi bản demo hoặc test giả lập là đã triển khai production.

**Tích hợp Supabase:** đã có PostgreSQL adapter, đăng nhập Email/Google qua Supabase Auth và bucket ảnh riêng tư. Nếu bạn chưa tạo project, làm theo [hướng dẫn thiết lập Supabase](docs/SUPABASE_SETUP.md) và mẫu `.env.supabase.example`. Bản local tiếp tục dùng SQLite cho đến khi bạn cấu hình `DATABASE_PROVIDER=supabase`; không có kết nối cloud tự động khi chưa có credentials.

Ứng dụng hiện có backend Node.js riêng, lưu SQLite và xử lý nghiệp vụ trên server. Giao diện React gửi thao tác có tên đến API; không còn quyền gửi toàn bộ cơ sở dữ liệu để ghi đè. Yêu cầu **Node.js 24 trở lên**.

## Chạy trên Windows

Mở terminal tại thư mục chứa file `package.json` này:

```powershell
npm.cmd ci
npm.cmd run dev
```

Mở **http://localhost:3000**. Backend chạy ở **http://127.0.0.1:4000**. `npm run dev` mặc định bật `DEMO_MODE=true`: OTP là `123456`, tài khoản mẫu xuất hiện ở màn đăng nhập. Khách chưa đăng nhập có thể bấm **Xem sản phẩm không cần đăng nhập**.

Dữ liệu lưu tại `data/app.sqlite`, vẫn còn khi dừng và chạy lại. Khôi phục dữ liệu mẫu chỉ thực hiện qua Công cụ demo bằng tài khoản Quản trị gốc (`0900000209`) hoặc Vận hành (`0900000201`). Không dùng thao tác này với dữ liệu cần giữ.

## Kiểm tra

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run test:backend
npx.cmd playwright install chromium
npm.cmd run e2e
npm.cmd run build
```

`npm test`: 251 kiểm thử domain/giao diện. `test:backend`: kiểm thử HTTP thật, quyền, OTP, giao dịch, SQLite, webhook. `e2e`: kiểm thử Chromium kết nối backend thật, dùng cơ sở dữ liệu riêng trong `data/e2e-*.sqlite`. Các kịch bản cũ dùng API demo trong `e2e/` và `playwright.config.ts` được giữ để tham khảo, không thuộc bộ nghiệm thu backend mới.

## Chạy bản build

```powershell
npm.cmd run build
$env:DEMO_MODE="true"
npm.cmd start
```

Mở **http://localhost:4000**. Một server phục vụ cả `dist/` và API. `npm run preview` chỉ phục vụ giao diện, vẫn cần backend chạy riêng. Không triển khai backend SQLite này thành hàm Vercel lưu trên ổ đĩa tạm; dùng máy chủ/container có ổ lưu bền vững. API `/api/state` cũ đã trả `410 Gone`, kể cả handler Vercel cũ.

## Cấu hình chế độ thật

Sao chép `.env.example` thành `.env.local`, đặt `DEMO_MODE=false`, chọn **một DATABASE_PATH riêng với demo**, rồi cấu hình:

- `DATA_ENCRYPTION_KEY`: 32 byte biểu diễn bằng 64 ký tự hex. Tạo bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Giữ khóa ngoài source; cần đúng khóa để mở lại dữ liệu và bản sao lưu.
- `BOOTSTRAP_ADMIN_PHONE`: SĐT của Quản trị gốc, chỉ dùng khi khởi tạo cơ sở dữ liệu trống. Không tự tạo tài khoản mẫu ở chế độ thật.
- `SMS_OTP_URL`, `SMS_OTP_TOKEN`: adapter gửi SMS của bạn. Backend POST `{phone, code, expiresIn:120}` với Bearer token; chỉ phản hồi 2xx mới coi là gửi thành công. Chưa cấu hình thì trả 503, không âm thầm dùng OTP demo. Đăng ký SĐT/mật khẩu bắt buộc OTP; demo dùng `123456`.
- `GOOGLE_CLIENT_ID` và `VITE_GOOGLE_CLIENT_ID`: cùng Client ID; backend xác minh credential rồi mới cấp phiên. Gmail mô phỏng bị chặn trong chế độ thật.
- `ALLOWED_ORIGINS`: các origin được phép, phân cách bằng dấu phẩy, khớp địa chỉ truy cập thực tế.
- Các `*_WEBHOOK_SECRET`: xác thực callback từ adapter thanh toán/ngân hàng/vận chuyển. Xem [API](docs/BACKEND_API.md). Đây là hợp đồng adapter, chưa phải kết nối tự động với VNPay/MoMo/GHN hay một ngân hàng cụ thể.

Sau đó chạy `npm run build` và `npm start`. Backend mặc định chỉ lắng nghe `127.0.0.1`; đặt reverse proxy HTTPS phía trước khi đưa lên máy chủ. Container dùng `API_HOST=0.0.0.0` và gắn volume vào `/app/data`.

SMS, ngân hàng, thanh toán, push và vận chuyển thật cần tài khoản nhà cung cấp. Các nút xác nhận tiền mô phỏng bị server từ chối trong chế độ thật; không coi việc bấm nút trên giao diện là bằng chứng đã thu/hoàn/chi tiền.

## Kiến trúc và phạm vi

- `server/`: HTTP, xác thực OTP, phiên access/refresh, RBAC, transaction, SQLite, lịch chạy tự động, xuất báo cáo, webhook.
- `src/domain/`: nghiệp vụ thuần được **server chạy lại** trên dữ liệu hiện tại; frontend chỉ dùng để xem trước/kiểm tra form.
- `src/store/commands/`: adapter có kiểu, sinh từ danh sách cho phép trong `scripts/generate-commands.mjs`. Thêm thao tác mới phải đăng ký và kiểm tra quyền phía server.
- SQLite sử dụng WAL và `BEGIN IMMEDIATE`. Nghiệp vụ hiện lưu dưới dạng một aggregate trong `app_state`; phiên, OTP, idempotency, nhật ký, webhook và export có bảng riêng. Đây là kiến trúc cho một tiến trình/một máy chủ, chưa phải mô hình dữ liệu quan hệ chuẩn hóa để mở rộng nhiều replica.
- Mã hóa AES-256-GCM áp dụng cho aggregate và kết quả idempotency khi có khóa. Nhật ký không chứa OTP/token; thông tin người nhận SMS nằm tạm trong bảng OTP cho đến khi hết hạn. Cần chính sách sao lưu và quản lý khóa của môi trường triển khai.

Xem [đối chiếu đặc tả và phần còn thiếu](docs/BACKEND_SPEC_COVERAGE.md). Các tài liệu nguồn đã đọc được lưu tại `docs/specifications/`; giữ tên dự án Lào Cai theo source hiện tại vì tài liệu Drive có cả Bắc Giang và Lào Cai.
