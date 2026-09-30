import {ANALYTICS_EVENTS,ANALYTICS_WWM_OPERATIONS as OP,type AnalyticsWwmOperation} from '@/constants/analytics';
import {trackEvent} from '@/utils/analytics';
import {safeReturnPath} from './return-path.mjs';
import {normalizeConfirmationResponse,type ConfirmRequestBody,type ConfirmUpdateBody} from './confirm-tab.mjs';
export type Room={id:string;ownerId?:string;role?:'ADMIN'|'MEMBER';title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string;inviteToken?:string};
export type Response={userId:string;displayName:string;slots:string[];updatedAt?:string};
export type Meeting={participantCount?:number|null;id:string;ownerId:string;title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string;createdAt:string;confirmationStatus?:string|null};
const base='/api/craft/when-we-meet';
/** Non-OK response. Still an Error (existing callers read `.message`); adds the HTTP status and the server's reconnect flag. */
export class ApiError extends Error{readonly status:number;readonly reconnect:boolean;constructor(message:string,status:number,reconnect=false){super(message);this.name='ApiError';this.status=status;this.reconnect=reconnect;}}
/** Reports the server outcome of one operation as `wwm_outcome`: operation, result, HTTP status and duration only. Never ids, names, titles, emails or slot lists; `detail` may add counts. Read-only loads report failures only. */
async function outcome<T>(operation:AnalyticsWwmOperation,run:()=>Promise<T>,detail?:(result:T)=>Record<string,number>,failuresOnly=false):Promise<T>{const started=Date.now();try{const result=await run();if(!failuresOnly)trackEvent(ANALYTICS_EVENTS.WWM_OUTCOME,{operation,result:'ok',duration_ms:Date.now()-started,...detail?.(result)});return result}catch(error){trackEvent(ANALYTICS_EVENTS.WWM_OUTCOME,{operation,result:'error',http_status:error instanceof ApiError?error.status:0,reconnect:error instanceof ApiError&&error.reconnect,duration_ms:Date.now()-started});throw error}}
export async function request<T>(url:string,body?:unknown,init?:{signal?:AbortSignal}):Promise<T>{const response=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:init?.signal});const result=await response.json().catch(()=>({}));if(!response.ok){throw new ApiError(typeof result.error==='string'&&result.error?result.error:`Request failed (${response.status}).`,response.status,result.reconnect===true);}return result as T;}
export async function signInWithGoogle(returnTo:string){trackEvent(ANALYTICS_EVENTS.WWM_OUTCOME,{operation:OP.SIGN_IN_START,result:'ok'});const target=new URL('/api/craft/auth/google',window.location.origin);target.searchParams.set('next',safeReturnPath(returnTo));window.location.assign(target.toString());}
/** Direct Google Calendar consent (separate from sign-in). Leaves the page for Google; returns to the room with `?calendar=<outcome>`. */
export async function connectGoogleCalendar(roomId:string,returnTo:string){const {authorizationUrl}=await outcome(OP.CALENDAR_CONNECT_START,()=>request<{authorizationUrl:string}>(`${base}/${encodeURIComponent(roomId)}/calendar/connect`,{returnTo}));const target=new URL(authorizationUrl);if(target.origin!=='https://accounts.google.com')throw new Error('Unexpected Google authorization URL.');window.location.assign(target.toString());}
export async function loadMeetings(){return outcome(OP.LOAD_MEETINGS,()=>request<{meetings:Meeting[];userId:string}>(base),undefined,true)}
export type CreateRoomInput=Pick<Room,'title'|'startDate'|'endDate'|'startTime'|'endTime'|'timezone'>;
export async function createRoom(input:CreateRoomInput,name:string){return outcome(OP.CREATE_ROOM,()=>request<{id:string;inviteToken:string}>(base,{...input,name}))}
export async function joinRoom(roomId:string,token:string,name:string){return outcome(OP.JOIN_ROOM,()=>request(`${base}/${encodeURIComponent(roomId)}`,{action:'join',token,name}))}
export async function loadRoom(roomId:string){const result=await outcome(OP.LOAD_ROOM,()=>request<{room:Room;responses:Response[];userId:string}>(`${base}/${encodeURIComponent(roomId)}`),undefined,true);return {...result,responses:result.responses||[]};}
export async function saveResponse(roomId:string,name:string,slots:string[],baseline:{name:string;slots:string[]}){return outcome(OP.SAVE_RESPONSE,()=>request<{saved:boolean;value:{name:string;slots:string[];version:string}}>(`${base}/${encodeURIComponent(roomId)}`,{action:'save',name,slots,base:baseline}),r=>({slot_count:r.value?.slots?.length??0}))}
export type CalendarBusyPreview={availableSlotIds:string[];slotCount:number};
/** Preview only: slots free in the caller's own Google Calendar. Saves nothing. */
export async function loadCalendarBusy(roomId:string){return outcome(OP.CALENDAR_BUSY,()=>request<CalendarBusyPreview>(`${base}/${encodeURIComponent(roomId)}/calendar/busy`),r=>({slot_count:r.slotCount}))}
export async function loadConfirmation(roomId:string,signal?:AbortSignal){return outcome(OP.LOAD_CONFIRMATION,async()=>normalizeConfirmationResponse(await request<unknown>(`${base}/${encodeURIComponent(roomId)}/confirmation`,undefined,{signal})),undefined,true)}
/** Explicit owner action only: requests Google Calendar invitations. */
export async function postConfirmation(roomId:string,body:ConfirmRequestBody){return outcome(OP.CONFIRM_SEND,()=>request<{status:'confirmed'|'reconciling';url?:string;confirmation:unknown}>(`${base}/${encodeURIComponent(roomId)}/confirmation`,body))}
/** Explicit owner action only: edits the confirmed Google event and notifies its attendees. */
export async function postConfirmationUpdate(roomId:string,body:ConfirmUpdateBody){return outcome(OP.CONFIRM_UPDATE,()=>request<{status:'confirmed'|'reconciling';url?:string;confirmation:unknown;edit:unknown}>(`${base}/${encodeURIComponent(roomId)}/confirmation/update`,body))}
/** Explicit owner action only: asks Google to email the confirmed event's attendees again (server limits to once a minute). */
export async function resendConfirmation(roomId:string){return outcome(OP.CONFIRM_RESEND,()=>request<{status:'sent'}>(`${base}/${encodeURIComponent(roomId)}/confirmation/resend`,{}))}
/** Owner only: renames the meeting. Returns the stored (trimmed) title. */
export async function renameRoom(roomId:string,title:string){return outcome(OP.RENAME_ROOM,()=>request<{title:string}>(`${base}/${encodeURIComponent(roomId)}`,{action:'rename',title}))}
export type RoomSchedule=Pick<Room,'startDate'|'endDate'|'startTime'|'endTime'|'timezone'>;
/** Owner only: changes the dates/hours/timezone. The server removes saved availability outside the new window; a confirmed meeting is untouched. */
export async function updateRoomSchedule(roomId:string,schedule:RoomSchedule){return outcome(OP.UPDATE_SCHEDULE,()=>request<{schedule:RoomSchedule;removedSlots:number}>(`${base}/${encodeURIComponent(roomId)}`,{action:'schedule',...schedule}),r=>({removed_slots:r.removedSlots}))}
/** Owner only: deletes the meeting for everyone (the Google Calendar event, if any, is not cancelled). */
export async function deleteRoom(roomId:string){return outcome(OP.DELETE_ROOM,()=>request<{deleted:true}>(`${base}/${encodeURIComponent(roomId)}`,{action:'delete'}))}
export type InvitationPreview={title:string;startDate:string;endDate:string;timezone:string;organizerName:string|null};
/** Token-gated invitation context shown before sign-in; null when the link does not match a meeting. */
export async function loadInvitationPreview(roomId:string,token:string,signal?:AbortSignal){try{return (await outcome(OP.INVITATION_PREVIEW,()=>request<{preview:InvitationPreview}>(`${base}/${encodeURIComponent(roomId)}/invitation`,{token},{signal}))).preview}catch(error){if(error instanceof ApiError&&error.status===404)return null;throw error}}
