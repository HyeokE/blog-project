import { NotionAPI } from 'notion-client';
import type {
  BlockMap,
  CollectionPropertySchemaMap,
  Decoration,
  SubDecoration,
} from 'notion-types';
import { getTextContent, getDateValue } from 'notion-utils';
import { NotionPost } from '@/models/NotionPosts';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo: string;
}

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
  const api = new NotionAPI();
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
      case 'person': {
        const rawUsers = val.flat() as SubDecoration[];
        const userIds = rawUsers.map((item) => item?.[0]?.[1]).filter(Boolean);

        if (userIds.length > 0) {
          const usersData = await Promise.all(
            userIds.map(async (userId: string) => {
              const res: any = await api.getUsers([userId]);
              const resValue = res?.recordMapWithRoles?.notion_user?.[userId]?.value;
              return {
                id: resValue?.id,
                first_name: resValue?.given_name,
                last_name: resValue?.family_name,
                profile_photo: resValue?.profile_photo,
              } as User;
            }),
          );
          properties[schema[key].name] = usersData;
        } else {
          properties[schema[key].name] = [];
        }
        break;
      }
      default:
        break;
    }
  }

  return properties as NotionPost;
}
