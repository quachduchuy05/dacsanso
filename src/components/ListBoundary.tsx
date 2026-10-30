import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError, reloadOnceForNewVersion } from '../app/chunkReload';
import { ErrorState } from './EmptyState';
import { ErrorDetails, errorDetails } from './ErrorDetails';

/**
 * Trạng thái lỗi cho danh sách và màn (Giai đoạn 6, mục 10.5): một phần giao diện gặp lỗi
 * (dữ liệu trên trình duyệt bị hỏng, không tải được mã của màn) thì chỉ phần đó báo lỗi, phần còn lại vẫn dùng được.
 * Đặt `key` theo tab hoặc màn để chuyển tab là thử lại. `resetKey` đổi (vd. dữ liệu vừa được khôi phục) cũng thử lại.
 */
export class ListBoundary extends Component<
  { children: ReactNode; label?: string; wrap?: (node: ReactNode) => ReactNode; resetKey?: unknown },
  { error: Error | null; componentStack: string | null }
> {
  state: { error: Error | null; componentStack: string | null } = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error);
    this.setState({ componentStack: info.componentStack ?? null });
    // Không tải được mã của bản cũ (vừa deploy bản mới): tải lại trang để lấy bản mới.
    if (isChunkLoadError(error)) reloadOnceForNewVersion();
  }

  componentDidUpdate(prev: { resetKey?: unknown }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const wrap = this.props.wrap ?? ((n: ReactNode) => n);
    return wrap(
      <ErrorState
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => this.setState({ error: null })} className="min-h-11 rounded-xl bg-white px-4 font-semibold text-rose-900 ring-1 ring-rose-300 hover:bg-rose-100">
              Thử lại
            </button>
            <button onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-white px-4 font-semibold text-rose-900 ring-1 ring-rose-300 hover:bg-rose-100">
              Tải lại trang
            </button>
          </div>
        }
      >
        {isChunkLoadError(this.state.error) ? (
          <p className="font-semibold">Ứng dụng vừa có bản mới. Bấm "Tải lại trang" để dùng bản mới.</p>
        ) : (
          <>
            <p className="font-semibold">Không hiển thị được {this.props.label ?? 'nội dung này'}.</p>
            <p className="mt-1 break-words font-mono text-xs">Lỗi: {this.state.error.message.slice(0, 200)}</p>
            <p className="mt-1">Nếu lỗi lặp lại, nhờ Quản trị gốc hoặc Admin – Vận hành mở "Công cụ demo" và bấm "Khôi phục dữ liệu mẫu".</p>
            <div className="mt-3">
              <ErrorDetails text={errorDetails(this.state.error, this.props.label ?? 'nội dung này', this.state.componentStack)} />
            </div>
          </>
        )}
      </ErrorState>,
    );
  }
}
