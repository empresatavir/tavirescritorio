@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion
title TAVIR Escritorio - Status dos Servicos
cd /d "%~dp0"
echo ===============================================================================
echo TAVIR ESCRITORIO - STATUS DOS SERVICOS
echo ===============================================================================
echo.
set "BACKEND_PORT=9001"
set "FRONTEND_PORT=9002"
set "LOGS_DIR=%~dp0logs"
set "PIDS_DIR=%~dp0.pids"
:: Verificar Backend
echo [Backend FastAPI] Porta %BACKEND_PORT%
if exist "%PIDS_DIR%\backend.pid" (
 set /p BACKEND_PID=<"%PIDS_DIR%\backend.pid"
 tasklist /FI "PID eq !BACKEND_PID!" 2>nul | find "!BACKEND_PID!" >nul
 if !errorlevel! equ 0 (
  echo   PID: !BACKEND_PID! - Processo ativo
 ) else (
  echo   PID: !BACKEND_PID! - Processo NAO encontrado (stale PID)
 )
) else (
 echo   PID: nenhum arquivo .pid encontrado
)
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%BACKEND_PORT%/api/v1/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { Write-Host '  Health: OK (200)' -ForegroundColor Green } else { Write-Host ('  Health: HTTP ' + $r.StatusCode) -ForegroundColor Yellow } } catch { Write-Host '  Health: OFFLINE' -ForegroundColor Red }"
if exist "%LOGS_DIR%\backend.log" (
 echo   Log: %LOGS_DIR%\backend.log
 powershell -NoProfile -Command "$lines = Get-Content '%LOGS_DIR%\backend.log' -Tail 3 -ErrorAction SilentlyContinue; foreach ($l in $lines) { Write-Host ('    ' + $l) -ForegroundColor DarkGray }"
) else (
 echo   Log: arquivo nao encontrado
)
echo.
:: Verificar Frontend
echo [Frontend Vite] Porta %FRONTEND_PORT%
if exist "%PIDS_DIR%\frontend.pid" (
 set /p FRONTEND_PID=<"%PIDS_DIR%\frontend.pid"
 tasklist /FI "PID eq !FRONTEND_PID!" 2>nul | find "!FRONTEND_PID!" >nul
 if !errorlevel! equ 0 (
  echo   PID: !FRONTEND_PID! - Processo ativo
 ) else (
  echo   PID: !FRONTEND_PID! - Processo NAO encontrado (stale PID)
 )
) else (
 echo   PID: nenhum arquivo .pid encontrado
)
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%FRONTEND_PORT%' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { Write-Host '  Health: OK (200)' -ForegroundColor Green } else { Write-Host ('  Health: HTTP ' + $r.StatusCode) -ForegroundColor Yellow } } catch { Write-Host '  Health: OFFLINE' -ForegroundColor Red }"
if exist "%LOGS_DIR%\frontend.log" (
 echo   Log: %LOGS_DIR%\frontend.log
 powershell -NoProfile -Command "$lines = Get-Content '%LOGS_DIR%\frontend.log' -Tail 3 -ErrorAction SilentlyContinue; foreach ($l in $lines) { Write-Host ('    ' + $l) -ForegroundColor DarkGray }"
) else (
 echo   Log: arquivo nao encontrado
)
echo.
:: Verificar erros recentes nos logs
echo -------------------------------------------------------------------------------
echo [Erros recentes nos logs]
if exist "%LOGS_DIR%\backend.log" (
 powershell -NoProfile -Command "$errs = Select-String -Path '%LOGS_DIR%\backend.log' -Pattern 'error','traceback','exception','failed','fatal' -CaseSensitive:$false | Select-Object -Last 3; if ($errs) { foreach ($e in $errs) { Write-Host ('  [backend] ' + $e.Line) -ForegroundColor Red } } else { Write-Host '  [backend] Sem erros recentes' -ForegroundColor Green }"
) else (
 echo   [backend] Log nao encontrado
)
if exist "%LOGS_DIR%\frontend.log" (
 powershell -NoProfile -Command "$errs = Select-String -Path '%LOGS_DIR%\frontend.log' -Pattern 'error','traceback','exception','failed','fatal' -CaseSensitive:$false | Select-Object -Last 3; if ($errs) { foreach ($e in $errs) { Write-Host ('  [frontend] ' + $e.Line) -ForegroundColor Red } } else { Write-Host '  [frontend] Sem erros recentes' -ForegroundColor Green }"
) else (
 echo   [frontend] Log nao encontrado
)
echo.
echo ===============================================================================
if "%1"=="--no-pause" goto :EOF
pause
goto :EOF