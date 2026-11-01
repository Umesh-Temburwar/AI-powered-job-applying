@echo off
chcp 65001 > nul
title Universal Job Auto Apply Bot (2026 Edition)
cd /d "%~dp0"

cls
echo ===============================================================================
echo            UNIVERSAL JOB AUTO APPLY BOT (2026 PRO EDITION)
echo ===============================================================================
echo.

:: Detect Python executable (.venv or system py/python)
set "PY_CMD=python"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0.venv\Scripts\python.exe"
    echo [INFO] Detected virtual environment: .venv\Scripts\python.exe
) else (
    where py >nul 2>nul && (
        set "PY_CMD=py"
        echo [INFO] Detected Python Launcher: py
    ) || (
        echo [INFO] Using standard Python: python
    )
)

:: If user passes --cli, launch CLI mode
if "%1"=="--cli" goto launch_cli
if "%1"=="-c" goto launch_cli

echo.
echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8001 ...
start "Universal Job Bot - FastAPI Backend (Port 8001)" cmd /k "cd /d "%~dp0" && "%PY_CMD%" -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001 --reload"

echo [2/3] Starting Vite React Frontend on http://localhost:5173 ...
start "Universal Job Bot - React Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo [3/3] Initializing servers and launching web browser...
timeout /t 3 /nobreak > nul
start http://localhost:5173/

echo.
echo ===============================================================================
echo [SUCCESS] Universal Job Bot Application is running!
echo ===============================================================================
echo   - Frontend:      http://localhost:5173
echo   - Backend API:   http://127.0.0.1:8001
echo   - API Swagger:   http://127.0.0.1:8001/docs
echo ===============================================================================
echo Keep the backend and frontend command windows open while using the bot.
echo To stop the bot, simply close both opened windows.
echo.
pause
exit /b 0

:launch_cli
echo.
echo [CLI MODE] Launching Universal Job Auto Apply CLI Bot...
"%PY_CMD%" Universal_Job_Auto_Apply.py %*
pause
