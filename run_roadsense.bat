@echo off
title RoadSense AI Launcher
cd /d "%~dp0roadsense-ai"

if exist ".venv\Scripts\python.exe" (
    start http://localhost:8000
    ".venv\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 8000
) else (
    start http://localhost:8000
    python -m uvicorn server:app --host 0.0.0.0 --port 8000
)

if %ERRORLEVEL% NEQ 0 (
    pause
)
