import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
import {aggregateStats,periodStats} from '../src/domain/stats.ts';

export async function createReportSnapshot(db,user,range){
  assert(['7d','30d','all'].includes(range),400,'Khoảng thời gian không hợp lệ.');
  const source=await db.read(),raw=source.state,dataAsOf=new Date().toISOString(),statsAt=new Date(Date.now()+raw.clockOffsetMs);
  // Keep only reporting fields: snapshots do not contain customer contacts, credentials or addresses.
  const state={coops:raw.coops.map(({id,name,region,status})=>({id,name,region,status})),products:raw.products.map(({id,coopId,name,region,status,category,kind,certifications})=>({id,coopId,name,region,status,category,kind,certifications:certifications?.map(({verified,validUntil})=>({verified,validUntil}))})),orders:raw.orders.map(({id,coopId,coopName,createdAt,status,items,pricing})=>({id,coopId,coopName,createdAt,status,items:items.map(({productId})=>({productId})),pricing:{itemsTotal:pricing.itemsTotal}})),tickets:raw.tickets.map(({id,orderId,coopId,createdAt,reason,priority,status,resolveDueAt})=>({id,orderId,coopId,createdAt,reason,priority,status,resolveDueAt})),reviews:[],ledgerEntries:[]};
  const snapshot={state,version:source.version,dataAsOf,statsAt:statsAt.toISOString(),range},snapshotId=randomUUID(),expiresAt=Date.now()+15*60000;
  await db.sql.prepare("DELETE FROM feature_records WHERE kind='report-snapshot' AND expires_at<?").run(Date.now());
  const previous=await db.sql.prepare("SELECT id FROM feature_records WHERE kind='report-snapshot' AND owner_id=? ORDER BY expires_at DESC").all(user.id);
  for(const row of previous.slice(9))await db.sql.prepare('DELETE FROM feature_records WHERE id=?').run(row.id);
  await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(snapshotId,'report-snapshot',user.id,db.encodeJSON(snapshot),expiresAt);
  await db.audit(user.id,'report-preview',snapshotId);
  return {snapshotId,dataAsOf,version:source.version,expiresAt,range,aggregate:aggregateStats(state,statsAt),period:periodStats(state,range,statsAt)};
}
export async function readReportSnapshot(db,user,id){
  assert(typeof id==='string'&&id.length<=100,400,'Mã phiên báo cáo không hợp lệ.');
  const row=await db.sql.prepare("SELECT data,expires_at FROM feature_records WHERE id=? AND kind='report-snapshot' AND owner_id=?").get(id,user.id);
  assert(row&&row.expires_at>Date.now(),410,'Phiên dữ liệu báo cáo đã hết hạn hoặc không thuộc tài khoản. Vui lòng làm mới số liệu.');
  return db.decodeJSON(row.data);
}
