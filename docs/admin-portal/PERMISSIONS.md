# 🔐 Apollo Engineering Role-Based Access Control (RBAC) & Permissions

**Authoritative Security Matrix**  
**Default Policy:** Deny by Default  

---

## 1. System Roles Definition

| Role Code | Role Name | Purpose & Operational Scope |
| :--- | :--- | :--- |
| `OWNER` | Super Admin / Business Owner | Unrestricted access across all domains, financial configurations, credential rotation, and override approvals. |
| `CATALOG_MANAGER` | Product & Merchandising Manager | Product catalog, variant combination generation, category taxonomies, and media management. Cannot alter cost prices or post journals. |
| `SALES` | Sales & Customer Operations | View quotes, orders, customer profiles, apply approved discounts, and manage sizing inquiries. Cannot alter prices directly or approve refunds. |
| `ACCOUNTS` | Finance & Statutory Accounts | Invoices, credit notes, general ledger journal entries, payment reconciliations, GSTR-1, and fiscal period locks. Cannot alter stock items directly. |
| `INVENTORY_MANAGER` | Warehouse & Production Manager | Physical stock tracking, receipts, adjustments, transfers, and inventory valuations. Cannot modify payment allocations or statutory invoices. |
| `DISPATCH` | Logistics & Dispatch Operator | Packing queues, package dimensions, carrier quotes, thermal label generation, and manifest handover. Cannot modify pricing or customer financial data. |
| `AUDITOR` | Read-Only Compliance Auditor | Read-only access across all ledgers, audit logs, order histories, and reports. Zero write, approve, or export capabilities. |

---

## 2. Granular Permission Matrix

| Permission Code | Description | OWNER | CATALOG | SALES | ACCOUNTS | INVENTORY | DISPATCH | AUDITOR |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `catalog:product:create` | Create new base products | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `catalog:product:publish` | Publish product to live store | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `catalog:variant:generate`| Generate Cartesian combinations | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `pricing:cost:view` | View manufacturer unit cost | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `pricing:rule:create` | Create or update price tiers | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `pricing:override:apply` | Apply custom order discount | ✅ | ❌ | ⚠️ Req. Appr. | ❌ | ❌ | ❌ | ❌ |
| `inventory:stock:adjust` | Manual stock balance adjust | ✅ | ❌ | ❌ | ❌ | ⚠️ Req. Appr. | ❌ | ❌ |
| `inventory:transfer:create`| Warehouse internal transfer | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `order:confirm` | Authorize / confirm order | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `order:cancel` | Cancel order & release stock | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `shipping:book` | Book courier with carrier | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `shipping:label:print` | Print thermal shipping label | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `returns:caliper:inspect` | Inspect vernier caliper proof | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `returns:approve` | Approve replacement dispatch | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `payment:refund:issue` | Trigger payment refund | ✅ | ❌ | ❌ | ⚠️ Req. Appr. | ❌ | ❌ | ❌ |
| `accounting:invoice:issue`| Issue statutory tax invoice | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `accounting:journal:post` | Post double-entry journal | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `accounting:period:lock` | Lock/Unlock fiscal period | ✅ | ❌ | ❌ | ⚠️ Super Admin | ❌ | ❌ | ❌ |
| `reports:gstr1:export` | Export GSTR-1 Excel / CSV | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `system:audit_log:view` | Inspect system audit trail | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Approval Workflows & Limits

1. **Self-Approval Prohibition**: An actor cannot approve their own discount, adjustment, or refund request. Requester ID and Approver ID must be distinct (`requester_id != approver_id`).
2. **Threshold Approvals**:
   * Order discount exceeding ₹500 or 10% requires `OWNER` approval.
   * Inventory balance adjustment exceeding 50 units or ₹5,000 value requires `OWNER` approval.
   * Refund exceeding ₹2,000 requires `OWNER` approval.
3. **Audit Redaction**: All audit logs redact sensitive customer PII (credit card info, raw OTP, JWT tokens, carrier credentials) before persisting into `audit_logs`.
