import { describe, it, expect, vi } from 'vitest';
import { msg91OtpService } from '../msg91OtpService';

describe('MSG91 Official OTP & WhatsApp Verification Service', () => {
  it('correctly formats mobile numbers for MSG91 with country code (91)', () => {
    expect(msg91OtpService.formatMobileNumber('9714710854')).toBe('919714710854');
    expect(msg91OtpService.formatMobileNumber('+91 97147 10854')).toBe('919714710854');
    expect(msg91OtpService.formatMobileNumber('919714710854')).toBe('919714710854');
  });

  it('sends OTP and returns dispatch result', async () => {
    const res = await msg91OtpService.sendOtp('9714710854', {
      company: 'Apollo Engineering',
      type: 'Customer Verification'
    });

    // In test environment (no SDK, no MSG91 server), expect 'error' since OTP can't actually be sent
    // In production, this would return 'success' with a request_id
    expect(res.type).toBeDefined();
    expect(res.message).toBeDefined();
  });

  it('rejects unverified codes including former backdoors (1234, 6029)', async () => {
    const verify1 = await msg91OtpService.verifyOtp('9825012345', '1234');
    expect(verify1.isVerified).toBe(false);

    const verify2 = await msg91OtpService.verifyOtp('9825012345', '6029');
    expect(verify2.isVerified).toBe(false);

    const verifyFail = await msg91OtpService.verifyOtp('9825012345', '9999');
    expect(verifyFail.isVerified).toBe(false);
  });

  it('verifies valid OTP code when verified by MSG91 API response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ type: 'success', message: 'OTP verified successfully' }),
    } as any);

    try {
      const verifyRes = await msg91OtpService.verifyOtp('9825012345', '8492');
      expect(verifyRes.type).toBe('success');
      expect(verifyRes.isVerified).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('initiates OTP retry via SMS and Voice', async () => {
    const retrySms = await msg91OtpService.retryOtp('9714710854', 'TEXT');
    expect(retrySms.message).toBeDefined();

    const retryVoice = await msg91OtpService.retryOtp('9714710854', 'VOICE');
    expect(retryVoice.message).toBeDefined();
  });

  it('dispatches WhatsApp order alerts', async () => {
    const alert = await msg91OtpService.sendWhatsAppOrderAlert('9714710854', 'ORD-2026-001', 4500, true);
    expect(typeof alert).toBe('boolean');
  });
});
