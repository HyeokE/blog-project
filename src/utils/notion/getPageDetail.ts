import { notionService } from '@/apis/NotionService';
import getPageProperties from '@/utils/notion/getPageProperties';
import type { NotionPost } from '@/models/NotionPosts';
import type { ExtendedRecordMap } from 'notion-types';

export type PostDetailResponse = NotionPost & {
  recordMap: ExtendedRecordMap;
};

export const getPageDetail = async (id: string) => {
  const response = await notionService.getPage(id);

  const collection = Object.values(response.collection)[0]?.value;
  const block = response.block;
  const schema = collection?.schema;
  const properties = await getPageProperties(id, block, schema);
  return {
    ...properties,
    recordMap: response,
  };
};
