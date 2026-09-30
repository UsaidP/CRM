import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/services/api-auth';
import { dispatchDailyCallDigest, generateDailyCallDigestData, formatDailyCallDigestWhatsApp } from '@/lib/services/whatsapp-digest-service';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request, session: any): boolean {
  // 1. Authorized if user is logged into CRM with valid session
  if (session && session.organizationId) return true;

  // 2. Authorized if bearer matches CRON_SECRET
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // 3. Authorized if Vercel Cron header is verified
  const vercelCron = req.headers.get('x-vercel-cron');
  if (vercelCron && (!cronSecret || authHeader === `Bearer ${cronSecret}`)) return true;

  // 4. In development mode with insecure webhook bypass
  if (process.env.ALLOW_INSECURE_WEBHOOKS === '1' || process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

/**
 * GET: Preview or Vercel Cron invocation
 */
export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!isAuthorized(req, session)) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron/digest access' }, { status: 401 });
    }

    const orgId = session?.organizationId;
    const digestData = await generateDailyCallDigestData(orgId);
    const digestText = formatDailyCallDigestWhatsApp(digestData);

    return NextResponse.json({
      success: true,
      preview: true,
      digestData,
      digestText,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to preview daily call digest');
  }
}

/**
 * POST: Dispatch WhatsApp Daily Digest to managers
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!isAuthorized(req, session)) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron/digest access' }, { status: 401 });
    }

    let targetPhones: string[] | undefined = undefined;
    let targetDate: Date | undefined = undefined;

    try {
      const body = await req.json();
      if (Array.isArray(body.targetPhones)) targetPhones = body.targetPhones;
      if (body.date) targetDate = new Date(body.date);
    } catch {
      // Body is optional
    }

    const orgId = session?.organizationId;
    const dispatchResult = await dispatchDailyCallDigest({
      orgId,
      targetPhones,
      targetDate,
    });

    return NextResponse.json({
      success: dispatchResult.success,
      message: dispatchResult.success
        ? `Daily call digest successfully dispatched to ${dispatchResult.recipients.length} manager line(s)`
        : 'Daily call digest encountered dispatch warnings',
      recipients: dispatchResult.recipients,
      digestText: dispatchResult.digestText,
      results: dispatchResult.results,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to dispatch daily call digest');
  }
}
