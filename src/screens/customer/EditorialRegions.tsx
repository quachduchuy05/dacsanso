import {ArrowUpRight} from 'lucide-react';
import {ProductImage} from '../../components/ProductImage';
import {regionsOf} from '../../domain/state';
import type {Product} from '../../domain/types';
import {useStorefront} from '../../app/StorefrontContext';
import {familyKey} from '../../domain/variants';
export function EditorialRegions({products,onSelect}:{products:Product[];onSelect:(region:string)=>void}){
  const {productPosters}=useStorefront();
  const regions=[...new Set(products.flatMap(regionsOf))];
  const seen=new Set<string>();
  const featured=regions.filter(region=>{const candidate=products.find(p=>regionsOf(p).includes(region)&&!seen.has(p.id));if(!candidate)return false;seen.add(candidate.id);return true;}).slice(0,3);
  return <section className="shop-container editorial-regions" id="shop-regions" aria-labelledby="editorial-regions-title">
    <div className="editorial-regions-heading"><h2 id="editorial-regions-title">Mỗi miền, một vị.</h2></div>
    <div className="editorial-region-grid">{featured.map((region,index)=>{const local=products.filter(p=>regionsOf(p).includes(region));return <button className={`editorial-region editorial-region-${index}`} key={region} onClick={()=>onSelect(region)} aria-label={`Khám phá đặc sản ${region}`}>
      <div className="editorial-region-image"><ProductImage product={{...local[0],image:productPosters[familyKey(local[0])]??local[0].image}} variant="card" className="h-full w-full"/></div>
      <span className="editorial-region-meta"><span><strong>{region}</strong><span>{local.length} sản phẩm</span></span><ArrowUpRight size={24}/></span>
    </button>;})}</div>
    {regions.length>featured.length&&<div className="editorial-region-more">{regions.filter(region=>!featured.includes(region)).map(region=><button key={region} onClick={()=>onSelect(region)}>{region}<ArrowUpRight size={14}/></button>)}</div>}
    {!regions.length&&<p className="editorial-region-empty">Những vùng sản vật sẽ xuất hiện khi danh mục được cập nhật.</p>}
  </section>;
}
