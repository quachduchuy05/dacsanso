import {useEffect,useState} from 'react';
import {useStore} from '../../store/AppDataContext';
import {useUi} from '../../app/UiContext';
import {api} from '../../store/backend';
import {Field,Input,Select,PrimaryButton,SecondaryButton} from '../../components/form';
import {PhotoPicker} from '../../components/PhotoPicker';
import {PRODUCT_STATUS_LABEL} from '../../domain/types';

export function QualityCatalogPanel(){
  const {state,syncNow}=useStore(),{openModal,showToast}=useUi();
  const [selected,setSelected]=useState(''),[price,setPrice]=useState(''),[slots,setSlots]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[busy,setBusy]=useState(false);
  const [cert,setCert]=useState({label:'',issuer:'',number:'',issuedOn:'',validUntil:''}),[photos,setPhotos]=useState<string[]>([]);
  const product=state.products.find(p=>p.id===selected);
  useEffect(()=>{setPrice(String(product?.price??''));setSlots(String(product?.preorder?.totalSlots??''));setFrom(product?.preorder?.deliveryFrom??'');setTo(product?.preorder?.deliveryTo??'');setPhotos([]);},[selected,product?.price,product?.preorder?.totalSlots]);
  const act=async(action:string,values:Record<string,unknown>)=>{
    if(busy||!product)return;setBusy(true);
    try{await api('/api/v1/catalog/products/'+product.id,{action,...values});syncNow();showToast('Đã cập nhật sản phẩm, có ghi nhật ký.');}
    catch(e){showToast(e instanceof Error?e.message:'Không cập nhật được.');}finally{setBusy(false);}
  };
  return <section className="space-y-4 rounded-xl border bg-white p-4">
    <h2 className="text-lg font-bold">Quản lý sản phẩm – Chất lượng</h2>
    <p className="text-sm text-stone-600">Admin nhập và kiểm tra hồ sơ trước khi đăng. Mọi thay đổi đều ghi người thực hiện và lịch sử giá. HTX quản lý tồn kho và báo thu hoạch.</p>
    <PrimaryButton onClick={()=>openModal({type:'coop_product_form'})}>Thêm sản phẩm</PrimaryButton>
    <Field label="Sản phẩm cần quản lý"><Select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Chọn sản phẩm</option>{state.products.map(p=><option key={p.id} value={p.id}>{state.coops.find(c=>c.id===p.coopId)?.name} · {p.name} · {p.unit} · {PRODUCT_STATUS_LABEL[p.status]}</option>)}</Select></Field>
    {product&&<>
      <div className="flex flex-wrap gap-2"><SecondaryButton onClick={()=>openModal({type:'coop_product_form',productId:product.id})}>Sửa nội dung</SecondaryButton><SecondaryButton disabled={busy} onClick={()=>act('visibility',{hidden:product.status==='active'})}>{product.status==='active'?'Ngừng bán':'Đăng bán lại'}</SecondaryButton><SecondaryButton onClick={()=>openModal({type:'trace_lot',productId:product.id})}>Xem nguồn gốc</SecondaryButton></div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void act('price',{price:Number(price)});}}><Field label="Giá bán (VND)"><Input required type="number" min={1000} max={10000000} value={price} onChange={e=>setPrice(e.target.value)}/></Field><PrimaryButton disabled={busy}>Lưu giá bán</PrimaryButton></form>
      {product.kind==='ready'?<SecondaryButton disabled={busy} onClick={()=>act('express',{enabled:!product.expressApproved})}>{product.expressApproved?'Tắt':'Bật'} hỏa tốc</SecondaryButton>:<form className="grid gap-3 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();void act('preorder',{input:{totalSlots:Number(slots),deliveryFrom:from,deliveryTo:to,open:true}});}}><Field label="Tổng suất đặt trước"><Input required type="number" min={1} value={slots} onChange={e=>setSlots(e.target.value)}/></Field><Field label="Giao từ"><Input required type="date" value={from} onChange={e=>setFrom(e.target.value)}/></Field><Field label="Giao đến"><Input required type="date" value={to} onChange={e=>setTo(e.target.value)}/></Field><PrimaryButton disabled={busy}>Lưu đợt đặt trước</PrimaryButton></form>}
      <details><summary className="min-h-11 cursor-pointer font-semibold">Thêm chứng nhận đã kiểm tra hồ sơ</summary><form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();void act('cert',{input:{...cert,photo:photos[0]}});}}>
        {([['label','Tên chứng nhận'],['issuer','Nơi cấp'],['number','Số chứng nhận'],['issuedOn','Ngày cấp'],['validUntil','Hiệu lực đến']] as const).map(([key,label])=><Field key={key} label={label}><Input required maxLength={100} type={['issuedOn','validUntil'].includes(key)?'date':'text'} value={cert[key]} onChange={e=>setCert({...cert,[key]:e.target.value})}/></Field>)}
        <PhotoPicker photos={photos} onChange={setPhotos} max={1}/><PrimaryButton disabled={busy||!photos.length}>Lưu chứng nhận</PrimaryButton>
      </form></details>
    </>}
  </section>;
}
