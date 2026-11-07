export type MediaKind='image'|'video'|'spin'|'model';
export type MediaGroup='main'|'variant'|'usage'|'origin';
export interface ProductMedia {
  id:string;kind:MediaKind;group:MediaGroup;order:number;alt:string;variantId?:string;
  files:string[];poster?:string;status:'pending'|'approved'|'needs_changes';reason?:string;
  source:'self'|'supplier'|'commissioned';hasPeople:boolean;consent?:string;
  submittedBy?:string;reviewedBy?:string;reviewedAt?:string;
}
export interface MediaEntry {id:string;approved?:ProductMedia;pending?:ProductMedia}
export function sortMedia(items:ProductMedia[]):ProductMedia[]{
  const rank=(m:ProductMedia)=>m.kind==='image'?({main:0,variant:2,usage:3,origin:4}[m.group]):m.kind==='video'?5:1;
  return [...items].sort((a,b)=>rank(a)-rank(b)||a.order-b.order||a.id.localeCompare(b.id));
}
export const assetUrl=(id:string)=>'/api/v1/products/media-assets/'+encodeURIComponent(id);
