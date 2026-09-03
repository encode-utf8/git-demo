@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo [终止] 清理行情侧车 PID 与看护进程...
if exist ".logs\data-service.pid" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-data.ps1" -Stop
)
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'powershell.exe' -and $_.CommandLine -like '*watch-data.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul

call :stop_port 8000 "行情侧车"
call :stop_port 3000 "Web 前端"

echo.
echo [完成] 已终止 Web 前端与行情侧车。
exit /b 0

:stop_port
set "PORT=%~1"
set "NAME=%~2"
set "FOUND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":%PORT%" ^| findstr /C:"LISTENING"') do (
    if not defined FOUND set "FOUND=1"
    echo [终止] %NAME% PID %%P
    taskkill /PID %%P /T /F >nul 2>nul
)
if not defined FOUND (
    echo [跳过] %NAME%（端口 %PORT%）未在运行。
)
exit /b 0
