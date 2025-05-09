import type { BlockMap, CollectionPropertySchemaMap, Decoration } from 'notion-types';
import { getDateValue, getTextContent } from 'notion-utils';
import type { NotionPost } from '@/models/NotionPosts';

interface PageProperties {
  id: string;
  [key: string]: unknown;
}

interface Properties {
  [key: string]: Decoration[];
}

const excludeProperties = ['date', 'select', 'multi_select', 'person', 'file'];

export default async function getPageProperties(
  id: string,
  block: BlockMap,
  schema: CollectionPropertySchemaMap,
): Promise<NotionPost> {
  const properties: PageProperties = { id };

  const propertiesObject = (block?.[id]?.value?.properties || {}) as Properties;
  const rawProperties = Object.entries(propertiesObject);
  for (const [key, val] of rawProperties) {
    const type = schema[key]?.type;
    if (!type) {
      continue;
    }

    if (!excludeProperties.includes(type)) {
      properties[schema[key].name] = getTextContent(val);
      continue;
    }

    switch (type) {
      case 'date': {
        const { type: _ignored, ...dateValue } = getDateValue(val) || {};
        properties[schema[key].name] = dateValue;
        break;
      }
      case 'select':
      case 'multi_select': {
        const text = getTextContent(val);
        if (text && text.length > 0) {
          properties[schema[key].name] = text.split(',');
        }
        break;
      }
      default:
        break;
    }
  }

  return properties as NotionPost;
}
