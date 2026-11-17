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
