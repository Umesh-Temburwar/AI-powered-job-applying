@echo off
chcp 65001 > nul
title AI-powered-job-applying (2026 Edition)
cd /d "%~dp0"

cls
echo ===============================================================================
echo            AI-POWERED-JOB-APPLYING (2026 PRO EDITION)
echo ===============================================================================
echo.

REM CLI mode override
if "%1"=="--cli" goto launch_cli
if "%1"=="-c" goto launch_cli
if "%1"=="--setup" goto run_full_setup
if "%1"=="--reinstall" goto run_full_setup

REM ===============================================================================
REM 1. FAST-PATH VERIFICATION (For Existing Users - Runs in <0.2 seconds)
REM ===============================================================================
if exist "%~dp0.venv\Scripts\python.exe" if exist "%~dp0frontend\node_modules" if exist "%~dp0.env" if exist "%~dp0data\profile_data.json" (
    "%~dp0.venv\Scripts\python.exe" -m uvicorn --version >nul 2>nul && "%~dp0.venv\Scripts\python.exe" -c "import selenium" >nul 2>nul && (
        echo [INFO] Existing installation verified! Runtimes and packages intact.
        goto launch_servers
    )
)

REM ===============================================================================
REM 2. NEW USER / FRESH CLONE SELF-HEALING SETUP & ANALYSIS
REM ===============================================================================
:run_full_setup
echo [ANALYSIS] Performing complete system environment and dependency analysis...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup_environment.ps1"
if errorlevel 1 (
    echo.
    echo ===============================================================================
    echo [ERROR] Setup could not complete automatically.
    echo Please resolve the missing dependency above and run run.bat again.
    echo ===============================================================================
    pause
    exit /b 1
)

REM ===============================================================================
REM 3. SERVER LAUNCHER (FastAPI Backend + React Frontend + Browser)
REM ===============================================================================
:launch_servers
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)
echo.
echo [INFO] Checking and freeing ports 8001 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":8001 .*LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":5173 .*LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>nul
)

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8001 ...
start "AI-powered-job-applying - FastAPI Backend (Port 8001)" cmd /k call "%~dp0scripts\start_backend.bat"

echo [2/3] Starting Vite React Frontend on http://localhost:5173 ...
start "AI-powered-job-applying - React Frontend (Port 5173)" cmd /k call "%~dp0scripts\start_frontend.bat"

echo.
echo [3/3] Initializing servers and waiting for ports 8001 and 5173...
powershell -NoProfile -Command "$ready = $false; for ($i=0; $i -lt 15; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8001/health' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 600 }; if ($ready) { Write-Host '      [OK] REST API is live and responding on http://127.0.0.1:8001!' -ForegroundColor Green }"

echo Opening Web Browser at http://localhost:5173/ ...
start http://localhost:5173/

echo.
echo ===============================================================================
echo [SUCCESS] REST API ON HO GAYI HAI! Application is running!
echo ===============================================================================
echo   - Web Dashboard:  http://localhost:5173
echo   - REST API Live:  http://127.0.0.1:8001 (Click or open in browser)
echo   - API Swagger UI: http://127.0.0.1:8001/docs
echo ===============================================================================
echo Both server consoles have been opened in separate windows.
echo Keep them running while using the bot.
echo.
pause
exit /b 0

:launch_cli
shift
echo [CLI MODE] Launching Universal Job Auto Apply CLI Bot...
if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" Universal_Job_Auto_Apply.py %*
) else (
    python Universal_Job_Auto_Apply.py %*
)
pause
exit /b %ERRORLEVEL%
