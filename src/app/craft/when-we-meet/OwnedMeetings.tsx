import Link from 'next/link';
import {Badge} from '@/components/ui/badge';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {ParticipantCount} from '@/features/when-we-meet/ParticipantCount';
import {EmptyMeetings} from '@/features/when-we-meet/EmptyMeetings';
import {unstable_rethrow} from 'next/navigation';
import ServerSectionRetry from '@/features/when-we-meet/ServerSectionRetry';
import {ownedCraftMeetings} from '@/lib/supabase/server';
import {createMeetingCopy} from '@/features/when-we-meet/meeting-copy.mjs';
import {getWwmLocale} from '@/lib/wwm-locale';
export default async function OwnedMeetings(){
 let result;
 try {result=await ownedCraftMeetings();}
 catch(error){unstable_rethrow(error);return <ServerSectionRetry inline/>;}
 const {meetings,userId}=result;
 if(!userId){return null;}
 const {t,meetingSummary}=createMeetingCopy(await getWwmLocale());
 return <section className="wwm-card wwm-meetings" aria-label={t('app.yourMeetings')} data-analytics-section={ANALYTICS_SECTIONS.WWM_MEETINGS}>{meetings.length?<ul>{meetings.map(item=><li key={item.id} data-meeting-id={item.id}><Link href={`/craft/when-we-meet/${item.id}`} data-analytics-label={ANALYTICS_ELEMENTS.MEETING_OPEN}><div className="wwm-meeting-title-row"><strong>{item.title}</strong>{item.confirmationStatus==='confirmed'&&<Badge variant="secondary" size="sm" className="wwm-meeting-tag">{t('common.confirmed')}</Badge>}<ParticipantCount count={item.participantCount}/></div><span>{meetingSummary(item)}</span></Link></li>)}</ul>:<EmptyMeetings/>}</section>;
}
