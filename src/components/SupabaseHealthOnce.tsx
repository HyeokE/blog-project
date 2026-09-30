'use client';
import {useEffect} from 'react';
import {claimHealthCheck} from '@/lib/supabase/health-once.mjs';
/** Non-blocking first-tab-visit connectivity probe; never gates rendering. */
export default function SupabaseHealthOnce(){
 useEffect(()=>{
  let storage:Storage|undefined;
  try{storage=window.sessionStorage}catch{/* private mode */}
  if(claimHealthCheck(storage))void fetch('/api/health/supabase',{method:'GET',cache:'no-store',credentials:'omit'}).catch(()=>undefined);
 },[]);
 return null;
}
