export function safeReturnPath(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\')||/[\r\n]/.test(value))return '/craft/when-we-meet';
  const pathname=value.split(/[?#]/,1)[0];
  if(!/^\/craft\/when-we-meet(?:\/[0-9a-f-]{36})?\/?$/.test(pathname))return '/craft/when-we-meet';
  try {const u=new URL(value,'https://local.invalid');if(u.pathname!==pathname)return '/craft/when-we-meet';return pathname+(u.searchParams.has('invite')?`?invite=${encodeURIComponent(u.searchParams.get('invite')||'')}`:'');}
  catch{return '/craft/when-we-meet';}
}
