@echo off
chcp 65001 >nul
title TAVIR Escritório — Inicializador do Sistema
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===============================================================================
echo                TAVIR ESCRITÓRIO — INICIALIZADOR DO SISTEMA
echo ===============================================================================
echo.
echo [1/4] Verificando pré-requisitos de ambiente...

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
if %errorlevel% neq 0 (
    echo [ERRO] Python não foi encontrado no PATH do sistema nem em venv.
    echo Por favor, instale o Python 3.11+ e adicione-o às variáveis de ambiente.
    pause
    exit /b 1
)

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não foi encontrado no PATH do sistema.
    echo Por favor, instale o Node.js 18+ para executar o frontend.
    pause
    exit /b 1
)

:: Verificar npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] npm não foi encontrado no PATH do sistema.
    pause
    exit /b 1
)

echo [OK] Python e Node.js detectados com sucesso.
echo.

:: Verificar dependências do frontend (node_modules)
if not exist "%~dp0frontend\node_modules" (
    echo [AVISO] Pasta node_modules não encontrada. Instalando dependências do frontend...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
    echo [OK] Dependências do frontend instaladas.
    echo.
)

:: Verificar integridade do banco de dados SQLite
echo [2/4] Verificando integridade do banco de dados SQLite...
if not exist "%~dp0backend\tavir.db" (
    echo [AVISO] tavir.db não encontrado. Executando migrações iniciais Alembic...
    cd /d "%~dp0backend"
    "%PY_EXE%" -m alembic upgrade head
    cd /d "%~dp0"
) else (
    echo [OK] Banco de dados tavir.db encontrado.
)
echo.

:: Iniciar Backend FastAPI
echo [3/4] Iniciando Backend FastAPI (Porta 8000)...
start "TAVIR - Backend API (Porta 8000)" /D "%~dp0backend" cmd /k "title TAVIR - Backend API (Porta 8000) & "%PY_EXE%" run.py"

:: Iniciar Frontend SolidJS + Vite
echo [4/4] Iniciando Frontend SolidJS SPA (Porta 5173)...
start "TAVIR - Frontend SPA (Porta 5173)" /D "%~dp0frontend" cmd /k "title TAVIR - Frontend SPA (Porta 5173) & npm run dev"

echo.
echo ===============================================================================
echo               AGUARDANDO INICIALIZAÇÃO DOS SERVIÇOS...
echo ===============================================================================

:: Aguardar até que a porta 5173 esteja respondendo (máx 15 segundos)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$timeout = 15; $sw = [Diagnostics.Stopwatch]::StartNew();" ^
    "Write-Host -NoNewline 'Conectando ao frontend'; " ^
    "while ($sw.Elapsed.TotalSeconds -lt $timeout) {" ^
    "    try {" ^
    "        $r = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1;" ^
    "        if ($r.StatusCode -eq 200) { Write-Host ' [PRONTO]'; exit 0 }" ^
    "    } catch { }" ^
    "    Write-Host -NoNewline '.';" ^
    "    Start-Sleep -Milliseconds 800;" ^
    "};" ^
    "Write-Host ' [AVISO: Tempo limite excedido, abrindo mesmo assim]';"

echo.
echo ===============================================================================
echo                  TAVIR ESCRITÓRIO EM EXECUÇÃO!
echo ===============================================================================
echo.
echo  • Frontend (Painel Operacional):  http://localhost:5173/
echo  • Backend (Docs OpenAPI Swagger): http://127.0.0.1:8000/docs
echo.
echo Abrindo o navegador padrão...
start http://localhost:5173/

echo.
:MENU
echo -------------------------------------------------------------------------------
echo Escolha uma opção:
echo  [1] Reabrir no navegador (http://localhost:5173)
echo  [2] Abrir documentação da API Swagger (http://127.0.0.1:8000/docs)
echo  [3] Executar bateria de testes (pytest + npm run build)
echo  [4] Parar todos os serviços do escritório e sair
echo  [5] Apenas sair desta janela (manter serviços rodando em background)
echo -------------------------------------------------------------------------------
set /p OPCAO="Digite a opção desejada [1-5]: "

if "%OPCAO%"=="1" (
    start http://localhost:5173/
    goto MENU
)
if "%OPCAO%"=="2" (
    start http://127.0.0.1:8000/docs
    goto MENU
)
if "%OPCAO%"=="3" (
    echo.
    echo Executando testes do backend (pytest)...
    cd /d "%~dp0backend"
    "%PY_EXE%" -m pytest tests/ -v
    echo.
    echo Validando compilação do frontend (npm run build)...
    cd /d "%~dp0frontend"
    call npm run build
    cd /d "%~dp0"
    goto MENU
)
if "%OPCAO%"=="4" (
    echo.
    echo Encerrando processos do backend e frontend...
    call "%~dp0parar_escritorio.bat" --no-pause
    exit /b 0
)
if "%OPCAO%"=="5" (
    exit /b 0
)

echo Opção inválida. Tente novamente.
goto MENU
