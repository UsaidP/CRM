/**
 * E.164 Phone Normalization & Validation Service for Indian Telecom (+91)
 * 
 * Rules:
 * - Standard E.164 format: +91 followed by 10 digits (e.g. +919820123456).
 * - Valid Indian mobile prefixes start with [6, 7, 8, 9].
 * - Handles leading zeros, spaces, hyphens, parentheses, and '+91' or '91' prefixes.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string;
  nationalFormat: string;
  rawInput: string;
  error?: string;
}

export function normalizeIndianPhone(input: string | number): PhoneValidationResult {
  if (!input) {
    return {
      isValid: false,
      e164: '',
      nationalFormat: '',
      rawInput: '',
      error: 'Phone number cannot be empty',
    };
  }

  const raw = String(input).trim();
  // Strip all non-numeric characters except leading '+'
  const digitsOnly = raw.replace(/\D/g, '');

  let tenDigitNumber = '';

  if (digitsOnly.length === 10) {
    tenDigitNumber = digitsOnly;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    tenDigitNumber = digitsOnly.substring(1);
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    tenDigitNumber = digitsOnly.substring(2);
  } else if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
    tenDigitNumber = digitsOnly.substring(3);
  } else {
    return {
      isValid: false,
      e164: '',
      nationalFormat: '',
      rawInput: raw,
      error: `Invalid phone length (${digitsOnly.length} digits). Expected 10-digit Indian mobile number.`,
    };
  }

  // Validate Indian mobile starting digit: 6, 7, 8, or 9
  const firstDigit = tenDigitNumber.charAt(0);
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return {
      isValid: false,
      e164: '',
      nationalFormat: '',
      rawInput: raw,
      error: `Invalid Indian mobile starting digit '${firstDigit}'. Must begin with 6, 7, 8, or 9.`,
    };
  }

  const e164 = `+91${tenDigitNumber}`;
  const nationalFormat = `${tenDigitNumber.slice(0, 5)} ${tenDigitNumber.slice(5)}`;

  return {
    isValid: true,
    e164,
    nationalFormat,
    rawInput: raw,
  };
}
