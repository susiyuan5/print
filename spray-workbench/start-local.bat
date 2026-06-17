@echo off
chcp 65001 >nul
title 喷涂工作台本地服务
cd /d "C:\Users\Administrator\Documents\喷涂\spray-workbench"

echo ============================================
echo    喷涂工作台 - 本地服务启动脚本
echo ============================================
echo.

:: 检查模型目录
if not exist "F:\print" (
    echo [INFO] 模型目录 F:\print 不存在，正在创建...
    mkdir "F:\print"
    echo [OK]  已创建 F:\print
)

:: 检查 node_modules
if not exist "node_modules" (
    echo [INFO] 首次使用，正在安装依赖...
    call npm install
    echo [OK]  依赖安装完成
)

echo [INFO] 启动本地服务...
echo [INFO] 后端端口: 3456
echo [INFO] 前端地址: http://localhost:5173/print/
echo.
echo  浏览器将自动打开 /print/models
echo  关闭此命令窗口即可停止全部服务
echo.

:: 启动后端（最小化窗口）
start /min npm.cmd run local-server

:: 等待后端就绪
timeout /t 2 /nobreak >nul

:: 打开浏览器
start http://localhost:5173/print/models

:: 启动前端（在前台显示）
npm.cmd run dev
