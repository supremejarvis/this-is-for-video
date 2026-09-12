# Technology Stack

**Analysis Date:** 2026-09-04

## Languages

**Primary:**
- TypeScript 5.8.2 - Used across all current frontend application code in `src/`
- Python 3.12+ (Architecture Mandate) - Target language for the authoritative backend API service (`FastAPI`)

**Secondary:**
- JavaScript (ES Modules, Node.js tooling) - Build and configuration tooling (`vite.config.ts`, `vitest.config.ts`)
- SQL / PostgreSQL DDL - Database schema definitions, Alembic migrations, PostgreSQL 16+ enterprise single source of truth

## Runtime

**Environment:**
- Node.js 20.x / 22.x - Build, bundling, and client-side development server environment
- Python 3.12+ (CPython / Uvicorn / Gunicorn) - Authoritative backend execution runtime for FastAPI
- Operating System: Windows (Target: Linux/Docker for containerized deployment)

**Package Manager:**
- npm 10.x - Frontend dependency management with `package-lock.json` present
- pip / poetry / uv - Python backend dependency management

## Frameworks

**Core:**
- React 19.0.0 - Declarative UI library with React 19 Actions and modern state capabilities
- Current Client Host: Vite 6.2.0 - Fast HMR client dev bundler
- Target Frontend Architecture: Next.js App Router (React 19 + TypeScript + Tailwind CSS) as mandated by system directives
- Backend Architecture: Python FastAPI ONLY - Single authoritative backend for authentication, pricing calculations, PostgreSQL persistence, webhooks, and India Post logistics

**State & Styling:**
- Tailwind CSS 4.1.14 - Utility-first styling with `@tailwindcss/vite`
- Zustand 5.0.15 - Centralized client-side state store (`src/store/useStore.ts`)
- Lucide React 0.546.0 - Icon set for industrial engineering and e-commerce UI
- Motion (Framer Motion) 12.23.24 - UI micro-interactions and transitions

**Testing:**
- Vitest 3.0.7 - Unit and integration testing engine for frontend services and stores
- Testing Library (React 16.2.0, Jest DOM 6.6.3) - Component and store verification
- Playwright (Target) - End-to-end user journey validation (B2C, B2B, Admin, Checkout)
- Pytest (Target) - Strict Decimal boundary and unit tests for FastAPI pricing calculations

## Key Dependencies

**Critical:**
- `zustand` (v5.0.15) - In-memory client cart, B2B wholesale state, and UI sessions (`src/store/useStore.ts`)
- `lucide-react` (v0.546.0) - High-density industrial e-commerce icons
- `jspdf` (v4.2.1) & `html-to-image` (v1.11.13) - Client-side quotation and invoice/spec PDF generation (`src/components/PdfCatalog.tsx`)
- `canvas-confetti` (v1.9.4) - Order celebration animation

**Infrastructure & Tooling:**
- `@tailwindcss/vite` (v4.1.14) & `tailwindcss` (v4.1.14) - CSS compilation
- `typescript` (v5.8.2) - Strict static type checking (`tsconfig.json`)
- `vitest` (v3.0.7) - Unit test runner configured in `vitest.config.ts`

## Configuration

**Environment:**
- `.env` & `.env.example` - Client & service environment secrets (Razorpay API keys, MSG91 auth credentials, CEPT India Post API endpoints, Origin Pincode)
- Authoritative origin pincode: `382430` (Kathwada GIDC, Ahmedabad)

**Build:**
- `vite.config.ts` - Client dev server, port 3000, host binding 0.0.0.0, and Tailwind plugin
- `tsconfig.json` - Strict TypeScript compiler options with DOM and ES2022 libs

## Platform Requirements

**Development:**
- Node.js >= 20.0.0
- Python >= 3.12
- PostgreSQL 16 Enterprise instance
- Modern Browser with ES2022+ support (Chromium, Firefox, Safari)

**Production:**
- Vercel / Cloudflare Edge presentation layer for Next.js App Router
- FastAPI container (Docker/Uvicorn) with PostgreSQL connection pooling (PgBouncer)
