/**
 * Apollo Engineering — Production Structured Logger
 * Provides JSON-formatted logging with correlation IDs and strict PII redaction.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId: string;
  context?: Record<string, unknown>;
}

class StructuredLogger {
  private correlationId: string;

  constructor() {
    this.correlationId = this.generateCorrelationId();
  }

  public generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  public getCorrelationId(): string {
    return this.correlationId;
  }

  private redactSensitive(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!data) return undefined;
    const sensitiveKeys = ['phone', 'mobile', 'address', 'password', 'token', 'secret', 'photo', 'image', 'pan', 'aadhaar', 'signature'];
    const sanitized: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(data)) {
      if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) {
        sanitized[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        sanitized[k] = this.redactSensitive(v as Record<string, unknown>);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: StructuredLogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      context: this.redactSensitive(context)
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case 'debug':
        if (import.meta.env?.DEV) console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  public error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }
}

export const logger = new StructuredLogger();
