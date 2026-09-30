import {currentSupabaseUser,craftRoom} from '@/lib/supabase/server';
import {uuid,failed,unauthorized} from '../../http';
export const dynamic='force-dynamic';
export const runtime='nodejs';
// Same-origin authenticated stream. Server checks RLS every second; clients never
// connect to Supabase directly. Reconnect periodically to revalidate authentication.
export async function GET(request:Request,{params}:{params:Promise<{roomId:string}>}){
 const {roomId}=await params;if(!uuid(roomId))return failed('Invalid meeting.',400);
 const context=await currentSupabaseUser();if(!context.user)return unauthorized();
 const initial=await craftRoom(roomId,context);if(!initial)return failed('Meeting unavailable.',403);
 let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,closeStream:()=>void=()=>{};
 const encoder=new TextEncoder();
 const stop=()=>{if(stopped)return;stopped=true;if(timer)clearTimeout(timer);request.signal.removeEventListener('abort',stop);closeStream()};
 const stream=new ReadableStream<Uint8Array>({
  start(controller){
   closeStream=()=>{try{controller.close()}catch{/* already cancelled */}};
   request.signal.addEventListener('abort',stop,{once:true});
   let previous='',iterations=0;
   const send=(data:NonNullable<Awaited<ReturnType<typeof craftRoom>>>)=>{
    const payload=JSON.stringify({responses:data.responses,userId:data.userId});
    if(payload!==previous){controller.enqueue(encoder.encode(`event: availability\ndata: ${payload}\n\n`));previous=payload}
    else controller.enqueue(encoder.encode(': heartbeat\n\n'));
   };
   send(initial);
   const tick=async()=>{
    if(stopped)return;
    try{
     const result=await craftRoom(roomId,context);
     if(stopped)return;
     if(!result){stop();return}
     send(result);
    }catch{stop();return}
    if(++iterations>=55){stop();return}
    timer=setTimeout(()=>void tick(),1000);
   };
   if(request.signal.aborted){stop();return}
   timer=setTimeout(()=>void tick(),1000);
  },
  cancel(){stop()},
 });
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'private, no-store, no-transform','X-Accel-Buffering':'no'}});
}
