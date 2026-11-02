@echo off
chcp 65001 > nul
title AI-powered-job-applying (2026 Edition)
cd /d "%~dp0"

cls
echo ===============================================================================
echo            AI-POWERED-JOB-APPLYING (2026 PRO EDITION)
echo ===============================================================================
echo.

:: CLI mode override
if "%1"=="--cli" goto launch_cli
if "%1"=="-c" goto launch_cli

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8001 ...
start "AI-powered-job-applying - FastAPI Backend (Port 8001)" cmd /k call "%~dp0scripts\start_backend.bat"

echo [2/3] Starting Vite React Frontend on http://localhost:5173 ...
start "AI-powered-job-applying - React Frontend (Port 5173)" cmd /k call "%~dp0scripts\start_frontend.bat"

echo.
echo [3/3] Initializing servers and waiting for ports...
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo Opening Web Browser at http://localhost:5173/ ...
start http://localhost:5173/

echo.
echo ===============================================================================
echo [SUCCESS] AI-powered-job-applying Application is running!
echo ===============================================================================
echo   - Frontend:      http://localhost:5173
echo   - Backend API:   http://127.0.0.1:8001
echo   - API Docs:      http://127.0.0.1:8001/docs
echo ===============================================================================
echo Both server consoles have been opened in separate windows.
echo Keep them running while using the bot.
echo.
pause
exit /b 0

:launch_cli
echo [CLI MODE] Launching Universal Job Auto Apply CLI Bot...
if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" Universal_Job_Auto_Apply.py %*
) else (
    python Universal_Job_Auto_Apply.py %*
)
pause
