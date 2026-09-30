export function visibleMeetings(rows,ownerId){if(!ownerId)return [];return rows.filter(row=>row.ownerId===ownerId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
