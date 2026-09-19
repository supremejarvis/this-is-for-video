/**
 * Environment variable type definitions for Next.js and client modules
 */

interface ImportMetaEnv {
  readonly VITE_MSG91_WIDGET_ID?: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
