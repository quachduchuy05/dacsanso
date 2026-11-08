# Mô hình sản phẩm tương tác

Chín mô hình GLB tạo bằng hình học Three.js, không phải ảnh xoay giả lập, ảnh billboard hay bản quét sản phẩm thật. Nhãn để trống, không gán dung tích/chứng nhận. Chất liệu và hình dáng chỉ là bản concept đơn giản; không khẳng định giống chất lượng ảnh AI. Chưa gắn vào media đã duyệt hay thay dữ liệu Supabase.

- Trang xem: `/xem-mo-hinh-3d`, chỉ tải GLB khi bấm, một mô hình hoạt động mỗi lần, có nút đặt lại/đóng và tải tệp.
- Tệp: `public/models/concepts/*-v1.glb`, chín loại tương ứng danh mục concept; khoảng 37–544 KB/tệp.
- Tái tạo: `node scripts/generate-product-models.mjs` sau `npm ci`. Script dùng seed cố định và GLTFExporter; tài nguyên đóng gói, không decoder hoặc texture ngoài mạng. Chạy lại sẽ ghi lại các tệp concept v1 do script quản lý.
- Chưa có USDZ. Luồng quản trị hiện yêu cầu GLB + USDZ và xác nhận đối chiếu bao bì khi duyệt; vì vậy chưa tự xuất bản bộ concept này thành mô hình đã duyệt của hàng bán. Trang xem thử dùng GLB trực tiếp, AR không bật.
