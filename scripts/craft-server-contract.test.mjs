import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../src/',import.meta.url);
test('server API validates request identity and keeps user RLS',async()=>{
 const server=await readFile(new URL('lib/supabase/server.ts',root),'utf8');
 assert.match(server,/createServerClient/);assert.match(server,/getUser\(\)/);assert.doesNotMatch(server,/SERVICE_ROLE|service_role/);
 const route=await readFile(new URL('app/api/craft/when-we-meet/route.ts',root),'utf8');
 assert.match(route,/export async function GET/);assert.match(route,/export async function POST/);assert.match(route,/ownedCraftMeetings\(context\)/);
 const migration=await readFile(new URL('../supabase/migrations/20260929000000_wwm.sql',root),'utf8');
 assert.match(migration,/wwm_rooms_member_read[\s\S]*wwm_private\.is_member\(id\)/);
 assert.match(server,/client\.from\('wwm_rooms'\)\.select\('id,owner_id,title,[^']+'\)\.order\('created_at'/);
 assert.doesNotMatch(server,/\.eq\('owner_id',user\.id\)/);
});
test('browser adapter has no direct table or rpc request',async()=>{
 const adapter=await readFile(new URL('features/when-we-meet/api.ts',root),'utf8');
 assert.doesNotMatch(adapter,/\.from\(|\.rpc\(/);assert.match(adapter,/\/api\/craft\/when-we-meet/);
});
