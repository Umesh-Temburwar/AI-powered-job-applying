@echo off
chcp 65001 > nul
title Universal Job Auto Apply Bot
echo ===============================================================================
echo            UNIVERSAL JOB AUTO APPLY BOT (2026 EDITION)
echo ===============================================================================
echo Starting Universal Job Auto Apply Bot...
py Universal_Job_Auto_Apply.py
if %ERRORLEVEL% NEQ 0 (
    python Universal_Job_Auto_Apply.py
)
pause
