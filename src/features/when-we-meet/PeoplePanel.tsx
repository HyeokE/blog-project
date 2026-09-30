'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useCallback,useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import './people-panel.css';
import {MEETING_COPY} from './meeting-copy.mjs';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {Notice} from './Notice';
type Person={userId:string;displayName:string;isAdmin:boolean;hasAvailability:boolean};
export function PeoplePanel({roomId,userId}:{roomId:string;userId?:string}){
 const [people,setPeople]=useState<Person[]|null>(null);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  setPeople(null);setError('');
  void (async()=>{
   try{
    const response=await fetch(`/api/craft/when-we-meet/${roomId}/people`,{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error('Could not load participants.');
    const result:unknown=await response.json();
    if(!result||typeof result!=='object'||!('people' in result)||!Array.isArray(result.people))throw new Error('Invalid participant list.');
    if(!controller.signal.aborted)setPeople(result.people as Person[]);
   }catch{if(!controller.signal.aborted)setError('Could not load participants. Please try again.');}
  })();
  return()=>controller.abort();
 },[roomId,attempt]);
 return <div className="wwm-people" data-analytics-section={ANALYTICS_SECTIONS.WWM_PEOPLE}><h2>{MEETING_COPY.peopleHeading}</h2>{error?<Notice tone="error" action={<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={retry}>Retry</Button>}>{error}</Notice>:people===null?<div aria-label="Loading people" role="status" className="wwm-people-skeleton"><Skeleton/><Skeleton/><Skeleton/></div>:people.length===0?<p>No one has joined this meeting yet.</p>:<ul>{people.map(person=><li key={person.userId}><div><strong>{person.displayName}</strong>{person.userId===userId&&<Badge variant="secondary" className="wwm-people-self">You</Badge>}</div><div className="wwm-people-labels">{person.isAdmin&&<Badge variant="outline">{MEETING_COPY.organizerBadge}</Badge>}<span className="wwm-people-status">{person.hasAvailability?'Availability added':'No availability yet'}</span></div></li>)}</ul>}</div>;
}
