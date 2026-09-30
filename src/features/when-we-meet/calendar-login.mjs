// Ordinary Google sign-in only. Calendar consent is a separate direct OAuth flow (calendar-server.mjs),
// so login never reads, writes or deletes a stored Calendar credential.
// The exchange client's cookie adapter MUST be staged: never flush its provider-bearing session.
// A fresh SSR client sets only the Supabase access/refresh pair after verification.
export async function createLoginExchange({client,createClient,code}){
 const {data,error}=await client.auth.exchangeCodeForSession(code);
 if(error||!data?.session||!data.user)throw Error('Could not complete Google login');
 const session=data.session;
 const appClient=await createClient();
 const result=await appClient.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
 if(result.error||!result.data.session)throw Error(`Could not persist login: ${result.error?.message||'empty session'}`);
 return {authenticated:true};
}
