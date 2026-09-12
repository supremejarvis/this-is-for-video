/**
 * Google Authenticator & TOTP (RFC 6238 / RFC 4226) Service
 * Provides standard 6-digit Time-based One-Time Password generation and verification
 * for Super Admin 2FA Security.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const APOLLO_ADMIN_ISSUER = 'Apollo Engineering';
export const APOLLO_ADMIN_ACCOUNT = 'admin@apolloengineering.co.in';

/**
 * Decode Base32 string to Uint8Array
 */
export function base32ToBytes(base32: string): Uint8Array {
  const cleanBase32 = base32.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanBase32.length; i++) {
    const char = cleanBase32[i];
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Encode Uint8Array to Base32 string
 */
export function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Generate a cryptographically strong random Base32 secret key
 */
export function generateTotpSecret(length: number = 16): string {
  const buffer = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buffer);
  } else {
    for (let i = 0; i < length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToBase32(buffer).slice(0, length);
}

/**
 * Convert integer time counter to 8-byte big-endian Uint8Array
 */
function counterToBytes(counter: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  // JavaScript numbers are 53-bit precision; split into high and low 32-bit
  const high = Math.floor(counter / 0x100000000);
  const low = counter & 0xffffffff;
  view.setUint32(0, high, false); // Big-endian
  view.setUint32(4, low, false);
  return new Uint8Array(buffer);
}

/**
 * Compute HMAC-SHA1 using Web Crypto API
 */
async function computeHmacSha1(keyBytes: Uint8Array, messageBytes: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
    return new Uint8Array(signature);
  }

  // Fallback pure JS HMAC-SHA1 if Web Crypto is unavailable
  throw new Error('Web Crypto API is required for HMAC-SHA1 computation.');
}

/**
 * Generate 6-digit TOTP code for a given timestamp (default: now) and time step (default: 30s)
 */
export async function generateTOTP(
  secret: string,
  timestampMs: number = Date.now(),
  timeStepSec: number = 30,
  digits: number = 6
): Promise<string> {
  const counter = Math.floor(timestampMs / 1000 / timeStepSec);
  const keyBytes = base32ToBytes(secret);
  const messageBytes = counterToBytes(counter);

  const hmacResult = await computeHmacSha1(keyBytes, messageBytes);

  // Dynamic truncation (RFC 4226)
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify a 6-digit TOTP code with time-window tolerance (default: ±1 step, i.e. ±30s)
 */
export async function verifyTOTP(
  token: string,
  secret: string,
  windowTolerance: number = 1,
  timestampMs: number = Date.now(),
  timeStepSec: number = 30
): Promise<boolean> {
  const cleanToken = token.replace(/\s+/g, '').trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  const currentCounter = Math.floor(timestampMs / 1000 / timeStepSec);

  for (let i = -windowTolerance; i <= windowTolerance; i++) {
    const targetTimestamp = (currentCounter + i) * timeStepSec * 1000;
    try {
      const expectedOtp = await generateTOTP(secret, targetTimestamp, timeStepSec);
      if (expectedOtp === cleanToken) {
        return true;
      }
    } catch (e) {
      console.error('[TOTP Verification Error]:', e);
    }
  }

  return false;
}

/**
 * Generate standard otpauth:// URL for Google Authenticator / Authy / Microsoft Authenticator
 */
export function getOtpAuthUrl(
  account: string = APOLLO_ADMIN_ACCOUNT,
  issuer: string = APOLLO_ADMIN_ISSUER,
  secret: string = ''
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(account);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate high-resolution QR Code image URL for scanning in Google Authenticator app
 */
export function getQrCodeUrl(otpAuthUrl: string, size: number = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(otpAuthUrl)}&margin=10`;
}

/**
 * Singleton TOTP Service Export
 */
export const totpService = {
  generateSecret: generateTotpSecret,
  generateTOTP,
  verifyTOTP,
  getOtpAuthUrl,
  getQrCodeUrl,
  DEFAULT_ISSUER: APOLLO_ADMIN_ISSUER,
  DEFAULT_ACCOUNT: APOLLO_ADMIN_ACCOUNT,
};
