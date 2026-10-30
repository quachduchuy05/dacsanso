import {useState} from 'react';
import {useStore} from '../../store/AppDataContext';
import {useUi} from '../../app/UiContext';
import {coopUpdateStock} from '../../store/commands/productChanges';
import {ProductImage} from '../../components/ProductImage';
import {Input,SecondaryButton} from '../../components/form';
import {PRODUCT_STATUS_LABEL,type Product} from '../../domain/types';
import {formatMoney} from '../../domain/pricing';

export function CoopProductsTab(){
  const {state}=useStore(),{coopId}=useUi();
  return <div className="space-y-3"><p className="rounded-xl border bg-white p-3 text-sm">Admin – Chất lượng quản lý nội dung, giá và chứng nhận. HTX cập nhật tồn kho và báo thu hoạch; cần sửa hồ sơ sản phẩm hãy liên hệ Admin.</p><div className="grid gap-3 xl:grid-cols-2">{state.products.filter(p=>p.coopId===coopId).map(product=><StockCard key={product.id} product={product}/>)}</div></div>;
}
function StockCard({product}:{product:Product}){
  const {run}=useStore(),{coopActor,openModal,showToast}=useUi();const [stock,setStock]=useState(String(product.stockOnHand)),[busy,setBusy]=useState(false);
  return <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex gap-3"><ProductImage product={product} className="h-16 w-16 rounded"/><div><h3 className="font-semibold">{product.name}</h3><p className="text-sm">{product.unit} · {formatMoney(product.price)}</p><p className="text-sm">{PRODUCT_STATUS_LABEL[product.status]}</p></div></div>
    {product.kind==='ready'?<div className="flex items-end gap-2"><label className="flex-1 text-sm">Tồn kho<Input aria-label={'Tồn kho '+product.name+' '+product.unit} type="number" min={0} value={stock} onChange={e=>setStock(e.target.value)}/></label><SecondaryButton disabled={busy} onClick={async()=>{setBusy(true);try{const r=await run((s,at)=>coopUpdateStock(s,product.id,coopActor,Number(stock),at));showToast(r.ok?'Đã cập nhật tồn kho.':r.error);}finally{setBusy(false);}}}>Lưu tồn kho</SecondaryButton></div>:<SecondaryButton onClick={()=>openModal({type:'coop_harvest',productId:product.id})}>Báo thu hoạch</SecondaryButton>}
    <SecondaryButton onClick={()=>openModal({type:'trace_lot',productId:product.id})}>Xem nguồn gốc và lô hàng</SecondaryButton>
  </section>;
}
