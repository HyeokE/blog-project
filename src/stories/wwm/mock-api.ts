// Storybook-only synthetic transport. Never forwards requests.
import {normalizeConfirmationResponse} from '@/features/when-we-meet/confirm-tab.mjs';
export type Room={id:string;ownerId?:string;role?:'ADMIN'|'MEMBER';title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string;inviteToken?:string};
export type Response={userId:string;displayName:string;slots:string[];updatedAt?:string};
export type Meeting=Room & {ownerId:string;createdAt:string};
export type Person={userId:string;displayName:string;isAdmin:boolean;hasAvailability:boolean};
export const state={people:[{userId:'11111111-1111-4111-8111-111111111111',displayName:'Alex Sample',isAdmin:true,hasAvailability:true},{userId:'33333333-3333-4333-8333-333333333333',displayName:'Morgan Sample',isAdmin:false,hasAvailability:true},{userId:'44444444-4444-4444-8444-444444444444',displayName:'Taylor Sample',isAdmin:false,hasAvailability:false}] as Person[],peopleFailure:false,failure:false,delay:0,create:'failure' as 'failure'|'pending'|'success',save:'success' as 'success'|'pending'|'failure',join:'success' as 'success'|'pending'|'failure',connected:false,message:'Synthetic network failure. Please retry.',room:null as Room|null,responses:[] as Response[],userId:'11111111-1111-4111-8111-111111111111'};
// Calendar autofill + confirmation fixtures (synthetic; nothing is sent anywhere).
export type ConfirmationPayload={confirmation:null|{status:string;title:string;startsAt:string;endsAt:string;timezone:string;googleEventUrl:string|null};review:null|{calendarConnected:boolean;organizerEmail:string|null;attendees:Array<{userId:string;name:string;email:string|null;hasAvailability:boolean;isOrganizer:boolean}>}};
export const calendar={busy:'free' as 'free'|'pending'|'reconnect'|'error',busyIds:[] as string[],slotCount:0,confirmation:{confirmation:null,review:null} as ConfirmationPayload,confirmationLoad:'success' as 'success'|'pending'|'failure',post:'reconciling' as 'confirmed'|'reconciling'|'pending'|'reconnect'|'google',posts:[] as unknown[]};
export function resetCalendar(){Object.assign(calendar,{busy:'free',busyIds:[],slotCount:0,confirmation:{confirmation:null,review:null},confirmationLoad:'success',post:'reconciling',posts:[]});}
export class ApiError extends Error{readonly status:number;readonly reconnect:boolean;constructor(message:string,status:number,reconnect=false){super(message);this.name='ApiError';this.status=status;this.reconnect=reconnect;}}
export async function loadCalendarBusy(){if(calendar.busy==='pending')return pending();if(calendar.busy==='reconnect')throw new ApiError('Connect Google Calendar to fill from your calendar.',409,true);if(calendar.busy==='error')throw new ApiError('Could not read your calendar.',502);await new Promise(r=>setTimeout(r,150));return {availableSlotIds:calendar.busyIds,slotCount:calendar.slotCount};}
export async function loadConfirmation(){if(calendar.confirmationLoad==='pending')return pending();if(calendar.confirmationLoad==='failure')throw new ApiError('Could not load the confirmation.',502);return normalizeConfirmationResponse(calendar.confirmation);}
export async function postConfirmation(_roomId:string,body:unknown){calendar.posts.push(body);if(calendar.post==='pending')return pending();await new Promise(r=>setTimeout(r,300));if(calendar.post==='reconnect')throw new ApiError('Connect Google Calendar to send invitations.',409,true);if(calendar.post==='google')throw new ApiError('Google Calendar rejected the invitation. Nothing was sent.',502);const b=body as {title:string;start:string;end:string};const confirmation={status:calendar.post,title:b.title,startsAt:b.start,endsAt:b.end,timezone:'Asia/Seoul',googleEventUrl:calendar.post==='confirmed'?'https://calendar.google.com/calendar/event?eid=storybook':null};calendar.confirmation={...calendar.confirmation,confirmation};return calendar.post==='confirmed'?{status:'confirmed' as const,url:confirmation.googleEventUrl!,confirmation}:{status:'reconciling' as const,confirmation};}
export function reset(){resetCalendar();Object.assign(state,{people:[{userId:state.userId,displayName:'Alex Sample',isAdmin:true,hasAvailability:true},{userId:'33333333-3333-4333-8333-333333333333',displayName:'Morgan Sample',isAdmin:false,hasAvailability:true},{userId:'44444444-4444-4444-8444-444444444444',displayName:'Taylor Sample',isAdmin:false,hasAvailability:false}],peopleFailure:false,failure:false,delay:0,create:'failure',save:'success',join:'success',connected:false,message:'Synthetic network failure. Please retry.',room:null,responses:[]});}
export function mockPeopleFetch(url:string,init?:RequestInit):Promise<globalThis.Response>|null{
 if(!/^\/api\/craft\/when-we-meet\/[0-9a-f-]{36}\/people$/.test(url))return null;
 if(init?.signal?.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
 return Promise.resolve(globalThis.Response.json(state.peopleFailure?{error:state.message}:{people:state.people},{status:state.peopleFailure?403:200}));
}
const pending=()=>new Promise<never>(()=>{});
export async function request<T>():Promise<T>{throw new Error('Network disabled in Storybook');}
export async function signInWithGoogle(){throw new Error('Google sign-in is disabled in Storybook');}
export async function loadMeetings(){return {meetings:[],userId:state.userId};}
export async function createRoom(){if(state.create==='pending')return pending();if(state.create==='failure')throw new Error(state.message);return {id:'22222222-2222-4222-8222-222222222222',inviteToken:'storybook-only'};}
export async function joinRoom(){if(state.join==='pending')return pending();if(state.failure||state.join==='failure')throw new Error(state.message);}
export async function loadRoom(){if(!state.room)throw new Error('Meeting not found or access denied.');return {room:state.room,responses:state.responses,userId:state.userId};}
export async function saveResponse(_roomId:string,name:string,slots:string[]){if(state.save==='pending')return pending();if(state.failure||state.save==='failure')throw new Error(state.message);return {saved:true,value:{name,slots,version:'2026-09-30T00:00:01.000Z'}};}
export class MockEventSource extends EventTarget{
 onerror:((event:Event)=>void)|null=null;onmessage=null;readyState=0;url:string;withCredentials=false;timer:ReturnType<typeof setTimeout>;
 constructor(url:string|URL){super();this.url=String(url);this.timer=setTimeout(()=>{if(state.connected){this.readyState=1;this.dispatchEvent(new MessageEvent('availability',{data:JSON.stringify({userId:state.userId,responses:state.responses})}));}else this.onerror?.(new Event('error'));},50);}
 close(){clearTimeout(this.timer);this.readyState=2;}
}
