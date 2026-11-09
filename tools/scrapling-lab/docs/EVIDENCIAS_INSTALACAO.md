# Evidências de instalação e homologação — 2026-08-29

## Runtime instalado

- Python do venv: `3.12.10`.
- Scrapling: `0.4.15`.
- Extras: `scrapling[all]`, 64 pacotes resolvidos.
- Playwright: `1.62.0`; Patchright: `1.62.1`.
- Chromium dedicado: Chrome for Testing `151.0.7922.34`, build Playwright `1234`.
- Diretório: `tools/scrapling-lab/.runtime/` (local e gitignored).
- Lock: versões exatas, hashes e instalação `--only-binary=:all: --require-hashes`.

## Resultados

- `pip check`: `No broken requirements found.`
- `pip-audit` sobre o lock: 64 dependências analisadas, nenhuma vulnerabilidade conhecida.
- Validador da skill: `Skill is valid!`
- Verificador de ambiente: repositório `github.com/empresatavir/agenciaia`, `LIBERADO`.
- Testes unitários: 12/12 passaram após o endurecimento final.
- Git ignore: runtime, dados e logs confirmados como ignorados.

## Testes reais

| Caso | Resultado |
|---|---|
| `static` em `https://example.com` | HTTP 200, Markdown 180 bytes, hash conferido. |
| `dynamic` no mesmo alvo | HTTP 200; Chromium dedicado funcional. |
| `stealthy --ack-yellow` | HTTP 200; Patchright funcional e Cloudflare solver desligado. |
| Recurso do Kaspersky fora da allowlist | Abortado e registrado em `network_events`; página preservada. |
| `127.0.0.1` allowlisted | Bloqueado por IP não público (`STL-URL-003`). |
| Domínio fora da allowlist | Bloqueado (`STL-URL-002`). |
| Stealth sem aceite | Bloqueado antes do navegador (`STL-POLICY-001`). |
| Porta inválida | Bloqueada e URL sanitizada (`STL-URL-001`). |
| Saída `../escape.md` | Bloqueada antes de escrever (`STL-OUTPUT-001`). |

Os arquivos de coleta e logs usados nos testes permanecem locais e não integram o commit.
