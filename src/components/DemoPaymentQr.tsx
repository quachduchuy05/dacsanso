import {useEffect,useState} from 'react';
import type {Transaction} from '../domain/types';
import {formatMoney} from '../domain/pricing';

/** This QR contains demo information only, never banking/payment instructions. */
export function DemoPaymentQr({transaction}:{transaction:Pick<Transaction,'id'|'amount'|'expiresAt'>}){
  const {id,amount,expiresAt}=transaction,[qr,setQr]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;setQr('');setError('');
    const payload=JSON.stringify({type:'DAC_SAN_SO_DEMO_ONLY',notice:'DEMO - KHONG CHUYEN TIEN',transactionId:id,amount,currency:'VND',expiresAt});
    void import('qrcode').then(module=>module.toDataURL(payload,{width:280,margin:4,errorCorrectionLevel:'M',color:{dark:'#102c20',light:'#ffffff'}})).then(src=>{if(!cancelled)setQr(src);}).catch(()=>{if(!cancelled)setError('Không tạo được QR demo. Bạn vẫn có thể dùng các nút mô phỏng bên dưới.');});
    return()=>{cancelled=true;};
  },[id,amount,expiresAt]);
  return <section aria-labelledby="payment-qr-heading" className="rounded-2xl border border-forest-200 bg-forest-50/60 p-4">
    <h3 id="payment-qr-heading" className="mb-3 text-center text-base font-bold text-forest-950">Quét mã QR thanh toán demo</h3>
    <div className="grid items-center gap-4 sm:grid-cols-[224px_minmax(0,1fr)]">
      <div className="mx-auto flex min-h-56 w-56 max-w-full items-center justify-center rounded-xl border border-stone-200 bg-white p-2">
        {qr?<img src={qr} width={224} height={224} alt="Mã QR thanh toán demo, không chuyển tiền thật" className="h-auto w-full"/>:<p role="status" className="p-3 text-center text-sm">{error?'QR chưa khả dụng':'Đang tạo mã QR…'}</p>}
      </div>
      <div className="min-w-0 space-y-3 text-sm"><dl className="space-y-2"><div><dt className="text-stone-600">Mã giao dịch</dt><dd className="break-all font-mono font-semibold text-forest-950">{id}</dd></div><div><dt className="text-stone-600">Số tiền trong mã</dt><dd className="text-xl font-bold text-forest-950">{formatMoney(amount)}</dd></div><div><dt className="text-stone-600">Hết hạn lúc</dt><dd className="font-medium">{new Date(expiresAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</dd></div></dl>
        <p className="rounded-lg border border-champagne-200 bg-champagne-50 p-3 text-stone-800"><strong>QR demo — không chuyển tiền.</strong> Quét bằng camera hoặc ứng dụng đọc QR để xem thông tin giao dịch. Mã này không dùng trong ứng dụng ngân hàng.</p>
        <p className="text-stone-600">Để test kết quả, chọn “Thanh toán thành công” hoặc “Thanh toán thất bại” bên dưới. Quét QR không tự xác nhận đã trả tiền.</p>
      </div>
    </div>{error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
  </section>;
}
