const result=status=>({status,service:'supabase',scope:'auth'});
export async function probeAuthHealth({url,key,fetcher=fetch,timeoutMs=4000}={}){
 let endpoint;
 try{endpoint=new URL('/auth/v1/health',url);if(endpoint.protocol!=='https:'||!key)return result('unavailable')}catch{return result('unavailable')}
 try{
  const response=await fetcher(endpoint.toString(),{method:'GET',headers:{apikey:key},signal:AbortSignal.timeout(timeoutMs),cache:'no-store'});
  return result(response.ok?'ok':'unavailable');
 }catch{return result('unavailable')}
}
