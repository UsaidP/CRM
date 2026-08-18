/**
 * Multi-Project Site Visit Itinerary Dispatcher Service
 */

export interface ItineraryStopInput {
  unitId: string;
  projectName: string;
  microMarket: string;
  unitNumber?: string | null;
  bhk: number;
  expectedTime: string; // e.g. "11:00 AM"
  developerPocName?: string | null;
  developerPocPhone?: string | null;
  googleMapsQuery: string;
}

export interface SiteVisitScheduleInput {
  leadName: string;
  leadPhone: string;
  scheduledDateFormatted: string; // e.g. "Saturday, 22 Aug 2026"
  timeSlot: string;               // e.g. "11:00 AM"
  pickupLocation: string;         // e.g. "Kharghar Railway Station (East)"
  cabDetails?: string;            // e.g. "Ertiga MH-46-AZ-1234 (Driver: Ramesh 9820011223)"
  assignedBrokerName: string;
  assignedBrokerPhone: string;
  stops: ItineraryStopInput[];
}

export function buildWhatsAppSiteVisitItinerary(params: SiteVisitScheduleInput): string {
  const {
    leadName,
    scheduledDateFormatted,
    pickupLocation,
    cabDetails,
    assignedBrokerName,
    assignedBrokerPhone,
    stops,
  } = params;

  let message = `🚗 *ZamZam Properties • Confirmed Physical Site Visit Itinerary*\n\n`;
  message += `Hello ${leadName}! 😊 Your physical property inspection tour is confirmed for *${scheduledDateFormatted}*.\n\n`;
  message += `📍 *Pickup Point*: ${pickupLocation}\n`;
  if (cabDetails) {
    message += `🚕 *Cab Coordination*: ${cabDetails}\n`;
  }
  message += `👤 *Your ZamZam Property Advisor*: ${assignedBrokerName} (${assignedBrokerPhone})\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *SCHEDULED TOUR ITINERARY (${stops.length} Projects)*:\n\n`;

  stops.forEach((stop, index) => {
    message += `*Stop ${index + 1}: ${stop.expectedTime}*\n`;
    message += `🏢 *${stop.projectName}* (${stop.bhk} BHK • Unit ${stop.unitNumber || 'Sample'})\n`;
    message += `📍 Location: ${stop.microMarket}\n`;
    if (stop.developerPocName) {
      message += `🤝 Site Manager: ${stop.developerPocName} (${stop.developerPocPhone || ''})\n`;
    }
    message += `🗺️ Google Maps: https://maps.google.com/?q=${encodeURIComponent(stop.googleMapsQuery || stop.projectName + ' ' + stop.microMarket)}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💡 *What to Expect*:\n`;
  message += `✅ Direct access to actual sample units & carpet area verification\n`;
  message += `✅ On-spot developer inventory availability & discount negotiation\n`;
  message += `✅ Complimentary refreshments & safe transit\n\n`;
  message += `See you on Saturday! Let us know if you need to adjust the pickup timing.`;

  return message;
}
