import { readFileSync } from 'node:fs';
import {requireProductLock} from './product-locks.mjs';
import { assert, ApiError } from './security.mjs';
import { canReadOrder } from '../src/domain/access.ts';
import { deriveNotifications } from '../src/domain/notifications.ts';
import { runScheduledJobs, jobsChanged } from '../src/domain/jobs.ts';
import { project } from './projection.mjs';
export const registry = JSON.parse(readFileSync(new URL('./commands.json', import.meta.url), 'utf8'));
const modules = Object.fromEntries(await Promise.all([...new Set(Object.values(registry).map(c => c.module))].map(async (m) => [m, await import(`../src/domain/${m}.ts`)])));
const customerModules = new Set(['cart', 'address', 'marketplace', 'seasonWatch', 'invoice', 'checkout', 'orderEdits', 'orderTabs']);
const publicNames = new Set(['submitCoopApplication', 'resubmitCoopApplication']);
const groups = { ops: 'operations', quality: 'quality', cskh: 'cskh', finance: 'finance', root: 'root' };
function authorize(name, user, options) {
    const module = registry[name]?.module;
    assert(module, 400, 'Thao tác không được hỗ trợ.');
    if (publicNames.has(name)) {
        throw new ApiError(403, 'Nộp hồ sơ cần xác thực OTP tại API hồ sơ HTX.');
    }
    assert(user, 401, 'Vui lòng đăng nhập.');
    assert(name!=='carrierSimulate',403,'Theo quyết định vận hành, chỉ shipper được phân công tự cập nhật giao hàng. Admin không cập nhật thay.');
    if(user.role==='admin'&&user.adminGroup==='root')assert(['opsCreateAccount','rootSetAdminGroup','rootSetDemoCode','rootClearDemoCode','markNotificationsRead'].includes(name),403,'Quản trị gốc chỉ quản lý tài khoản Admin, phân quyền và nhật ký.');
    assert(!['coopCreateProduct','coopRequestContentChange','coopSetProductHidden','coopRequestExpress','coopRequestCertification','coopRequestPriceChange','coopRequestPreorder','coopAddVariant'].includes(name),403,'Quản lý sản phẩm đã chuyển sang Admin – Chất lượng theo SRS 29/10.');
    let allowed;
    if (customerModules.has(module) || /^customer|^submitComplaint$|^submitReview$/.test(name))
        allowed = user.role === 'customer';
    else if (/^coop|^shipper/.test(name))
        allowed = user.role === (name.startsWith('coop') ? 'coop' : 'shipper');
    else if (name === 'logCoopCall')
        allowed = user.role === 'coop';
    else if (module === 'notifications' || ['sendOrderMessage', 'markOrderChatRead', 'sendDirectMessage', 'markThreadRead'].includes(name))
        allowed = ['customer', 'coop'].includes(user.role) || (module === 'notifications' && user.role !== 'regulator');
    else if (name === 'ensureRemainingTransaction' || name === 'applyGatewayResult')
        allowed = user.role === 'customer';
    else if (module === 'account' && ['updateCustomerProfile', 'linkRefundAccount', 'unlinkRefundAccount'].includes(name))
        allowed = user.role === 'customer';
    else {
        let group;
        if (/^ops/.test(name) || module === 'adminConfig' || name === 'carrierSimulate')
            group = 'operations';
        if (/^quality/.test(name) || name === 'decideProductChange')
            group = 'quality';
        if (/^cskh/.test(name))
            group = 'cskh';
        if (module === 'finance' || module === 'settlement' || name === 'financeConfirmRemittance')
            group = 'finance';
        if (/^root/.test(name))
            group = 'root';
        if (name === 'demoGatewaySuccess')
            group = 'operations';
        allowed = user.role === 'admin' && group && (user.adminGroup === group || (user.adminGroup === 'root'&&name==='opsCreateAccount'));
    }
    assert(allowed, 403, 'Bạn không có quyền thực hiện thao tác này.');
    if (['applyGatewayResult', 'carrierSimulate', 'confirmRefundBySimBank', 'recordPayout', 'linkRefundAccount', 'demoGatewaySuccess', 'rootSetDemoCode', 'rootClearDemoCode'].includes(name))
        assert(options.demo, 403, 'Chức năng mô phỏng chỉ hoạt động trong DEMO_MODE. Dịch vụ thật cần adapter nhà cung cấp.');
}
export function authorizeBatch(commands, user, options) {
    assert(Array.isArray(commands) && commands.length > 0 && commands.length <= 10, 400, 'Danh sách thao tác không hợp lệ.');
    for (const command of commands) {
        assert(command && typeof command.name === 'string', 400, 'Thao tác không hợp lệ.');
        authorize(command.name, user, options);
    }
}
export function projectResults(results, snapshot) {
    return results.map(r => {
        if (r.users)
            return snapshot;
        if (r.state)
            return { ...r, state: snapshot };
        if (r.value?.state)
            return { ...r, value: { ...r.value, state: snapshot } };
        if (r.value?.users)
            return { ...r, value: snapshot };
        return r;
    });
}
function validateParam(value, param) {
    const t = param.type;
    if (value === null || value === undefined) {
        assert(param.optional || t.includes('undefined') || t.includes('null'), 400, `Thiếu ${param.name}.`);
        return undefined;
    }
    if (t === 'string')
        assert(typeof value === 'string' && value.length <= 50000, 400, `${param.name} phải là chuỗi.`);
    else if (t === 'number')
        assert(typeof value === 'number' && Number.isFinite(value), 400, `${param.name} phải là số hữu hạn.`);
    else if (t === 'boolean')
        assert(typeof value === 'boolean', 400, `${param.name} phải là boolean.`);
    else if (t.endsWith('[]'))
        assert(Array.isArray(value) && value.length <= 1000, 400, `${param.name} phải là danh sách.`);
    else if (/^'[^']+'(\s*\|\s*'[^']+')*$/.test(t))
        assert(t.match(/'([^']+)'/g).map(s => s.slice(1, -1)).includes(value), 400, `${param.name} không hợp lệ.`);
    return value;
}
function validateObject(name, args, state, user) {
    const input = args.slice(1).find(v => v && typeof v === 'object' && !Array.isArray(v) && !('kind' in v) && !(v instanceof Date));
    if (['addToCart', 'setCartLine'].includes(name)) {
        const qty = name === 'addToCart' ? args[3] : args[3]?.quantity;
        if (qty !== undefined)
            assert(Number.isInteger(qty) && qty >= 1 && qty <= 100000, 400, 'Số lượng phải là số nguyên dương.');
        if (name === 'setCartLine') {
            const patch = args[3];
            assert(patch && typeof patch === 'object' && !Array.isArray(patch), 400, 'Dữ liệu giỏ không hợp lệ.');
            args[3] = { ...(patch.quantity === undefined ? {} : { quantity: patch.quantity }), ...(patch.deliveryDate === undefined ? {} : { deliveryDate: patch.deliveryDate }) };
            if (patch.deliveryDate !== undefined)
                assert(typeof patch.deliveryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patch.deliveryDate), 400, 'Ngày giao không hợp lệ.');
        }
    }
    if (name === 'placeCheckout') {
        const i = args[1];
        assert(i && Array.isArray(i.lines) && i.lines.length > 0 && i.lines.length <= 100, 400, 'Danh sách đặt hàng không hợp lệ.');
        assert(new Set(i.lines.map(l => l.productId)).size === i.lines.length, 400, 'Không được lặp sản phẩm trong một lần đặt.');
        for (const l of i.lines)
            assert(l && typeof l.productId === 'string' && Number.isInteger(l.quantity) && l.quantity > 0 && Number.isInteger(l.seenPrice) && l.seenPrice >= 0, 400, 'Dòng đặt hàng không hợp lệ.');
        assert(typeof i.idempotencyKey === 'string' && i.idempotencyKey.length >= 8 && i.idempotencyKey.length <= 128, 400, 'Thiếu khóa chống tạo đơn trùng.');
        assert(typeof i.note === 'string' && i.note.length <= 2000 && i.groupOptions && typeof i.groupOptions === 'object', 400, 'Thông tin đặt hàng không hợp lệ.');
        for (const option of Object.values(i.groupOptions))
            assert(option && ['standard', 'express'].includes(option.shipping) && ['online', 'cod'].includes(option.paymentMethod), 400, 'Phương thức giao/nhận tiền không hợp lệ.');
        assert(i.acceptedPreorderPolicy === true || i.acceptedPreorderPolicy === false, 400, 'Thiếu xác nhận chính sách.');
        const reused = state.checkouts.find(c => c.idempotencyKey === i.idempotencyKey);
        assert(!reused || reused.customerId === user.customerId, 409, 'Khóa đặt hàng đã được sử dụng.');
        i.customerId = user.customerId;
    }
    if (name === 'opsCreateAccount'){
        assert(input && ['coop', 'admin', 'regulator', 'shipper'].includes(input.role) && (!input.adminGroup || ['operations', 'quality', 'cskh', 'finance'].includes(input.adminGroup)), 400, 'Vai trò hoặc nhóm quyền không hợp lệ.');
        assert(input.role!=='admin'||user.adminGroup==='root',403,'Chỉ Root được tạo tài khoản Admin.');
        assert(user.adminGroup!=='root'||input.role==='admin',403,'Root chỉ tạo tài khoản Admin.');
    }
    if (name === 'rootSetAdminGroup')
        assert(['operations', 'quality', 'cskh', 'finance'].includes(args[3]), 400, 'Nhóm quyền không hợp lệ.');
    if (['addAddress', 'updateAddress'].includes(name))
        assert(input && ['apartment', 'ground'].includes(input.houseType), 400, 'Loại địa chỉ không hợp lệ.');
    if (name === 'applyGatewayResult')
        assert(['success', 'failed', 'cancelled'].includes(args[2]), 400, 'Kết quả thanh toán không hợp lệ.');
    if (['coopCreateProduct', 'coopRequestContentChange'].includes(name)) {
        const content = name === 'coopCreateProduct' ? args[2] : args[3];
        assert(content && typeof content.name === 'string' && content.name.trim().length >= 5 && content.name.trim().length <= 100, 400, 'Tên sản phẩm phải từ 5 đến 100 ký tự (BR-SP-03).');
        assert(typeof content.description === 'string' && content.description.trim().length >= 20 && content.description.length <= 2000, 400, 'Mô tả phải từ 20 đến 2.000 ký tự (BR-SP-03).');
        assert(['dry', 'processed', 'fresh'].includes(content.category), 400, 'Danh mục sản phẩm không hợp lệ.');
        const same = state.products.find(p => p.coopId === user.coopId && p.id !== (name === 'coopRequestContentChange' ? args[1] : undefined) && p.name.trim().toLocaleLowerCase('vi') === content.name.trim().toLocaleLowerCase('vi') && !p.variantOf);
        assert(!same, 409, 'Tên sản phẩm đã tồn tại trong HTX (BR-SP-08).');
        if (name === 'coopCreateProduct')
            assert(['ready', 'preorder'].includes(content.kind), 400, 'Hình thức bán không hợp lệ.');
    }
    if (['coopCreateProduct', 'coopRequestPriceChange', 'coopAddVariant'].includes(name)) {
        const price = name === 'coopCreateProduct' ? args[2]?.price : name === 'coopAddVariant' ? args[3]?.price : args[3];
        assert(Number.isInteger(price) && price >= 1000 && price <= 10000000, 400, 'Giá phải từ 1.000 đến 10.000.000 đồng (BR-SP-04).');
    }
    if (['coopCreateProduct', 'coopAddVariant'].includes(name))
        assert(state.coops.some(c => c.id === user.coopId && c.status === 'active' && c.profileStatus === 'approved'), 403, 'HTX phải được duyệt và kích hoạt quyền bán (BR-SP-01).');
    if (name === 'coopRequestCertification') {
        const cert = args[3];
        assert(cert && typeof cert.validUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cert.validUntil) && cert.validUntil >= new Date().toISOString().slice(0, 10), 400, 'Chứng nhận đã hết hạn hoặc ngày không hợp lệ.');
    }
    if (name === 'qualitySetCheck')
        assert(['documents', 'region', 'contact', 'products'].includes(args[3]), 400, 'Mục thẩm định không hợp lệ.');
}
export async function runJobs(db) {
    return await db.transaction(async () => {
        const { state } = await db.read(), at = new Date(Date.now() + state.clockOffsetMs);
        const result = runScheduledJobs(state, at);
        if (jobsChanged(result.report)) {
            await db.save(deriveNotifications(state, result.state, at));
            await db.audit(null, 'scheduled-jobs', '', JSON.stringify(result.report));
        }
    });
}
export async function executeBatch(db, commands, user, actor, options) {
    assert(Array.isArray(commands) && commands.length > 0 && commands.length <= 10, 400, 'Danh sách thao tác không hợp lệ.');
    let { state } = await db.read();
    const initial = state, results = [];
    for (const command of commands) {
        const { name } = command;
        authorize(name, user, options);
        await requireProductLock(db,state,user,command);
        const descriptor = registry[name];
        assert(Array.isArray(command.args) && command.args.length <= descriptor.params.length - 1, 400, 'Tham số không hợp lệ.');
        // State, actor, customer identity, and time always come from the server.
        const args = descriptor.params.map((p, i) => {
            if (i === 0)
                return state;
            if (p.type === 'Actor') {
                // Root can perform each administrative function, without changing its stored role.
                let effective = actor;
                if (user?.adminGroup === 'root' && !name.startsWith('root')&&name!=='opsCreateAccount') {
                    let group = Object.entries(groups).find(([prefix]) => name.startsWith(prefix))?.[1];
                    if (name === 'decideProductChange')
                        group = 'quality';
                    if (['closePeriod', 'recordPayout', 'startRefundProcessing', 'confirmRefundBySimBank'].includes(name))
                        group = 'finance';
                    if (['adminCreateVoucher', 'adminSetVoucherActive', 'carrierSimulate', 'demoGatewaySuccess'].includes(name))
                        group = 'operations';
                    if (group)
                        effective = { ...actor, adminGroup: group };
                }
                return effective;
            }
            if (p.type === 'Date') {
                if (p.name === 'cutoff') {
                    const cutoff = new Date(command.args[i - 1]);
                    assert(Number.isFinite(cutoff.getTime()) && cutoff.getTime() <= Date.now() + state.clockOffsetMs, 400, 'Ngày chốt kỳ không hợp lệ.');
                    return cutoff;
                }
                return new Date(Date.now() + state.clockOffsetMs);
            }
            if (p.name === 'customerId') {
                assert(user?.role === 'customer', 403, 'Chỉ khách hàng thực hiện được.');
                return user.customerId;
            }
            if (name === 'markNotificationsRead' && p.name === 'userId')
                return user.id;
            return validateParam(command.args[i - 1], p);
        });
        validateObject(name, args, state, user);
        if (['ensureRemainingTransaction', 'applyGatewayResult'].includes(name)) {
            const ids = name === 'applyGatewayResult' ? state.transactions.find(t => t.id === args[1])?.orderIds : [args[1]];
            assert(ids?.length && ids.every(id => state.orders.some(o => o.id === id && canReadOrder(actor, o))), 403, 'Bạn không có quyền với giao dịch/đơn hàng này.');
        }
        let result;
        try {
            result = modules[descriptor.module][name](...args);
        }
        catch (e) {
            if (e instanceof TypeError)
                throw new ApiError(400, 'Dữ liệu thao tác thiếu trường hoặc sai định dạng.');
            throw e;
        }
        if (result?.ok === false)
            throw new ApiError(422, result.error);
        const next = result?.state ?? result?.value?.state ?? (result?.value?.users ? result.value : result?.users ? result : null);
        assert(next && Array.isArray(next.users), 500, 'Thao tác không trả về trạng thái hợp lệ.');
        state = deriveNotifications(state, next, new Date(Date.now() + state.clockOffsetMs));
        results.push(result);
        await db.audit(user?.id, name, '', 'Thành công');
    }
    await db.save(state);
    // Locking an account revokes refresh and access sessions permanently, even after unlocking.
    for (const u of state.users)
        if (u.status === 'locked')
            await db.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
    const snapshot = project(state, user ? state.users.find(u => u.id === user.id) : null);
    const safeResults = projectResults(results, snapshot);
    return { results: safeResults, state: snapshot, version: (await db.read()).version };
}
