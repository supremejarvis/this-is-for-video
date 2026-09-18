# Multi-stage build for FastAPI backend
FROM python:3.12-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev postgresql-dev

# Copy requirements
COPY backend/requirements.txt .

# Create wheels (pre-compiled packages) for faster installs
RUN pip install --no-cache-dir --upgrade pip wheel && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Runtime stage
FROM python:3.12-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache postgresql-client

# Copy wheels from builder
COPY --from=builder /app/wheels /wheels

# Install packages from wheels
COPY backend/requirements.txt .
RUN pip install --no-cache-dir /wheels/*

# Copy application code
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini .

# Create non-root user
RUN addgroup -g 1001 appgroup && adduser -D -u 1001 -G appgroup appuser
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')" || exit 1

# Start FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
