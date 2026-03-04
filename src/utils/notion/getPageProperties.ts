import type { BlockMap, CollectionPropertySchemaMap, Decoration } from 'notion-types';
import { getDateValue, getTextContent } from 'notion-utils';
import type { NotionPost } from '@/models/NotionPosts';
import { extractBlockValue } from '@/utils/notion/extractValue';

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
  schema?: CollectionPropertySchemaMap,
): Promise<NotionPost> {
  const properties: PageProperties = { id };

  const blockValue = extractBlockValue(block?.[id]);
  const propertiesObject = (blockValue?.properties ?? {}) as Properties;
  if (!schema) {
    return properties as NotionPost;
  }

  const rawProperties = Object.entries(propertiesObject);
  for (const [key, val] of rawProperties) {
    const schemaEntry = schema[key];
    if (!schemaEntry?.type) {
      continue;
    }

    const { type, name } = schemaEntry;

    if (!excludeProperties.includes(type)) {
      properties[name] = getTextContent(val);
      continue;
    }

    switch (type) {
      case 'date': {
        const { type: _ignored, ...dateValue } = getDateValue(val) || {};
        properties[name] = dateValue;
        break;
      }
      case 'select':
      case 'multi_select': {
        const text = getTextContent(val);
        if (text && text.length > 0) {
          properties[name] = text.split(',');
        }
        break;
      }
      default:
        break;
    }
  }

  return properties as NotionPost;
}
