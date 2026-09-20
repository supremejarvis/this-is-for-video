import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        # 1. Clean up encoding artifact in names if any
        await session.execute(text("UPDATE products SET name = REPLACE(name, '', '–') WHERE name LIKE '%%'"))
        # 2. Archive test products without deleting historic references
        r1 = await session.execute(text("UPDATE products SET is_active = false, is_archived = true WHERE sku_prefix LIKE 'TST-%' OR sku_prefix LIKE 'RET-%'"))
        r2 = await session.execute(text("UPDATE product_variants SET is_active = false, is_archived = true WHERE sku LIKE 'TST-%' OR sku LIKE 'RET-%' OR sku LIKE '%-RET-%'"))
        # 3. Ensure the 7 genuine products are marked PUBLISHED (is_active=True, is_archived=False)
        r3 = await session.execute(text("UPDATE products SET is_active = true, is_archived = false WHERE sku_prefix IN ('APE-SC', 'AE-SPRINKLER', 'AE-CLAMP-GI', 'AE-PIPE-FITTING', 'AE-PUMP-DC', 'AE-TIMER-AUTO', 'AE-KIT-FULL')"))
        r4 = await session.execute(text("UPDATE product_variants SET is_active = true, is_archived = false WHERE product_id IN (SELECT id FROM products WHERE sku_prefix IN ('APE-SC', 'AE-SPRINKLER', 'AE-CLAMP-GI', 'AE-PIPE-FITTING', 'AE-PUMP-DC', 'AE-TIMER-AUTO', 'AE-KIT-FULL'))"))
        await session.commit()
        print(f"Archived {r1.rowcount} test products and {r2.rowcount} test variants.")
        print(f"Ensured {r3.rowcount} real products and {r4.rowcount} real variants are PUBLISHED.")

if __name__ == "__main__":
    asyncio.run(main())
