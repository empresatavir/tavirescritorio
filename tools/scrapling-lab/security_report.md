# Relatório de segurança — Scrapling TAVIR Lab

> Data: 2026-08-29
>
> Perfil: `INTERNA`
>
> Modificadores: conteúdo rico não confiável, IA externa, automação de navegador, rede e cadeia de suprimentos
>
> Escopo aprovado: operação local, pública/autorizada, GET-only pelo executor TAVIR
>
> Veredito: **APROVADO COM RESSALVAS PARA USO LOCAL CONTROLADO**
>
> `liberado_para_uso_local_controlado: true`
>
> `liberado_para_deploy: false`

## Escopo e fronteiras

Foram auditados `scrapling_lab.py`, instalador, launcher, lock, skill curada, políticas, testes e o
runtime efetivamente instalado. Não foram liberados MCP, porta de rede, coleta autenticada, perfil
real, proxy, rede privada, mutação externa ou uso autônomo do SDK upstream.

Ativos protegidos: estação do operador, rede local, sessões/credenciais, dados de clientes, corpus
coletado e sistemas-alvo. Fronteiras principais: agente→skill, executor→DNS/rede,
navegador→subrecursos e página não confiável→análise posterior.

## Evidências

- 12 testes unitários cobrem allowlist exata, truque de sufixo, IPv4/IPv6 não global, credencial em
  URL, esquemas, redirect público→privado, guarda de subrecursos, limite de tamanho, saída atômica,
  traversal, aceite stealth e sanitização inclusive de porta malformada.
- Coletas reais `static`, `dynamic` e `stealthy` em `example.com` retornaram HTTP 200.
- A guarda do navegador bloqueou uma tentativa de injeção de recurso do Kaspersky fora da
  allowlist sem impedir a página principal.
- Testes negativos bloquearam localhost, domínio não autorizado, stealth sem aceite, porta inválida
  e path traversal antes de efeito relevante.
- `pip check` não encontrou inconsistência. `pip-audit` analisou as 64 dependências travadas e não
  encontrou vulnerabilidade conhecida em 2026-08-29.
- Lock contém hashes; o wheel Scrapling aprovado coincide com o SHA-256 publicado no PyPI.
- Runtime, navegador, dados e logs estão fora do Git; ambiente e skill passaram validadores.

Detalhes reproduzíveis: `docs/EVIDENCIAS_INSTALACAO.md`.

## Achados

### MÉDIO — SEC-SCR-001 — SDK/CLI completo pode contornar o executor

O requisito aprovado mantém `scrapling[all]` disponível. Quem executar diretamente o Python/CLI do
venv pode usar capacidades que o wrapper não expõe. Isso é poder local com as permissões do usuário,
não uma vulnerabilidade escondida.

- Mitigação atual: skill oficial não foi ativada; skill TAVIR exige executor; MCP não foi
  configurado; uso direto requer pedido explícito do Carlos com escopo.
- Risco aceito somente para a máquina local e operador autorizado.
- Responsável: Carlos/TAVIR. Revisão até 2026-11-29 ou antes de qualquer integração autônoma.

### MÉDIO — SEC-SCR-002 — validação DNS não elimina TOCTOU/rebinding

O executor resolve e valida todos os IPs antes da requisição e revalida redirects/subrecursos, mas
a biblioteca resolve novamente ao conectar. Um DNS hostil pode mudar a resposta nesse intervalo.

- Mitigação atual: allowlist mínima, somente domínio público/autorizado, sem MCP, sem LAN e sem
  segredos; cada subrecurso do navegador passa pela guarda.
- Tratamento obrigatório antes de cliente/produção: egress por firewall/proxy próprio ou sandbox que
  bloqueie faixas privadas fora do processo, seguido de teste de rebinding.
- Responsável: Auditor Seg/LGPD. Prazo: antes de ampliar o escopo; não há deploy previsto.

### BAIXO — SEC-SCR-003 — venv não é sandbox do Windows

O venv evita poluir dependências globais, mas não limita arquivos/processos/rede do pacote ou do
Chromium. O uso sem perfil real, sem segredo, headless e com navegador dedicado reduz o impacto.
Container/VM passa a ser obrigatório se o laboratório receber conteúdo hostil de alto risco,
sessão, cliente ou autonomia contínua.

## Cobertura do gate

| Controle | Cobertura | Evidência/observação |
|---|---|---|
| Origem, lock, hash e vulnerabilidades conhecidas | Forte | auditoria upstream, lock, pip-audit, pip check |
| SSRF inicial e redirect para rede privada | Forte no processo | testes IPv4/IPv6/metadata e redirect |
| DNS rebinding/TOCTOU | Parcial | sem egress independente; achado SEC-SCR-002 |
| Métodos mutáveis | Forte no executor | interface oferece somente GET |
| Subrecursos do navegador | Forte | rota global e prova de bloqueio real |
| Segredos e sessão real | Forte no executor | parâmetros inexistentes/proibidos |
| Prompt injection | Parcial por natureza | Markdown não confiável e regra de não execução |
| Tamanho, path e escrita parcial | Forte | limites, nome restrito e `os.replace` |
| Autenticação/autorização de usuários | Não aplicável | CLI local, sem servidor ou usuários remotos |
| Deploy, TLS público, domínio e banco | Não aplicável | ferramenta local sem serviço publicado |
| Product Tour | Não aplicável | CLI técnica; primeiro uso guiado em `USO.md` |

## Decisão

Não há achado CRÍTICO ou ALTO aberto no executor. O laboratório está liberado para pesquisa local
controlada conforme `USO.md` e `docs/REGRAS_DE_NEGOCIO.md`. O gate de deploy permanece falso porque
não existe deploy, a auditoria deste ciclo não foi independente do implementador e os riscos de
egress/TOCTOU não atendem produção ou uso autônomo. Qualquer MCP, cliente, sessão, rede interna,
barreira técnica, mutação ou acesso direto recorrente exige nova arquitetura e auditoria
independente antes de operar.
