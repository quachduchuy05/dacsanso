# Thiết lập Supabase từ đầu

Mã đã hỗ trợ Supabase Database, Auth và Storage. Chưa có project/khóa kết nối thì ứng dụng vẫn chạy SQLite local. **Chưa có dữ liệu nào được gửi lên một project Supabase thật.**

## 1. Tạo project của bạn

1. Đăng nhập tại [Supabase Dashboard](https://supabase.com/dashboard), tạo organization nếu cần rồi tạo project mới.
2. Đặt tên project, chọn gói/khu vực phù hợp và lưu mật khẩu database ở nơi riêng tư.
3. Đợi project sẵn sàng. Từ phần Connect/cấu hình project, lấy Project URL, publishable key và chuỗi kết nối **Session pooler**. Session pooler phù hợp cho backend Node chạy lâu dài và dùng được trên mạng chỉ có IPv4. Xem [hướng dẫn kết nối chính thức](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. Lấy secret key hoặc service_role key cho backend Storage. Không gửi khóa này vào chat, không đặt trong biến `VITE_`, không đưa lên Git.

Không cần tạo tài khoản Supabase giúp người khác hoặc nhập thông tin thanh toán qua ứng dụng này.

## 2. Điền cấu hình trên máy

Tại thư mục có package.json:

```powershell
Copy-Item .env.supabase.example .env.local
```

Nếu đã có `.env.local`, mở và bổ sung cấu hình thay vì ghi đè. Điền:

| Biến | Giá trị |
|---|---|
| `DATABASE_PROVIDER` | `supabase` |
| `SUPABASE_DB_URL` | URI Session pooler có mật khẩu database; chỉ backend dùng |
| `SUPABASE_URL`, `VITE_SUPABASE_URL` | Cùng Project URL |
| `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Cùng publishable key; có thể công khai |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret/service_role key, chỉ backend dùng |
| `SUPABASE_ADMIN_EMAIL` | Email thực của bạn để khởi tạo/liên kết Quản trị gốc |
| `DATA_ENCRYPTION_KEY` | Chuỗi hex 64 ký tự tạo bên dưới |

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Sao chép kết quả vào `DATA_ENCRYPTION_KEY`, giữ khóa để mở lại dữ liệu và backup. Nếu mật khẩu có ký tự đặc biệt, dùng URI đã encode đúng từ Connect. Kết nối PostgreSQL bật xác minh chứng chỉ; nếu môi trường cần CA riêng, tải CA từ project rồi đặt đường dẫn tại `SUPABASE_DB_CA_PATH`.

## 3. Tạo bảng và bucket

```powershell
npm.cmd run supabase:migrate
```

Lệnh chạy hai migration theo thứ tự trong transaction:

- `supabase/migrations/202610270001_backend.sql`: tạo schema riêng `app_private`, bảng dữ liệu, phiên, OTP, idempotency, nhật ký, export, rate limit và webhook. Bật RLS, thu hồi quyền truy cập của anon/authenticated. Backend kết nối PostgreSQL để kiểm tra quyền/nghiệp vụ; trình duyệt không đọc trực tiếp các bảng này.
- `supabase/migrations/202610270002_storage.sql`: tạo bucket `app-images` **private**, giới hạn 5 MB/ảnh JPG/PNG/WebP. Không cấp policy đọc/ghi trực tiếp cho khách vãng lai.

Cũng có thể chạy nguyên hai file SQL theo thứ tự trong SQL Editor của project. Không chạy trên database có tên schema/bucket trùng của hệ thống khác.

### Giữ dữ liệu local hiện có (tùy chọn)

Thực hiện **trước lần khởi động backend đầu tiên ở chế độ Supabase**:

```powershell
npm.cmd run supabase:import -- data/app.sqlite
```

Lệnh chỉ đọc SQLite và chỉ ghi nếu Supabase chưa có dòng `app_state`. Không ghi đè dữ liệu cloud. Chỉ chuyển dữ liệu nghiệp vụ, không chuyển phiên đăng nhập/OTP. Nếu nguồn đã mã hóa bằng khóa khác, đặt thêm `SQLITE_SOURCE_ENCRYPTION_KEY` trên máy. Các ảnh base64 cũ được giữ nguyên; ảnh mới của tài khoản đã đăng nhập đi vào Storage.

Nếu không nhập dữ liệu local: chế độ thật khởi tạo hệ thống trống, đăng nhập email quản trị đã cấu hình để tạo Quản trị gốc. Không tự sao chép tài khoản/đơn demo vào hệ thống thật.

## 4. Bật đăng nhập

Trong cấu hình Auth của Supabase:

1. Bật provider Email.
2. Đặt Site URL và danh sách Redirect URL được phép có `http://localhost:3000` (và URL thật khi triển khai).
3. Nếu muốn nhập mã OTP, chỉnh email template Magic Link để chứa `{{ .Token }}`. Nếu giữ template mặc định, người dùng mở liên kết trong email để đăng nhập, cùng trình duyệt/tab đã bắt đầu luồng PKCE. Xem [passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless).
4. Muốn dùng nút Google: bật Google provider và điền OAuth credentials trong Supabase theo [hướng dẫn Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google). Khi chưa bật provider, nút sẽ báo lỗi cấu hình của dịch vụ.
5. Email quản trị phải được xác minh. Không có quyền Admin từ `user_metadata`, trường role do client gửi hay email chưa xác minh. Đổi `SUPABASE_ADMIN_EMAIL` không tự tạo thêm Root nếu đã có Root được liên kết.

Email mới mặc định tạo khách hàng. Tài khoản nhân viên HTX/Admin/QLNN/Shipper đã cấp theo SĐT chỉ liên kết tự động khi đăng nhập bằng **số điện thoại được Supabase xác minh**. Giao diện hiện ưu tiên Email/Google; luồng OTP SĐT/hồ sơ HTX cũ vẫn cần adapter SMS đã có. Chưa bổ sung màn quản trị mời nhân viên bằng email hoặc UI Supabase Phone OTP.

Backend gọi `auth.getUser()` để xác minh token Supabase; quyền thực tế lấy từ tài khoản trong database. Access token được kiểm tra lại khi gọi API, tài khoản bị khóa bị chặn ngay. Token đã đăng xuất được đưa vào danh sách thu hồi của app; refresh và đăng xuất được frontend phối hợp với Supabase SDK.

## 5. Chạy

```powershell
npm.cmd run dev
```

Mở http://localhost:3000. Log backend phải ghi **supabase**, `/api/health` phải có `storage: "supabase"`, `auth: "supabase"`, `images: "supabase"`. Nếu thiếu cấu hình hoặc migration, backend báo lỗi; không tự chuyển về SQLite khi đã chọn Supabase.

Khi đổi biến `VITE_`, khởi động lại Vite. Với bản triển khai, chạy lại `npm run build`. Backend Node vẫn cần thiết để thực thi quy tắc nghiệp vụ; Supabase không thay thế bằng cách cho trình duyệt tự sửa giá, trạng thái hay quyền.

## Ảnh và quyền xem

Ảnh mới trong các form/tin nhắn của người đã đăng nhập được thu nhỏ rồi upload qua backend. Database chỉ lưu tham chiếu ổn định `sb://app-images/<user>/<uuid>.jpg`. Component AppImage xin URL có hạn 5 phút và làm mới khi còn mở. Backend chỉ ký URL nếu người dùng sở hữu ảnh hoặc ảnh có trong dữ liệu họ được phép xem; ảnh riêng không có link public vĩnh viễn. Tham chiếu ảnh ngoài phạm vi bị từ chối trước khi ghi nghiệp vụ.

Hồ sơ HTX nộp khi chưa có tài khoản và ảnh cũ vẫn có thể lưu inline trong aggregate mã hóa. Chưa có tác vụ tự dọn ảnh đã upload nhưng chưa gửi form; theo dõi dung lượng Storage khi vận hành.

## Phạm vi kiểm tra

- Migration và truy vấn PostgreSQL được kiểm thử bằng PGlite chạy local: RLS, transaction/rollback, rate limit, mã hóa và API nghiệp vụ.
- Auth/Storage được kiểm thử qua adapter giả lập để kiểm tra quyền, token, MIME và chữ ký URL. Bộ kiểm thử local SQLite và Chromium vẫn chạy.
- Chưa kiểm thử đường truyền/TLS, email/OAuth hoặc upload trên cloud của bạn vì chưa có project và credentials. Chưa benchmark nhiều kết nối/replica thật.
- Nghiệp vụ vẫn giữ aggregate `app_state` mã hóa cùng các bảng phụ trợ; chưa tách đơn/sản phẩm thành toàn bộ bảng quan hệ. Transaction dùng advisory lock để bảo vệ aggregate qua các tiến trình backend.
