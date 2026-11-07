import { handleMatchesRequest } from '@/features/shade-finder/server';

export function GET(request: Request) {
  return handleMatchesRequest(request);
}
