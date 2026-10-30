import {test,expect} from '@playwright/test';

test('Web Push opt-in saves a device and logout removes it while clearing the local session immediately',async({page})=>{
  // Browser transport is mocked. Server authorization, keys, leases and retries have separate backend tests.
  await page.addInitScript(()=>{
    let subscribed=false;
    const subscription={options:{applicationServerKey:null},toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/browser-test',keys:{p256dh:'test',auth:'test'}}),unsubscribe:async()=>{subscribed=false;return true;}};
    const registration={pushManager:{getSubscription:async()=>subscribed?subscription:null,subscribe:async()=>{subscribed=true;return subscription;}}};
    Object.defineProperty(Notification,'requestPermission',{value:async()=>'granted'});
    Object.defineProperty(navigator.serviceWorker,'register',{value:async()=>registration});
    Object.defineProperty(navigator.serviceWorker,'ready',{get:()=>Promise.resolve(registration)});
    Object.defineProperty(navigator.serviceWorker,'getRegistration',{value:async()=>registration});
  });
  let devices:{id:string;createdAt:string}[]=[],removed=false;
  await page.route('**/api/v1/me/push',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true,publicKey:'AQ',devices}});
    const body=route.request().postDataJSON();
    if(body.action==='subscribe'){devices=[{id:'push-browser-test',createdAt:new Date().toISOString()}];return route.fulfill({json:{ok:true,id:'push-browser-test'}});}
    expect(route.request().headers().authorization).toMatch(/^Bearer /);removed=true;devices=[];await route.fulfill({json:{ok:true}});
  });
  await page.goto('/dang-nhap');await page.getByPlaceholder('0900 000 000').fill('0900000002');await page.getByLabel('Mật khẩu',{exact:true}).fill('Dacsan@123');await page.getByRole('main').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.getByRole('banner').getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByText('Bảo mật tài khoản',{exact:true}).click();
  await page.getByRole('button',{name:'Bật thông báo trên thiết bị này',exact:true}).click();
  await expect(page.getByText(/Thiết bị 1 \(trình duyệt này\)/)).toBeVisible();
  const revoked=page.waitForResponse(response=>response.url().endsWith('/api/v1/auth/logout'));
  await page.getByRole('banner').getByRole('button',{name:'Đăng xuất',exact:true}).click();
  expect(await page.evaluate(()=>sessionStorage.getItem('dac-san-so-lao-cai:api-session'))).toBeNull();
  await revoked;expect(removed).toBe(true);expect(await page.evaluate(()=>localStorage.getItem('dac-san-so:web-push-device'))).toBeNull();
  await page.reload();await expect(page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible();
});
