# 📊 Apollo Engineering Statutory Accounting & Double-Entry General Ledger Rules

**Jurisdiction:** Republic of India (GST / State Code: 24 - Gujarat)  
**Standard:** Double-Entry Bookkeeping & Ind AS  

---

## 1. Statutory Chart of Accounts (COA)

| Account Code | Account Name | Account Type | Normal Balance | Description |
| :--- | :--- | :--- | :---: | :--- |
| `1010` | HDFC Bank Operating Account | Asset | Debit | Primary business bank account for payouts & collections |
| `1020` | Razorpay Gateway Clearing | Asset | Debit | In-transit customer payments captured by Razorpay |
| `1030` | India Post COD Courier Clearing | Asset | Debit | In-transit COD payments collected by postal mail carrier |
| `1110` | Accounts Receivable (B2C & B2B) | Asset | Debit | Amounts due from customers for issued invoices |
| `1210` | Finished Goods Inventory (SS304 Drain Clips) | Asset | Debit | Physical inventory asset valued at moving average cost |
| `2010` | Accounts Payable (Suppliers) | Liability | Credit | Obligations due to steel mills & packaging vendors |
| `2050` | Customer Advances | Liability | Credit | Unapplied customer payments received prior to invoice |
| `2110` | Output CGST Payable (9%) | Liability | Credit | Central GST collected on intra-state Gujarat sales |
| `2120` | Output SGST Payable (9%) | Liability | Credit | State GST collected on intra-state Gujarat sales |
| `2130` | Output IGST Payable (18%) | Liability | Credit | Integrated GST collected on inter-state sales across India |
| `4010` | Sales Revenue - Products | Revenue | Credit | Gross revenue recognized upon consignment dispatch |
| `4020` | Shipping & Handling Revenue | Revenue | Credit | Shipping fee collected from buyers |
| `4030` | COD Convenience Fee Revenue | Revenue | Credit | 2.5% surcharge collected on Cash-on-Delivery orders |
| `5010` | Cost of Goods Sold (COGS) | Expense | Debit | Raw material and manufacturing cost of dispatched stock |
| `5020` | Freight & Courier Delivery Expense | Expense | Debit | Actual postage charges billed by India Post Speed Post |
| `5030` | Payment Gateway Transaction Fees | Expense | Debit | Razorpay processing fee (2% + 18% GST on fee) |

---

## 2. Statutory Invoice Numbering Rules

1. **Format**: `APE/{FY}/{SEQUENCE}` (e.g. `APE/26-27/0001`).
2. **Reset**: Sequence resets to `0001` on April 1st of every Indian Financial Year.
3. **Sequential & Gapless**: Invoice sequence must be strictly sequential. Voided numbers are never deleted; they are marked `VOID` with a mandatory reason.
4. **Place of Supply**:
   * Intra-state (Gujarat PIN codes: `360xxx` to `396xxx`): CGST 9% + SGST 9%.
   * Inter-state (All other Indian states): IGST 18%.

---

## 3. Standard Journal Postings & Lifecycle

### Scenario A: Order Dispatch & Invoice Issuance (e.g., ₹1,180 Total, Intra-state)

* **Dr Accounts Receivable (`1110`)**: ₹1,180.00
* **Cr Sales Revenue (`4010`)**: ₹1,000.00
* **Cr Output CGST (`2110`)**: ₹90.00
* **Cr Output SGST (`2120`)**: ₹90.00

### Scenario B: Inventory Relief on Dispatch (Cost of goods ₹400)

* **Dr Cost of Goods Sold (`5010`)**: ₹400.00
* **Cr Finished Goods Inventory (`1210`)**: ₹400.00

### Scenario C: Payment Capture via Razorpay

* **Dr Razorpay Gateway Clearing (`1020`)**: ₹1,180.00
* **Cr Accounts Receivable (`1110`)**: ₹1,180.00

### Scenario D: Gateway Settlement to Bank (with ₹20 fee + ₹3.60 GST)

* **Dr HDFC Bank Operating Account (`1010`)**: ₹1,156.40
* **Dr Payment Gateway Fees (`5030`)**: ₹20.00
* **Dr Input CGST/SGST on Fees (`1310`)**: ₹3.60
* **Cr Razorpay Gateway Clearing (`1020`)**: ₹1,180.00

### Scenario E: COD Collection Handover & Remittance

1. **On Carrier Delivery Confirmation**:
   * **Dr India Post COD Clearing (`1030`)**: ₹1,180.00
   * **Cr Accounts Receivable (`1110`)**: ₹1,180.00
2. **On Postal Department Remittance Cheque/NEFT**:
   * **Dr HDFC Bank (`1010`)**: ₹1,130.00
   * **Dr Courier Freight Expense (`5020`)**: ₹50.00
   * **Cr India Post COD Clearing (`1030`)**: ₹1,180.00

---

## 4. Reconciliations & Integrity Checks

1. **Trial Balance Invariant**:
   $$\sum \text{All Debits} \equiv \sum \text{All Credits}$$
2. **Inventory Roll-Forward Invariant**:
   $$\text{Opening Stock} + \text{Receipts} + \text{Accepted Returns} + \text{Adjustments} - \text{Dispatches} \equiv \text{Closing Stock}$$
3. **Cash vs. Profit Isolation**: Net profit from P&L reflects recognized revenues less expenses and COGS; operating cash balance in bank accounts reflects liquid funds. Neither is ever confused with the other.
