@echo off
chcp 65001 >nul
title 喷涂工作台 - 停止服务
echo ============================================
echo    喷涂工作台 - 停止服务
echo ============================================
echo.
echo  方式一：直接关闭启动脚本的命令窗口即可停止所有服务。
echo.
echo  方式二：按任意键强制结束 node 进程（谨慎使用）。
echo.
pause >nul

echo [INFO] 正在结束 node 进程...
taskkill /f /im node.exe >nul 2>&1
echo [OK]  node 进程已结束。
echo.
echo  如果 Vite 或 npm 仍在运行，请手动关闭相关命令窗口。
pause
