# 🛠️ Apollo Engineering Database Migration Runbook

**Alembic Target Revision:** `009_admin_enterprise_system.py`  
**Database:** PostgreSQL 16 (Single Source of Truth)  
**Safety Rules:** Zero historic ID loss, non-destructive column additions, backward-compatible defaults.  

---

## 1. Pre-Migration Checklist

1. **Verify Database Health**:
   ```bash
   docker exec apollo_postgres_prod pg_isready -U apollo_ecommerce -d apollo_ecommerce
   ```
2. **Snapshot Pre-Migration Database Backup**:
   ```bash
   docker exec -t apollo_postgres_prod pg_dump -U apollo_ecommerce -d apollo_ecommerce -F c -b -v -f /tmp/backup_pre_009.dump
   ```
3. **Inspect Current Alembic Revision**:
   ```bash
   cd backend
   .venv\Scripts\python -m alembic current
   ```
   Must display `008_order_address_and_customer_persistence`.

---

## 2. Migration Execution Steps

1. **Apply Migration**:
   ```bash
   cd backend
   .venv\Scripts\python -m alembic upgrade head
   ```
2. **Apply PostgreSQL Constraint Triggers**:
   ```bash
   docker exec -i apollo_postgres_prod psql -U apollo_ecommerce -d apollo_ecommerce -f backend/setup_postgres_constraints.sql
   ```
3. **Verify Upgraded Schema**:
   ```bash
   .venv\Scripts\python -m alembic current
   ```
   Must display `009_admin_enterprise_system (head)`.

---

## 3. Rollback Procedure

If any anomaly occurs during migration:
1. **Downgrade Schema**:
   ```bash
   .venv\Scripts\python -m alembic downgrade 008_order_address_and_customer_persistence
   ```
2. **Restore from Snapshot (If Data Was Corrupted)**:
   ```bash
   docker exec -i apollo_postgres_prod pg_restore -U apollo_ecommerce -d apollo_ecommerce -v --clean /tmp/backup_pre_009.dump
   ```
