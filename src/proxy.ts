import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server.js';

/**
 * Defensive header scrubbing at the proxy boundary (CVE-2025-29927 mitigation).
 * Removes untrusted client headers starting with `x-` before forwarding.
 */
export const scrubIncomingHeaders = (incoming: Headers): Headers => {
  const sanitized = new Headers();

  incoming.forEach((value, name) => {
    if (!name.toLowerCase().startsWith('x-')) {
      sanitized.set(name, value);
    }
  });

  return sanitized;
};

/**
 * Next.js 16 proxy boundary handler that strips untrusted `x-*` headers
 * from incoming requests before forwarding to App Router handlers.
 */
export const proxy = (request: NextRequest): NextResponse => {
  const requestHeaders = scrubIncomingHeaders(request.headers);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
};
