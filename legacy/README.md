# Mã nguồn cũ (không build, không deploy)

Lưu lại để đối chiếu khi hợp nhất mã nguồn ở Giai đoạn 1. Vite không đọc thư mục này.

| File | Nguồn gốc |
|---|---|
| `index-babel.html` | Bản đã deploy trước đây: React 18 UMD + Babel standalone + Tailwind Play CDN, ~3.700 dòng JSX trong một thẻ script. Lấy từ commit `de80b8e`. |
| `scripts/build_app.js` | Script ghi đè `index.html` bằng một bản thứ ba. **Không chạy lại.** |
| `scripts/make_fullscreen.js` | Script sửa `index.html` sang toàn màn hình. **Không chạy lại.** |
| `scripts/test_marker.txt` | File đánh dấu thừa của script cũ. |
| `public/standalone.html` | Trang chỉ chuyển hướng về `/`. |
