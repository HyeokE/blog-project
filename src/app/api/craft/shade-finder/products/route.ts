import { handleProductsRequest } from '@/features/shade-finder/server';

export function GET(request: Request) {
  return handleProductsRequest(request);
}
