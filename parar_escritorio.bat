@echo off
chcp 65001 >nul
title TAVIR Escritório — Parar Serviços

echo ===============================================================================
echo                TAVIR ESCRITÓRIO — PARANDO SERVIÇOS
echo ===============================================================================
echo.
echo Encerrando processos vinculados às portas 8000 (Backend) e 5173 (Frontend)...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$conns = Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue;" ^
    "if ($conns) {" ^
    "    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique;" ^
    "    foreach ($p in $pids) {" ^
    "        try {" ^
    "            $proc = Get-Process -Id $p -ErrorAction SilentlyContinue;" ^
    "            if ($proc) {" ^
    "                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue;" ^
    "                Write-Host ('[OK] Processo encerrado: ' + $proc.Name + ' (PID: ' + $p + ')') -ForegroundColor Green;" ^
    "            }" ^
    "        } catch {}" ^
    "    }" ^
    "} else {" ^
    "    Write-Host '[INFO] Nenhum processo ativo encontrado nas portas 8000 ou 5173.' -ForegroundColor Yellow;" ^
    "}"

echo.
echo Todos os serviços foram parados.
echo ===============================================================================
if "%1" neq "--no-pause" pause
