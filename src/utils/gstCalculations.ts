/**
 * Apollo Engineering (APE) Centralized GST & Tax Calculations
 * Standard HSN Code: 84248990 (Sprinklers), 73269099 (SS304 Clips)
 * Applicable GST Rate: 18%
 * Origin State: Gujarat (State Code: 24)
 */

export const GST_RATE_PERCENT = 18;
export const GUJARAT_STATE_CODE = '24';
export const KATHWADA_ORIGIN_PINCODE = '382430';

export interface GstBreakdown {
  taxableAmount: number;
  netTaxableAmount: number;
  totalGst: number;
  totalTax: number;
  cgst: number;
  cgstAmount: number;
  sgst: number;
  sgstAmount: number;
  igst: number;
  igstAmount: number;
  isInterState: boolean;
  totalWithTax: number;
  grossAmount: number;
  inputTaxCreditSavings: number;
  itcEligibleAmount: number;
}

/**
 * Calculate pure 18% GST breakdown from an inclusive MRP/Selling price
 */
export function calculateInclusiveGst(
  grossAmount: number,
  param2?: number | string | boolean,
  param3?: boolean | string,
  param4?: string
): GstBreakdown {
  const safeGross = Math.max(0, grossAmount);
  
  let rate = GST_RATE_PERCENT;
  let isIntraState = true;
  let gstin: string | undefined;

  if (typeof param2 === 'number') {
    rate = param2;
    if (typeof param3 === 'boolean') {
      isIntraState = param3;
      if (typeof param4 === 'string') gstin = param4;
    } else if (typeof param3 === 'string') {
      gstin = param3;
      isIntraState = gstin.startsWith(GUJARAT_STATE_CODE);
    }
  } else if (typeof param2 === 'string') {
    gstin = param2;
    isIntraState = gstin.startsWith(GUJARAT_STATE_CODE);
  } else if (typeof param2 === 'boolean') {
    isIntraState = param2;
  }

  // Taxable Amount = Gross / (1 + Rate/100)
  const taxableAmount = safeGross > 0 ? Math.round((safeGross / (1 + rate / 100)) * 100) / 100 : 0;
  const totalGst = Math.round((safeGross - taxableAmount) * 100) / 100;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (!isIntraState) {
    igst = totalGst;
  } else {
    cgst = Math.round((totalGst / 2) * 100) / 100;
    sgst = Math.round((totalGst - cgst) * 100) / 100;
  }

  const itcSavings = totalGst;

  return {
    taxableAmount,
    netTaxableAmount: taxableAmount,
    totalGst,
    totalTax: totalGst,
    cgst,
    cgstAmount: cgst,
    sgst,
    sgstAmount: sgst,
    igst,
    igstAmount: igst,
    isInterState: !isIntraState,
    totalWithTax: safeGross,
    grossAmount: safeGross,
    inputTaxCreditSavings: itcSavings,
    itcEligibleAmount: itcSavings
  };
}

/**
 * Calculate Exclusive GST addition
 */
export function calculateExclusiveGst(
  taxableAmount: number,
  param2?: number | boolean,
  param3?: boolean
): GstBreakdown {
  const safeTaxable = Math.max(0, taxableAmount);
  let rate = GST_RATE_PERCENT;
  let isIntraState = true;

  if (typeof param2 === 'number') {
    rate = param2;
    if (typeof param3 === 'boolean') {
      isIntraState = param3;
    }
  } else if (typeof param2 === 'boolean') {
    isIntraState = !param2; // isInterState flag
  }

  const totalGst = Math.round((safeTaxable * (rate / 100)) * 100) / 100;
  const totalWithTax = Math.round((safeTaxable + totalGst) * 100) / 100;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (!isIntraState) {
    igst = totalGst;
  } else {
    cgst = Math.round((totalGst / 2) * 100) / 100;
    sgst = Math.round((totalGst - cgst) * 100) / 100;
  }

  return {
    taxableAmount: safeTaxable,
    netTaxableAmount: safeTaxable,
    totalGst,
    totalTax: totalGst,
    cgst,
    cgstAmount: cgst,
    sgst,
    sgstAmount: sgst,
    igst,
    igstAmount: igst,
    isInterState: !isIntraState,
    totalWithTax,
    grossAmount: totalWithTax,
    inputTaxCreditSavings: totalGst,
    itcEligibleAmount: totalGst
  };
}

/**
 * Calculate B2B Bulk Tier Discount & Savings
 */
export function calculateB2bSavings(
  retailPrice: number,
  wholesalePrice: number,
  quantity: number
): { 
  totalRetail: number; 
  totalWholesale: number; 
  totalSavings: number; 
  discountPercent: number;
  savingsPercent: number;
} {
  const safeQty = Math.max(1, quantity);
  const totalRetail = retailPrice * safeQty;
  const totalWholesale = wholesalePrice * safeQty;
  const totalSavings = Math.max(0, totalRetail - totalWholesale);
  const rawSavingsPercent = totalRetail > 0 ? ((totalSavings / totalRetail) * 100) : 0;
  const savingsPercent = Math.round(rawSavingsPercent * 10) / 10;
  const discountPercent = Math.round(rawSavingsPercent);

  return {
    totalRetail,
    totalWholesale,
    totalSavings,
    discountPercent,
    savingsPercent
  };
}
