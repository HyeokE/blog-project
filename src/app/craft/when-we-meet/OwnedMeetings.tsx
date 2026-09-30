import Link from 'next/link';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {ParticipantCount} from '@/features/when-we-meet/ParticipantCount';
import {EmptyMeetings} from '@/features/when-we-meet/EmptyMeetings';
import {unstable_rethrow} from 'next/navigation';
import ServerSectionRetry from '@/features/when-we-meet/ServerSectionRetry';
import {ownedCraftMeetings} from '@/lib/supabase/server';
import {meetingSummary} from '@/features/when-we-meet/meeting-copy.mjs';
export default async function OwnedMeetings(){
 let result;
 try {result=await ownedCraftMeetings();}
 catch(error){unstable_rethrow(error);return <ServerSectionRetry inline/>;}
 const {meetings,userId}=result;
 if(!userId){return null;}
 return <section className="wwm-card wwm-meetings" aria-label="Your meetings" data-analytics-section={ANALYTICS_SECTIONS.WWM_MEETINGS}>{meetings.length?<ul>{meetings.map(item=><li key={item.id} data-meeting-id={item.id}><Link href={`/craft/when-we-meet/${item.id}`} data-analytics-label={ANALYTICS_ELEMENTS.MEETING_OPEN}><div className="wwm-meeting-title-row"><strong>{item.title}</strong>{item.confirmationStatus==='confirmed'&&<span className="wwm-meeting-tag">Confirmed</span>}<ParticipantCount count={item.participantCount}/></div><span>{meetingSummary(item)}</span></Link></li>)}</ul>:<EmptyMeetings/>}</section>;
}
