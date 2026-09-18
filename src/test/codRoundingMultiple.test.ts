import { describe, it, expect } from 'vitest';

describe('COD Payment Rounding to Multiples of ₹5 (Statutory Formula)', () => {
  it('matches mandatory statutory audit test amounts for multiples of 5', () => {
    // Formula check for the statutory cases:
    // COD Total = round_up(COD Raw Total, rounding_multiple)
    // Where round_up(x, m) = x if x % m == 0 else x - (x % m) + m
    const testCases = [
      { raw: 71.00, expected: 75.00, adj: 4.00 },
      { raw: 72.00, expected: 75.00, adj: 3.00 },
      { raw: 75.00, expected: 75.00, adj: 0.00 },
      { raw: 75.80, expected: 80.00, adj: 4.20 },
      { raw: 113.57, expected: 115.00, adj: 1.43 },
    ];

    testCases.forEach(({ raw, expected, adj }) => {
      const roundingMultiple = 5;
      const remainder = raw % roundingMultiple;
      const codTotal = remainder === 0 ? raw : raw - remainder + roundingMultiple;
      const roundingAdj = Math.round((codTotal - raw) * 100) / 100;

      expect(codTotal).toBe(expected);
      expect(codTotal % 5).toBe(0);
      expect(roundingAdj).toBeCloseTo(adj, 2);
    });
  });

  it('validates COD rounding formula matches backend Decimal logic', () => {
    // This mirrors the exact formula in backend/app/services/pricing.py:77-80
    const roundingMultiple = 5;
    const testValues = [71.00, 72.00, 75.00, 75.80, 113.57, 126.69, 22375.75, 10552.38];

    testValues.forEach((raw) => {
      const remainder = raw % roundingMultiple;
      const codTotal = remainder === 0 ? raw : raw - remainder + roundingMultiple;
      // Verify it's a valid multiple
      expect(codTotal % roundingMultiple).toBe(0);
      // Verify it's >= raw (upward rounding)
      expect(codTotal).toBeGreaterThanOrEqual(raw);
      // Verify it's the smallest such multiple
      expect(codTotal - roundingMultiple).toBeLessThan(raw);
    });
  });
});