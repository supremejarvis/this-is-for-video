CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_price_version_currency_inr'
    ) THEN
        ALTER TABLE price_versions ADD CONSTRAINT ck_price_version_currency_inr CHECK (currency = 'INR');
    END IF;
END $$;

ALTER TABLE price_versions DROP CONSTRAINT IF EXISTS uq_price_version_no_overlap;
ALTER TABLE price_versions ADD CONSTRAINT uq_price_version_no_overlap
EXCLUDE USING gist (
    variant_id WITH =,
    currency WITH =,
    channel WITH =,
    min_quantity WITH =,
    tax_mode WITH =,
    tstzrange(valid_from, COALESCE(valid_to, 'infinity'::timestamptz), '[)') WITH &&
);

CREATE OR REPLACE FUNCTION prevent_update_or_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is strictly append-only: UPDATE and DELETE operations are forbidden.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auth_audit_logs_append_only ON auth_audit_logs;
CREATE TRIGGER trg_auth_audit_logs_append_only
BEFORE UPDATE OR DELETE ON auth_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

DROP TRIGGER IF EXISTS trg_inventory_movements_append_only ON inventory_movements;
CREATE TRIGGER trg_inventory_movements_append_only
BEFORE UPDATE OR DELETE ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();
