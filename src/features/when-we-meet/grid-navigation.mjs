// Keyboard model for the availability grid (WAI-ARIA APG grid pattern). Pure: rows come from calendarRows,
// columns are the visible room dates, cell identity is the slot id (a UTC instant, so DST repeats stay distinct).
const PAGE_ROWS=8; // PageUp/PageDown: four hours of half-hour rows.

export function cellPosition(rows,dates,id){
 for(let row=0;row<rows.length;row++)for(let col=0;col<dates.length;col++)if(rows[row].byDate[dates[col]]?.id===id)return {row,col};
 return null;
}
const idAt=(rows,dates,row,col)=>rows[row]?.byDate[dates[col]]?.id;
/** Nearest existing half-hour in a column, searching outward from `row` (ties prefer the earlier row). */
function nearestInColumn(rows,dates,row,col){
 for(let d=0;d<rows.length;d++){const up=idAt(rows,dates,row-d,col);if(up)return up;const down=idAt(rows,dates,row+d,col);if(down)return down}
 return null;
}
function stepInColumn(rows,dates,row,col,step,count){
 let found=null;
 for(let r=row+step,moved=0;r>=0&&r<rows.length&&moved<count;r+=step){const id=idAt(rows,dates,r,col);if(id){found=id;moved++}}
 return found;
}

/** Target slot id for a navigation key, the same id at an edge, or null for keys the grid does not handle. */
export function gridMove(rows,dates,fromId,key,{ctrl=false}={}){
 const at=cellPosition(rows,dates,fromId);
 if(!at)return null;
 const {row,col}=at;
 switch(key){
  case 'ArrowDown':return stepInColumn(rows,dates,row,col,1,1)??fromId;
  case 'ArrowUp':return stepInColumn(rows,dates,row,col,-1,1)??fromId;
  case 'PageDown':return stepInColumn(rows,dates,row,col,1,PAGE_ROWS)??fromId;
  case 'PageUp':return stepInColumn(rows,dates,row,col,-1,PAGE_ROWS)??fromId;
  case 'ArrowRight':return col+1<dates.length?nearestInColumn(rows,dates,row,col+1)??fromId:fromId;
  case 'ArrowLeft':return col>0?nearestInColumn(rows,dates,row,col-1)??fromId:fromId;
  case 'Home':{const c=ctrl?0:col;return nearestInColumn(rows,dates,0,c)??fromId}
  case 'End':{const c=ctrl?dates.length-1:col;return nearestInColumn(rows,dates,rows.length-1,c)??fromId}
  default:return null;
 }
}

/** The grid's single Tab stop: last focused cell, else the earliest selected cell, else the first cell of `fallbackRow`. */
export function initialFocusId({rows,dates,lastId,selectedIds,fallbackRow}){
 if(!dates.length||!rows.length)return null;
 if(lastId&&cellPosition(rows,dates,lastId))return lastId;
 const selected=[...(selectedIds||[])].filter(id=>cellPosition(rows,dates,id)).sort((a,b)=>Date.parse(a)-Date.parse(b));
 if(selected.length)return selected[0];
 const row=Math.max(0,Math.min(rows.length-1,fallbackRow||0));
 for(let col=0;col<dates.length;col++){const id=nearestInColumn(rows,dates,row,col);if(id)return id}
 return null;
}

/** Row to scroll to on mount: one hour before the earliest relevant half-hour, else 8 AM (or the first row). */
export function scrollTargetRow(rows,relevantIds,{leadRows=2,defaultTime='08:00'}={}){
 const ids=new Set(relevantIds||[]);
 const first=rows.findIndex(row=>Object.values(row.byDate).some(slot=>ids.has(slot.id)));
 if(first>=0)return Math.max(0,first-leadRows);
 const fallback=rows.findIndex(row=>row.cycle===0&&row.time>=defaultTime);
 return fallback>0?fallback:0;
}

/** Phone day pager: `size` whole days starting at `start`, clamped to the room dates. */
export function pagerWindow(dates,start,size=2){
 const max=Math.max(0,dates.length-size);
 const from=Math.max(0,Math.min(max,Math.trunc(start)||0));
 return {start:from,dates:dates.slice(from,from+size),hasPrev:from>0,hasNext:from+size<dates.length};
}
/** Smallest pager move that brings `date` into view (keyboard focus can leave the window). */
export function pagerStartFor(dates,start,date,size=2){
 const index=dates.indexOf(date);
 if(index<0)return start;
 if(index<start)return index;
 if(index>=start+size)return index-size+1;
 return start;
}
