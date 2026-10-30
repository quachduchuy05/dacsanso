import { useState } from 'react';

/**
 * Chi tiết lỗi để người dùng sao chép gửi nhóm phát triển (sửa lỗi bản web 18/10/2026): thông báo lỗi, vị trí trong mã,
 * màn đang mở, trình duyệt. Trước đây khung báo lỗi khi chuyển tab không có chi tiết nên không biết lỗi ở đâu.
 * Không chứa dữ liệu demo (đơn, SĐT…), chỉ có thông tin kỹ thuật.
 */
export function errorDetails(error: Error, where: string, componentStack?: string | null): string {
  const lines = (text: string | null | undefined, n: number) =>
    (text ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, n);
  return [
    `Lỗi: ${error.name}: ${error.message}`,
    `Ở: ${where}`,
    `Bản: ${__APP_BUILD__}`,
    `Trang: ${window.location.pathname}${window.location.hash}`,
    `Lúc: ${new Date().toISOString()}`,
    `Trình duyệt: ${navigator.userAgent}`,
    'Mã:',
    ...lines(error.stack, 10),
    'Thành phần:',
    ...lines(componentStack, 8),
  ].join('\n');
}

export function ErrorDetails({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <details className="w-full rounded-xl border border-stone-300 bg-white p-3 text-left text-xs text-stone-700">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink">Chi tiết lỗi (gửi cho nhóm phát triển)</summary>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-stone-50 p-2 font-mono text-xs" tabIndex={0}>
        {text}
      </pre>
      <button type="button" onClick={copy} className="mt-2 min-h-11 rounded-xl bg-forest-900 px-4 text-sm font-semibold text-champagne-100 hover:bg-forest-800">
        {copied ? 'Đã sao chép' : 'Sao chép chi tiết lỗi'}
      </button>
    </details>
  );
}
