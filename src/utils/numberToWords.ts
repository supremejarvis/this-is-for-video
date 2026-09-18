/**
 * Authoritative Indian Numbering System to Words Converter
 * Converts numeric amounts (e.g. ₹1,25,000) to Indian English text (e.g. "One Lakh Twenty Five Thousand Rupees only")
 */

const ONES: readonly string[] = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS: readonly string[] = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const unit = n % 10;
  return TENS[Math.floor(n / 10)] + (unit ? ' ' + ONES[unit] : '');
}

function convertThreeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let res = '';
  if (hundred) res += ONES[hundred] + ' Hundred';
  if (rest) res += (hundred ? ' and ' : '') + convertTwoDigits(rest);
  return res;
}

export interface NumberToWordsOptions {
  suffix?: string;
}

export function numberToIndianWords(num: number, options: NumberToWordsOptions = {}): string {
  const rounded = Math.round(num);
  const defaultSuffix = options.suffix ?? 'only';
  if (rounded === 0) return `Zero ${defaultSuffix}`.trim();

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const remaining = rounded % 1000;

  let words = '';
  if (crore) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand) words += convertTwoDigits(thousand) + ' Thousand ';
  if (remaining) words += convertThreeDigits(remaining);

  return `${words.trim()} ${defaultSuffix}`.trim();
}
