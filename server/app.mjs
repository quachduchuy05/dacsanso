import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase } from './postgres-database.mjs';
import { ApiError, assert, authenticate, hash, issueSession, requestOtp, verifyOtp, safeEqual } from './security.mjs';
import { project } from './projection.mjs';
import { executeBatch, runJobs, authorizeBatch, projectResults } from './command-service.mjs';
import { actorOf, registerCustomer, registerGoogleCustomer, findGoogleUser } from '../src/domain/auth.ts';
import { normalizePhone } from '../src/domain/phone.ts';
import { aggregateStats, periodStats } from '../src/domain/stats.ts';
import { exportReport } from '../src/domain/reports.ts';
import { handleGoogleAuthRequest } from '../api/auth/google.ts';
import { handleGeocodeRequest } from '../api/geocode.ts';
import { lookupCoopApplications, submitCoopApplication, resubmitCoopApplication } from '../src/domain/coopApplication.ts';
import { createSeedState } from '../src/data/seed.ts';
import { receiveWebhook } from './webhooks.mjs';
import { planCheckout } from '../src/domain/checkout.ts';
import {supabaseServices,verifiedSupabaseUser,connectSupabaseIdentity} from './supabase-services.mjs';
import {uploadMedia,signMedia,validateMediaReferences} from './media.mjs';
import {hashPassword,verifyPassword,validatePassword} from './passwords.mjs';
import {accountSecurityRoute} from './account-security.mjs';
import {productDraftRoute} from './product-drafts.mjs';
import {filteredReport,canExportKind} from './reporting.mjs';
import {workbook,parseCsv} from './xlsx.mjs';
import {ticketAction} from './ticket-actions.mjs';
import {reconciliationRoute} from './reconciliation.mjs';
import {adjustmentRoute} from './reconciliation-adjustments.mjs';
import {reviewPolicyRoute} from './review-policy.mjs';
import {lotRoute} from './lots.mjs';
import {productLockRoute} from './product-locks.mjs';
import {auditContext,auditFilterSql} from './audit-context.mjs';
import {createReportSnapshot} from './report-snapshots.mjs';
import {manageCatalog} from './catalog-management.mjs';
import {recordManualPayout} from './manual-payouts.mjs';
import {recordManualRefund} from './manual-refunds.mjs';
import {savePickupPoint} from './pickup-points.mjs';
import {coopReviewsRoute} from './coop-reviews.mjs';
import {deletionRequestsRoute} from './deletion-requests.mjs';
import {pushRoute,processPushQueue} from './web-push.mjs';
import {createPaymentSession} from './payment-sessions.mjs';
import {saveSettlementPolicy} from './settlement-policy.mjs';
import {enqueueExport,retryExport,processExportQueue} from './export-queue.mjs';
import {saveContent} from './content-management.mjs';
import {manageProfile} from './profile-management.mjs';
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
async function readBody(req) {
    assert((req.headers['content-type'] ?? '').startsWith('application/json'), 415, 'Yêu cầu Content-Type: application/json.');
    let length = 0;
    const chunks = [];
    for await (const chunk of req) {
        length += chunk.length;
        assert(length <= 4000000, 413, 'Nội dung yêu cầu quá lớn.');
        chunks.push(chunk);
    }
    try {
        req.rawBody = Buffer.concat(chunks).toString();
        const body = JSON.parse(req.rawBody);
        assert(body && typeof body === 'object' && !Array.isArray(body), 400, 'Nội dung phải là JSON object.');
        return body;
    }
    catch (e) {
        if (e instanceof ApiError)
            throw e;
        throw new ApiError(400, 'JSON không hợp lệ.');
    }
}
async function transactionReply(res, db, fn) {
    const result = await db.transaction(fn);
    return json(res, result.status, result.body);
}
export async function createApplication(config = {}) {
    const options = { demo: config.demo ?? false, ...config, ...supabaseServices(config) };
    const db = config.db ?? await openDatabase({ ...options, databasePath: config.databasePath ?? resolve('data/app.sqlite') });
    const handle = async (req, res) => {
        const correlationId = auditContext.getStore()?.correlationId??randomUUID();
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('X-Request-ID', correlationId);
        try {
            const url = new URL(req.url, 'http://localhost');
            const path = url.pathname;
            if (!path.startsWith('/api/')) {
                if (req.method !== 'GET' && req.method !== 'HEAD')
                    return json(res, 405, { error: 'Chỉ hỗ trợ GET.' });
                const root = resolve(config.staticDir ?? 'dist');
                let file = resolve(root, '.' + decodeURIComponent(path));
                assert(file === root || file.startsWith(root + sep), 403, 'Đường dẫn không hợp lệ.');
                if (!extname(file))
                    file = resolve(root, 'index.html');
                const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
                try {
                    await stat(file);
                    const data = await readFile(file);
                    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600' });
                    return res.end(req.method === 'HEAD' ? undefined : data);
                }
                catch {
                    return json(res, 404, { error: 'Chưa có giao diện build. Chạy npm run build hoặc npm run dev.' });
                }
            }
            const ip = req.socket.remoteAddress ?? 'unknown';
            assert(await db.rate(`api:${ip}`, 600, 60000), 429, 'Quá nhiều yêu cầu. Thử lại sau.');
            if (req.headers.origin) {
                const allowed = options.allowedOrigins ?? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:4173', 'http://127.0.0.1:4173', `http://localhost:${options.port ?? 4000}`];
                assert(allowed.includes(req.headers.origin), 403, 'Nguồn truy cập không được cho phép.');
            }
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                return res.end();
            }
            const body = (['POST', 'PUT', 'PATCH'].includes(req.method)||(req.method==='DELETE'&&path.endsWith('/edit-lock'))) ? await readBody(req) : {};
            if (path === '/api/health' && req.method === 'GET')
                return json(res, 200, { ok: true, storage: db.provider, demo: options.demo,auth:options.supabase?'supabase':'local',images:options.supabaseAdmin?'supabase':'inline' });
            if(path==='/api/v1/auth/supabase'&&req.method==='POST'){
                const identity=await verifiedSupabaseUser(options.supabase,body.accessToken);
                assert(!await db.sql.prepare('SELECT token_hash FROM revoked_tokens WHERE token_hash=? AND expires_at>?').get(hash(body.accessToken),Date.now()),401,'Phiên đã đăng xuất.');
                return await transactionReply(res,db,async()=>{
                    const user=await connectSupabaseIdentity(db,identity,options);
                    const {state,version}=await db.read();await db.audit(user.id,'supabase-login');
                    return {status:200,body:{user,state:project(state,user),version}};
                });
            }
            const webhook = path.match(/^\/api\/v1\/webhooks\/(payment|refund|payout|carrier)$/);
            if (webhook && req.method === 'POST')
                return json(res, 200, await receiveWebhook(db, webhook[1], req, body, options));
            if (path === '/api/state')
                return json(res, 410, { error: 'API ghi toàn bộ dữ liệu đã ngừng. Dùng /api/v1/state và /api/v1/commands.' });
            const accountReply=await accountSecurityRoute(path,req,body,{db,options,ip});
            if(accountReply)return json(res,accountReply.status,accountReply.body);
            if (['/api/v1/auth/password/login','/api/v1/auth/password/register'].includes(path) && req.method==='POST') {
                const registering=path.endsWith('/register');
                assert(await db.rate(`password:${ip}`,30,15*60000),429,'Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.');
                assert(typeof body.phone==='string',400,'Vui lòng nhập số điện thoại.');
                const phone=normalizePhone(body.phone);
                if(registering)validatePassword(body.password);
                else assert(typeof body.password==='string'&&body.password.length<=128,400,'Vui lòng nhập mật khẩu.');
                if(registering){
                    assert(typeof body.name==='string'&&body.name.trim().length>=2&&body.name.length<=100,400,'Họ tên phải từ 2 đến 100 ký tự.');
                    assert(!(await db.read()).state.users.some(u=>u.phone===phone),409,'Số điện thoại đã có tài khoản. Vui lòng đăng nhập.');
                    const verifiedPhone=await verifyOtp(db,body,'register');
                    assert(verifiedPhone===phone,403,'OTP không thuộc số điện thoại đăng ký.');
                }
                return await transactionReply(res,db,async()=>{
                    const {state}=await db.read();let user=state.users.find(u=>u.phone===phone);
                    if(registering){
                        assert(typeof body.name==='string'&&body.name.trim().length>=2&&body.name.length<=100,400,'Họ tên phải từ 2 đến 100 ký tự.');
                        assert(!user,409,'Số điện thoại đã có tài khoản. Vui lòng đăng nhập.');
                        const result=registerCustomer(state,{name:body.name,phone,otp:'123456'},new Date());
                        assert(result.ok,422,result.error);user=result.value.user;
                        user.phoneVerifiedAt=new Date().toISOString();
                        await db.save(result.value.state);
                        await db.sql.prepare('INSERT INTO password_credentials(user_id,password_hash) VALUES(?,?)').run(user.id,await hashPassword(body.password));
                    }else{
                        const attempt=await db.sql.prepare('SELECT * FROM password_attempts WHERE phone=?').get(phone);
                        if(attempt?.locked_until>Date.now())return {status:429,body:{error:'Tài khoản tạm khóa 15 phút do nhập sai mật khẩu.'}};
                        const credential=user?await db.sql.prepare('SELECT password_hash FROM password_credentials WHERE user_id=?').get(user.id):null;
                        // A demo password applies only to original sample identities, never newly created accounts.
                        const sample=options.demo&&user&&createSeedState(new Date()).users.some(u=>u.id===user.id&&u.phone===phone);
                        const encoded=credential?.password_hash??await hashPassword(sample?'Dacsan@123':`Aa1!${randomUUID().slice(0,16)}`);
                        if(!await verifyPassword(body.password,encoded)||user?.status!=='active'){
                            const failures=(attempt&&(!attempt.locked_until||attempt.locked_until>Date.now())?attempt.failures:0)+1;
                            await db.sql.prepare('INSERT INTO password_attempts VALUES(?,?,?) ON CONFLICT(phone) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until').run(phone,failures,failures>=5?Date.now()+900000:0);
                            await db.audit(user?.id,'password-login-failed');return {status:401,body:{error:'Số điện thoại hoặc mật khẩu không đúng.'}};
                        }
                        await db.sql.prepare('DELETE FROM password_attempts WHERE phone=?').run(phone);
                    }
                    const current=await db.read();await db.audit(user.id,registering?'password-register':'password-login');
                    return {status:200,body:{...await issueSession(db,user.id),user,state:project(current.state,user),version:current.version}};
                });
            }
            if (path === '/api/v1/auth/otp' && req.method === 'POST')
                return json(res, 200, await requestOtp(db, body, options, ip));
            if (['/api/v1/auth/login', '/api/v1/auth/register'].includes(path) && req.method === 'POST') {
                const registering = path.endsWith('/register');
                const phone = await verifyOtp(db, body, registering ? 'register' : 'login');
                return await transactionReply(res, db, async () => {
                    const { state } = await db.read();
                    let user = state.users.find(u => u.phone === phone);
                    if (registering) {
                        assert(typeof body.name === 'string' && body.name.trim().length >= 2 && body.name.length <= 100, 400, 'Tên phải từ 2 đến 100 ký tự.');
                        const r = registerCustomer(state, { name: body.name, phone, otp: '123456' }, new Date());
                        assert(r.ok, 422, r.error);
                        r.value.user.phoneVerifiedAt=new Date().toISOString();
                        await db.save(r.value.state);
                        user = r.value.user;
                    }
                    assert(user && user.status === 'active', 401, 'Tài khoản không tồn tại hoặc đã bị khóa.');
                    const session = await issueSession(db, user.id);
                    await db.audit(user.id, registering ? 'register' : 'login');
                    return { status: 200, body: { ...session, user, state: project((await db.read()).state, user), version: (await db.read()).version } };
                });
            }
            if (path === '/api/v1/auth/refresh' && req.method === 'POST') {
                assert(typeof body.refreshToken === 'string' && body.refreshToken.length === 43, 401, 'Refresh token không hợp lệ.');
                return await transactionReply(res, db, async () => {
                    const row = await db.sql.prepare('SELECT * FROM sessions WHERE refresh_hash=? AND refresh_expires_at>?').get(hash(body.refreshToken), Date.now());
                    assert(row && (await db.read()).state.users.some(u => u.id === row.user_id && u.status === 'active'), 401, 'Phiên đăng nhập đã hết hạn.');
                    await db.sql.prepare('DELETE FROM sessions WHERE access_hash=?').run(row.access_hash);
                    return { status: 200, body: await issueSession(db, row.user_id) };
                });
            }
            if (path === '/api/v1/auth/google' && req.method === 'POST') {
                let profile;
                if (options.demo && body.simulated === true) {
                    assert(typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email), 400, 'Email không hợp lệ.');
                    profile = { id: hash('sim:' + body.email.trim().toLowerCase()).slice(0, 32), name: String(body.name ?? 'Khách Google').slice(0, 60), emailMasked: body.email.slice(0, 2) + '•••@' + body.email.split('@')[1], simulated: true };
                }
                else {
                    const r = await handleGoogleAuthRequest({ method: 'POST', body }, { clientId: options.googleClientId, fetch: u => fetch(u, { signal: AbortSignal.timeout(10000) }) });
                    assert(r.status === 200, r.status, r.body.error);
                    profile = { ...r.body, simulated: false };
                }
                return await transactionReply(res, db, async () => {
                    const { state } = await db.read();
                    let user = findGoogleUser(state, profile.id);
                    if (!user) {
                        const r = registerGoogleCustomer(state, profile, new Date());
                        assert(r.ok, 422, r.error);
                        await db.save(r.value.state);
                        user = r.value.user;
                    }
                    assert(user.status === 'active', 403, 'Tài khoản đã bị khóa.');
                    await db.audit(user.id, 'google-login');
                    return { status: 200, body: { ...await issueSession(db, user.id), user, state: project((await db.read()).state, user), version: (await db.read()).version } };
                });
            }
            if (path === '/api/v1/demo/accounts' && req.method === 'GET') {
                assert(options.demo, 404, 'Không có chức năng này.');
                const state = (await db.read()).state;
                assert(!state.demoAccess?.codeHash, 403, 'Danh sách tài khoản demo đang được bảo vệ.');
                return json(res, 200, { users: state.users.filter(u => !u.google) });
            }
            if (path === '/api/v1/applications/lookup' && req.method === 'POST') {
                const phone = await verifyOtp(db, body, 'application');
                const r = lookupCoopApplications((await db.read()).state, phone, '123456');
                assert(r.ok, 422, r.error);
                return json(res, 200, { applications: r.value });
            }
            if (path === '/api/v1/applications' && req.method === 'POST') {
                const phone = await verifyOtp(db, body, 'application');
                assert(body.input && normalizePhone(body.input.loginPhone) === phone, 403, 'OTP không thuộc SĐT của hồ sơ.');
                return await transactionReply(res, db, async () => {
                    const { state } = await db.read(), at = new Date();
                    const r = body.applicationId ? resubmitCoopApplication(state, body.applicationId, body.input, '123456', at) : submitCoopApplication(state, body.input, '123456', at);
                    assert(r.ok, 422, r.error);
                    const next = r.value.state ?? r.value;
                    await db.save(next);
                    const application = r.value.application ?? next.coopApplications.find(a => a.id === body.applicationId);
                    await db.audit(null, 'application-submitted', application.id);
                    return { status: 201, body: { application } };
                });
            }
            if (path === '/api/geocode' && req.method === 'GET') {
                const r = await handleGeocodeRequest({ method: 'GET', query: Object.fromEntries(url.searchParams) }, { apiKey: options.mapsKey, fetch: u => fetch(u, { signal: AbortSignal.timeout(10000) }) });
                return json(res, r.status, r.body);
            }
            const optional = path === '/api/v1/state' || path.startsWith('/api/v1/products') || path === '/api/v1/commands'||path==='/api/v1/media/sign'||(req.method==='GET'&&path.startsWith('/api/v1/lots'));
            let auth = await authenticate(db, req, !(optional||(path==='/api/v1/coop-reviews'&&req.method==='GET')),options);
            if(path==='/api/v1/settlement-policy'&&req.method==='POST')return await transactionReply(res,db,async()=>({status:200,body:await saveSettlementPolicy(body,{db,auth})}));
            const paymentSession=path.match(/^\/api\/v1\/transactions\/([\w-]+)\/session$/);
            if(paymentSession&&req.method==='POST'){
                assert(await db.rate('payment-session:'+auth.user.id,20,900000),429,'Thử lại sau ít phút.');
                return json(res,200,await createPaymentSession(paymentSession[1],{db,auth,options}));
            }
            if(path==='/api/v1/me/push'){
                if(req.method==='POST')assert(await db.rate('push:'+auth.user.id,30,900000),429,'Thử lại sau ít phút.');
                return await transactionReply(res,db,async()=>({status:200,body:await pushRoute(req.method,body,{db,auth,options})}));
            }
            if(['/api/v1/me/profile','/api/v1/me/phone/start','/api/v1/me/phone/confirm'].includes(path)&&req.method==='POST')return json(res,200,await manageProfile(path,body,{db,auth,options,ip}));
            if(['/api/v1/homepage','/api/v1/catalog-dictionaries'].includes(path)&&req.method==='POST')return await transactionReply(res,db,async()=>({status:200,body:await saveContent(path.endsWith('/homepage')?'homepage':'dictionary',body,{db,auth})}));
            if(auth?.user.adminGroup==='root'&&['POST','PUT','PATCH','DELETE'].includes(req.method)){
                const allowed=['/api/v1/commands','/api/v1/auth/logout','/api/v1/demo/tools','/api/v1/media/sign'].includes(path)||(path==='/api/v1/exports'&&body.kind==='audit')||/^\/api\/v1\/exports\/[\w-]+\/retry$/.test(path);
                assert(allowed,403,'Quản trị gốc không thao tác nghiệp vụ.');
            }
            const catalogProduct=path.match(/^\/api\/v1\/catalog\/products(?:\/([\w-]+))?$/);
            const pickupPoint=path.match(/^\/api\/v1\/orders\/([\w-]+)\/pickup-point$/);
            if(pickupPoint&&req.method==='POST')return await transactionReply(res,db,async()=>({status:200,body:await savePickupPoint(pickupPoint[1],body,{db,auth})}));
            const manualRefund=path.match(/^\/api\/v1\/refunds\/([\w-]+)\/record$/);
            if(manualRefund&&req.method==='POST')return await transactionReply(res,db,async()=>({status:200,body:await recordManualRefund(manualRefund[1],body,{db,auth})}));
            if(path==='/api/v1/coop-reviews')return await transactionReply(res,db,async()=>({status:200,body:await coopReviewsRoute(req.method,body,url.searchParams,{db,auth})}));
            if(path==='/api/v1/account-deletion-requests'){
                if(req.method==='POST'&&body.action==='submit')assert(await db.rate('deletion-request:'+auth.user.id,8,900000),429,'Tối đa 8 lần xác thực yêu cầu xóa trong 15 phút.');
                return await transactionReply(res,db,async()=>({status:200,body:await deletionRequestsRoute(req.method,body,{db,auth})}));
            }
            const payoutRecord=path.match(/^\/api\/v1\/payouts\/([\w-]+)\/record$/);
            if(payoutRecord&&req.method==='POST')return await transactionReply(res,db,async()=>({status:200,body:await recordManualPayout(payoutRecord[1],body,{db,auth})}));
            if(catalogProduct&&req.method==='POST')return await transactionReply(res,db,async()=>({status:200,body:await manageCatalog(catalogProduct[1],body,{db,auth})}));
            const editLock=path.match(/^\/api\/v1\/products\/([\w-]+)\/edit-lock$/);
            if(editLock){assert(auth,401,'Vui lòng đăng nhập.');return await transactionReply(res,db,async()=>({status:200,body:await productLockRoute(editLock[1],req.method,body,{db,auth})}));}
            if(path==='/api/v1/lots'||/^\/api\/v1\/lots\/[\w-]+$/.test(path))return await transactionReply(res,db,async()=>({status:200,body:await lotRoute(path,url,req.method,body,{db,auth})}));
            if(path==='/api/v1/categories'&&req.method==='POST')return await transactionReply(res,db,async()=>{
                assert(auth.user.role==='admin'&&['root','operations'].includes(auth.user.adminGroup),403,'Chỉ Vận hành quản lý danh mục.');
                const {state}=await db.read();assert(typeof body.name==='string'&&body.name.trim().length>=2&&body.name.length<=100&&['dry','processed','fresh'].includes(body.group)&&typeof body.active==='boolean',400,'Tên 2–100 ký tự và nhóm hàng hợp lệ.');
                const categories=state.catalogCategories??[],name=body.name.trim();const existing=body.id?categories.find(c=>c.id===body.id):null;assert(!body.id||existing,404,'Không tìm thấy danh mục.');
                assert(!categories.some(c=>c.id!==body.id&&c.name.toLocaleLowerCase('vi')===name.toLocaleLowerCase('vi')),409,'Tên danh mục đã tồn tại.');
                if(existing&&(!body.active||body.group!==existing.group))assert(!state.products.some(p=>p.catalogCategoryId===existing.id&&p.status==='active'),409,'Danh mục còn sản phẩm đang bán, không thể ẩn hoặc đổi nhóm.');
                const item={id:existing?.id??randomUUID(),name,group:body.group,active:body.active,createdAt:existing?.createdAt??new Date().toISOString()};state.catalogCategories=[item,...categories.filter(c=>c.id!==item.id)];await db.save(state);await db.audit(auth.user.id,'category-save',item.id);return {status:200,body:{item}};
            });
            if(path==='/api/v1/review-policy'||/^\/api\/v1\/reviews\/[\w-]+\/moderate$/.test(path))return await transactionReply(res,db,async()=>({status:200,body:await reviewPolicyRoute(path,req.method,body,{db,auth})}));
            if(path==='/api/v1/reconciliations')return await transactionReply(res,db,async()=>({status:200,body:await reconciliationRoute(req.method,body,{db,auth})}));
            if(path==='/api/v1/reconciliation-adjustments')return await transactionReply(res,db,async()=>({status:200,body:await adjustmentRoute(req.method,body,{db,auth})}));
            if(/^\/api\/v1\/tickets\/[\w-]+\/(supplement|assign|fulfillment)$/.test(path)&&req.method==='POST')return await transactionReply(res,db,async()=>({status:200,body:await ticketAction(path,body,{db,auth})}));
            if(path.startsWith('/api/v1/product-drafts'))return await transactionReply(res,db,async()=>({status:200,body:await productDraftRoute(path,req.method,body,{db,auth})}));
            if(path==='/api/v1/media/upload'&&req.method==='POST'){
                assert(await db.rate(`upload:${auth.user.id}`,30,3600000),429,'Tải quá nhiều ảnh. Thử lại sau.');
                return json(res,201,await uploadMedia(options.supabaseAdmin,auth.user,body.dataUrl));
            }
            if(path==='/api/v1/media/sign'&&req.method==='POST')return json(res,200,await signMedia(options.supabaseAdmin,(await db.read()).state,auth?.user,body.reference));
            if (path === '/api/v1/auth/logout' && req.method === 'POST') {
                if(auth.session)await db.sql.prepare('DELETE FROM sessions WHERE access_hash=?').run(auth.session.access_hash);
                else {const expiry=JSON.parse(Buffer.from(auth.accessToken.split('.')[1],'base64url').toString()).exp*1000;await db.sql.prepare('INSERT INTO revoked_tokens VALUES(?,?) ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at').run(hash(auth.accessToken),Number.isFinite(expiry)?expiry:Date.now()+86400000);}
                await db.audit(auth.user.id, 'logout');
                return json(res, 200, { ok: true });
            }
            if (path === '/api/v1/me' && req.method === 'GET')
                return json(res, 200, { user: auth.user });
            if (path === '/api/v1/demo/tools' && req.method === 'POST') {
                assert(options.demo && auth.user.role === 'admin' && ['root', 'operations'].includes(auth.user.adminGroup), 403, 'Chỉ quản trị có quyền dùng công cụ demo.');
                assert(['shift', 'clock-reset', 'data-reset'].includes(body.action), 400, 'Công cụ không hợp lệ.');
                return await transactionReply(res, db, async () => {
                    let { state } = await db.read();
                    if (body.action === 'data-reset') {
                        state = createSeedState(new Date());
                        await db.sql.prepare('DELETE FROM receipts').run();
                    }
                    else if (body.action === 'clock-reset')
                        state.clockOffsetMs = 0;
                    else {
                        assert(Number.isSafeInteger(body.ms) && body.ms > 0 && body.ms <= 365 * 86400000, 400, 'Khoảng tua không hợp lệ.');
                        state.clockOffsetMs += body.ms;
                    }
                    await db.save(state,{allowFinancialReset:options.demo&&body.action==='data-reset'});
                    await db.audit(auth.user.id, 'demo-' + body.action);
                    return { status: 200, body: { state: project(state, auth.user), version: (await db.read()).version } };
                });
            }
            if (path === '/api/v1/state' && req.method === 'GET') {
                await runJobs(db);
                const { state, version } = await db.read();
                return json(res, 200, { state: project(state, auth?.user), version, user: auth?.user ?? null, demo: options.demo });
            }
            if (path === '/api/v1/products' && req.method === 'GET') {
                const { state } = await db.read(), q = (url.searchParams.get('q') ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase(), category = url.searchParams.get('category');
                const page = Number(url.searchParams.get('page') ?? 1), limit = Number(url.searchParams.get('limit') ?? 20);
                assert(Number.isInteger(page) && page >= 1 && Number.isInteger(limit) && limit >= 1 && limit <= 100, 400, 'Phân trang không hợp lệ.');
                const products = state.products.filter(p => p.status === 'active' && (!category || p.category === category) && p.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(q));
                return json(res, 200, { items: products.slice((page - 1) * limit, page * limit), total: products.length, page, limit });
            }
            const productDetail = path.match(/^\/api\/v1\/products\/([\w-]+)$/);
            if (productDetail && req.method === 'GET') {
                const p = project((await db.read()).state, auth?.user).products.find(p => p.id === productDetail[1]);
                assert(p, 404, 'Không tìm thấy sản phẩm.');
                return json(res, 200, { product: p });
            }
            if (path === '/api/v1/me/addresses' && req.method === 'GET') {
                assert(auth.user.role === 'customer', 403, 'Chỉ khách hàng xem sổ địa chỉ.');
                return json(res, 200, { items: (await db.read()).state.addresses.filter(a => a.customerId === auth.user.customerId) });
            }
            if (path === '/api/v1/cart' && req.method === 'GET') {
                assert(auth.user.role === 'customer', 403, 'Chỉ khách hàng xem giỏ.');
                const state = (await db.read()).state, lines = state.carts[auth.user.customerId] ?? [];
                return json(res, 200, { ready: lines.filter(l => state.products.find(p => p.id === l.productId)?.kind === 'ready'), preorder: lines.filter(l => state.products.find(p => p.id === l.productId)?.kind === 'preorder') });
            }
            if (path === '/api/v1/checkouts/plan' && req.method === 'POST') {
                assert(auth.user.role === 'customer', 403, 'Chỉ khách hàng đặt hàng.');
                assert(Array.isArray(body.lines) && body.groupOptions && typeof body.note === 'string', 400, 'Thông tin đặt hàng không hợp lệ.');
                return json(res, 200, planCheckout((await db.read()).state, { ...body, customerId: auth.user.customerId }, new Date()));
            }
            if (path === '/api/v1/admin/users' && req.method === 'GET') {
                assert(auth.user.role === 'admin' && ['root', 'operations'].includes(auth.user.adminGroup), 403, 'Không có quyền quản lý tài khoản.');
                return json(res, 200, { items: (await db.read()).state.users.filter(u => (!url.searchParams.get('role') || u.role === url.searchParams.get('role')) && (!url.searchParams.get('status') || u.status === url.searchParams.get('status'))) });
            }
            let restCommands;
            if (path === '/api/v1/me/addresses' && req.method === 'POST')
                restCommands = [{ name: 'addAddress', args: [null, body] }];
            const addressRoute = path.match(/^\/api\/v1\/me\/addresses\/([\w-]+)(\/default)?$/);
            if (addressRoute && req.method === 'PUT')
                restCommands = [{ name: addressRoute[2] ? 'setDefaultAddress' : 'updateAddress', args: addressRoute[2] ? [null, addressRoute[1]] : [null, addressRoute[1], body] }];
            if (addressRoute && req.method === 'DELETE')
                restCommands = [{ name: 'deleteAddress', args: [null, addressRoute[1]] }];
            if (path === '/api/v1/cart/items' && req.method === 'POST')
                restCommands = [{ name: 'addToCart', args: [null, body.productId, body.quantity, null] }];
            const cartRoute = path.match(/^\/api\/v1\/cart\/items\/([\w-]+)$/);
            if (cartRoute && req.method === 'PUT')
                restCommands = [{ name: 'setCartLine', args: [null, cartRoute[1], body] }];
            if (cartRoute && req.method === 'DELETE')
                restCommands = [{ name: 'removeCartLine', args: [null, [cartRoute[1]]] }];
            if (path === '/api/v1/checkouts' && req.method === 'POST')
                restCommands = [{ name: 'placeCheckout', args: [body, null, null] }];
            if ((path === '/api/v1/commands' && req.method === 'POST') || restCommands) {
                const requestId = req.headers['idempotency-key'];
                assert(typeof requestId === 'string' && /^[\w-]{8,128}$/.test(requestId), 400, 'Thiếu Idempotency-Key hợp lệ.');
                const commands = restCommands ?? body.commands;
                assert(auth, 401, 'Vui lòng đăng nhập.');
                authorizeBatch(commands, auth.user, options);
                await runJobs(db);
                return await transactionReply(res, db, async () => {
                    const owner = auth?.user.id ?? `application:${ip}`, fingerprint = hash(JSON.stringify(commands));
                    // A role/account may have changed while this request waited for the database lock.
                    const currentUser=(await db.read()).state.users.find(u=>u.id===auth.user.id&&u.status==='active');
                    assert(currentUser,401,'Tài khoản không còn hoạt động.');
                    if(auth.accessToken)assert(!await db.sql.prepare('SELECT token_hash FROM revoked_tokens WHERE token_hash=? AND expires_at>?').get(hash(auth.accessToken),Date.now()),401,'Phiên đã đăng xuất.');
                    auth={...auth,user:currentUser,actor:actorOf(currentUser)};authorizeBatch(commands,auth.user,options);
                    validateMediaReferences(commands,(await db.read()).state,auth.user);
                    const receipt = await db.sql.prepare('SELECT fingerprint,response FROM receipts WHERE user_id=? AND request_id=?').get(owner, requestId);
                    if (receipt) {
                        assert(safeEqual(receipt.fingerprint, fingerprint), 409, 'Khóa thao tác đã dùng với nội dung khác.');
                        const prior = db.decodeJSON(receipt.response);
                        const latest = await db.read(), snapshot = project(latest.state, auth.user);
                        return { status: 200, body: { ...prior, results: projectResults(prior.results, snapshot), state: snapshot, version: latest.version } };
                    }
                    const result = await executeBatch(db, commands, auth?.user, auth?.actor, options);
                    await db.sql.prepare('INSERT INTO receipts VALUES(?,?,?,?,?)').run(owner, requestId, fingerprint, db.encodeJSON(result), Date.now());
                    return { status: 200, body: result };
                });
            }
            if (path === '/api/v1/orders' && req.method === 'GET')
                return json(res, 200, { items: project((await db.read()).state, auth.user).orders });
            if (path === '/api/v1/reports/dashboard' && req.method === 'GET') {
                assert(['admin', 'regulator'].includes(auth.user.role), 403, 'Không có quyền xem báo cáo.');
                return await transactionReply(res,db,async()=>({status:200,body:await createReportSnapshot(db,auth.user,url.searchParams.get('range')??'30d')}));
            }
            if (path === '/api/v1/audit' && req.method === 'GET') {
                assert(auth.user.role === 'admin' && auth.user.adminGroup === 'root', 403, 'Chỉ Quản trị gốc xem nhật ký.');
                const limit = Number(url.searchParams.get('limit') ?? 50), before = Number(url.searchParams.get('before') ?? Number.MAX_SAFE_INTEGER);
                assert(Number.isInteger(limit) && limit > 0 && limit <= 200 && Number.isSafeInteger(before), 400, 'Phân trang không hợp lệ.');
                let sql='SELECT * FROM audit_events WHERE id<?';const args=[before];
                const extra=auditFilterSql(Object.fromEntries(url.searchParams));sql+=extra.sql;args.push(...extra.args);
                for(const [key,op]of [['from','>='],['to','<=']])if(url.searchParams.get(key)){assert(Number.isFinite(Date.parse(url.searchParams.get(key))),400,'Ngày không hợp lệ.');sql+=` AND at${op}?`;args.push(new Date(url.searchParams.get(key)).toISOString());}
                return json(res, 200, { items: await db.sql.prepare(sql+' ORDER BY id DESC LIMIT ?').all(...args,limit) });
            }
            if (path === '/api/v1/exports' && req.method === 'POST') {
                assert(['admin', 'regulator','coop'].includes(auth.user.role), 403, 'Không có quyền xuất báo cáo.');
                if(body.background===true)return json(res,202,await enqueueExport(db,auth,body));
                const now = new Date(), id = randomUUID();
                const r=await filteredReport(db,auth,body,now);const version=r.version;
                const format=body.format??'csv';assert(['csv','xlsx'].includes(format),400,'Chọn CSV hoặc XLSX.');
                assert(Buffer.byteLength(r.content)<=10000000,413,'Báo cáo quá lớn, hãy thu hẹp bộ lọc.');
                const filename=r.filename.replace(/\.csv$/,'.'+format),content=format==='xlsx'?workbook(r.content).toString('base64'):r.content;
                const expiresAt=Date.now()+24*3600000;
                const metadata={rowCount:Math.max(0,parseCsv(r.content).length-1),checksum:hash(format==='xlsx'?Buffer.from(content,'base64'):content),format};
                await db.transaction(async()=>{
                    await db.sql.prepare('INSERT INTO export_jobs VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, auth.user.id, body.kind, 'SUCCEEDED', JSON.stringify(r.filters), r.dataAsOf??now.toISOString(), version, filename, content, expiresAt);
                    await db.sql.prepare('INSERT INTO feature_records VALUES(?,?,?,?,?)').run(id,'export-metadata',auth.user.id,db.encodeJSON(metadata),expiresAt);
                    await db.audit(auth.user.id, 'export-created', id);
                });
                return json(res, 201, { id, status: 'SUCCEEDED', filename, filters:r.filters, dataAsOf: r.dataAsOf??now.toISOString(), version, expiresAt,...metadata });
            }
            if (path === '/api/v1/exports' && req.method === 'GET') {
                assert(['admin','regulator','coop'].includes(auth.user.role),403,'Không có quyền xem lịch sử báo cáo.');
                const jobs=await db.sql.prepare('SELECT id,kind,status,filters,data_as_of,version,filename,expires_at FROM export_jobs WHERE user_id=? ORDER BY data_as_of DESC LIMIT 100').all(auth.user.id);
                const metadata=await db.sql.prepare("SELECT id,data FROM feature_records WHERE kind='export-metadata' AND owner_id=?").all(auth.user.id);
                const byId=new Map(metadata.map(row=>{const data=db.decodeJSON(row.data);return [data.jobId??row.id,data];}));
                return json(res,200,{items:jobs.filter(job=>canExportKind(auth.user,job.kind)).map(job=>({...job,filters:JSON.parse(job.filters),status:job.expires_at<=Date.now()?'EXPIRED':job.status,...byId.get(job.id)}))});
            }
            const retry=path.match(/^\/api\/v1\/exports\/([\w-]+)\/retry$/);
            if(retry&&req.method==='POST')return json(res,202,await retryExport(db,auth,retry[1]));
            const download = path.match(/^\/api\/v1\/exports\/([\w-]+)\/download$/);
            if (download && req.method === 'GET') {
                assert(['admin', 'regulator','coop'].includes(auth.user.role), 403, 'Quyền xuất báo cáo đã bị thu hồi.');
                const job = await db.sql.prepare('SELECT * FROM export_jobs WHERE id=? AND user_id=?').get(download[1], auth.user.id);
                assert(job, 404, 'Không tìm thấy báo cáo.');
                assert(canExportKind(auth.user,job.kind),403,'Quyền xuất loại báo cáo này đã bị thu hồi.');
                if(auth.user.adminGroup==='root')assert(job.kind==='audit',403,'Root chỉ xuất nhật ký.');
                if(auth.user.role==='coop')assert(['summary','orders','settlements'].includes(job.kind)&&JSON.parse(job.filters).coopId===auth.user.coopId,403,'Phạm vi báo cáo không còn thuộc HTX này.');
                if(job.kind==='audit')assert(auth.user.adminGroup==='root',403,'Quyền xuất nhật ký đã bị thu hồi.');
                if(job.kind==='ledger')assert(['root','finance'].includes(auth.user.adminGroup),403,'Quyền Tài chính đã bị thu hồi.');
                if(['tickets','reviews'].includes(job.kind))assert(['root','cskh'].includes(auth.user.adminGroup),403,'Quyền CSKH đã bị thu hồi.');
                assert(job.expires_at > Date.now() && job.status === 'SUCCEEDED', 410, 'Báo cáo đã hết hạn.');
                const record=await db.sql.prepare("SELECT data FROM feature_records WHERE id IN (?,?) AND kind='export-metadata'").get(job.id,job.id+'-meta');
                const metadata=record?db.decodeJSON(record.data):{};
                const checksum=hash(job.filename.endsWith('.xlsx')?Buffer.from(job.content,'base64'):job.content);
                assert(!metadata.checksum||metadata.checksum===checksum,409,'Tệp báo cáo không còn toàn vẹn. Vui lòng xuất lại.');
                await db.audit(auth.user.id, 'export-downloaded', job.id);
                const binary=job.filename.endsWith('.xlsx'),mime=binary?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'text/csv; charset=utf-8';
                if(url.searchParams.get('as')==='json')return json(res,200,{filename:job.filename,content:job.content,encoding:binary?'base64':'utf8',mime,...metadata,checksum});
                res.writeHead(200, { 'Content-Type': mime, 'Content-Disposition': `attachment; filename="${job.filename}"`, 'X-Content-SHA256':checksum });
                return res.end(binary?Buffer.from(job.content,'base64'):job.content);
            }
            return json(res, 404, { error: 'API không tồn tại.' });
        }
        catch (e) {
            if (e instanceof ApiError && [401, 403].includes(e.status))
                await db.audit(null, 'access-denied', req.url?.split('?')[0] ?? '', `request=${correlationId}; status=${e.status}`);
            if (!(e instanceof ApiError))
                console.error(`[${correlationId}]`, e);
            if (!res.headersSent)
                json(res, e instanceof ApiError ? e.status : 500, { error: e instanceof ApiError ? e.message : 'Máy chủ gặp lỗi. Vui lòng thử lại.', correlationId });
            else
                res.end();
        }
    };
    const server = createServer((req, res) => { void db.withRequest(() => auditContext.run({correlationId:randomUUID()},()=>handle(req, res))).catch(e => { console.error('Request failed:', e.code ?? e.name); if (!res.headersSent)
        json(res, 503, { error: 'Chưa kết nối được cơ sở dữ liệu.' });
    else
        res.end(); }); });
    let stopping = false, ticking = false,pushTask=null;
    const pushTick=setInterval(()=>{
        if(stopping||pushTask)return;
        pushTask=processPushQueue(db,options).catch(e=>console.error('Push worker:',e.code??e.name)).finally(()=>{pushTask=null;});
    },5000);
    pushTick.unref();
    const tick = setInterval(() => {
        if (stopping || ticking)
            return;
        ticking = true;
        void db.withRequest(async () => {
            await runJobs(db);
            await processExportQueue(db);
            await db.sql.prepare("UPDATE export_jobs SET status='EXPIRED',content=NULL WHERE expires_at<? AND status!='EXPIRED'").run(Date.now());
            await db.sql.prepare("DELETE FROM feature_records WHERE kind='export-request' AND expires_at<?").run(Date.now());
            await db.sql.prepare("DELETE FROM feature_records WHERE kind='payment-session' AND expires_at<?").run(Date.now());
            await db.sql.prepare('DELETE FROM sessions WHERE refresh_expires_at<?').run(Date.now());
            await db.sql.prepare('DELETE FROM revoked_tokens WHERE expires_at<?').run(Date.now());
        }).catch(e => console.error('Scheduled jobs:', e.code ?? e.name)).finally(() => { ticking = false; });
    }, 5000);
    tick.unref();
    server.on('close', () => { stopping = true; clearInterval(tick);clearInterval(pushTick); if (!config.db)
        void Promise.resolve(pushTask).then(()=>db.withRequest(() => db.close())).catch(e => console.error('Database close:', e.code ?? e.name)); });
    return { server, db };
}
