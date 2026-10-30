# Bổ sung theo đặc tả Drive — 28/10/2026

> Đã có SRS hợp nhất mới ngày 29/10. Quyền HTX/Root, người quản lý sản phẩm và một số nhận định dịch vụ ở bản này là lịch sử. Xem [triển khai SRS hợp nhất](SRS_IMPLEMENTATION_2026-10-29.md).

Nguồn: [thư mục 16 tài liệu](https://drive.google.com/drive/folders/1z64JhV2oI3D6hHccbSv4zrlhvk7H0CTZ), bản text trong `docs/specifications/01.txt`–`16.txt`. Đã liệt kê lại thư mục và đọc lại BCTK-03 qua Drive. Bản audit 27/10 là mốc lịch sử; nhiều tính năng trong đó đã có thêm mã trước lần sửa này. Không coi bảng audit cũ là danh sách lỗi hiện tại.

## Thay đổi trong lần này

- **A01 — tài khoản:** thêm CLI `npm.cmd run account:bootstrap` để Root khởi tạo có thể tự đặt mật khẩu lần đầu. Chỉ cấp link khi Root bootstrap chưa có mật khẩu. Chặn Vận hành cấp link lấy quyền tài khoản Root. Đã kiểm thử reset dùng một lần, hủy phiên cũ, khóa sau 5 lần sai và từ chối mật khẩu yếu.
- **A07/A08 — nháp sản phẩm:** trước đây lưu nháp bỏ mất danh mục chi tiết và toàn bộ ảnh. Nay giữ cả hai, kiểm tra tối đa 6 ảnh và quyền sở hữu media, khôi phục ảnh khi chọn nháp, cập nhật danh sách sau khi lưu. Kiểm thử chặn sửa nháp HTX khác và dọn nháp quá hạn 30 ngày.
- **A16 — báo cáo:** thêm xuất HTX và sản phẩm ở cả CSV/XLSX, chỉ gồm cột danh mục, không đưa SĐT/địa chỉ/tài khoản ngân hàng vào tệp. QLNN chỉ xuất sản phẩm đang công khai. Thêm kiểm thử cấu trúc OOXML và cột riêng tư.
- **A16/A17 — bộ lọc:** ngày nhập là ngày Việt Nam, quy đổi UTC bằng +07:00; kiểm tra ngày thực, từ chối ngày không tồn tại và khoảng đảo ngược. Khoảng 7/30 ngày bắt đầu ở đầu ngày Việt Nam, cùng quy ước dashboard. Xuất đánh giá áp dụng trạng thái. Từ chối `dataAsOf` tương lai. Màn nhật ký và tệp xuất dùng cùng biên ngày Việt Nam.
- **A16 — giao diện:** xuất từ Tổng quan nhận khoảng thời gian đang chọn. Gộp xuất của QLNN vào cùng StatsPanel; sửa đoạn tiếng Việt bị hỏng. Ngày tùy chọn ở chức năng xuất vẫn là bộ lọc bổ sung riêng; đây chưa phải cơ chế snapshot lịch sử chính xác cùng phiên dữ liệu với dashboard.
- **Kiểm thử:** thêm `server/tests/spec-features.test.mjs` cho các luồng trên, QR lô công khai đúng sản phẩm, đối soát CSV chống trùng/chênh lệch/rollback và quyền xuất. Cập nhật kiểm thử tìm kiếm sang vai trò combobox vì ô đã có danh sách gợi ý.

## Những phần đã có trước lần sửa này

Đã đọc mã của: đổi/quên/đặt mật khẩu và cấp link; danh mục động; nháp 30 ngày; bộ ảnh và thông tin bảo quản/hạn dùng/chuẩn bị; tạo lô và QR; mở link sản phẩm cho khách; bổ sung/phân công ticket, đổi/giao bù; cấu hình kiểm duyệt review; nhập đối soát CSV và điều kiện COD khi chốt kỳ; xuất XLSX; tìm kiếm gợi ý/lịch sử và bộ lọc catalog. Có mã không đồng nghĩa đã nghiệm thu toàn bộ nhánh UC. Bộ kiểm thử mới chỉ xác nhận các trường hợp nêu trong từng test.

## Vẫn còn để đạt toàn bộ đặc tả

1. **Tích hợp cần cấu hình:** Google/Supabase cloud, gửi link/SMS, merchant thanh toán/hoàn/chi, API hãng vận chuyển, ngân hàng và hóa đơn điện tử, push/email. Kiểm thử Supabase hiện dùng giả lập/local PostgreSQL, chưa là cloud/provider thật.
2. **Sản phẩm/HTX:** đã thêm khóa biên tập có TTL, tháng thu hoạch và MST bắt buộc cho hồ sơ mới. Còn đối chiếu MST/giấy phép với cơ quan cấp và nghiệm thu đầy đủ quy tắc từng UC.
3. **CSKH/Review:** video bằng chứng, báo cáo vi phạm/an toàn thực phẩm và SLA đầy đủ; nghiệp vụ hoàn một phần tùy ý cần thống nhất chính sách. Mốc review 30 ngày hiện có cấu hình, cần chốt với nhóm.
4. **Tài chính:** đã thêm tìm đơn thiếu trong bảng kê theo phạm vi ngày đặt đơn và lịch sử điều tra chênh lệch. Còn quy trình phê duyệt điều chỉnh tiền và ledger quan hệ chỉ thêm đầy đủ tạm giữ/công nợ/phí/bồi thường; CSV tổng theo đơn chưa là adapter đối soát riêng của từng hãng.
5. **Báo cáo/nhật ký:** đã có snapshot dashboard/summary/orders, lọc audit outcome/correlation ID. Còn queue lớn/FAILED/retry, phạm vi địa bàn theo tài khoản QLNN và retention/outbox/DLQ. Lịch sử tải, số dòng và checksum đã có. PDF và các ngưỡng/SLA còn cần chốt.
6. **Chia sẻ/mobile/vận hành:** mã giới thiệu/attribution, chia sẻ mạng xã hội; sinh trắc học/thiết bị/native deep link nếu nghiệm thu mobile. Backup/restore SQLite đã kiểm thử cục bộ; lịch backup ngoài máy chủ, PostgreSQL PITR, tải lớn và HA chưa được chứng minh. Địa bàn và chính sách tài chính chưa thống nhất giữa các tài liệu.

Không đánh dấu hoàn thành 100% SRS hoặc tự áp dụng chính sách còn mâu thuẫn. Các phần trên là công việc thực sự còn lại, không được suy ra đã xong từ việc build và test đạt.

## Kết quả kiểm tra

- `npm.cmd run lint`: đạt.
- `npm.cmd test`: 251/251 đạt.
- `npm.cmd run test:backend`: 45/45 đạt, gồm 10 kiểm thử mới.
- `npm.cmd run build`: đạt.
- `npm.cmd run e2e`: 9/9 đạt sau khi cập nhật locator tìm kiếm; có màn desktop/mobile, các vai trò và Supabase OAuth giả lập. Không phải kiểm thử Google/cloud thật.

## Đợt tiếp theo — hoàn thiện các phần nhỏ

### Lịch sử báo cáo (A16 / FR-BCTK-03)

- Mục **Lịch sử xuất báo cáo của tôi** dưới các nút xuất, tải khi mở, có nút làm mới. Xem tối đa 100 báo cáo gần nhất của chính tài khoản.
- Hiển thị tên tệp, trạng thái, ngày tạo/hết hạn theo giờ Việt Nam, bộ lọc đã chốt và số dòng nội dung (không tính dòng tiêu đề).
- Tải lại đúng tệp đã lưu, vẫn kiểm tra quyền hiện tại/chủ sở hữu/hạn dùng ở server. Tệp quá hạn được hiển thị EXPIRED ngay, không cần đợi tác vụ dọn dẹp.
- Tính SHA-256 trên byte CSV UTF-8 hoặc byte XLSX khi tạo. Lưu metadata cùng export job trong một transaction; đối chiếu checksum trước khi tải, từ chối tệp đã thay đổi. Có thể xem checksum trong lịch sử, và HTTP tải trực tiếp trả `X-Content-SHA256`.
- Báo cáo cũ thiếu metadata vẫn tải được và hiển thị chưa có số dòng; không tự tạo ra checksum gốc cho tệp cũ. Checksum kiểm tra hỏng/thay đổi nội dung so với metadata, không thay thế chữ ký số hoặc cơ chế lưu trữ chống sửa ở cấp hạ tầng.
- Bổ sung hai test backend cho lịch sử riêng tư, bộ lọc, expiry, checksum CSV/XLSX và chặn nội dung bị sửa; thêm test trình duyệt tạo báo cáo → xem lịch sử → xem checksum → tải lại.

### Chứng nhận sản phẩm (phần nhỏ A08)

- Hồ sơ gửi mới bắt buộc số chứng nhận (tối đa 100 ký tự), ngày cấp và ngày hết hạn hợp lệ. Số được trim trước khi lưu.
- Không cho ngày cấp tương lai, ngày hết hạn trước ngày cấp, hoặc chứng nhận đã hết hạn. Kiểm tra ở domain chạy lại trên server, không phụ thuộc kiểm tra ô nhập.
- Không duyệt chứng nhận hết hạn trong thời gian chờ, vẫn cho phép Admin – Chất lượng từ chối với lý do.
- Màn nguồn gốc hiển thị số/ngày cấp/hạn, chỉ liệt kê chứng nhận đã xác minh còn hạn. Không bắt sửa chứng nhận lịch sử thiếu trường và không tự xác minh với cơ quan cấp.
- Bổ sung bốn unit test cho lưu dữ liệu, ngày không tồn tại, thứ tự ngày/hết hạn và duyệt sau hạn.

Kiểm tra đợt này: TypeScript đạt; **255/255 unit test**, **47/47 backend test**, **10/10 kịch bản trình duyệt**; production build đạt. Các test Supabase vẫn dùng giả lập, chưa kiểm thử provider/cloud thật.

## Đợt chuẩn bị vận hành thật

Người dùng đã chọn hướng bán hàng thật và cần SMS. Chưa có hãng SMS/Brandname, merchant, hãng vận chuyển hoặc máy chủ được xác nhận. Hướng dẫn cụ thể: [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md).

- **Đối soát:** tùy chọn ngày đặt đơn/HTX, kiểm tra đơn ngoài phạm vi, phát hiện `missing_partner`, từ chối nhiều dòng tổng tiền cho cùng đơn hoặc tiền không phải số nguyên VND. Ghi kết luận kiểm tra/mở lại dưới dạng lịch sử riêng, giữ kết quả gốc, không giả lập chuyển tiền. Phạm vi này không phải đối soát ngày giao dịch theo từng hãng.
- **Hồ sơ HTX:** MST bắt buộc và kiểm tra trùng ở domain/server. Hồ sơ đã duyệt không có luồng sửa MST qua form hồ sơ hiện tại; không tra cứu cơ quan cấp tự động.
- **Sản phẩm:** khai các tháng thu hoạch 1–12, kiểm tra không trùng, lưu cả nháp và hiển thị nguồn gốc. Khóa sửa nội dung theo nhóm quy cách, token riêng từng phiên, TTL 5 phút, gia hạn 60 giây và nhả khi đóng. Command sửa nội dung thiếu/sai/hết hạn token nhận 409. Hook xử lý vòng lặp effect của React StrictMode để không tự chiếm khóa của chính mình.
- **Dashboard:** chốt snapshot số liệu riêng cho người xem, lưu 15 phút/tối đa 10 phiên mỗi tài khoản; chỉ lưu trường báo cáo, không chứa liên hệ khách. Biểu đồ/summary/orders dùng cùng dữ liệu và `dataAsOf` ngay cả khi có giao dịch sau đó. Phiên hết hạn hoặc không thuộc tài khoản bị từ chối. Nút làm mới tạo snapshot mới. Các loại báo cáo khác vẫn lấy dữ liệu hiện tại và chưa có queue lớn.
- **Audit:** cột `outcome` và `correlation_id`, đồng nhất với `X-Request-ID`, có bộ lọc trên UI/API/xuất. Bản ghi lịch sử giữ `unknown`. SQLite tự bổ sung cột; PostgreSQL cần migration `202610280002_audit_trace.sql`. Không tuyên bố mọi nhánh từ chối API đã có audit đầy đủ hoặc đã có outbox/retention nhiều năm.
- **Backup:** công cụ tạo bản SQLite online, integrity check/giải mã/checksum, restore sang tệp mới, thu hồi phiên local/OTP/link/lease. Đã kiểm thử phục hồi và chặn ghi đè, sai khóa, tệp bị thay đổi; không thao tác DB production hiện có.
- **SMS:** kiểm thử adapter HTTP trong chế độ production: OTP ngẫu nhiên, token server-to-server, không lộ code trong response, gửi lỗi xóa challenge. Đây là provider giả lập trên localhost, chưa gửi SMS thật.
- **Kiểm tra production:** lệnh `check:production` không in bí mật, hiện trả `ready:false` do thiếu cấu hình và adapter outbound thật. Mã đã sẵn công cụ kiểm tra, chưa sẵn sàng mở bán production. Không triển khai hoặc kích hoạt dịch vụ thật trong phiên này.

Kiểm thử bổ sung: MST, tháng mùa vụ, lease, snapshot, audit, đối soát thiếu, SMS và backup. Cần cấu hình provider/hạ tầng và giải quyết các hạng mục mở bên trên trước khi xác nhận hoàn tất toàn bộ dự án cho vận hành thật.

Đã sửa thêm lỗi thứ tự nạp loader ở các CLI `backup`, `account:bootstrap`, `supabase:migrate` và `supabase:import`; kiểm thử bằng tiến trình Node chạy trực tiếp, dùng database/tệp tạm cách ly. Không chạy import/migration trên cloud hay backup database production thật.

Kết quả cuối đợt: TypeScript và build đạt; **257 unit test**, **55 backend test**, **11 kịch bản trình duyệt** đạt. `check:production` trả **ready:false**, đúng với việc thiếu cấu hình, provider cụ thể và kiểm chứng hạ tầng thật. Đây là kết quả kiểm thử cục bộ, chưa là nghiệm thu vận hành thật hoặc hoàn tất toàn bộ SRS.
