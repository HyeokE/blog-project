import { use } from 'react';
import { notionService } from '@/apis/NotionService';
import NotionView from '@/components/NotionView';

export default function Page({ params }: { params: { slug: string } }) {
  const post = use(notionService.getPage(params.slug));
  console.log(post);
  return <NotionView recordMap={post} />;
}
