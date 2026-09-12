import { describe, it, expect, beforeEach } from 'vitest';
import { OrderStateMachine } from '../orderStateMachine';
import { RazorpayPaymentProvider, IndiaPostShippingProvider, DirectUpiProvider } from '../providers';
import { WebhookIdempotencyManager, retryWithBackoff } from '../webhookIdempotency';

describe('E-Commerce Safety, Providers & State Machine Suite', () => {
  beforeEach(() => {
    WebhookIdempotencyManager.clear();
  });

  // 1. Order State Machine
  it('allows valid state progression: DRAFT -> PAYMENT_PENDING -> PAID -> PROCESSING -> DISPATCHED -> DELIVERED', () => {
    let state = OrderStateMachine.transition('DRAFT', 'PAYMENT_PENDING');
    expect(state).toBe('PAYMENT_PENDING');

    state = OrderStateMachine.transition('PAYMENT_PENDING', 'PAID');
    expect(state).toBe('PAID');

    state = OrderStateMachine.transition('PAID', 'PROCESSING');
    expect(state).toBe('PROCESSING');

    state = OrderStateMachine.transition('PROCESSING', 'DISPATCHED');
    expect(state).toBe('DISPATCHED');

    state = OrderStateMachine.transition('DISPATCHED', 'DELIVERED');
    expect(state).toBe('DELIVERED');
  });

  it('strictly blocks illegal transitions e.g. DRAFT -> DELIVERED or PAID -> PAYMENT_PENDING', () => {
    expect(() => OrderStateMachine.transition('DRAFT', 'DELIVERED')).toThrowError(/Illegal State Transition/);
    expect(() => OrderStateMachine.transition('PAID', 'PAYMENT_PENDING')).toThrowError(/Illegal State Transition/);
  });

  it('blocks marking Direct UPI orders PAID without explicit admin reconciliation approval', () => {
    expect(() => OrderStateMachine.transition('RECONCILIATION_PENDING', 'PAID')).toThrowError(/Security Guard/);

    const approved = OrderStateMachine.transition('RECONCILIATION_PENDING', 'PAID', { adminApproved: true });
    expect(approved).toBe('PAID');
  });

  // 2. Razorpay Dual Signature Verification
  it('verifies checkout signatures and webhook signatures independently', () => {
    const provider = new RazorpayPaymentProvider();

    // Checkout signature
    const validCheckout = provider.verifyCheckoutSignature('order_test_123', 'pay_test_456', 'valid_signature_hash_123456');
    expect(validCheckout).toBe(true);

    const invalidCheckout = provider.verifyCheckoutSignature('', '', '');
    expect(invalidCheckout).toBe(false);

    // Raw Webhook signature
    const validWebhook = provider.verifyWebhookSignature('{"event":"payment.captured"}', 'valid_webhook_signature_hash_987654');
    expect(validWebhook).toBe(true);
  });

  // 3. Webhook Idempotency
  it('prevents duplicate processing of repeated webhook event deliveries', () => {
    const eventId = 'evt_rzp_999888';
    expect(WebhookIdempotencyManager.isDuplicate(eventId)).toBe(false);

    WebhookIdempotencyManager.recordEvent(eventId);
    expect(WebhookIdempotencyManager.isDuplicate(eventId)).toBe(true);
  });

  // 4. India Post Shipping Provider
  it('calculates shipping rates with exact 18% shipping GST from Kathwada hub (382430)', async () => {
    const provider = new IndiaPostShippingProvider();
    const rate = await provider.calculateRate({
      originPincode: '382430',
      destinationPincode: '380001',
      weightGrams: 450,
      isPrepaid: true
    });

    expect(rate.baseShipping).toBe(40);
    expect(rate.shippingGstRate).toBe(0.18);
    expect(rate.shippingGstAmount).toBe(7.20);
    expect(rate.shippingTotal).toBe(47.20);
  });

  // 5. Exponential Backoff Retry Utility
  it('retries failing asynchronous operations with backoff and succeeds on recovery', async () => {
    let callCount = 0;
    const flakeyFn = async () => {
      callCount++;
      if (callCount < 3) throw new Error('Transient network error');
      return 'SUCCESS';
    };

    const result = await retryWithBackoff(flakeyFn, 4, 10, 1.5);
    expect(result).toBe('SUCCESS');
    expect(callCount).toBe(3);
  });
});
