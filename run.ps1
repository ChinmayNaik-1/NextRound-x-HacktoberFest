# InterviewAI PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Google Antigravity - InterviewAI Desktop Platform" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$PSScriptRootPath = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "[1/2] Starting FastAPI Backend on localhost:8000..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "$PSScriptRootPath\backend\venv\Scripts\python.exe" -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir `"$PSScriptRootPath\backend`"" -PassThru -WindowStyle Hidden

Write-Host "[2/2] Launching Electron + React Frontend..." -ForegroundColor Green
Set-Location "$PSScriptRootPath\frontend"
npm run electron:dev
