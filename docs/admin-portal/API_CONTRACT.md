# 📡 Apollo Engineering Enterprise API Contract

**API Version Prefix:** `/api/v1`  
**Authentication:** Secure HTTP-only Session Cookie (`apollo_session`) or Bearer Token with CSRF Protection (`X-CSRF-Token`)  
**Data Serialization:** Strict JSON (Decimals as numeric strings e.g. `"1180.00"`)  

---

## 1. Standard Error Envelope

Every client error (4xx) and server error (5xx) adheres to this standard response schema:

```json
{
  "error": {
    "code": "DOUBLE_ENTRY_UNBALANCED",
    "message": "Debit total (1180.00) does not equal Credit total (1000.00).",
    "details": [
      {
        "field": "lines",
        "issue": "Unbalanced journal lines"
      }
    ],
    "request_id": "req_1789878551426_ymxwkzr"
  }
}
```

---

## 2. Admin & Seller Endpoints Specification

### 2.1 Catalog & Taxonomy Endpoints

#### `GET /api/v1/admin/categories`
* **Permission**: `catalog:category:read`
* **Response**: `200 OK` -> List of categories with nested children or parent references.

#### `POST /api/v1/admin/categories`
* **Permission**: `catalog:category:create`
* **Request**: `{"name": "Fasteners", "slug": "fasteners", "parent_id": null}`
* **Validation**: Cycle check prevents cyclic DAG parent-child loops.
* **Response**: `201 Created`

#### `GET /api/v1/admin/products/{id}/variants/preview`
* **Permission**: `catalog:variant:read`
* **Query**: `axes=frame_thickness,pack_size`
* **Response**: `200 OK` -> Cartesian combination preview with existing/missing variant status.

#### `POST /api/v1/admin/products/{id}/variants/generate`
* **Permission**: `catalog:variant:generate`
* **Request**: `{"combinations": [{"sku": "APE-DC-30-P1", "options": {"frame_thickness": "30mm", "pack_size": 1}}]}`
* **Response**: `201 Created` -> Generated variant records with canonical `combination_key`.

---

### 2.2 Pricing & Tax Rules Endpoints

#### `GET /api/v1/admin/price-lists`
* **Permission**: `pricing:list:read`
* **Response**: `200 OK` -> Array of price lists with customer group linkages and status.

#### `POST /api/v1/admin/price-rules`
* **Permission**: `pricing:rule:create`
* **Request**:
  ```json
  {
    "price_list_id": "00000000-0000-0000-0000-000000000001",
    "variant_id": "00000000-0000-0000-0000-000000000002",
    "min_qty": 100,
    "max_qty_exclusive": 500,
    "unit_price": "18.50",
    "valid_from": "2026-09-20T00:00:00Z"
  }
  ```
* **Response**: `201 Created`

---

### 2.3 Warehouses & Inventory Endpoints

#### `GET /api/v1/admin/inventory/balances`
* **Permission**: `inventory:balance:read`
* **Query**: `warehouse_id`, `sku`, `status`
* **Response**: `200 OK` -> Paginated inventory balances with `on_hand`, `reserved`, `quarantined`, and `available`.

#### `POST /api/v1/admin/inventory/adjustments`
* **Permission**: `inventory:stock:adjust`
* **Request**:
  ```json
  {
    "stock_item_id": "00000000-0000-0000-0000-000000000005",
    "quantity_delta": 50,
    "reason": "Factory shipment received and counted"
  }
  ```
* **Guard**: If delta > 50 units or value > ₹5,000, routes to `approval_requests` unless called by `OWNER`.
* **Response**: `200 OK` or `202 Accepted` (Pending approval).

#### `POST /api/v1/admin/inventory/transfers`
* **Permission**: `inventory:transfer:create`
* **Request**: `{"from_warehouse_id": "...", "to_warehouse_id": "...", "items": [{"variant_id": "...", "quantity": 100}]}`
* **Response**: `201 Created`

---

### 2.4 Orders & Fulfillment Saga Endpoints

#### `POST /api/v1/admin/orders/{id}/confirm`
* **Permission**: `order:confirm`
* **Preconditions**: Verified payment captured or approved COD policy.
* **Emitted Event**: `order.confirmed.v1`
* **Response**: `200 OK`

#### `POST /api/v1/admin/orders/{id}/cancel`
* **Permission**: `order:cancel`
* **Preconditions**: Order not yet dispatched.
* **Compensation**: Triggers stock release and refund workflow.
* **Emitted Event**: `order.cancelled.v1`
* **Response**: `200 OK`

---

### 2.5 Shipping & Logistics Endpoints

#### `POST /api/v1/admin/shipping/quotes`
* **Permission**: `shipping:quote:read`
* **Request**: `{"order_id": "...", "destination_pincode": "380015", "weight_g": 250, "service_code": "SPEED_POST"}`
* **Response**: `200 OK` -> Carrier breakdown: base freight, packaging overhead, and statutory 18% shipping GST.

#### `POST /api/v1/admin/shipments/{id}/book`
* **Permission**: `shipping:book`
* **Header**: `Idempotency-Key: uuid`
* **Preconditions**: Order status `CONFIRMED`.
* **Behavior**: Communicates with India Post Speed Post CEPT API. On network timeout, reconciles before re-issuing booking.
* **Response**: `200 OK` -> AWB number, routing quadrant, and thermal label printable URL.

---

### 2.6 Returns & Inspection Endpoints

#### `POST /api/v1/admin/returns/{id}/inspect`
* **Permission**: `returns:caliper:inspect`
* **Request**:
  ```json
  {
    "caliper_photo_url": "https://media.apolloengineering.co.in/proofs/vernier_caliper_30mm.jpg",
    "verified_frame_thickness_mm": "30.00",
    "disposition": "RESTOCK_INVENTORY",
    "decision": "APPROVE"
  }
  ```
* **Response**: `200 OK` -> Updates case to `APPROVED`, enables replacement consignment dispatch.

---

### 2.7 Statutory Accounting & General Ledger Endpoints

#### `POST /api/v1/admin/accounting/journals`
* **Permission**: `accounting:journal:post`
* **Request**:
  ```json
  {
    "posting_date": "2026-09-20",
    "period_id": "00000000-0000-0000-0000-000000000020",
    "source_type": "MANUAL",
    "source_id": "ADJ-2026-01",
    "description": "Opening balance adjustment",
    "lines": [
      {"account_id": "...", "debit": "1000.00", "credit": "0.00"},
      {"account_id": "...", "debit": "0.00", "credit": "1000.00"}
    ]
  }
  ```
* **Guards**:
  * Period must not be `LOCKED` (422 Unprocessable Entity).
  * Debit total must exactly match Credit total (422 Unprocessable Entity).
  * Lines must be one-sided (400 Bad Request).
* **Response**: `201 Created`

#### `POST /api/v1/admin/accounting/periods/{id}/lock`
* **Permission**: `accounting:period:lock` (Requires `OWNER` role)
* **Response**: `200 OK` -> Fiscal period marked `LOCKED`; subsequent postings rejected.

#### `GET /api/v1/admin/reports/{report_name}`
* **Permission**: `reports:view`
* **Supported Reports**: `trial_balance`, `profit_and_loss`, `balance_sheet`, `gstr1`, `inventory_valuation`.
* **Response**: `200 OK` -> Authoritative balanced ledger report with data freshness disclosure.
