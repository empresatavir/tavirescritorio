@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion
title TAVIR Escritorio - Parar Servicos
cd /d "%~dp0"
echo ===============================================================================
echo TAVIR ESCRITORIO - PARANDO SERVICOS
echo ===============================================================================
echo.
echo Encerrando processos vinculados as portas 9001 (Backend) e 9002 (Frontend)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort 9001,9002 -ErrorAction SilentlyContinue; if ($conns) { $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($p in $pids) { try { $proc = Get-Process -Id $p -ErrorAction SilentlyContinue; if ($proc) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host ('[OK] Processo encerrado: ' + $proc.Name + ' (PID: ' + $p + ')') -ForegroundColor Green } } catch {} } } else { Write-Host '[INFO] Nenhum processo ativo encontrado nas portas 9001 ou 9002.' -ForegroundColor Yellow }"
:: Limpar arquivos PID
if exist "%~dp0.pids\backend.pid" del "%~dp0.pids\backend.pid"
if exist "%~dp0.pids\frontend.pid" del "%~dp0.pids\frontend.pid"
echo.
echo Todos os servicos foram parados.
echo ===============================================================================
if "%1" neq "--no-pause" pause
goto :EOF