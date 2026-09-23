@echo off
setlocal enabledelayedexpansion
title Journeymate Pro - Control Center

set "BACKEND_STATUS=STOPPED"
set "REVERB_STATUS=STOPPED"
set "QUEUE_STATUS=STOPPED"
set "VITE_STATUS=STOPPED"
set "NGROK_STATUS=STOPPED"

goto START_SERVICES

:START_SERVICES
cls
echo ========================================================
echo           STARTING JOURNEYMATE PRO SERVICES
echo ========================================================
echo.

echo [1/5] Stopping any existing instances...
taskkill /FI "WINDOWTITLE eq JM_*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq npm run dev*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq *artisan serve*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq *ngrok*" /F /T >nul 2>&1

echo [2/5] Starting Laravel Backend Server (Port 8000)...
start /min "JM_Backend" cmd /k "cd /d %~dp0backend && php artisan serve --host=0.0.0.0"
set "BACKEND_STATUS=RUNNING"

echo [3/5] Starting Laravel Reverb WebSocket (Port 8081)...
start /min "JM_Reverb" cmd /k "cd /d %~dp0backend && php artisan reverb:start --port=8081"
set "REVERB_STATUS=RUNNING"

echo [4/5] Starting Laravel Queue Worker...
start /min "JM_Queue" cmd /k "cd /d %~dp0backend && php artisan queue:listen"
set "QUEUE_STATUS=RUNNING"

echo [5/5] Starting Vite Frontend Server (Port 8080)...
start /min "JM_Vite" cmd /k "cd /d %~dp0 && npm run dev"
set "VITE_STATUS=RUNNING"

echo [Bonus] Starting ngrok Tunnel...
start /min "JM_Ngrok" cmd /k "ngrok http 8080 --domain=banking-uncorrupt-frays.ngrok-free.dev"
set "NGROK_STATUS=RUNNING"

echo.
echo ========================================================
echo   ALL SERVICES STARTED IN MINIMIZED WINDOWS!
echo ========================================================
echo.
timeout /t 2 >nul

:RUNNING_MENU
cls
echo ========================================================
echo         JOURNEYMATE PRO - CONTROL CENTER
echo ========================================================
echo.
echo  Background Services Status:
echo   [%BACKEND_STATUS%] Laravel Backend (Port 8000)   [JM_Backend]
echo   [%REVERB_STATUS%] Reverb WebSockets (Port 8081) [JM_Reverb]
echo   [%QUEUE_STATUS%] Queue Worker                 [JM_Queue]
echo   [%VITE_STATUS%] Vite Frontend (Port 8080)     [npm run dev]
echo   [%NGROK_STATUS%] ngrok Tunnel                  [JM_Ngrok]
echo.
echo ========================================================
echo  SELECT AN ACTION:
echo ========================================================
echo  [1] Start / Restart All Services
echo  [2] Stop All Background Services
echo  [3] Exit Control Center (Keep Services Running)
echo  [4] Stop All Services and Exit
echo ========================================================
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto START_SERVICES
if "%choice%"=="2" goto STOP_ONLY_SERVICES
if "%choice%"=="3" goto EXIT_KEEP_RUNNING
if "%choice%"=="4" goto STOP_AND_EXIT
goto RUNNING_MENU

:STOP_ONLY_SERVICES
cls
echo ========================================================
echo           STOPPING ALL BACKGROUND SERVICES...
echo ========================================================
echo.
echo Terminating background windows...
taskkill /FI "WINDOWTITLE eq JM_*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq npm run dev*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq *artisan serve*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq *ngrok*" /F /T >nul 2>&1

set "BACKEND_STATUS=STOPPED"
set "REVERB_STATUS=STOPPED"
set "QUEUE_STATUS=STOPPED"
set "VITE_STATUS=STOPPED"
set "NGROK_STATUS=STOPPED"

echo.
echo [SUCCESS] All Journeymate Pro background services stopped.
echo.
timeout /t 2 >nul
goto RUNNING_MENU

:EXIT_KEEP_RUNNING
cls
echo ========================================================
echo Exiting Control Center. Background services will continue running.
echo ========================================================
timeout /t 1 >nul
exit

:STOP_AND_EXIT
cls
echo ========================================================
echo           STOPPING ALL SERVICES & EXITING...
echo ========================================================
echo.
taskkill /FI "WINDOWTITLE eq JM_*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq npm run dev*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq *artisan serve*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq *ngrok*" /F /T >nul 2>&1

echo [SUCCESS] All services stopped. Goodbye!
timeout /t 2 >nul
exit
