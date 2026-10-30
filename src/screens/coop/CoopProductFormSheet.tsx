import {useEffect,useState} from 'react';
import {useProductEditLock} from './useProductEditLock';
import {PhotoPicker} from '../../components/PhotoPicker';
import {api} from '../../store/backend';
import {productEditLocks} from '../../store/productEditLocks';
import { useUi } from '../../app/UiContext';
import { BottomSheet } from '../../components/BottomSheet';
import { Field, Input, PrimaryButton, Select, Textarea } from '../../components/form';
import { findProduct } from '../../domain/state';
import { CATEGORY_LABEL, type Category, type OrderKind } from '../../domain/types';
import { useStore } from '../../store/AppDataContext';

/** HTX tạo sản phẩm mới hoặc sửa nội dung sản phẩm; đều sang Chờ duyệt (FR-SP-02, 03, 04). */
export function CoopProductFormSheet({ productId, onClose }: { productId?: string; onClose: () => void }) {
  const { state, syncNow } = useStore();
  const { user, showToast } = useUi();
  const existing = productId ? findProduct(state, productId) : undefined;
  const editLock=useProductEditLock(productId);
  const coop = state.coops.find((c) => c.id === existing?.coopId)??state.coops.find(c=>c.status==='active'&&c.profileStatus==='approved');
  const [images,setImages]=useState<string[]>(existing?.images??(existing?.image?[existing.image]:[]));
  const [harvestMonths,setHarvestMonths]=useState<number[]>(existing?.harvestMonths??[]);
  const [form, setForm] = useState({
    coopId:existing?.coopId??coop?.id??'',
    traceUrl:existing?.traceUrl??'',
    catalogCategoryId:existing?.catalogCategoryId??'',storage:existing?.storage??'',shelfLifeDays:existing?.shelfLifeDays?.toString()??'',preparationMinutes:existing?.preparationMinutes?.toString()??'',
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    unit: existing?.unit ?? '',
    category: (existing?.category ?? 'dry') as Category,
    region: existing?.region ?? coop?.region ?? '',
    kind: (existing?.kind ?? 'ready') as OrderKind,
    price: '',
    stock: '',
    slots: '',
    from: '',
    to: '',
  });
  const [draftId,setDraftId]=useState(''),[drafts,setDrafts]=useState<{id:string;form:Record<string,string>;images?:string[];harvestMonths?:number[];expiresAt:number}[]>([]),[busy,setBusy]=useState(false);
  useEffect(()=>{if(!existing)void api('/api/v1/product-drafts').then(r=>setDrafts(r.items)).catch(e=>showToast(e.message));},[]);
  const saveDraft=async()=>{setBusy(true);try{const r=await api('/api/v1/product-drafts'+(draftId?'/'+draftId:''),{form,images,harvestMonths});setDraftId(r.id);setDrafts((await api('/api/v1/product-drafts')).items);showToast('Đã lưu bản nháp trên máy chủ, giữ trong 30 ngày.');}catch(e){showToast(e instanceof Error?e.message:'Không lưu được.');}finally{setBusy(false);}};
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if(!editLock.ready)return showToast(editLock.error||'Đang mở phiên chỉnh sửa.');
    const content = {traceUrl:form.traceUrl,harvestMonths,catalogCategoryId:form.catalogCategoryId||undefined,...(images.length?{images}:{}),storage:form.storage,shelfLifeDays:form.shelfLifeDays?Number(form.shelfLifeDays):undefined,preparationMinutes:form.preparationMinutes?Number(form.preparationMinutes):undefined, name: form.name, description: form.description, unit: form.unit, category: form.category, region: form.region };
    if(busy)return;setBusy(true);
    try{
      await api('/api/v1/catalog/products'+(existing?'/'+existing.id:''),existing?{action:'content',input:content,editToken:productEditLocks.get(existing.id)}:{coopId:form.coopId,input:{...content,kind:form.kind,price:Number(form.price),stockOnHand:Number(form.stock||0),preorder:form.kind==='preorder'?{totalSlots:Number(form.slots),deliveryFrom:form.from,deliveryTo:form.to,open:true}:undefined}});
      if(draftId)await api('/api/v1/product-drafts/'+draftId,undefined,'DELETE');
      syncNow();showToast('Đã lưu và đăng sản phẩm.');onClose();
    }catch(e){showToast(e instanceof Error?e.message:'Không lưu được sản phẩm.');}finally{setBusy(false);}
  };

  return (
    <BottomSheet
      title={existing ? `Sửa nội dung: ${existing.name}` : 'Thêm sản phẩm'}
      onClose={onClose}
      footer={
        <div className="flex gap-3">{!existing&&<PrimaryButton disabled={busy} onClick={saveDraft}>Lưu nháp</PrimaryButton>}<PrimaryButton disabled={busy||!editLock.ready} className="flex-1" onClick={save}>
          Lưu và đăng bán
        </PrimaryButton></div>
      }
    >
      {editLock.error&&<p role="alert" className="rounded border border-champagne-300 p-3 text-sm">{editLock.error} Hệ thống tự thử lại sau một phút.</p>}
      {user?.role==='admin'&&user.adminGroup==='quality'&&!existing&&<Field label="HTX bán sản phẩm"><Select value={form.coopId} onChange={e=>set({coopId:e.target.value,region:state.coops.find(c=>c.id===e.target.value)?.region??''})}>{state.coops.filter(c=>c.status==='active'&&c.profileStatus==='approved').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
      {!existing&&drafts.length>0&&<Field label="Tiếp tục bản nháp đã lưu"><Select value={draftId} onChange={e=>{setDraftId(e.target.value);const draft=drafts.find(d=>d.id===e.target.value);if(draft){setForm(f=>({...f,...draft.form}));setImages(draft.images??[]);setHarvestMonths(draft.harvestMonths??[]);}}}><option value="">Tạo mới</option>{drafts.map(d=><option key={d.id} value={d.id}>{d.form.name||'Chưa đặt tên'} · đến {new Date(d.expiresAt).toLocaleDateString('vi-VN')}</option>)}</Select></Field>}
      <Field label="Tên sản phẩm">
        <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quy cách">
          <Input list="product-units" value={form.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="Ví dụ: gói 100 g" />
          <datalist id="product-units">{state.catalogDictionaries?.filter(d=>d.kind==='unit'&&d.active).map(d=><option key={d.id} value={d.name}/>)}</datalist>
        </Field>
        <Field label="Nhóm hàng">
          <Select value={form.category} onChange={(e) => set({ category: e.target.value as Category })}>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Danh mục chi tiết"><Select value={form.catalogCategoryId} onChange={e=>set({catalogCategoryId:e.target.value})}><option value="">Theo nhóm hàng</option>{state.catalogCategories?.filter(c=>c.active&&c.group===form.category).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="Vùng sản xuất">
        <Input list="product-regions" value={form.region} onChange={(e) => set({ region: e.target.value })} />
        <datalist id="product-regions">{state.catalogDictionaries?.filter(d=>d.kind==='region'&&d.active).map(d=><option key={d.id} value={d.name}/>)}</datalist>
      </Field>
      <PhotoPicker photos={images} onChange={setImages} max={6}/>
      <Field label="Link QR truy xuất do HTX cung cấp"><Input type="url" maxLength={2000} value={form.traceUrl} onChange={e=>set({traceUrl:e.target.value})}/></Field>
      <fieldset><legend className="text-sm font-semibold">Tháng thu hoạch</legend><div className="grid grid-cols-3 gap-2">{Array.from({length:12},(_,i)=>i+1).map(month=><label key={month} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={harvestMonths.includes(month)} onChange={e=>setHarvestMonths(old=>e.target.checked?[...old,month].sort((a,b)=>a-b):old.filter(m=>m!==month))}/>Tháng {month}</label>)}</div></fieldset>
      <Field label="Bảo quản"><Textarea value={form.storage} maxLength={1000} onChange={e=>set({storage:e.target.value})}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Hạn dùng (ngày)"><Input type="number" min={1} max={form.category==='fresh'?30:1095} value={form.shelfLifeDays} onChange={e=>set({shelfLifeDays:e.target.value})}/></Field><Field label="Chuẩn bị (phút)"><Input type="number" min={0} value={form.preparationMinutes} onChange={e=>set({preparationMinutes:e.target.value})}/></Field></div>
      <Field label="Mô tả">
        <Textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      {!existing && (
        <>
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold text-stone-700">Loại đơn</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['ready', 'preorder'] as OrderKind[]).map((k) => (
                <label key={k} className={`flex min-h-11 items-center justify-center rounded-xl border text-sm ${form.kind === k ? 'border-forest-600 bg-forest-50 font-bold' : 'border-stone-200'}`}>
                  <input type="radio" className="sr-only" checked={form.kind === k} onChange={() => set({ kind: k })} />
                  {k === 'ready' ? 'Mua sẵn' : 'Đặt trước'}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giá bán (đồng)">
              <Input type="number" min={1} value={form.price} onChange={(e) => set({ price: e.target.value })} />
            </Field>
            {form.kind === 'ready' ? (
              <Field label="Tồn kho">
                <Input type="number" min={0} value={form.stock} onChange={(e) => set({ stock: e.target.value })} />
              </Field>
            ) : (
              <Field label="Số suất">
                <Input type="number" min={1} value={form.slots} onChange={(e) => set({ slots: e.target.value })} />
              </Field>
            )}
          </div>
          {form.kind === 'preorder' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Giao từ ngày">
                <Input type="date" value={form.from} onChange={(e) => set({ from: e.target.value })} />
              </Field>
              <Field label="Giao đến ngày">
                <Input type="date" value={form.to} onChange={(e) => set({ to: e.target.value })} />
              </Field>
            </div>
          )}
        </>
      )}
      <p className="text-sm text-stone-600">Sản phẩm mới và nội dung sửa đều cần Admin – Chất lượng duyệt trước khi hiện cho khách.</p>
    </BottomSheet>
  );
}
