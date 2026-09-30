const privateHeaders={'Cache-Control':'private, no-store'};
export const unauthorized=()=>Response.json({error:'Sign in with Google to continue.'},{status:401,headers:privateHeaders});
export const invalid=(message='Invalid request.')=>Response.json({error:message},{status:400,headers:privateHeaders});
export const failed=(message:string,status=500)=>Response.json({error:message},{status,headers:privateHeaders});
export const ok=(data:unknown)=>Response.json(data,{headers:privateHeaders});
export const uuid=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export function sameOrigin(request:Request){const origin=request.headers.get('origin');const host=request.headers.get('x-forwarded-host')||request.headers.get('host');const expected=host==='macmini-home.taile6a871.ts.net:8446'||host==='macmini-home.taile6a871.ts.net'?'https://macmini-home.taile6a871.ts.net:8446':host==='localhost:3002'||host==='127.0.0.1:3002'?`http://${host}`:null;return Boolean(expected&&origin===expected)}
// Default 8 KB; availability saves pass a larger bound (672 ISO slots plus the same-size base ≈ 37 KB).
export async function body(request:Request,maxBytes=8192):Promise<Record<string,unknown>|null>{try{if(Number(request.headers.get('content-length'))>maxBytes){return null;}const text=await request.text();if(text.length>maxBytes){return null;}const value:unknown=JSON.parse(text);return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}catch{return null}}
