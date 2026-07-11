@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ports = 3456,5173; $portProcessIds = Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne 0 } | Select-Object -ExpandProperty OwningProcess -Unique; if ($portProcessIds) { Stop-Process -Id $portProcessIds -Force -ErrorAction SilentlyContinue }; Get-Process cmd -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Spray Workbench*' -or $_.MainWindowTitle -like '*npm run dev*' -or $_.MainWindowTitle -like '*npm run local-server*' } | Stop-Process -Force -ErrorAction SilentlyContinue"
exit /b 0
