import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scrubIncomingHeaders } from '../src/proxy.ts';

describe('scrubIncomingHeaders', () => {
  it('removes x-middleware-subrequest to mitigate CVE-2025-29927', () => {
    const incoming = new Headers({
      'x-middleware-subrequest': 'src/middleware:src/middleware',
      accept: 'application/json',
    });

    const sanitized = scrubIncomingHeaders(incoming);

    assert.equal(sanitized.has('x-middleware-subrequest'), false);
    assert.equal(sanitized.get('x-middleware-subrequest'), null);
    assert.equal(sanitized.get('accept'), 'application/json');
  });

  it('removes uppercase and mixed-case x-* headers case-insensitively', () => {
    const incoming = new Headers([
      ['X-Forwarded-For', '203.0.113.10'],
      ['X-Forwarded-Host', 'evil.example.com'],
      ['X-Real-IP', '198.51.100.42'],
      ['X-MiDdLeWaRe-SuBrEqUeSt', 'bypass'],
      ['x-Custom-Debug', 'true'],
      ['authorization', 'Bearer test-token'],
    ]);

    const sanitized = scrubIncomingHeaders(incoming);

    for (const forbidden of [
      'X-Forwarded-For',
      'x-forwarded-for',
      'X-Forwarded-Host',
      'X-Real-IP',
      'X-MiDdLeWaRe-SuBrEqUeSt',
      'x-Custom-Debug',
    ]) {
      assert.equal(sanitized.has(forbidden), false, `Expected ${forbidden} to be stripped`);
    }

    assert.equal(sanitized.get('authorization'), 'Bearer test-token');
  });

  it('preserves authorization, content-type, accept, and non-x-prefixed headers', () => {
    const incoming = new Headers({
      Authorization: 'Bearer secret-jwt',
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
      'User-Agent': 'TaskFlow-Client/1.0',
      'Cache-Control': 'no-store',
      'max-forwards': '5',
      'proxy-x-trace': 'keep-me',
      'x-internal-user': 'admin',
    });

    const sanitized = scrubIncomingHeaders(incoming);

    assert.equal(sanitized.get('authorization'), 'Bearer secret-jwt');
    assert.equal(sanitized.get('content-type'), 'application/json; charset=utf-8');
    assert.equal(sanitized.get('accept'), 'application/json');
    assert.equal(sanitized.get('user-agent'), 'TaskFlow-Client/1.0');
    assert.equal(sanitized.get('cache-control'), 'no-store');
    assert.equal(sanitized.get('max-forwards'), '5');
    assert.equal(sanitized.get('proxy-x-trace'), 'keep-me');
    assert.equal(sanitized.has('x-internal-user'), false);
  });

  it('does not mutate the original Headers instance and returns a fresh Headers copy', () => {
    const incoming = new Headers({
      'x-middleware-subrequest': 'subrequest',
      'X-Forwarded-For': '10.0.0.1',
      authorization: 'Bearer token-123',
      'content-type': 'application/json',
      accept: 'application/json',
    });

    const sanitized = scrubIncomingHeaders(incoming);

    assert.notEqual(sanitized, incoming);
    assert.ok(sanitized instanceof Headers);

    // Original headers remain untouched.
    assert.equal(incoming.get('x-middleware-subrequest'), 'subrequest');
    assert.equal(incoming.get('X-Forwarded-For'), '10.0.0.1');
    assert.equal(incoming.get('authorization'), 'Bearer token-123');

    // Mutating sanitized headers does not affect the original instance.
    sanitized.set('accept', 'text/plain');
    sanitized.delete('authorization');
    assert.equal(incoming.get('accept'), 'application/json');
    assert.equal(incoming.get('authorization'), 'Bearer token-123');
  });

  it('handles empty Headers and Headers containing only x-* entries', () => {
    const emptySanitized = scrubIncomingHeaders(new Headers());
    assert.deepEqual([...emptySanitized.entries()], []);

    const onlySpoofed = new Headers({
      'x-middleware-subrequest': '1',
      'X-Forwarded-For': '127.0.0.1',
      'X-Bypass': 'true',
    });
    const stripped = scrubIncomingHeaders(onlySpoofed);
    assert.deepEqual([...stripped.entries()], []);
    assert.equal(onlySpoofed.has('x-middleware-subrequest'), true);
  });

  it('preserves multi-value safe headers while stripping multi-value x-* headers', () => {
    const incoming = new Headers();
    incoming.append('accept', 'application/json');
    incoming.append('accept', 'text/plain');
    incoming.append('x-forwarded-for', '192.0.2.1');
    incoming.append('x-forwarded-for', '192.0.2.2');

    const sanitized = scrubIncomingHeaders(incoming);

    assert.equal(sanitized.get('accept'), 'application/json, text/plain');
    assert.equal(sanitized.has('x-forwarded-for'), false);
    assert.equal(incoming.get('x-forwarded-for'), '192.0.2.1, 192.0.2.2');
  });
});
