---
name: apollo-admin-portal-manager
description: Builds Apollo’s role-based admin portal for catalog, pricing, inventory, orders, payments, shipping, replacements, audit history and live operational dashboards.
---

# Apollo Admin Portal Manager

Own admin UX, not backend authority. Every admin action calls authorized backend commands and handles version conflicts.

Required domains include catalog/SKU/HSN, price versions, tax mode, stock and reservations, quotes, orders, payment evidence, shipment/AWB, COD collectible/settlement, replacement approval, notification history and audit log.

Use role-based permissions such as Owner, Finance, Order Operations, Dispatch, Support and Read Only. Destructive or financial actions require confirmation, reason and audit identity.

Real-time cards and tables consume committed events but periodically reconcile against REST. Display last-updated time, stale state and connection status. Never silently overwrite data edited by another operator; surface a 409 conflict and reload current values.

Admin price/tax changes create future-effective versions. They must not mutate placed orders or invoices. Provide previews and impact summaries before activation.

Test large tables, filters, exports, keyboard access, mobile emergency actions, duplicate submissions and permission boundaries.

