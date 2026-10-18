# ADR-002: Persistência Local em SQLite com WAL Mode, Integridade Relacional e Backups Online

- **Status:** Aceito
- **Data:** 2026-10-18
- **Decisores:** Engenharia TAVIR & Operador (CEO)
- **Contexto:** Persistência local single-user de jobs, tarefas, memória e propostas

## Contexto e Problema
A operação da TAVIR Escritório envolve escrita concorrente de logs de jobs (via Server-Sent Events e workers assíncronos), leitura reativa de contadores pelo frontend e persistência de 187 notas do Vault. O uso de bancos externos (PostgreSQL/MySQL) adicionaria sobrecarga de infraestrutura desnecessária em ambiente local de operador único.

## Decisão
1. **SQLite Local (`backend/tavir.db`):** Adotado como banco de dados canônico da aplicação.
2. **Modo WAL (Write-Ahead Logging):** Permite que leitores concorrentes não bloqueiem escritores e que gravações de telemetria não causem erros de `database is locked`.
3. **Integridade de Chaves Estrangeiras:** `PRAGMA foreign_keys = ON` e validação com `PRAGMA foreign_key_check` asseguram que tarefas, jobs e conversas estejam estritamente vinculados aos 57 agentes e projetos cadastrados.
4. **Rotina de Backup Seguro:** Cópia atômica via SQLite Online Backup API (`conn.backup()`) através do script `scripts/backup_restore.py` e do utilitário `backup_escritorio.bat`, evitando cópias corrompidas de arquivos com transações pendentes no WAL.

## Consequências
- **Positivas:**
  - Zero dependência de serviços externos ou containers Docker para o banco de dados.
  - Velocidade sub-milissegundo para consultas locais.
  - Portabilidade total: o banco pode ser copiado ou versionado de forma transparente.
- **Negativas / Cuidados:**
  - Backups manuais por cópia direta do arquivo `.db` enquanto o app roda não são recomendados; deve-se usar sempre `backup_escritorio.bat` ou a Online Backup API.
