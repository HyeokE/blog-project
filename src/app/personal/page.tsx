import PersonalPage from '@/container/personal/PersonalPage';

export const metadata = {
  title: 'Hyeok | Personal',
  description: '개인 블로그 페이지입니다.',
};

export default async function Personal() {
  return <PersonalPage />;
}
