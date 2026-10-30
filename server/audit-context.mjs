import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {assert} from './security.mjs';
export const auditContext=new AsyncLocalStorage();
export function auditMetadata(action){
  return {correlationId:auditContext.getStore()?.correlationId??randomUUID(),outcome:['access-denied','password-login-failed','request-failed'].includes(action)?'failure':'success'};
}
export function auditFilterSql(filters){
  let sql='';const args=[];
  for(const [key,column] of [['actor','user_id'],['action','action'],['target','target'],['outcome','outcome'],['correlationId','correlation_id']])if(filters[key]){
    assert(typeof filters[key]==='string'&&filters[key].length<=200,400,'Bộ lọc nhật ký không hợp lệ.');
    if(key==='outcome')assert(['success','failure','unknown'].includes(filters[key]),400,'Kết quả không hợp lệ.');
    sql+=` AND ${column}=?`;args.push(filters[key]);
  }
  return {sql,args};
}
