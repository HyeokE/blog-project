import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('save only updates permitted mutable columns on existing RPC-created response',()=>{
  const source=readFileSync(new URL('../src/app/api/craft/when-we-meet/[roomId]/route.ts',import.meta.url),'utf8');
  // Save now three-way-merges against the client's base and writes with optimistic concurrency on updated_at.
  assert.match(source,/\.update\(\{display_name:merged\.name,slots:merged\.slots\}\)\.eq\('room_id',roomId\)\.eq\('user_id',user\.id\)\.eq\('updated_at',current\.updatedAt\)/);
  assert.doesNotMatch(source,/\.upsert\(/);
  assert.doesNotMatch(source,/from\('wwm_responses'\)\.insert\(/);
  assert.doesNotMatch(source,/\.update\(\{[^}]*(?:room_id|user_id|owner_id)\s*:/,'save must not rewrite identity columns');
});
const sql=readFileSync(new URL('../supabase/migrations/20260929000000_wwm.sql',import.meta.url),'utf8');
test('isolates membership and owner-only writes',()=>{
  assert.match(sql,/wwm_private\.is_member\(id\)/);
  assert.match(sql,/wwm_private\.is_member\(room_id\)/);
  assert.match(sql,/wwm_responses_own_update[\s\S]*user_id=\(select auth\.uid\(\)\)/);
  assert.match(sql,/foreign key\(room_id,user_id\) references public\.wwm_members/);
  assert.doesNotMatch(sql,/using\s*\(\s*true\s*\)/i);
});
test('bounds data and never grants anonymous function access',()=>{
  assert.match(sql,/wwm_date_span check/);
  assert.match(sql,/wwm_slots_bounded check/);
  assert.match(sql,/Slot outside room schedule/);
  assert.match(sql,/revoke all on function public\.wwm_create_room[\s\S]*from public, anon/);
  assert.match(sql,/set search_path = ''/);
});
