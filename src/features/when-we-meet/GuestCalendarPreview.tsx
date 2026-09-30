import './guest-calendar-preview.css';

/** Static, synthetic illustration. Never pass room responses or account data here. */
const days=['Mon','Tue','Wed','Thu','Fri'];
const hours=['9 AM','10 AM','11 AM','12 PM','1 PM','2 PM'];
const availability=new Set(['0-1','0-2','1-0','1-1','1-3','2-1','2-2','2-3','3-0','3-2','3-4','4-1','4-3','4-4']);

export function GuestCalendarPreview(){
 return <div className="wwm-guest-preview" aria-hidden="true" inert>
  <div className="wwm-guest-preview-heading">Availability <span>Week view</span></div>
  <div className="wwm-guest-preview-grid">
   <div className="wwm-guest-preview-corner">Time</div>
   {days.map((day,index)=><div className="wwm-guest-preview-day" key={day}>{day}<strong>{index+12}</strong></div>)}
   {hours.map((hour,row)=><div className="wwm-guest-preview-row" key={hour}><span className="wwm-guest-preview-hour">{hour}</span>{days.map((day,col)=><span className={`wwm-guest-preview-cell ${availability.has(`${col}-${row}`)?'is-available':''}`} key={day}/>)}</div>)}
  </div>
 </div>;
}
