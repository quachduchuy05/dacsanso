import {useEffect,useState,type ReactNode} from 'react';
import {api} from '../../store/backend';
import {useStore} from '../../store/AppDataContext';
import {defaultVariant,familyKey} from '../../domain/variants';
import type {Product} from '../../domain/types';
import {useStorefront} from '../../app/StorefrontContext';
export function FeaturedCollections({renderRail}:{renderRail:(products:Product[],label:string)=>ReactNode}){
  const {state}=useStore();const {collections:items}=useStorefront();
  return <>{[['season','Đang vào vụ'],['bestseller','Bán chạy'],['gifts','Quà biếu']].map(([key,label])=>{const products=items.filter(i=>i.topics.some(t=>t.key===key)).sort((a,b)=>a.topics.find(t=>t.key===key)!.order-b.topics.find(t=>t.key===key)!.order).map(i=>{const p=defaultVariant(state,state.products.find(p=>familyKey(p)===i.productId&&p.status==='active'));return p?{...p,image:i.poster}:null;}).filter((p):p is NonNullable<typeof p>=>!!p);return products.length>0&&<section className="phase2-collection" key={key} aria-label={label}><div className="signature-heading"><h2>{label}</h2><p>Chọn theo phong vị của bạn</p></div>{renderRail(products,label)}</section>;})}</>;
}
