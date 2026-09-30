import Link from 'next/link';
import {ParticipantCount} from '@/features/when-we-meet/ParticipantCount';
import {EmptyMeetings} from '@/features/when-we-meet/EmptyMeetings';
import {unstable_rethrow} from 'next/navigation';
import ServerSectionRetry from '@/features/when-we-meet/ServerSectionRetry';
import {ownedCraftMeetings} from '@/lib/supabase/server';
import {formatCraftDate} from '@/features/when-we-meet/display-date.mjs';
export default async function OwnedMeetings(){
 let result;
 try {result=await ownedCraftMeetings();}
 catch(error){unstable_rethrow(error);return <ServerSectionRetry inline/>;}
 const {meetings,userId}=result;
 if(!userId){return null;}
 return <section className="wwm-card wwm-meetings" aria-label="Your meetings">{meetings.length?<ul>{meetings.map(item=><li key={item.id}><Link href={`/craft/when-we-meet/${item.id}`}><div className="wwm-meeting-title-row"><strong>{item.title}</strong><ParticipantCount count={item.participant_count}/></div><span>{formatCraftDate(item.start_date)} – {formatCraftDate(item.end_date)} · {item.start_time.slice(0,5)}–{item.end_time.slice(0,5)} · {item.timezone}</span></Link></li>)}</ul>:<EmptyMeetings/>}</section>;
}
