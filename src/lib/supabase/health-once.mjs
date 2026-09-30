const key='blog-project:supabase-health:v1';
let claimed=false;
export function claimHealthCheck(storage){
 if(claimed)return false;
 claimed=true;
 try{if(storage?.getItem(key))return false;storage?.setItem(key,'attempted')}catch{/* private mode: module-memory fallback */}
 return true;
}
export function resetHealthClaimForTest(){claimed=false}
