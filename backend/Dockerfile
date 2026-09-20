# ==============================================================================
# 🏛️ Apollo Engineering - FastAPI Production Backend Container
# Multi-stage build with Debian Slim, non-root security user & Alembic entrypoint
# ==============================================================================

# Stage 1: Build Dependencies & Pre-compiled Wheels
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install minimal build tools for C-extensions (asyncpg, argon2-cffi, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definition
COPY requirements.txt .

# Install Python packages into isolated user directory
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --user -r requirements.txt

# ==============================================================================
# Stage 2: Minimal Production Runtime
# ==============================================================================
FROM python:3.12-slim AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/appuser/.local/bin:$PATH" \
    PYTHONPATH=/app

# Install runtime PostgreSQL client library & curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create secure non-root user (UID 1001)
RUN useradd -u 1001 -m -s /bin/bash appuser

# Copy installed packages from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Copy application source, migrations and entrypoint script
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
COPY docker-entrypoint.sh .

# Ensure entrypoint is executable and appuser owns application directory
RUN chmod +x docker-entrypoint.sh && \
    chown -R appuser:appuser /app /home/appuser

# Switch to non-root user
USER appuser

# Expose FastAPI listening port
EXPOSE 8000

# Authoritative Healthcheck (pings live /api/v1/health endpoint)
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')" || exit 1

# Execute database migration entrypoint before launching Uvicorn
ENTRYPOINT ["./docker-entrypoint.sh"]

# Default start command for FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
