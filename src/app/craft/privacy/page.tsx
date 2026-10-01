import type {Metadata} from 'next';
import Link from 'next/link';
import '../craft.css';
import '../legal.css';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';

export const metadata:Metadata={title:'Privacy Policy | Craft | HYEOK.DEV',description:'How Craft and When We Meet handle your data, including Google user data.',alternates:{canonical:'/craft/privacy'},openGraph:{type:'website',siteName:'HYEOK.DEV',locale:'en_US',url:'/craft/privacy',title:'Privacy Policy | Craft | HYEOK.DEV',description:'How Craft and When We Meet handle your data, including Google user data.'},twitter:{card:'summary_large_image',title:'Privacy Policy | Craft | HYEOK.DEV',description:'How Craft and When We Meet handle your data, including Google user data.'}};

const CONTACT='jhjeong00@gmail.com';
const EFFECTIVE='October 1, 2026';

export default function CraftPrivacyPage(){
 return <main className="craft-page craft-legal" data-analytics-section={ANALYTICS_SECTIONS.CRAFT_LEGAL}>
  <div className="craft-shell">
   <header className="craft-header">
    <h1>Privacy Policy</h1>
    <p className="craft-legal-meta">Effective {EFFECTIVE} · Applies to Craft (hyeok.dev/craft) and When We Meet</p>
   </header>

   <section>
    <h2>Who we are</h2>
    <p>Craft is a set of small tools operated by the HYEOK.DEV operator (the “operator”, “we”). When We Meet helps a group find a time that works for everyone. Contact: <a href={`mailto:${CONTACT}`} data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_CONTACT}>{CONTACT}</a>.</p>
   </section>

   <section>
    <h2>Information we collect</h2>
    <h3>Google sign-in</h3>
    <p>When you sign in with Google we receive your Google account ID, email address, name and profile picture. We use them to create your account, show your name to other members of meetings you join, and, if you confirm a meeting, address calendar invitations.</p>
    <h3>Meeting data you provide</h3>
    <p>Meeting titles, date ranges, time zones, the display name you choose, and the half-hour slots you mark as available. Members of the same meeting can see each other’s display names and saved availability. The meeting owner can see members’ email addresses when reviewing invitations.</p>
    <h3>Google Calendar (optional)</h3>
    <p>Only if you choose “Fill from Google Calendar” or, as a meeting owner, “Confirm &amp; send invitations”, we ask for the <code>calendar.events.owned</code> permission and use it to:</p>
    <ul>
     <li>read the start/end times, free/busy setting, cancellation status and your own response of events on your primary calendar for the meeting’s dates, to suggest when you are free. Event titles, descriptions, locations and other attendees are not requested and not stored;</li>
     <li>create one event for a meeting you confirm (and update it if you edit the confirmation), sending Google Calendar invitations to the attendees you selected.</li>
    </ul>
    <p>To do this without asking every time, we store a Google refresh token encrypted with AES-256-GCM on our server, readable only by the server process that performs these actions. It is never sent to your browser.</p>
   </section>

   <section>
    <h2>Google API Services User Data Policy</h2>
    <blockquote>The use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_EXTERNAL}>Google API Services User Data Policy</a>, including the Limited Use requirements.</blockquote>
    <p>Google user data is used only to provide the features described above. It is not sold, not used for advertising, not used to train AI or machine-learning models, and not read by humans except with your explicit consent, for security purposes, or as required by law.</p>
   </section>

   <section>
    <h2>Service providers</h2>
    <ul>
     <li>Supabase — authentication and database (meeting data, encrypted calendar credentials).</li>
     <li>Vercel — website hosting.</li>
     <li>Google — sign-in and, when you enable it, Google Calendar.</li>
    </ul>
    <p>We do not share your information with anyone else except when required by law.</p>
   </section>

   <section>
    <h2>Retention and deletion</h2>
    <p>Meeting data is kept while the meeting exists. Calendar credentials are kept until you revoke access or ask us to delete them. You can revoke Craft’s Google access at any time at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_EXTERNAL}>myaccount.google.com/permissions</a>. To delete your account, meetings or stored credentials, email {CONTACT}; we respond within 14 days. Events already created in Google Calendar stay in attendees’ calendars until they remove them.</p>
   </section>

   <section>
    <h2>Security</h2>
    <p>All traffic uses HTTPS. Database access is restricted by row-level security so you can only read meetings you belong to; calendar credentials sit in a private schema accessible only to a dedicated server role.</p>
   </section>

   <section>
    <h2>Changes</h2>
    <p>We will update the effective date above when this policy changes and highlight material changes on this page.</p>
   </section>

   <section className="craft-legal-ko" lang="ko">
    <h2>개인정보처리방침 요약 (한국어)</h2>
    <ul>
     <li>운영자: HYEOK.DEV 운영자 · 문의 {CONTACT}</li>
     <li>수집 항목: Google 계정 ID·이메일·이름·프로필 사진, 모임 제목·기간·시간대·표시 이름·가능 시간</li>
     <li>선택 항목(Google Calendar): “캘린더에서 불러오기”·“초대 보내기”를 쓸 때만 권한을 요청하며, 일정의 시작·종료 시각과 바쁨 여부만 읽고 일정 제목·내용은 저장하지 않습니다. 확정한 모임 일정을 생성·수정하고 초대장을 보냅니다. 갱신 토큰은 AES-256-GCM으로 암호화해 서버에만 보관합니다.</li>
     <li>이용 목적: 로그인, 모임 시간 조율, 일정 확정 및 초대 발송</li>
     <li>처리 위탁: Supabase(인증·데이터베이스), Vercel(호스팅), Google(로그인·캘린더)</li>
     <li>보유 기간: 모임이 존재하는 동안. 캘린더 권한은 철회하거나 삭제를 요청할 때까지</li>
     <li>권리 행사: Google 계정 권한 페이지에서 언제든 철회할 수 있으며, 삭제 요청은 이메일로 받아 14일 이내 처리합니다.</li>
     <li>Google API로 받은 정보는 Google API 서비스 사용자 데이터 정책(Limited Use 포함)을 준수해 위 기능에만 사용합니다.</li>
    </ul>
   </section>

   <nav className="craft-legal-links" aria-label="Craft information">
    <Link href="/craft" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_LINK}>Craft</Link>
    <Link href="/craft/terms" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_LINK}>Terms of Service</Link>
   </nav>
  </div>
 </main>;
}
