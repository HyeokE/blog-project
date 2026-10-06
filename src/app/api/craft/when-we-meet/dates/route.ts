import {currentSupabaseUser} from '@/lib/supabase/server';
import {handleDateRequest} from '@/features/when-we-meet/date-save.mjs';
import {body,failed,invalid,ok,sameOrigin,uuid} from '../http';
export const dynamic='force-dynamic';
const dependencies={currentUser:currentSupabaseUser,body,failed,invalid,ok,sameOrigin,uuid};
export function GET(request:Request){return handleDateRequest(request,undefined,dependencies);}
export function POST(request:Request){return handleDateRequest(request,undefined,dependencies);}
