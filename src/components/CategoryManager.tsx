import {useState} from 'react';
import {api} from '../store/backend';
import {useStore} from '../store/AppDataContext';
import {useUi} from '../app/UiContext';
import {CATEGORY_LABEL,type Category} from '../domain/types';
import {Field,Input,Select,PrimaryButton} from './form';
export function CategoryManager(){
  const {state,syncNow}=useStore(),{showToast}=useUi();const [id,setId]=useState(''),[name,setName]=useState(''),[group,setGroup]=useState<Category>('dry'),[active,setActive]=useState(true),[busy,setBusy]=useState(false);
  return <details className="mb-4 rounded-xl border bg-white p-4"><summary className="min-h-11 cursor-pointer font-semibold">Quản lý danh mục sản phẩm</summary><form className="mt-4 grid gap-3" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await api('/api/v1/categories',{id:id||undefined,name,group,active});syncNow();setId('');setName('');showToast('Đã lưu danh mục.');}catch(e){showToast(e instanceof Error?e.message:'Không lưu được.');}finally{setBusy(false);}}}><Field label="Danh mục"><Select value={id} onChange={e=>{setId(e.target.value);const c=state.catalogCategories?.find(c=>c.id===e.target.value);setName(c?.name??'');setGroup(c?.group??'dry');setActive(c?.active??true);}}><option value="">Tạo danh mục mới</option>{state.catalogCategories?.map(c=><option key={c.id} value={c.id}>{c.name}{c.active?'':' (ẩn)'}</option>)}</Select></Field><Field label="Tên danh mục"><Input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Nhóm nghiệp vụ"><Select value={group} onChange={e=>setGroup(e.target.value as Category)}>{Object.entries(CATEGORY_LABEL).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Select></Field><label className="text-sm"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Đang sử dụng</label><PrimaryButton disabled={busy}>Lưu danh mục</PrimaryButton></form></details>;
}
