# 🛡️ Apollo Engineering Operations & Incident Response Runbook

**Environment:** Local Development, Docker Staging & Vercel / Cloud Production  
**Support Email:** `admin@apolloengineering.co.in`  
**Origin Distribution Hub:** Kathwada GIDC, Ahmedabad `382430`  

---

## 1. System Health Telemetry & Readiness Probes

### Health Check Endpoints

* **FastAPI Application Health**: `GET /api/v1/health`
  * Returns: `{"status": "healthy"}`
* **System Detailed Telemetry**: `GET /api/v1/system/status`
  * Returns circuit breaker statuses, database pool metrics, and background worker state.
* **Database Readiness**:
  ```bash
  docker exec apollo_postgres_prod pg_isready -h 127.0.0.1 -p 5432 -U apollo_ecommerce
  ```

---

## 2. Background Workers & Outbox Management

### Starting Background Workers

The background worker manager runs in-process with FastAPI during standard operation:
* `OutboxPublisherWorker`: Polls unsent outbox events every 2 seconds.
* `ExpiredQuoteCleaner`: Releases uncommitted quotes older than 15 minutes.
* `InvoiceWorker`: Generates PDF and tax records for confirmed dispatches.

### Inspecting Worker Lag

```sql
SELECT count(*) AS pending_outbox_events, min(created_at) AS oldest_pending_event
FROM outbox_events
WHERE published_at IS NULL;
```
If `oldest_pending_event` is > 60 seconds old, check worker logs for network timeouts or destination broker unavailability.

---

## 3. Incident Playbooks

### Incident A: Payment Succeeded but Stock Reservation Expired

* **Detection**: Customer payment verified via Razorpay webhook, but order remains in `AWAITING_PAYMENT` or saga state indicates `RESERVATION_EXPIRED`.
* **Action**:
  1. Open Admin Portal -> Orders -> Final Orders.
  2. Inspect Order details. If current physical stock is available, click **Reallocate Stock & Confirm Order**.
  3. If stock is depleted, click **Initiate Immediate Refund** to return funds to customer via Razorpay API.

### Incident B: Unbalanced Journal Entry Attempt

* **Detection**: Error logged: `DB Constraint: sum(debit) != sum(credit)`.
* **Action**:
  1. Check `docs/admin-portal/ACCOUNTING_RULES.md` for proper double-entry accounting formulas.
  2. Inspect the failed source document (invoice or payment receipt).
  3. Correct line items on the draft journal before re-posting.

### Incident C: Carrier Booking Failure or Unknown Status Timeout

* **Detection**: Consignment booking timed out without AWB assignment.
* **Action**:
  1. Open Admin Portal -> Shipping -> Dispatch Console.
  2. Click **Reconcile Booking Status**. The system queries the carrier API with the persistent `booking_idempotency_key`.
  3. If carrier already booked the consignment, the existing AWB is recorded. If carrier has no record, retry booking is enabled.
