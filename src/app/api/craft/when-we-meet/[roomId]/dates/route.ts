import {currentSupabaseUser} from '@/lib/supabase/server';
import {handleDateRequest} from '@/features/when-we-meet/date-save.mjs';
import {body,failed,invalid,ok,sameOrigin,uuid} from '../../http';
export const dynamic='force-dynamic';
const dependencies={currentUser:currentSupabaseUser,body,failed,invalid,ok,sameOrigin,uuid};
type Context={params:Promise<{roomId:string}>};
export async function GET(request:Request,context:Context){return handleDateRequest(request,(await context.params).roomId,dependencies);}
export async function POST(request:Request,context:Context){return handleDateRequest(request,(await context.params).roomId,dependencies);}
