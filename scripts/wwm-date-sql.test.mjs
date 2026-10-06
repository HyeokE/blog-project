import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const path = new URL('../supabase/migrations/20261006000000_wwm_date_mode.sql', import.meta.url);
const sql = existsSync(path) ? readFileSync(path, 'utf8') : '';
const body = name => {
  const match = sql.match(new RegExp(`create or replace function ${name.replaceAll('.', '\\.')}\\([\\s\\S]*?\\$\\$;`, 'i'));
  assert.ok(match, `Missing function ${name}`);
  return match[0];
};
const has = (text, patterns) => patterns.forEach(pattern => assert.match(text, pattern));
test('additive mode default preserves time rooms and requires exclusive time columns', () => has(sql, [/begin;/i, /schedule_mode text not null default 'time'/, /schedule_mode in \('time','date'\)/, /alter column start_time drop not null/, /alter column end_time drop not null/, /schedule_mode='time' and start_time is not null and end_time is not null/, /schedule_mode='date' and start_time is null and end_time is null/, /commit;/i]));
test('room mode immutable and date room rejects timed schedule columns', () => has(body('wwm_private.validate_room_mode'), [/new.schedule_mode is distinct from old.schedule_mode/, /Schedule mode is immutable/, /new.schedule_mode='date'/, /new.start_time is not null or new.end_time is not null/]));
test('exclusive flat dates and both old slot constraints consistently 1344', () => has(sql, [/available_dates date\[\] not null default '\{\}'/, /cardinality\(available_dates\)<=28/, /array_ndims\(available_dates\)=1/, /array_lower\(available_dates,1\)=1/, /array_position\(available_dates,null\) is null/, /cardinality\(available_dates\)=0 or cardinality\(slots\)=0/, /drop constraint wwm_slots_bounded/, /add constraint wwm_slots_bounded check \(cardinality\(slots\)<=1344\)/, /add constraint wwm_slots_flat_bounded/, /cardinality\(slots\)<=1344/]));
test('response trigger locks room, validates civil dates and retains timed half hours', () => has(body('wwm_private.validate_slots'), [/for update/, /r.schedule_mode='date'/, /cardinality\(new.slots\)<>0/, /cardinality\(new.available_dates\)<>0/, /count\(distinct date_value\)/, /d < r.start_date or d > r.end_date/, /cardinality\(new.slots\)>1344/, /at time zone r.timezone/, /extract\(minute from local_slot\)/, /extract\(second from local_slot\)/, /clock_timestamp\(\)/, /old.updated_at \+ interval '1 microsecond'/]));
test('date create validates authentication timezone today and atomic owner response', () => has(body('public.wwm_create_date_room'), [/p_title text,p_start_date date,p_end_date date,p_timezone text,p_name text/, /returns jsonb/, /auth.uid\(\) is null or not wwm_private.is_google\(\)/, /validate_date_schedule/, /Dates in the past/, /insert into public.wwm_members/, /insert into public.wwm_responses/, /'id',r.id,'invite_token',r.invite_token/]));
test('save dates own member only raw timestamptz CAS name and dates atomic', () => has(body('public.wwm_save_dates'), [/p_expected_updated_at timestamptz/, /returns table\(updated_at timestamptz\)/, /wwm_private.is_member\(p_room_id\)/, /for update/, /r.schedule_mode<>'date'/, /v_response.updated_at is distinct from p_expected_updated_at/, /Availability conflict.*errcode='40001'/, /set display_name=p_name,available_dates=p_available_dates/, /a.user_id=auth.uid\(\)/]));
test('date schedule owner only historical start exception trims civil dates never generates slots', () => { const s=body('public.wwm_update_date_schedule'); has(s, [/returns table\(start_date date,end_date date,timezone text,removed_dates integer\)/, /r.owner_id<>auth.uid\(\)/, /for update/, /r.schedule_mode<>'date'/, /p_start_date<>r.start_date/, /d between p_start_date and p_end_date/, /set available_dates=t.after/, /sum\(lost\)/]); assert.doesNotMatch(s, /generate_series|at time zone.*unnest|wwm_confirmations/); });
test('shared schedule validator rejects null infinite invalid timezone and >28 days', () => has(body('wwm_private.validate_date_schedule'), [/p_start_date is null/, /not isfinite\(p_start_date\)/, /p_end_date>=p_start_date\+28/, /pg_catalog.pg_timezone_names/, /Invalid timezone/, /char_length\(tz\) not between 1 and 64/]));
test('civil domain explicitly bounds both schedule endpoints and every response date', () => {
  const schedule = body('wwm_private.validate_date_schedule');
  for (const endpoint of ['p_start_date', 'p_end_date']) {
    has(schedule, [new RegExp(`${endpoint} < date '0001-01-01'`), new RegExp(`${endpoint} > date '9999-12-31'`)]);
  }
  has(body('wwm_private.validate_slots'), [/d < date '0001-01-01'/, /d > date '9999-12-31'/]);
});
test('timed schedule retains signature and explicit date guard before writes', () => { const s=body('public.wwm_update_room_schedule'); has(s, [/p_start_time time,p_end_time time/, /removed_slots integer/, /r.schedule_mode<>'time'/, /p_end_date>=p_start_date\+28/, /set slots=t.after/]); assert.ok(s.indexOf("r.schedule_mode<>'time'")<s.indexOf('update public.wwm_rooms')); assert.doesNotMatch(sql, /create or replace function public\.wwm_create_room\(/); });
test('authorized LEFT JOIN roster availability branches by room mode', () => { for(const name of ['public.wwm_room_people','public.wwm_confirmation_attendees']) has(body(name), [/auth.uid\(\) is null/, /wwm_private.is_google\(\)/, /left join public.wwm_responses/, /case when r.schedule_mode='date' then cardinality\(a.available_dates\) else cardinality\(a.slots\) end/]); has(body('public.wwm_room_people'), [/wwm_private.is_member\(p_room_id\)/]); has(body('public.wwm_confirmation_attendees'), [/r.owner_id=auth.uid\(\)/]); });
test('PLpgSQL SQL aliases cannot collide with scalar or record locals', () => {
  const trigger = body('wwm_private.validate_slots');
  assert.doesNotMatch(trigger, /count\(distinct d\).*unnest\(new.available_dates\) d/);
  const save = body('public.wwm_save_dates');
  assert.doesNotMatch(save, /declare[^;]*; a public\.wwm_responses/);
  has(save, [/v_response.updated_at is distinct from p_expected_updated_at/]);
});
test('timed schedule replacement differs from last migration only by explicit mode guard', () => {
  const previous = readFileSync(new URL('../supabase/migrations/20261001030000_wwm_four_week_range.sql', import.meta.url), 'utf8');
  const oldBody = previous.match(/create or replace function public\.wwm_update_room_schedule\([\s\S]*?\$\$;/)[0];
  const actual = body('public.wwm_update_room_schedule').replace("  if r.schedule_mode<>'time' then raise exception 'Time room required' using errcode='22023'; end if;\n", '');
  assert.equal(actual, oldBody);
});
test('RPCs empty search_path least privilege grants and internal helper deny', () => { for (const [name,sig] of [['wwm_create_date_room','text,date,date,text,text'],['wwm_save_dates','uuid,text,date[],timestamptz'],['wwm_update_date_schedule','uuid,date,date,text'],['wwm_room_people','uuid'],['wwm_confirmation_attendees','uuid']]) { has(body(`public.${name}`), [/security definer set search_path = ''/]); assert.ok(sql.includes(`revoke all on function public.${name}(${sig}) from public,anon;`)); assert.ok(sql.includes(`grant execute on function public.${name}(${sig}) to authenticated;`)); } has(sql, [/revoke all on function wwm_private.validate_date_schedule\(date,date,text\) from public,anon,authenticated/]); assert.doesNotMatch(sql,/to service_role|grant .*available_dates.*to authenticated/i); });
