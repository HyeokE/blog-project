import type {Meta,StoryObj} from '@storybook/nextjs-vite';
import {useState} from 'react';
import {userEvent,expect,waitFor} from 'storybook/test';
import {activeLocale,cellNamed,cellWhen,storyCopy,within} from './locale-within';
import {hourLabel} from '@/features/when-we-meet/hour-label.mjs';
import {WeeklyAvailability} from '@/features/when-we-meet/WeeklyAvailability';
import {makeSlots} from '@/features/when-we-meet/domain.mjs';
import type {ConfirmRange} from '@/features/when-we-meet/confirm-selection.mjs';
import {MockAccountProvider,PERSON} from './mock-account';

// Availability grid in isolation: keyboard model, many respondents, phone pager and Confirm selection.
type Slot={id:string;utc:string;date:string;time:string};
const room={title:'Team coffee',startDate:'2026-09-28',endDate:'2026-10-02',startTime:'00:00',endTime:'24:00',timezone:'Asia/Seoul'};
const slots=makeSlots(room) as Slot[];
const at=(date:string,from:string,to:string)=>slots.filter(slot=>slot.date===date&&slot.time>=from&&slot.time<to).map(slot=>slot.id);
const NAMES=['Alex Sample','Morgan Sample','Taylor Sample','Jordan Sample','Riley Sample','Casey Sample','Jamie Sample','Avery Sample','Quinn Sample','Parker Sample','Rowan Sample','Sage Sample','Emerson Sample','Hayden Sample','Reese Sample'];
const many=NAMES.map((displayName,i)=>({userId:i===0?PERSON.id:`person-${String(i).padStart(2,'0')}`,displayName,slots:[...at('2026-09-30',`${String(9+i%4).padStart(2,'0')}:00`,`${String(12+i%3).padStart(2,'0')}:30`),...at('2026-10-01','14:00',i%2?'16:00':'15:00')]}));
const few=[{userId:PERSON.id,displayName:'Alex Sample',slots:at('2026-09-30','10:00','11:30')},{userId:'person-01',displayName:'Morgan Sample',slots:at('2026-09-30','10:30','12:00')}];

function Frame({children}:{children:React.ReactNode}){return <MockAccountProvider value={{user:PERSON,loading:false}}><div className="light-wall light-page craft-chrome"><div className="wwm wwm-room"><div className="wwm-shell"><section className="wwm-card wwm-availability">{children}</section></div></div></div></MockAccountProvider>}
function Edit({responses=few,initial=at('2026-09-30','10:00','11:30')}:{responses?:typeof few;initial?:string[]}){const [mine,setMine]=useState(initial);return <Frame><WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={responses} currentUserId={PERSON.id} mine={mine} dirty={false} onToggle={id=>setMine(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])}/></Frame>}
function Everyone({responses}:{responses:typeof few}){return <Frame><WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={responses} currentUserId={PERSON.id} mine={[]} dirty={false} onToggle={()=>{}} readOnly/></Frame>}
function Confirm(){const [range,setRange]=useState<ConfirmRange|null>(null);return <Frame><WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={few} currentUserId={PERSON.id} selection={{memberCount:2,range,onChange:setRange}}/></Frame>}

const meta={title:'When We Meet/Availability grid',parameters:{nextjs:{appDirectory:true}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const grid=(canvasElement:HTMLElement)=>within(canvasElement).getByRole('grid');
const focused=()=>document.activeElement?.getAttribute('aria-label')||'';
// Expected cell names in the toolbar locale (the grid builds them from the same dictionary keys).
const cell=(date:string,time:string,on:boolean)=>storyCopy().t(on?'grid.cellAvailable':'grid.cellNotAvailable',{when:cellWhen(date,time)});

/** One Tab stop; arrows, Home/End, PageDown and Space/Shift+Arrow edit without the mouse. */
export const EditKeyboard:Story={render:()=> <Edit/>,play:async({canvasElement})=>{
 const tabbable=grid(canvasElement).querySelectorAll('[role="gridcell"][tabindex="0"]');
 await expect(tabbable).toHaveLength(1);
 await expect(tabbable[0]).toHaveAccessibleName(cell('2026-09-30','10:00',true));
 (tabbable[0] as HTMLElement).focus();
 await userEvent.keyboard('{ArrowRight}');await expect(focused()).toBe(cell('2026-10-01','10:00',false));
 await userEvent.keyboard(' ');await waitFor(()=>expect(focused()).toBe(cell('2026-10-01','10:00',true)));
 await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}');await waitFor(()=>expect(focused()).toBe(cell('2026-10-01','11:00',true)));
 // Empty hours before 9 AM are collapsed: Home stops at the first visible half-hour until they are shown.
 await userEvent.keyboard('{Home}');await expect(focused()).toBe(cell('2026-10-01','09:00',false));
 await userEvent.keyboard('{PageDown}');await expect(focused()).toBe(cell('2026-10-01','13:00',false));
 await userEvent.keyboard('{End}');await expect(focused()).toBe(cell('2026-10-01','23:30',false));
 const earlier=within(canvasElement).getByRole('button',{name:storyCopy().t('grid.showEarlier',{from:hourLabel('00:00',activeLocale()),to:hourLabel('09:00',activeLocale())})});
 await userEvent.click(earlier);await waitFor(()=>expect(focused()).toBe(cell('2026-10-01','23:30',false)));
 await userEvent.keyboard('{Home}');await expect(focused()).toBe(cell('2026-10-01','00:00',false));
}};
export const EditKeyboardDark:Story={...EditKeyboard,globals:{theme:'dark'}};
export const EditMobile:Story={render:()=> <Edit/>,globals:{viewport:{value:'mobile',isRotated:false}}};
/** Fifteen people: starts Compact, natural-sorted legend, repeated hues carry a stripe mark. */
export const ManyRespondentsNamed:Story={render:()=> <Everyone responses={many}/>,play:async({canvasElement})=>{const c=within(canvasElement);await expect(c.getByRole('radio',{name:'Compact'})).toHaveAttribute('aria-checked','true');await expect(canvasElement.querySelectorAll('.wwm-week-legend i[data-mark]').length).toBeGreaterThan(0);}};
export const ManyRespondentsDetailed:Story={render:()=> <Everyone responses={many}/>,play:async({canvasElement})=>{await userEvent.click(within(canvasElement).getByRole('radio',{name:'Detailed'}));}};
export const ManyRespondentsDark:Story={...ManyRespondentsNamed,globals:{theme:'dark'}};
export const ManyRespondentsMobile:Story={...ManyRespondentsNamed,globals:{viewport:{value:'mobile',isRotated:false}}};
/** Everyone is read-only: cells name who is free; Enter opens that person's detail. */
export const EveryoneKeyboard:Story={render:()=> <Everyone responses={few}/>,play:async({canvasElement})=>{
 const start=grid(canvasElement).querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')!;start.focus();
 await expect(focused()).toBe(storyCopy().t('grid.cellNobody',{when:cellWhen('2026-09-28','09:00')}));
 await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}{ArrowDown}{ArrowDown}');
 await expect(focused()).toBe(storyCopy().t('grid.cellPeople',{when:cellWhen('2026-09-30','10:30'),count:2,total:2,names:[`Alex Sample (${storyCopy().t('common.you')})`,'Morgan Sample'].join(storyCopy().t('common.listSeparator'))}));
 await userEvent.keyboard('{Enter}');await waitFor(()=>expect(document.querySelector('.wwm-week-detail')).toBeVisible());
}};
/** Confirm selection: Enter sets the start, Shift+ArrowDown stretches, one outline around the range. */
export const ConfirmKeyboard:Story={render:()=> <Confirm/>,play:async({canvasElement})=>{
 const start=within(canvasElement).getByRole('gridcell',{name:cellNamed('2026-09-30','10:00')});start.focus();
 await userEvent.keyboard('{Enter}');await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}');
 await waitFor(()=>expect(focused()).toBe(storyCopy().t('grid.cellCount',{when:cellWhen('2026-09-30','11:00'),count:2,total:2})+storyCopy().t('grid.cellSelectedSuffix')));
 await expect(canvasElement.querySelectorAll('.wwm-confirm-range')).toHaveLength(1);
}};
export const ConfirmKeyboardMobile:Story={...ConfirmKeyboard,globals:{viewport:{value:'mobile',isRotated:false}}};
