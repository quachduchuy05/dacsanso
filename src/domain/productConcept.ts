import type { Product } from './types';

/** Display fallback only: never creates an approved media record or a 3D model. */
export function productConcept(product: Pick<Product,'name'>): string | undefined {
  const name=product.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
  const entries: [RegExp,string][]=[[/che shan/,'shan-tea'],[/thao qua/,'cardamom'],[/mut.*man|o mai.*man/,'plum-preserve'],[/mat ong/,'honey'],[/gao seng cu/,'seng-cu-rice'],[/pho hong/,'pink-noodles'],[/man tam hoa/,'fresh-plums'],[/com tu le/,'tu-le-com'],[/buoi dai minh/,'dai-minh-pomelo']];
  const slug=entries.find(([pattern])=>pattern.test(name))?.[1];
  return slug?`/images/concepts/${slug}-3d-v1.webp`:undefined;
}

export function productConceptModel(product: Pick<Product,'name'>): {src:string;poster:string}|undefined {
  const poster=productConcept(product);
  if(!poster)return;
  const slug=poster.split('/').at(-1)!.replace('-3d-v1.webp','');
  return {src:`/models/concepts/${slug}-v1.glb`,poster};
}
