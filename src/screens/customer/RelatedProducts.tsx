import {ArrowUpRight} from 'lucide-react';
import {useStore} from '../../store/AppDataContext';
import {useUi} from '../../app/UiContext';
import {ProductImage} from '../../components/ProductImage';
import {groupFamilies,familyKey} from '../../domain/variants';
import {remainingFor} from '../../domain/state';
import {isOrderableIn} from '../../domain/cart';
import {formatMoney} from '../../domain/pricing';
import type {Product} from '../../domain/types';
import {useStorefront} from '../../app/StorefrontContext';
export function RelatedProducts({product}:{product:Product}){
  const {state}=useStore();const {openModal}=useUi();
  const {productPosters}=useStorefront();
  const products=groupFamilies(state.products.filter(p=>p.status==='active'&&familyKey(p)!==familyKey(product)))
    .map(family=>family.find(p=>isOrderableIn(state,p)&&remainingFor(state,p)>0)??family[0])
    .sort((a,b)=>Number(b.category===product.category)-Number(a.category===product.category)||Number(b.coopId===product.coopId)-Number(a.coopId===product.coopId)).slice(0,3);
  if(!products.length)return null;
  return <section className="related-products" aria-label="Sản phẩm liên quan"><p className="signature-kicker">CÓ THỂ BẠN CŨNG THÍCH</p><h3>Thêm một vị để nhớ.</h3>{products.map(p=><button key={p.id} onClick={()=>openModal({type:'product_detail',productId:p.id,listContext:products.map(p=>p.id)})} className="related-product"><ProductImage product={{...p,image:productPosters[familyKey(p)]??p.image}} variant="thumb" className="related-product-image"/><span><strong>{p.name}</strong><small>{p.region} · {p.unit}</small><span>{formatMoney(p.price)}</span></span><ArrowUpRight size={18}/></button>)}</section>;
}
