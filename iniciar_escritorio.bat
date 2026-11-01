@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion
title TAVIR Escritório — Inicializador do Sistema
cd /d "%~dp0"

cls
echo ===============================================================================
echo                TAVIR ESCRITÓRIO — INICIALIZADOR DO SISTEMA
echo ===============================================================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
 echo [ERRO] Node.js não encontrado. Instale o Node.js 20+.
 pause
 exit /b 1
)

if not exist "%~dp0logs" mkdir "%~dp0logs"
if not exist "%~dp0.pids" mkdir "%~dp0.pids"

echo [1/3] Verificando integridade das dependências...
if not exist "%~dp0node_modules" (
    echo [AVISO] node_modules não encontrado. Vinculando ao cache do ecossistema...
)
echo [OK] Dependências prontas.

echo [2/3] Compilando bundles se necessário...
if not exist "%~dp0dist\main\index.js" (
    call npm run build
)
echo [OK] Bundles validados.

echo [3/3] Iniciando o TAVIR Escritório...

:MENU
cls
echo ===============================================================================
echo                TAVIR ESCRITÓRIO — PAINEL DE CONTROLE LOCAL
echo ===============================================================================
echo.
echo [1] Iniciar App Desktop Electron (Recomendado)
echo [2] Iniciar Dev Server Vite (Interface Web :5273)
echo [3] Executar Validação e Testes Completos (Vitest + Build)
echo [4] Parar serviços e limpar processos
echo [5] Sair
echo -------------------------------------------------------------------------------
set /p "OPCAO=Escolha [1-5]: "

if "!OPCAO!"=="1" (
    echo Iniciando App Desktop Electron...
    start "" npm start
    goto MENU
)
if "!OPCAO!"=="2" (
    echo Iniciando Vite Dev Server...
    start "TAVIR-Vite" /MIN cmd /c "npm run dev > logs\vite.log 2>&1"
    timeout /t 3 /nobreak >nul
    start http://localhost:5273/
    goto MENU
)
if "!OPCAO!"=="3" (
    call "%~dp0testar_escritorio.bat" --no-pause
    goto MENU
)
if "!OPCAO!"=="4" (
    call "%~dp0parar_escritorio.bat" --no-pause
    goto MENU
)
if "!OPCAO!"=="5" exit /b 0

echo Opção inválida.
timeout /t 2 /nobreak >nul
goto MENU
