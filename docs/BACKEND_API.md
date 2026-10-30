# API backend

Thông báo thiết bị: `GET/POST /api/v1/me/push` (đăng ký/xóa thiết bị của chính mình). Tạo phiên thanh toán: `POST /api/v1/transactions/:id/session` (chỉ khách sở hữu giao dịch còn hạn). [Hợp đồng adapter và cấu hình](SRS_PUSH_PAYMENT_2026-10-29.md). Tạo phiên hoặc redirect không xác nhận tiền đã thu.

Quyết định hiện hành: **chỉ shipper được phân công tự cập nhật giao hàng**. RPC `carrierSimulate` và webhook `/api/v1/webhooks/carrier` bị chặn cả trong demo. Vận hành chỉ phân công/quản lý điểm nhận. API yêu cầu xóa có thêm bước đóng truy cập và kiểm tra nghĩa vụ, chưa xóa dữ liệu lịch sử. [Quyết định và giới hạn](SRS_ACCESS_DECISION_2026-10-29.md).

Cập nhật bàn giao/hoàn ngân hàng: Vận hành dùng `POST /api/v1/orders/:id/pickup-point` để lưu điểm nhận và người bàn giao (khóa sau shipper lấy hàng). Tài chính dùng `POST /api/v1/refunds/:id/record` để ghi chứng từ hoàn ngoài hệ thống cho đích ngân hàng, khớp số tiền/tài khoản và chống ghi lặp; không tự chuyển tiền hoặc thay hoàn về nguồn gốc. [Chi tiết quyền, payload và giới hạn](SRS_HANDOVER_REFUNDS_2026-10-29.md).

> Cập nhật quyền theo [SRS hợp nhất 29/10](SRS_IMPLEMENTATION_2026-10-29.md). Các ví dụ RPC HTX sửa/tạo sản phẩm trong phần lịch sử bên dưới đã bị chặn. Quality dùng `POST /api/v1/catalog/products` và `POST /api/v1/catalog/products/:id`; bản nháp và khóa chỉnh sửa cũng chỉ dành cho Quality. HTX chỉ cập nhật tồn kho và mùa vụ. Root tạo Admin, quản lý nhóm quyền và đọc audit/tham số, không thao tác nghiệp vụ.

API bổ sung: `/api/v1/me/profile`, `/api/v1/me/phone/start`, `/api/v1/me/phone/confirm`; khôi phục OTP `/api/v1/auth/password/forgot-otp` và `/reset-otp`; Vận hành sửa `/api/v1/homepage` và `/api/v1/catalog-dictionaries`; Tài chính ghi chứng từ chuyển tiền bên ngoài bằng `/api/v1/payouts/:id/record`. Các endpoint ghi dùng POST. OTP hết hạn sau 120 giây, tối đa 3 yêu cầu/15 phút/số; không thay thời hạn URL ảnh ký bên dưới. Ghi nhận chứng từ chi trả không tự chuyển tiền.

Base URL local: `http://127.0.0.1:4000`. JSON UTF-8. Lỗi trả `{error, correlationId?}`. Thời gian ghi UTC, nghiệp vụ ngày chạy theo `Asia/Ho_Chi_Minh` trong `server/start.mjs`.

## Bổ sung SRS — đánh giá HTX, yêu cầu xóa, xuất nền

Đăng ký SĐT/mật khẩu hiện bắt buộc gửi `/api/v1/auth/otp` với `{phone,purpose:"register"}`, rồi `/api/v1/auth/password/register` với `{name,phone,password,challengeId,otp}`. Không có challenge hợp lệ sẽ trả 401; OTP khác số trả 403. Thành công lưu `phoneVerifiedAt`. Đăng nhập mật khẩu không yêu cầu bước OTP mới.

`GET /api/v1/reconciliation-adjustments` dành riêng cho Tài chính. `POST` cùng đường dẫn: `{action:"propose",sessionId,rowIndex,amount,evidence,note,confirm:true}`; người lập rút bằng `{action:"cancel",id,note}`; nhân viên Tài chính khác dùng `{action:"approve"|"reject",id,note,confirm:true}`. Amount có dấu đúng chênh lệch, đảo dấu cho refund; server tính và kiểm lại. Chỉ `approve` thêm dòng sổ, không sửa đơn/kỳ chi trả hoặc gọi chuyển tiền.

- `GET /api/v1/coop-reviews?coopId=...`: đánh giá công khai, điểm trung bình; phiên khách nhận thêm các đơn đủ điều kiện của mình. `POST` cùng đường dẫn: `{action:"submit",orderId,stars,comment}`, `{action:"reply",id,reply}` cho HTX hoặc `{action:"moderate",id,status,reason?}` cho CSKH. Không nhận khách/HTX giả từ client.
- `GET /api/v1/account-deletion-requests`: khách/HTX thấy của mình, Vận hành thấy danh sách. `POST`: `{action:"submit",currentPassword,reason,confirm:true}`, `{action:"withdraw",id,note}`; Vận hành dùng `{action:"review",id,status,note}` với `needs_information|retention_review|rejected`. Chưa thực thi xóa dữ liệu do OI-19; không chấp nhận trạng thái `deleted`.
- `POST /api/v1/exports` thêm `background:true` để nhận 202 `{id,status:"QUEUED",expiresAt}`; dùng lịch sử GET hiện có để theo dõi. `POST /api/v1/exports/:id/retry` chỉ cho chủ job FAILED còn hạn và có quyền hiện tại. Download chỉ nhận job SUCCEEDED và kiểm checksum. Snapshot cố định khi xếp hàng; không trả dữ liệu nguồn trong lịch sử. Luồng xuất trực tiếp được giữ tương thích.

Chi tiết và giới hạn: [bổ sung SRS](SRS_FOLLOWUP_2026-10-29.md).

## Khi dùng Supabase

Xem [thiết lập Supabase](SUPABASE_SETUP.md). `POST /api/v1/auth/supabase` nhận `{accessToken}` do Supabase Auth cấp, server gọi `auth.getUser()` để xác minh và trả `{user,state,version}`. Các API nghiệp vụ nhận JWT Supabase trong header Bearer; quyền lấy từ tài khoản trong database, không lấy từ JWT role/user_metadata. Giao diện tự refresh bằng Supabase SDK. Luồng opaque token bên dưới tiếp tục phục vụ chế độ local/OTP cũ.

`POST /api/v1/media/upload` nhận `{dataUrl}` JPG/PNG/WebP và trả `{reference}` sau khi kiểm tra quyền/MIME. `POST /api/v1/media/sign` nhận `{reference}` và trả `{url,expiresIn:300}` nếu ảnh thuộc người dùng hoặc xuất hiện trong dữ liệu được phép xem. Không dùng service_role key trên trình duyệt.

## Xác thực

1. `POST /api/v1/auth/otp` với `{phone,purpose:"login"|"register"|"application"}` → `{challengeId,expiresIn,demo}`.
2. `POST /api/v1/auth/login` với `{challengeId,otp}` hoặc `/auth/register` với thêm `name`.
3. Dùng `Authorization: Bearer <accessToken>` cho API riêng tư. Access hết hạn sau 15 phút, refresh hết hạn sau 7 ngày.
4. `POST /api/v1/auth/refresh` với `{refreshToken}` quay vòng cả hai token và vô hiệu token cũ.
5. `POST /api/v1/auth/logout` với `{}` và access token hủy phiên. Khóa tài khoản hủy tất cả phiên, kể cả refresh.

OTP tồn tại 5 phút, dùng một lần, tối đa 5 lần nhập sai. Giãn yêu cầu lại 60 giây, tối đa 5 lần/SĐT/giờ, 15 lần/IP/giờ. Không nhận vai trò tự khai khi đăng ký. Phiên là opaque token ngẫu nhiên, server chỉ lưu hash; không dùng JWT vì cần thu hồi tức thì theo từng phiên.

`POST /api/v1/auth/google`: `{credential}` được server xác minh với Google. Chỉ khi DEMO_MODE mới chấp nhận `{simulated:true,email,name}`.

## Đọc dữ liệu

| API GET | Nội dung |
|---|---|
| `/api/health` | Kiểm tra server, chế độ demo, loại kho dữ liệu |
| `/api/v1/me` | Tài khoản của phiên |
| `/api/v1/state` | Snapshot đã lọc quyền + version; khách vãng lai chỉ có dữ liệu công khai |
| `/api/v1/products?q=&category=&page=1&limit=20` | Sản phẩm đang bán; limit tối đa 100 |
| `/api/v1/products/{id}` | Chi tiết sản phẩm trong phạm vi được xem |
| `/api/v1/cart` | Giỏ riêng của khách, tách ready/preorder |
| `/api/v1/me/addresses` | Sổ địa chỉ của khách hiện tại |
| `/api/v1/orders` | Khách: của mình; HTX: gian hàng mình; shipper: được phân công; Admin: theo nghiệp vụ |
| `/api/v1/admin/users?role=&status=` | Root/Vận hành quản lý tài khoản |
| `/api/v1/reports/dashboard?range=7d` | Admin/QLNN xem thống kê; QLNN không có dữ liệu cá nhân |
| `/api/v1/audit?before=&limit=50` | Root xem nhật ký append-only; limit tối đa 200 |

`POST /api/v1/checkouts/plan` nhận dữ liệu đặt hàng và trả giá/điều kiện tính tại server. `customerId` luôn lấy từ phiên.

## Ghi nghiệp vụ

`POST /api/v1/commands`, bắt buộc Bearer token và header `Idempotency-Key` dài 8–128 ký tự gồm chữ, số, `_`, `-`.

```json
{"commands":[{"name":"addToCart","args":[null,"prod-che",1,null]}]}
```

`args` giữ thứ tự các tham số của hàm domain sau `state`. Server luôn thay `state`, `actor`, thời điểm thao tác và mã khách bằng dữ liệu tin cậy; không nhận quyền từ client. Date mang ý nghĩa ngày chốt kỳ được kiểm tra riêng. Ví dụ trên không thể thêm giỏ của khách khác dù thay null bằng mã của họ.

Tối đa 10 thao tác trong một batch, cùng một transaction: tất cả thành công hoặc tất cả hoàn tác. Khóa lặp lại với cùng payload trả kết quả đã lưu; khóa dùng với payload khác trả 409. Danh sách chính thức: `server/commands.json`. Không cho phép gọi tùy ý tên hàm hoặc gửi mã JavaScript lên server.

Các nhóm đã nối: địa chỉ, giỏ, đặt/hủy/sửa/nhận đơn, tài khoản, sản phẩm/quy cách/chứng nhận, hồ sơ HTX, CSKH, đánh giá, chat, thu hoạch, phân công shipper, COD, hoàn tiền, kỳ chi trả, voucher, tham số, thông báo, yêu thích và theo dõi mùa vụ.

API REST tương đương (cũng yêu cầu Idempotency-Key):

| Method | Đường dẫn | Body |
|---|---|---|
| POST | `/api/v1/me/addresses` | AddressInput |
| PUT | `/api/v1/me/addresses/{id}` | AddressInput |
| PUT | `/api/v1/me/addresses/{id}/default` | `{}` |
| DELETE | `/api/v1/me/addresses/{id}` | Không cần body |
| POST | `/api/v1/cart/items` | `{productId,quantity}` |
| PUT | `/api/v1/cart/items/{productId}` | `{quantity?,deliveryDate?}` |
| DELETE | `/api/v1/cart/items/{productId}` | Không cần body |
| POST | `/api/v1/checkouts` | PlaceInput; không tự nhận giá/tổng tiền từ client |

QLNN không có API ghi. `/api/state` cũ trả 410. Thao tác xác nhận tiền/giao hàng mô phỏng chỉ chạy với DEMO_MODE.

## Hồ sơ HTX và báo cáo

- `POST /api/v1/applications`: `{challengeId,otp,input,applicationId?}`; OTP phải thuộc SĐT người đại diện trong hồ sơ.
- `POST /api/v1/applications/lookup`: `{challengeId,otp}`; chỉ trả hồ sơ của SĐT đã xác minh.
- `GET /api/v1/reports/dashboard?range=7d|30d|all`: trả số liệu cùng `snapshotId`, `dataAsOf`, version. Snapshot giữ 15 phút, tối đa 10 phiên/tài khoản, không chứa liên hệ khách.
- `POST /api/v1/exports`: `{kind,format:"csv"|"xlsx",filters?,snapshotId?}`. Kind gồm summary/orders/coops/products/ledger/audit/tickets/reviews, kiểm tra quyền theo loại. Snapshot dashboard chỉ dùng summary/orders, bảo đảm dữ liệu xuất không đổi sau thao tác tiếp theo. Có bộ lọc ngày Việt Nam/vùng/HTX/trạng thái và audit outcome/correlationId. Chưa có queue lớn/FAILED/retry.
- `GET /api/v1/exports`: các yêu cầu xuất của chính mình.
- `GET /api/v1/exports/{id}/download`: kiểm tra lại vai trò, chủ sở hữu và hạn; CSV UTF-8 BOM, chống công thức bảng tính; ghi nhật ký lượt tải.

## Khóa sửa sản phẩm, đối soát và audit

- `POST /api/v1/products/{id}/edit-lock`: lấy khóa 5 phút, gửi `{token}` để gia hạn. `DELETE` cùng route với JSON `{token}` để nhả khóa. Khóa theo nhóm quy cách, đúng HTX/chủ phiên. Command `coopRequestContentChange` bắt buộc thêm `editToken` ở cùng cấp `name,args`; frontend tự gắn token. Client cũ không có token nhận 409 và phải cập nhật.
- `POST /api/v1/reconciliations`: `{provider,kind:"payment"|"refund"|"cod",csv,scope?:{from,to,coopId?}}`. Phạm vi theo ngày đặt đơn; mỗi dòng tổng tiền của một đơn. Có `missing_partner` nếu đơn có tiền trong hệ thống thiếu trong CSV của phạm vi. Không suy ra đơn thiếu ngoài phạm vi hoặc khi không chọn phạm vi.
- Cùng route nhận `{reviewSessionId,rowIndex,status:"reviewed"|"reopened",note}` để ghi lịch sử điều tra chênh lệch; note 10–2.000 ký tự; không thay số tiền hoặc kết quả đối soát gốc.
- `GET /api/v1/audit`: thêm `outcome=success|failure|unknown` và `correlationId`, khớp `X-Request-ID` HTTP. Bản ghi lịch sử chưa có metadata giữ `unknown`; lọc cùng quy tắc khi xuất audit. Chỉ Root truy cập.
- Backup, cấu hình SMS và kiểm tra triển khai: xem [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md).

## Callback nhà cung cấp

`POST /api/v1/webhooks/payment|refund|payout|carrier`. Chưa cài adapter riêng của hãng nào. Adapter của nhà cung cấp phải chuyển sự kiện thành hợp đồng JSON bên dưới và ký bằng khóa tương ứng.

Headers:

```text
Content-Type: application/json
X-Webhook-Timestamp: <Unix seconds>
X-Webhook-Signature: <hex HMAC-SHA256(secret, timestamp + "." + rawBody)>
```

Chữ ký tính trên **đúng byte JSON gửi đi**. Chấp nhận lệch tối đa 5 phút. `eventId` duy nhất theo nhà cung cấp; gửi lại cùng sự kiện không hạch toán lần hai. Cùng ID với nội dung khác bị từ chối.

```json
{"eventId":"evt-123","transactionId":"TX-...","amount":120000,"currency":"VND","result":"success","providerRef":"bank-123"}
```

Refund thay transactionId bằng `refundId`, payout bằng `periodId`, kết quả phải success và số tiền phải khớp bản ghi. Carrier: `{eventId,orderId,event:"picked_up"|"delivered_reported"|"failed"|"refused",reason?}`. Không cấp khóa webhook cho trình duyệt.

Hệ thống chưa tự tạo yêu cầu thu/hoàn/chuyển tiền hoặc vận đơn với hãng thật. Cần adapter outbound và thông tin merchant của nhà cung cấp trước khi bật nghiệp vụ tiền thật. Không dùng callback tùy ý để thay cho chứng từ ngân hàng.
