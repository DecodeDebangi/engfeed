import { NextRequest } from 'next/server';

export const VISITOR_COOKIE = 'engfeed_visitor';

/**
 * The current visitor's ID, set by src/middleware.ts. Without one, use a throwaway ID rather than a shared one.
 */
export function getVisitorId(request: NextRequest): string {
  return request.cookies.get(VISITOR_COOKIE)?.value ?? crypto.randomUUID();
}
