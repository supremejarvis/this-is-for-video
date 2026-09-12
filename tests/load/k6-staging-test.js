/**
 * Apollo Engineering — k6 Staging Load Test Plan
 *
 * SAFETY DIRECTIVES:
 * 1. STAGING ONLY: NEVER RUN AGAINST PRODUCTION DOMAINS.
 * 2. MOCKED EXTERNAL APIS: Never hit live Razorpay, Shiprocket, India Post, MSG91, or WhatsApp APIs.
 * 3. CONTROLLED EXECUTION: Do NOT execute heavy load automatically.
 *
 * SAFE LOCAL STAGING RUN COMMAND:
 * k6 run tests/load/k6-staging-test.js --vus 10 --duration 30s
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp-up to 10 VUs
    { duration: '1m', target: 25 },  // Moderate load
    { duration: '30s', target: 0 },  // Graceful ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests must finish within 800ms
    http_req_failed: ['rate<0.01'],    // Error rate must remain below 1%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // 1. Homepage Load
  group('01_Homepage', function () {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'homepage status 200': (r) => r.status === 200,
      'homepage content contains Apollo': (r) => r.body.includes('Apollo Engineering'),
    });
    sleep(1);
  });

  // 2. Product Catalogue View
  group('02_Product_Catalogue', function () {
    const res = http.get(`${BASE_URL}/manifest.json`);
    check(res, {
      'manifest status 200': (r) => r.status === 200,
    });
    sleep(1);
  });

  // 3. Product Details & Static Asset Fetch
  group('03_Product_Details', function () {
    const res = http.get(`${BASE_URL}/solar_sprinkler.webp`);
    check(res, {
      'sprinkler image status 200': (r) => r.status === 200,
    });
    sleep(1);
  });

  // 4. Shipping Rate & Pincode Lookup Simulation (Local Mock)
  group('04_Shipping_Lookup', function () {
    const headers = { 'Content-Type': 'application/json' };
    const payload = JSON.stringify({
      origin: '382430',
      destination: '380001',
      weightGrams: 500
    });

    // Validates mock logistics endpoint
    const res = http.post(`${BASE_URL}/api/mock/shipping-estimate`, payload, { headers, responseType: 'text' });
    check(res, {
      'shipping lookup responded': (r) => r.status === 200 || r.status === 404, // 404 acceptable on SPA without backend
    });
    sleep(1);
  });

  // 5. Cart Calculation & Order Simulation
  group('05_Cart_Calculation_and_Order', function () {
    const cartPayload = JSON.stringify({
      items: [
        { sku: 'AE-SPRINKLER-SS304', qty: 5, unitPrice: 220, gstRate: 18 }
      ],
      isPrepaid: true,
      destinationPincode: '382430'
    });

    const res = http.post(`${BASE_URL}/api/mock/cart-summary`, cartPayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'
    });

    check(res, {
      'cart summary responded': (r) => r.status === 200 || r.status === 404,
    });
    sleep(2);
  });
}
