import {describe,it,expect} from 'vitest';
import {coopRequestCertification,decideProductChange,validateContent} from '../productChanges';
import {COOP_X,ADMIN_QA,makeState,T0} from './fixtures';

const certificate={label:'VietGAP',issuer:'Đơn vị cấp',number:' CN-001 ',issuedOn:'2026-10-01',validUntil:'2026-10-15',photo:'data:image/png;base64,aGVsbG8='};
describe('Thông tin chứng nhận sản phẩm',()=>{
  it('tháng mùa vụ trong khoảng 1–12 và không trùng',()=>{
    const content={name:'Sản phẩm',description:'Mô tả',unit:'gói',region:'Bắc Hà',category:'dry' as const};
    expect(validateContent({...content,harvestMonths:[1,12]})).toBeNull();
    for(const harvestMonths of [[0],[13],[1,1],[1.5]])expect(validateContent({...content,harvestMonths})).not.toBeNull();
  });
  it('lưu số, ngày cấp và gửi chờ xác minh',()=>{
    const result=coopRequestCertification(makeState(),'x-dry',COOP_X,certificate,T0);
    expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.value.productChanges[0].cert).toMatchObject({number:'CN-001',issuedOn:'2026-10-01',verified:false});
  });
  it('từ chối thiếu số và ngày không tồn tại',()=>{
    for(const patch of [{number:''},{issuedOn:'2026-02-30'},{validUntil:'2026-11-31'},{issuedOn:undefined}]){
      expect(coopRequestCertification(makeState(),'x-dry',COOP_X,{...certificate,...patch},T0).ok).toBe(false);
    }
  });
  it('từ chối ngày cấp tương lai, hết hạn trước ngày cấp và chứng nhận hết hạn',()=>{
    for(const patch of [{issuedOn:'2026-10-20'},{issuedOn:'2026-10-10',validUntil:'2026-10-09'},{validUntil:'2026-10-13'}]){
      expect(coopRequestCertification(makeState(),'x-dry',COOP_X,{...certificate,...patch},T0).ok).toBe(false);
    }
  });
  it('không duyệt chứng nhận đã hết hạn trong lúc chờ, vẫn cho phép từ chối',()=>{
    const result=coopRequestCertification(makeState(),'x-dry',COOP_X,certificate,T0);if(!result.ok)throw new Error(result.error);
    const id=result.value.productChanges[0].id,at=new Date('2026-10-16T00:00:00+07:00');
    expect(decideProductChange(result.value,id,ADMIN_QA,true,'',at).ok).toBe(false);
    expect(decideProductChange(result.value,id,ADMIN_QA,false,'Đã hết hạn',at).ok).toBe(true);
  });
});
