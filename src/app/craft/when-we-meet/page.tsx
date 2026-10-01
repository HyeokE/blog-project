import type { Metadata } from 'next';
import WhenWeMeet from '@/features/when-we-meet/WhenWeMeet';
import OwnedMeetings from './OwnedMeetings';
import {Suspense} from 'react';
import {MeetingRowsSkeleton} from '@/features/when-we-meet/ServerSkeletons';
import {createWwmTranslator} from '@/i18n/wwm.mjs';
import {getWwmLocale} from '@/lib/wwm-locale';
export async function generateMetadata(): Promise<Metadata>{
 const locale=await getWwmLocale(),t=createWwmTranslator(locale),title='When We Meet | HYEOK.DEV',description=t('app.tagline');
 return {title,description,alternates:{canonical:'/craft/when-we-meet'},openGraph:{type:'website',siteName:'HYEOK.DEV',locale:locale==='ko'?'ko_KR':'en_US',url:'/craft/when-we-meet',title,description},twitter:{card:'summary_large_image',title,description}};
}
export default function Page(){return <WhenWeMeet meetingsSection={<Suspense fallback={<MeetingRowsSkeleton/>}><OwnedMeetings/></Suspense>}/>;}
