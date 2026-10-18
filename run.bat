@echo off
title NextRound Desktop Platform
echo ========================================================
echo  NextRound - InterviewAI Desktop Platform
echo ========================================================
echo.

echo Starting Electron, Vite, and the FastAPI backend...
cd /d "%~dp0"
npm run electron:dev
