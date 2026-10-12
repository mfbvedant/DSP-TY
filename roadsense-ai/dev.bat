@echo off
title RoadSense AI - Full-Stack Dev Mode
cd /d "%~dp0"

echo Starting FastAPI Backend (Port 8000)...
start "FastAPI Backend" .venv\Scripts\python.exe -m uvicorn server:app --reload --port 8000

echo Starting Vite React Dev Server (Port 3000)...
start "Vite Dev Server" cmd /k "cd frontend && npm run dev"

echo Opening browser at http://localhost:3000...
timeout /t 3 >nul
start http://localhost:3000
