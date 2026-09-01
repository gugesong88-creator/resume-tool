@echo off
title 简历制作工具 - 本地服务引擎
echo =================================================
echo   简历制作工具 - 本地服务引擎已激活 (Windows)
echo =================================================
echo 工作目录: %~dp0
echo 使用说明: 直接在此窗口查看运行状态。不使用时，直接关闭此窗口即可彻底退出工具。
echo =================================================

cd /d "%~dp0"

:: Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 goto ERROR_NO_NODE

:: Port Release
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Run Server
node server.js
goto END

:ERROR_NO_NODE
echo.
echo 错误: 未检测到 Node.js 环境!
echo 请先在您的电脑上安装 Node.js (推荐选择 LTS 版本)。
echo 下载地址: https://nodejs.org/
echo.
echo 安装完成后，请重新双击运行此脚本。
echo.
pause
exit /b 1

:END
pause
