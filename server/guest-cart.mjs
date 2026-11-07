import {assert} from './security.mjs';
import {createHash} from 'node:crypto';
import {project} from './projection.mjs';
import {parseGuestCart} from '../src/domain/guestCart.ts';
import {isOrderableIn,deliveryWindow} from '../src/domain/cart.ts';
import {remainingFor} from '../src/domain/state.ts';
export async function mergeGuest(body,{db,auth}){
  assert(auth?.user.role==='customer',403,'Chỉ khách hàng được gộp giỏ.');
  const guest=parseGuestCart(JSON.stringify(body));assert(guest.lines.length&&guest.batchId,400,'Giỏ tạm không hợp lệ hoặc đã hết hạn.');
  const id='guest-merge-'+guest.batchId;
  const fingerprint=createHash('sha256').update(JSON.stringify(guest.lines)).digest('hex');
  const previous=await db.sql.prepare("SELECT owner_id,data FROM feature_records WHERE id=? AND kind='guest-cart-merge'").get(id);
  if(previous){assert(previous.owner_id===auth.user.id,409,'Giỏ này đã được gộp.');const saved=db.decodeJSON(previous.data);assert(saved.fingerprint===fingerprint,409,'Giỏ đã thay đổi. Vui lòng thử lại với phiên giỏ mới.');const value=await db.read();return {...value,state:project(value.state,auth.user),adjustments:saved.adjustments??[]};}
  const {state}=await db.read(),lines=(state.carts[auth.user.customerId]??[]).map(l=>({...l})),adjustments=[];
  for(const line of guest.lines){const p=state.products.find(p=>p.id===line.productId);const remaining=p&&isOrderableIn(state,p)?remainingFor(state,p):0;const date=p?.kind==='preorder'?deliveryWindow(p,new Date(),state.params)?.min:undefined;
    if(!p||remaining<1||(p.kind==='preorder'&&!date)){adjustments.push((p?.name??'Sản phẩm')+': không còn nhận mua.');continue;}
    const existing=lines.find(l=>l.productId===p.id),quantity=Math.min(remaining,(existing?.quantity??0)+line.quantity);
    if(quantity<(existing?.quantity??0)+line.quantity)adjustments.push(p.name+': đã điều chỉnh về '+quantity+'.');
    if(existing)existing.quantity=quantity;else lines.push({productId:p.id,quantity,seenPrice:p.price,deliveryDate:date});
  }
  await db.save({...state,carts:{...state.carts,[auth.user.customerId]:lines}});
  await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'guest-cart-merge',auth.user.id,db.encodeJSON({at:Date.now(),fingerprint,adjustments}),0);
  await db.audit(auth.user.id,'guest-cart-merged');const value=await db.read();return {...value,state:project(value.state,auth.user),adjustments};
}
