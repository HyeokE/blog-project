'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useCallback,useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import './people-panel.css';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {Notice} from './Notice';
type Person={userId:string;displayName:string;isAdmin:boolean;hasAvailability:boolean};
export function PeoplePanel({roomId,userId}:{roomId:string;userId?:string}){
 const {t}=useWwmCopy();
 const [people,setPeople]=useState<Person[]|null>(null);
 const [error,setError]=useState(false);
 const [attempt,setAttempt]=useState(0);
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  setPeople(null);setError(false);
  void (async()=>{
   try{
    const response=await fetch(`/api/craft/when-we-meet/${roomId}/people`,{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error('Could not load participants.');
    const result:unknown=await response.json();
    if(!result||typeof result!=='object'||!('people' in result)||!Array.isArray(result.people))throw new Error('Invalid participant list.');
    if(!controller.signal.aborted)setPeople(result.people as Person[]);
   }catch{if(!controller.signal.aborted)setError(true);}
  })();
  return()=>controller.abort();
 },[roomId,attempt]);
 return <div className="wwm-people" data-analytics-section={ANALYTICS_SECTIONS.WWM_PEOPLE}><h2>{t('people.heading')}</h2>{error?<Notice tone="error" action={<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={retry}>{t('common.retry')}</Button>}>{t('people.loadFailed')}</Notice>:people===null?<div aria-label={t('people.loading')} role="status" className="wwm-people-skeleton"><Skeleton/><Skeleton/><Skeleton/></div>:people.length===0?<p>{t('people.empty')}</p>:<ul>{people.map(person=><li key={person.userId}><div><strong>{person.displayName}</strong>{person.userId===userId&&<Badge variant="secondary" className="wwm-people-self">{t('common.you')}</Badge>}</div><div className="wwm-people-labels">{person.isAdmin&&<Badge variant="outline">{t('common.organizer')}</Badge>}<span className="wwm-people-status">{person.hasAvailability?t('people.availabilityAdded'):t('people.noAvailability')}</span></div></li>)}</ul>}</div>;
}
