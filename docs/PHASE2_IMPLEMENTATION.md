# Phase 2 — chức năng và điều kiện nghiệm thu

## Bổ sung ngày 08/11/2026

- Giỏ và bảng chọn nhanh trên màn hình nhỏ hỗ trợ kéo vùng tiêu đề xuống ít nhất 85 px để đóng; kéo ngắn trả về vị trí cũ, kéo ngang và nút bấm không kích hoạt đóng. Cuộn nội dung không bị chiếm cử chỉ.
- Khi 3D không khởi tạo hoặc tải thất bại, tự thay bằng bộ 360° đã duyệt nếu có; nếu không có thì giữ ảnh đại diện, không hiển thị lỗi kỹ thuật. Mô hình cũ được gỡ khỏi DOM và bỏ nguồn khi chuyển sang bản dự phòng.
- Ảnh WebP mới tải bằng công cụ quản trị có thêm bản 480/960 px khi ảnh gốc đủ lớn, dùng `srcSet`/`sizes` cho thẻ, ảnh đại diện và thư viện. Bản thu nhỏ lưu chung với asset gốc, cùng kiểm tra quyền và phê duyệt; không tạo đường truy cập công khai cho ảnh chờ duyệt. Ảnh cũ chưa có bản thu nhỏ vẫn dùng ảnh gốc; cần tải lại để có lợi ích dung lượng. Ảnh URL ngoài hệ thống chưa được tự chuyển đổi. Bộ xoay giữ giới hạn dung lượng riêng.


Đối chiếu SRS “Trải nghiệm chọn mua hàng”, bản 1.1 ngày 04/11/2026. Tài liệu này thay thế ghi chú “chưa triển khai nghiệp vụ Phase 2” trong tài liệu thiết kế giao diện trước đó. Có mã chức năng không đồng nghĩa đã nghiệm thu dịch vụ thật và mọi chỉ tiêu hiệu năng trên thiết bị thật.

## Ma trận chức năng

| Yêu cầu | Phần triển khai |
|---|---|
| FR-TKSP-11 | Tuyển tập Đang vào vụ/Bán chạy/Quà biếu; thứ tự riêng; tối đa 11 món và thẻ Xem tất cả; vuốt snap, kéo chuột, mũi tên và bàn phím; trang chủ/danh mục. Chỉ đưa vào tuyển tập khi có ít nhất 5 ảnh đã duyệt. Danh mục thường vẫn bán món chưa đủ ảnh. |
| FR-TKSP-12 | Thư viện ảnh/video/360°/3D theo nhóm, điều khiển trước/sau và vị trí; mở toàn màn hình, phóng/thu, kéo/chụm ảnh; đổi quy cách tới ảnh tương ứng. |
| FR-TKSP-13 | Model-viewer tải động sau khi bấm; GLB đóng gói, ảnh đại diện và tiến trình; xoay/phóng, đặt lại, đóng; dừng tự xoay khi tương tác, tắt tự xoay khi reduced motion. Hủy src khi unmount và không giữ cache mô hình cũ. Máy không mở được mô hình có ảnh dự phòng. |
| FR-TKSP-14 (Should) | Bộ 24–36 ảnh xoay; tải khi kích hoạt; kéo hoặc nút đổi góc; đóng để tiếp tục vuốt thư viện. |
| FR-TKSP-15 (Could) | Không triển khai AR theo quyết định D17. USDZ được lưu theo cặp phương tiện, không tự bật camera/AR. |
| FR-TKSP-16 (Should) | Trước/sau theo danh sách đang xem, vuốt vùng tên; giữ bộ lọc của trang; link chia sẻ không có ngữ cảnh danh sách thì ẩn. |
| FR-MHTT-08 | Một quy cách còn hàng: thêm ngay; nhiều quy cách: bảng chọn nhanh; số lượng, giá và Mua ngay; hoàn tác 5 giây, trừ đúng phần vừa thêm. |
| FR-MHTT-09 | Thứ tự quy cách do Admin lưu; chọn sẵn quy cách có sẵn còn hàng trước, rồi đặt trước; chip đổi giá/tồn/nút mua/ảnh. |
| FR-MHTT-10 | Thanh mua cố định trong sheet; giá, số lượng, cọc và 2 nút; hết hàng không hiện nút thêm. |
| FR-MHTT-11 | Giỏ nổi cho khách/vãng lai, số món ở header; chia nhóm, sửa/xóa và hoàn tác xóa. |
| FR-MHTT-12 | Giỏ tạm chỉ lưu mã món, số lượng, giá đã thấy/ngày giao, batch và thời gian sửa; hết hạn 7 ngày. Đăng nhập mới gộp với giỏ tài khoản qua transaction máy chủ, giới hạn tồn, thông báo điều chỉnh và chống gộp trùng. Giữ giỏ tạm nếu gộp lỗi. |
| FR-MHTT-13 | Nguồn buy_now riêng, không sửa giỏ khi đặt/đóng/thanh toán lỗi hoặc hết hạn; đăng nhập xong khôi phục đúng nguồn. Đơn bị hủy có thể mua lại ở chi tiết. |
| FR-MHTT-14 | Một màn tổng hợp; sửa giao hàng, ưu đãi, thanh toán bằng dialog tại chỗ; tiền tính lại ngay; kiểm tra lại trạng thái máy chủ khi mở và khi đặt. Hiện Trả ngay/Trả khi nhận, đơn tách, phí giao theo chuyến. |
| FR-MHTT-15 | Dùng địa chỉ mặc định và phương thức/cách giao gần nhất; chưa có địa chỉ tự mở form, trở lại giữ nội dung checkout. Lần đầu phải chọn thanh toán. |
| FR-MHTT-16 | Xác nhận mã lần đặt, mã đơn, trạng thái, online đã ghi nhận, COD, theo dõi/mua tiếp. Ngày đặt trước lấy lịch chọn; ETA hàng có sẵn lấy P2-ETA nếu Vận hành đã công bố. |
| FR-MHTT-17 (Should) | Mua lại từ chi tiết đơn đã giao/đã hủy; giá hiện tại; bỏ món không còn bán, giới hạn lượng còn mua được và báo kết quả. |
| FR-MHTT-18 (Could) | Đăng ký báo khi có hàng chưa mở trong đợt này, theo trạng thái “làm sau đợt 2” của SRS. Theo dõi mùa vụ đã có tiếp tục hoạt động. |
| FR-SP-10 | Tải/nén ảnh, MP4, bộ 360°, GLB + USDZ, ảnh đại diện; nhóm/thứ tự/quy cách, nguồn và phiếu đồng ý; xem trước; duyệt/cần sửa có lý do. Thay tệp giữ bản đã duyệt đến khi bản mới được duyệt. |

## Quy tắc backend

- Checkout mới từ UI gửi `experience: phase2`. Giữ nhánh cũ cho API/đơn cũ; không sửa bản chốt lịch sử. Đơn hàng có sẵn ở kho do hệ thống xác nhận và chuyển chuẩn bị, không chờ HTX; đơn đặt trước giữ luồng xác nhận hiện có.
- Phí giao được tính một lần cho cùng loại chuyến, ngày, cách giao và địa chỉ/số liên hệ; quà giao người khác hoặc cách giao khác tách chuyến. Phí hộp và phân bổ giảm giá giữ nghiệp vụ cũ. Chỉ shipper được phân công tự cập nhật giao hàng.
- Giá/tồn, giới hạn số lượng, nguồn Mua ngay, danh tính khách, khóa chống trùng, chứng nhận và tiền vẫn kiểm ở máy chủ. Cọc mặc định của hệ thống là 30%; giá trị cấu hình đang vận hành và bản chốt đơn cần được kiểm tra trước nghiệm thu.
- Trước tự hủy giao dịch thật từng gửi tới adapter, máy chủ đối chiếu trạng thái. Chỉ giải phóng khi adapter xác nhận chưa thu tiền và trạng thái cuối cùng. Timeout/sai số tiền/phản hồi mơ hồ giữ lại để đối chiếu; không kéo dài thời hạn cho phép khách thanh toán. Tiền về sau hủy đi luồng hoàn tiền hiện có.
- Phương tiện chưa duyệt và phiếu đồng ý không có URL công khai. Chỉ asset của bản đã duyệt đang hiển thị được phục vụ cho khách. Có hỗ trợ HTTP Range cho video. Tệp chờ chưa gắn vào hồ sơ tự dọn sau 24 giờ.
- Metadata, tệp nhỏ và đăng ký vùng giao dùng bảng `feature_records` hiện có, được mã hóa khi backend đã cấu hình khóa. Tệp trên 2 MB tải thẳng tới bucket Supabase Storage riêng tư `product-media` qua URL tải có hạn, rồi máy chủ đọc/kiểm định dạng trước khi nhận vào hồ sơ. Cách này tránh gửi video/GLB lớn qua giới hạn request của Vercel. Asset lớn đã duyệt được cấp URL đọc 5 phút sau khi kiểm tra quyền. Không có migration phá dữ liệu.

## Cách quản trị

1. Admin → Duyệt sản phẩm & giá → chọn sản phẩm → Thư viện ảnh, video & 3D.
2. Tải ảnh chính và các ảnh khác; ghi nguồn/phiếu đồng ý khi bắt buộc; xem trước rồi duyệt. Định dạng ảnh gốc JPG/PNG/WebP, tối đa 10 MB; bản tải tới server sau nén tối đa 300 KB. 360° 24–36 ảnh tổng tối đa 3 MB; video MP4 tối đa 30 giây/10 MB; GLB và USDZ mỗi tệp tối đa 5 MB. GLB không được tham chiếu tài nguyên mạng hoặc yêu cầu decoder mạng.
3. Trong Chủ đề nổi bật & thứ tự quy cách, gán chủ đề và thứ tự. Ít hơn 5 ảnh đã duyệt thì chưa xuất hiện ở tuyển tập nổi bật.
4. Admin → Nội dung trang chủ → Trải nghiệm chọn mua & đăng ký vùng giao: số lượt thao tác 14 ngày không chứa tên/địa chỉ/SĐT. Danh sách khách đồng ý nhận tin vùng giao chỉ dành cho Vận hành; đánh dấu đã báo không tự gửi tin.
5. Admin → Tham số → P2-ETA: nhập số ngày lịch theo năng lực giao thực tế (1–14); 0/không cấu hình nghĩa là chưa công bố. Ngày dự kiến được chốt vào đơn mới, không thay ngày đơn cũ và không tự bịa SLA giao hàng.

Tệp lớn cần `SUPABASE_URL` và service-role key **chỉ ở server** theo mẫu cấu hình Supabase của dự án. Backend tạo bucket `product-media` riêng tư khi cấp phiên tải đầu tiên; bucket công khai sẽ bị từ chối. URL upload không cho đọc tệp. Upload chưa hoàn tất/không gắn vào hồ sơ hết hạn sau 24 giờ; worker dọn cả object và metadata. Việc đọc/kiểm tệp Storage nằm ngoài khóa transaction của đơn hàng/thanh toán. Chưa cấu hình Storage thì API báo rõ, không giả vờ tải được tệp lớn lên Vercel.

## Hợp đồng đối chiếu thanh toán

Ngoài cấu hình tạo phiên đã có, thêm `PAYMENT_STATUS_URL`, cùng origin HTTPS với `PAYMENT_SESSION_URL`, dùng token adapter hiện có. POST gửi `{transactionId, amount, currency: VND}`. Phản hồi phải khớp cả ba trường:

- Đã thu: `{status: paid, providerRef, paidAt}` với thời điểm có căn cứ từ nhà cung cấp. Thu trước hạn được ghi nhận; thu sau hạn đi luồng tiền về muộn.
- Chưa thu và đã kết thúc không thể thu tiếp: `{status: unpaid|failed|cancelled, final: true}`.
- Pending, thiếu trường, sai tiền hoặc lỗi mạng không được coi là chưa thu.

Chưa có tài khoản merchant/SMS thì không thể nghiệm thu thanh toán/OTP thật. Không dùng số tài khoản hoặc mã QR mẫu để thay thế kết quả từ nhà cung cấp.

## Kiểm tra và phần phụ thuộc dữ liệu thật

Kiểm thử thuần nghiệp vụ, backend và trình duyệt nằm trong các tệp `phase2.test.ts`, `phase2.test.mjs`, `phase2.e2e.ts`. Trình duyệt dùng API mô phỏng và GLB tam giác tổng hợp để kiểm tra renderer, không đăng dữ liệu này vào Supabase hoặc coi là ảnh sản phẩm.

Kết quả chạy 06/11/2026: TypeScript và build đạt; 265 unit test, 110 backend test, 7 kịch bản trình duyệt Phase 2/Admin đạt. Các trường hợp gồm tồn cuối, giữ nguyên giỏ Mua ngay, gộp giỏ/chống gộp trùng, rollback phản hồi chậm, ảnh chờ duyệt không công khai, HTTP Range, tải Storage trực tiếp, đối chiếu thanh toán quá hạn và 3D chỉ tải khi kích hoạt. Backend local đã khởi động lại ở `http://localhost:3000`, health báo Supabase và `demo=false`.

Cần cung cấp bộ ảnh có quyền sử dụng, video, 24–36 khung xoay và cặp GLB/USDZ đúng bao bì để nghiệm thu nội dung thật. Cần danh mục phường/xã Hà Nội đã kiểm tra, cấu hình ETA, merchant/SMS thật và thử iPhone/Android thật. NFR 2,5 giây/3 giây trên 4G, 60 fps và ổn định sau 10 mô hình chưa được chứng nhận từ các bài chạy Chromium desktop. AR và đăng ký báo hết hàng vẫn ngoài phạm vi đang bật, đúng phần quyết định/đề xuất của SRS.
