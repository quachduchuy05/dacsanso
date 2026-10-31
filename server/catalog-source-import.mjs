import {createHash} from 'node:crypto';
import {assert} from './security.mjs';

const checksum=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function buildCatalogImport(source,ownerId,at=new Date()){
  assert(source?.schema===1&&/^[\w-]{10,100}$/.test(source.source?.spreadsheetId??''),400,'Nguồn nhập không hợp lệ.');
  assert(Array.isArray(source.tabs)&&source.tabs.length>0,400,'Thiếu các tab nguồn.');
  const products=source.tabs.find(tab=>tab.sheetId===300729503);
  assert(products&&Array.isArray(products.values)&&products.values[0]?.[0]==='STT'&&products.values[0]?.[1]==='Tên sản phẩm',400,'Cấu trúc bảng sản phẩm đã thay đổi.');
  const headers=products.values[0],rows=products.values.slice(1).map((row,index)=>({row,index:index+2})).filter(({row})=>row.some(value=>String(value??'').trim()));
  assert(rows.length>0&&rows.length<=100,400,'Cần từ 1–100 dòng sản phẩm để nhập nháp.');
  const ids=new Set(),expiresAt=at.getTime()+30*86400000;
  const drafts=rows.map(({row,index})=>{
    assert(/^\d+$/.test(String(row[0]??''))&&String(row[1]??'').trim().length>0,400,'Dòng sản phẩm thiếu STT hoặc tên hợp lệ.');
    const sourceId=String(Number(row[0]));assert(!ids.has(sourceId),409,'STT bị trùng trong bảng nguồn.');ids.add(sourceId);
    const name=String(row[1]).trim();assert(name.length<=100,400,'Tên sản phẩm dài quá giới hạn bản nháp.');
    const group=String(row[3]??'').toLocaleLowerCase('vi-VN');
    const category=group.includes('tươi')?'fresh':group.includes('chế biến')?'processed':'dry';
    const description=['Dữ liệu nghiên cứu nhập từ bảng nguồn; cần xác minh với đơn vị bán trước khi đăng.',...headers.slice(2).map((label,column)=>row[column+2]?`${String(label).trim()}: ${row[column+2]}`:'')].filter(Boolean).join('\n').slice(0,2000);
    return {id:`drive-${source.source.spreadsheetId}-${sourceId}`,kind:'product-draft',ownerId,expiresAt,data:{
      form:{coopId:'',traceUrl:'',name,description,unit:String(row[7]??'').trim(),category,catalogCategoryId:'',region:String(row[4]??'').trim(),kind:'ready',price:'',stock:'',slots:'',from:'',to:'',storage:String(row[10]??'').trim(),shelfLifeDays:'',preparationMinutes:''},
      images:[],harvestMonths:[],updatedAt:at.toISOString(),
      importSource:{spreadsheetId:source.source.spreadsheetId,sheetId:products.sheetId,row:index,sourceId,url:source.source.spreadsheetUrl,requiresReview:true},
    }};
  });
  const hash=checksum({tabs:source.tabs,richSourceCells:source.richSourceCells??null});
  return {drafts,archive:{id:'catalog-import-'+hash,kind:'catalog-import-source',ownerId,expiresAt:0,data:{source:source.source,tabs:source.tabs,richSourceCells:source.richSourceCells??null,checksum:hash,importedAt:at.toISOString(),draftIds:drafts.map(draft=>draft.id)}},summary:{products:drafts.length,tabs:source.tabs.map(tab=>({title:tab.title,rows:tab.values.length})),checksum:hash}};
}

/** Caller holds a database transaction. Never modifies products, accounts, orders or money. */
export async function applyCatalogImport(db,plan){
  const {state}=await db.read(),owner=state.users.find(user=>user.id===plan.archive.ownerId);
  assert(owner?.role==='admin'&&['root','quality'].includes(owner.adminGroup)&&owner.status==='active'&&!owner.accessClosedAt,403,'Chủ bản nháp phải là Admin gốc hoặc Chất lượng đang hoạt động.');
  const records=await db.sql.prepare("SELECT id,owner_id FROM feature_records WHERE kind='product-draft'").all();
  const missing=plan.drafts.filter(draft=>!records.some(record=>record.id===draft.id));
  assert(records.filter(record=>record.owner_id===owner.id).length+missing.length<=100,409,'Bản nháp hiện có và dữ liệu nhập vượt giới hạn 100.');
  let created=0,skipped=0;
  for(const draft of plan.drafts){
    const existing=await db.sql.prepare('SELECT id,owner_id,kind FROM feature_records WHERE id=?').get(draft.id);
    if(existing){assert(existing.owner_id===owner.id&&existing.kind===draft.kind,409,'Mã bản nháp trùng với dữ liệu khác.');skipped++;continue;}
    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(draft.id,draft.kind,owner.id,db.encodeJSON(draft.data),draft.expiresAt);created++;
  }
  const archive=plan.archive;
  const archived=await db.sql.prepare('SELECT id FROM feature_records WHERE id=?').get(archive.id);
  if(!archived)await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(archive.id,archive.kind,owner.id,db.encodeJSON(archive.data),0);
  await db.audit(owner.id,'catalog-source-imported',archive.id,JSON.stringify({created,skipped,checksum:archive.data.checksum,sourceId:archive.data.source.spreadsheetId}));
  return {created,skipped,archiveId:archive.id,productsUnchanged:state.products.length};
}
