import {useSyncExternalStore} from 'react';
import type {CartLine} from '../domain/types';
import {api} from './backend';
const KEY='dac-san-so-lao-cai:guest-cart-v2';
import {GUEST_TTL,empty,parseGuestCart,type GuestCart} from '../domain/guestCart';
export {parseGuestCart,GUEST_TTL} from '../domain/guestCart';
let cached:GuestCart=empty;
const listeners=new Set<()=>void>();
function refresh(){try{const next=parseGuestCart(localStorage.getItem(KEY));if(JSON.stringify(next)!==JSON.stringify(cached)){cached=next;for(const notify of listeners)notify();}}catch{}}
if(typeof window!=='undefined'){refresh();window.addEventListener('storage',refresh);window.addEventListener('focus',refresh);}
export function guestCart(){if(cached.lines.length&&Date.now()-cached.updatedAt>=GUEST_TTL){cached=empty;}return cached;}
export function saveGuestLines(lines:CartLine[]){cached={batchId:crypto.randomUUID(),updatedAt:Date.now(),lines:lines.map(l=>({productId:l.productId,quantity:l.quantity,seenPrice:l.seenPrice,deliveryDate:l.deliveryDate}))};try{localStorage.setItem(KEY,JSON.stringify(cached));}catch{}for(const notify of listeners)notify();}
export function clearGuestBatch(batchId:string){refresh();if(cached.batchId!==batchId)return;cached=empty;try{localStorage.removeItem(KEY);}catch{}for(const notify of listeners)notify();}
export function useGuestCart(){return useSyncExternalStore(callback=>{listeners.add(callback);const timer=setInterval(refresh,60000);return()=>{listeners.delete(callback);clearInterval(timer);};},guestCart,()=>empty);}
const flights=new Map<string,Promise<{state:any;version:number;adjustments:string[]}>>();
export function mergeGuestCart(ownerId:string){const snapshot=guestCart();if(!snapshot.lines.length)return Promise.resolve(null);const key=ownerId+':'+snapshot.batchId;let pending=flights.get(key);if(!pending){pending=api<{state:any;version:number;adjustments:string[]}>('/api/v1/cart/merge',snapshot);flights.set(key,pending);pending.then(()=>{clearGuestBatch(snapshot.batchId);flights.delete(key);},()=>flights.delete(key));}return pending;}
