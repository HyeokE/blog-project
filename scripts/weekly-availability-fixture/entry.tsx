import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WeeklyAvailability} from '../../src/features/when-we-meet/WeeklyAvailability';
import {makeSlots} from '../../src/features/when-we-meet/domain.mjs';
import '../../src/features/when-we-meet/weekly-availability.css';

// SYNTHETIC FIXTURE: no database, API, authentication, or save operation.
const room={title:'Synthetic weekly QA',startDate:'2026-10-26',endDate:'2026-11-08',startTime:'01:00',endTime:'03:00',timezone:'America/New_York'};
const slots=makeSlots(room);
const responses=[{user_id:'synthetic-alex',display_name:'Alex',slots:slots.filter((_,i)=>i%3!==2).map(s=>s.id)},{user_id:'synthetic-sam',display_name:'Sam',slots:slots.filter((_,i)=>i%4===0).map(s=>s.id)},{user_id:'synthetic-self',display_name:'You',slots:slots.filter((_,i)=>i%5===0).map(s=>s.id)}];
function Fixture(){const [mine,setMine]=useState<string[]>(responses[2].slots);const [dirty,setDirty]=useState(false);return <main className="wwm" style={{maxWidth:1280,margin:'0 auto',padding:'12px',fontFamily:'system-ui',color:'#292922'}}><h1 style={{fontSize:20}}>Synthetic weekly availability fixture — no persistence</h1><WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={responses} currentUserId="synthetic-self" mine={mine} dirty={dirty} onToggle={id=>{setMine(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous,id]);setDirty(true)}}/></main>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
