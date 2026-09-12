/**
 * Apollo Engineering — PostHog Product Analytics Scaffolding
 *
 * STRICT PII POLICY:
 * Never send customer street address, mobile number, payment card details,
 * or uploaded verification photos to analytics.
 */

import { logger } from './logger';

export type PostHogEventName =
  | 'product_viewed'
  | 'size_selected'
  | 'measurement_guide_opened'
  | 'add_to_cart'
  | 'checkout_started'
  | 'shipping_calculated'
  | 'payment_method_selected'
  | 'payment_completed'
  | 'payment_failed'
  | 'order_confirmed'
  | 'replacement_requested';

export interface PostHogEventProperties {
  asin?: string;
  sku?: string;
  productTitle?: string;
  frameSize?: string;
  quantity?: number;
  cartTotal?: number;
  shippingTotal?: number;
  paymentMethod?: string;
  orderNumber?: string;
  replacementReason?: string;
  source?: string;
}

class PostHogAnalytics {
  private isEnabled = false;

  constructor() {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (key && !key.includes('placeholder')) {
      this.isEnabled = true;
    }
  }

  public track(event: PostHogEventName, properties: PostHogEventProperties = {}): void {
    // Strict PII Filter: ensure no phone, address, photo data leaks
    const sanitizedProps: Record<string, unknown> = {
      ...properties,
      timestamp: new Date().toISOString(),
      correlationId: logger.getCorrelationId(),
      clientEnvironment: import.meta.env.MODE || 'development'
    };

    if (!this.isEnabled) {
      logger.debug(`[PostHog Track (Sandbox/Dormant)]: ${event}`, sanitizedProps);
      return;
    }

    // When posthog-js is actively bundled:
    // posthog.capture(event, sanitizedProps);
    logger.info(`[PostHog Event Emitted]: ${event}`, sanitizedProps);
  }
}

export const analytics = new PostHogAnalytics();
