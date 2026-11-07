import type {CartLine} from './types';
export const GUEST_TTL=7*86400000;
export type GuestCart={batchId:string;updatedAt:number;lines:CartLine[]};
export const empty:GuestCart={batchId:'',updatedAt:0,lines:[]};
export function parseGuestCart(raw:string|null,at=Date.now()):GuestCart {
  try{const v=JSON.parse(raw??'null');if(!v||!Number.isFinite(v.updatedAt)||v.updatedAt>at||at-v.updatedAt>=GUEST_TTL||typeof v.batchId!=='string'||!/^[\w-]{1,80}$/.test(v.batchId)||!Array.isArray(v.lines)||v.lines.length>100)return empty;
    const ids=new Set<string>();const lines:CartLine[]=[];
    for(const l of v.lines){if(typeof l.productId!=='string'||!l.productId||ids.has(l.productId)||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>100000||!Number.isFinite(l.seenPrice)||l.seenPrice<0)return empty;ids.add(l.productId);lines.push({productId:l.productId,quantity:l.quantity,seenPrice:l.seenPrice,...(typeof l.deliveryDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(l.deliveryDate)?{deliveryDate:l.deliveryDate}:{})});}
    return {batchId:v.batchId,updatedAt:v.updatedAt,lines};
  }catch{return empty;}
}
