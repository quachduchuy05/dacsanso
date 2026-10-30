import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { actorOf } from '../src/domain/auth.ts';
import { isValidPhone, normalizePhone } from '../src/domain/phone.ts';
import {verifiedSupabaseUser} from './supabase-services.mjs';
export class ApiError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
export const assert = (condition, status, message) => { if (!condition)
    throw new ApiError(status, message); };
export const hash = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export async function issueSession(db, userId) {
    const account=(await db.read()).state.users.find(u=>u.id===userId);
    assert(account&&account.status==='active'&&!account.accessClosedAt&&(!account.expiresAt||Date.parse(account.expiresAt)>Date.now()),401,'Tài khoản không hoạt động hoặc đã hết hạn.');
    const accessToken = token(), refreshToken = token(), now = Date.now();
    await db.sql.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hash(accessToken), hash(refreshToken), userId, now + 15 * 60000, now + 7 * 86400000);
    const previous=await db.sql.prepare('SELECT access_hash FROM sessions WHERE user_id=? AND access_hash<>? ORDER BY refresh_expires_at DESC,access_hash DESC').all(userId,hash(accessToken));
    for(const session of previous.slice(2))await db.sql.prepare('DELETE FROM sessions WHERE access_hash=?').run(session.access_hash);
    return { accessToken, refreshToken, expiresIn: 900 };
}
export async function authenticate(db, req, required = true,options={}) {
    const raw=req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_.-]{20,10000})$/)?.[1];
    if(raw?.split('.').length===3){
        const identity=await verifiedSupabaseUser(options.supabase,raw);
        assert(!await db.sql.prepare('SELECT token_hash FROM revoked_tokens WHERE token_hash=? AND expires_at>?').get(hash(raw),Date.now()),401,'Phiên đã đăng xuất.');
        const user=(await db.read()).state.users.find(u=>u.supabaseId===identity.id&&u.status==='active'&&!u.accessClosedAt);
        assert(user,401,'Tài khoản chưa liên kết hoặc đã bị khóa.');
        assert(!user.expiresAt||Date.parse(user.expiresAt)>Date.now(),401,'Tài khoản đã hết hạn sử dụng.');
        return {user,actor:actorOf(user),supabaseUser:identity,accessToken:raw,session:null};
    }
    const bearer = raw?.match(/^[A-Za-z0-9_-]{43}$/)?.[0];
    if (!bearer) {
        assert(!required, 401, 'Vui lòng đăng nhập.');
        return null;
    }
    const session = await db.sql.prepare('SELECT * FROM sessions WHERE access_hash=? AND expires_at>?').get(hash(bearer), Date.now());
    assert(session, 401, 'Phiên đăng nhập đã hết hạn.');
    const user = (await db.read()).state.users.find(u => u.id === session.user_id && u.status === 'active'&&!u.accessClosedAt);
    assert(user, 401, 'Tài khoản không còn hoạt động.');
    assert(!user.expiresAt||Date.parse(user.expiresAt)>Date.now(),401,'Tài khoản đã hết hạn sử dụng.');
    return { user, actor: actorOf(user), session };
}
export async function requestOtp(db, body, options, ip) {
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '');
    const purpose = body.purpose ?? 'login';
    assert(isValidPhone(phone), 400, 'Số điện thoại không hợp lệ.');
    assert(['login', 'register', 'application','change-phone','reset-password'].includes(purpose), 400, 'Mục đích OTP không hợp lệ.');
    assert(await db.rate(`otp-ip:${ip}`, 15, 3600000) && await db.rate(`otp-phone:${phone}`, 3, 900000), 429, 'Tối đa 3 yêu cầu OTP trong 15 phút.');
    assert(options.demo || options.smsUrl, 503, 'Chưa cấu hình dịch vụ gửi OTP.');
    const id = token(), code = options.demo ? '123456' : String(randomInt(0, 1000000)).padStart(6, '0'), now = Date.now();
    await db.transaction(async()=>{
    const latest = await db.sql.prepare('SELECT created_at FROM otp_challenges WHERE phone=? ORDER BY created_at DESC LIMIT 1').get(phone);
    assert(!latest || Date.now() - latest.created_at >= 60000, 429, 'Vui lòng chờ 60 giây trước khi gửi lại mã.');
    await db.sql.prepare('DELETE FROM otp_challenges WHERE phone=? OR expires_at<?').run(phone, now);
    await db.sql.prepare('INSERT INTO otp_challenges VALUES(?,?,?,?,?,0,?)').run(id, phone, purpose, hash(`${id}:${code}`), now + 120000, now);
    });
    if (!options.demo) {
        try {
            const sent = await fetch(options.smsUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.smsToken ?? ''}` }, body: JSON.stringify({ phone, code, expiresIn: 120 }), signal: AbortSignal.timeout(10000) });
            if (!sent.ok)
                throw new Error('SMS provider failed');
        }
        catch {
            await db.sql.prepare('DELETE FROM otp_challenges WHERE id=?').run(id);
            throw new ApiError(502, 'Chưa gửi được mã OTP.');
        }
    }
    return { challengeId: id, expiresIn: 120, demo: options.demo };
}
export async function verifyOtp(db, body, purpose) {
    const result=await db.transaction(async()=>{
    const row = typeof body.challengeId === 'string' ? await db.sql.prepare('SELECT * FROM otp_challenges WHERE id=?').get(body.challengeId) : null;
    if(!(row && row.expires_at > Date.now() && row.attempts < 5 && row.purpose === purpose))return {error:'Mã OTP đã hết hạn hoặc không hợp lệ.'};
    await db.sql.prepare('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=?').run(row.id);
    if(!(typeof body.otp === 'string' && safeEqual(row.code_hash, hash(`${row.id}:${body.otp.trim()}`))))return {error:'Mã OTP không đúng.'};
    await db.sql.prepare('DELETE FROM otp_challenges WHERE id=?').run(row.id);
    return {phone:row.phone};
    });
    assert(!result.error,401,result.error);return result.phone;
}
