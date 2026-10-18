# InterviewAI PowerShell Launcher
$PSScriptRootPath = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "Starting Electron, Vite, and the FastAPI backend..." -ForegroundColor Cyan
Set-Location $PSScriptRootPath
npm run electron:dev
