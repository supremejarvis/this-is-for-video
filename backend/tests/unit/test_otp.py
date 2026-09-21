"""Unit Tests for 4-Digit Mobile OTP Authentication and Rate Limiting (Async Native)."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_send_and_verify_4_digit_otp():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        phone = "9825012345"

        # 1. Send OTP
        res = await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "******2345" in data["masked_phone"]
        assert "otp" not in data  # Never expose raw OTP in response

        # 2. Retrieve active code via dev testing endpoint
        res_dev = await ac.get(f"/api/v1/auth/otp/dev-code?phone={phone}")
        assert res_dev.status_code == 200
        generated_code = res_dev.json()["code"]
        assert generated_code is not None
        assert len(generated_code) == 4
        assert generated_code.isdigit()

        # 3. Test invalid OTP verification
        res_fail = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "0000"})
        assert res_fail.status_code == 400
        assert "Invalid OTP" in res_fail.json()["detail"]

        # 4. Test valid OTP verification
        res_success = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": generated_code})
        assert res_success.status_code == 200
        body = res_success.json()
        assert body["success"] is True
        assert body["is_verified"] is True
        assert body["user"] is not None
        assert "ape_session" in res_success.cookies

        # 5. Replay attack: OTP should now be consumed/invalidated
        res_reuse = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": generated_code})
        assert res_reuse.status_code == 400


@pytest.mark.asyncio
async def test_otp_resend_cooldown_and_rate_limiting():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        phone = "9876543210"

        # 1. First send is OK
        res1 = await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        assert res1.status_code == 200

        # 2. Immediate second send triggers 30-second cooldown 429
        res2 = await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        assert res2.status_code == 429
        assert "Please wait" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_otp_max_failed_attempts_invalidation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        phone = "9714710854"

        res = await ac.post("/api/v1/auth/otp/request", json={"phone": phone})
        assert res.status_code in (200, 429)

        # Retrieve active code if send succeeded or wait
        res_dev = await ac.get(f"/api/v1/auth/otp/dev-code?phone={phone}")
        real_code = res_dev.json().get("code")
        wrong_code = "0000" if real_code != "0000" else "1111"

        # Try 3 incorrect attempts
        for _ in range(3):
            res_fail = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": wrong_code})
            assert res_fail.status_code == 400

        # 4th attempt should indicate session expired/exceeded
        res_4th = await ac.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": wrong_code})
        assert res_4th.status_code == 400
        assert "No active OTP request" in res_4th.json()["detail"] or "exceeded" in res_4th.json()["detail"]
