import {useState} from 'react';
import {ArrowUpRight,Sprout} from 'lucide-react';
import {useStorefront} from '../../app/StorefrontContext';
import {useUi} from '../../app/UiContext';
import {useStore} from '../../store/AppDataContext';
import {BottomSheet} from '../../components/BottomSheet';
export function CommerceFooter(){
  const {goTo,openCatalog}=useStorefront();const {user,openModal,setCustomerTab}=useUi();const {state}=useStore();
  const [policy,setPolicy]=useState<string|null>(null);
  const policies:Record<string,string>={
    'Giao hàng & thanh toán':`Hiện giao tại Hà Nội. Phí và ngày giao được xác nhận tại bước đặt hàng theo địa chỉ, loại hàng và cách giao. Đặt trước cọc ${state.params.depositPercent}% online; phần còn lại trả theo phương thức đã chọn. Kết quả thanh toán chỉ được ghi nhận khi hệ thống xác nhận.`,
    'Đổi trả & hỗ trợ':`Bạn có thể gửi yêu cầu trong chi tiết đơn. Thời hạn hiện tại là ${state.params.returnWindowHoursFresh} giờ với hàng tươi và ${state.params.returnWindowHoursDry} giờ với hàng khô, tính từ lúc đơn được ghi nhận đã giao. Điều kiện và kết quả xử lý được thông báo theo từng yêu cầu.`,
    'Thông tin & quyền riêng tư':'Bạn có thể quản lý thông tin, địa chỉ và yêu cầu xoá tài khoản trong mục Tài khoản. Dữ liệu đơn hàng, giao dịch và chứng từ cần lưu được giữ theo quy trình hiện hành. Không cung cấp mật khẩu, OTP hoặc thông tin thẻ trong nội dung chat.',
  };
  const account=()=>user?setCustomerTab('account'):window.dispatchEvent(new Event('show-login'));
  return <><footer className="commerce-footer" id="shop-contact"><div className="shop-container"><div className="commerce-footer-grid">
    <div className="commerce-footer-brand"><Sprout size={30} strokeWidth={1.3}/><h2>Ăn Đặc Sản</h2><p>Những thức quà có câu chuyện.<br/>Những hương vị để trở về.</p><span>TỪ MIỀN ĐẤT LÀNH</span></div>
    <nav aria-label="Khám phá cửa hàng"><h3>Khám phá</h3><button onClick={openCatalog}>Tất cả đặc sản <ArrowUpRight size={15}/></button><button onClick={()=>goTo('regions')}>Theo vùng miền <ArrowUpRight size={15}/></button><button onClick={()=>setCustomerTab('season')}>Theo nhịp mùa vụ <ArrowUpRight size={15}/></button><button onClick={()=>goTo('about')}>Câu chuyện của chúng tôi <ArrowUpRight size={15}/></button></nav>
    <nav aria-label="Hỗ trợ mua hàng"><h3>Luôn sẵn lòng hỗ trợ</h3>{Object.keys(policies).map(title=><button key={title} onClick={()=>setPolicy(title)}>{title}<ArrowUpRight size={15}/></button>)}<button onClick={()=>user?openModal({type:'chat'}):account()}>Liên hệ & trao đổi <ArrowUpRight size={15}/></button></nav>
    <div><h3>Dành riêng cho bạn</h3><p>Lưu món yêu thích, theo dõi đơn và tìm lại hương vị quen.</p><button className="commerce-footer-account" onClick={account}>{user?'Tài khoản của bạn':'Đăng nhập'}<ArrowUpRight size={16}/></button><button onClick={()=>openModal({type:'cart'})}>Mở giỏ hàng <ArrowUpRight size={15}/></button></div>
  </div><div className="commerce-footer-bottom"><span>© {new Date().getFullYear()} Ăn Đặc Sản</span><span>Gìn giữ hương vị. Kết nối con người.</span></div></div></footer>
  {policy&&<BottomSheet title={policy} onClose={()=>setPolicy(null)}><p className="text-sm leading-relaxed">{policies[policy]}</p></BottomSheet>}</>;
}
