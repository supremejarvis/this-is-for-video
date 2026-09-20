import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

statements = [
    """
    CREATE OR REPLACE FUNCTION check_journal_entry_balance()
    RETURNS TRIGGER AS $$
    DECLARE
        v_debit_total NUMERIC(14, 2);
        v_credit_total NUMERIC(14, 2);
        v_line_count INT;
    BEGIN
        IF NEW.status = 'POSTED' THEN
            SELECT COALESCE(SUM(debit), 0.00), COALESCE(SUM(credit), 0.00), COUNT(*)
            INTO v_debit_total, v_credit_total, v_line_count
            FROM journal_lines
            WHERE journal_entry_id = NEW.id;

            IF v_line_count < 2 THEN
                RAISE EXCEPTION 'Journal entry % cannot be posted with fewer than 2 lines (found %).', NEW.id, v_line_count;
            END IF;

            IF v_debit_total != v_credit_total THEN
                RAISE EXCEPTION 'Double-entry balance violation for journal entry %: Debit total (%) != Credit total (%).',
                    NEW.id, v_debit_total, v_credit_total;
            END IF;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """,
    "DROP TRIGGER IF EXISTS trg_check_journal_balance ON journal_entries",
    """
    CREATE TRIGGER trg_check_journal_balance
    AFTER INSERT OR UPDATE OF status ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION check_journal_entry_balance()
    """,
    """
    CREATE OR REPLACE FUNCTION prevent_posted_journal_modification()
    RETURNS TRIGGER AS $$
    DECLARE
        v_status TEXT;
        v_entry_id UUID;
    BEGIN
        v_entry_id := COALESCE(OLD.journal_entry_id, OLD.id);
        SELECT status INTO v_status FROM journal_entries WHERE id = v_entry_id;
        IF v_status = 'POSTED' THEN
            RAISE EXCEPTION 'Posted journal entries and their line items are strictly immutable. Create a linked reversal instead.';
        END IF;
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
    """,
    "DROP TRIGGER IF EXISTS trg_prevent_posted_line_edit ON journal_lines",
    """
    CREATE TRIGGER trg_prevent_posted_line_edit
    BEFORE UPDATE OR DELETE ON journal_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_posted_journal_modification()
    """
]

async def main():
    e = create_async_engine("postgresql+asyncpg://apollo_ecommerce:Goal%25495@127.0.0.1:5432/apollo_ecommerce")
    async with e.begin() as conn:
        for stmt in statements:
            clean = stmt.strip()
            if clean:
                await conn.execute(text(clean))
    print("PL/pgSQL triggers installed cleanly!")

if __name__ == "__main__":
    asyncio.run(main())
