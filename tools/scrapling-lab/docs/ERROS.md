# Catálogo de erros — Scrapling TAVIR Lab

Toda falha devolve JSON com `code`, `message`, `effect`, `action`, `retryable` e `status`. Código de
processo não zero significa que nenhuma coleta deve ser considerada entregue.

| Código | Significado e efeito | Próximo passo |
|---|---|---|
| `STL-CONFIG-001` | Domínio de allowlist inválido; nenhuma requisição. | Informar somente hostname. |
| `STL-CONFIG-002` | Allowlist ausente; nenhuma requisição. | Adicionar ao menos um `--allow-domain`. |
| `STL-CONFIG-003` | Finalidade ausente/curta; nenhuma requisição. | Explicar o objetivo com 8+ caracteres. |
| `STL-CONFIG-004` | Teto fora de 1 KiB–10 MiB; nenhuma requisição. | Corrigir `--max-bytes`. |
| `STL-CONFIG-005` | Timeout fora de 5–120 s; nenhuma requisição. | Corrigir `--timeout`. |
| `STL-CONFIG-006` | Redirects fora de 0–10; nenhuma requisição. | Corrigir `--max-redirects`. |
| `STL-URL-001` | URL/porta inválida ou esquema não HTTP(S); nenhuma requisição. | Usar URL completa válida. |
| `STL-URL-002` | Host fora da allowlist; conexão abortada. | Incluir domínio somente se aprovado. |
| `STL-URL-003` | Host resolve para IP não público; conexão abortada. | Não repetir; usar outro ambiente autorizado. |
| `STL-URL-004` | URL contém usuário/senha; conexão abortada e segredo não registrado. | Remover credencial e rever o fluxo. |
| `STL-DNS-001` | DNS falhou/não trouxe IP utilizável; nenhuma requisição. | Conferir rede/DNS e repetir uma vez. |
| `STL-DNS-002` | DNS trouxe endereço inválido; nenhuma requisição. | Revisar DNS antes de repetir. |
| `STL-POLICY-001` | Stealth sem aceite amarelo; navegador não iniciado. | Confirmar autorização e usar `--ack-yellow`. |
| `STL-FETCH-001` | Falha inesperada de rede/navegador; saída não confirmada. | Repetir uma vez; depois trocar modo ou escalar. |
| `STL-FETCH-002` | Excesso de redirects; saída não salva. | Revisar URL ou ajustar até o teto de 10. |
| `STL-SIZE-001` | Resultado excede teto; nenhum parcial é mantido. | Reduzir escopo ou aumentar até 10 MiB. |
| `STL-OUTPUT-001` | Nome de saída inseguro; arquivo não criado. | Usar nome simples, sem diretório. |
| `STL-RUNTIME-001` | Scrapling/runtime ausente; coleta bloqueada. | Executar `install.ps1` e operar por `run.ps1`. |
| `STL-RUNTIME-002` | Versão diferente de 0.4.15; coleta bloqueada por drift. | Recriar pelo lock aprovado. |
| `STL-INSTALL-001` | Lock ausente; instalação bloqueada. | Restaurar `requirements.lock` do Git. |
| `STL-INSTALL-002` | Venv Python 3.12 não foi criado. | Verificar `py -3.12` e espaço em disco. |
| `STL-INSTALL-003` | Pacote/hash/instalação falhou. | Não usar runtime parcial; revisar rede/lock e recriar. |
| `STL-INSTALL-004` | Chromium dedicado não foi instalado. | Repetir instalador com rede; não usar Chrome real. |
| `STL-INSTALL-005` | `pip check` detectou árvore inconsistente. | Recriar runtime pelo lock. |

`STL-DNS-001` e `STL-FETCH-001/002` são os únicos casos normalmente repetíveis. Em reincidência,
registre horário, código, modo e domínio e encaminhe ao responsável. Não envie URL com query,
cookies, stack trace completo ou conteúdo coletado para suporte não autorizado.
