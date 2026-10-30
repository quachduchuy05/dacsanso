import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync} from 'node:crypto';
import {hashPassword,verifyPassword} from '../passwords.mjs';
test('new passwords use bcrypt while historical scrypt passwords continue to verify',async()=>{
  const password='Matkhau@123',encoded=await hashPassword(password);
  assert(encoded.startsWith('$2b$12$'));assert(await verifyPassword(password,encoded));assert(!await verifyPassword('Wrong@123',encoded));
  const salt='ab'.repeat(16),legacy=`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;
  assert(await verifyPassword(password,legacy));assert(!await verifyPassword('Wrong@123',legacy));assert(!await verifyPassword(password,'malformed'));
  await assert.rejects(()=>hashPassword('Aa1!'+Array(28).fill('ạ').join('')),/72 byte/);
});
