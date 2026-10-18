#!/bin/bash
# Script de execução de comandos via shell POSIX (bash)
# Uso: editar os comandos dentro do bloco { ... } > cline_log.txt 2>&1

{
  echo "=== INICIO DO TESTE: $(date) ==="
  cd "/c/Users/carlo/Downloads/Projetos a Estudar/tavirescritorio" || exit 1

  echo "[TESTE 1] Echo simples"
  echo teste

  echo "[TESTE 2] Git status"
  git status

  echo "[TESTE 3] Git branch atual"
  git branch --show-current

  echo "=== TESTE CONCLUIDO ==="
} > "/c/Users/carlo/Downloads/Projetos a Estudar/tavirescritorio/cline_log.txt" 2>&1