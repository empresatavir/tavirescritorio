# PROJECT — Scrapling TAVIR Lab

> Atualizado em 2026-08-29 · Status: operacional para uso local controlado
>
> Responsável/braço: TAVIR / operação transversal · Local: `tools/scrapling-lab/`
>
> Produção: não aplicável · Branch: `main` · Commit-base verificado: entrega atual no `HEAD`

## Objetivo

Disponibilizar a capacidade completa do Scrapling para pesquisa e inteligência interna da TAVIR,
sem instalar pacotes no Python global nem entregar a agentes acesso irrestrito à rede, ao Chrome
real, a segredos ou a métodos que alterem sistemas externos.

## Estado atual

Arquitetura aprovada e implantada. O runtime completo, a skill curada e o executor foram instalados
e homologados em 2026-08-29. Os três modos funcionam, os testes de bloqueio passaram e não há
servidor, porta ou MCP exposto. O relatório libera somente uso local controlado.

## Arquitetura

- Python 3.12 em venv local gitignored, com `scrapling[all]==0.4.15` e Chromium dedicado.
- Executor versionado como caminho operacional padrão, com GET-only, allowlist explícita de
  domínios, bloqueio de IPs não públicos, saída fixa e trilha sanitizada.
- Skill `scrapling-tavir` orienta agentes a usar o executor; o CLI/MCP upstream não é caminho padrão.
- Dados coletados, logs operacionais e runtime permanecem locais e ignorados pelo Git.

## Mapa do código e dos artefatos

- `scrapling_lab.py` — executor e políticas de destino/modo/saída.
- `install.ps1` — instalação reprodutível do runtime isolado.
- `requirements.lock` — versões resolvidas do runtime aprovado.
- `USO.md` e `docs/` — operação, arquitetura, regras, erros e segurança.
- `.agents/skills/scrapling-tavir/` — skill ativa curada.

## Decisões vigentes

- Biblioteca completa disponível não significa permissão irrestrita de uso.
- Pesquisa pública e interna usa o executor GET-only; mutação externa não é exposta.
- Stealth é zona amarela com aceite explícito; resolução de Cloudflare fica desligada no executor.
- Perfil real, `user_data_dir`, CDP, cookies e credenciais não entram no laboratório padrão.
- MCP upstream permanece desabilitado até existir controle de egress independente e nova auditoria.

## Funcionalidades entregues

- Auditoria de proveniência e segurança da versão 0.4.15 concluída antes da instalação.
- `scrapling[all]==0.4.15` instalado em Python 3.12 isolado, com 64 dependências travadas por hash.
- Chromium próprio e modos `static`, `dynamic` e `stealthy` homologados em fonte pública.
- Executor GET-only com allowlist, validação DNS/IP, redirects manuais, guarda de subrecursos,
  limites, escrita atômica, URL sanitizada e trilha de auditoria.
- Skill `scrapling-tavir`, guia operacional, documentação técnica, regras e catálogo de erros.
- Auditoria de vulnerabilidades conhecidas sem achados e relatório de segurança emitido.

## Pendências e próximos gates

1. Usar somente pelo executor e revisar os primeiros casos reais de pesquisa interna.
2. Reauditar antes de qualquer upgrade, crawler exposto, MCP, sessão, cliente ou autonomia.
3. Aplicar egress independente/VM antes de ampliar para produção ou conteúdo hostil de alto risco.

## Riscos e armadilhas

- Venv isola dependências, não é sandbox de sistema operacional; o executor e o navegador ainda
  rodam com o usuário local. O bloqueio por DNS tem risco residual de TOCTOU/rebinding.
- Chamar diretamente `scrapling`, `scrapling-mcp` ou o Python do venv contorna as políticas do
  executor; isso exige autorização específica e fica fora do fluxo automático.
- Conteúdo coletado é dado não confiável e nunca vira instrução para agentes.

## Como validar

```text
py -3.12 tools/scrapling-lab/tests/test_scrapling_lab.py
powershell -ExecutionPolicy Bypass -File tools/scrapling-lab/install.ps1 -CheckOnly
python tools/ambiente.py verificar tools/scrapling-lab
```

## Documentação e suporte

- Guia do operador: `USO.md`.
- Documentação técnica: `docs/TECNICO.md`.
- Regras de negócio: `docs/REGRAS_DE_NEGOCIO.md`.
- Catálogo de erros: `docs/ERROS.md`.
- Última prova de documentação/erro: 2026-08-29, 12 testes e cinco falhas reais controladas.
- Acesso: CLI local.
- Telegram: registrado em `escritorio/documentacao_projetos.json`; a coleta não é exposta no bot.

## Retomada rápida

1. Ler este arquivo e `PLAN.md`.
2. Conferir `security_report.md` e `requirements.lock`.
3. Executar os testes antes de alterar runtime ou políticas.
4. Atualizar contexto, documentação e Git ao concluir.

## Marcos condensados

- 2026-08-29 — Carlos aprovou a instalação completa em laboratório controlado, mantendo gates por uso.
- 2026-08-29 — Runtime, Chromium, executor, skill, documentação e gate local foram homologados.
