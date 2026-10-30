import { canReadOrder } from '../src/domain/access.ts';
import { aggregateStats, periodStats } from '../src/domain/stats.ts';
import { DEFAULT_PARAMS } from '../src/domain/params.ts';
import { remainingFor } from '../src/domain/state.ts';

export function project(state,user) {
  const role=user?.role,group=user?.adminGroup,cid=user?.customerId,coopId=user?.coopId;
  const admin=role==='admin',root=admin&&group==='root',finance=admin&&group==='finance',ops=admin&&['root','operations'].includes(group),quality=admin&&group==='quality',cskh=admin&&group==='cskh';
  const actor=user?{kind:role,id:cid??coopId??user.id}:null;
  const out={clockOffsetMs:state.clockOffsetMs,params:state.params??DEFAULT_PARAMS};
  out.homepage=state.homepage;
  out.reviewPolicy=state.reviewPolicy??{requireModeration:false,windowDays:30};
  out.supportAgents=cskh?state.users.filter(u=>u.role==='admin'&&u.adminGroup==='cskh'&&u.status==='active').map(u=>({id:u.id,name:u.name})):[];
  for (const [k,v] of Object.entries(state)) if (Array.isArray(v)) out[k]=[];
  out.catalogDictionaries=(state.catalogDictionaries??[]).filter(item=>ops||item.active);
  out.catalogCategories=(state.catalogCategories??[]).filter(c=>admin||c.active);
  Object.assign(out,{carts:{},lowStockAlerts:{},favorites:{},follows:{},savedVouchers:{},seasonWatches:{},seasonAlerts:{},chatReads:{}});
  out.wards=state.wards; out.giftBoxTypes=state.giftBoxTypes;
  out.coops=state.coops.map(c=>admin||(role==='coop'&&c.id===coopId)?c:{id:c.id,name:c.name,region:c.region,description:c.description,status:c.status,profileStatus:c.profileStatus});
  out.products=state.products.filter(p=>admin||(role==='coop'&&p.coopId===coopId)||p.status==='active').map(p=>admin||(role==='coop'&&p.coopId===coopId)?p:{...p,certifications:p.certifications?.filter(c=>c.verified)});
  out.availability=Object.fromEntries(out.products.map(p=>[p.id,remainingFor(state,p)]));
  const sales=new Map();for(const o of state.orders)if(o.status==='delivered')for(const item of o.items)sales.set(item.productId,(sales.get(item.productId)??0)+item.quantity);
  out.products=out.products.map(p=>({...p,soldCount:sales.get(p.id)??0}));
  out.vouchers=state.vouchers;
  out.users=ops?state.users: user?[user]:[];
  out.customers=state.customers.filter(c=>(admin&&!root)||(role==='customer'&&c.id===cid)).map(c=>{
    const copy={...c}; if(copy.refundAccount&&!finance&&!(role==='customer'&&c.id===cid))delete copy.refundAccount;return copy;
  });
  if (user && role!=='regulator') {
    out.orders=root?[]:state.orders.filter(o=>canReadOrder(actor,o)).map(o=>{
      if((admin&&group==='operations')||role==='coop'||role==='shipper')return o;
      const {pickupPoint,...copy}=o;return copy;
    });
    const orderIds=new Set(out.orders.map(o=>o.id));
    out.addresses=state.addresses.filter(a=>role==='customer'&&a.customerId===cid);
    if(role==='customer')out.carts={[cid]:state.carts[cid]??[]};
    out.checkouts=state.checkouts.filter(c=>(admin&&!root)||(role==='customer'&&c.customerId===cid));
    out.transactions=state.transactions.filter(t=>finance||(role==='customer'&&t.customerId===cid));
    out.refunds=state.refunds.filter(r=>finance||cskh||(role==='customer'&&r.customerId===cid));
    out.tickets=state.tickets.filter(t=>cskh||(role==='customer'&&t.customerId===cid)||(role==='coop'&&t.coopId===coopId));
    out.productChanges=state.productChanges.filter(p=>quality||(role==='coop'&&p.coopId===coopId));
    out.payoutPeriods=state.payoutPeriods.filter(p=>finance||(role==='coop'&&p.coopId===coopId));
    out.ledgerEntries=finance?state.ledgerEntries:[];
    out.paramHistory=ops?state.paramHistory:[];
    out.auditLogs=admin&&group==='root'?state.auditLogs:[];
    out.notifications=state.notifications.filter(n=>n.userId===user.id);
    out.harvests=(state.harvests??[]).filter(h=>admin||(role==='coop'&&h.coopId===coopId));
    out.orderMessages=(state.orderMessages??[]).filter(m=>orderIds.has(m.orderId));
    out.directMessages=(state.directMessages??[]).filter(m=>(role==='customer'&&m.customerId===cid)||(role==='coop'&&m.coopId===coopId));
    out.chatReads=Object.fromEntries(Object.entries(state.chatReads??{}).filter(([k])=>role==='customer'?k.startsWith(cid+'|'):role==='coop'&&k.endsWith('|'+coopId)));
    out.coopApplications=quality?(state.coopApplications??[]):[];
    out.codRemittances=(state.codRemittances??[]).filter(r=>finance||(role==='shipper'&&r.shipperId===user.id));
    out.voucherUsages=finance?state.voucherUsages:state.voucherUsages.filter(v=>role==='customer'&&v.customerId===cid);
    for(const key of ['favorites','follows','savedVouchers','seasonWatches']) if(role==='customer')out[key]={[cid]:state[key]?.[cid]??[]};
    if(ops)out.demoAccess=state.demoAccess;
  }
  out.reviews=state.reviews.filter(r=>cskh||(role==='customer'&&r.customerId===cid)||(role==='coop'&&state.products.some(p=>p.id===r.productId&&p.coopId===coopId))||r.status==='visible').map(r=>{
    if(admin||(role==='customer'&&r.customerId===cid))return r;
    const {customerId,orderId,hiddenReason,...publicReview}=r;return publicReview;
  });
  // QLNN receives aggregates only; never customer/order rows or financial source records.
  if(role==='regulator') {
    out.products=out.products.map(({id,coopId,name,region,category,status,kind})=>({id,coopId,name,region,category,status,kind}));
    out.reviews=[];out.customers=[];
  }
  if(admin||role==='regulator') out.serverStats={aggregate:aggregateStats(state),periods:Object.fromEntries(['7d','30d','all'].map(k=>[k,periodStats(state,k,new Date(Date.now()+state.clockOffsetMs))]))};
  return out;
}
