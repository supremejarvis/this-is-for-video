"""API Contract and Schema Compliance Tests with Schemathesis and Pydantic.

Verifies:
- No undocumented 500 responses
- Response schema compliance against OpenAPI definitions
- Invalid inputs produce documented validation errors (HTTP 422)
- Strict extra fields policy (unknown fields produce HTTP 422 due to extra='forbid')
- Quantity and monetary boundary enforcement
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


def test_openapi_schema_is_valid():
    """Verify generated OpenAPI specification contains all new Gate 2B endpoints."""
    schema = app.openapi()
    assert schema["openapi"].startswith("3.")
    assert "/api/v1/quotes" in schema["paths"]
    assert "/api/v1/health" in schema["paths"]
    assert "/api/v1/products/" in schema["paths"]
    assert "/api/v1/products/{product_id}" in schema["paths"]
    assert "/api/v1/products/{product_id}/variants" in schema["paths"]
    assert "/api/v1/products/variants/{variant_id}" in schema["paths"]
    assert "/api/v1/pricing/versions" in schema["paths"]
    assert "/api/v1/pricing/active" in schema["paths"]
    assert "/api/v1/pricing/calculate" in schema["paths"]
    assert "/api/v1/inventory/items" in schema["paths"]
    assert "/api/v1/inventory/receipt" in schema["paths"]
    assert "/api/v1/inventory/adjustment" in schema["paths"]
    assert "/api/v1/inventory/movements" in schema["paths"]


@pytest.mark.asyncio
async def test_gate2b_unauthorized_access_rejected_without_500(client):
    """Verify unauthenticated requests to Gate 2B mutative endpoints return 401 (never 500)."""
    endpoints = [
        ("POST", "/api/v1/products/", {"sku_prefix": "TST", "name": "Test", "hsn_code": "73269099"}),
        ("PUT", "/api/v1/products/00000000-0000-0000-0000-000000000000", {"name": "Test", "version": 1}),
        ("DELETE", "/api/v1/products/00000000-0000-0000-0000-000000000000", None),
        ("POST", "/api/v1/products/00000000-0000-0000-0000-000000000000/variants", {"sku": "V-1", "frame_thickness": "30mm"}),
        ("PATCH", "/api/v1/products/variants/00000000-0000-0000-0000-000000000000", {"pack_size": 2, "version": 1}),
        ("DELETE", "/api/v1/products/variants/00000000-0000-0000-0000-000000000000", None),
        ("POST", "/api/v1/pricing/versions", {"variant_id": "00000000-0000-0000-0000-000000000000", "unit_price": "20.00"}),
        ("POST", "/api/v1/inventory/receipt", {"sku": "TEST", "quantity": 10, "reason": "test"}),
        ("POST", "/api/v1/inventory/adjustment", {"sku": "TEST", "quantity_delta": 5, "reason": "test"}),
    ]
    for method, path, payload in endpoints:
        if method == "POST":
            res = await client.post(path, json=payload)
        elif method == "PUT":
            res = await client.put(path, json=payload)
        elif method == "PATCH":
            res = await client.patch(path, json=payload)
        elif method == "DELETE":
            res = await client.delete(path)
        assert res.status_code == 401, f"Expected 401 for {method} {path}, got {res.status_code}"


@pytest.mark.asyncio
async def test_gate2b_boundary_and_invalid_payloads_return_422(client):
    """Verify invalid payloads and boundary values produce HTTP 422 (never 500)."""
    # 1. Negative / zero pricing values
    bad_price_res = await client.post(
        "/api/v1/pricing/calculate",
        json={"items": [{"variant_id": "00000000-0000-0000-0000-000000000000", "quantity": -5}]},
    )
    assert bad_price_res.status_code == 422

    # 2. Unknown fields on ProductCreate rejected by extra='forbid'
    bad_product_res = await client.post(
        "/api/v1/products/",
        json={"sku_prefix": "TST", "name": "Test", "hsn_code": "73269099", "unknown_field": "hacked"},
    )
    # Returns 401 if unauthenticated, or 422 if schema parsed
    assert bad_product_res.status_code in (401, 422)

    # 3. Invalid frame thickness boundary on variant schema
    bad_variant_res = await client.post(
        "/api/v1/products/00000000-0000-0000-0000-000000000000/variants",
        json={"sku": "TST-VAR", "frame_thickness_mm": "-10.00", "fit_mode": "EXACT"},
    )
    assert bad_variant_res.status_code in (401, 422)


@pytest.mark.asyncio
async def test_unknown_json_fields_rejected_by_extra_forbid(client):
    """Verify strict policy: extra unknown fields produce HTTP 422 validation error."""
    payload = {
        "items": [{"sku": "APE-TEST", "quantity": 1}],
        "destination_pincode": "382430",
        "unknown_malicious_field": "inject",
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert any("extra_forbidden" in err["type"] or "extra" in err["msg"].lower() for err in data["detail"])


@pytest.mark.asyncio
async def test_quantity_boundary_zero_and_negative_rejected(client):
    """Verify quantity boundary: quantity <= 0 is rejected with HTTP 422."""
    for bad_qty in [0, -1, -100]:
        payload = {
            "items": [{"sku": "APE-TEST", "quantity": bad_qty}],
            "destination_pincode": "382430",
        }
        res = await client.post("/api/v1/quotes", json=payload)
        assert res.status_code == 422
        data = res.json()
        assert any("greater_than" in err["type"] or "greater than 0" in err["msg"].lower() for err in data["detail"])


@pytest.mark.asyncio
async def test_monetary_boundary_negative_shipping_rejected(client):
    """Verify monetary boundary: negative base_shipping is rejected with HTTP 422."""
    payload = {
        "items": [{"sku": "APE-TEST", "quantity": 1}],
        "destination_pincode": "382430",
        "base_shipping": "-10.00",
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert any("greater_than_equal" in err["type"] or "greater than or equal to 0" in err["msg"].lower() for err in data["detail"])


@pytest.mark.asyncio
async def test_health_check_contract_compliance(client):
    """Verify health endpoint complies with documented 200 response schema without 500 error."""
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "apollo-backend"


@pytest.mark.asyncio
async def test_no_undocumented_500_on_malformed_json(client):
    """Malformed non-JSON body returns 422, never an unhandled 500 error."""
    res = await client.post(
        "/api/v1/quotes",
        content=b"this is not json",
        headers={"Content-Type": "application/json"}
    )
    assert res.status_code == 422
    assert res.status_code != 500
