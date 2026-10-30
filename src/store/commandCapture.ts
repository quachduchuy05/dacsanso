import {productEditLocks} from './productEditLocks';
export interface Command { name: string; args: unknown[];editToken?:string }
let commands: Command[] | null = null;
let results: unknown[] | null = null;

/** Keep existing typed domain callbacks while sending only named operations to the server. */
export function invoke(name: string, fn: (...args: any[]) => any, args: any[]): any {
  if (results) {
    if (!results.length) throw new Error('Phản hồi thao tác không đầy đủ.');
    return results.shift();
  }
  if (commands) commands.push({ name, ...(name==='coopRequestContentChange'?{editToken:productEditLocks.get(args[1])}:{}),args: args.slice(1).map(a => a instanceof Date ? a.toISOString() : (a && typeof a === 'object' && ['customer','coop','admin','regulator','shipper','system','carrier_sim','gateway_sim'].includes(a.kind) && 'name' in a) ? null : a) });
  return fn(...args);
}
export function capture<T>(fn: () => T): { value: T; commands: Command[] } {
  if (commands || results) throw new Error('Không chạy lồng thao tác.');
  commands = [];
  try { const value = fn(); return { value, commands }; }
  finally { commands = null; }
}
export function replay<T>(values: unknown[], fn: () => T): T {
  results = [...values];
  try { return fn(); } finally { results = null; }
}
