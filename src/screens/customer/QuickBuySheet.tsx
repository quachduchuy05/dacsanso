import {useState} from 'react';
import {BottomSheet} from '../../components/BottomSheet';
import {VariantPicker} from '../../components/VariantPicker';
import {QuantityStepper} from '../../components/QuantityStepper';
import {ProductImage} from '../../components/ProductImage';
import {useStore} from '../../store/AppDataContext';
import {useUi} from '../../app/UiContext';
import {listedFamilyOf,defaultVariant} from '../../domain/variants';
import {remainingFor} from '../../domain/state';
import {formatMoney,computeDeposit} from '../../domain/pricing';
import {deliveryWindow,isOrderableIn} from '../../domain/cart';
import {useCartActions} from './useCartActions';
export function QuickBuySheet({productId,onClose}:{productId:string;onClose:()=>void}){
  const {state,now}=useStore();const {openModal}=useUi();const {add}=useCartActions();
  const base=state.products.find(p=>p.id===productId)!;
  const [id,setId]=useState(()=>defaultVariant(state,base)?.id??productId),[quantity,setQuantity]=useState(1),[busy,setBusy]=useState(false);
  const p=state.products.find(p=>p.id===id);if(!p)return null;
  const variants=listedFamilyOf(state,p),remaining=remainingFor(state,p),out=!isOrderableIn(state,p)||remaining<1,qty=Math.min(quantity,Math.max(1,remaining));
  return <BottomSheet swipeToClose className="signature-detail" title="Chọn thức quà của bạn" onClose={onClose} footer={<div className="grid grid-cols-2 gap-2"><button className="min-h-12 rounded-xl border border-champagne-600 px-3 text-sm" disabled={out||busy} onClick={async()=>{setBusy(true);try{if(await add(p.id,qty))onClose();}finally{setBusy(false);}}}>Thêm vào giỏ</button><button className="signature-primary justify-center" disabled={out} onClick={()=>openModal({type:'checkout',source:{type:'buy_now',line:{productId:p.id,quantity:qty,seenPrice:p.price,deliveryDate:deliveryWindow(p,now(),state.params)?.min}}})}>{out?'Hết hàng':p.kind==='preorder'?'Đặt trước':'Mua ngay'}</button></div>}>
    <div className="flex items-center gap-4"><ProductImage product={p} className="h-24 w-24 shrink-0 rounded-xl"/><div><h2 className="font-display text-2xl">{p.name}</h2><p className="text-sm text-muted">{p.region}</p><strong>{formatMoney(p.price*qty)}</strong></div></div>
    <VariantPicker variants={variants} selected={id} onSelect={value=>{setId(value);setQuantity(1);}}/>
    <QuantityStepper value={qty} max={remaining} onChange={setQuantity} itemName={p.name}/>
    {p.kind==='preorder'&&<p className="text-sm">Cọc tiền hàng {formatMoney(computeDeposit(p.price*qty,0,state.params.depositPercent,state.params.depositRoundingStep))}. Phí giao và tổng cọc được xác nhận khi đặt.</p>}
  </BottomSheet>;
}
