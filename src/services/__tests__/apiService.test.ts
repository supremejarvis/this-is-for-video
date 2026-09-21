import { describe, it, expect } from 'vitest';
import { 
  apiService, 
  validateGstinFormat, 
  extractPanFromGstin, 
  ConnectionManager,
  fetchWithRetry,
  isGstinVerificationResult 
} from '../apiService';

describe('Centralized Resilient API Service Layer', () => {
  it('validates correct 15-digit Gujarat GSTIN format and maps state name', () => {
    const validGstin = '24AABCA1234F1Z5';
    const validation = validateGstinFormat(validGstin);

    expect(validation.isValid).toBe(true);
    expect(validation.stateName).toBe('Gujarat');
  });

  it('validates Maharashtra GSTIN format and maps state name', () => {
    const validGstin = '27AABCM5678G1Z2';
    const validation = validateGstinFormat(validGstin);

    expect(validation.isValid).toBe(true);
    expect(validation.stateName).toBe('Maharashtra');
  });

  it('rejects invalid GSTIN with wrong length or characters', () => {
    const shortGstin = '24AABCA1234';
    const invalidChar = '24AABCA1234F1Z!';

    expect(validateGstinFormat(shortGstin).isValid).toBe(false);
    expect(validateGstinFormat(invalidChar).isValid).toBe(false);
  });

  it('automatically extracts 10-character PAN from valid 15-character GSTIN', () => {
    const gstin = '24ABCDE1234F1Z5';
    const validation = validateGstinFormat(gstin);

    expect(validation.isValid).toBe(true);
    expect(validation.pan).toBe('ABCDE1234F');
    expect(validation.stateCode).toBe('24');
    expect(validation.stateName).toBe('Gujarat');

    // Test standalone utility
    expect(extractPanFromGstin(gstin)).toBe('ABCDE1234F');
    expect(extractPanFromGstin('27AABCM5678G1Z2')).toBe('AABCM5678G');
    expect(extractPanFromGstin('12345')).toBeNull();
  });

  it('successfully verifies GSTIN via apiService with structured legal response', async () => {
    const result = await apiService.verifyGstin('24AABCA1234F1Z5');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.gstin).toBe('24AABCA1234F1Z5');
    expect(result.data?.stateCode).toBe('24');
    expect(result.data?.status).toBe('ACTIVE');
    expect(result.data?.taxpayerType).toBe('REGULAR');
  });

  it('rejects invalid GSTIN format early in verifyGstin before network retry', async () => {
    const result = await apiService.verifyGstin('INVALID');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('validates isGstinVerificationResult type guard accurately', () => {
    const validData = {
      gstin: '24AABCA1234F1Z5',
      isValid: true,
      legalName: 'Apollo Engineering',
      verificationSource: 'ALGORITHM_CHECKSUM' as const
    };
    expect(isGstinVerificationResult(validData)).toBe(true);
    expect(isGstinVerificationResult(null)).toBe(false);
    expect(isGstinVerificationResult({ random: 'data' })).toBe(false);
  });

  it('fetches live Speed Post tracking feed with milestone timeline', async () => {
    const trackingRes = await apiService.fetchLiveTracking('EM12345678IN');

    expect(trackingRes.success).toBe(true);
    expect(trackingRes.data).toBeDefined();
    expect(trackingRes.data?.articleNumber).toBe('EM12345678IN');
    expect(trackingRes.data?.carrier).toBe('APE Express Shipping');
    expect(trackingRes.data?.milestones.length).toBeGreaterThan(0);
  });

  it('rejects malformed article number in fetchLiveTracking', async () => {
    const res = await apiService.fetchLiveTracking('AB');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('checks ConnectionManager online state report', () => {
    const status = ConnectionManager.getStatus();
    expect(typeof status).toBe('boolean');
  });

  it('retries failing functions with exponential backoff and succeeds', async () => {
    let attempts = 0;
    const flakyFunction = async () => {
      attempts++;
      if (attempts < 2) throw new Error('Temporary gateway timeout');
      return 'SUCCESS_AFTER_RETRY';
    };

    const result = await fetchWithRetry(flakyFunction, 3, 10);
    expect(result).toBe('SUCCESS_AFTER_RETRY');
    expect(attempts).toBe(2);
  });

  it('throws final error when maxRetries exceeded in fetchWithRetry', async () => {
    const alwaysFail = async () => {
      throw new Error('Persistent 500 Server Error');
    };

    await expect(fetchWithRetry(alwaysFail, 2, 10)).rejects.toThrow('Persistent 500 Server Error');
  });
});
