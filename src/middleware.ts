import { NextRequest, NextResponse } from 'next/server';
import { VISITOR_COOKIE } from '@/lib/visitor';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Give each browser its own random ID, so bookmarks and read marks aren't shared between visitors.
// The cookie is httpOnly and rejected unless it's a UUID, so an ID can't be read by scripts or chosen by hand.
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  if (existing && UUID_PATTERN.test(existing)) return NextResponse.next();

  const visitorId = crypto.randomUUID();
  request.cookies.set(VISITOR_COOKIE, visitorId);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('cookie', request.cookies.toString());

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
  });
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
