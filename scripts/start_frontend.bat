@echo off
chcp 65001 > nul
title AI-powered-job-applying - React Frontend (Port 5173)
cd /d "%~dp0..\frontend"

echo ===============================================================================
echo       AI-POWERED-JOB-APPLYING - REACT FRONTEND (PORT 5173)
echo ===============================================================================
echo.

:: Ensure Node.js & npm are in PATH
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
    ) else if exist "%LocalAppData%\Programs\nodejs\node.exe" (
        set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
    ) else (
        echo.
        echo ===============================================================================
        echo [!] Node.js and npm were not found on this system!
        echo Opening browser tabs to download Node.js LTS...
        echo ===============================================================================
        start https://nodejs.org/en/download/
        start https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi
        echo.
        echo Please install Node.js from the browser download, then re-run this script.
        echo.
        pause
        exit /b 1
    )
)

if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing frontend dependencies...
    call npm install
)

echo [INFO] Starting Vite dev server on http://localhost:5173 ...
echo.
call npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo ===============================================================================
    echo [ERROR] Frontend dev server stopped or failed to start.
    echo ===============================================================================
)
echo.
pause
