import {describe,it,expect} from 'vitest';
import {productConcept} from '../productConcept';
describe('product concept matching',()=>{
  it('distinguishes preserved plums from fresh fruit and accepts accents',()=>{
    expect(productConcept({name:'Mứt / ô mai mận tam hoa'})).toContain('plum-preserve');
    expect(productConcept({name:'Mận tam hoa tươi'})).toContain('fresh-plums');
    expect(productConcept({name:'Gạo Séng Cù 5 kg'})).toContain('seng-cu-rice');
    expect(productConcept({name:'Chè Shan tuyết'})).toContain('shan-tea');
  });
  it('never assigns an unrelated concept to an unknown product',()=>{
    expect(productConcept({name:'Sản phẩm mới'})).toBeUndefined();
  });
});
