import {useState,type ReactNode} from 'react';
import {useStore} from '../../store/AppDataContext';
import {defaultVariant,familyKey} from '../../domain/variants';
import type {Product} from '../../domain/types';
import {useStorefront} from '../../app/StorefrontContext';
export function FeaturedCollections({renderRail}:{renderRail:(products:Product[],label:string)=>ReactNode}){
  const {state}=useStore();const {collections:items}=useStorefront();const [selected,setSelected]=useState('season');
  const collections=[['season','Đang vào vụ'],['bestseller','Được chọn nhiều'],['gifts','Dành để trao tặng']].map(([key,label])=>({key,label,products:items.filter(i=>i.topics.some(t=>t.key===key)).sort((a,b)=>a.topics.find(t=>t.key===key)!.order-b.topics.find(t=>t.key===key)!.order).map(i=>{const p=defaultVariant(state,state.products.find(p=>familyKey(p)===i.productId&&p.status==='active'));return p?{...p,image:i.poster}:null;}).filter((p):p is NonNullable<typeof p>=>!!p)})).filter(c=>c.products.length>0);
  const current=collections.find(c=>c.key===selected)??collections[0];if(!current)return null;
  return <section className="phase2-collection editorial-collection" aria-label="Tuyển tập theo nhu cầu"><div className="signature-heading"><div><p className="signature-kicker">CHỌN THEO CÁCH CỦA BẠN</p><h2>Những thức quà đúng ý.</h2></div><div className="editorial-collection-tabs" role="group" aria-label="Chọn tuyển tập">{collections.map(c=><button key={c.key} aria-pressed={current.key===c.key} onClick={()=>setSelected(c.key)}>{c.label}</button>)}</div></div><div key={current.key}>{renderRail(current.products,current.label)}</div></section>;
}
