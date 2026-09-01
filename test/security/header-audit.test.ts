import { describe, it, expect } from 'bun:test';
import nextConfig from '../../next.config.js';

describe('Security: HTTP Headers & OWASP Defense Audit', () => {
  it('next.config.js specifies all mandatory OWASP security headers', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const headerRules = await nextConfig.headers();
    expect(Array.isArray(headerRules)).toBe(true);

    const rootRule = headerRules.find((r: any) => r.source === '/(.*)');
    expect(rootRule).toBeDefined();

    const headersMap = new Map(rootRule.headers.map((h: any) => [h.key, h.value]));

    // 1. Strict Transport Security (HSTS)
    expect(headersMap.has('Strict-Transport-Security')).toBe(true);
    expect(headersMap.get('Strict-Transport-Security')).toContain('max-age=63072000');

    // 2. Clickjacking Protection (X-Frame-Options)
    expect(headersMap.has('X-Frame-Options')).toBe(true);
    expect(headersMap.get('X-Frame-Options')).toBe('SAMEORIGIN');

    // 3. MIME Sniffing Prevention (X-Content-Type-Options)
    expect(headersMap.has('X-Content-Type-Options')).toBe(true);
    expect(headersMap.get('X-Content-Type-Options')).toBe('nosniff');

    // 4. XSS Protection
    expect(headersMap.has('X-XSS-Protection')).toBe(true);

    // 5. Referrer Policy
    expect(headersMap.has('Referrer-Policy')).toBe(true);
    expect(headersMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    // 6. Permissions Policy
    expect(headersMap.has('Permissions-Policy')).toBe(true);
  });

  it('poweredByHeader is disabled to prevent technology fingerprinting', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
