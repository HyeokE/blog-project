export function visibleMeetings(rows,ownerId){if(!ownerId)return [];return rows.filter(row=>row.owner_id===ownerId).sort((a,b)=>b.created_at.localeCompare(a.created_at))}
