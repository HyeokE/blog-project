import {currentSupabaseUser,craftRoomMetadata} from '@/lib/supabase/server';
import {calendarAccessToken} from '@/features/when-we-meet/calendar-access';
import {listEventBusy} from '@/features/when-we-meet/calendar-google.mjs';
import {availableSlotsFromBusy} from '@/features/when-we-meet/calendar-autofill.mjs';
import {makeSlots} from '@/features/when-we-meet/domain.mjs';
import {failed,invalid,ok,unauthorized,uuid} from '../../../http';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{roomId:string}>};
// Preview only: returns the room slots that are free in the caller's own primary calendar.
// Busy time comes from event listing (not FreeBusy) so multi-day all-day events can be ignored.
// Nothing is saved; the client applies the preview to its draft after an explicit action.
export async function GET(_request:Request,context:Context){
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid meeting ID.');
 try{
  const session=await currentSupabaseUser();if(!session.user)return unauthorized();
  const metadata=await craftRoomMetadata(roomId,session);
  if(!metadata)return failed('Meeting unavailable or you are not a member.',403);
  const slots=makeSlots(metadata.room);
  if(!slots.length)return ok({availableSlotIds:[],slotCount:0});
  let accessToken:string;
  try{accessToken=await calendarAccessToken(session.user);}
  catch(error){if((error as {reconnect?:boolean}).reconnect)return Response.json({error:'Connect Google Calendar to fill from your calendar.',reconnect:true},{status:409,headers:{'Cache-Control':'private, no-store'}});throw error;}
  const timeMin=slots[0].utc,timeMax=new Date(Date.parse(slots.at(-1)!.utc)+1800000).toISOString();
  const busy=await listEventBusy(accessToken,{timeMin,timeMax,timeZone:metadata.room.timezone});
  return ok({availableSlotIds:availableSlotsFromBusy(slots,busy),slotCount:slots.length});
 }catch(error){console.warn('[wwm] calendar busy failed:',error instanceof Error?`${error.message} ${(error as {status?:number}).status??''}`:'unknown');return failed('Could not read your calendar.',502);}
}
