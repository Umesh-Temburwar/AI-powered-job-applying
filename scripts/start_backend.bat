@echo off
chcp 65001 > nul
title Universal Job Bot - FastAPI Backend (Port 8001)
cd /d "%~dp0.."

echo ===============================================================================
echo       UNIVERSAL JOB AUTO APPLY BOT - FASTAPI BACKEND (PORT 8001)
echo ===============================================================================
echo.

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

echo [INFO] Starting Uvicorn Server on 127.0.0.1:8001 with reload...
echo.
"%PY_EXE%" -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001 --reload

if %ERRORLEVEL% neq 0 (
    echo.
    echo ===============================================================================
    echo [ERROR] FastAPI backend failed to start or exited with an error code.
    echo Please make sure dependencies are installed:
    echo   pip install -r requirements.txt
    echo ===============================================================================
)
echo.
pause

