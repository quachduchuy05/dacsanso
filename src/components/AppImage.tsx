import {useEffect,useState,type ImgHTMLAttributes} from 'react';
import {api} from '../store/backend';

/** Persist object references; request a fresh short-lived URL with current account permissions. */
export function AppImage({src,...props}:ImgHTMLAttributes<HTMLImageElement>){
  const [resolved,setResolved]=useState<string|undefined>(src?.startsWith('sb://')?undefined:src);
  useEffect(()=>{
    if(!src?.startsWith('sb://')){setResolved(src);return;}
    let stopped=false;
    const refresh=()=>{void api<{url:string}>('/api/v1/media/sign',{reference:src}).then(r=>{if(!stopped)setResolved(r.url);}).catch(()=>{if(!stopped)setResolved(undefined);});};
    refresh();const timer=setInterval(refresh,240000);
    return()=>{stopped=true;clearInterval(timer);};
  },[src]);
  return <img {...props} src={resolved}/>;
}
