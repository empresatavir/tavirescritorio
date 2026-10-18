@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo Iniciando OMP no repositório TAVIR...
where.exe omp >nul 2>&1
if errorlevel 1 (
    echo [ERRO] O comando omp não foi encontrado no PATH.
    echo Instale/verifique o OMP e reabra o terminal para atualizar o PATH.
    pause
    exit /b 1
)
echo.
omp
set "OMP_EXIT_CODE=%ERRORLEVEL%"
if not "%OMP_EXIT_CODE%"=="0" (
    echo.
    echo [AVISO] O OMP encerrou com código %OMP_EXIT_CODE%.
    pause
)
exit /b %OMP_EXIT_CODE%
