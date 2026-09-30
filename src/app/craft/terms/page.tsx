import type {Metadata} from 'next';
import Link from 'next/link';
import '../craft.css';
import '../legal.css';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';

export const metadata:Metadata={title:'Terms of Service | Craft | HYEOK.DEV',description:'Terms and service information for Craft and When We Meet.'};

const CONTACT='jhjeong00@gmail.com';
const EFFECTIVE='October 1, 2026';

export default function CraftTermsPage(){
 return <main className="craft-page craft-legal" data-analytics-section={ANALYTICS_SECTIONS.CRAFT_LEGAL}>
  <div className="craft-shell">
   <header className="craft-header">
    <h1>Terms of Service</h1>
    <p className="craft-legal-meta">Effective {EFFECTIVE} · Applies to Craft (hyeok.dev/craft) and When We Meet</p>
   </header>

   <section>
    <h2>Service information</h2>
    <ul>
     <li>Service: Craft — small web tools, including When We Meet (group scheduling)</li>
     <li>Operator: HYEOK.DEV operator (individual, non-commercial)</li>
     <li>Contact: <a href={`mailto:${CONTACT}`} data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_CONTACT}>{CONTACT}</a></li>
     <li>Website: https://hyeok.dev/craft</li>
     <li>Fees: free</li>
    </ul>
   </section>

   <section>
    <h2>Using the service</h2>
    <p>You sign in with your Google account and are responsible for the meetings you create and the invitation links you share. Anyone with a meeting’s full invitation link can join it after signing in, so share links only with intended participants. Do not use the service to send unsolicited invitations or for unlawful purposes.</p>
   </section>

   <section>
    <h2>Google Calendar features</h2>
    <p>Calendar features are optional and run only after you grant permission. When a meeting owner confirms a meeting, invitations are sent through Google Calendar from the owner’s account to the attendees the owner selected; delivery is handled by Google and is not guaranteed. How we use Google data is described in the <Link href="/craft/privacy" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_LINK}>Privacy Policy</Link>.</p>
   </section>

   <section>
    <h2>Availability and liability</h2>
    <p>The service is provided “as is”, without warranties, and may change or stop at any time. To the extent permitted by law, the operator is not liable for missed meetings, scheduling mistakes or data loss. Keep important schedules in your own calendar.</p>
   </section>

   <section>
    <h2>Ending use</h2>
    <p>You can stop using the service at any time, revoke Google access at myaccount.google.com/permissions, and ask for deletion of your data by email. We may suspend accounts that abuse the service.</p>
   </section>

   <section>
    <h2>Changes</h2>
    <p>We will update the effective date above when these terms change.</p>
   </section>

   <section className="craft-legal-ko" lang="ko">
    <h2>서비스 정보 (한국어)</h2>
    <ul>
     <li>서비스: Craft — When We Meet(모임 시간 조율) 등 작은 웹 도구</li>
     <li>운영자: HYEOK.DEV 운영자 (개인·비영리) · 문의 {CONTACT}</li>
     <li>이용료: 무료</li>
     <li>Google Calendar 기능은 선택 사항이며, 권한을 허용한 경우에만 동작합니다. 초대장은 모임 주인의 Google 계정으로 발송되며 전달은 Google이 처리합니다.</li>
     <li>서비스는 현 상태 그대로 제공되며 예고 없이 변경·중단될 수 있습니다. 중요한 일정은 개인 캘린더에도 보관해 주세요.</li>
     <li>언제든 이용을 중단하고 Google 권한을 철회하거나 데이터 삭제를 이메일로 요청할 수 있습니다.</li>
    </ul>
   </section>

   <nav className="craft-legal-links" aria-label="Craft information">
    <Link href="/craft" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_LINK}>Craft</Link>
    <Link href="/craft/privacy" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_LINK}>Privacy Policy</Link>
   </nav>
  </div>
 </main>;
}
