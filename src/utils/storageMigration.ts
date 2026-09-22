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
const CURRENT_STORAGE_VERSION = '3.1.0'; // Bumped to purge stale mock users (Nilesh Patel) and mock addresses

export function runStorageMigration(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);

    if (currentVersion !== CURRENT_STORAGE_VERSION) {
      // List of legacy mock keys and unverified session data to purge
      const piiKeysToPurge = [
        'apollo_session_24h',
        'apollo_user_session',
        'ape-store-storage',
        'apollo_products',
        'apollo_deleted_products', // Stale mock product deletion tracking
        'apollo_current_user',
        'apollo_users',
        'apollo_addresses',
        'apollo_shipping_address',
        'apollo_billing_address',
      ];

      piiKeysToPurge.forEach((key) => {
        localStorage.removeItem(key);
      });

      // Mark migration complete
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
    }

    // Always purge legacy mock user if present in localStorage (e.g. Nilesh Patel, u_epc_procure)
    const rawUser = localStorage.getItem('apollo_current_user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (
          !parsed ||
          !parsed.id ||
          parsed.id === 'usr_guest' ||
          String(parsed.id).startsWith('u_') ||
          parsed.id === 'u_epc_procure' ||
          (parsed.name && String(parsed.name).includes('Nilesh')) ||
          (parsed.email && String(parsed.email).includes('apolloengineering.co.in'))
        ) {
          localStorage.removeItem('apollo_current_user');
        }
      } catch {
        localStorage.removeItem('apollo_current_user');
      }
    }

    // Always purge legacy mock addresses (e.g. Nilesh Patel / Kathwada mock address)
    const rawAddresses = localStorage.getItem('apollo_addresses');
    if (rawAddresses) {
      try {
        const parsed = JSON.parse(rawAddresses);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((addr: any) => {
            if (!addr || !addr.id) return false;
            if (
              (addr.fullName && String(addr.fullName).includes('Nilesh')) ||
              String(addr.id).startsWith('addr_epc_') ||
              addr.userId === 'u_epc_procure'
            ) {
              return false;
            }
            return true;
          });
          if (cleaned.length === 0) {
            localStorage.removeItem('apollo_addresses');
            localStorage.removeItem('apollo_shipping_address');
            localStorage.removeItem('apollo_billing_address');
          } else if (cleaned.length !== parsed.length) {
            localStorage.setItem('apollo_addresses', JSON.stringify(cleaned));
          }
        }
      } catch {
        localStorage.removeItem('apollo_addresses');
      }
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
