/**
 * Apollo Engineering Unified Application Constants
 * Single Source of Truth for Logistics, GST, and Origin Facility Hub
 */

export const ORIGIN_HUB_PINCODE = '382430';
export const ORIGIN_HUB_NAME = 'APOLLO KATHWADA FACTORY HUB S.O.';
export const ORIGIN_STATE_CODE = '24';
export const ORIGIN_STATE_NAME = 'Gujarat';
export const ORIGIN_CITY = 'Ahmedabad';
export const ORIGIN_ADDRESS = '100 / Gopinath Industrial Landmark, Kathwada GIDC, Ahmedabad, Gujarat - 382430';

export const COMPANY_LEGAL_NAME = 'Apollo Engineering';
export const COMPANY_DOMAIN = 'www.apolloengineering.co.in';
export const COMPANY_PHONE = '+91 85116 26267';
export const COMPANY_EMAIL = 'admin@apolloengineering.co.in';

export const DEFAULT_GST_RATE_PERCENT = 18;
export const HSN_SPRINKLERS = '84248990';
export const HSN_SS304_CLIPS = '73269099';

export const SPEED_POST_SLA_DAYS = {
  LOCAL: '1-2 Business Days',
  METRO: '2-3 Business Days',
  INTRA_STATE: '2-3 Business Days',
  REST_OF_INDIA: '3-5 Business Days',
} as const;

// ─────────────────────────────────────────────────────────────
// OFFICIAL CEPT INDIA POST LOGISTICS CONSTANTS (Client-Safe)
// (All private carrier authentication credentials execute strictly on FastAPI backend)
// ─────────────────────────────────────────────────────────────
export const CEPT_CONFIG = {
  originPincode: ORIGIN_HUB_PINCODE,
  originHubName: ORIGIN_HUB_NAME,
};

// ─────────────────────────────────────────────────────────────
// MSG91 OTP & WHATSAPP CONFIGURATION (Client-Safe)
// (Private MSG91 Auth Keys reside strictly on FastAPI backend; OTP flows route through /api/v1/auth/otp)
// ─────────────────────────────────────────────────────────────
export const MSG91_CONFIG = {
  widgetId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_WIDGET_ID) || '',
  senderId: 'APLENG',
  whatsappNumber: '918511626267',
  whatsappTemplateName: 'apollo_engineering',
};

// ─────────────────────────────────────────────────────────────
// OFFICIAL RAZORPAY PAYMENT GATEWAY CONFIG (Client-Safe)
// (Public Key ID only for modal checkout; orders, signatures & webhooks on backend)
// ─────────────────────────────────────────────────────────────
export const RAZORPAY_CONFIG = {
  keyId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAZORPAY_KEY_ID) || '',
  merchantName: 'Apollo Engineering',
  themeColor: '#0054A6'
};
