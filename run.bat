@echo off
chcp 65001 > nul
title Universal Job Auto Apply Bot (2026 Edition)
cls
echo ===============================================================================
echo            UNIVERSAL JOB AUTO APPLY BOT (2026 PRO EDITION)
echo ===============================================================================
echo [1] Launch Interactive CLI Bot
echo [2] Launch Modern Web UI Dashboard (http://localhost:5000)
echo [3] Run ALL Platforms Immediately
echo [4] Sync Profiles (Naukri + Internshala)
echo [5] View Applied Jobs Report
echo ===============================================================================
set /p choice="Enter choice [1-5] (Default: 1): "
if "%choice%"=="" set choice=1

if "%choice%"=="1" (
    py Universal_Job_Auto_Apply.py || python Universal_Job_Auto_Apply.py
)
if "%choice%"=="2" (
    py Universal_Job_Auto_Apply.py --gui || python Universal_Job_Auto_Apply.py --gui
)
if "%choice%"=="3" (
    py Universal_Job_Auto_Apply.py --platform all || python Universal_Job_Auto_Apply.py --platform all
)
if "%choice%"=="4" (
    py Universal_Job_Auto_Apply.py --update-all-profiles || python Universal_Job_Auto_Apply.py --update-all-profiles
)
if "%choice%"=="5" (
    py Universal_Job_Auto_Apply.py --report || python Universal_Job_Auto_Apply.py --report
)
pause
