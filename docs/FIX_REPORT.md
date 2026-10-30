# Báo cáo sửa prototype "Đặc Sản Số Lào Cai"

Tài liệu này cập nhật sau mỗi giai đoạn của `PROMPT_SUA_APP.md` (bản 2 ngày 18/10/2026 thêm Giai đoạn 7–10). Mã trong ngoặc (`BR-…`, `FR-…`, `PAR-…`, `OI-…`) là mã trong SRS hợp nhất.

| Giai đoạn | Nội dung | Tình trạng |
|---|---|---|
| 1 | Hợp nhất mã nguồn, sửa cấu hình build | **Xong** |
| 2 | Sửa lỗi L1–L18 | **Xong** |
| 3 | Dữ liệu dùng chung và đăng nhập | **Xong** |
| 4 | Chức năng mức Must theo vai trò | **Xong** |
| 5 | Nội dung và dữ liệu mẫu | **Xong** |
| 6 | Giao diện | **Xong** |
| 7 | Chế độ trình diễn an toàn, kiểm thử trình duyệt trong repo (đề bài bản 2) | **Xong** |
| 8 | Bổ sung cho khách hàng | **Xong** |
| 9 | Bổ sung cho HTX và Admin | Chưa làm |
| 10 | Cài lên màn hình chính, đo tốc độ | Chưa làm |
| Sau 7 | Vai trò Shipper, theo dõi vận chuyển (đợt 1); trang chủ kiểu sàn, Shop HTX, Kho voucher (đợt 2) | **Xong** |

## Chạy local

```bash
npm install
npm run dev      # http://localhost:3000, có sẵn /api/state lưu trong bộ nhớ server
npm run build    # ra thư mục dist/ (Vercel dùng thư mục này)
npm run lint     # kiểm tra kiểu TypeScript
npm test         # unit test vitest: src/domain, dữ liệu mẫu, quy ước giao diện
npm run e2e      # kiểm thử trình duyệt (Playwright): tự build, chạy vite preview cổng 4173, chạy các luồng trong e2e/
```

Lần đầu chạy `npm run e2e` trên máy mới: `npx playwright install chromium` để tải trình duyệt.

### Kết quả lần chạy cuối (Giai đoạn 8, 19/10/2026)

| Lệnh | Kết quả |
|---|---|
| `npm run lint` | Không lỗi |
| `npm test` | 35 file, 251 test, tất cả đạt (có T1–T34) |
| `npm run build` | Thành công, không cảnh báo. Phần chung 444 kB (gzip 132 kB); màn HTX, Admin, QLNN, Shipper và các sheet ít mở (shop HTX, yêu thích, kho voucher, báo khi vào mùa, hoá đơn công ty…) tải riêng |
| `npm run e2e` | 19 kịch bản, tất cả đạt (khoảng 3 phút): Luồng 1–7, Luồng Shipper, Luồng sàn, chế độ trình diễn, 3 tình huống lỗi của bản web, giao diện ở 320 / 390 / 768 / 1.280 / 1.920px. Không lỗi JS ngoài lỗi có chủ đích của từng kịch bản |
| Kiểm tra giao diện trong `npm run e2e` (axe-core 4.10 + đo vùng bấm, cỡ chữ, tràn ngang) | 0 lỗi axe, 0 vùng bấm dưới 44×44, 0 chữ dưới 12px, không tràn ngang (có các màn mới của Giai đoạn 8: báo khi vào mùa, trang HTX, tin nhắn kèm ảnh, hoá đơn công ty, khoảng giá tự nhập) |

---

## Giai đoạn 8 – Bổ sung cho khách hàng

Theo `PROMPT_SUA_APP.md` bản 2, mục 9. Nghiệm thu: T30–T34 (unit test) và Luồng 7 (`e2e/luong7.e2e.ts`) đều đạt.

| Việc (mục của đề bài) | Tình trạng | Ghi chú |
|---|---|---|
| 9.1 Trang HTX công khai | **Đã làm** | Mở từ tên HTX ở thẻ sản phẩm, tab Vụ mùa, trang chi tiết, chi tiết đơn, hộp tin nhắn. Có chứng nhận đã xác minh, nhãn dữ liệu mẫu. Không SĐT, không địa chỉ |
| 9.2 "Báo tôi khi vào mùa" | **Đã làm** | Mỗi khách theo dõi nhận đúng 1 thông báo cho mỗi đợt; danh sách ở Tài khoản |
| 9.3 Yêu thích và theo dõi HTX | **Đã làm** | Đã có từ đợt 2 kiểu sàn |
| 9.4 Sắp xếp và lọc giá | **Đã làm** | Đã có từ đợt 2; thêm khoảng giá tự nhập từ / đến |
| 9.5 Ảnh trong tin nhắn | **Đã làm** | Tối đa NEW-04 ảnh mỗi tin, cả nhắn tin riêng và trao đổi theo đơn. Dung lượng dữ liệu chung là ước lượng (giả định 110) |
| 9.6 Yêu cầu xuất hoá đơn công ty | **Mô phỏng** | Ghi rõ "Mô phỏng – chưa phát hành hoá đơn điện tử"; không gửi email, không kết nối hệ thống hoá đơn |

### Trang HTX công khai

- **Mở từ:**
  - tên HTX ở thẻ sản phẩm (nút riêng, cao 44px, nằm ngoài nút "Xem" của thẻ);
  - tên HTX ở thẻ tab Vụ mùa;
  - khối shop ở trang chi tiết sản phẩm;
  - tên HTX ở chi tiết đơn của khách;
  - nút "Trang HTX" ở đầu cuộc trò chuyện.
- **Nội dung thêm so với đợt 2:**
  - "Chứng nhận đã xác minh": chứng nhận Admin – Chất lượng đã duyệt, còn hiệu lực, của các sản phẩm đang bán. Cùng tên và nơi cấp thì gộp một dòng, ghi tên các sản phẩm.
  - Nhãn "Dữ liệu mẫu – chờ HTX xác nhận" với HTX mẫu (tên có "mẫu" hoặc sản phẩm có ghi chú mẫu).
- **Không có SĐT, địa chỉ HTX:** `coopShop()` chỉ trả các trường công khai. Luồng 7 kiểm trên màn: không có số 0900 000 46x của HTX mẫu Tú Lệ, không có địa chỉ mẫu.

### "Báo tôi khi vào mùa"

- **Nút hiện khi:** sản phẩm đặt trước đang hiển thị nhưng chưa đặt được (chưa mở, hết suất, hết thời gian nhận đặt, HTX tạm khoá quyền bán).
  - Ở trang chi tiết (chân trang, trên nút đặt) và ở thẻ tab Vụ mùa.
  - Bấm để theo dõi; bấm lần nữa ("Đã bật báo khi vào mùa · bấm để tắt") để bỏ.
  - Sản phẩm đang nhận đặt trước thì không hiện nút: khách đặt được ngay.
- **Thông báo:**
  - Khi Admin – Chất lượng duyệt "Báo thu hoạch / mở đợt đặt trước" và sản phẩm đặt được ngay, mỗi khách theo dõi nhận 1 thông báo "<sản phẩm> đã vào mùa" kèm khoảng ngày giao. Bấm vào mở trang sản phẩm.
  - Đợt nhận diện bằng khoảng ngày giao. Duyệt thêm suất trong cùng đợt không báo lại; đợt có ngày giao khác thì báo lại.
- **Danh sách theo dõi:** Tài khoản → Tiện ích → "Báo khi vào mùa". Mỗi dòng ghi "Đang chờ vào mùa" hoặc "Đang nhận đặt trước – đặt ngay"; có nút Tắt.
- Theo dõi lưu theo nhóm quy cách như Yêu thích; ghi rõ bật / tắt để thao tác chạy lại sau đồng bộ (máy khác vừa ghi) vẫn đúng.

### Ảnh trong tin nhắn (NEW-04)

- **Đính ảnh:** nút ảnh cạnh ô nhập ở hộp tin nhắn (nút chat nổi, tab Tin nhắn của HTX) và ở phần trao đổi theo đơn.
  - Ảnh thu nhỏ cạnh dài 320px như ảnh khiếu nại.
  - Tối đa NEW-04 ảnh mỗi tin; chọn quá thì báo "Mỗi tin nhắn tối đa 2 ảnh." và giữ 2 ảnh đầu.
  - Tin chỉ có ảnh gửi được. Thông báo và danh sách cuộc trò chuyện ghi "[2 ảnh]".
- **Dữ liệu dùng chung gần đầy:**
  - App ước lượng dung lượng sau khi nén (giả định 110).
  - Từ 85% giới hạn 900 KB trở lên: báo ngay khi chọn ảnh, trước khi gửi, và không nhận thêm ảnh.
  - Tin nhắn chữ không bị chặn vì dung lượng. Gửi không được thì chữ và ảnh đang soạn vẫn giữ nguyên.
- **Tham số NEW-04** "Số ảnh tối đa mỗi tin nhắn" = 2, trạng thái Demo, sửa ở màn Tham số (Admin – Vận hành).

### Yêu cầu xuất hoá đơn công ty (mô phỏng)

- **Bước đặt hàng (bước 2):** tick "Xuất hoá đơn công ty" rồi nhập 4 ô:
  - tên công ty;
  - mã số thuế: 10 chữ số, hoặc 10 chữ số + "-" + 3 chữ số;
  - địa chỉ;
  - email nhận.
- **Kiểm tra:**
  - Ô đã nhập sai thì báo ngay dưới ô; ô còn trống báo ở chân màn.
  - Còn lỗi thì không sang bước 3 được; `placeCheckout` kiểm tra lại.
- **Lưu:**
  - Thông tin được chuẩn hoá và chốt vào từng đơn của lần đặt (`order.invoice`).
  - Tuỳ chọn "Lưu làm thông tin mặc định cho lần sau".
  - Sửa hoặc xoá thông tin mặc định ở Tài khoản → "Hoá đơn công ty". Đơn đã đặt giữ thông tin lúc đặt.
- **Ai thấy:**
  - khách, trong chi tiết đơn;
  - HTX, trong chi tiết đơn ("Khách yêu cầu xuất hoá đơn công ty");
  - Admin – Tài chính, ở mục mới "Hoá đơn công ty" (bảng các đơn có yêu cầu).
- Mọi chỗ ghi "Mô phỏng – chưa phát hành hoá đơn điện tử".

### Khoảng giá tự nhập

- Ô "Khoảng giá" ở Khám phá có thêm "Tự nhập khoảng giá": hai ô Từ / Đến (đồng), tự thêm dấu chấm phân cách nghìn.
- Bỏ trống một đầu là không giới hạn đầu đó; nhập ngược thì tự đổi chỗ.
- Sản phẩm nhiều quy cách tính theo giá thấp nhất của các quy cách đang bán, như sắp xếp.

### Mã nguồn

- **Nghiệp vụ mới:**
  - `src/domain/seasonWatch.ts`: theo dõi vào mùa, xét sản phẩm đặt được ngay.
  - `src/domain/invoice.ts`: kiểm tra, chuẩn hoá, lưu thông tin hoá đơn.
  - `src/domain/dataBudget.ts`: ước lượng dung lượng, kiểm tra ảnh kèm tin.
- **Sửa:**
  - `notifications.ts`: thông báo vào mùa, lưu đợt đã báo ở `seasonAlerts`.
  - `checkout.ts`: hoá đơn trong lần đặt.
  - `coopChat.ts`, `orderContact.ts`: ảnh kèm tin.
  - `marketplace.ts`: chứng nhận và nhãn mẫu của trang HTX, `inPriceRange`, `parsePriceInput`.
  - `params.ts`: NEW-04.
  - `store/normalize.ts`: trường mới đọc được từ dữ liệu cũ.
- **Giao diện mới:**
  - `SeasonWatchButton`, `SeasonWatchSheet`, `CoopNameButton`, `InvoiceDefaultSheet` (màn khách);
  - `components/InvoiceFields.tsx`, `components/MessagePhotos.tsx`;
  - `screens/admin/FinanceInvoicesTab.tsx`.

### Kiểm thử

- **Unit test** `src/domain/__tests__/phase8.test.ts` (10 test):
  - **T30:** trang HTX không có SĐT, địa chỉ; điểm chỉ tính đánh giá Hiển thị; chỉ chứng nhận đã xác minh, còn hạn; nhãn HTX mẫu.
  - **T31:** lần duyệt đầu mỗi khách theo dõi 1 thông báo (mở trang sản phẩm); duyệt thêm suất cùng đợt không báo lặp; đợt mới thì báo; bỏ theo dõi thì không báo; chỉ khách, chỉ sản phẩm đặt trước chưa đặt được; dữ liệu cũ đọc được.
  - **T32:** sản phẩm có quy cách 135.000 và 225.000 xếp theo 135.000 và nằm trong khoảng 100.000–150.000.
  - **T33:** quá NEW-04 ảnh bị chặn; tin chỉ có ảnh gửi được; dữ liệu gần giới hạn thì chặn ảnh, tin chữ vẫn gửi được.
  - **T34:** mã số thuế "12345" bị chặn; đơn đã tạo giữ đúng thông tin hoá đơn lúc đặt khi khách đổi thông tin mặc định.
- **Luồng 7** (`e2e/luong7.e2e.ts`):
  1. Khách bật "Báo tôi khi vào mùa" cho Cốm Tú Lệ đã đóng đợt; thấy trong danh sách ở Tài khoản.
  2. HTX mẫu Tú Lệ báo đợt mới; Admin – Chất lượng duyệt.
  3. Khách nhận đúng 1 thông báo, bấm mở trang sản phẩm.
  4. Từ trang sản phẩm mở trang HTX: không SĐT, không địa chỉ.
  5. Thêm:
     - nhắn tin kèm ảnh (chọn 3 ảnh thì giữ 2);
     - đặt trước kèm hoá đơn (mã số thuế "12345" bị chặn);
     - HTX và Admin – Tài chính thấy thông tin hoá đơn;
     - duyệt thêm suất cùng đợt không báo lặp;
     - đổi thông tin mặc định, đơn cũ giữ nguyên;
     - lọc khoảng giá tự nhập.
  - Mỗi màn mới đều qua kiểm tra giao diện: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang.

---

## Sửa lỗi bản web: chuyển tab là báo lỗi (18/10/2026, lần 2)

**Chủ repo báo:** trên bản web, đăng nhập và bấm sang tab khác (Vụ mùa, Tài khoản…) thì hiện "Không hiển thị được màn này"; bấm tải lại thì về tab Khám phá.

**Nguyên nhân:**
- Hai chỗ viết `useEffect(() => window.scrollTo({ top: 0 }), …)`:
  - màn khách, chạy khi đổi tab;
  - khung app, chạy khi đăng nhập / đăng xuất.
- Effect viết như vậy trả về đúng giá trị mà `window.scrollTo` trả về. Chrome bản mới cho các hàm cuộn trang trả về Promise. React coi giá trị đó là hàm dọn dẹp và gọi nó khi đổi tab / đổi tài khoản, nên báo "TypeError: … is not a function".
- Chromium dùng để kiểm thử (141) vẫn trả về rỗng, nên các kịch bản e2e trước đây không bắt được.
- Đã dựng lại đúng lỗi bằng cách giả lập Chrome mới: đăng nhập thì "Ứng dụng gặp lỗi"; tải lại rồi bấm "Vụ mùa" thì "Không hiển thị được màn này".

**Sửa:**
- Hai effect để thân hàm trong `{ }`, không trả về gì.
- `ui.test.ts` có quy ước mới: effect chỉ được trả về hàm dọn dẹp, không trả về giá trị của lời gọi hàm.
- `e2e/helpers.ts`: mọi "máy" trong kịch bản chạy như Chrome mới (các hàm cuộn trả về Promise). Đã kiểm ngược: bỏ bản sửa thì kịch bản giao diện thất bại với đúng lỗi "l is not a function".

**Theo dõi lỗi trên bản web:**
- Dải "Bản demo" ghi mã phiên bản (commit), để biết máy đang mở đúng bản mới nhất chưa.
- Khung báo lỗi hiện dòng "Lỗi: …" và phần "Chi tiết lỗi" có nút sao chép (thông báo lỗi, vị trí trong mã, trình duyệt; không chứa dữ liệu demo).

---

## Sau Giai đoạn 7 – Trang chủ kiểu sàn, Shop HTX, Yêu thích, Kho voucher (đợt 2)

Đợt 2 của yêu cầu ngày 18/10/2026 (xem đợt 1 bên dưới). Giữ màu thương hiệu, làm dễ dùng hơn. Không thêm chức năng kiểu sàn trái SRS: không xu, không mã freeship, không cộng nhiều mã, không hiện số lượng bán ra.

### Trang chủ (Khám phá)

- **Thanh tìm kiếm dính** ngay dưới thanh địa chỉ khi cuộn:
  - đang gõ: gợi ý tối đa 5 sản phẩm và 3 shop HTX khớp, nút "Xem tất cả N kết quả";
  - ô trống: **tìm kiếm gần đây** (6 từ khoá, nút "Xoá lịch sử");
  - lưới sản phẩm vẫn lọc ngay khi gõ như trước; Enter lưu từ khoá và cuộn tới kết quả.
- **Đầu trang gọn hơn** (thấp hơn khoảng một nửa trên điện thoại), số sản phẩm và số HTX lấy từ dữ liệu.
- **Lối tắt** dạng ô có biểu tượng: Hàng khô, Chế biến, Nông sản tươi (bấm để lọc, bấm lại để bỏ), Đặt trước, Kho voucher, Yêu thích (kèm số), Shop HTX, Đơn mua.
- **Mã ưu đãi:** dải vé mã đang phát hành, nút "Lưu" từng mã.
- **Shop HTX:** dải thẻ shop (tên, vùng, số sản phẩm, điểm đánh giá, số người theo dõi, 3 ảnh sản phẩm), nút "Xem shop".
- **Đã xem gần đây:** 12 sản phẩm mở gần nhất, nút "Xoá".
- **Lưới sản phẩm:**
  - sắp xếp: Phù hợp · Giá thấp → cao · Giá cao → thấp · Đánh giá cao (theo giá "từ" và điểm của cả nhóm quy cách);
  - lọc vùng như trước, thêm **khoảng giá** (dưới 100.000đ, 100.000đ – 200.000đ, trên 200.000đ);
  - thẻ sản phẩm có **trái tim Yêu thích** và **điểm đánh giá** (khi đã có đánh giá đang hiển thị).
- Khi đang tìm / lọc thì ẩn các dải quảng bá như trước để kết quả lên gần đầu trang.

### Shop HTX

- Mở từ dải Shop HTX, gợi ý tìm kiếm, khối shop ở trang sản phẩm, mục Yêu thích.
- Có: tên, vùng, giới thiệu, số sản phẩm đang bán, điểm đánh giá của shop (trung bình các đánh giá đang hiển thị của mọi sản phẩm), số người theo dõi, sản phẩm đang bán có sắp xếp, nút **Theo dõi** và **Nhắn tin** (mở tin nhắn riêng với HTX như nút chat nổi).
- **Không có SĐT, địa chỉ cửa hàng, người đại diện, tài khoản nhận tiền** (mục 5.9); trang ghi rõ điều này và chỉ cách liên hệ (nhắn tin, khiếu nại theo đơn). Unit test kiểm dữ liệu trang shop không chứa các thông tin này.
- HTX tạm khoá quyền bán: trang shop ghi "đang tạm ngừng nhận đơn".
- **Theo dõi:** khi Admin – Chất lượng duyệt **sản phẩm mới** của HTX (không tính quy cách thêm), khách đang theo dõi nhận thông báo "HTX … có sản phẩm mới"; bấm thông báo mở trang sản phẩm.

### Yêu thích

- Trái tim trên thẻ sản phẩm và trang sản phẩm. Lưu theo nhóm quy cách (thích hộp 300 g là thích cả sản phẩm).
- Tài khoản › Tiện ích › **Yêu thích**: sản phẩm yêu thích (mới trước; sản phẩm HTX đã ẩn hiện "Không còn bán", vẫn bỏ được) và HTX đang theo dõi (Xem shop, Bỏ theo dõi).

### Kho voucher

- Lưu mã ở trang chủ hoặc trong Tài khoản › Tiện ích › **Kho voucher**. Chỉ lưu được mã khách dùng được hoặc sắp tới ngày dùng; mã chỉ cho đơn đầu tiên không cho khách đã đặt hàng lưu.
- Mã đã lưu hiện kèm tình trạng (dùng được, chưa đến ngày, hết hạn, hết lượt, ngừng áp dụng); bỏ lưu được.
- **Bước đặt hàng:** mã đã lưu lên đầu danh sách, có nhãn "Đã lưu". Quy tắc mã giữ nguyên: mỗi lần đặt tối đa PAR-28 mã (= 1), chỉ giảm tiền hàng hợp lệ.

### Sửa thêm

- Thông báo cho shipper (được giao đơn, Tài chính xác nhận tiền) trước đây không bấm được; nay bấm mở đơn như khách và HTX.
- Thao tác Yêu thích / Theo dõi / Lưu mã ghi rõ bật hay tắt (không đảo trạng thái), nên khi máy khác vừa ghi và thao tác được chạy lại trên dữ liệu mới thì kết quả vẫn đúng.

### Mã nguồn

- `src/domain/marketplace.ts`: yêu thích, theo dõi, trang shop (chỉ trường công khai), kho voucher, sắp xếp, khoảng giá.
- Dữ liệu dùng chung thêm `favorites`, `follows`, `savedVouchers` (theo mã khách; không bắt buộc để dữ liệu cũ vẫn đọc được, có chuẩn hoá).
- Tìm kiếm gần đây và đã xem gần đây chỉ lưu trên máy (`src/store/viewerPrefs.ts`, localStorage), không đưa vào dữ liệu dùng chung.
- Giao diện: `ExploreTab.tsx` (làm lại), `CoopShopSheet.tsx`, `FavoritesSheet.tsx`, `VoucherWalletSheet.tsx`, `VoucherTicket.tsx`, `FavoriteButton.tsx`, `useMarketplace.ts`; sửa `ProductDetailSheet.tsx`, `CheckoutSheet.tsx`, `AccountTab.tsx`, `NotificationsSheet.tsx`.

### Kiểm thử

- Unit test mới `marketplace.test.ts` (12 test): yêu thích theo nhóm quy cách, sản phẩm đã ẩn, chạy lại thao tác không đảo kết quả, theo dõi và đếm người theo dõi, trang shop không lộ SĐT / địa chỉ / người đại diện / tài khoản, thông báo sản phẩm mới cho người theo dõi (không báo khi thêm quy cách), lưu / bỏ lưu mã và tình trạng mã, giới hạn kho, mã đã lưu lên đầu, sắp xếp theo giá và đánh giá, khoảng giá, chuẩn hoá dữ liệu.
- `e2e/luong-san.e2e.ts`: gợi ý và lịch sử tìm kiếm, sắp xếp giá, lọc khoảng giá, yêu thích, đã xem gần đây, shop HTX + theo dõi (không có SĐT HTX), lưu mã, mã đã lưu lên đầu ở bước đặt hàng; kiểm tra giao diện ở từng bước.

---

## Sau Giai đoạn 7 – Vai trò Shipper và theo dõi vận chuyển (đợt 1)

**Yêu cầu của chủ repo (18/10/2026):** thêm tab cho shipper, thêm các chức năng như Shopee, làm giao diện thân thiện hơn. Chủ repo chọn:
- đơn giao cho shipper do **Admin – Vận hành phân công** (đây là lựa chọn cho OI-01);
- làm cả 4 nhóm chức năng kiểu sàn: trang chủ kiểu sàn, Shop HTX + Yêu thích, Kho voucher, theo dõi vận chuyển chi tiết;
- giữ màu thương hiệu, làm dễ dùng hơn.

Chia 2 đợt. **Đợt 1 (bản này): vai trò Shipper, theo dõi vận chuyển, lọc đánh giá.** Đợt 2: trang chủ kiểu sàn, Shop HTX + Yêu thích, Kho voucher, giao diện thân thiện.

Không làm các chức năng kiểu sàn trái SRS: xu, mã freeship, cộng nhiều mã, số "đã bán" không có thật.

### Shipper

- **Tài khoản:** 2 shipper mẫu (0900 000 401, 0900 000 402); Admin – Vận hành cấp thêm được ở "Cấp & khoá tài khoản". Màn đăng nhập có nhóm "Giao vận".
- **Admin – Vận hành, tab "Giao hàng"** (thay tab "Mô phỏng ĐVVC"):
  - **Phân công shipper:** đơn Đang chuẩn bị / Đang giao, chọn shipper, ghi chú lấy hàng (chỉ shipper thấy); đổi shipper được khi chưa lấy hàng.
  - **Mô phỏng ĐVVC:** chỉ cho đơn Đang giao chưa có shipper (như trước).
- **Màn Shipper** (điện thoại trước):
  - thẻ số việc: cần lấy hàng, đang giao, đã giao, tiền thu hộ đang giữ;
  - tab vuốt: Cần giao · Đã giao · Chuyển hoàn · Thu hộ COD;
  - chi tiết đơn: tiền thu hộ (hoặc "khách đã thanh toán"), người nhận, nút gọi và mở bản đồ, hàng cần giao, điểm lấy hàng; đơn quà gửi người khác nhắc không đưa giấy tờ có giá.
- **Các bước của shipper:**
  - "Đã lấy hàng" (sau khi HTX bàn giao) → khách được báo đơn đang giao;
  - "Giao thành công": bắt buộc 1–2 ảnh giao hàng, ghi chú không bắt buộc. Theo mục 5.5, đơn sang Đã giao khi khách bấm Đã nhận hoặc sau PAR-26;
  - "Giao thất bại": chọn lý do (không liên lạc được, hẹn giao lại, vắng nhà, sai địa chỉ, khác + ghi rõ); quá PAR-27 lần giao lại thì chuyển hoàn;
  - "Khách từ chối nhận": bắt buộc lý do, chuyển hoàn.
- **Tiền thu hộ (mô phỏng):**
  - giao thành công đơn có thu khi nhận hàng thì shipper giữ khoản đó;
  - shipper bấm "Nộp tiền thu hộ" tạo phiếu nộp;
  - Admin – Tài chính xác nhận ở tab mới "Thu hộ COD", có bảng shipper đang giữ bao nhiêu.
- **Quyền:**
  - shipper chỉ thấy đơn được giao cho mình (kiểm trong domain);
  - không thấy SĐT, địa chỉ HTX (mục 5.9), không thấy tài khoản ngân hàng của khách;
  - thao tác của shipper có trong nhật ký.
- **Thông báo:** shipper khi được giao đơn hoặc bị chuyển đơn; khách khi shipper lấy hàng, giao chưa thành công, đã giao; Tài chính khi có phiếu nộp; shipper khi Tài chính xác nhận.
- Mã nguồn: `src/domain/shipper.ts`, `src/screens/shipper/`, `CarrierSimTab.tsx` (tab Giao hàng), `FinanceCodTab.tsx`. Mã Shipper cũ đang ẩn (`src/screens/_pending-OI-01/`) đã xoá.

### Theo dõi vận chuyển, lọc đánh giá

- **"Theo dõi vận chuyển"** trong chi tiết đơn của khách, của HTX và của shipper:
  - các mốc mới nhất ở trên: HTX bàn giao, shipper nhận đơn, đã lấy hàng, giao không thành công (lần, lý do), giao thành công (kèm ảnh giao hàng), khách xác nhận nhận hàng, chuyển hoàn;
  - không hiện ghi chú lấy hàng nội bộ.
- **Trang sản phẩm:** lọc đánh giá Tất cả · 5 sao … 1 sao · Có ảnh, mỗi nút kèm số đánh giá.

### Kiểm thử

- Unit test mới:
  - `shipper.test.ts`: phân công, quyền, lấy hàng → giao → thu hộ → Tài chính xác nhận, giao thất bại / chuyển hoàn, theo dõi vận chuyển;
  - `reviewFilter.test.ts`.
- `e2e/luong-shipper.e2e.ts`: 5 vai trò trên 5 máy, từ đặt đơn COD tới Tài chính xác nhận tiền thu hộ; khách thấy ảnh giao hàng và lần giao thất bại.
- Kiểm tra giao diện ở 5 cỡ màn hình có thêm màn Shipper: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang.

---

## Sửa lỗi bản web (18/10/2026)

**Chủ repo báo:** bản web (dacsan-vung-mien.vercel.app) lỗi rất nặng: không lưu được, mất dữ liệu; màn báo lỗi, trắng trang.

**Cách tìm lỗi:** môi trường kiểm thử bị chặn tên miền vercel.app nên không mở được bản web. Tìm các lỗi chỉ xảy ra trên bản deploy (dữ liệu dùng chung tích luỹ lâu ngày, deploy liên tục, gói Upstash miễn phí), rồi giả lập trên máy bằng 3 kịch bản trong `e2e/ben-vung.e2e.ts`. Cả 3 **thất bại trên bản `main` trước khi sửa** (bản đang chạy trên web) và đạt sau khi sửa:

| Tình huống | Bản trước khi sửa | Đã sửa |
|---|---|---|
| Dữ liệu dùng chung lưu từ bản cũ, thiếu trường (vd. thiếu danh sách khiếu nại, đánh giá) | **Trắng trang trên mọi máy**, lỗi `Cannot read properties of undefined (reading 'filter')`. Không ai đăng nhập được nên cũng không ai khôi phục được dữ liệu | Dữ liệu từ API và từ trình duyệt đều được chuẩn hoá trước khi hiển thị: thiếu trường thì bù giá trị mặc định, bản ghi hỏng thì bỏ (`src/store/normalize.ts`) |
| Vừa deploy bản mới khi tab đang mở (đã merge nhiều PR liên tiếp) | Đăng nhập HTX / Admin / QLNN: "Failed to fetch dynamically imported module", màn báo lỗi; bấm Thử lại vẫn lỗi | Không tải được mã của màn thì tự tải lại trang 1 lần để lấy bản mới, chặn lặp vô hạn (`src/app/chunkReload.ts`) |
| Cơ sở dữ liệu Upstash từ chối lúc mở app (vd. hết lượt của gói miễn phí) | App lặng lẽ chuyển sang "lưu trên trình duyệt này" và không thử lại: mỗi máy một dữ liệu, tải lại hay đổi máy là mất | App báo rõ lý do, giữ thay đổi trên máy, tự thử lại; Upstash trả lời thì gửi lên. Lỗi hết lượt được báo riêng để chủ repo kiểm tra gói Upstash |

Sửa thêm để dữ liệu dùng chung không đầy và lỗi không làm trắng trang:

- **Dữ liệu đầy (quá 900 KB) thì mọi lần lưu bị từ chối**, app còn gửi lại cả khối dữ liệu mỗi 10 giây:
  - máy chủ nén gzip trước khi lưu (dữ liệu chữ còn khoảng 1/5–1/10); đọc được bản ghi cũ chưa nén;
  - mỗi tài khoản giữ 40 thông báo mới nhất (trước đây thông báo tăng mãi);
  - bị từ chối vì quá lớn thì báo cách khôi phục và không gửi lặp; có thay đổi mới (vd. khôi phục dữ liệu mẫu) thì gửi lại;
  - Công cụ demo hiện dung lượng dữ liệu và số ảnh.
- **Đỡ tốn lượt Upstash:** quá 2 phút không thao tác thì hỏi máy chủ 30 giây/lần, quá 15 phút thì 60 giây/lần (trước đây luôn 10 giây); thao tác lại thì hỏi ngay.
- **Khung lỗi ở gốc app:** lỗi ở khung app không còn làm trắng trang mà hiện màn "Ứng dụng gặp lỗi" với:
  - nút tải lại trang và nút xoá dữ liệu trên máy này;
  - mục "Khôi phục dữ liệu mẫu" cho Quản trị gốc / Admin – Vận hành (SĐT + OTP mô phỏng), ghi dữ liệu mẫu lên máy chủ khi chính dữ liệu dùng chung làm app lỗi lúc mở.

**Việc chủ repo nên làm sau khi bản này deploy:**
1. Mở bản web, tải lại trang (Ctrl+Shift+R trên máy tính; trên điện thoại đóng hẳn tab rồi mở lại).
2. Đăng nhập Quản trị gốc (0900 000 209) → "Công cụ demo" → xem mục "Dữ liệu": trạng thái đồng bộ, dung lượng, lời báo lỗi nếu có.
3. Vẫn báo "vượt giới hạn của gói" thì vào trang quản lý Upstash (qua Vercel → Storage) xem số lệnh đã dùng trong tháng; cần thì nâng gói hoặc chờ sang tháng.
4. Dữ liệu cũ vẫn lỗi thì bấm "Khôi phục dữ liệu mẫu" (trong Công cụ demo, hoặc trên màn báo lỗi).
5. Muốn tôi kiểm tra trực tiếp bản web: thêm `dacsan-vung-mien.vercel.app` vào Allowed domains trong cài đặt mạng của môi trường làm việc.

---

## Giai đoạn 7 – Chế độ trình diễn an toàn, kiểm thử trình duyệt trong repo

Theo `PROMPT_SUA_APP.md` bản 2, mục 8. Mục tiêu: đem demo cho người ngoài mà dữ liệu không bị sửa, xoá ngoài ý muốn; kiểm thử chạy lại được bằng một lệnh. Chủ repo đồng ý thêm `@playwright/test` và `axe-core` vào devDependencies (18/10/2026).

| Việc (mục của đề bài) | Tình trạng | Ghi chú |
|---|---|---|
| 8.1 Mã trình diễn (NEW-01) | **Đã làm** | Quản trị gốc đặt / đổi / bỏ ở màn Tham số; màn đăng nhập ẩn danh sách tài khoản demo tới khi nhập đúng mã |
| 8.2 Giới hạn Công cụ demo | **Đã làm** | Tua giờ, gửi kết quả cổng, khôi phục dữ liệu: chỉ Quản trị gốc và Admin – Vận hành; kiểm quyền trong domain |
| 8.3 Tình trạng cấu hình | **Đã làm** | Trong Công cụ demo, chỉ đọc: dữ liệu dùng chung, đăng nhập Google, Google Maps, mã trình diễn |
| 8.4 Ghi rõ không phải bảo mật thật | **Đã làm** | Trên màn Tham số và trong báo cáo này |
| 8.5 Kịch bản trình duyệt trong repo | **Đã làm** | `npm run e2e`, 13 kịch bản trong `e2e/` |
| 8.6 Gắn mã T23–T28, sửa tên test cũ | **Đã làm** | Tên test bắt đầu bằng mã ca; sửa tên "khách thấy số mới" trong `coopContact.test.ts` |

### Mã trình diễn (NEW-01)

- **Ai đặt:** Quản trị gốc, ở mục mới "Tham số" của nhóm Quản trị gốc (đầu màn). Đặt, đổi hoặc bỏ mã; nhóm Admin khác chỉ thấy đã đặt hay chưa. Admin – Vận hành vẫn là nhóm duy nhất sửa được các tham số khác.
- **Mã:** 4–32 ký tự, chữ không dấu và số; không phân biệt hoa thường, bỏ khoảng trắng (bàn phím điện thoại hay tự viết hoa chữ đầu).
  - Chỉ lưu bản băm kèm muối; mã không hiện lại sau khi lưu, không ghi vào nhật ký.
  - Nhật ký ghi "Đặt / Đổi / Bỏ mã trình diễn" và người làm.
- **Màn đăng nhập khi đã đặt mã:**
  - danh sách tài khoản demo ẩn, thay bằng ô "Mã trình diễn" và nút "Hiện tài khoản demo";
  - nhập đúng thì hiện danh sách, nhớ theo tab (đóng tab là quên); Quản trị gốc đổi mã thì tab đã nhập mã cũ phải nhập lại;
  - đăng nhập bằng SĐT + OTP mô phỏng vẫn dùng được như cũ (mục 5.9).
- **Khôi phục dữ liệu mẫu giữ nguyên mã** (mã là cấu hình của buổi demo, không phải dữ liệu mẫu).
- **Cách dùng khi demo:** đăng nhập Quản trị gốc (0900 000 209) → Tham số → nhập mã → "Đặt mã". Trên máy trình diễn, nhập mã ở màn đăng nhập để hiện danh sách tài khoản.
- Mã nguồn: `src/domain/demoAccess.ts`, `AdminParamsTab.tsx` (mục NEW-01), `LoginScreen.tsx` (`DemoCodeGate`).

### Công cụ demo

- **Ai cũng mở được** để xem giờ demo và tình trạng cấu hình.
- **Chỉ Quản trị gốc và Admin – Vận hành** thấy và bấm được các nút thay đổi dữ liệu của mọi máy: tua thời gian (+15 phút, +24 giờ, +3 ngày, về giờ thật), gửi "tiền về muộn", gửi kết quả cổng lần hai, khôi phục dữ liệu mẫu.
  - Kiểm quyền trong domain (`demoShiftClock`, `demoResetClock`, `demoResetData`, `demoGatewaySuccess`), không chỉ ẩn nút.
  - Mỗi lần bấm ghi nhật ký (vd. "Tua thời gian demo +15 phút", "Khôi phục dữ liệu mẫu").
  - Người khác mở Công cụ demo thấy dòng giải thích và gợi ý: mở thêm một tab, đăng nhập Admin – Vận hành ở tab đó để điều khiển (mỗi tab giữ phiên đăng nhập riêng).
- **Cổng thanh toán mô phỏng** khi khách đang thanh toán (Thanh toán thành công / thất bại / Huỷ) không đổi, khách vẫn dùng được.
- **Tình trạng cấu hình** (chỉ đọc):

| Mục | Cách app biết |
|---|---|
| Dữ liệu dùng chung | `/api/state` trả dữ liệu thì "Đã nối"; trả 503 hoặc không gọi được thì "Chưa nối – đang lưu trên trình duyệt này" |
| Đăng nhập Google | Bản build có `VITE_GOOGLE_CLIENT_ID` thì "Thật", không thì "Mô phỏng" |
| Google Maps | `GET /api/geocode?status=1` (mới): chỉ trả đã có `GOOGLE_MAPS_API_KEY` hay chưa, không gọi Google, không tính lượt, không trả khoá |
| Mã trình diễn | Đã đặt / chưa đặt |

- Lời nhắc khi màn hình gặp lỗi đổi thành "nhờ Quản trị gốc hoặc Admin – Vận hành … Khôi phục dữ liệu mẫu".

### Đây là biện pháp cho buổi demo, không phải bảo mật thật

- API dữ liệu demo không có đăng nhập phía máy chủ: ai có link vẫn đọc và ghi được toàn bộ dữ liệu bằng cách gọi API trực tiếp.
- SĐT mẫu theo dãy `0900 000 xxx` nên đoán được, OTP mô phỏng luôn là `123456`: ai biết SĐT của Admin vẫn đăng nhập được.
- Vì vậy mã trình diễn chỉ tránh người xem demo bấm nhầm vào tài khoản Admin hoặc khôi phục dữ liệu giữa buổi; không chặn người cố ý.
- Bảo mật thật cần máy chủ có đăng nhập, OTP thật, phân quyền phía máy chủ (mục 12 của đề bài, ngoài phạm vi prototype).

### Kiểm thử trình duyệt trong repo (`npm run e2e`)

- **Cách chạy:** Playwright tự chạy `npm run build` rồi `vite preview` cổng 4173 (máy đã có server ở cổng này thì dùng lại).
  - Bản preview có `/api/state` lưu trong bộ nhớ server, nên các kịch bản chạy lần lượt và khôi phục dữ liệu mẫu (bằng Quản trị gốc) trước mỗi kịch bản.
  - Mỗi "máy" là một context riêng; mọi request ra ngoài localhost bị chặn.
  - Lỗi JS hoặc lỗi console làm kịch bản thất bại, trừ 409 (hai máy ghi cùng lúc) và 503 (chưa có khoá dịch vụ).
  - File kết thúc bằng `.e2e.ts` để `npm test` (vitest) không chạy nhầm.
  - Đã thử chèn lỗi cố ý (nút 20px không tên, chữ 10px, phần tử rộng 2.000px): phần kiểm tra giao diện báo đủ 4 lỗi.

| File | Nội dung |
|---|---|
| `e2e/luong1-2.e2e.ts` | Luồng 1 (mua sẵn + đặt trước + quà gửi người khác → HTX xác nhận, phiếu đóng gói không in giá, thu hoạch, bàn giao → ĐVVC mô phỏng → đã nhận, đánh giá, khiếu nại có ảnh → CSKH → Tài chính → QLNN thấy thêm 2 đơn). Luồng 2 (đơn online chưa trả, Admin – Vận hành tua 15 phút, đơn huỷ, tồn kho trả lại) |
| `e2e/luong3-4.e2e.ts` | Luồng 3 (chọn hộp 500 g, hỏi HTX về sản phẩm, HTX trả lời, không hiện SĐT). Luồng 4 (đặt trước mận, HTX xác nhận, thu hoạch kèm ảnh, nhắn tin mẫu, ghi cuộc gọi, khách trả phần còn lại, bàn giao; hành trình hai phía đủ 7 bước) |
| `e2e/luong5-6.e2e.ts` | Luồng 5 (nộp hồ sơ HTX: thiếu ảnh / OTP bị chặn → yêu cầu bổ sung → tra cứu, nộp lại → duyệt → HTX mới thêm sản phẩm → duyệt → khách tìm thấy). Luồng 6 (máy HTX tự thấy đơn mới trong 15 giây; hai máy HTX cùng xác nhận một đơn: máy chậm được báo, lịch sử chỉ có 1 lần xác nhận; tải lại khi đã xoá dữ liệu trên máy vẫn còn đơn) |
| `e2e/trinh-dien.e2e.ts` | Giai đoạn 7: quyền Công cụ demo theo vai trò, tình trạng cấu hình, mã trình diễn trên nhiều máy, nhật ký không ghi mã |
| `e2e/giao-dien.e2e.ts` | Kiểm tra giao diện ở 5 cỡ màn hình: đăng nhập, Khám phá, chi tiết sản phẩm, Vụ mùa, Đơn mua, chi tiết đơn, màn HTX, Tổng quan và Tham số Admin, Công cụ demo, QLNN |
| `e2e/helpers.ts` | Mở máy, đăng nhập bằng SĐT, khôi phục dữ liệu, kiểm tra giao diện |

- **Kịch bản hồi quy cũ (ngoài repo, dùng trong các lần trước):** sửa theo giao diện mới có chủ đích:
  - kịch bản khôi phục dữ liệu đăng nhập Quản trị gốc / Admin – Vận hành trước khi bấm;
  - 8 kịch bản bỏ đoạn tự khôi phục dữ liệu khi chưa đăng nhập (đã khôi phục trước mỗi kịch bản);
  - kịch bản Luồng 1–2 cũ (khách tự tua giờ) thay bằng `e2e/luong1-2.e2e.ts`.

### Việc cần chủ repo cấu hình trên Vercel

Không cần cấu hình gì thêm cho Giai đoạn 7 (`@playwright/test`, `axe-core` là devDependencies, không vào bản build). Ba mục còn thiếu từ trước:

| Mục | Chưa cấu hình thì | Hướng dẫn |
|---|---|---|
| Upstash Redis | Mỗi máy một dữ liệu riêng | Mục "API dữ liệu dùng chung giữa nhiều máy" |
| `VITE_GOOGLE_CLIENT_ID` | Đăng nhập Google chạy chế độ mô phỏng | Mục "Địa chỉ theo GPS (Google Maps) và đăng nhập bằng Google" |
| `GOOGLE_MAPS_API_KEY` | Nút lấy địa chỉ GPS báo chưa dùng được | Như trên |

Cấu hình xong, mở "Công cụ demo" → "Tình trạng cấu hình" để kiểm tra.

---

## Sau Giai đoạn 6 – Sửa theo file góp ý kiểm thử "Test demo chức năng"

**Yêu cầu của chủ repo:** sửa các lỗi trong file góp ý kiểm thử (3 trang: HTX, khách hàng, Admin).

| Trang | Góp ý | Đã làm |
|---|---|---|
| HTX | Thiếu danh sách tình trạng đơn (Đã huỷ, Đã hoàn tiền, Đã thanh toán, Đơn preorder). Đề xuất: lọc, vuốt sang phải để đổi danh sách | Danh sách đơn của HTX có 9 tab vuốt ngang như "Đơn mua" của khách, thêm lọc loại đơn, lọc thanh toán và ô tìm |
| HTX | Thêm quy cách bán hàng (vd. hộp mứt 300 g, 500 g), hiện các quy cách ở ngoài mục sản phẩm | HTX thêm quy cách cho sản phẩm; thẻ sản phẩm hiện các quy cách và giá "từ …"; trang chi tiết có ô chọn quy cách |
| HTX | Thêm SĐT, địa chỉ vào hồ sơ HTX | SĐT đã có (2 số). Thêm địa chỉ cửa hàng / nơi sản xuất, cùng quy tắc với SĐT |
| Khách | Thêm danh sách tình trạng đơn hàng (tab vuốt) | Đã có từ lần trước ("Đơn mua" trong Tài khoản), giữ nguyên |
| Khách | Tab riêng nhắn tin với HTX, nút chat nổi ở góc dưới | Nút chat nổi ở góc dưới mọi màn của khách; hộp tin nhắn theo từng HTX; HTX có mục Tin nhắn |
| Khách | Khiếu nại hiển thị theo đơn | Khiếu nại hiện trong chi tiết đơn (các bước xử lý), trên thẻ đơn, và trong mục "Khiếu nại theo đơn" |
| Admin | Thiếu quy trình phê duyệt HTX | HTX nộp hồ sơ đăng ký ở màn đăng nhập; Admin – Chất lượng tiếp nhận, thẩm định 4 mục, duyệt / yêu cầu bổ sung / từ chối; duyệt thì tạo HTX và tài khoản |
| Admin | Thiếu quy trình xử lý khiếu nại | Ticket đi theo các bước tiếp nhận → HTX phản hồi → kết luận → hoàn tiền → đóng; lọc theo bước, ghi bước cần làm tiếp |
| Admin | Danh sách HTX; danh sách sản phẩm đang bán của từng HTX | Mục "Danh sách HTX" (thay Danh bạ HTX) ở mọi nhóm quyền Admin: tìm, lọc, chi tiết HTX và sản phẩm đang bán |
| Admin | Tổng quan thêm biểu đồ | 5 biểu đồ: số đơn / tiền hàng theo ngày, đơn theo trạng thái, theo HTX, theo vùng, khiếu nại theo lý do (QLNN cũng thấy) |

### HTX: danh sách đơn theo tình trạng

- 9 tab giống "Đơn mua" của khách: Tất cả · Chờ thanh toán · Chờ xác nhận · Chờ thu hoạch · Chờ lấy hàng · Đang giao · Đã giao · Trả hàng · Đã huỷ.
  - Vuốt trái / phải trên danh sách để sang tab bên cạnh. Máy tính: bấm tab hoặc phím mũi tên.
  - Hàng tab dính dưới thanh trên cùng khi cuộn.
- Bộ lọc ở trên hàng tab, áp cho mọi tab; số trên mỗi tab đếm theo bộ lọc:
  - loại đơn: Mua sẵn / Đặt trước;
  - thanh toán: Đã thanh toán, Đã cọc – còn lại, Chưa thanh toán (COD chưa thu, chờ trả online), Đang hoàn tiền (chờ hoặc đang hoàn), Đã hoàn tiền;
  - tìm theo mã đơn hoặc tên sản phẩm, không phân biệt dấu.
- Thẻ đơn ghi thêm quy cách của từng sản phẩm và giờ đặt.
- Mã nguồn: `filterOrders`, `PAYMENT_FILTERS` trong `src/domain/orderTabs.ts`; `CoopOrdersTab.tsx` dùng lại `SwipeTabs`.

### Quy cách bán hàng

- **Mỗi quy cách là một sản phẩm riêng** (giá, tồn kho hoặc số suất, trạng thái riêng), nối về sản phẩm gốc bằng `variantOf`. Vì vậy giỏ, đơn, giữ hàng, duyệt giá, đánh giá dùng nguyên logic đang có.
- **HTX:** nút "Thêm quy cách" ở thẻ sản phẩm.
  - HTX nhập quy cách (vd. hộp 500 g), giá, tồn kho (hàng đặt trước: số suất, dùng chung khoảng ngày giao của sản phẩm).
  - Quy cách mới chờ Admin – Chất lượng duyệt như sản phẩm mới; màn duyệt ghi rõ "Quy cách mới".
  - Không trùng quy cách đã có (không phân biệt hoa thường, dấu); tối đa 6 quy cách mỗi sản phẩm.
  - Duyệt sửa tên, mô tả, nhóm hàng, vùng của một quy cách thì áp cho cả nhóm; quy cách giữ riêng.
- **Khách:**
  - mỗi sản phẩm một thẻ; thẻ hiện các quy cách và giá "từ …";
  - nút + mở trang chi tiết để chọn quy cách (sản phẩm một quy cách vẫn thêm thẳng vào giỏ);
  - trang chi tiết có ô chọn quy cách, mỗi ô ghi giá và "hết hàng" nếu hết; đánh giá gộp các quy cách, ghi quy cách của từng đánh giá;
  - giỏ, đơn, khiếu nại ghi quy cách của từng sản phẩm.
- **Dữ liệu mẫu:** mứt mận thêm hộp 500 g (225.000đ), gạo Séng Cù thêm túi 5 kg (280.000đ). Giá mẫu cùng mức đ/kg với quy cách gốc, nằm trong khoảng giá nhóm khảo sát.
- Bảng "Bán chạy" của HTX ghi kèm quy cách khi một sản phẩm có nhiều quy cách.
- Mã nguồn: `src/domain/variants.ts`, `CoopVariantFormSheet.tsx`, `VariantPicker.tsx`.

### Địa chỉ HTX

- Mục Hồ sơ của HTX: "Liên hệ của HTX: 2 số điện thoại và địa chỉ", một nút lưu. Lưu ngay, không chờ duyệt, có ghi nhật ký.
- Địa chỉ dài 10–200 ký tự. HTX mẫu có địa chỉ mẫu theo vùng, ghi rõ "(địa chỉ mẫu – chờ HTX cập nhật)".
- Chỉ Admin và chính HTX xem được, như SĐT. Test giao diện chặn màn của khách, QLNN và khung app dùng tới SĐT, địa chỉ HTX.

### Nhắn tin riêng với HTX

- **Nút chat nổi** ở góc dưới bên phải mọi màn của khách, có số tin chưa đọc. Điện thoại: nằm trên thanh dưới; máy tính: góc phải, không chồng thanh dưới.
- **Hộp tin nhắn theo từng HTX.**
  - Mỗi HTX một cuộc trò chuyện, gộp cả tin nhắn chung và tin nhắn trong các đơn với HTX đó.
  - Tin trong đơn ghi mã đơn, bấm mở đơn.
  - Khi gửi, chọn gửi tin chung hoặc gửi vào một đơn đang mở.
  - Máy tính: danh sách bên trái, cuộc trò chuyện bên phải, mở sẵn cuộc trò chuyện mới nhất. Điện thoại: danh sách trước, có nút quay lại.
  - "Nhắn cho HTX khác": chọn HTX để bắt đầu.
- **Hỏi HTX về sản phẩm:** nút "Hỏi … về sản phẩm này" ở trang chi tiết mở cuộc trò chuyện, gắn sẵn sản phẩm (tên, quy cách, giá) vào tin đầu.
- **HTX:** mục "Tin nhắn" (có số chưa đọc) cùng giao diện. HTX chỉ nhắn được cho khách đã nhắn cho HTX hoặc đã đặt đơn của HTX.
- Có thông báo cho bên kia; bấm thông báo mở đúng cuộc trò chuyện. Tài khoản của khách có thêm ô "Tin nhắn" trong Tiện ích.
- Không hiện SĐT của hai bên. Dữ liệu dùng chung nên hai máy cùng thấy (app hỏi dữ liệu mới mỗi 10 giây).
- Mã nguồn: `src/domain/coopChat.ts`, `ChatInbox.tsx`, `ChatSheet.tsx`.

### Khiếu nại hiển thị theo đơn

- **Chi tiết đơn:** mỗi khiếu nại của đơn là một thẻ gồm lý do, sản phẩm, ảnh và các bước xử lý (giờ từng bước, hạn tiếp nhận / kết luận, kết luận của CSKH, tiền hoàn). Đơn đang có khiếu nại chưa xong thì ẩn nút gửi khiếu nại mới.
- **Thẻ đơn** trong Đơn mua ghi "Khiếu nại TK-…" kèm tình trạng.
- **Tiện ích → Khiếu nại** mở "Khiếu nại theo đơn": nhóm theo đơn (mã đơn, HTX, sản phẩm, nút Xem đơn), đơn còn khiếu nại đang xử lý lên đầu; nút "Gửi khiếu nại mới".
- Gửi khiếu nại xong thì mở chi tiết đơn để thấy khiếu nại vừa gửi (trước đây về danh sách đơn).
- HTX cũng thấy các bước này ở mục Khiếu nại.

### Quy trình xử lý khiếu nại (Admin – CSKH)

- **Các bước:** 1. CSKH tiếp nhận → 2. HTX kiểm tra lô hàng, phản hồi, đề xuất → 3. CSKH kết luận (Đã xử lý – duyệt hoàn / không hoàn, hoặc Từ chối) → 4. Hoàn tiền (Admin – Tài chính) → 5. Đóng ticket.
- **Làm đúng thứ tự** (kiểm trong hàm nghiệp vụ, không chỉ ẩn nút): phải tiếp nhận rồi mới kết luận, kết luận rồi mới đóng. Trước đây kết luận thẳng từ "Mới tiếp nhận" được.
- **Màn CSKH:**
  - sơ đồ quy trình và hạn SLA-01 ở đầu, số ticket quá hạn;
  - lọc: Cần xử lý / Chờ tiếp nhận / Đang xử lý / Đã kết luận, chờ đóng / Đã đóng / Tất cả; ticket quá hạn lên đầu;
  - bảng ghi hạn của bước hiện tại;
  - chi tiết: "Bước tiếp theo", chỉ hiện nút của bước hiện tại, các bước của ticket ở cột phải, lịch sử thu gọn.
- **"Đề nghị HTX phản hồi":** HTX nhận thông báo và thấy dòng nhắc trên ticket.
- Lịch sử ticket ghi nhãn tiếng Việt (dữ liệu cũ ghi "Đổi trạng thái: processing" cũng hiện thành "Đang xử lý").

### Quy trình phê duyệt HTX (Admin – Chất lượng)

- **HTX nộp hồ sơ** ở màn đăng nhập (mục "HTX muốn bán hàng trên sàn?" → "Đăng ký HTX"):
  - tên HTX, vùng, địa chỉ, người đại diện, SĐT người đại diện (để đăng nhập), 2 SĐT liên hệ, số tài khoản nhận chi trả (chỉ lưu 4 số cuối dạng che), sản phẩm dự kiến bán, giới thiệu;
  - ảnh giấy chứng nhận đăng ký HTX (ghi "Mô phỏng": Admin xem ảnh, không đối chiếu với cơ quan cấp);
  - xác nhận SĐT bằng OTP mô phỏng.
- **Admin – Chất lượng**, mục mới "Duyệt HTX mới":
  1. tiếp nhận hồ sơ;
  2. thẩm định 4 mục (giấy tờ, vùng thuộc Lào Cai, đã gọi xác minh SĐT, sản phẩm phù hợp); có nút gọi SĐT liên hệ;
  3. kết luận: **duyệt** (chỉ khi đạt đủ 4 mục), **yêu cầu bổ sung** (ghi cần bổ sung gì) hoặc **từ chối** (ghi lý do);
  4. duyệt thì hệ thống tạo HTX (đang được bán, hồ sơ đã duyệt, có SĐT, địa chỉ, tài khoản chi trả dạng che) và tài khoản đăng nhập bằng SĐT người đại diện.
- **HTX tra cứu hồ sơ** ("Tra cứu hồ sơ HTX", SĐT + OTP mô phỏng): xem các bước, nội dung cần bổ sung / lý do từ chối. Cần bổ sung thì sửa và nộp lại, hồ sơ quay về bước tiếp nhận.
- Có thông báo: hồ sơ mới / nộp lại → Admin – Chất lượng; được duyệt → tài khoản HTX mới. Mọi bước ghi lịch sử hồ sơ và nhật ký thao tác.
- Mã nguồn: `src/domain/coopApplication.ts`, `src/screens/coopApply/`, `QualityApplicationsTab.tsx`.

### Danh sách HTX và sản phẩm đang bán của từng HTX

- Mục "Danh sách HTX" ở mọi nhóm quyền Admin, thay "Danh bạ HTX" (vẫn có 2 nút gọi SĐT HTX).
- Tìm theo tên HTX, vùng, người đại diện, tên sản phẩm; lọc: đang được bán / tạm khoá bán / hồ sơ chờ duyệt.
- Mỗi HTX: tình trạng, vùng, số sản phẩm đang bán, số đơn, hàng đã giao, khiếu nại đang mở.
- Chi tiết HTX (máy tính: cột phải):
  - hồ sơ, 4 ô số liệu, SĐT và địa chỉ (chỉ Admin);
  - **Sản phẩm đang bán**: ảnh, tên, quy cách, loại đơn, giá, số còn / suất còn, điểm đánh giá;
  - sản phẩm ẩn / chờ duyệt / bị từ chối ở phần thu gọn.
- Mã nguồn: `src/domain/coopDirectory.ts`, `AdminCoopsTab.tsx`.

### Biểu đồ ở Tổng quan (Admin và Cơ quan QLNN)

- Ô số liệu giữ nguyên (tình trạng hiện tại). Bên dưới là một hàng bộ lọc: **7 ngày / 30 ngày / Tất cả** và **Số đơn / Tiền hàng**, áp cho mọi biểu đồ và bảng bên dưới.
- 5 biểu đồ:
  1. số đơn hoặc tiền hàng theo ngày (biểu đồ cột);
  2. đơn theo trạng thái;
  3. theo HTX;
  4. theo vùng;
  5. khiếu nại theo lý do.
- **Cách vẽ** theo hướng dẫn biểu đồ của dự án, không dùng thư viện:
  - mỗi biểu đồ một chuỗi số liệu, một màu (màu cột đã kiểm bằng công cụ kiểm màu khi làm biểu đồ Bán chạy);
  - cột / thanh mảnh, đầu bo, lưới nhạt;
  - chỉ ghi số ở cột cao nhất và đầu thanh;
  - rê chuột / chạm để xem đủ số; biểu đồ cột đi được bằng phím ← →, có đọc cho trình đọc màn hình.
- Dạng bảng của mọi biểu đồ ở phần "Xem số liệu dạng bảng" cuối trang.
- **Tiền hàng** không tính đơn chưa thanh toán xong, đã huỷ, trả hàng (như số liệu Bán chạy của HTX). "Tất cả" vẽ tối đa 90 ngày gần nhất ở biểu đồ theo ngày.
- Không có dữ liệu cá nhân của khách, nên Cơ quan QLNN cũng thấy.
- Mã nguồn: `periodStats` trong `src/domain/stats.ts`, `src/components/Charts.tsx`.

### Kiểm thử

- **Lint, test, build:**
  - lint không lỗi;
  - 29 file, 208 test đạt. Thêm test cho quy cách, nhắn tin, quy trình khiếu nại, phê duyệt HTX, lọc đơn HTX, địa chỉ HTX, số liệu biểu đồ;
  - build thành công, không cảnh báo.
- **Kịch bản mới (Playwright), chặn mọi request ra ngoài localhost:**
  - phần khách + HTX: quy cách trên thẻ và trang chi tiết, hỏi HTX về sản phẩm, nút chat nổi, HTX đọc và trả lời, lọc đơn HTX, thêm quy cách (kể cả trùng), địa chỉ HTX;
  - phần khiếu nại + Admin: khách gửi khiếu nại → thấy trong chi tiết đơn, thẻ đơn, "Khiếu nại theo đơn"; CSKH tiếp nhận → đề nghị HTX → HTX phản hồi → kết luận duyệt hoàn → đóng, khách thấy đủ các bước; HTX nộp hồ sơ ở màn đăng nhập (thiếu ảnh, sai OTP bị chặn) → Admin – Chất lượng tiếp nhận, thẩm định, duyệt → HTX mới đăng nhập được; Danh sách HTX; biểu đồ Tổng quan (rê chuột, phím mũi tên); QLNN thấy biểu đồ.
- **Chế độ phát triển của React:** 23 lượt kịch bản (mới và cũ).
  - 17 lượt đạt ngay.
  - 6 lượt dừng vì bộ chọn trong kịch bản cũ không còn đúng với giao diện mới, không phải lỗi app:
    - gạo và mứt có 2 quy cách nên nút + trên thẻ mở trang chọn quy cách;
    - màn đăng nhập có thêm nút "Đăng ký HTX";
    - gửi khiếu nại xong mở chi tiết đơn;
    - tiêu đề mục liên hệ của HTX đổi tên.
  - Sửa bộ chọn rồi chạy lại cả 6: đều đạt.
  - 0 cảnh báo React.
- **Bản build chính thức:** 14 lượt ở 320, 390, 1.280, 1.440 và 1.920px, khôi phục dữ liệu mẫu trước mỗi lượt. Tất cả đạt.
  - Kết quả đo: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang.
  - Console chỉ có lỗi 409 khi hai máy ghi cùng lúc (cơ chế đồng bộ tự chạy lại).
- **Bảo mật SĐT / địa chỉ HTX:**
  - khách không thấy SĐT HTX ở trang sản phẩm, chi tiết đơn hay hộp tin nhắn;
  - QLNN không có mục Danh sách HTX;
  - test giao diện chặn màn của khách, QLNN và khung app dùng tới SĐT, địa chỉ HTX.
- **Sửa sau khi xem ảnh chụp:**
  - ô lọc đơn của HTX trên điện thoại: 2 ô chọn đặt cạnh nhau;
  - giá "từ …" trên thẻ nhiều quy cách: xuống dòng gọn ở màn dưới 390px;
  - trục số đơn không ghi mốc lẻ 0,5;
  - biểu đồ trạng thái chỉ vẽ trạng thái có đơn;
  - hộp tin nhắn trên máy tính mở sẵn cuộc trò chuyện mới nhất.
- Không chạy thử được bản trên Vercel: môi trường kiểm thử chặn tên miền vercel.app.

---

## Sau Giai đoạn 6 – Kiểm tra lại toàn bộ, sửa lỗi tìm được

**Yêu cầu của chủ repo:** chạy lại một lượt xem còn lỗi ở đâu không.

### Đã chạy

- **Lint, test, build:**
  - lint không lỗi;
  - 24 file, 183 test đạt (thêm 1 kiểm tra trong test giao diện);
  - build thành công, không cảnh báo.
- **Chế độ phát triển của React** (hiện mọi cảnh báo, bản build chính thức ẩn đi): chạy 14 kịch bản, ghi lại mọi cảnh báo / lỗi console. 0 cảnh báo React.
- **Bản build chính thức:** 31 lượt kịch bản ở 320, 390, 768, 1.024, 1.280, 1.440 và 1.920px, khôi phục dữ liệu mẫu trước mỗi lượt để các kịch bản không lẫn dữ liệu của nhau. Tất cả đạt, 0 lỗi giao diện.
  - Phạm vi: đủ vai trò (khách, HTX, Admin, QLNN), đăng nhập Google, GPS, hai máy dùng chung dữ liệu.
  - Ghi lại mọi lỗi console. Chỉ còn lỗi có chủ đích:
    - 409 khi hai máy ghi cùng lúc (cơ chế đồng bộ tự chạy lại thao tác);
    - 503 vì chưa có khoá Google Maps;
    - 401 khi thử đăng nhập Google bằng mã giả;
    - lỗi của kịch bản cố ý làm hỏng dữ liệu.
- **Rà mã** các phần làm gần đây (tab vuốt, Đơn mua trong Tài khoản, xác nhận thu hoạch, SĐT HTX): 10 điểm, đều đã sửa (dưới đây).
- Không chạy thử được bản trên Vercel: môi trường kiểm thử chặn tên miền vercel.app.

### Lỗi đã sửa

1. **Vuốt bị kẹt nửa chừng khi có ngón thứ hai chạm vào** (vd. đang vuốt thì chụm tay để phóng to): danh sách đơn đứng lệch, phải vuốt lần nữa mới về. Nay ngón thứ hai chạm vào thì huỷ thao tác vuốt, danh sách trượt về chỗ cũ.
2. **Không phóng to được bằng hai ngón trên danh sách đơn** (vùng vuốt chỉ cho cuộn dọc). Nay cho phóng to. Test giao diện chặn việc dùng lại thiết lập cũ.
3. **Đang phóng to mà kéo ngang thì bị đổi tab** thay vì xem phần bị khuất. Nay khi trang đang phóng to thì tắt vuốt đổi tab, trình duyệt kéo ngang như thường.
4. **Hàng tab tự cuộn về tab đang chọn mỗi lần app vẽ lại** (thêm vào giỏ, có thông báo, đồng bộ dữ liệu), làm mất chỗ người dùng vừa kéo. Nay chỉ cuộn khi đổi tab.
5. **Bấm phím Home ở tab đầu (hoặc End ở tab cuối) để lại cờ sai:** lần đổi tab sau, focus nhảy lên hàng tab.
6. **Dữ liệu đơn hỏng làm hỏng cả trang Tài khoản** (từ khi gộp Đơn hàng vào Tài khoản). Nay chỉ khung Đơn mua báo lỗi, có nút Thử lại; thông tin cá nhân, Tiện ích, Đăng xuất vẫn dùng được.
7. **HTX chưa có số nào thì mục Hồ sơ không hiện ô nhập SĐT.** Nay luôn có đủ 2 ô.
8. **Sửa tên trong Tài khoản, bấm Huỷ, mở lại vẫn thấy chữ đã gõ.** Nay mở lại thấy tên đang lưu.
9. **HTX bấm nhầm "Không cung cấp được" hoặc "Từ chối" yêu cầu huỷ thì không có đường quay lại.** Nay có nút "Thôi".
10. **"Xác nhận cả lô" mở từ một đơn: đóng xong không về lại đơn đó.** Nay về lại đúng đơn.
11. **Tính toán thừa:**
    - Tài khoản lọc danh sách đơn 2 lần; nay 1 lần, dùng chung cho biểu tượng và danh sách.
    - Gợi ý "Có thể bạn cũng thích" tính lại điểm đánh giá trong lúc sắp xếp; nay tính trước một lần.

### Kiểm thử các lỗi đã sửa

- **Lỗi 1, 3, 4, 5:** kịch bản Đơn mua có thêm phép thử bằng sự kiện con trỏ. Chạy trên cả bản trước khi sửa và bản đã sửa:
  - Bản trước khi sửa hỏng đúng như mô tả: vuốt kẹt lệch 89,5px; đang phóng to vẫn đổi tab; focus nhảy lên hàng tab; hàng tab tự cuộn từ 0 sang 545px.
  - Bản đã sửa: đều đạt.
  - Phép thử bằng thao tác chạm giả lập của trình duyệt không tái hiện được lỗi 1 và 3, nên không dùng để chứng minh.
- **Lỗi 6:** kịch bản mới giả lập dữ liệu đơn hỏng từ API. Chỉ khung Đơn mua báo "Không hiển thị được đơn mua"; thông tin cá nhân, Tiện ích, Đăng xuất, thanh dưới vẫn hiện; không lỗi JS.
- **Lỗi 8, 9, 10:** kịch bản mới chạy ở 390 và 1.280px:
  - sửa tên → Huỷ → mở lại thấy tên đang lưu;
  - HTX bấm "Không cung cấp được" → có "Thôi" → quay lại các nút cũ;
  - "Xác nhận cả lô" → Huỷ → về lại đúng đơn.
- **Chạy lại toàn bộ trên bản đã sửa:** 34 lượt (31 lượt trên và các kịch bản mới), đều đạt.
  - 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang.
  - Lỗi console chỉ còn các lỗi có chủ đích nêu trên.
  - Kịch bản dữ liệu hỏng có 2 lỗi, cả 2 đều được khung báo lỗi bắt và hiện thông báo; không có lỗi JS lọt ra ngoài.

---

## Sau Giai đoạn 6 – Gộp Đơn hàng vào Tài khoản

**Yêu cầu của chủ repo:** gộp phần đơn hàng vào luôn Tài khoản, không cần chuyển tab như cũ.

- **Thanh dưới của khách còn 3 mục:** Khám phá · Vụ mùa · Tài khoản. Không còn tab Đơn hàng riêng.
- **Trong Tài khoản, mục "Đơn mua" gồm 2 phần liền nhau:**
  - các biểu tượng trạng thái (như trước);
  - ngay bên dưới là danh sách đơn với 9 tab vuốt ngang (như trước).
- **Bấm biểu tượng** (hoặc "Xem tất cả đơn", hoặc dòng nhắc đơn chờ thanh toán) là đổi tab của danh sách ngay tại chỗ, không chuyển màn. Danh sách đang khuất bên dưới thì trang cuộn tới.
- **Đặt hàng xong, thanh toán xong, gửi khiếu nại xong** (trước đây chuyển sang tab Đơn hàng): nay mở Tài khoản ở tab "Tất cả" của danh sách đơn và cuộn tới danh sách. (Sau đó, gửi khiếu nại xong đổi thành mở chi tiết đơn, xem mục "Sửa theo file góp ý kiểm thử".)
- **Thứ tự trên điện thoại:** thông tin cá nhân → Đơn mua (biểu tượng + danh sách) → Tiện ích của tôi → tài khoản ngân hàng nhận hoàn → Đăng xuất.
- **Máy tính:** Đơn mua ở cột rộng bên trái; Tiện ích, ngân hàng, Đăng xuất ở cột phải. Danh sách đơn và gợi ý sản phẩm đổi số cột theo bề rộng phần chứa (container query của Tailwind), không theo bề rộng màn hình.
- Nút "Khiếu nại" ở đầu danh sách đơn cũ bỏ đi, vì đã có trong Tiện ích của tôi.
- **Mã nguồn:**
  - `OrdersTab.tsx` đổi thành `OrdersSection.tsx` (chỉ phần danh sách), đặt trong `AccountTab.tsx`;
  - `openOrders(tab)` trong `UiContext` mở Tài khoản và báo cần cuộn tới danh sách;
  - các nơi trước đây chuyển sang tab Đơn hàng (`CheckoutSheet`, `PaymentSheet`, `ComplaintSheet`) nay gọi `openOrders('all')`.

### Kiểm thử

- **Lint, test, build:** lint không lỗi; 24 file, 183 test đạt; build thành công, không cảnh báo.
- **Playwright ở 320, 390 và 1.280px, vuốt bằng sự kiện chạm thật:**
  1. Thanh dưới chỉ còn Khám phá, Vụ mùa, Tài khoản.
  2. Bấm biểu tượng "Chờ xác nhận": vẫn ở Tài khoản, danh sách đổi sang tab đó và nằm trong tầm nhìn.
  3. Vuốt trái / phải, vuốt dọc, phím mũi tên như trước. Mỗi đơn chỉ 1 thẻ trên trang.
  4. Huỷ đơn → tab Đã huỷ có tiền hoàn; Mua lại → giỏ.
  5. Khách 2: biểu tượng Đánh giá → tab Đã giao → mở đúng cửa sổ đánh giá.
  6. Từ Khám phá: Mua ngay → đặt hàng → thanh toán thành công → về Tài khoản, tab Tất cả, hàng tab nằm ngay dưới thanh trên cùng, đơn mới ở đầu.

  Kết quả: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang, không lỗi JS.
- **Chạy lại các kịch bản cũ, đều đạt:** kiểm tra giao diện toàn app, xác nhận thu hoạch, giao hàng trên hai máy, Luồng 6, dữ liệu chung trên hai máy, giỏ hàng, mã ưu đãi, chọn số lượng, liên kết ngân hàng, địa chỉ, tràn ngang, SĐT HTX, biểu đồ bán chạy, toàn màn hình 1.920px.
  - Các kịch bản đã sửa chỗ bấm tab "Đơn hàng" thành "Tài khoản".
  - Sau khi thanh toán, app nay ở trang Tài khoản, có thêm nút "Thông báo", "Giỏ hàng" (Tiện ích) và các nút biểu tượng đơn. Vì vậy 5 kịch bản lần đầu bắt trùng nút; đã sửa bộ chọn, chạy lại thì đạt.
  - Kịch bản địa chỉ lần đầu dừng vì giỏ của khách còn hàng từ kịch bản chạy trước (các kịch bản dùng chung dữ liệu trên máy chủ xem thử). Khôi phục dữ liệu mẫu rồi chạy lại thì đạt.

---

## Sau Giai đoạn 6 – "Đơn mua" trong Tài khoản và tab đơn vuốt ngang

> Sau đó chủ repo yêu cầu gộp Đơn hàng vào Tài khoản; xem mục "Gộp Đơn hàng vào Tài khoản" ở trên. Phần danh sách đơn và tab vuốt ngang dưới đây vẫn dùng, chỉ đổi chỗ đặt.

**Yêu cầu của chủ repo:** gửi video quay màn "Tôi" của một ứng dụng mua sắm. Muốn tài khoản khách có các chức năng như vậy, và vuốt qua lại giữa các tab đơn được như trong video.

### Tài khoản của khách

- **"Đơn mua"** ngay dưới thẻ thông tin cá nhân:
  - 5 biểu tượng trạng thái: Chờ xác nhận, Chờ thu hoạch, Chờ lấy hàng, Đang giao, Đánh giá. Mỗi biểu tượng có số đếm khi có đơn.
  - "Đánh giá" đếm số đơn Đã giao còn sản phẩm chưa đánh giá.
  - Bấm một biểu tượng là mở Đơn hàng đúng tab đó; "Xem lịch sử mua hàng" mở tab Tất cả.
  - Có đơn chờ thanh toán thì có thêm dòng "Bạn có N đơn chờ thanh toán".
- **"Tiện ích của tôi":** Sổ địa chỉ (số địa chỉ), Giỏ hàng (số sản phẩm), Thông báo (số chưa đọc), Khiếu nại. Bấm là mở đúng cửa sổ.
- Tài khoản ngân hàng nhận hoàn tiền và nút Đăng xuất giữ nguyên. Máy tính: 2 cột (Đơn mua, Tiện ích | ngân hàng, đăng xuất).

### Đơn hàng: tab vuốt ngang

- **9 tab theo trạng thái:** Tất cả · Chờ thanh toán · Chờ xác nhận · Chờ thu hoạch · Chờ lấy hàng · Đang giao · Đã giao · Trả hàng · Đã huỷ.
  - Mỗi trạng thái đơn của SRS thuộc đúng một tab: Chờ lấy hàng = Đã xác nhận + Đang chuẩn bị; Trả hàng = Trả hàng – hoàn tiền + Đang chuyển hoàn + Đã hoàn về.
  - Tab có đơn thì hiện số đơn.
- **Hàng tab:** có gạch chân chạy theo tab đang chọn, tự cuộn để tab đang chọn nằm giữa, dính ngay dưới thanh "Nhận hàng tại" khi cuộn.
- **Vuốt trái / phải trên danh sách** để sang tab bên cạnh, nội dung trượt theo ngón tay.
  - Thả tay quá 1/5 bề rộng, hoặc vuốt nhanh, thì chuyển tab; không thì trượt về.
  - Vuốt dọc vẫn cuộn trang như thường. Ở tab đầu / cuối, vuốt ra ngoài chỉ nhích nhẹ rồi trượt về.
  - Đổi tab khi đang cuộn xuống dưới thì trang đưa đầu danh sách về ngay dưới hàng tab.
- **Máy tính:** bấm tab, hoặc dùng phím mũi tên / Home / End trên hàng tab (mẫu tablist của WAI-ARIA). Chuột không kéo để vuốt, để không cản việc chọn chữ và bấm thẻ đơn.
- **Tab trống:** "Chưa có đơn nào ở mục …", kèm "Có thể bạn cũng thích".
  - Gợi ý: sản phẩm đang mở bán khách chưa mua, ưu tiên điểm đánh giá cao. Không dùng số lượng bán ra, vì dữ liệu mẫu không có số này.
  - Thẻ sản phẩm giống trang Khám phá, thêm vào giỏ ngay được.
- **Thẻ đơn có thêm nút theo tình trạng:**
  - Chờ thanh toán: **Thanh toán** (mở cổng thanh toán mô phỏng).
  - Đã giao còn sản phẩm chưa đánh giá: dòng "Chờ bạn đánh giá N sản phẩm" và nút **Đánh giá**.
  - Đơn có hoàn tiền (huỷ, trả hàng): dòng "Số tiền hoàn: … · Chờ hoàn tiền / Đang hoàn tiền / Đã hoàn tiền" và nút **Xem hoàn tiền**.
  - Đã giao, Đã huỷ, Trả hàng: **Mua lại**.
    - Đưa các sản phẩm của đơn vào giỏ với số lượng như cũ, bớt lại nếu không còn đủ. Sản phẩm không còn bán hoặc hết hàng thì bỏ qua và nêu lý do.
    - Giỏ mở ngay sau đó; giá trong giỏ là giá hiện tại.

### Mã nguồn

- **Nghiệp vụ:** `src/domain/orderTabs.ts` (nhóm tab, đếm, đơn chờ đánh giá, tiền hoàn của đơn, "Mua lại", gợi ý).
- **Thành phần dùng chung:** `src/components/SwipeTabs.tsx`.
  - Chỉ dựng nội dung tab đang chọn. Tab hai bên chỉ dựng trong lúc vuốt / đang trượt, nên một đơn không xuất hiện 2 lần trên trang.
  - Tab không hiển thị được đánh dấu `inert`, nên không bấm hay Tab tới được.
  - Người dùng bật giảm chuyển động thì không trượt.
- **Giao diện:**
  - `OrdersTab.tsx` (viết lại);
  - phần Đơn mua và Tiện ích trong `AccountTab.tsx`;
  - `UiContext` thêm tab đơn đang chọn và `openOrders(tab)`;
  - `CustomerTopBar` ghi chiều cao của thanh để hàng tab dính đúng chỗ.

### Kiểm thử

- **Lint, test, build:**
  - lint không lỗi;
  - 24 file, 183 test đạt. Test mới `orderTabs.test.ts`: mỗi trạng thái thuộc đúng một tab, đếm theo tab, đơn chờ đánh giá, tiền hoàn, Mua lại (cả hàng đặt trước, sản phẩm ngừng bán, không phải đơn của mình), gợi ý.
  - build thành công, không cảnh báo.
- **Playwright ở 320, 390 và 1.280px, vuốt bằng sự kiện chạm thật (CDP):**
  1. Tài khoản có 5 biểu tượng đúng số đếm và Tiện ích.
  2. Bấm "Chờ xác nhận" → Đơn hàng đúng tab.
  3. Vuốt trái → Chờ thu hoạch (tab trống có 6 sản phẩm gợi ý; tab đang chọn nằm trong tầm nhìn). Vuốt trái → Chờ lấy hàng; vuốt phải → quay lại. Vuốt dọc không đổi tab. Phím → và Home đổi tab, focus theo tab.
  4. Mỗi đơn chỉ có 1 thẻ trên trang.
  5. Huỷ đơn đã thanh toán → tab Đã huỷ có "Số tiền hoàn 163.000đ · Chờ hoàn tiền", nút Xem hoàn tiền, Mua lại. Mua lại → giỏ mở, có sản phẩm.
  6. Khách 2: "Đánh giá: 1 đơn" → tab Đã giao có nút Đánh giá, mở đúng cửa sổ đánh giá.

  Kết quả: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang, không lỗi JS.
- **Chạy lại các kịch bản cũ, đều đạt:** kiểm tra giao diện toàn app, xác nhận thu hoạch, giao hàng trên hai máy, Luồng 6, biểu đồ bán chạy, chọn số lượng, giỏ hàng, liên kết ngân hàng, địa chỉ, mã ưu đãi, tràn ngang, dữ liệu chung trên hai máy, SĐT HTX, toàn màn hình 1.920px.
  - Kịch bản kiểm tra toàn app lần đầu dừng vì nút "Thông báo" mới trong Tiện ích trùng tên với chuông trên đầu trang. Hai nút đều đúng; đã sửa kịch bản để bấm chuông trên đầu trang, chạy lại thì đạt.

---

## Sau Giai đoạn 6 – Toàn màn hình trên máy tính, 2 SĐT cho mỗi HTX

**Yêu cầu của chủ repo:**
- cho app hiện toàn màn hình trên cả web;
- thêm SĐT của HTX, mỗi cửa hàng 2 số;
- SĐT này để Admin gọi cho HTX, không được công khai trong đơn.

### Toàn màn hình trên máy tính

**Trước đây:** trên máy tính, nội dung nằm trong một cột giữa màn hình, hai bên để trống:
- khách: rộng tối đa 1.152px; trang Đơn hàng và Tài khoản còn hẹp hơn (768px);
- HTX: cột 640px như điện thoại;
- Admin, QLNN: rộng tối đa 1.280px;
- các cửa sổ chi tiết: 640px.

**Nay mọi vai trò dùng toàn bộ bề rộng màn hình.** Lề hai bên tăng dần theo cỡ màn hình (16px trên điện thoại, 56px trên màn hình rất rộng). Điện thoại giữ nguyên như cũ.

- **Khách:**
  - **Khám phá:** lưới sản phẩm thêm cột trên màn hình rộng (5 cột từ 1.280px, 6 cột từ 1.800px).
  - **Vụ mùa:** 4 cột từ 1.536px.
  - **Đơn hàng:** 2–3 cột.
  - **Tài khoản:** 2 cột (tài khoản ngân hàng | sổ địa chỉ, đăng xuất).
- **Đăng nhập:** khung giới thiệu cao bằng màn hình, đứng yên khi cuộn. Danh sách tài khoản demo 3 cột trên màn hình rộng.
- **HTX:** bố cục máy tính mới từ 1.024px.
  - Cột trái: thẻ HTX và danh sách mục, đứng yên khi cuộn. Nội dung chiếm phần còn lại.
  - **Đơn hàng, Sản phẩm, Khiếu nại, Đánh giá:** 2–3 cột.
  - **Đối soát, Hồ sơ:** 2 cột.
- **Admin, QLNN:** bảng giãn hết bề rộng; cột chức năng của Admin đứng yên khi cuộn; ô số liệu tổng hợp 6 cột trên màn hình rộng.
- **Cửa sổ chi tiết sản phẩm, chi tiết đơn (khách), đơn của HTX:** rộng tới 1.152px trên máy tính, chia 2 cột.
  - Chi tiết sản phẩm: ảnh và giá bên trái, mô tả và thông tin bên phải.
  - Chi tiết đơn: thông tin và hành trình bên trái, liên hệ, trao đổi, thanh toán và thao tác bên phải.
  - Cột trái là phần đầu, cột phải là phần sau của nội dung. Vì vậy trên điện thoại thứ tự vẫn như cũ, và thứ tự đọc của trình đọc màn hình không đổi.
  - Các cửa sổ khác (giỏ hàng, đặt hàng, biểu mẫu) giữ 640px cho dễ đọc.
- **Mã nguồn:**
  - lề dùng chung `PAGE_X` trong `src/app/layout.ts`;
  - `BottomSheet` thêm tuỳ chọn `wide` và thành phần `SheetColumns`.

### 2 SĐT cho mỗi HTX

- **HTX:** mục Hồ sơ có phần "Số điện thoại liên hệ (2 số)".
  - Nhận số di động 10 số hoặc số cố định 11 số (vd. 0214 382 1234), nhập kèm +84 cũng được.
  - Báo lỗi nếu thiếu số, sai số hoặc hai số trùng nhau.
  - **Lưu ngay, không chờ Admin duyệt** như các thông tin hồ sơ khác; nhật ký thao tác ghi "Cập nhật SĐT liên hệ".
  - Thẻ HTX ở đầu màn hình hiện "SĐT cửa hàng".
- **Admin (mọi nhóm quyền: Vận hành, Chất lượng, CSKH, Tài chính, Quản trị gốc):** mục mới "Danh bạ HTX".
  - Mỗi HTX một thẻ, có 2 nút gọi (mở ứng dụng gọi của máy). Số mẫu thì ghi "Bản demo: số điện thoại mẫu".
  - Dùng thẻ thay cho bảng, để trên điện thoại nút gọi hiện ngay, không phải cuộn ngang.
  - Bảng "Hồ sơ HTX & quyền bán" của Admin – Chất lượng cũng hiện SĐT.
- **Không công khai:** khách không thấy SĐT HTX ở bất kỳ đâu (trang sản phẩm, đơn hàng, chi tiết đơn); Cơ quan QLNN cũng không.
  - Kiểm quyền ngay trong hàm `listCoopContacts`: chỉ Admin, hoặc HTX xem số của chính mình.
  - Test giao diện chặn màn của khách, QLNN và màn đăng nhập dùng tới SĐT HTX.
  - Khách vẫn liên hệ HTX bằng nhắn tin trong đơn như trước.
- **Dữ liệu:**
  - thêm `Coop.phones` (không bắt buộc);
  - 7 HTX mẫu có 2 số mẫu mỗi HTX, dạng `0900000xxx` như mọi SĐT mẫu khác;
  - dữ liệu đã lưu từ bản trước (kể cả trên máy chủ dùng chung) chưa có SĐT HTX thì app dùng số mẫu cho HTX mẫu, không phải khôi phục dữ liệu mẫu.
- **Mã nguồn:** `src/domain/coopContact.ts`, `src/components/CoopPhones.tsx`, `src/screens/admin/AdminCoopContactsTab.tsx`.

### Kiểm thử

- **Lint, test, build:**
  - lint không lỗi;
  - 23 file, 178 test đạt.
  - Test mới `coopContact.test.ts`: chuẩn hoá, kiểm tra, hiển thị số; HTX lưu số; các trường hợp bị chặn; dữ liệu cũ; quyền xem (Admin mọi nhóm xem được; HTX chỉ thấy số của mình; khách, QLNN không xem được).
  - Test dữ liệu mẫu kiểm tra mỗi HTX có 2 số mẫu khác nhau. Test giao diện kiểm tra màn của khách và QLNN không dùng tới SĐT HTX.
  - build thành công, không cảnh báo.
- **Playwright, bố cục:** đăng nhập, mọi màn của khách, HTX (7 mục và cửa sổ đơn), Admin, QLNN ở 768, 1.024, 1.440 và 1.920px. Kết quả: không tràn ngang, 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không lỗi JS.
- **Playwright, SĐT** (HTX, khách, Admin, QLNN trên 4 máy, dùng chung dữ liệu qua API, ở 320, 390, 1.280 và 1.920px):
  1. HTX nhập số sai → báo lỗi; sửa ô thì lỗi ẩn. Nhập trùng số 1 → báo lỗi. Lưu số cố định → được.
  2. Khách: trang sản phẩm và chi tiết đơn không có số nào của HTX, không có link `tel:`.
  3. Cả 5 nhóm Admin thấy "Danh bạ HTX" với 14 nút gọi đúng số mới.
  4. QLNN không có mục này, không có nút gọi.

  Kết quả: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang, không lỗi JS.
- **Chạy lại các kịch bản cũ, đều đạt:** kiểm tra giao diện toàn app trên điện thoại, xác nhận thu hoạch (390 và 1.280px), giao hàng trên hai máy, Luồng 6, biểu đồ bán chạy, chọn số lượng, giỏ hàng, liên kết ngân hàng, địa chỉ, mã ưu đãi, dữ liệu chung trên hai máy, kiểm tra tràn ngang ở 320–1.280px.
  - Kịch bản xác nhận thu hoạch lần đầu dừng vì bộ chọn của kịch bản bắt trúng khung nội dung mới của màn HTX (thẻ `<section>`). Đã đổi khung đó thành `<div>`, vì nó không có tiêu đề riêng; chạy lại thì đạt.

---

## Sau Giai đoạn 6 – HTX xác nhận thu hoạch xong

**Yêu cầu của chủ repo:** thêm bước xác nhận sau khi thu hoạch sản phẩm xong cho HTX.

Phần "Thông tin nguồn gốc" vốn ghi rằng ngày thu hoạch do HTX khai. Bước này là nơi HTX khai thông tin đó, và là mốc "vào mùa" của đơn đặt trước. Trước đây HTX bấm thẳng "Báo sẵn sàng giao"; nay phải xác nhận thu hoạch xong trước.

### Luồng mới của đơn đặt trước

1. Khách đặt trước, trả cọc → HTX xác nhận đơn → đơn Chờ thu hoạch (như trước).
2. **HTX xác nhận đã thu hoạch xong**, theo một trong hai cách:
   - **Theo từng đơn:** trong đơn, nút "Báo sẵn sàng giao" đổi thành "Xác nhận đã thu hoạch xong".
   - **Theo cả lô:** tab Đơn hàng có khung "Chờ thu hoạch". Mỗi sản phẩm đặt trước còn đơn chờ có một thẻ: số đơn, tổng số lượng cần, ngày giao sớm nhất, nút "Xác nhận thu hoạch …". Trong đơn cũng có nút "Xác nhận cả lô … (N đơn đang chờ)" khi sản phẩm đó còn đơn khác chờ.
3. **HTX khai:**
   - ngày thu hoạch (mặc định hôm nay, không được sau hôm nay theo đồng hồ demo);
   - sản lượng thu được (chỉ khi xác nhận cả lô);
   - ghi chú, tối đa 300 ký tự;
   - tối đa 2 ảnh lô hàng.

   Ghi chú và ảnh không bắt buộc.
4. **"Báo sẵn sàng giao luôn"** được chọn sẵn: đơn đã thu hoạch đủ mọi sản phẩm thì báo sẵn sàng ngay, đi tiếp như trước (khách trả phần còn lại, hoặc sang Đang chuẩn bị nếu trả khi nhận).
   - Bỏ chọn nếu còn cần phân loại, đóng gói. Khi đó đơn ghi "Đã thu hoạch – chờ báo sẵn sàng giao", và trong đơn có nút "Báo sẵn sàng giao".
5. Sau đó HTX gọi điện / nhắn tin hẹn lịch giao như phần "Quá trình giao hàng" bên dưới.

### Chia hàng khi xác nhận cả lô

- **Chia theo thứ tự đặt:** đơn đặt sớm nhận trước. Đơn nào đủ hàng thì được xác nhận thu hoạch.
- **Dừng ở đơn đầu tiên không đủ hàng.** Đơn đặt sau không được chia trước đơn đặt sớm hơn, kể cả khi phần dư đủ cho đơn nhỏ hơn đặt sau.
  - Ví dụ: 3 đơn cần 2, 3 và 1 thùng; thu 4 thùng → chỉ đơn đầu đủ hàng. Hai đơn sau chờ lần thu hoạch sau.
- **Xem trước trước khi bấm:** nhập sản lượng là thấy ngay "Đủ hàng cho X/Y đơn". Danh sách đơn theo thứ tự đặt ghi đơn nào "đủ hàng", đơn nào "chờ lần sau"; có số dư nếu thừa, hoặc số lượng đơn sớm nhất cần nếu chưa đủ.
- **Đơn chưa đủ hàng** giữ nguyên Chờ thu hoạch.
- **Muốn giao cho một đơn cụ thể** (vd. khách cần gấp) thì xác nhận theo từng đơn; cách này không theo thứ tự.

### Khách thấy gì

- **Hành trình đơn hàng** có bước mới "Vào mùa – HTX thu hoạch xong", nằm trước "HTX báo sẵn sàng giao". Bước này có ngày thu hoạch, ghi chú và ảnh lô hàng.
  - Đơn có nhiều sản phẩm đặt trước thì ghi từng sản phẩm, và "Còn N sản phẩm chờ thu hoạch".
- **Thông báo** "HTX … đã thu hoạch hàng đơn …" khi HTX xác nhận mà chưa báo sẵn sàng. Nếu báo sẵn sàng luôn thì chỉ có thông báo sẵn sàng như trước, để khách không nhận hai thông báo cùng lúc.
- **Thông tin nguồn gốc** của sản phẩm có dòng "Thu hoạch gần nhất". Kèm câu: ngày này do HTX tự khai, sàn không kiểm chứng.

### Quy tắc

- **Chỉ HTX của sản phẩm** xác nhận được, và chỉ với hàng đặt trước.
- **Mỗi sản phẩm của một đơn chỉ xác nhận thu hoạch một lần.**
- **Đơn phải đang Chờ thu hoạch:** đã xác nhận đơn, chưa huỷ, chưa báo sẵn sàng.
- **Đơn nhiều sản phẩm đặt trước:** chỉ báo sẵn sàng khi đã thu hoạch đủ mọi sản phẩm của đơn.
- **Nhật ký thao tác** ghi "Xác nhận thu hoạch", kèm số đơn, ngày và sản lượng.
- **`coopReportReady` giữ nguyên.** Màn HTX chỉ hiện nút "Báo sẵn sàng giao" khi đơn đã thu hoạch đủ.
  - Đơn đã báo sẵn sàng từ bản trước (chưa có bước thu hoạch) thì bước thu hoạch hiện là đã xong, không có ngày.

### Dữ liệu và mã nguồn

- **Dữ liệu:**
  - thêm `DemoState.harvests` (không bắt buộc), mỗi lần xác nhận là một `HarvestRecord`: sản phẩm, ngày thu hoạch, sản lượng, ghi chú, ảnh, các đơn được chia, ai xác nhận, lúc nào;
  - thêm `Order.harvest` (mã sản phẩm → mã lần thu hoạch).
  - `STORAGE_VERSION` giữ nguyên. Dữ liệu đã lưu, kể cả trên máy chủ dùng chung, vẫn đọc được.
- **Nghiệp vụ:** `src/domain/harvest.ts` (`coopConfirmHarvest`, `allocateHarvest`, `ordersAwaitingHarvest`…). Bước thu hoạch của hành trình nằm trong `orderContact.ts`; thông báo trong `notifications.ts`.
- **Giao diện:**
  - `src/screens/coop/HarvestForm.tsx`: biểu mẫu dùng chung cho từng đơn và cả lô;
  - `CoopHarvestSheet.tsx`: sheet cả lô, tải khi mở lần đầu;
  - khung "Chờ thu hoạch" trong `CoopOrdersTab.tsx`;
  - phần thu hoạch trong `CoopOrderSheet.tsx`.
- **Sửa thêm:** dòng chú thích dưới ô chọn ảnh ghi "Ảnh chỉ lưu trên trình duyệt này". Từ khi có API dữ liệu chung, câu này không còn đúng. Nay ghi "Ảnh được thu nhỏ và lưu cùng dữ liệu demo (mô phỏng tải ảnh)".

### Kiểm thử

- **Lint, test, build:** lint không lỗi; 22 file, 172 test đạt; build thành công, không cảnh báo. Phần tải ban đầu 361 kB (gzip 109 kB).
- **Test nghiệp vụ mới (`harvest.test.ts`):**
  - chia theo thứ tự đặt, dừng ở đơn không đủ hàng, hai lô liên tiếp;
  - báo sẵn sàng luôn với đơn trả phần còn lại online và đơn trả khi nhận;
  - xác nhận theo từng đơn, không xác nhận lại được;
  - đơn hai sản phẩm chỉ báo sẵn sàng khi đủ cả hai;
  - chặn sai HTX, không phải HTX, hàng mua sẵn, ngày sau hôm nay, ngày không có thật, sản lượng sai hoặc chưa đủ, ghi chú quá dài, quá 2 ảnh;
  - thông báo đúng trường hợp;
  - dữ liệu cũ chưa có phần thu hoạch.
- **Test hành trình cũ** sửa theo bước mới.
- **Playwright trên hai máy (khách và HTX), dùng chung dữ liệu qua API, ở 320px, 390px và 1280px:**
  1. Khách đặt trước 3 đơn mận (2, 3, 1 thùng).
  2. HTX xác nhận đơn → khung "Chờ thu hoạch: 3 đơn · cần 6 thùng".
  3. Xác nhận thu hoạch đơn đầu:
     - chọn ngày mai thì báo lỗi; sửa ngày thì lỗi ẩn;
     - thêm ghi chú và ảnh, bỏ "báo sẵn sàng luôn";
     - đơn ghi "Đã thu hoạch – chờ báo sẵn sàng giao".
  4. Máy khách có thông báo; hành trình hiện ngày, ghi chú và ảnh.
  5. HTX báo sẵn sàng.
  6. Xác nhận cả lô:
     - bấm khi chưa nhập sản lượng thì báo lỗi;
     - nhập 3 → "Đủ hàng cho 1/2 đơn";
     - nhập 1 → báo chưa đủ cho đơn sớm nhất;
     - xác nhận 3 → 1 đơn, 1 đơn chờ lần sau;
     - lô sau 5 → "dư 4 thùng", khung "Chờ thu hoạch" biến mất.
  7. Thông tin nguồn gốc của khách có "Thu hoạch gần nhất".

  Kết quả: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không tràn ngang, không lỗi JS.
- **Chạy lại các kịch bản cũ** (đã sửa chỗ bấm "Báo sẵn sàng giao" thành xác nhận thu hoạch):
  - đạt: luồng giao hàng trên hai máy, Luồng 6, kiểm tra giao diện toàn app, biểu đồ bán chạy;
  - hai kịch bản Luồng 1 và 5 cũ dừng ở bước đầu vì tên sản phẩm mẫu đã đổi từ trước. Hai kịch bản này đã được Luồng 6 thay thế.

---

## Sau Giai đoạn 6 – Biểu đồ sản phẩm bán chạy cho HTX

**Yêu cầu của chủ repo:** thêm biểu đồ xem sản phẩm bán chạy cho bên HTX.

### Trên màn hình

- **Màn HTX có thêm tab "Bán chạy".** Tab đặt sau "Sản phẩm"; thanh tab chia 4 cột (3 cột ở màn dưới 360px). Số đơn chờ xác nhận chuyển thành chấm ở góc tab "Đơn hàng" để chữ không xuống dòng.
- **Bộ lọc:** một hàng phía trên, áp cho mọi số liệu bên dưới.
  - Khoảng thời gian: 7 ngày / 30 ngày / Tất cả.
  - Xếp theo: Số lượng / Tiền hàng.
- **Ba ô số liệu:**
  - Tiền hàng;
  - Số đơn;
  - Sản phẩm có đơn (vd. 2/3 sản phẩm đang bán).

  Màn hẹp dưới 360px xếp thành 3 dòng để số không bị tràn.
- **Biểu đồ thanh ngang xếp hạng:**
  - Tên sản phẩm phía trên thanh, giá trị ở đầu thanh (vd. "4 gói 500 g" hoặc "405.000đ").
  - Rê chuột hoặc chạm vào một dòng thì hiện đủ số liệu: số lượng, số đơn, tiền hàng.
  - Có nút "Xem dạng bảng" với hạng, sản phẩm, số lượng, số đơn, tiền hàng.
- **Ghi chú dưới biểu đồ:** cách tính, số sản phẩm đang bán chưa có đơn. Khi xếp theo số lượng mà các sản phẩm có đơn vị tính khác nhau (gói, hộp, kg), ghi chú gợi ý xếp theo tiền hàng để so sánh sát hơn.
- **Chưa có đơn trong khoảng thời gian:** báo "Số liệu sẽ hiện khi khách đặt hàng", có nút "Xem tất cả".

### Cách tính (`src/domain/salesStats.ts`)

- **Số liệu tính từ đơn thật trong dữ liệu.** Không thêm đơn mẫu hay số lượng mẫu nào cho biểu đồ (mục 9.1 cấm số lượt bán bịa). Vì vậy với dữ liệu mẫu ban đầu, mỗi HTX chỉ có 0–1 đơn; biểu đồ đầy dần khi khách đặt hàng trong demo.
- **Đơn được tính:** khách đã đặt xong (đã thanh toán hoặc trả khi nhận), gồm Chờ xác nhận, Đã xác nhận, Chờ thu hoạch, Đang chuẩn bị, Đang giao, Đã giao. Không tính đơn chờ thanh toán, đã huỷ, trả hàng.
- **Thời gian** tính theo lúc tạo đơn và đồng hồ demo (tua thời gian thì số liệu đổi theo).
- **Tiền hàng** = giá bán × số lượng. Phí giao không tính; mã ưu đãi do sàn chịu.

### Thiết kế biểu đồ

Làm theo hướng dẫn biểu đồ (dataviz):
- **Dạng biểu đồ:** sản phẩm là các nhóm không có thứ tự, nên dùng thanh ngang (tên dài đọc được). Một chuỗi số liệu nên mọi thanh cùng một màu, không tô màu theo độ lớn, không có hộp chú giải (tiêu đề đã nói đang xếp theo gì).
- **Màu:** các bậc xanh rừng của app quá nhạt màu để làm thanh; công cụ kiểm màu `validate_palette.js` báo "nhìn như xám" (độ bão hoà 0,07–0,08, dưới ngưỡng 0,10). App dùng `--color-chart-1: #1F7A55`, cùng tông xanh rừng nhưng đậm màu hơn, đạt mọi kiểm tra: trong dải sáng, đủ bão hoà, tương phản ≥ 3:1 trên nền trắng.
- **Thanh:** dày 16px, đầu thanh bo 4px, gốc thẳng. Thanh dài nhất chừa chỗ cho chữ giá trị, nên chữ không bị cắt.
- **Chữ:** dùng màu chữ thường, không dùng màu của thanh. Số liệu ở các ô dùng chữ không chân, chữ số không dàn đều; bảng dùng chữ số dàn đều để thẳng cột.
- **Không chỉ xem được bằng rê chuột:** giá trị ghi sẵn ở đầu thanh và có trong bảng. Dòng nào cũng chọn được bằng bàn phím, kèm nhãn đọc màn hình đủ số liệu.
- **Không làm chế độ tối:** app chưa có chế độ tối nên biểu đồ chỉ kiểm trên nền sáng.

### Kiểm thử

- **Lint, test, build:** lint không lỗi; 21 file, 164 test đạt (thêm test cách tính); build thành công, không cảnh báo.
  - Test cách tính:
    - chỉ đơn của đúng HTX;
    - bỏ đơn chưa trả cọc, đơn đã huỷ, đơn của HTX khác;
    - lọc theo 7 / 30 ngày / tất cả;
    - xếp theo số lượng và theo tiền hàng;
    - HTX chưa có đơn.
- **Playwright ở 320px và 390px:**
  1. Khách đặt thêm 2 hộp mứt và 4 gói phở hồng của HTX Bắc Hà.
  2. Tab "Bán chạy" của HTX Bắc Hà hiện Phở hồng 4 gói, Mứt 3 hộp (1 hộp từ đơn mẫu); tiền hàng 665.000đ; 2 đơn; 2/3 sản phẩm có đơn.
  3. Xếp theo tiền hàng thì Mứt (405.000đ) lên trước; khung số liệu khi chạm vào dòng và bảng hiện đúng.
  4. HTX Sa Pa (chưa có đơn) hiện thông báo trống.

  Kết quả: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không chữ nào bị tràn, không lỗi JS.
- **Chạy lại các kịch bản cũ:** kiểm tra giao diện toàn app, Luồng 1, Luồng 2, luồng giao hàng hai máy đều đạt.

---

## Sau Giai đoạn 6 – Quá trình giao hàng, HTX gọi điện / nhắn tin với khách

**Yêu cầu của chủ repo:** thêm quá trình giao hàng. Khi hàng đặt trước vào mùa, HTX xác nhận đơn, rồi gọi điện hoặc chat với khách.

### Luồng đơn đặt trước

Trạng thái đơn và quy tắc trong SRS giữ nguyên, chỉ thêm phần liên hệ và phần hiển thị:

1. Khách đặt trước và trả cọc.
2. HTX xác nhận đơn → đơn Chờ thu hoạch. Màn HTX hướng dẫn: "Khi hàng vào mùa và đủ hàng giao, bấm Báo sẵn sàng giao, rồi gọi điện hoặc nhắn tin cho khách để hẹn lịch giao".
3. **Vào mùa:** HTX bấm "Báo sẵn sàng giao".
   - Thẻ "Liên hệ khách" đổi màu và nhắc "Hàng đã vào mùa. Hãy gọi điện hoặc nhắn tin cho khách để hẹn lịch giao".
   - Danh sách đơn của HTX gắn nhãn "Hàng vào mùa – cần liên hệ khách".
   - Có nút "Dùng tin nhắn mẫu hẹn lịch giao", điền sẵn câu hẹn giao có tên khách, tên hàng, mã đơn, ngày giao dự kiến; HTX sửa rồi gửi.
4. **HTX liên hệ khách:**
   - **Gọi điện:** mở ứng dụng gọi trên máy của HTX (`tel:`), với số người nhận đã có trên phiếu đóng gói. Đơn quà gửi người khác thì gọi người đặt, để giữ bất ngờ cho người nhận.
   - **Ghi kết quả cuộc gọi:** gọi xong, HTX chọn Đã hẹn lịch giao / Khách hẹn gọi lại / Không liên lạc được, kèm ghi chú (vd. "giao sáng thứ Bảy").
   - **Nhắn tin:** nhắn trong đơn.
   - Khách nhận thông báo, có cả khi HTX gọi.
5. Khách trả phần còn lại (hoặc trả khi nhận nếu là COD) → HTX đóng gói, bàn giao vận chuyển → đang giao → đã nhận hàng.

### Hành trình đơn hàng (khách và HTX cùng thấy)

- **Các bước của đơn:**
  - Đặt trước và trả cọc;
  - HTX xác nhận đơn;
  - Vào mùa – HTX báo hàng sẵn sàng;
  - HTX gọi điện / nhắn tin hẹn lịch giao;
  - Trả phần còn lại;
  - Đóng gói, bàn giao vận chuyển;
  - Đang giao;
  - Đã nhận hàng.

  Đơn mua sẵn không có các bước vào mùa, liên hệ, trả phần còn lại.
- **Mỗi bước có trạng thái** đã xong / đang chờ / sắp tới, kèm thời điểm và chi tiết, vd. "Gọi điện: Đã hẹn lịch giao – giao sáng thứ Bảy", "Trả 175.000đ trước …", "Đơn vị vận chuyển đã lấy hàng".
- **Bước liên hệ không chặn các bước khác:** khách vẫn trả phần còn lại được trước khi HTX gọi. Chưa liên hệ mà đã bàn giao vận chuyển thì bước này ghi "Không ghi nhận liên hệ".
- **Đơn huỷ hoặc trả hàng:** chỉ giữ các bước đã xong, thêm dòng kết thúc kèm lý do.
- Lịch sử trạng thái chi tiết vẫn còn, gom vào mục thu gọn "Lịch sử trạng thái chi tiết".

### Trao đổi theo đơn

- **Mỗi đơn có phần "Trao đổi với HTX…"** (khách) / "Trao đổi với khách" (HTX).
  - Tin nhắn lưu trong dữ liệu dùng chung, nên máy khách và máy HTX cùng thấy; app hỏi dữ liệu mới mỗi 10 giây và khi quay lại app.
  - Cuộc gọi HTX ghi lại hiện thành một dòng riêng, có biểu tượng điện thoại.
- **Đếm tin chưa đọc:** danh sách đơn ghi "2 tin mới từ HTX…" / "1 tin mới từ khách"; mở đơn là đã đọc. Có thông báo ở chuông.
- **Giới hạn:**
  - Chỉ khách đặt đơn và HTX của đơn nhắn được.
  - Đơn chưa thanh toán xong hoặc đã huỷ thì không nhắn; đơn huỷ thì hướng dẫn gửi khiếu nại cho CSKH.
  - Tin tối đa 1.000 ký tự, ghi chú cuộc gọi tối đa 300.
- **Dữ liệu:** thêm `orderMessages` (không bắt buộc) và `Order.chatReadAt`. Dữ liệu đã lưu từ bản trước, kể cả trên máy chủ dùng chung, vẫn đọc được, không phải xoá dữ liệu.

### Mã nguồn

- **Nghiệp vụ:** `src/domain/orderContact.ts` (gửi tin, ghi cuộc gọi, đếm / đánh dấu đã đọc, số cần gọi, tin nhắn mẫu, hành trình đơn).
- **Thông báo:** trong `notifications.ts`.
- **Giao diện:**
  - `src/components/OrderJourney.tsx`, `src/components/OrderChat.tsx` (dùng chung cho khách và HTX);
  - `src/screens/coop/CoopContactCard.tsx` (thẻ Liên hệ khách của HTX).
- **Tải chậm:** các sheet đặt hàng, chi tiết đơn, khiếu nại, đánh giá và các sheet của HTX tải khi mở lần đầu. Phần tải ban đầu của app giảm từ 514 kB xuống 356 kB (gzip 108 kB) và hết cảnh báo dung lượng.
- **Sửa thêm:** `vite.config.ts` import file API kèm đuôi `.ts`, hết cảnh báo cấu hình của Vite 8 (có từ lần thêm API).

### Kiểm thử

- **Lint, test, build:** lint không lỗi; 20 file, 162 test đạt; build thành công, không cảnh báo.
- **Test nghiệp vụ mới:**
  - cả luồng đặt trước → xác nhận → vào mùa → gọi điện → trả phần còn lại → bàn giao → giao xong, kiểm từng bước của hành trình;
  - bước liên hệ "bỏ qua"; đơn huỷ;
  - nhắn qua lại, đếm và đánh dấu đã đọc, thông báo đúng người;
  - chặn người ngoài đơn, tin rỗng / quá dài, đơn chưa thanh toán / đã huỷ;
  - dữ liệu cũ chưa có phần trao đổi;
  - số cần gọi với đơn quà; tin nhắn mẫu.
- **Playwright trên hai máy (khách và HTX), dùng chung dữ liệu qua API, ở 320px và 390px:**
  1. Khách đặt trước mận và trả cọc.
  2. HTX xác nhận → báo sẵn sàng → thấy lời nhắc, nhãn "cần liên hệ khách", nút gọi `tel:0900000002` → gửi tin nhắn mẫu → ghi cuộc gọi "Đã hẹn lịch giao".
  3. Máy khách tự thấy "2 tin mới từ HTX mẫu Bắc Hà", mở đơn thấy tin nhắn, cuộc gọi và hành trình → trả lời → trả phần còn lại.
  4. Máy HTX thấy "1 tin mới từ khách" → bàn giao vận chuyển; hành trình đúng tới "Đang giao".

  Kết quả: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không lỗi JS.
- **Chạy lại các kịch bản cũ:** kiểm tra giao diện toàn app, Luồng 1, Luồng 2, chọn số lượng, liên kết ngân hàng, giỏ hàng, địa chỉ, mã ưu đãi, GPS, đăng nhập Google đều đạt.

---

## Sau Giai đoạn 6 – Địa chỉ theo GPS (Google Maps) và đăng nhập bằng Google

**Yêu cầu của chủ repo:** thêm địa chỉ theo GPS; đăng nhập được bằng Gmail. Chủ repo đã chọn:
- **Địa chỉ:** dùng Google Maps để điền.
- **Đăng nhập:** Google thật; chưa cấu hình thì dùng bản mô phỏng.

### Địa chỉ theo GPS

- **Nút "Dùng vị trí hiện tại (GPS)"** trong form thêm / sửa địa chỉ (`src/screens/customer/GpsAddressButton.tsx`):
  1. Lấy vị trí của máy và làm tròn khoảng 11 m.
  2. Nếu vị trí ngoài khung Hà Nội thì báo ngay, không gọi Google.
  3. Gọi `/api/geocode`.
  4. Điền sẵn số nhà, ngõ, đường. Chọn phường nếu khớp danh sách giao hàng (bỏ dấu, bỏ chữ "Phường", bỏ "(mẫu)").
  5. Hiện địa chỉ Google tìm được, sai số, và link "Xem trên Google Maps".
  6. Khách kiểm tra, sửa rồi mới lưu.
- **App không lưu toạ độ.** Địa chỉ lưu như địa chỉ nhập tay.
- **`api/geocode.ts`** (hàm Vercel): khoá Google Maps chỉ nằm ở server (`GOOGLE_MAPS_API_KEY`), trình duyệt không thấy.
  - Chỉ nhận toạ độ trong khung Hà Nội.
  - Đã nối Upstash thì giới hạn số lượt tra mỗi ngày (`GEOCODE_DAILY_LIMIT`, mặc định 300).
  - CDN của Vercel giữ kết quả 1 ngày theo toạ độ; cùng chỗ thì không gọi lại Google.
- **Báo lỗi rõ:**
  - chưa cho phép vị trí;
  - máy không định vị được;
  - ngoài Hà Nội;
  - chưa có khoá Google Maps;
  - Google từ chối (khoá sai, chưa bật Geocoding API hoặc thanh toán);
  - hết lượt.

  Mọi trường hợp đều nhập tay được.
- **Ghi chú L14:** Giai đoạn 2 đã bỏ nút GPS cũ vì nút đó điền một địa chỉ bịa sẵn. Nút mới lấy vị trí thật, theo yêu cầu của chủ repo.

### Đăng nhập bằng Google

- **Có Client ID (`VITE_GOOGLE_CLIENT_ID`):**
  - Màn đăng nhập hiện nút "Đăng nhập bằng Google" chính chủ của Google (Google Identity Services).
  - Google trả về ID token. `api/auth/google.ts` hỏi Google (tokeninfo) để kiểm tra chữ ký và hạn của token, rồi kiểm tra token cấp cho đúng Client ID, đúng nơi phát hành, email đã xác minh.
  - Đúng thì trả về mã đã băm (SHA-256 của mã tài khoản Google), tên và email đã che (vd. `ho•••@gmail.com`).
- **Chưa có Client ID, không tải được thư viện Google, hoặc mở trên claude.ai:** nút "Tiếp tục với Gmail" gắn nhãn Mô phỏng. Khách nhập Gmail và tên hiển thị; không kết nối Google, không cần mật khẩu.
- **Lần đầu đăng nhập** tạo tài khoản khách hàng không có SĐT; SĐT người nhận nhập ở địa chỉ giao hàng. Lần sau vào đúng tài khoản đó. Tài khoản bị khoá thì báo như đăng nhập bằng SĐT.
- **Dữ liệu demo chỉ lưu mã đã băm, tên và email đã che;** không lưu email đầy đủ hay mã Google gốc.
  - Tài khoản Google không hiện trong danh sách "Tài khoản demo" ở màn đăng nhập.
  - Tab Tài khoản ghi "Đăng nhập bằng Google · ho•••@gmail.com".
  - Bảng tài khoản của Admin ghi tương tự.
- **Sửa thêm:** tìm tài khoản theo SĐT rỗng không còn khớp nhầm tài khoản Google (test đã bắt được lỗi này).

### Cài trên Google Cloud và Vercel (chủ repo làm, một lần)

**A. Google Maps để tra địa chỉ**

1. Vào [console.cloud.google.com](https://console.cloud.google.com), tạo dự án, vd. "dacsan-lao-cai".
2. Bật **Billing** (thanh toán) cho dự án. Google Maps yêu cầu bước này; có mức dùng miễn phí hằng tháng.
3. **APIs & Services → Library**, bật **Geocoding API**.
4. **APIs & Services → Credentials → Create credentials → API key**.
   - Mở khoá vừa tạo → **API restrictions → Restrict key** → chỉ chọn Geocoding API.
   - **Application restrictions** để None, vì khoá chạy ở máy chủ Vercel, địa chỉ IP không cố định.
5. Đặt hạn mức để không phát sinh phí ngoài ý muốn: **Geocoding API → Quotas**, giới hạn số yêu cầu mỗi ngày (vd. 300).
6. Vercel → project → **Settings → Environment Variables**, thêm `GOOGLE_MAPS_API_KEY` = khoá vừa tạo. **Không** thêm tiền tố `VITE_`, để khoá không lộ ra trình duyệt.

**B. Đăng nhập bằng Google**

1. Cùng dự án, mở **Google Auth Platform** (OAuth consent screen).
   - Chọn **External**, điền tên app và email hỗ trợ.
   - Ở **Audience** bấm **Publish app**. App chỉ xin tên và email nên không cần Google duyệt.
   - Nếu để chế độ Testing, chỉ các email trong danh sách Test users đăng nhập được.
2. **Clients → Create client → Web application**.
   - Mục **Authorized JavaScript origins** thêm `https://dacsan-vung-mien.vercel.app`, và `http://localhost:3000` nếu chạy thử trên máy.
   - Không cần Redirect URI.
3. Chép Client ID, có dạng `….apps.googleusercontent.com`. Client ID là thông tin công khai.
4. Vercel → **Environment Variables**, thêm `VITE_GOOGLE_CLIENT_ID` = Client ID.

**Sau khi thêm biến:** vào **Deployments → Redeploy** (biến `VITE_` được gắn vào lúc build). Kiểm tra:
- màn đăng nhập hiện nút của Google thay cho "Tiếp tục với Gmail (Mô phỏng)";
- form địa chỉ bấm GPS thì điền được địa chỉ.

Chạy thử trên máy: chép `.env.example` thành `.env.local` (file này không được commit), điền hai biến trên rồi `npm run dev`.

### Giới hạn

- **Nút đăng nhập của Google cao 40px** (kích thước cố định của Google), thấp hơn quy ước 44px của app. Không chỉnh được vì nút do Google vẽ.
- **Link xem trước của Vercel** (mỗi PR một tên miền) không đăng nhập Google được, trừ khi thêm tên miền đó vào Authorized JavaScript origins. Bản chính `dacsan-vung-mien.vercel.app` chạy bình thường.
- **Danh sách phường giao hàng mẫu mới có 8 phường.** Google trả phường khác thì khách tự chọn.
- **Dữ liệu demo vẫn dùng chung, không có đăng nhập phía server** (xem mục API). Đăng nhập Google ở đây để chứng minh luồng; người khác mở demo vẫn xem được tên và email đã che. Địa chỉ lưu từ GPS là địa chỉ thật nên cũng xem được như địa chỉ nhập tay.
- **Bản trên claude.ai không có API:** GPS báo chưa có chức năng tra địa chỉ, đăng nhập Google chạy bản mô phỏng.

### Kiểm thử

- **Lint, test, build:** lint không lỗi; 19 file, 155 test đạt; build thành công. Phần chung 495 kB (gzip 145 kB), tăng khoảng 11 kB.
- **Test mới cho `/api/geocode`:**
  - kiểm tra phương thức, toạ độ, khung Hà Nội, khoá trước khi gọi Google;
  - đọc kết quả Google, khoá không lọt ra kết quả;
  - các trạng thái lỗi của Google, giới hạn lượt mỗi ngày.
- **Test mới cho `/api/auth/google`:**
  - token đúng; sai Client ID, sai nơi phát hành, hết hạn, email chưa xác minh;
  - thiếu cấu hình;
  - không trả email đầy đủ hay mã gốc.
- **Test mới cho nghiệp vụ:**
  - tạo / dùng lại / khoá tài khoản Google;
  - khớp phường (không khớp nhầm "Thanh Xuân Bắc" với "Thanh Xuân").
- **Build bằng `vercel build`:** có hàm `api/geocode` và `api/auth/google`. Chạy thử hàm đã build với Google giả lập: 503 khi chưa cấu hình, 200 khi đúng; kết quả tra địa chỉ có cache CDN.
- **Playwright, ở 320px và 390px, chặn mọi request ra ngoài:**
  - GPS: Google trả địa chỉ thì điền "18 Ngõ 42 Lê Văn Lương", chọn đúng Phường Thanh Xuân, lưu được, địa chỉ lưu không có toạ độ.
  - GPS: máy chủ chưa có khoá thì báo rõ; vị trí TP. Hồ Chí Minh thì báo ngoài Hà Nội, không gọi API; từ chối quyền vị trí thì báo cách bật.
  - Gmail mô phỏng: email sai thì báo; tạo tài khoản; tab Tài khoản ghi Google (mô phỏng) kèm email che; không lưu email đầy đủ; không hiện trong danh sách demo; đăng nhập lại vào đúng tài khoản.
  - Google thật (bản build có Client ID, thư viện Google giả lập): nút nhận đúng Client ID và chế độ popup; token được gửi lên máy chủ xác minh; vào app; token sai thì báo lỗi.
  - 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không lỗi JS.
- **Chạy lại các kịch bản cũ:** kiểm tra giao diện toàn app, Luồng 1, Luồng 2, chọn số lượng, liên kết ngân hàng, giỏ hàng, địa chỉ, mã ưu đãi đều đạt.

---

## Sau Giai đoạn 6 – Nhận diện "sang" cho toàn app

**Yêu cầu của chủ repo:** giao diện còn đơn giản quá, cần đặc sắc và sang hơn.

**Hướng làm:** lấy cảm hứng từ thổ cẩm vùng cao và bao bì quà biếu cao cấp. Màu vẫn là xanh rừng và vàng champagne của nhóm (không đổi token màu gốc), thêm hoa văn, khung ảnh, chữ có chân.
- Không thêm lời quảng cáo, cam kết, giải thưởng hay số liệu nào.
- Các bước "Cách mua" chỉ mô tả đúng luồng của app.
- Mọi hoa văn vẽ bằng SVG nhúng, không tải ảnh ngoài.

### Thành phần dùng chung

- **Logo và chữ thương hiệu** (`src/components/Brand.tsx`):
  - Biểu tượng hình tròn viền vàng: núi, mặt trời, ruộng bậc thang.
  - Chữ "ĐẶC SẢN SỐ" viết hoa, "Lào Cai" chữ có chân nghiêng.
  - Có thêm đường trang trí (vạch – quả trám – vạch), dải hoa văn và tiêu đề mục (dòng nhỏ màu vàng + tiêu đề chữ có chân).
- **Hoa văn trong `src/index.css`** (SVG nhúng, chỉ để trang trí):
  - `brocade-dark` / `brocade-light`: dải quả trám, răng cưa;
  - `lattice`: hoa văn chìm rất mờ trên nền tối;
  - `paper-grain`: nền giấy ngà có vân nhẹ;
  - `text-gold`: chữ ánh vàng cho tiêu đề lớn trên nền tối;
  - `drop-cap`: chữ hoa đầu đoạn mô tả;
  - `leader`: dòng chấm trong bảng thông tin.
- **Thanh đầu trang:**
  - Có logo và chữ thương hiệu, dải hoa văn ở mép dưới.
  - Trên máy tính hiện thêm tên và vai trò.
  - Trên điện thoại, tài khoản HTX / Admin / QLNN hiện tên và vai trò thay cho chữ thương hiệu.
- **Thanh tab của khách:** nền xanh rừng đậm, tab đang mở có quả trám vàng. Trên máy tính là thanh nổi bo tròn.
- **Bảng trượt (sheet):** tiêu đề chữ có chân, mép trên có hoa văn, viền vàng mảnh. Thông báo nổi nền xanh đậm.
- **Nút:**
  - Nút chính màu chuyển nhẹ, có bóng.
  - Nút phụ viền vàng.
  - Ô trống có đường trang trí.

### Màn của khách

- **Bố cục rộng trên máy tính:** trang khách và màn đăng nhập rộng tối đa 1152px thay vì một cột 640px. Lưới sản phẩm 2 cột trên điện thoại, 3 cột trên máy tính bảng, 4 cột trên máy tính.
- **Khám phá:**
  - **Đầu trang:** nền tối có hoa văn chìm, tiêu đề chữ ánh vàng, dải số liệu (số sản phẩm, số HTX, nơi giao), nút "Xem sản phẩm" và "Đặt trước theo mùa". Trên máy tính có thêm 3 khung tranh hình vòm.
  - **Tìm và lọc:** ô tìm bo tròn, chip lọc viền vàng.
  - **Khối "Đặt trước theo mùa":** liệt kê sản phẩm đang nhận đặt trước, ẩn khi đang tìm hoặc lọc.
  - **Thẻ sản phẩm:** ảnh trong khung vòm viền vàng, chữ căn giữa, giá chữ có chân. Màn hẹp hơn 390px dùng cỡ giá nhỏ hơn để giá không bị nút "+" che.
  - **Cuối trang:** mục "Cách mua" 3 bước và chân trang có logo.
- **Chi tiết sản phẩm:**
  - Khung ảnh viền kép, nút "Xem nguồn gốc" nền tối chữ vàng, giá cỡ lớn chữ có chân.
  - Mô tả có chữ hoa đầu đoạn.
  - Bảng "thông tin" có dòng chấm: vùng, HTX, nhóm hàng, hình thức, quy cách, lấy từ dữ liệu sản phẩm.
- **Vụ mùa:** đầu trang cùng kiểu, ảnh khung vòm dẹt, 3 cột trên máy tính.
- **Đơn hàng:** tiêu đề mục mới; thẻ đơn có vạch vàng bên trái, tên hàng và tổng tiền chữ có chân.
- **Tài khoản:** thẻ đầu trang nền tối với vòng tròn chữ viết tắt tên viền vàng. Các mục khác viền vàng, biểu tượng trong vòng tròn tối.
- **Đăng nhập:**
  - Khối giới thiệu có logo lớn và tiêu đề chữ ánh vàng.
  - Trên máy tính chia 2 cột: giới thiệu bên trái, đăng nhập bên phải.
  - Tài khoản demo có vòng tròn chữ viết tắt, màu theo vai trò.
- **HTX, Admin, QLNN:** đầu trang của từng kênh cùng kiểu (nền tối, hoa văn, chữ có chân). Phần làm việc giữ nguyên để dễ thao tác.

### Kiểm thử

- **Lint, test, build:** lint không lỗi; 17 file, 142 test đạt; build thành công. Phần chung 485 kB (gzip 142 kB), tăng khoảng 16 kB.
- **Kiểm tra giao diện tự động**, chạy cả bản thường và bản tắt nền vân giấy để công cụ đo tương phản đọc được màu nền thật:
  - mọi màn;
  - Luồng 1, Luồng 2;
  - chọn số lượng ở 320px và 390px, liên kết ngân hàng, chọn sản phẩm trong giỏ, địa chỉ, mã ưu đãi;
  - hai máy dùng chung dữ liệu.

  Kết quả: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không lỗi JS.
- **Tràn chữ:** đo ở 320, 360, 390, 768 và 1280px. Không có chữ bị cắt hay bị che, không cuộn ngang.

---

## Sau Giai đoạn 6 – Chọn số lượng, nhãn địa chỉ, liên kết ngân hàng (mô phỏng)

**Chủ repo báo 3 việc:**
1. Thêm vào giỏ chỉ thêm được từng cái một; khách mua nhiều không chọn được số lượng.
2. Khách chưa đặt hàng mà đã thấy trạng thái "Đang giao tới".
3. Phần tài khoản cần liên kết với ngân hàng.

### Chọn số lượng

- **Nguyên nhân:** trang chi tiết đã có ô chọn số lượng, nhưng nằm cuối trang, dưới mô tả và ghi chú dữ liệu mẫu, nên khách không thấy. Nút "+" trên thẻ sản phẩm mỗi lần chỉ thêm 1. Vụ mùa luôn đặt 1 suất.
- **Ô số lượng dùng chung** (`src/components/QuantityStepper.tsx`): nút −, ô số, nút +.
  - Gõ thẳng số vào ô được, có hiệu lực ngay. Gõ quá số còn lại thì tự về mức tối đa.
  - Bàn phím số trên điện thoại.
  - Hai nút 44×44px.
- **Trang chi tiết:** ô số lượng chuyển xuống chân trang, ngay trên "Thêm vào giỏ" / "Mua ngay", luôn thấy. Kèm số còn lại, số đã có trong giỏ và thành tiền.
- **Thẻ ở Khám phá:** bấm "+" để thêm 1, rồi thẻ hiện − / số / + để tăng giảm ngay tại chỗ. Giảm về 1 thì nút − thành nút bỏ khỏi giỏ.
  - Thẻ không có ô gõ: ở màn 320px thẻ chỉ rộng khoảng 140px, ô gõ sẽ hẹp hơn 44px.
  - Gõ số lượng lớn ở trang chi tiết hoặc giỏ hàng.
- **Vụ mùa:** mỗi sản phẩm có ô số suất (kèm số suất còn lại và thành tiền) trước nút "Đặt trước".
- **Giỏ hàng:** ô số gõ được.

### Nhãn "Đang giao tới"

- **Nguyên nhân:** đó là nhãn của địa chỉ mặc định trong sổ địa chỉ, không phải trạng thái đơn. Nhưng chữ "Đang giao tới" đọc như có đơn đang trên đường giao.
- **Sửa:**
  - Nhãn đổi thành **"Mặc định"**.
  - Thanh trên cùng đổi "Giao tới (Hà Nội)" thành **"Nhận hàng tại (Hà Nội)"**.
  - Thông báo khi chọn địa chỉ đổi thành "Địa chỉ nhận hàng: …".
  - Chữ "Giao tới" chỉ còn ở chi tiết đơn đã đặt, nơi đơn thật sự giao tới địa chỉ đó.

### Liên kết ngân hàng (mô phỏng)

Phần "Tài khoản nhận hoàn tiền (đơn COD)" trong tab Tài khoản của khách trước đây là 3 ô nhập tự do. Nay là luồng liên kết, gắn nhãn "Mô phỏng" (`src/screens/customer/BankLinkSection.tsx`):

1. **Bước 1:**
   - Chọn ngân hàng trong danh sách (`src/domain/banks.ts`), hoặc "Ngân hàng khác" rồi gõ tên.
   - Nhập số tài khoản (6–19 chữ số) và tên chủ tài khoản. App tự viết hoa, bỏ dấu như ngân hàng in, và cho xem trước.
2. **Bước 2:** ngân hàng mô phỏng "gửi OTP". Không gửi tin thật, mã luôn là `123456`, có nút "Điền OTP mô phỏng". Sai mã thì báo "Mã OTP không đúng."
3. **Đã liên kết:**
   - Hiện ngân hàng, số tài khoản che (`**** 8901`), tên chủ tài khoản và giờ liên kết.
   - Có nút "Đổi tài khoản" và "Huỷ liên kết"; huỷ thì hỏi lại ngay trong trang.
   - Không huỷ được khi đang có khoản hoàn chuyển vào tài khoản đó.

**Giới hạn:**
- App không kết nối ngân hàng nào và không tra cứu tên chủ tài khoản thật.
- Danh sách ngân hàng chỉ là tên để chọn; mã trong danh sách là mã nội bộ, không phải mã chính thức.
- Liên kết thật (tra cứu tên chủ tài khoản, chuyển tiền hoàn tự động) cần ký hợp đồng với một cổng thanh toán hoặc ngân hàng. Nó cũng cần server có đăng nhập thật; nằm ngoài phạm vi bản demo.

**Mã nguồn:**
- `linkRefundAccount`, `unlinkRefundAccount`, `prepareBankLink` trong `src/domain/account.ts`, thay cho `setRefundAccount`.
- `BankAccount` thêm `bankCode` và `linkedAt` (không bắt buộc). Dữ liệu đã lưu trước đây vẫn đọc được: tài khoản cũ hiện là đã liên kết, không có giờ liên kết.
- Khách hàng mẫu 1 có sẵn tài khoản "Ngân hàng mẫu" đã liên kết.

### Kiểm thử

- **Lint, test, build:** lint không lỗi; 17 file, 142 test đạt (thêm test liên kết ngân hàng); build thành công.
- **Playwright ở 320px và 390px, chặn request ra ngoài:**
  - Thẻ: "+" rồi tăng 2 lần thì giỏ có 3; giảm về 1 rồi bỏ khỏi giỏ thì nút "+" hiện lại.
  - Trang chi tiết: ô số lượng thấy ngay ở chân trang; gõ 12 rồi thêm vào giỏ thì giỏ có 12.
  - Giỏ: gõ 3.
  - Vụ mùa: chọn 3 suất thì bước đặt hàng ghi "× 3".
  - Sổ địa chỉ: nhãn "Mặc định", không còn chữ "Đang giao tới".
  - Liên kết ngân hàng:
    - bỏ trống thì báo lỗi; sửa ô thì lỗi ẩn;
    - sai OTP bị từ chối, đúng OTP thì liên kết;
    - đổi sang ngân hàng khác được;
    - huỷ liên kết có hỏi lại.
  - 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px, không lỗi JS.
- **Chạy lại các kịch bản cũ:** Luồng 1, Luồng 2, kiểm tra giao diện toàn app, chọn sản phẩm trong giỏ, địa chỉ giao hàng, mã ưu đãi đều đạt.

### Trước khi đưa web ra dùng thật

Bản này là demo. Khi đưa ra cho người mua thật, cần bỏ hoặc thay những phần sau:

| Phần | Bản demo | Khi dùng thật |
|---|---|---|
| Danh sách "Tài khoản demo" ở màn đăng nhập | Bấm để vào nhanh từng vai trò | Bỏ. Tài khoản HTX, Admin, QLNN do Admin cấp; khách tự đăng ký |
| OTP đăng nhập | Mô phỏng, luôn là 123456 | Gửi SMS OTP thật qua nhà cung cấp SMS |
| Công cụ demo, dải "Bản demo" | Có | Bỏ |
| API `/api/state` | Không có đăng nhập phía server | Thay bằng backend có đăng nhập và phân quyền ở server |
| Thanh toán, hoàn tiền, liên kết ngân hàng | Mô phỏng | Tích hợp cổng thanh toán / ngân hàng (cần hợp đồng) |
| Dữ liệu mẫu (sản phẩm, giá, HTX) | Ghi "mẫu" | Dữ liệu thật do HTX cung cấp và xác nhận |

---

## Sau Giai đoạn 6 – API dữ liệu dùng chung giữa nhiều máy

**Yêu cầu của chủ repo:** thêm API cho bản demo. Chủ repo chọn phương án dữ liệu dùng chung giữa nhiều máy: khách đặt trên điện thoại, HTX và Admin trên máy khác thấy được đơn đó. Thanh toán, OTP và giao hàng vẫn là mô phỏng.

### Cách hoạt động

- **API:** một hàm Vercel, file `api/state.ts`, đường dẫn `/api/state`. Toàn bộ dữ liệu demo lưu thành một bản ghi trên Upstash Redis, kèm số phiên bản. Upstash thêm qua Vercel Marketplace, có gói miễn phí.
- **Quy tắc nghiệp vụ không đổi chỗ:** vẫn chạy trong `src/domain` trên trình duyệt. API chỉ đọc và ghi bản ghi, không có quy tắc nghiệp vụ nào ở server.

| Yêu cầu | Trả về |
|---|---|
| `GET /api/state` | `{ version, schema, data, updatedAt }`. Chưa có dữ liệu thì `data = null`, `version = 0` |
| `GET /api/state?since=N` | `{ changed: false, version }` nếu phiên bản vẫn là N; khác thì trả cả dữ liệu như trên |
| `PUT /api/state` gửi `{ baseVersion, schema, data }` | `200 { version }`: ghi xong, phiên bản tăng 1 |
| | `409` kèm dữ liệu mới nhất: máy khác vừa ghi trước |
| | `400` dữ liệu sai dạng; `413` quá 900 KB |
| Vercel chưa nối Upstash | `503`, app tự lưu trên trình duyệt như trước |

- **Hai máy ghi cùng lúc:**
  - Mỗi lần ghi gửi kèm số phiên bản máy đang có. Redis so phiên bản và ghi trong một bước (đoạn Lua), nên không máy nào ghi đè mất thay đổi của máy kia.
  - Máy ghi sau nhận `409` kèm dữ liệu mới nhất. App chạy lại các thao tác chưa gửi trên dữ liệu đó rồi gửi lại. Ví dụ hai máy cùng thêm hàng vào một giỏ thì giữ cả hai món.
  - Thao tác không còn hợp lệ trên dữ liệu mới thì bỏ, và báo: "… thao tác không áp dụng được vì dữ liệu vừa được máy khác thay đổi". Ví dụ: hai máy cùng đăng ký một SĐT.
  - Mã đơn, mã giao dịch giữ nguyên khi chạy lại: app ghi lại các số ngẫu nhiên đã dùng (`recordRandom` / `replayRandom` trong `src/domain/ids.ts`).
- **Thấy thay đổi của máy khác:** app hỏi API mỗi 10 giây khi trang đang hiện trên màn hình, và hỏi ngay khi quay lại tab hoặc app. Nếu không có gì mới, mỗi lần hỏi chỉ đọc số phiên bản.
- **Màn hình không chờ mạng:** thao tác hiện ngay, gửi lên sau. Mất mạng thì giữ thay đổi trên máy, thử lại sau 5 giây, tăng dần tới 30 giây.
- **Không có API thì chạy như cũ:** lưu `localStorage` như trước. Gồm các trường hợp: mở bản trên claude.ai, Vercel chưa nối Upstash, hoặc không gọi được API lúc mở app. Công cụ demo ghi rõ lý do.
- **Chạy local:** `npm run dev` và `npm run preview` có sẵn `/api/state`, cùng logic với hàm Vercel nhưng lưu trong bộ nhớ server, mất khi tắt server. Mở hai trình duyệt để thử. `npm run dev` mở cổng cho mạng nội bộ, nên thử được cả với điện thoại cùng mạng Wi-Fi.
- **Mã nguồn:** `api/state.ts` (API), `src/store/remoteSync.ts` (đồng bộ phía app), `src/store/AppDataContext.tsx` (mọi thay đổi đi qua `run()` như cũ, nay thêm bước gửi lên API), `vite.config.ts` (API trong bộ nhớ cho dev / preview).

### Trên màn hình

- **Dải "Bản demo":** thêm "Dữ liệu dùng chung giữa các máy." Mất kết nối thì ghi "Mất kết nối – thay đổi đang giữ trên máy này."
- **Công cụ demo → mục Dữ liệu:** trạng thái lưu, giờ đồng bộ lần cuối, nút "Đồng bộ ngay".
- **"Khôi phục dữ liệu mẫu" khi đang dùng chung:** áp dụng cho mọi máy. Câu hỏi lại đổi thành "Khôi phục dữ liệu mẫu cho mọi máy đang dùng demo?…"

### Cài trên Vercel (chủ repo làm, một lần)

1. Vào Vercel → project `dacsan-vung-mien` → tab **Storage** → **Create Database** → chọn **Upstash for Redis** (Marketplace) → gói **Free** → chọn vùng gần (Singapore) → **Create**.
2. Ở bước **Connect Project**, chọn project `dacsan-vung-mien` và cả 3 môi trường (Production, Preview, Development). Để tiền tố tên biến mặc định; Vercel sẽ tạo `KV_REST_API_URL` và `KV_REST_API_TOKEN`. Có đặt tiền tố khác thì API vẫn tìm được.
3. Vào **Deployments** → bản mới nhất → **Redeploy**. Biến môi trường chỉ có hiệu lực từ lần deploy sau khi thêm.
4. Mở web → **Công cụ demo** → mục Dữ liệu phải hiện "Dữ liệu dùng chung – đã đồng bộ".

Lần đầu mở sau khi nối, trình duyệt mở trước đưa dữ liệu nó đang có lên làm dữ liệu chung. Muốn bắt đầu sạch thì bấm "Khôi phục dữ liệu mẫu".

Repo không thêm `vercel.json`, không đổi cấu hình build. File `api/tsconfig.json` chỉ để Vercel dịch hàm API mà không báo lỗi kiểu thừa trong log build.

### Giới hạn và lưu ý an toàn

- **Không có đăng nhập phía server.** Ai có link đều đọc và ghi được dữ liệu demo qua API; đăng nhập OTP vẫn là mô phỏng trên trình duyệt. Chỉ dùng dữ liệu mẫu, không nhập SĐT, địa chỉ, tài khoản ngân hàng hay ảnh thật.
- **Kích thước:** dữ liệu mẫu khoảng 20 KB; mỗi lần ghi gửi cả bộ dữ liệu. Giới hạn 900 KB để mỗi lần ghi gọn, nằm trong giới hạn của gói miễn phí. Ảnh khiếu nại, đánh giá đã thu nhỏ còn khoảng 20–40 KB mỗi ảnh. Vượt giới hạn thì Công cụ demo báo lỗi; khôi phục dữ liệu mẫu là hết.
- **Số lệnh Redis:** mỗi máy đang hiện trang hỏi 1 lệnh mỗi 10 giây, khoảng 360 lệnh mỗi giờ; tab bị ẩn thì không hỏi. Đủ cho buổi demo hay buổi thử nghiệm. Để app mở cả ngày trên nhiều máy thì có thể chạm hạn mức lệnh của gói miễn phí; xem số đã dùng trong trang Upstash.
- **Đồng hồ demo nằm trong dữ liệu chung:** tua giờ trên một máy thì mọi máy cùng tua.
- **Giỏ hàng nằm trong dữ liệu chung:** đăng nhập cùng một tài khoản trên hai máy thì thấy cùng một giỏ. Phiên đăng nhập vẫn riêng từng tab, như trước.

### Kiểm thử

- **Unit test:** thêm 14 test, ở `src/store/__tests__/api.test.ts` (API) và `remoteSync.test.ts` (đồng bộ). Nội dung:
  - GET, PUT, `?since=`, 409, 400, 413, 405;
  - đọc biến môi trường, kể cả khi có tiền tố;
  - hai máy dùng chung một kho: máy sau nhận dữ liệu máy trước;
  - ghi xung đột vẫn giữ cả hai món trong giỏ, mã đơn giữ nguyên khi chạy lại;
  - bỏ thao tác trùng SĐT;
  - mất mạng rồi gửi lại;
  - quay về `localStorage` khi API lỗi, trả 503, hoặc trả trang HTML.
- **Lint, test, build:** lint không lỗi, 17 file 141 test đạt, build thành công. Phần chung 460 kB (gzip 135 kB).
- **Build kiểu Vercel:** chạy `vercel build` (Vercel CLI 64.2.0) trên máy. Hàm `api/state` đóng gói cho Node.js 22, log build không có lỗi.
  - Chạy thử hàm đã build với thư viện `@upstash/redis` thật, gọi tới một server giả lập Upstash: GET, PUT, 409, `?since=`, 405 đúng; thiếu biến môi trường thì 503; sai token thì 502.
  - Chưa chạy với Upstash thật, vì môi trường làm việc không vào được mạng ngoài. Kiểm tra theo bước 4 ở phần cài đặt sau khi nối.
- **Hai trình duyệt riêng, chạy trên `npm run preview` bằng Playwright:** một bên là điện thoại của khách, một bên là máy tính của HTX.
  1. Khách đặt đơn và thanh toán mô phỏng.
  2. Máy HTX tự thấy đơn sau 7,4 giây, không bấm gì. HTX xác nhận đơn.
  3. Khách quay lại app thì thấy đơn "Đang chuẩn bị".
  4. Xoá `localStorage` của máy khách rồi tải lại trang, đơn vẫn còn (lấy từ API).

  Không lỗi JS.
- **Chạy lại ở chế độ dùng chung:** Luồng 1, Luồng 2 và kiểm tra giao diện tự động đều đạt: 0 lỗi axe, 0 vùng bấm dưới 44px, 0 chữ dưới 12px.

---

## Sau Giai đoạn 6 – Tranh minh hoạ sản phẩm và giao diện cao cấp

**Yêu cầu của chủ repo:** thêm ảnh minh hoạ cho sản phẩm. Giao diện còn đơn giản, chưa toát ra không khí bán đặc sản cho phân khúc giá cao.

### Ảnh minh hoạ

Mục 9.4 không cho dùng ảnh stock trông như ảnh thật của sản phẩm, vì nhóm chưa có quyền dùng ảnh. Vì vậy app dùng **tranh tự vẽ bằng SVG** (`src/components/ProductIllustration.tsx`), mỗi sản phẩm một tranh:

| Sản phẩm | Tranh |
|---|---|
| Chè Shan tuyết | Cành chè có búp trắng, chén chè |
| Thảo quả khô | Mấy quả thảo quả trên mẹt tre |
| Mứt / ô mai mận | Hũ thuỷ tinh, nắp phủ vải |
| Mật ong Thanh Xuân | Chai mật, tổ ong, que múc |
| Gạo Séng Cù | Bao gạo mở miệng, bông lúa |
| Phở hồng Bắc Hà | Nắm phở trên mẹt, đôi đũa |
| Mận tam hoa tươi | Cành mận có quả |
| Cốm Tú Lệ | Cốm xanh trên lá sen |
| Bưởi Đại Minh | Quả bưởi có lá, một múi bổ sẵn |

- **Nền tranh:** núi xa và ruộng bậc thang, tông xanh rừng – vàng champagne trên nền giấy ấm.
- **Sản phẩm HTX tự tạo:** nhận tranh theo tên nếu khớp loại hàng đã có tranh, không thì nhận hình theo nhóm hàng.
- **Nhãn:** ảnh lớn ở trang chi tiết có nhãn "Ảnh minh hoạ". Trình đọc màn hình đọc "Ảnh minh hoạ: tên sản phẩm".
- **Ảnh thật:** ảnh HTX tự tải lên vẫn được ưu tiên hiện.
- **Thay cho:** ảnh giữ chỗ ghi tên sản phẩm của Giai đoạn 5.

### Giao diện

- **Phông tiêu đề:** Fraunces, có chân, có bộ chữ tiếng Việt, thêm gói `@fontsource/fraunces`. Dùng cho tên sản phẩm, đề mục và tên app; chữ nội dung vẫn là Plus Jakarta Sans. Token `--font-display` và màu nền giấy `--color-paper` khai báo trong theme.
- **Đầu trang:** Khám phá, Vụ mùa và màn đăng nhập có tranh phong cảnh vùng cao (`LandscapeArt`): núi, ruộng bậc thang, mặt trời lặn. Chữ nằm phía trên, tranh ở nửa dưới để chữ luôn đọc rõ.
  - Đầu trang Khám phá có dòng "9 sản phẩm · 7 HTX", số tính từ dữ liệu.
  - Không thêm lời quảng cáo hay cam kết nào.
- **Thẻ sản phẩm:**
  - ảnh vuông lớn, vùng sản xuất viết hoa màu vàng, tên sản phẩm phông có chân;
  - thanh suất đặt trước gọn: còn bao nhiêu suất, giao từ ngày nào;
  - nút thêm vào giỏ tròn.
  - Cả thẻ là một nút (bấm bằng bàn phím được); nút thêm vào giỏ tách riêng, không lồng nút trong nút.
- **Trang chi tiết:** ảnh lớn tỉ lệ 4:3, tên sản phẩm cỡ lớn phông có chân, dòng vùng và nhóm hàng phía trên.
- **Vụ mùa:** mỗi sản phẩm đặt trước có ảnh lớn ở đầu thẻ; bấm ảnh mở trang chi tiết.
- **Chip lọc:** bo tròn.
- **Sửa thêm:** chuyển tab hoặc vừa đăng nhập, đăng xuất thì về đầu trang. Trước đây trang giữ vị trí cuộn cũ, nên có khi mở ra ở giữa danh sách.

### Kiểm thử

- Lint không lỗi, 127 test đạt, build thành công. Phần chung 452 kB (gzip 133 kB); tăng khoảng 21 kB do tranh vẽ.
- Kiểm tra giao diện tự động trên mọi màn và trong Luồng 1: không có lỗi tương phản, nút thiếu tên, vùng bấm dưới 44px hay chữ dưới 12px.
- Luồng 1, Luồng 2, chọn sản phẩm trong giỏ, địa chỉ giao hàng, mã ưu đãi đều chạy lại đạt. Không lỗi JS.

---

## Sau Giai đoạn 6 – Chọn nhiều sản phẩm trong giỏ để đặt chung

**Yêu cầu của chủ repo:** cho chọn nhiều sản phẩm trong giỏ hàng để thanh toán một thể. Trước đây bấm đặt hàng là đặt cả giỏ.

**Giỏ hàng:**

- Mỗi sản phẩm có ô chọn. Thêm ô "Chọn tất cả" để chọn hoặc bỏ chọn mọi sản phẩm đặt được.
- Sản phẩm mới thêm vào giỏ được chọn sẵn.
- Sản phẩm hết hàng hoặc tạm ngừng bán có ghi rõ, và không chọn được.
- Chân giỏ hiện số sản phẩm đã chọn và tạm tính của các sản phẩm đó.
- Nút đặt hàng ghi "Đặt hàng N sản phẩm (M món)". Chưa chọn gì thì nút bị khoá và ghi "Chọn sản phẩm để đặt hàng".
- Nút tăng, giảm số lượng chuyển xuống dòng thứ hai, cạnh thành tiền của sản phẩm. Nhờ vậy màn 320px vẫn đủ vùng bấm 44px.

**Đặt hàng:**

- Chỉ các sản phẩm đã chọn vào bước đặt hàng (`CheckoutSource` có thêm `productIds`).
- Đơn vẫn tách theo HTX và loại hàng; phần trả online gộp một giao dịch (PAR-19).
- Đặt xong, chỉ các sản phẩm đã đặt bị xoá khỏi giỏ; sản phẩm không chọn ở lại.

**Kiểm thử:**

- **Unit test mới** (`checkout.test.ts`): đặt 2 trong 3 sản phẩm của giỏ thì ra 2 đơn, chung 1 giao dịch, và giỏ còn lại đúng sản phẩm không chọn.
- **Trình duyệt:**
  - chọn, bỏ chọn, chọn tất cả, bỏ chọn tất cả đều chạy;
  - chọn mật ong và gạo (2 HTX) thì cổng thanh toán gộp 351.000đ cho 2 đơn;
  - giỏ còn lại chè và mận;
  - màn 320px không cuộn ngang;
  - Luồng 1 và Luồng 2 vẫn đạt; kiểm tra giao diện tự động không có lỗi.

---

## Sau Giai đoạn 6 – Bấm chọn mã ưu đãi

**Lỗi chủ repo báo:** không bấm chọn được mã ưu đãi, phải nhập mã bằng tay.

**Nguyên nhân:** mã chưa đủ điều kiện bị khoá hẳn (`disabled`), nên bấm vào không có phản hồi gì. Ví dụ: đơn chưa đủ 300.000đ, không có hàng Chế biến, hay khách không đặt lần đầu. Còn nhập tay thì có thông báo. Ngoài ra, khi đã chọn được mã, bước 2 cũng không hiện mã đang dùng và số tiền giảm.

**Đã sửa ở bước 2 "Ưu đãi & thanh toán":**

- **Mã dùng được:** bấm vào là áp dụng ngay, có thông báo "Đã áp dụng mã … : giảm …". Bấm lần nữa thì bỏ mã.
- **Mã chưa đủ điều kiện:** vẫn không chọn được (BR-KM). Bấm vào thì báo lý do, vd. "Cần thêm 125.000đ tiền hàng hợp lệ". Dòng lý do trên thẻ ghi "Chưa dùng được: …".
- **Khung mã đang áp dụng:** hiện ở đầu mục, gồm mã, số tiền giảm và nút "Bỏ mã". Nếu giỏ thay đổi làm mã hết hiệu lực, khung báo lý do.
- **Nhập tay:** vẫn dùng được, có thể bấm Enter. Không phân biệt chữ hoa, chữ thường.

**Kiểm tra trên trình duyệt** (cỡ điện thoại, thao tác chạm):

- bấm mã chưa đủ điều kiện thì thấy lý do;
- bấm, bỏ và nhập tay mã đều chạy;
- bước 3 có dòng "Đã giảm"; tiền ở cổng thanh toán đã trừ đúng: 175.000 + 28.000 − 17.500 = 185.500đ;
- kiểm tra giao diện tự động không có lỗi.

---

## Sau Giai đoạn 6 – Sửa lỗi chọn địa chỉ giao hàng

Chủ repo báo lỗi khi chọn địa chỉ giao hàng tại Hà Nội. Thử lại trên trình duyệt thấy 3 lỗi, đã sửa cả 3:

| Lỗi | Cách sửa |
|---|---|
| Khách chưa có địa chỉ (vd. vừa đăng ký) vào bước đặt hàng thì ô địa chỉ trống, nút "Tiếp tục" bị khoá, không thêm được địa chỉ tại đó | Bước đặt hàng hiện khung "Bạn chưa có địa chỉ giao hàng" kèm nút "Thêm địa chỉ giao hàng"; khi đã có địa chỉ thì có nút "Thêm địa chỉ mới". Lưu xong tự quay lại bước đặt hàng, chọn sẵn địa chỉ vừa thêm |
| Bấm vào một địa chỉ trong sổ địa chỉ không đổi được địa chỉ giao; phải tìm nút "Đặt mặc định" | Bấm vào địa chỉ nào là chọn giao tới địa chỉ đó: địa chỉ thành mặc định, thanh "Giao tới" cập nhật, sổ địa chỉ đóng lại. Địa chỉ đang chọn có dấu tích và nhãn "Đang giao tới" |
| Chưa chọn địa chỉ thì dòng hoả tốc hiện "(Infinity km)" và báo "Địa chỉ nằm ngoài vùng giao hoả tốc" | Không hiện khoảng cách khi chưa có địa chỉ; lý do ghi "Chưa chọn địa chỉ giao hàng." |

- **Kiểm tra trên trình duyệt:**
  - khách mới thêm địa chỉ ngay tại bước đặt hàng rồi đặt được đơn;
  - thêm địa chỉ thứ 2 từ bước đặt hàng thì địa chỉ đó được chọn sẵn;
  - chọn địa chỉ trong sổ địa chỉ thì thanh "Giao tới" đổi theo;
  - sửa, xoá địa chỉ vẫn chạy;
  - đổi địa chỉ ở bước đặt hàng thì đơn giao tới đúng địa chỉ đã chọn;
  - kiểm tra giao diện tự động không có lỗi.
- **Test mới:** `pricing.test.ts`, ca chưa chọn địa chỉ.

---

## Sau Giai đoạn 6 – Số điện thoại nhập 9 số

Theo yêu cầu của chủ repo, mọi ô nhập SĐT nhận cả 3 dạng:

| Dạng nhập | Ví dụ |
|---|---|
| 9 chữ số, bỏ số 0 đầu | `912345678` |
| 10 chữ số, có số 0 đầu | `0912345678` |
| Có mã nước | `+84 912 345 678` |

- **Áp dụng ở:** đăng nhập, đăng ký, Admin cấp tài khoản, sổ địa chỉ, người nhận quà, sửa người nhận quà.
- **Lưu thống nhất:** app luôn lưu, so khớp và hiển thị dạng 10 số bắt đầu bằng 0. Vì vậy cùng một số nhập theo dạng nào cũng ra cùng một tài khoản, và không đăng ký trùng được bằng dạng khác.
- **Gợi ý và báo lỗi:** ô nhập có dòng gợi ý; nhập sai thì báo "Nhập 9 chữ số (vd. 912 345 678), có thể thêm số 0 hoặc +84 ở đầu."
- **Mã nguồn:** `src/domain/phone.ts`; test `src/domain/__tests__/phone.test.ts` (19 test).
- **Kiểm tra trên trình duyệt:**
  - đăng nhập bằng `900000001` và `+84 900 000 002` ra đúng tài khoản;
  - nhập 8 số thì báo lỗi;
  - lưu địa chỉ với `912 345 678` thì số được lưu là `0912345678`;
  - kiểm tra giao diện tự động không có lỗi.

---

## Giai đoạn 6 – Giao diện

### Bảng màu (mục 10.1)

- **Token trong theme Tailwind** (`@theme` trong `src/index.css`). Nhóm đổi màu ở đây thì mọi màn đổi theo.

  | Token | Giá trị |
  |---|---|
  | `forest-800` (xanh rừng) | `#1F4D3A` |
  | `champagne-400` (vàng champagne) | `#C9A96E` |
  | `ivory` (trắng ngà) | `#FAF7F0` |
  | `ink` (chữ chính) | `#1C1B18` |
  | `muted` (chữ phụ) | `#6B655F` |

  - Hai màu xanh rừng và champagne có đủ dải 50–950, tính sẵn để chữ và nền đạt AA.
  - `stone-500` của Tailwind chỉ đạt 4,4:1 trên nền trắng ngà, nên chữ phụ dùng token `muted` đạt AA.
- **Áp dụng:**
  - nút chính, thanh trên cùng, thẻ đầu màn HTX / Admin / QLNN dùng xanh rừng;
  - nhãn đặt trước, cảnh báo, dải demo dùng champagne;
  - nền trang trắng ngà, chữ chính `ink`.
- **Đã bỏ:**
  - toàn bộ lớp màu `emerald` / `amber` / `orange` cũ. Nhãn trạng thái "Trả hàng – hoàn tiền" và "Đang chuyển hoàn" đổi từ cam sang hồng đất;
  - chữ "Gian Hàng Chính Hãng" ở tiêu đề trang, nay là "Đặc Sản Số Lào Cai – Bản demo".
- **Không có:** màu `#EE4D2D`, logo, icon hay bố cục đặc trưng của Shopee.

### Cỡ chữ (mục 10.2)

- Không còn chữ 10–11px: nhãn "Mô phỏng" và các chữ 10px trong file tạm ẩn `ShipperScreen.tsx` đổi lên 12px.
- Các câu giải thích, lưu ý (điều kiện mã ưu đãi, thời hạn thanh toán, lý do không có COD hay hoả tốc, quy định đánh giá, khiếu nại, tài khoản hoàn…) đổi từ 12px lên 14px. 12px chỉ còn dùng cho nhãn phụ.
- Ô nhập dùng chữ 16px trên điện thoại (14px từ màn `md`). Nhờ đó iOS không tự phóng to khi bấm vào ô, nay đã cho phép phóng to.

### Cho phép thao tác (mục 10.3)

- Thẻ viewport bỏ `maximum-scale=1.0, user-scalable=no`; người dùng phóng to được.
- Không còn `select-none` hay `user-select: none`, nên copy được mã đơn.

### Trợ năng (mục 10.4)

- **Nút chỉ có icon** đều có `aria-label`. Bảng thêm tên ẩn "Thao tác" cho cột nút.
- **Bottom sheet** có `aria-labelledby` trỏ vào tiêu đề.
- **Vùng bấm tối thiểu 44×44**, đã nâng các chỗ còn thiếu:
  - chip lọc, nút "+" thêm vào giỏ, nút tăng giảm số lượng;
  - nút sửa / xoá địa chỉ, nút "Xem nguồn gốc", nút xoá ảnh;
  - mọi ô nhập và ô chọn.
- **Kiểm tra bằng axe-core 4.10** (các quy tắc color-contrast, button-name, link-name, label, select-name, image-alt, aria-dialog-name, nested-interactive) và một script đo kích thước vùng bấm, cỡ chữ.
  - Chạy trên mọi màn của 5 nhóm Admin, Khách, HTX, QLNN, Công cụ demo; cả ở màn 390px và 1280px.
  - Chạy cả trong Luồng 1 (sheet HTX có nút thao tác, cổng thanh toán, ĐVVC, ticket, hoàn tiền, QLNN).
  - Kết quả: không còn lỗi.

### Bố cục (mục 10.5)

- **Bottom sheet:** mọi sheet dùng chung `BottomSheet`, rộng tối đa 640px. Có test kiểm tra không có hộp thoại nào khác.
- **Trạng thái rỗng:** các danh sách còn thiếu đã có: tài khoản (Vận hành, Quản trị gốc), mã ưu đãi, hồ sơ HTX, phường/xã, hộp quà, yêu cầu đã duyệt, bảng đơn của QLNN.
- **Trạng thái lỗi:**
  - **Khi có lỗi lúc hiển thị:** mỗi tab của Khách, HTX, Admin, mỗi sheet, và cả màn theo vai trò đều bọc trong `ListBoundary`. Có lỗi (dữ liệu trên trình duyệt hỏng, không tải được mã của màn) thì chỉ phần đó hiện khung lỗi, có nút "Thử lại", "Tải lại trang" và hướng dẫn khôi phục dữ liệu mẫu. Thanh điều hướng vẫn dùng được. Khi dữ liệu đổi (vd. vừa khôi phục), danh sách tự thử lại.
  - **Khi không có quyền xem:** danh sách đọc qua kiểm tra quyền (đơn của khách, của HTX, của Admin; ticket của HTX; nhật ký; bảng QLNN) hiện lý do bị từ chối thay vì âm thầm hiện rỗng.
  - **Kiểm thử:** làm hỏng dữ liệu đơn trong `localStorage`, rồi mở tab Đơn hàng: tab báo lỗi, thanh dưới vẫn dùng được, khôi phục dữ liệu mẫu thì danh sách hiện lại.
- **Độ rộng:** Khách và HTX giữ bố cục điện thoại, rộng tối đa 640px. Màn 320px không cuộn ngang.
- **Admin và QLNN dạng bảng** (`AdminTable`), cuộn ngang trong khung nếu màn hẹp. Đã chuyển từ dạng thẻ sang bảng:
  - Mô phỏng ĐVVC;
  - Hồ sơ HTX & quyền bán;
  - Kiểm duyệt đánh giá;
  - Duyệt sản phẩm & giá (bảng chờ duyệt và bảng đã xử lý);
  - Danh mục dùng chung (phường/xã, hộp quà, bậc phụ phí);
  - Ticket khiếu nại: bảng ticket, chọn một dòng thì phần chi tiết và xử lý hiện ngay dưới bảng.

### Kiểm thử Giai đoạn 6

- **Unit test mới `src/components/__tests__/ui.test.ts`** (5 test), đọc mã nguồn để kiểm tra:
  - token màu có trong theme;
  - không còn `#EE4D2D`, "Chính hãng", lớp màu cũ;
  - không có chữ dưới 12px;
  - viewport cho phóng to, không `select-none`;
  - chỉ `BottomSheet` có `role="dialog"`.
- **Trình duyệt:**
  - kiểm tra giao diện tự động như trên;
  - Luồng 1 và Luồng 2 đạt như Giai đoạn 5;
  - dải demo hiện ở mọi vai trò;
  - thử trạng thái lỗi.

### Còn tồn tại sau Giai đoạn 6

- **Màu nhãn trạng thái đơn** (xanh lam, tím, xanh lá mạ…) vẫn dùng màu Tailwind để phân biệt nhiều trạng thái. Chúng không thuộc bảng nhận diện; nhóm có thể chốt bảng màu trạng thái riêng.
- **Chưa kiểm tra bằng trình đọc màn hình thật** (VoiceOver, TalkBack). Mới kiểm tra tự động bằng axe-core.
- **Chưa có giao diện tối** (dark mode); yêu cầu không nêu.

---

## Giai đoạn 5 – Nội dung và dữ liệu mẫu

### Gỡ nội dung (mục 9.1)

Quét toàn bộ `src/` (kể cả file tạm ẩn `_pending-OI-01`). Phần lớn nội dung cấm đã không còn từ Giai đoạn 1–2, khi bản `index.html` cũ được chuyển vào `legacy/` (không build, không deploy).

| Nội dung | Tình trạng |
|---|---|
| "CQQLNN bảo chứng / tài trợ", "Đã xác thực chữ ký số CQQLNN" | **Đã làm** – không còn trong `src/` |
| "GS1/EPCIS Blockchain", "OCOP 5 Sao Quốc Gia", "Quỹ xúc tiến thương mại tỉnh hỗ trợ" | **Đã làm** – không còn. Nhãn `certLabel` ("OCOP 5 Sao (HTX khai…)", "VietGAP…") bị xoá khỏi kiểu dữ liệu, dữ liệu mẫu và trang nguồn gốc |
| Nút "Xác nhận đạt chuẩn xuất xưởng" phía khách | **Đã làm** – không còn |
| Đồng hồ "Giá mùa vụ ưu đãi" | **Đã làm** – không còn |
| "Đã bán 2.8k", điểm đánh giá bịa | **Đã làm** – điểm đánh giá chỉ tính từ đánh giá thật trong dữ liệu; chưa có thì ghi "Chưa có đánh giá" |
| Tên nông hộ, GPS, độ cao, máy in Bluetooth, biển số xe, tên nhà xe | **Đã làm** – bỏ tên shipper "Trần Văn Mạnh" còn sót trong `ShipperScreen.tsx` (file tạm ẩn chờ OI-01) |
| Cảnh báo thời tiết đèo Khau Phạ, nhiệt độ cảm biến | **Đã làm** – không còn |
| "Hoả tốc 2H", "giao kịp bữa tối" | **Đã làm** – không còn. Thời gian và phí giao hiện theo tham số (PAR-08, PAR-21, FEE-01, FEE-02) và loại đơn |
| Ảnh Unsplash | **Đã làm** – bỏ hết, thay bằng ảnh giữ chỗ SVG tự sinh |

`src/data/__tests__/seed.test.ts` quét mọi file `.ts`, `.tsx`, `.css`, `.md` trong `src/` và báo lỗi nếu các cụm trên quay lại.

### Dải "Bản demo" (mục 9.2)

- Câu "Bản demo – dữ liệu mẫu. Thanh toán, giao hàng và OTP là mô phỏng." nằm ở dòng đầu của header cố định (`src/components/DemoBand.tsx`). Header hiện ở mọi màn: đăng nhập, khách, HTX, Admin, QLNN.
- Khi mở bottom sheet, dải được lặp lại ở mép trên lớp phủ, nên không bị che. Sheet chừa chỗ cho dải.
- Header cao lên (dải xuống 2 dòng trên điện thoại hẹp). App đo chiều cao header để thanh "Giao tới / Giỏ hàng" của khách dính ngay dưới header. Trước đây thanh này bị header che khi cuộn.

### Danh mục mẫu (mục 9.3)

9 sản phẩm theo bảng của nhóm. Trang chi tiết có khung **"Dữ liệu mẫu – chờ HTX xác nhận"**, ghi khoảng giá nhóm khảo sát hoặc "giá mẫu". Không sản phẩm nào có mã chứng nhận.

| Sản phẩm | Loại đơn | Nhóm hàng | Vùng | HTX mẫu | Giá mẫu | Quy đổi | Khoảng nhóm khảo sát |
|---|---|---|---|---|---|---|---|
| Chè Shan tuyết (gói 100 g) | Mua sẵn | Hàng khô | Suối Giàng, Bản Liền | HTX mẫu Suối Giàng | 80.000đ | 800.000đ/kg | 400.000–1.500.000đ/kg |
| Thảo quả khô (gói 200 g) | Mua sẵn | Hàng khô | Sa Pa, Bát Xát | HTX mẫu Sa Pa | 70.000đ | 350.000đ/kg | 250.000–450.000đ/kg |
| Mứt / ô mai mận tam hoa (hộp 300 g) | Mua sẵn | Chế biến | Bắc Hà | HTX mẫu Bắc Hà | 135.000đ | 450.000đ/kg | 350.000–550.000đ/kg |
| Mật ong Thanh Xuân (chai 500 ml) | Mua sẵn | Chế biến | Bảo Hà | HTX mẫu Bảo Hà | 175.000đ | 350.000đ/lít | 250.000–450.000đ/lít |
| Gạo Séng Cù (túi 2 kg) | Mua sẵn | Hàng khô | Mường Khương, Bát Xát | HTX mẫu Mường Khương | 120.000đ | 60.000đ/kg | 45.000–70.000đ/kg |
| Phở hồng Bắc Hà (gói 500 g) | Mua sẵn | Chế biến | Bắc Hà | HTX mẫu Bắc Hà | 65.000đ | 130.000đ/kg | khoảng 130.000đ/kg |
| Mận tam hoa tươi (thùng 3 kg) | Đặt trước | Nông sản tươi | Bắc Hà | HTX mẫu Bắc Hà | 210.000đ | 70.000đ/kg | 50.000–90.000đ/kg |
| Cốm Tú Lệ (gói 500 g, quy cách mẫu) | Đặt trước | Chế biến | Tú Lệ | HTX mẫu Tú Lệ | 110.000đ – **giá mẫu** | – | chưa có giá |
| Bưởi Đại Minh (thùng 5 kg, quy cách mẫu) | Đặt trước | Nông sản tươi | Vùng hồ Thác Bà | HTX mẫu Thác Bà | 200.000đ – **giá mẫu** | – | chưa có giá |

Ghi chú bắt buộc trong bảng của nhóm:

- **Chè Shan tuyết:** tên sản phẩm không kèm tên chỉ dẫn địa lý, không có logo OCOP.
- **Thảo quả:** không có chữ "thảo quả rừng".
- **Mật ong:** không có chữ "mật bản địa".
- **Gạo:** không có chữ "Séng cù xanh".
- **Mận tam hoa tươi:**
  - mô tả ghi "đóng thùng 3 kg chống dập" và "mùa bán tháng 5–7";
  - khoảng ngày giao mẫu 01/05/2027 – 30/06/2027, ghi "(mẫu, chờ HTX xác nhận)".
- **Cốm Tú Lệ:**
  - mô tả ghi "do người Thái ở Tú Lệ làm";
  - giá ghi "giá mẫu";
  - khoảng ngày giao lấy từ cấu hình: từ hôm nay + PAR-08, dài 4 tuần. Ghi "(mẫu, chờ HTX xác nhận)".
- **Bưởi Đại Minh:** giá ghi "giá mẫu". Trang chi tiết và trang nguồn gốc ghi "OCOP 4 sao năm 2025 (theo hồ sơ nhóm, chờ xác minh)". Đây là sản phẩm duy nhất có nhắc OCOP.
- **Không đưa vào:** mật ong hoa bạc hà, đào Sa Pa, cá hồi, cá tầm, thịt gác bếp, rượu. Các sản phẩm cá hồi, đào Sa Pa của dữ liệu cũ đã bị xoá.

Dữ liệu đi kèm cũng đổi theo:

- **HTX:** 7 HTX mẫu, mỗi vùng một HTX; tài khoản nhận chi trả che dạng `**** 0101` … `**** 0107`.
- **Tài khoản HTX:** cũ có 4, nay có 7 (xem bảng tài khoản demo).
- **Đơn mẫu:**
  - Khách 2 mua 2 túi gạo, trả COD, đơn đã giao;
  - Khách 1 mua 1 hộp mứt mận, thanh toán mô phỏng thành công, đơn chờ HTX Bắc Hà xác nhận.
- **Mã ưu đãi:** giữ nguyên 4 mã. CHEBIEN10 áp cho nhóm Chế biến (mứt mận, mật ong, phở hồng, cốm).
- **Bộ lọc vùng:** sản phẩm ghi nhiều địa danh (vd. "Sa Pa, Bát Xát") hiện ở từng địa danh. Chọn "Bát Xát" thấy cả thảo quả và gạo.
- **Phiên bản dữ liệu `localStorage`:** tăng lên 4. Trình duyệt còn dữ liệu cũ sẽ tự nạp lại danh mục mới.

### Ảnh giữ chỗ (mục 9.4)

`src/components/ProductImage.tsx` tự vẽ ảnh SVG. Ảnh có dải núi làm nền và mang màu theo nhóm hàng:

| Nhóm hàng | Màu |
|---|---|
| Hàng khô | Nâu |
| Chế biến | Đỏ mận |
| Nông sản tươi | Xanh rừng |

Nội dung ảnh theo kích thước:

| Kích thước | Nội dung |
|---|---|
| Thẻ sản phẩm | Tên sản phẩm |
| Ảnh lớn ở trang chi tiết | Tên sản phẩm và dòng "Ảnh giữ chỗ – chờ HTX cung cấp ảnh" |
| Ảnh nhỏ (giỏ hàng, vụ mùa, danh sách HTX) | Hình lá / hũ / quả theo nhóm hàng, vì chữ ở cỡ đó quá nhỏ để đọc. Tên sản phẩm luôn hiện ngay bên cạnh và có trong `aria-label` |

Ảnh do HTX tự tải lên (nếu có) vẫn được ưu tiên hiện.

> Cập nhật sau Giai đoạn 6: theo yêu cầu của chủ repo, ảnh giữ chỗ ghi tên đã được thay bằng tranh minh hoạ vẽ bằng SVG. Đây vẫn không phải ảnh chụp, và trang chi tiết có nhãn "Ảnh minh hoạ". Xem mục "Tranh minh hoạ sản phẩm và giao diện cao cấp".

### Số điện thoại và tài khoản (mục 9.5)

- **Số điện thoại:** mọi SĐT dạng `0900 000 xxx`. Không có hotline 1900.
- **Tài khoản:**
  - tài khoản nhận hoàn của khách là số mẫu `000000000001` và chỉ hiện dạng che;
  - tài khoản HTX hiện dạng `**** 01xx`.
- **Test:** kiểm tra mọi SĐT trong dữ liệu mẫu khớp `0900000xxx`.

### Kiểm thử Giai đoạn 5

- **Unit test mới `src/data/__tests__/seed.test.ts`** (32 test):
  - đúng 9 sản phẩm, đúng loại đơn và nhóm hàng;
  - giá mẫu quy đổi ra đ/kg (đ/lít) nằm trong khoảng nhóm khảo sát;
  - Cốm và Bưởi là "giá mẫu";
  - không ảnh ngoài, không mã chứng nhận;
  - chỉ Bưởi có OCOP, kèm "chờ xác minh";
  - không có cụm từ hay sản phẩm bị loại;
  - khoảng ngày giao mận 05–06/2027; cốm lấy mốc từ PAR-08;
  - mỗi sản phẩm thuộc một "HTX mẫu …" có tài khoản;
  - SĐT giả, tài khoản che;
  - quét `src/` không còn nội dung cấm.
- **Trình duyệt** (Playwright, chặn mọi request ngoài localhost; không có request nào bị chặn):
  - dải demo hiện ở màn đăng nhập, khách, HTX, Admin, QLNN và trong bottom sheet;
  - màn 320px không cuộn ngang;
  - trang chi tiết Bưởi, Chè, Cốm hiện đúng khung dữ liệu mẫu;
  - trang nguồn gốc Bưởi không còn dòng chứng nhận mẫu.
- **Luồng 1 trên danh mục mới:**
  - Khách 1 đặt mứt mận (mua sẵn, hộp quà gửi người khác) và mận tươi (đặt trước); nút ghi "trả ngay 241.000đ";
  - HTX mẫu Bắc Hà xử lý 2 đơn; ĐVVC mô phỏng giao; khách nhận, đánh giá, khiếu nại kèm ảnh;
  - CSKH duyệt hoàn; Tài chính hoàn mô phỏng;
  - QLNN thấy "Tổng số đơn" từ 2 lên 4 và "Giá trị hàng đã giao" từ 240.000đ lên 450.000đ. Đơn mứt mận đang trả hàng – hoàn tiền nên không tính.
- **Luồng 2:**
  - Khách 2 mua ngay 1 gói chè, không trả: tồn còn đặt được từ 30 xuống 29;
  - tua 15 phút: đơn tự huỷ, tồn về 30.

### Còn tồn tại sau Giai đoạn 5

- **Danh mục phường/xã giao hàng và loại hộp quà** vẫn là danh sách mẫu. Phường/xã có ghi "(mẫu)"; chờ nhóm nạp danh mục chính thức.
- **Mô tả sản phẩm** chỉ ghi điều có trong bảng của nhóm; các thông tin khác ghi "chờ HTX xác nhận". **Quy cách của Cốm Tú Lệ và Bưởi Đại Minh** là quy cách mẫu.
- **Thư mục `legacy/`** vẫn giữ bản `index.html` cũ, có các nội dung bị gỡ, để nhóm đối chiếu. Thư mục này không được build hay deploy. Nhóm có thể xoá khi không cần nữa.
- **Màu sắc, cỡ chữ, trợ năng:** làm ở Giai đoạn 6 (đã làm).

## Giai đoạn 4 – Chức năng mức Must theo vai trò

### Tình trạng từng FR

Quy ước tình trạng:
- **Đã làm:** chức năng chạy thật trên dữ liệu demo.
- **Mô phỏng:** có màn hình và luồng đầy đủ, nhưng phần bên ngoài (OTP, cổng thanh toán, ngân hàng, ĐVVC) là giả lập, có nhãn "Mô phỏng".
- **Chưa làm:** kèm lý do.

**Khách hàng**

| FR | Nội dung | Tình trạng | Ghi chú |
|---|---|---|---|
| TK-01 | Đăng ký | Mô phỏng | SĐT + OTP mô phỏng `123456` |
| TK-02 | Đăng nhập | Mô phỏng | SĐT + OTP mô phỏng; có danh sách tài khoản demo |
| TK-03 | Thông tin cá nhân | Đã làm | Sửa họ tên; khai / đổi tài khoản nhận hoàn (hiện dạng che). SĐT là tên đăng nhập, không đổi tại đây |
| TK-04 | Sổ địa chỉ | Đã làm | Tối đa 10, mặc định, sửa, xoá; phường/xã theo danh mục |
| TKSP-01 | Danh mục | Đã làm | Lọc theo nhóm hàng |
| TKSP-02 | Tìm kiếm | Đã làm | Không phân biệt dấu, hoa/thường |
| TKSP-03 | Lọc | Đã làm | Vùng (sinh từ dữ liệu), nhóm hàng; màn rỗng có nút xoá lọc |
| TKSP-04 | Chi tiết sản phẩm | Đã làm | Kèm điểm đánh giá, đánh giá công khai, chứng nhận đã xác minh, nguồn gốc |
| TKSP-05 | Chia sẻ link | Đã làm | Link `#/san-pham/<mã>`. Dùng chia sẻ của thiết bị nếu có, không thì sao chép link. Mở link khi chưa đăng nhập thì mở sản phẩm sau khi đăng nhập |
| MHTT-01 | Giỏ hàng 2 nhóm | Đã làm | |
| MHTT-02 | Đặt mua sẵn | Đã làm | |
| MHTT-03 | Đặt trước | Đã làm | |
| MHTT-04 | Hộp quà | Đã làm | |
| MHTT-05 | Thanh toán | Mô phỏng | Cổng thanh toán mô phỏng |
| MHTT-07 | Trả phần còn lại | Mô phỏng | Trả qua cổng mô phỏng hoặc đổi sang COD 1 lần |
| DH-01 | Danh sách đơn theo tab trạng thái | Đã làm | |
| DH-02 | Đổi người nhận và địa chỉ trước khi bàn giao | Đã làm | Kèm đổi ngày giao D 1 lần (BR-DAT-08) và sửa lời nhắn, người nhận quà trước Đang chuẩn bị (BR-DAT-09) |
| DH-03 | Huỷ đơn | Đã làm | Huỷ ngay hoặc gửi yêu cầu theo trạng thái |
| DH-04 | Yêu cầu trả hàng | Đã làm | |
| DH-13 | Chi tiết đơn kèm lịch sử trạng thái | Đã làm | |
| DH-15 | Xác nhận đã nhận hàng | Đã làm | |
| CSKH-01 | Gửi ticket | Đã làm | Ảnh thu nhỏ, chỉ lưu trên trình duyệt |
| CSKH-04 | Đánh giá | Đã làm | 1–5 sao; 1–2 sao cần ≥ 20 ký tự; ≤ 500 ký tự; ≤ 5 ảnh; mỗi sản phẩm / đơn 1 lần |
| CSKH-10 | Thông báo | Đã làm | |

**HTX**

| FR | Nội dung | Tình trạng | Ghi chú |
|---|---|---|---|
| TK-06/07 | Hồ sơ HTX, gửi duyệt, theo dõi kết quả | Đã làm | Trong lúc chờ duyệt vẫn hiện hồ sơ cũ |
| SP-02..06 | Tạo, sửa, ẩn sản phẩm, gửi duyệt | Đã làm | Tạo mới và sửa nội dung → Chờ duyệt; ẩn / hiện có hiệu lực ngay |
| SP-07 | Tồn kho và giá | Đã làm | Tồn kho có hiệu lực ngay; giá chờ duyệt |
| SP-08 | Chứng nhận | Đã làm | Khai kèm ảnh → Admin – Chất lượng xác minh; chỉ chứng nhận đã xác minh mới hiện cho khách |
| SP-09 | Cấu hình đặt trước và hoả tốc | Đã làm | Báo thu hoạch / mở đặt trước và cờ hoả tốc đều chờ duyệt |
| DH-07 | Danh sách đơn | Đã làm | |
| DH-08 | Xác nhận / từ chối đơn | Đã làm | |
| DH-09 | Đóng gói, bàn giao | Đã làm | Phiếu đóng gói; quà gửi người khác không in giá |
| DH-10 | Xử lý trả hàng, nhận hàng hoàn | Đã làm | HTX đề xuất hoàn / không hoàn; CSKH quyết định |
| DH-16 | Xử lý yêu cầu huỷ | Đã làm | |
| DH-17 | Báo sẵn sàng / không cung cấp được | Đã làm | |
| CSKH-05/08 | Phản hồi ticket và đánh giá | Đã làm | Không sửa, không xoá đánh giá |
| DT-01..03 | Doanh thu và đối soát | Đã làm | |

**Admin**

| Nhóm | FR | Nội dung | Tình trạng | Ghi chú |
|---|---|---|---|---|
| Vận hành | TK-10/12 | Cấp, khoá tài khoản | Đã làm | Không tự khoá chính mình; khoá phải ghi lý do; phiên đang mở bị đăng xuất |
| Vận hành | HT-02 | Tham số | Đã làm | Sửa kèm lý do, lưu lịch sử, chỉ áp cho đơn mới; có cột Tình trạng |
| Vận hành | HT-04 | Danh mục dùng chung | Đã làm | Phường/xã (có khoảng cách mẫu), 2–3 loại hộp quà, bậc phụ phí hoả tốc |
| Vận hành | – | Mô phỏng ĐVVC | Mô phỏng | Chờ OI-01 |
| Chất lượng | TK-08/09 | Duyệt hồ sơ HTX | Đã làm | |
| Chất lượng | SP-04 | Duyệt sản phẩm và giá | Đã làm | Sản phẩm mới, nội dung, giá, báo thu hoạch, hoả tốc, chứng nhận |
| Chất lượng | TK-13 | Kích hoạt / tạm khoá quyền bán | Đã làm | Khoá phải ghi lý do; sản phẩm hiện "Tạm ngừng bán", không đặt được |
| CSKH | CSKH-07..09 | Ticket | Đã làm | |
| CSKH | CSKH-06 | Kiểm duyệt đánh giá | Đã làm | Ẩn phải chọn lý do trong danh sách; không có lý do "sao thấp" |
| CSKH | DH-11 | Duyệt trả hàng | Đã làm | |
| Tài chính | DH-12 | Ghi nhận hoàn tiền | Mô phỏng | Ngân hàng mô phỏng |
| Tài chính | DT-02..03 | Đối soát, chốt kỳ | Đã làm | |
| Tài chính | DT-04 | Chi trả | Mô phỏng | Chi trả mô phỏng |
| Quản trị gốc | TK-11 | Phân quyền | Đã làm | |
| Quản trị gốc | HT-03 | Nhật ký | Đã làm | |
| (Vận hành) | HT-01 | Mã ưu đãi | Đã làm | Tạo mã theo mức chi tối thiểu, nhóm hàng, HTX, khách lần đầu, hạn, số lượt; bật / tắt mã |
| Mọi nhóm | BCTK-01 | Dashboard | Đã làm | Tính từ store; có nút xuất CSV |

**Cơ quan QLNN**

| FR | Nội dung | Tình trạng | Ghi chú |
|---|---|---|---|
| BCTK-01 | Dashboard tổng hợp | Đã làm | |
| BCTK-02, 03 | Xuất báo cáo | Đã làm | CSV tổng hợp và CSV đơn ẩn danh; không có dữ liệu cá nhân |

### Thay đổi khác

- **Tách mã theo vai trò** (lazy load). Màn HTX, Admin, QLNN chỉ tải khi đăng nhập vai trò đó. Bản build không còn cảnh báo vượt 500 kB, và khách trên điện thoại tải ít hơn.
- **Sửa câu thông báo** khi trả phần còn lại của đơn đặt trước (trước đây báo nhầm "Chờ xác nhận").

### Kiểm thử Giai đoạn 4

- **Unit test** `phase4.test.ts` (9 test):
  - T19 và các quy tắc đánh giá;
  - cấp / khoá tài khoản, phân quyền;
  - hồ sơ HTX, khoá quyền bán;
  - sản phẩm mới chờ duyệt, ẩn sản phẩm;
  - tham số áp cho đơn mới (BR-DAT-06);
  - hộp quà 2–3 loại; tạo, tắt mã ưu đãi;
  - đổi ngày giao 1 lần, đổi địa chỉ;
  - xuất báo cáo không có dữ liệu cá nhân.
- **Trình duyệt:** chạy từng chức năng ở trên cho đủ các vai trò, và chạy trọn **Luồng 1** của mục 11.2:
  1. Khách 1 đặt mật ong (mua sẵn, hộp quà gửi người khác nên COD bị khoá) và mận (đặt trước, tick điều kiện huỷ). Nút ghi "trả ngay 359.000đ"; thanh toán thành công.
  2. HTX mẫu Bắc Hà thấy đúng 2 đơn. Phiếu đóng gói của đơn quà không in giá. HTX xác nhận và bàn giao đơn mua sẵn; với đơn đặt trước thì báo sẵn sàng → khách trả phần còn lại → HTX bàn giao.
  3. Admin – Vận hành mô phỏng ĐVVC giao thành công.
  4. Khách bấm Đã nhận, đánh giá 4 sao, gửi khiếu nại kèm ảnh và yêu cầu hoàn.
  5. Admin – CSKH kết luận và duyệt hoàn.
  6. Admin – Tài chính: Bắt đầu hoàn → ngân hàng mô phỏng xác nhận.
  7. QLNN thấy "Tổng số đơn 4", "Giá trị hàng đã giao 475.000đ" (gạo 390.000đ + mận 85.000đ; đơn mật ong đang Trả hàng – hoàn tiền nên không tính).
- **Luồng 2:** đã đạt từ Giai đoạn 2.

### Còn tồn tại sau Giai đoạn 4

- **HTX chưa đổi được tài khoản nhận chi trả trên giao diện.** Đây là dữ liệu nhạy cảm nên cần quy trình riêng, hiện vẫn hiện dạng che `**** 01xx`. Chờ nhóm quyết định.
- **Chưa có:** đổi SĐT đăng nhập; quên / khoá đăng nhập do nhập sai OTP nhiều lần. SRS trích trong yêu cầu không nêu chi tiết.
- **Nội dung, ảnh, danh mục sản phẩm vẫn là bộ cũ** (đã thay ở Giai đoạn 5). **Màu sắc, cỡ chữ, trợ năng:** Giai đoạn 6.

---

## Giai đoạn 3 – Dữ liệu dùng chung và đăng nhập

### Đăng nhập và phân quyền (mục 5.9)

- **Đăng nhập bằng SĐT + OTP.**
  - Màn hình ghi rõ "OTP mô phỏng", mã luôn là `123456`, có nút "Điền OTP mô phỏng".
  - Có danh sách tài khoản demo để bấm nhanh: bấm một tài khoản thì điền sẵn SĐT, rồi nhập OTP.
  - Sai OTP, SĐT chưa có tài khoản, tài khoản đang khoá đều bị chặn kèm lý do.
- **Khách hàng mới đăng ký được** bằng họ tên + SĐT + OTP mô phỏng (FR-TK-01). Tài khoản HTX, Admin, QLNN do Admin cấp (làm ở Giai đoạn 4).
- **Đã bỏ thanh chuyển vai trò công khai,** ô chọn HTX và ô chọn nhóm quyền Admin. Vai trò, HTX và nhóm quyền lấy từ tài khoản đăng nhập. Đổi vai trò bằng nút "Đăng xuất" rồi đăng nhập tài khoản khác.
- **Đã bỏ màn đăng nhập cũ của `src/App.tsx`:** mật khẩu, Face ID, "Silent Push khoá phiên", hotline 1900. Thẻ "Khoá phiên tức thời (thử nghiệm)" ở Tham số cũng đã bỏ. Khoá tài khoản thật làm ở Giai đoạn 4 (FR-TK-10/12).
- **Phiên đăng nhập lưu theo từng tab** (`sessionStorage`), dữ liệu lưu chung (`localStorage`).
  - Hai tab cùng trình duyệt đăng nhập được hai vai trò khác nhau và thấy cùng một dữ liệu.
  - Tab còn lại cập nhật ngay qua sự kiện `storage` và khi tải lại trang.
- **Kiểm quyền đọc trong hàm domain** (`src/domain/access.ts`), các màn đều đọc qua đây:
  - `listOrdersFor`, `getOrderFor`: khách chỉ thấy đơn của mình; HTX chỉ thấy đơn của HTX mình; QLNN không xem được chi tiết đơn.
  - `listTicketsFor`: HTX chỉ thấy ticket của HTX mình.
  - `regulatorOrderRows`: dòng đơn ẩn danh cho QLNN (không tên, SĐT, địa chỉ, tài khoản).
  - `readAuditLogs`: chỉ Quản trị gốc xem nhật ký; QLNN không xem được.
  - `viewRefundAccount`: tài khoản ngân hàng của khách hiện dạng che `**** 0001`; chỉ Admin – Tài chính xem đầy đủ.
- **Quyền thao tác** đã kiểm trong từng hàm từ Giai đoạn 2. QLNN không có thao tác sửa nào.
- **Màn Admin chia chức năng theo nhóm quyền của tài khoản:**
  - Vận hành: Tổng quan, Đơn hàng, Mô phỏng ĐVVC, Tham số.
  - Chất lượng: Tổng quan, Duyệt sản phẩm & giá.
  - CSKH: Tổng quan, Ticket.
  - Tài chính: Tổng quan, Hoàn tiền, Đối soát HTX, Sổ giao dịch.
  - Quản trị gốc: Tổng quan, Tài khoản (chỉ xem), Nhật ký.

### Dữ liệu dùng chung (mục 7)

| Thực thể theo mục 7 | Trong store (`DemoState`) |
|---|---|
| users | `users` (tài khoản đăng nhập: vai trò, HTX, nhóm quyền, trạng thái) |
| coops | `coops` |
| products | `products` |
| preorderConfigs | `products[].preorder` (quan hệ 1–1 với sản phẩm đặt trước) |
| addresses | `addresses`, `wards` (danh mục phường/xã mẫu) |
| carts | `carts` (theo khách hàng) |
| checkouts (lần đặt) | `checkouts` |
| orders (kèm items, statusHistory) | `orders` |
| transactions | `transactions` |
| vouchers, voucherUsages | `vouchers`, `voucherUsages` |
| giftBoxTypes | `giftBoxTypes` |
| tickets | `tickets` |
| reviews | `reviews` (khung dữ liệu; chức năng đánh giá làm ở Giai đoạn 4) |
| ledgerEntries | `ledgerEntries`: tiền vào qua cổng, thu COD, hoàn tiền, chi trả HTX, hoa hồng. Chỉ thêm, không sửa |
| payoutPeriods | `payoutPeriods` |
| params (kèm history) | `params`, `paramHistory` |
| auditLogs | `auditLogs` |
| notifications | `notifications` |
| (thêm) | `customers`, `productChanges`, `refunds`, `lowStockAlerts`, `clockOffsetMs` |

- Mọi thay đổi đi qua các hàm trong `src/domain` thông qua `run()` của store.
- Khoá `localStorage` lên phiên bản 3, nên dữ liệu của bản cũ tự được thay bằng dữ liệu mẫu mới.

### Trung tâm thông báo (FR-CSKH-10)

Nút chuông ở thanh trên cùng hiện số chưa đọc. Mở ra thì đánh dấu đã đọc; bấm thông báo của đơn thì mở đúng đơn.

Thông báo do `deriveNotifications()` sinh: hàm so dữ liệu trước và sau mỗi thao tác. Vì vậy thao tác của người dùng, tác vụ theo giờ và cổng mô phỏng đều sinh thông báo như nhau.

| Sự kiện | Người nhận |
|---|---|
| Tạo đơn; đơn đổi trạng thái (kèm lý do) | Khách. HTX nhận khi đơn đã thanh toán / COD cần xác nhận và các bước sau. Không báo lại cho chính bên vừa thao tác |
| Đơn Đã giao | Khách, kèm lời "Mời bạn đánh giá sản phẩm" |
| HTX báo hàng sẵn sàng, cần trả phần còn lại | Khách |
| Nhắc thanh toán ở phút PAR-20 | Khách |
| Hoàn tiền (Chờ / Đang / Đã hoàn) | Khách |
| Khách yêu cầu huỷ; HTX từ chối yêu cầu huỷ | HTX; khách |
| Khiếu nại mới | HTX của đơn và Admin – CSKH |
| HTX phản hồi khiếu nại; ticket đổi trạng thái | Khách và CSKH; khách và HTX |
| Yêu cầu đổi giá / báo thu hoạch mới; kết quả duyệt | Admin – Chất lượng; HTX |
| Yêu cầu hoàn tiền mới | Admin – Tài chính |
| Đã ghi nhận chi trả kỳ đối soát | HTX |
| Tồn thấp (≤ ngưỡng PAR-02), tối đa 1 lần/ngày mỗi sản phẩm | HTX |

### Kiểm thử Giai đoạn 3

- **Unit test mới:**
  - `access.test.ts`: đăng nhập, đăng ký, T21, T22, che tài khoản, quyền xem nhật ký.
  - `notifications.test.ts`: thông báo theo trạng thái đơn, khiếu nại, kết quả duyệt, tồn thấp 1 lần/ngày.
- **Trình duyệt, 2 tab cùng lúc:**
  1. Tab A (Khách hàng mẫu 1): nhập sai OTP bị chặn; đăng nhập đúng; mua mật ong và thanh toán mô phỏng.
  2. Tab B mở ra ở màn đăng nhập (phiên riêng), đăng nhập HTX mẫu Bắc Hà. HTX nhận 2 thông báo ("Đơn mới … cần xác nhận", "Tồn thấp"), xác nhận đơn, không thấy đơn của HTX khác.
  3. Tab A tải lại: đơn sang Đang chuẩn bị, có 3 thông báo.
  4. Đăng xuất rồi đăng nhập QLNN: không có tên, SĐT, địa chỉ; có bảng đơn ẩn danh.
  5. Quản trị gốc thấy dòng nhật ký "HTX mẫu Bắc Hà · Xác nhận đơn".
  6. Admin – Tài chính thấy sổ giao dịch.
  7. Khách hàng mẫu 2 chỉ thấy đơn của mình.

### Còn tồn tại sau Giai đoạn 3

- ~~**Còn thiếu các chức năng tài khoản thuộc Giai đoạn 4**~~ – đã làm ở Giai đoạn 4.
- **Công cụ demo** hiện cho mọi tài khoản và cả ở màn đăng nhập, vì đây là bản demo. Nếu nhóm muốn chỉ Admin thấy thì sửa ở `AppShell`.

---

## Giai đoạn 2 – Sửa các lỗi đã phát hiện

### Cách làm

Phần lớn lỗi L1–L18 bắt nguồn từ việc app không có mô hình đơn hàng thật: tiền tính ngay trong màn hình, đơn gõ cứng, không có giao dịch, không có trạng thái. Vì vậy Giai đoạn 2 làm theo thứ tự:

1. **Mở rộng `src/domain`** thành các thao tác thuần trên toàn bộ dữ liệu (`DemoState`):

   | File | Nội dung |
   |---|---|
   | `cart.ts` | Giỏ, kiểm tra lại giá và tồn (BR-DAT-03), ngày giao D (BR-DAT-08) |
   | `checkout.ts` | Tách đơn, mã ưu đãi, hoả tốc, hộp quà, COD; tạo đơn và giao dịch gộp; chống tạo trùng (BR-DAT-01..09) |
   | `payment.ts` | `applyGatewayResult(txId, result, gatewayRef)`: thành công, thất bại, huỷ, tiền về muộn, trả hai lần (mục 5.4) |
   | `orders.ts` | Thao tác của Khách, HTX, ĐVVC mô phỏng; huỷ kèm hoàn tiền; kiểm quyền ngay trong hàm |
   | `jobs.ts` | Tác vụ theo giờ: hết hạn thanh toán PAR-19, nhắc PAR-20, quá hạn xác nhận PAR-11, hạn trả phần còn lại PAR-24, tự chuyển Đã giao PAR-26 |
   | `complaint.ts` | Khiếu nại, trả hàng, RET-01, ưu tiên Cao, CSKH kết luận (mục 5.7, 5.8) |
   | `productChanges.ts` | Tồn kho, đổi giá và báo thu hoạch chờ duyệt (mục 5.6, FR-SP-04) |
   | `settlement.ts`, `finance.ts` | Đối soát tuần, chốt kỳ, chi trả mô phỏng; hoàn tiền qua ngân hàng mô phỏng (mục 5.10, FR-DH-12) |
   | `stats.ts` | Số liệu tổng hợp tính từ store, bản cho QLNN không có dữ liệu cá nhân |
   | `address.ts` | Sổ địa chỉ theo BR-DAT-04 |

2. **Store** (`src/store`) giữ toàn bộ `DemoState` trong `localStorage` (khoá đổi sang phiên bản 2, dữ liệu cũ tự bỏ).
   - Store chạy tác vụ theo giờ khi tải app, mỗi 5 giây và sau khi tua đồng hồ.
   - Mọi thời điểm đọc qua `now()` của đồng hồ demo.
3. **Viết lại các màn bị ảnh hưởng** để chỉ gọi hàm domain, không tự tính tiền hay tự đổi trạng thái.

### Kết quả từng lỗi

| Mã | Tình trạng | Đã sửa thế nào | Cách kiểm |
|---|---|---|---|
| L1 | Đã làm | Tiền tính bằng `priceOrder` / `totalCheckout`. Cọc chỉ áp cho đơn đặt trước. Nút đặt hàng ghi đúng "trả ngay" bằng tổng phần online | Test T1, L1; trình duyệt: giỏ mật ong (online, mã −29.000đ) + gạo (COD) → nút "Đặt hàng – trả ngay 289.000đ", phần COD 418.000đ hiện riêng |
| L2 | Đã làm | Mỗi lần đặt 1 mã (PAR-28). Chỉ giảm tiền hàng hợp lệ. Bỏ mã freeship và nút "chọn hết / tối ưu". Mã không đủ điều kiện bị khoá và hiện lý do. Kiểm tra lại mã lúc bấm Đặt hàng | Test T2, T3; trình duyệt: chọn mã thứ hai thay cho mã đầu, mã hết hạn và mã "khách lần đầu" bị khoá kèm lý do |
| L3 | Đã làm | "Đặt trước" (Vụ mùa) và "Mua ngay" / "Đặt trước" (chi tiết sản phẩm) mở luồng đặt hàng chỉ cho đúng sản phẩm đó, luôn bắt đầu ở bước 1. Màn xác nhận liệt kê từng đơn, từng món (tên, SL, đơn giá, thành tiền) và từng khoản phí | Trình duyệt: đặt trước mận từ Vụ mùa → bước 1 chỉ có "HTX mẫu Bắc Hà · Đặt trước" |
| L4 | Đã làm | Đơn mới hiện ngay ở Khách (Đơn hàng), HTX (chỉ đúng HTX) và Admin (Đơn hàng). Trạng thái theo mục 5.5: online / đặt trước → Chờ thanh toán; COD → Chờ xác nhận | Trình duyệt: sau khi trả, 2 đơn hiện "Chờ xác nhận" ở khách; HTX Mường Khương chỉ thấy đơn của mình |
| L5 | Đã làm | Mua sẵn chọn COD hoặc online; cọc chỉ online; COD bị ẩn khi đơn vượt PAR-23 hoặc là quà gửi người khác. Có màn "Cổng thanh toán – MÔ PHỎNG" (3 nút, đồng hồ 15 phút, ghi "không trừ tiền thật"). Mọi đơn online và cọc gộp một giao dịch | Test T7, T11; trình duyệt: cổng hiện 14:59 |
| L6 | Đã làm | Số lượng chặn theo tồn khả dụng (mua sẵn) hoặc suất còn lại (đặt trước) ở giỏ, chi tiết sản phẩm và lúc đặt. Hiện số còn lại. Hết thì hiện "Hết hàng" | Test T9, T8 |
| L7 | Đã làm | Panel mã ưu đãi nằm trong bước 2 của màn đặt hàng; chọn mã không đóng màn | Trình duyệt: chọn mã xong vẫn ở "2. Ưu đãi & thanh toán" |
| L8 | Đã làm | Tìm không phân biệt dấu và hoa/thường | Test T20; trình duyệt: "gao seng cu" ra Gạo Séng Cù |
| L9 | Đã làm | Bộ lọc vùng sinh từ dữ liệu sản phẩm, cùng một cấp (Bắc Hà, Mường Khương, Sa Pa). Thêm bộ lọc nhóm hàng. Có màn "Không có sản phẩm phù hợp" kèm nút xoá lọc | Trình duyệt |
| L10 | Đã làm | Nguồn gốc, chi tiết đơn, phiếu đóng gói, form khiếu nại đều mở theo mã bản ghi được chọn | Trình duyệt: "Xem nguồn gốc" ở Mật ong hiện Mật ong |
| L11 | Đã làm | Bắt buộc chọn đơn Đã giao còn trong hạn RET-01, chọn sản phẩm, lý do, ít nhất 1 ảnh. "Đổi ý" không chọn hoàn tiền được. Không còn lời hứa "xử lý trong 24h/120 phút"; hiện mốc SLA-01 | Test T18; trình duyệt: chưa có ảnh → "Vui lòng thêm ít nhất 1 ảnh." |
| L12 | Đã làm | "Báo thu hoạch / mở đợt đặt trước" và đề xuất giá chuyển sang Chờ duyệt. Admin – Chất lượng duyệt hoặc từ chối (bắt buộc lý do). Trong lúc chờ vẫn bán giá cũ | Test L12; trình duyệt |
| L13 | Đã làm | Ví HTX tính theo mục 5.10: hoa hồng COM-01 5% trên tiền hàng thực giữ lại, không tính phí giao, kỳ tuần. Bỏ nút rút tiền, bỏ dòng thuế TNCN, bỏ "8%", "T+3". Admin – Tài chính chốt kỳ (kỳ đã chốt bị khoá) và ghi nhận chi trả (mô phỏng) vào tài khoản HTX | Test L13 |
| L14 | Đã làm | Form địa chỉ: Hà Nội cố định, phường/xã chọn từ danh sách "(mẫu)", không có quận/huyện, chung cư bắt buộc toà–căn, nhà mặt đất bắt buộc số nhà. Thêm, sửa, xoá, đặt mặc định, tối đa 10. Đã bỏ nút GPS | Trình duyệt: thiếu toà → "Chung cư bắt buộc nhập toà và căn hộ." |
| L15 | Đã làm | Ô ghi chú trống, có placeholder; nội dung lưu vào đơn và hiện trên phiếu đóng gói của HTX | Trình duyệt |
| L16 | Đã làm | Gạo Séng Cù thuộc "Hàng khô"; mỗi HTX một mã riêng. Giai đoạn 5 đã thay bằng danh mục của nhóm: 9 sản phẩm, 7 HTX mẫu | Dữ liệu mẫu |
| L17 | Đã làm | Admin – Tổng quan và màn QLNN tính từ store (`aggregateStats`). Màn QLNN không có tên, SĐT, địa chỉ khách | Test L17; trình duyệt: QLNN không chứa "Khách hàng mẫu" hay "0900" |
| L18 | Đã làm | Thông báo nổi xuống dòng được, đặt ở đáy phía trên thanh tab, không chặn thao tác bấm | Trình duyệt |

### Thêm trong Giai đoạn 2 (cần cho các lỗi trên)

- **Mô phỏng đơn vị vận chuyển** (Admin – Vận hành) gồm các nút Đang giao, Giao thành công, Giao thất bại (kèm lý do) và Khách từ chối nhận. Màn này thay cho vai trò Shipper đang ẩn vì OI-01. Giao thất bại quá PAR-27 lần giao lại thì đơn sang Đang chuyển hoàn.
- **Công cụ demo** (nút viền vàng góc phải thanh trên cùng):
  - tua thời gian +15 phút / +24 giờ / +3 ngày, hoặc đưa về giờ thật;
  - gửi "tiền về muộn";
  - gửi kết quả cổng lần hai;
  - khôi phục dữ liệu mẫu.
- **Luồng HTX:** xác nhận hoặc từ chối đơn (bắt buộc lý do); báo sẵn sàng hoặc báo không cung cấp được (đặt trước); đóng gói và bàn giao (tồn kho bị trừ hẳn lúc bàn giao); nhận hàng hoàn; duyệt yêu cầu huỷ của khách. Phiếu đóng gói của quà gửi người khác không in giá.
- **Luồng khách:**
  - huỷ ngay ở Chờ thanh toán / Chờ xác nhận; gửi yêu cầu huỷ ở Đã xác nhận / Đang chuẩn bị;
  - trả phần còn lại của đơn đặt trước, hoặc đổi sang COD 1 lần;
  - bấm Đã nhận hàng;
  - xem chi tiết đơn kèm lịch sử trạng thái.
- **Admin – CSKH** xử lý ticket và duyệt hoàn khi kết luận. **Admin – Tài chính** đưa yêu cầu hoàn qua Đang hoàn tiền → Đã hoàn tiền khi ngân hàng mô phỏng xác nhận; mỗi yêu cầu chỉ thành công 1 lần.
- **Nhật ký thao tác** của Admin và HTX (chỉ thêm, không sửa, không xoá) ở Admin – Vận hành › Nhật ký.
- **Dữ liệu mẫu viết lại theo mô hình mới:**
  - tên "HTX mẫu …", khách "Khách hàng mẫu 1/2", SĐT `0900 000 00x`, tài khoản hiện dạng che;
  - 4 mã ưu đãi đúng mục 5.3: mức chi tối thiểu, theo danh mục, khách lần đầu, đã hết hạn;
  - 3 loại hộp quà;
  - 8 phường/xã "(mẫu)" có khoảng cách mẫu;
  - 2 đơn mẫu tạo qua chính hàm domain: 1 đơn Đã giao, 1 đơn Chờ xác nhận.

### Kiểm thử luồng (mục 11.2) bằng Playwright

**Luồng 1** – các bước đã chạy:
1. Khách đặt 1 món mua sẵn online + 1 món mua sẵn COD, có mã ưu đãi.
2. Cổng mô phỏng báo thành công.
3. HTX Mường Khương thấy đúng đơn của mình, xác nhận, bàn giao.
4. Admin – Chất lượng duyệt báo thu hoạch.
5. Admin – Vận hành mô phỏng ĐVVC "Giao thành công".
6. Khách bấm Đã nhận hàng.
7. Khách gửi khiếu nại: không có ảnh bị chặn; có ảnh thì tạo được ticket.
8. QLNN thấy số liệu tổng hợp, không có dữ liệu cá nhân.

Chưa chạy được, chờ giai đoạn sau:
- đăng nhập (Giai đoạn 3);
- đánh giá (Giai đoạn 4);
- đơn kèm "hộp quà gửi người khác" trên trình duyệt (đã có test domain).

**Luồng 2:** đặt 1 đơn online rồi tua +15 phút → trên trình duyệt đơn chuyển Đã huỷ. Phần nhả hàng, nhả suất, nhả lượt mã và trả sản phẩm về giỏ đã kiểm bằng test T8 và T11.

### Còn tồn tại sau Giai đoạn 2

- ~~**Danh tính tạm thời** (khách cố định, chọn HTX và nhóm quyền bằng ô chọn)~~ – đã thay bằng đăng nhập ở Giai đoạn 3.
- ~~**Chưa có:** đổi ngày giao D 1 lần sau khi đặt; đổi người nhận / địa chỉ trước bàn giao; trung tâm thông báo; đánh giá~~ – đã làm ở Giai đoạn 3–4.
- ~~**Màn Tham số chỉ đọc**~~ – đã cho sửa kèm lý do ở Giai đoạn 4.
- **Sản phẩm, mô tả, ảnh Unsplash vẫn là bộ cũ**, chỉ đã sửa nhóm hàng và mã HTX. Giai đoạn 5 thay theo danh mục của nhóm (đã thay).

---

## Giai đoạn 1 – Hợp nhất mã nguồn và sửa cấu hình build (đã xong)

- `src/App.tsx` build được nên lấy làm gốc, không phải viết lại.
- `index.html` là entry chuẩn Vite; không còn React, Babel, Tailwind, Font Awesome từ CDN; font tự host qua `@fontsource`.
- **Đã chuyển từ bản cũ:** tab Vụ mùa, trang nguồn gốc, giỏ hàng bottom sheet.
- **Bản cũ và các script ghi đè** nằm ở `legacy/` (xem `legacy/README.md`).
- **Đã gỡ:** `@google/genai`, `express`, `dotenv`, `@types/express`, `motion`, `tsx`, `autoprefixer`, khai báo Gemini.
- **Mã nguồn chia theo thư mục:** `src/domain`, `src/data`, `src/store`, `src/screens/{customer,coop,admin,regulator}`, `src/components`, `src/app`. Vai trò Shipper giữ ở `src/screens/_pending-OI-01/`.
- **Không cần `vercel.json`**, vì app một trang, không có đường dẫn phía client.
- **Nghiệm thu:** build không lỗi; trang chạy khi chặn mọi CDN; bundle không có Babel.
- **Đã bỏ khung iPhone giả.** Khách và HTX rộng tối đa 640px; Admin và QLNN dùng bố cục rộng.

---

## Kiểm thử bắt buộc (mục 13.1 của đề bài bản 2)

| Ca | Tình trạng | File test |
|---|---|---|
| T1 | Đạt | `pricing.test.ts` |
| T2 | Đạt | `voucher.test.ts` |
| T3 | Đạt | `pricing.test.ts`, `voucher.test.ts` |
| T4 | Đạt | `pricing.test.ts` |
| T5 | Đạt | `pricing.test.ts` |
| T6 | Đạt | `pricing.test.ts` |
| T7 | Đạt | `checkout.test.ts` |
| T8 | Đạt | `checkout.test.ts` |
| T9 | Đạt | `stock.test.ts`, `checkout.test.ts` |
| T10 | Đạt | `pricing.test.ts` |
| T11 | Đạt | `checkout.test.ts` |
| T12 | Đạt | `orderStateMachine.test.ts` |
| T13 | Đạt | `payment.test.ts` |
| T14 | Đạt | `refund.test.ts` |
| T15 | Đạt | `payment.test.ts` |
| T16 | Đạt | `payment.test.ts` |
| T17 | Đạt | `refund.test.ts`, `flow.test.ts` |
| T18 | Đạt | `flow.test.ts` |
| T19 | Đạt | `phase4.test.ts` |
| T20 | Đạt | `text.test.ts` |
| T21 | Đạt | `access.test.ts`, `flow.test.ts` |
| T22 | Đạt | `access.test.ts`, `payment.test.ts` |
| T23 | Đạt | `coopContact.test.ts` |
| T24 | Đạt | `variants.test.ts` |
| T25 | Đạt | `coopChat.test.ts` |
| T26 | Đạt | `complaint.test.ts` |
| T27 | Đạt | `coopApplication.test.ts` |
| T28 | Đạt | `stats.test.ts` |
| T29 | Đạt | `demoAccess.test.ts` |

T30–T40 làm cùng Giai đoạn 8–9. Tên mỗi test bắt đầu bằng mã ca (vd. `T29: …`).

Ngoài các ca trên còn có test cho:
- đặt lặp với cùng khoá (BR-DAT-07), HTX không đặt được hàng (BR-DAT-01);
- giá tăng / giảm (BR-DAT-03), ngày giao D (BR-DAT-08);
- COD bị ẩn, hoả tốc sau 14:00, lời nhắn hộp quà;
- quá hạn xác nhận, trả phần còn lại và quá hạn PAR-24, tự chuyển Đã giao sau PAR-26, chuyển hoàn sau PAR-27;
- đối soát, số liệu tổng hợp.

## Giả định đã dùng

1. **PAR-18 = 30%, COM-01 = 5%:** theo bảng tham số mục 4, đánh dấu "Giả định" trong màn Tham số.
2. **PAR-26 và RET-01 lưu theo giờ:** hàng khô 72 giờ (= 3 ngày) và 240 giờ (= 10 ngày). Đơn có ít nhất một món tươi thì dùng hạn hàng tươi.
3. **Mốc thời gian tính theo giờ địa phương của trình duyệt:** mốc hoàn cọc (hết 23:59:59 ngày D − PAR-08), giờ chốt hoả tốc PAR-21, kỳ đối soát (thứ Hai 00:00).
4. **Bậc hoả tốc FEE-02 tính cả mốc trên.** Đơn hoả tốc trả phí giao thường FEE-01 cộng phụ phí FEE-02.
5. **Sau khi HTX xác nhận, hệ thống tự chuyển tiếp** sang Chờ thu hoạch (đặt trước) hoặc Đang chuẩn bị (mua sẵn); cả hai bước đều ghi lịch sử. Lý do: bảng chuyển trạng thái chỉ ghi điều kiện là loại đơn, không ghi người bấm.
6. **Khách được gửi yêu cầu huỷ khi đơn đặt trước ở Chờ thu hoạch.** Mục 5.7 cho huỷ theo mốc D − PAR-08 nhưng bảng chuyển trạng thái chưa ghi rõ.
7. **Khách huỷ một đơn Chờ thanh toán thì huỷ cả giao dịch gộp** (các đơn online cùng lần đặt), giống bấm "Huỷ" ở cổng. Lý do: một giao dịch chỉ có một số tiền.
8. **Huỷ đơn luôn phải ghi lý do.** Hệ thống tự ghi lý do khi tự huỷ.
9. **Lượt mã được nhả** khi mọi đơn dùng mã của lần đặt đều bị huỷ trước bàn giao và không đơn nào mất cọc. Huỷ một phần thì giữ lượt.
10. **Chia giảm giá làm tròn xuống từng đơn,** phần lẻ dồn vào đơn có tiền hàng hợp lệ lớn nhất.
11. **Số tiền hoàn trả hàng** = số khách đã thực trả × (giá trị phần được duyệt sau khi trừ phần giảm giá chia cho phần đó ÷ tổng đơn). Không hoàn phí giao (OI-08 mặc định `false`).
12. **Đơn đặt trước khách huỷ sau mốc:** khách mất cọc, nên đơn giữ tình trạng thanh toán "Đã cọc – còn lại".
13. **Trả phần còn lại thất bại** không huỷ đơn; khách thử lại tới hạn PAR-24 mà hạn không được gia hạn.
14. **Phần còn lại về sau khi giao dịch đã kết thúc** thì tạo yêu cầu hoàn khoản vừa nhận.
15. **Phí hộp quà không tính vào doanh thu HTX** khi đối soát, vì SRS chưa quy định.
16. **Ghi chú của khách** là một ô cho cả lần đặt, chép vào từng đơn.
17. **Mặc định:** đơn mua sẵn thanh toán online, giao thường. Khách tự chọn COD hoặc hoả tốc.
18. **Ảnh khiếu nại** được thu nhỏ còn cạnh dài 320px và chỉ lưu trên trình duyệt (mô phỏng tải ảnh).
19. **Đề xuất của SRS dùng như quy tắc:** BR-TON-04 (giữ hàng ngay khi tạo đơn) và BR-TT-06 (lần trả thứ hai tạo yêu cầu hoàn 100%).
20. **Mã đơn** dạng `DH-yyyymmdd-xxxxxx`, phần ngẫu nhiên bỏ các ký tự dễ nhầm (0/O, 1/I).
21. **preorderConfigs lưu ngay trong sản phẩm** (`products[].preorder`), vì mỗi sản phẩm đặt trước có đúng một cấu hình đang áp dụng. Lịch sử báo thu hoạch nằm ở `productChanges`.
22. **Phiên đăng nhập theo từng tab** (`sessionStorage`), để demo hai vai trò song song trên một trình duyệt.
23. **Nhật ký thao tác chỉ Quản trị gốc xem** (FR-HT-03); các nhóm Admin khác không xem.
24. **Thông báo không gửi lại cho chính bên vừa thao tác** (ví dụ HTX tự xác nhận đơn thì chỉ khách nhận thông báo).
25. **Tồn thấp khi tồn khả dụng ≤ ngưỡng** (PAR-02 hoặc ngưỡng riêng của sản phẩm), kể cả lúc khách vừa tạo đơn và hàng đang được giữ.
26. **Khách hàng đăng ký mới** bằng SĐT + OTP mô phỏng, chưa yêu cầu thêm thông tin nào khác.
27. **Mã ưu đãi (HT-01) do Admin – Vận hành tạo,** vì yêu cầu không ghi rõ nhóm quyền.
28. **Đơn hoả tốc chỉ đổi được địa chỉ khi phụ phí không đổi.** Nếu phụ phí đổi, khách liên hệ CSKH; app không tự thu thêm hay hoàn bớt.
29. **Sản phẩm mới ở trạng thái Chờ duyệt** cho tới khi Admin – Chất lượng duyệt; bị từ chối thì ở trạng thái "Bị từ chối". **Sửa nội dung** chờ duyệt và trong lúc chờ khách thấy nội dung cũ. **Ẩn / hiện** có hiệu lực ngay.
30. **Chỉ chứng nhận đã được Admin – Chất lượng xác minh mới hiện cho khách,** ghi "Admin đã xem hồ sơ – mô phỏng". Nhãn `certLabel` của dữ liệu mẫu cũ đã bị xoá ở Giai đoạn 5.
31. **Đánh giá công khai** hiện tên rút gọn (ví dụ "Khách 1.") và 3 ký tự cuối của mã đơn.
32. **Danh sách lý do được phép ẩn đánh giá** gồm: thông tin cá nhân, ngôn từ xúc phạm, quảng cáo / spam / link, không liên quan sản phẩm. Không có lý do "sao thấp".
33. **Giới hạn khi khoá tài khoản và phân quyền:**
    - Admin – Vận hành không khoá được chính mình và không khoá được Quản trị gốc.
    - Quản trị gốc không tự đổi nhóm quyền của mình và không cấp thêm quyền Quản trị gốc.
34. **HTX bị tạm khoá quyền bán:** sản phẩm vẫn hiện trong danh mục kèm nhãn "Tạm ngừng bán" nhưng không đặt được. Các đơn đã có vẫn xử lý bình thường.
35. **Báo cáo CSV** mã hoá UTF-8 có BOM để Excel hiển thị đúng tiếng Việt.
36. **Mỗi vùng trong bảng sản phẩm có một HTX mẫu riêng.** Lý do: nhóm chưa cung cấp tên HTX. Như vậy có 7 HTX; Bắc Hà bán 3 sản phẩm. Sản phẩm ghi 2 địa danh (vd. "Mường Khương, Bát Xát") vẫn chỉ gắn 1 HTX.
37. **Giá mẫu chọn gần giữa khoảng nhóm khảo sát.** Chè lấy mức phổ thông – trung cấp 800.000đ/kg. Cốm Tú Lệ 110.000đ/gói 500 g và Bưởi Đại Minh 200.000đ/thùng 5 kg là giá và quy cách tự đặt, ghi "giá mẫu".
38. **Khoảng ngày giao của mận tươi** là 01/05 – 30/06 của mùa kế tiếp, tức 2027 khi chạy demo năm 2026. Theo bảng của nhóm: mùa bán tháng 5–7, khoảng giao mẫu 05–06/2027.
39. **"Khoảng ngày giao lấy từ cấu hình"** của Cốm Tú Lệ được hiểu là ngày giao sớm nhất bằng hôm nay + PAR-08, kéo dài 4 tuần. Bưởi Đại Minh chưa có khoảng ngày giao nên dùng cách tương tự: bắt đầu sau mốc PAR-08 thêm 1 tuần. Cả hai đều ghi "(mẫu, chờ HTX xác nhận)".
40. **Bộ lọc vùng tách theo dấu phẩy:** mỗi địa danh trong ô "Vùng" thành một lựa chọn lọc. Số liệu QLNN theo vùng vẫn dùng nguyên chuỗi vùng của sản phẩm.
41. **Nhãn "Dữ liệu mẫu – chờ HTX xác nhận" chỉ gắn cho sản phẩm trong danh mục mẫu.** Sản phẩm HTX tự tạo trong demo thì do chính HTX khai, nên không có nhãn này. Dải "Bản demo" vẫn hiện trên mọi màn.
42. **Dải màu đầy đủ cho xanh rừng và champagne** tự tính từ 2 màu gốc của nhóm, chọn độ sáng để các cặp chữ / nền đang dùng đạt AA. Nhóm đổi màu gốc thì cần kiểm tra lại tương phản.
43. **Chữ phụ dùng token `muted` `#6B655F`** thay cho `stone-500`, vì `stone-500` không đạt AA trên nền trắng ngà.
44. **Ô nhập dùng chữ 16px trên điện thoại** để iOS không tự phóng to khi bấm vào ô (chuyện này xảy ra sau khi bỏ chặn phóng to).
45. **Dải demo dùng chữ 12px đậm** vì là nhãn, không phải nội dung; ở 320px dải xuống 2 dòng.
46. **Màn QLNN đổi thẻ đầu trang từ xanh lam sang xanh rừng** để theo bảng nhận diện. Nhãn trạng thái đơn và khung "Hoàn tiền" vẫn dùng màu thông tin (xanh lam).
47. **Trạng thái lỗi của danh sách** gồm 2 trường hợp: lỗi khi hiển thị (bắt bằng error boundary) và lỗi không có quyền xem (hiện lý do). Danh sách đọc từ dữ liệu trên máy, kể cả khi dùng API dữ liệu chung, nên không có trạng thái lỗi mạng. Mất kết nối API thì báo ở dải demo và Công cụ demo.
48. **SĐT nhập 9 số được hiểu là số di động bỏ số 0 đầu.** Chuỗi 11 số bắt đầu bằng `84` được hiểu là có mã nước. App lưu dạng 10 số `0xxxxxxxxx` để tương thích với dữ liệu đã có.
49. **Dữ liệu dùng chung là một bản ghi cho mọi người mở link,** không chia theo người xem hay theo buổi demo.
50. **Server chưa có dữ liệu, hoặc dữ liệu khác phiên bản cấu trúc (`STORAGE_VERSION`):** trình duyệt mở trước đưa dữ liệu của nó lên làm dữ liệu chung.
51. **Hai thao tác trùng nhau trên hai máy:** giữ thao tác tới server trước. Thao tác sau chạy lại trên dữ liệu mới; không hợp lệ nữa thì bỏ và báo.
52. **Đồng hồ demo và giỏ hàng nằm trong dữ liệu chung.** Phiên đăng nhập vẫn riêng từng tab.
53. **Ô số lượng ở trang chi tiết là số muốn thêm,** không phải tổng trong giỏ. Trong giỏ đã có thì thêm cộng dồn; vượt số còn lại thì báo lỗi như trước.
54. **Liên kết ngân hàng chỉ dùng cho tài khoản nhận hoàn tiền đơn COD của khách.** Tài khoản nhận chi trả của HTX vẫn chỉ hiện dạng che, chưa có luồng liên kết.
55. **Tên chủ tài khoản lưu dạng viết hoa, không dấu,** theo cách ngân hàng Việt Nam thường in.
56. **Toạ độ GPS không lưu,** chỉ dùng để tra địa chỉ. Gửi tới Google Maps qua máy chủ của app, đã làm tròn khoảng 11 m.
57. **Khung Hà Nội cho GPS là khung toạ độ gần đúng** (vĩ độ 20,53–21,39; kinh độ 105,28–106,03), rộng hơn ranh giới thật một chút. Google trả về tỉnh khác thì vẫn báo ngoài Hà Nội.
58. **Chỉ khách hàng đăng nhập được bằng Google.** Tài khoản HTX, Admin, QLNN vẫn do Admin cấp và đăng nhập bằng SĐT.
59. **Tài khoản Google mô phỏng và Google thật là hai tài khoản khác nhau,** kể cả khi cùng email.
60. **"Vào mùa" là lúc HTX xác nhận thu hoạch xong** (trước đây là lúc bấm Báo sẵn sàng giao). App không tự đoán ngày vào mùa; ngày giao dự kiến lấy từ ngày giao của đơn.
61. **Gọi điện dùng điện thoại của HTX** (mở ứng dụng gọi của máy), không qua tổng đài. App không biết kết quả cuộc gọi nên HTX tự ghi lại.
62. **Khách nhắn tin cho HTX, không có nút gọi HTX.** SĐT của HTX chỉ dành cho Admin gọi HTX, không công khai cho khách (chủ repo yêu cầu). Cần hỗ trợ ngoài đơn thì dùng Khiếu nại / CSKH như trước.
63. **Xác nhận cả lô chia hàng theo thứ tự đặt và dừng ở đơn đầu tiên không đủ hàng,** để đơn đặt sau không được ưu tiên hơn đơn đặt sớm. Muốn giao cho một đơn cụ thể thì xác nhận theo từng đơn.
64. **Sản lượng HTX nhập khi xác nhận cả lô chỉ dùng để chia đơn và ghi lại.** App không trừ tồn kho hay suất đặt trước theo số này; phần dư không lưu thành tồn kho.
65. **Ngày thu hoạch, ghi chú và ảnh là thông tin HTX tự khai,** sàn không kiểm chứng. Ngày thu hoạch không được sau hôm nay theo đồng hồ demo; ngày trong quá khứ thì không giới hạn.
66. **Mỗi lần xác nhận lưu tối đa 2 ảnh đã thu nhỏ,** để dữ liệu dùng chung không quá nặng.
67. **"Full màn hình trên cả web" hiểu là dùng hết bề rộng cửa sổ trình duyệt,** không phải chế độ toàn màn hình của trình duyệt (phím F11).
68. **Mỗi HTX có đúng 2 SĐT liên hệ,** cả 2 đều bắt buộc. Nhận số di động 10 số và số cố định 11 số bắt đầu bằng 02; chưa nhận đầu số 1800 / 1900.
69. **HTX đổi SĐT liên hệ không cần Admin duyệt,** khác các thông tin hồ sơ khác (tên, vùng, người đại diện, giới thiệu), để Admin luôn gọi được số đang dùng. Mỗi lần đổi có ghi nhật ký thao tác.
70. **SĐT liên hệ của HTX chỉ Admin (mọi nhóm quyền) và chính HTX xem được.** Khách và Cơ quan QLNN không xem được.
71. **Tab đơn theo kiểu ứng dụng mua sắm gộp trạng thái SRS:** "Chờ lấy hàng" gồm Đã xác nhận và Đang chuẩn bị; "Trả hàng" gồm 3 trạng thái trả hàng. Nhãn trạng thái trên từng thẻ đơn vẫn theo SRS.
72. **"Mua lại" chỉ đưa sản phẩm vào giỏ, không đặt hàng ngay.** Giá theo giá hiện tại; hàng đặt trước lấy ngày giao sớm nhất còn chọn được, khách đổi ngày trong giỏ.
73. **"Có thể bạn cũng thích" không cá nhân hoá theo hành vi:** chỉ bỏ sản phẩm khách đã mua và xếp theo điểm đánh giá. Khách đã mua hết thì gợi ý lại mọi sản phẩm đang bán.
74. **Biểu tượng "Đánh giá" mở tab Đã giao,** nơi đơn chờ đánh giá có nút Đánh giá. Đơn nhiều sản phẩm thì nút mở sản phẩm đầu tiên chưa đánh giá; các sản phẩm còn lại đánh giá trong chi tiết đơn.
75. **Đơn mua nằm trong Tài khoản, không có tab riêng ở thanh dưới.** Bấm biểu tượng trạng thái chỉ đổi tab của danh sách ngay bên dưới; trang chỉ cuộn khi danh sách đang khuất.
76. **Mỗi quy cách bán là một sản phẩm riêng nối về sản phẩm gốc** (giá, tồn kho / số suất, duyệt, đánh giá riêng). Tên, mô tả, nhóm hàng, vùng dùng chung cả nhóm; quy cách mới duyệt như sản phẩm mới; tối đa 6 quy cách mỗi sản phẩm.
77. **Quy cách mẫu:** mứt mận hộp 500 g (225.000đ) và gạo Séng Cù túi 5 kg (280.000đ), giá cùng mức đ/kg với quy cách gốc, tồn kho mẫu. Chờ HTX xác nhận như các dữ liệu mẫu khác.
78. **Địa chỉ HTX theo cùng quy tắc với SĐT:** chỉ Admin và chính HTX xem, HTX lưu ngay không chờ duyệt, có nhật ký. HTX mẫu có địa chỉ mẫu theo vùng, không có số nhà, thôn bản.
79. **Nhắn tin riêng là chức năng thật trong bản demo, không phải mô phỏng** (lưu trong dữ liệu dùng chung). Chỉ nhắn chữ, chưa gửi ảnh. HTX chỉ nhắn được cho khách đã nhắn cho HTX hoặc đã đặt đơn của HTX.
80. **Cuộc trò chuyện với một HTX gộp cả tin trong các đơn;** đọc ở hộp tin nhắn thì các đơn đó cũng tính là đã đọc. Phần trao đổi trong chi tiết đơn vẫn chỉ hiện tin của đơn đó.
81. **CSKH phải tiếp nhận ticket trước khi kết luận** (trước đây kết luận thẳng được). Đóng ticket được khi khoản hoàn còn đang xử lý; Admin – Tài chính hoàn tiếp như trước, khách vẫn thấy bước Hoàn tiền.
82. **HTX mới do Admin – Chất lượng duyệt và hệ thống tự cấp tài khoản HTX** (không cần Admin – Vận hành cấp riêng). Ảnh giấy tờ chỉ để Admin xem; xác minh với cơ quan cấp là mô phỏng. Số tài khoản nhận chi trả chỉ lưu dạng che. Tra cứu hồ sơ bằng SĐT người đại diện + OTP mô phỏng.
83. **Biểu đồ Tổng quan:** tiền hàng không tính đơn chưa thanh toán xong, đã huỷ, trả hàng; "Tất cả" vẽ tối đa 90 ngày ở biểu đồ theo ngày; vùng của đơn lấy theo sản phẩm đầu tiên trong đơn (như bảng Theo vùng trước đây).
84. **Danh sách HTX thay Danh bạ HTX** ở mọi nhóm quyền Admin; nút gọi SĐT HTX giữ nguyên.
85. **Mã trình diễn (NEW-01, chưa có trong SRS):** 4–32 ký tự chữ không dấu và số, không phân biệt hoa thường; chỉ lưu bản băm kèm muối (băm 53 bit, đủ để không đọc được mã trong dữ liệu dùng chung, không phải băm mật khẩu). Nhớ theo tab; đổi mã thì phải nhập lại; khôi phục dữ liệu mẫu giữ mã.
86. **Mã trình diễn không nằm trong bộ tham số `params`**, vì bộ tham số được chép vào bản chốt của từng đơn (BR-DAT-06); vẫn hiện ở đầu màn Tham số. Quản trị gốc có thêm mục Tham số: xem tham số (chỉ Admin – Vận hành sửa) và đặt mã.
87. **Công cụ demo giới hạn cả hai nút kết quả cổng** ("tiền về muộn", "kết quả lần hai"), không chỉ tua giờ và khôi phục dữ liệu như đề bài nêu, vì chúng cũng đổi giao dịch của người khác. Ai cũng mở được Công cụ demo để xem giờ demo và tình trạng cấu hình. Mỗi thao tác ghi nhật ký.
88. **Kiểm tra khoá Google Maps qua `GET /api/geocode?status=1`** (thêm vào hàm có sẵn, không đổi cấu hình): chỉ trả đã có khoá hay chưa, không gọi Google, không tính lượt.
89. **Kiểm thử trình duyệt dùng Playwright 1.56.1** (khớp bản Chromium có sẵn của môi trường kiểm thử) và **axe-core 4.10.2** (như các lần kiểm tra trước), ghi cố định phiên bản trong devDependencies.
90. **Mỗi tài khoản giữ 40 thông báo mới nhất** (sửa lỗi bản web); thông báo cũ hơn bị bỏ khi có thông báo mới. Nhật ký thao tác không bị cắt (mục 5.9).
91. **Dữ liệu dùng chung lưu nén gzip trên Upstash**, giới hạn 900 KB sau khi nén và 4 MB trước khi nén (dưới mức của gói Upstash miễn phí và của hàm Vercel).
92. **Lâu không thao tác thì hỏi máy chủ thưa hơn** (30 giây sau 2 phút, 60 giây sau 15 phút) để đỡ tốn lượt Upstash; dữ liệu của máy khác vì vậy có thể hiện chậm hơn khi màn hình để yên lâu.
93. **Màn báo lỗi ở gốc app cho khôi phục dữ liệu mẫu** bằng SĐT + OTP mô phỏng của Quản trị gốc / Admin – Vận hành, để thoát được khi chính dữ liệu dùng chung làm app lỗi lúc mở. Không phải bảo mật thật, như mã trình diễn.
94. **OI-01 theo lựa chọn của chủ repo:** Admin – Vận hành phân công shipper cho đơn Đang chuẩn bị / Đang giao; shipper báo lấy hàng, giao thành công, giao thất bại, khách từ chối. Đơn chưa có shipper vẫn dùng mô phỏng ĐVVC. Cần nhóm đưa vào SRS.
95. **Shipper báo giao thành công chỉ ghi mốc;** đơn sang Đã giao khi khách bấm Đã nhận hoặc sau PAR-26, như SRS mục 5.5.
96. **Giao thành công bắt buộc 1–2 ảnh giao hàng** (thu nhỏ như ảnh khiếu nại); lý do giao thất bại gồm 5 lựa chọn, "Khác" bắt buộc ghi rõ.
97. **Tiền thu hộ của shipper là mô phỏng:** shipper giữ khoản thu khi nhận hàng của đơn đã báo giao thành công, nộp bằng phiếu, Admin – Tài chính xác nhận. Không thêm dòng vào sổ giao dịch hay đối soát HTX (tiền COD đã vào sổ khi đơn Đã giao, như trước).
98. **Shipper không thấy SĐT, địa chỉ HTX;** điểm lấy hàng do Admin – Vận hành ghi khi phân công. Shipper thấy tên, SĐT, địa chỉ người nhận để giao.
99. **Nhật ký ghi thêm thao tác của shipper** (ngoài Admin và HTX theo mục 5.9).
100. **Yêu thích, theo dõi HTX, kho voucher là chức năng thêm theo yêu cầu của chủ repo,** ngoài SRS. Không ghi nhật ký (thao tác cá nhân của khách, như giỏ hàng). Mỗi khách tối đa 100 sản phẩm yêu thích, 50 HTX theo dõi, 30 mã đã lưu, để dữ liệu dùng chung gọn.
101. **Trang shop chỉ có thông tin công khai;** điểm shop là trung bình các đánh giá đang hiển thị của mọi sản phẩm đang bán của HTX. Không hiện người đại diện vì là thông tin cá nhân.
102. **Kho voucher không đổi quy tắc mã:** lưu mã không giữ lượt; lượt chỉ bị giữ khi đặt hàng như trước (BR-KM). Mã hết lượt / hết hạn sau khi lưu vẫn nằm trong kho kèm tình trạng.
103. **Tìm kiếm gần đây và đã xem gần đây lưu trên từng máy** (localStorage theo mã khách), không đồng bộ giữa các máy.
104. **Khoảng giá và sắp xếp dùng giá "từ" của nhóm quy cách** (quy cách đang bán giá thấp nhất), như giá in trên thẻ.
105. **Báo "có sản phẩm mới" chỉ khi Admin – Chất lượng duyệt sản phẩm mới,** không báo khi duyệt quy cách thêm, giá hay nội dung.
106. **Đợt đặt trước nhận diện bằng khoảng ngày giao** HTX khai (Giai đoạn 8). Duyệt cùng khoảng ngày giao (thêm suất) không báo lại; khoảng ngày giao khác là đợt mới, báo lại cho khách vẫn đang theo dõi.
107. **Thông báo vào mùa gửi lúc Admin – Chất lượng duyệt "Báo thu hoạch / mở đợt đặt trước"**, chỉ khi lúc đó sản phẩm đặt được ngay (đang mở, còn suất, còn ngày giao hợp lệ, HTX có quyền bán). Huỷ đơn làm có lại suất không gửi thông báo.
108. **Theo dõi vào mùa vẫn giữ sau khi báo** để khách được báo đợt sau; khách tự tắt ở trang sản phẩm hoặc ở Tài khoản. Tối đa 50 sản phẩm mỗi khách.
109. **NEW-04 = 2 ảnh mỗi tin nhắn** (trạng thái Demo, nhóm chốt sau). Ảnh thu nhỏ cạnh dài 320px như ảnh khiếu nại; mỗi ảnh đã thu nhỏ không quá 120.000 ký tự.
110. **Ước lượng dung lượng dữ liệu dùng chung:** chữ tính 0,3 lần, ảnh tính 1 lần số ký tự (đo trên dữ liệu mẫu: chữ nén còn khoảng 0,32 lần, ảnh JPEG dạng base64 sau khi nén và mã hoá lại khoảng 1 lần). Từ 85% giới hạn 900 KB không nhận thêm ảnh. Đây là ước lượng; máy chủ vẫn là nơi quyết định (413 khi quá giới hạn).
111. **Hoá đơn công ty áp cho mọi đơn của một lần đặt,** bắt buộc đủ 4 ô (email nhận cũng bắt buộc). Mã số thuế bỏ khoảng trắng, email viết thường trước khi lưu. Không gửi email, không phát hành hoá đơn.
112. **Trang HTX chỉ hiện chứng nhận còn hiệu lực** theo giờ demo; cùng tên và nơi cấp gộp một dòng, lấy hạn xa nhất.
113. **Nhãn dữ liệu mẫu ở trang HTX** khi tên HTX có chữ "mẫu" hoặc có sản phẩm thuộc danh mục mẫu của nhóm.

## Vấn đề chờ nhóm chốt

| Mã | Nội dung | Cách app đang xử lý |
|---|---|---|
| OI-01 | Ai cập nhật trạng thái giao hàng | Chủ repo chọn ngày 18/10/2026: Admin – Vận hành phân công shipper, shipper báo kết quả giao (cần nhóm đưa vào SRS). Đơn chưa có shipper vẫn dùng mô phỏng ĐVVC. Vai trò Điều phối Ops vẫn ẩn: Admin – Vận hành làm thay |
| OI-02 | (theo SRS) | Chưa đụng tới |
| OI-04 | (theo SRS) | Chưa đụng tới |
| OI-05 | (theo SRS) | Chưa đụng tới |
| OI-08 | Có hoàn phí giao khi lỗi không do khách | Tham số, mặc định không hoàn |
| OI-11 | (theo SRS) | Chưa đụng tới |
| OI-13 | Chính sách đổi hàng | Không làm chức năng đổi hàng |
| OI-14 | Chỉ số thành công của sàn | Chưa làm màn chỉ tiêu (Giai đoạn 9 chỉ làm khi nhóm chốt) |
| OI-15 | (theo SRS) | Chưa đụng tới |
| OI-16 | (theo SRS) | Chưa đụng tới |

Tài liệu yêu cầu không mô tả nội dung của OI-02, OI-04, OI-05, OI-11, OI-15, OI-16. Nhóm cần cung cấp mô tả để ghi đúng vào báo cáo.

Thêm hai việc nhóm cần chốt:
- **Các chức năng làm thêm chưa có trong SRS** (chủ repo yêu cầu, góp ý kiểm thử, Giai đoạn 7): quy cách bán hàng, nhắn tin riêng với HTX, 2 SĐT và địa chỉ HTX, xác nhận thu hoạch, quy trình duyệt HTX mới, biểu đồ Tổng quan, mã trình diễn. Nhóm cần quyết định đưa vào SRS hay bỏ.
- **Ai cấp tài khoản HTX mới:** app đang để Admin – Chất lượng duyệt hồ sơ và hệ thống tự tạo tài khoản (giả định 82); SRS có thể giao cho Admin – Vận hành.

## Tài khoản demo và khôi phục dữ liệu

**Tài khoản demo.** Đăng nhập bằng SĐT, OTP mô phỏng luôn là `123456`. Có thể bấm tên tài khoản ở màn đăng nhập để điền sẵn số (khi Quản trị gốc đã đặt mã trình diễn thì phải nhập mã trước).

| Tài khoản | SĐT | Vai trò |
|---|---|---|
| Khách hàng mẫu 1 | 0900 000 001 | Khách hàng (có tài khoản nhận hoàn, có 1 đơn mẫu Chờ xác nhận) |
| Khách hàng mẫu 2 | 0900 000 002 | Khách hàng (có 1 đơn mẫu Đã giao) |
| HTX mẫu Bắc Hà | 0900 000 101 | HTX (mứt / ô mai mận, phở hồng, mận tươi đặt trước; có 1 đơn mẫu Chờ xác nhận) |
| HTX mẫu Mường Khương | 0900 000 102 | HTX (gạo Séng Cù; có 1 đơn mẫu Đã giao) |
| HTX mẫu Suối Giàng | 0900 000 103 | HTX (chè Shan tuyết) |
| HTX mẫu Sa Pa | 0900 000 104 | HTX (thảo quả khô) |
| HTX mẫu Bảo Hà | 0900 000 105 | HTX (mật ong Thanh Xuân) |
| HTX mẫu Tú Lệ | 0900 000 106 | HTX (cốm Tú Lệ, đặt trước) |
| HTX mẫu Thác Bà | 0900 000 107 | HTX (bưởi Đại Minh, đặt trước) |
| Admin – Vận hành (mẫu) | 0900 000 201 | Admin – Vận hành |
| Admin – Chất lượng (mẫu) | 0900 000 202 | Admin – Chất lượng |
| Admin – CSKH (mẫu) | 0900 000 203 | Admin – CSKH |
| Admin – Tài chính (mẫu) | 0900 000 204 | Admin – Tài chính |
| Quản trị gốc (mẫu) | 0900 000 209 | Quản trị gốc |
| Cơ quan QLNN (mẫu) | 0900 000 301 | Cơ quan QLNN (chỉ xem) |
| Shipper mẫu 1 | 0900 000 401 | Giao vận (Shipper) |
| Shipper mẫu 2 | 0900 000 402 | Giao vận (Shipper) |

- **Khôi phục dữ liệu mẫu:** đăng nhập Quản trị gốc (0900 000 209) hoặc Admin – Vận hành (0900 000 201), bấm "Công cụ demo" ở góc phải thanh trên cùng, rồi bấm "Khôi phục dữ liệu mẫu" (từ Giai đoạn 7, tài khoản khác và người chưa đăng nhập không thấy nút này). Thao tác này xoá dữ liệu trong `localStorage` (khoá `dac-san-so-lao-cai:data`), nạp lại dữ liệu mẫu và đưa đồng hồ demo về giờ thật; mã trình diễn giữ nguyên. Khi đang dùng API dữ liệu chung, thao tác áp dụng cho mọi máy.
- **Ẩn danh sách tài khoản demo khi đem demo cho người ngoài:** đăng nhập Quản trị gốc → Tham số → mục "NEW-01 Mã trình diễn" → nhập mã → "Đặt mã". Máy trình diễn nhập mã ở màn đăng nhập để hiện lại danh sách. Bỏ mã ở cùng chỗ. Xem mục Giai đoạn 7.
