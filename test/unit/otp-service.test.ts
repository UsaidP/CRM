import { describe, it, expect, beforeEach } from 'bun:test';
import { prisma } from '@/lib/db/prisma';
import { sendOtp, verifyOtp, cleanupExpiredOtps } from '@/lib/services/otp-service';
import { normalizePhoneE164 } from '@/lib/domain/phone-normalizer';

const TEST_PHONE = '+919999988888';
const NON_EXISTENT_PHONE = '+919999977777';

describe('Phone Normalizer Helper for OTP', () => {
  it('normalizes 10-digit Indian mobile number to E.164', () => {
    expect(normalizePhoneE164('9820123456')).toBe('+919820123456');
    expect(normalizePhoneE164('+91 98201 23456')).toBe('+919820123456');
    expect(normalizePhoneE164('09820123456')).toBe('+919820123456');
  });

  it('preserves valid international numbers in E.164', () => {
    expect(normalizePhoneE164('+971501234567')).toBe('+971501234567');
    expect(normalizePhoneE164('+14155551234')).toBe('+14155551234');
  });

  it('returns null for invalid inputs', () => {
    expect(normalizePhoneE164('')).toBeNull();
    expect(normalizePhoneE164('invalid')).toBeNull();
    expect(normalizePhoneE164('123')).toBeNull();
  });
});

describe('OTP Service — Send & Verify Lifecycle', () => {
  beforeEach(async () => {
    // Clean up test phone records before each test
    await prisma.otpVerification.deleteMany({
      where: {
        phoneE164: { in: [TEST_PHONE, NON_EXISTENT_PHONE] },
      },
    });
  });

  it('generates, hashes and stores an OTP successfully', async () => {
    const sendResult = await sendOtp(TEST_PHONE, 'LOGIN');
    expect(sendResult.success).toBe(true);

    const record = await prisma.otpVerification.findFirst({
      where: { phoneE164: TEST_PHONE, purpose: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
    });

    expect(record).not.toBeNull();
    expect(record?.otpHash).toBeDefined();
    expect(record?.otpHash.length).toBe(64); // SHA-256 hex length
    expect(record?.verifiedAt).toBeNull();
    expect(record?.attempts).toBe(0);
    expect(record?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  }, 30000);

  it('enforces 30-second cooldown on consecutive sends to the same phone', async () => {
    const firstSend = await sendOtp(TEST_PHONE, 'LOGIN');
    expect(firstSend.success).toBe(true);

    // Immediate second send should hit cooldown
    const secondSend = await sendOtp(TEST_PHONE, 'LOGIN');
    expect(secondSend.success).toBe(false);
    expect(secondSend.error).toContain('wait');
    expect(secondSend.cooldownSeconds).toBeGreaterThan(0);
  }, 30000);

  it('rejects an incorrect OTP and increments attempt count', async () => {
    await sendOtp(TEST_PHONE, 'LOGIN');

    // Attempt verification with bogus OTP
    const verifyResult = await verifyOtp(TEST_PHONE, '000000', 'LOGIN');
    expect(verifyResult.success).toBe(false);
    expect(verifyResult.error).toContain('Invalid OTP');

    const record = await prisma.otpVerification.findFirst({
      where: { phoneE164: TEST_PHONE, purpose: 'LOGIN' },
    });
    expect(record?.attempts).toBe(1);
  }, 30000);

  it('locks out when OTP attempts reach max limit', async () => {
    await sendOtp(TEST_PHONE, 'LOGIN');

    // Fast-forward attempts count to 5
    await prisma.otpVerification.updateMany({
      where: { phoneE164: TEST_PHONE, purpose: 'LOGIN' },
      data: { attempts: 5 },
    });

    // Verification must be rejected for too many attempts
    const lockedOut = await verifyOtp(TEST_PHONE, '000000', 'LOGIN');
    expect(lockedOut.success).toBe(false);
    expect(lockedOut.error).toContain('Too many failed attempts');
  }, 30000);

  it('rejects when no active OTP exists for the phone number', async () => {
    const result = await verifyOtp(NON_EXISTENT_PHONE, '123456', 'LOGIN');
    expect(result.success).toBe(false);
    expect(result.error).toContain('OTP expired or not found');
  }, 30000);

  it('cleanupExpiredOtps removes expired and old verified OTPs without error', async () => {
    const cleaned = await cleanupExpiredOtps();
    expect(typeof cleaned).toBe('number');
  }, 30000);
});
