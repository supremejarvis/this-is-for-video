# 📡 Apollo Engineering Enterprise Event Catalog & Delivery Guarantees

**Version:** 1.0.0  
**Transport:** PostgreSQL Transactional Outbox + HTTP Webhooks / Background Workers  
**Delivery Semantics:** At-Least-Once Delivery with Idempotent Consumer Processing  

---

## 1. Standard Event Envelope Schema

Every domain event emitted across Apollo Engineering's microservices adheres to this canonical JSON contract:

```json
{
  "event_id": "c73a218c-76b1-482a-9824-9f201083981a",
  "event_type": "inventory.reserved.v1",
  "schema_version": 1,
  "company_id": "00000000-0000-0000-0000-000000000001",
  "aggregate_type": "order",
  "aggregate_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "aggregate_version": 2,
  "occurred_at": "2026-09-20T04:30:00.000Z",
  "correlation_id": "a3573697-424c-4e23-9afe-8d7f75c00a27",
  "causation_id": "e8a91176-d06e-4731-b844-38682e8da040",
  "actor_id": "00000000-0000-0000-0000-000000000002",
  "payload": {
    "order_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "reservation_ids": ["f293b6e8-0a0e-4361-9c60-8488eefd7e01"]
  }
}
```

---

## 2. Event Registry

| Event Type | Producer Service | Consumer Service(s) | Business Trigger | Idempotency Key Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `catalog.product.published.v1` | Catalog | Storefront Cache, Search Index | Product marked live with approved price & active variant | `event_id` |
| `catalog.variant.updated.v1` | Catalog | Pricing, Inventory | Variant dimensions or pack size changed | `event_id` |
| `pricing.rule.changed.v1` | Pricing | Orders (Active Quotes) | Price list tier or tax rule updated | `event_id` |
| `inventory.reserved.v1` | Inventory | Orders Saga | Stock successfully locked for order | `order_id + aggregate_version` |
| `inventory.released.v1` | Inventory | Orders Saga | Reservation expired or order cancelled | `order_id + aggregate_version` |
| `inventory.dispatched.v1` | Inventory | Accounting, Shipping | Stock physically left Kathwada warehouse | `order_id + shipment_id` |
| `inventory.low_stock.v1` | Inventory | Notifications, Factory Reorder | Available stock dropped below safety threshold | `sku + date` |
| `order.confirmed.v1` | Orders | Payments, Shipping, Notifications | Payment captured or COD authorized | `order_number` |
| `order.cancelled.v1` | Orders | Inventory, Payments, Accounting | Order cancelled before dispatch | `order_number + cancellation_id` |
| `payment.captured.v1` | Payments | Orders Saga, Accounting | Razorpay webhook signature verified | `provider_payment_id` |
| `payment.refund.succeeded.v1`| Payments | Orders Saga, Accounting | Razorpay refund processed | `provider_refund_id` |
| `shipment.booked.v1` | Shipping | Orders, Notifications | AWB generated from carrier API | `awb_number` |
| `shipment.delivered.v1` | Shipping | Orders, Accounting (COD) | Courier marked consignment delivered | `awb_number + status` |
| `return.inspected.v1` | Shipping / Returns | Inventory, Accounting | Vernier caliper photo approved; disposition decided | `return_case_id` |
| `accounting.invoice.issued.v1`| Accounting | Orders, Customer Email | Gapless tax invoice generated | `invoice_number` |
| `accounting.journal.posted.v1`| Accounting | Reporting Projections | Balanced double-entry entry posted | `journal_entry_id` |

---

## 3. Transactional Outbox Pattern & Reliability Guarantees

1. **Transactional Coupling**: The business state update and the `outbox_events` record are written in the exact same local PostgreSQL database transaction. If the transaction rolls back, no event is ever recorded.
2. **Relay Worker**: The `OutboxPublisherWorker` polls `outbox_events` where `published_at IS NULL` with `FOR UPDATE SKIP LOCKED` to prevent concurrent worker contention.
3. **At-Least-Once Delivery**: Events are marked `published_at = NOW()` only after successful acknowledgment from the message broker or destination service.
4. **Inbox Deduplication**: Consumers atomically write to `inbox_events(consumer_name, event_id, processed_at)` within their own local business transaction. Repeated event deliveries are silently ignored.
