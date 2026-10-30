# Chọn tài khoản Google để đăng nhập khách hàng

Nút Google hiện trực tiếp trên `/dang-nhap` và `/dang-ky`. Không có biểu mẫu nhập tên/email mô phỏng. Google xác thực danh tính trước khi backend tạo hồ sơ khách hàng hoặc lấy hồ sơ đã có.

## Cách bật ngay với backend đang chạy

1. Tạo OAuth Client loại **Web application** trong Google Cloud, cấu hình consent screen và thêm email thử nghiệm nếu ứng dụng ở chế độ Testing.
2. Thêm Authorized JavaScript origins: `http://localhost:3000` (và origin HTTPS của website khi triển khai).
3. Tạo `.env.local` ở thư mục chứa `package.json`:

```dotenv
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

4. Khởi động lại `npm run dev`. Khách bấm nút Google chính chủ, chọn tài khoản và xác nhận quyền truy cập. Không cần Client Secret cho cách popup này. Không dùng API key thay cho Client ID.

## Khi chuyển sang Supabase

Bật Google provider trong Supabase và thiết lập credentials theo hướng dẫn chính thức. Thêm URL callback của Supabase vào Google Cloud và thêm `http://localhost:3000/dang-nhap` vào Redirect URLs của Supabase. Không đưa Client Secret vào biến `VITE_` hoặc mã frontend.

Ứng dụng dùng OAuth với `prompt=select_account`, trả về `/dang-nhap`; SDK tự đổi PKCE code và backend xác minh phiên Supabase trước khi đăng nhập. Tài khoản khách hàng không cần gõ lại tên/email. Không cấp vai trò nhân viên từ thông tin do trình duyệt tự gửi.

Nếu chưa cấu hình nhà cung cấp thì không thể chọn Gmail thật. Nút không chuyển sang biểu mẫu mô phỏng khi Google bị lỗi. Kiểm thử tự động dùng OAuth giả lập; cần cấu hình OAuth thật để thử với Gmail thật.

Nguồn: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid và https://supabase.com/docs/guides/auth/social-login/auth-google.
