# 🏛️ Apollo Engineering Docker Containerization Setup

Comprehensive guide for containerizing and running the Apollo Engineering E-Commerce platform using Docker and Docker Compose.

---

## ⚡ Quick Start

### 1. Development Mode (with Live Hot Reload)

```bash
docker compose -f docker-compose.dev.yml up --build
```

**Access Endpoints:**
- 🌐 **Frontend (Next.js 15 Dev)**: [http://localhost:3000](http://localhost:3000)
- 🚀 **Backend API (FastAPI)**: [http://localhost:8000](http://localhost:8000)
- 📖 **Interactive API Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- 🗄️ **PostgreSQL 16**: `localhost:5432` (`user: postgres`, `db: apollo_dev`)

---

### 2. Production Mode

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Ensure POSTGRES_PASSWORD and SECRET_KEY are configured
   ```

2. **Build and Launch All Containers:**
   ```bash
   docker compose up -d --build
   ```

3. **Check Container Status:**
   ```bash
   docker compose ps
   docker compose logs -f backend
   ```

---

## 📦 Container Specifications

### 🚀 Backend Container (`backend/Dockerfile`)

- **Base Image**: `python:3.12-slim` (Multi-stage build)
- **Port**: `8000`
- **Security**: Non-root user `appuser` (UID `1001`)
- **Key Enhancements**:
  - Pre-compiled wheels in builder stage for fast layer caching.
  - Debian Bookworm base guarantees pre-compiled wheels for `asyncpg`, `uvloop`, `argon2-cffi`, and `pydantic-core`.
  - **Alembic Entrypoint (`docker-entrypoint.sh`)**: Automatically waits for PostgreSQL socket readiness and executes `alembic upgrade head` before Uvicorn startup.
  - **Healthcheck**: Real-time probe against `http://localhost:8000/api/v1/health`.

### 🌐 Frontend Container (`Dockerfile`)

- **Base Image**: `node:22-alpine` (Multi-stage standalone build)
- **Port**: `3000` (Mapped to `80:3000` and `3000:3000`)
- **Security**: Non-root user `nextjs` (UID `1001`)
- **Key Enhancements**:
  - Leverages Next.js 15 `output: 'standalone'` bundling.
  - Eliminates bulky `node_modules` in final production image (~120MB total footprint).
  - Preserves SSR, Next.js App Router dynamic routes, and API rewrites to `FASTAPI_BACKEND_URL`.
  - **Healthcheck**: Probes root URL `http://localhost:3000/`.

### 🗄️ Database Container (`postgres:16-alpine`)

- **Base Image**: `postgres:16-alpine`
- **Port**: `5432`
- **Persistence**: Named volume `postgres_data`
- **Initialization**: Automatically mounts `setup_postgres_constraints.sql` into `/docker-entrypoint-initdb.d/`.

---

## 🛠️ Standalone Docker Build Commands

### Build Backend Individually

```bash
cd backend
docker build -t apollo-backend:latest .
```

### Run Backend Standalone

```bash
docker run -d \
  --name apollo_backend \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://postgres:password@host.docker.internal:5432/apollo" \
  apollo-backend:latest
```

### Build Frontend Individually

```bash
docker build -t apollo-frontend:latest .
```

### Run Frontend Standalone

```bash
docker run -d \
  --name apollo_frontend \
  -p 3000:3000 \
  -e FASTAPI_BACKEND_URL="http://host.docker.internal:8000" \
  apollo-frontend:latest
```

---

## 🔍 Troubleshooting & Logs

- **Inspect Backend Logs:**
  ```bash
  docker logs -f apollo_backend_prod
  ```
- **Inspect Frontend Logs:**
  ```bash
  docker logs -f apollo_frontend_prod
  ```
- **Inspect PostgreSQL Logs:**
  ```bash
  docker logs -f apollo_postgres_prod
  ```
- **Stop and Reset Volumes (Clean Slate):**
  ```bash
  docker compose down -v
  ```
