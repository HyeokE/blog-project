'use client';
import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {createHoverDetail} from './hover-detail.mjs';
import {monthBoundaryLabel} from './month-boundary.mjs';
import {hourLabel,clockLabel,dayLabel,weekdayLabel} from './hour-label.mjs';
import {projectWeeklyTimeline,projectDraftRow} from './weekly-timeline.mjs';
import {calendarRows,eventBlocks,calendarSizing} from './calendar-rows.mjs';
import {eventGeometry} from './everyone-geometry.mjs';
import {gridMove,initialFocusId,scrollTargetRow,pagerWindow,pagerStartFor} from './grid-navigation.mjs';
import {Button} from '@/components/ui/button';
import {ToggleGroup,ToggleGroupItem} from '@/components/ui/toggle-group';
import {createGesture} from './gesture.mjs';
import {dragRange,tapRange,rangeFields,rangeSlotIds,type ConfirmRange} from './confirm-selection.mjs';
import {dragSegment} from './drag-segment.mjs';
import {formatCraftDate} from './display-date.mjs';
import {Popover,PopoverAnchor,PopoverContent} from '@/components/ui/popover';
import './week-calendar.css';
import {useWwmCopy} from './i18n/WwmI18nProvider';
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
const sameRange=(a:ConfirmRange|null,b:ConfirmRange|null)=>a?.date===b?.date&&a?.startId===b?.startId&&a?.endId===b?.endId;
const density=(count:number)=>count===1?'single':count===2?'double':'regular';
const NAV_KEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown']);
/** The slot under a finger during a long-press drag (touch pointers stay captured by the cell they started on). */
const slotIdAt=(x:number,y:number)=>(document.elementFromPoint(x,y)?.closest('[data-slot-id]') as HTMLElement|null)?.dataset.slotId;

export function WeeklyAvailability({startDate,endDate,timezone,slots,responses,currentUserId,mine=NONE,onToggle=ignore,dirty=false,readOnly:everyoneView=false,selection,toolbar,hint}:CalendarProps&(EditProps|ConfirmProps)){
 // Confirm mode reuses the Everyone view, always compact; its rails are visual only while selecting.
 const copy=useWwmCopy(),{t,locale}=copy;
 const weekday=(date:string)=>weekdayLabel(date,locale);
 const readOnly=everyoneView||Boolean(selection),selecting=Boolean(selection?.onChange);
 // Cells are interactive while editing or choosing a confirm range; otherwise they are a keyboard reading layer.
 const interactive=!readOnly||selecting;
 const you=t('common.you');
 const projection=useMemo(()=>projectWeeklyTimeline({slots,responses,currentUserId,youLabel:you}),[slots,responses,currentUserId,you]);
 const allDates=useMemo(()=>datesBetween(startDate,endDate),[startDate,endDate]);
 const allRows=useMemo(()=>calendarRows(allDates,slots),[allDates,slots]);
 const byId=useMemo(()=>new Map(slots.map(slot=>[slot.id,slot])),[slots]);
 const [detail,setDetail]=useState<string|null>(null);
 const people=projection.rows.filter(row=>readOnly||!row.isCurrentUser);
 // Null = automatic: more than six people start compact so names and lanes fit; the user can switch back.
 const [compactChoice,setCompact]=useState<boolean|null>(null),compact=Boolean(selection)||(compactChoice??people.length>AUTO_COMPACT_PEOPLE);
 const scroller=useRef<HTMLDivElement>(null);
 const hoverDetail=useMemo(()=>createHoverDetail(setDetail),[]);
 useEffect(()=>()=>hoverDetail.dispose(),[hoverDetail]);
 // Phones: 32px half-hour rows (comfortable tap target). Vertically the calendar flows with the page (no inner
 // scroller). Phones show every day and swipe sideways, ~2 days per screen; larger screens page seven days at a time.
 const phone=useMediaQuery('(max-width: 480px)'),rowHeight=phone?32:24,pageSize=7;
 const headerScroll=useRef<HTMLDivElement>(null);
 const [pagerStart,setPagerStart]=useState<number|null>(null);
 const mineSet=new Set(mine);
 const range=selection?.range??null,rangeIds=new Set(rangeSlotIds(slots,range));
 const savedIds=[...mine,...responses.flatMap(response=>response.slots)];
 const relevantIds=range?[range.startId,...savedIds]:savedIds;
 // Empty leading hours collapse behind one "Show 12 AM–8 AM" row (an hour before the first saved or chosen
 // half-hour, else 8 AM). The boundary never moves later while this view is open, so the grid does not jump.
 const target=scrollTargetRow(allRows,relevantIds);
 const [firstCollapse]=useState(target),[expanded,setExpanded]=useState(false);
 const collapsed=expanded?0:Math.min(firstCollapse,target);
 const rows=useMemo(()=>collapsed?allRows.slice(collapsed):allRows,[allRows,collapsed]);
 const firstRelevantDate=(range?[range.startId]:relevantIds).map(id=>byId.get(id)?.date).filter(Boolean).sort()[0];
 const pager=pagerWindow(allDates,pagerStart??Math.max(0,allDates.indexOf(firstRelevantDate??'')),pageSize);
 const paged=!phone&&allDates.length>pageSize;
 const dates=paged?pager.dates:allDates;
 const gesture=useRef(createGesture()),holdTimer=useRef<number|null>(null),drag=useRef<{value:boolean;seen:Set<string>;last?:Slot}|null>(null);
 function paint(slot:Slot){const d=drag.current;if(!d)return;const segment=dragSegment(d.last,slot,slots) as Slot[];d.last=slot;for(const cell of segment){if(d.seen.has(cell.id))continue;d.seen.add(cell.id);if(mineSet.has(cell.id)!==d.value)onToggle(cell.id)}}
 const pick=useRef<{drag:string|null}>({drag:null}),[anchor,setAnchor]=useState<string|null>(null);
 useEffect(()=>{if(anchor&&!(range?.startId===anchor&&range.endId===anchor))setAnchor(null)},[anchor,range]);
 function choose(next:ConfirmRange|null){if(next&&selection?.onChange&&!sameRange(next,range))selection.onChange(next)}
 function tap(slot:Slot){const next=tapRange({anchor},slots,slot.id);setAnchor(next.anchor);choose(next.range)}
 const savedBlocks=eventBlocks(rows,dates,people,rowHeight) as EventBlock[];
 const sizing=calendarSizing(savedBlocks),participantGutter=sizing.participantGutter,railLanes=Math.max(1,participantGutter/16);
 const own=projectDraftRow({slots:[...slots].sort((a,b)=>a.id.localeCompare(b.id)),selectedIds:mine,displayName:you});
 const ownBlocks=eventBlocks(rows,dates,[{...own,userId:currentUserId,label:you,color:'var(--craft-person-you)'}],rowHeight) as EventBlock[];
 // Who is free per half-hour, for the Everyone cell names (saved responses only).
 const whoById=useMemo(()=>{const map=new Map<string,string[]>();for(const row of projection.rows)for(const id of row.slotIds)map.set(id,[...(map.get(id)||[]),row.label]);return map},[projection]);
 const repeatedTimes=new Set(rows.filter(row=>row.cycle>0).map(row=>row.time));


 // ── Roving tabindex: the grid is one Tab stop; arrow keys move focus between half-hours and days.
 const [focusId,setFocusId]=useState<string|null>(null);
 const cells=useRef(new Map<string,HTMLElement>()),pendingFocus=useRef<string|null>(null);
 const selectedIds=selection?(range?[range.startId]:[]):readOnly?[]:mine;
 const tabId=initialFocusId({rows,dates,lastId:focusId,selectedIds,fallbackRow:Math.max(0,target-collapsed)});
 useLayoutEffect(()=>{const id=pendingFocus.current;if(!id)return;const el=cells.current.get(id);if(el){pendingFocus.current=null;el.focus()}});
 function moveTo(id:string){
  const slot=byId.get(id);if(!slot)return;
  setFocusId(id);pendingFocus.current=id;
  if(paged&&!dates.includes(slot.date))setPagerStart(pagerStartFor(allDates,pager.start,slot.date,pageSize));
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
 // `Wed, Sep 30, 6:00 AM` / `9월 30일 (수) 오전 6:00`; a repeated (DST fall-back) wall clock adds its UTC offset.
 const timeName=(slot:Slot,time:string)=>`${t('grid.when',{day:dayLabel(slot.date,locale),time:clockLabel(time,locale)})}${repeatedTimes.has(time)?` (${offsetAt(slot.id,timezone)})`:''}`;
 function cellName(slot:Slot,time:string){
  const when=timeName(slot,time),count=projection.countById[slot.id]??0;
  if(selection)return `${t('grid.cellCount',{when,count,total:selection.memberCount})}${rangeIds.has(slot.id)?t('grid.cellSelectedSuffix'):''}${slot.id===anchor?t('grid.cellStartSuffix'):''}`;
  if(readOnly){const who=whoById.get(slot.id)||[];return who.length?t('grid.cellPeople',{when,count,total:projection.responseCount,names:who.join(t('common.listSeparator'))}):t('grid.cellNobody',{when})}
  return t(mineSet.has(slot.id)?'grid.cellAvailable':'grid.cellNotAvailable',{when});
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

 const label=t(selection?'grid.labelChoose':readOnly?'grid.labelEveryone':'grid.labelYours',{timezone});
 const instructionsId=useId();
 const anchorTime=clockLabel(byId.get(anchor??'')?.time??'00:00',locale);
 const instructions=selecting?(anchor?t('grid.instructions.anchor',{time:anchorTime}):t('grid.instructions.select'))
  :readOnly?t('grid.instructions.readOnly')
  :t('grid.instructions.edit');
 // The page is the only scroller: a scroll ends a pending long-press and closes a hover detail.
 useEffect(()=>{const onScroll=()=>{if(!gesture.current.holding()){gesture.current.scroll();clearHold();drag.current=null}setDetail(null)};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll)},[]); // eslint-disable-line react-hooks/exhaustive-deps -- refs and setters only
 const rangeRows=(date:string)=>{if(range?.date!==date)return [];const runs:{top:number;rows:number}[]=[];rows.forEach((row,index)=>{const slot=row.byDate[date] as Slot|undefined;if(!slot||!rangeIds.has(slot.id))return;const last=runs.at(-1);if(last&&last.top+last.rows===index)last.rows++;else runs.push({top:index,rows:1})});return runs};
 const timeLabel=(time:string)=>time.endsWith(':00')?hourLabel(time,locale):clockLabel(time,locale);
 // When the shown days span two months, both ends name their month ("10월 26일 (월) – 11월 1일 (일)").
 const pagerLabel=(date:string,withMonth=false)=>withMonth?t('grid.pagerMonthDay',{month:new Intl.DateTimeFormat(locale,{month:locale==='ko'?'numeric':'short',timeZone:'UTC'}).format(new Date(`${date}T00:00:00Z`)),weekday:weekday(date),day:Number(date.slice(-2))}):t('grid.pagerDay',{weekday:weekday(date),day:Number(date.slice(-2))});
 const pagerCrossMonth=Boolean(pager.dates.length>1&&pager.dates[0].slice(0,7)!==pager.dates.at(-1)!.slice(0,7));

 return <div className={`wwm-weekly ${readOnly?'wwm-everyone':''} ${readOnly&&compact?'wwm-everyone-compact':''}${selection?' wwm-confirm-mode':''}${selecting?' is-selecting':''}`}>
 {/* The room header already carries the date range, so the toolbar has no month heading; months show on the day headers where they change. */}
 {(hint||toolbar||!selection&&readOnly)&&<div className="wwm-calendar-toolbar">{hint&&<span className="wwm-calendar-join-hint">{hint}</span>}{(toolbar||!selection&&readOnly)&&<div className="wwm-calendar-tools">{!selection&&readOnly&&<ToggleGroup type="single" variant="outline" size="sm" className="wwm-segmented" aria-label={t('grid.density')} value={compact?'compact':'detailed'} onValueChange={value=>{if(!value)return;setCompact(value==='compact');setDetail(null)}}>{(['detailed','compact'] as const).map(mode=><ToggleGroupItem key={mode} value={mode} data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_COMPACT} data-analytics-id={mode}>{mode==='compact'?t('grid.compact'):t('grid.detailed')}</ToggleGroupItem>)}</ToggleGroup>}{toolbar}</div>}</div>}
 {/* One short legend line; the grid itself carries no per-day sub-labels. Repeated hues (more than eight people) carry a pattern. */}
 <div className="wwm-week-legend" aria-label={t('grid.legend')}>{!readOnly&&<span><i className="wwm-own-swatch"/>{you}</span>}{people.map(person=><span key={person.userId}><i style={{'--event-color':person.color} as React.CSSProperties} data-mark={person.mark||undefined}/>{person.label}</span>)}<span className="wwm-calendar-response-count">{selecting?t('grid.dragHint'):projection.responseCount?t('grid.savedResponses',{count:projection.responseCount}):t('grid.noResponses')}</span></div>
 <span className="wwm-sr-only" id={instructionsId}>{instructions}</span>
 {selecting&&<span className="wwm-sr-only" role="status">{anchor?t('grid.startSet',{time:anchorTime}):''}</span>}
 {paged&&<div className="wwm-day-pager" role="group" aria-label={t('grid.daysShown')}><Button type="button" variant="outline" size="icon" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_DAY_PAGER} data-analytics-id="previous" aria-label={t('grid.previousDays')} disabled={!pager.hasPrev} onClick={()=>setPagerStart(pager.start-pageSize)}><ChevronLeft aria-hidden="true"/></Button><span aria-live="polite">{pagerLabel(pager.dates[0],pagerCrossMonth)}{pager.dates.length>1&&<> – {pagerLabel(pager.dates.at(-1)!,pagerCrossMonth)}</>}</span><Button type="button" variant="outline" size="icon" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_DAY_PAGER} data-analytics-id="next" aria-label={t('grid.nextDays')} disabled={!pager.hasNext} onClick={()=>setPagerStart(pager.start+pageSize)}><ChevronRight aria-hidden="true"/></Button></div>}
 <div className={`wwm-calendar-frame${phone?' is-hscroll':''}`} style={{'--wwm-day-count':dates.length,'--wwm-lanes':railLanes,'--participant-gutter':`min(${participantGutter}px, 40%)`,'--row-height':`${rowHeight}px`} as React.CSSProperties}>
 <div className="wwm-calendar-header" ref={headerScroll}><div className="wwm-week-grid">
 <div className="wwm-week-corner" aria-hidden="true">{t('grid.time')}</div>{dates.map((date,index)=>{const month=monthBoundaryLabel(date,dates[index-1],locale);return <div key={date} className="wwm-week-date" aria-label={copy.dayLabel(date)}><span>{month&&<span className="wwm-month-boundary">{month} · </span>}{weekday(date)}</span><strong>{date.slice(-2)}</strong></div>})}
 </div></div>
 {collapsed>0&&<button type="button" className="wwm-calendar-earlier" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_SHOW_EARLIER} onClick={()=>{const keep=tabId;setExpanded(true);if(keep){setFocusId(keep);pendingFocus.current=keep}}}>{t('grid.showEarlier',{from:timeLabel(allRows[0].time),to:timeLabel(allRows[collapsed].time)})}</button>}
 <div className="wwm-week-body" ref={scroller} onPointerUp={endPointer} onScroll={phone?()=>{if(headerScroll.current&&scroller.current)headerScroll.current.scrollLeft=scroller.current.scrollLeft}:undefined}><div className="wwm-week-grid">
 <div className="wwm-calendar-time-rail" aria-hidden="true">{rows.map(row=><div className={`wwm-week-time ${row.time.endsWith(':00')?'is-hour':''}`} key={row.key}>{row.time.endsWith(':00')&&<span>{hourLabel(row.time,locale)}{row.cycle>0?' ↺':''}</span>}</div>)}</div>
 {dates.map((date,column)=><div className="wwm-calendar-day" key={date} data-date={date} style={{height:rows.length*rowHeight,gridColumn:column+2}}>
 {!readOnly&&<div className="wwm-calendar-selection" aria-hidden="true">{ownBlocks.filter(block=>block.date===date).map(block=><div className="wwm-calendar-own-event" data-density={block.slotIds.length===1?'single':block.slotIds.length===2?'double':'regular'} key={block.startUtc} style={{top:block.top+2,height:block.height-4}}><strong>{you}</strong>{block.slotIds.length>=2&&<small>{shortTime(block.startUtc,timezone)}–{shortTime(block.endUtc,timezone)}</small>}</div>)}</div>}
 {/* Saved blocks are mouse/touch targets for the detail popover; keyboard users read the same facts from the grid cells. */}
 <div className="wwm-calendar-events" aria-hidden="true">{savedBlocks.filter(block=>block.date===date).map(block=>{const id=`${block.userId}:${block.startUtc}`;return <Popover key={id} open={detail===id} onOpenChange={open=>{if(open)hoverDetail.open(id,'pinned');else hoverDetail.close()}}>
 <PopoverAnchor asChild><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.AVAILABILITY_BLOCK} className="wwm-calendar-event wwm-participant-rail" tabIndex={-1} data-density={density(block.slotIds.length)} data-mark={block.mark||undefined} data-start={block.startUtc} data-end={block.endUtc} style={{top:block.top+2,height:block.height-4,left:readOnly?eventGeometry(block,compact,true).left:`${block.lane/railLanes*100}%`,width:readOnly?eventGeometry(block,compact,true).width:`calc(${100/railLanes}% - 4px)`,'--event-color':block.color} as unknown as React.CSSProperties} aria-label={t('grid.blockName',{name:block.label,date:formatCraftDate(date),start:timeAt(block.startUtc,timezone),end:timeAt(block.endUtc,timezone)})} onMouseEnter={()=>hoverDetail.open(id,'hover')} onMouseLeave={()=>hoverDetail.leave()} onClick={()=>hoverDetail.open(id,'pinned')}>{readOnly&&!compact?<><strong>{block.label}</strong>{block.slotIds.length>=2&&<span className="wwm-event-time">{shortTime(block.startUtc,timezone)}–{shortTime(block.endUtc,timezone)}</span>}</>:<span className="wwm-sr-only">{block.label}</span>}</button></PopoverAnchor>
 <PopoverContent onMouseEnter={()=>hoverDetail.enter()} onMouseLeave={()=>hoverDetail.leave()} className="wwm-week-detail" side="top" align="start" collisionPadding={8} onOpenAutoFocus={e=>e.preventDefault()} onCloseAutoFocus={e=>e.preventDefault()} onInteractOutside={e=>{if((e.target as HTMLElement).closest?.('.wwm-calendar-event'))e.preventDefault()}}><div className="wwm-detail-person"><i aria-hidden="true" style={{backgroundColor:block.color}}/><strong>{block.label}</strong></div><span className="wwm-detail-date">{formatCraftDate(date)} · {weekday(date)}</span><span className="wwm-detail-time" aria-label={t('grid.blockTime',{start:timeAt(block.startUtc,timezone),end:timeAt(block.endUtc,timezone)})}>{shortTime(block.startUtc,timezone)}<span aria-hidden="true">–</span>{shortTime(block.endUtc,timezone)}</span></PopoverContent>
 </Popover>})}</div>
 {range&&<div className="wwm-confirm-layer" aria-hidden="true">{rangeRows(date).map((run,index)=><div className="wwm-confirm-range" data-density={run.rows===1?'single':'regular'} key={run.top} style={{top:run.top*rowHeight+1,height:run.rows*rowHeight-2}}>{index===0&&<><strong>{selection?.rangeLabel||t('grid.selected')}</strong><small>{rangeFields(slots,range)?.start}–{rangeFields(slots,range)?.end}</small></>}</div>)}</div>}
 </div>)}
 {/* One ARIA grid over the day columns (row-major, subgrid-aligned): a single Tab stop with arrow-key navigation. */}
 <div className={`wwm-cell-grid${interactive?' is-interactive':''}`} role="grid" aria-label={label} aria-describedby={instructionsId} aria-readonly={!interactive||undefined} aria-rowcount={rows.length} aria-colcount={allDates.length}>{rows.map((row,rowIndex)=><div role="row" className="wwm-cell-row" key={row.key} aria-rowindex={rowIndex+1}>{dates.map((date,column)=>{const slot=row.byDate[date] as Slot|undefined;if(!slot)return null;const on=selection?rangeIds.has(slot.id):!readOnly&&mineSet.has(slot.id);
 return <div key={slot.id} role="gridcell" ref={el=>{if(el)cells.current.set(slot.id,el);else cells.current.delete(slot.id)}} data-slot-id={slot.id} data-analytics-label={selecting?ANALYTICS_ELEMENTS.CONFIRM_CELL:!readOnly?ANALYTICS_ELEMENTS.AVAILABILITY_CELL:undefined} className={`wwm-grid-cell${on?' is-selected':''}${slot.id===anchor?' is-anchor':''}`} style={{gridColumn:column+2}} aria-colindex={allDates.indexOf(date)+1} aria-label={cellName(slot,row.time)} tabIndex={slot.id===tabId?0:-1} onFocus={()=>{if(focusId!==slot.id)setFocusId(slot.id)}} onKeyDown={event=>onCellKey(event,slot)} {...cellHandlers(slot)}/>})}</div>)}</div>
 </div></div></div></div>;
}
