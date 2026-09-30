// Call only after the server's authenticated membership/RLS read succeeds.
// Sharing is available to every member; administrative mutations must separately
// re-check owner_id against auth.uid() on the server/database.
export function roomForViewer(room,userId){
 return {...room,role:room.owner_id&&userId&&room.owner_id===userId?'ADMIN':'MEMBER'};
}
