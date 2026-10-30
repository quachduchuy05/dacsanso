import {test,expect,type Page} from '@playwright/test';

test('mobile hero text and header actions stay visible without clipping',async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,deviceScaleFactor:2});
  const page=await context.newPage();
  try{
    for(const width of [320,375,390,430]){
      await page.setViewportSize({width,height:667});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
      const clipped=await page.locator('.shop-hero h1,.shop-hero-content > p,.shop-hero-eyebrow,.shop-hero-buttons button,.shop-header-actions button,.shop-brand').evaluateAll(elements=>elements.filter(element=>{
        const rect=element.getBoundingClientRect();if(!rect.width||!rect.height)return false;
        return rect.left<0||rect.right>innerWidth+1||element.scrollWidth>element.clientWidth+1;
      }).map(element=>element.className));
      expect(clipped).toEqual([]);
      if(width===375){
        const buttons=await page.locator('.shop-hero-buttons').boundingBox();expect(buttons!.y+buttons!.height).toBeLessThan(600);
        await page.screenshot({path:testInfo.outputPath('mobile-375x667.png')});
      }
    }
  }finally{await context.close();}
});

async function expectPageFits(page:Page){
  const dimensions=await page.evaluate(()=>({viewport:innerWidth,root:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  expect(dimensions.root,JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport+1);
  const outside=await page.evaluate(()=>[...document.querySelectorAll('main *,header *')].filter(element=>{
    const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
    if(!rect.width||!rect.height||style.visibility==='hidden'||style.display==='none'||style.opacity==='0'||(rect.left>=-1&&rect.right<=innerWidth+1))return false;
    // Children may scroll inside a bounded table, tab bar or intentionally cropped image.
    for(let parent=element.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
      const bounds=parent.getBoundingClientRect();
      if(['auto','scroll','hidden','clip'].includes(getComputedStyle(parent).overflowX)&&bounds.left>=-1&&bounds.right<=innerWidth+1)return false;
    }
    return true;
  }).slice(0,6).map(element=>({tag:element.tagName,className:String(element.className),text:element.textContent?.slice(0,70)})));
  expect(outside,'Content outside the viewport without an internal scrolling region').toEqual([]);
}

test('public pages reflow from small phones to wide desktop screens',async({page},testInfo)=>{
  test.setTimeout(90000);
  for(const width of [320,360,390,600,768,820,1024,1280,1440,1920,2560]){
    await page.setViewportSize({width,height:900});
    for(const path of ['/','/san-pham','/dang-nhap']){
      await page.goto(path);await expect(page.getByRole('main')).toBeVisible();await expectPageFits(page);
      if(path==='/'&&[320,768,1920].includes(width))await page.screenshot({path:testInfo.outputPath('home-'+width+'.png')});
    }
  }
  await page.setViewportSize({width:320,height:740});await page.goto('/');
  await page.getByRole('button',{name:'Mở tìm kiếm',exact:true}).click();
  await page.getByRole('combobox',{name:'Tìm kiếm đặc sản'}).fill('DACSANKHONGCOKHOANGTRANG'.repeat(5));
  await expectPageFits(page);
});

for(const [role,phone]of [['operations','0900000201'],['quality','0900000202'],['support','0900000203'],['finance','0900000204'],['root','0900000209'],['seller','0900000101'],['regulator','0900000301'],['shipper','0900000401']]){
  test(role+' pages fit phone, tablet and desktop layouts',async({page})=>{
    test.setTimeout(90000);
    // Use the real demo OTP API; layout sweeps must not exhaust password-login protection.
    const challenge=await page.request.post('/api/v1/auth/otp',{data:{phone,purpose:'login'}});expect(challenge.status()).toBe(200);
    const response=await page.request.post('/api/v1/auth/login',{data:{challengeId:(await challenge.json()).challengeId,otp:'123456'}});expect(response.status()).toBe(200);
    const session=await response.json();await page.addInitScript(({tokens,userId})=>{sessionStorage.setItem('dac-san-so-lao-cai:api-session',JSON.stringify(tokens));sessionStorage.setItem('dac-san-so-lao-cai:session',userId);},{tokens:{accessToken:session.accessToken,refreshToken:session.refreshToken},userId:session.user.id});
    await page.setViewportSize({width:320,height:800});await page.goto('/');await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();
    for(const width of [320,600,768,1024,1440,2560]){
      await page.setViewportSize({width,height:900});
      const nav=page.getByRole('navigation',{name:'Chức năng quản trị'}),tabs=await nav.count()?nav.getByRole('button'):page.getByRole('tablist').first().getByRole('tab'),count=await tabs.count();
      for(let index=0;index<Math.max(1,count);index++){
        if(count)await tabs.nth(index).click();
        await expectPageFits(page);await expect(page.getByRole('heading',{name:'Ứng dụng gặp lỗi',exact:true})).toHaveCount(0);
      }
    }
  });
}

test('product dialogs keep long titles and actions inside portrait and landscape viewports',async({page},testInfo)=>{
  await page.goto('/');
  for(const [width,height]of [[320,568],[390,844],[768,1024],[844,390],[1280,720],[1920,1080]]){
    await page.setViewportSize({width,height});await page.getByRole('button',{name:'Xem Chè Shan tuyết',exact:true}).first().click();
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
    const titleId=await dialog.getAttribute('aria-labelledby'),title=page.locator('[id="'+titleId+'"]');
    // A valid 96-character product name without spaces must wrap instead of clipping.
    await title.evaluate(element=>{element.textContent='DACSAN'.repeat(16);});
    expect(await title.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
    const bounds=await dialog.boundingBox();expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(-1);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width+1);expect(bounds!.y).toBeGreaterThanOrEqual(-1);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height+1);
    await expect(dialog.getByRole('button',{name:'Mua ngay',exact:true})).toBeVisible();
    const action=await dialog.getByRole('button',{name:'Mua ngay',exact:true}).boundingBox();expect(action!.y+action!.height).toBeLessThanOrEqual(height+1);
    expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
    if(width===320||height===390)await page.screenshot({path:testInfo.outputPath('dialog-'+width+'x'+height+'.png')});
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  }
});

test('Google button redraws within its container when the viewport changes',async({page})=>{
  // Test rendering only: no Google identity or real OAuth request is fabricated.
  await page.route('**/src/store/supabaseConfig.ts*',route=>route.fulfill({contentType:'application/javascript',body:'export const supabaseUrl="";export const supabasePublishableKey="";export const supabaseConfigured=false;'}));
  await page.route('**/src/store/serviceStatus.ts*',route=>route.fulfill({contentType:'application/javascript',body:'export const GOOGLE_CLIENT_ID="layout-test.apps.googleusercontent.com";export async function fetchMapsConfigured(){return false;}'}));
  await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(){},renderButton(element:HTMLElement,options:Record<string,unknown>){const button=document.createElement('button');button.textContent='Google layout fixture';button.style.width=(Number(options.width)||40)+'px';button.style.height='44px';element.appendChild(button);}}}};});
  await page.goto('/dang-nhap');await expect(page.locator('.auth-google-holder button')).toBeVisible();
  for(const width of [1440,768,320,390,1280]){
    await page.setViewportSize({width,height:900});
    await expect.poll(()=>page.locator('.auth-google-holder').evaluate(element=>{const width=element.clientWidth,button=element.querySelector('button')!;return Math.round(button.getBoundingClientRect().width)===(width<200?40:Math.min(400,width));})).toBe(true);
  }
});
