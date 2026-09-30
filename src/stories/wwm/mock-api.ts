// Storybook-only synthetic transport. Never forwards requests.
export type Room={id:string;owner_id?:string;role?:'ADMIN'|'MEMBER';title:string;start_date:string;end_date:string;start_time:string;end_time:string;timezone:string;invite_token?:string};
export type Response={user_id:string;display_name:string;slots:string[];updated_at?:string};
export type Meeting=Room & {owner_id:string;created_at:string};
export type Person={user_id:string;display_name:string;is_admin:boolean;has_availability:boolean};
export const state={people:[{user_id:'11111111-1111-4111-8111-111111111111',display_name:'Alex Sample',is_admin:true,has_availability:true},{user_id:'33333333-3333-4333-8333-333333333333',display_name:'Morgan Sample',is_admin:false,has_availability:true},{user_id:'44444444-4444-4444-8444-444444444444',display_name:'Taylor Sample',is_admin:false,has_availability:false}] as Person[],peopleFailure:false,failure:false,delay:0,create:'failure' as 'failure'|'pending'|'success',save:'success' as 'success'|'pending'|'failure',join:'success' as 'success'|'pending'|'failure',connected:false,message:'Synthetic network failure. Please retry.',room:null as Room|null,responses:[] as Response[],userId:'11111111-1111-4111-8111-111111111111'};
export function reset(){Object.assign(state,{people:[{user_id:state.userId,display_name:'Alex Sample',is_admin:true,has_availability:true},{user_id:'33333333-3333-4333-8333-333333333333',display_name:'Morgan Sample',is_admin:false,has_availability:true},{user_id:'44444444-4444-4444-8444-444444444444',display_name:'Taylor Sample',is_admin:false,has_availability:false}],peopleFailure:false,failure:false,delay:0,create:'failure',save:'success',join:'success',connected:false,message:'Synthetic network failure. Please retry.',room:null,responses:[]});}
export function mockPeopleFetch(url:string,init?:RequestInit):Promise<globalThis.Response>|null{
 if(!/^\/api\/craft\/when-we-meet\/[0-9a-f-]{36}\/people$/.test(url))return null;
 if(init?.signal?.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
 return Promise.resolve(globalThis.Response.json(state.peopleFailure?{error:state.message}:{people:state.people},{status:state.peopleFailure?403:200}));
}
const pending=()=>new Promise<never>(()=>{});
export async function request<T>():Promise<T>{throw new Error('Network disabled in Storybook');}
export async function signInWithGoogle(){throw new Error('Google sign-in is disabled in Storybook');}
export async function loadMeetings(){return {meetings:[],userId:state.userId};}
export async function createRoom(){if(state.create==='pending')return pending();if(state.create==='failure')throw new Error(state.message);return {id:'22222222-2222-4222-8222-222222222222',invite_token:'storybook-only'};}
export async function joinRoom(){if(state.join==='pending')return pending();if(state.failure||state.join==='failure')throw new Error(state.message);}
export async function loadRoom(){if(!state.room)throw new Error('Meeting not found or access denied.');return {room:state.room,responses:state.responses,userId:state.userId};}
export async function saveResponse(_roomId:string,name:string,slots:string[]){if(state.save==='pending')return pending();if(state.failure||state.save==='failure')throw new Error(state.message);return {saved:true,value:{name,slots,version:'2026-09-30T00:00:01.000Z'}};}
export class MockEventSource extends EventTarget{
 onerror:((event:Event)=>void)|null=null;onmessage=null;readyState=0;url:string;withCredentials=false;timer:ReturnType<typeof setTimeout>;
 constructor(url:string|URL){super();this.url=String(url);this.timer=setTimeout(()=>{if(state.connected){this.readyState=1;this.dispatchEvent(new MessageEvent('availability',{data:JSON.stringify({userId:state.userId,responses:state.responses})}));}else this.onerror?.(new Event('error'));},50);}
 close(){clearTimeout(this.timer);this.readyState=2;}
}
