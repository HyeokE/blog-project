import {safeReturnPath} from './return-path.mjs';
import {normalizeRoom,normalizeResponses} from './normalize.mjs';
export type Room={id:string;owner_id?:string;role?:'ADMIN'|'MEMBER';title:string;start_date:string;end_date:string;start_time:string;end_time:string;timezone:string;invite_token?:string};
export type Response={user_id:string;display_name:string;slots:string[];updated_at?:string};
export type Meeting={participant_count?:number|null;id:string;owner_id:string;title:string;start_date:string;end_date:string;start_time:string;end_time:string;timezone:string;created_at:string};
const base='/api/craft/when-we-meet';
export async function request<T>(url:string,body?:unknown):Promise<T>{const response=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok){throw new Error(result.error||`Request failed (${response.status}).`);}return result as T;}
export async function signInWithGoogle(returnTo:string){const target=new URL('/api/craft/auth/google',window.location.origin);target.searchParams.set('next',safeReturnPath(returnTo));window.location.assign(target.toString());}
export async function loadMeetings(){return request<{meetings:Meeting[];userId:string}>(base)}
export async function createRoom(input:Omit<Room,'id'|'invite_token'>,name:string){return request<{id:string;invite_token:string}>(base,{...input,name});}
export async function joinRoom(roomId:string,token:string,name:string){return request(`${base}/${encodeURIComponent(roomId)}`,{action:'join',token,name});}
export async function loadRoom(roomId:string){const result=await request<{room:Room;responses:Response[];userId:string}>(`${base}/${encodeURIComponent(roomId)}`);return {...result,room:normalizeRoom(result.room) as Room,responses:normalizeResponses(result.responses||[]) as Response[]};}
export async function saveResponse(roomId:string,name:string,slots:string[],baseline:{name:string;slots:string[]}){return request<{saved:boolean;value:{name:string;slots:string[];version:string}}>(`${base}/${encodeURIComponent(roomId)}`,{action:'save',name,slots,base:baseline});}
