import type { ExtendedRecordMap } from 'notion-types';

type NotionFetchError = {
  status?: number;
  statusCode?: number;
  message?: string;
  response?: { status?: number; headers?: Headers };
};

const MAX_ATTEMPTS = 3;
const MAX_DELAY_MS = 10_000;
const MIN_REQUEST_INTERVAL_MS = 750;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const globalRequests = globalThis as typeof globalThis & {
  __blogNotionPageRequests?: Map<string, Promise<ExtendedRecordMap>>;
  __blogNotionRequestQueue?: {
    tail: Promise<void>;
    lastStartedAt: number;
    blockedUntil?: number;
    rateLimitError?: unknown;
  };
};
const requests = (globalRequests.__blogNotionPageRequests ??= new Map<
  string,
  Promise<ExtendedRecordMap>
>());

const queue = (globalRequests.__blogNotionRequestQueue ??= {
  tail: Promise.resolve(),
  lastStartedAt: 0,
});

function wait(delay: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

function getStatus(error: unknown) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const failure = error as NotionFetchError;
  return failure.response?.status ?? failure.statusCode ?? failure.status;
}

export function isNotionNotFound(error: unknown) {
  const status = getStatus(error);
  if (status === 404) {
    return true;
  }
  // A failed upstream request must never turn an existing ISR page into a 404.
  if (status !== undefined && status !== 400) {
    return false;
  }
  const message = (error as NotionFetchError | null)?.message ?? '';
  return /^Notion page not found\b|invalid (?:notion )?(?:page\s*id|uuid)\b/i.test(message);
}

function retryDelay(error: unknown, attempt: number) {
  const headers = (error as NotionFetchError | null)?.response?.headers;
  const retryAfter = headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(delay)) {
      return Math.max(0, delay);
    }
  }
  return Math.min(MAX_DELAY_MS, 1500 * 2 ** attempt + Math.random() * 250);
}

async function loadWithRetry(load: () => Promise<ExtendedRecordMap>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await load();
    } catch (error) {
      const status = getStatus(error);
      const delay = retryDelay(error, attempt);
      if (status === 429) {
        queue.blockedUntil = Math.max(queue.blockedUntil ?? 0, Date.now() + delay);
        queue.rateLimitError = error;
      }
      if (attempt >= MAX_ATTEMPTS - 1 || !RETRYABLE_STATUSES.has(status ?? 0)) {
        throw error;
      }
      // Never retry earlier than Retry-After. If it exceeds this request's wait
      // budget, surface the failure so ISR keeps the last successful response.
      if (delay > MAX_DELAY_MS) {
        throw error;
      }
      await wait(delay);
    }
  }
}

function enqueue(load: () => Promise<ExtendedRecordMap>) {
  const request = queue.tail.then(async () => {
    const cooldown = Math.max(0, (queue.blockedUntil ?? 0) - Date.now());
    if (cooldown > MAX_DELAY_MS) {
      throw queue.rateLimitError;
    }
    if (cooldown) {
      await wait(cooldown);
    }
    const elapsed = Math.max(0, Date.now() - queue.lastStartedAt);
    const delay = Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed);
    if (delay) {
      await wait(delay);
    }
    queue.lastStartedAt = Date.now();
    return loadWithRetry(load);
  });
  // A failed page must not poison the queue for later requests.
  queue.tail = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

// Deduplicate cold-cache requests across metadata, page renders and theme variants.
// The data cache owns the TTL; this map retains only requests that are in flight.
export function withNotionPageRetry(
  id: string,
  load: () => Promise<ExtendedRecordMap>,
): Promise<ExtendedRecordMap> {
  const key = id.replaceAll('-', '').toLowerCase();
  const pending = requests.get(key);
  if (pending) {
    return pending;
  }
  const request = enqueue(load).finally(() => {
    requests.delete(key);
  });
  requests.set(key, request);
  return request;
}
