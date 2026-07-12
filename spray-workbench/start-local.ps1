$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path "F:\3D打印手办文件" | Out-Null

if (-not (Test-Path (Join-Path $root "node_modules"))) {
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

$ports = 3456, 5173
$portProcessIds = Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue |
  Where-Object { $_.OwningProcess -ne 0 } |
  Select-Object -ExpandProperty OwningProcess -Unique
if ($portProcessIds) {
  Stop-Process -Id $portProcessIds -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
}

Get-Process cmd -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -like "*Spray Workbench*" -or $_.MainWindowTitle -like "*npm run dev*" -or $_.MainWindowTitle -like "*npm run local-server*" } |
  Stop-Process -Force -ErrorAction SilentlyContinue

$backendLog = Join-Path $logDir "backend.log"
$frontendLog = Join-Path $logDir "frontend.log"

Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/d", "/s", "/c", "node server.mjs >> `"$backendLog`" 2>>&1" `
  -WorkingDirectory $root `
  -WindowStyle Hidden

Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/d", "/s", "/c", "npm.cmd run dev -- --host 127.0.0.1 >> `"$frontendLog`" 2>>&1" `
  -WorkingDirectory $root `
  -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds(60)
$ready = $false
do {
  Start-Sleep -Milliseconds 500
  $listeningPorts = Get-NetTCPConnection -LocalPort 3456,5173 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty LocalPort -Unique
  $ready = ($listeningPorts -contains 3456) -and ($listeningPorts -contains 5173)
} until ($ready -or (Get-Date) -gt $deadline)

if ($ready) {
  Start-Process "http://localhost:5173/print/trend-radar"
  exit 0
}

exit 1
