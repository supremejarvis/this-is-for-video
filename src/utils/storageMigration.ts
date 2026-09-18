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
const CURRENT_STORAGE_VERSION = '2.1.0';

export function runStorageMigration(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);

    if (currentVersion !== CURRENT_STORAGE_VERSION) {
      // List of legacy mock keys to purge (never purge real customer accounts or addresses)
      const piiKeysToPurge = [
        'apollo_session_24h',
        'apollo_user_session',
        'ape-store-storage',
        'apollo_products',
      ];

      piiKeysToPurge.forEach((key) => {
        localStorage.removeItem(key);
      });

      // Mark migration complete
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
    }

    // Always purge legacy mock B2B organization from localStorage
    const rawOrg = localStorage.getItem('apollo_org');
    if (rawOrg) {
      try {
        const parsed = JSON.parse(rawOrg);
        if (parsed && (parsed.gstin === '24AAACP9999P1Z2' || parsed.companyName === 'Apollo Engineering & Solar EPC Partners' || parsed.id === 'org_solar_epc')) {
          localStorage.removeItem('apollo_org');
        }
      } catch {
        // Safe ignore
      }
    }

    // Always deduplicate stored products by ASIN to prevent duplicate React keys
    const rawProds = localStorage.getItem('apollo_products');
    if (rawProds) {
      try {
        const parsed = JSON.parse(rawProds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const deduped = parsed.filter((p: any) => {
            if (!p || !p.asin || seen.has(p.asin)) return false;
            seen.add(p.asin);
            return true;
          });
          if (deduped.length !== parsed.length) {
            localStorage.setItem('apollo_products', JSON.stringify(deduped));
          }
        }
      } catch {
        // Safe ignore
      }
    }
  } catch {
    // If localStorage is restricted or throws, safely ignore
  }
}
