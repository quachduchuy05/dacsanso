import {useEffect,useRef,useState} from 'react';
import {api} from '../../store/backend';
import {productEditLocks} from '../../store/productEditLocks';

export function useProductEditLock(productId?:string){
  const [ready,setReady]=useState(!productId),[error,setError]=useState('');
  const queue=useRef<Promise<void>>(Promise.resolve());
  useEffect(()=>{
    if(!productId){setReady(true);return;}
    let disposed=false,inFlight=false,token='';
    setReady(false);setError('');
    const path=`/api/v1/products/${encodeURIComponent(productId)}/edit-lock`;
    const release=(value:string)=>api(path,{token:value},'DELETE').catch(()=>{});
    const renew=()=>{
      if(inFlight||disposed)return;inFlight=true;
      // Serialize acquire/release across React StrictMode's setup-cleanup-setup cycle.
      const task=async()=>{
        if(disposed)return;
        try{
          const result=await api<{token:string;expiresAt:number}>(path,token?{token}:{});
          if(disposed){await release(result.token);return;}
          token=result.token;productEditLocks.set(productId,token);setReady(true);setError('');
        }catch(e){if(!disposed){if(productEditLocks.get(productId)===token)productEditLocks.delete(productId);setReady(false);setError(e instanceof Error?e.message:'Không giữ được phiên chỉnh sửa.');}}
      };
      queue.current=queue.current.then(task,task).finally(()=>{inFlight=false;});
    };
    void renew();const timer=setInterval(()=>void renew(),60000);
    return()=>{disposed=true;clearInterval(timer);if(productEditLocks.get(productId)===token)productEditLocks.delete(productId);const cleanup=async()=>{if(token)await release(token);};queue.current=queue.current.then(cleanup,cleanup);};
  },[productId]);
  return {ready,error};
}
