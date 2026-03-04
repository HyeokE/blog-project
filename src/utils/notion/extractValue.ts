import type { Block, Collection, NotionMapBox, Role } from 'notion-types';

/**
 * notion-types v7의 NotionMapBox<T> 유니언 타입에서 실제 값을 추출합니다.
 *
 * NotionMapBox<T> =
 *   | { role: Role; value: T }                          (flat)
 *   | { role: Role; value: { role: Role; value: T } }   (nested)
 */

interface NestedValue<T> {
  role: Role;
  value: T;
}

function isNestedValue<T>(v: unknown): v is NestedValue<T> {
  return (
    typeof v === 'object' &&
    v !== null &&
    'role' in v &&
    'value' in v
  );
}

export function extractValue<T>(entry: NotionMapBox<T> | undefined | null): T | undefined {
  if (!entry) {
    return undefined;
  }

  const inner = entry.value;

  // nested 구조: entry.value = { role, value: T }
  if (isNestedValue<T>(inner)) {
    return inner.value;
  }

  // flat 구조: entry.value = T
  return inner as T;
}

export function extractBlockValue(entry: NotionMapBox<Block> | undefined | null): Block | undefined {
  return extractValue(entry);
}

export function extractCollectionValue(entry: NotionMapBox<Collection> | undefined | null): Collection | undefined {
  return extractValue(entry);
}
