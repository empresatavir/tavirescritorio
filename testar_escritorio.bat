@echo off
chcp 65001 >nul
title TAVIR Escritório — Testes e Validação
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===============================================================================
echo                TAVIR ESCRITÓRIO — VALIDAÇÃO E TESTES
echo ===============================================================================
echo.

echo [1/3] Validando tipagem TypeScript unificada (npm run typecheck)...
call npm run typecheck
if %errorlevel% neq 0 (
    echo.
    echo [FALHA] Validação de tipagem falhou!
    if "%1" neq "--no-pause" pause
    exit /b 1
)

echo.
echo [2/3] Executando testes automatizados (Vitest: Motion + Backend)...
call npm test
if %errorlevel% neq 0 (
    echo.
    echo [FALHA] Testes automatizados falharam!
    if "%1" neq "--no-pause" pause
    exit /b 1
)

echo.
echo [3/3] Compilando bundles de produção (Main Electron + Vite Renderer)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [FALHA] Build de produção falhou!
    if "%1" neq "--no-pause" pause
    exit /b 1
)

echo.
echo ===============================================================================
echo            TODOS OS TESTES E BUILDS PASSARAM COM SUCESSO!
echo ===============================================================================
if "%1" neq "--no-pause" pause
