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
// OFFICIAL CEPT INDIA POST CREDENTIALS & PRODUCTION CONFIG
// ─────────────────────────────────────────────────────────────
export const CEPT_CONFIG = {
  apiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INDIA_POST_API_URL) || 'https://test.cept.gov.in/beextcustomer',
  username: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INDIA_POST_USERNAME) || '1812232688',
  password: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INDIA_POST_PASSWORD) || 'Dop@1234',
  customerId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INDIA_POST_CUSTOMER_ID) || '9999265476',
  contractId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INDIA_POST_CONTRACT_ID) || '41636817',
  dropoffOfficeId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INDIA_POST_DROPOFF_OFFICE_ID) || '21260024',
  originPincode: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INDIA_POST_ORIGIN_PINCODE) || '382430',
};

// ─────────────────────────────────────────────────────────────
// OFFICIAL MSG91 OTP & WHATSAPP CONFIGURATION
// ─────────────────────────────────────────────────────────────
export const MSG91_CONFIG = {
  authKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_AUTH_KEY) || '561266ADmXXclWZ6a81f661P1',
  widgetId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_WIDGET_ID) || '366870717636393531363136',
  widgetToken: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_WIDGET_TOKEN) || '561266TAI7tBdjX5u6a897391P1',
  templateId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_TEMPLATE_ID) || '6a986d4effc61fd8910a4952',
  whatsappTemplateName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_WHATSAPP_TEMPLATE_NAME) || 'apollo_engineering',
  whatsappTemplateId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_WHATSAPP_TEMPLATE_ID) || '518153',
  whatsappNamespace: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_WHATSAPP_NAMESPACE) || 'a225b704_bbce_431d_88b8_eb274ab72abf',
  wabaId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_WABA_ID) || '101033892701102',
  senderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_SENDER_ID) || 'APLENG',
  whatsappNumber: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_WHATSAPP_NUMBER) || '918511626267',
  otpUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MSG91_OTP_URL) || 'https://control.msg91.com/api/v5/otp',
};

// ─────────────────────────────────────────────────────────────
// OFFICIAL RAZORPAY LIVE PRODUCTION PAYMENT GATEWAY CONFIG
// (Public Key ID only; private secrets belong strictly on backend)
// ─────────────────────────────────────────────────────────────
export const RAZORPAY_CONFIG = {
  keyId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAZORPAY_KEY_ID) || 'rzp_live_TPhyOgY7jM1yqR',
  merchantName: 'Apollo Engineering',
  themeColor: '#0054A6'
};
