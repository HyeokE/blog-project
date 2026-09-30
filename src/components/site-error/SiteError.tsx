import type { ReactNode } from 'react';
import './site-error.css';

type Props = {
  status: '404' | '500';
  retry?: ReactNode;
};

export default function SiteError({ status, retry }: Props) {
  const missing = status === '404';
  return (
    <section className="site-error" aria-labelledby="site-error-title">
      <p className="site-error__number" aria-hidden="true">{status}</p>
      <div className="site-error__copy">
        <h1 id="site-error-title">{missing ? '페이지를 찾을 수 없어요.' : '페이지를 불러오지 못했어요.'}</h1>
        <p>{missing ? '주소를 다시 확인하거나 홈으로 돌아가 주세요.' : '잠시 후 다시 시도해 주세요.'}</p>
        <div className="site-error__actions">
          {retry}
          <a href="/">홈으로 돌아가기 <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}
