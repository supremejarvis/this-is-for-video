"""RBAC Matrix and Security Guard Tests for all 7 Roles."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.auth import AuthAuditLog, UserRole
from app.services.auth_service import AuthService

async_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingAsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(autouse=True)
async def setup_database():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with TestingAsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


async def login_as_role(client: AsyncClient, db_session: AsyncSession, role: UserRole) -> tuple[str, str]:
    """Helper: create user with role, log in, and return email and csrf_token."""
    email = f"{role.value.lower()}@ape-store.com"
    password = "StrongPassword2026!"
    await AuthService.create_user(
        db=db_session,
        email=email,
        password=password,
        full_name=f"User {role.value}",
        role=role,
    )
    # Clear any leftover login failures
    await db_session.execute(delete(AuthAuditLog).where(AuthAuditLog.email_attempted == email))
    await db_session.commit()

    res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for role {role}: {res.text}"
    return email, res.json()["csrf_token"]


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected_with_401(client):
    """Security Invariant: Any protected endpoint without session cookie must return 401."""
    res = await client.get("/api/v1/admin/users")
    assert res.status_code == 401
    assert "Missing session cookie" in res.json()["detail"]


@pytest.mark.asyncio
async def test_csrf_missing_or_mismatched_rejected_with_403(client, db_session):
    """Security Invariant: State-modifying requests without valid CSRF header must return 403."""
    _, _csrf = await login_as_role(client, db_session, UserRole.OWNER)

    # 1. Missing header
    res_missing = await client.post(
        "/api/v1/admin/users",
        json={
            "email": "newbie@ape-store.com",
            "password": "Password123456!",
            "full_name": "Newbie",
            "role": "SUPPORT",
        },
    )
    assert res_missing.status_code == 403
    assert "CSRF" in res_missing.json()["detail"]

    # 2. Tampered header
    res_tampered = await client.post(
        "/api/v1/admin/users",
        headers={"x-csrf-token": "bad_csrf_token_value"},
        json={
            "email": "newbie@ape-store.com",
            "password": "Password123456!",
            "full_name": "Newbie",
            "role": "SUPPORT",
        },
    )
    assert res_tampered.status_code == 403
    assert "CSRF" in res_tampered.json()["detail"]


@pytest.mark.asyncio
async def test_owner_role_can_create_and_list_users(client, db_session):
    """RBAC Invariant: OWNER role has full permission to provision users and view users."""
    _, csrf = await login_as_role(client, db_session, UserRole.OWNER)

    # Create new user
    create_res = await client.post(
        "/api/v1/admin/users",
        headers={"x-csrf-token": csrf},
        json={
            "email": "ops@ape-store.com",
            "password": "StrongPassword2026!",
            "full_name": "Operations Lead",
            "role": "ORDER_OPERATIONS",
        },
    )
    assert create_res.status_code == 201
    assert create_res.json()["role"] == "ORDER_OPERATIONS"

    # List users
    list_res = await client.get("/api/v1/admin/users")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 2


@pytest.mark.asyncio
async def test_auditor_role_is_strictly_read_only(client, db_session):
    """RBAC Invariant: AUDITOR role can list users (read-only) but CANNOT create users."""
    _, csrf = await login_as_role(client, db_session, UserRole.AUDITOR)

    # List users (allowed)
    list_res = await client.get("/api/v1/admin/users")
    assert list_res.status_code == 200

    # Create user (forbidden)
    create_res = await client.post(
        "/api/v1/admin/users",
        headers={"x-csrf-token": csrf},
        json={
            "email": "auditor_created@ape-store.com",
            "password": "StrongPassword2026!",
            "full_name": "Auditor Created",
            "role": "SUPPORT",
        },
    )
    assert create_res.status_code == 403
    assert "Insufficient privileges" in create_res.json()["detail"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "role",
    [
        UserRole.CATALOG_MANAGER,
        UserRole.INVENTORY_MANAGER,
        UserRole.ORDER_OPERATIONS,
        UserRole.FINANCE,
        UserRole.SUPPORT,
    ],
)
async def test_other_roles_cannot_access_user_management(client, db_session, role):
    """RBAC Invariant: Operational roles cannot access user administration endpoints."""
    _, csrf = await login_as_role(client, db_session, role)

    # Attempt list users -> 403
    list_res = await client.get("/api/v1/admin/users")
    assert list_res.status_code == 403
    assert "Insufficient privileges" in list_res.json()["detail"]

    # Attempt create user -> 403
    create_res = await client.post(
        "/api/v1/admin/users",
        headers={"x-csrf-token": csrf},
        json={
            "email": f"hacked_{role.value}@ape-store.com",
            "password": "StrongPassword2026!",
            "full_name": "Unauthorized",
            "role": "OWNER",
        },
    )
    assert create_res.status_code == 403
    assert "Insufficient privileges" in create_res.json()["detail"]
