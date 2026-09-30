import type {Meta,StoryObj} from '@storybook/nextjs-vite';
import {useState} from 'react';
import {ConfirmationPanel,type ConfirmationPanelProps} from '@/features/when-we-meet/ConfirmationPanel';
import '@/features/when-we-meet/when-we-meet.css';
import {makeSlots} from '@/features/when-we-meet/domain.mjs';
const members:NonNullable<ConfirmationPanelProps['members']>=[{id:'alex',name:'Alex Sample',email:'alex@example.test',response:'available'},{id:'morgan',name:'Morgan Sample',email:'morgan@example.test',response:'unavailable'},{id:'taylor',name:'Taylor Sample',response:'not-responded'}];
const roomFixture={title:'Team coffee',startDate:'2026-09-30',endDate:'2026-10-02',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul'};
const slots=makeSlots(roomFixture) as ConfirmationPanelProps['slots'];
const at=(date:string,time:string)=>slots.find(slot=>slot.date===date&&slot.time===time)!.id;
const between=(date:string,from:string,to:string)=>slots.filter(slot=>slot.date===date&&slot.time>=from&&slot.time<to).map(slot=>slot.id);
// Synthetic saved responses (Taylor has none): 1–2 of 3 members around the morning of 09.30 and 10.01.
const responses:ConfirmationPanelProps['responses']=[{userId:'alex',displayName:'Alex Sample',slots:[...between('2026-09-30','09:00','11:00'),...between('2026-10-01','10:00','12:00')]},{userId:'morgan',displayName:'Morgan Sample',slots:[at('2026-09-30','09:30'),at('2026-09-30','10:00'),...between('2026-10-02','14:00','16:30')]}];
const base:ConfirmationPanelProps={room:roomFixture,role:'owner',members,slots,responses,currentUserId:'alex',organizerEmail:'alex@example.test',calendar:'disconnected',status:'draft',onConnectCalendar:()=>undefined,onConfirm:()=>undefined};
function Fixture({initial,openReview=false}: {initial:ConfirmationPanelProps;openReview?:boolean}){const [log,setLog]=useState<string[]>([]);const [calendar,setCalendar]=useState(initial.calendar);const [status,setStatus]=useState(initial.status);return <div className="light-wall light-page craft-chrome" style={{minHeight:'100vh',padding:'min(5vw,36px)'}}><div className="wwm" style={{maxWidth:920,margin:'auto'}}><ConfirmationPanel {...initial} status={status} calendar={calendar} onConnectCalendar={()=>{setCalendar('connected');setLog(v=>[...v,'Consent callback requested (fixture only)'])}} onConfirm={proposal=>{setLog(v=>[...v,`Callback invoked for ${proposal.date} ${proposal.start}–${proposal.end}; no event or email created`]);if(initial.status==='failed'){setStatus('pending');setTimeout(()=>setStatus('failed'),100)}}}/>{openReview&&<p>Choose a date and times, then open review.</p>}<output aria-label="Fixture callback log">{log.join(' · ')}</output></div></div>}
const meta={title:'When We Meet/Confirmation (isolated)',parameters:{nextjs:{appDirectory:true},layout:'fullscreen'}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
export const OwnerDraft:Story={render:()=> <Fixture initial={base}/>};
export const ConsentRequired:Story={render:()=> <Fixture initial={base} openReview/>};
export const Connected:Story={render:()=> <Fixture initial={{...base,calendar:'connected'}}/>};
export const MissingAddress:Story={render:()=> <Fixture initial={{...base,calendar:'connected'}}/>};
export const Pending:Story={render:()=> <Fixture initial={{...base,status:'pending',calendar:'connected'}}/>};
export const Reconciling:Story={render:()=> <Fixture initial={{...base,status:'reconciling',calendar:'connected'}}/>};
export const Failed:Story={render:()=> <Fixture initial={{...base,status:'failed',calendar:'connected',error:'Google Calendar could not confirm this event.'}}/>};
export const Confirmed:Story={render:()=> <Fixture initial={{...base,status:'confirmed',confirmation:{title:'Team coffee · Hongdae',date:'2026-10-01',start:'10:00',end:'11:00',timezone:'Asia/Seoul',organizer:'Alex Sample',attendeeNames:['Alex Sample','Morgan Sample','Taylor Sample'],attendees:[{id:'alex',name:'Alex Sample',optional:false,rsvp:'accepted'},{id:'morgan',name:'Morgan Sample',optional:false,rsvp:'declined'},{id:'taylor',name:'Taylor Sample',optional:true,rsvp:'needsAction'}],rsvp:true,recipientCount:3,eventUrl:'https://calendar.google.com/calendar/event?eid=storybook'}}}/>};
export const MemberWaiting:Story={render:()=> <Fixture initial={{...base,role:'member',members:undefined,organizerEmail:undefined}}/>};
export const MemberConfirmed:Story={render:()=> <Fixture initial={{...base,role:'member',members:undefined,organizerEmail:undefined,status:'confirmed',confirmation:{title:'Team coffee · Hongdae',date:'2026-10-01',start:'10:00',end:'11:00',timezone:'Asia/Seoul',organizer:'Alex Sample',attendeeNames:[],eventUrl:'https://calendar.google.com/calendar/event?eid=storybook'}}}/>};
export const Mobile:Story={...OwnerDraft,globals:{viewport:{value:'mobile',isRotated:false}}};
export const Dark:Story={...OwnerDraft,globals:{theme:'dark'}};
