import asyncio
import json
import uuid
from decimal import Decimal
from typing import Any, Dict, List
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.auth import User, UserRole
from app.services.auth_service import AuthService
from sqlalchemy import select

client = TestClient(app)

def run_audit():
    print("===============================================================")
    print(" APOLLO ENGINEERING ECOSYSTEM - COMPLETE API CENSUS & AUDIT ")
    print("===============================================================\n")

    endpoints = []
    for route in app.routes:
        if hasattr(route, "methods"):
            for method in route.methods:
                if method in ("HEAD", "OPTIONS"):
                    continue
                endpoints.append({
                    "method": method,
                    "path": route.path,
                    "name": getattr(route, "name", ""),
                    "tags": getattr(route, "tags", [])
                })

    print(f"TOTAL REGISTERED HTTP ROUTES: {len(endpoints)}\n")

    working = []
    failed_500 = []
    wrong_answers = []
    auth_protected = []

    # Get an admin token for testing admin APIs
    admin_token = None
    async def get_admin_token():
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.role.in_([UserRole.OWNER, UserRole.ADMIN]))
            res = await session.execute(stmt)
            admin_user = res.scalars().first()
            if admin_user:
                return AuthService.create_access_token(
                    data={"sub": str(admin_user.id), "email": admin_user.email, "role": admin_user.role.value}
                )
            return None

    try:
        admin_token = asyncio.run(get_admin_token())
    except Exception as e:
        print(f"Notice: Could not generate admin token: {e}")

    admin_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    for ep in endpoints:
        method = ep["method"]
        path = ep["path"]

        # Skip OpenAPI / docs
        if path in ("/api/v1/openapi.json", "/api/v1/docs", "/api/v1/redoc"):
            continue

        res = None
        status = 0
        error_detail = None
        body = None

        try:
            if method == "GET":
                # Special cases with dummy path parameters
                test_path = path
                if "{" in test_path:
                    test_path = test_path.replace("{id}", "APE-ORD-2026-C174823C")
                    test_path = test_path.replace("{order_id}", "APE-ORD-2026-C174823C")
                    test_path = test_path.replace("{id_or_number}", "APE-ORD-2026-C174823C")
                    test_path = test_path.replace("{quote_id}", "ca65113e-49f5-41cc-9059-2f483aafc7e3")
                    test_path = test_path.replace("{product_id}", "f59930d7-9b2a-454b-b64e-2ec6a778fe8d")
                    test_path = test_path.replace("{sku}", "APE-SC-30.00MM")
                    test_path = test_path.replace("{item_id}", "00000000-0000-0000-0000-000000000000")
                    test_path = test_path.replace("{invoice_id}", "00000000-0000-0000-0000-000000000000")
                    test_path = test_path.replace("{user_id}", "00000000-0000-0000-0000-000000000000")
                    test_path = test_path.replace("{batch_id}", "00000000-0000-0000-0000-000000000000")
                    test_path = test_path.replace("{run_id}", "00000000-0000-0000-0000-000000000000")
                    test_path = test_path.replace("{report_id}", "00000000-0000-0000-0000-000000000000")

                headers = admin_headers if "/admin" in path else {}
                res = client.get(test_path, headers=headers)
                status = res.status_code
                try:
                    body = res.json()
                except Exception:
                    body = res.text

            elif method == "POST":
                payload = {}
                headers = admin_headers if "/admin" in path else {}
                if "/quotes" in path:
                    payload = {"items": [{"sku": "APE-SC-30.00MM", "quantity": 1}], "destination_pincode": "382330", "payment_method": "PREPAID"}
                elif "/orders" in path and not "/admin" in path and not "/status" in path:
                    payload = {
                        "payment_method": "PREPAID",
                        "destination_pincode": "382330",
                        "customer": {"name": "Audit Test", "phone": "9825012345"},
                        "shipping_address": {"address_line1": "Audit Street", "city": "Ahmedabad", "state": "Gujarat", "pincode": "382330", "state_code": "24"},
                        "items": [{"sku": "APE-SC-30.00MM", "quantity": 1}]
                    }
                elif "/payments/razorpay/create-order" in path:
                    payload = {"order_id": "00000000-0000-0000-0000-000000000000"}
                elif "/payments/razorpay/verify" in path:
                    payload = {"order_id": "00000000-0000-0000-0000-000000000000", "razorpay_order_id": "order_test", "razorpay_payment_id": "pay_test", "razorpay_signature": "sig_test"}
                elif "/auth/otp/send" in path:
                    payload = {"phone": "9825012345"}
                elif "/auth/otp/verify" in path:
                    payload = {"phone": "9825012345", "otp": "9999"}
                elif "/auth/login" in path:
                    payload = {"username": "admin@apolloengineering.co.in", "password": "wrong_password"}

                res = client.post(path, json=payload, headers=headers)
                status = res.status_code
                try:
                    body = res.json()
                except Exception:
                    body = res.text

            elif method in ("PUT", "PATCH", "DELETE"):
                test_path = path
                if "{" in test_path:
                    test_path = test_path.replace("{id}", "00000000-0000-0000-0000-000000000000")
                    test_path = test_path.replace("{id_or_number}", "00000000-0000-0000-0000-000000000000")
                    test_path = test_path.replace("{sku}", "APE-SC-30.00MM")
                    test_path = test_path.replace("{product_id}", "f59930d7-9b2a-454b-b64e-2ec6a778fe8d")
                res = client.request(method, test_path, headers=admin_headers, json={})
                status = res.status_code
                try:
                    body = res.json()
                except Exception:
                    body = res.text

        except Exception as e:
            status = 500
            error_detail = str(e)

        is_crash = status == 500 or error_detail is not None
        is_auth = status in (401, 403)
        is_success = status in (200, 201, 204)
        is_handled_client_error = status in (400, 404, 422)

        ep_info = {
            "method": method,
            "path": path,
            "status": status,
            "error": error_detail or (body.get("detail") if isinstance(body, dict) else str(body)[:100])
        }

        if is_crash:
            failed_500.append(ep_info)
        elif is_auth:
            auth_protected.append(ep_info)
        elif is_success:
            if "/quotes" in path and method == "POST" and isinstance(body, dict):
                prepaid = body.get("prepaid_total")
                items_gross = body.get("total_product_gross")
                shipping = body.get("shipping_total")
                if prepaid and items_gross and shipping:
                    diff = abs(Decimal(str(prepaid)) - (Decimal(str(items_gross)) + Decimal(str(shipping))))
                    if diff > Decimal("0.01"):
                        ep_info["wrong_reason"] = f"Prepaid total ({prepaid}) != items ({items_gross}) + shipping ({shipping})"
                        wrong_answers.append(ep_info)
                    else:
                        working.append(ep_info)
                else:
                    working.append(ep_info)
            else:
                working.append(ep_info)
        elif is_handled_client_error:
            working.append(ep_info)
        else:
            wrong_answers.append(ep_info)

    return {
        "total": len(endpoints),
        "working": working,
        "failed_500": failed_500,
        "wrong_answers": wrong_answers,
        "auth_protected": auth_protected
    }

if __name__ == "__main__":
    results = run_audit()
    print(f"---------------------------------------------------------------")
    print(f"AUDIT SUMMARY RESULTS:")
    print(f"Total Routes Audited:   {results['total']}")
    print(f"Working / Valid APIs:   {len(results['working'])}")
    print(f"Auth Protected Routes:  {len(results['auth_protected'])}")
    print(f"Failed (500 Crashes):   {len(results['failed_500'])}")
    print(f"Wrong Answer / Bugs:    {len(results['wrong_answers'])}")
    print(f"---------------------------------------------------------------\n")

    if results['failed_500']:
        print("FAILED / CRASHING APIS (500):")
        for f in results['failed_500']:
            print(f"  ❌ [{f['method']}] {f['path']} -> HTTP {f['status']} | Error: {f['error']}")
        print()

    if results['wrong_answers']:
        print("APIS RETURNING WRONG / ANOMALOUS ANSWERS:")
        for w in results['wrong_answers']:
            print(f"  ⚠️ [{w['method']}] {w['path']} -> {w.get('wrong_reason', w['error'])}")
        print()

    print("TOP WORKING / VERIFIED APIS:")
    for w in results['working'][:20]:
        print(f"  ✅ [{w['method']}] {w['path']} (HTTP {w['status']})")
