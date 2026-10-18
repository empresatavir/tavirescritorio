@echo off
chcp 65001 >nul
echo Iniciando execucao. Aguarde...

REM Tudo o que estiver dentro dos parenteses sera gravado no txt silenciosamente
(
    echo === INICIO DO TESTE: %date% %time% ===
    cd /d "c:\Users\carlo\Downloads\Projetos a Estudar\tavirescritorio"
    
    echo [TESTE 1] Echo simples
    echo teste
    
    echo [TESTE 2] Git status
    git status
    
    echo [TESTE 3] Git branch atual
    git branch --show-current
    
    echo === TESTE CONCLUIDO ===
) > "c:\Users\carlo\Downloads\Projetos a Estudar\tavirescritorio\cline_log.txt" 2>&1

echo Execucao finalizada! Log salvo em cline_log.txt.