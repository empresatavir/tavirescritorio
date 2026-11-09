# Plano — Scrapling TAVIR Lab

## Objetivo e critério de aceite

Entregar o Scrapling 0.4.15 com todos os extras em runtime Python separado e Chromium dedicado,
operável por uma skill TAVIR que usa um executor controlado. O trabalho fecha quando instalação,
coleta pública, bloqueios negativos, documentação e auditoria estiverem provados.

## Fases

1. Criar o contexto canônico e a skill curada.
2. Implementar executor, instalador e testes.
3. Instalar pacote completo e navegador em diretórios gitignored.
4. Registrar versões, hashes e evidências de dependências.
5. Testar caminho feliz e falhas de URL, rede privada, domínio, modo e saída.
6. Emitir auditoria e atualizar o contexto operacional.

## DOCUMENTAÇÃO E ENTREGA

- `USO.md`: preparo, primeiro uso, comandos, saídas, limites e recuperação.
- `docs/TECNICO.md`: arquitetura, runtime, fluxos, atualização, observabilidade e rollback.
- `docs/REGRAS_DE_NEGOCIO.md`: zonas, autorizações, métodos, dados e invariantes.
- `docs/ERROS.md`: códigos estáveis, efeitos, repetição e escalonamento.
- `security_report.md`: evidências, achados, cobertura e `liberado_para_deploy`.
- Product Tour: não se aplica; a superfície é CLI para operador técnico e o primeiro uso é guiado
  por `USO.md`, sem interface persistente.
