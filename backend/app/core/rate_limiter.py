"""Shared rate limiter instance for FastAPI endpoints."""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance - initialized in main.py
limiter = Limiter(key_func=get_remote_address)