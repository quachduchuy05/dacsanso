import type {SettlementLine} from '../domain/types';
import {formatMoney} from '../domain/pricing';
export function SettlementDetails({lines}:{lines:SettlementLine[]}){
  return <div className="w-full overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr>{['Đơn','Tiền hàng','Hoa hồng','Phí giao','Tiền hoàn','Chi trả HTX'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{lines.map(line=><tr className="border-t" key={line.orderId}><td className="p-2 font-mono text-xs">{line.orderId}</td><td>{formatMoney(line.goods)}</td><td>{formatMoney(line.commission)}</td><td>{line.shippingFee===undefined?'Chưa lưu ở kỳ cũ':formatMoney(line.shippingFee)}</td><td>{formatMoney(line.refunded)}</td><td>{formatMoney(line.payout)}</td></tr>)}</tbody></table><p className="p-2 text-xs text-stone-600">Phí giao hiển thị riêng để đối chiếu, không cộng vào doanh thu hoặc chi trả HTX.</p></div>;
}
