'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useTransition} from 'react';
import {useRouter} from 'next/navigation';
import WallBackLink from '@/container/light-wall/WallBackLink';
import {Button} from '@/components/ui/button';
import './async-region.css';
import {Notice} from './Notice';
import {loadErrorTitle,MEETING_COPY} from './meeting-copy.mjs';

export default function ServerSectionRetry({room=false,inline=false,title}:{room?:boolean;inline?:boolean;title?:string}){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 const content=<Notice tone="error" className="wwm-section-error" title={room?loadErrorTitle(title):'Couldn’t load your meetings'} action={<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} disabled={pending} aria-busy={pending||undefined} onClick={()=>startTransition(()=>router.refresh())}>{pending?'Retrying…':'Retry'}</Button>}>{MEETING_COPY.loadErrorDetail}</Notice>;
 if(inline){return content;}
 // Same 1120 column and back link as a loaded room, so the error never jumps the layout.
 return <main className={`wwm${room?' wwm-room':''}`}><div className="wwm-topline"><WallBackLink href="/craft/when-we-meet">Meetings</WallBackLink></div><div className="wwm-shell">{content}</div></main>;
}
