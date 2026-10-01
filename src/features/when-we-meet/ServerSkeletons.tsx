'use client';
import './async-region.css';
import './skeleton.css';
import {CalendarDays} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import WallBackLink from '@/container/light-wall/WallBackLink';
import {makeSlots} from './domain.mjs';
import {TabIndicator} from './TabIndicator';
import {WeeklyAvailability} from './WeeklyAvailability';
import {useWwmCopy} from './i18n/WwmI18nProvider';

/**
 * Loading states are the loaded screen with its data removed, not a separate drawing: they render the same
 * components and class names (header, tabs, toolbar, legend, calendar grid, list rows), so every height and
 * position is the real one. Only data (names, counts, saved times) is replaced by shimmer. `.wwm-ghost` makes
 * a real subtree inert and hides the data text.
 */
type Slot={id:string;utc:string;date:string;time:string};
const noop=()=>undefined;
/** One shimmer bar sized like the text line it stands in for. */
const Bar=({width,height='.8em',className=''}:{width:number|string;height?:number|string;className?:string})=><i className={`wwm-skel ${className}`} style={{width,height}} aria-hidden="true"/>;

/** Rows of the meetings list: same ul/li/a grid as the real rows, one title line, one summary line, the count on the right. */
export function MeetingRowsSkeleton({rows=3}:{rows?:number}){
 const {t}=useWwmCopy();
 const widths=[[132,248],[104,226],[156,262],[118,236]];
 return <section className="wwm-card wwm-meetings" role="status" aria-busy="true" aria-label={t('list.loadingShort')}>
  <span className="wwm-sr-only">{t('list.loading')}</span>
  <ul aria-hidden="true">{Array.from({length:rows},(_,index)=><li key={index}><div className="wwm-skeleton-link"><div className="wwm-meeting-title-row"><strong><Bar width={widths[index%widths.length][0]}/></strong><span className="wwm-participant-count"><Bar width={26} height={12}/></span></div><span><Bar width={widths[index%widths.length][1]} height=".75em"/></span></div></li>)}</ul>
 </section>;
}

/** Where a primary action will appear once the account check finishes (the invitation's Continue with Google button is 190x44). */
export function ButtonSkeleton({label}:{label:string}){return <div className="wwm-button-skeleton" role="status" aria-busy="true" aria-label={label}><Bar width={190} height={44} className="wwm-skel-field"/></div>}

// Placeholder window for a room whose dates are not known yet (Mon–Sun, whole day). Its date text is hidden by `.wwm-ghost[data-dummy]`.
const DUMMY_SLOTS=makeSlots({title:'-',startDate:'2026-01-05',endDate:'2026-01-11',startTime:'00:00',endTime:'24:00',timezone:'UTC'}) as Slot[];
const DUMMY={startDate:'2026-01-05',endDate:'2026-01-11',timezone:'UTC'};

/** The real calendar with nothing saved: header, legend row, grid, collapsed-hours row. Inert; the legend text and shimmer mark the pending data. */
export function GhostCalendar({startDate,endDate,timezone,slots,withFill=true}:{startDate?:string;endDate?:string;timezone?:string;slots?:Slot[];withFill?:boolean}){
 const {t}=useWwmCopy();
 const known=Boolean(slots?.length);
 const toolbar=<Button type="button" variant="outline" size="lg" className="wwm-calendar-fill-trigger" tabIndex={-1} disabled><CalendarDays aria-hidden="true"/>{t('fill.trigger')}</Button>;
 return <div className="wwm-ghost" data-dummy={known?undefined:'true'} aria-hidden="true" inert>
  <WeeklyAvailability startDate={known?startDate!:DUMMY.startDate} endDate={known?endDate!:DUMMY.endDate} timezone={known?timezone!:DUMMY.timezone} slots={known?slots!:DUMMY_SLOTS} responses={[]} currentUserId="" mine={[]} onToggle={noop} dirty={false} toolbar={withFill?toolbar:undefined}/>
 </div>;
}

/** The four room tabs (real labels, none active-able) with the real sliding underline; the count on the right is pending data. */
export function GhostTabs({view='availability'}:{view?:'availability'|'everyone'|'people'|'confirm'}){
 const {t}=useWwmCopy();
 const names={availability:t('room.tabs.availability'),everyone:t('room.tabs.everyone'),people:t('room.tabs.people'),confirm:t('room.tabs.confirm')} as const;
 return <Tabs value={view}><div className="wwm-tabs-row"><TabsList className="wwm-view-switch" aria-label={t('room.views')}>{(Object.keys(names) as Array<keyof typeof names>).map(tab=><TabsTrigger key={tab} value={tab} type="button" disabled>{names[tab]}</TabsTrigger>)}<TabIndicator value={view}/></TabsList><span className="wwm-save-state wwm-ghost-count" aria-hidden="true"><Bar width={57} height={12}/></span></div></Tabs>;
}

/** Confirm tab while the confirmation loads: same heading, three fields, best-times card and calendar as the loaded tab. */
export function ConfirmSkeleton({startDate,endDate,timezone,slots}:{startDate?:string;endDate?:string;timezone?:string;slots?:Slot[]}){
 const {t}=useWwmCopy();
 return <section className="wwm-confirm wwm-confirm-ghost" role="status" aria-busy="true" aria-label={t('confirm.loading')}>
  <header className="wwm-confirm-heading" aria-hidden="true"><div><h2><Bar width={168} height=".75em"/></h2></div></header>
  <fieldset className="wwm-confirm-controls" disabled aria-hidden="true">{[88,72,72].map((label,index)=><div key={index} className="wwm-confirm-ghost-field"><span className="wwm-confirm-ghost-label"><Bar width={label} height={14}/></span><Bar width="100%" height={44} className="wwm-skel-field"/></div>)}</fieldset>
  <Card className="wwm-best-times wwm-confirm-ghost-best" aria-hidden="true"><h3><Bar width={84} height={16}/></h3><ul>{[0,1].map(index=><li key={index}><Bar width="100%" height={58} className="wwm-skel-field"/></li>)}</ul></Card>
  <GhostCalendar startDate={startDate} endDate={endDate} timezone={timezone} slots={slots} withFill={false}/>
 </section>;
}

/** The room card before its responses arrive (room dates known): the real tabs, then the real empty calendar (or the Confirm placeholder). `panel` replaces the body for tabs that need no responses. */
export function AvailabilitySkeleton({view='availability',startDate,endDate,timezone,slots,panel}:{view?:'availability'|'everyone'|'people'|'confirm';startDate?:string;endDate?:string;timezone?:string;slots?:Slot[];panel?:React.ReactNode}){
 const {t}=useWwmCopy();
 const body=panel??(view==='confirm'?<ConfirmSkeleton startDate={startDate} endDate={endDate} timezone={timezone} slots={slots}/>:<GhostCalendar startDate={startDate} endDate={endDate} timezone={timezone} slots={slots}/>);
 return <section className="wwm-card wwm-availability" aria-busy="true" aria-label={t('room.loadingAvailability')}><span className="wwm-sr-only" role="status">{t('room.loadingAvailability')}</span><GhostTabs view={view}/><div className="wwm-tab-panel"><div className="wwm-tab-reveal">{body}</div></div></section>;
}

/** Whole room page before anything is known (route fallback): the real header geometry with bars, then the card. */
export function RoomSkeleton(){
 const {t}=useWwmCopy();
 return <><div className="wwm-topline"><WallBackLink href="/craft/when-we-meet">{t('app.meetings')}</WallBackLink></div><div className="wwm-shell">
  <header className="wwm-room-header" aria-label={t('room.loading')} aria-busy="true">
   <h1 aria-hidden="true"><Bar width="min(100%,220px)" height=".8em"/></h1>
   <div className="wwm-header-actions" aria-hidden="true"><Bar width={98} height={44} className="wwm-skel-field"/><Bar width={44} height={44} className="wwm-skel-field"/></div>
   <p className="wwm-room-meta" aria-hidden="true"><Bar width={188} height={14}/><Bar width={76} height={24} className="wwm-skel-field"/></p>
  </header>
  <AvailabilitySkeleton/></div></>;
}
