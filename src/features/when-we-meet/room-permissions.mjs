// Call only after the server's authenticated membership/RLS read succeeds.
// Sharing is available to every member; administrative mutations must separately
// re-check the owner against auth.uid() on the server/database.
export function roomForViewer(room,userId){
 return {...room,role:room.ownerId&&userId&&room.ownerId===userId?'ADMIN':'MEMBER'};
}
