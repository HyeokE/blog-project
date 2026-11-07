import { handleBootstrapRequest } from '@/features/shade-finder/server';

export function GET(request: Request) {
  return handleBootstrapRequest(request);
}
