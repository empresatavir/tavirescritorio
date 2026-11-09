# Suporte nativo das skills de motion

Consulta em 2026-11-09. CLI `skills` 1.7.6 (`npx skills add --help`).

## Licença (D6)

`remotion-dev/skills` (HEAD `a2824c67f8b4585c294a8101db9f9f0ad3c643f8`) não tem arquivo `LICENSE`. O GitHub também não detecta licença. O conteúdo vem de `packages/skills` do Remotion, cuja `LICENSE.md` não é uma licença permissiva de redistribuição. A cópia fixada para `studio-motion/.skills/remotion/` não foi feita.

O que entra no workspace é o instalador oficial mais o contrato escrito pela TAVIR (`MOTION_CONTRACT.md`).

## O que o `--help` mostra

`skills add` aceita `--agent <agents>`. O help não lista os nomes. A tabela de caminhos está em `docs/agents.md` do próprio CLI, e a instalação abaixo confirmou as pastas dos quatro motores.

## Instalação conferida

Comando, na pasta de dados `<dados>/motion` (fora do git):

```
npx skills add remotion-dev/skills --agent claude-code cursor codex antigravity -y
```

13 skills instaladas. Cursor, Codex e Antigravity gravam em `.agents/skills/`. Claude Code grava em `.claude/skills/` como junction para `.agents/skills/`.

| Motor | `--agent` | Pasta no projeto | Conferido |
| --- | --- | --- | --- |
| Claude | `claude-code` | `.claude/skills/` | junction para `.agents/skills/` |
| Cursor | `cursor` | `.agents/skills/` | pasta real |
| Codex | `codex` | `.agents/skills/` | pasta real |
| Antigravity | `antigravity` | `.agents/skills/` | pasta real |

Não há pasta de regras separada do Antigravity nesse CLI. O arquivo de instrução da TAVIR para esse motor fica em `.agents/skills/tavir-motion/SKILL.md`, que é a pasta que o instalador confirmou.
