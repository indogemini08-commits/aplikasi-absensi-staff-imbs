import { NextResponse } from 'next/server';

export const NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export function jsonResponse(data: any, init?: ResponseInit) {
  const mergedHeaders = new Headers(init?.headers);
  Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => {
    mergedHeaders.set(key, value);
  });

  return NextResponse.json(data, {
    ...init,
    headers: mergedHeaders,
  });
}
