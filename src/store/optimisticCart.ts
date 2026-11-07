import {useEffect,useSyncExternalStore} from 'react';
import type {CartLine} from '../domain/types';
type Operation={id:string;apply:(lines:CartLine[])=>CartLine[]};
type Entry={base:CartLine[];ops:Operation[];value:CartLine[]};
const entries=new Map<string,Entry>(),listeners=new Set<()=>void>();
const copy=(lines:CartLine[])=>lines.map(l=>({...l}));
const notify=()=>{for(const listener of listeners)listener();};
function project(entry:Entry){entry.value=entry.ops.reduce((lines,op)=>op.apply(lines),copy(entry.base));}
export function beginCartMutation(customerId:string,base:CartLine[],apply:Operation['apply']){
  const entry=entries.get(customerId)??{base:copy(base),ops:[],value:copy(base)},id=crypto.randomUUID();entry.ops.push({id,apply});project(entry);entries.set(customerId,entry);notify();return id;
}
export function finishCartMutation(customerId:string,id:string,canonical?:CartLine[]){
  const entry=entries.get(customerId);if(!entry)return;if(canonical)entry.base=copy(canonical);entry.ops=entry.ops.filter(op=>op.id!==id);project(entry);notify();
}
export function useOptimisticCart(customerId:string,canonical:CartLine[]){
  const value=useSyncExternalStore(callback=>{listeners.add(callback);return()=>listeners.delete(callback);},()=>entries.get(customerId)?.value??canonical,()=>canonical);
  useEffect(()=>{const entry=entries.get(customerId);if(entry&&!entry.ops.length){entries.delete(customerId);notify();}},[customerId,canonical]);
  return value;
}
