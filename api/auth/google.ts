/// <reference types="node" />
/**
 * Xác minh đăng nhập Google (Vercel Serverless Function): POST /api/auth/google  { credential }
 *
 * Nút "Đăng nhập bằng Google" (Google Identity Services) trả về ID token. Server hỏi Google (endpoint tokeninfo)
 * để kiểm tra chữ ký và hạn của token, rồi kiểm tra token cấp cho đúng Client ID của app, đúng nơi phát hành,
 * email đã xác minh. Đúng thì trả về:
 *   200 { id, name, emailMasked }
 *     - id: mã băm SHA-256 của mã tài khoản Google (không lưu mã gốc, không lưu email đầy đủ)
 *     - emailMasked: email đã che, vd. "ho•••@gmail.com"
 *   400 thiếu token · 401 token không hợp lệ · 503 chưa cấu hình Client ID
 *
 * Client ID đọc từ GOOGLE_CLIENT_ID hoặc VITE_GOOGLE_CLIENT_ID (cùng giá trị app dùng để hiện nút).
 * Bản demo không có phiên đăng nhập phía server: dữ liệu demo vẫn là dữ liệu dùng chung (xem api/state.ts).
 * File này tự chứa giống api/state.ts.
 */
import { createHash } from 'node:crypto';

const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/** Che email: giữ 2 ký tự đầu và tên miền. */
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (!local || !domain) return '';
  return `${local.slice(0, 2)}•••@${domain}`;
}

/** Mã tài khoản lưu trong dữ liệu demo: băm mã Google, không giữ mã gốc. */
export function hashGoogleSub(sub: string): string {
  return createHash('sha256').update(`google:${sub}`).digest('hex').slice(0, 32);
}

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface GoogleAuthDeps {
  clientId?: string;
  fetch: FetchLike;
  now?: () => number;
}

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

interface TokenInfo {
  aud?: string;
  iss?: string;
  sub?: string;
  exp?: string | number;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
}

const invalid: ApiResult = { status: 401, body: { error: 'Không xác minh được đăng nhập Google. Vui lòng thử lại.' } };
const unavailable: ApiResult = {status:503,body:{error:'Máy chủ chưa kết nối được Google để xác minh đăng nhập. Vui lòng thử lại sau.'}};

export async function handleGoogleAuthRequest(req: { method?: string; body?: unknown }, deps: GoogleAuthDeps): Promise<ApiResult> {
  if (req.method !== 'POST') return { status: 405, body: { error: 'Chỉ hỗ trợ POST.' } };
  if (!deps.clientId) return { status: 503, body: { error: 'Chưa cấu hình đăng nhập Google (thiếu Client ID).', configured: false } };
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const credential = typeof body === 'object' && body !== null ? (body as { credential?: unknown }).credential : undefined;
  if (typeof credential !== 'string' || credential.length < 20 || credential.length > 5000) return { status: 400, body: { error: 'Thiếu thông tin đăng nhập Google.' } };

  let res: Awaited<ReturnType<FetchLike>>;
  try {res = await deps.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);}
  catch {return unavailable;}
  if(res.status===429||res.status>=500)return unavailable;
  if (!res.ok) return invalid;
  const info = (await res.json().catch(() => null)) as TokenInfo | null;
  if (!info) return invalid;
  const now = deps.now?.() ?? Date.now();
  const verified = info.email_verified === true || info.email_verified === 'true';
  const expiresAt=Number(info.exp)*1000;
  if (info.aud !== deps.clientId || !ISSUERS.includes(info.iss ?? '') || !info.sub || !info.email || !verified || !Number.isFinite(expiresAt) || expiresAt <= now) return invalid;

  const name = (info.name || [info.given_name, info.family_name].filter(Boolean).join(' ') || 'Khách Google').trim().slice(0, 60);
  return { status: 200, body: { id: hashGoogleSub(info.sub), name, emailMasked: maskEmail(info.email) } };
}

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
}
interface VercelLikeResponse {
  status(code: number): VercelLikeResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const result = await handleGoogleAuthRequest(req, {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID,
      fetch: (url) => fetch(url),
    });
    if (result.status === 405) res.setHeader('Allow', 'POST');
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Không liên lạc được với Google.' });
  }
}
