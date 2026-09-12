# 🏛️ Apollo Engineering — Python FastAPI Backend Tooling Plan

## Executive Summary
This document specifies the authoritative, production-grade quality, testing, and security toolchain for the forthcoming Python FastAPI backend. Per system directives, **FastAPI is the sole authoritative backend** and the single source of truth for pricing, statutory GST calculation, inventory, and order transitions.

---

## 1. Core Tooling Stack & Configuration

| Tool | Version / Standard | Exact Purpose |
| :--- | :--- | :--- |
| **pytest** | `^8.3.0` | Primary test execution engine and fixture manager. |
| **pytest-asyncio** | `^0.24.0` | Native asynchronous test execution for FastAPI async endpoints. |
| **pytest-cov** | `^5.0.0` | Test coverage reporting (Strict Gate: $\ge 90\%$ branch coverage on pricing/billing). |
| **HTTPX AsyncClient** | `^0.27.0` | High-performance in-memory ASGI test client for full route invocation. |
| **Ruff** | `^0.6.0` | Ultra-fast linter & code formatter (replaces Flake8, Black, isort). |
| **mypy** | `^1.11.0` | Strict static type checking (`--strict`, `disallow_untyped_defs = true`). |
| **pip-audit** | `^2.7.0` | Automated Python vulnerability scanning against PyPI Advisory Database. |
| **Schemathesis** | `^3.35.0` | Property-based contract testing driven by FastAPI's auto-generated OpenAPI schema. |

---

## 2. Tooling Configuration Templates

### A. `pyproject.toml`
```toml
[tool.pytest.ini_options]
minversion = "8.0"
addopts = "-ra -q --cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=90"
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py312"
select = ["E", "F", "I", "B", "UP", "S", "PT", "SIM", "RUF"]
ignore = ["E501"]

[tool.ruff.per-file-ignores]
"tests/*" = ["S101", "S106"]  # Allow assert and hardcoded test tokens in tests

[tool.mypy]
python_version = "3.12"
strict = true
disallow_untyped_defs = true
disallow_any_generics = true
warn_redundant_casts = true
warn_unused_ignores = true
plugins = ["pydantic.mypy"]
```

---

## 3. Mandatory Test Matrix & Edge-Case Coverage

Every statutory and e-commerce rule defined in [`AGENTS.md`](../AGENTS.md) must be strictly verified by backend unit and integration tests:

### 1. Negative & Zero Quantities
- **Test:** Submit checkout payload with `quantity = 0`, `quantity = -5`, or non-integer floating values.
- **Assertion:** HTTP 422 Unprocessable Entity with Pydantic validation error (`Input should be greater than 0`).

### 2. Invalid Product Sizes
- **Test:** Submit variant order with non-standard frame thickness (e.g. `25mm` or `45mm`).
- **Assertion:** HTTP 422 Unprocessable Entity (`Invalid size. Must be one of: 28mm, 30mm, 33mm, 35mm, 40mm`).

### 3. Invalid Delivery PIN Code
- **Test:** Submit delivery PIN code outside Indian Post numbering (e.g. `000000`, `999999`, `ABCD12`, `12345`).
- **Assertion:** HTTP 422 with regex pattern validation (`^\d{6}$`) and service check verifying speed post serviceability.

### 4. Duplicate Order Submission & Idempotency
- **Test:** Send identical `idempotency_key` twice within 10 minutes.
- **Assertion:** Second request returns the exact cached order response without re-charging or creating redundant database rows.

### 5. Price Manipulation from Frontend
- **Test:** Send checkout payload where client injects unit price `₹1.00` instead of catalog price `₹220.00`.
- **Assertion:** FastAPI backend completely ignores frontend client price, re-fetching authoritative price from PostgreSQL via SKU.

### 6. Invalid Payment Signatures
- **Test:** Send mismatched Razorpay signature HMAC SHA256 against `order_id|payment_id`.
- **Assertion:** HTTP 400 Bad Request (`Invalid payment signature`). Order remains `PAYMENT_PENDING`.

### 7. Duplicate Webhook Delivery
- **Test:** Deliver the same Razorpay webhook payload twice (`event_id` replay).
- **Assertion:** System returns HTTP 200 OK immediately upon detecting existing `event_id` in database idempotency ledger.

### 8. Unauthorized Admin Access
- **Test:** Invoke `/api/v1/admin/*` endpoints without bearer token or with customer JWT.
- **Assertion:** HTTP 401 Unauthorized or HTTP 403 Forbidden.

### 9. Invalid Order State Transitions
- **Test:** Attempt to transition order directly from `DRAFT` $\to$ `DISPATCHED` or `DELIVERED` $\to$ `PAYMENT_PENDING`.
- **Assertion:** State machine raises `InvalidStateTransitionError` with HTTP 409 Conflict.

---

## 4. Schemathesis OpenAPI Contract Testing Execution
FastAPI exposes the OpenAPI JSON contract automatically at `/openapi.json`. Schemathesis will run fuzz tests to ensure strict conformity:

```bash
schemathesis run http://localhost:8000/openapi.json \
  --checks all \
  --hypothesis-max-examples=100 \
  --validate-schema=true
```
