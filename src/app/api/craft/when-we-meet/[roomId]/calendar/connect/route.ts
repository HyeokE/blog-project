import {currentSupabaseUser} from '@/lib/supabase/server';
import {failed,invalid,sameOrigin,unauthorized,uuid} from '../../../http';
export const dynamic='force-dynamic';
type Context={params:Promise<{roomId:string}>};
// Reconsent uses the same ordinary login flow; no second Google OAuth client.
export async function POST(request:Request,context:Context){
 if(!sameOrigin(request))return failed('Invalid request origin.',403);
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid room ID.');
 try{const {user}=await currentSupabaseUser();if(!user)return unauthorized();
  return Response.json({authorizationUrl:`/api/craft/auth/google?next=${encodeURIComponent(`/craft/when-we-meet/${roomId}`)}`},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return failed('Calendar reconsent unavailable.',503)}
}
