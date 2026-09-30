'use client';
import {Users} from 'lucide-react';
import './participant-count.css';
import {useWwmCopy} from './i18n/WwmI18nProvider';
export function ParticipantCount({count}:{count?:number|null}){
 const {t}=useWwmCopy();
 const known=typeof count==='number'&&Number.isSafeInteger(count)&&count>=0;
 const label=known?t('list.memberCount',{count}):undefined;
 return <span className="wwm-participant-count" aria-label={label??t('list.memberCountUnavailable')} title={label}><Users size={14} strokeWidth={1.5} aria-hidden="true"/><span>{known?count:'—'}</span></span>;
}
