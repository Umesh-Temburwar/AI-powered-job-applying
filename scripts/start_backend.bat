@echo off
chcp 65001 > nul
title AI-powered-job-applying - FastAPI Backend (Port 8001)
cd /d "%~dp0.."

echo ===============================================================================
echo       AI-POWERED-JOB-APPLYING - FASTAPI BACKEND (PORT 8001)
echo ===============================================================================
echo.

:: Automatically kill any orphaned/zombie process occupying port 8001 before starting
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":8001 .*LISTENING"') do (
    echo [INFO] Freeing occupied port 8001 (terminating PID %%a)...
    taskkill /F /T /PID %%a >nul 2>nul
)

set "PY_EXE="
if exist "%CD%\.venv\Scripts\python.exe" (
    set "PY_EXE=%CD%\.venv\Scripts\python.exe"
    echo [INFO] Using virtual environment Python: .venv\Scripts\python.exe
) else (
    where py >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "PY_EXE=py"
        echo [INFO] Using Python launcher: py
    ) else (
        set "PY_EXE=python"
        echo [INFO] Using system Python: python
    )
)

echo [INFO] Starting Uvicorn Server on 127.0.0.1:8001 (watching backend/ only)...
echo.
"%PY_EXE%" -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001 --reload --reload-dir backend

if %ERRORLEVEL% neq 0 (
    echo.
    echo ===============================================================================
    echo [ERROR] FastAPI backend failed to start or exited with an error code.
    echo To automatically verify and install all dependencies, run:
    echo   run.bat --setup
    echo ===============================================================================
)
echo.
pause

