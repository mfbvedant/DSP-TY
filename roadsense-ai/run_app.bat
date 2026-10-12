@echo off
title RoadSense AI - Cyber-Telemetry Web Cockpit
cd /d "%~dp0"

echo =====================================================================
echo  RoadSense AI: Modern React + FastAPI Automotive Cockpit
echo =====================================================================
echo.

if exist ".venv\Scripts\python.exe" (
    echo [OK] Launching RoadSense AI Cockpit on http://localhost:8000...
    start http://localhost:8000
    ".venv\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 8000
) else (
    echo [WARNING] .venv not found. Falling back to system python...
    start http://localhost:8000
    python -m uvicorn server:app --host 0.0.0.0 --port 8000
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Application failed to launch.
    pause
)
