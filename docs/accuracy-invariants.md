# Apollo Accuracy Invariants

These invariants are release-blocking and must be enforced by code, database constraints and tests where applicable.

## Money and tax

- Authoritative amounts never use binary floating point.
- An order payable equals its persisted product, tax, shipping, shipping-tax, discount and surcharge breakdown under the stored calculation version.
- Shipping tax equals the approved rate applied to the stored base shipping charge.
- COD payable is greater than or equal to the raw prepaid-plus-COD amount and follows the stored upward-rounding multiple.
- A placed order replays to the identical amount from its snapshot.
- Refund allocations never exceed captured funds.

## Order and payment

- No order is fulfilled from an unverified client callback.
- A paid order has verified provider evidence whose amount and currency match the order.
- The same provider event cannot be applied twice.
- Every order transition is allowed by the state machine and audited.
- Direct UPI evidence cannot auto-approve payment.

## Inventory

- Available inventory cannot be negative.
- Stock movement balance equals opening plus receipts minus reservations/fulfillment plus releases/adjustments.
- Expired reservations are released once.
- Duplicate requests cannot create duplicate reservations or decrements.

## Shipping and COD

- A shipment belongs to one approved order or replacement case.
- AWB identity is unique per active shipment.
- COD collectible equals the stored order COD payable unless an audited adjustment exists.
- Courier settlement differences are visible and classified; they are never silently discarded.

## Catalog and admin

- Admin changes create new versions and never rewrite placed-order snapshots.
- Stale admin writes are rejected rather than silently overwriting newer values.
- Every privileged mutation records actor, timestamp, reason and before/after references.

## Real-time projections

- No event is published before its business transaction commits.
- Every consumer is idempotent.
- Buyer/admin projections can be rebuilt from authoritative state.
- A lost real-time connection recovers by cursor or REST refetch.

## Required property tests

Generate boundary values for quantity, unit price, tax rate, shipping charge, discounts, COD rate and rounding multiple. Test deterministic replay, monotonic charges, non-negative components, maximum supported totals, half-paise boundaries and concurrent duplicate submissions.

