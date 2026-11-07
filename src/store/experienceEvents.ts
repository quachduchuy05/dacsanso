import {api} from './backend';
let session='';
export function trackExperience(event:'view_card'|'swipe'|'detail'|'open_3d'|'rotate_3d'|'open_360'|'add'|'undo'|'buy_now'|'cart'|'checkout_started'|'checkout_placed'){
  if(document.querySelector('.admin-shell'))return;
  if(!session)session=crypto.randomUUID();
  void api('/api/v1/products/events',{session,event}).catch(()=>{});
}
