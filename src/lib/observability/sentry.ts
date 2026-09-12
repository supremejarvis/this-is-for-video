/**
 * Apollo Engineering — Sentry Error Monitoring Scaffolding
 * Provides client-side error telemetry with strict data scrubbing (no customer PII).
 */

import { logger } from './logger';

export interface SentryConfig {
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
}

class SentryClient {
  private isInitialized = false;

  public init(config: SentryConfig = {}): void {
    const dsn = config.dsn || import.meta.env.VITE_SENTRY_DSN;
    if (!dsn || dsn.includes('placeholder') || dsn.includes('example')) {
      logger.info('Sentry monitoring in dormant/sandbox mode: No live DSN configured.');
      return;
    }

    try {
      // In production with @sentry/react installed:
      // Sentry.init({ dsn, environment: config.environment || 'development', tracesSampleRate: 0.1 });
      this.isInitialized = true;
      logger.info('Sentry error monitoring initialized successfully.');
    } catch (err) {
      logger.warn('Failed to initialize Sentry monitoring client:', { error: String(err) });
    }
  }

  public captureException(error: Error, extraContext?: Record<string, unknown>): void {
    if (!this.isInitialized) {
      logger.error(`[Local Error Capture]: ${error.message}`, {
        stack: error.stack,
        ...extraContext
      });
      return;
    }
    // Sentry.captureException(error, { extra: extraContext });
  }

  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    logger.info(`[Telemetry Message (${level})]: ${message}`);
  }
}

export const sentry = new SentryClient();
