/**
 * Đồng bộ dữ liệu demo với API dùng chung /api/state (api/state.ts).
 *
 * - Quy tắc nghiệp vụ vẫn chạy trên trình duyệt. Mỗi thao tác được áp dụng ngay trên màn hình (không phải chờ mạng),
 *   đồng thời được giữ lại dưới dạng "thay đổi" chạy lại được (Mutation).
 * - Gửi dữ liệu lên kèm phiên bản đang có. Máy khác vừa ghi trước (409) thì lấy dữ liệu mới nhất,
 *   chạy lại các thay đổi chưa gửi được trên dữ liệu đó rồi gửi lại. Thay đổi không còn hợp lệ thì bỏ và báo.
 * - Hỏi server định kỳ (chỉ đọc số phiên bản) để thấy thay đổi của máy khác.
 * - Không có API, API chưa nối cơ sở dữ liệu, hoặc mở ngoài Vercel: chuyển sang chế độ lưu trên trình duyệt như trước.
 * - API lỗi tạm lúc mở app (mất mạng, lỗi 5xx, cơ sở dữ liệu từ chối): không bỏ hẳn API mà thử lại sau; thay đổi trong lúc chờ
 *   được giữ và gửi khi API trả lời (sửa lỗi bản web 18/10/2026: trước đây chuyển hẳn sang lưu trên máy, mỗi máy một dữ liệu).
 * - Dữ liệu quá lớn (413): báo rõ, không gửi lặp lại cùng dữ liệu; gửi lại khi có thay đổi mới (vd. khôi phục dữ liệu mẫu).
 */
import type { DemoState } from '../domain/types';

export type SyncStatus =
  | { mode: 'checking' }
  | { mode: 'local'; reason: string }
  | { mode: 'shared'; phase: 'synced' | 'saving' | 'offline' | 'error'; lastSyncAt: number | null; message?: string };

/** Một thay đổi chạy lại được trên dữ liệu khác; trả null nếu không còn áp dụng được. */
export type Mutation = (base: DemoState) => DemoState | null;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface RemoteSyncOptions {
  /** Phiên bản cấu trúc dữ liệu (STORAGE_VERSION). Dữ liệu trên server khác phiên bản thì bị thay. */
  schema: number;
  endpoint?: string;
  fetch?: FetchLike;
  /** Dữ liệu mới cần hiển thị (từ server, hoặc sau khi chạy lại thay đổi). */
  onState: (state: DemoState) => void;
  onStatus: (status: SyncStatus) => void;
  /** Có thay đổi bị bỏ vì dữ liệu vừa được máy khác thay đổi. */
  onDropped?: (count: number) => void;
  /** Kiểm tra và bù trường thiếu cho dữ liệu từ server; null nếu không phải dữ liệu demo. */
  normalize?: (data: unknown) => DemoState | null;
}

const looksLikeDemoState = (data: unknown): data is DemoState =>
  typeof data === 'object' && data !== null && ['users', 'products', 'orders'].every((k) => Array.isArray((data as Record<string, unknown>)[k]));

export class RemoteSync {
  private status: SyncStatus = { mode: 'checking' };
  private version = 0;
  private current: DemoState | null = null;
  private pending: Mutation[] = [];
  private inFlight = false;
  /** Server chưa có dữ liệu hoặc khác cấu trúc: lần gửi tới ghi đè bằng dữ liệu của máy này. */
  private overwrite = false;
  private lastSyncAt: number | null = null;
  private retryDelay = 5_000;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  /** Lần gửi gần nhất bị từ chối vì dữ liệu quá lớn: chờ thay đổi mới rồi mới gửi lại. */
  private tooLarge = false;
  private readonly endpoint: string;
  private readonly fetch: FetchLike;

  constructor(private readonly opts: RemoteSyncOptions) {
    this.endpoint = opts.endpoint ?? '/api/state';
    this.fetch = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  get isShared(): boolean {
    return this.status.mode === 'shared';
  }

  /** Số thay đổi chưa gửi được. */
  get pendingCount(): number {
    return this.pending.length;
  }

  /** Hỏi API lần đầu. `local` là dữ liệu đang hiển thị (từ bộ nhớ trình duyệt hoặc dữ liệu mẫu). */
  async start(local: DemoState): Promise<void> {
    if (!this.current) this.current = local;
    let res: Response;
    try {
      res = await this.fetch(this.endpoint, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
    } catch {
      return this.startFailed('Chưa kết nối được API dữ liệu chung. Đang thử lại; thay đổi được giữ trên máy này.');
    }
    const body = await readJson(res);
    if (res.status === 503) return this.goLocal('API chưa nối cơ sở dữ liệu. Dữ liệu đang lưu trên trình duyệt này.');
    if (res.status >= 500 || res.status === 429) {
      return this.startFailed(`${typeof body?.error === 'string' ? body.error : `API dữ liệu chung trả lỗi ${res.status}.`} Đang thử lại; thay đổi được giữ trên máy này.`);
    }
    if (!res.ok || !body || typeof body.version !== 'number') {
      return this.goLocal('Bản đang mở không có API dữ liệu chung. Dữ liệu đang lưu trên trình duyệt này.');
    }
    this.version = body.version;
    this.lastSyncAt = Date.now();
    this.setShared('synced');
    const data = body.schema === this.opts.schema ? this.parse(body.data) : null;
    if (data) {
      this.adopt(data);
    } else {
      // Lần đầu dùng API (chưa có dữ liệu) hoặc dữ liệu cũ khác cấu trúc: đưa dữ liệu của máy này lên.
      this.overwrite = true;
      void this.flush();
    }
  }

  /** Ghi nhận một thay đổi vừa áp dụng trên màn hình (`next` là dữ liệu sau thay đổi). */
  record(mutation: Mutation, next: DemoState): void {
    this.current = next;
    if (this.status.mode === 'local' || this.stopped) return;
    this.tooLarge = false;
    this.pending.push(mutation);
    if (this.isShared) void this.flush();
  }

  /** Gửi các thay đổi chưa gửi. Chỉ một lần gửi tại một thời điểm. */
  async flush(): Promise<void> {
    if (!this.isShared || this.inFlight || this.stopped || !this.current) return;
    if (!this.overwrite && this.pending.length === 0) return;
    const sending = this.pending.length;
    const snapshot = this.current;
    this.inFlight = true;
    this.setShared('saving');
    let res: Response;
    try {
      res = await this.fetch(this.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ baseVersion: this.version, schema: this.opts.schema, data: snapshot }),
      });
    } catch {
      this.inFlight = false;
      this.setShared('offline', 'Mất kết nối tới API. Thay đổi đang giữ trên máy này và sẽ gửi lại.');
      this.scheduleRetry();
      return;
    }
    const body = await readJson(res);
    this.inFlight = false;
    if (this.stopped) return;

    if (res.ok && typeof body?.version === 'number') {
      this.version = body.version;
      this.pending.splice(0, sending);
      this.overwrite = false;
      this.lastSyncAt = Date.now();
      this.retryDelay = 5_000;
      this.setShared('synced');
      if (this.pending.length > 0) void this.flush();
      return;
    }
    if (res.status === 409 && body && typeof body.version === 'number') {
      // Máy khác vừa ghi: lấy dữ liệu mới nhất, chạy lại các thay đổi rồi gửi lại.
      this.version = body.version;
      const data = body.schema === this.opts.schema ? this.parse(body.data) : null;
      if (data) {
        this.overwrite = false;
        this.adopt(data);
      } else {
        this.overwrite = true;
        void this.flush();
      }
      return;
    }
    if (res.status === 413) {
      this.tooLarge = true;
      this.setShared('error', typeof body?.error === 'string' ? body.error : 'Dữ liệu demo quá lớn để lưu lên API.');
      return;
    }
    this.setShared('offline', typeof body?.error === 'string' ? body.error : `API trả lỗi ${res.status}.`);
    this.scheduleRetry();
  }

  /** Hỏi server có dữ liệu mới không (chỉ đọc số phiên bản nếu không đổi). */
  async poll(): Promise<void> {
    if (!this.isShared || this.inFlight || this.stopped) return;
    let res: Response;
    try {
      res = await this.fetch(`${this.endpoint}?since=${this.version}`, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
    } catch {
      this.setShared('offline', 'Mất kết nối tới API. Đang thử lại.');
      return;
    }
    const body = await readJson(res);
    if (this.stopped || this.inFlight || !res.ok || !body || typeof body.version !== 'number') {
      if (!res.ok && !this.inFlight) this.setShared('offline', typeof body?.error === 'string' ? body.error : `API trả lỗi ${res.status}.`);
      return;
    }
    this.lastSyncAt = Date.now();
    if (body.changed === false) {
      if (this.status.mode === 'shared' && this.status.phase === 'offline') this.setShared('synced');
      if ((this.pending.length > 0 || this.overwrite) && !this.tooLarge) void this.flush();
      else this.emitStatus();
      return;
    }
    this.version = body.version;
    const data = body.schema === this.opts.schema ? this.parse(body.data) : null;
    if (data) {
      this.adopt(data);
      if (this.pending.length === 0) this.setShared('synced');
    } else {
      this.overwrite = true;
      if (!this.tooLarge) void this.flush();
    }
  }

  /** Gửi ngay thay đổi đang chờ rồi hỏi dữ liệu mới. */
  async syncNow(): Promise<void> {
    await this.flush();
    await this.poll();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.retryTimer);
  }

  /** Nhận dữ liệu từ server làm gốc, chạy lại các thay đổi chưa gửi, rồi gửi tiếp nếu còn. */
  private adopt(server: DemoState): void {
    let next = server;
    let dropped = 0;
    const kept: Mutation[] = [];
    for (const mutation of this.pending) {
      const applied = mutation(next);
      if (applied) {
        next = applied;
        kept.push(mutation);
      } else {
        dropped += 1;
      }
    }
    this.pending = kept;
    this.current = next;
    this.opts.onState(next);
    if (dropped > 0) this.opts.onDropped?.(dropped);
    if (this.pending.length > 0) void this.flush();
  }

  private parse(data: unknown): DemoState | null {
    if (this.opts.normalize) return this.opts.normalize(data);
    return looksLikeDemoState(data) ? data : null;
  }

  /** API lỗi tạm lúc mở app: vẫn coi là dữ liệu dùng chung (chưa có phiên bản), thử hỏi lại sau. */
  private startFailed(message: string): void {
    this.version = 0;
    this.setShared('offline', message);
    this.scheduleRetry();
  }

  private goLocal(reason: string): void {
    this.pending = [];
    this.status = { mode: 'local', reason };
    this.opts.onStatus(this.status);
  }

  private setShared(phase: 'synced' | 'saving' | 'offline' | 'error', message?: string): void {
    this.status = { mode: 'shared', phase, lastSyncAt: this.lastSyncAt, message };
    this.opts.onStatus(this.status);
  }

  private emitStatus(): void {
    if (this.status.mode === 'shared') this.setShared(this.status.phase, this.status.message);
  }

  private scheduleRetry(): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (this.pending.length > 0 || this.overwrite) void this.flush();
      else void this.poll();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
  }
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const text = await res.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
