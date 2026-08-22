import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';

export interface BrokerResolutionResult {
  success: boolean;
  brokerId?: string;
  brokerName?: string;
  brokerEmail?: string;
  brokerPhoneE164?: string;
  whatsappPhoneNumberId?: string | null;
  displayName?: string;
  error?: string;
}

import { OFFICIAL_BROKER_NUMBERS } from '@/lib/constants/broker-constants';
export { OFFICIAL_BROKER_NUMBERS };

/**
 * Resolves broker ownership strictly from contacted inbound number or Meta WhatsApp Phone Number ID.
 * INVARIANT: Never falls back to round-robin or current user.
 */
export async function resolveBrokerByInboundIdentifier(
  identifier: string,
  organizationId?: string
): Promise<BrokerResolutionResult> {
  if (!identifier || identifier.trim() === '') {
    return {
      success: false,
      error: 'Inbound contacted identifier is missing. Cannot determine broker ownership without phone number or phone_number_id.',
    };
  }

  const raw = identifier.trim();

  // 1. Try matching by WhatsApp Phone Number ID directly
  let brokerPhoneRecord = await prisma.brokerPhoneNumber.findFirst({
    where: {
      whatsappPhoneNumberId: raw,
      active: true,
      ...(organizationId ? { organizationId } : {}),
    },
    include: { broker: true },
  });

  // 2. If not matched by Phone Number ID, try matching normalized E.164
  if (!brokerPhoneRecord) {
    const normalized = normalizeIndianPhone(raw);
    const targetE164 = normalized.isValid ? normalized.e164 : raw;

    brokerPhoneRecord = await prisma.brokerPhoneNumber.findFirst({
      where: {
        OR: [
          { e164: targetE164 },
          { e164: targetE164.replace(/^\+/, '') },
          { e164: targetE164.replace(/^\+91/, '') },
        ],
        active: true,
        ...(organizationId ? { organizationId } : {}),
      },
      include: { broker: true },
    });
  }

  // 3. Static fallback check against known official invariants if DB record pending
  if (!brokerPhoneRecord) {
    if (
      raw === OFFICIAL_BROKER_NUMBERS.SAFWAN.whatsappPhoneNumberId ||
      raw.includes(OFFICIAL_BROKER_NUMBERS.SAFWAN.cleanDigits) ||
      raw === OFFICIAL_BROKER_NUMBERS.SAFWAN.e164
    ) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: OFFICIAL_BROKER_NUMBERS.SAFWAN.email },
            { fullName: { contains: 'Safwan' } },
            { phoneE164: OFFICIAL_BROKER_NUMBERS.SAFWAN.e164 },
          ],
        },
      });

      if (user) {
        return {
          success: true,
          brokerId: user.id,
          brokerName: user.fullName,
          brokerEmail: user.email,
          brokerPhoneE164: OFFICIAL_BROKER_NUMBERS.SAFWAN.e164,
          whatsappPhoneNumberId: OFFICIAL_BROKER_NUMBERS.SAFWAN.whatsappPhoneNumberId,
          displayName: OFFICIAL_BROKER_NUMBERS.SAFWAN.displayName,
        };
      }
    } else if (
      raw === OFFICIAL_BROKER_NUMBERS.SUHEL.whatsappPhoneNumberId ||
      raw.includes(OFFICIAL_BROKER_NUMBERS.SUHEL.cleanDigits) ||
      raw === OFFICIAL_BROKER_NUMBERS.SUHEL.e164
    ) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: OFFICIAL_BROKER_NUMBERS.SUHEL.email },
            { fullName: { contains: 'Suhel' } },
            { phoneE164: OFFICIAL_BROKER_NUMBERS.SUHEL.e164 },
          ],
        },
      });

      if (user) {
        return {
          success: true,
          brokerId: user.id,
          brokerName: user.fullName,
          brokerEmail: user.email,
          brokerPhoneE164: OFFICIAL_BROKER_NUMBERS.SUHEL.e164,
          whatsappPhoneNumberId: OFFICIAL_BROKER_NUMBERS.SUHEL.whatsappPhoneNumberId,
          displayName: OFFICIAL_BROKER_NUMBERS.SUHEL.displayName,
        };
      }
    }

    return {
      success: false,
      error: `Unregistered inbound contacted number: "${raw}". Ownership could not be resolved to Safwan Diwan (+917977552011) or Suhel Patel (+919967731071).`,
    };
  }

  return {
    success: true,
    brokerId: brokerPhoneRecord.broker.id,
    brokerName: brokerPhoneRecord.broker.fullName,
    brokerEmail: brokerPhoneRecord.broker.email,
    brokerPhoneE164: brokerPhoneRecord.e164,
    whatsappPhoneNumberId: brokerPhoneRecord.whatsappPhoneNumberId,
    displayName: brokerPhoneRecord.displayName,
  };
}
