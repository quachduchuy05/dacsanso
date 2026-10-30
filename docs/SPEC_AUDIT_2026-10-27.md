# Đối chiếu dự án với đặc tả Drive — 27/10/2026

## Kết luận và phạm vi

Dự án đã có frontend và backend xử lý các luồng chính nhưng **chưa đáp ứng đầy đủ toàn bộ đặc tả**. Có cả thiếu chức năng, khác quy tắc nghiệp vụ, tích hợp chưa cấu hình và yêu cầu mobile nằm ngoài ứng dụng web hiện tại. Các kiểm thử hiện có đạt không đồng nghĩa mọi UC trong Drive đã được nghiệm thu.

Lần rà soát này đã liệt kê thư mục Drive và lấy lại nội dung của **16 tài liệu** qua kết nối Google Drive, đối chiếu với bản text ở `docs/specifications`, mã nguồn hiện tại và kiểm thử. Đây là rà soát các module/luồng và quy tắc chính, không phải chứng nhận đã kiểm thử từng nhánh của từng UC. Không thay đổi mã nghiệp vụ trong lần rà soát này.

Thư mục nguồn: https://drive.google.com/drive/folders/1z64JhV2oI3D6hHccbSv4zrlhvk7H0CTZ

## Phần đã có

- Xem sản phẩm công khai; tìm kiếm, lọc vùng/danh mục/giá, sắp xếp, phân trang, xem chi tiết; các trang theo giao diện tham chiếu.
- Đăng ký/đăng nhập bằng mật khẩu; nút Google thật và xử lý callback; phân quyền khách, HTX, nhóm Admin, QLNN và shipper. Google chưa được bật bằng credentials thật.
- Backend Node, lưu SQLite hoặc PostgreSQL adapter, phiên access/refresh, thu hồi phiên, transaction, idempotency, hạn chế quyền và dữ liệu theo vai trò.
- Giỏ mua sẵn/đặt trước, checkout, kiểm tra giá/tồn, giữ hàng, lịch giao, xác nhận/hủy/giao/nhận, trạng thái thanh toán/hoàn, tác vụ thời gian.
- Hồ sơ HTX, duyệt sản phẩm và thay đổi giá/nội dung, chứng nhận, tồn kho, mùa vụ; khiếu nại, đánh giá, chat và thông báo trong ứng dụng.
- Đối soát/chốt kỳ cơ bản, sổ giao dịch, thống kê, xuất CSV, nhật ký và webhook có xác thực.

## A. Những điểm thiếu hoặc chưa khớp đã kiểm tra trong mã

P1: nên giải quyết trước khi vận hành thật hoặc nghiệm thu luồng cốt lõi. P2: hoàn thiện nghiệp vụ theo phạm vi đã chốt. P3: nâng cao/phi chức năng hoặc cần thống nhất phạm vi. Các mức này là đề xuất ưu tiên triển khai, không phải nhãn Must/Should của mọi tài liệu.

| Mã | Ưu tiên | Yêu cầu nguồn | Hiện trạng và việc cần làm | Bằng chứng mã |
|---|---|---|---|---|
| A01 | P1 | UC-ACC-04; UC-ACC-06 | Chưa có đổi mật khẩu có xác thực mật khẩu cũ, quên/khôi phục mật khẩu, hoặc link kích hoạt để HTX/nhân viên mới tự đặt mật khẩu. Tài khoản được cấp qua luồng quản trị không được tạo dòng mật khẩu; màn đăng nhập mật khẩu không thể đăng nhập những tài khoản này khi không có cách xác thực khác. Cần hoàn thiện cả luồng bootstrap root ở môi trường thật. | `server/app.mjs` chỉ có password login/register; `server/database.mjs` bootstrap chỉ tạo user; `src/domain/account.ts`; `server/passwords.mjs` |
| A02 | P1 | BR-ACC-003/004; UC-ACC-02 | Đặc tả tài khoản yêu cầu 8–32 ký tự, đủ các nhóm ký tự; khóa 15 phút sau 5 lần sai. Hiện nhận 8–128 ký tự, không yêu cầu các nhóm; giới hạn 30 yêu cầu/15 phút theo IP, chưa có bộ đếm sai theo tài khoản và khóa tạm tương ứng. Băm scrypt là cơ chế bảo vệ mật khẩu đã có, không phải thiếu băm; khác đề xuất bcrypt của tài liệu. | `server/passwords.mjs:5`; `server/app.mjs` nhánh `/auth/password/login` |
| A03 | P1 | UC-MH-09 | Link chia sẻ chưa mở ngay chi tiết cho khách chưa đăng nhập. Hàm xử lý hash chỉ chạy khi `user.role === customer`. Cần cho mở chi tiết công khai, chỉ yêu cầu đăng nhập khi mua. | `src/app/AppShell.tsx:74`; `ProductDetailSheet.tsx:61` |
| A04 | P1 | UC-CS-03, BR02 | Backend nhận khiếu nại có mô tả rỗng: chỉ trim rồi lưu. Cần kiểm tra bắt buộc mô tả ở server, không chỉ dựa vào form. | `src/domain/complaint.ts:59`, trường `description` khi tạo ticket |
| A05 | P1/P2 | UC-AD-07/08/09; FR-DT-04 | Đối soát hiện chưa có phiên nhập/đối chiếu báo cáo đối tác, dòng thiếu/thừa/lệch và quy trình xử lý chênh lệch. Hàm xét đơn vào kỳ dựa trên đã giao, thời điểm, chưa chốt, không có ticket mở; chưa kiểm tra đầy đủ tiền đã thực về/đối soát COD-cổng trước khi đủ điều kiện chi. Cần phân biệt đơn đã giao với khoản tiền đã đối soát. | `src/domain/settlement.ts` hàm `eligibleLines`, `closePeriod`; `src/domain/shipper.ts`; `server/command-service.mjs` |
| A06 | P2 | FR-SP-01 | Chưa có quản trị danh mục động theo đặc tả tạo danh mục. Hiện danh mục là union và bảng nhãn cố định ba nhóm. Cần mô hình danh mục, trạng thái và form/API quản trị nếu giữ yêu cầu này. | `src/domain/types.ts:62`; `src/screens/customer/ProductCatalogPage.tsx` |
| A07 | P2 | UC-SP-02, BR-SP-12; UC-HTX-06 | Chưa có lưu nháp sản phẩm và giữ nháp 30 ngày. Product hiện chỉ active/hidden/pending/rejected. | `src/domain/types.ts` interface `Product`; `src/domain/productChanges.ts` |
| A08 | P2 | UC-SP-02/06; UC-HTX-10/12 | Chưa đủ bộ ảnh 1–6, các trường vận hành/bảo quản/hạn dùng/thời gian chuẩn bị theo đặc tả, số và ngày cấp chứng nhận, khóa sửa có TTL. Hiện có một `image`, thông tin chứng nhận cơ bản và preorder/express ở phạm vi hiện có. | `src/domain/types.ts:112`, `Certification`, `ProductContent`; các form HTX |
| A09 | P2 | UC-HTX-13; UC-CS-01 BR04 | Có màn xem nguồn gốc, chưa có luồng tạo/quét QR gắn đúng sản phẩm–HTX–mã lô, ngày đóng gói và lịch sử truy xuất theo lô. Không nên coi nút xem nguồn gốc là hoàn thành QR truy xuất. | `src/screens/customer/TraceLotSheet.tsx`; `src/domain/harvest.ts` |
| A10 | P2 | UC-ACC-01/04/06; BR-HTX-02 | Chưa quản lý MST HTX duy nhất và cố định sau duyệt trong hồ sơ HTX theo tài liệu tài khoản mobile. MST trong yêu cầu hóa đơn khách hàng là nghiệp vụ khác. Chưa có kiểm tra giấy phép/MST với dịch vụ cấp phép. | `src/domain/coopApplication.ts`, `coopProfile.ts`, interface hồ sơ trong `types.ts`; đối chiếu `invoice.ts` |
| A11 | P2 | UC-CS-03/04/05/06 | Ticket hiện thiên về khiếu nại hàng đã giao, phải chọn sản phẩm và có ảnh. Chưa đủ các nhóm hỏi đơn/giao trễ/hủy/khác, bổ sung bằng chứng bởi khách sau khi gửi, phân công người xử lý chính và đơn vị vận chuyển, trạng thái chờ xác minh. Đã có hạn ACK/resolve và lịch sử; không phải thiếu toàn bộ SLA. | `src/domain/complaint.ts`; `types.ts` `ComplaintReason`, `Ticket`, `TicketStatus` |
| A12 | P2 | FR-DH-05; UC-DH-16; UC-CS-06 | Chưa có quy trình đổi hàng/giao bù độc lập, theo dõi kiện đổi/bù và kết quả. Hoàn tiền hiện tính từ các dòng sản phẩm được chọn; chưa có luồng nhập/phê duyệt số tiền hoàn một phần tùy ý theo kết luận CSKH. Tài liệu Hoàng Đạt lại quy định hoàn 100% phần tiền hàng đã thu; phải thống nhất chính sách trước khi triển khai. | `src/domain/complaint.ts` input và `cskhUpdateTicket`; `orders.ts`, `refund.ts` |
| A13 | P2/P3 | UC-CS-07/08/10 | Có chấm sao, ảnh, giới hạn nội dung, một review/sản phẩm/đơn, ẩn có lý do và phản hồi HTX. Chưa có cấu hình review chờ duyệt/từ chối, gắn cờ an toàn thực phẩm và báo cáo review/SLA đầy đủ. Chưa kiểm tra thời hạn đánh giá; mốc 30 ngày trong tài liệu là đề xuất cần chốt. | `src/domain/reviews.ts`; `types.ts:796`; các màn review/Admin |
| A14 | P2 | FR-MH-02.2/02.3/02.4; BR-MH-16 | Trang catalog mới chưa có gợi ý/lịch sử tìm kiếm, bộ lọc mua sẵn/đặt trước/chứng nhận/HTX/hoả tốc/sao, sắp xếp mới nhất/bán chạy. Reset hiện xóa cả từ khóa và danh mục, khác BR-MH-16. State bộ lọc chưa được lưu để phục hồi sau unmount/đi trang khác. Một số tiêu chí trong nguồn là Should/Could, không phải tất cả Must. | `ProductCatalogPage.tsx`, `StorefrontContext.tsx`; `src/domain/marketplace.ts` |
| A15 | P2/P3 | UC-MH-08/09 | Có chia sẻ native hoặc copy URL, nhưng chưa có mã giới thiệu, ghi lượt chia sẻ/mở, lưu attribution 7 ngày, preview/chia sẻ Facebook và deferred deep link sau cài app. | `ProductDetailSheet.tsx:61`; `AppShell.tsx` |
| A16 | P2 | FR-BCTK-01/02/03; UC-AD-06 | Xuất hiện chỉ hai loại summary/orders dưới dạng CSV, job hoàn tất ngay. Chưa có XLSX, xuất sổ đối soát/nhật ký theo bộ lọc, mang nguyên bộ lọc và `data_as_of` từ màn xem sang xuất, queue cho file lớn và đầy đủ phạm vi địa bàn. PDF trong nguồn ghi [CẦN CHỐT], không xếp thành thiếu bắt buộc. | `src/domain/reports.ts:16`; `server/app.mjs` nhánh reports/exports |
| A17 | P2/P3 | FR-HT-03 | Có audit append-only và API phân trang cho root, nhưng API chỉ hỗ trợ limit/before; chưa đủ tra cứu theo actor, hành động, outcome, đối tượng, thời gian và correlation ID, xuất nhật ký có lọc, cơ chế bảo lưu/kiểm chứng nhiều năm/outbox/DLQ. Một số mốc hiệu năng trong đặc tả còn [CẦN CHỐT]. | `server/app.mjs` nhánh `/api/v1/audit`; `server/database.mjs` |
| A18 | P2/P3 | UC-AD-04…12; FR-DT-04 | Sổ hiện nằm trong aggregate và kỳ chốt đơn giản. Chưa đầy đủ LedgerEntry nghiệp vụ chỉ thêm với trách nhiệm bên chịu hoàn, phí cổng, bồi thường, tiền tạm giữ/giải phóng, công nợ và chứng từ điều chỉnh. Tách người lập/duyệt và ngưỡng duyệt thứ hai là nội dung cần chốt trong nguồn, không mặc định là quy tắc đã phê duyệt. | `src/domain/settlement.ts`, `finance.ts`, `types.ts`; `server/database.mjs` |

## B. Đã có mã nền nhưng chưa thể coi là tích hợp thật

| Hạng mục | Hiện trạng | Cần bổ sung/xác nhận |
|---|---|---|
| Google | Đã có nút Google, xác minh credential hoặc Supabase OAuth/PKCE, tự liên kết/tạo khách. | Chưa có Client ID theo thông tin người dùng đã xác nhận; Gmail thật chưa kiểm thử. Xem `GOOGLE_LOGIN.md`. |
| Supabase | Có Postgres adapter, ba migration, Auth/Storage private và kiểm thử PostgreSQL cục bộ/adapter giả lập. | Người dùng chưa tạo project; chưa có URL/keys/database để triển khai và thử cloud thật. Local health hiện là `sqlite`, `demo:true`, `auth:local`, `images:inline`. |
| Thanh toán/hoàn/chi trả | Có state machine, idempotency, webhook HMAC và chặn xác nhận tiền demo trong chế độ thật. | Chưa có adapter outbound tạo giao dịch với merchant/provider thật, đối soát và xử lý thất bại hoàn chỉnh. Không phải chưa có backend thanh toán. |
| Vận chuyển | Có shipper, giao nhận, COD và hợp đồng webhook. | Chưa có API tạo/hủy vận đơn, lấy cước/tracking và đối soát với hãng vận chuyển thật. |
| Thông báo | Đã lưu và hiển thị thông báo trong app. | Chưa có push FCM/email/SMS thực cho toàn bộ sự kiện và theo dõi gửi lại. SMS adapter OTP chỉ hoạt động khi cấu hình. |
| Ngân hàng/hóa đơn | Có thông tin tài khoản nhận hoàn và thông tin yêu cầu hóa đơn. | Liên kết ngân hàng vẫn mô phỏng; chưa phát hành hóa đơn điện tử thật. Đây không phải cùng một chức năng với lưu MST khách hàng. |

## C. Phạm vi cần thống nhất, không tự sửa ngược yêu cầu người dùng

1. Người dùng đã yêu cầu bỏ OTP ở đăng nhập/đăng ký khách và chọn Gmail. Việc không yêu cầu OTP ở hai trang này là thay đổi được chấp nhận, **không xếp là lỗi cần bật OTP trở lại**. SĐT đăng ký local vì vậy chưa được xác minh quyền sở hữu; cần xác định chính sách khi chạy thật.
2. Đặc tả có Bắc Giang, Lào Cai và địa chỉ giao nội thành Hà Nội/Vinhomes Smart City. Dự án đang dùng Lào Cai, giao Hà Nội. Cần chọn một phạm vi nghiệm thu chính thức.
3. Tài liệu UC-CS mới rộng hơn bản chức năng của Quỳnh Anh: tài liệu sau ghi không tự thêm SLA/biểu đồ/Excel, trong khi UC-CS-10 lại có các nội dung đó. Các phần mở rộng phải được xác nhận phạm vi.
4. Tài liệu mobile yêu cầu Face ID/vân tay native, trusted device, FCM device token, lưu phiên bằng Keychain/Keystore, deep link sau cài. Dự án là web React; chưa có ứng dụng native. Cần quyết định có nghiệm thu các yêu cầu đó trên web hay triển khai mobile riêng.
5. Các ngưỡng giữ tiền, công thức tài chính, hai người duyệt, SLA, PDF và retention có nhiều mục [CẦN CHỐT]. Không tự điền giả định rồi tuyên bố đúng đặc tả.

## D. Kiểm chứng thực hiện trong lần rà soát

- TypeScript: `npm run lint` đạt.
- Unit: **251/251** đạt.
- Backend HTTP/PostgreSQL: **35/35** đạt.
- Vite production build đạt.
- Kiểm tra trình duyệt trực tiếp với phiên khách mới: mở `/#/san-pham/prod-che`, sản phẩm có trên trang nhưng **0 dialog chi tiết**; xác nhận A03.
- Thử domain bằng fixture trong bộ nhớ, không sửa DB đang chạy: mô tả khiếu nại rỗng được chấp nhận; review sau 31 ngày được chấp nhận; password `aaaaaaaa` được chấp nhận. Xác nhận A04, A02 và việc chưa có thời hạn trong A13. Mốc review 30 ngày vẫn cần chốt.
- Không chạy lại trọn bộ e2e trong lần audit này để tránh dừng dev server đang chạy. Kết quả gần nhất trước audit: 9 kịch bản đạt, có Google OAuth **giả lập**; không phải thử Gmail thật.
- Chưa kiểm thử tải, phục hồi backup, HA, cloud Supabase và provider thanh toán/vận chuyển thật. Không suy ra NFR đã đạt từ unit test.

## E. Thứ tự triển khai đề xuất

1. Sửa A03/A04; hoàn thiện kích hoạt/đổi/khôi phục mật khẩu và quy tắc khóa tài khoản; bật Google thật.
2. Chốt đặc tả hợp nhất, địa bàn và các chính sách còn mâu thuẫn; tạo project Supabase nếu tiếp tục chọn nền tảng này.
3. Hoàn thiện danh mục động, nháp/ảnh/trường sản phẩm, MST và QR theo lô; bổ sung ticket/đổi-bù hàng và review.
4. Hoàn thiện đối soát và điều kiện tiền đủ chi trước khi tích hợp thu/hoàn/chi thật; bổ sung báo cáo theo bộ lọc và XLSX.
5. Push/email, backup/restore, kiểm thử tải và phạm vi mobile nếu nằm trong nghiệm thu.

## Danh mục nguồn đã lấy lại từ Drive

Các file `.txt` tương ứng ở `docs/specifications` có tiêu đề và URL nguồn. Thứ tự:

01. [CSKH & Review](https://docs.google.com/document/d/1oRqtKEjhBxElO5GpcFQuUzHsTqEdY_5lO4bE6S1l0C4/edit)
02. [Nhật ký HT-03](https://docs.google.com/document/d/1BpzA-12A9FzbP9XE343Taz9kpghC9ecl/edit)
03. [Dashboard BCTK-01](https://docs.google.com/document/d/1IdTBFFFFGkab61mnqK2TiAzddt2iRnU-/edit)
04. [Doanh thu BCTK-02](https://docs.google.com/document/d/1-VTO7pbZPpLmU9PSNsGF9Dy7jO89Vd5L/edit)
05. [Xuất báo cáo BCTK-03](https://docs.google.com/document/d/1KsSyLo5ZohIErdYLtZFpM3IQUYYjx1nF/edit)
06. [Module khách hàng](https://docs.google.com/document/d/1GjlYeZRt9S-vpnomhI053wbrd1Q179T0UZg1HDoaqFs/edit)
07. [Module đơn hàng](https://docs.google.com/document/d/1S8Joip5mCdqx7uKpxa5FZGegWDCZ__b6xPUbR-dSh00/edit)
08. [UC sản phẩm](https://docs.google.com/document/d/1zGJt-zt71dFflvmkBuwwcI8DpvqnaSCjOvIS4SX3PSc/edit)
09. [Doanh thu DT và ưu đãi HT](https://docs.google.com/document/d/1e3_bhiciTUkYjWAovnN_m4GDVyDrCqg3/edit)
10. [Đặc tả Hoàng Đạt](https://docs.google.com/document/d/1lJIW2cmbQKuFmbLurfaY_Kew5CJQ2Ost/edit)
11. [Chức năng Quỳnh Anh](https://docs.google.com/document/d/1uOKzilRqRh680uGmr7u6p08dBC9v8BMpeRNhr-xWZI0/edit)
12. [Tài khoản TK](https://docs.google.com/document/d/1EtLW_BH6Ktafo2wnT4R7eoDyJpJ9SZuLhU6HyVGXjOQ/edit)
13. [Module AD](https://docs.google.com/document/d/11cha049Vn1_MiO7N9414pUB7v846g1yU/edit)
14. [HTX](https://docs.google.com/document/d/1t9Xle-iygLIPksIb8jLtlu3W1Nm_iQe7TVXdTmzdfIw/edit)
15. [Mua hàng MH](https://docs.google.com/document/d/1KYEgeuNZAS6urTtfpWlQbUNutSWxfkGr/edit)
16. [Tài khoản mobile](https://docs.google.com/document/d/1JS92EFLAec7homvFvsPc3rQu8zA7eynT/edit)
