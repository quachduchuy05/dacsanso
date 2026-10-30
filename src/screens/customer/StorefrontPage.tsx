import { useMemo, useState } from 'react';
import {FaqSection} from '../../components/FaqSection';
import { ArrowDown, ArrowRight, ArrowUpRight, CheckCheck, ChevronDown, Headphones, Heart, Leaf, MapPin, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, SlidersHorizontal, Sprout, Star, Truck, X } from 'lucide-react';
import { useStorefront } from '../../app/StorefrontContext';
import { useUi } from '../../app/UiContext';
import { useStore } from '../../store/AppDataContext';
import { AppImage } from '../../components/AppImage';
import { ProductImage } from '../../components/ProductImage';
import { BottomSheet } from '../../components/BottomSheet';
import { familyPrice, familyRating, inPriceRange, parsePriceInput, sortProducts, type SortKey } from '../../domain/marketplace';
import { isOrderableIn } from '../../domain/cart';
import { formatMoney } from '../../domain/pricing';
import { regionsOf, remainingFor } from '../../domain/state';
import { matchesSearch } from '../../domain/text';
import { familyKey, groupFamilies, listedFamilyOf } from '../../domain/variants';
import { CATEGORY_LABEL, type Category, type Product } from '../../domain/types';
import { useCartActions } from './useCartActions';
import { useMarketplace } from './useMarketplace';
const IMAGE = '/images/stitch/';
const REGIONS = [
    { name: 'Bắc Hà', subtitle: 'HƯƠNG VỊ VÙNG CAO', text: 'Theo dấu mùa mận, tìm về hương vị mộc mạc nơi cao nguyên trắng.', image: 'region-1.jpg' },
    { name: 'Sa Pa', subtitle: 'TRONG LÀN SƯƠNG NÚI', text: 'Khám phá những thức quà được nuôi dưỡng bởi đất trời và sương sớm.', image: 'region-2.jpg' },
    { name: 'Mường Khương', subtitle: 'ĐẬM ĐÀ BẢN SẮC', text: 'Gói ghém phong vị núi rừng trong từng sản vật của người bản địa.', image: 'region-2.jpg' },
    { name: 'Suối Giàng', subtitle: 'MIỀN CHÈ CỔ THỤ', text: 'Chậm một nhịp, thưởng vị chè thanh từ những tán cây giữa mây ngàn.', image: 'region-4.jpg' },
    { name: 'Tú Lệ', subtitle: 'HƯƠNG THƠM MÙA LÚA', text: 'Từ cánh đồng xanh đến những hạt nếp dẻo thơm, ngọt lành.', image: 'region-1.jpg' },
    { name: 'Thác Bà', subtitle: 'MÓN QUÀ TỪ THIÊN NHIÊN', text: 'Gặp những sản vật địa phương và câu chuyện của người gìn giữ.', image: 'region-5.jpg' },
];
const STORIES = [
    { image: 'story-1.jpg', category: 'CON NGƯỜI & NGHỀ TRUYỀN THỐNG', title: 'Gặp những người gìn giữ hương chè trên núi cao', text: 'Đằng sau một chén chè là sự chăm chút, kinh nghiệm và tình yêu dành cho mảnh đất quê hương.', content: 'Từ những búp chè trên vùng núi cao đến từng công đoạn chế biến, mỗi hợp tác xã mang theo một câu chuyện riêng. Trên Đặc Sản Số, bạn có thể mở trang sản phẩm để xem thông tin vùng sản xuất, hợp tác xã và những chứng nhận đã được xác minh. Hãy bắt đầu từ một món đặc sản quen thuộc để tìm hiểu người làm ra nó.' },
    { image: 'story-2.jpg', category: 'NÔNG SẢN & MÙA VỤ', title: 'Mỗi mùa đi qua, một hương vị ở lại', text: 'Chọn nông sản theo mùa để cảm nhận sự tươi mới và nhịp sống của những miền đất lành.', content: 'Nông sản có nhịp điệu riêng của thiên nhiên. Với những sản phẩm mở đặt trước, bạn có thể chọn ngày giao trong khoảng hợp tác xã công bố và xem rõ chính sách thanh toán trước khi đặt. Mục Vụ mùa giúp bạn theo dõi những đợt hàng đang mở và lưu sản phẩm để được thông báo khi vào mùa.' },
    { image: 'story-3.jpg', category: 'VĂN HÓA & ẨM THỰC', title: 'Đặc sản — chiếc cầu nối những người yêu quê', text: 'Một món quà nhỏ, một bữa cơm ấm, một cách để đưa hương vị quê nhà đến gần hơn.', content: 'Một món đặc sản không chỉ có hương vị. Đó còn là ký ức, cách làm và sự gắn bó của người dân với quê hương. Khi chọn mua, bạn có thể trao đổi trực tiếp với hợp tác xã qua hộp tin nhắn của sản phẩm, xem mô tả và lựa chọn quy cách phù hợp cho bữa ăn hoặc món quà của mình.' },
];
export function StorefrontPage() {
    const { state, demoMode } = useStore();
    const { query, setQuery, goTo } = useStorefront();
    const { setCustomerTab, openModal, user } = useUi();
    const [region, setRegion] = useState(''), [category, setCategory] = useState<Category | 'all'>('all'), [sort, setSort] = useState<SortKey>('relevant');
    const [filters, setFilters] = useState(false), [minimum, setMinimum] = useState(''), [maximum, setMaximum] = useState('');
    const [story, setStory] = useState<typeof STORIES[number] | null>(null), [policy, setPolicy] = useState<string | null>(null);
    const listed = state.products.filter(p => p.status === 'active');
    const families = useMemo(() => groupFamilies(listed).map(items => items.find(p => isOrderableIn(state, p) && remainingFor(state, p) > 0) ?? items[0]), [state]);
    const visible = sortProducts(state, families.filter(p => (!region || regionsOf(p).includes(region)) && (category === 'all' || p.category === category) && matchesSearch(query, [p.name, p.region, p.unit, CATEGORY_LABEL[p.category], state.coops.find(c => c.id === p.coopId)?.name]) && inPriceRange(familyPrice(state, p), parsePriceInput(minimum), parsePriceInput(maximum))), sort);
    const filtered = !!query.trim() || !!region || category !== 'all' || !!minimum || !!maximum;
    const activeCoops = state.coops.filter(c => c.status === 'active').length;
    const clear = () => { setQuery(''); setRegion(''); setCategory('all'); setMinimum(''); setMaximum(''); };
    const selectRegion = (value: string) => { setRegion(value === 'Thác Bà' ? 'Vùng hồ Thác Bà' : value); setQuery(''); setCategory('all'); setMinimum(''); setMaximum(''); goTo('products'); };
    const reviews = state.reviews.filter(r => r.status === 'visible' && r.comment?.trim()).slice(0, 3);
    const learn = () => setPolicy('Hành trình từ miền đất lành');
    return <div className="shop-page">
    <section className="shop-hero" id="shop-home" aria-labelledby="shop-hero-title">
      <AppImage className="shop-hero-photo" src={state.homepage?.image||IMAGE + 'specialties-hero-v2.jpg'} alt="Chè, mật ong, thịt gác bếp, gạo nếp và quà đặc sản trên bàn gỗ, ảnh minh họa" fetchPriority="high"/>
      <div className="shop-hero-shade"/>
      <div className="shop-hero-content shop-container">
        <span className="shop-hero-eyebrow"><Leaf size={14}/> TINH HOA TỪ MIỀN ĐẤT LÀNH</span>
        <h1 id="shop-hero-title">{state.homepage?.title??'Tinh hoa đặc sản Việt.'}<br /><em>{state.homepage?.subtitle??'Gói trọn hương vị quê hương.'}</em></h1>
        <p>{state.homepage?.description??<>Khám phá những thức quà nguyên bản từ các hợp tác xã vùng cao.<br className="shop-desktop-break"/> Một chút tinh tuý của đất trời, một chút ấm áp gửi đến bạn.</>}</p>
        <div className="shop-hero-buttons"><button className="shop-button shop-button-sage" onClick={() => goTo('products')}>Khám phá đặc sản <ArrowRight size={17}/></button><button className="shop-button shop-button-outline" onClick={() => goTo('about')}>Về chúng tôi <ArrowUpRight size={16}/></button></div>
        <div className="shop-hero-stats"><div><strong>{String(families.length).padStart(2, '0')}</strong><span>Đặc sản chọn lọc</span></div><div><strong>{String(activeCoops).padStart(2, '0')}</strong><span>Hợp tác xã đồng hành</span></div><div><strong><Sprout size={24}/></strong><span>Gắn kết với nguồn cội</span></div></div>
      </div>
      <button className="shop-hero-scroll" onClick={() => goTo('regions')} aria-label="Khám phá các vùng đặc sản"><ArrowDown size={18}/></button>
    </section>

    <section className="shop-section shop-regions" id="shop-regions" aria-labelledby="shop-regions-title"><div className="shop-container">
      <div className="shop-section-heading"><div><p className="shop-eyebrow">VÙNG MIỀN HỘI TỤ</p><h2 id="shop-regions-title">Khám phá hương vị vùng cao</h2></div><p>Mỗi miền đất là một câu chuyện.<br />Mỗi đặc sản là một phần hồn quê được gìn giữ.</p></div>
      <div className="shop-region-grid">{REGIONS.map((item, index) => <button className="shop-region-card" key={item.name} onClick={() => selectRegion(item.name)} aria-label={`Khám phá đặc sản ${item.name}`}><img src={IMAGE + item.image} alt="Phong cảnh thiên nhiên và cuộc sống địa phương, ảnh minh hoạ" loading="lazy"/><span className="shop-region-gradient"/><span className="shop-region-number">0{index + 1}</span><span className="shop-region-copy"><span>{item.subtitle}</span><h3>{item.name}</h3><p>{item.text}</p></span><span className="shop-region-arrow"><ArrowUpRight size={19}/></span></button>)}</div>
    </div></section>

    <section className="shop-section shop-products" id="shop-products" aria-labelledby="shop-products-title"><div className="shop-container">
      <div className="shop-section-heading"><div><p className="shop-eyebrow">TUYỂN CHỌN ĐẶC BIỆT</p><h2 id="shop-products-title">Sản phẩm nổi bật</h2></div><div className="shop-category-tabs" role="group" aria-label="Danh mục sản phẩm">{(['all', 'dry', 'processed', 'fresh'] as const).map(key => <button key={key} className={category === key ? 'is-active' : ''} onClick={() => setCategory(key)}>{key === 'all' ? 'Tất cả' : CATEGORY_LABEL[key]}</button>)}</div></div>
      <div className="shop-product-tools"><span>{filtered ? `${visible.length} đặc sản phù hợp` : `${visible.length} thức quà từ những miền đất lành`}</span><div><button className={filters ? 'is-active' : ''} onClick={() => setFilters(!filters)} aria-expanded={filters}><SlidersHorizontal size={15}/> Bộ lọc</button><label><span className="sr-only">Sắp xếp sản phẩm</span><select value={sort} onChange={e => setSort(e.target.value as SortKey)}><option value="relevant">Gợi ý cho bạn</option><option value="price_asc">Giá thấp đến cao</option><option value="price_desc">Giá cao đến thấp</option><option value="rating">Đánh giá cao nhất</option></select><ChevronDown size={14}/></label></div></div>
      {filters && <div className="shop-filter-panel"><label>Vùng sản xuất<select value={region} onChange={e => setRegion(e.target.value)}><option value="">Mọi vùng</option>{[...new Set(listed.flatMap(regionsOf))].sort().map(value => <option key={value}>{value}</option>)}</select></label><label>Giá từ<input aria-label="Giá từ (đồng)" inputMode="numeric" placeholder="Không giới hạn" value={minimum} onChange={e => setMinimum(e.target.value.replace(/[^\d]/g, ''))}/></label><label>Giá đến<input aria-label="Giá đến (đồng)" inputMode="numeric" placeholder="Không giới hạn" value={maximum} onChange={e => setMaximum(e.target.value.replace(/[^\d]/g, ''))}/></label><button onClick={clear}><X size={15}/> Xoá bộ lọc</button></div>}
      {filtered && <div className="shop-applied-filters">{query && <span>Tìm “{query}”</span>}{region && <span><MapPin size={12}/>{region}</span>}<button onClick={clear}>Xem tất cả <X size={13}/></button></div>}
      <div className="shop-product-grid">{visible.map(product => <StorefrontProductCard key={familyKey(product)} product={product}/>)}</div>
      {!!state.homepage?.featuredProductIds.length&&<section className="mt-6"><h2 className="mb-4 text-xl font-semibold">{state.homepage.collectionTitle}</h2><div className="shop-product-grid">{state.homepage.featuredProductIds.map(id=>state.products.find(p=>p.id===id&&p.status==='active')).filter((p):p is NonNullable<typeof p>=>!!p).map(product=><StorefrontProductCard key={product.id} product={product}/>)}</div></section>}
      {visible.length === 0 && <div className="shop-empty"><Leaf size={32}/><h3>Chưa tìm thấy đặc sản phù hợp</h3><p>Thử một tên khác hoặc khám phá những món quà đang có trên sàn.</p><button className="shop-button shop-button-dark" onClick={clear}>Khám phá tất cả <ArrowRight size={16}/></button></div>}
      <div className="shop-catalog-footer"><span><Leaf size={15}/> Chọn từ nguồn gốc. Gửi bằng sự chân thành.</span><button onClick={() => setCustomerTab('season')}>Khám phá đặc sản theo mùa <ArrowUpRight size={16}/></button></div>
    </div></section>

    <section className="shop-section shop-about" id="shop-about" aria-labelledby="shop-about-title"><div className="shop-container shop-about-grid"><div className="shop-farmer-image"><img src={IMAGE + 'farmer.jpg'} alt="Người nông dân chăm chút cho những sản vật địa phương" loading="lazy"/><div className="shop-farmer-note"><span>“</span><p>Món quà quý nhất của chúng tôi<br />là sự nguyên bản và chân thành.</p><Leaf size={27}/></div></div><div className="shop-about-copy"><p className="shop-eyebrow">VỀ ĐẶC SẢN SỐ</p><h2 id="shop-about-title">Kết nối những miền quê.<br /><em>Lan toả giá trị nguyên bản.</em></h2><p>Đặc Sản Số ra đời với mong muốn đưa những hương vị mộc mạc từ các miền đất lành đến gần hơn với bạn. Chúng tôi trân trọng bàn tay người làm ra sản vật và tin rằng mỗi món quà đều xứng đáng được kể câu chuyện của mình.</p><div className="shop-about-values"><div><Sprout size={20}/><h3>Từ những hợp tác xã</h3><p>Biết nơi sản xuất, hiểu hơn về người làm ra từng thức quà.</p></div><div><ShieldCheck size={20}/><h3>Minh bạch để an tâm</h3><p>Thông tin sản phẩm, chứng nhận và chính sách được thể hiện rõ ràng.</p></div></div><button className="shop-button shop-button-dark" onClick={learn}>Tìm hiểu câu chuyện của chúng tôi <ArrowRight size={16}/></button></div></div></section>

    <section className="shop-section shop-promises" aria-labelledby="shop-promises-title"><div className="shop-container"><div className="shop-centered-heading"><p className="shop-eyebrow">GIÁ TRỊ CHÚNG TÔI GÌN GIỮ</p><h2 id="shop-promises-title">Từ sự tử tế, đến sự an tâm</h2></div><div className="shop-promise-grid">{[
            { Icon: ShieldCheck, title: 'Nguồn gốc rõ ràng', text: 'Tìm hiểu vùng sản xuất và hợp tác xã phía sau mỗi món đặc sản.' },
            { Icon: PackageCheck, title: 'Tuyển chọn cẩn thận', text: 'Thông tin sản phẩm được kiểm duyệt trước khi đến với người mua.' },
            { Icon: Truck, title: 'Giao hàng tại Hà Nội', text: 'Chọn cách giao phù hợp, theo dõi đơn hàng qua từng chặng.' },
            { Icon: Headphones, title: 'Hỗ trợ tận tâm', text: 'Trao đổi trực tiếp với hợp tác xã và gửi yêu cầu hỗ trợ khi cần.' },
        ].map(({ Icon, title, text }) => <article key={title} className="shop-promise-card"><span><Icon size={23} strokeWidth={1.5}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section className="shop-section shop-reviews" aria-labelledby="shop-reviews-title"><div className="shop-container"><div className="shop-centered-heading"><p className="shop-eyebrow">KHÁCH HÀNG NÓI GÌ</p><h2 id="shop-reviews-title">Những lời nhắn gửi chân thành</h2></div><div className="shop-review-grid">{reviews.length > 0 ? reviews.map((review, index) => <article key={review.id} className="shop-review-card"><div className="shop-rating" aria-label={`${review.stars} trên 5 sao`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} fill={i < review.stars ? 'currentColor' : 'none'}/>)}</div><blockquote>“{review.comment}”</blockquote><div className="shop-review-person"><img src={IMAGE + `avatar-${index + 1}.jpg`} alt="Ảnh đại diện minh hoạ" loading="lazy"/><div><strong>Khách hàng đã mua</strong><span><CheckCheck size={12}/> {demoMode ? 'Đánh giá trong dữ liệu mẫu' : 'Đơn hàng đã hoàn tất'}</span></div></div></article>) : <div className="shop-review-placeholder"><Heart size={26}/><p>Mỗi trải nghiệm của bạn là một phần câu chuyện của chúng tôi.</p><button onClick={() => goTo('products')}>Tìm món đặc sản yêu thích <ArrowRight size={15}/></button></div>}</div></div></section>

    <section className="shop-section shop-journal" id="shop-journal" aria-labelledby="shop-journal-title"><div className="shop-container"><div className="shop-section-heading"><div><p className="shop-eyebrow">GÓC VĂN HOÁ</p><h2 id="shop-journal-title">Từ miền đất lành, những câu chuyện</h2></div><button className="shop-text-link" onClick={() => setStory(STORIES[0])}>Ghé đọc cùng chúng tôi <ArrowRight size={16}/></button></div><div className="shop-journal-grid">{STORIES.map(item => <article className="shop-story-card" key={item.title}><button onClick={() => setStory(item)} aria-label={`Đọc: ${item.title}`}><img src={IMAGE + item.image} alt="Câu chuyện về con người, nông sản và nghề truyền thống" loading="lazy"/></button><div className="shop-story-copy"><p className="shop-eyebrow">{item.category}</p><h3><button onClick={() => setStory(item)}>{item.title}</button></h3><p>{item.text}</p><button className="shop-text-link" onClick={() => setStory(item)}>Đọc câu chuyện <ArrowRight size={15}/></button></div></article>)}</div></div></section>

    <FaqSection/><footer className="shop-footer" id="shop-contact"><div className="shop-container"><div className="shop-footer-grid"><div className="shop-footer-brand"><span><Sprout size={24}/> Đặc Sản Số</span><p>Mang hương vị tinh hoa từ những miền đất lành đến ngôi nhà của bạn, cùng sự trân trọng dành cho con người và nguồn cội.</p><div><Leaf size={16}/><span>Từ những hợp tác xã vùng cao Lào Cai</span></div></div><div><h3>Khám phá cùng chúng tôi</h3><button onClick={() => goTo('about')}>Về Đặc Sản Số</button><button onClick={() => goTo('products')}>Sản phẩm chọn lọc</button><button onClick={() => setCustomerTab('season')}>Đặc sản theo mùa</button><button onClick={() => goTo('journal')}>Câu chuyện vùng miền</button></div><div><h3>Thông tin & hỗ trợ</h3>{['Chính sách đổi trả', 'Thông tin vận chuyển', 'Bảo mật thông tin'].map(title => <button key={title} onClick={() => setPolicy(title)}>{title}</button>)}<button onClick={() => user ? openModal({ type: 'chat' }) : window.dispatchEvent(new Event('show-login'))}>Liên hệ hợp tác xã</button></div><div className="shop-footer-connect"><h3>Gắn kết những hương vị</h3><p>Đăng nhập để lưu món đặc sản yêu thích và theo dõi mùa vụ mới.</p><button className="shop-button shop-button-sage" onClick={() => user ? openModal({ type: 'favorites' }) : window.dispatchEvent(new Event('show-login'))}>{user ? 'Đặc sản tôi yêu thích' : 'Đồng hành cùng chúng tôi'} <ArrowUpRight size={16}/></button></div></div><div className="shop-footer-bottom"><span>© {new Date().getFullYear()} Đặc Sản Số. Trân trọng từng hương vị.</span><span><Sprout size={13}/> Gói một chút quê hương, gửi một chút thương.</span>{demoMode && <button onClick={() => openModal({ type: 'demo_panel' })}>Công cụ demo</button>}</div></div></footer>
    {story && <BottomSheet title={story.title} onClose={() => setStory(null)}><div className="shop-article"><img src={IMAGE + story.image} alt="Ảnh minh hoạ câu chuyện"/><p className="shop-eyebrow">{story.category}</p><p>{story.content}</p><button className="shop-button shop-button-dark" onClick={() => { setStory(null); goTo('products'); }}>Khám phá đặc sản <ArrowRight size={16}/></button></div></BottomSheet>}
    {policy && <BottomSheet title={policy} onClose={() => setPolicy(null)}><div className="shop-article"><p>{policy === 'Hành trình từ miền đất lành' ? 'Chúng tôi kết nối người mua với các hợp tác xã vùng cao Lào Cai, để những sản vật địa phương được biết đến bằng chính nguồn gốc và câu chuyện của mình. Bạn có thể tìm hiểu hợp tác xã ở từng sản phẩm, xem thông tin chứng nhận đã xác minh và trao đổi trước khi lựa chọn.' : policy === 'Chính sách đổi trả' ? 'Bạn có thể gửi khiếu nại từ chi tiết đơn hàng đã giao, kèm hình ảnh và lý do. Điều kiện và thời hạn áp dụng tuỳ theo loại sản phẩm và chính sách được chốt trong đơn. Bộ phận CSKH tiếp nhận, kiểm tra và thông báo kết quả xử lý.' : policy === 'Thông tin vận chuyển' ? 'Hiện hệ thống phục vụ giao hàng tại Hà Nội. Phí giao, điều kiện hoả tốc và ngày giao được thể hiện tại bước đặt hàng. Với sản phẩm đặt trước, bạn chọn ngày giao trong khoảng hợp tác xã công bố và xác nhận chính sách trước khi đặt.' : 'Thông tin tài khoản, địa chỉ và đơn hàng được sử dụng để phục vụ việc mua bán và giao nhận. Bạn chỉ xem dữ liệu thuộc phạm vi tài khoản của mình; thông tin cá nhân không được hiển thị trong báo cáo tổng hợp công khai.'}</p><button className="shop-button shop-button-dark" onClick={() => { setPolicy(null); goTo('products'); }}>Khám phá sản phẩm <ArrowRight size={16}/></button></div></BottomSheet>}
  </div>;
}
export function StorefrontProductCard({ product: p }: {
    product: Product;
}) {
    const { state } = useStore();
    const { openModal, user } = useUi();
    const { add, cart, update, remove } = useCartActions();
    const { isFav, toggleFav } = useMarketplace();
    const [busy, setBusy] = useState(false);
    const variants = listedFamilyOf(state, p);
    const multi = variants.length > 1, price = familyPrice(state, p), rating = familyRating(state, p);
    const remaining = remainingFor(state, p), soldOut = !isOrderableIn(state, p) || remaining <= 0;
    const line = !multi ? cart.find(item => item.productId === p.id) : undefined;
    const photo = p.image ?? (p.id === 'prod-thaoqua' ? '/images/catalog/cardamom.jpg' : p.id === 'prod-che' ? IMAGE + 'tea.jpg' : p.id === 'prod-matong' ? IMAGE + 'honey.jpg' : undefined);
    const addProduct = async () => { if (multi) {
        openModal({ type: 'product_detail', productId: p.id });
        return;
    } setBusy(true); try {
        await add(p.id, 1);
    }
    finally {
        setBusy(false);
    } };
    return <article className="shop-product-card"><div className="shop-product-visual"><button className="shop-product-open" aria-label={`Xem ${p.name}`} onClick={() => openModal({ type: 'product_detail', productId: p.id })}>{photo ? <AppImage src={photo} alt={p.name} loading="lazy"/> : <ProductImage product={p} variant="card" className="shop-product-illustration"/>}</button><span className="shop-product-tag">{p.kind === 'preorder' ? 'Theo mùa' : 'Đặc sản chọn lọc'}</span><button className={`shop-product-favorite ${isFav(p) ? 'is-saved' : ''}`} aria-label={isFav(p) ? `Bỏ yêu thích ${p.name}` : `Yêu thích ${p.name}`} onClick={() => { if (!user) {
        window.dispatchEvent(new Event('show-login'));
        return;
    } void toggleFav(p.id); }}><Heart size={17} fill={isFav(p) ? 'currentColor' : 'none'}/></button>{soldOut && <span className="shop-sold-out">{p.kind === 'preorder' ? 'Chờ mùa mới' : 'Tạm hết hàng'}</span>}</div><div className="shop-product-info"><p className="shop-product-region">{p.region}</p><h3><button onClick={() => openModal({ type: 'product_detail', productId: p.id })}>{p.name}</button></h3><div className="shop-rating" aria-label={rating.average ? `${rating.average} trên 5 sao` : 'Chưa có đánh giá'}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} fill={rating.average && i < Math.round(rating.average) ? 'currentColor' : 'none'}/>)}<span>{rating.count ? `(${rating.count})` : 'Mới'}</span></div><div className="shop-product-price"><div><span>{multi ? `${variants.length} quy cách · từ` : `${p.unit}`}</span><strong>{formatMoney(price)}</strong></div>{line ? <div className="shop-card-quantity"><button aria-label={`Giảm số lượng ${p.name}`} disabled={busy} onClick={() => { void (line.quantity === 1 ? remove(p.id) : update(p.id, { quantity: line.quantity - 1 })); }}><Minus size={13}/></button><span>{line.quantity}</span><button aria-label={`Tăng số lượng ${p.name}`} disabled={busy || line.quantity >= remaining} onClick={() => { void update(p.id, { quantity: line.quantity + 1 }); }}><Plus size={13}/></button></div> : <button className="shop-add-cart" disabled={soldOut || busy} onClick={() => { void addProduct(); }} aria-label={multi ? `Chọn quy cách ${p.name}` : `Thêm ${p.name} vào giỏ`}>{busy ? <span className="shop-spinner"/> : <ShoppingBag size={17}/>}</button>}</div></div></article>;
}
