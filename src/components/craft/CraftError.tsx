import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import './craft-error.css';

/** Craft's own 404/500 (English, Craft tokens). The blog keeps SiteError in Korean. Thrown details are never shown. */
export default function CraftError({status,onRetry}:{status:'404'|'500';onRetry?:()=>void}){
 const missing=status==='404';
 return <main className="craft-page craft-error" data-analytics-section={ANALYTICS_SECTIONS.ERROR}>
  <section className="craft-shell craft-error-body" aria-labelledby="craft-error-title">
   <p className="craft-error-code">Error {status}</p>
   <h1 id="craft-error-title">{missing?'Page not found':'Something went wrong'}</h1>
   <p className="craft-error-text">{missing?'This page doesn’t exist or the link is incomplete. Check the address, or go back to Craft.':'This page couldn’t load. Try again in a moment.'}</p>
   <div className="craft-error-actions">
    {onRetry&&<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={onRetry}>Try again</Button>}
    <Button asChild variant={onRetry?'outline':'default'}><Link href="/craft" data-analytics-label={ANALYTICS_ELEMENTS.HOME_LINK}>Back to Craft</Link></Button>
   </div>
  </section>
 </main>;
}
