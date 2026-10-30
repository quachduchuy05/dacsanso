import {useCallback,useEffect,useState} from 'react';
import {api} from '../store/backend';
import {useUi} from '../app/UiContext';
import {useStore} from '../store/AppDataContext';
import {Field,Select,Textarea,PrimaryButton,SecondaryButton} from './form';
import {REVIEW_HIDE_REASONS} from '../domain/reviews';

type Item={id:string;coopId:string;stars:number;comment:string;status:string;coopReply?:string;createdAt:string;hiddenReason?:string};
type Data={items:Item[];eligibleOrders:{id:string;coopId:string}[];rating:{count:number;average:number|null}};
export function CoopReviewsPanel({coopId}:{coopId?:string}){
  const {state}=useStore();
  const {user}=useUi(),[data,setData]=useState<Data>({items:[],eligibleOrders:[],rating:{count:0,average:null}}),[orderId,setOrder]=useState(''),[stars,setStars]=useState('5'),[comment,setComment]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{try{setData(await api('/api/v1/coop-reviews'+(coopId?'?coopId='+encodeURIComponent(coopId):'')));}catch(e){setMessage(e instanceof Error?e.message:'Không tải được đánh giá.');}},[coopId,user?.id]);
  useEffect(()=>{void load();},[load]);
  const act=async(body:unknown)=>{setBusy(true);setMessage('');try{await api('/api/v1/coop-reviews',body);setComment('');setOrder('');await load();setMessage('Đã lưu đánh giá HTX.');}catch(e){setMessage(e instanceof Error?e.message:'Không lưu được.');}finally{setBusy(false);}};
  const moderation=user?.role==='admin'&&user.adminGroup==='cskh';
  return <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4"><h3 className="text-lg font-bold">Đánh giá HTX</h3>
    <p className="text-sm">{data.rating.average===null?'Chưa có đánh giá HTX':`${data.rating.average}/5 · ${data.rating.count} đánh giá HTX`}. Điểm này được tính riêng với đánh giá sản phẩm.</p>
    {user?.role==='customer'&&!!coopId&&(data.eligibleOrders.length?<form className="space-y-3" onSubmit={e=>{e.preventDefault();void act({action:'submit',orderId,stars:Number(stars),comment});}}><Field label="Đơn đã mua tại HTX"><Select required value={orderId} onChange={e=>setOrder(e.target.value)}><option value="">Chọn đơn Đã giao</option>{data.eligibleOrders.map(o=><option key={o.id} value={o.id}>{o.id}</option>)}</Select></Field><Field label="Số sao đánh giá HTX"><Select value={stars} onChange={e=>setStars(e.target.value)}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} sao</option>)}</Select></Field><Field label="Nhận xét về HTX"><Textarea maxLength={500} minLength={Number(stars)<=2?20:0} value={comment} onChange={e=>setComment(e.target.value)}/></Field><PrimaryButton disabled={busy}>Gửi đánh giá HTX</PrimaryButton></form>:<p className="text-sm">Đánh giá khi có đơn Đã giao còn trong thời hạn và chưa đánh giá HTX.</p>)}
    {data.items.map(item=><CoopReviewRow key={item.id} name={state.coops.find(c=>c.id===item.coopId)?.name??item.coopId} item={item} moderation={moderation} seller={user?.role==='coop'&&user.coopId===item.coopId} busy={busy} act={act}/>)}
    {!data.items.length&&<p className="text-sm">Chưa có đánh giá HTX được hiển thị.</p>}{message&&<p role="status">{message}</p>}
  </section>;
}
function CoopReviewRow({item,name,moderation,seller,busy,act}:{item:Item;name:string;moderation:boolean;seller:boolean;busy:boolean;act:(body:unknown)=>Promise<void>}){
  const [reply,setReply]=useState(''),[reason,setReason]=useState('');
  return <article className="space-y-2 border-t pt-3 text-sm"><p className="font-semibold">{name}</p><p>{item.stars}/5 · Đã mua hàng · {new Date(item.createdAt).toLocaleDateString('vi-VN')}{(moderation||seller)&&` · ${item.status}`}</p><p className="whitespace-pre-wrap">{item.comment}</p>{item.hiddenReason&&<p>Lý do kiểm duyệt: {item.hiddenReason}</p>}{item.coopReply&&<p className="border-l-2 border-forest-600 pl-2">HTX phản hồi: {item.coopReply}</p>}
    {seller&&!item.coopReply&&<form onSubmit={e=>{e.preventDefault();void act({action:'reply',id:item.id,reply});}}><Field label="Phản hồi đánh giá HTX"><Textarea required maxLength={500} value={reply} onChange={e=>setReply(e.target.value)}/></Field><SecondaryButton disabled={busy}>Gửi phản hồi</SecondaryButton></form>}
    {moderation&&<div className="flex flex-wrap gap-2"><Select aria-label="Lý do kiểm duyệt đánh giá HTX" value={reason} onChange={e=>setReason(e.target.value)}><option value="">Chọn lý do vi phạm</option>{REVIEW_HIDE_REASONS.map(r=><option key={r}>{r}</option>)}</Select><SecondaryButton disabled={busy||!reason} onClick={()=>act({action:'moderate',id:item.id,status:'hidden',reason})}>Ẩn đánh giá HTX</SecondaryButton><SecondaryButton disabled={busy||item.status==='visible'} onClick={()=>act({action:'moderate',id:item.id,status:'visible'})}>Duyệt / hiện đánh giá HTX</SecondaryButton></div>}
  </article>;
}
