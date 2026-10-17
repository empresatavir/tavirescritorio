@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion
title TAVIR Escritorio - Inicializador do Sistema

cd /d "%~dp0"

echo ===============================================================================
echo                TAVIR ESCRITORIO - INICIALIZADOR DO SISTEMA
echo ===============================================================================
echo.
echo [1/5] Verificando pre-requisitos de ambiente...

:: Detectar interpretador Python (venv local ou global)
set "PY_EXE=python"
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0backend\.venv\Scripts\python.exe"
    echo [INFO] Ambiente virtual detectado: backend\.venv
) else if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0.venv\Scripts\python.exe"
    echo [INFO] Ambiente virtual detectado: .venv
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0venv\Scripts\python.exe"
    echo [INFO] Ambiente virtual detectado: venv
)

:: Verificar se Python funciona
"%PY_EXE%" --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERRO] Python nao foi encontrado no PATH do sistema nem em venv.
    echo Por favor, instale o Python 3.11+ e adicione-o as variaveis de ambiente.
    pause
    exit /b 1
)

:: Verificar Node.js
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERRO] Node.js nao foi encontrado no PATH do sistema.
    echo Por favor, instale o Node.js 18+ para executar o frontend.
    pause
    exit /b 1
)

:: Verificar npm
npm --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERRO] npm nao foi encontrado no PATH do sistema.
    pause
    exit /b 1
)

echo [OK] Python e Node.js detectados com sucesso.
echo.

:: Verificar dependencias do frontend (node_modules)
set "NM_PATH=%~dp0frontend\node_modules"
if not exist "!NM_PATH!" (
    echo [AVISO] Pasta node_modules nao encontrada. Instalando dependencias do frontend...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
    echo [OK] Dependencias do frontend instaladas.
    echo.
)

:: Criar diretorios de logs e PIDs
if not exist "%~dp0logs" mkdir "%~dp0logs"
if not exist "%~dp0.pids" mkdir "%~dp0.pids"

echo [2/5] Verificando integridade do banco de dados SQLite...
if not exist "%~dp0backend\tavir.db" (
    echo [AVISO] tavir.db nao encontrado. Executando migracoes iniciais Alembic...
    cd /d "%~dp0backend"
    "%PY_EXE%" -m alembic upgrade head
    cd /d "%~dp0"
) else (
    echo [OK] Banco de dados tavir.db encontrado.
)
echo.

:: Encerrar processos anteriores nas portas 9001 e 9002 (limpeza preventiva)
echo [3/5] Limpando processos residuais nas portas 9001 e 9002...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort 9001,9002 -ErrorAction SilentlyContinue; if ($conns) { $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($p in $pids) { try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host ('  [OK] PID ' + $p + ' encerrado') -ForegroundColor Green } catch {} } } else { Write-Host '  [OK] Portas livres.' -ForegroundColor Green }"
echo.

:: Iniciar Backend FastAPI em segundo plano (porta 9001)
echo [4/5] Iniciando Backend FastAPI (Porta 9001) em segundo plano...
set "BACKEND_LOG=%~dp0logs\backend.log"
set "BACKEND_PID_FILE=%~dp0.pids\backend.pid"

cd /d "%~dp0backend"
start "" /B cmd /c "set TAVIR_PORT=9001 && "%PY_EXE%" run.py > "%BACKEND_LOG%" 2>&1"

:: Capturar PID do processo iniciado
powershell -NoProfile -Command "Start-Sleep -Milliseconds 800; $proc = Get-NetTCPConnection -LocalPort 9001 -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Set-Content -Path '%BACKEND_PID_FILE%' -Value $proc.OwningProcess; Write-Host ('  [OK] Backend PID: ' + $proc.OwningProcess) -ForegroundColor Green } else { Write-Host '  [AVISO] Backend ainda iniciando...' -ForegroundColor Yellow }"
cd /d "%~dp0"
echo.

:: Iniciar Frontend SolidJS + Vite em segundo plano (porta 9002)
echo [5/5] Iniciando Frontend SolidJS SPA (Porta 9002) em segundo plano...
set "FRONTEND_LOG=%~dp0logs\frontend.log"
set "FRONTEND_PID_FILE=%~dp0.pids\frontend.pid"

cd /d "%~dp0frontend"
start "" /B cmd /c "npm run dev -- --port 9002 > "%FRONTEND_LOG%" 2>&1"

:: Capturar PID do processo iniciado
powershell -NoProfile -Command "Start-Sleep -Milliseconds 2000; $proc = Get-NetTCPConnection -LocalPort 9002 -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Set-Content -Path '%FRONTEND_PID_FILE%' -Value $proc.OwningProcess; Write-Host ('  [OK] Frontend PID: ' + $proc.OwningProcess) -ForegroundColor Green } else { Write-Host '  [AVISO] Frontend ainda iniciando...' -ForegroundColor Yellow }"
cd /d "%~dp0"
echo.

echo ===============================================================================
echo               AGUARDANDO INICIALIZACAO DOS SERVICOS...
echo ===============================================================================

:: Aguardar ate que a porta 9002 esteja respondendo (max 25 segundos)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$timeout = 25; $sw = [Diagnostics.Stopwatch]::StartNew(); Write-Host -NoNewline 'Conectando ao frontend'; while ($sw.Elapsed.TotalSeconds -lt $timeout) { try { $r = Invoke-WebRequest -Uri 'http://localhost:9002' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { Write-Host ' [PRONTO]'; exit 0 } } catch {}; Write-Host -NoNewline '.'; Start-Sleep -Milliseconds 800 }; Write-Host ' [AVISO: Tempo limite excedido, abrindo mesmo assim]'"

echo.
echo ===============================================================================
echo                  TAVIR ESCRITORIO EM EXECUCAO!
echo ===============================================================================
echo.
echo   Frontend (Painel Operacional):  http://localhost:9002/
echo   Backend (Docs OpenAPI Swagger): http://127.0.0.1:9001/docs
echo   Logs:                           %~dp0logs\
echo   Status:                         .\status_escritorio.bat
echo.
echo Abrindo o navegador padrao...
start http://localhost:9002/

echo.
:MENU
echo -------------------------------------------------------------------------------
echo Escolha uma opcao:
echo  [1] Reabrir no navegador (http://localhost:9002)
echo  [2] Abrir documentacao da API Swagger (http://127.0.0.1:9001/docs)
echo  [3] Executar bateria de testes (pytest + npm run build)
echo  [4] Ver status dos servicos
echo  [5] Parar todos os servicos do escritorio e sair
echo  [6] Apenas sair desta janela (manter servicos rodando em background)
echo -------------------------------------------------------------------------------
set /p OPCAO="Digite a opcao desejada [1-6]: "

if "!OPCAO!"=="1" (
    start http://localhost:9002/
    goto MENU
)
if "!OPCAO!"=="2" (
    start http://127.0.0.1:9001/docs
    goto MENU
)
if "!OPCAO!"=="3" (
    echo.
    echo Executando testes do backend (pytest)...
    cd /d "%~dp0backend"
    "%PY_EXE%" -m pytest tests/ -v
    echo.
    echo Validando compilacao do frontend (npm run build)...
    cd /d "%~dp0frontend"
    call npm run build
    cd /d "%~dp0"
    goto MENU
)
if "!OPCAO!"=="4" (
    echo.
    call "%~dp0status_escritorio.bat" --no-pause
    goto MENU
)
if "!OPCAO!"=="5" (
    echo.
    echo Encerrando processos do backend e frontend...
    call "%~dp0parar_escritorio.bat" --no-pause
    exit /b 0
)
if "!OPCAO!"=="6" (
    exit /b 0
)

echo Opcao invalida. Tente novamente.
goto MENU