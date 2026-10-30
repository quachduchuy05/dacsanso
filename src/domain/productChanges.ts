/**
 * Sản phẩm phía HTX (mục 5.6, FR-SP-04, FR-SP-07, FR-SP-09).
 * - HTX sửa tồn kho có hiệu lực ngay, nhưng không nhỏ hơn số đang giữ.
 * - HTX đổi giá hoặc báo thu hoạch / mở đặt trước phải chờ Admin – Chất lượng duyệt; trong lúc chờ vẫn bán giá cũ.
 * - Admin từ chối phải ghi lý do.
 */
import { generateId } from './ids';
import { audit, findProduct, iso } from './state';
import { heldQuantity, validateStockUpdate } from './stock';
import { familyKey } from './variants';
import {
  fail,
  ok,
  type Actor,
  type Certification,
  type DemoState,
  type OrderKind,
  type PreorderConfig,
  type Product,
  type ProductChangeRequest,
  type ProductChangeType,
  type ProductContent,
  type Result,
} from './types';

function ownProduct(state: DemoState, productId: string, actor: Actor) {
  const product = findProduct(state, productId);
  if (!product) return { error: 'Không tìm thấy sản phẩm.' } as const;
  if (actor.kind !== 'coop' || actor.id !== product.coopId) return { error: 'HTX chỉ sửa sản phẩm của HTX mình.' } as const;
  return { product } as const;
}

export function coopUpdateStock(state: DemoState, productId: string, actor: Actor, newStock: number, at: Date): Result<DemoState> {
  const own = ownProduct(state, productId, actor);
  if ('error' in own) return fail(own.error!);
  const product = own.product;
  if (product.kind !== 'ready') return fail('Sản phẩm đặt trước quản lý theo suất, không theo tồn kho.');
  const valid = validateStockUpdate(newStock, heldQuantity(product.id, state.orders));
  if (!valid.ok) return valid;
  const next = { ...state, products: state.products.map((p) => (p.id === productId ? { ...p, stockOnHand: newStock } : p)) };
  return ok(audit(next, actor, 'Cập nhật tồn kho', product.name, at, `${product.stockOnHand} → ${newStock}`));
}

function hasPending(state: DemoState, productId: string, type: ProductChangeType): boolean {
  return state.productChanges.some((c) => c.productId === productId && c.type === type && c.status === 'pending');
}

function newRequest(product: Product, type: ProductChangeType, at: Date, extra: Partial<ProductChangeRequest>): ProductChangeRequest {
  return { id: generateId('CR'), productId: product.id, coopId: product.coopId, type, status: 'pending', createdAt: iso(at), ...extra };
}

export function validateContent(c: ProductContent): string | null {
  if(c.traceUrl){try{const url=new URL(c.traceUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||c.traceUrl.length>2000)return 'Link truy xuất phải là địa chỉ web HTTP/HTTPS hợp lệ.';}catch{return 'Link truy xuất không hợp lệ.';}}
  if(c.harvestMonths!==undefined&&(!Array.isArray(c.harvestMonths)||c.harvestMonths.length>12||c.harvestMonths.some(m=>!Number.isInteger(m)||m<1||m>12)||new Set(c.harvestMonths).size!==c.harvestMonths.length))return 'Chọn các tháng thu hoạch từ 1 đến 12, không trùng nhau.';
  if(c.images&&(c.images.length<1||c.images.length>6||c.images.some(s=>typeof s!=='string'||!s)))return 'Sản phẩm cần từ 1 đến 6 ảnh.';
  if(c.storage&&c.storage.length>1000)return 'Hướng dẫn bảo quản tối đa 1.000 ký tự.';
  if(c.shelfLifeDays!==undefined&&(!Number.isInteger(c.shelfLifeDays)||c.shelfLifeDays<1||c.shelfLifeDays>(c.category==='fresh'?30:1095)))return 'Hạn dùng tối đa 30 ngày (tươi) hoặc 36 tháng (khô).';
  if(c.preparationMinutes!==undefined&&(!Number.isInteger(c.preparationMinutes)||c.preparationMinutes<0||c.preparationMinutes>10080))return 'Thời gian chuẩn bị không hợp lệ.';
  if (!c.name.trim()) return 'Vui lòng nhập tên sản phẩm.';
  if (!c.unit.trim()) return 'Vui lòng nhập quy cách (ví dụ: gói 100 g).';
  if (!c.region.trim()) return 'Vui lòng nhập vùng sản xuất.';
  if (!c.description.trim()) return 'Vui lòng nhập mô tả.';
  return null;
}

export interface NewProductInput extends ProductContent {
  kind: OrderKind;
  price: number;
  stockOnHand: number;
  preorder?: PreorderConfig;
}

/** HTX tạo sản phẩm mới: sang Chờ duyệt, chưa hiện cho khách (FR-SP-02, FR-SP-04). */
export function coopCreateProduct(state: DemoState, actor: Actor, input: NewProductInput, at: Date): Result<{ state: DemoState; product: Product }> {
  if (actor.kind !== 'coop' || !actor.id) return fail('Chỉ HTX tạo được sản phẩm.');
  const coop = state.coops.find((c) => c.id === actor.id);
  if (!coop) return fail('Không tìm thấy HTX.');
  const err = validateContent(input);
  if (err) return fail(err);
  if(input.catalogCategoryId&&!state.catalogCategories?.some(c=>c.id===input.catalogCategoryId&&c.active&&c.group===input.category))return fail('Danh mục không hoạt động hoặc không đúng nhóm hàng.');
  if (!Number.isInteger(input.price) || input.price <= 0) return fail('Giá phải là số nguyên dương (đồng).');
  if (input.kind === 'ready' && (!Number.isInteger(input.stockOnHand) || input.stockOnHand < 0)) return fail('Tồn kho phải là số nguyên không âm.');
  if (input.kind === 'preorder') {
    if (!input.preorder) return fail('Sản phẩm đặt trước cần số suất và khoảng ngày giao.');
    const pErr = validatePreorderConfig(input.preorder);
    if (pErr) return fail(pErr);
  }
  const product: Product = {
    traceUrl:input.traceUrl,
    harvestMonths:input.harvestMonths?.slice().sort((a,b)=>a-b),
    catalogCategoryId:input.catalogCategoryId,
    images:input.images,image:input.images?.[0],storage:input.storage,shelfLifeDays:input.shelfLifeDays,preparationMinutes:input.preparationMinutes,
    createdAt: iso(at),
    id: generateId('SP'),
    coopId: coop.id,
    name: input.name.trim(),
    category: input.category,
    region: input.region.trim(),
    unit: input.unit.trim(),
    price: input.price,
    description: input.description.trim(),
    kind: input.kind,
    stockOnHand: input.kind === 'ready' ? input.stockOnHand : 0,
    expressApproved: false,
    preorder: input.kind === 'preorder' ? { ...input.preorder!, open: true } : undefined,
    status: 'pending',
  };
  const req = newRequest(product, 'new_product', at, {});
  const next = { ...state, products: [...state.products, product], productChanges: [req, ...state.productChanges] };
  return ok({ state: audit(next, actor, 'Tạo sản phẩm, gửi duyệt', product.name, at), product });
}

/** HTX sửa nội dung sản phẩm: chờ duyệt, trong lúc chờ vẫn hiện nội dung cũ (FR-SP-03). */
export function coopRequestContentChange(state: DemoState, productId: string, actor: Actor, content: ProductContent, at: Date): Result<DemoState> {
  const own = ownProduct(state, productId, actor);
  if ('error' in own) return fail(own.error!);
  const err = validateContent(content);
  if (err) return fail(err);
  if(content.catalogCategoryId&&!state.catalogCategories?.some(c=>c.id===content.catalogCategoryId&&c.active&&c.group===content.category))return fail('Danh mục không hợp lệ.');
  if (hasPending(state, productId, 'content')) return fail('Sản phẩm đã có yêu cầu sửa nội dung đang chờ duyệt.');
  const req = newRequest(own.product, 'content', at, { content: { ...content, name: content.name.trim(), description: content.description.trim(), unit: content.unit.trim(), region: content.region.trim() } });
  return ok(audit({ ...state, productChanges: [req, ...state.productChanges] }, actor, 'Gửi duyệt sửa nội dung', own.product.name, at));
}

/** HTX ẩn / hiện lại sản phẩm đã được duyệt; có hiệu lực ngay (FR-SP-05). */
export function coopSetProductHidden(state: DemoState, productId: string, actor: Actor, hidden: boolean, at: Date): Result<DemoState> {
  const own = ownProduct(state, productId, actor);
  if ('error' in own) return fail(own.error!);
  if (own.product.status !== 'active' && own.product.status !== 'hidden') return fail('Chỉ ẩn / hiện được sản phẩm đã được duyệt.');
  const next = { ...state, products: state.products.map((p) => (p.id === productId ? { ...p, status: hidden ? ('hidden' as const) : ('active' as const) } : p)) };
  return ok(audit(next, actor, hidden ? 'Ẩn sản phẩm' : 'Hiện lại sản phẩm', own.product.name, at));
}

/** HTX xin bật / tắt cờ giao hoả tốc: chờ duyệt (FR-SP-09). */
export function coopRequestExpress(state: DemoState, productId: string, actor: Actor, express: boolean, at: Date): Result<DemoState> {
  const own = ownProduct(state, productId, actor);
  if ('error' in own) return fail(own.error!);
  if (own.product.kind !== 'ready') return fail('Đơn đặt trước không có giao hoả tốc.');
  if (own.product.expressApproved === express) return fail('Cờ hoả tốc đã ở trạng thái này.');
  if (hasPending(state, productId, 'express')) return fail('Đã có yêu cầu cờ hoả tốc đang chờ duyệt.');
  const req = newRequest(own.product, 'express', at, { express });
  return ok(audit({ ...state, productChanges: [req, ...state.productChanges] }, actor, 'Gửi duyệt cờ hoả tốc', own.product.name, at, express ? 'bật' : 'tắt'));
}

/** HTX khai chứng nhận: chờ Admin – Chất lượng xác minh (FR-SP-08). */
export function coopRequestCertification(state: DemoState, productId: string, actor: Actor, cert: Omit<Certification, 'id' | 'verified'>, at: Date): Result<DemoState> {
  const own = ownProduct(state, productId, actor);
  if ('error' in own) return fail(own.error!);
  if (!cert.label.trim()) return fail('Vui lòng nhập tên chứng nhận.');
  if (!cert.issuer.trim()) return fail('Vui lòng nhập nơi cấp.');
  if(typeof cert.number!=='string'||!cert.number.trim()||cert.number.trim().length>100)return fail('Vui lòng nhập số chứng nhận, tối đa 100 ký tự.');
  const validDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  if(!validDate(cert.issuedOn)||!validDate(cert.validUntil))return fail('Ngày cấp và ngày hết hạn phải là ngày hợp lệ.');
  const today=at.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  if(cert.issuedOn>today)return fail('Ngày cấp chứng nhận không được ở tương lai.');
  if(cert.validUntil<cert.issuedOn)return fail('Ngày hết hạn không được trước ngày cấp.');
  if(cert.validUntil<today)return fail('Chứng nhận đã hết hiệu lực.');
  if (!cert.photo) return fail('Vui lòng thêm ảnh chứng nhận.');
  const req = newRequest(own.product, 'cert', at, { cert: { ...cert, number:cert.number.trim(), id: generateId('CN'), label: cert.label.trim(), issuer: cert.issuer.trim(), verified: false } });
  return ok(audit({ ...state, productChanges: [req, ...state.productChanges] }, actor, 'Gửi duyệt chứng nhận', own.product.name, at, cert.label));
}

export function coopRequestPriceChange(state: DemoState, productId: string, actor: Actor, newPrice: number, note: string, at: Date): Result<DemoState> {
  const own = ownProduct(state, productId, actor);
  if ('error' in own) return fail(own.error!);
  if (!Number.isInteger(newPrice) || newPrice <= 0) return fail('Giá mới phải là số nguyên dương (đồng).');
  if (newPrice === own.product.price) return fail('Giá mới trùng giá hiện tại.');
  if (hasPending(state, productId, 'price')) return fail('Sản phẩm đã có yêu cầu đổi giá đang chờ duyệt.');
  const req: ProductChangeRequest = {
    id: generateId('CR'),
    productId,
    coopId: own.product.coopId,
    type: 'price',
    newPrice,
    note: note.trim() || undefined,
    status: 'pending',
    createdAt: iso(at),
  };
  return ok(audit({ ...state, productChanges: [req, ...state.productChanges] }, actor, 'Gửi duyệt đổi giá', own.product.name, at, `${own.product.price} → ${newPrice}`));
}

export function validatePreorderConfig(cfg: PreorderConfig): string | null {
  if (!Number.isInteger(cfg.totalSlots) || cfg.totalSlots <= 0) return 'Số suất phải là số nguyên dương.';
  if (!cfg.deliveryFrom || !cfg.deliveryTo) return 'Vui lòng nhập khoảng ngày giao.';
  if (cfg.deliveryFrom > cfg.deliveryTo) return 'Ngày giao từ phải trước ngày giao đến.';
  return null;
}

/** HTX báo thu hoạch / mở đợt đặt trước: sang Chờ duyệt (L12). */
export function coopRequestPreorder(state: DemoState, productId: string, actor: Actor, cfg: PreorderConfig, note: string, at: Date): Result<DemoState> {
  const own = ownProduct(state, productId, actor);
  if ('error' in own) return fail(own.error!);
  if (own.product.kind !== 'preorder') return fail('Chỉ sản phẩm đặt trước mới báo thu hoạch.');
  const err = validatePreorderConfig(cfg);
  if (err) return fail(err);
  if (hasPending(state, productId, 'preorder')) return fail('Sản phẩm đã có báo thu hoạch đang chờ duyệt.');
  const req: ProductChangeRequest = {
    id: generateId('CR'),
    productId,
    coopId: own.product.coopId,
    type: 'preorder',
    preorder: { ...cfg, open: true },
    note: note.trim() || undefined,
    status: 'pending',
    createdAt: iso(at),
  };
  return ok(audit({ ...state, productChanges: [req, ...state.productChanges] }, actor, 'Gửi duyệt báo thu hoạch', own.product.name, at, `${cfg.totalSlots} suất, giao ${cfg.deliveryFrom} → ${cfg.deliveryTo}`));
}

/** Admin – Chất lượng duyệt hoặc từ chối (bắt buộc lý do) yêu cầu của HTX (FR-SP-04). */
export function decideProductChange(state: DemoState, requestId: string, actor: Actor, approve: boolean, reason: string, at: Date): Result<DemoState> {
  if (actor.kind !== 'admin' || actor.adminGroup !== 'quality') return fail('Chỉ Admin – Chất lượng được duyệt thay đổi sản phẩm.');
  const req = state.productChanges.find((c) => c.id === requestId);
  if (!req) return fail('Không tìm thấy yêu cầu.');
  if (req.status !== 'pending') return fail('Yêu cầu đã được xử lý.');
  if(approve&&req.type==='cert'&&req.cert&&req.cert.validUntil<at.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}))return fail('Chứng nhận đã hết hiệu lực trong lúc chờ duyệt.');
  if (!approve && !reason.trim()) return fail('Từ chối phải ghi lý do.');
  const decided: ProductChangeRequest = {
    ...req,
    status: approve ? 'approved' : 'rejected',
    decidedAt: iso(at),
    decidedBy: actor.name,
    rejectReason: approve ? undefined : reason.trim(),
  };
  let next: DemoState = { ...state, productChanges: state.productChanges.map((c) => (c.id === requestId ? decided : c)) };
  const target = findProduct(state, req.productId);
  const family = target ? familyKey(target) : req.productId;
  next = {
    ...next,
    products: next.products.map((p) => {
      // Tên, mô tả, nhóm hàng, vùng dùng chung mọi quy cách của sản phẩm (domain/variants.ts).
      if (approve && req.type === 'content' && req.content && p.id !== req.productId && familyKey(p) === family) {
        const { unit: _ownUnit, ...shared } = req.content;
        return { ...p, ...shared };
      }
      if (p.id !== req.productId) return p;
      if (!approve) return req.type === 'new_product' ? { ...p, status: 'rejected' as const } : p;
      switch (req.type) {
        case 'new_product':
          return { ...p, status: 'active' as const };
        case 'content':
          return req.content ? { ...p, ...req.content } : p;
        case 'price':
          return req.newPrice ? { ...p, price: req.newPrice } : p;
        case 'preorder':
          return req.preorder ? { ...p, preorder: req.preorder } : p;
        case 'express':
          return { ...p, expressApproved: !!req.express };
        case 'cert':
          return req.cert ? { ...p, certifications: [...(p.certifications ?? []), { ...req.cert, verified: true }] } : p;
      }
    }),
  };
  return ok(audit(next, actor, approve ? 'Duyệt thay đổi sản phẩm' : 'Từ chối thay đổi sản phẩm', target?.name ?? req.productId, at, approve ? undefined : reason));
}
