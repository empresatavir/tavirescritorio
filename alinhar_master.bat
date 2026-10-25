@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion
title TAVIR Escritorio - Alinhar master
cd /d "%~dp0"

set "NO_PAUSE=0"
set "QUIET=0"
for %%A in (%*) do (
  if /I "%%~A"=="--no-pause" set "NO_PAUSE=1"
  if /I "%%~A"=="--quiet" set "QUIET=1"
)

if "!QUIET!"=="0" (
  echo ===============================================================================
  echo TAVIR ESCRITORIO - ALINHAR MASTER COM ORIGIN
  echo ===============================================================================
  echo.
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Este diretorio nao e um repositorio git.
  if "!NO_PAUSE!"=="0" pause
  exit /b 1
)

for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH set "CURRENT_BRANCH=HEAD"

if "!QUIET!"=="0" echo [1/4] Buscando atualizacoes em origin...
git fetch origin
if errorlevel 1 (
  echo [ERRO] Falha no git fetch. Verifique rede/credenciais.
  if "!NO_PAUSE!"=="0" pause
  exit /b 1
)

for /f "delims=" %%C in ('git rev-list --count HEAD..origin/master 2^>nul') do set "AHEAD_REMOTE=%%C"
if not defined AHEAD_REMOTE set "AHEAD_REMOTE=0"
for /f "delims=" %%D in ('git rev-list --count master..origin/master 2^>nul') do set "MASTER_BEHIND=%%D"
if not defined MASTER_BEHIND set "MASTER_BEHIND=0"

if "!MASTER_BEHIND!"=="0" (
  if "!QUIET!"=="0" (
    echo [OK] master local ja esta alinhado com origin/master.
    echo     Branch atual: !CURRENT_BRANCH!
  )
  if "!NO_PAUSE!"=="0" pause
  exit /b 0
)

for /f "delims=" %%S in ('git status --porcelain 2^>nul') do set "DIRTY=1"
if defined DIRTY (
  echo [AVISO] Working tree suja — nao vou trocar de branch nem puxar master.
  echo         Commits novos em origin/master: !MASTER_BEHIND!
  echo         Salve/commite suas mudancas e rode novamente: alinhar_master.bat
  if "!NO_PAUSE!"=="0" pause
  exit /b 2
)

rem Nao faz checkout. Trocar de branch apaga da pasta os arquivos que o master antigo nao tem.
if /I "!CURRENT_BRANCH!"=="master" (
  if "!QUIET!"=="0" echo [2/4] Atualizando master (fast-forward only)...
  git pull --ff-only origin master
  if errorlevel 1 (
    echo [ERRO] pull --ff-only falhou. master local divergiu do remoto.
    echo         A pasta do projeto permanece como esta.
    if "!NO_PAUSE!"=="0" pause
    exit /b 1
  )
) else (
  git merge-base --is-ancestor master origin/master
  if errorlevel 1 (
    echo [ERRO] master local divergiu de origin/master.
    echo         Nao vou trocar de branch nem apagar arquivos.
    if "!NO_PAUSE!"=="0" pause
    exit /b 1
  )
  if "!QUIET!"=="0" echo [2/4] Apontando master para origin, sem mexer nos arquivos...
  git branch -f master origin/master
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel atualizar o ponteiro de master.
    echo         A pasta do projeto permanece como esta.
    if "!NO_PAUSE!"=="0" pause
    exit /b 1
  )
)

if "!QUIET!"=="0" (
  echo.
  echo [OK] master alinhado com origin/master (!MASTER_BEHIND! commit^(s^) aplicados).
  echo     Branch atual: !CURRENT_BRANCH!
  echo ===============================================================================
)

if "!NO_PAUSE!"=="0" pause
exit /b 0
