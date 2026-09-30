import {googleOAuthClient} from '../../lib/google-login.mjs';
// Google Calendar REST calls for the server only. `fetcher` is injectable for tests.
// `definite` = Google answered with a 4xx, so nothing was created; otherwise the outcome is unknown.
export class GoogleCalendarError extends Error{
 constructor(message,{status=null,definite=false,reconnect=false}={}){super(message);this.status=status;this.definite=definite;this.reconnect=reconnect;}
}
const API='https://www.googleapis.com/calendar/v3';
async function call(fetcher,url,init){
 try{return await fetcher(url,{...init,signal:AbortSignal.timeout(8000),cache:'no-store'});}
 catch{throw new GoogleCalendarError('Google Calendar did not respond',{definite:false});}
}
const fail=(response,message)=>new GoogleCalendarError(message,{status:response.status,definite:response.status>=400&&response.status<500});
/** Refreshes use the unified sign-in/Calendar OAuth client; tokens from an earlier client fail with unauthorized_client -> reconnect. */
export function calendarClientConfig(env=process.env){
 try{return googleOAuthClient(env)}catch{throw new GoogleCalendarError('Calendar configuration unavailable')}
}
export async function refreshAccessToken(refreshToken,config,fetcher=fetch){
 const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:refreshToken,client_id:config.clientId,client_secret:config.clientSecret});
 const response=await call(fetcher,'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){
  // invalid_grant: revoked/expired; unauthorized_client: token issued to a previous OAuth client.
  const reconnect=data?.error==='invalid_grant'||data?.error==='unauthorized_client'||response.status===401;
  throw new GoogleCalendarError('Google Calendar access expired',{status:response.status,definite:true,reconnect});
 }
 if(typeof data.access_token!=='string'||!data.access_token)throw new GoogleCalendarError('Google Calendar access unavailable');
 return data.access_token;
}
export async function getEvent(accessToken,eventId,fetcher=fetch){
 const response=await call(fetcher,`${API}/calendars/primary/events/${encodeURIComponent(eventId)}`,{headers:{Authorization:`Bearer ${accessToken}`}});
 if(response.status===404||response.status===410)return null;
 if(!response.ok)throw new GoogleCalendarError('Could not check the calendar event',{status:response.status,definite:false});
 return response.json();
}
export async function insertEvent(accessToken,event,fetcher=fetch){
 const response=await call(fetcher,`${API}/calendars/primary/events?sendUpdates=all`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(event)});
 if(!response.ok)throw fail(response,'Google Calendar rejected the event');
 return response.json();
}
/** Edits the SAME event (patch semantics: given arrays replace existing ones) and notifies guests.
 * https://developers.google.com/workspace/calendar/api/v3/reference/events/patch (sendUpdates=all).
 * `etag` makes the write conditional (If-Match); a 412 is a definite "nothing changed". */
export async function patchEvent(accessToken,eventId,patch,fetcher=fetch,{etag}={}){
 const headers={Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',...(etag?{'If-Match':etag}:{})};
 const response=await call(fetcher,`${API}/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,{method:'PATCH',headers,body:JSON.stringify(patch)});
 if(!response.ok)throw fail(response,'Google Calendar rejected the change');
 return response.json();
}
const DAY=86400000;
// Midnight of an all-day date in `timeZone`, as a UTC instant (two passes settle DST offsets).
function zonedMidnight(date,timeZone){
 const offset=at=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(at)).map(x=>[x.type,x.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-at;};
 const wall=Date.parse(`${date}T00:00:00Z`);let at=wall-offset(wall);at=wall-offset(at);return at;
}
/** Busy intervals the user would actually be unavailable for. Multi-day all-day events
 * (trips, exhibitions, sprints) are ignored by product decision; single all-day events still count. */
export function busyFromEvents(items,timeZone){
 return items.flatMap(event=>{
  if(event.status==='cancelled'||event.transparency==='transparent')return [];
  if(event.attendees?.some(a=>a.self&&a.responseStatus==='declined'))return [];
  if(event.start?.date){
   if(Date.parse(event.end.date)-Date.parse(event.start.date)>DAY)return [];
   return [{start:new Date(zonedMidnight(event.start.date,timeZone)).toISOString(),end:new Date(zonedMidnight(event.end.date,timeZone)).toISOString()}];
  }
  const start=Date.parse(event.start?.dateTime),end=Date.parse(event.end?.dateTime);
  return Number.isFinite(start)&&Number.isFinite(end)&&end>start?[{start:new Date(start).toISOString(),end:new Date(end).toISOString()}]:[];
 });
}
export async function listEventBusy(accessToken,{timeMin,timeMax,timeZone},fetcher=fetch){
 const items=[];let pageToken='';
 for(let page=0;page<10;page++){
  const url=new URL(`${API}/calendars/primary/events`);
  for(const [k,v] of Object.entries({singleEvents:'true',timeMin,timeMax,maxResults:'250',fields:'nextPageToken,items(status,transparency,start,end,attendees(self,responseStatus))'}))url.searchParams.set(k,v);
  if(pageToken)url.searchParams.set('pageToken',pageToken);
  const response=await call(fetcher,url.toString(),{headers:{Authorization:`Bearer ${accessToken}`}});
  if(!response.ok)throw fail(response,'Could not read your calendar');
  const data=await response.json();items.push(...(data.items||[]));
  if(!data.nextPageToken)return busyFromEvents(items,timeZone);
  pageToken=data.nextPageToken;
 }
 throw new GoogleCalendarError('Too many calendar events to read',{definite:true});
}
