/**
 * Dữ liệu mẫu ban đầu (Giai đoạn 5, mục 9).
 *
 * - Danh mục là 9 sản phẩm trong danh sách của nhóm (mứt mận và gạo có thêm 1 quy cách mẫu: hộp 500 g, túi 5 kg,
 *   giá cùng mức đ/kg với quy cách gốc). Mỗi sản phẩm có `sample` để trang chi tiết hiện
 *   nhãn "Dữ liệu mẫu – chờ HTX xác nhận", khoảng giá nhóm khảo sát, và ghi chú hồ sơ nếu bảng có ghi.
 * - Giá mẫu chọn trong khoảng giá bán lẻ Hà Nội nhóm khảo sát; Cốm Tú Lệ và Bưởi Đại Minh chưa có giá nên ghi "giá mẫu".
 * - Không gắn mã chứng nhận. Chỉ Bưởi Đại Minh ghi OCOP, kèm "theo hồ sơ nhóm, chờ xác minh".
 * - Mô tả chỉ ghi điều bảng của nhóm có; phần còn lại ghi "chờ HTX xác nhận".
 *   Không dùng tên chỉ dẫn địa lý, "thảo quả rừng", "mật bản địa", "Séng cù xanh".
 * - Không đưa vào giai đoạn 1: mật ong hoa bạc hà, đào Sa Pa, cá hồi, cá tầm, thịt gác bếp, rượu.
 * - Không có ảnh: app tự sinh ảnh giữ chỗ SVG theo tên và nhóm hàng (src/components/ProductImage.tsx).
 * - Tên HTX dạng "HTX mẫu …"; khách hàng, SĐT (0900 000 xxx), tài khoản (**** xxxx) đều rõ ràng là giả.
 * - Phường/xã ghi "(mẫu)" cho đến khi nhóm nạp danh mục chính thức. Khoảng cách là số mẫu.
 * - Đơn mẫu được tạo qua chính các hàm trong src/domain để dữ liệu luôn nhất quán.
 */
import { groupKey, placeCheckout } from '../domain/checkout';
import { SAMPLE_COOP_PHONES, sampleCoopAddress } from '../domain/coopContact';
import { carrierSimulate, coopConfirm, coopHandover, customerConfirmReceived } from '../domain/orders';
import { DEFAULT_PARAMS } from '../domain/params';
import { applyGatewayResult } from '../domain/payment';
import { addMs, DAY_MS, HOUR_MS, toDateKey } from '../domain/state';
import type { Actor, DemoState, Product, UserAccount } from '../domain/types';
import type { Voucher } from '../domain/voucher';

const dateFromNow = (now: Date, days: number) => toDateKey(addMs(now, days * DAY_MS));

/** Nhãn của sản phẩm mẫu chưa có giá khảo sát. */
export const SAMPLE_PRICE_LABEL = 'giá mẫu';

function products(now: Date): Product[] {
  // Mận tam hoa: khoảng ngày giao mẫu tháng 5–6 của mùa tới (bảng của nhóm ghi 05–06/2027).
  const plumYear = now.getFullYear() + (now.getMonth() >= 4 ? 1 : 0);
  // Cốm Tú Lệ, Bưởi Đại Minh: chưa có khoảng ngày giao, lấy mốc sớm nhất theo PAR-08 rồi ghi "chờ HTX xác nhận".
  const lead = DEFAULT_PARAMS.preorderMinLeadDays;
  const ready = { kind: 'ready' as const, status: 'active' as const };
  const preorder = { kind: 'preorder' as const, stockOnHand: 0, expressApproved: false, status: 'active' as const };
  return [
    {
      ...ready,
      id: 'prod-che',
      coopId: 'coop-suoigiang',
      name: 'Chè Shan tuyết',
      category: 'dry',
      region: 'Suối Giàng, Bản Liền',
      unit: 'gói 100 g',
      price: 80_000,
      description: 'Chè Shan tuyết loại phổ thông – trung cấp, gói 100 g. Vùng nguyên liệu, cách chế biến và hạn dùng chờ HTX xác nhận.',
      stockOnHand: 30,
      expressApproved: false,
      sample: { surveyedPrice: '400.000–1.500.000đ/kg (loại phổ thông – trung cấp)' },
    },
    {
      ...ready,
      id: 'prod-thaoqua',
      coopId: 'coop-sapa',
      name: 'Thảo quả khô',
      category: 'dry',
      region: 'Sa Pa, Bát Xát',
      unit: 'gói 200 g',
      price: 70_000,
      description: 'Thảo quả sấy khô, gói 200 g, dùng làm gia vị. Vụ thu hoạch và hạn dùng chờ HTX xác nhận.',
      stockOnHand: 25,
      expressApproved: false,
      sample: { surveyedPrice: '250.000–450.000đ/kg' },
    },
    {
      ...ready,
      id: 'prod-mutman',
      coopId: 'coop-bacha',
      name: 'Mứt / ô mai mận tam hoa',
      category: 'processed',
      region: 'Bắc Hà',
      unit: 'hộp 300 g',
      price: 135_000,
      description: 'Mứt, ô mai làm từ mận tam hoa. Thành phần và hạn dùng chờ HTX xác nhận.',
      stockOnHand: 20,
      expressApproved: false,
      sample: { surveyedPrice: '350.000–550.000đ/kg' },
    },
    {
      ...ready,
      id: 'prod-mutman-500',
      variantOf: 'prod-mutman',
      coopId: 'coop-bacha',
      name: 'Mứt / ô mai mận tam hoa',
      category: 'processed',
      region: 'Bắc Hà',
      unit: 'hộp 500 g',
      price: 225_000,
      description: 'Mứt, ô mai làm từ mận tam hoa. Thành phần và hạn dùng chờ HTX xác nhận.',
      stockOnHand: 10,
      expressApproved: false,
      sample: { surveyedPrice: '350.000–550.000đ/kg' },
    },
    {
      ...ready,
      id: 'prod-matong',
      coopId: 'coop-baoha',
      name: 'Mật ong Thanh Xuân',
      category: 'processed',
      region: 'Bảo Hà',
      unit: 'chai 500 ml',
      price: 175_000,
      description: 'Mật ong đóng chai 500 ml. Nguồn hoa, mùa khai thác và hạn dùng chờ HTX xác nhận.',
      stockOnHand: 12,
      expressApproved: true,
      sample: { surveyedPrice: '250.000–450.000đ/lít' },
    },
    {
      ...ready,
      id: 'prod-gao',
      coopId: 'coop-muongkhuong',
      name: 'Gạo Séng Cù',
      category: 'dry',
      region: 'Mường Khương, Bát Xát',
      unit: 'túi 2 kg',
      price: 120_000,
      description: 'Gạo Séng Cù. Vụ thu hoạch và ngày đóng gói chờ HTX xác nhận.',
      stockOnHand: 40,
      expressApproved: true,
      sample: { surveyedPrice: '45.000–70.000đ/kg' },
    },
    {
      ...ready,
      id: 'prod-gao-5kg',
      variantOf: 'prod-gao',
      coopId: 'coop-muongkhuong',
      name: 'Gạo Séng Cù',
      category: 'dry',
      region: 'Mường Khương, Bát Xát',
      unit: 'túi 5 kg',
      price: 280_000,
      description: 'Gạo Séng Cù. Vụ thu hoạch và ngày đóng gói chờ HTX xác nhận.',
      stockOnHand: 15,
      expressApproved: true,
      sample: { surveyedPrice: '45.000–70.000đ/kg' },
    },
    {
      ...ready,
      id: 'prod-phohong',
      coopId: 'coop-bacha',
      name: 'Phở hồng Bắc Hà',
      category: 'processed',
      region: 'Bắc Hà',
      unit: 'gói 500 g',
      price: 65_000,
      description: 'Phở hồng Bắc Hà, gói 500 g. Thành phần, cách dùng và hạn dùng chờ HTX xác nhận.',
      stockOnHand: 30,
      expressApproved: false,
      sample: { surveyedPrice: 'khoảng 130.000đ/kg' },
    },
    {
      ...preorder,
      id: 'prod-man',
      coopId: 'coop-bacha',
      name: 'Mận tam hoa tươi',
      category: 'fresh',
      region: 'Bắc Hà',
      unit: 'thùng 3 kg',
      price: 210_000,
      description: 'Mận tam hoa tươi, đóng thùng 3 kg chống dập. Mùa bán tháng 5–7; đặt trước để giữ suất, giao trong khoảng ngày HTX khai.',
      preorder: { totalSlots: 100, deliveryFrom: `${plumYear}-05-01`, deliveryTo: `${plumYear}-06-30`, open: true },
      sample: { surveyedPrice: '50.000–90.000đ/kg', deliveryWindowIsSample: true },
    },
    {
      ...preorder,
      id: 'prod-com',
      coopId: 'coop-tule',
      name: 'Cốm Tú Lệ',
      category: 'processed',
      region: 'Tú Lệ',
      unit: 'gói 500 g',
      price: 110_000,
      description: 'Cốm do người Thái ở Tú Lệ làm. Quy cách gói 500 g là quy cách mẫu.',
      preorder: { totalSlots: 60, deliveryFrom: dateFromNow(now, lead), deliveryTo: dateFromNow(now, lead + 28), open: true },
      sample: { deliveryWindowIsSample: true },
    },
    {
      ...preorder,
      id: 'prod-buoi',
      coopId: 'coop-thacba',
      name: 'Bưởi Đại Minh',
      category: 'fresh',
      region: 'Vùng hồ Thác Bà',
      unit: 'thùng 5 kg',
      price: 200_000,
      description: 'Bưởi Đại Minh vùng hồ Thác Bà. Quy cách thùng 5 kg là quy cách mẫu.',
      preorder: { totalSlots: 80, deliveryFrom: dateFromNow(now, lead + 7), deliveryTo: dateFromNow(now, lead + 45), open: true },
      sample: { deliveryWindowIsSample: true, dossierNote: 'OCOP 4 sao năm 2025 (theo hồ sơ nhóm, chờ xác minh)' },
    },
  ];
}

function vouchers(now: Date): Voucher[] {
  const in60 = addMs(now, 60 * DAY_MS).toISOString();
  return [
    { id: 'v-min', code: 'GIAM30K', title: 'Giảm 30.000đ cho đơn từ 300.000đ', kind: 'fixed', value: 30_000, minSpend: 300_000, expiresAt: in60, usageLimit: 200, firstOrderOnly: false },
    { id: 'v-cat', code: 'CHEBIEN10', title: 'Giảm 10% hàng Chế biến, tối đa 50.000đ', kind: 'percent', value: 10, maxDiscount: 50_000, minSpend: 0, categories: ['processed'], expiresAt: in60, usageLimit: 200, firstOrderOnly: false },
    { id: 'v-first', code: 'CHAOBAN', title: 'Giảm 20.000đ cho khách đặt lần đầu', kind: 'fixed', value: 20_000, minSpend: 100_000, expiresAt: in60, usageLimit: 500, firstOrderOnly: true },
    { id: 'v-expired', code: 'THANG9', title: 'Giảm 25.000đ (đã hết hạn)', kind: 'fixed', value: 25_000, minSpend: 200_000, expiresAt: addMs(now, -5 * DAY_MS).toISOString(), usageLimit: 100, firstOrderOnly: false },
  ];
}

/**
 * Tài khoản demo (mục 5.9). SĐT rõ ràng là giả; OTP mô phỏng luôn là 123456.
 * Đủ 2 khách hàng, các HTX, Admin theo 4 nhóm quyền + Quản trị gốc, 1 tài khoản Cơ quan QLNN, 2 shipper.
 */
export const DEMO_USERS: Omit<UserAccount, 'createdAt'>[] = [
  { id: 'u-kh1', phone: '0900000001', name: 'Khách hàng mẫu 1', role: 'customer', customerId: 'cust-1', status: 'active' },
  { id: 'u-kh2', phone: '0900000002', name: 'Khách hàng mẫu 2', role: 'customer', customerId: 'cust-2', status: 'active' },
  { id: 'u-htx-bacha', phone: '0900000101', name: 'HTX mẫu Bắc Hà', role: 'coop', coopId: 'coop-bacha', status: 'active' },
  { id: 'u-htx-mk', phone: '0900000102', name: 'HTX mẫu Mường Khương', role: 'coop', coopId: 'coop-muongkhuong', status: 'active' },
  { id: 'u-htx-suoigiang', phone: '0900000103', name: 'HTX mẫu Suối Giàng', role: 'coop', coopId: 'coop-suoigiang', status: 'active' },
  { id: 'u-htx-sapa', phone: '0900000104', name: 'HTX mẫu Sa Pa', role: 'coop', coopId: 'coop-sapa', status: 'active' },
  { id: 'u-htx-baoha', phone: '0900000105', name: 'HTX mẫu Bảo Hà', role: 'coop', coopId: 'coop-baoha', status: 'active' },
  { id: 'u-htx-tule', phone: '0900000106', name: 'HTX mẫu Tú Lệ', role: 'coop', coopId: 'coop-tule', status: 'active' },
  { id: 'u-htx-thacba', phone: '0900000107', name: 'HTX mẫu Thác Bà', role: 'coop', coopId: 'coop-thacba', status: 'active' },
  { id: 'u-ad-vh', phone: '0900000201', name: 'Admin – Vận hành (mẫu)', role: 'admin', adminGroup: 'operations', status: 'active' },
  { id: 'u-ad-cl', phone: '0900000202', name: 'Admin – Chất lượng (mẫu)', role: 'admin', adminGroup: 'quality', status: 'active' },
  { id: 'u-ad-cskh', phone: '0900000203', name: 'Admin – CSKH (mẫu)', role: 'admin', adminGroup: 'cskh', status: 'active' },
  { id: 'u-ad-tc', phone: '0900000204', name: 'Admin – Tài chính (mẫu)', role: 'admin', adminGroup: 'finance', status: 'active' },
  { id: 'u-ad-root', phone: '0900000209', name: 'Quản trị gốc (mẫu)', role: 'admin', adminGroup: 'root', status: 'active' },
  { id: 'u-qlnn', phone: '0900000301', name: 'Cơ quan QLNN (mẫu)', role: 'regulator', status: 'active' },
  // Shipper (chủ repo yêu cầu ngày 18/10/2026; Admin – Vận hành phân công đơn).
  { id: 'u-ship-1', phone: '0900000401', name: 'Shipper mẫu 1', role: 'shipper', status: 'active' },
  { id: 'u-ship-2', phone: '0900000402', name: 'Shipper mẫu 2', role: 'shipper', status: 'active' },
];

function baseState(now: Date): DemoState {
  return {
    clockOffsetMs: 0,
    users: DEMO_USERS.map((u) => ({ ...u, createdAt: now.toISOString() })),
    customers: [
      { id: 'cust-1', name: 'Khách hàng mẫu 1', phone: '0900000001', refundAccount: { bankCode: 'MAU', bankName: 'Ngân hàng mẫu', accountNumber: '000000000001', holder: 'KHACH HANG MAU 1', linkedAt: now.toISOString() } },
      { id: 'cust-2', name: 'Khách hàng mẫu 2', phone: '0900000002' },
    ],
    coops: [
      { id: 'coop-bacha', name: 'HTX mẫu Bắc Hà', region: 'Bắc Hà', phones: [...SAMPLE_COOP_PHONES['coop-bacha']], storeAddress: sampleCoopAddress('Bắc Hà'), payoutAccountMasked: '**** 0101', status: 'active', profileStatus: 'approved' },
      { id: 'coop-muongkhuong', name: 'HTX mẫu Mường Khương', region: 'Mường Khương', phones: [...SAMPLE_COOP_PHONES['coop-muongkhuong']], storeAddress: sampleCoopAddress('Mường Khương'), payoutAccountMasked: '**** 0102', status: 'active', profileStatus: 'approved' },
      { id: 'coop-suoigiang', name: 'HTX mẫu Suối Giàng', region: 'Suối Giàng', phones: [...SAMPLE_COOP_PHONES['coop-suoigiang']], storeAddress: sampleCoopAddress('Suối Giàng'), payoutAccountMasked: '**** 0103', status: 'active', profileStatus: 'approved' },
      { id: 'coop-sapa', name: 'HTX mẫu Sa Pa', region: 'Sa Pa', phones: [...SAMPLE_COOP_PHONES['coop-sapa']], storeAddress: sampleCoopAddress('Sa Pa'), payoutAccountMasked: '**** 0104', status: 'active', profileStatus: 'approved' },
      { id: 'coop-baoha', name: 'HTX mẫu Bảo Hà', region: 'Bảo Hà', phones: [...SAMPLE_COOP_PHONES['coop-baoha']], storeAddress: sampleCoopAddress('Bảo Hà'), payoutAccountMasked: '**** 0105', status: 'active', profileStatus: 'approved' },
      { id: 'coop-tule', name: 'HTX mẫu Tú Lệ', region: 'Tú Lệ', phones: [...SAMPLE_COOP_PHONES['coop-tule']], storeAddress: sampleCoopAddress('Tú Lệ'), payoutAccountMasked: '**** 0106', status: 'active', profileStatus: 'approved' },
      { id: 'coop-thacba', name: 'HTX mẫu Thác Bà', region: 'hồ Thác Bà', phones: [...SAMPLE_COOP_PHONES['coop-thacba']], storeAddress: sampleCoopAddress('hồ Thác Bà'), payoutAccountMasked: '**** 0107', status: 'active', profileStatus: 'approved' },
    ],
    products: products(now),
    productChanges: [],
    wards: [
      { id: 'w-xuanphuong', name: 'Phường Xuân Phương (mẫu)', distanceKm: 3.5 },
      { id: 'w-taymo', name: 'Phường Tây Mỗ (mẫu)', distanceKm: 4.2 },
      { id: 'w-caugiay', name: 'Phường Cầu Giấy (mẫu)', distanceKm: 8.1 },
      { id: 'w-thanhxuan', name: 'Phường Thanh Xuân (mẫu)', distanceKm: 9.4 },
      { id: 'w-badinh', name: 'Phường Ba Đình (mẫu)', distanceKm: 11.6 },
      { id: 'w-hoankiem', name: 'Phường Hoàn Kiếm (mẫu)', distanceKm: 13.2 },
      { id: 'w-longbien', name: 'Phường Long Biên (mẫu)', distanceKm: 17.5 },
      { id: 'w-socson', name: 'Xã Sóc Sơn (mẫu)', distanceKm: 35 },
    ],
    addresses: [
      { id: 'addr-1', customerId: 'cust-1', label: 'Nhà riêng', receiverName: 'Khách hàng mẫu 1', receiverPhone: '0900000001', houseType: 'apartment', wardId: 'w-taymo', street: 'Khu đô thị mẫu', building: 'S2', unit: '1508', isDefault: true },
      { id: 'addr-2', customerId: 'cust-1', label: 'Văn phòng', receiverName: 'Khách hàng mẫu 1', receiverPhone: '0900000001', houseType: 'ground', wardId: 'w-caugiay', street: '25 ngõ 12 đường mẫu', isDefault: false },
      { id: 'addr-3', customerId: 'cust-2', label: 'Nhà riêng', receiverName: 'Khách hàng mẫu 2', receiverPhone: '0900000002', houseType: 'ground', wardId: 'w-thanhxuan', street: '18 ngõ 42 đường mẫu', isDefault: true },
    ],
    carts: {},
    checkouts: [],
    orders: [],
    transactions: [],
    vouchers: vouchers(now),
    voucherUsages: [],
    giftBoxTypes: [
      { id: 'box-kraft', name: 'Hộp giấy kraft', fee: 15_000, description: 'Hộp giấy tái chế, buộc dây cói.' },
      { id: 'box-cloth', name: 'Túi vải in hoa văn', fee: 30_000, description: 'Túi vải mộc, in hoa văn mẫu.' },
      { id: 'box-wood', name: 'Hộp gỗ thông', fee: 45_000, description: 'Hộp gỗ thông có lót rơm.' },
    ],
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
    orderMessages: [],
    harvests: [],
    directMessages: [],
    chatReads: {},
    coopApplications: [],
    codRemittances: [],
    favorites: {},
    follows: {},
    savedVouchers: {},
  };
}

function must(r: { ok: true; value: DemoState } | { ok: false; error: string }): DemoState {
  if (!r.ok) throw new Error(`Dữ liệu mẫu lỗi: ${r.error}`);
  return r.value;
}

/** Tạo dữ liệu mẫu: 1 đơn đã giao (để demo khiếu nại, đối soát) và 1 đơn đã thanh toán mô phỏng đang chờ HTX xác nhận. */
export function createSeedState(now: Date): DemoState {
  let s = baseState(now);
  const cust2: Actor = { kind: 'customer', id: 'cust-2', userId: 'u-kh2', name: 'Khách hàng mẫu 2' };
  const cust1: Actor = { kind: 'customer', id: 'cust-1', userId: 'u-kh1', name: 'Khách hàng mẫu 1' };
  const coopMK: Actor = { kind: 'coop', id: 'coop-muongkhuong', userId: 'u-htx-mk', name: 'HTX mẫu Mường Khương' };
  const opsSystem: Actor = { kind: 'admin', id: 'seed', name: 'Dữ liệu mẫu', adminGroup: 'operations' };

  // Đơn 1: Khách 2 mua 2 túi gạo, COD, đã giao cách đây 2 ngày.
  const t1 = addMs(now, -3 * DAY_MS);
  const p1 = placeCheckout(
    s,
    {
      customerId: 'cust-2',
      lines: [{ productId: 'prod-gao', quantity: 2, seenPrice: 120_000 }],
      addressId: 'addr-3',
      note: '',
      groupOptions: { [groupKey('coop-muongkhuong', 'ready')]: { shipping: 'standard', paymentMethod: 'cod' } },
      idempotencyKey: 'seed-1',
      acceptedPreorderPolicy: true,
      confirmedPriceIncrease: false,
      fromCart: false,
    },
    cust2,
    new Date(t1.getFullYear(), t1.getMonth(), t1.getDate(), 9, 0),
  );
  if (!p1.ok) throw new Error(p1.error);
  s = p1.state;
  const o1 = p1.checkout.orderIds[0];
  const day = (n: number, h: number) => {
    const d = addMs(now, n * DAY_MS);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0);
  };
  s = must(coopConfirm(s, o1, coopMK, day(-3, 10)));
  s = must(coopHandover(s, o1, coopMK, day(-3, 15)));
  s = must(carrierSimulate(s, o1, opsSystem, 'delivered_reported', '', day(-2, 10)));
  s = must(customerConfirmReceived(s, o1, cust2, day(-2, 11)));

  // Đơn 2: Khách 1 mua 1 hộp mứt mận, thanh toán online (mô phỏng) thành công 1 giờ trước, chờ HTX Bắc Hà xác nhận.
  const t2 = addMs(now, -1 * HOUR_MS);
  const p2 = placeCheckout(
    s,
    {
      customerId: 'cust-1',
      lines: [{ productId: 'prod-mutman', quantity: 1, seenPrice: 135_000 }],
      addressId: 'addr-1',
      note: 'Gọi trước khi giao.',
      groupOptions: { [groupKey('coop-bacha', 'ready')]: { shipping: 'standard', paymentMethod: 'online' } },
      idempotencyKey: 'seed-2',
      acceptedPreorderPolicy: true,
      confirmedPriceIncrease: false,
      fromCart: false,
    },
    cust1,
    t2,
  );
  if (!p2.ok) throw new Error(p2.error);
  s = must((() => {
    const r = applyGatewayResult(p2.state, p2.transaction!.id, 'success', 'SEED-REF-2', addMs(t2, 2 * 60_000));
    return r.ok ? { ok: true as const, value: r.value.state } : r;
  })());

  // Nhật ký và sổ giao dịch của dữ liệu mẫu giữ lại để màn Admin có dữ liệu; thông báo bắt đầu trống.
  return { ...s, auditLogs: [] };
}
