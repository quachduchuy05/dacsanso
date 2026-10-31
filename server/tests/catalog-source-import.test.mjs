import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../database.mjs';
import {buildCatalogImport,applyCatalogImport} from '../catalog-source-import.mjs';

function source(){return {schema:1,source:{spreadsheetId:'spreadsheet-test-123',spreadsheetUrl:'https://docs.google.com/spreadsheets/d/spreadsheet-test-123/edit'},tabs:[{sheetId:300729503,title:'1. Sản phẩm',values:[['STT','Tên sản phẩm','Tên gọi','Nhóm hàng','Vùng','Thu hoạch','Bán','Đơn vị','Khối lượng','HSD','Bảo quản','Vận chuyển','Ngoài phạm vi','Đề xuất','Tin cậy','Ghi chú'],['1','Chè kiểm thử','Tên địa phương','Hàng khô','Lào Cai','Quanh năm','Quanh năm','gói','100 g','Theo nhãn','Khô mát','Có','Không','Ưu tiên','Cần xác minh','Chưa có HTX, giá và quyền ảnh'],['3','Mận kiểm thử','','Nông sản tươi','Lào Cai']]},{sheetId:2,title:'Giá tham khảo',values:[['Sản phẩm','Giá'],['Chè kiểm thử','400.000–1.500.000/kg']]}]};}

test('source import preserves original tabs, missing sequence IDs, and never invents selling data',()=>{
  const input=source(),plan=buildCatalogImport(input,'root',new Date('2026-10-31T00:00:00Z'));
  assert.equal(plan.drafts.length,2);assert(plan.drafts[1].id.endsWith('-3'));
  for(const draft of plan.drafts){assert.equal(draft.data.form.price,'');assert.equal(draft.data.form.stock,'');assert.equal(draft.data.form.coopId,'');assert.deepEqual(draft.data.images,[]);assert(draft.data.importSource.requiresReview);}
  assert.equal(plan.drafts[1].data.form.category,'fresh');assert.deepEqual(plan.archive.data.tabs,input.tabs);
  const short=source();short.tabs[0].values[1][1]='Quế';assert.equal(buildCatalogImport(short,'root').drafts[0].data.form.name,'Quế');
});

test('source import is additive, encrypted and idempotent, preserving products, orders, money and edited drafts',async t=>{
  const db=new Database(':memory:',{demo:true,encryptionKey:'ab'.repeat(32)});t.after(()=>db.close());
  const before=db.read().state,owner=before.users.find(user=>user.adminGroup==='root'),plan=buildCatalogImport(source(),owner.id);
  const first=await db.transaction(()=>applyCatalogImport(db,plan));assert.equal(first.created,2);assert.deepEqual(db.read().state,before);
  const record=db.sql.prepare('SELECT data FROM feature_records WHERE id=?').get(plan.drafts[0].id);assert(record.data.startsWith('aes1:'));
  const edited=db.decodeJSON(record.data);edited.form.name='Tên được Admin sửa';db.sql.prepare('UPDATE feature_records SET data=? WHERE id=?').run(db.encodeJSON(edited),plan.drafts[0].id);
  const again=await db.transaction(()=>applyCatalogImport(db,plan));assert.equal(again.created,0);assert.equal(again.skipped,2);
  assert.equal(db.decodeJSON(db.sql.prepare('SELECT data FROM feature_records WHERE id=?').get(plan.drafts[0].id).data).form.name,edited.form.name);
  assert.equal(db.sql.prepare("SELECT COUNT(*) AS count FROM feature_records WHERE kind='catalog-import-source'").get().count,1);
});

test('ambiguous source IDs and unauthorized owners fail without writing records',async t=>{
  const input=source();input.tabs[0].values.push(input.tabs[0].values[1]);assert.throws(()=>buildCatalogImport(input,'root'),error=>error.status===409);
  const db=new Database(':memory:',{demo:true});t.after(()=>db.close());
  const customer=db.read().state.users.find(user=>user.role==='customer'),plan=buildCatalogImport(source(),customer.id);
  await assert.rejects(db.transaction(()=>applyCatalogImport(db,plan)),error=>error.status===403);
  assert.equal(db.sql.prepare('SELECT COUNT(*) AS count FROM feature_records').get().count,0);
});
