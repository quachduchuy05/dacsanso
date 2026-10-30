/**
 * Quy cách bán hàng (góp ý kiểm thử: "hộp mứt có nhiều loại hộp 300 g, 500 g…", hiện các quy cách ở ngoài mục sản phẩm).
 *
 * Mỗi quy cách là một sản phẩm riêng (giá, tồn kho / số suất, trạng thái, đánh giá riêng) nối về sản phẩm gốc bằng
 * `variantOf`. Nhờ vậy giỏ, đơn, giữ hàng, duyệt giá… dùng nguyên các hàm đang có theo mã sản phẩm.
 * - Tên, mô tả, nhóm hàng, vùng dùng chung cả nhóm: duyệt sửa nội dung một quy cách thì áp cho cả nhóm (trừ quy cách).
 * - HTX thêm quy cách mới: sang Chờ duyệt như sản phẩm mới, chưa hiện cho khách.
 * - Khách thấy một thẻ cho cả nhóm, có danh sách quy cách và khoảng giá; chọn quy cách ở trang chi tiết.
 */
import { generateId } from './ids';
import { normalizeVi } from './text';
import { audit, findProduct, iso } from './state';
import { fail, ok, type Actor, type DemoState, type Product, type ProductChangeRequest, type Result } from './types';

/** Tối đa số quy cách của một sản phẩm. */
export const MAX_VARIANTS = 6;

/** Mã nhóm quy cách: mã sản phẩm gốc. */
export const familyKey = (p: Pick<Product, 'id' | 'variantOf'>): string => p.variantOf ?? p.id;

const byPrice = (a: Product, b: Product) => a.price - b.price || a.unit.localeCompare(b.unit, 'vi');

/** Mọi quy cách cùng nhóm với sản phẩm (kể cả chính nó), giá thấp trước. */
export function familyOf(state: DemoState, product: Pick<Product, 'id' | 'variantOf'>): Product[] {
  const key = familyKey(product);
  return state.products.filter((p) => familyKey(p) === key).sort(byPrice);
}

/** Quy cách khách thấy được (đang hiển thị), giá thấp trước. */
export const listedFamilyOf = (state: DemoState, product: Pick<Product, 'id' | 'variantOf'>): Product[] => familyOf(state, product).filter((p) => p.status === 'active');

/** Gom danh sách sản phẩm theo nhóm quy cách, giữ thứ tự xuất hiện của nhóm; trong nhóm giá thấp trước. */
export function groupFamilies(products: Product[]): Product[][] {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const key = familyKey(p);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.values()].map((g) => g.sort(byPrice));
}

export function priceRange(variants: Pick<Product, 'price'>[]): { min: number; max: number } {
  const prices = variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export interface NewVariantInput {
  unit: string;
  price: number;
  /** Mua sẵn: tồn kho. Đặt trước: số suất (khoảng ngày giao lấy theo sản phẩm lúc thêm). */
  quantity: number;
}

/** HTX thêm quy cách cho sản phẩm của mình: sang Chờ duyệt, chưa hiện cho khách. */
export function coopAddVariant(state: DemoState, actor: Actor, productId: string, input: NewVariantInput, at: Date): Result<{ state: DemoState; product: Product }> {
  const base = findProduct(state, productId);
  if (!base) return fail('Không tìm thấy sản phẩm.');
  if (actor.kind !== 'coop' || actor.id !== base.coopId) return fail('HTX chỉ thêm quy cách cho sản phẩm của HTX mình.');
  const unit = input.unit.trim().replace(/\s+/g, ' ');
  if (!unit) return fail('Vui lòng nhập quy cách (ví dụ: hộp 500 g).');
  if (unit.length > 40) return fail('Quy cách tối đa 40 ký tự.');
  const family = familyOf(state, base).filter((p) => p.status !== 'rejected');
  if (family.some((p) => normalizeVi(p.unit) === normalizeVi(unit))) return fail(`Sản phẩm đã có quy cách "${unit}".`);
  if (family.length >= MAX_VARIANTS) return fail(`Mỗi sản phẩm tối đa ${MAX_VARIANTS} quy cách.`);
  if (!Number.isInteger(input.price) || input.price <= 0) return fail('Giá phải là số nguyên dương (đồng).');
  if (!Number.isInteger(input.quantity) || input.quantity < (base.kind === 'preorder' ? 1 : 0)) {
    return fail(base.kind === 'preorder' ? 'Số suất phải là số nguyên dương.' : 'Tồn kho phải là số nguyên không âm.');
  }
  if (base.kind === 'preorder' && !base.preorder) return fail('Sản phẩm gốc chưa mở đặt trước nên chưa thêm quy cách được.');
  const root = findProduct(state, familyKey(base)) ?? base;
  const product: Product = {
    id: generateId('SP'),
    coopId: base.coopId,
    variantOf: familyKey(base),
    name: root.name,
    category: root.category,
    region: root.region,
    unit,
    price: input.price,
    description: root.description,
    kind: base.kind,
    stockOnHand: base.kind === 'ready' ? input.quantity : 0,
    expressApproved: false,
    preorder: base.kind === 'preorder' ? { ...base.preorder!, totalSlots: input.quantity, open: true } : undefined,
    status: 'pending',
  };
  const req: ProductChangeRequest = {
    id: generateId('CR'),
    productId: product.id,
    coopId: product.coopId,
    type: 'new_product',
    note: `Quy cách mới của "${root.name}"`,
    status: 'pending',
    createdAt: iso(at),
  };
  const next = { ...state, products: [...state.products, product], productChanges: [req, ...state.productChanges] };
  return ok({ state: audit(next, actor, 'Thêm quy cách, gửi duyệt', `${root.name} – ${unit}`, at), product });
}
