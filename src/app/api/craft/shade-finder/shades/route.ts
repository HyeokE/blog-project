import { handleShadesRequest } from '@/features/shade-finder/server';

export function GET(request: Request) {
  return handleShadesRequest(request);
}
