import { prisma } from '@/lib/db/prisma';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/constants/broker-constants';
import {
  computeRepCallPerformance,
  computeCallAnalyticsOverall,
  formatCallDuration,
  type CallLogItem,
  type RepCallPerformance,
  type CallAnalyticsOverall,
} from '@/lib/domain/call-analytics-engine';

export interface TopLeadCallSummary {
  leadName: string;
  leadPhone: string;
  repName: string;
  durationSeconds: number;
  callOutcome: string;
  aiSummary: string;
  requirementSummary?: string;
}

export interface DailyDigestData {
  dateFormatted: string;
  overall: CallAnalyticsOverall;
  reps: RepCallPerformance[];
  topLeads: TopLeadCallSummary[];
  generatedAt: string;
}

/**
 * Returns date range for "today" in IST (UTC+5:30)
 */
export function getIstDayRange(targetDate: Date = new Date()): { startOfDay: Date; endOfDay: Date; dateFormatted: string } {
  // IST offset is +330 minutes (+5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(targetDate.getTime() + istOffsetMs);

  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const day = istNow.getUTCDate();

  // Start of day in IST converted to UTC
  const startOfDay = new Date(Date.UTC(year, month, day) - istOffsetMs);
  // End of day in IST converted to UTC
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - istOffsetMs);

  const dateFormatted = istNow.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return { startOfDay, endOfDay, dateFormatted };
}

/**
 * Aggregates call intelligence from the database for the daily WhatsApp digest
 */
export async function generateDailyCallDigestData(
  orgId?: string,
  targetDate: Date = new Date()
): Promise<DailyDigestData> {
  const { startOfDay, endOfDay, dateFormatted } = getIstDayRange(targetDate);

  // Where filter for today's physical SIM calls
  const whereFilter: any = {
    channel: 'PHONE_CALL',
    createdAt: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };

  if (orgId) {
    whereFilter.lead = { organizationId: orgId };
  }

  // Fetch calls with lead, assigned broker, and requirements
  const logs = await prisma.communicationLog.findMany({
    where: whereFilter,
    include: {
      lead: {
        include: {
          assignedBroker: true,
          requirements: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch active users to compute rep rankings
  const users = await prisma.user.findMany({
    where: orgId ? { organizationId: orgId, isActive: true } : { isActive: true },
    select: { id: true, fullName: true, role: true, email: true },
  });

  // Map to CallLogItem domain objects
  const callItems: CallLogItem[] = logs.map((log) => {
    let brokerName = log.lead?.assignedBroker?.fullName;
    let brokerPhone = null;

    if (log.metadataJson) {
      try {
        const meta = JSON.parse(log.metadataJson);
        if (!brokerName && meta.brokerAssigned) brokerName = meta.brokerAssigned;
        if (meta.contactedBrokerNumber) brokerPhone = meta.contactedBrokerNumber;
      } catch {
        // ignore
      }
    }

    return {
      id: log.id,
      leadId: log.leadId,
      leadName: log.lead?.fullName,
      leadPhone: log.lead?.phoneE164,
      channel: log.channel,
      direction: log.direction,
      callDurationSeconds: log.callDurationSeconds,
      callOutcome: log.callOutcome,
      aiSummary: log.aiSummary,
      aiSentiment: log.aiSentiment,
      transcriptText: log.transcriptText,
      callRecordingUrl: log.callRecordingUrl,
      clientCallId: log.clientCallId,
      assignedBrokerId: log.lead?.assignedBrokerId,
      assignedBrokerName: brokerName,
      assignedBrokerPhone: brokerPhone,
      createdAt: log.createdAt,
      metadataJson: log.metadataJson,
    };
  });

  const reps = computeRepCallPerformance(users, callItems);
  const overall = computeCallAnalyticsOverall(callItems);

  // Extract top high-intent leads from today's calls
  const topLeads: TopLeadCallSummary[] = logs
    .filter((l) => {
      const outcome = (l.callOutcome || '').toUpperCase();
      return (
        outcome.includes('INTERESTED') ||
        outcome.includes('CALLBACK') ||
        (l.aiSentiment === 'POSITIVE' && l.callDurationSeconds > 30)
      );
    })
    .slice(0, 5)
    .map((l) => {
      const req = l.lead?.requirements?.[0];
      let reqSummary = '';
      if (req) {
        let bhks = '';
        try {
          bhks = JSON.parse(req.bhkPreferencesJson).join('/') + ' BHK';
        } catch {
          bhks = 'Apartment';
        }
        reqSummary = `${bhks} in Navi Mumbai (Budget: ₹${(req.budgetMax / 100000).toFixed(0)}L)`;
      }

      return {
        leadName: l.lead?.fullName || 'Prospect',
        leadPhone: l.lead?.phoneE164 || 'Phone unavailable',
        repName: l.lead?.assignedBroker?.fullName || 'Sales Advisor',
        durationSeconds: l.callDurationSeconds,
        callOutcome: l.callOutcome || 'INTERESTED',
        aiSummary: l.aiSummary || l.messageContent || 'Call logged with interest.',
        requirementSummary: reqSummary,
      };
    });

  return {
    dateFormatted,
    overall,
    reps,
    topLeads,
    generatedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Builds the formatted WhatsApp message for daily executive reporting
 */
export function formatDailyCallDigestWhatsApp(digest: DailyDigestData): string {
  const { dateFormatted, overall, reps, topLeads, generatedAt } = digest;

  const totalCalls = overall.totalCalls;
  const connected = overall.connectedCalls;
  const connRate = overall.connectionRatePercent;
  const talkTime = overall.formattedDuration;

  let msg = `📊 *Lucky CRM Daily Call Intelligence Report*\n`;
  msg += `📅 *Date:* ${dateFormatted} | *Time:* ${generatedAt} IST\n\n`;

  msg += `📈 *Company Call Summary:*\n`;
  msg += `• Total Calls: *${totalCalls}* (${connected} Connected • *${connRate}%* rate)\n`;
  msg += `• Total Talk Time: *${talkTime}*\n`;
  msg += `• Avg Connected Duration: *${formatCallDuration(overall.averageDurationSeconds)}*\n\n`;

  // Representative ranking breakdown
  msg += `👥 *Sales Rep Leaderboard:*\n`;
  const activeReps = reps.filter((r) => r.totalCalls > 0);

  if (activeReps.length === 0) {
    msg += `_No broker calls recorded today._\n\n`;
  } else {
    activeReps.forEach((r, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤';
      msg += `${medal} *${r.fullName}* (${r.role})\n`;
      msg += `   • Calls: *${r.totalCalls}* (${r.connectedCalls} connected • ${r.formattedDuration})\n`;
      msg += `   • Hot Leads: *${r.interestedCount} Interested*, *${r.callbackCount} Callbacks*\n`;
    });
    msg += `\n`;
  }

  // Top High-Intent Leads section
  if (topLeads.length > 0) {
    msg += `🔥 *High-Intent Leads Handled Today:*\n`;
    topLeads.forEach((lead, i) => {
      msg += `*${i + 1}. ${lead.leadName}* (${lead.leadPhone})\n`;
      if (lead.requirementSummary) {
        msg += `   • Req: ${lead.requirementSummary}\n`;
      }
      msg += `   • Advisor: ${lead.repName} (${formatCallDuration(lead.durationSeconds)})\n`;
      if (lead.aiSummary) {
        const cleanSummary = lead.aiSummary.length > 100 ? `${lead.aiSummary.slice(0, 97)}...` : lead.aiSummary;
        msg += `   • AI Note: _"${cleanSummary}"_\n`;
      }
      msg += `\n`;
    });
  }

  msg += `💡 *Action Item:* Review scheduled callbacks and ensure follow-up reminders are completed in Lucky CRM.\n`;
  msg += `🔗 ${process.env.NEXT_PUBLIC_APP_URL || 'https://lucky-crm.vercel.app'}/admin/companion`;

  return msg;
}

/**
 * Sends a WhatsApp message via Meta Cloud API, or falls back to simulation mode
 */
export async function sendWhatsAppMessage(
  toPhone: string,
  messageText: string,
  options?: { phoneNumberId?: string; accessToken?: string }
): Promise<{ success: boolean; mode: 'LIVE' | 'SIMULATED'; providerMessageId?: string; error?: string }> {
  const accessToken = options?.accessToken || process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId =
    options?.phoneNumberId ||
    process.env.META_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    OFFICIAL_BROKER_NUMBERS.SAFWAN.whatsappPhoneNumberId;

  // Clean the recipient phone to numeric digits
  const cleanTo = toPhone.replace(/\D/g, '');

  if (accessToken && phoneNumberId && !phoneNumberId.startsWith('phone_num_id_safwan')) {
    try {
      const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: { preview_url: false, body: messageText },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[WhatsApp Cloud API Error]', data);
        return {
          success: false,
          mode: 'LIVE',
          error: data?.error?.message || 'Meta Cloud API call failed',
        };
      }

      const providerMessageId = data.messages?.[0]?.id;
      return { success: true, mode: 'LIVE', providerMessageId };
    } catch (err: any) {
      console.error('[WhatsApp Network Error]', err);
      return { success: false, mode: 'LIVE', error: err.message };
    }
  }

  // Simulated / Development Mode (when live Meta credentials are not configured)
  console.log(`[WhatsApp Daily Digest - SIMULATED DISPATCH] To: ${toPhone}\n${messageText}`);

  try {
    // Record in webhook event inbox for auditing
    await prisma.webhookEventInbox.create({
      data: {
        eventSource: 'WHATSAPP_CLOUD',
        idempotencyKey: `digest_${cleanTo}_${Date.now()}`,
        payloadJson: JSON.stringify({
          to: cleanTo,
          message: messageText,
          simulated: true,
          timestamp: new Date().toISOString(),
        }),
        status: 'PROCESSED',
      },
    });
  } catch {
    // ignore inbox write error
  }

  return {
    success: true,
    mode: 'SIMULATED',
    providerMessageId: `sim_msg_${Date.now()}`,
  };
}

/**
 * End-to-end dispatch function for the Daily Call Intelligence Digest
 */
export async function dispatchDailyCallDigest(options?: {
  orgId?: string;
  targetPhones?: string[];
  targetDate?: Date;
}): Promise<{
  success: boolean;
  recipients: string[];
  digestText: string;
  digestData: DailyDigestData;
  results: Array<{ phone: string; success: boolean; mode: string; error?: string }>;
}> {
  const digestData = await generateDailyCallDigestData(options?.orgId, options?.targetDate);
  const digestText = formatDailyCallDigestWhatsApp(digestData);

  // Target recipients: user-provided list or both official broker numbers
  const defaultRecipients = [
    OFFICIAL_BROKER_NUMBERS.SAFWAN.e164,
    OFFICIAL_BROKER_NUMBERS.SUHEL.e164,
  ];

  const recipients = (options?.targetPhones && options.targetPhones.length > 0)
    ? options.targetPhones
    : defaultRecipients;

  const results: Array<{ phone: string; success: boolean; mode: string; error?: string }> = [];

  for (const phone of recipients) {
    const res = await sendWhatsAppMessage(phone, digestText);
    results.push({
      phone,
      success: res.success,
      mode: res.mode,
      error: res.error,
    });
  }

  const anySuccess = results.some((r) => r.success);

  return {
    success: anySuccess,
    recipients,
    digestText,
    digestData,
    results,
  };
}
