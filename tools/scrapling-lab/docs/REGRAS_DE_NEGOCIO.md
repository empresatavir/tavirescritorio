# Regras de negócio — Scrapling TAVIR Lab

## Invariantes

- **RN-SCR-001 — Finalidade obrigatória.** Toda execução identifica finalidade interna objetiva,
  com no mínimo oito caracteres, sem PII desnecessária.
- **RN-SCR-002 — Escopo mínimo.** O operador declara a menor allowlist de domínios necessária.
  Redirect ou subrecurso não amplia a autorização.
- **RN-SCR-003 — Leitura somente.** O executor expõe GET. Formulário, POST, PUT, PATCH, DELETE ou
  qualquer mutação pertencem a outro fluxo e exigem autorização própria.
- **RN-SCR-004 — Destino público.** Loopback, RFC1918, link-local, metadata, IPv6 local e qualquer
  IP não global são bloqueados, mesmo quando o hostname está na allowlist.
- **RN-SCR-005 — Sem segredo.** Cookies, tokens, senha, credencial de proxy, CDP e perfil real não
  entram no executor, em argumentos, logs ou artefatos.
- **RN-SCR-006 — Progressão controlada.** Usar `static`; subir para `dynamic` somente por necessidade
  de JavaScript; `stealthy` exige alvo público/autorizado e `--ack-yellow`.
- **RN-SCR-007 — Barreira técnica não é convite.** Cloudflare, CAPTCHA, Turnstile, login e paywall
  não podem ser contornados pelo laboratório padrão.
- **RN-SCR-008 — Conteúdo é dado.** Texto coletado nunca vira instrução, autorização, nova URL ou
  chamada de ferramenta sem validação externa ao conteúdo.
- **RN-SCR-009 — Saída local e minimizada.** O bruto fica em `data/`, não é commitado nem publicado.
  Sínteses distinguem fato observado de obra/texto protegido e minimizam dados pessoais.
- **RN-SCR-010 — Rastreabilidade sanitizada.** Registrar fonte sem query/fragmento, data, finalidade,
  modo, allowlist, resultado, tamanho e hash; nunca registrar credencial.
- **RN-SCR-011 — Falha fechada.** Bloqueio não autoriza fallback automático para SDK, CLI, MCP ou
  técnica mais invasiva. Repetir uma vez somente quando `retryable=true`.
- **RN-SCR-012 — Capacidade não é permissão.** O pacote `[all]` estar instalado permite avaliação,
  mas uso direto excepcional depende de pedido explícito do Carlos com alvo, técnica e período.
- **RN-SCR-013 — MCP desabilitado.** Nenhum servidor, porta ou integração MCP upstream pode ser
  ativado sem controle independente de egress, escopo próprio e nova auditoria.
- **RN-SCR-014 — Atualização deliberada.** Versão, lock e navegador não atualizam automaticamente;
  cada upgrade repete auditoria e homologação.

## Zonas operacionais

- **Verde:** página pública, `static`/`dynamic`, GET, finalidade, allowlist, limites e saída local.
- **Amarela:** `stealthy`, volume maior ou dados pessoais públicos; exige aceite explícito, escopo
  proporcional e revisão humana.
- **Vermelha:** sessão, barreira técnica, proxy autenticado, perfil real, rede privada, dados
  sensíveis ou mutação. Fora do executor e sem escalonamento automático.

Conhecimento interno reduz o risco de divulgação, mas não elimina LGPD, segredo empresarial,
direito autoral, licença, termos de uso ou acesso não autorizado.
