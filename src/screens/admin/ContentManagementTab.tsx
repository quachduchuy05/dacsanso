import {Phase2ExperiencePanel} from './Phase2ExperiencePanel';
import {useState} from 'react';
import {useStore} from '../../store/AppDataContext';
import {api} from '../../store/backend';
import {Field,Input,Textarea,Select,PrimaryButton,SecondaryButton} from '../../components/form';
import {PhotoPicker} from '../../components/PhotoPicker';

export function CatalogDictionaryManager(){
  const {state,syncNow}=useStore(),[kind,setKind]=useState('region'),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const save=async(body:unknown)=>{setBusy(true);setError('');try{await api('/api/v1/catalog-dictionaries',body);setName('');syncNow();}catch(e){setError(e instanceof Error?e.message:'Không lưu được.');}finally{setBusy(false);}};
  return <section className="space-y-3 rounded border bg-white p-4"><h3 className="font-bold">Địa phương, đơn vị tính và loại chứng nhận</h3><form className="grid gap-3 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();void save({kind,name,active:true});}}><Field label="Loại danh mục"><Select value={kind} onChange={e=>setKind(e.target.value)}><option value="region">Địa phương</option><option value="unit">Đơn vị tính</option><option value="certification">Loại chứng nhận</option></Select></Field><Field label="Tên danh mục"><Input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></Field><PrimaryButton disabled={busy}>Thêm danh mục</PrimaryButton></form>
    {(state.catalogDictionaries??[]).filter(item=>item.kind===kind).map(item=><div className="flex items-center justify-between gap-3 border-t py-2" key={item.id}><span>{item.name} · {item.active?'Đang dùng':'Đã ẩn'}</span><SecondaryButton disabled={busy} onClick={()=>save({...item,active:!item.active})}>{item.active?'Ẩn':'Mở lại'}</SecondaryButton></div>)}{error&&<p role="alert">{error}</p>}
  </section>;
}
export function ContentManagementTab(){
  const {state,syncNow}=useStore(),[form,setForm]=useState(state.homepage??{title:'Tinh hoa đặc sản Việt.',subtitle:'Gói trọn hương vị quê hương.',description:'Khám phá đặc sản từ các hợp tác xã vùng cao Lào Cai.',collectionTitle:'Đặc sản theo mùa',image:'',featuredProductIds:[] as string[]}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  return <><Phase2ExperiencePanel/><form className="space-y-4 rounded border bg-white p-4" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{await api('/api/v1/homepage',form);syncNow();setMessage('Đã cập nhật nội dung trang chủ.');}catch(e){setMessage(e instanceof Error?e.message:'Không cập nhật được.');}finally{setBusy(false);}}}>
    <h2 className="text-lg font-bold">Nội dung trang chủ</h2>
    {([['title','Tiêu đề banner'],['subtitle','Dòng nhấn banner'],['collectionTitle','Tên bộ sưu tập']] as const).map(([key,label])=><Field key={key} label={label}><Input required maxLength={160} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></Field>)}
    <Field label="Mô tả banner"><Textarea required maxLength={1000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>
    <p className="rounded-xl bg-stone-50 p-3 text-sm text-muted">Ảnh sản phẩm và các tuyển tập Đang vào vụ, Bán chạy, Quà biếu được quản lý ở Duyệt sản phẩm & giá → chọn sản phẩm → Thư viện ảnh, video & 3D. Trang chủ lấy ảnh sản phẩm đã duyệt, không dùng banner phong cảnh.</p>
    <PrimaryButton disabled={busy}>Lưu nội dung trang chủ</PrimaryButton>{message&&<p role="status">{message}</p>}
  </form></>;
}
