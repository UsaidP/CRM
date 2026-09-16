import { describe, it, expect } from 'bun:test';
import { handleApiError, ApiError } from '@/lib/services/api-handler';
import { getClientIp, checkRateLimit } from '@/lib/security/rate-limiter';
import { generatePortalToken } from '@/lib/domain/portal-generator';

describe('Security Fix 4: Centralized Error Handler & Safe Allowlist', () => {
  it('suppresses internal error details in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const internalError = new Error('PrismaClientKnownRequestError: Table leads does not exist at ...');
      const response = handleApiError(internalError, 'Failed to fetch leads');
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to fetch leads');
      expect(body.error).not.toContain('Prisma');
      expect(body.error).not.toContain('does not exist');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('converts SyntaxError to 400 Bad Request with clean message', async () => {
    const syntaxErr = new SyntaxError('Unexpected token } in JSON at position 42');
    const response = handleApiError(syntaxErr, 'An error occurred');
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Request body must be valid JSON');
  });

  it('preserves intentional ApiError status and message', async () => {
    const notFound = new ApiError('Resource with id 123 was not found', 404);
    const response = handleApiError(notFound);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Resource with id 123 was not found');
  });
});

describe('Security Fix 5: Edge IP Resolution & Header Precedence', () => {
  it('prioritizes x-real-ip over spoofed x-forwarded-for', () => {
    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-real-ip': '203.0.113.195',
        'x-forwarded-for': '198.51.100.1, 198.51.100.2',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.195');
  });

  it('prioritizes cf-connecting-ip over x-forwarded-for', () => {
    const req = new Request('http://localhost/api/test', {
      headers: {
        'cf-connecting-ip': '198.51.100.42',
        'x-forwarded-for': '192.168.1.1',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('198.51.100.42');
  });

  it('falls back to 127.0.0.1 when no edge IP headers exist', () => {
    const req = new Request('http://localhost/api/test');
    const ip = getClientIp(req);
    expect(ip).toBe('127.0.0.1');
  });
});

describe('Security Fix 6: Campaign Track Rate Limiting', () => {
  it('blocks excessive clicks from the same IP when rate limit exceeded', () => {
    const testIp = '198.51.100.99';
    // Consume rate limit allowance (10 allowed per minute)
    for (let i = 0; i < 10; i++) {
      const res = checkRateLimit(`track:${testIp}`, 10, 60000);
      expect(res.allowed).toBe(true);
    }
    // 11th request must be rejected
    const blocked = checkRateLimit(`track:${testIp}`, 10, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe('Security Fix 7: Cryptographic Entropy for Portal Tokens', () => {
  it('generates 16-hex-character cryptographically secure tokens with zero collisions', () => {
    const tokens = new Set<string>();
    const count = 500;

    for (let i = 0; i < count; i++) {
      const token = generatePortalToken();
      expect(token).toMatch(/^client-options-[0-9a-f]{16}$/);
      tokens.add(token);
    }

    // Every token generated must be unique
    expect(tokens.size).toBe(count);
  });
});
