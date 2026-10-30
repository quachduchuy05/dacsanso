import {test,expect} from '@playwright/test';
test('Google account selection returns through PKCE and creates customer without typing email or name',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'browser@example.com',email_confirmed_at:new Date().toISOString(),user_metadata:{name:'Khách Google',full_name:'Khách Google'},app_metadata:{provider:'google',providers:['google']},created_at:new Date().toISOString()};
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',email:user.email,exp,iat:exp-3600,iss:'https://codex-test.supabase.co/auth/v1'})).toString('base64url')}.e2e_google_mock_signature`;
  let selected=false,exchanged=false;
  await page.route('https://codex-test.supabase.co/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/authorize')){
      expect(url.searchParams.get('provider')).toBe('google');expect(url.searchParams.get('prompt')).toBe('select_account');expect(url.searchParams.get('code_challenge')).toBeTruthy();selected=true;
      return route.fulfill({status:302,headers:{location:'http://localhost:3000/dang-nhap?code=google-test-code'}});
    }
    if(url.pathname.endsWith('/token')){
      expect(url.searchParams.get('grant_type')).toBe('pkce');const body=route.request().postDataJSON();expect(body.auth_code).toBe('google-test-code');expect(body.code_verifier).toBeTruthy();exchanged=true;
      return route.fulfill({json:{access_token:token,refresh_token:'google-test-refresh',expires_in:3600,token_type:'bearer',user}});
    }
    if(url.pathname.endsWith('/user'))return route.fulfill({json:user});
    if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
    return route.abort();
  });
  await page.goto('/dang-nhap');
  await expect(page.getByLabel('Địa chỉ Gmail',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Tên hiển thị (không bắt buộc)',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Đăng nhập bằng Google',exact:true}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất'})).toBeVisible();
  await expect(page).toHaveURL('http://localhost:3000/');expect(selected).toBe(true);expect(exchanged).toBe(true);
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dac-san-so-lao-cai:api-session')!));expect(stored.authProvider).toBe('supabase');
  const response=await page.request.get('/api/v1/me',{headers:{Authorization:`Bearer ${stored.accessToken}`}});expect((await response.json()).user.role).toBe('customer');
  await page.getByRole('banner').getByRole('button',{name:'Đăng xuất'}).click();await page.reload();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('Supabase password connects SDK session to backend and logout stays logged out',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'browser@example.com',email_confirmed_at:new Date().toISOString(),user_metadata:{name:'Khách Supabase thử nghiệm'},app_metadata:{provider:'email',providers:['email']},created_at:new Date().toISOString()};
  const exp=Math.floor(Date.now()/1000)+3600;
  const access_token=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',email:user.email,exp,iat:exp-3600,iss:'https://codex-test.supabase.co/auth/v1'})).toString('base64url')}.e2e_verified_server_mock_signature`;
  const session={access_token,refresh_token:'supabase-test-refresh',token_type:'bearer',expires_in:3600,expires_at:exp,user};
  await page.route('https://codex-test.supabase.co/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/logout'))return route.fulfill({status:204});
    if(path.endsWith('/otp'))return route.fulfill({json:{}});
    if(path.endsWith('/verify')||path.endsWith('/token'))return route.fulfill({json:session});
    if(path.endsWith('/user'))return route.fulfill({json:user});
    return route.abort();
  });
  await page.goto('/dang-nhap');await page.getByText('Đăng nhập bằng email Supabase',{exact:true}).click();const form=page.getByRole('form',{name:'Đăng nhập bằng email'});
  await form.getByRole('textbox',{name:'Email',exact:true}).fill(user.email);
  await form.getByLabel('Mật khẩu email',{exact:true}).fill('Supabase@123');
  await form.getByRole('button',{name:'Đăng nhập bằng email',exact:true}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng xuất'})).toBeVisible();
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dac-san-so-lao-cai:api-session')!));expect(stored.authProvider).toBe('supabase');expect(stored.accessToken).toBe(access_token);expect(stored.state).toBeUndefined();
  await page.getByRole('banner').getByRole('button',{name:'Đăng xuất'}).click();
  await expect(page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('banner').getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
