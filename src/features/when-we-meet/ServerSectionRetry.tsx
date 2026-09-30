'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useTransition} from 'react';
import {useRouter} from 'next/navigation';
import WallBackLink from '@/container/light-wall/WallBackLink';
import {AlertCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import './async-region.css';

export default function ServerSectionRetry({room=false,inline=false}:{room?:boolean;inline?:boolean}){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 const content=<section className="wwm-card wwm-section-error" role="alert"><AlertCircle aria-hidden="true"/><div><p><strong>Couldn’t load {room?'this meeting':'your meetings'}.</strong> Check your connection and try again.</p><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} disabled={pending} aria-busy={pending||undefined} onClick={()=>startTransition(()=>router.refresh())}>{pending?'Retrying…':'Retry'}</Button></div></section>;
 if(inline){return content;}
 return <main className="wwm"><div className="wwm-topline"><WallBackLink href="/craft/when-we-meet">Meetings</WallBackLink></div><div className="wwm-shell">{content}</div></main>;
}
