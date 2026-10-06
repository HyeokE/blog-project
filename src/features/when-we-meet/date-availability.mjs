import {MAX_RANGE_DAYS} from './limits.mjs';
/** Inclusive civil range; never interprets dates as instants or rejects historical dates. */
export function datesInRange(startDate,endDate){
 requireDate(startDate);requireDate(endDate);
 if(startDate>endDate)throw new RangeError('Civil date range must be forward.');
 const dates=[];
 for(let date=startDate;;date=nextCalendarDate(date)){
  dates.push(date);
  if(dates.length>MAX_RANGE_DAYS)throw new RangeError(`Civil date range exceeds ${MAX_RANGE_DAYS} days.`);
  if(date===endDate)return dates;
 }
}
/** Apply baseline→desired date deltas to current, preserving remote edits.
 * Caller must normalizeAvailableDates against the room before/after merging.
 * This helper validates civil dates only; it never merges names or mutates inputs.
 */
export function mergeAvailableDateChanges(base,desired,current){
 const before=new Set(normalizedDates(base)),after=new Set(normalizedDates(desired)),result=new Set(normalizedDates(current));
 for(const date of before)if(!after.has(date))result.delete(date);
 for(const date of after)if(!before.has(date))result.add(date);
 return [...result].sort();
}
/** Saved-response-only aggregation. Caller supplies an authorized roster.
 * IDs and dates are sorted; empty selections are nonresponses. Names never identify members.
 * Duplicate response userIds reject (including foreign rows); duplicate roster IDs deduplicate.
 * All response rows are validated before foreign IDs are excluded. No updatedAt precedence.
 * With people=null, only observed availability is known: total and negative categories are null.
 * In that case caller must supply server-authorized saved responses; membership cannot be
 * verified without a roster. Response rows never substitute for a known member roster.
 */
export function aggregateDateAvailability(room,responses,people){
 const dates=datesInRange(room?.startDate,room?.endDate);
 if(!Array.isArray(responses))throw new TypeError('Saved responses must be an array.');
 if(people!==null&&!Array.isArray(people))throw new TypeError('Authorized people must be an array or null.');
 const requireId=row=>{if(!row||typeof row.userId!=='string'||!row.userId.trim())throw new TypeError('Expected a nonempty userId.');return row.userId;};
 const members=people===null?null:[...new Set(Array.from(people,requireId))].sort();
 const saved=new Map(),seen=new Set();
 for(const response of responses){
  const id=requireId(response);
  if(typeof response.displayName!=='string')throw new TypeError('Saved response requires displayName.');
  if(seen.has(id))throw new TypeError('Duplicate response userId.');
  seen.add(id);
  const available=new Set(normalizeAvailableDates(response.availableDates,room));
  if(members===null||members.includes(id))saved.set(id,available);
 }
 const observed=members??[...saved.keys()].sort();
 return {totalMembers:members===null?null:members.length,dates:dates.map(date=>({
  date,availableUserIds:observed.filter(id=>saved.get(id)?.has(date)),
  unavailableUserIds:members===null?null:members.filter(id=>saved.get(id)?.size&&!saved.get(id).has(date)),
  nonrespondentUserIds:members===null?null:members.filter(id=>!saved.get(id)?.size),
 }))};
}
function normalizedDates(values){
 if(!Array.isArray(values))throw new TypeError('Available dates must be an array.');
 for(const date of values)requireDate(date);
 return [...new Set(values)].sort();
}
/** Reject invalid values; never silently trim. Room range is inclusive and at most 28 days. */
export function normalizeAvailableDates(values,room){
 const allowed=new Set(datesInRange(room?.startDate,room?.endDate));
 const dates=normalizedDates(values);
 if(dates.length>MAX_RANGE_DAYS||dates.some(date=>!allowed.has(date)))throw new RangeError('Available dates fall outside the room range.');
 return dates;
}
const monthDays=(year,month)=>[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
/** Proleptic Gregorian civil dates, supported years 0001 through 9999. */
function requireDate(date){if(!isCalendarDate(date))throw new RangeError('Invalid civil date (expected YYYY-MM-DD, year 0001..9999).');}
/** Next civil date, also the exclusive end for a one-day all-day invitation. */
export function nextCalendarDate(date){
 requireDate(date);
 if(date==='9999-12-31')throw new RangeError('Next civil date exceeds year 9999.');
 let [year,month,day]=date.split('-').map(Number);
 if(++day>monthDays(year,month)){day=1;if(++month>12){month=1;year++;}}
 return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export function isCalendarDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.length!==10)return false;
 const [year,month,day]=value.split('-').map(Number);
 return year>=1&&year<=9999&&month>=1&&month<=12&&day>=1&&day<=monthDays(year,month);
}
