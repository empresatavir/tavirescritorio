# ADR-005: Governança de Portas Oficiais (9001/9002) e Execução Windows

- **Status:** Aceito
- **Data:** 2026-10-18
- **Decisores:** Engenharia TAVIR & Operador (CEO)
- **Contexto:** Port drift em ambiente de desenvolvimento Windows

## Contexto e Problema
No Windows, se instâncias anteriores do FastAPI ou Vite permanecerem ativas em background, os serviços sobem silenciosamente em portas alternativas (ex: Vite na 5174 ou 5175, FastAPI na 8001), enquanto o navegador do operador continua conectado às portas originais, resultando em diagnósticos incorretos de código quebrado. Além disso, scripts `.bat` salvos com LF puro sofrem quebra de sintaxe no `cmd.exe`.

## Decisão
1. **Portas Oficiais do Sistema:**
   - **9001:** Backend FastAPI (`http://127.0.0.1:9001`)
   - **9002:** Frontend Vite / Preview (`http://localhost:9002`)
   - Não utilizar 8000 ou 5173 em novos scripts ou documentações (exceto `.claude/launch.json` que é imutável).
2. **Scripts Batch Padronizados:**
   - Todos os arquivos `.bat` na raiz (`iniciar_escritorio.bat`, `parar_escritorio.bat`, `testar_escritorio.bat`, `backup_escritorio.bat`) devem possuir cabeçalho `chcp 65001 >nul` (UTF-8) e quebras de linha estritamente em `CRLF` (`\r\n`).
3. **Encerramento Seguro:** `parar_escritorio.bat` encerra pontualmente processos ouvindo nas portas 9001 e 9002 via PowerShell antes de qualquer reinício.

## Consequências
- **Positivas:**
  - Eliminação de conflitos e testes rodando em instâncias fantasmas.
  - Compatibilidade garantida com o shell do Windows (`cmd.exe` e `pwsh`).
