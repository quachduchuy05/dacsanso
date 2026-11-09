# Mô hình sản phẩm tương tác

Chín mô hình GLB tạo bằng hình học Three.js, không phải ảnh xoay giả lập, ảnh billboard hay bản quét sản phẩm thật. Nhãn để trống, không gán dung tích/chứng nhận. Chất liệu và hình dáng chỉ là bản concept đơn giản; không khẳng định giống chất lượng ảnh AI. Chưa gắn vào media đã duyệt hay thay dữ liệu Supabase.

- Trang xem: `/xem-mo-hinh-3d`, chỉ tải GLB khi bấm, một mô hình hoạt động mỗi lần, có nút đặt lại/đóng và tải tệp.
- Tệp: `public/models/concepts/*-v1.glb`, chín loại tương ứng danh mục concept; khoảng 37–544 KB/tệp.
- Tái tạo: `node scripts/generate-product-models.mjs` sau `npm ci`. Script dùng seed cố định và GLTFExporter; tài nguyên đóng gói, không decoder hoặc texture ngoài mạng. Chạy lại sẽ ghi lại các tệp concept v1 do script quản lý.
- Cập nhật 09/11/2026: có đủ chín cặp GLB/USDZ, xuất bằng GLTFExporter và USDZExporter. USDZ khoảng 102–1359 KB, không bật AR hoặc camera. Có liên kết tải USDZ trong trang bộ sưu tập; cần nghiệm thu trên iPhone thật, chưa coi việc tạo tệp là chứng nhận tương thích.
- Chi tiết sản phẩm: sau khi tải danh sách media, nếu chưa có mô hình được duyệt thì cung cấp bản concept tương ứng theo tên loại sản phẩm. Mô hình được duyệt luôn ưu tiên. Chỉ tải GLB khi bấm, không tự ghi model concept vào database hoặc giả trạng thái đã duyệt. Khi đang xem concept có ghi chú bao bì có thể khác thực tế. Không tìm được loại tương ứng thì không đoán mô hình.
- Có giới hạn chờ tải mô hình 30 giây; lỗi hoặc quá hạn quay về ảnh/360° nếu có. Dừng tự xoay khi bật reduced motion hoặc chuyển tab ra nền. Đóng/đổi sản phẩm gỡ nguồn và mô hình cũ. Chưa xác nhận đạt NFR 4G, 60 fps hoặc bộ nhớ trên iPhone/Android thật.
