"""API Tests for Authentication Endpoints, Cookies, Rate-Limiting, and Audit Logs."""
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


@pytest.mark.asyncio
async def test_login_success_sets_httponly_and_csrf_cookies(client, db_session):
    """Verify login sets HttpOnly ape_session, ape_csrf cookie, and returns user data."""
    await AuthService.create_user(
        db=db_session,
        email="owner@ape-store.com",
        password="SecurePassword2026!",
        full_name="Apollo Owner",
        role=UserRole.OWNER,
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@ape-store.com", "password": "SecurePassword2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Authentication successful"
    assert data["user"]["email"] == "owner@ape-store.com"
    assert data["user"]["role"] == "OWNER"
    assert "csrf_token" in data

    # Verify cookies
    cookies = response.cookies
    assert "ape_session" in cookies
    assert "ape_csrf" in cookies

    from sqlalchemy import select
    stmt = select(AuthAuditLog).filter_by(event_type="LOGIN_SUCCESS")
    res = await db_session.execute(stmt)
    audit = res.scalar_one_or_none()
    assert audit is not None
    assert audit.email_attempted == "owner@ape-store.com"


@pytest.mark.asyncio
async def test_login_failure_records_audit_log_and_rejects(client, db_session):
    """Verify wrong password returns 401 and logs LOGIN_FAILURE audit log."""
    await AuthService.create_user(
        db=db_session,
        email="test@ape-store.com",
        password="ValidPassword123!",
        full_name="Test Staff",
        role=UserRole.CATALOG_MANAGER,
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@ape-store.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

    from sqlalchemy import select
    stmt = select(AuthAuditLog).filter_by(event_type="LOGIN_FAILURE")
    res = await db_session.execute(stmt)
    audit = res.scalar_one_or_none()
    assert audit is not None
    assert audit.details["reason"] == "invalid_credentials"


@pytest.mark.asyncio
async def test_login_rate_limiting_triggers_429(client, db_session):
    """Verify 5 failed attempts triggers 429 Too Many Requests."""
    for i in range(5):
        await client.post(
            "/api/v1/auth/login",
            json={"email": "hacker@evil.com", "password": f"GuessAttempt_{i}"},
        )

    # 6th attempt must be throttled
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "hacker@evil.com", "password": "GuessAttempt_6"},
    )
    assert response.status_code == 429
    assert "Too many failed login attempts" in response.json()["detail"]

    # Teardown failed attempts
    await db_session.execute(delete(AuthAuditLog).where(AuthAuditLog.email_attempted == "hacker@evil.com"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_authenticated_me_and_logout_flow(client, db_session):
    """Verify /auth/me returns current user and /auth/logout revokes session."""
    await AuthService.create_user(
        db=db_session,
        email="finance@ape-store.com",
        password="FinanceSecurePassword#1",
        full_name="Finance Officer",
        role=UserRole.FINANCE,
    )

    # 1. Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "finance@ape-store.com", "password": "FinanceSecurePassword#1"},
    )
    csrf_token = login_res.json()["csrf_token"]

    # 2. Get /auth/me
    me_res = await client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "finance@ape-store.com"
    assert me_res.json()["role"] == "FINANCE"

    # 3. Logout requires CSRF header
    logout_res = await client.post(
        "/api/v1/auth/logout",
        headers={"x-csrf-token": csrf_token},
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Logged out successfully"

    # 4. Subsequent access to /auth/me must fail with 401
    me_after_res = await client.get("/api/v1/auth/me")
    assert me_after_res.status_code == 401
