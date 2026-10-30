import { test, expect } from '@playwright/test';

test('operations closes requested account access after checks and the owner session is revoked',async({page,browser})=>{
  await page.goto('/dang-ky');const form=page.getByRole('form',{name:'Đăng ký bằng số điện thoại'});
  await form.getByLabel('Họ tên',{exact:true}).fill('Khách đóng quyền truy cập');await form.getByLabel('Số điện thoại',{exact:true}).fill('0966660123');await form.getByLabel('Mật khẩu',{exact:true}).fill('Closeaccess@123');await form.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('Closeaccess@123');await verifySignupPhone(form);await form.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await page.getByRole('banner').getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByText('Bảo mật tài khoản',{exact:true}).click();await page.getByText('Yêu cầu xóa tài khoản',{exact:true}).click();await page.getByLabel('Mật khẩu xác nhận yêu cầu xóa',{exact:true}).fill('Closeaccess@123');await page.getByLabel('Lý do yêu cầu xóa tài khoản',{exact:true}).fill('Tôi muốn đóng tài khoản này vì không còn nhu cầu.');await page.getByRole('checkbox',{name:'Tôi xác nhận gửi yêu cầu cho tài khoản của mình'}).check();await page.getByRole('button',{name:'Gửi yêu cầu xóa tài khoản',exact:true}).click();await expect(page.getByText(/Chờ tiếp nhận ·/)).toBeVisible();
  const opsContext=await browser.newContext();try{
    const ops=await opsContext.newPage();await ops.goto('/dang-nhap');await ops.getByPlaceholder('0900 000 000').fill('0900000201');await ops.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');await ops.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();await ops.getByText('Bảo mật tài khoản',{exact:true}).click();await ops.getByText('Xử lý yêu cầu xóa tài khoản',{exact:true}).click();await ops.getByText('Đóng quyền truy cập theo yêu cầu',{exact:true}).click();
    await ops.getByLabel('Căn cứ đóng quyền truy cập',{exact:true}).fill('Đã xác minh chủ tài khoản và không còn nghiệp vụ đang xử lý.');await ops.getByRole('checkbox',{name:'Đã xác minh yêu cầu và hiểu đây chưa phải xóa dữ liệu lịch sử'}).check();await ops.getByRole('button',{name:'Đóng quyền truy cập tài khoản',exact:true}).click();await expect(ops.getByText(/Đã đóng quyền truy cập, chưa xóa dữ liệu lịch sử ·/)).toBeVisible();
    await page.reload();await expect(page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible();
  }finally{await opsContext.close();}
});

test('operations saves a structured pickup point for an order confirmed by its own seller',async({browser})=>{
  const sellerContext=await browser.newContext(),opsContext=await browser.newContext();
  try{
    const seller=await sellerContext.newPage();await seller.goto('/dang-nhap');await seller.getByPlaceholder('0900 000 000').fill('0900000101');await seller.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');await seller.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(seller.getByRole('banner').getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();
    const confirmed=await seller.evaluate(async()=>{const session=JSON.parse(sessionStorage.getItem('dac-san-so-lao-cai:api-session')!),headers={'Content-Type':'application/json',Authorization:'Bearer '+session.accessToken};const state=(await(await fetch('/api/v1/state',{headers})).json()).state,order=state.orders.find((o:any)=>o.status==='awaiting_confirmation');const response=await fetch('/api/v1/commands',{method:'POST',headers:{...headers,'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({commands:[{name:'coopConfirm',args:[order.id,null,new Date().toISOString()]}]})});return {id:order.id,status:response.status};});expect(confirmed.status).toBe(200);
    const ops=await opsContext.newPage();await ops.goto('/dang-nhap');await ops.getByPlaceholder('0900 000 000').fill('0900000201');await ops.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');await ops.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();await ops.getByRole('navigation',{name:'Chức năng quản trị'}).getByRole('button',{name:'Giao hàng',exact:true}).click();
    const row=ops.getByRole('row').filter({hasText:confirmed.id});await row.getByText('Nhập điểm nhận hàng',{exact:true}).click();
    await row.getByLabel('Tên điểm nhận',{exact:true}).fill('Điểm nhận kiểm thử');await row.getByLabel('Địa chỉ điểm nhận',{exact:true}).fill('Địa chỉ bàn giao thử nghiệm Hà Nội');await row.getByLabel('Người bàn giao',{exact:true}).fill('Nhân viên kiểm thử');await row.getByLabel('Số điện thoại bàn giao',{exact:true}).fill('0901234567');await row.getByLabel('Lý do cập nhật điểm nhận',{exact:true}).fill('Cập nhật điểm nhận theo lịch bàn giao đã thống nhất.');await row.getByRole('button',{name:'Lưu điểm nhận hàng',exact:true}).click();
    await expect(row.getByText('Điểm nhận kiểm thử',{exact:true})).toBeVisible();await expect(row.getByRole('link',{name:'Xem điểm nhận trên bản đồ',exact:true})).toBeVisible();
  }finally{await sellerContext.close();await opsContext.close();}
});

test('finance can propose and withdraw a discrepancy adjustment but cannot self approve',async({page})=>{
  await page.goto('/dang-nhap');await page.getByPlaceholder('0900 000 000').fill('0900000204');await page.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();
  const order=await page.evaluate(async()=>{const s=JSON.parse(sessionStorage.getItem('dac-san-so-lao-cai:api-session')!);return (await(await fetch('/api/v1/state',{headers:{Authorization:`Bearer ${s.accessToken}`}})).json()).state.orders[0];});
  await page.getByRole('navigation',{name:'Chức năng quản trị'}).getByRole('button',{name:'Đối soát HTX',exact:true}).click();
  await page.getByText('Nhập đối soát từ đối tác',{exact:true}).click();await page.getByLabel('Đối tác',{exact:true}).fill('BANK-E2E');
  await page.getByLabel('Nội dung CSV').fill(`orderId,amount,reference\n${order.id},${order.codCollected+1400},BANK-E2E-REFERENCE`);await page.getByRole('button',{name:'Nhập và đối chiếu',exact:true}).click();
  await page.getByText(/BANK-E2E ·/).click();await page.getByText('Đề xuất bút toán điều chỉnh',{exact:true}).click();await page.getByLabel('Mã chứng từ điều chỉnh',{exact:true}).fill('E2E-EXTERNAL-PROOF');await page.getByLabel('Giải trình điều chỉnh',{exact:true}).fill('Đã kiểm tra chứng từ ngoài hệ thống và chênh lệch.');await page.getByRole('checkbox',{name:'Đã kiểm tra chứng từ và chênh lệch',exact:true}).check();await page.getByRole('button',{name:'Gửi đề xuất điều chỉnh',exact:true}).click();
  await expect(page.getByRole('button',{name:'Rút đề xuất',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Duyệt và thêm dòng sổ',exact:true})).toHaveCount(0);
  await page.getByLabel('Căn cứ xử lý bút toán',{exact:true}).fill('Rút đề xuất để kiểm tra bổ sung chứng từ gốc.');await page.getByRole('button',{name:'Rút đề xuất',exact:true}).click();await expect(page.getByText(/Đơn .*1.400đ · Đã rút/)).toBeVisible();
});

test('customer posts a separate verified HTX review from the shop page',async({page})=>{
  await page.goto('/dang-nhap');await page.getByPlaceholder('0900 000 000').fill('0900000002');await page.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.getByRole('button',{name:/^Xem Gạo/}).first().click();await page.getByRole('button',{name:/^Xem shop /}).click();
  const order=page.getByRole('combobox',{name:'Đơn đã mua tại HTX'});await expect(order).toBeVisible();await order.selectOption({index:1});
  await page.getByRole('textbox',{name:'Nhận xét về HTX'}).fill('Hợp tác xã đóng gói cẩn thận, giao hàng đúng hẹn.');
  await page.getByRole('button',{name:'Gửi đánh giá HTX',exact:true}).click();await expect(page.getByText('Hợp tác xã đóng gói cẩn thận, giao hàng đúng hẹn.',{exact:true})).toBeVisible();
  await expect(page.getByText(/5\/5 · 1 đánh giá HTX/)).toBeVisible();await expect(page.getByRole('button',{name:'Gửi đánh giá HTX',exact:true})).toHaveCount(0);
});

test('background export finishes through the server queue and appears in browser history',async({page})=>{
  await page.goto('/dang-nhap');await page.getByPlaceholder('0900 000 000').fill('0900000204');await page.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.getByRole('checkbox',{name:'Xuất nền, theo dõi trong lịch sử'}).check();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/exports')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Xuất danh sách đơn ẩn danh (CSV)',exact:true}).click();
  const queued=await response;expect(queued.status()).toBe(202);const {id}=await queued.json();
  await page.getByText('Lịch sử xuất báo cáo của tôi',{exact:true}).click();
  const history=page.locator('details').filter({has:page.getByText('Lịch sử xuất báo cáo của tôi',{exact:true})});
  await expect(history.getByRole('button',{name:'Tải lại báo cáo',exact:true}).first()).toBeEnabled({timeout:15000});
  const download=page.waitForEvent('download');await history.getByRole('button',{name:'Tải lại báo cáo',exact:true}).first().click();expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  expect(id).toBeTruthy();
});

test('customer submits and withdraws an account deletion request without losing login',async({page})=>{
  await page.goto('/dang-ky');const form=page.getByRole('form',{name:'Đăng ký bằng số điện thoại'});
  await form.getByLabel('Họ tên',{exact:true}).fill('Khách yêu cầu xóa');await form.getByLabel('Số điện thoại',{exact:true}).fill('0976543210');await form.getByLabel('Mật khẩu',{exact:true}).fill('Delete@123');await form.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('Delete@123');await verifySignupPhone(form);await form.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await page.getByRole('banner').getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByText('Bảo mật tài khoản',{exact:true}).click();await page.getByText('Yêu cầu xóa tài khoản',{exact:true}).click();
  await page.getByLabel('Mật khẩu xác nhận yêu cầu xóa',{exact:true}).fill('Delete@123');await page.getByLabel('Lý do yêu cầu xóa tài khoản',{exact:true}).fill('Tôi không còn nhu cầu sử dụng tài khoản.');await page.getByRole('checkbox',{name:'Tôi xác nhận gửi yêu cầu cho tài khoản của mình'}).check();await page.getByRole('button',{name:'Gửi yêu cầu xóa tài khoản',exact:true}).click();
  await page.getByText('Kiểm tra trước khi xử lý xóa tài khoản',{exact:true}).click();
  await expect(page.getByText('Đơn đang xử lý',{exact:true})).toBeVisible();
  await expect(page.getByText(/Số liệu này chỉ hỗ trợ rà soát/)).toBeVisible();
  await expect(page.getByText(/Chờ tiếp nhận ·/)).toBeVisible();await page.getByLabel('Lý do rút yêu cầu',{exact:true}).fill('Tôi muốn tiếp tục sử dụng dịch vụ.');await page.getByRole('button',{name:'Rút yêu cầu',exact:true}).click();await expect(page.getByText(/Đã rút yêu cầu ·/)).toBeVisible();await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();
});

test('unified SRS limits seller product controls and Root navigation',async({browser})=>{
  for(const phone of ['0900000101','0900000209']){
    const context=await browser.newContext(),page=await context.newPage();
    try{
      await page.goto('/dang-nhap');await page.getByPlaceholder('0900 000 000').fill(phone);await page.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
      if(phone==='0900000101'){
        await page.getByRole('tab',{name:'Sản phẩm',exact:true}).click();
        await expect(page.getByRole('button',{name:'Thêm sản phẩm',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Sửa nội dung',exact:true})).toHaveCount(0);
        await expect(page.getByRole('button',{name:'Lưu tồn kho',exact:true}).first()).toBeVisible();
      }else{
        const nav=page.getByRole('navigation',{name:'Chức năng quản trị'});await expect(nav.getByRole('button',{name:'Phân quyền',exact:true})).toBeVisible();
        await expect(nav.getByRole('button',{name:'Nhật ký',exact:true})).toBeVisible();await expect(nav.getByRole('button')).toHaveCount(3);
        const roles=page.getByRole('combobox',{name:'Vai trò',exact:true});await expect(roles.locator('option')).toHaveCount(1);await expect(roles).toHaveValue('admin');
      }
    }finally{await context.close();}
  }
});

test('two Quality admin tabs cannot edit the same product and closing a form releases its lease',async({context})=>{
  const first=await context.newPage(),second=await context.newPage();
  for(const page of [first,second]){
    await page.goto('/dang-nhap');await page.getByPlaceholder('0900 000 000').fill('0900000202');
    await page.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');
    await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await page.getByRole('navigation',{name:'Chức năng quản trị'}).getByRole('button',{name:'Duyệt sản phẩm & giá',exact:true}).click();
    await page.getByRole('combobox',{name:'Sản phẩm cần quản lý'}).selectOption({index:1});
    await page.getByRole('button',{name:'Sửa nội dung',exact:true}).first().click();
  }
  await expect(first.getByRole('dialog').getByRole('button',{name:'Lưu và đăng bán',exact:true})).toBeEnabled();
  await expect(second.getByRole('alert')).toContainText('phiên khác');
  await expect(second.getByRole('dialog').getByRole('button',{name:'Lưu và đăng bán',exact:true})).toBeDisabled();
  const released=first.waitForResponse(response=>response.url().endsWith('/edit-lock')&&response.request().method()==='DELETE'&&response.status()===200);
  await first.keyboard.press('Escape');await released;
  await second.keyboard.press('Escape');await second.getByRole('button',{name:'Sửa nội dung',exact:true}).first().click();
  await expect(second.getByRole('dialog').getByRole('button',{name:'Lưu và đăng bán',exact:true})).toBeEnabled();
  await second.getByRole('dialog').getByRole('textbox',{name:/^Mô tả/}).fill('Mô tả sản phẩm do HTX cập nhật trong kiểm thử phiên chỉnh sửa.');
  await second.getByRole('checkbox',{name:'Tháng 1',exact:true}).check();
  await second.getByRole('dialog').getByRole('button',{name:'Lưu và đăng bán',exact:true}).click();
  await expect(second.getByRole('dialog')).toHaveCount(0);
});

test('report history shows saved metadata and downloads the same file again',async({page})=>{
  await page.goto('/dang-nhap');
  await page.getByPlaceholder('0900 000 000').fill('0900000204');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');
  await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  const firstDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Xuất danh sách sản phẩm',exact:true}).click();
  const file=await firstDownload;
  expect(file.suggestedFilename()).toMatch(/^products-.*\.csv$/);
  await page.getByText('Lịch sử xuất báo cáo của tôi',{exact:true}).click();
  const row=page.getByRole('listitem').filter({hasText:file.suggestedFilename()}).first();
  await expect(row).toContainText('Sẵn sàng tải');
  await expect(row).toContainText('dòng nội dung');
  await row.getByText('Mã kiểm tra tệp SHA-256',{exact:true}).click();
  await expect(row.locator('code')).toHaveText(/^[a-f0-9]{64}$/);
  const repeat=page.waitForEvent('download');
  await row.getByRole('button',{name:'Tải lại báo cáo',exact:true}).click();
  expect((await repeat).suggestedFilename()).toBe(file.suggestedFilename());
});
test('catalog filters, pagination and navigation work on desktop and mobile',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.goto('/san-pham');
    await expect(page.getByRole('heading',{name:'Tinh Hoa Đặc Sản Vùng Miền'})).toBeVisible();
    await expect(page.locator('.catalog-grid .shop-product-card')).toHaveCount(6);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});
    await page.screenshot({path:testInfo.outputPath(`catalog-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.locator('.catalog-grid .shop-product-card')).toHaveCount(3);
    if(width===390)await page.getByRole('button',{name:'Bộ lọc tìm kiếm',exact:true}).click();
    const filters=page.getByRole('complementary',{name:'Bộ lọc sản phẩm'});
    await filters.getByRole('checkbox',{name:/^Bắc Hà/}).check();
    await page.getByRole('button',{name:'Áp dụng bộ lọc',exact:true}).click();
    await expect(page.locator('.catalog-chips')).toContainText('Bắc Hà');
    expect(await page.locator('.catalog-grid .shop-product-card').count()).toBeGreaterThan(0);
    expect(await page.locator('.catalog-grid .shop-product-region').allTextContents()).toEqual(expect.arrayContaining(['Bắc Hà']));
    await page.locator('.catalog-chips').getByRole('button',{name:'Bắc Hà'}).click();
    await expect(page.locator('.catalog-grid .shop-product-card')).toHaveCount(6);
    await page.getByRole('combobox',{name:'Sắp xếp sản phẩm'}).selectOption('price_asc');
    await page.getByRole('button',{name:/Xem /}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Đặc Sản Số — Trang chủ'}).click();await expect(page).toHaveURL(/\/$/);
    await page.goBack();await expect(page.getByRole('heading',{name:'Tinh Hoa Đặc Sản Vùng Miền'})).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('separate signup and login pages create an account with verified phone OTP and validate passwords',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/dang-nhap');await expect(page.getByRole('heading',{name:'Đăng nhập',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Đăng ký ngay',exact:true}).click();await expect(page).toHaveURL(/\/dang-ky$/);
  await page.reload();await expect(page.getByRole('heading',{name:'Đăng ký',exact:true})).toBeVisible();
  const form=page.getByRole('form',{name:'Đăng ký bằng số điện thoại'});
  await form.getByLabel('Họ tên',{exact:true}).fill('Khách đăng ký mật khẩu');
  await form.getByLabel('Số điện thoại',{exact:true}).fill('0987654321');
  await form.getByLabel('Mật khẩu',{exact:true}).fill('Dangky@123');
  await form.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('Khongkhop@123');
  await form.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await expect(page.getByRole('alert')).toContainText('chưa khớp');
  await form.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('Dangky@123');
  await verifySignupPhone(form);
  await page.screenshot({path:testInfo.outputPath('register-desktop.png'),fullPage:true});
  await form.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất'})).toBeVisible();
  await page.getByRole('banner').getByRole('button',{name:'Đăng xuất'}).click();
  await page.goto('/dang-nhap');const login=page.getByRole('form',{name:'Đăng nhập bằng số điện thoại'});
  await login.getByLabel('Số điện thoại',{exact:true}).fill('0987654321');await login.getByLabel('Mật khẩu',{exact:true}).fill('Khongsai@123');
  await login.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('alert')).toContainText('không đúng');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('login-mobile.png'),fullPage:true});
  await login.getByLabel('Mật khẩu',{exact:true}).fill('Dangky@123');await login.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Tài khoản',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
test('login, save profile, reload, logout and isolate roles through real backend',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.getByPlaceholder('0900 000 000').fill('0900000001');
  await page.getByLabel('Mật khẩu', {exact:true}).fill('Dacsan@123');
  await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất'})).toBeVisible();
  await page.getByRole('banner').getByRole('button',{name:'Tài khoản',exact:true}).click();
  await page.getByRole('button',{name:'Sửa',exact:true}).click();
  await page.getByRole('textbox',{name:'Họ tên',exact:true}).fill('Khách kiểm thử backend');
  const saved=page.waitForResponse(r=>r.url().includes('/api/v1/commands')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Lưu',exact:true}).click();expect((await saved).status()).toBe(200);
  await expect(page.getByText('Khách kiểm thử backend',{exact:true}).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất'})).toBeVisible();
  await page.getByRole('banner').getByRole('button',{name:'Đăng xuất'}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible();
  const guest=await page.request.get('/api/v1/state');expect((await guest.json()).state.users).toEqual([]);
  expect(errors).toEqual([]);
});

test('customer cart mutation uses server commands and server generated IDs',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.getByPlaceholder('0900 000 000').fill('0900000002');await page.getByLabel('Mật khẩu', {exact:true}).fill('Dacsan@123');await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất'})).toBeVisible();
  const add=page.getByRole('button',{name:/Thêm Chè Shan tuyết vào giỏ/}).first();
  await expect(add).toBeVisible();
  const saved=page.waitForResponse(r=>r.url().includes('/api/v1/commands')&&r.request().method()==='POST');await add.click();expect((await saved).status()).toBe(200);
  const current=await page.evaluate(async()=>{const s=JSON.parse(sessionStorage.getItem('dac-san-so-lao-cai:api-session')!);return await(await fetch('/api/v1/state',{headers:{Authorization:`Bearer ${s.accessToken}`}})).json();});
  expect(current.state.carts['cust-2'].some((l:any)=>l.productId==='prod-che'&&l.quantity>=1)).toBe(true);expect(errors).toEqual([]);
  await page.getByRole('button',{name:'Xem Chè Shan tuyết',exact:true}).first().click();
  await page.getByRole('dialog').getByRole('button',{name:'Mua ngay',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByText('Thanh toán online (cổng mô phỏng)',{exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Tiếp tục',exact:true}).click();
  const placed=page.waitForResponse(r=>r.url().includes('/api/v1/commands')&&r.request().method()==='POST');
  await page.getByRole('dialog').getByRole('button',{name:/Đặt hàng – trả ngay/}).click();expect((await placed).status()).toBe(200);
  await expect(page.getByRole('dialog',{name:/Cổng thanh toán/})).toBeVisible();
    const paymentQr=page.getByRole('img',{name:'Mã QR thanh toán demo, không chuyển tiền thật',exact:true});
    await expect(paymentQr).toBeVisible();await expect(paymentQr).toHaveAttribute('src',/^data:image\/png;base64,/);
    const beforePay=await page.evaluate(async()=>{const s=JSON.parse(sessionStorage.getItem('dac-san-so-lao-cai:api-session')!);return (await(await fetch('/api/v1/state',{headers:{Authorization:`Bearer ${s.accessToken}`}})).json()).state.transactions;});
    expect(beforePay.some((t:any)=>t.customerId==='cust-2'&&t.status==='pending')).toBe(true);
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const paid=page.waitForResponse(r=>r.url().includes('/api/v1/commands')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Thanh toán thành công',exact:true}).click();expect((await paid).status()).toBe(200);expect(errors).toEqual([]);
});

test('public browsing permits product detail and requires login to buy',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Xem Chè Shan tuyết',exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button',{name:'Mua ngay',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Đăng nhập',exact:true})).toBeVisible();
});

test('storefront works on desktop and mobile: search, regions, stories and image loading',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.goto('/');
    await expect(page.getByRole('heading',{level:1})).toContainText('Tinh hoa đặc sản Việt');
    await expect(page.locator('.shop-product-card')).not.toHaveCount(0);
    await page.evaluate(async()=>{await document.fonts.ready;for(const image of document.querySelectorAll<HTMLImageElement>('.shop-page img')){image.loading='eager';}await Promise.all([...document.querySelectorAll<HTMLImageElement>('.shop-page img')].map(image=>image.decode().catch(()=>{})));});
    expect(await page.locator('.shop-page img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`storefront-${width}.png`),fullPage:true});
    if(width===390)await page.getByRole('button',{name:'Mở tìm kiếm',exact:true}).click();
    await page.getByRole('combobox',{name:'Tìm kiếm đặc sản'}).fill('chế biến');
    await page.getByRole('search').getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await expect(page.locator('.shop-product-card')).toHaveCount(4);
    await page.getByRole('combobox',{name:'Tìm kiếm đặc sản'}).fill('chè shan');
    await page.getByRole('search').getByRole('button',{name:'Tìm kiếm',exact:true}).click();
    await expect(page.locator('.shop-product-card')).toHaveCount(1);
    await expect(page.locator('.shop-product-card h3')).toContainText('Chè');
    await page.getByRole('button',{name:'Đặc Sản Số — Trang chủ',exact:true}).click();
    await page.getByRole('button',{name:'Bộ lọc',exact:true}).click();
    await page.getByRole('textbox',{name:'Giá đến (đồng)'}).fill('100000');
    await expect(page.getByRole('textbox',{name:'Giá đến (đồng)'})).toHaveValue('100000');
    expect(await page.locator('.shop-product-card').count()).toBeLessThan(9);
    await page.getByRole('button',{name:'Xoá bộ lọc',exact:true}).click();
    await page.getByRole('button',{name:'Bộ lọc',exact:true}).click();
    await page.getByRole('button',{name:'Khám phá đặc sản Thác Bà',exact:true}).click();
    await expect(page.locator('.shop-product-card')).toHaveCount(1);
    await page.getByRole('button',{name:'Khám phá đặc sản Bắc Hà',exact:true}).click();
    await expect(page.locator('.shop-applied-filters')).toContainText('Bắc Hà');
    await expect(page.locator('.shop-product-card')).not.toHaveCount(0);
    await page.getByRole('button',{name:/Đọc: Gặp những người/}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});

test('HTX, root, finance, regulator and shipper load their own screens',async({browser})=>{
  for(const phone of ['0900000101','0900000209','0900000204','0900000301','0900000401']) {
    const context=await browser.newContext();const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.getByPlaceholder('0900 000 000').fill(phone);await page.getByLabel('Mật khẩu', {exact:true}).fill('Dacsan@123');await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Ứng dụng gặp lỗi',exact:true})).toHaveCount(0);expect(errors,phone).toEqual([]);await context.close();
  }
});

async function verifySignupPhone(form: import('@playwright/test').Locator){await form.getByRole('button').filter({hasText:/OTP/}).click();await form.locator('input[autocomplete="one-time-code"]').fill('123456');}
