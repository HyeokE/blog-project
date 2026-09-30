'use client';
import {CalendarDays} from 'lucide-react';
import {Fragment} from 'react';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import './empty-meetings.css';

export function EmptyMeetings(){
 const {t}=useWwmCopy();
 // The body keeps its designed line break: the dictionary marks it with "\n".
 const lines=t('list.emptyBody').split('\n');
 return <div className="wwm-empty-meetings" role="status">
  <CalendarDays size={32} strokeWidth={1.25} aria-hidden="true"/>
  <h2>{t('list.emptyTitle')}</h2>
  <p>{lines.map((line,index)=><Fragment key={index}>{index>0&&<br/>}{line}</Fragment>)}</p>
 </div>;
}
