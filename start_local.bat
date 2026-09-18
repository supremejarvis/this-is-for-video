@echo off
title Apollo Engineering Local Dev Server (PostgreSQL + FastAPI + Vite)
echo ===================================================================
echo   Starting Apollo Engineering Local Servers with PostgreSQL
echo ===================================================================

echo [1/3] Checking PostgreSQL service...
net start | findstr /i "postgres" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Starting PostgreSQL service...
    net start postgresql-16 >nul 2>&1 || net start postgresql-x64-18 >nul 2>&1
)

echo [2/3] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "Apollo FastAPI Backend (PostgreSQL)" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Launching Frontend (Vite) on http://localhost:3000 ...
start "Apollo Frontend (Vite)" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ===================================================================
echo   Local Servers Active:
echo   - Frontend Portal:  http://localhost:3000
echo   - FastAPI Backend:  http://127.0.0.1:8000
echo   - API Documentation: http://127.0.0.1:8000/docs
echo   - Database: PostgreSQL 5432 (Database: apollo_ecommerce)
echo ===================================================================
