export function normalizeRoom(room){return {...room,start_time:room.start_time.slice(0,5),end_time:room.end_time.slice(0,5)}}
export function normalizeResponses(rows){return rows.map(row=>({...row,slots:(row.slots||[]).map(value=>new Date(value).toISOString())}))}
