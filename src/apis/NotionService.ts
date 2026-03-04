import { NotionAPI } from 'notion-client';
import { idToUuid } from 'notion-utils';
import getPageIds from '@/utils/notion/getPageIds';
import getPageProperties from '@/utils/notion/getPageProperties';
import type { NotionPosts } from '@/models/NotionPosts';
import filterPublishedPosts from '@/utils/notion/filterPublishedPosts';
import { extractBlockValue, extractCollectionValue } from '@/utils/notion/extractValue';
import { BLOG_CONFIG } from '../../.blog-project.config';

export const notionService = new NotionAPI();

export async function getAllPosts({ includePages = false }) {
  let id = BLOG_CONFIG.NOTION_PAGE_ID as string;

  const response = await notionService.getPage(id);
  id = idToUuid(id);
  const collection = extractCollectionValue(Object.values(response.collection)[0]);
  const block = response.block;
  const schema = collection?.schema;

  const rawMetadata = extractBlockValue(block[id]);

  // Check Type
  if (rawMetadata?.type !== 'collection_view_page' && rawMetadata?.type !== 'collection_view') {
    return [];
  }

  // Construct Data
  const pageIds = getPageIds(response);
  const data = [];

  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i];
    const properties = (await getPageProperties(id, block, schema)) || null;
    const blockValue = extractBlockValue(block[id]);
    properties.createdTime = new Date(blockValue?.created_time ?? 0).toString();
    properties.fullWidth = Boolean((blockValue?.format as Record<string, unknown>)?.page_full_width);

    data.push(properties);
  }

  const posts = filterPublishedPosts({ posts: data, includePages });

  // Sort by date
  posts.sort((a: any, b: any) => {
    const dateA: any = new Date(a?.date?.start_date || a.createdTime);
    const dateB: any = new Date(b?.date?.start_date || b.createdTime);
    return dateB - dateA;
  });
  return posts as NotionPosts;
}
