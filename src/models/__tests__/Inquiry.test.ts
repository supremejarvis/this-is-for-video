import { describe, it, expect } from 'vitest';
import { Inquiry } from '../Inquiry';

describe('Mongoose Inquiry Model & Schema Validation', () => {
  it('validates required fields: name, phone, and pincode', async () => {
    const invalidInquiry = new Inquiry({});
    let error: any = null;
    try {
      await invalidInquiry.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error?.errors.name).toBeDefined();
    expect(error?.errors.phone).toBeDefined();
    expect(error?.errors.pincode).toBeDefined();
  });

  it('rejects invalid Indian phone number formats', async () => {
    const invalidPhoneInquiry = new Inquiry({
      name: 'Pravin Patel',
      phone: '12345',
      pincode: '382430',
    });
    let error: any = null;
    try {
      await invalidPhoneInquiry.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error?.errors.phone).toBeDefined();
    expect(error?.errors.phone.message).toContain('valid 10-digit Indian mobile number');
  });

  it('rejects invalid postal pincode formats', async () => {
    const invalidPincodeInquiry = new Inquiry({
      name: 'Pravin Patel',
      phone: '9876543210',
      pincode: '38243', // 5 digits
    });
    let error: any = null;
    try {
      await invalidPincodeInquiry.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error?.errors.pincode).toBeDefined();
    expect(error?.errors.pincode.message).toContain('valid 6-digit postal pincode');
  });

  it('validates successfully with correct Indian mobile and pincode', async () => {
    const validInquiry = new Inquiry({
      name: 'Apollo Solar EPC Partner',
      phone: '9714710854',
      pincode: '382430',
      city: 'Ahmedabad',
      state: 'Gujarat',
      companyName: 'Solar Solutions Pvt Ltd',
      gstin: '24ABCDE1234F1Z5',
      solarCapacityKw: 50,
      inquiryType: 'SOLAR_CONTRACTOR',
      message: 'Need SS304 sprinklers and drain clips for 50kW industrial rooftop plant.',
    });

    await validInquiry.validate();
    expect(validInquiry.name).toBe('Apollo Solar EPC Partner');
    expect(validInquiry.status).toBe('NEW');
    expect(validInquiry.solarCapacityKw).toBe(50);
  });
});
