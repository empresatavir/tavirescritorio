# AMBIENTE — Raio-X de Prospecção

> Atualizado em 2026-08-23 · Empresa: `tavir` · Ambiente: produção controlada
>
> Contém apenas identificadores não secretos. Chaves e tokens permanecem nos ambientes privados.

## Identificação

- **Projeto:** Raio-X de Prospecção
- **Empresa:** TAVIR (casa)
- **Responsável pelo acesso:** Carlos (CEO)
- **Contexto canônico:** `raiox/PROJECT.md`

## Repositório

- **URL:** `https://github.com/empresatavir/agenciaia`
- **Branch de produção:** `main`
- **Diretório:** `raiox/web`

## Vercel — verificado em 2026-08-23

- **Usuário:** `empresatavir-8201`
- **Equipe/escopo:** `TAVIR`
- **orgId:** `team_QYsH9zXHIVOa79Tnengfj7yu`
- **projectId:** `prj_ZquK4uaA97hr9NqcgjkeplQ4ds0S`
- **Projeto:** `agenciaia`
- **Domínio público canônico:** `https://raiox.tavir.com.br`
- **Alias técnico:** `https://agenciaia-one.vercel.app`
- **Último deployment verificado:** `dpl_CNDSAT1qzS6sjZYyenmauW3AKQ14` (`Ready`)
- **Root Directory:** `raiox/web`.
  O projeto está conectado ao repositório GitHub `empresatavir/agenciaia`; builds Git devem partir
  dessa subpasta do monorepo.
- **Vínculo local:** `.vercel/project.json` presente e apontando para os IDs acima.
- **Freio de release:** `git.deploymentEnabled.main=false` enquanto `liberado_para_deploy` for falso.
- **Freio de previews irrelevantes:** `ignoreCommand` em `vercel.json` executa
  `git diff --quiet HEAD^ HEAD ./` dentro do Root Directory; somente mudança no app continua o build.
- **Canário de promoção:** antes de redeploy, conferir `projectId`, Root Directory e SHA do commit;
  o Root Directory é configuração externa e não acompanha o histórico Git.

Convites usam somente `https://raiox.tavir.com.br`. Os domínios `*.vercel.app` permanecem técnicos e
não devem ser enviados ao cliente.

## Supabase

- **Ref:** `skcbjwqajdovxlsxeszv`
- **URL:** `https://skcbjwqajdovxlsxeszv.supabase.co`
- **Schema ativo:** migrations até `20260823213000_raiox_rpc_least_privilege.sql`.
- **Edge Functions:** `create-case`, `invite-case`, `continue-case`, `notify-dora`, `review-case` e
  `delivery-case` publicadas; JWT legado desabilitado e autenticação própria por segredo.

## Serviços externos

| Serviço | Uso | Credenciais |
|---|---|---|
| Telegram Bot API | Controle privado, revisão e gates do CEO | `empresas/tavir/privado/.env` |
| Resend | Entrega dos dois PDFs após segundo clique | domínio e runtime configurados; chave privada somente no ambiente ignorado pelo Git |

### Resend — verificado em 2026-08-22

- **Domínio:** `tavir.com.br` (`verified`), região `sa-east-1`, somente envio.
- **Remetente runtime:** `TAVIR <raiox@tavir.com.br>`.
- **Reply-To:** `empresatavir@gmail.com`.
- **Privacidade:** rastreamento de abertura e clique desativado.
- **Autenticação:** DKIM e SPF verificados; DMARC inicial `p=none` publicado para monitoramento.
- **Chave runtime:** `raiox-tavir-production`, ID não secreto
  `c3de1f0b-d33f-4596-86b7-e2644e5eb2ed`, criada como `sending_access` e solicitada com escopo do
  domínio TAVIR. O token só existe em `empresas/tavir/privado/.env`.
- **Prova:** acesso administrativo com a chave retornou 401; envio pelo remetente TAVIR foi
  confirmado como `delivered` (`e88239a3-3865-406b-9e7b-30dcab98f30b`).
- **Limite da evidência:** a listagem da API não devolve permissão/domínio da chave e o remetente de
  teste `onboarding@resend.dev` é aceito pela plataforma; o escopo foi definido na criação, mas não
  pôde ser reconsultado de forma independente.

## Segredos — somente nomes e localização

- Vercel/Supabase: `SUPA_SERVICE_ROLE_KEY`, `FORM_LINK_SIGNING_SECRET`,
  `RAIOX_INTERNAL_GATE_SECRET`, `SUPABASE_URL`, `RAIOX_APP_URL`, `CRON_SECRET`.
- Escritório privado: `RAIOX_SUPABASE_URL`, `RAIOX_INTERNAL_GATE_SECRET`,
  `RAIOX_INVITE_GATE_SECRET`, `RAIOX_REVIEW_GATE_SECRET`, `RAIOX_DELIVERY_GATE_SECRET`,
  `RAIOX_APP_URL`, `RESEND_API_KEY`, `RAIOX_EMAIL_FROM`, `RAIOX_RESEND_TEMPLATE_ID` e,
  opcionalmente, `RAIOX_EMAIL_REPLY_TO`.
- Nunca versionar, colar em chat ou incluir em logs.

## Contas proibidas para este deploy

- `peptxlab01` / `team_Qf1178beIZJg6VK2eeJwpCa4` — cliente PeptXLab.
- `Carlos' projects` / `team_rmaCqe0aFwqqhnQliel4vTha` — conta pessoal.

## Gate antes de nova release funcional

1. Smoke sintético encerrado: recebimento confirmado e case autorizado expurgado com prova de ausência.
2. Parecer pós-expurgo concluído: smoke encerrado e deploy técnico liberado.
3. Manter `git.deploymentEnabled.main=false`; releases continuam deliberadas pela CLI/painel.
4. Não usar convidado real enquanto `liberado_para_piloto_real_assistido` permanecer falso.
