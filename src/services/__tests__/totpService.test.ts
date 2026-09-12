import { describe, it, expect } from 'vitest';
import { 
  totpService, 
  base32ToBytes, 
  bytesToBase32, 
  generateTOTP, 
  verifyTOTP, 
  getOtpAuthUrl,
  APOLLO_ADMIN_TOTP_SECRET 
} from '../totpService';

describe('Google Authenticator & TOTP Service (RFC 6238)', () => {
  it('encodes and decodes Base32 accurately', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = bytesToBase32(original);
    expect(encoded).toBe('JBSWY3DP');
    const decoded = base32ToBytes(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('generates valid 6-digit TOTP code', async () => {
    const code = await generateTOTP(APOLLO_ADMIN_TOTP_SECRET);
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('verifies generated TOTP code successfully', async () => {
    const now = Date.now();
    const code = await generateTOTP(APOLLO_ADMIN_TOTP_SECRET, now);
    const isValid = await verifyTOTP(code, APOLLO_ADMIN_TOTP_SECRET, 1, now);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect TOTP codes', async () => {
    const isValid = await verifyTOTP('000000', APOLLO_ADMIN_TOTP_SECRET);
    // Unless by extreme coincidence the current OTP is 000000
    const currentOtp = await generateTOTP(APOLLO_ADMIN_TOTP_SECRET);
    if (currentOtp !== '000000') {
      expect(isValid).toBe(false);
    }
  });

  it('generates standard otpauth URL for Google Authenticator app import', () => {
    const url = getOtpAuthUrl('admin@apolloengineering.co.in', 'Apollo Engineering', APOLLO_ADMIN_TOTP_SECRET);
    expect(url).toContain('otpauth://totp/Apollo%20Engineering:admin%40apolloengineering.co.in');
    expect(url).toContain(`secret=${APOLLO_ADMIN_TOTP_SECRET}`);
    expect(url).toContain('period=30');
    expect(url).toContain('digits=6');
  });

  it('generates QR code URL for scanning', () => {
    const otpauth = getOtpAuthUrl();
    const qrUrl = totpService.getQrCodeUrl(otpauth);
    expect(qrUrl).toContain('api.qrserver.com');
    expect(qrUrl).toContain(encodeURIComponent(otpauth));
  });
});
