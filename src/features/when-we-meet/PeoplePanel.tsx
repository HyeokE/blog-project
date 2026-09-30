'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useCallback,useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import './people-panel.css';
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
 return <div className="wwm-people" data-analytics-section={ANALYTICS_SECTIONS.WWM_PEOPLE}><h2>Participants</h2>{error?<div role="alert"><p>{error}</p><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={retry}>Retry</Button></div>:people===null?<div aria-label="Loading participants" role="status" className="wwm-people-skeleton"><span/><span/><span/></div>:people.length===0?<p>No one has joined this meeting yet.</p>:<ul>{people.map(person=><li key={person.userId}><div><strong>{person.displayName}</strong>{person.userId===userId&&<span className="wwm-people-self">You</span>}</div><div className="wwm-people-labels">{person.isAdmin&&<span>Admin</span>}<span>{person.hasAvailability?'Availability added':'No availability yet'}</span></div></li>)}</ul>}</div>;
}
