@echo off
chcp 65001 >nul 2>nul
setlocal
title TAVIR Escritorio - Agendar alinhamento master
cd /d "%~dp0"

set "TASK_NAME=TAVIR-Alinhar-Master"
set "BAT_PATH=%~dp0alinhar_master.bat"

if /I "%~1"=="--remove" goto REMOVE
if /I "%~1"=="remove" goto REMOVE

echo ===============================================================================
echo TAVIR ESCRITORIO - AGENDAR ALINHAMENTO DIARIO DO MASTER
echo ===============================================================================
echo.
echo Cria uma tarefa no Agendador do Windows que roda alinhar_master.bat
echo todos os dias as 09:00 (ao logar, se a janela for perdida).
echo.
echo Tarefa: %TASK_NAME%
echo Script: %BAT_PATH%
echo.

schtasks /Create /F /TN "%TASK_NAME%" /TR "cmd /c \"\"%BAT_PATH%\" --no-pause\"" /SC DAILY /ST 09:00 /RL LIMITED
if errorlevel 1 (
  echo [ERRO] Falha ao criar a tarefa. Tente executar como usuario normal (nao precisa admin).
  pause
  exit /b 1
)

echo [OK] Tarefa criada.
echo.
echo Comandos uteis:
echo   schtasks /Query /TN "%TASK_NAME%" /V /FO LIST
echo   agendar_alinhar_master.bat --remove
echo ===============================================================================
pause
exit /b 0

:REMOVE
schtasks /Delete /F /TN "%TASK_NAME%"
if errorlevel 1 (
  echo [AVISO] Tarefa nao encontrada ou nao removida.
) else (
  echo [OK] Tarefa %TASK_NAME% removida.
)
pause
exit /b 0
