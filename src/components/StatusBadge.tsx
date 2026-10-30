import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus, type PaymentStatus } from '../domain/types';

const ORDER_TONE: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-champagne-100 text-champagne-900',
  awaiting_confirmation: 'bg-sky-100 text-sky-900',
  confirmed: 'bg-sky-100 text-sky-900',
  awaiting_harvest: 'bg-lime-100 text-lime-900',
  preparing: 'bg-indigo-100 text-indigo-900',
  shipping: 'bg-violet-100 text-violet-900',
  delivered: 'bg-forest-100 text-forest-800',
  return_refund: 'bg-rose-100 text-rose-900',
  returning: 'bg-rose-100 text-rose-900',
  returned: 'bg-stone-200 text-stone-800',
  cancelled: 'bg-stone-200 text-stone-700',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${ORDER_TONE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className="inline-block rounded-md border border-stone-200 bg-white px-2 py-0.5 text-xs font-semibold text-stone-700">
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}
