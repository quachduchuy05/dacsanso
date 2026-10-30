/**
 * Danh sách ngân hàng để khách chọn khi liên kết tài khoản nhận hoàn tiền.
 * Chỉ là danh sách tên thương hiệu để chọn; liên kết là mô phỏng, app không kết nối với ngân hàng nào.
 * Mã (`code`) là mã nội bộ của app, không phải mã ngân hàng chính thức.
 */
export interface BankOption {
  code: string;
  name: string;
}

/** Ngân hàng của dữ liệu mẫu. */
export const SAMPLE_BANK: BankOption = { code: 'MAU', name: 'Ngân hàng mẫu' };

/** Chọn "Ngân hàng khác" thì khách tự gõ tên ngân hàng. */
export const OTHER_BANK_CODE = 'KHAC';

export const BANKS: BankOption[] = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'AGRI', name: 'Agribank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'OCB', name: 'OCB' },
  { code: 'LPB', name: 'LPBank' },
  { code: 'EIB', name: 'Eximbank' },
  SAMPLE_BANK,
];

/** Mã ngân hàng của một tài khoản đã lưu (tài khoản cũ chỉ có tên thì dò theo tên). */
export function bankCodeOf(account: { bankCode?: string; bankName: string } | undefined): string {
  if (!account) return '';
  if (account.bankCode) return account.bankCode;
  return BANKS.find((b) => b.name.toLowerCase() === account.bankName.trim().toLowerCase())?.code ?? OTHER_BANK_CODE;
}
