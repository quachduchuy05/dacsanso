/**
 * Sổ địa chỉ (BR-DAT-04, FR-TK-04).
 * - Giai đoạn 1 chỉ giao trong Hà Nội; địa chỉ gồm Hà Nội (cố định), phường/xã (danh sách cấu hình), số nhà/đường, toà–căn.
 * - Chung cư bắt buộc nhập toà và căn; nhà mặt đất bắt buộc số nhà.
 * - Tối đa 10 địa chỉ, đặt được một địa chỉ mặc định.
 */
import { generateId } from './ids';
import { isValidPhone, normalizePhone, PHONE_RULE } from './phone';
import { findWard } from './state';
import { fail, ok, type Address, type DemoState, type HouseType, type Result } from './types';

export const MAX_ADDRESSES = 10;

export interface AddressInput {
  label: string;
  receiverName: string;
  receiverPhone: string;
  houseType: HouseType;
  wardId: string;
  street: string;
  building?: string;
  unit?: string;
  isDefault?: boolean;
}

export function validateAddressInput(state: DemoState, input: AddressInput): Result<AddressInput> {
  if (!input.receiverName.trim()) return fail('Vui lòng nhập tên người nhận.');
  if (!isValidPhone(normalizePhone(input.receiverPhone))) return fail(`Số điện thoại người nhận không hợp lệ. ${PHONE_RULE}`);
  if (!findWard(state, input.wardId)) return fail('Vui lòng chọn phường/xã trong danh sách.');
  if (input.houseType === 'apartment') {
    if (!input.building?.trim() || !input.unit?.trim()) return fail('Chung cư bắt buộc nhập toà và căn hộ.');
  } else {
    if (!input.street.trim()) return fail('Vui lòng nhập số nhà, đường.');
    if (!/\d/.test(input.street)) return fail('Nhà mặt đất bắt buộc nhập số nhà.');
  }
  return ok(input);
}

function withSingleDefault(addresses: Address[], customerId: string, defaultId: string): Address[] {
  return addresses.map((a) => (a.customerId === customerId ? { ...a, isDefault: a.id === defaultId } : a));
}

export function addAddress(state: DemoState, customerId: string, input: AddressInput): Result<{ state: DemoState; address: Address }> {
  const mine = state.addresses.filter((a) => a.customerId === customerId);
  if (mine.length >= MAX_ADDRESSES) return fail(`Sổ địa chỉ tối đa ${MAX_ADDRESSES} địa chỉ.`);
  const valid = validateAddressInput(state, input);
  if (!valid.ok) return valid;
  const address: Address = {
    id: generateId('ADDR'),
    customerId,
    label: input.label.trim() || 'Địa chỉ',
    receiverName: input.receiverName.trim(),
    receiverPhone: normalizePhone(input.receiverPhone),
    houseType: input.houseType,
    wardId: input.wardId,
    street: input.street.trim(),
    building: input.houseType === 'apartment' ? input.building?.trim() : undefined,
    unit: input.houseType === 'apartment' ? input.unit?.trim() : undefined,
    isDefault: mine.length === 0 || !!input.isDefault,
  };
  let addresses = [...state.addresses, address];
  if (address.isDefault) addresses = withSingleDefault(addresses, customerId, address.id);
  return ok({ state: { ...state, addresses }, address });
}

export function updateAddress(state: DemoState, customerId: string, id: string, input: AddressInput): Result<DemoState> {
  const existing = state.addresses.find((a) => a.id === id && a.customerId === customerId);
  if (!existing) return fail('Không tìm thấy địa chỉ.');
  const valid = validateAddressInput(state, input);
  if (!valid.ok) return valid;
  const updated: Address = {
    ...existing,
    label: input.label.trim() || existing.label,
    receiverName: input.receiverName.trim(),
    receiverPhone: normalizePhone(input.receiverPhone),
    houseType: input.houseType,
    wardId: input.wardId,
    street: input.street.trim(),
    building: input.houseType === 'apartment' ? input.building?.trim() : undefined,
    unit: input.houseType === 'apartment' ? input.unit?.trim() : undefined,
  };
  let addresses = state.addresses.map((a) => (a.id === id ? updated : a));
  if (input.isDefault) addresses = withSingleDefault(addresses, customerId, id);
  return ok({ ...state, addresses });
}

export function deleteAddress(state: DemoState, customerId: string, id: string): Result<DemoState> {
  const existing = state.addresses.find((a) => a.id === id && a.customerId === customerId);
  if (!existing) return fail('Không tìm thấy địa chỉ.');
  let addresses = state.addresses.filter((a) => a.id !== id);
  if (existing.isDefault) {
    const next = addresses.find((a) => a.customerId === customerId);
    if (next) addresses = withSingleDefault(addresses, customerId, next.id);
  }
  return ok({ ...state, addresses });
}

export function setDefaultAddress(state: DemoState, customerId: string, id: string): Result<DemoState> {
  if (!state.addresses.some((a) => a.id === id && a.customerId === customerId)) return fail('Không tìm thấy địa chỉ.');
  return ok({ ...state, addresses: withSingleDefault(state.addresses, customerId, id) });
}

export function defaultAddressOf(state: DemoState, customerId: string): Address | undefined {
  const mine = state.addresses.filter((a) => a.customerId === customerId);
  return mine.find((a) => a.isDefault) ?? mine[0];
}
