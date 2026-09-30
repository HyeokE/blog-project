import {isSameOrigin} from '@/lib/request-origin.mjs';
const privateHeaders={'Cache-Control':'private, no-store'};
export const unauthorized=()=>Response.json({error:'Sign in with Google to continue.'},{status:401,headers:privateHeaders});
export const invalid=(message='Invalid request.')=>Response.json({error:message},{status:400,headers:privateHeaders});
export const failed=(message:string,status=500)=>Response.json({error:message},{status,headers:privateHeaders});
export const ok=(data:unknown)=>Response.json(data,{headers:privateHeaders});
export const uuid=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export function sameOrigin(request:Request){return isSameOrigin(request.headers)}
// Default 8 KB; availability saves pass a larger bound (672 ISO slots plus the same-size base ≈ 37 KB).
export async function body(request:Request,maxBytes=8192):Promise<Record<string,unknown>|null>{try{if(Number(request.headers.get('content-length'))>maxBytes){return null;}const text=await request.text();if(text.length>maxBytes){return null;}const value:unknown=JSON.parse(text);return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}catch{return null}}
