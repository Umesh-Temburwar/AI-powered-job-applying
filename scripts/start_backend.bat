@echo off
chcp 65001 > nul
title AI-powered-job-applying - FastAPI Backend (Port 8001)

set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

echo ===============================================================================
echo       AI-POWERED-JOB-APPLYING - FASTAPI BACKEND (PORT 8001)
echo ===============================================================================
echo.

:: Automatically kill any orphaned/zombie process occupying port 8001 before starting
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":8001 .*LISTENING"') do (
    echo [INFO] Freeing occupied port 8001 - PID %%a...
    taskkill /F /T /PID %%a >nul 2>nul
)

set "PY_EXE="
if exist "%ROOT_DIR%\.venv\Scripts\python.exe" (
    "%ROOT_DIR%\.venv\Scripts\python.exe" -c "import sys" >nul 2>nul
    if not errorlevel 1 (
        set "PY_EXE=%ROOT_DIR%\.venv\Scripts\python.exe"
        echo [INFO] Using virtual environment Python: .venv\Scripts\python.exe
    )
)

if "%PY_EXE%"=="" (
    if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
        set "PY_EXE=%LocalAppData%\Programs\Python\Python311\python.exe"
        echo [INFO] Using system Python: %LocalAppData%\Programs\Python\Python311\python.exe
    ) else if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
        set "PY_EXE=%LocalAppData%\Programs\Python\Python312\python.exe"
        echo [INFO] Using system Python: %LocalAppData%\Programs\Python\Python312\python.exe
    ) else if exist "C:\Program Files\Python311\python.exe" (
        set "PY_EXE=C:\Program Files\Python311\python.exe"
        echo [INFO] Using system Python: C:\Program Files\Python311\python.exe
    ) else if exist "C:\Program Files\Python312\python.exe" (
        set "PY_EXE=C:\Program Files\Python312\python.exe"
        echo [INFO] Using system Python: C:\Program Files\Python312\python.exe
    ) else (
        where py >nul 2>nul
        if not errorlevel 1 (
            py -3 -c "import sys" >nul 2>nul
            if not errorlevel 1 (
                set "PY_EXE=py"
                echo [INFO] Using Python launcher: py
            )
        )
        if "%PY_EXE%"=="" (
            where python >nul 2>nul
            if not errorlevel 1 (
                python -c "import sys" >nul 2>nul
                if not errorlevel 1 (
                    set "PY_EXE=python"
                    echo [INFO] Using system Python: python
                )
            )
        )
    )
)

if "%PY_EXE%"=="" (
    echo.
    echo ===============================================================================
    echo [!] Python 3.10+ was not found on this system!
    echo Opening browser tabs to download Python 3.11...
    echo ===============================================================================
    start https://www.python.org/downloads/
    start https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
    echo.
    echo Please install Python and ensure Add python.exe to PATH is checked, then re-run.
    echo.
    pause
    exit /b 1
)

set "PYTHONPATH=%ROOT_DIR%\backend;%ROOT_DIR%"

REM Development mode flag: only use --reload if explicitly requested
set "RELOAD_OPTS="
if "%1"=="--dev" set "RELOAD_OPTS=--reload --reload-dir \"%ROOT_DIR%\backend\""
if "%2"=="--dev" set "RELOAD_OPTS=--reload --reload-dir \"%ROOT_DIR%\backend\""

:server_supervisor_loop
echo.
echo ===============================================================================
echo [INFO] Starting FastAPI Uvicorn Server on http://127.0.0.1:8001...
echo ===============================================================================
echo.

"%PY_EXE%" -m uvicorn main:app --app-dir "%ROOT_DIR%\backend" --host 127.0.0.1 --port 8001 %RELOAD_OPTS%

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo ===============================================================================
echo [ALERT] FastAPI Backend server process stopped (Exit Code: %EXIT_CODE%).
echo [SELF-HEALING] Auto-restarting FastAPI Backend in 2 seconds...
echo Press Ctrl+C anytime to terminate.
echo ===============================================================================
timeout /t 2 /nobreak >nul
goto server_supervisor_loop
