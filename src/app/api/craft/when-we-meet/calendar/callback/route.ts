// Retired: Calendar consent is handled during the ordinary Google login.
export const dynamic='force-dynamic';
export function GET(){return Response.json({error:'Use Google sign-in for Calendar consent.'},{status:410})}
