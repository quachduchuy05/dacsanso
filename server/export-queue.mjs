import {randomUUID} from 'node:crypto';
import {assert,hash,ApiError} from './security.mjs';
import {canExportKind,filteredReport} from './reporting.mjs';
import {reportBounds} from './report-filters.mjs';
import {readReportSnapshot} from './report-snapshots.mjs';
import {workbook,parseCsv} from './xlsx.mjs';
import {actorOf} from '../src/domain/auth.ts';

export async function enqueueExport(db,auth,body){
  assert(canExportKind(auth.user,body.kind),403,'Không có quyền xuất loại báo cáo.');
  assert(['csv','xlsx'].includes(body.format??'csv'),400,'Chọn CSV hoặc XLSX.');
  assert(!body.filters||(typeof body.filters==='object'&&!Array.isArray(body.filters)),400,'Bộ lọc không hợp lệ.');reportBounds(body.filters??{});
  if(auth.user.role==='coop')assert(!body.filters?.coopId||body.filters.coopId===auth.user.coopId,403,'Không xuất dữ liệu HTX khác.');
  if(body.snapshotId)assert(['summary','orders'].includes(body.kind),400,'Phiên dashboard chỉ dùng cho tổng hợp và đơn.');
  const source=body.snapshotId?await readReportSnapshot(db,auth.user,body.snapshotId):await db.read(),now=new Date().toISOString();
  source.statsAt??=now;
  const id=randomUUID(),expiresAt=Date.now()+86400000,filters={...(body.filters??{}),...(auth.user.role==='coop'?{coopId:auth.user.coopId}:{})};
  const request={kind:body.kind,format:body.format??'csv',filters};
  await db.transaction(async()=>{
    assert(await db.rate('export-queue:'+auth.user.id,10,900000),429,'Tối đa 10 yêu cầu xuất nền trong 15 phút.');
    const active=await db.sql.prepare("SELECT id FROM export_jobs WHERE user_id=? AND status IN ('QUEUED','RUNNING')").all(auth.user.id);assert(active.length<3,429,'Tối đa 3 báo cáo đang chờ.');
    await db.sql.prepare('INSERT INTO export_jobs VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,auth.user.id,body.kind,'QUEUED',JSON.stringify(filters),source.statsAt,source.version,'report.'+request.format,null,expiresAt);
    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'export-request',auth.user.id,db.encodeJSON({request,source,coopId:auth.user.coopId??null}),expiresAt);
    await db.audit(auth.user.id,'export-queued',id);
  });return {id,status:'QUEUED',expiresAt};
}

export async function retryExport(db,auth,id){
  return db.transaction(async()=>{
    const job=await db.sql.prepare('SELECT * FROM export_jobs WHERE id=? AND user_id=?').get(id,auth.user.id);assert(job,404,'Không tìm thấy báo cáo.');
    assert(canExportKind(auth.user,job.kind),403,'Quyền xuất báo cáo đã bị thu hồi.');assert(job.status==='FAILED'&&job.expires_at>Date.now(),409,'Chỉ thử lại báo cáo lỗi còn hạn.');
    const record=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='export-request'").get(id);assert(record,409,'Không còn snapshot để thử lại.');
    const data=db.decodeJSON(record.data);if(auth.user.role==='coop')assert(data.coopId===auth.user.coopId,403,'Phạm vi HTX đã thay đổi.');
    assert(await db.rate('export-retry:'+auth.user.id,10,900000),429,'Thử lại quá nhiều lần.');
    await db.sql.prepare("UPDATE export_jobs SET status='QUEUED' WHERE id=?").run(id);await db.audit(auth.user.id,'export-retried',id);return {id,status:'QUEUED'};
  });
}

// The claim and result commit together: a process crash rolls back to QUEUED.
// This is a bounded database queue, not a distributed streaming export engine.
export async function processExportQueue(db){
  return db.transaction(async()=>{
    const job=await db.sql.prepare("SELECT * FROM export_jobs WHERE status='QUEUED' AND expires_at>? ORDER BY data_as_of LIMIT 1").get(Date.now());if(!job)return null;
    const claimed=await db.sql.prepare("UPDATE export_jobs SET status='RUNNING' WHERE id=? AND status='QUEUED' RETURNING id").get(job.id);if(!claimed)return null;
    try{
      const record=await db.sql.prepare("SELECT data FROM feature_records WHERE id=? AND kind='export-request'").get(job.id);assert(record,409,'Không còn snapshot báo cáo.');
      const data=db.decodeJSON(record.data),{state}=await db.read(),user=state.users.find(u=>u.id===job.user_id&&u.status==='active');
      assert(user&&(!user.expiresAt||Date.parse(user.expiresAt)>Date.now())&&canExportKind(user,job.kind),403,'Quyền xuất báo cáo đã bị thu hồi.');
      if(user.role==='coop')assert(data.coopId===user.coopId,403,'Phạm vi HTX đã thay đổi.');
      const report=await filteredReport(db,{user,actor:actorOf(user)},data.request,new Date(data.source.statsAt),data.source);
      assert(Buffer.byteLength(report.content)<=10000000,413,'Báo cáo quá lớn; thu hẹp bộ lọc.');
      const format=data.request.format,filename=report.filename.replace(/\.csv$/,'.'+format),bytes=format==='xlsx'?workbook(report.content):Buffer.from(report.content),content=format==='xlsx'?bytes.toString('base64'):report.content;
      const metadata={format,rowCount:Math.max(0,parseCsv(report.content).length-1),checksum:hash(bytes)};
      await db.sql.prepare("UPDATE export_jobs SET status='SUCCEEDED',filename=?,content=? WHERE id=?").run(filename,content,job.id);
      await db.sql.prepare("DELETE FROM feature_records WHERE id IN (?,?) AND kind='export-metadata'").run(job.id,job.id+'-meta');
      await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(job.id+'-meta','export-metadata',job.user_id,db.encodeJSON({...metadata,jobId:job.id}),job.expires_at);
      await db.audit(job.user_id,'export-succeeded',job.id);return {id:job.id,status:'SUCCEEDED'};
    }catch(e){
      await db.sql.prepare("UPDATE export_jobs SET status='FAILED',content=NULL WHERE id=?").run(job.id);
      await db.audit(job.user_id,'export-failed',job.id,e instanceof ApiError?String(e.status):'internal');return {id:job.id,status:'FAILED'};
    }
  });
}
