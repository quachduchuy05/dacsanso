import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { now as clockNow, setClockOffset } from '../domain/clock';
import { createSeedState } from '../data/seed';
import type { Actor, DemoState, Result } from '../domain/types';
import { fail } from '../domain/types';
import { api, type LoginResponse } from './backend';
import { capture, replay } from './commandCapture';
import type { SyncStatus } from './remoteSync';

export function pollEvery(idleMs:number):number {return idleMs>15*60000?6:idleMs>2*60000?3:1;}
function emptyState():DemoState {
  const state=createSeedState(new Date());
  for(const key of Object.keys(state)) {
    const data=state as unknown as Record<string,unknown>;
    if(Array.isArray(data[key]))data[key]=[];
    else if(data[key]&&typeof data[key]==='object'&&key!=='params')data[key]={};
  }
  return state;
}
interface StoreValue {
  state:DemoState;now:()=>Date;
  run:<T=DemoState>(op:(s:DemoState,at:Date)=>Result<T>,pick?:(value:T)=>DemoState)=>Promise<Result<T>>;
  advanceClock:(actor:Actor,ms:number)=>Promise<Result<DemoState>>;
  resetClock:(actor:Actor)=>Promise<Result<DemoState>>;
  resetDemoData:(actor:Actor)=>Promise<Result<DemoState>>;
  sync:SyncStatus;syncNow:()=>void;syncNotice:string|null;clearSyncNotice:()=>void;
  demoMode:boolean;
}
const StoreContext=createContext<StoreValue|null>(null);
export function AppDataProvider({children}:{children:ReactNode}) {
  const [state,setState]=useState<DemoState>(emptyState);
  const ref=useRef(state),version=useRef(0),generation=useRef(0),pending=useRef(0);
  const queue=useRef<Promise<unknown>>(Promise.resolve());
  const [sync,setSync]=useState<SyncStatus>({mode:'checking'});
  const [syncNotice,setSyncNotice]=useState<string|null>(null);
  const [demoMode,setDemoMode]=useState(false);
  const show=useCallback((next:DemoState,v:number)=>{if(v<version.current)return;version.current=v;ref.current=next;setClockOffset(next.clockOffsetMs??0);setState(next);},[]);
  const refresh=useCallback(async()=>{
    if(pending.current)return;
    const epoch=generation.current;
    try {const r=await api<{state:DemoState;version:number;demo:boolean}>('/api/v1/state');if(epoch!==generation.current||pending.current)return;show(r.state,r.version);setDemoMode(r.demo);setSync({mode:'shared',phase:'synced',lastSyncAt:Date.now()});}
    catch(e){if(epoch===generation.current)setSync({mode:'shared',phase:'offline',lastSyncAt:null,message:e instanceof Error?e.message:'Không kết nối được máy chủ.'});}
  },[show]);
  useEffect(()=>{
    void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},10000);
    const login=(event:Event)=>{generation.current++;version.current=0;const r=(event as CustomEvent<LoginResponse>).detail;show(r.state,r.version);setSyncNotice(null);};
    const logout=()=>{generation.current++;version.current=0;show(emptyState(),0);void refresh();};
    window.addEventListener('backend-login',login);window.addEventListener('backend-logout',logout);window.addEventListener('focus',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('backend-login',login);window.removeEventListener('backend-logout',logout);window.removeEventListener('focus',refresh);};
  },[refresh,show]);
  const run=useCallback(<T,>(op:(s:DemoState,at:Date)=>Result<T>,pick?:(value:T)=>DemoState):Promise<Result<T>>=>{
    const epoch=generation.current;
    pending.current++;
    const task=async():Promise<Result<T>>=>{
      try {
        if(epoch!==generation.current)return fail('Phiên đăng nhập đã thay đổi.');
        const captured=capture(()=>op(ref.current,clockNow()));
        if(!captured.value.ok)return captured.value;
        if(!captured.commands.length)return fail('Thao tác chưa được kết nối với backend.');
        setSync({mode:'shared',phase:'saving',lastSyncAt:null});
        const r=await api<{results:unknown[];state:DemoState;version:number}>('/api/v1/commands',{commands:captured.commands},'POST',crypto.randomUUID());
        if(epoch!==generation.current)return fail('Phiên đăng nhập đã thay đổi.');
        const result=replay(r.results,()=>op(ref.current,clockNow()));
        if(result.ok&&pick)pick(result.value);
        show(r.state,r.version);setSync({mode:'shared',phase:'synced',lastSyncAt:Date.now()});
        return result;
      }catch(e){const message=e instanceof Error?e.message:'Không lưu được thao tác.';setSyncNotice(message);setSync({mode:'shared',phase:'error',lastSyncAt:null,message});return fail(message);}
      finally {pending.current--;}
    };
    const result=queue.current.then(task,task);queue.current=result;return result;
  },[show]);
  const demo=useCallback(async(action:string,ms?:number):Promise<Result<DemoState>>=>{
    try{const r=await api<{state:DemoState;version:number}>('/api/v1/demo/tools',{action,ms});show(r.state,r.version);return {ok:true,value:r.state};}catch(e){return fail(e instanceof Error?e.message:'Không thực hiện được.');}
  },[show]);
  const value=useMemo<StoreValue>(()=>({state,now:clockNow,run,advanceClock:(_actor,ms)=>demo('shift',ms),resetClock:()=>demo('clock-reset'),resetDemoData:()=>demo('data-reset'),demoMode,sync,syncNow:()=>{void refresh();},syncNotice,clearSyncNotice:()=>setSyncNotice(null)}),[state,run,demo,demoMode,sync,refresh,syncNotice]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore():StoreValue {const ctx=useContext(StoreContext);if(!ctx)throw new Error('useStore phải dùng bên trong AppDataProvider');return ctx;}
export function useNow(intervalMs=1000):Date {const {state}=useStore();const [tick,setTick]=useState(clockNow);useEffect(()=>{setTick(clockNow());const timer=setInterval(()=>setTick(clockNow()),intervalMs);return()=>clearInterval(timer);},[intervalMs,state.clockOffsetMs]);return tick;}
