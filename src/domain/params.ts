/**
 * Tham số hệ thống (mục 4, FR-HT-02).
 *
 * - Admin – Vận hành sửa ở tab Tham số; mỗi lần sửa lưu lịch sử (người sửa, thời điểm, giá trị cũ/mới, lý do).
 * - Giá trị mới chỉ áp cho đơn tạo sau đó; đơn đã tạo giữ bản chốt (BR-DAT-06) qua snapshotParams().
 */
import { fail, ok, type Result } from './types';

export interface ExpressTier {
  /** Khoảng cách tối đa (km, tính cả mốc) của bậc này. */
  maxKm: number;
  fee: number;
}

export interface Params {
  settlementPolicy?: SettlementPolicy;
  /** PAR-02 Ngưỡng tồn thấp mặc định */
  lowStockThreshold: number;
  /** PAR-04 Bước làm tròn tiền cọc (làm tròn lên), đồng */
  depositRoundingStep: number;
  /** PAR-08 Số ngày tối thiểu từ hôm nay tới ngày giao D; mốc huỷ được hoàn cọc */
  preorderMinLeadDays: number;
  /** PAR-11 Hạn HTX xác nhận đơn, giờ */
  coopConfirmHours: number;
  /** PAR-15 Số đơn mỗi lần tải danh sách */
  orderPageSize: number;
  /** PAR-16 Khoảng ngày mặc định của danh sách đơn */
  orderListDefaultDays: number;
  /** PAR-18 Tỷ lệ cọc đặt trước, % */
  depositPercent: number;
  /** PAR-19 Thời gian giữ hàng chờ thanh toán online, phút */
  paymentHoldMinutes: number;
  /** PAR-20 Phút gửi nhắc thanh toán */
  paymentReminderMinute: number;
  /** PAR-21 Giờ chốt nhận đơn hoả tốc, "HH:mm" */
  expressCutoff: string;
  /** PAR-22 Độ dài tối đa lời nhắn hộp quà, ký tự */
  giftMessageMaxLength: number;
  /** PAR-23 Trần giá trị đơn được chọn COD, đồng */
  codMaxOrderValue: number;
  /** PAR-24 Hạn trả phần còn lại của đơn đặt trước, giờ */
  remainingPaymentHours: number;
  /** PAR-25 Số lần nhắc trả phần còn lại */
  remainingPaymentReminders: number;
  /** PAR-26 Tự chuyển Đã giao nếu khách không bấm, giờ (hàng tươi / hàng khô) */
  autoDeliveredHoursFresh: number;
  autoDeliveredHoursDry: number;
  /** PAR-27 Số lần giao lại tối đa */
  maxRedeliveries: number;
  /** PAR-28 Số mã ưu đãi mỗi lần đặt */
  vouchersPerCheckout: number;
  /** RET-01 Hạn gửi yêu cầu trả hàng tính từ lúc Đã giao, giờ (tươi–đông lạnh / khô) */
  returnWindowHoursFresh: number;
  returnWindowHoursDry: number;
  /** SLA-01 Ticket: phản hồi tiếp nhận / kết luận lỗi, giờ làm việc */
  ticketAckHours: number;
  ticketResolveHours: number;
  /** FEE-01 Phí giao thường mỗi đơn, đồng */
  standardShippingFee: number;
  /** FEE-02 Phụ phí hoả tốc theo khoảng cách; quá bậc cuối thì không có hoả tốc */
  expressTiers: ExpressTier[];
  /** COM-01 Hoa hồng sàn trên tiền hàng thực giữ lại, % */
  commissionPercent: number;
  /** OI-08 chưa chốt: có hoàn phí giao khi lỗi không do khách hay không */
  refundShippingWhenNotCustomerFault: boolean;
  /** NEW-04 Số ảnh tối đa mỗi tin nhắn (nhắn tin riêng và trao đổi theo đơn) */
  messagePhotoMax: number;
}

export type ParamKey = keyof Params;

export type ParamStatus = 'Demo' | 'Demo, chờ chốt' | 'Demo, chưa chốt' | 'Đã có trong SRS' | 'Đã có' | 'Giả định' | 'Đề xuất, chờ chốt' | 'Theo SOP' | 'Chờ nhóm chốt (OI-08)';

export interface ParamMeta {
  key: ParamKey;
  code: string;
  label: string;
  unit: string;
  status: ParamStatus;
}

export const DEFAULT_PARAMS: Params = {
  lowStockThreshold: 10,
  depositRoundingStep: 1_000,
  preorderMinLeadDays: 3,
  coopConfirmHours: 24,
  orderPageSize: 20,
  orderListDefaultDays: 90,
  depositPercent: 30,
  paymentHoldMinutes: 15,
  paymentReminderMinute: 10,
  expressCutoff: '14:00',
  giftMessageMaxLength: 200,
  codMaxOrderValue: 2_000_000,
  remainingPaymentHours: 24,
  remainingPaymentReminders: 2,
  autoDeliveredHoursFresh: 24,
  autoDeliveredHoursDry: 72,
  maxRedeliveries: 3,
  vouchersPerCheckout: 1,
  returnWindowHoursFresh: 24,
  returnWindowHoursDry: 240,
  ticketAckHours: 2,
  ticketResolveHours: 24,
  standardShippingFee: 28_000,
  expressTiers: [
    { maxKm: 5, fee: 20_000 },
    { maxKm: 10, fee: 30_000 },
    { maxKm: 15, fee: 40_000 },
  ],
  commissionPercent: 5,
  refundShippingWhenNotCustomerFault: false,
  messagePhotoMax: 2,
};

/** Danh mục tham số hiển thị ở màn Tham số, kèm cột "Tình trạng". */
export const PARAM_CATALOG: ParamMeta[] = [
  { key: 'lowStockThreshold', code: 'PAR-02', label: 'Ngưỡng tồn thấp mặc định', unit: 'đơn vị', status: 'Demo' },
  { key: 'depositRoundingStep', code: 'PAR-04', label: 'Bước làm tròn tiền cọc (làm tròn lên)', unit: 'đ', status: 'Đã có trong SRS' },
  { key: 'preorderMinLeadDays', code: 'PAR-08', label: 'Số ngày tối thiểu tới ngày giao D; mốc huỷ được hoàn cọc', unit: 'ngày', status: 'Đã có' },
  { key: 'coopConfirmHours', code: 'PAR-11', label: 'Hạn HTX xác nhận đơn', unit: 'giờ', status: 'Demo, chờ chốt' },
  { key: 'orderPageSize', code: 'PAR-15', label: 'Số đơn mỗi lần tải danh sách', unit: 'đơn', status: 'Đã có' },
  { key: 'orderListDefaultDays', code: 'PAR-16', label: 'Khoảng ngày mặc định của danh sách đơn', unit: 'ngày', status: 'Đã có' },
  { key: 'depositPercent', code: 'PAR-18', label: 'Tỷ lệ cọc đặt trước', unit: '%', status: 'Giả định' },
  { key: 'paymentHoldMinutes', code: 'PAR-19', label: 'Thời gian giữ hàng chờ thanh toán online', unit: 'phút', status: 'Đã có' },
  { key: 'paymentReminderMinute', code: 'PAR-20', label: 'Phút gửi nhắc thanh toán', unit: 'phút', status: 'Đã có' },
  { key: 'expressCutoff', code: 'PAR-21', label: 'Giờ chốt nhận đơn hoả tốc', unit: 'giờ', status: 'Đã có' },
  { key: 'giftMessageMaxLength', code: 'PAR-22', label: 'Độ dài tối đa lời nhắn hộp quà', unit: 'ký tự', status: 'Đã có' },
  { key: 'codMaxOrderValue', code: 'PAR-23', label: 'Trần giá trị đơn được chọn COD', unit: 'đ', status: 'Demo, chưa chốt' },
  { key: 'remainingPaymentHours', code: 'PAR-24', label: 'Hạn trả phần còn lại của đơn đặt trước', unit: 'giờ', status: 'Đã có' },
  { key: 'remainingPaymentReminders', code: 'PAR-25', label: 'Số lần nhắc trả phần còn lại', unit: 'lần', status: 'Đã có' },
  { key: 'autoDeliveredHoursFresh', code: 'PAR-26', label: 'Tự chuyển Đã giao nếu khách không bấm – hàng tươi', unit: 'giờ', status: 'Đã có' },
  { key: 'autoDeliveredHoursDry', code: 'PAR-26', label: 'Tự chuyển Đã giao nếu khách không bấm – hàng khô', unit: 'giờ', status: 'Đã có' },
  { key: 'maxRedeliveries', code: 'PAR-27', label: 'Số lần giao lại tối đa', unit: 'lần', status: 'Đã có' },
  { key: 'vouchersPerCheckout', code: 'PAR-28', label: 'Số mã ưu đãi mỗi lần đặt', unit: 'mã', status: 'Đã có' },
  { key: 'returnWindowHoursFresh', code: 'RET-01', label: 'Hạn gửi yêu cầu trả hàng – tươi, đông lạnh', unit: 'giờ', status: 'Đề xuất, chờ chốt' },
  { key: 'returnWindowHoursDry', code: 'RET-01', label: 'Hạn gửi yêu cầu trả hàng – khô', unit: 'giờ', status: 'Đề xuất, chờ chốt' },
  { key: 'ticketAckHours', code: 'SLA-01', label: 'Ticket: phản hồi tiếp nhận', unit: 'giờ làm việc', status: 'Theo SOP' },
  { key: 'ticketResolveHours', code: 'SLA-01', label: 'Ticket: kết luận lỗi', unit: 'giờ làm việc', status: 'Theo SOP' },
  { key: 'standardShippingFee', code: 'FEE-01', label: 'Phí giao thường mỗi đơn', unit: 'đ', status: 'Demo' },
  { key: 'expressTiers', code: 'FEE-02', label: 'Phụ phí hoả tốc theo khoảng cách', unit: 'đ', status: 'Demo' },
  { key: 'commissionPercent', code: 'COM-01', label: 'Hoa hồng sàn trên tiền hàng thực giữ lại', unit: '%', status: 'Giả định' },
  { key: 'refundShippingWhenNotCustomerFault', code: 'OI-08', label: 'Hoàn phí giao khi lỗi không do khách', unit: '', status: 'Chờ nhóm chốt (OI-08)' },
  { key: 'messagePhotoMax', code: 'NEW-04', label: 'Số ảnh tối đa mỗi tin nhắn', unit: 'ảnh', status: 'Demo' },
];

export interface ParamChange {
  key: ParamKey;
  code: string;
  by: string;
  at: string; // ISO
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

/**
 * Sửa một tham số. Bắt buộc có lý do. Trả về bộ tham số mới và dòng lịch sử.
 * Không sửa đơn đã tạo: đơn dùng bản chốt lúc tạo (BR-DAT-06).
 */
export function updateParam<K extends ParamKey>(
  params: Params,
  key: K,
  newValue: Params[K],
  by: string,
  reason: string,
  at: Date,
): Result<{ params: Params; change: ParamChange }> {
  if(key==='settlementPolicy')return fail('Chính sách chi trả cần lưu qua quy trình xác nhận riêng.');
  if(!PARAM_CATALOG.some(item=>item.key===key))return fail('Tham số không được hỗ trợ.');
  if (!reason.trim()) return fail('Vui lòng nhập lý do thay đổi tham số.');
  const meta = PARAM_CATALOG.find((m) => m.key === key);
  if (typeof newValue === 'number' && (!Number.isFinite(newValue) || newValue < 0)) {
    return fail('Giá trị tham số không hợp lệ.');
  }
  return ok({
    params: { ...params, [key]: newValue },
    change: {
      key,
      code: meta?.code ?? String(key),
      by,
      at: at.toISOString(),
      oldValue: params[key],
      newValue,
      reason: reason.trim(),
    },
  });
}

export interface SettlementPolicy {
  revision:number;
  reservePercent:number;
  reserveDays:number;
  minimumPayout:number;
  payoutFee:number;
  approvalReference:string;
  approvedBy:string;
  approvedAt:string;
}

/** Bản chốt tham số lưu vào đơn lúc tạo (BR-DAT-06). */
export function snapshotParams(params: Params): Params {
  return structuredClone(params);
}

/** Đọc "HH:mm" thành số phút trong ngày. */
export function parseClock(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
