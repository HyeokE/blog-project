import React from 'react';
import { Github, Mail, Coffee } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="font-suit bg-background/60 relative min-h-dvh min-w-dvw overflow-hidden dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-8">
        {/* 상단 내비게이션 */}
        <nav className="mb-12 flex items-center justify-end">
          <div className="flex space-x-4">
            <a
              href="mailto:jhjeong00@gmail.com"
              className="text-brand-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/HyeokE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://calendar.notion.so/meet/jason-jeong/coffee-chat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              aria-label="Blog"
            >
              <Coffee className="h-5 w-5" />
            </a>
          </div>
        </nav>

        {/* 헤더 섹션 */}
        <header className="mb-20">
          <h1 className="text-brand-700 mb-8 text-5xl font-extrabold dark:text-white">ABOUT.</h1>
          <p className="text-brand-700 mb-2 text-lg leading-relaxed dark:text-gray-300">
            안녕하세요. 저는 정준혁입니다.
          </p>
          <p className="text-brand-700 mb-2 text-lg leading-relaxed dark:text-gray-300">
            문제를 정의하고 해결하는데 강점이 있습니다. 사용자를 먼저 생각하고 사용자의 불편함을
            해소하는데 집중합니다.
          </p>
          <p className="text-brand-700 text-lg leading-relaxed dark:text-gray-300">
            프론트엔드는 사용자에게 가장 맞닿은 직군이라고 생각하기 때문에 사용자의 문제를 해결하기
            위한 개발을 하고 있습니다.
          </p>
        </header>

        {/* Experience Timeline */}
        <div className="space-y-16">
          {/* 경력 섹션 */}
          <section className="rounded-lg">
            <div className="mb-6 flex items-center">
              <h2 className="text-brand-900 text-2xl font-bold dark:text-white">
                WORK EXPERIENCE.
              </h2>
            </div>

            <div className="mb-16">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">SkinSeoul</h3>
                <span className="text-brand-500 text-sm dark:text-gray-400">
                  (Singapore) 2025.02 - Present
                </span>
              </div>
              <p className="text-brand-600 mb-6 dark:text-gray-300">Software Engineer</p>
              <div className="mb-8">
                <h4 className="mb-4 text-lg font-bold text-black dark:text-white">
                  SkinSeoul(Website).
                </h4>
                <p className="text-brand-700 mb-6 dark:text-gray-300">
                  스킨서울의 초기 멤버로 합류하여 워드프레스로 작성된 기존 웹사이트를 Next.js로
                  마이그레이션했습니다.
                </p>
              </div>
            </div>
            <div className="mb-16">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">쿼타랩</h3>
                <span className="text-brand-500 text-sm dark:text-gray-400">
                  (Korea) 2024.05 - 2025.01
                </span>
              </div>
              <p className="text-brand-600 mb-6 dark:text-gray-300">Frontend Developer</p>

              <div className="mb-8">
                <h4 className="mb-4 text-lg font-bold text-black dark:text-white">Qube(QDS).</h4>
                <p className="text-brand-700 mb-6 dark:text-gray-300">
                  쿼타랩 디자인 시스템 'Qube'의 개발 및 유지보수를 주도적으로 담당했습니다. 관리되지
                  않던 디자인 시스템의 방향성을 재 정립하고, 프로덕트 안정성 향상이라는 목표를
                  달성하기 위해 사용 범위를 정의하여 실질적인 개선을 이뤄냈습니다.
                </p>

                <h5 className="mb-4 text-base font-bold text-black dark:text-white">WHAT I DID.</h5>
                <ul className="mb-6 space-y-1">
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        동작 버그가 잦아 신뢰도가 낮아진 디자인 시스템을 개선
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        동작 버그가 잦은 문제를 해결하기 위해 테스트를 도입하고 컴포넌트 테스트를
                        작성함으로서 신뢰도 있는 디자인 시스템을 만들기 위해 노력했습니다.
                      </span>
                    </p>
                  </li>
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        시스템의 파편화가 발생하는 문제 및 DX 개선
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        파편화된 컴포넌트 사용 현황을 정리하고 개선했습니다.
                      </span>
                    </p>
                  </li>
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        디자인 시스템의 무분별한 커스텀이 발생하는 문제를 개선
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        커스텀을 하게 된 원인을 파악하고 시스템 사용 규칙을 정리하여 챕터 내에
                        공유함으로서 일관된 컴포넌트 사용을 장려하였습니다. 또한 컴포넌트의 역할에
                        따른 prop를 추가하여 커스텀이 발생하는 상황을 방지했습니다.
                      </span>
                    </p>
                  </li>
                </ul>
              </div>

              <div className="mb-8">
                <h4 className="mb-4 text-lg font-bold text-black dark:text-white">Quotabook.</h4>
                <p className="text-brand-700 mb-6 dark:text-gray-300">
                  증권 관리 플랫폼 쿼타북을 유지보수 및 개발했습니다. "프로덕트 안정성 개선"이라는
                  미션을 달성하기 위한 여러 활동을 진행했습니다.
                </p>

                <h5 className="mb-4 text-base font-bold text-black dark:text-white">WHAT I DID.</h5>
                <ul className="mb-6 space-y-1">
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        코드 상 버그가 자주 발생하는 문제를 해결하기 위해 테스트 라이브러리를
                        도입하고 시스템 컴포넌트의 테스트 커버리지를 높혔습니다.
                      </span>
                    </p>
                  </li>
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        시스템의 파편화를 제어하기 위한 개발자 경험과 유연한 시멘틱 태그를 제공하기
                        위한 Polymorphic 컴포넌트를 개발하여 개선했습니다.
                      </span>
                    </p>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mb-16">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">샤플앤컴퍼니</h3>
                <span className="text-brand-500 text-sm dark:text-gray-400">
                  (Korea) 2023.01 - 2024.05
                </span>
              </div>
              <p className="text-brand-600 mb-6 dark:text-gray-300">Frontend Developer</p>

              <div className="mb-8">
                <h4 className="mb-4 text-lg font-bold text-black dark:text-white">샤플플로우</h4>
                <p className="text-brand-700 mb-6 dark:text-gray-300">
                  샤플, 하다 통합 디자인 시스템인 Shoplflow를 리드하여 개발했습니다. 오픈소스
                  프로젝트로 공개되어 있으며 하나의 언어를 만드는 것을 목표로 하고 있습니다. style,
                  lint, util 등 사내에서 공통으로 사용할 패키지의 환경을 구축했으며 개발자의 시간을
                  절약하기 위해 버전관리, 테스트, 배포 등의 작업을 자동화했습니다. DX 중심의
                  compound component 패턴으로 컴포넌트를 설계했습니다.
                </p>

                <h5 className="mb-4 text-base font-bold text-black dark:text-white">WHAT I DID.</h5>
                <ul className="mb-6 space-y-1">
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        디자인 토큰들이 변경이 잦아 개발자가 직접 코드를 수정해야하는 비효율을 개선
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        Figma에서 디자인 토큰 편집시 npm 라이브러리에도 변경사항이 자동으로
                        반영되도록 CI/CD를 구축했습니다.
                      </span>
                    </p>
                  </li>
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        컴포넌트에 적절하지 않은 스멘틱 태그가 사용되는 문제를 해결
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        개발자 경험과 유연한 시멘틱 태그를 제공하기 위한 Polymorphic 컴포넌트를
                        개발하여 개선했습니다.
                      </span>
                    </p>
                  </li>
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        아이콘을 추가로 등록하거나 수정할 때 개발자가 직접 코드를 수정하는 비효율을
                        개선
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        SVG 아이콘을 변경하거나 수정할 때의 비용감소를 위해 아이콘 컴포넌트 변환 SVG
                        →
                      </span>
                      RFC 자동화 스크립트 개발
                    </p>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-4 text-lg font-bold text-black dark:text-white">
                  HADA Dashboard
                </h4>
                <p className="text-brand-700 mb-6 dark:text-gray-300">
                  현장 시설 관리 서비스 하다의 대시보드 페이지를 개발했습니다. 유지보수를 비롯해
                  비즈니스의 요구에 맞는 다양한 기능을 개발했습니다. 사용자의 관점에서 생각하며,
                  적극적인 의견 제시로 기획이 변경되기도 했습니다.
                </p>

                <h5 className="mb-4 text-base font-bold text-black dark:text-white">WHAT I DID.</h5>
                <ul className="mb-6 space-y-1">
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        프로젝트 내부에 명세되지 않은 라이브러리를 참조하는 이슈 개선
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        명세되지 않은 라이브러리를 참조하는 이슈를 yarn berry 도입으로 해결했습니다.
                      </span>
                    </p>
                  </li>
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        시설 그룹 필터 변경 후 UI가 프리징되는 이슈를 useTransition으로 90% 개선 (2s
                        → 0.2s)
                      </span>
                    </p>
                  </li>
                  <li className="flex">
                    <span className="mr-4 text-gray-400">-</span>
                    <p>
                      <span className="text-brand-700 font-medium dark:text-gray-300">
                        지속 가능한 코드와 개발 문화를 만들기 위해 노력했습니다.
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        코드 스타일의 일관성을 위해 공통 lint 규칙을 설정하고 코드 컨벤션 문서를
                        작성했습니다.
                      </span>
                      <br />
                      <span className="text-brand-700 font-light dark:text-gray-300">
                        주간 프론트엔드 회의를 주관하며 코드리뷰를 도입했습니다.
                      </span>
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 프로젝트 경험 */}
          <section className="mb-20">
            <h2 className="mb-10 text-2xl font-bold text-black dark:text-white">
              PROJECT EXPERIENCE.
            </h2>

            {/* GDSC DJU Web */}
            <div className="mb-16">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">GDSC DJU Web</h3>
                <span className="text-brand-500 text-sm dark:text-gray-400">
                  2021.10.29 - 2021.12.27
                </span>
              </div>
              <div className="mb-4 flex space-x-6">
                <a
                  href="https://github.com/GDSC-Daejin/gdsc-dju-websites/tree/master"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 text-sm underline hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                  GitHub
                </a>
                <a
                  href="https://gdscdju.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 text-sm underline hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                  Website
                </a>
              </div>

              <p className="text-brand-700 mb-6 dark:text-gray-300">
                1인 개발로 제작한 커뮤니티 소개 및 지원사이트입니다. 제작 이후 지원자 수가 50%
                증가했습니다. 코드 리팩토링을 진행하며 React-lazy를 통한 최적화로 lighthouse 기준
                performance 점수를 92점까지 향상시켰습니다. 내부 서비스들을 모노레포로 관리했습니다.
              </p>
            </div>

            {/* GDS */}
            <div className="mb-16">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">
                  GDS (GDSC Design System)
                </h3>
                <span className="text-brand-500 text-sm dark:text-gray-400">2022.8 - 2022.12</span>
              </div>

              <div className="mb-4 flex space-x-6">
                <a
                  href="https://github.com/GDSC-Daejin/design-seed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 text-sm underline hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                  GitHub
                </a>
              </div>

              <p className="text-brand-700 mb-6 dark:text-gray-300">
                웹 서비스에서 자주 사용되는 컴포넌트와 디자인 에셋들을 라이브러리로 만들었습니다.
                Rollup 도입으로 약 40%의 용량 감소를 이뤘습니다. Styled-Components 기반 라이브러리의
                한계를 느끼고 CSS 변수를 사용하는 방식으로 변경했습니다.
              </p>
            </div>

            {/* GDSC DJU Admin */}
            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">GDSC DJU Admin</h3>
                <span className="text-brand-500 text-sm dark:text-gray-400">
                  2022.05.25 - 2022.07.04
                </span>
              </div>
              <div className="mb-4 flex space-x-6">
                <a
                  href="https://github.com/GDSC-Daejin/gdsc-dju-admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 text-sm underline hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                  GitHub
                </a>
              </div>

              <p className="text-brand-700 mb-6 dark:text-gray-300">
                커뮤니티 규모가 커짐에 따라 지원자 관리 기능의 필요성을 느껴 시작하게 되었습니다.
                지원서 열람, 지원서 코멘트, 지원자 별 이메일 자동전송 기능을 포함하고 있습니다.
              </p>
            </div>
          </section>

          {/* 커뮤니티 활동 */}
          <section className="mb-20">
            <h2 className="mb-10 text-2xl font-bold text-black dark:text-white">
              OTHER EXPERIENCES.
            </h2>

            {/* GDG Korea WebTech */}
            <div className="mb-16">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">GDG Korea WebTech</h3>
                <span className="text-brand-500 text-sm dark:text-gray-400">2023.03 - 2025.04</span>
              </div>
              <p className="text-brand-600 mb-6 dark:text-gray-300">Organizer</p>

              <p className="text-brand-700 mb-6 dark:text-gray-300">
                구글의 웹 기술 기반 개발자 커뮤니티인 GDG Korea WebTech의 Organizer를 맡아 여러
                행사를 운영했습니다.
              </p>
            </div>

            {/* Google DSC Korea */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-black dark:text-white">GDSC Korea</h3>
                <span className="text-brand-500 text-sm dark:text-gray-400">2021.08 - 2023.07</span>
              </div>
              <p className="text-brand-600 mb-6 dark:text-gray-300">Lead</p>

              <p className="text-brand-700 mb-6 dark:text-gray-300">
                Google Developers에서 지원하는 Daejin University 챕터의 GDSC 1기와 2기 리드를 맡아
                운영했습니다.
              </p>

              <h5 className="mb-4 text-base font-bold text-black dark:text-white">WHAT I DID.</h5>
              <ul className="mb-6 space-y-1">
                <li className="flex">
                  <span className="mr-4 text-gray-400">-</span>
                  <p className="text-brand-700 dark:text-gray-300">
                    GDSC KOREA 2021 - 2022 우수 리드로 선정되었습니다.
                  </p>
                </li>
                <li className="flex">
                  <span className="mr-4 text-gray-400">-</span>
                  <p className="text-brand-700 dark:text-gray-300">
                    커뮤니티 내부에서 사용하는 서비스들을 개발했습니다.
                  </p>
                </li>
                <li className="flex">
                  <span className="mr-4 text-gray-400">-</span>
                  <p className="text-brand-700 dark:text-gray-300">
                    영어 닉네임을 도입하여 학번, 나이, 경력에 상관없이 수평적 문화를 조성했습니다.
                  </p>
                </li>
                <li className="flex">
                  <span className="mr-4 text-gray-400">-</span>
                  <p className="text-brand-700 dark:text-gray-300">
                    충돌은 더 나은 환경을 만든다고 생각하기 때문에 모두가 생각을 피력할 수 있는
                    환경을 조성했습니다.
                  </p>
                </li>
              </ul>
            </div>
          </section>

          {/* 커뮤니케이션 */}
          <section className="mb-20">
            <h2 className="mb-10 text-2xl font-bold text-black dark:text-white">COMMUNICATION.</h2>

            <h3 className="mb-6 text-xl font-bold text-black dark:text-white">OVERALL.</h3>
            <ul className="space-y-1">
              <li className="flex">
                <span className="mr-4 text-gray-400">-</span>
                <p className="text-brand-800 dark:text-gray-200">
                  프로젝트에 필요하다면 능숙하지 않아도 학습하여 최적의 결과를 낼 수 있도록
                  노력합니다.
                </p>
              </li>
              <li className="flex">
                <span className="mr-4 text-gray-400">-</span>
                <p className="text-brand-800 dark:text-gray-200">
                  Framer-motion을 사용하여 UI 및 애니메이션 구현을 즐깁니다. 꼭 애니메이션이
                  디자인에 포함되어 있지 않아도 선행해서 애니메이션을 구현하거나 제안하는 편입니다.
                </p>
              </li>
              <li className="flex">
                <span className="mr-4 text-gray-400">-</span>
                <p className="text-brand-800 dark:text-gray-200">
                  커뮤니티 혹은 팀의 프로세스 및 문화를 개선하거나 바꾸려는 시도를 적극적으로 하며
                  아이디어의 수용이 빠릅니다.
                </p>
              </li>
              <li className="flex">
                <span className="mr-4 text-gray-400">-</span>
                <p className="text-brand-800 dark:text-gray-200">
                  직위 및 포지션에 관계없이 적극적으로 생각을 피력합니다.
                </p>
              </li>
              <li className="flex">
                <span className="mr-4 text-gray-400">-</span>
                <p className="text-brand-800 dark:text-gray-200">
                  커뮤니케이션은 적은 것보다 많은게 좋다고 생각합니다.
                </p>
              </li>
              <li className="flex">
                <span className="mr-4 text-gray-400">-</span>
                <p className="text-brand-800 dark:text-gray-200">
                  프로덕트의 기획 회의부터 참여하는 것을 선호합니다.
                </p>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
