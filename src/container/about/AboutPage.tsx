import React from 'react';

const AboutPage = () => {
  return (
    <div className="relative min-h-dvh min-w-dvw overflow-hidden">
      <div className="absolute inset-0 z-0 h-full w-full overflow-y-auto">
        <div className="tablet:p-6 laptop:p-8 relative z-10 h-fit min-h-dvh w-full border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-md dark:border-gray-700/30 dark:bg-gray-900/60 dark:text-white dark:shadow-gray-900/50">
          {/* 프로필 헤더 */}
          <div className="tablet:mb-12 laptop:mb-16 mb-8 text-start">
            <h1 className="tablet:mb-6 tablet:text-4xl laptop:text-5xl mb-4 text-3xl font-bold tracking-tight dark:text-white">
              Hi there 👋 <br className="tablet:hidden" />
              I'm JunHyeok 👨‍💻
            </h1>
          </div>

          {/* About me 섹션 */}
          <section className="tablet:mb-12 laptop:mb-16 mb-8">
            <h2 className="tablet:mb-6 tablet:text-2xl mb-4 border-b border-gray-300 pb-2 text-xl font-bold dark:border-gray-700">
              About me
            </h2>

            <div className="tablet:space-y-4 flex flex-col space-y-3">
              <div className="tablet:flex-row tablet:items-start tablet:gap-3 flex flex-col">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Email<span className="text-blue-600 dark:text-blue-400">:</span>
                </span>
                <a
                  href="mailto:jhjeong00@gmail.com"
                  className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                >
                  jhjeong00@gmail<span className="text-blue-600 dark:text-blue-400">.</span>com
                </a>
              </div>
              <div className="tablet:flex-row tablet:items-start tablet:gap-3 flex flex-col">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Instagram<span className="text-blue-600 dark:text-blue-400">:</span>
                </span>
                <a
                  href="https://www.instagram.com/hyeok_e_0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                >
                  @HYEOK_E_0
                </a>
              </div>
              <div className="tablet:flex-row tablet:items-start tablet:gap-3 flex flex-col">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  MyBlog<span className="text-blue-600 dark:text-blue-400">:</span>
                </span>
                <a
                  href="https://hyeok.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                >
                  Hyeok Dev
                </a>
              </div>
            </div>
          </section>

          {/* Experience 섹션 */}
          <section>
            <h2 className="tablet:text-2xl mb-6 border-b border-gray-300 pb-2 text-xl font-bold dark:border-gray-700">
              Experience
            </h2>

            <div className="tablet:mb-10 mb-8 space-y-3">
              <h3 className="tablet:text-xl text-lg font-bold text-blue-600 dark:text-blue-400">
                2024
              </h3>
              <div className="tablet:pl-4 ml-2 border-l-2 border-gray-300 py-1 pl-3 dark:border-gray-700">
                <p className="tablet:text-base text-sm">
                  2024<span className="text-blue-600 dark:text-blue-400">.</span>05 ~ 2025
                  <span className="text-blue-600 dark:text-blue-400">.</span>01
                  <span className="text-blue-600 dark:text-blue-400">:</span>{' '}
                  <a
                    href="https://www.quotalab.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    Quotalab
                  </a>{' '}
                  Frontend Engineer
                </p>
              </div>
            </div>

            <div className="tablet:mb-10 mb-8 space-y-3">
              <h3 className="tablet:text-xl text-lg font-bold text-blue-600 dark:text-blue-400">
                2023
              </h3>
              <div className="tablet:pl-4 ml-2 space-y-3 border-l-2 border-gray-300 py-1 pl-3 dark:border-gray-700">
                <p className="tablet:text-base text-sm">
                  <a
                    href="https://festa.io/events/3446"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    2023 프론트엔드 트렌드 따라잡기
                  </a>{' '}
                  Speaker
                </p>
                <p className="tablet:text-base text-sm">
                  2023<span className="text-blue-600 dark:text-blue-400">.</span>03 ~ 현재
                  <span className="text-blue-600 dark:text-blue-400">:</span>{' '}
                  <a
                    href="https://gdg.community.dev/gdg-korea-webtech/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    Google Developer Groups Korea WebTech
                  </a>{' '}
                  Organizer
                </p>
                <p className="tablet:text-base text-sm">
                  2023<span className="text-blue-600 dark:text-blue-400">.</span>01 ~ 2024
                  <span className="text-blue-600 dark:text-blue-400">.</span>05
                  <span className="text-blue-600 dark:text-blue-400">:</span>{' '}
                  <a
                    href="https://www.shoplworks.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    Shopl&Company
                  </a>{' '}
                  Frontend Engineer
                </p>
              </div>
            </div>

            <div className="tablet:mb-10 mb-8 space-y-3">
              <h3 className="tablet:text-xl text-lg font-bold text-blue-600 dark:text-blue-400">
                2022
              </h3>
              <div className="tablet:pl-4 ml-2 space-y-3 border-l-2 border-gray-300 py-1 pl-3 dark:border-gray-700">
                <p className="tablet:text-base text-sm">
                  <a
                    href="https://github.com/GDSC-Daejin/gdsc-dju-websites/tree/master"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    GDSC DJU Web Services Monorepo
                  </a>
                </p>
                <p className="tablet:text-base text-sm">
                  <a
                    href="https://github.com/GDSC-Daejin/design-seed"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    GDSC DJU Design System
                  </a>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="tablet:text-xl text-lg font-bold text-blue-600 dark:text-blue-400">
                2021
              </h3>
              <div className="tablet:pl-4 ml-2 space-y-3 border-l-2 border-gray-300 py-1 pl-3 dark:border-gray-700">
                <p className="tablet:text-base text-sm">
                  2021<span className="text-blue-600 dark:text-blue-400">.</span>12
                  <span className="text-blue-600 dark:text-blue-400">:</span>{' '}
                  <a
                    href="https://gdscdju.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    GDSC DJU Site
                  </a>
                </p>
                <p className="tablet:text-base text-sm">
                  2021<span className="text-blue-600 dark:text-blue-400">.</span>08 ~ 2023
                  <span className="text-blue-600 dark:text-blue-400">.</span>07
                  <span className="text-blue-600 dark:text-blue-400">:</span>{' '}
                  <a
                    href="https://gdsc.community.dev/daejin-university/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    GDSC(Google Developer Student Clubs) Daejin
                  </a>{' '}
                  Lead
                </p>
                <p className="tablet:text-base text-sm">
                  <a
                    href="https://festa.io/events/1862"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-blue-600 decoration-1 underline-offset-2 transition-colors hover:text-blue-600 dark:decoration-blue-400 dark:hover:text-blue-400"
                  >
                    GDSC X GDG Campus DevFest University
                  </a>{' '}
                  STAFF
                </p>
                <p className="tablet:ml-6 tablet:text-base ml-4 text-sm">출석부 개발팀</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
