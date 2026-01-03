import LegacyDesignListPage from '@/container/designs/LegacyDesignListPage';

export const metadata = {
  title: 'Legacy Designs',
  description: '이전 디자인 목록',
};

export default async function Designs() {
  return <LegacyDesignListPage />;
}


