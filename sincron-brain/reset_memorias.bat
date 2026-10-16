@echo off
REM ============================================================================
REM  reset_memorias.bat  -  Zera SO as memorias do Sincron Brain (Tier 1 etc.)
REM  Mantem intactos: _config.toml (judge/gemini) e .env (sua chave).
REM
REM  QUANDO USAR: quando quiser recomecar a classificacao do zero.
REM  IMPORTANTE: rode com o CLAUDE CODE FECHADO (o servidor MCP trava o indice).
REM
REM  Passos: 1) feche o Claude Code  2) de 2 cliques aqui  3) reabra o Claude Code
REM          4) peca no chat: "refaz o Tier 1"
REM ============================================================================
setlocal
set "VAULT=%~dp0memory"
echo Zerando memorias do Sincron Brain em:
echo   %VAULT%
echo.
del /s /q "%VAULT%\*.md" >nul 2>&1
del /q "%VAULT%\_index.sqlite" "%VAULT%\_index.sqlite-wal" "%VAULT%\_index.sqlite-shm" >nul 2>&1
if exist "%VAULT%\_draft" del /q "%VAULT%\_draft\*" >nul 2>&1
if exist "%VAULT%\_reactivation" del /q "%VAULT%\_reactivation\*" >nul 2>&1
echo Pronto: memorias (.md), indice e filas zerados. Config e chave preservados.
echo.
echo Agora reabra o Claude Code neste projeto e peca: "refaz o Tier 1".
echo.
pause
endlocal
