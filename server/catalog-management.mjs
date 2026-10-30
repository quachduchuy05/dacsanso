import {assert} from './security.mjs';
import {validateMediaReferences} from './media.mjs';
import {requireProductLock} from './product-locks.mjs';
import * as productDomain from '../src/domain/productChanges.ts';
import {coopAddVariant} from '../src/domain/variants.ts';
import {audit} from '../src/domain/state.ts';

export async function manageCatalog(productId,body,{db,auth}){
  assert(auth.user.role==='admin'&&auth.user.adminGroup==='quality',403,'Chỉ Admin – Chất lượng quản lý sản phẩm.');
  const {state}=await db.read(),at=new Date(Date.now()+state.clockOffsetMs),old=productId?state.products.find(p=>p.id===productId):null;
  assert(!productId||old,404,'Không tìm thấy sản phẩm.');
  const coopId=old?.coopId??body.coopId,coop=state.coops.find(c=>c.id===coopId);
  assert(coop&&coop.status==='active'&&coop.profileStatus==='approved',400,'Chọn HTX đã duyệt, đang có quyền bán.');
  const owner={kind:'coop',id:coop.id,name:auth.user.name},action=productId?body.action:'create';
  let input=body.input;
  if(['create','content'].includes(action)){
    assert(input&&typeof input==='object'&&!Array.isArray(input),400,'Thiếu thông tin sản phẩm.');
    const allowed=['name','description','unit','category','region','images','storage','shelfLifeDays','preparationMinutes','harvestMonths','catalogCategoryId','traceUrl',...(action==='create'?['kind','price','stockOnHand','preorder']:[])];
    input=Object.fromEntries(Object.entries(input).filter(([key])=>allowed.includes(key)));
  }
  validateMediaReferences(body,state,auth.user);
  if(['create','content'].includes(action)){
    assert(input&&typeof input.name==='string'&&input.name.trim().length>=5&&input.name.trim().length<=100,400,'Tên sản phẩm từ 5–100 ký tự.');
    assert(typeof input.description==='string'&&input.description.trim().length>=20&&input.description.length<=2000,400,'Mô tả từ 20–2.000 ký tự.');
    assert(['dry','fresh','processed'].includes(input.category)&&typeof input.unit==='string'&&typeof input.region==='string',400,'Nhóm hàng, quy cách và vùng không hợp lệ.');
    assert(!state.products.some(p=>p.coopId===coop.id&&p.id!==old?.id&&!p.variantOf&&p.name.trim().toLocaleLowerCase('vi')===input.name.trim().toLocaleLowerCase('vi')&&p.id!==old?.variantOf),409,'Tên sản phẩm đã có trong HTX.');
  }
  if(['create','price','variant'].includes(action)){
    const price=action==='price'?body.price:input?.price;assert(Number.isInteger(price)&&price>=1000&&price<=10000000,400,'Giá từ 1.000–10.000.000 đồng.');
  }
  let result;
  if(action==='create'){
    assert(Array.isArray(input.images)&&input.images.length>=1&&input.images.length<=6,400,'Sản phẩm mới cần từ 1–6 ảnh.');
    assert(['ready','preorder'].includes(input.kind),400,'Hình thức bán không hợp lệ.');
    result=productDomain.coopCreateProduct(state,owner,input,at);
  }else if(action==='content'){
    await requireProductLock(db,state,auth.user,{name:'qualityEditProduct',args:[productId],editToken:body.editToken});
    result=productDomain.coopRequestContentChange(state,productId,owner,input,at);
  }else if(action==='price')result=productDomain.coopRequestPriceChange(state,productId,owner,body.price,typeof body.reason==='string'?body.reason:'',at);
  else if(action==='visibility'){
    assert(typeof body.hidden==='boolean',400,'Trạng thái không hợp lệ.');result=productDomain.coopSetProductHidden(state,productId,owner,body.hidden,at);
  }else if(action==='express'){
    assert(typeof body.enabled==='boolean',400,'Cờ hỏa tốc không hợp lệ.');result=productDomain.coopRequestExpress(state,productId,owner,body.enabled,at);
  }else if(action==='cert'){
    assert(input&&['label','issuer','number','issuedOn','validUntil','photo'].every(k=>typeof input[k]==='string'),400,'Nhập đầy đủ chứng nhận và ảnh.');result=productDomain.coopRequestCertification(state,productId,owner,input,at);
  }else if(action==='preorder'){
    assert(input&&typeof input.deliveryFrom==='string'&&typeof input.deliveryTo==='string',400,'Thiếu lịch giao.');result=productDomain.coopRequestPreorder(state,productId,owner,input,'Admin – Chất lượng cấu hình',at);
  }else if(action==='variant'){
    assert(input&&typeof input.unit==='string',400,'Quy cách không hợp lệ.');result=coopAddVariant(state,owner,productId,input,at);
  }else assert(false,400,'Thao tác sản phẩm không hỗ trợ.');
  assert(result.ok,422,result.error);
  let next=result.value.state??result.value;
  const id=result.value.product?.id??productId;
  if(!['visibility'].includes(action)){
    const request=next.productChanges.find(r=>r.productId===id&&r.status==='pending'&&!state.productChanges.some(prior=>prior.id===r.id));
    assert(request,409,'Không xác định được nội dung cần đăng.');
    const decided=productDomain.decideProductChange(next,request.id,auth.actor,true,'',at);assert(decided.ok,422,decided.error);next=decided.value;
  }
  // Attribute the operation to Quality, not the internal validation adapter.
  next={...next,auditLogs:state.auditLogs};
  const product=next.products.find(p=>p.id===id);
  next=audit(next,auth.actor,'Quản lý sản phẩm: '+action,id,at,JSON.stringify({before:old?{price:old.price,status:old.status,name:old.name}:null,after:{price:product.price,status:product.status,name:product.name}}));
  await db.save(next);await db.audit(auth.user.id,'catalog-'+action,id,JSON.stringify({beforePrice:old?.price,afterPrice:product.price}));
  return {product};
}
