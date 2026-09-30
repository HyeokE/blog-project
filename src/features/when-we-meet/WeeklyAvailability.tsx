'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createHoverDetail} from './hover-detail.mjs';
import {monthBoundaryLabel} from './month-boundary.mjs';
import {hourLabel} from './hour-label.mjs';
import {projectWeeklyTimeline,projectDraftRow} from './weekly-timeline.mjs';
import {calendarRows,eventBlocks,calendarSizing} from './calendar-rows.mjs';
import {everyoneDayWidth,eventGeometry} from './everyone-geometry.mjs';
import {Button} from '@/components/ui/button';
import {createGesture} from './gesture.mjs';
import {dragRange,tapRange,rangeFields,rangeSlotIds,type ConfirmRange} from './confirm-selection.mjs';
import {dragSegment} from './drag-segment.mjs';
import {formatCraftDate} from './display-date.mjs';
import {Popover,PopoverAnchor,PopoverContent} from '@/components/ui/popover';
import './week-calendar.css';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
type Slot={id:string;utc:string;date:string;time:string};
type EventBlock={date:string;startUtc:string;endUtc:string;slotIds:string[];userId:string;label:string;color:string;top:number;height:number;lane:number;lanes:number};
type SavedResponse={userId:string;displayName:string;slots:string[]};
/** Confirm mode: compact Everyone calendar plus a one-date range selection (onChange absent = read-only highlight). */
export type ConfirmSelection={memberCount:number;range:ConfirmRange|null;onChange?:(range:ConfirmRange)=>void;rangeLabel?:string};
type CalendarProps={startDate:string;endDate:string;timezone:string;slots:Slot[];responses:SavedResponse[];currentUserId:string};
type EditProps={mine:string[];onToggle:(id:string)=>void;dirty:boolean;readOnly?:boolean;selection?:undefined};
type ConfirmProps={selection:ConfirmSelection;mine?:undefined;onToggle?:undefined;dirty?:undefined;readOnly?:undefined};
const NONE:string[]=[],ignore=()=>undefined,HALF_HOUR=1800000;
const shortTime=(utc:string,timezone:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(utc));
const timeAt=(utc:string,timezone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:false,timeZoneName:'shortOffset'}).format(new Date(utc));
const datesBetween=(first:string,last:string)=>{const dates:string[]=[];for(let t=Date.parse(`${first}T00:00:00Z`),end=Date.parse(`${last}T00:00:00Z`);t<=end;t+=86400000)dates.push(new Date(t).toISOString().slice(0,10));return dates};
const weekday=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short'}).format(new Date(`${date}T00:00:00Z`));
const endOf=(id:string)=>new Date(Date.parse(id)+HALF_HOUR).toISOString();
const sameRange=(a:ConfirmRange|null,b:ConfirmRange|null)=>a?.date===b?.date&&a?.startId===b?.startId&&a?.endId===b?.endId;
export function WeeklyAvailability({startDate,endDate,timezone,slots,responses,currentUserId,mine=NONE,onToggle=ignore,dirty=false,readOnly:everyoneView=false,selection}:CalendarProps&(EditProps|ConfirmProps)){
 // Confirm mode reuses the Everyone view, always compact; its rails are visual only while selecting.
 const readOnly=everyoneView||Boolean(selection),selecting=Boolean(selection?.onChange);
 const projection=useMemo(()=>projectWeeklyTimeline({slots,responses,currentUserId}),[slots,responses,currentUserId]);
 const dates=useMemo(()=>datesBetween(startDate,endDate),[startDate,endDate]);
 const [detail,setDetail]=useState<string|null>(null);
 const [compactChoice,setCompact]=useState(false),compact=compactChoice||Boolean(selection);
 const headerScroll=useRef<HTMLDivElement>(null);
 const hoverDetail=useMemo(()=>createHoverDetail(setDetail),[]);
 useEffect(()=>()=>hoverDetail.dispose(),[hoverDetail]);
 const rows=calendarRows(dates,slots), mineSet=new Set(mine), people=projection.rows.filter(row=>readOnly||!row.isCurrentUser);
 const gesture=useRef(createGesture()),drag=useRef<{value:boolean;seen:Set<string>;last?:Slot}|null>(null);
 const label=(slot:Slot)=>`${formatCraftDate(slot.date)} ${timeAt(slot.id,timezone)}`;
 function paint(slot:Slot){const d=drag.current;if(!d)return;const segment=dragSegment(d.last,slot,slots) as Slot[];d.last=slot;for(const cell of segment){if(d.seen.has(cell.id))continue;d.seen.add(cell.id);if(mineSet.has(cell.id)!==d.value)onToggle(cell.id)}}
 const pick=useRef<{drag:string|null}>({drag:null}),[anchor,setAnchor]=useState<string|null>(null);
 const range=selection?.range??null,rangeIds=new Set(rangeSlotIds(slots,range));
 useEffect(()=>{if(anchor&&!(range?.startId===anchor&&range.endId===anchor))setAnchor(null)},[anchor,range]);
 function choose(next:ConfirmRange|null){if(next&&selection?.onChange&&!sameRange(next,range))selection.onChange(next)}
 function tap(slot:Slot){const next=tapRange({anchor},slots,slot.id);setAnchor(next.anchor);choose(next.range)}
 const span=(startUtc:string,endUtc:string)=>`${shortTime(startUtc,timezone)}–${shortTime(endUtc,timezone)} ${timeAt(startUtc,timezone).split(' ').at(-1)}`;
 const rangeRows=(date:string)=>{if(range?.date!==date)return [];const runs:{top:number;rows:number}[]=[];rows.forEach((row,index)=>{const slot=row.byDate[date] as Slot|undefined;if(!slot||!rangeIds.has(slot.id))return;const last=runs.at(-1);if(last&&last.top+last.rows===index)last.rows++;else runs.push({top:index,rows:1})});return runs};
 const savedBlocks=eventBlocks(rows,dates,people,24) as EventBlock[];
 const sizing=calendarSizing(savedBlocks),participantGutter=sizing.participantGutter;
 const rowHeight=24;
 const own=projectDraftRow({slots:[...slots].sort((a,b)=>a.id.localeCompare(b.id)),selectedIds:mine,displayName:'You'});
 const ownBlocks=eventBlocks(rows,dates,[{...own,userId:currentUserId,label:'You',color:'var(--craft-person-you)'}],24) as EventBlock[];
 const month=new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${dates[0]}T00:00:00Z`));
 const lastMonth=new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${dates[dates.length-1]}T00:00:00Z`));
 return <div className={`wwm-weekly ${readOnly?'wwm-everyone':''} ${readOnly&&compact?'wwm-everyone-compact':''}${selection?' wwm-confirm-mode':''}${selecting?' is-selecting':''}`}>
 <div className="wwm-calendar-heading"><h3>{month}{lastMonth!==month?` – ${lastMonth}`:''}</h3>{!selection&&readOnly&&<Button type="button" variant="outline" size="sm" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_COMPACT} aria-pressed={compact} onClick={()=>{setCompact(value=>!value);setDetail(null)}}>Compact</Button>}</div>
 <div className="wwm-week-legend" aria-label="Saved respondent colors">{!readOnly&&<span><i className="wwm-own-swatch"/>You · editable</span>}{people.map(person=><span key={person.userId}><i style={{backgroundColor:person.color}}/>{person.label}</span>)}<span className="wwm-calendar-response-count">{projection.responseCount} saved responses</span></div>
 <p className="wwm-calendar-hint">{selecting?'Click or drag on one date to choose a time. Tap a start, then an end.':selection?'Everyone’s saved availability.':readOnly?'Everyone’s saved availability. Select a bar for details.':'Select your times in the You column.'} {timezone}</p>{selecting?<span className="wwm-sr-only" role="status">{anchor?`Start set at ${shortTime(anchor,timezone)}. Choose an end time on the same date.`:'Enter or Space on a half-hour sets the start, then the end. Swipe to scroll.'}</span>:<span className="wwm-sr-only">{readOnly||selection?'Read-only view of saved availability. Focus a bar to hear its time; Enter or Space opens its details. Swipe to scroll.':'Click or drag to edit your availability. Enter or Space toggles a half-hour. Swipe to scroll. Saved responses exclude your unsaved changes.'}</span>}
 <div className="wwm-calendar-frame" style={{'--wwm-day-count':dates.length,'--participant-gutter':`${participantGutter}px`,'--day-width':`${readOnly?everyoneDayWidth(savedBlocks,compact):sizing.dayWidth}px`,'--row-height':`${rowHeight}px`} as React.CSSProperties}>
 <div className="wwm-calendar-header-scroll" ref={headerScroll}><div className="wwm-week-grid">
 <div className="wwm-week-corner">Time</div>{dates.map((date,index)=><div key={date} className="wwm-week-date" aria-label={`${weekday(date)} ${formatCraftDate(date)}`}><span>{monthBoundaryLabel(date,dates[index-1])&&<span className="wwm-month-boundary">{monthBoundaryLabel(date,dates[index-1])} · </span>}{weekday(date)}</span><strong>{date.slice(-2)}</strong><small>{readOnly?'Participants':<>People <span>You</span></>}</small></div>)}
 </div></div>
 <div className="wwm-week-scroll" role="region" aria-label={`Availability calendar · ${timezone}`} tabIndex={0} onScroll={event=>{if(headerScroll.current)headerScroll.current.scrollLeft=event.currentTarget.scrollLeft;gesture.current.scroll();drag.current=null;setDetail(null)}} onPointerUp={()=>{drag.current=null;pick.current.drag=null}}><div className="wwm-week-grid">
 <div className="wwm-calendar-time-rail">{rows.map(row=><div className={`wwm-week-time ${row.time.endsWith(':00')?'is-hour':''}`} key={row.key}>{row.time.endsWith(':00')&&<span>{hourLabel(row.time)}{row.cycle>0?' ↺':''}</span>}</div>)}</div>
 {dates.map(date=><div className="wwm-calendar-day" key={date} data-date={date} style={{height:rows.length*rowHeight}}>
 {!readOnly&&<div className="wwm-calendar-selection">{rows.map(row=>{const slot=row.byDate[date] as Slot|undefined;if(!slot)return <div className="wwm-calendar-gap" key={row.key}/>;const selected=mineSet.has(slot.id);return <button key={slot.id} type="button" data-analytics-label={ANALYTICS_ELEMENTS.AVAILABILITY_CELL} className={`wwm-week-edit ${selected?'is-selected':''}`} aria-pressed={!!selected} aria-label={`You, ${label(slot)}, ${selected?'available':'not available'}${dirty?', your changes not saved':''}`} onPointerDown={e=>{if(e.pointerType==='touch'){gesture.current.down('touch',e.clientX,e.clientY,slot.id);return}if(e.pointerType==='mouse'){drag.current={value:!selected,seen:new Set()};paint(slot)}}} onPointerMove={e=>{if(e.pointerType==='touch')gesture.current.move(e.clientX,e.clientY);else if(e.pointerType==='mouse'&&e.buttons)paint(slot)}} onPointerEnter={e=>{if(e.pointerType==='mouse'&&e.buttons)paint(slot)}} onPointerUp={e=>{if(e.pointerType==='mouse'&&drag.current)paint(slot);if(e.pointerType==='touch'&&gesture.current.up(e.clientX,e.clientY,slot.id))onToggle(slot.id);drag.current=null}} onPointerCancel={()=>{gesture.current.cancel();drag.current=null}} onClick={e=>{if(gesture.current.click()==='suppress'){e.preventDefault();return}if(e.detail===0)onToggle(slot.id)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onToggle(slot.id)}}}><span className="wwm-sr-only">You</span>
</button>;})}
 {ownBlocks.filter(block=>block.date===date).map(block=><div className="wwm-calendar-own-event" data-density={block.slotIds.length===1?'single':block.slotIds.length===2?'double':'regular'} key={block.startUtc} style={{top:block.top+2,height:block.height-4}} aria-hidden="true"><strong>You</strong>{block.slotIds.length>=2&&<small>{shortTime(block.startUtc,timezone)}–{shortTime(block.endUtc,timezone)}</small>}</div>)}</div>}
 <div className="wwm-calendar-events" aria-hidden={selecting||undefined}>{savedBlocks.filter(block=>block.date===date).map(block=>{const id=`${block.userId}:${block.startUtc}`;return <Popover key={id} open={detail===id} onOpenChange={open=>{if(open)hoverDetail.open(id,'pinned');else hoverDetail.close()}}>
 <PopoverAnchor asChild><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.AVAILABILITY_BLOCK} className="wwm-calendar-event wwm-participant-rail" tabIndex={selecting?-1:undefined} data-density={block.slotIds.length===1?'single':block.slotIds.length===2?'double':'regular'} data-start={block.startUtc} data-end={block.endUtc} style={{top:block.top+2,height:block.height-4,left:readOnly?eventGeometry(block,compact).left:block.lane*16,width:readOnly?eventGeometry(block,compact).width:12,'--event-color':block.color} as unknown as React.CSSProperties} aria-label={`${block.label}, ${formatCraftDate(date)}, ${timeAt(block.startUtc,timezone)} to ${timeAt(block.endUtc,timezone)}`} onMouseEnter={()=>hoverDetail.open(id,'hover')} onMouseLeave={()=>hoverDetail.leave()} onFocus={()=>hoverDetail.open(id,'focus')} onClick={()=>hoverDetail.open(id,'pinned')}>{readOnly&&!compact?<><strong>{block.label}</strong>{block.slotIds.length>=2&&<span className="wwm-event-time">{shortTime(block.startUtc,timezone)}–{shortTime(block.endUtc,timezone)}</span>}</>:<span className="wwm-sr-only">{block.label}</span>}</button></PopoverAnchor>
 <PopoverContent onMouseEnter={()=>hoverDetail.enter()} onMouseLeave={()=>hoverDetail.leave()} className="wwm-week-detail" side="top" align="start" collisionPadding={8} onOpenAutoFocus={e=>e.preventDefault()} onCloseAutoFocus={e=>e.preventDefault()} onInteractOutside={e=>{if((e.target as HTMLElement).closest?.('.wwm-calendar-event'))e.preventDefault()}}><div className="wwm-detail-person"><i aria-hidden="true" style={{backgroundColor:block.color}}/><strong>{block.label}</strong></div><span className="wwm-detail-date">{formatCraftDate(date)} · {weekday(date)}</span><span className="wwm-detail-time" aria-label={`${timeAt(block.startUtc,timezone)} to ${timeAt(block.endUtc,timezone)}`}>{shortTime(block.startUtc,timezone)}<span aria-hidden="true">–</span>{shortTime(block.endUtc,timezone)}</span><small className="wwm-detail-zone">{timezone}</small></PopoverContent>
 </Popover>})}</div>
 {selection&&<div className="wwm-confirm-layer">{selecting&&rows.map(row=>{const slot=row.byDate[date] as Slot|undefined;if(!slot)return <div className="wwm-confirm-gap" key={row.key}/>;const selected=rangeIds.has(slot.id);return <button key={slot.id} type="button" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_CELL} className={`wwm-confirm-slot${slot.id===anchor?' is-anchor':''}`} aria-pressed={selected} aria-label={`${formatCraftDate(slot.date)} ${span(slot.id,endOf(slot.id))}, ${projection.countById[slot.id]??0} of ${selection.memberCount} available`} onPointerDown={e=>{if(e.pointerType==='touch'){gesture.current.down('touch',e.clientX,e.clientY,slot.id);return}if(e.button!==0)return;pick.current.drag=slot.id;setAnchor(null);choose(dragRange(slots,slot.id,slot.id))}} onPointerEnter={e=>{const from=pick.current.drag;if(e.pointerType==='mouse'&&e.buttons&&from)choose(dragRange(slots,from,slot.id))}} onPointerMove={e=>{if(e.pointerType==='touch')gesture.current.move(e.clientX,e.clientY)}} onPointerUp={e=>{if(e.pointerType==='touch'&&gesture.current.up(e.clientX,e.clientY,slot.id))tap(slot);pick.current.drag=null}} onPointerCancel={()=>{gesture.current.cancel();pick.current.drag=null}} onClick={e=>{if(gesture.current.click()==='suppress'){e.preventDefault();return}if(e.detail===0)tap(slot)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tap(slot)}}}/>})}
 {range&&rangeRows(date).map((run,index)=><div className="wwm-confirm-range" data-density={run.rows===1?'single':'regular'} key={run.top} style={{top:run.top*rowHeight+1,height:run.rows*rowHeight-2}} aria-hidden="true">{index===0&&<><strong>{selection.rangeLabel||'Selected'}</strong><small>{rangeFields(slots,range)?.start}–{rangeFields(slots,range)?.end}</small></>}</div>)}</div>}
 </div>)}
 </div></div></div></div>;
}
