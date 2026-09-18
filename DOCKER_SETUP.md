# Apollo E-Commerce Docker Setup

## Quick Start

### Development (with hot reload)

```bash
docker compose -f docker-compose.dev.yml up --pull always
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

### Production

1. Create `.env` file:
```bash
cp .env.example .env
# Edit .env and set required values (POSTGRES_PASSWORD, etc.)
```

2. Build and run:
```bash
docker compose up --pull always -d
```

Access:
- Frontend + API: http://localhost
- PostgreSQL: localhost:5432

## Image Specs

### Frontend (Nginx)
- **Base**: node:22-alpine (builder) → nginx:alpine
- **Size**: ~45MB
- **Port**: 80
- **Features**:
  - Multi-stage build (strips node runtime)
  - Gzip compression
  - 1-year cache for static assets
  - API proxy to backend
  - SPA routing (all routes → index.html)
  - Security headers (CORS, X-Frame-Options, CSP)
  - Health check: HTTP GET /index.html

### Backend (FastAPI)
- **Base**: python:3.12-alpine (builder) → python:3.12-alpine
- **Size**: ~180MB
- **Port**: 8000
- **Features**:
  - Multi-stage build (pre-compiled wheels for faster installs)
  - Non-root user (uid 1001)
  - Async PostgreSQL driver (asyncpg)
  - Health check: HTTP GET /docs
  - Hot reload in dev, optimized start in prod

### Database (PostgreSQL)
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Dev**: tmpfs (ephemeral)
- **Prod**: Named volume (`postgres_data`) for persistence

## Environment Variables

### Backend (docker-compose.yml)
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=apollo
DATABASE_URL=postgresql+asyncpg://postgres:<password>@postgres:5432/apollo
```

### Frontend (docker-compose.yml)
```
BACKEND_URL=http://backend:8000
VITE_API_URL=<production-api-url>
GEMINI_API_KEY=<your-key>
```

## Build & Push to Registry

Images are built and pushed via GitHub Actions on push to `main` or `develop` branches.

Registry: `ghcr.io/<owner>/<repo>`

Tag format:
- `main` → `ghcr.io/...:<branch>`
- Semantic versioning (Git tags) → `ghcr.io/.../v1.0.0`
- PR commits → `ghcr.io/...:<sha>`

**Manual build:**
```bash
# Frontend
docker build -t apollo-frontend:latest .

# Backend
docker build -t apollo-backend:latest -f backend/Dockerfile .
```

## Optimization Details

### Layer Caching
- Frontend: Separate `package*.json` copy before source (cache hits if deps unchanged)
- Backend: Pre-compiled wheels in builder stage (single install in runtime)

### Security
- Non-root user in backend
- Security headers in nginx
- Health checks for all services
- No secrets baked into images (use .env / secrets management)

### Networking
- Bridge network `apollo-network` (prod) / `apollo-dev-network` (dev)
- Backend/Frontend communicate via service DNS (`http://backend:8000`)
- All services on same network for zero-config discovery

## Testing

Run via GitHub Actions (`.github/workflows/docker-build-push.yml`):
- Backend: pytest with coverage
- Frontend: Vitest + Playwright E2E
- Coverage reports uploaded to Codecov

Local test run:
```bash
npm run test:unit
npm run test:e2e
cd backend && pytest tests/
```

## Troubleshooting

**Backend won't connect to DB:**
```bash
docker logs apollo_backend_prod
# Check DATABASE_URL in .env
# Verify postgres is healthy: docker ps | grep postgres
```

**Frontend can't reach backend:**
```bash
# Dev: API proxy is localhost:8000 (set in vite.config.ts)
# Prod: Nginx proxy is http://backend:8000 (nginx.conf)
```

**Clean slate:**
```bash
docker compose down -v  # Remove volumes
docker system prune -a  # Remove dangling images
```

