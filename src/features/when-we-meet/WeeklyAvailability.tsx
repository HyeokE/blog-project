'use client';
import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {createHoverDetail} from './hover-detail.mjs';
import {monthBoundaryLabel} from './month-boundary.mjs';
import {hourLabel,clockLabel,dayLabel} from './hour-label.mjs';
import {projectWeeklyTimeline,projectDraftRow} from './weekly-timeline.mjs';
import {calendarRows,eventBlocks,calendarSizing} from './calendar-rows.mjs';
import {everyoneDayWidth,eventGeometry} from './everyone-geometry.mjs';
import {gridMove,initialFocusId,scrollTargetRow,pagerWindow,pagerStartFor} from './grid-navigation.mjs';
import {Button} from '@/components/ui/button';
import {ToggleGroup,ToggleGroupItem} from '@/components/ui/toggle-group';
import {createGesture} from './gesture.mjs';
import {dragRange,tapRange,rangeFields,rangeSlotIds,type ConfirmRange} from './confirm-selection.mjs';
import {dragSegment} from './drag-segment.mjs';
import {formatCraftDate} from './display-date.mjs';
import {Popover,PopoverAnchor,PopoverContent} from '@/components/ui/popover';
import './week-calendar.css';
import {plural} from './meeting-copy.mjs';
import {useMediaQuery} from './use-media-query';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
type Slot={id:string;utc:string;date:string;time:string};
type EventBlock={date:string;startUtc:string;endUtc:string;slotIds:string[];userId:string;label:string;color:string;mark?:number;top:number;height:number;lane:number;lanes:number};
type SavedResponse={userId:string;displayName:string;slots:string[]};
/** Confirm mode: compact Everyone calendar plus a one-date range selection (onChange absent = read-only highlight). */
export type ConfirmSelection={memberCount:number;range:ConfirmRange|null;onChange?:(range:ConfirmRange)=>void;rangeLabel?:string};
/** `toolbar` renders at the right of the grid toolbar (e.g. Fill from Google Calendar); `hint` is one short line at its left. */
type CalendarProps={startDate:string;endDate:string;timezone:string;slots:Slot[];responses:SavedResponse[];currentUserId:string;toolbar?:React.ReactNode;hint?:string};
type EditProps={mine:string[];onToggle:(id:string)=>void;dirty:boolean;readOnly?:boolean;selection?:undefined};
type ConfirmProps={selection:ConfirmSelection;mine?:undefined;onToggle?:undefined;dirty?:undefined;readOnly?:undefined};
const NONE:string[]=[],ignore=()=>undefined,LONG_PRESS_MS=450,AUTO_COMPACT_PEOPLE=6;
const shortTime=(utc:string,timezone:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(utc));
const timeAt=(utc:string,timezone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:false,timeZoneName:'shortOffset'}).format(new Date(utc));
const offsetAt=(utc:string,timezone:string)=>timeAt(utc,timezone).split(' ').at(-1);
const datesBetween=(first:string,last:string)=>{const dates:string[]=[];for(let t=Date.parse(`${first}T00:00:00Z`),end=Date.parse(`${last}T00:00:00Z`);t<=end;t+=86400000)dates.push(new Date(t).toISOString().slice(0,10));return dates};
const weekday=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short'}).format(new Date(`${date}T00:00:00Z`));
const sameRange=(a:ConfirmRange|null,b:ConfirmRange|null)=>a?.date===b?.date&&a?.startId===b?.startId&&a?.endId===b?.endId;
const density=(count:number)=>count===1?'single':count===2?'double':'regular';
const NAV_KEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown']);
/** The slot under a finger during a long-press drag (touch pointers stay captured by the cell they started on). */
const slotIdAt=(x:number,y:number)=>(document.elementFromPoint(x,y)?.closest('[data-slot-id]') as HTMLElement|null)?.dataset.slotId;

export function WeeklyAvailability({startDate,endDate,timezone,slots,responses,currentUserId,mine=NONE,onToggle=ignore,dirty=false,readOnly:everyoneView=false,selection,toolbar,hint}:CalendarProps&(EditProps|ConfirmProps)){
 // Confirm mode reuses the Everyone view, always compact; its rails are visual only while selecting.
 const readOnly=everyoneView||Boolean(selection),selecting=Boolean(selection?.onChange);
 // Cells are interactive while editing or choosing a confirm range; otherwise they are a keyboard reading layer.
 const interactive=!readOnly||selecting;
 const projection=useMemo(()=>projectWeeklyTimeline({slots,responses,currentUserId}),[slots,responses,currentUserId]);
 const allDates=useMemo(()=>datesBetween(startDate,endDate),[startDate,endDate]);
 const rows=useMemo(()=>calendarRows(allDates,slots),[allDates,slots]);
 const byId=useMemo(()=>new Map(slots.map(slot=>[slot.id,slot])),[slots]);
 const [detail,setDetail]=useState<string|null>(null);
 const people=projection.rows.filter(row=>readOnly||!row.isCurrentUser);
 // Null = automatic: more than six people start compact so names and lanes fit; the user can switch back.
 const [compactChoice,setCompact]=useState<boolean|null>(null),compact=Boolean(selection)||(compactChoice??people.length>AUTO_COMPACT_PEOPLE);
 const headerScroll=useRef<HTMLDivElement>(null),scroller=useRef<HTMLDivElement>(null);
 const hoverDetail=useMemo(()=>createHoverDetail(setDetail),[]);
 useEffect(()=>()=>hoverDetail.dispose(),[hoverDetail]);
 // Phones: 32px half-hour rows (comfortable tap target) and a two-day pager instead of a clipped third column.
 const phone=useMediaQuery('(max-width: 480px)'),rowHeight=phone?32:24;
 const [pagerStart,setPagerStart]=useState<number|null>(null);
 const mineSet=new Set(mine);
 const range=selection?.range??null,rangeIds=new Set(rangeSlotIds(slots,range));
 const relevantIds=range?[range.startId]:[...mine,...responses.flatMap(response=>response.slots)];
 const targetRow=scrollTargetRow(rows,relevantIds);
 const firstRelevantDate=relevantIds.map(id=>byId.get(id)?.date).filter(Boolean).sort()[0];
 const pager=pagerWindow(allDates,pagerStart??Math.max(0,allDates.indexOf(firstRelevantDate??'')),2);
 const dates=phone?pager.dates:allDates;
 const gesture=useRef(createGesture()),holdTimer=useRef<number|null>(null),drag=useRef<{value:boolean;seen:Set<string>;last?:Slot}|null>(null);
 function paint(slot:Slot){const d=drag.current;if(!d)return;const segment=dragSegment(d.last,slot,slots) as Slot[];d.last=slot;for(const cell of segment){if(d.seen.has(cell.id))continue;d.seen.add(cell.id);if(mineSet.has(cell.id)!==d.value)onToggle(cell.id)}}
 const pick=useRef<{drag:string|null}>({drag:null}),[anchor,setAnchor]=useState<string|null>(null);
 useEffect(()=>{if(anchor&&!(range?.startId===anchor&&range.endId===anchor))setAnchor(null)},[anchor,range]);
 function choose(next:ConfirmRange|null){if(next&&selection?.onChange&&!sameRange(next,range))selection.onChange(next)}
 function tap(slot:Slot){const next=tapRange({anchor},slots,slot.id);setAnchor(next.anchor);choose(next.range)}
 const savedBlocks=eventBlocks(rows,dates,people,rowHeight) as EventBlock[];
 const sizing=calendarSizing(savedBlocks),participantGutter=sizing.participantGutter;
 const own=projectDraftRow({slots:[...slots].sort((a,b)=>a.id.localeCompare(b.id)),selectedIds:mine,displayName:'You'});
 const ownBlocks=eventBlocks(rows,dates,[{...own,userId:currentUserId,label:'You',color:'var(--craft-person-you)'}],rowHeight) as EventBlock[];
 // Who is free per half-hour, for the Everyone cell names (saved responses only).
 const whoById=useMemo(()=>{const map=new Map<string,string[]>();for(const row of projection.rows)for(const id of row.slotIds)map.set(id,[...(map.get(id)||[]),row.label]);return map},[projection]);
 const repeatedTimes=new Set(rows.filter(row=>row.cycle>0).map(row=>row.time));

 // ── Scroll the time axis to the first relevant half-hour (minus an hour; else 8 AM). Instant, never smooth.
 useLayoutEffect(()=>{const el=scroller.current;if(el)el.scrollTop=targetRow*rowHeight},[rowHeight]); // eslint-disable-line react-hooks/exhaustive-deps

 // ── Roving tabindex: the grid is one Tab stop; arrow keys move focus between half-hours and days.
 const [focusId,setFocusId]=useState<string|null>(null);
 const cells=useRef(new Map<string,HTMLElement>()),pendingFocus=useRef<string|null>(null);
 const selectedIds=selection?(range?[range.startId]:[]):readOnly?[]:mine;
 const tabId=initialFocusId({rows,dates,lastId:focusId,selectedIds,fallbackRow:targetRow});
 useLayoutEffect(()=>{const id=pendingFocus.current;if(!id)return;const el=cells.current.get(id);if(el){pendingFocus.current=null;el.focus()}});
 function moveTo(id:string){
  const slot=byId.get(id);if(!slot)return;
  setFocusId(id);pendingFocus.current=id;
  if(phone&&!dates.includes(slot.date))setPagerStart(pagerStartFor(allDates,pager.start,slot.date,2));
  else cells.current.get(id)?.focus();
 }
 function blocksAt(id:string){return savedBlocks.filter(block=>block.slotIds.includes(id))}
 function activate(slot:Slot){
  if(selecting)tap(slot);
  else if(!readOnly)onToggle(slot.id);
  else{const block=blocksAt(slot.id)[0];if(block)hoverDetail.open(`${block.userId}:${block.startUtc}`,'pinned')}
 }
 function onCellKey(event:React.KeyboardEvent,slot:Slot){
  if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(slot);return}
  if(event.key==='Escape'&&detail){hoverDetail.close();return}
  if(!NAV_KEYS.has(event.key))return;
  const target=gridMove(rows,allDates,slot.id,event.key,{ctrl:event.ctrlKey||event.metaKey});
  if(!target)return;
  event.preventDefault();
  if(detail)hoverDetail.close();
  const next=byId.get(target)!;
  // Shift+Arrow extends: editing copies this half-hour's state onto the next; Confirm stretches the range on one date.
  if(event.shiftKey&&target!==slot.id){
   if(!readOnly){if(mineSet.has(next.id)!==mineSet.has(slot.id))onToggle(next.id)}
   else if(selecting&&next.date===slot.date){const pivot=range?.date===slot.date&&rangeIds.has(slot.id)?(slot.id===range.startId?range.endId:range.startId):slot.id;setAnchor(null);choose(dragRange(slots,pivot,next.id))}
  }
  moveTo(target);
 }
 const timeName=(slot:Slot,time:string)=>`${dayLabel(slot.date)}, ${clockLabel(time)}${repeatedTimes.has(time)?` (${offsetAt(slot.id,timezone)})`:''}`;
 function cellName(slot:Slot,time:string){
  const base=timeName(slot,time),count=projection.countById[slot.id]??0;
  if(selection)return `${base}, ${count} of ${selection.memberCount} available${rangeIds.has(slot.id)?', selected':''}${slot.id===anchor?', start':''}`;
  if(readOnly){const who=whoById.get(slot.id)||[];return who.length?`${base}, ${count} of ${projection.responseCount} available: ${who.join(', ')}`:`${base}, nobody available`}
  return `${base}, ${mineSet.has(slot.id)?'available':'not available'}`;
 }

 // ── Touch: tap toggles one half-hour; long-press then drag selects a range without fighting the page scroll.
 const clearHold=()=>{if(holdTimer.current!==null)window.clearTimeout(holdTimer.current);holdTimer.current=null};
 useEffect(()=>{const el=scroller.current;if(!el)return;const block=(event:TouchEvent)=>{if(gesture.current.holding()&&event.cancelable)event.preventDefault()};el.addEventListener('touchmove',block,{passive:false});return ()=>{el.removeEventListener('touchmove',block);clearHold()}},[]);
 function startHold(slot:Slot){clearHold();holdTimer.current=window.setTimeout(()=>{holdTimer.current=null;if(!gesture.current.hold())return;navigator.vibrate?.(8);if(selecting){pick.current.drag=slot.id;setAnchor(null);choose(dragRange(slots,slot.id,slot.id))}else{drag.current={value:!mineSet.has(slot.id),seen:new Set()};paint(slot)}},LONG_PRESS_MS)}
 function holdMove(x:number,y:number){const id=slotIdAt(x,y),slot=id&&byId.get(id);if(!slot)return;if(selecting&&pick.current.drag)choose(dragRange(slots,pick.current.drag,slot.id));else if(!readOnly)paint(slot)}
 const endPointer=()=>{clearHold();drag.current=null;pick.current.drag=null};

 function cellHandlers(slot:Slot):React.HTMLAttributes<HTMLDivElement>{
  if(!interactive)return {};
  return {
   onPointerDown:e=>{if(e.pointerType==='touch'){gesture.current.down('touch',e.clientX,e.clientY,slot.id);startHold(slot);return}if(e.button!==0)return;setFocusId(slot.id);if(selecting){pick.current.drag=slot.id;setAnchor(null);choose(dragRange(slots,slot.id,slot.id))}else{drag.current={value:!mineSet.has(slot.id),seen:new Set()};paint(slot)}},
   onPointerMove:e=>{if(e.pointerType!=='touch')return;if(gesture.current.holding()){holdMove(e.clientX,e.clientY);return}gesture.current.move(e.clientX,e.clientY);if(gesture.current.pointerType()===null)clearHold()},
   onPointerEnter:e=>{if(e.pointerType!=='mouse'||!e.buttons)return;if(selecting){const from=pick.current.drag;if(from)choose(dragRange(slots,from,slot.id))}else paint(slot)},
   onPointerUp:e=>{if(e.pointerType==='touch'){clearHold();const held=gesture.current.holding();if(gesture.current.up(e.clientX,e.clientY,slot.id)&&!held){setFocusId(slot.id);selecting?tap(slot):onToggle(slot.id)}}endPointer()},
   onPointerCancel:()=>{gesture.current.cancel();endPointer()},
   onContextMenu:e=>{if(gesture.current.holding()||holdTimer.current!==null)e.preventDefault()},
   onClick:e=>{if(gesture.current.click()==='suppress')e.preventDefault()},
  };
 }

 const label=selection?`Choose a time · ${timezone}`:readOnly?`Everyone’s availability · ${timezone}`:`Your availability · ${timezone}`;
 const instructionsId=useId();
 const instructions=selecting?(anchor?`Start set at ${clockLabel(byId.get(anchor)?.time??'00:00')}. Press Enter or Space on a later half-hour of the same day to set the end.`:'Arrow keys move between half-hours and days. Enter or Space sets the start, then the end; Shift with Up or Down stretches the range. On touch, tap twice or long-press and drag.')
  :readOnly?'Read-only view of saved availability. Arrow keys move between half-hours and days; each half-hour names who is free. Enter or Space opens the details of the first person there.'
  :'Click or drag to edit your availability. Arrow keys move between half-hours and days, Enter or Space toggles one, Shift with an arrow extends. On touch, tap toggles and long-press then drag selects a range.';
 const onScroll=(event:React.UIEvent<HTMLDivElement>)=>{if(headerScroll.current)headerScroll.current.scrollLeft=event.currentTarget.scrollLeft;if(!gesture.current.holding()){gesture.current.scroll();clearHold();drag.current=null}setDetail(null)};
 const dayWidth=phone?0:readOnly?everyoneDayWidth(savedBlocks,compact):sizing.dayWidth;
 const rangeRows=(date:string)=>{if(range?.date!==date)return [];const runs:{top:number;rows:number}[]=[];rows.forEach((row,index)=>{const slot=row.byDate[date] as Slot|undefined;if(!slot||!rangeIds.has(slot.id))return;const last=runs.at(-1);if(last&&last.top+last.rows===index)last.rows++;else runs.push({top:index,rows:1})});return runs};
 const pagerLabel=(date:string)=>`${weekday(date)} ${Number(date.slice(-2))}`;

 return <div className={`wwm-weekly ${readOnly?'wwm-everyone':''} ${readOnly&&compact?'wwm-everyone-compact':''}${selection?' wwm-confirm-mode':''}${selecting?' is-selecting':''}`}>
 {/* The room header already carries the date range, so the toolbar has no month heading; months show on the day headers where they change. */}
 {(hint||toolbar||!selection&&readOnly)&&<div className="wwm-calendar-toolbar">{hint&&<span className="wwm-calendar-join-hint">{hint}</span>}{(toolbar||!selection&&readOnly)&&<div className="wwm-calendar-tools">{!selection&&readOnly&&<ToggleGroup type="single" variant="outline" size="sm" className="wwm-segmented" aria-label="Calendar density" value={compact?'compact':'detailed'} onValueChange={value=>{if(!value)return;setCompact(value==='compact');setDetail(null)}}>{(['detailed','compact'] as const).map(mode=><ToggleGroupItem key={mode} value={mode} data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_COMPACT} data-analytics-id={mode}>{mode==='compact'?'Compact':'Detailed'}</ToggleGroupItem>)}</ToggleGroup>}{toolbar}</div>}</div>}
 {/* One short legend line; the grid itself carries no per-day sub-labels. Repeated hues (more than eight people) carry a pattern. */}
 <div className="wwm-week-legend" aria-label="Saved respondent colors">{!readOnly&&<span><i className="wwm-own-swatch"/>You</span>}{people.map(person=><span key={person.userId}><i style={{'--event-color':person.color} as React.CSSProperties} data-mark={person.mark||undefined}/>{person.label}</span>)}<span className="wwm-calendar-response-count">{selecting?'Drag on one day to choose a time':projection.responseCount?plural(projection.responseCount,'saved response'):'No saved responses yet'}</span></div>
 <span className="wwm-sr-only" id={instructionsId}>{instructions}</span>
 {selecting&&<span className="wwm-sr-only" role="status">{anchor?`Start set at ${clockLabel(byId.get(anchor)?.time??'00:00')}.`:''}</span>}
 {phone&&allDates.length>2&&<div className="wwm-day-pager" role="group" aria-label="Days shown"><Button type="button" variant="outline" size="icon" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_DAY_PAGER} data-analytics-id="previous" aria-label="Previous days" disabled={!pager.hasPrev} onClick={()=>setPagerStart(pager.start-2)}><ChevronLeft aria-hidden="true"/></Button><span aria-live="polite">{pagerLabel(pager.dates[0])}{pager.dates.length>1&&<> – {pagerLabel(pager.dates.at(-1)!)}</>}</span><Button type="button" variant="outline" size="icon" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_DAY_PAGER} data-analytics-id="next" aria-label="Next days" disabled={!pager.hasNext} onClick={()=>setPagerStart(pager.start+2)}><ChevronRight aria-hidden="true"/></Button></div>}
 <div className="wwm-calendar-frame" style={{'--wwm-day-count':dates.length,'--participant-gutter':`${participantGutter}px`,'--day-width':`${dayWidth}px`,'--row-height':`${rowHeight}px`} as React.CSSProperties}>
 <div className="wwm-calendar-header-scroll" ref={headerScroll}><div className="wwm-week-grid">
 <div className="wwm-week-corner" aria-hidden="true">Time</div>{dates.map((date,index)=><div key={date} className="wwm-week-date" aria-label={`${weekday(date)} ${formatCraftDate(date)}`}><span>{monthBoundaryLabel(date,dates[index-1])&&<span className="wwm-month-boundary">{monthBoundaryLabel(date,dates[index-1])} · </span>}{weekday(date)}</span><strong>{date.slice(-2)}</strong></div>)}
 </div></div>
 <div className="wwm-week-scroll" ref={scroller} onScroll={onScroll} onPointerUp={endPointer}><div className="wwm-week-grid">
 <div className="wwm-calendar-time-rail" aria-hidden="true">{rows.map(row=><div className={`wwm-week-time ${row.time.endsWith(':00')?'is-hour':''}`} key={row.key}>{row.time.endsWith(':00')&&<span>{hourLabel(row.time)}{row.cycle>0?' ↺':''}</span>}</div>)}</div>
 {dates.map((date,column)=><div className="wwm-calendar-day" key={date} data-date={date} style={{height:rows.length*rowHeight,gridColumn:column+2}}>
 {!readOnly&&<div className="wwm-calendar-selection" aria-hidden="true">{ownBlocks.filter(block=>block.date===date).map(block=><div className="wwm-calendar-own-event" data-density={block.slotIds.length===1?'single':block.slotIds.length===2?'double':'regular'} key={block.startUtc} style={{top:block.top+2,height:block.height-4}}><strong>You</strong>{block.slotIds.length>=2&&<small>{shortTime(block.startUtc,timezone)}–{shortTime(block.endUtc,timezone)}</small>}</div>)}</div>}
 {/* Saved blocks are mouse/touch targets for the detail popover; keyboard users read the same facts from the grid cells. */}
 <div className="wwm-calendar-events" aria-hidden="true">{savedBlocks.filter(block=>block.date===date).map(block=>{const id=`${block.userId}:${block.startUtc}`;return <Popover key={id} open={detail===id} onOpenChange={open=>{if(open)hoverDetail.open(id,'pinned');else hoverDetail.close()}}>
 <PopoverAnchor asChild><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.AVAILABILITY_BLOCK} className="wwm-calendar-event wwm-participant-rail" tabIndex={-1} data-density={density(block.slotIds.length)} data-mark={block.mark||undefined} data-start={block.startUtc} data-end={block.endUtc} style={{top:block.top+2,height:block.height-4,left:readOnly?eventGeometry(block,compact,phone).left:block.lane*16,width:readOnly?eventGeometry(block,compact,phone).width:12,'--event-color':block.color} as unknown as React.CSSProperties} aria-label={`${block.label}, ${formatCraftDate(date)}, ${timeAt(block.startUtc,timezone)} to ${timeAt(block.endUtc,timezone)}`} onMouseEnter={()=>hoverDetail.open(id,'hover')} onMouseLeave={()=>hoverDetail.leave()} onClick={()=>hoverDetail.open(id,'pinned')}>{readOnly&&!compact?<><strong>{block.label}</strong>{block.slotIds.length>=2&&<span className="wwm-event-time">{shortTime(block.startUtc,timezone)}–{shortTime(block.endUtc,timezone)}</span>}</>:<span className="wwm-sr-only">{block.label}</span>}</button></PopoverAnchor>
 <PopoverContent onMouseEnter={()=>hoverDetail.enter()} onMouseLeave={()=>hoverDetail.leave()} className="wwm-week-detail" side="top" align="start" collisionPadding={8} onOpenAutoFocus={e=>e.preventDefault()} onCloseAutoFocus={e=>e.preventDefault()} onInteractOutside={e=>{if((e.target as HTMLElement).closest?.('.wwm-calendar-event'))e.preventDefault()}}><div className="wwm-detail-person"><i aria-hidden="true" style={{backgroundColor:block.color}}/><strong>{block.label}</strong></div><span className="wwm-detail-date">{formatCraftDate(date)} · {weekday(date)}</span><span className="wwm-detail-time" aria-label={`${timeAt(block.startUtc,timezone)} to ${timeAt(block.endUtc,timezone)}`}>{shortTime(block.startUtc,timezone)}<span aria-hidden="true">–</span>{shortTime(block.endUtc,timezone)}</span></PopoverContent>
 </Popover>})}</div>
 {range&&<div className="wwm-confirm-layer" aria-hidden="true">{rangeRows(date).map((run,index)=><div className="wwm-confirm-range" data-density={run.rows===1?'single':'regular'} key={run.top} style={{top:run.top*rowHeight+1,height:run.rows*rowHeight-2}}>{index===0&&<><strong>{selection?.rangeLabel||'Selected'}</strong><small>{rangeFields(slots,range)?.start}–{rangeFields(slots,range)?.end}</small></>}</div>)}</div>}
 </div>)}
 {/* One ARIA grid over the day columns (row-major, subgrid-aligned): a single Tab stop with arrow-key navigation. */}
 <div className={`wwm-cell-grid${interactive?' is-interactive':''}`} role="grid" aria-label={label} aria-describedby={instructionsId} aria-readonly={!interactive||undefined} aria-rowcount={rows.length} aria-colcount={allDates.length}>{rows.map((row,rowIndex)=><div role="row" className="wwm-cell-row" key={row.key} aria-rowindex={rowIndex+1}>{dates.map((date,column)=>{const slot=row.byDate[date] as Slot|undefined;if(!slot)return null;const on=selection?rangeIds.has(slot.id):!readOnly&&mineSet.has(slot.id);
 return <div key={slot.id} role="gridcell" ref={el=>{if(el)cells.current.set(slot.id,el);else cells.current.delete(slot.id)}} data-slot-id={slot.id} data-analytics-label={selecting?ANALYTICS_ELEMENTS.CONFIRM_CELL:!readOnly?ANALYTICS_ELEMENTS.AVAILABILITY_CELL:undefined} className={`wwm-grid-cell${on?' is-selected':''}${slot.id===anchor?' is-anchor':''}`} style={{gridColumn:column+2}} aria-colindex={allDates.indexOf(date)+1} aria-label={cellName(slot,row.time)} tabIndex={slot.id===tabId?0:-1} onFocus={()=>{if(focusId!==slot.id)setFocusId(slot.id)}} onKeyDown={event=>onCellKey(event,slot)} {...cellHandlers(slot)}/>})}</div>)}</div>
 </div></div></div></div>;
}
