# Release — vX.Y.Z

> Status: `<planejada|aprovada_para_deploy|publicada|rollback>` · Data: `AAAA-MM-DD`
>
> Projeto: `<nome>` · Repositório: `<org/repo>` · Ambiente: `<produção|homologação>`

## Identidade da versão

- **Versão:** `vX.Y.Z`
- **Fonte canônica:** `<arquivo e campo>`
- **Tag imutável:** `<vX.Y.Z>`
- **Versão/tag estável anterior:** `<vX.Y.Z>`
- **Compatibilidade:** `<major|minor|patch e justificativa>`

## Inclui

| PR/commit | Resumo | Regra/erro | Evidência |
|---|---|---|---|
| `#000` | <o que/por quê> | `<RN/DF ou n/a>` | `<teste/CI>` |

## Responsáveis e gates

- **Implementador(es):** `<nome/papel>`
- **Revisor(es):** `<nome/papel>`
- **Mesclador:** `<nome/papel>`
- **Dono de deploy:** `<nome/papel>`
- **Segurança/LGPD:** `<liberado_para_deploy / não se aplica + evidência>`
- **Documentação:** `<documentacao_aprovada / não se aplica + evidência>`
- **Autorização de deploy:** `<quem, quando e onde foi registrada>`

## Execução e evidências

- **Tag/commit efetivamente implantado:** `<hash>`
- **Migrações e compatibilidade:** `<nenhuma | plano e resultado>`
- **Testes e smoke test:** `<comandos, URLs, resultado>`
- **Artefatos gerados:** `<imagem, pacote, relatório ou n/a>`
- **Resultado de deploy:** `<URL/estado/data>`

## Rollback

- **Versão alvo para restauração:** `<vX.Y.Z>`
- **Procedimento exato:** `<comando/painel autorizado, sem segredo>`
- **Banco/dados:** `<reversível | compatibilidade em duas etapas | não se aplica>`
- **Condição para acionar:** `<sintoma/limiar>`
- **Responsável:** `<nome/papel>`
- **Resultado se acionado:** `<data, versão restaurada e incidente/PR de correção>`
