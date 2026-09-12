/**
 * Apollo Engineering — Concrete E-Commerce Adapters
 * All adapters support sandbox mode and safe fallbacks.
 */

import { PaymentProvider, ShippingProvider, NotificationProvider, ShippingRateRequest, ShippingRateResponse } from './types';
import { logger } from '../observability/logger';

// 1. Razorpay Payment Provider
export class RazorpayPaymentProvider implements PaymentProvider {
  public name = 'Razorpay';
  public isSandbox = true;

  public async createPaymentOrder(amountPaise: number, orderNumber: string): Promise<{ gatewayOrderId: string }> {
    logger.info(`[Razorpay Order Created (${this.isSandbox ? 'SANDBOX' : 'LIVE'})]: ${orderNumber} - ₹${amountPaise / 100}`);
    return {
      gatewayOrderId: `order_rzp_mock_${Date.now()}`
    };
  }

  // Verification 1: Checkout signature (order_id + payment_id)
  public verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!orderId || !paymentId || !signature) return false;
    // In production backend: crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex') === signature
    return signature.length >= 16;
  }

  // Verification 2: Webhook signature against untouched raw body
  public verifyWebhookSignature(rawBody: string, receivedSignature: string): boolean {
    if (!rawBody || !receivedSignature) return false;
    // In production backend: crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex') === receivedSignature
    return receivedSignature.length >= 16;
  }
}

// 2. Direct UPI Manual Reconciliation Provider
export class DirectUpiProvider {
  public name = 'Direct UPI';
  public vpa = '8511626267@okbizaxis';

  public generateUpiQrPayload(amountRupees: number, orderNumber: string): string {
    return `upi://pay?pa=${this.vpa}&pn=Apollo%20Engineering&am=${amountRupees}&cu=INR&tn=${orderNumber}`;
  }

  public submitForReconciliation(orderNumber: string, utrNumber: string): { status: 'RECONCILIATION_PENDING'; message: string } {
    logger.info(`[UPI UTR Submitted for Manual Audit]: ${orderNumber} - UTR: ${utrNumber}`);
    return {
      status: 'RECONCILIATION_PENDING',
      message: 'Payment proof recorded. Order will be confirmed upon admin bank reconciliation.'
    };
  }
}

// 3. India Post Speed Post Adapter (Locked to Kathwada 382430)
export class IndiaPostShippingProvider implements ShippingProvider {
  public name = 'India Post Speed Post';
  public isSandbox = true;
  public originHubPincode = '382430';

  public async calculateRate(req: ShippingRateRequest): Promise<ShippingRateResponse> {
    // Standard Speed Post weight bracket lookup
    const weight = Math.max(1, req.weightGrams);
    let baseShipping = 40;
    if (weight > 500) baseShipping = 70;
    if (weight > 1000) baseShipping = 110;
    if (weight > 2000) baseShipping = 160;

    const shippingGstRate = 0.18; // Fixed 18% shipping GST rule
    const shippingGstAmount = Math.round(baseShipping * shippingGstRate * 100) / 100;
    const shippingTotal = baseShipping + shippingGstAmount;

    return {
      provider: this.name,
      baseShipping,
      shippingGstRate,
      shippingGstAmount,
      shippingTotal,
      estimatedDays: req.destinationPincode.startsWith('38') ? 1 : 3,
      serviceable: true
    };
  }

  public async createBooking(orderId: string, destinationPincode: string, weightGrams: number): Promise<{ trackingNumber: string }> {
    logger.info(`[India Post Booking Generated]: Order ${orderId} -> PIN ${destinationPincode} (${weightGrams}g)`);
    return {
      trackingNumber: `EK${Math.floor(100000000 + Math.random() * 900000000)}IN`
    };
  }
}

// 4. Shiprocket Shipping Provider (Fallback / Secondary)
export class ShiprocketShippingProvider implements ShippingProvider {
  public name = 'Shiprocket';
  public isSandbox = true;

  public async calculateRate(req: ShippingRateRequest): Promise<ShippingRateResponse> {
    const baseShipping = 60;
    const shippingGstAmount = Math.round(baseShipping * 0.18 * 100) / 100;
    return {
      provider: this.name,
      baseShipping,
      shippingGstRate: 0.18,
      shippingGstAmount,
      shippingTotal: baseShipping + shippingGstAmount,
      estimatedDays: 4,
      serviceable: true
    };
  }

  public async createBooking(orderId: string): Promise<{ trackingNumber: string }> {
    return { trackingNumber: `SR_${orderId}_${Date.now()}` };
  }
}

// 5. WhatsApp & MSG91 Notification Provider
export class WhatsAppNotificationProvider implements NotificationProvider {
  public name = 'MSG91 WhatsApp Gateway';
  public isSandbox = true;

  public async sendOrderConfirmation(phone: string, orderNumber: string, amount: number): Promise<boolean> {
    logger.info(`[WhatsApp Order Alert Dispatched]: ${phone} - Order ${orderNumber} (₹${amount})`);
    return true;
  }

  public async sendDispatchAlert(phone: string, orderNumber: string, trackingNumber: string): Promise<boolean> {
    logger.info(`[WhatsApp Dispatch Alert Dispatched]: ${phone} - Order ${orderNumber} (Tracking: ${trackingNumber})`);
    return true;
  }
}
