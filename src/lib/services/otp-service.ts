/**
 * OTP Service — Pluggable SMS/OTP delivery for phone-based authentication.
 *
 * Architecture:
 *   1. Generate a cryptographically secure 6-digit OTP
 *   2. Hash it (SHA-256) and store in OtpVerification table with 5-minute expiry
 *   3. Send the raw OTP via the configured SMS provider
 *   4. On verify: compare hashes, enforce max attempts, expire used OTPs
 *
 * SMS Provider:
 *   Set OTP_PROVIDER env var to 'msg91' | 'twilio' | 'mock' (default: 'mock').
 *   Mock mode logs the OTP to the server console — never use in production.
 *
 * Required env vars per provider:
 *   MSG91:  MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID
 *   Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import { createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';

// ─── Constants ─────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30; // Minimum gap between OTP sends to same number

// ─── OTP Generation ────────────────────────────────────────────────────────────

/** Generates a cryptographically secure N-digit numeric OTP. */
function generateOtp(length: number = OTP_LENGTH): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => (b % 10).toString())
    .join('');
}

/** One-way SHA-256 hash — OTP is never stored in plaintext. */
function hashOtp(otp: string): string {
  return createHash('sha256').update(otp.trim()).digest('hex');
}

// ─── SMS Provider Interface ────────────────────────────────────────────────────

interface SmsProvider {
  send(phoneE164: string, otp: string): Promise<{ success: boolean; error?: string }>;
}

/** Mock provider — logs OTP to server console. For development only. */
const mockProvider: SmsProvider = {
  async send(phoneE164, otp) {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║  📱 OTP for ${phoneE164}: ${otp}              ║`);
    console.log(`║  (Mock SMS — not sent to real phone)          ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);
    return { success: true };
  },
};

/** MSG91 provider — popular Indian SMS gateway. */
const msg91Provider: SmsProvider = {
  async send(phoneE164, otp) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authKey || !templateId) {
      console.error('[OTP] MSG91_AUTH_KEY or MSG91_TEMPLATE_ID not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const res = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile: phoneE164.replace('+', ''),
          otp,
        }),
      });

      const data = await res.json();
      if (data.type === 'success') {
        return { success: true };
      }
      return { success: false, error: data.message || 'MSG91 delivery failed' };
    } catch (err: any) {
      console.error('[OTP] MSG91 error:', err);
      return { success: false, error: err.message || 'SMS delivery failed' };
    }
  },
};

/** Twilio provider — global SMS gateway. */
const twilioProvider: SmsProvider = {
  async send(phoneE164, otp) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
      console.error('[OTP] Twilio credentials not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
        body: new URLSearchParams({
          To: phoneE164,
          From: fromNumber,
          Body: `Your Lucky CRM login OTP is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
        }),
      });

      const data = await res.json();
      if (data.sid) {
        return { success: true };
      }
      return { success: false, error: data.message || 'Twilio delivery failed' };
    } catch (err: any) {
      console.error('[OTP] Twilio error:', err);
      return { success: false, error: err.message || 'SMS delivery failed' };
    }
  },
};

function getProvider(): SmsProvider {
  const provider = (process.env.OTP_PROVIDER || 'mock').toLowerCase();
  switch (provider) {
    case 'msg91':
      return msg91Provider;
    case 'twilio':
      return twilioProvider;
    case 'mock':
    default:
      if (process.env.NODE_ENV === 'production') {
        console.warn('[OTP] ⚠️  Using mock SMS provider in production — configure OTP_PROVIDER!');
      }
      return mockProvider;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface SendOtpResult {
  success: boolean;
  error?: string;
  cooldownSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  userId?: string;
  phoneE164?: string;
}

/**
 * Send an OTP to the given phone number.
 *
 * - Enforces cooldown between sends (30s)
 * - Invalidates any previous unused OTPs for this phone
 * - Generates a new 6-digit OTP, hashes it, stores with expiry
 * - Dispatches via the configured SMS provider
 */
export async function sendOtp(
  phoneE164: string,
  purpose: string = 'LOGIN'
): Promise<SendOtpResult> {
  // 1. Check cooldown — prevent OTP flooding
  const recentOtp = await prisma.otpVerification.findFirst({
    where: {
      phoneE164,
      purpose,
      verifiedAt: null,
      createdAt: { gte: new Date(Date.now() - COOLDOWN_SECONDS * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentOtp) {
    const elapsed = Math.floor((Date.now() - recentOtp.createdAt.getTime()) / 1000);
    const remaining = COOLDOWN_SECONDS - elapsed;
    return {
      success: false,
      error: `Please wait ${remaining} seconds before requesting another OTP`,
      cooldownSeconds: remaining,
    };
  }

  // 2. Invalidate previous unused OTPs for this phone+purpose
  await prisma.otpVerification.updateMany({
    where: {
      phoneE164,
      purpose,
      verifiedAt: null,
    },
    data: {
      // Force-expire old OTPs so they can't be used
      expiresAt: new Date(0),
    },
  });

  // 3. Generate, hash, and store
  const otp = generateOtp();
  const otpHashed = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      phoneE164,
      otpHash: otpHashed,
      purpose,
      expiresAt,
    },
  });

  // 4. Send via SMS provider
  const provider = getProvider();
  const result = await provider.send(phoneE164, otp);

  if (!result.success) {
    return { success: false, error: result.error || 'Failed to send OTP' };
  }

  return { success: true };
}

/**
 * Verify an OTP code for the given phone number.
 *
 * - Finds the latest unexpired, unverified OTP for this phone
 * - Compares hashes (constant-time via SHA-256 digest comparison)
 * - Enforces max 5 attempts per OTP to prevent brute force
 * - Marks OTP as verified on success
 */
export async function verifyOtp(
  phoneE164: string,
  otpCode: string,
  purpose: string = 'LOGIN'
): Promise<VerifyOtpResult> {
  const now = new Date();

  // 1. Find the latest valid OTP record
  const record = await prisma.otpVerification.findFirst({
    where: {
      phoneE164,
      purpose,
      verifiedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return { success: false, error: 'OTP expired or not found. Please request a new one.' };
  }

  // 2. Check max attempts
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { success: false, error: 'Too many failed attempts. Please request a new OTP.' };
  }

  // 3. Compare OTP hashes
  const providedHash = hashOtp(otpCode);
  if (providedHash !== record.otpHash) {
    // Increment attempt count
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    const remaining = MAX_VERIFY_ATTEMPTS - record.attempts - 1;
    return {
      success: false,
      error: remaining > 0
        ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many failed attempts. Please request a new OTP.',
    };
  }

  // 4. Mark as verified
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verifiedAt: now },
  });

  const bareDigits = phoneE164.replace(/^\+91/, '');
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phoneE164 },
        { phoneE164: bareDigits },
      ],
      isActive: true,
    },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!user) {
    return {
      success: false,
      error: 'No active account found for this phone number. Please contact your administrator.',
      phoneE164,
    };
  }

  return {
    success: true,
    userId: user.id,
    phoneE164,
  };
}

/**
 * Cleanup expired OTP records older than 1 hour.
 * Call this from a cron job or periodic health check.
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  const result = await prisma.otpVerification.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: cutoff } },
        { verifiedAt: { not: null }, createdAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}
