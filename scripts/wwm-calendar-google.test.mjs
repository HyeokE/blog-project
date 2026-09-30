import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshAccessToken,getEvent,insertEvent,GoogleCalendarError} from '../src/features/when-we-meet/calendar-google.mjs';

const json=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
const config={clientId:'client',clientSecret:'secret'};

test('refresh exchanges the stored refresh token and returns only the access token',async()=>{
 let seen;
 const token=await refreshAccessToken('refresh-1',config,async(url,init)=>{seen={url,body:String(init.body)};return json(200,{access_token:'access-1',expires_in:3599,scope:'x'});});
 assert.equal(token,'access-1');
 assert.equal(seen.url,'https://oauth2.googleapis.com/token');
 const body=new URLSearchParams(seen.body);
 assert.equal(body.get('grant_type'),'refresh_token');
 assert.equal(body.get('refresh_token'),'refresh-1');
 assert.equal(body.get('client_id'),'client');
});

test('revoked or expired grants surface as reconnect-required',async()=>{
 await assert.rejects(refreshAccessToken('dead',config,async()=>json(400,{error:'invalid_grant'})),e=>e instanceof GoogleCalendarError&&e.reconnect===true);
});

test('getEvent returns null only for a missing event',async()=>{
 assert.equal(await getEvent('access','abcde',async()=>json(404,{})),null);
 const event=await getEvent('access','abcde',async url=>{assert.match(url,/calendars\/primary\/events\/abcde$/);return json(200,{id:'abcde',status:'confirmed'});});
 assert.equal(event.id,'abcde');
 await assert.rejects(getEvent('access','abcde',async()=>json(500,{})),e=>e.definite===false);
});

test('insertEvent sends invitations and marks 4xx as definite, 5xx as ambiguous',async()=>{
 let url;
 await insertEvent('access',{id:'abcde',summary:'x'},async u=>{url=u;return json(200,{id:'abcde'});});
 assert.match(url,/calendars\/primary\/events\?sendUpdates=all$/);
 await assert.rejects(insertEvent('access',{id:'abcde'},async()=>json(409,{})),e=>e.status===409&&e.definite===true);
 await assert.rejects(insertEvent('access',{id:'abcde'},async()=>json(400,{})),e=>e.definite===true);
 await assert.rejects(insertEvent('access',{id:'abcde'},async()=>json(503,{})),e=>e.definite===false);
 await assert.rejects(insertEvent('access',{id:'abcde'},async()=>{throw new Error('timeout')}),e=>e.definite===false);
});

import {busyFromEvents,listEventBusy} from '../src/features/when-we-meet/calendar-google.mjs';
test('busy intervals come from opaque events; multi-day all-day, free, cancelled and declined events are ignored',()=>{
 const busy=busyFromEvents([
  {status:'confirmed',start:{dateTime:'2026-10-01T10:00:00+09:00'},end:{dateTime:'2026-10-01T11:00:00+09:00'}},
  {status:'confirmed',start:{date:'2026-09-23'},end:{date:'2027-03-02'}},
  {status:'confirmed',start:{date:'2026-10-02'},end:{date:'2026-10-03'}},
  {status:'confirmed',transparency:'transparent',start:{dateTime:'2026-10-01T12:00:00+09:00'},end:{dateTime:'2026-10-01T13:00:00+09:00'}},
  {status:'cancelled',start:{dateTime:'2026-10-01T14:00:00+09:00'},end:{dateTime:'2026-10-01T15:00:00+09:00'}},
  {status:'confirmed',attendees:[{self:true,responseStatus:'declined'}],start:{dateTime:'2026-10-01T16:00:00+09:00'},end:{dateTime:'2026-10-01T17:00:00+09:00'}},
 ],'Asia/Seoul');
 assert.deepEqual(busy,[
  {start:'2026-10-01T01:00:00.000Z',end:'2026-10-01T02:00:00.000Z'},
  {start:'2026-10-01T15:00:00.000Z',end:'2026-10-02T15:00:00.000Z'},
 ]);
});

test('event listing follows pages and expands recurring events',async()=>{
 const urls=[];
 const busy=await listEventBusy('access',{timeMin:'2026-10-01T00:00:00.000Z',timeMax:'2026-10-02T00:00:00.000Z',timeZone:'Asia/Seoul'},async url=>{urls.push(url);return json(200,urls.length===1?{nextPageToken:'p2',items:[{status:'confirmed',start:{dateTime:'2026-10-01T01:00:00Z'},end:{dateTime:'2026-10-01T02:00:00Z'}}]}:{items:[]});});
 assert.equal(busy.length,1);
 assert.match(urls[0],/singleEvents=true/);
 assert.match(urls[1],/pageToken=p2/);
});
