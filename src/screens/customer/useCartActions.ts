import {trackExperience} from '../../store/experienceEvents';
import { useRef } from 'react';
import { useUi } from '../../app/UiContext';
import { addToCart, removeCartLine, setCartLine } from '../../store/commands/cart';
import { addToCart as localAdd, setCartLine as localSet } from '../../domain/cart';
import { findProduct } from '../../domain/state';
import type { CartLine } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';
import {useGuestCart,saveGuestLines,guestCart} from '../../store/guestCart';
import {useOptimisticCart,beginCartMutation,finishCartMutation} from '../../store/optimisticCart';
const EMPTY:CartLine[]=[];

export function useCartActions() {
  const { run, state,now } = useStore();
  const { customerActor, showToast } = useUi();
  const customerId = customerActor.id!;
  const guest=useGuestCart();
  const isGuest=customerActor.kind!=='customer';
  const optimistic=useOptimisticCart(customerId??'',state.carts[customerId]??EMPTY);
  const cart=isGuest?guest.lines:optimistic;
  const latest=useRef(cart);latest.current=cart;
  const localState=()=>({...state,carts:{...state.carts,guest:guestCart().lines}});
  const update=async(productId:string,patch:Partial<Pick<CartLine,'quantity'|'deliveryDate'>>)=>{
    const token=!isGuest?beginCartMutation(customerId,latest.current,lines=>lines.map(l=>l.productId===productId?{...l,...patch}:l)):undefined;
    const r=isGuest?localSet(localState(),'guest',productId,patch):await run(s=>setCartLine(s,customerId,productId,patch));
    if(token)finishCartMutation(customerId,token,r.ok?r.value.carts[customerId]:undefined);
    if(r.ok&&isGuest)saveGuestLines(r.value.carts.guest);else if(!r.ok)showToast(r.error);
    return r.ok;
  };
  const remove=async(productId:string,undoable=true)=>{
    const line=latest.current.find(l=>l.productId===productId);
    if(isGuest)saveGuestLines(guestCart().lines.filter(l=>l.productId!==productId));
    else {const token=beginCartMutation(customerId,latest.current,lines=>lines.filter(l=>l.productId!==productId));const r=await run(s=>({ok:true,value:removeCartLine(s,customerId,[productId])}));finishCartMutation(customerId,token,r.ok?r.value.carts[customerId]:undefined);if(!r.ok){showToast(r.error);return false;}}
    if(undoable&&line)showToast('Đã xóa món khỏi giỏ.',()=>{void add(productId,line.quantity,false).then(ok=>{if(ok&&line.deliveryDate)void update(productId,{deliveryDate:line.deliveryDate});});});
    return true;
  };
  const add=async(productId:string,qty:number,undoable=true)=>{
    const preview=localAdd({...state,carts:{...state.carts,[customerId??'guest']:latest.current}},customerId??'guest',productId,qty,now());
    if(!preview.ok){showToast(preview.error);return false;}
    const token=!isGuest?beginCartMutation(customerId,latest.current,lines=>{const current=lines.find(l=>l.productId===productId),line=preview.value.carts[customerId][preview.value.carts[customerId].findIndex(l=>l.productId===productId)];return current?lines.map(l=>l.productId===productId?{...l,quantity:l.quantity+qty}:l):[...lines,line];}):undefined;
    const r=isGuest?localAdd(localState(),'guest',productId,qty,now()):await run((s,at)=>addToCart(s,customerId,productId,qty,at));
    if(token)finishCartMutation(customerId,token,r.ok?r.value.carts[customerId]:undefined);
    if(!r.ok){showToast(r.error);return false;}
    if(isGuest)saveGuestLines(r.value.carts.guest);
    trackExperience('add');
    const p=findProduct(state,productId);
    showToast('Đã thêm '+qty+' '+(p?.unit??'')+' '+(p?.name??'')+' vào giỏ.',undoable?()=>{const current=(isGuest?guestCart().lines:latest.current).find(l=>l.productId===productId);if(!current)return;if(current.quantity<=qty)void remove(productId,false);else void update(productId,{quantity:current.quantity-qty});}:undefined);
    return true;
  };
  return {cart,add,update,remove};
}
