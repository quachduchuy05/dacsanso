import { describe, expect, it } from 'vitest';
import { availableStock, remainingSlots, validateQuantity, validateStockUpdate, type HoldingOrder } from '../stock';

describe('Tồn kho và suất đặt trước (mục 5.6)', () => {
  it('T9: còn 15 suất, đặt 21 bị chặn; đặt 15 thì được và suất còn 0', () => {
    const orders: HoldingOrder[] = [{ status: 'awaiting_confirmation', kind: 'preorder', items: [{ productId: 'man', quantity: 85 }] }];
    const remaining = remainingSlots(100, 'man', orders);
    expect(remaining).toBe(15);
    expect(validateQuantity(21, remaining).ok).toBe(false);
    expect(validateQuantity(15, remaining)).toEqual({ ok: true, value: 15 });

    const after = [...orders, { status: 'awaiting_payment', kind: 'preorder', items: [{ productId: 'man', quantity: 15 }] } as HoldingOrder];
    expect(remainingSlots(100, 'man', after)).toBe(0);
  });

  it('tồn khả dụng = tồn kho − số đang giữ; đơn huỷ hoặc đã bàn giao không còn giữ', () => {
    const orders: HoldingOrder[] = [
      { status: 'awaiting_payment', kind: 'ready', items: [{ productId: 'gao', quantity: 3 }] },
      { status: 'cancelled', kind: 'ready', items: [{ productId: 'gao', quantity: 4 }] },
      { status: 'shipping', kind: 'ready', items: [{ productId: 'gao', quantity: 2 }] },
    ];
    expect(availableStock(10, 'gao', orders)).toBe(7);
  });

  it('HTX không được đặt tồn kho nhỏ hơn số đang giữ', () => {
    expect(validateStockUpdate(2, 3).ok).toBe(false);
    expect(validateStockUpdate(3, 3).ok).toBe(true);
  });
});
