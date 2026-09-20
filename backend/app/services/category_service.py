"""Category taxonomy service with DAG cycle detection and tree building."""
import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog_advanced import Category, CategoryStatus
from app.schemas.catalog_advanced import CategoryCreate, CategoryTreeResponse, CategoryUpdate


class CycleDetectedException(Exception):
    """Raised when category parent assignment creates a directed cyclic graph."""
    pass


class CategoryNotFoundException(Exception):
    """Raised when category does not exist."""
    pass


class DuplicateSlugException(Exception):
    """Raised when category slug already exists for the company."""
    pass


class CategoryService:
    """Enterprise Category Hierarchy Service."""

    @classmethod
    async def list_categories(
        cls,
        db: AsyncSession,
        company_id: uuid.UUID,
        include_archived: bool = False,
    ) -> Sequence[Category]:
        stmt = select(Category).where(Category.company_id == company_id)
        if not include_archived:
            stmt = stmt.where(Category.status == CategoryStatus.ACTIVE)
        stmt = stmt.order_by(Category.name.asc())
        return (await db.execute(stmt)).scalars().all()

    @classmethod
    async def get_category_by_id(
        cls,
        db: AsyncSession,
        company_id: uuid.UUID,
        category_id: uuid.UUID,
    ) -> Category | None:
        stmt = select(Category).where(Category.company_id == company_id, Category.id == category_id)
        return (await db.execute(stmt)).scalar_one_or_none()

    @classmethod
    async def create_category(
        cls,
        db: AsyncSession,
        company_id: uuid.UUID,
        data: CategoryCreate,
    ) -> Category:
        # Check slug uniqueness
        slug_stmt = select(Category).where(
            Category.company_id == company_id,
            Category.slug == data.slug,
        )
        if (await db.execute(slug_stmt)).scalar_one_or_none():
            raise DuplicateSlugException(f"Category slug '{data.slug}' already exists.")

        # Validate parent exists and belongs to company
        if data.parent_id:
            parent = await cls.get_category_by_id(db, company_id, data.parent_id)
            if not parent:
                raise CategoryNotFoundException(f"Parent category '{data.parent_id}' not found.")

        category = Category(
            id=uuid.uuid4(),
            company_id=company_id,
            parent_id=data.parent_id,
            name=data.name.strip(),
            slug=data.slug.strip(),
            status=data.status,
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    @classmethod
    async def update_category(
        cls,
        db: AsyncSession,
        company_id: uuid.UUID,
        category_id: uuid.UUID,
        data: CategoryUpdate,
    ) -> Category:
        cat = await cls.get_category_by_id(db, company_id, category_id)
        if not cat:
            raise CategoryNotFoundException("Category not found.")

        if data.slug and data.slug != cat.slug:
            slug_stmt = select(Category).where(
                Category.company_id == company_id,
                Category.slug == data.slug,
                Category.id != category_id,
            )
            if (await db.execute(slug_stmt)).scalar_one_or_none():
                raise DuplicateSlugException(f"Category slug '{data.slug}' already in use.")
            cat.slug = data.slug

        if data.parent_id is not None:
            if data.parent_id == category_id:
                raise CycleDetectedException("Category cannot be its own parent.")
            
            # Walk up from target parent to root to ensure category_id is not an ancestor
            curr_parent_id: uuid.UUID | None = data.parent_id
            visited: set[uuid.UUID] = {category_id}
            while curr_parent_id is not None:
                if curr_parent_id in visited:
                    raise CycleDetectedException(f"Hierarchy cycle detected: category '{category_id}' is an ancestor of '{data.parent_id}'.")
                visited.add(curr_parent_id)
                p = await cls.get_category_by_id(db, company_id, curr_parent_id)
                if not p:
                    raise CategoryNotFoundException(f"Parent category '{curr_parent_id}' does not exist.")
                curr_parent_id = p.parent_id

            cat.parent_id = data.parent_id

        if data.name:
            cat.name = data.name.strip()
        if data.status:
            cat.status = data.status

        await db.commit()
        await db.refresh(cat)
        return cat

    @classmethod
    async def get_tree(
        cls,
        db: AsyncSession,
        company_id: uuid.UUID,
    ) -> list[dict]:
        all_cats = await cls.list_categories(db, company_id)
        by_id = {c.id: {"id": c.id, "name": c.name, "slug": c.slug, "status": c.status, "parent_id": c.parent_id, "children": []} for c in all_cats}
        root_nodes = []
        for c in all_cats:
            node = by_id[c.id]
            if c.parent_id and c.parent_id in by_id:
                by_id[c.parent_id]["children"].append(node)
            else:
                root_nodes.append(node)
        return root_nodes
