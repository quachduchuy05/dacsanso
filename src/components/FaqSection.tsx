import {useStore} from '../store/AppDataContext';
export function FaqSection(){
  const {state}=useStore();
  const questions=[
    ['Ứng dụng giao hàng ở đâu?','Giai đoạn hiện tại phục vụ các địa chỉ Hà Nội có trong danh mục giao hàng. Địa chỉ chung cư cần đủ tòa và căn hộ.'],
    ['Mua sẵn và đặt trước khác nhau thế nào?',`Mua sẵn sử dụng hàng còn trong kho. Đặt trước chọn ngày giao trong lịch đã công bố và trả cọc theo tỷ lệ đang áp dụng (${state.params.depositPercent}%). Số tiền và điều kiện cụ thể được chốt tại màn Đặt hàng.`],
    ['Tôi thanh toán bằng cách nào?',`Hàng mua sẵn có thể dùng COD nếu đủ điều kiện hoặc online khi cổng đã được kết nối. Cọc đặt trước trả online. Giao dịch chờ thanh toán được giữ hàng trong ${state.params.paymentHoldMinutes} phút; thử lại không gia hạn thời gian.`],
    ['Tôi có thể hủy đơn không?','Mở chi tiết đơn để xem thao tác được phép theo trạng thái. Đơn đang giao không thể hủy trực tiếp. Đơn đã chuẩn bị có thể cần HTX xử lý yêu cầu; điều kiện cọc của đơn đặt trước hiển thị trên đơn.'],
    ['Làm sao khi hàng có vấn đề?','Mở chi tiết đơn hoặc mục Khiếu nại để chọn sản phẩm, lý do, mô tả và ảnh bằng chứng. Hạn yêu cầu được hiển thị trên đơn; CSKH tiếp nhận và kết luận theo chính sách của đơn.'],
    ['Chứng nhận và QR có ý nghĩa gì?','Ứng dụng hiển thị hồ sơ do Admin – Chất lượng đối chiếu. Bạn có thể xem số, nơi cấp, hiệu lực và link truy xuất do HTX cung cấp; ứng dụng không tự cấp chứng nhận.'],
  ];
  return <section id="shop-help" className="shop-section shop-container" aria-labelledby="faq-heading"><h2 id="faq-heading" className="mb-4 text-2xl font-semibold">Câu hỏi thường gặp</h2><div className="space-y-2">{questions.map(([question,answer])=><details className="rounded-xl border bg-white p-4" key={question}><summary className="min-h-11 cursor-pointer font-semibold">{question}</summary><p className="pt-2 leading-relaxed text-stone-600">{answer}</p></details>)}</div></section>;
}
