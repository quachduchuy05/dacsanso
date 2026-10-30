import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productionReadiness} from '../readiness.mjs';
test('production checks reject demo, HTTP, missing adapters and do not print credentials',()=>{
  const input={demo:true,encryptionKey:'invalid',publicUrl:'http://localhost',allowedOrigins:['https://example.com','http://localhost'],smsUrl:'https://sms.example.com',smsToken:'secret-do-not-print-1234'};
  const result=productionReadiness(input);
  assert.equal(result.ready,false);
  for(const id of ['demo','encryption','public-url','origins','provider-adapters'])assert.equal(result.checks.find(c=>c.id===id).status,'blocked');
  assert(!JSON.stringify(result).includes(input.smsToken));
  assert.equal(result.checks.find(c=>c.id==='sms').status,'configured');
});
