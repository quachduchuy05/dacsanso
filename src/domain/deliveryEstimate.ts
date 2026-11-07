import type {Params} from './params';
export function readyDeliveryEstimate(params:Pick<Params,'readyDeliveryDays'>,at:Date):string|undefined {
  if(!Number.isInteger(params.readyDeliveryDays)||!params.readyDeliveryDays||params.readyDeliveryDays<0||params.readyDeliveryDays>14)return undefined;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
  return new Date(Date.parse(day+'T00:00:00Z')+params.readyDeliveryDays*86400000).toISOString().slice(0,10);
}
