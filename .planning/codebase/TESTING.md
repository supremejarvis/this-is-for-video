# Testing

**Analysis Date:** 2026-09-04

## Framework & Tooling

**Frontend Testing Stack:**
- Test Runner: Vitest 3.0.7 (`vitest.config.ts`)
- DOM Environment: `jsdom` 26.0.0
- Assertion Library: Vitest built-in assertions + `@testing-library/jest-dom` 6.6.3
- Component Testing: `@testing-library/react` 16.2.0

**Target End-to-End Testing Stack:**
- Playwright - Headless browser automation for verifying B2C customer checkout, B2B wholesale quotation requests, admin UPI approval, and India Post label generation.

**Target Backend Testing Stack:**
- Pytest - Python testing framework for FastAPI endpoints, SQLAlchemy models, and Alembic migrations.
- Pytest boundary and unit tests for Decimal money arithmetic, GST calculations, and Razorpay HMAC signature validation.

## Test Structure & Organization

```
src/
├── services/
│   └── __tests__/
│       ├── apiService.test.ts           # Centralized API service and network resilience tests
│       ├── ceptIndiaPostService.test.ts # CEPT India Post official REST API tests
│       ├── logisticsService.test.ts     # Domestic shipping rate and Kathwada hub (382430) tests
│       └── msg91OtpService.test.ts      # MSG91 OTP delivery and WhatsApp alert tests
├── store/
│   └── __tests__/
│       └── useStore.test.ts             # Zustand cart, B2B wholesale state, and UI state tests
└── utils/
    └── __tests__/
        └── gstCalculations.test.ts      # Tax rate, IGST/CGST split, and B2B savings calculation tests
```

## Running Tests

**Frontend Commands:**
```bash
# Run all unit and service tests once
npm run test:run

# Run tests in watch mode during development
npm test

# Generate coverage report
npm run test:coverage
```

**Target Backend Commands:**
```bash
# Run pytest test suite
pytest -v

# Run financial arithmetic tests specifically
pytest tests/test_money_calculations.py -v
```

## Coverage & Test Verification

**Current Test Suite Status (Vitest):**
- 8 Test Files (57 total tests) - 100% Passing.
- Coverage Highlights:
  - **India Post Speed Post Logistics**: Validates Kathwada origin hub mapping (`382430`), distance slab classification, fallback domestic rate tables, and CEPT token refresh flows.
  - **MSG91 Integrated Communications**: Validates OTP generation, SMS retry, Voice retry, and WhatsApp notification payloads.
  - **GST & Tax Engine**: Validates 18% inclusive and exclusive tax breakdowns, intra-state (CGST + SGST) vs. inter-state (IGST) split, and B2B bulk tier volume discounts.
  - **Zustand Store**: Validates cart addition, quantity updates, wholesale tier toggling, and customer session state.

## Boundary & Financial Test Requirements

As specified in the system directives, all pricing, tax, and fee calculations must be covered by comprehensive unit and boundary tests:
1. **Zero Quantity & Negative Values**: Prevent negative cart amounts or zero-quantity orders.
2. **Rounding Multiples**: Ensure COD totals round upward only according to the admin-configured rounding multiple (e.g., nearest ₹1 or ₹5).
3. **Paisa Precision**: Verify that converting between rupee decimals and paise preserves exact values with zero precision loss.
4. **Interstate vs. Intrastate Tax**: Verify that Gujarat (State Code 24) customers receive 9% CGST + 9% SGST, while out-of-state customers receive 18% IGST.
