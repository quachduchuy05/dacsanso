import { useState } from 'react';
import { ArrowUpRight, Bell, LogOut, Menu, Search, ShoppingBag, Sprout, UserRound, X } from 'lucide-react';
import { useStorefront } from '../../app/StorefrontContext';
import { useUi } from '../../app/UiContext';
import { useStore } from '../../store/AppDataContext';
const LINKS = [['home', 'Trang chủ'], ['products', 'Sản phẩm'], ['regions', 'Đặc sản vùng miền'], ['about', 'Giới thiệu'], ['journal', 'Câu chuyện'], ['contact', 'Liên hệ']] as const;
export function StorefrontHeader() {
    const { query, setQuery, goTo, openCatalog } = useStorefront();
    const { user, customerActor, openModal, setCustomerTab, logout } = useUi();
    const { state } = useStore();
    const [menu, setMenu] = useState(false), [search, setSearch] = useState(false);
    const cartCount = (state.carts[customerActor.id ?? ''] ?? []).reduce((sum, line) => sum + line.quantity, 0);
    const [history,setHistory]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem('dac-san-so-lao-cai:search-history')??'[]');return Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,10):[];}catch{return [];}});
    const suggestions=[...new Set([...history,...state.products.filter(p=>p.status==='active').map(p=>p.name),...state.coops.map(c=>c.name)])].filter(s=>!query||s.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).slice(0,12);
    const saveSearch=()=>{if(!query.trim())return;const next=[query.trim(),...history.filter(h=>h!==query.trim())].slice(0,10);setHistory(next);try{localStorage.setItem('dac-san-so-lao-cai:search-history',JSON.stringify(next));}catch{}};
    const unread = state.notifications.filter(n => n.userId === user?.id && !n.read).length;
    const account = () => { setMenu(false); if (!user)
        window.dispatchEvent(new Event('show-login'));
    else {
        setCustomerTab('account');
        window.dispatchEvent(new Event('browse-catalog'));
    } };
    return <>
    <div className="shop-header-inner shop-container">
      <button className="shop-brand" onClick={() => { setQuery(''); goTo('home'); }} aria-label="Đặc Sản Số — Trang chủ"><span className="shop-brand-mark"><Sprout size={23} strokeWidth={1.7}/></span><span>Đặc Sản Số<span className="shop-brand-caption">TỪ MIỀN ĐẤT LÀNH</span></span></button>
      <nav className="shop-desktop-nav" aria-label="Điều hướng chính">{LINKS.map(([key, label]) => <button key={key} onClick={() => key==='products'?openCatalog():goTo(key)}>{label}</button>)}</nav>
      <div className="shop-header-actions">
        <form className={`shop-search ${search ? 'is-open' : ''}`} role="search" onSubmit={e => { e.preventDefault(); saveSearch(); openCatalog(); }}><input list="shop-search-suggestions" minLength={2} maxLength={100} aria-label="Tìm kiếm đặc sản" placeholder="Tìm kiếm đặc sản…" value={query} onChange={e => setQuery(e.target.value)}/><button aria-label="Tìm kiếm" type="submit"><Search size={17}/></button><datalist id="shop-search-suggestions">{suggestions.map(s=><option key={s} value={s}/>)}</datalist></form>
        <button className="shop-icon shop-search-toggle" aria-label="Mở tìm kiếm" onClick={() => setSearch(!search)}>{search ? <X size={19}/> : <Search size={19}/>}</button>
        <button className="shop-icon shop-account-icon" onClick={account} aria-label={user ? 'Tài khoản' : 'Đăng nhập'} title={user ? user.name : 'Đăng nhập'}><UserRound size={18}/></button>
        {user && <button className="shop-icon shop-notification" aria-label={`Thông báo, ${unread} chưa đọc`} onClick={() => openModal({ type: 'notifications' })}><Bell size={18}/>{unread > 0 && <span className="shop-count">{unread}</span>}</button>}
        <button className="shop-icon shop-cart-icon" aria-label={`Giỏ hàng, ${cartCount} sản phẩm`} onClick={() => openModal({ type: 'cart' })}><ShoppingBag size={20}/>{cartCount > 0 && <span className="shop-count">{cartCount}</span>}</button>
        {user && <button className="shop-icon shop-logout" onClick={() => { setCustomerTab('explore'); void logout(); }} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={17}/></button>}
        <button className="shop-icon shop-menu-toggle" onClick={() => setMenu(!menu)} aria-label={menu ? 'Đóng menu' : 'Mở menu'} aria-expanded={menu}>{menu ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>
    </div>
    {menu && <nav className="shop-mobile-menu shop-container" aria-label="Menu trên điện thoại">{LINKS.map(([key, label]) => <button key={key} onClick={() => { key==='products'?openCatalog():goTo(key); setMenu(false); }}>{label}<ArrowUpRight size={16}/></button>)}</nav>}
  </>;
}
