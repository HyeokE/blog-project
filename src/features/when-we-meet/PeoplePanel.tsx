'use client';
import {useCallback,useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import './people-panel.css';
type Person={user_id:string;display_name:string;is_admin:boolean;has_availability:boolean};
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
 return <div className="wwm-people"><h2>Participants</h2>{error?<div role="alert"><p>{error}</p><Button type="button" variant="outline" onClick={retry}>Retry</Button></div>:people===null?<div aria-label="Loading participants" role="status" className="wwm-people-skeleton"><span/><span/><span/></div>:people.length===0?<p>No one has joined this meeting yet.</p>:<ul>{people.map(person=><li key={person.user_id}><div><strong>{person.display_name}</strong>{person.user_id===userId&&<span className="wwm-people-self">You</span>}</div><div className="wwm-people-labels">{person.is_admin&&<span>Admin</span>}<span>{person.has_availability?'Availability added':'No availability yet'}</span></div></li>)}</ul>}</div>;
}
