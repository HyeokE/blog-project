import {Users} from 'lucide-react';
import './participant-count.css';
import {plural} from './meeting-copy.mjs';
export function ParticipantCount({count}:{count?:number|null}){
 const known=typeof count==='number'&&Number.isSafeInteger(count)&&count>=0;
 return <span className="wwm-participant-count" aria-label={known?plural(count,'member'):'Member count unavailable'} title={known?plural(count,'member'):undefined}><Users size={14} strokeWidth={1.5} aria-hidden="true"/><span>{known?count:'—'}</span></span>;
}
