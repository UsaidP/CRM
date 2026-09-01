/**
 * Centralized End-User Feedback & Error Normalization Engine
 * 
 * Translates raw technical errors, HTTP status codes, network exceptions,
 * and database constraints into empathetic, plain-language, actionable messages
 * suitable for real estate operations teams (Brokers, Telecallers, Sales Agents, Admins).
 */

export interface UserMessage {
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: 'retry' | 'refresh' | 'login' | 'dismiss' | 'contact_admin';
}

/**
 * Common technical error signatures and their end-user translations
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  resolve: (errorStr: string, context?: string) => UserMessage;
}> = [
  // 1. Network & Connectivity
  {
    pattern: /failed to fetch|network\s*error|networkrequestfailed|fetch\s*failed|err_connection|econnrefused/i,
    resolve: () => ({
      title: 'Connection Issue',
      description: 'We could not reach the server. Please check your internet connection and try again.',
      actionLabel: 'Retry',
      actionType: 'retry',
    }),
  },
  // 2. Request Timeout / Abort
  {
    pattern: /aborterror|timeout|timed\s*out|etimedout/i,
    resolve: () => ({
      title: 'Request Timed Out',
      description: 'The operation took longer than expected to complete. Your records remain safe. Please try again.',
      actionLabel: 'Try Again',
      actionType: 'retry',
    }),
  },
  // 3. Unauthorized / Session Expired (401)
  {
    pattern: /unauthorized|401|invalid\s*token|jwt\s*expired|session\s*expired/i,
    resolve: () => ({
      title: 'Session Expired',
      description: 'Your session has expired for security. Please sign in again to continue.',
      actionLabel: 'Sign In',
      actionType: 'login',
    }),
  },
  // 4. Forbidden / Access Denied (403)
  {
    pattern: /forbidden|403|insufficient\s*permissions|access\s*denied|not\s*permitted/i,
    resolve: () => ({
      title: 'Access Restricted',
      description: 'You do not have administrative permission to perform this action. Please contact your team manager.',
      actionLabel: 'Contact Admin',
      actionType: 'contact_admin',
    }),
  },
  // 5. MahaRERA Verification
  {
    pattern: /rera|maharera|registration\s*number/i,
    resolve: () => ({
      title: 'MahaRERA Validation Notice',
      description: 'Unable to verify MahaRERA registration. Please ensure the RERA registration number follows the official format (e.g., P520000xxxxx).',
      actionLabel: 'Check RERA Number',
      actionType: 'dismiss',
    }),
  },
  // 6. WhatsApp & Communication Dispatch
  {
    pattern: /whatsapp|twilio|sms|telephony|call\s*log/i,
    resolve: () => ({
      title: 'Communication Dispatch Error',
      description: 'Could not send the message. Please ensure the client phone number includes the appropriate country code.',
      actionLabel: 'Check Phone Number',
      actionType: 'dismiss',
    }),
  },
  // 7. Brochure Extraction / OCR / File Uploads
  {
    pattern: /brochure|extraction|ocr|pdf\s*parsing|file\s*upload|unsupported\s*format/i,
    resolve: () => ({
      title: 'Document Processing Issue',
      description: 'We could not extract details from this file. Please verify it is a valid PDF or high-resolution image under the size limit.',
      actionLabel: 'Choose Another File',
      actionType: 'dismiss',
    }),
  },
  // 8. Duplicate / Unique Constraint (409)
  {
    pattern: /sqlite_constraint|unique\s*constraint|already\s*exists|duplicate|409/i,
    resolve: (_str, context) => ({
      title: 'Duplicate Entry',
      description: context
        ? `A ${context.toLowerCase()} with these matching details already exists in the system.`
        : 'A record with this phone number, email, or identifier already exists in the system.',
      actionLabel: 'Review Details',
      actionType: 'dismiss',
    }),
  },
  // 9. Not Found (404)
  {
    pattern: /not\s*found|404|does\s*not\s*exist|could\s*not\s*find/i,
    resolve: (_str, context) => ({
      title: context ? `${context} Not Found` : 'Record Not Found',
      description: 'The requested record or item could not be located. It may have been archived or removed.',
      actionLabel: 'Refresh List',
      actionType: 'refresh',
    }),
  },
  // 10. Validation / Required Fields (422 / 400)
  {
    pattern: /validation\s*failed|required\s*field|invalid\s*input|bad\s*request|422|400/i,
    resolve: (str, context) => {
      const cleanNote = str.replace(/bad\s*request|validation\s*error|error:?/gi, '').trim();
      return {
        title: context ? `Incomplete ${context}` : 'Please Check Required Fields',
        description: cleanNote.length > 5 && !cleanNote.includes('{') && !cleanNote.includes('SQL')
          ? cleanNote
          : 'Please complete all required fields correctly before submitting.',
        actionLabel: 'Review Form',
        actionType: 'dismiss',
      };
    },
  },
  // 11. Server / 500 Internal Errors
  {
    pattern: /internal\s*server\s*error|500|server\s*error|unexpected\s*error|crash|uncaught/i,
    resolve: () => ({
      title: 'Temporary Service Interruption',
      description: 'Our system encountered an unexpected hiccup. All saved data is preserved. Please try again in a moment.',
      actionLabel: 'Retry',
      actionType: 'retry',
    }),
  },
];

/**
 * Normalizes any error object, string, or API response into an End-User-First Message.
 */
export function toUserMessage(
  error: unknown,
  fallbackTitle: string = 'Operation Incomplete',
  fallbackDescription: string = 'The requested action could not be completed. Please try again.',
  context?: string
): UserMessage {
  if (!error) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
    };
  }

  let rawMessage = '';

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>;
    rawMessage = errObj.error || errObj.message || errObj.statusText || JSON.stringify(error);
  }

  // Remove code-like prefixes if present
  const cleaned = rawMessage
    .replace(/^Error:\s*/i, '')
    .replace(/^ApiError:\s*/i, '')
    .trim();

  // Match against known patterns
  for (const item of ERROR_PATTERNS) {
    if (typeof item.pattern === 'string') {
      if (cleaned.toLowerCase().includes(item.pattern.toLowerCase())) {
        return item.resolve(cleaned, context);
      }
    } else if (item.pattern.test(cleaned)) {
      return item.resolve(cleaned, context);
    }
  }

  // If the raw error is already friendly (i.e. short sentence without code syntax), use it
  const looksLikeTechnicalStack =
    cleaned.includes('at ') ||
    cleaned.includes('webpack') ||
    cleaned.includes('node_modules') ||
    cleaned.includes('SQLITE_') ||
    cleaned.includes('JSON.parse') ||
    cleaned.includes('TypeError') ||
    cleaned.includes('NullPointer') ||
    cleaned.length > 250;

  if (cleaned.length > 3 && !looksLikeTechnicalStack) {
    return {
      title: fallbackTitle,
      description: cleaned,
      actionLabel: 'Dismiss',
      actionType: 'dismiss',
    };
  }

  return {
    title: fallbackTitle,
    description: fallbackDescription,
    actionLabel: 'Retry',
    actionType: 'retry',
  };
}

/**
 * Shorthand helper for extracting user-friendly error description text
 */
export function getUserErrorMessage(
  error: unknown,
  fallback: string = 'Unable to complete this action. Please try again.',
  context?: string
): string {
  const msg = toUserMessage(error, 'Error', fallback, context);
  return msg.description;
}

/**
 * End-user success messages for real estate CRM domain actions
 */
export const USER_SUCCESS_PRESETS = {
  // Leads & Telecalling
  leadCreated: (name?: string) => ({
    title: 'Lead Saved',
    description: name ? `${name} has been added to your active pipeline.` : 'Lead added to pipeline successfully.',
  }),
  leadUpdated: (name?: string) => ({
    title: 'Lead Details Updated',
    description: name ? `Updated profile and preferences for ${name}.` : 'Lead records updated.',
  }),
  stageMoved: (name: string, stageLabel: string) => ({
    title: 'Lead Stage Updated',
    description: `Moved ${name} to "${stageLabel}".`,
  }),
  bulkStagesUpdated: (count: number, stageLabel: string) => ({
    title: 'Bulk Stage Update Complete',
    description: `Successfully moved ${count} selected lead${count > 1 ? 's' : ''} to "${stageLabel}".`,
  }),
  callLogged: (name?: string) => ({
    title: 'Call Record Saved',
    description: name ? `Disposition and remarks saved for ${name}.` : 'Call log saved successfully.',
  }),

  // Inventory & Media
  projectCreated: (projectName: string) => ({
    title: 'Project Registered',
    description: `${projectName} is now active in your real estate inventory.`,
  }),
  projectUpdated: (projectName: string) => ({
    title: 'Project Saved',
    description: `Specifications and unit inventory updated for ${projectName}.`,
  }),
  mediaUploaded: (count: number) => ({
    title: 'Media Vault Updated',
    description: `Successfully uploaded ${count} photo${count > 1 ? 's' : ''} and linked to the project inventory.`,
  }),
  brochureParsed: (extractedCount: number) => ({
    title: 'Brochure Processed',
    description: `Extracted ${extractedCount} floor plans, unit types, and project specifications.`,
  }),

  // Deals & Commission
  dealCreated: (clientName: string) => ({
    title: 'Deal Logged',
    description: `Deal file registered for ${clientName} and added to the deals ledger.`,
  }),
  dealAdvanced: (clientName: string, stageLabel: string) => ({
    title: 'Deal Advanced',
    description: `${clientName}'s deal has progressed to "${stageLabel}".`,
  }),
  commissionSplitSaved: () => ({
    title: 'Commission Splits Saved',
    description: 'Brokerage distribution rules and payout milestones recorded.',
  }),

  // Portals & Itineraries
  portalGenerated: (clientName: string) => ({
    title: 'Client Portal Ready',
    description: `Tokenized private presentation generated for ${clientName}. Link copied to clipboard.`,
  }),
  itineraryCreated: (clientName: string, siteCount: number) => ({
    title: 'Site Visit Itinerary Ready',
    description: `Curated WhatsApp route with ${siteCount} property stop${siteCount > 1 ? 's' : ''} prepared for ${clientName}.`,
  }),

  // Administration & Backup
  backupComplete: (recordCount: number) => ({
    title: 'Cloud Backup Complete',
    description: `Secure snapshot of ${recordCount} database records archived to Google Drive.`,
  }),
  permissionsSaved: (userName: string) => ({
    title: 'Permissions Saved',
    description: `Role and access settings updated for ${userName}.`,
  }),
};
