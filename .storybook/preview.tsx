import type {Preview} from '@storybook/nextjs-vite';
import {reset,MockEventSource,mockPeopleFetch} from '../src/stories/wwm/mock-api';
import {addons} from 'storybook/preview-api';
import {WwmI18nProvider} from '../src/features/when-we-meet/i18n/WwmI18nProvider';
import {PLAY_FUNCTION_THREW_EXCEPTION} from 'storybook/internal/core-events';
import '../src/app/craft/craft.css';
import '../src/app/craft/design-system.css';
import '../src/app/globals.css';
import '../src/container/light-wall/light-wall.css';
import '../src/container/light-wall/wall-pages.css';
import '../src/features/when-we-meet/when-we-meet.css';
import '../src/features/when-we-meet/week-calendar.css';
import '../src/features/when-we-meet/invitation.css';
import '../src/features/when-we-meet/room-toolbar.css';
// Guard against accidentally reaching application APIs from a story.
if(typeof window!=='undefined'){
  const originalFetch=window.fetch.bind(window);
  window.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input instanceof Request?input.url:input);
    const peopleMock=mockPeopleFetch(url,init);if(peopleMock)return peopleMock;
    if(url.includes('/api/craft/')||url.includes('supabase'))return Promise.reject(new Error('Storybook blocked application network request'));
    return originalFetch(input,init);
  }) as typeof fetch;
  window.EventSource=MockEventSource as unknown as typeof EventSource;
  // Visual QA marks a failed play so screenshot runs can tell a broken interaction from a finished one.
  addons.getChannel().on(PLAY_FUNCTION_THREW_EXCEPTION,(error:{message?:string})=>{document.documentElement.dataset.wwmPlayError=error?.message||'play failed';});
  document.addEventListener('click',event=>{if(event.target instanceof Element&&event.target.closest('a'))event.preventDefault();},true);
}
const preview:Preview={
  afterEach:(context)=>{document.documentElement.dataset.wwmStoryVerified=context.id;},
  beforeEach:()=>{delete document.documentElement.dataset.wwmStoryVerified;delete document.documentElement.dataset.wwmPlayError;reset();for(const key of Object.keys(sessionStorage))if(key.startsWith('wwm:'))sessionStorage.removeItem(key);},
  globalTypes:{theme:{description:'Craft theme',toolbar:{icon:'circlehollow',items:['light','dark'],dynamicTitle:true}},locale:{description:'When We Meet language',toolbar:{icon:'globe',items:[{value:'en',title:'English'},{value:'ko',title:'한국어'}],dynamicTitle:true}}},
  initialGlobals:{theme:'light',locale:'en'},
  parameters:{layout:'fullscreen',viewport:{options:{mobile:{name:'Mobile',styles:{width:'390px',height:'844px'}},desktop:{name:'Desktop',styles:{width:'1440px',height:'900px'}}}}},
  decorators:[(Story,context)=>{document.documentElement.dataset.mode=context.globals.theme==='dark'?'dark':'light';document.documentElement.dataset.craft='true';return <WwmI18nProvider locale={context.globals.locale==='ko'?'ko':'en'}><Story/></WwmI18nProvider>;}],
};
export default preview;
