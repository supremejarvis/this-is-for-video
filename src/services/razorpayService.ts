/**
 * Apollo Engineering (APE) Official Razorpay Payment Gateway Service
 * Live Production Mode Integration
 */

import { RAZORPAY_CONFIG } from '../constants';
import { DeliveryAddress } from '../types';

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayPaymentOptions {
  amount: number; // in INR (e.g. 1596.64)
  orderNumber: string;
  razorpayOrderId?: string;
  keyId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: DeliveryAddress;
  notes?: Record<string, string>;
  onSuccess: (response: RazorpayPaymentSuccessResponse) => void;
  onError: (error: { code?: string; description?: string; source?: string; step?: string; reason?: string }) => void;
  onDismiss?: () => void;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

class RazorpayService {
  private scriptLoadedPromise: Promise<boolean> | null = null;

  /**
   * Dynamically loads Razorpay Standard Checkout SDK from official CDN
   */
  public loadScript(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.Razorpay) return Promise.resolve(true);

    if (this.scriptLoadedPromise) {
      return this.scriptLoadedPromise;
    }

    this.scriptLoadedPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;

      const timer = setTimeout(() => {
        resolve(false);
      }, 10000);

      script.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };
      script.onerror = () => {
        clearTimeout(timer);
        console.warn('[Razorpay] Failed to load official checkout.js SDK script from CDN.');
        resolve(false);
      };
      document.body.appendChild(script);
    });

    return this.scriptLoadedPromise;
  }

  /**
   * Launch Razorpay Standard Modal Checkout Popup
   */
  public async openCheckout(options: RazorpayPaymentOptions): Promise<void> {
    if (!options.amount || options.amount < 1) {
      options.onError({
        description: 'Payment amount must be at least ₹1 to initiate transaction.'
      });
      return;
    }

    const isLoaded = await this.loadScript();

    const amountInPaise = Math.round(options.amount * 100);

    if (!isLoaded || !window.Razorpay) {
      console.warn('[Razorpay Live SDK] Checkout SDK script not loaded or blocked.');
      options.onError({
        description: 'Payment gateway could not be loaded. Please check your internet connection and try again.'
      });
      return;
    }

    try {
      const rzpOptions: Record<string, any> = {
        key: options.keyId || RAZORPAY_CONFIG.keyId,
        amount: amountInPaise,
        currency: 'INR',
        name: RAZORPAY_CONFIG.merchantName,
        description: `Order ${options.orderNumber} - APE Priority Dispatch`,
        image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=160&auto=format&fit=crop&q=80',
        prefill: {
          name: options.customerName,
          email: options.customerEmail,
          contact: options.customerPhone
        },
        notes: {
          orderNumber: options.orderNumber,
          pincode: options.deliveryAddress.pincode,
          city: options.deliveryAddress.city,
          postOffice: options.deliveryAddress.postOffice?.name || 'Kathwada GIDC S.O.',
          originFacility: 'Kathwada Hub (382430)',
          ...(options.notes || {})
        },
        theme: {
          color: RAZORPAY_CONFIG.themeColor || '#0054A6',
          backdrop_color: 'rgba(15, 23, 42, 0.75)'
        },
        ...(options.razorpayOrderId ? { order_id: options.razorpayOrderId } : {}),
        modal: {
          ondismiss: () => {
            if (options.onDismiss) {
              options.onDismiss();
            }
          },
          escape: true,
          animation: true
        },
        handler: (response: RazorpayPaymentSuccessResponse) => {
          options.onSuccess(response);
        }
      };

      const rzpInstance = new window.Razorpay(rzpOptions);

      rzpInstance.on('payment.failed', (response: any) => {
        console.error('[Razorpay Payment Failed]', response.error);
        if (options.onError) {
          options.onError(response.error || { description: 'Payment failed' });
        }
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error('[Razorpay Initialization Error]', err);
      if (options.onError) {
        options.onError({ description: err.message || 'Razorpay checkout encountered an error' });
      }
    }
  }
}

export const razorpayService = new RazorpayService();
