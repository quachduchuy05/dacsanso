import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import { useUi } from './UiContext';
type Section = 'home' | 'products' | 'regions' | 'about' | 'journal' | 'contact';
interface StorefrontValue {
    query: string;
    setQuery: (query: string) => void;
    goTo: (section: Section) => void;
    catalog: boolean;
    openCatalog: () => void;
}
const Context = createContext<StorefrontValue | null>(null);
export function StorefrontProvider({ children }: {
    children: ReactNode;
}) {
    const [query, setQuery] = useState(()=>{try{return sessionStorage.getItem('dac-san-so-lao-cai:query')??'';}catch{return '';}});
    useEffect(()=>{try{sessionStorage.setItem('dac-san-so-lao-cai:query',query);}catch{}},[query]);
    const [catalog,setCatalog]=useState(window.location.pathname==='/san-pham');
    useEffect(()=>{const sync=()=>setCatalog(window.location.pathname==='/san-pham');window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
    const { setCustomerTab } = useUi();
    const openCatalog=useCallback(()=>{window.dispatchEvent(new Event('browse-catalog'));history.pushState(null,'','/san-pham');setCatalog(true);setCustomerTab('explore');window.scrollTo({top:0});},[setCustomerTab]);
    const goTo = useCallback((section: Section) => {
        setCustomerTab('explore');
        window.dispatchEvent(new Event('browse-catalog'));
        if(window.location.pathname==='/san-pham')history.pushState(null,'','/');
        setCatalog(false);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (section === 'home')
                window.scrollTo({ top: 0, behavior: 'smooth' });
            else
                document.getElementById(`shop-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }));
    }, [setCustomerTab]);
    return <Context.Provider value={{ query, setQuery, goTo, catalog, openCatalog }}>{children}</Context.Provider>;
}
export function useStorefront() { const value = useContext(Context); if (!value)
    throw new Error('Thiếu StorefrontProvider'); return value; }
