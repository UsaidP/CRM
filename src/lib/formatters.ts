/**
 * Common formatting helpers across CRM UI components.
 */

/**
 * Format numbers as Indian Rupee (INR) currency strings.
 * Examples:
 *   15000000 -> ₹1.50 Cr
 *   4500000  -> ₹45.00 Lakh
 *   25000    -> ₹25,000
 */
export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Number(val).toLocaleString('en-IN')}`;
}
