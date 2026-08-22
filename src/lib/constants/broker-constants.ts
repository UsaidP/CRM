/**
 * Client-Safe Broker Constants and Messaging Window Utilities
 * (No Prisma or Node.js server dependencies - completely safe for React Client Components)
 */

export const OFFICIAL_BROKER_NUMBERS = {
  SAFWAN: {
    fullName: 'Safwan Diwan',
    email: 'safwan@zamzamproperties.in',
    e164: '+917977552011',
    cleanDigits: '7977552011',
    whatsappPhoneNumberId: 'phone_num_id_safwan_7977552011',
    displayName: 'Safwan Diwan (Senior Broker & Commercial Specialist)',
  },
  SUHEL: {
    fullName: 'Suhel Patel',
    email: 'suhel@zamzamproperties.in',
    e164: '+919967731071',
    cleanDigits: '9967731071',
    whatsappPhoneNumberId: 'phone_num_id_suhel_9967731071',
    displayName: 'Suhel Patel (Senior Broker & Residential Lead)',
  },
} as const;

export function evaluate24HourMessagingWindow(lastInboundMessageAt?: Date | string | null): {
  isOpen: boolean;
  hoursRemaining: number;
  requiresApprovedTemplate: boolean;
  windowLabel: string;
} {
  if (!lastInboundMessageAt) {
    return {
      isOpen: false,
      hoursRemaining: 0,
      requiresApprovedTemplate: true,
      windowLabel: 'Window Closed (Template Required)',
    };
  }

  const lastTime = new Date(lastInboundMessageAt).getTime();
  const now = Date.now();
  const elapsedHours = (now - lastTime) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, 24 - elapsedHours);

  const isOpen = hoursRemaining > 0;

  return {
    isOpen,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    requiresApprovedTemplate: !isOpen,
    windowLabel: isOpen
      ? `🟢 24h Window Open (${hoursRemaining.toFixed(1)} hrs left)`
      : '🔴 24h Window Expired (Meta Template Required)',
  };
}
