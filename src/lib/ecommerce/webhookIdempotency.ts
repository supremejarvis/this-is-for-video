/**
 * Apollo Engineering — Webhook Idempotency Ledger
 * Prevents replay attacks and duplicate order processing.
 */

import { logger } from '../observability/logger';

export class WebhookIdempotencyManager {
  private static processedEvents = new Set<string>();

  public static isDuplicate(eventId: string): boolean {
    if (!eventId) return false;
    return this.processedEvents.has(eventId);
  }

  public static recordEvent(eventId: string): void {
    if (eventId) {
      this.processedEvents.add(eventId);
      logger.info(`[Webhook Idempotency Recorded]: ${eventId}`);
    }
  }

  public static clear(): void {
    this.processedEvents.clear();
  }
}

/**
 * Robust retry utility with exponential backoff for external API calls
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 200,
  factor = 2
): Promise<T> {
  let attempt = 0;
  let currentDelay = delayMs;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        logger.error(`[Retry Exhausted after ${attempt} attempts]: ${String(error)}`);
        throw error;
      }
      logger.warn(`[Retry Attempt ${attempt}/${retries} after ${currentDelay}ms]: ${String(error)}`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= factor;
    }
  }
  throw new Error('Unreachable retry block');
}
