import { describe, it, expect } from 'vitest';
import { numberToIndianWords } from '../numberToWords';

describe('numberToIndianWords', () => {
  it('handles zero correctly with default and custom suffix', () => {
    expect(numberToIndianWords(0)).toBe('Zero only');
    expect(numberToIndianWords(0, { suffix: 'Rupees only' })).toBe('Zero Rupees only');
  });

  it('converts single and double digit amounts', () => {
    expect(numberToIndianWords(5)).toBe('Five only');
    expect(numberToIndianWords(15)).toBe('Fifteen only');
    expect(numberToIndianWords(42)).toBe('Forty Two only');
    expect(numberToIndianWords(99)).toBe('Ninety Nine only');
  });

  it('converts hundreds with and without remainder', () => {
    expect(numberToIndianWords(100)).toBe('One Hundred only');
    expect(numberToIndianWords(105)).toBe('One Hundred and Five only');
    expect(numberToIndianWords(250)).toBe('Two Hundred and Fifty only');
    expect(numberToIndianWords(999)).toBe('Nine Hundred and Ninety Nine only');
  });

  it('converts thousands, lakhs, and crores accurately', () => {
    expect(numberToIndianWords(1000)).toBe('One Thousand only');
    expect(numberToIndianWords(25000)).toBe('Twenty Five Thousand only');
    expect(numberToIndianWords(100000)).toBe('One Lakh only');
    expect(numberToIndianWords(125000)).toBe('One Lakh Twenty Five Thousand only');
    expect(numberToIndianWords(10000000)).toBe('One Crore only');
    expect(numberToIndianWords(25000000, { suffix: 'Rupees only' })).toBe('Two Crore Fifty Lakh Rupees only');
  });

  it('rounds floating point inputs before converting', () => {
    expect(numberToIndianWords(49.8)).toBe('Fifty only');
    expect(numberToIndianWords(99.2)).toBe('Ninety Nine only');
  });
});
