@echo off
chcp 65001 >nul
title TAVIR Escritório — Backup e Integridade do Banco
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===============================================================================
echo            TAVIR ESCRITÓRIO — BACKUP E AUDITORIA DO SQLITE
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

echo [1/2] Verificando integridade física e relacional (PRAGMA)...
"%PY_EXE%" "%~dp0scripts\backup_restore.py" --verify
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O banco atual apresentou falha de integridade. Backup cancelado.
    if "%1" neq "--no-pause" pause
    exit /b 1
)

echo.
echo [2/2] Criando snapshot atômico via SQLite Online Backup API...
"%PY_EXE%" "%~dp0scripts\backup_restore.py" --backup
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao criar o arquivo de backup.
    if "%1" neq "--no-pause" pause
    exit /b 1
)

echo.
echo ===============================================================================
echo                BACKUP REALIZADO E VALIDADO COM SUCESSO!
echo ===============================================================================
echo.
"%PY_EXE%" "%~dp0scripts\backup_restore.py" --list
echo.
if "%1" neq "--no-pause" pause
