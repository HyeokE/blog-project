'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useTransition} from 'react';
import {useRouter} from 'next/navigation';
import WallBackLink from '@/container/light-wall/WallBackLink';

export default function ServerSectionRetry({room=false,inline=false}:{room?:boolean;inline?:boolean}){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 const content=<section className="wwm-card" role="alert"><h2>Could not load {room?'this meeting':'your meetings'}.</h2><p>Please try again.</p><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} disabled={pending} onClick={()=>startTransition(()=>router.refresh())}>{pending?'Retrying…':'Retry'}</button></section>;
 if(inline){return content;}
 return <main className="wwm"><div className="wwm-topline"><WallBackLink href="/craft/when-we-meet">Meetings</WallBackLink></div><div className="wwm-shell">{content}</div></main>;
}
