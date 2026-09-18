import base64
import hashlib
import hmac
import struct
import time

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.auth import AuthAuditLog, User, UserRole, UserSession
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
    
    # Disable rate limiting for tests by patching limiter
    from app.core.rate_limiter import limiter
    # Patch the limit method to do nothing
    original_limit = limiter.limit
    limiter.limit = lambda *args, **kwargs: lambda f: f
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://testserver") as ac:
        yield ac
    
    # Restore
    limiter.limit = original_limit
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


def get_totp_code(secret: str, offset: int = 0) -> str:
    """Helper to compute valid RFC 6238 TOTP code."""
    clean_secret = secret.strip().upper().replace(" ", "")
    padding = (8 - len(clean_secret) % 8) % 8
    key = base64.b32decode(clean_secret + "=" * padding)
    current_t = int((time.time() + offset) // 30)
    msg = struct.pack(">Q", current_t)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset_val = h[-1] & 0x0F
    binary = struct.unpack(">I", h[offset_val:offset_val+4])[0] & 0x7FFFFFFF
    return str(binary % 1000000).zfill(6)


@pytest.mark.asyncio
async def test_admin_login_success_and_failures(client, db_session, monkeypatch):
    """Verify admin login with TOTP: pre-existing user required, wrong password, wrong TOTP."""
    from app.core.config import settings
    from app.core.security import hash_password

    test_password = "SuperAdminPassword#2026"
    test_secret = "JBSWY3DPEHPK3PXP"
    test_email = "admin@apolloengineering.co.in"

    monkeypatch.setattr(settings, "ADMIN_PASSWORD_HASH", hash_password(test_password))
    monkeypatch.setattr(settings, "ADMIN_TOTP_SECRET", test_secret)

    # Pre-seed OWNER user in database (Login NEVER auto-provisions)
    await AuthService.create_user(
        db=db_session,
        email=test_email,
        password=test_password,
        full_name="Apollo Admin",
        role=UserRole.OWNER,
    )

    valid_totp = get_totp_code(test_secret)
    invalid_totp = "999999" if valid_totp != "999999" else "888888"

    # 1. Wrong Password -> 401
    res_bad_pw = await client.post(
        "/api/v1/auth/admin-login",
        json={"email": test_email, "password": "WrongPassword123!", "totp_code": valid_totp},
    )
    assert res_bad_pw.status_code == 401
    assert "Invalid credentials" in res_bad_pw.json()["detail"]

    # 2. Wrong TOTP -> 401
    res_bad_totp = await client.post(
        "/api/v1/auth/admin-login",
        json={"email": test_email, "password": test_password, "totp_code": invalid_totp},
    )
    assert res_bad_totp.status_code == 401
    assert "Invalid credentials" in res_bad_totp.json()["detail"]

    # 3. Correct Password + Correct TOTP -> 200 Success
    res_ok = await client.post(
        "/api/v1/auth/admin-login",
        json={"email": test_email, "password": test_password, "totp_code": valid_totp},
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert "Super Admin authenticated" in data["message"]
    assert data["user"]["email"] == test_email
    assert data["user"]["role"] == "OWNER"
    assert "ape_session" in res_ok.cookies
    assert "ape_csrf" in res_ok.cookies


@pytest.mark.asyncio
async def test_admin_login_denies_universal_bypass_and_old_backdoor(client, db_session, monkeypatch):
    """Security Invariant (P0-002 Regression): Universal TOTP codes and NIL@apl321 must fail closed."""
    from app.core.config import settings
    from app.core.security import hash_password

    test_password = "StrictOwnerPassword#2026"
    test_secret = "JBSWY3DPEHPK3PXP"
    test_email = "owner-security@apolloengineering.co.in"

    monkeypatch.setattr(settings, "ADMIN_PASSWORD_HASH", hash_password(test_password))
    monkeypatch.setattr(settings, "ADMIN_TOTP_SECRET", test_secret)

    # Pre-seed existing active OWNER user
    await AuthService.create_user(
        db=db_session,
        email=test_email,
        password=test_password,
        full_name="Strict Security Owner",
        role=UserRole.OWNER,
    )

    valid_totp = get_totp_code(test_secret)

    # 1. Universal TOTP code 123456 must FAIL closed with 401
    res_bypass_1 = await client.post(
        "/api/v1/auth/admin-login",
        json={"email": test_email, "password": test_password, "totp_code": "123456"},
    )
    assert res_bypass_1.status_code == 401
    assert "Invalid credentials" in res_bypass_1.json()["detail"]

    # 2. Universal TOTP code 000000 must FAIL closed with 401
    res_bypass_2 = await client.post(
        "/api/v1/auth/admin-login",
        json={"email": test_email, "password": test_password, "totp_code": "000000"},
    )
    assert res_bypass_2.status_code == 401
    assert "Invalid credentials" in res_bypass_2.json()["detail"]

    # 3. Old emergency backdoor password (NIL@apl321) must FAIL closed with 401
    res_old_pass = await client.post(
        "/api/v1/auth/admin-login",
        json={"email": test_email, "password": "NIL@apl321", "totp_code": valid_totp},
    )
    assert res_old_pass.status_code == 401
    assert "Invalid credentials" in res_old_pass.json()["detail"]


# ==============================================================================
# Dedicated P0-003 Security Regression Test Suite
# ==============================================================================

@pytest.mark.asyncio
async def test_p0_003_a_unknown_email_rejects_and_leaves_user_count_unchanged(client, db_session):
    """TEST P0-003-A: Unknown email + any password -> HTTP 401 and user count unchanged."""
    # Record initial user count
    users_before = (await db_session.execute(select(func.count(User.id)))).scalar()

    unknown_email = "nonexistent-attacker@external.com"
    response = await client.post(
        "/api/v1/auth/admin-login",
        json={
            "email": unknown_email,
            "password": "AnyArbitraryPassword123!",
            "totp_code": "654321",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"

    # User count must be completely unchanged
    users_after = (await db_session.execute(select(func.count(User.id)))).scalar()
    assert users_after == users_before

    # Verify no User record was created
    created_user = (await db_session.execute(select(User).where(User.email == unknown_email))).scalar_one_or_none()
    assert created_user is None


@pytest.mark.asyncio
async def test_p0_003_b_unknown_email_with_valid_password_creates_no_owner(client, db_session, monkeypatch):
    """TEST P0-003-B: Unknown email + valid ADMIN_PASSWORD_HASH + valid TOTP -> HTTP 401, NO OWNER created."""
    from app.core.config import settings
    from app.core.security import hash_password

    master_password = "MasterAdminPassword#2026"
    admin_secret = "JBSWY3DPEHPK3PXP"
    monkeypatch.setattr(settings, "ADMIN_PASSWORD_HASH", hash_password(master_password))
    monkeypatch.setattr(settings, "ADMIN_TOTP_SECRET", admin_secret)

    valid_totp = get_totp_code(admin_secret)
    unknown_email = "new-rogue-owner@external.com"

    users_before = (await db_session.execute(select(func.count(User.id)))).scalar()

    response = await client.post(
        "/api/v1/auth/admin-login",
        json={
            "email": unknown_email,
            "password": master_password,
            "totp_code": valid_totp,
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"

    users_after = (await db_session.execute(select(func.count(User.id)))).scalar()
    assert users_after == users_before

    # Ensure no OWNER account was auto-provisioned
    persisted = (await db_session.execute(select(User).where(User.email == unknown_email))).scalar_one_or_none()
    assert persisted is None


@pytest.mark.asyncio
async def test_p0_003_c_existing_customer_denied_admin_login_and_role_unchanged(client, db_session, monkeypatch):
    """TEST P0-003-C: Existing CUSTOMER attempts admin login -> denied (401), role remains CUSTOMER."""
    from app.core.config import settings

    admin_secret = "JBSWY3DPEHPK3PXP"
    monkeypatch.setattr(settings, "ADMIN_TOTP_SECRET", admin_secret)

    customer_email = "customer@retail-shopper.in"
    customer_pass = "CustomerPassword123!"

    # Create genuine customer user in database
    customer_user = await AuthService.create_user(
        db=db_session,
        email=customer_email,
        password=customer_pass,
        full_name="Retail Customer",
        role=UserRole.CUSTOMER,
    )
    assert customer_user.role == UserRole.CUSTOMER

    valid_totp = get_totp_code(admin_secret)

    response = await client.post(
        "/api/v1/auth/admin-login",
        json={
            "email": customer_email,
            "password": customer_pass,
            "totp_code": valid_totp,
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"

    # Verify role in database was NOT elevated to OWNER
    await db_session.refresh(customer_user)
    assert customer_user.role == UserRole.CUSTOMER
    assert customer_user.is_active is True


@pytest.mark.asyncio
async def test_p0_003_d_mass_assignment_role_injection_rejected(client, db_session):
    """TEST P0-003-D: Payload attempting mass-assignment (role=OWNER) is rejected without privilege escalation."""
    malicious_payload = {
        "email": "hacker@injection.test",
        "password": "Password123456!",
        "totp_code": "123456",
        "role": "OWNER",
        "is_superuser": True,
        "is_admin": True,
    }

    response = await client.post(
        "/api/v1/auth/admin-login",
        json=malicious_payload,
    )
    # With extra="forbid", Pydantic rejects extra fields with 422 Unprocessable Entity
    assert response.status_code in (401, 422)

    # Verify user was not created with OWNER privileges
    rogue = (await db_session.execute(select(User).where(User.email == "hacker@injection.test"))).scalar_one_or_none()
    assert rogue is None


@pytest.mark.asyncio
async def test_p0_003_e_valid_owner_login_success(client, db_session, monkeypatch):
    """TEST P0-003-E: Existing valid OWNER + correct password + valid MFA -> success."""
    from app.core.config import settings

    owner_secret = "JBSWY3DPEHPK3PXP"
    monkeypatch.setattr(settings, "ADMIN_TOTP_SECRET", owner_secret)

    owner_email = "genuine-owner@apolloengineering.co.in"
    owner_pass = "AuthorizedOwnerPass#2026"

    owner = await AuthService.create_user(
        db=db_session,
        email=owner_email,
        password=owner_pass,
        full_name="Genuine Owner",
        role=UserRole.OWNER,
    )
    owner.mfa_secret = owner_secret
    owner.mfa_enabled = True
    await db_session.commit()

    valid_totp = get_totp_code(owner_secret)

    response = await client.post(
        "/api/v1/auth/admin-login",
        json={
            "email": owner_email,
            "password": owner_pass,
            "totp_code": valid_totp,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == owner_email
    assert data["user"]["role"] == "OWNER"
    assert "ape_session" in response.cookies
    assert "ape_csrf" in response.cookies

    # Verify authenticated session exists in user_sessions table
    session_count = (await db_session.execute(
        select(func.count(UserSession.id)).where(UserSession.user_id == owner.id, UserSession.revoked_at.is_(None))
    )).scalar()
    assert session_count == 1


@pytest.mark.asyncio
async def test_p0_003_f_inactive_and_archived_owner_denied(client, db_session, monkeypatch):
    """TEST P0-003-F: Inactive or archived OWNER accounts are denied access with 401."""
    from app.core.config import settings

    secret = "JBSWY3DPEHPK3PXP"
    monkeypatch.setattr(settings, "ADMIN_TOTP_SECRET", secret)
    valid_totp = get_totp_code(secret)

    # 1. Inactive OWNER
    inactive_owner = await AuthService.create_user(
        db=db_session,
        email="inactive-owner@apolloengineering.co.in",
        password="ValidPassword#123",
        full_name="Inactive Owner",
        role=UserRole.OWNER,
    )
    inactive_owner.is_active = False
    await db_session.commit()

    res_inactive = await client.post(
        "/api/v1/auth/admin-login",
        json={
            "email": "inactive-owner@apolloengineering.co.in",
            "password": "ValidPassword#123",
            "totp_code": valid_totp,
        },
    )
    assert res_inactive.status_code == 401
    assert res_inactive.json()["detail"] == "Invalid credentials"

    # 2. Archived OWNER
    archived_owner = await AuthService.create_user(
        db=db_session,
        email="archived-owner@apolloengineering.co.in",
        password="ValidPassword#123",
        full_name="Archived Owner",
        role=UserRole.OWNER,
    )
    archived_owner.is_archived = True
    await db_session.commit()

    res_archived = await client.post(
        "/api/v1/auth/admin-login",
        json={
            "email": "archived-owner@apolloengineering.co.in",
            "password": "ValidPassword#123",
            "totp_code": valid_totp,
        },
    )
    assert res_archived.status_code == 401
    assert res_archived.json()["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_p0_003_g_failed_authentication_creates_no_session_or_cookies(client, db_session):
    """TEST P0-003-G: Failed authentication creates zero sessions in DB and zero session cookies."""
    sessions_before = (await db_session.execute(select(func.count(UserSession.id)))).scalar()

    response = await client.post(
        "/api/v1/auth/admin-login",
        json={
            "email": "phantom-user@apolloengineering.co.in",
            "password": "WrongPassword#999",
            "totp_code": "000000",
        },
    )
    assert response.status_code == 401
    assert "ape_session" not in response.cookies

    sessions_after = (await db_session.execute(select(func.count(UserSession.id)))).scalar()
    assert sessions_after == sessions_before


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "staff_role",
    [
        UserRole.CATALOG_MANAGER,
        UserRole.INVENTORY_MANAGER,
        UserRole.ORDER_OPERATIONS,
        UserRole.FINANCE,
        UserRole.SUPPORT,
        UserRole.AUDITOR,
    ],
)
async def test_p0_003_staff_roles_without_owner_permission_denied(client, db_session, monkeypatch, staff_role):
    """Strict Role Validation: Other non-OWNER staff roles cannot log in via /admin-login."""
    from app.core.config import settings

    admin_secret = "JBSWY3DPEHPK3PXP"
    monkeypatch.setattr(settings, "ADMIN_TOTP_SECRET", admin_secret)
    valid_totp = get_totp_code(admin_secret)

    email = f"staff_{staff_role.value.lower()}@apolloengineering.co.in"
    password = "StaffPassword#2026"

    staff_user = await AuthService.create_user(
        db=db_session,
        email=email,
        password=password,
        full_name=f"Staff {staff_role.value}",
        role=staff_role,
    )

    response = await client.post(
        "/api/v1/auth/admin-login",
        json={
            "email": email,
            "password": password,
            "totp_code": valid_totp,
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"

    # Role remains unmodified
    await db_session.refresh(staff_user)
    assert staff_user.role == staff_role


@pytest.mark.asyncio
async def test_update_my_profile_authenticated(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Authenticated customer can update full_name and email via PATCH /api/v1/auth/me."""
    email = "cust-profile-test@apolloengineering.co.in"
    password = "CustomerPassword#2026"
    user = await AuthService.create_user(
        db=db_session,
        email=email,
        password=password,
        full_name="Initial Customer Name",
        role=UserRole.CUSTOMER,
    )

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200

    # Update profile name
    update_res = await client.patch(
        "/api/v1/auth/me",
        json={"full_name": "Pravin Patel"},
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["full_name"] == "Pravin Patel"
    assert data["email"] == email

    # Verify DB state
    await db_session.refresh(user)
    assert user.full_name == "Pravin Patel"


@pytest.mark.asyncio
async def test_session_status_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """GET /api/v1/auth/session returns 200 OK for both guests and authenticated users."""
    # 1. Unauthenticated visitor -> 200 OK with authenticated: False (no 401)
    res_guest = await client.get("/api/v1/auth/session")
    assert res_guest.status_code == 200
    guest_data = res_guest.json()
    assert guest_data["authenticated"] is False
    assert guest_data["user"] is None

    # 2. Authenticated user -> 200 OK with authenticated: True
    email = "session-test@apolloengineering.co.in"
    password = "SessionPassword#2026"
    await AuthService.create_user(
        db=db_session,
        email=email,
        password=password,
        full_name="Session User",
        role=UserRole.CUSTOMER,
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200

    res_auth = await client.get("/api/v1/auth/session")
    assert res_auth.status_code == 200
    auth_data = res_auth.json()
    assert auth_data["authenticated"] is True
    assert auth_data["user"]["email"] == email
    assert auth_data["user"]["full_name"] == "Session User"


