@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion
title TAVIR Escritorio - Inicializador do Sistema
cd /d "%~dp0"

cls
echo ===============================================================================
echo TAVIR ESCRITORIO - INICIALIZADOR DO SISTEMA
echo ===============================================================================
echo.

echo [0/6] Alinhando master local com origin...
call "%~dp0alinhar_master.bat" --no-pause --quiet
if errorlevel 1 (
  echo [AVISO] Nao foi possivel alinhar master agora. Continuando a inicializacao...
) else (
  echo [OK] Git master verificado/atualizado.
)
echo.

echo [1/6] Verificando pre-requisitos...
set "PY_EXE=python"
if exist "%~dp0backend\.venv\Scripts\python.exe" set "PY_EXE=%~dp0backend\.venv\Scripts\python.exe"
if exist "%~dp0.venv\Scripts\python.exe" set "PY_EXE=%~dp0.venv\Scripts\python.exe"

"%PY_EXE%" --version >nul 2>&1
if errorlevel 1 (
 echo [ERRO] Python nao encontrado. Instale o Python 3.11+.
 pause
 exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
 echo [ERRO] Node.js nao encontrado. Instale o Node.js 18+.
 pause
 exit /b 1
)
echo [OK] Python e Node.js prontos.

if not exist "%~dp0logs" mkdir "%~dp0logs"
if not exist "%~dp0.pids" mkdir "%~dp0.pids"

echo [2/6] Verificando banco de dados...
if not exist "%~dp0backend\tavir.db" (
 echo [AVISO] tavir.db nao encontrado.
) else (
 echo [OK] Banco de dados encontrado.
)

echo [3/6] Limpando portas 9001 e 9002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9001" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9002" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo [OK] Portas liberadas.

echo [4/6] Iniciando Backend (Porta 9001)...
cd /d "%~dp0backend"
start "TAVIR-Backend" /MIN cmd /c "%PY_EXE% run.py > ..\logs\backend.log 2>&1"
cd /d "%~dp0"
timeout /t 2 /nobreak >nul
echo [OK] Backend iniciado.

echo [5/6] Iniciando Frontend (Porta 9002)...
cd /d "%~dp0frontend"
start "TAVIR-Frontend" /MIN cmd /c "npm run dev -- --port 9002 > ..\logs\frontend.log 2>&1"
cd /d "%~dp0"
echo [OK] Frontend iniciado.

echo.
echo Aguardando servicos (10s)...
timeout /t 10 /nobreak >nul

:MENU
cls
echo ===============================================================================
echo TAVIR ESCRITORIO EM EXECUCAO!
echo ===============================================================================
echo.
echo Frontend: http://localhost:9002/
echo Backend: http://127.0.0.1:9001/docs
echo.
echo -------------------------------------------------------------------------------
echo [1] Reabrir navegador
echo [2] Abrir Swagger API
echo [3] Ver Status detalhado
echo [4] Alinhar master com origin
echo [5] Parar todos os servicos e sair
echo [6] Sair desta janela (servicos continuam)
echo -------------------------------------------------------------------------------
set /p "OPCAO=Escolha [1-6]: "

if "!OPCAO!"=="1" start http://localhost:9002/ & goto MENU
if "!OPCAO!"=="2" start http://127.0.0.1:9001/docs & goto MENU
if "!OPCAO!"=="3" call "%~dp0status_escritorio.bat" --no-pause & goto MENU
if "!OPCAO!"=="4" call "%~dp0alinhar_master.bat" --no-pause & goto MENU
if "!OPCAO!"=="5" call "%~dp0parar_escritorio.bat" --no-pause & exit /b 0
if "!OPCAO!"=="6" exit /b 0

echo Opcao invalida.
pause >nul
goto MENU
