import { describe, it, expect } from 'bun:test';
import { POST as sendOtpRoute } from '@/app/api/v1/auth/otp/send/route';
import { POST as verifyOtpRoute } from '@/app/api/v1/auth/otp/verify/route';

describe('OTP Auth API Routes Invariants', () => {
  describe('POST /api/v1/auth/otp/send', () => {
    it('returns 400 if phone is missing', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({}),
      });

      const res = await sendOtpRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Phone number is required');
    });

    it('returns 400 if phone number is invalid format', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ phone: '123' }),
      });

      const res = await sendOtpRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid phone number');
    });
  });

  describe('POST /api/v1/auth/otp/verify', () => {
    it('returns 400 if phone is missing', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ otp: '123456' }),
      });

      const res = await verifyOtpRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Phone number is required');
    });

    it('returns 400 if OTP is not a 6-digit number', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ phone: '+919820123456', otp: '123' }),
      });

      const res = await verifyOtpRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('valid 6-digit OTP');
    });

    it('returns 401 if OTP does not match or is expired', async () => {
      const req = new Request('http://localhost:3000/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: JSON.stringify({ phone: '+919999977777', otp: '999999' }),
      });

      const res = await verifyOtpRoute(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });
});
