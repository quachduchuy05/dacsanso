import {createECDH} from 'node:crypto';
const secureUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url:null;}catch{return null;}};
export function paymentAdapterConfigured(options){
  const gateway=options.paymentAdapter;
  return !!(gateway&&secureUrl(gateway.url)&&typeof gateway.token==='string'&&gateway.token.length>=16&&Array.isArray(gateway.checkoutOrigins)&&gateway.checkoutOrigins.length>0&&gateway.checkoutOrigins.every(value=>secureUrl(value)?.origin===value)&&secureUrl(options.publicUrl));
}

export function pushConfigured(options){
  try{
    const push=options.webPush;
    if(!push)return false;
    const subject=new URL(push.subject);
    if(!((subject.protocol==='mailto:'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject.pathname))||(subject.protocol==='https:'&&subject.hostname&&!subject.username&&!subject.password)))return false;
    const privateKey=Buffer.from(push.privateKey??'','base64url'),publicKey=Buffer.from(push.publicKey??'','base64url');
    if(privateKey.length!==32||publicKey.length!==65)return false;
    const key=createECDH('prime256v1');key.setPrivateKey(privateKey);
    return key.getPublicKey().equals(publicKey);
  }catch{return false;}
}
export {secureUrl};
