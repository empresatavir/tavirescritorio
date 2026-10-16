@echo off
chcp 65001 >nul
title TAVIR Escritório — Testes e Validação
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===============================================================================
echo                TAVIR ESCRITÓRIO — VALIDAÇÃO E TESTES
echo ===============================================================================
echo.

set "PY_EXE=python"
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0backend\.venv\Scripts\python.exe"
) else if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0.venv\Scripts\python.exe"
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0venv\Scripts\python.exe"
)

echo [1/2] Executando testes unitários e de integração do Backend (pytest)...
cd /d "%~dp0backend"
"%PY_EXE%" -m pytest tests/ -v
if %errorlevel% neq 0 (
    echo.
    echo [FALHA] Testes do backend falharam!
    if "%1" neq "--no-pause" pause
    exit /b 1
)

echo.
echo [2/2] Validando tipagem TypeScript e compilação do Frontend (npm run build)...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [FALHA] Build do frontend falhou!
    if "%1" neq "--no-pause" pause
    exit /b 1
)

cd /d "%~dp0"
echo.
echo ===============================================================================
echo            TODOS OS TESTES E BUILDS PASSARAM COM SUCESSO!
echo ===============================================================================
if "%1" neq "--no-pause" pause
