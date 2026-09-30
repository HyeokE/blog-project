'use client';

import SiteError from '@/components/site-error/SiteError';

// Root layout may itself be broken: no provider, wall chrome, or app stylesheet here.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <head>
        <title>페이지를 불러오지 못했어요 | HYEOK.DEV</title>
        <style>{`@font-face{font-family:SUIT;src:url('/fonts/SUIT-Regular.ttf') format('truetype');font-display:swap}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#eae8de;color:#454739}body{font-family:SUIT,Pretendard,system-ui,sans-serif}.site-error{min-height:100dvh;max-width:740px;margin:auto;padding:72px 24px;display:flex;flex-direction:column;justify-content:center}.site-error__number{margin:0 0 18px;font-size:clamp(96px,17vw,220px);line-height:.9;letter-spacing:-.09em}.site-error__copy{border-top:1px solid currentColor;padding-top:28px}.site-error h1{margin:0;font-size:clamp(22px,3vw,32px);letter-spacing:-.05em}.site-error__copy>p{color:#6b6b5e;line-height:1.7}.site-error__actions{display:flex;flex-wrap:wrap;gap:14px 28px;margin-top:34px}.site-error__actions :is(a,button){display:inline-flex;align-items:center;min-height:44px;padding:0;border:0;background:none;color:inherit;font:inherit;font-weight:600;text-decoration:underline;text-underline-offset:6px;cursor:pointer}.site-error__actions :is(a,button):focus-visible{outline:2px solid currentColor;outline-offset:4px}@media(prefers-color-scheme:dark){html,body{background:#24251f;color:#e0dbca}.site-error{--site-error-ink:#e0dbca;--site-error-muted:#b8b3a3;color:#e0dbca}.site-error__copy>p{color:#b8b3a3}}`}</style>
      </head>
      <body>
        <SiteError status="500" retry={<button type="button" onClick={reset}>다시 시도</button>} />
      </body>
    </html>
  );
}
