/* Only notifications: no offline cache of account or order data. */
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()??{};}catch{/* Use a generic visible notification. */}
  event.waitUntil(self.registration.showNotification('Đặc Sản Số',{
    body:'Bạn có thông báo mới. Mở ứng dụng để xem.',
    tag:typeof data.tag==='string'?data.tag.slice(0,150):'dac-san-so',
    data:{url:'/'},
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows)if(new URL(client.url).origin===self.location.origin){await client.focus();return;}
    await self.clients.openWindow('/');
  })());
});
