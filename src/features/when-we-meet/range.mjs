const day=86400000;
export const rangeDays=(start,end)=>start&&end?Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/day)+1:0;
export const resetRange=()=>({start:'',end:'',phase:'start',error:''});
export const isRangeEndDisabled=(state,date)=>state.phase==='end'&&!!state.start&&date>=state.start&&rangeDays(state.start,date)>14;
// Phase-sensitive: only an awaited end date is bounded; a start (or reverse restart) is never limited by the 14-day window.
export const isRangeDateDisabled=(state,date,minDate,maxDate)=>(!!minDate&&date<minDate)||(!!maxDate&&date>maxDate)||isRangeEndDisabled(state,date);
export function selectRangeDate(state,date){
 if(state.phase!=='end')return {start:date,end:'',phase:'end',error:''};
 if(date<state.start)return {start:date,end:'',phase:'end',error:''};
 if(rangeDays(state.start,date)>14)return {...state,error:'최대 14일까지 선택할 수 있어요.'};
 return {start:state.start,end:date,phase:'complete',error:''};
}
