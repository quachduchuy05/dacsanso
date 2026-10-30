import {useEffect,useState} from 'react';
import {api} from '../store/backend';
import {useUi} from '../app/UiContext';
import {useStore} from '../store/AppDataContext';
import {Field,Input,Select,PrimaryButton} from './form';
type Lot={id:string;productId:string;code:string;harvestedOn:string;packedOn:string};
export function LotTools({productId,lotId}:{productId:string;lotId?:string}){
  const {user}=useUi(),{state}=useStore();const p=state.products.find(p=>p.id===productId),owner=user?.role==='coop'&&user.coopId===p?.coopId;
  const [lots,setLots]=useState<Lot[]>([]),[selected,setSelected]=useState(lotId??''),[code,setCode]=useState(''),[harvestedOn,setHarvested]=useState(''),[packedOn,setPacked]=useState(''),[qr,setQr]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=()=>api('/api/v1/lots?productId='+encodeURIComponent(productId)).then(r=>setLots(r.items));useEffect(()=>{void load().catch(e=>setError(e.message));},[productId]);
  const lot=lots.find(l=>l.id===selected)??lots[0],url=lot?window.location.origin+'/#/lo-hang/'+lot.id:'';
  useEffect(()=>{let cancelled=false;setQr('');if(url)void import('qrcode').then(m=>m.toDataURL(url,{width:240,margin:3,errorCorrectionLevel:'M'})).then(src=>{if(!cancelled)setQr(src);}).catch(()=>{if(!cancelled)setError('Không tạo được mã QR.');});return()=>{cancelled=true;};},[url]);
  return <section className="space-y-3 rounded-xl border bg-white p-4"><h3 className="font-semibold">Truy xuất theo lô hàng</h3>{lots.length>0?<><Select aria-label="Chọn lô truy xuất" value={lot?.id??''} onChange={e=>setSelected(e.target.value)}>{lots.map(l=><option key={l.id} value={l.id}>{l.code}</option>)}</Select>{lot&&<dl className="text-sm"><div>Mã lô: {lot.code}</div><div>Thu hoạch: {lot.harvestedOn}</div><div>Đóng gói: {lot.packedOn}</div></dl>}{qr&&<img className="mx-auto h-60 w-60" src={qr} alt={`Mã QR truy xuất lô ${lot?.code}`}/>}<a href={url} className="block break-all text-sm underline">Mở trang truy xuất lô hàng</a><p className="text-xs text-stone-500">Thông tin do HTX khai báo. Mã QR dẫn đến đúng lô trên hệ thống.</p></>:<p className="text-sm text-stone-600">HTX chưa công bố lô hàng cho sản phẩm này.</p>}
    {owner&&<details><summary className="min-h-11 cursor-pointer text-sm">Tạo lô hàng mới</summary><form className="grid gap-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await api('/api/v1/lots',{productId,code,harvestedOn,packedOn});await load();setSelected(r.lot.id);setCode('');}catch(e){setError(e instanceof Error?e.message:'Không tạo được lô.');}finally{setBusy(false);}}}><Field label="Mã lô"><Input required minLength={3} maxLength={60} value={code} onChange={e=>setCode(e.target.value)}/></Field><Field label="Ngày thu hoạch"><Input required type="date" value={harvestedOn} onChange={e=>setHarvested(e.target.value)}/></Field><Field label="Ngày đóng gói"><Input required type="date" value={packedOn} onChange={e=>setPacked(e.target.value)}/></Field><PrimaryButton disabled={busy}>Tạo lô và QR</PrimaryButton></form></details>}{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
  </section>;
}
