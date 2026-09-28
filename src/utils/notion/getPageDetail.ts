import { withNotionPageRetry } from '@/utils/notion/fetchNotionPage';
import { notionService } from '@/apis/NotionService';
import getPageProperties from '@/utils/notion/getPageProperties';
import type { NotionPost } from '@/models/NotionPosts';
import type { ExtendedRecordMap } from 'notion-types';
import { extractCollectionValue } from '@/utils/notion/extractValue';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

export type PostDetailResponse = NotionPost & {
  recordMap: ExtendedRecordMap;
};

const loadPageDetail = async (id: string) => {
  const response = await withNotionPageRetry(id, () => notionService.getPage(id));

  const collection = extractCollectionValue(Object.values(response.collection)[0]);
  const block = response.block;
  const schema = collection?.schema;
  const properties = await getPageProperties(id, block, schema);
  return {
    ...properties,
    recordMap: response,
  };
};

// Metadata and page rendering share a request, and theme variants share the data cache.
export const getPageDetail = cache(
  unstable_cache(loadPageDetail, ['notion-page-detail-v1'], {
    revalidate: 3600,
    tags: ['notion-posts'],
  }),
);
