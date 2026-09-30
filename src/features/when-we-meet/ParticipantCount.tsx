import {Users} from 'lucide-react';
import './participant-count.css';
export function ParticipantCount({count}:{count?:number|null}){
 const known=typeof count==='number'&&Number.isSafeInteger(count)&&count>=0;
 return <span className="wwm-participant-count" aria-label={known?`${count} ${count===1?'participant':'participants'}`:'Participant count unavailable'}><Users size={14} strokeWidth={1.5} aria-hidden="true"/><span>{known?count:'—'}</span></span>;
}
