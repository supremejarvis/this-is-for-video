# Structure

**Analysis Date:** 2026-09-04

## Directory Layout

```
.
├── .agents/                 # Agent directives, skills, and configuration
├── .github/                 # GitHub workflows and CI pipelines
├── .planning/               # GSD planning artifacts, codebase maps, and phases
│   └── codebase/            # Evidence-backed codebase maps
├── public/                  # Static web assets (logos, icons, images)
├── src/                     # Frontend application source code
│   ├── components/          # Reusable React UI components
│   │   ├── admin/           # Admin dashboard, UPI approval, and inventory management
│   │   ├── auth/            # Mobile OTP modal and B2B GSTIN onboarding forms
│   │   ├── b2b/             # Wholesale tier grid, bulk calculators, and organization portal
│   │   ├── checkout/        # Multi-step checkout, pincode lookup, and payment selection
│   │   ├── logistics/       # India Post dispatch status, tracking viewer, and manifest print
│   │   ├── pages/           # View layouts (Home, PDP, Cart, Admin, Orders)
│   │   ├── reports/         # Financial, GST tax liability, and sales analytics charts
│   │   └── storefront/      # Product showcase, sizing guide, and hero features
│   ├── constants/           # Static lookup tables, pin code regex, and default settings
│   ├── data/                # Mock catalog datasets, variant definitions, and product specs
│   ├── lib/                 # Shared helper libraries and formatters
│   ├── services/            # API client adapters and third-party integrations
│   │   └── __tests__/       # Service unit tests (MSG91, CEPT, Razorpay, Logistics)
│   ├── store/               # Zustand state store (`useStore.ts`)
│   │   └── __tests__/       # Store action test suites
│   ├── types/               # TypeScript interface and type declarations
│   ├── utils/               # Tax, calculation, and string formatting utilities
│   │   └── __tests__/       # Calculation unit tests (`gstCalculations.test.ts`)
│   ├── App.tsx              # Root frontend application container and routing
│   ├── index.css            # Tailwind CSS styling tokens and base styles
│   └── main.tsx             # DOM entry point
├── backend/                 # [Target Architecture] Python FastAPI Authoritative Backend
│   ├── app/
│   │   ├── api/             # FastAPI API routers (v1: auth, products, orders, webhooks, logistics)
│   │   ├── core/            # Config, security, database session, and Decimal money engine
│   │   ├── models/          # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/         # Pydantic v2 schemas for request/response validation
│   │   └── services/        # Business logic, India Post CEPT adapter, Razorpay webhook verification
│   ├── alembic/             # Database version migrations
│   └── tests/               # Pytest test suite for Decimal money arithmetic & webhooks
├── AGENTS.md                # Apollo Engineering System Directives and operational rules
├── package.json             # Frontend dependencies and npm scripts
├── planning.md              # Master technical architecture and operational logic blueprint
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Bundler and dev server configuration
└── vitest.config.ts         # Vitest test configuration
```

## Key File Locations

**Entry Points:**
- `src/main.tsx` - Client DOM bootstrap and React tree mounting
- `src/App.tsx` - Main presentation shell and modal management

**State Management & Data Store:**
- `src/store/useStore.ts` - Comprehensive Zustand store for products, cart, B2B wholesale state, and admin sessions

**Business Logic & Integrations:**
- `src/services/ceptIndiaPostService.ts` - Official India Post CEPT REST API integration
- `src/services/logisticsService.ts` - Shipping rate computation with Kathwada GIDC origin (382430)
- `src/services/razorpayService.ts` - Razorpay checkout and client transaction handling
- `src/services/msg91OtpService.ts` - MSG91 OTP delivery and WhatsApp alerts
- `src/utils/gstCalculations.ts` - GST calculations, interstate IGST/CGST split, and B2B bulk tier savings

**Design & Aesthetics:**
- `src/index.css` - Theme colors (solar blue `#0054A6`, AISI SS304 steel tones) and responsive typography
- `src/components/ProductCard.tsx` - Product showcase with variant selector and solar frame sizing options

## Naming Conventions

- **Component Files:** PascalCase (e.g., `ProductCard.tsx`, `ComparisonTable.tsx`, `MobileOtpAuth.tsx`)
- **Service Files:** camelCase (e.g., `ceptIndiaPostService.ts`, `razorpayService.ts`)
- **Test Files:** `<name>.test.ts` placed in `__tests__/` subdirectories next to the source
- **Constants:** UPPER_SNAKE_CASE (e.g., `GST_RATE_PERCENT`, `KATHWADA_ORIGIN_PINCODE`)
