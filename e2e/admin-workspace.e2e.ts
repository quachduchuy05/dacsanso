import {test,expect,type Browser} from '@playwright/test';
import {createSeedState} from '../src/data/seed';
import {aggregateStats,periodStats,type StatsRange} from '../src/domain/stats';

async function workspace(browser:Browser,group:'root'|'quality'='root',width=1440) {
  const state=createSeedState(new Date());
  const user=state.users.find(u=>u.role==='admin'&&u.adminGroup===group)!;
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(id=>{
    sessionStorage.setItem('dac-san-so-lao-cai:session',id);
    sessionStorage.setItem('dac-san-so-lao-cai:api-session',JSON.stringify({accessToken:'test-only',refreshToken:'test-only'}));
  },user.id);
  let reportRequests=0;
  await context.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/v1/state')return route.fulfill({json:{state,user,version:1,demo:true}});
    if(url.pathname==='/api/v1/reports/dashboard'){
      reportRequests++;
      const range=(url.searchParams.get('range')??'30d') as StatsRange;
      return route.fulfill({json:{snapshotId:'test-snapshot',dataAsOf:new Date().toISOString(),range,aggregate:aggregateStats(state),period:periodStats(state,range,new Date())}});
    }
    return route.fulfill({json:{items:[],ok:true}});
  });
  const page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.locator('.admin-workspace')).toBeVisible();
  return {context,page,errors,reportRequests:()=>reportRequests};
}

test('Admin tổng hợp: tìm chức năng, mở đúng mục và chỉ tải báo cáo khi cần',async({browser})=>{
  const {context,page,errors,reportRequests}=await workspace(browser);
  try {
    const nav=page.getByRole('navigation',{name:'Chức năng quản trị'});
    await expect(nav.getByRole('button')).toHaveCount(22);
    await expect(page.locator('.admin-queue')).toHaveCount(4);
    expect(reportRequests()).toBe(0);
    await page.getByLabel('Tìm chức năng quản trị').fill('hoa don');
    await expect(nav.getByRole('button')).toHaveCount(1);
    await expect(nav.getByRole('button')).toHaveText('Hoá đơn công ty');
    await page.getByLabel('Tìm chức năng quản trị').fill('khong-co-chuc-nang-nay');
    await expect(nav.getByRole('status')).toBeVisible();
    await page.getByLabel('Xóa tìm chức năng').click();
    await nav.getByRole('button',{name:'Đơn hàng',exact:true}).click();
    await expect(page.getByRole('heading',{level:1})).toHaveText('Đơn hàng');
    await expect(page.locator('.admin-main table')).toBeVisible();
    await page.getByRole('button',{name:'Tổng quan',exact:true}).last().click();
    await page.locator('.admin-reports>summary').click();
    await expect(page.getByRole('button',{name:'Làm mới số liệu'})).toBeVisible();
    await expect.poll(reportRequests).toBe(1);
    expect(errors).toEqual([]);
  } finally {await context.close();}
});

test('Điện thoại: menu đóng gọn, chọn chức năng và bảng không làm tràn trang',async({browser})=>{
  const {context,page,errors}=await workspace(browser,'root',375);
  try {
    const nav=page.getByRole('navigation',{name:'Chức năng quản trị'});
    await expect(nav).toBeHidden();
    await page.locator('.admin-menu-toggle').click();
    await expect(nav).toBeVisible();
    await nav.getByRole('button',{name:'Đơn hàng',exact:true}).click();
    await expect(nav).toBeHidden();
    await expect(page.getByRole('heading',{level:1})).toHaveText('Đơn hàng');
    for(const width of [320,375,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  } finally {await context.close();}
});

test('Admin theo nhóm chỉ thấy chức năng thuộc phạm vi của mình',async({browser})=>{
  const {context,page}=await workspace(browser,'quality');
  try {
    const nav=page.getByRole('navigation',{name:'Chức năng quản trị'});
    await expect(nav.getByRole('button')).toHaveCount(6);
    await expect(nav.getByRole('button',{name:'Duyệt sản phẩm & giá',exact:true})).toBeVisible();
    await expect(nav.getByRole('button',{name:'Phân quyền Admin',exact:true})).toHaveCount(0);
    await expect(nav.getByRole('button',{name:'Hoàn tiền',exact:true})).toHaveCount(0);
    await nav.getByRole('button',{name:'Bảo mật tài khoản',exact:true}).click();
    await expect(page.getByRole('heading',{level:1})).toHaveText('Bảo mật tài khoản');
  } finally {await context.close();}
});
