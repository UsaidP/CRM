/**
 * Indian buyer-friendly currency formatting.
 *
 * Indians read amounts in Lakhs and Crores (Indian digit grouping:
 * 1,58,08,000), not millions. Use these everywhere prices face a customer.
 */

/** Full Indian-grouped digits: 15808000 -> "₹1,58,08,000" */
export function formatIndianRupees(val: unknown): string {
  const amount = Number(val);
  if (val === null || val === undefined || !Number.isFinite(amount)) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Compact Lakh/Crore: 15808000 -> "₹1.58 Cr", 1580800 -> "₹15.81 Lakh", 45000 -> "₹45,000" */
export function formatLakhCr(val: unknown): string {
  const amount = Number(val);
  if (val === null || val === undefined || !Number.isFinite(amount)) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹${(lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2))} Lakh`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Both, for hero price displays: "₹1.58 Cr (₹1,58,08,000)" */
export function formatPriceFull(val: unknown): string {
  const amount = Number(val);
  if (val === null || val === undefined || !Number.isFinite(amount)) return '₹0';
  if (amount < 100000) return formatIndianRupees(amount);
  return `${formatLakhCr(amount)} (${formatIndianRupees(amount)})`;
}
