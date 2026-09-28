import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import WallPageShell from '../WallPageShell';

export default function AboutDesignPage() {
  return (
    <WallPageShell>
      <article className="wall-reading wall-design-story">
        <header className="wall-page-intro">
          <p className="wall-page-eyebrow">ABOUT THIS DESIGN / SWEET HOME</p>
          <h1>기록에 빛을 더하다.</h1>
          <p>시간이 쌓인 벽에, 글과 빛이 머뭅니다.</p>
        </header>
        <section>
          <h2>낮의 햇살과 밤의 조명</h2>
          <p>
            라이트 모드에서는 창문을 통과한 자연광이 벽 위로 비스듬히 내려옵니다. 다크 모드에서는
            오른쪽 위의 조명이 글을 비춥니다. 같은 기록이 시간에 따라 다른 온도로 보이길 바랐습니다.
          </p>
        </section>
        <section>
          <h2>한 번에 하나의 기록</h2>
          <p>
            2025 디자인의 날짜와 세로 목록을 이어받았습니다. 읽고 있는 제목은 화면 가운데에
            머무르고, 주변의 글은 서서히 흐려집니다. 연도와 월은 숫자가 구르듯 이어져 기록 사이의
            시간 변화를 보여줍니다.
          </p>
        </section>
        <section>
          <h2>조용하게 움직이는 디테일</h2>
          <p>
            글자의 얕은 그림자, 빛의 경계, 작은 메뉴의 움직임까지 하나의 분위기로 연결했습니다.
            본문에서는 빛의 대비를 낮추고 충분한 여백을 두어 긴 글도 편안하게 읽을 수 있습니다.
          </p>
        </section>
        <section>
          <h2>이전의 모습도 함께</h2>
          <p>
            블로그가 지나온 디자인을 남겨두었습니다. sweet-home, Cloud, 2025 중 원하는 모습으로
            기록을 만나보세요.
          </p>
          <Link href="/designs" className="wall-page-back">
            디자인 선택하기 <ArrowUpRight size={14} />
          </Link>
        </section>
      </article>
    </WallPageShell>
  );
}
