import {assert} from './security.mjs';
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function assertFinancialIntegrity(previous,next){
  assert(Array.isArray(next.ledgerEntries)&&Array.isArray(next.payoutPeriods),409,'Thiếu sổ tiền hoặc kỳ chi trả.');
  const ledger=new Map(next.ledgerEntries.map(entry=>[entry.id,entry]));
  assert(ledger.size===next.ledgerEntries.length,409,'Trùng mã dòng sổ.');
  for(const entry of next.ledgerEntries)assert(typeof entry.id==='string'&&Number.isSafeInteger(entry.amount),409,'Dòng sổ cần mã duy nhất và số tiền nguyên VND.');
  for(const entry of previous.ledgerEntries)assert(ledger.has(entry.id)&&stable(ledger.get(entry.id))===stable(entry),409,'Không sửa hoặc xóa dòng sổ đã ghi. Điều chỉnh bằng dòng mới.');
  const periods=new Map(next.payoutPeriods.map(period=>[period.id,period]));
  assert(periods.size===next.payoutPeriods.length,409,'Trùng mã kỳ chi trả.');
  const frozen=period=>Object.fromEntries(['id','coopId','start','end','lines','retained','commission','payout','closedAt','closedBy','policy','reserveAmount','reserveUntil','payoutFee'].map(key=>[key,period[key]]));
  for(const before of previous.payoutPeriods){
    const after=periods.get(before.id);assert(after&&stable(frozen(after))===stable(frozen(before)),409,'Kỳ đã chốt không được sửa hoặc xóa nội dung đối soát.');
    if(before.disbursements){
      assert(Array.isArray(after.disbursements)&&after.disbursements.length>=before.disbursements.length&&before.disbursements.every((item,index)=>stable(item)===stable(after.disbursements[index])),409,'Không sửa hoặc xóa chứng từ chi trả cũ.');
      const payments=after.disbursements;assert(payments.every(item=>Number.isSafeInteger(item.amount)&&item.amount>0)&&payments.reduce((sum,item)=>sum+item.amount,0)<=after.payout,409,'Tổng chi trả không được vượt số tiền kỳ đã chốt.');
    }
    if(before.status==='paid')assert(stable(after)===stable(before),409,'Kỳ đã chi trả không được sửa.');
    else assert(['closed','paid'].includes(after.status),409,'Trạng thái kỳ chi trả không hợp lệ.');
  }
}
