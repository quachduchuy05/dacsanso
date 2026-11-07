import {createElement,useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Maximize2,RotateCcw,Box,X,Plus,Minus,Play,Rotate3d} from 'lucide-react';
import {api} from '../store/backend';
import {AppImage} from './AppImage';
import {ProductImage} from './ProductImage';
import {familyKey} from '../domain/variants';
import {assetUrl,sortMedia,type ProductMedia,type MediaEntry} from '../domain/productMedia';
import type {Product} from '../domain/types';
import {trackExperience} from '../store/experienceEvents';
type PublicMedia=Pick<ProductMedia,'id'|'kind'|'group'|'order'|'alt'|'variantId'|'files'|'poster'>;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function ProductGallery({product}:{product:Product}){
  const [items,setItems]=useState<PublicMedia[]>([]),[index,setIndex]=useState(0),[active,setActive]=useState<string|null>(null),[fullscreen,setFullscreen]=useState(false);
  const rail=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
  const drag=useRef<{x:number;scroll:number;moved:boolean}|null>(null);
  useEffect(()=>{let cancelled=false;setActive(null);setIndex(0);setItems([]);
    void api<{items?:PublicMedia[];entries?:MediaEntry[]}>('/api/v1/products/'+product.id+'/media').then(result=>{if(cancelled)return;setItems(result.items??sortMedia((result.entries??[]).map(e=>e.approved).filter((m):m is ProductMedia=>!!m)).map(m=>({...m,files:m.files.map(assetUrl),poster:m.poster?assetUrl(m.poster):undefined})));}).catch(()=>{});
    return()=>{cancelled=true;};
  },[familyKey(product)]);
  const legacy=[...new Set([product.image,...(product.images??[])].filter((s):s is string=>!!s))];
  const media:PublicMedia[]=items.length?items:legacy.map((url,i)=>({id:'legacy-'+i,kind:'image',group:'main',order:i,alt:product.name,files:[url]}));
  const selected=media[index];
  const activateAt=(i:number)=>{rail.current?.scrollTo({left:i*(rail.current?.clientWidth??0),behavior:'instant'});setIndex(i);setActive(media[i].id);};
  const move=(i:number)=>{setActive(null);rail.current?.scrollTo({left:Math.max(0,Math.min(i,media.length-1))*(rail.current?.clientWidth??0),behavior:reduced()?'instant':'smooth'});};
  useEffect(()=>{setActive(null);const i=items.findIndex(m=>m.variantId===product.id);const next=i>=0?i:0;setIndex(next);rail.current?.scrollTo({left:next*rail.current.clientWidth,behavior:'instant'});},[product.id,items]);
  useEffect(()=>{if(fullscreen)dialog.current?.showModal();else dialog.current?.close();},[fullscreen]);
  return <div className="product-gallery">
    {!media.length?<ProductImage product={product} variant="cover" className="product-gallery-placeholder"/>:<div className="product-gallery-rail" ref={rail} style={{overflowX:active?'hidden':undefined}} onScroll={event=>{const el=event.currentTarget;const next=Math.round(el.scrollLeft/el.clientWidth);if(next!==index){setIndex(next);setActive(null);}}} role="region" aria-label="Thư viện sản phẩm" tabIndex={0} onKeyDown={event=>{if(event.target!==event.currentTarget||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();move(index+(event.key==='ArrowRight'?1:-1));}}
      onPointerDown={event=>{delete event.currentTarget.dataset.dragged;if(!active&&event.pointerType==='mouse'&&event.button===0)drag.current={x:event.clientX,scroll:event.currentTarget.scrollLeft,moved:false};}}
      onPointerMove={event=>{const d=drag.current;if(!d||active)return;if(Math.abs(event.clientX-d.x)>7){d.moved=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.style.scrollSnapType='none';event.currentTarget.scrollLeft=d.scroll-event.clientX+d.x;}}}
      onPointerUp={event=>{if(drag.current?.moved)event.currentTarget.dataset.dragged='true';drag.current=null;event.currentTarget.style.scrollSnapType='';}}
      onPointerLeave={()=>{if(!drag.current?.moved)drag.current=null;}}
      onPointerCancel={event=>{drag.current=null;event.currentTarget.style.scrollSnapType='';}}
      onDragStart={event=>event.preventDefault()}
      onClickCapture={event=>{if(event.currentTarget.dataset.dragged==='true'){event.preventDefault();event.stopPropagation();delete event.currentTarget.dataset.dragged;}}}>
      {media.map((m,i)=><div className="product-gallery-slide" key={m.id}>
        {active===m.id&&m.kind==='model'?<ModelDisplay item={m} onClose={()=>setActive(null)}/>:active===m.id&&m.kind==='spin'?<SpinDisplay item={m} onClose={()=>setActive(null)}/>:active===m.id&&m.kind==='video'?<video src={m.files[0]} poster={m.poster} controls muted playsInline preload="none" aria-label={m.alt}/>:<>
          <button className="product-gallery-poster" onClick={()=>m.kind==='image'?setFullscreen(true):setActive(m.id)} aria-label={m.kind==='image'?'Phóng to '+m.alt:m.kind==='model'?'Xem 3D':m.kind==='spin'?'Xem 360°':'Phát video'}><AppImage src={m.kind==='image'?m.files[0]:m.poster} alt={m.alt} loading={i===0?'eager':'lazy'}/>{m.kind!=='image'&&<span className="product-gallery-activate">{m.kind==='model'?<Box size={22}/>:m.kind==='spin'?<Rotate3d size={22}/>:<Play size={22}/>} {m.kind==='model'?'Xem 3D':m.kind==='spin'?'Xem 360°':'Xem video'}</span>}</button>
        </>}
        {i===0&&!active&&media.some(m=>m.kind==='model')&&<button className="product-gallery-3d" onClick={()=>activateAt(media.findIndex(m=>m.kind==='model'))}><Box size={18}/> Xem 3D</button>}
      </div>)}
    </div>}
    {media.length>0&&<><div className="product-gallery-controls"><button aria-label="Ảnh trước" disabled={index<=0||!!active} onClick={()=>move(index-1)}><ChevronLeft size={18}/></button><span>{index+1} / {media.length}</span><button aria-label="Ảnh tiếp theo" disabled={index>=media.length-1||!!active} onClick={()=>move(index+1)}><ChevronRight size={18}/></button><button aria-label="Mở thư viện toàn màn hình" onClick={()=>{setActive(null);setFullscreen(true);}}><Maximize2 size={18}/></button></div><div className="product-gallery-dots">{media.map((m,i)=><button key={m.id} onClick={()=>move(i)} disabled={!!active} aria-label={`Xem phương tiện ${i+1}`} aria-current={index===i?'true':undefined}><span/></button>)}</div></>}
    <dialog ref={dialog} className="product-gallery-full" onCancel={event=>{event.preventDefault();setFullscreen(false);}} onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}>
      <div className="product-gallery-full-heading"><span>{product.name}</span><button aria-label="Đóng thư viện toàn màn hình" onClick={()=>setFullscreen(false)}><X/></button></div>
      {fullscreen&&selected&&(selected.kind==='image'?<ZoomPhoto src={selected.files[0]} alt={selected.alt}/>:selected.kind==='model'?<ModelDisplay item={selected} onClose={()=>setFullscreen(false)}/>:selected.kind==='spin'?<SpinDisplay item={selected} onClose={()=>setFullscreen(false)}/>:<video src={selected.files[0]} controls muted playsInline preload="none" aria-label={selected.alt}/>)}
    </dialog>
  </div>;
}

function ZoomPhoto({src,alt}:{src:string;alt:string}){
  const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});const pointers=useRef(new Map<number,{x:number;y:number}>()),last=useRef<{distance:number;zoom:number}|null>(null);
  return <><div className="product-gallery-zoom" onDoubleClick={()=>{setZoom(v=>v===1?2:1);setPan({x:0,y:0});}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2){const [a,b]=[...pointers.current.values()];last.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};}}} onPointerMove={e=>{const old=pointers.current.get(e.pointerId);if(!old)return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2&&last.current){const [a,b]=[...pointers.current.values()];setZoom(Math.max(1,Math.min(4,last.current.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,last.current.distance))));}else if(zoom>1)setPan(p=>({x:p.x+e.clientX-old.x,y:p.y+e.clientY-old.y}));}} onPointerUp={e=>{pointers.current.delete(e.pointerId);last.current=null;}} onPointerCancel={()=>{pointers.current.clear();last.current=null;}}><AppImage src={src} alt={alt} draggable={false} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}/></div><div className="product-gallery-zoom-tools"><button aria-label="Thu nhỏ ảnh" onClick={()=>setZoom(v=>Math.max(1,v-.5))}><Minus/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Phóng to ảnh" onClick={()=>setZoom(v=>Math.min(4,v+.5))}><Plus/></button><button aria-label="Đặt lại ảnh" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}><RotateCcw/></button></div></>;
}

export function SpinDisplay({item,onClose}:{item:PublicMedia;onClose:()=>void}){
  useEffect(()=>{trackExperience('open_360');},[]);
  const [frame,setFrame]=useState(0);const start=useRef({x:0,frame:0});
  return <div className="product-spin" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);start.current={x:e.clientX,frame};}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const n=item.files.length;setFrame(((start.current.frame+Math.round((e.clientX-start.current.x)/7))%n+n)%n);}}>
    {item.files.map((src,i)=><img key={src} src={src} alt={i===frame?item.alt:''} hidden={i!==frame} draggable={false}/>)}
    <div className="product-spin-tools"><button aria-label="Góc trước" onClick={()=>setFrame(v=>(v-1+item.files.length)%item.files.length)}><ChevronLeft/></button><span>Kéo để xoay · {frame+1}/{item.files.length}</span><button aria-label="Góc tiếp theo" onClick={()=>setFrame(v=>(v+1)%item.files.length)}><ChevronRight/></button><button onClick={onClose}>Đóng 360°</button></div>
  </div>;
}

export function ModelDisplay({item,onClose}:{item:PublicMedia;onClose:()=>void}){
  const [loaded,setLoaded]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState('');
  const viewer=useRef<HTMLElement & {cameraOrbit:string;autoRotate:boolean;jumpCameraToGoal:()=>void}|null>(null);
  useEffect(()=>{let alive=true;trackExperience('open_3d');void import('@google/model-viewer').then(({ModelViewerElement})=>{ModelViewerElement.modelCacheSize=0;if(alive)setLoaded(true);}).catch(()=>{if(alive)setError('Thiết bị chưa mở được 3D. Bạn vẫn có thể xem ảnh sản phẩm.');});return()=>{alive=false;};},[]);
  useEffect(()=>{const el=viewer.current;if(!el)return;const update=(event:Event)=>setProgress(Math.round((event as CustomEvent).detail.totalProgress*100));const fail=()=>setError('Không tải được mô hình. Đóng để tiếp tục xem ảnh.');el.addEventListener('progress',update);el.addEventListener('error',fail);return()=>{el.removeEventListener('progress',update);el.removeEventListener('error',fail);el.removeAttribute('src');};},[loaded]);
  return <div className="product-model">{error?<><AppImage src={item.poster} alt={item.alt}/><p role="status">{error}</p></>:<>{!loaded&&<AppImage src={item.poster} alt={item.alt}/>} {loaded&&createElement('model-viewer',{ref:viewer,src:item.files[0],poster:item.poster,alt:item.alt,'camera-controls':'','auto-rotate':reduced()?undefined:'','interaction-prompt':'none','environment-image':'neutral',onPointerDown:()=>{if(viewer.current)viewer.current.autoRotate=false;trackExperience('rotate_3d');},style:{width:'100%',height:'100%'}})}{progress<100&&<div className="product-model-loading" role="status">Đang tải 3D… {progress}%</div>}</>}
    <div className="product-model-tools"><button aria-label="Đặt lại góc nhìn 3D" onClick={()=>{if(viewer.current){viewer.current.cameraOrbit='0deg 75deg auto';viewer.current.jumpCameraToGoal();}}}><RotateCcw size={18}/> Đặt lại</button><button onClick={onClose}><X size={18}/> Đóng 3D</button></div>
  </div>;
}
