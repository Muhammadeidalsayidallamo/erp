/** 
 * Safely round to N decimal places 
 */
export const round = (n: number, decimals = 2): number => {
  if (isNaN(n) || !isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};

/** 
 * Format currency with Egyptian Pound (EGP) in Arabic locale
 */
export const formatEGP = (n: number): string => {
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(round(n, 2)) + ' ج.م';
};

/** 
 * Format percentage
 */
export const formatPercent = (n: number): string => {
  return round(n, 1) + '%';
};

/** Format compact (1000 → 1K) */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${round(value / 1_000_000, 1)}م`;
  if (value >= 1_000) return `${round(value / 1_000, 1)}ألف`;
  return String(round(value, 0));
}

// ==========================================
// Unit Tests (Internal)
// ==========================================
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // Test 1: basic rounding
  console.assert(round(0.1 + 0.2, 2) === 0.3, 'Test Failed: 0.1 + 0.2 !== 0.3');
  // Test 2: precise 3 decimal rounding
  console.assert(round(1.0005, 3) === 1.001, 'Test Failed: round(1.0005, 3)');
  // Test 3: percentage formatting
  console.assert(formatPercent(35.25) === '35.3%', 'Test Failed: formatPercent');
  // Test 4: EGP formatting
  console.assert(formatEGP(1234.5).includes('1,234.50'), 'Test Failed: formatEGP 1234.5');
  // Test 5: Compact formatting
  console.assert(formatCompact(1500) === '1.5ألف', 'Test Failed: formatCompact 1500');
}

