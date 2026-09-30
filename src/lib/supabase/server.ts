import {cookies,headers} from 'next/headers';
import {roomForViewer} from '@/features/when-we-meet/room-permissions.mjs';
import {createServerClient} from '@supabase/ssr';
import {normalizeRoom,normalizeResponses} from '@/features/when-we-meet/normalize.mjs';

export async function serverSupabaseClient({readOnly=false}:{readOnly?:boolean}={}) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key){throw new Error('Supabase is not configured.');}
  const store=await cookies();
  const host=(await headers()).get('x-forwarded-host')||(await headers()).get('host');
  const secure=host==='macmini-home.taile6a871.ts.net:8446'||host==='macmini-home.taile6a871.ts.net';
  return createServerClient(url,key,{cookies:{
    getAll(){return store.getAll()},
    // Proxy refreshes and forwards request cookies before Server Components render.
    // Route Handlers retain the writable adapter for OAuth exchange and sign-out.
    setAll(values){if(!readOnly)for(const {name,value,options} of values){store.set(name,value,{...options,httpOnly:true,secure,sameSite:'lax',path:'/'});}}
  }});
}
export async function currentSupabaseUser() {
  const client=await serverSupabaseClient({readOnly:true});
  const {data:{user},error}=await client.auth.getUser();
  if(error&&error.name!=='AuthSessionMissingError'){throw new Error('Account verification unavailable.');}
  return {client,user:user||null};
}

// Request-scoped reads; never cache private RLS results across identities.
export async function ownedCraftMeetings(context?:Awaited<ReturnType<typeof currentSupabaseUser>>){
 const {client,user}=context||await currentSupabaseUser();
 if(!user){return {meetings:[],userId:null};}
 const {data,error}=await client.from('wwm_rooms').select('id,owner_id,title,start_date,end_date,start_time,end_time,timezone,created_at').order('created_at',{ascending:false});
 if(error){throw new Error('Could not load meetings.');}
 const {data:counts,error:countError}=await client.rpc('wwm_participant_counts');
 const totals=new Map<string,number>((countError?[]:counts||[]).map((row:{room_id:string;participant_count:number|string})=>[row.room_id,Number(row.participant_count)]));
 return {meetings:(data||[]).map(meeting=>({...meeting,participant_count:totals.has(meeting.id)?totals.get(meeting.id)!:null})),userId:user.id};
}
export async function craftRoomMetadata(roomId:string,context:Awaited<ReturnType<typeof currentSupabaseUser>>){
 const {client,user}=context;if(!user)return null;
 const {data:room,error}=await client.from('wwm_rooms').select('id,owner_id,title,start_date,end_date,start_time,end_time,timezone,invite_token').eq('id',roomId).single();
 if(error||!room)return null;
 return {room:roomForViewer(normalizeRoom(room),user.id),responses:[],userId:user.id};
}
export async function craftRoomResponses(roomId:string,context:Awaited<ReturnType<typeof currentSupabaseUser>>){
 const {data,error}=await context.client.from('wwm_responses').select('user_id,display_name,slots,updated_at').eq('room_id',roomId);
 if(error)throw new Error('Could not load availability.');
 return normalizeResponses(data||[]);
}
export async function craftRoom(roomId:string,context?:Awaited<ReturnType<typeof currentSupabaseUser>>){
 const {client,user}=context||await currentSupabaseUser();
 if(!user){return null;}
 const [{data:room,error:roomError},{data:responses,error:responsesError}]=await Promise.all([
  client.from('wwm_rooms').select('id,owner_id,title,start_date,end_date,start_time,end_time,timezone,invite_token').eq('id',roomId).single(),
  client.from('wwm_responses').select('user_id,display_name,slots,updated_at').eq('room_id',roomId)
 ]);
 if(roomError||!room){return null;}
 if(responsesError){throw new Error('Could not load room responses.');}
 return {room:roomForViewer(normalizeRoom(room),user.id),responses:normalizeResponses(responses||[]),userId:user.id};
}
