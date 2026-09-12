import { describe, it, expect } from 'vitest';
import { 
  calculateInclusiveGst, 
  calculateExclusiveGst, 
  calculateB2bSavings,
  GST_RATE_PERCENT 
} from '../gstCalculations';

describe('GST Calculation Engine & Tax Invoicing Utilities', () => {
  it('calculates intra-state 18% GST (CGST 9% + SGST 9%) correctly for inclusive prices', () => {
    const grossAmount = 1180; // ₹1000 base + ₹180 GST
    const result = calculateInclusiveGst(grossAmount, 18, true);

    expect(result.netTaxableAmount).toBe(1000);
    expect(result.totalTax).toBe(180);
    expect(result.cgstAmount).toBe(90);
    expect(result.sgstAmount).toBe(90);
    expect(result.igstAmount).toBe(0);
    expect(result.itcEligibleAmount).toBe(180);
  });

  it('calculates inter-state 18% IGST correctly for inclusive prices', () => {
    const grossAmount = 2360; // ₹2000 base + ₹360 IGST
    const result = calculateInclusiveGst(grossAmount, 18, false);

    expect(result.netTaxableAmount).toBe(2000);
    expect(result.totalTax).toBe(360);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(360);
    expect(result.itcEligibleAmount).toBe(360);
  });

  it('calculates exclusive GST accurately for base procurement costs', () => {
    const baseAmount = 5000;
    const result = calculateExclusiveGst(baseAmount, 18, true);

    expect(result.netTaxableAmount).toBe(5000);
    expect(result.totalTax).toBe(900);
    expect(result.cgstAmount).toBe(450);
    expect(result.sgstAmount).toBe(450);
    expect(result.grossAmount).toBe(5900);
  });

  it('calculates wholesale B2B bulk savings correctly against retail MRP', () => {
    const retailPrice = 220;
    const b2bTierPrice = 185;
    const quantity = 100;

    const savings = calculateB2bSavings(retailPrice, b2bTierPrice, quantity);

    expect(savings.totalSavings).toBe(3500); // (220 - 185) * 100
    expect(savings.savingsPercent).toBe(15.9);
  });

  it('handles edge case: gross amount of 0', () => {
    const result = calculateInclusiveGst(0, 18, true);
    expect(result.netTaxableAmount).toBe(0);
    expect(result.totalTax).toBe(0);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
  });

  it('handles edge case: negative numbers gracefully', () => {
    const result = calculateInclusiveGst(-500, 18, true);
    expect(result.netTaxableAmount).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  it('handles large volume commercial invoice totals with precision', () => {
    const largeGross = 11800000; // ₹1.18 Crore
    const result = calculateInclusiveGst(largeGross, 18, false);

    expect(result.netTaxableAmount).toBe(10000000);
    expect(result.igstAmount).toBe(1800000);
    expect(result.itcEligibleAmount).toBe(1800000);
  });

  it('exports default 18% GST rate constant', () => {
    expect(GST_RATE_PERCENT).toBe(18);
  });
});
