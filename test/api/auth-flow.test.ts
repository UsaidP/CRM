import { describe, it, expect, beforeAll } from 'bun:test';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { GET as sessionHandler } from '@/app/api/v1/auth/session/route';
import { POST as logoutHandler } from '@/app/api/v1/auth/logout/route';
import { ensureTestOrganization } from '../helpers/test-db';
import { PRESET_TEST_USERS, createTestSessionCookie, TEST_ORG_ID } from '../helpers/test-setup';
import { SESSION_COOKIE_NAME } from '@/lib/services/auth-service';

describe('API Integration: Auth Flow (/api/v1/auth/*)', () => {
  beforeAll(async () => {
    await ensureTestOrganization();
  }, 30000);

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid email and password, returning 200 and Set-Cookie', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: PRESET_TEST_USERS.agent.email,
          password: 'SafeTestPassword123!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.user.email).toBe(PRESET_TEST_USERS.agent.email);
      expect(body.user.role).toBe('AGENT');

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain(SESSION_COOKIE_NAME);
    });

    it('rejects invalid password with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: PRESET_TEST_USERS.agent.email,
          password: 'WrongPassword999!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('rejects non-existent email with generic 401 (prevents user enumeration)', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent.user@random-domain.com',
          password: 'AnyPassword123!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid email or password');
    });

    it('rejects missing credentials with 400 Bad Request', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears the session cookie on logout', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
      });

      const res = await logoutHandler();
      expect(res.status).toBe(200);
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    });
  });
});
