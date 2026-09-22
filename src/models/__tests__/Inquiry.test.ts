import { describe, it, expect } from 'vitest';
import { validateInquiryInput } from '../../app/api/inquiries/route';

describe('Standardized Inquiry Validation', () => {

  it('validates required fields: name, phone, and pincode', () => {
    const res = validateInquiryInput({});
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('rejects invalid Indian phone number formats', () => {
    const res = validateInquiryInput({
      name: 'Pravin Patel',
      phone: '12345',
      pincode: '382430',
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('valid 10-digit Indian mobile number');
  });

  it('rejects invalid postal pincode formats', () => {
    const res = validateInquiryInput({
      name: 'Pravin Patel',
      phone: '9876543210',
      pincode: '38243',
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('valid 6-digit postal pincode');
  });

  it('validates successfully with correct Indian mobile and pincode', () => {
    const res = validateInquiryInput({
      name: 'Apollo Solar EPC Partner',
      phone: '9714710854',
      pincode: '382430',
    });
    expect(res.valid).toBe(true);
  });
});
