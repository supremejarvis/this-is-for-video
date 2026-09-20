"""API v1 Router Aggregator."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin_accounting,
    admin_catalog,
    admin_inventory,
    admin_orders,
    admin_payments,
    admin_pricing,
    admin_returns,
    admin_shipping,
    auth,
    health,
    inventory,
    orders,
    otp,
    payments,
    pricing,
    products,
    quotes,
    system,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(system.router)
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(otp.router, prefix="/auth/otp", tags=["OTP"])
api_router.include_router(users.router, prefix="/admin/users", tags=["Admin Users"])
api_router.include_router(admin_catalog.router)
api_router.include_router(admin_pricing.router)
api_router.include_router(admin_inventory.router)
api_router.include_router(admin_orders.router)
api_router.include_router(admin_shipping.router)
api_router.include_router(admin_payments.router)
api_router.include_router(admin_returns.router)
api_router.include_router(admin_accounting.router, prefix="/admin/accounting", tags=["Admin Accounting"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["Quotes"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(products.router)
api_router.include_router(pricing.router)
api_router.include_router(inventory.router)


