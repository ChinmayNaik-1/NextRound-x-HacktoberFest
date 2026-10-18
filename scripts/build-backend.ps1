$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$buildEnv = Join-Path $backendDir ".build-venv"
$pythonExecutable = if ($env:PYTHON_EXECUTABLE) {
    $env:PYTHON_EXECUTABLE
} else {
    (Get-Command python -ErrorAction SilentlyContinue).Source
}
$requirements = Join-Path $backendDir "requirements.txt"
$buildRequirements = Join-Path $backendDir "requirements-build.txt"

if (-not $pythonExecutable) {
    throw "Python 3 is required on the build machine to package the backend."
}

$pythonInfo = & $pythonExecutable -c 'import sys, sysconfig; print(sys.version_info.major, sys.version_info.minor, sysconfig.get_platform())'
if ($LASTEXITCODE -ne 0) {
    throw "Could not inspect the selected Python interpreter: $pythonExecutable"
}

$pythonParts = $pythonInfo -split '\s+'
$pythonMajor = [int]$pythonParts[0]
$pythonMinor = [int]$pythonParts[1]
$pythonPlatform = $pythonParts[2]
if ($pythonPlatform -ne "win-amd64" -or $pythonMajor -ne 3 -or $pythonMinor -lt 11 -or $pythonMinor -gt 14) {
    throw "Backend packaging requires official 64-bit Windows CPython 3.11-3.14 (platform win-amd64). '$pythonExecutable' reports $pythonInfo. Install CPython from python.org or set PYTHON_EXECUTABLE to its python.exe."
}

& $pythonExecutable -m venv --clear $buildEnv
if ($LASTEXITCODE -ne 0) {
    throw "Could not create the isolated backend packaging environment."
}

$buildPython = Join-Path $buildEnv "Scripts\python.exe"
if (-not (Test-Path $buildPython)) {
    throw "The official Windows Python installer did not create the expected virtual environment."
}

& $buildPython -m pip install -r $requirements -r $buildRequirements
if ($LASTEXITCODE -ne 0) {
    throw "Could not install the backend packaging dependencies."
}

$pyinstallerArgs = @(
    "-m", "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onedir",
    "--name", "NextRoundBackend",
    "--distpath", (Join-Path $backendDir "dist"),
    "--specpath", (Join-Path $backendDir "build\pyinstaller"),
    "--workpath", (Join-Path $backendDir "build\pyinstaller"),
    "--paths", $backendDir,
    "--collect-all", "google.generativeai",
    "--collect-all", "google.api_core",
    "--collect-all", "uvicorn",
    "--collect-all", "pydantic",
    "--collect-all", "pypdf",
    "--hidden-import", "multipart",
    "--hidden-import", "main",
    "--hidden-import", "services.ai_agent",
    "--hidden-import", "services.code_runner",
    "--hidden-import", "services.db",
    "--hidden-import", "services.question_bank",
    "--hidden-import", "services.resume_parser",
    "--hidden-import", "services.speech",
    "--hidden-import", "collections",
    "--hidden-import", "collections.abc",
    "--hidden-import", "heapq",
    "--hidden-import", "bisect",
    "--hidden-import", "itertools",
    "--hidden-import", "functools",
    "--hidden-import", "math",
    "--hidden-import", "statistics",
    "--hidden-import", "re",
    "--hidden-import", "copy",
    "--hidden-import", "random",
    (Join-Path $backendDir "desktop_entry.py")
)

Push-Location $backendDir
try {
    & $buildPython @pyinstallerArgs
    if ($LASTEXITCODE -ne 0) {
        throw "PyInstaller failed to package the backend."
    }
}
finally {
    Pop-Location
}

$backendExecutable = Join-Path $backendDir "dist\NextRoundBackend\NextRoundBackend.exe"
if (-not (Test-Path $backendExecutable)) {
    throw "Backend packaging completed without producing NextRoundBackend.exe."
}

Write-Host "Packaged backend: $backendExecutable" -ForegroundColor Green
