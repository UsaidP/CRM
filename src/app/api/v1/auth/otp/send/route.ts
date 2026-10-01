import { NextResponse } from 'next/server';
import { sendOtp } from '@/lib/services/otp-service';
import { normalizePhoneE164 } from '@/lib/domain/phone-normalizer';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/auth/otp/send
 *
 * Sends a 6-digit OTP to the provided phone number.
 * Rate limited: 3 OTP sends per IP per 5 minutes.
 *
 * Request body: { phone: "+917977552011" }
 * Response:     { success: true } or { success: false, error: "..." }
 */
export async function POST(req: Request) {
  try {
    // 1. Rate limit by IP — 3 OTP sends per 5 minutes (opt-in relaxed rate limit only for dev testing)
    const isRelaxed = process.env.NODE_ENV !== 'production' && process.env.OTP_RELAXED_RATE_LIMIT === 'true';
    const maxAttempts = isRelaxed ? 30 : 3;
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`otp-send:${clientIp}`, maxAttempts, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSec);
    }

    const body = await req.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // 2. Normalize phone number to E.164
    const phoneE164 = normalizePhoneE164(phone);
    if (!phoneE164) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number. Please include country code (e.g. +91...).' },
        { status: 400 }
      );
    }

    // 3. Also rate limit by phone number
    const phoneRateLimit = checkRateLimit(`otp-send:${phoneE164}`, maxAttempts, 5 * 60 * 1000);
    if (!phoneRateLimit.allowed) {
      return rateLimitResponse(phoneRateLimit.retryAfterSec);
    }

    // 4. Send OTP
    const result = await sendOtp(phoneE164, 'LOGIN');

    if (!result.success) {
      const status = result.cooldownSeconds ? 429 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          ...(result.cooldownSeconds && { cooldownSeconds: result.cooldownSeconds }),
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error: any) {
    console.error('[AUTH] OTP send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
