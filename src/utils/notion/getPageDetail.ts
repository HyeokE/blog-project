import { notionService } from '@/apis/NotionService';
import getPageProperties from '@/utils/notion/getPageProperties';
import type { NotionPost } from '@/models/NotionPosts';
import type { ExtendedRecordMap } from 'notion-types';
import { extractCollectionValue } from '@/utils/notion/extractValue';

export type PostDetailResponse = NotionPost & {
  recordMap: ExtendedRecordMap;
};

export const getPageDetail = async (id: string) => {
  const response = await notionService.getPage(id);

  const collection = extractCollectionValue(Object.values(response.collection)[0]);
  const block = response.block;
  const schema = collection?.schema;
  const properties = await getPageProperties(id, block, schema);
  return {
    ...properties,
    recordMap: response,
  };
};
