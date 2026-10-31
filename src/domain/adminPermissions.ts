import type {AdminSubGroup} from './types';

/** Root is the unified administrator. Legacy staff groups remain scoped. */
export function adminGroupCan(actual:AdminSubGroup|undefined,required:AdminSubGroup):boolean{
  return actual==='root'||actual===required;
}
