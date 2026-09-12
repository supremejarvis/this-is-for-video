import { describe, it, expect, vi } from 'vitest';
import { razorpayService } from '../razorpayService';
import { RAZORPAY_CONFIG } from '../../constants';

describe('Official Razorpay Live Payment Gateway Service', () => {
  it('loads Razorpay configuration credentials correctly', () => {
    expect(RAZORPAY_CONFIG.keyId).toBe('rzp_live_TPhyOgY7jM1yqR');
    expect(RAZORPAY_CONFIG.merchantName).toBe('Apollo Engineering');
    expect(RAZORPAY_CONFIG.themeColor).toBe('#0054A6');
  });

  it('triggers payment checkout handler with window.Razorpay SDK instance', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    // Mock window.Razorpay
    let capturedOptions: any = null;
    window.Razorpay = vi.fn().mockImplementation((options: any) => {
      capturedOptions = options;
      return {
        open: () => {
          options.handler({
            razorpay_payment_id: 'pay_live_test123456',
            razorpay_order_id: 'order_test987654',
            razorpay_signature: 'sig_test_valid'
          });
        },
        on: vi.fn()
      };
    });

    await razorpayService.openCheckout({
      amount: 1596.64,
      orderNumber: 'ORD-AE-2026-99999',
      customerName: 'Pravin Patel',
      customerEmail: 'admin@apolloengineering.co.in',
      customerPhone: '9825012345',
      deliveryAddress: {
        id: 'addr_test',
        userId: 'u_customer_b2c',
        fullName: 'Pravin Patel',
        phone: '9825012345',
        pincode: '382430',
        city: 'Kathwada GIDC, Ahmedabad',
        state: 'Gujarat',
        stateCode: '24',
        flatBuilding: 'Plot 100',
        streetArea: 'Kathwada GIDC Phase 2',
        postOffice: {
          name: 'KATHWADA GIDC S.O.',
          branchType: 'Sub Post Office',
          deliveryStatus: 'Delivery',
          circle: 'Gujarat',
          district: 'Ahmedabad',
          state: 'Gujarat',
          facilityId: '21260024'
        },
        addressType: 'OFFICE',
        isDefault: true
      },
      onSuccess,
      onError
    });

    expect(onSuccess).toHaveBeenCalledWith({
      razorpay_payment_id: 'pay_live_test123456',
      razorpay_order_id: 'order_test987654',
      razorpay_signature: 'sig_test_valid'
    });
    expect(capturedOptions.amount).toBe(159664); // amount in paise
    expect(capturedOptions.key).toBe('rzp_live_TPhyOgY7jM1yqR');
  });
});
