import { describe, it, expect } from 'vitest';

describe('Standardized Inquiry Validation', () => {
  function validateInquiry(body: any) {
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/\D/g, '');
    const pincode = String(body.pincode || '').trim();

    if (!name || name.length < 2) {
      return { valid: false, error: 'Full name must be at least 2 characters.' };
    }

    if (phone.length < 10) {
      return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
    }

    if (!/^\d{6}$/.test(pincode)) {
      return { valid: false, error: 'Please enter a valid 6-digit postal pincode.' };
    }

    return { valid: true };
  }

  it('validates required fields: name, phone, and pincode', () => {
    const res = validateInquiry({});
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('rejects invalid Indian phone number formats', () => {
    const res = validateInquiry({
      name: 'Pravin Patel',
      phone: '12345',
      pincode: '382430',
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('valid 10-digit Indian mobile number');
  });

  it('rejects invalid postal pincode formats', () => {
    const res = validateInquiry({
      name: 'Pravin Patel',
      phone: '9876543210',
      pincode: '38243',
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('valid 6-digit postal pincode');
  });

  it('validates successfully with correct Indian mobile and pincode', () => {
    const res = validateInquiry({
      name: 'Apollo Solar EPC Partner',
      phone: '9714710854',
      pincode: '382430',
    });
    expect(res.valid).toBe(true);
  });
});
