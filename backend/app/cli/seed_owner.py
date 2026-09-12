"""Bootstrap Initial System Owner CLI Command (Secure Password Handling).

Usage:
    # Interactive mode (prompts securely without echoing):
    uv run python -m app.cli.seed_owner --email owner@ape-store.com --name "Apollo Administrator"

    # Headless / CI mode via environment variable:
    $env:OWNER_BOOTSTRAP_PASSWORD="<secure-secret>"
    uv run python -m app.cli.seed_owner --email owner@ape-store.com --name "Apollo Administrator"
"""
import argparse
import asyncio
import getpass
import os
import sys
from datetime import UTC, datetime

from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.auth import User, UserRole, UserSession


def utcnow() -> datetime:
    return datetime.now(UTC)


async def async_seed_owner(email: str, password: str, name: str) -> None:
    normalized_email = email.lower().strip()
    pw_hash = hash_password(password)

    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.email == normalized_email)
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            existing.role = UserRole.OWNER
            existing.full_name = name
            existing.password_hash = pw_hash
            existing.is_active = True
            existing.is_archived = False
            existing.updated_at = utcnow()

            # Revoke all active sessions immediately
            await session.execute(
                update(UserSession)
                .where(UserSession.user_id == existing.id, UserSession.revoked_at.is_(None))
                .values(revoked_at=utcnow())
            )
            await session.commit()
            print(f"Successfully rotated password for OWNER {normalized_email} and revoked all active sessions.")
        else:
            user = User(
                email=normalized_email,
                password_hash=pw_hash,
                full_name=name,
                role=UserRole.OWNER,
                is_active=True,
                is_archived=False,
            )
            session.add(user)
            await session.commit()
            print(f"Successfully bootstrapped OWNER account: {user.email} (ID: {user.id})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap the first Apollo OWNER account securely.")
    parser.add_argument("--email", required=True, help="Owner email address")
    parser.add_argument("--name", default="Apollo Owner", help="Full name")

    args = parser.parse_args()

    # Read password securely from environment variable or interactive getpass prompt
    password = os.environ.get("OWNER_BOOTSTRAP_PASSWORD")
    if not password:
        if sys.stdin.isatty():
            password = getpass.getpass("Enter secure OWNER password (min 12 chars): ")
        else:
            print("Error: OWNER_BOOTSTRAP_PASSWORD environment variable is required in non-interactive sessions.")
            sys.exit(1)

    if len(password) < 12:
        print("Error: Password must be at least 12 characters long.")
        sys.exit(1)

    asyncio.run(async_seed_owner(email=args.email, password=password, name=args.name))


if __name__ == "__main__":
    main()
