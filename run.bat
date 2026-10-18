@echo off
title InterviewAI - Antigravity Desktop Platform
echo ========================================================
echo  NextRound - InterviewAI Desktop Platform
echo ========================================================
echo.

echo [1/2] Starting FastAPI Backend on localhost:8000...
start /b "" "%~dp0backend\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir "%~dp0backend"

echo [2/2] Launching Electron + React Frontend...
cd /d "%~dp0frontend"
npm run electron:dev
