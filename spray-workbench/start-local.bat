@echo off
chcp 65001 >nul
title 喷涂工作台 - 启动中
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
) else (
    echo [OK]  模型目录 F:\print 已存在
)

:: 检查 node_modules
if not exist "node_modules" (
    echo [INFO] 首次使用，正在安装依赖...
    call npm install
    echo [OK]  依赖安装完成
) else (
    echo [OK]  依赖已安装
)

echo.
echo [INFO] 正在启动本地后端服务...
start "喷涂工作台本地后端" /min cmd /c npm.cmd run local-server

echo [INFO] 正在启动前端开发服务器...
start "喷涂工作台前端" cmd /c npm.cmd run dev

echo [INFO] 等待服务启动 8 秒...
timeout /t 8 /nobreak >nul

echo [OK]  正在打开浏览器...
start http://localhost:5173/print/models

cls
echo ============================================
echo    喷涂工作台 - 本地服务启动完成
echo ============================================
echo.
echo  后端地址：http://localhost:3456/api/local-models
echo  前端地址：http://localhost:5173/print/models
echo.
echo  两个服务窗口已在后台运行：
echo    - [喷涂工作台本地后端]
echo    - [喷涂工作台前端]
echo.
echo  关闭这两个窗口即可停止所有服务。
echo.
pause
