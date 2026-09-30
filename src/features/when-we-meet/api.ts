import {safeReturnPath} from './return-path.mjs';
import {normalizeConfirmationResponse,type ConfirmRequestBody,type ConfirmUpdateBody} from './confirm-tab.mjs';
export type Room={id:string;ownerId?:string;role?:'ADMIN'|'MEMBER';title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string;inviteToken?:string};
export type Response={userId:string;displayName:string;slots:string[];updatedAt?:string};
export type Meeting={participantCount?:number|null;id:string;ownerId:string;title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string;createdAt:string;confirmationStatus?:string|null};
const base='/api/craft/when-we-meet';
/** Non-OK response. Still an Error (existing callers read `.message`); adds the HTTP status and the server's reconnect flag. */
export class ApiError extends Error{readonly status:number;readonly reconnect:boolean;constructor(message:string,status:number,reconnect=false){super(message);this.name='ApiError';this.status=status;this.reconnect=reconnect;}}
export async function request<T>(url:string,body?:unknown,init?:{signal?:AbortSignal}):Promise<T>{const response=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:init?.signal});const result=await response.json().catch(()=>({}));if(!response.ok){throw new ApiError(typeof result.error==='string'&&result.error?result.error:`Request failed (${response.status}).`,response.status,result.reconnect===true);}return result as T;}
export async function signInWithGoogle(returnTo:string){const target=new URL('/api/craft/auth/google',window.location.origin);target.searchParams.set('next',safeReturnPath(returnTo));window.location.assign(target.toString());}
/** Direct Google Calendar consent (separate from sign-in). Leaves the page for Google; returns to the room with `?calendar=<outcome>`. */
export async function connectGoogleCalendar(roomId:string,returnTo:string){const {authorizationUrl}=await request<{authorizationUrl:string}>(`${base}/${encodeURIComponent(roomId)}/calendar/connect`,{returnTo});const target=new URL(authorizationUrl);if(target.origin!=='https://accounts.google.com')throw new Error('Unexpected Google authorization URL.');window.location.assign(target.toString());}
export async function loadMeetings(){return request<{meetings:Meeting[];userId:string}>(base)}
export type CreateRoomInput=Pick<Room,'title'|'startDate'|'endDate'|'startTime'|'endTime'|'timezone'>;
export async function createRoom(input:CreateRoomInput,name:string){return request<{id:string;inviteToken:string}>(base,{...input,name});}
export async function joinRoom(roomId:string,token:string,name:string){return request(`${base}/${encodeURIComponent(roomId)}`,{action:'join',token,name});}
export async function loadRoom(roomId:string){const result=await request<{room:Room;responses:Response[];userId:string}>(`${base}/${encodeURIComponent(roomId)}`);return {...result,responses:result.responses||[]};}
export async function saveResponse(roomId:string,name:string,slots:string[],baseline:{name:string;slots:string[]}){return request<{saved:boolean;value:{name:string;slots:string[];version:string}}>(`${base}/${encodeURIComponent(roomId)}`,{action:'save',name,slots,base:baseline});}
export type CalendarBusyPreview={availableSlotIds:string[];slotCount:number};
/** Preview only: slots free in the caller's own Google Calendar. Saves nothing. */
export async function loadCalendarBusy(roomId:string){return request<CalendarBusyPreview>(`${base}/${encodeURIComponent(roomId)}/calendar/busy`);}
export async function loadConfirmation(roomId:string,signal?:AbortSignal){return normalizeConfirmationResponse(await request<unknown>(`${base}/${encodeURIComponent(roomId)}/confirmation`,undefined,{signal}));}
/** Explicit owner action only: requests Google Calendar invitations. */
export async function postConfirmation(roomId:string,body:ConfirmRequestBody){return request<{status:'confirmed'|'reconciling';url?:string;confirmation:unknown}>(`${base}/${encodeURIComponent(roomId)}/confirmation`,body);}
/** Explicit owner action only: edits the confirmed Google event and notifies its attendees. */
export async function postConfirmationUpdate(roomId:string,body:ConfirmUpdateBody){return request<{status:'confirmed'|'reconciling';url?:string;confirmation:unknown;edit:unknown}>(`${base}/${encodeURIComponent(roomId)}/confirmation/update`,body);}
/** Explicit owner action only: asks Google to email the confirmed event's attendees again (server limits to once a minute). */
export async function resendConfirmation(roomId:string){return request<{status:'sent'}>(`${base}/${encodeURIComponent(roomId)}/confirmation/resend`,{});}
/** Owner only: renames the meeting. Returns the stored (trimmed) title. */
export async function renameRoom(roomId:string,title:string){return request<{title:string}>(`${base}/${encodeURIComponent(roomId)}`,{action:'rename',title});}
