@echo off
chcp 65001 > nul
title Universal Job Bot - React Frontend (Port 5173)
cd /d "%~dp0..\frontend"

echo ===============================================================================
echo       UNIVERSAL JOB AUTO APPLY BOT - REACT FRONTEND (PORT 5173)
echo ===============================================================================
echo.

if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing frontend dependencies...
    call npm install
)

echo [INFO] Starting Vite dev server...
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

