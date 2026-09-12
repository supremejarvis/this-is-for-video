/**
 * Apollo Engineering Storage Migration Utility
 * 
 * Strict Privacy & Session Invariant:
 * Guarantees that legacy localStorage mock profiles, customer PII, addresses,
 * mock orders, and unauthenticated session tokens are completely purged.
 * 
 * Only guest preferences (e.g. language selection) and temporary active cart state
 * are permitted in client storage.
 */

const STORAGE_VERSION_KEY = 'apollo_storage_version';
const CURRENT_STORAGE_VERSION = '2.0.0';

export function runStorageMigration(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);

    if (currentVersion !== CURRENT_STORAGE_VERSION) {
      // List of legacy keys that held PII, mock sessions, or persistent customer state
      const piiKeysToPurge = [
        'apollo_session_24h',
        'apollo_users',
        'apollo_addresses',
        'apollo_billing_address',
        'apollo_shipping_address',
        'apollo_orders',
        'apollo_coupons',
        'apollo_returns',
        'apollo_current_user',
        'apollo_user_session',
        'ape-store-storage',
      ];

      piiKeysToPurge.forEach((key) => {
        localStorage.removeItem(key);
      });

      // Mark migration complete
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
    }
  } catch {
    // If localStorage is restricted or throws, safely ignore
  }
}
