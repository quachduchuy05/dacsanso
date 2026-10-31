# Nhập dữ liệu sản phẩm Lào Cai — 31/10/2026

Nguồn: [DS sản phẩm Lào Cai](https://docs.google.com/spreadsheets/d/1Ko6clrHNfjwahDvAVAeBQjgVdLwtmuxaRk2dhJ8rRpc/edit) trong thư mục Drive người dùng cung cấp. Nguồn chỉ đọc, không sửa file Google Sheets.

## Kết quả đã đọc lại trên Supabase

- Đích: project `hggmgvblecqnvnuxbabm`, schema `app_private`.
- Tạo 30 `product-draft`, chủ sở hữu Admin gốc `u-ad-root`; không thêm sản phẩm bán công khai.
- Giữ nguyên 11 sản phẩm hiện có, 7 HTX và bản ghi `app_state` phiên bản 2. Không sửa tài khoản, đơn, tồn kho hoặc sổ tiền.
- Lưu đủ 4 tab trong một `catalog-import-source`: 30 dòng sản phẩm, 19 dòng giá tham khảo, toàn bộ 2 dòng nội dung persona và 30 dòng nội dung/bản quyền (các bảng sản phẩm/giá/nội dung không tính hàng tiêu đề).
- Lưu thêm liên kết/rich text của cột nguồn giá; không coi chữ “nguồn” là một URL và không bỏ các liên kết gốc khi lưu bản nguồn.
- Checksum dữ liệu nguồn: `8fa51aa26d2544a989e4d1e192f8a4ea7aedcdeb991e3a6281ed27bc620ae562`.
- Nguồn STT nhảy từ 28 sang 30: nhập đúng 30 dòng thực tế, không tự tạo dòng STT 29.

## Trạng thái trước khi bán

Giá thị trường trong bảng là tham khảo, không phải giá bán đã duyệt. Giữ trống giá, tồn, HTX và ảnh ở bản nháp; không tự gán HTX hoặc dùng mô tả ảnh thành ảnh thật. Giữ nguyên thông tin vùng, quy cách, mùa vụ, bảo quản, mức độ tin cậy và yêu cầu xác minh. Tên ngắn như “Quế” được giữ nguyên trong nháp; cần hoàn thiện theo kiểm tra đăng bán của ứng dụng.

Mở Admin tổng hợp → Duyệt sản phẩm & giá → Thêm sản phẩm → chọn bản nháp. Bổ sung HTX, quy cách bán, giá bán, tồn kho, ảnh được phép dùng và kiểm tra thông tin rồi mới đăng. Các bản nháp theo TTL 30 ngày hiện có của ứng dụng; bản lưu nguồn riêng không tự hết hạn.

## Sao lưu và chạy lại

Bản sao lưu mã hóa trước khi ghi nằm trong `data/import-backups/catalog-1793452688077.json`. Đường dẫn nguồn và bản sao lưu nằm dưới `data/`, được Git bỏ qua. Chỉ sao lưu state/feature records, không sao chép mật khẩu hoặc phiên đăng nhập. Cần giữ khóa mã hóa hiện hành để đọc lại.

Lệnh xem trước: `node scripts/import-catalog-source.mjs data/imports/laocai-drive-source.json`. Chỉ thêm `--apply` khi cần thực hiện. ID theo spreadsheet/STT giúp bỏ qua bản nháp đã có, không ghi đè nội dung Admin sửa. Đợt nhập đã chạy trong transaction và có audit `catalog-source-imported`.

Ba kiểm thử import đạt: dữ liệu nguồn/tên ngắn/STT nhảy, không tự tạo giá/ảnh, mã hóa, không đổi state, chống trùng và không ghi đè nháp đã sửa, chặn chủ sở hữu không có quyền.

## Vercel cần đối chiếu

Sau nhập, `https://dacsan-vung-mien.vercel.app/api/health` trả 200 và storage Supabase. Tuy nhiên API state công khai trên Vercel trả 0 sản phẩm và 0 HTX, trong khi database đã cấu hình trên máy có 11 sản phẩm active và 7 HTX. Chưa xác nhận Vercel đang dùng cùng database/schema và mã backend. Cần đối chiếu `SUPABASE_DB_URL`, khóa mã hóa và phiên bản deploy trong phần cấu hình riêng tư; không đưa các giá trị này vào Git/chat. Không khẳng định sản phẩm đã hiện trên cửa hàng Vercel.
