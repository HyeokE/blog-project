export interface PortfolioLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface PortfolioProject {
  title: string;
  period: string;
  role: string;
  summary: string;
  problem: string;
  decision: string;
  outcome: string;
  stack: string[];
  links: PortfolioLink[];
}

export interface PortfolioCompanyGroup {
  company: string;
  role: string;
  period: string;
  intro?: string;
  projects: PortfolioProject[];
}

export interface WorkPrinciple {
  title: string;
  description: string;
}

export interface AboutProfile {
  name: string;
  role: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSummary: string;
  heroDescription: string;
  heroCaption: string;
  focusAreas: string[];
}

export const aboutProfile: AboutProfile = {
  name: 'Junhyeok Jeong',
  role: 'Frontend Engineer',
  heroEyebrow: 'Window Seat Portfolio',
  heroHeadline: 'I build frontend systems that feel calm to users and dependable to teams.',
  heroSummary:
    'From product UX to design systems, I turn ambiguous workflows into interfaces and structures that can keep shipping.',
  heroDescription:
    'I care about clarity, systems, and the kind of motion that helps people understand where they are before they need to think about it.',
  heroCaption: 'Scroll to leave the cabin and enter the work.',
  focusAreas: ['Product UX', 'Design Systems', 'DX & Testing', 'Motion'],
};

export const portfolioCompanyGroups: PortfolioCompanyGroup[] = [
  {
    company: 'SkinSeoul',
    role: 'Software Engineer',
    period: '2025.02 - Present',
    intro:
      '초기 멤버로 합류해 브랜드 웹 경험의 기반을 다시 세우고, 이후 운영과 실험을 더 빠르게 이어갈 수 있는 구조를 만드는 데 집중했습니다.',
    projects: [
      {
        title: 'SkinSeoul Website',
        period: '2025.02 - Present',
        role: 'Website Migration / Frontend Structure',
        summary:
          'WordPress 기반 웹사이트를 Next.js 구조로 전환하며, 브랜드와 제품이 빠르게 확장할 수 있는 웹 기반을 만들고 있습니다.',
        problem:
          '기존 구조는 반복적인 개편과 실험을 빠르게 반영하기 어려웠고, 제품이 커질수록 프론트엔드 유지보수 비용이 커질 여지가 있었습니다.',
        decision:
          '마이그레이션 범위를 프론트엔드 구조와 정보 설계 재정비에 집중하고, 페이지와 UI를 다시 조립하기 쉬운 단위로 나누어 설계했습니다.',
        outcome:
          '운영과 후속 개선을 더 빠르게 이어갈 수 있는 제품 기반을 마련했고, 이후 브랜드와 콘텐츠 변화에 대응하기 쉬운 구조를 확보했습니다.',
        stack: ['Next.js', 'Migration', 'Information Architecture'],
        links: [],
      },
    ],
  },
  {
    company: '쿼타랩',
    role: 'Frontend Developer',
    period: '2024.05 - 2025.01',
    intro:
      '디자인 시스템과 제품 안정성 개선을 중심으로, 팀이 믿고 쓸 수 있는 UI 구조와 더 나은 개발 경험을 만드는 일을 맡았습니다.',
    projects: [
      {
        title: 'Qube (QDS)',
        period: '2024.05 - 2025.01',
        role: 'Design System',
        summary:
          '신뢰도가 낮아진 디자인 시스템을 다시 제품의 공용 언어로 만들기 위해 테스트, 사용 규칙, 컴포넌트 역할 재정의를 함께 진행했습니다.',
        problem:
          '동작 버그가 잦고 무분별한 커스텀이 이어지면서 시스템에 대한 신뢰와 일관성이 함께 무너지고 있었습니다.',
        decision:
          '컴포넌트 테스트를 도입하고 사용 범위를 정의했으며, 커스텀이 반복되던 지점은 prop 설계 자체를 다시 정리했습니다.',
        outcome:
          '디자인 시스템을 실제로 믿고 사용할 수 있는 상태로 되돌리는 데 집중했고, 챕터 내 일관된 사용 문화를 만드는 기반을 만들었습니다.',
        stack: ['Design System', 'Component Testing', 'DX', 'Component API Design'],
        links: [],
      },
      {
        title: 'Quotabook',
        period: '2024.05 - 2025.01',
        role: 'Product Stability',
        summary:
          '증권 관리 플랫폼의 안정성을 높이기 위해 테스트 기반을 세우고, 시스템 컴포넌트와 시멘틱 구조를 제품 관점에서 개선했습니다.',
        problem:
          '버그가 반복적으로 발생하고 UI 시스템이 파편화되면서, 기능 개발보다 유지보수와 회귀 방지 비용이 더 커지는 상황이 있었습니다.',
        decision:
          '테스트 라이브러리를 도입해 시스템 컴포넌트 커버리지를 높이고, polymorphic 컴포넌트로 유연한 시멘틱 구조와 더 나은 DX를 함께 제공했습니다.',
        outcome:
          '안정성 개선이라는 팀 목표에 맞춰 회귀를 줄일 수 있는 기반을 만들었고, UI 시스템이 더 유연하면서도 일관되게 확장되도록 도왔습니다.',
        stack: ['Testing Library', 'Polymorphic Components', 'System UI', 'Product Stability'],
        links: [],
      },
    ],
  },
  {
    company: '샤플앤컴퍼니',
    role: 'Frontend Developer',
    period: '2023.01 - 2024.05',
    intro:
      '통합 디자인 시스템과 서비스 대시보드 구조를 다루면서, 반복 작업을 줄이는 자동화와 팀 개발 문화를 함께 손봤습니다.',
    projects: [
      {
        title: 'Shoplflow',
        period: '2023.01 - 2024.05',
        role: 'Design System Lead',
        summary:
          '통합 디자인 시스템을 리드하며 디자인 토큰, 컴포넌트 구조, 배포 자동화를 묶어 팀이 반복적으로 사용할 수 있는 기반을 만들었습니다.',
        problem:
          '디자인 토큰, 아이콘, 공통 패키지 관리가 모두 수작업에 가까워서 개발자 비용이 계속 누적되고 있었습니다.',
        decision:
          'Figma 변경이 라이브러리로 이어지는 자동화 흐름을 구축하고, polymorphic 컴포넌트와 SVG 자동 변환 스크립트로 반복 작업을 줄였습니다.',
        outcome:
          '디자인 시스템이 단순한 컴포넌트 묶음이 아니라 팀의 실제 생산성을 올리는 도구가 되도록 만들었고, 변경 비용을 지속적으로 낮췄습니다.',
        stack: ['Design Tokens', 'CI/CD', 'Polymorphic Components', 'SVG Automation'],
        links: [],
      },
    ],
  },
];

export const workPrinciples: WorkPrinciple[] = [
  {
    title: '시스템은 실제 사용까지 설계합니다.',
    description:
      '디자인 시스템은 예쁜 컴포넌트 모음보다 사용 범위와 규칙이 더 중요하다고 생각합니다. 팀이 자연스럽게 쓰게 되는 구조를 만듭니다.',
  },
  {
    title: '문제를 인터페이스 이전에 먼저 정리합니다.',
    description:
      '바로 화면부터 만들기보다, 사용자가 겪는 불편과 팀이 해결하려는 목표를 먼저 정리해 우선순위와 구현 방향을 맞춥니다.',
  },
  {
    title: '테스트와 문서화를 DX의 일부로 봅니다.',
    description:
      '회귀를 줄이는 테스트, 반복을 줄이는 문서, 실수를 줄이는 자동화를 함께 만들 때 프론트엔드 품질이 유지된다고 봅니다.',
  },
  {
    title: '협업 구조도 제품 품질의 일부입니다.',
    description:
      '기획, 디자인, 프론트엔드가 같은 언어로 이야기할 수 있어야 속도가 납니다. 그래서 의사결정이 남는 구조를 만드는 편입니다.',
  },
];
