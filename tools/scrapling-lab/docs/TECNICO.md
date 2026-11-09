# Scrapling TAVIR Lab — documentação técnica

## Arquitetura

```text
pedido aprovado
    ↓
skill scrapling-tavir
    ↓
run.ps1 → venv Python 3.12 → scrapling_lab.py
    ↓                         ↓
Scrapling 0.4.15         política URL/DNS/saída
    ↓                         ↓
HTTP ou Chromium dedicado → Markdown local + audit.jsonl
```

O pacote completo vive em `.runtime/venv`; navegadores vivem em `.runtime/browsers`. Esses
diretórios, `data/` e `logs/` são ignorados pelo Git. A parte versionada contém código, lock,
política, testes e documentação.

## Controles do executor

1. Aceita somente URL HTTP/HTTPS sem credenciais embutidas.
2. Normaliza allowlist por IDNA e aceita somente domínio exato ou subdomínio real.
3. Resolve DNS antes da conexão e rejeita qualquer IPv4/IPv6 não global.
4. No modo estático, desliga redirect automático, valida cada `Location` e limita saltos.
5. Nos navegadores, intercepta cada requisição e aborta recurso fora da allowlist ou não público.
6. Usa somente GET e não recebe cookie, header de autenticação, proxy, CDP ou perfil persistente.
7. Mantém `real_chrome=False`, `solve_cloudflare=False` e `block_webrtc=True` no stealth.
8. Converte o conteúdo principal para Markdown, limita bytes e grava de forma atômica.
9. Sanitiza URLs nos logs removendo query e fragmento; falhas também registram finalidade.

## Instalação reproduzível

`requirements.in` fixa `scrapling[all]==0.4.15`. `requirements.lock` resolve 64 pacotes para
Windows/Python 3.12 e inclui hashes dos artefatos. `install.ps1` usa `--require-hashes` e
`--only-binary=:all:`; depois instala Chromium pelo Playwright no caminho dedicado, executa
`pip check` e valida versão/runtime.

O wheel aprovado do Scrapling tem SHA-256
`ae66bde9f63afb793ad6f93bd76b451e29f1631347465a553c4e7765c0ecc1f2`. O lock também
inclui o hash da distribuição fonte, mas a instalação Windows é limitada a binários/wheels.

## Modos

- `static`: `Fetcher.get`, TLS verificado, redirects manuais, sem cabeçalho stealth.
- `dynamic`: `DynamicFetcher` headless com Chromium dedicado e guarda de subrequisições.
- `stealthy`: `StealthyFetcher`/Patchright com o mesmo confinamento; requer `--ack-yellow`.

Não há crawler exposto no executor atual. A biblioteca completa permanece disponível para estudo
excepcional, mas crawl exige orçamento de páginas, taxa, robots.txt e escopo documentados antes de
receber uma interface controlada.

## Observabilidade

Sucesso registra finalidade, allowlist, modo, URL sanitizada, URL final, status, tamanho, hash,
arquivo e bloqueios de rede. Falha registra URL sanitizada, modo, finalidade e objeto de erro.
O log não deve ser publicado e pode conter nomes de domínio e finalidade operacional.

Durante a homologação, Kaspersky tentou injetar `gc.kis.v2.scr.kaspersky-labs.com/.../main.js` no
navegador. A guarda abortou o recurso porque o domínio não estava autorizado; a página principal
continuou funcional. Isso é evidência do confinamento de subrecursos, não indicação de infecção.

## Limitações residuais

- Venv isola dependências, não o usuário Windows; código direto dentro do venv tem as permissões do
  operador.
- Há uma janela de DNS TOCTOU/rebinding entre a validação e a conexão feita pela biblioteca. O
  executor reduz o risco, mas não fixa o socket ao IP validado nem aplica firewall de egress.
- O SDK/CLI upstream direto pode contornar o executor. Esse acesso existe por decisão de capacidade
  completa e é controlado por governança, não por ACL do sistema operacional.
- Sanitização para Markdown não neutraliza instruções visíveis. Consumidores tratam toda saída como
  dado não confiável.
- Não existe isolamento contra vulnerabilidade zero-day do Chromium; mantenha o laboratório local,
  sem sessão real e sem segredos.

Esses limites impedem MCP, uso autônomo irrestrito, rede interna e produção/cliente sem uma camada
independente de egress ou sandbox e nova auditoria.

## Validação e manutenção

```powershell
py -3.12 tools/scrapling-lab/tests/test_scrapling_lab.py
powershell -NoProfile -ExecutionPolicy Bypass -File tools/scrapling-lab/install.ps1 -CheckOnly
tools\scrapling-lab\.runtime\venv\Scripts\python.exe -m pip check
python tools/ambiente.py verificar tools/scrapling-lab
py -3.12 C:\Users\carlo\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/scrapling-tavir
```

Para upgrade: auditar tag/wheel/skill upstream, atualizar versão exata, compilar novo lock com
hashes, reconstruir `.runtime`, executar auditoria de vulnerabilidades e repetir testes unitários,
estático, dinâmico, stealth e negativos. Nunca fazer upgrade in-place automático.
