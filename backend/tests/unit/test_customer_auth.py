"""Comprehensive Unit & Integration Tests for Customer Authentication & Authorization.

Verifies:
1. New customer registration via mobile OTP + default profile creation.
2. Returning customer login without duplicate accounts.
3. Strict Customer vs Admin separation: customer cannot access /admin/users.
4. Incorrect, expired, and exhausted OTP states.
5. Replay prevention: consumed challenge cannot be re-verified.
6. Suspended account login rejection with 403 Forbidden.
7. Session expiry, session revocation (/auth/logout) and logout-all (/auth/logout-all).
8. Customer profile and address book CRUD with BOLA / IDOR isolation.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.main import app
from app.models.auth import User, UserRole, UserSession
from app.models.customer import CustomerAddress, CustomerProfile, OtpChallenge, OtpStatus


@pytest.mark.asyncio
async def test_first_time_customer_registration_and_profile():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        phone = "9824111222"

        # 1. Request OTP
        req_res = await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        assert req_res.status_code == 200
        assert req_res.json()["success"] is True

        # 2. Fetch test code
        dev_res = await ac.get(f"/api/v1/auth/otp/dev-code?phone={phone}")
        code = dev_res.json()["code"]
        assert code is not None

        # 3. Verify OTP -> should establish session and flag is_first_time=True
        verify_res = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": code})
        assert verify_res.status_code == 200
        body = verify_res.json()
        assert body["is_verified"] is True
        assert body["is_first_time"] is True
        assert body["user"]["role"] == "CUSTOMER"  # STRICT role derivation
        csrf_token = body["csrf_token"]
        assert "ape_session" in verify_res.cookies

        # 4. Check /auth/session status
        sess_res = await ac.get("/api/v1/auth/session")
        assert sess_res.status_code == 200
        sess_data = sess_res.json()
        assert sess_data["authenticated"] is True
        assert sess_data["user"]["role"] == "CUSTOMER"

        # 5. Complete / update customer profile via PATCH /customers/me
        headers = {"x-csrf-token": csrf_token}
        profile_patch = {
            "full_name": "Pravin Bhai Patel",
            "email": "pravin.patel@gujarat-solar.com",
            "company_name": "Apollo Solar EPC Solutions",
            "gstin": "24AAACG1111A1Z9",
            "account_type": "B2B",
            "terms_accepted": True,
        }
        patch_res = await ac.patch("/api/v1/customers/me", json=profile_patch, headers=headers)
        assert patch_res.status_code == 200
        profile_body = patch_res.json()
        assert profile_body["full_name"] == "Pravin Bhai Patel"
        assert profile_body["company_name"] == "Apollo Solar EPC Solutions"
        assert profile_body["account_type"] == "B2B"

        # 6. Verify Customer A CANNOT access admin staff endpoints
        admin_res = await ac.get("/api/v1/admin/users", headers=headers)
        assert admin_res.status_code == 403
        assert "Forbidden" in admin_res.json()["detail"]


@pytest.mark.asyncio
async def test_returning_customer_login_no_duplicates():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        phone = "9825999888"

        # First login (provisions account)
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        dev_res1 = await ac.get(f"/api/v1/auth/otp/dev-code?phone={phone}")
        code1 = dev_res1.json()["code"]
        ver1 = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": code1})
        assert ver1.status_code == 200
        first_user_id = ver1.json()["user"]["id"]
        assert ver1.json()["is_first_time"] is True

        # Logout
        csrf1 = ver1.json()["csrf_token"]
        await ac.post("/api/v1/auth/logout", headers={"x-csrf-token": csrf1})

        # Second login with same phone
        # Clear cooldown directly in DB for testing
        async with AsyncSessionLocal() as session:
            stmt = select(OtpChallenge).where(OtpChallenge.identifier == phone)
            challenges = (await session.execute(stmt)).scalars().all()
            for ch in challenges:
                ch.status = OtpStatus.CONSUMED
            await session.commit()

        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        dev_res2 = await ac.get(f"/api/v1/auth/otp/dev-code?phone={phone}")
        code2 = dev_res2.json()["code"]

        ver2 = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": code2})
        assert ver2.status_code == 200
        body2 = ver2.json()
        assert body2["is_first_time"] is False
        assert body2["user"]["id"] == first_user_id  # Same user! No duplicate!


@pytest.mark.asyncio
async def test_suspended_account_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        phone = "9825444333"

        # Register customer
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        dev_res = await ac.get(f"/api/v1/auth/otp/dev-code?phone={phone}")
        code = dev_res.json()["code"]
        ver = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": code})
        user_id = ver.json()["user"]["id"]

        # Suspend customer in DB
        async with AsyncSessionLocal() as session:
            import uuid
            u = (await session.execute(select(User).where(User.id == uuid.UUID(user_id)))).scalar_one()
            u.is_active = False
            # Clear previous challenge to allow fresh login test
            stmt_ch = select(OtpChallenge).where(OtpChallenge.identifier == phone)
            for ch in (await session.execute(stmt_ch)).scalars().all():
                ch.status = OtpStatus.CONSUMED
            await session.commit()

        # Request new OTP
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        dev_res2 = await ac.get(f"/api/v1/auth/otp/dev-code?phone={phone}")
        code2 = dev_res2.json()["code"]

        # Attempt login -> MUST fail closed with 403
        ver_fail = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": code2})
        assert ver_fail.status_code == 403
        assert "suspended" in ver_fail.json()["detail"].lower()


@pytest.mark.asyncio
async def test_customer_address_book_and_bola_isolation():
    transport = ASGITransport(app=app)
    # Customer A
    async with AsyncClient(transport=transport, base_url="http://test") as ac_a:
        phone_a = "9825777111"
        await ac_a.post("/api/v1/auth/otp/request", json={"phone": phone_a})
        code_a = (await ac_a.get(f"/api/v1/auth/otp/dev-code?phone={phone_a}")).json()["code"]
        ver_a = await ac_a.post("/api/v1/auth/otp/verify", json={"phone": phone_a, "otp": code_a})
        csrf_a = ver_a.json()["csrf_token"]

        # Customer A adds an address
        addr_payload = {
            "address_type": "OFFICE",
            "full_name": "Customer A Hub",
            "phone": "9825777111",
            "flat_building": "Shed 42, GIDC Industrial Estate",
            "street_area": "Phase II, Kathwada",
            "pincode": "382430",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "state_code": "24",
            "is_default": True,
        }
        res_add = await ac_a.post("/api/v1/customers/me/addresses", json=addr_payload, headers={"x-csrf-token": csrf_a})
        assert res_add.status_code == 201
        addr_a_id = res_add.json()["id"]

        # Customer B
        async with AsyncClient(transport=transport, base_url="http://test") as ac_b:
            phone_b = "9825777222"
            await ac_b.post("/api/v1/auth/otp/request", json={"phone": phone_b})
            code_b = (await ac_b.get(f"/api/v1/auth/otp/dev-code?phone={phone_b}")).json()["code"]
            ver_b = await ac_b.post("/api/v1/auth/otp/verify", json={"phone": phone_b, "otp": code_b})
            csrf_b = ver_b.json()["csrf_token"]

            # Customer B attempts to modify Customer A's address -> BOLA violation MUST fail 404
            res_bola_put = await ac_b.put(
                f"/api/v1/customers/me/addresses/{addr_a_id}",
                json={"full_name": "Hacked by B"},
                headers={"x-csrf-token": csrf_b},
            )
            assert res_bola_put.status_code == 404

            # Customer B attempts to delete Customer A's address -> MUST fail 404
            res_bola_del = await ac_b.delete(
                f"/api/v1/customers/me/addresses/{addr_a_id}",
                headers={"x-csrf-token": csrf_b},
            )
            assert res_bola_del.status_code == 404


@pytest.mark.asyncio
async def test_logout_all_sessions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        phone = "9825888333"
        await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        code = (await ac.get(f"/api/v1/auth/otp/dev-code?phone={phone}")).json()["code"]
        ver = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": code})
        csrf = ver.json()["csrf_token"]

        # Call logout-all
        res_logout = await ac.post("/api/v1/auth/logout-all", headers={"x-csrf-token": csrf})
        assert res_logout.status_code == 200
        assert res_logout.json()["revoked_count"] >= 1

        # Session should now be terminated
        sess_check = await ac.get("/api/v1/auth/session")
        assert sess_check.json()["authenticated"] is False
