import { DEFAULT_PARAMS } from '../params';
import type { CheckoutInput, GroupOptions, PlaceInput } from '../checkout';
import { groupKey } from '../checkout';
import type { Actor, CartLine, DemoState, Product } from '../types';
import type { Voucher } from '../voucher';

/** 14/10/2026 09:00 giờ địa phương. */
export const T0 = new Date(2026, 9, 14, 9, 0, 0);
export const CUSTOMER: Actor = { kind: 'customer', id: 'cust-1', name: 'Khách 1' };
export const COOP_X: Actor = { kind: 'coop', id: 'coop-x', name: 'HTX X' };
export const COOP_Y: Actor = { kind: 'coop', id: 'coop-y', name: 'HTX Y' };
export const ADMIN_OPS: Actor = { kind: 'admin', id: 'ad-ops', name: 'Admin VH', adminGroup: 'operations' };
export const ADMIN_CSKH: Actor = { kind: 'admin', id: 'ad-cskh', name: 'Admin CSKH', adminGroup: 'cskh' };
export const ADMIN_FIN: Actor = { kind: 'admin', id: 'ad-fin', name: 'Admin TC', adminGroup: 'finance' };
export const ADMIN_QA: Actor = { kind: 'admin', id: 'ad-qa', name: 'Admin CL', adminGroup: 'quality' };
export const ADMIN_ROOT: Actor = { kind: 'admin', id: 'u-root', name: 'Quản trị gốc', adminGroup: 'root' };
export const REGULATOR: Actor = { kind: 'regulator', id: 'u-gov', name: 'QLNN' };

const product = (p: Partial<Product> & Pick<Product, 'id' | 'coopId' | 'kind' | 'price'>): Product => ({
  name: p.id,
  category: 'dry',
  region: 'Vùng A',
  unit: 'gói',
  description: '',
  stockOnHand: 0,
  expressApproved: false,
  status: 'active',
  ...p,
});

export const VOUCHER_50K: Voucher = {
  id: 'v50',
  code: 'GIAM50',
  title: 'Giảm 50.000đ',
  kind: 'fixed',
  value: 50_000,
  minSpend: 350_000,
  expiresAt: '2099-01-01T00:00:00Z',
  usageLimit: 100,
  firstOrderOnly: false,
};

export function makeState(): DemoState {
  return {
    clockOffsetMs: 0,
    users: [
      { id: 'u-kh1', phone: '0900000001', name: 'Khách 1', role: 'customer', customerId: 'cust-1', status: 'active', createdAt: '' },
      { id: 'u-x', phone: '0900000101', name: 'HTX X', role: 'coop', coopId: 'coop-x', status: 'active', createdAt: '' },
      { id: 'u-y', phone: '0900000102', name: 'HTX Y', role: 'coop', coopId: 'coop-y', status: 'active', createdAt: '' },
      { id: 'u-qa', phone: '0900000202', name: 'Admin CL', role: 'admin', adminGroup: 'quality', status: 'active', createdAt: '' },
      { id: 'u-cskh', phone: '0900000203', name: 'Admin CSKH', role: 'admin', adminGroup: 'cskh', status: 'active', createdAt: '' },
      { id: 'u-fin', phone: '0900000204', name: 'Admin TC', role: 'admin', adminGroup: 'finance', status: 'active', createdAt: '' },
      { id: 'u-root', phone: '0900000209', name: 'Quản trị gốc', role: 'admin', adminGroup: 'root', status: 'active', createdAt: '' },
      { id: 'u-gov', phone: '0900000301', name: 'QLNN', role: 'regulator', status: 'active', createdAt: '' },
      { id: 'u-lock', phone: '0900000999', name: 'Bị khoá', role: 'customer', customerId: 'cust-x', status: 'locked', createdAt: '' },
    ],
    customers: [{ id: 'cust-1', name: 'Khách 1', phone: '0900000001', refundAccount: { bankName: 'NH mẫu', accountNumber: '000000000001', holder: 'KHACH 1' } }],
    coops: [
      { id: 'coop-x', name: 'HTX X', region: 'Vùng A', payoutAccountMasked: '**** 0101', status: 'active', profileStatus: 'approved' },
      { id: 'coop-y', name: 'HTX Y', region: 'Vùng B', payoutAccountMasked: '**** 0102', status: 'active', profileStatus: 'approved' },
    ],
    products: [
      product({ id: 'x-dry', coopId: 'coop-x', kind: 'ready', price: 770_000, stockOnHand: 10, expressApproved: true }),
      product({ id: 'y-dry', coopId: 'coop-y', kind: 'ready', price: 100_000, stockOnHand: 10, category: 'processed' }),
      product({
        id: 'x-pre',
        coopId: 'coop-x',
        kind: 'preorder',
        category: 'fresh',
        price: 85_000,
        preorder: { totalSlots: 15, deliveryFrom: '2026-10-20', deliveryTo: '2026-10-31', open: true },
      }),
    ],
    productChanges: [],
    wards: [
      { id: 'w-near', name: 'Phường Gần (mẫu)', distanceKm: 3 },
      { id: 'w-far', name: 'Xã Xa (mẫu)', distanceKm: 30 },
    ],
    addresses: [
      { id: 'addr-1', customerId: 'cust-1', label: 'Nhà', receiverName: 'Khách 1', receiverPhone: '0900000001', houseType: 'ground', wardId: 'w-near', street: '1 đường mẫu', isDefault: true },
    ],
    carts: {},
    checkouts: [],
    orders: [],
    transactions: [],
    vouchers: [VOUCHER_50K],
    voucherUsages: [],
    giftBoxTypes: [{ id: 'box', name: 'Hộp giấy', fee: 30_000, description: '' }],
    refunds: [],
    tickets: [],
    payoutPeriods: [],
    params: structuredClone(DEFAULT_PARAMS),
    paramHistory: [],
    auditLogs: [],
    notifications: [],
    ledgerEntries: [],
    reviews: [],
    lowStockAlerts: {},
  };
}

export const line = (productId: string, quantity: number, seenPrice: number, deliveryDate?: string): CartLine => ({ productId, quantity, seenPrice, deliveryDate });

let seq = 0;
export function placeInput(lines: CartLine[], options: Record<string, GroupOptions> = {}, extra: Partial<PlaceInput> = {}): PlaceInput {
  const input: CheckoutInput = { customerId: 'cust-1', lines, addressId: 'addr-1', note: '', groupOptions: options };
  return { ...input, idempotencyKey: `k-${++seq}`, acceptedPreorderPolicy: true, confirmedPriceIncrease: false, fromCart: false, ...extra };
}

export const keyX = groupKey('coop-x', 'ready');
export const keyY = groupKey('coop-y', 'ready');
export const keyXPre = (d: string) => groupKey('coop-x', 'preorder', d);
