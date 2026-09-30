import type { Metadata } from 'next';
import WhenWeMeet from '@/features/when-we-meet/WhenWeMeet';
import OwnedMeetings from './OwnedMeetings';
import {Suspense} from 'react';
import {MeetingRowsSkeleton} from '@/features/when-we-meet/ServerSkeletons';
export const metadata: Metadata={title:'When We Meet | HYEOK.DEV',description:'Find a time that works for everyone.'};
export default function Page(){return <WhenWeMeet meetingsSection={<Suspense fallback={<MeetingRowsSkeleton/>}><OwnedMeetings/></Suspense>}/>;}
