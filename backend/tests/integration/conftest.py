"""Integration tests configuration.

Detects if the live disposable PostgreSQL 16 server is running on localhost:5433.
If unreachable, cleanly skips external database integration tests so unit test suites
and offline workflows proceed reliably.
"""
import socket
import pytest


def is_postgres_running(host: str = "localhost", port: int = 5433) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except (OSError, ConnectionRefusedError):
        return False


@pytest.fixture(autouse=True, scope="module")
def require_postgres_server():
    if not is_postgres_running():
        pytest.skip("Live PostgreSQL 16 server on localhost:5433 is not running", allow_module_level=True)
