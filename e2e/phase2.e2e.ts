import {test,expect,type Browser,type Page} from '@playwright/test';
import {createSeedState} from '../src/data/seed';
import {addToCart,setCartLine,removeCartLine} from '../src/domain/cart';
import {placeCheckout} from '../src/domain/checkout';
import {groupFamilies} from '../src/domain/variants';
import type {DemoState} from '../src/domain/types';
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAxMDAwMDAAAAZNAIBWxOnMQAAAABJRU5ErkJggg==';
test.setTimeout(45000);
async function app(browser:Browser,loggedIn=false){
  let state=createSeedState(new Date()),version=1;state.orders=[];state.transactions=[];
  const user=state.users.find(u=>u.role==='customer')!,cid=user.customerId!;
  state.carts[cid]=[];
  const single=groupFamilies(state.products.filter(p=>p.status==='active'&&p.kind==='ready')).find(items=>items.length===1)![0];single.image=PNG;
  const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await context.route('https://**/*',route=>route.abort());
  if(loggedIn)await context.addInitScript(id=>{sessionStorage.setItem('dac-san-so-lao-cai:session',id);sessionStorage.setItem('dac-san-so-lao-cai:api-session',JSON.stringify({accessToken:'test-only',refreshToken:'test-only'}));},user.id);
  const errors:string[]=[];let commandFailure=false,commandDelay=0,modelRequests=0;
  await context.route('**/api/**',async route=>{
    const url=new URL(route.request().url()),body=route.request().method()==='POST'?route.request().postDataJSON():{};
    if(url.pathname==='/api/v1/state')return route.fulfill({json:{state,user:loggedIn?user:null,version,demo:true}});
    if(url.pathname==='/api/v1/demo/accounts')return route.fulfill({json:{users:state.users}});
    if(url.pathname==='/api/v1/auth/password/login'){loggedIn=true;return route.fulfill({json:{state,user,version,accessToken:'test-only',refreshToken:'test-only'}});}
    if(url.pathname==='/api/v1/cart/merge'){
      for(const line of body.lines){const existing=state.carts[cid].find(l=>l.productId===line.productId);if(existing)existing.quantity+=line.quantity;else state.carts[cid].push(line);}
      return route.fulfill({json:{state,version:++version,adjustments:[]}});
    }
    if(url.pathname==='/api/v1/commands'){
      if(commandDelay)await new Promise(resolve=>setTimeout(resolve,commandDelay));
      if(commandFailure)return route.fulfill({status:422,json:{error:'Simulated stock conflict'}});
      const results:any[]=[];
      for(const command of body.commands){let result:any;const a=command.args;
        if(command.name==='addToCart')result=addToCart(state,cid,a[1],a[2],new Date());
        else if(command.name==='setCartLine')result=setCartLine(state,cid,a[1],a[2]);
        else if(command.name==='removeCartLine')result=removeCartLine(state,cid,a[1]);
        else if(command.name==='placeCheckout')result=placeCheckout(state,{...a[0],customerId:cid},{kind:'customer',id:cid,name:user.name},new Date());
        else return route.fulfill({status:400,json:{error:'Unexpected test command'}});
        if(result.ok===false)return route.fulfill({status:422,json:{error:result.error}});
        state=result.state??result.value??result;results.push(result);
      }
      return route.fulfill({json:{state,version:++version,results}});
    }
    if(url.pathname.endsWith('/media'))return route.fulfill({json:{items:[{id:'photo',kind:'image',group:'main',order:0,alt:'Product image',files:[PNG]},{id:'model',kind:'model',group:'main',order:0,alt:'Synthetic geometry for renderer test',files:['/synthetic.glb','/synthetic.usdz'],poster:PNG}]}});
    return route.fulfill({json:{items:[],ok:true}});
  });
  await context.route('**/synthetic.glb',route=>{modelRequests++;return route.fulfill({body:triangle(),contentType:'model/gltf-binary'});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('.signature-rail .shop-product-card').first().waitFor();
  return {page,context,user,single,errors,state:()=>state,delay:(ms:number)=>{commandDelay=ms;},fail:()=>{commandFailure=true;},modelRequests:()=>modelRequests};
}
function triangle(){
  const json=JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],materials:[{doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.8,.6,.2,1],metallicFactor:0,roughnessFactor:.7}}],buffers:[{byteLength:44}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36,target:34962},{buffer:0,byteOffset:36,byteLength:6,target:34963}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-1,0,0],max:[1,1,0]},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}]});
  const text=Buffer.from(json.padEnd(Math.ceil(Buffer.byteLength(json)/4)*4,' ')),bin=Buffer.alloc(44);[-1,0,0,1,0,0,0,1,0].forEach((v,i)=>bin.writeFloatLE(v,i*4));[0,1,2].forEach((v,i)=>bin.writeUInt16LE(v,36+i*2));const glb=Buffer.alloc(12+8+text.length+8+bin.length);glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(text.length,12);glb.writeUInt32LE(0x4e4f534a,16);text.copy(glb,20);const at=20+text.length;glb.writeUInt32LE(bin.length,at);glb.writeUInt32LE(0x004e4942,at+4);bin.copy(glb,at+8);return glb;
}
function card(page:Page,name:string){return page.locator('.signature-rail .shop-product-card').filter({has:page.getByRole('button',{name,exact:true})});}

test('Editorial regions open a real catalog search and mobile filters close without losing the query',async({browser})=>{
  const f=await app(browser);try{
    await expect.poll(()=>f.page.locator('.signature-rail').first().evaluate(el=>el.scrollLeft)).toBe(0);
    const region=f.page.locator('.editorial-region').first();const name=await region.locator('strong').innerText();await region.click();
    await expect(f.page.locator('.catalog-page')).toBeVisible();await expect(f.page.locator('.shop-search input')).toHaveValue(name);
    await f.page.getByRole('button',{name:'Bộ lọc tìm kiếm',exact:true}).click();await expect(f.page.locator('#catalog-filters')).toBeVisible();
    await f.page.getByRole('button',{name:'Đóng bộ lọc',exact:true}).click();await expect(f.page.locator('#catalog-filters')).not.toBeVisible();
    await f.page.locator('.commerce-footer').getByRole('button',{name:'Giao hàng & thanh toán'}).click();await expect(f.page.getByRole('dialog')).toContainText('30%');expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

test('Preorder checkout presents the 30 percent deposit and creates a pending deposit transaction',async({browser})=>{
  const f=await app(browser,true);try{
    const product=f.state().products.find(p=>p.id===f.single.id)!;
    const future=(days:number)=>{const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);};
    product.kind='preorder';product.price=500000;product.preorder={totalSlots:20,deliveryFrom:future(15),deliveryTo:future(30),open:true};
    f.state().params.depositPercent=30;await f.page.reload();
    await card(f.page,f.single.name).getByRole('heading').getByRole('button').click();await f.page.getByRole('button',{name:'Đặt trước',exact:true}).click();
    const schedule=f.page.getByRole('region',{name:'Lịch thanh toán đặt trước'});
    await expect(schedule).toBeVisible();await expect(schedule).toContainText('cọc 30%');await expect(schedule).toContainText('150.000');
    await f.page.locator('.checkout-editor-trigger').filter({hasText:'Chọn phương thức thanh toán'}).click();
    const editor=f.page.locator('dialog.checkout-editor[open]');await editor.getByLabel('Trả online khi hàng sẵn sàng',{exact:true}).check();
    await editor.getByLabel('Tôi đã đọc và đồng ý điều kiện huỷ trên').check();await editor.getByRole('button',{name:'Xong',exact:true}).click();
    const place=f.page.getByRole('button',{name:/^Trả ngay /});await expect(place).toBeEnabled();await place.click();
    await expect.poll(()=>f.state().transactions.length).toBe(1);const tx=f.state().transactions[0],order=f.state().orders[0];expect(tx.amount).toBe(150000);expect(tx.status).toBe('pending');expect(order.amountPaidOnline).toBe(0);expect(order.pricing.deposit+order.pricing.remaining).toBe(order.pricing.total);expect(order.params.depositPercent).toBe(30);
  }finally{await f.context.close();}
});

test('Product detail loads the local concept model only on activation when no approved model exists',async({browser})=>{
  const f=await app(browser);try{
    let requests=0;
    await f.context.route('**/api/v1/products/*/media',route=>route.fulfill({json:{items:[]}}));
    await f.context.route('**/models/concepts/*.glb',async route=>{requests++;await route.continue();});
    await card(f.page,f.single.name).getByRole('heading').getByRole('button').click();
    await expect(f.page.getByRole('button',{name:'Xem 3D',exact:true}).first()).toBeVisible();expect(requests).toBe(0);
    await f.page.getByRole('button',{name:'Xem 3D',exact:true}).first().click();
    await expect.poll(()=>requests).toBe(1);
    await expect.poll(()=>f.page.locator('model-viewer').evaluate((el:any)=>el.loaded),{timeout:15000}).toBe(true);
    await expect(f.page.getByRole('note').filter({hasText:'Bản dựng theo loại sản phẩm'})).toBeVisible();
    await f.page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>f.page.locator('model-viewer').evaluate((el:any)=>el.autoRotate)).toBe(false);
    await f.page.getByRole('button',{name:'Đóng 3D',exact:true}).click();await expect(f.page.locator('model-viewer')).toHaveCount(0);expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

test('An unavailable ready SKU offers a consent-based guest restock subscription',async({browser})=>{
  const f=await app(browser);try{
    f.state().products.find(p=>p.id===f.single.id)!.stockOnHand=0;
    let submitted:any;
    await f.context.route('**/api/v1/products/restock-interest',route=>{submitted=route.request().postDataJSON();return route.fulfill({json:{ok:true}});});
    await f.page.reload();await card(f.page,f.single.name).getByRole('heading').getByRole('button').click();
    await f.page.getByText('Báo tôi khi có hàng',{exact:true}).click();
    await f.page.getByLabel('Số điện thoại nhận tin',{exact:true}).fill('0901234567');
    await f.page.getByLabel('Tôi đồng ý nhận tin khi sản phẩm này có hàng.').check();
    await f.page.getByRole('button',{name:'Đăng ký báo có hàng',exact:true}).click();
    await expect(f.page.getByText('Đã ghi nhận đăng ký báo có hàng.',{exact:true})).toBeVisible();
    expect(submitted).toMatchObject({productId:f.single.id,phone:'0901234567',consent:true});expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

test('Mobile cart closes on a downward header swipe but not on a short drag',async({browser})=>{
  const f=await app(browser);try{
    await f.page.locator('.shop-header-actions').getByRole('button',{name:/giỏ hàng/i}).click();
    const header=f.page.locator('.sheet-swipe-header');await expect(header).toBeVisible();
    const swipe=async(distance:number)=>{await header.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:1,clientX:90,clientY:90});await header.dispatchEvent('pointermove',{pointerType:'touch',pointerId:1,clientX:90,clientY:90+distance});await header.dispatchEvent('pointerup',{pointerType:'touch',pointerId:1,clientX:90,clientY:90+distance});};
    // Synthetic pointers cannot be captured; DOM dispatch still exercises the gesture threshold.
    await header.evaluate(el=>{el.setPointerCapture=()=>{};});
    await swipe(35);await expect(header).toBeVisible();await swipe(110);await expect(header).toHaveCount(0);expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

test('A failed model switches automatically to approved 360 media',async({browser})=>{
  const f=await app(browser);try{
    await f.context.route('**/api/v1/products/*/media',route=>route.fulfill({json:{items:[{id:'model',kind:'model',group:'main',order:0,alt:'Product model',files:['/synthetic.glb'],poster:PNG},{id:'spin',kind:'spin',group:'main',order:1,alt:'Product angles',files:Array.from({length:24},()=>PNG),poster:PNG}]}}));
    await card(f.page,f.single.name).getByRole('heading').getByRole('button').click();await f.page.getByRole('button',{name:'Xem 3D',exact:true}).first().click();await expect(f.page.locator('model-viewer')).toBeVisible();
    await f.page.locator('model-viewer').dispatchEvent('error');await expect(f.page.locator('.product-spin')).toBeVisible();await expect(f.page.locator('model-viewer')).toHaveCount(0);await expect(f.page.getByRole('button',{name:'Góc tiếp theo',exact:true})).toBeVisible();await f.page.getByRole('button',{name:'Đóng 360°',exact:true}).click();await expect(f.page.locator('.product-spin')).toHaveCount(0);expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

test('Guest can add, undo exactly one increment, reload cart and resume checkout after login',async({browser})=>{
  const f=await app(browser);try{
    const c=card(f.page,f.single.name);await c.getByRole('button',{name:`Thêm ${f.single.name} vào giỏ`,exact:true}).click();
    await expect(f.page.getByRole('status').filter({hasText:'Đã thêm'})).toBeVisible();
    await f.page.getByRole('button',{name:'Hoàn tác',exact:true}).click();await expect(c.locator('.shop-add-cart')).toBeVisible();
    await c.getByRole('button',{name:`Thêm ${f.single.name} vào giỏ`,exact:true}).click();await f.page.reload();
    await f.page.locator('.shop-cart-icon').click();await expect(f.page.getByRole('dialog')).toBeVisible();
    await f.page.getByRole('button',{name:/Đặt hàng 1 sản phẩm/}).click();await expect(f.page).toHaveURL(/dang-nhap/);
    await f.page.getByPlaceholder('0900 000 000').fill(f.user.phone);await f.page.getByLabel('Mật khẩu',{exact:true}).fill('test-only');await f.page.locator('.auth-form').getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await expect(f.page.getByRole('dialog').getByText('Một lần đặt',{exact:false})).toBeVisible();
    await expect(f.page.getByRole('button',{name:'Tiếp tục',exact:true})).toHaveCount(0);
    expect(f.state().carts[f.user.customerId!]).toHaveLength(1);expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

test('Slow failing add shows optimistic quantity first, then rolls back',async({browser})=>{
  const f=await app(browser,true);try{f.delay(1200);f.fail();const c=card(f.page,f.single.name);await c.getByRole('button',{name:`Thêm ${f.single.name} vào giỏ`,exact:true}).click();await expect(c.locator('.shop-card-quantity')).toBeVisible({timeout:500});await expect(c.locator('.shop-add-cart')).toBeVisible({timeout:5000});await expect(f.page.getByRole('status').filter({hasText:'Simulated stock conflict'})).toBeVisible();expect(f.state().carts[f.user.customerId!]).toEqual([]);expect(f.errors).toEqual([]);}finally{await f.context.close();}
});

test('Buy now uses one checkout screen and keeps the existing cart untouched',async({browser})=>{
  const f=await app(browser,true);try{
    const c=card(f.page,f.single.name);await c.getByRole('button',{name:`Thêm ${f.single.name} vào giỏ`,exact:true}).click();await expect(c.locator('.shop-card-quantity')).toBeVisible();await expect.poll(()=>f.state().carts[f.user.customerId!]?.length).toBe(1);
    await c.getByRole('heading').getByRole('button').click();await f.page.getByRole('button',{name:'Mua ngay',exact:true}).click();
    const dialog=f.page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Tiếp tục',exact:true})).toHaveCount(0);
    await dialog.locator('.checkout-editor-trigger').filter({hasText:'Chọn phương thức thanh toán'}).click();await f.page.locator('dialog.checkout-editor[open]').getByLabel('Thanh toán khi nhận hàng (COD)',{exact:true}).check();await f.page.locator('dialog.checkout-editor[open]').getByRole('button',{name:'Xong',exact:true}).click();const place=dialog.getByRole('button',{name:/^Trả ngay /});await expect(place).toBeEnabled();await place.click();
    await expect(f.page.getByText('Đã ghi nhận lần đặt',{exact:true})).toBeVisible();expect(f.state().carts[f.user.customerId!][0].quantity).toBe(1);expect(f.state().checkouts[0].source).toBe('buy_now');expect(f.state().orders[0].status).toBe('preparing');expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});

test('3D is fetched only after activation; closing releases the viewer and image zoom has controls',async({browser})=>{
  const f=await app(browser);try{
    await card(f.page,f.single.name).getByRole('heading').getByRole('button').click();await expect(f.page.getByRole('button',{name:'Xem 3D',exact:true}).first()).toBeVisible();expect(f.modelRequests()).toBe(0);
    await f.page.getByRole('button',{name:'Xem 3D',exact:true}).first().click();await expect(f.page.locator('model-viewer')).toBeVisible();await expect.poll(f.modelRequests,{timeout:15000}).toBe(1);
    await expect.poll(()=>f.page.locator('model-viewer').evaluate((el:any)=>el.loaded),{timeout:15000}).toBe(true);
    await f.page.getByRole('button',{name:'Đóng 3D',exact:true}).click();await expect(f.page.locator('model-viewer')).toHaveCount(0);
    await f.page.getByRole('button',{name:'Ảnh trước',exact:true}).click();await f.page.getByRole('button',{name:'Mở thư viện toàn màn hình',exact:true}).click();await f.page.getByRole('button',{name:'Phóng to ảnh',exact:true}).click();await expect(f.page.getByText('150%',{exact:true})).toBeVisible();await f.page.keyboard.press('Escape');await expect(f.page.locator('.product-gallery-full')).not.toBeVisible();await expect(f.page.locator('.signature-detail')).toBeVisible();expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
});
