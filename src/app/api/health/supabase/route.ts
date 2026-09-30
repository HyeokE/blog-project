import {NextResponse} from 'next/server';
import {probeAuthHealth} from '@/lib/supabase/health.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 const result=await probeAuthHealth({url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY});
 return NextResponse.json(result,{status:result.status==='ok'?200:503,headers:{'Cache-Control':'no-store, max-age=0'}});
}
