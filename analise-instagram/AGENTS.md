# Braço de ANÁLISE DE INSTAGRAM — Manual de Operação

## Contexto obrigatório do projeto (regra pétrea)

Cada auditoria em `perfis/<slug>/` deve ter `PROJECT.md`, criado antes da coleta, lido por
todos os agentes e atualizado após cada entrega ou gate, mesmo quando a pasta estiver fora
do Git. Registre-a em `../PROJETOS.md`; detalhes em `../.agents/PROJECT_STANDARD.md`.

Braço de diagnóstico, não de publicação. Recebe uma URL de perfil fornecida pelo
Carlos, coleta o conteúdo que a sessão autenticada consegue visualizar, prepara
um corpus multimodal e entrega um relatório profissional em Markdown e HTML. Ao
final, extrai **insights, decisões sugeridas e experimentos** por nicho para a
inteligência compartilhada de Marketing.

## Ativos

```text
analise-instagram/
├── AGENTS.md
├── CLAUDE.md                         ← ponte para este manual
├── _LOG.md                           ← histórico append-only
├── agentes/
│   └── agente-analista-instagram.md  ← Íris Instagram
└── perfis/                           ← dados locais, IGNORADOS pelo Git
    └── <perfil>/
        ├── Imagens/                  ← feed/carrosséis; pode conter vídeo de feed
        ├── Reels/
        ├── Stories/
        ├── Destaques/
        ├── Perfil/                   ← bio/avatar/info
        ├── controle/                 ← logs, manifestos e archive gallery-dl
        ├── processado/               ← inventário, corpus, áudio, frames, OCR
        └── relatorios/               ← completo/resumo em .md + .html + inteligencia-marketing.json
```

## Skill e comando

- Skill: `.agents/skills/instagram-profile-audit/SKILL.md`
- Comando: `/instagram-analisar <url> [--max-posts N]`
- Agente: `analista-instagram` (Íris Instagram, setor marketing)

## Coleta primária por RapidAPI

Para toda URL autorizada, a Íris consulta primeiro os provedores RapidAPI de Instagram,
nesta ordem fixa (contratos validados com chamada real em 2026-08-31):

1. **Instagram Best Experience** — prioridade 1, quota confirmada ~100/mês. Rota padrão.
2. **Instagram Scraper AI1** — prioridade 2, quota confirmada **~25/mês**. Só fallback
   quando o Best Experience não atender ao contrato; o upstream exige `User-Agent` de
   navegador, já enviado pelo roteador.

O roteador coleta perfil/feed, registra a cobertura e só tenta o segundo provedor quando
o primeiro não atender. O navegador (via `collect_instagram.py`, sempre no `Profile 5`) é
complemento para categorias que a API não entregue ou fallback quando ambos falharem —
nenhum outro caminho de navegador é permitido. As Keys ficam somente em
`config/api_keys.env`, ignorado pelo Git; `config/api_keys.env.example` documenta
os nomes e limites sem valores reais.

- O roteador só chama hosts declarados em `rapidapi/providers.json`.
- A lista de Keys é separada por provedor com `RAPIDAPI_INSTAGRAM_KEYS_<PROVEDOR>`;
  variável ausente ou vazia mantém o pool bloqueado até a assinatura ser confirmada.
- São 13 Keys, cada uma de uma conta RapidAPI distinta com assinatura própria nos dois
  provedores (capacidade agregada ~1300/mês no Best Experience, ~325/mês no Scraper AI1).
  O roteador pega a Key menos usada do pool a cada chamada e faz cooldown por Key em
  429/401/403 antes de passar para a próxima.
- O estado de uso é local em `config/.rapidapi-usage.json` e nunca contém a Key.
- O limite informado pelo header da RapidAPI prevalece sobre o limite preventivo local.
- 401/403 entram em cooldown e não são tratados como prova de quota esgotada.
- Fallback só deve ser usado entre contratos de endpoint explicitamente mapeados;
  APIs diferentes não são intercambiáveis por nome parecido.
- O relatório deve declarar o provedor, a cobertura realmente retornada e os campos
  indisponíveis. Nenhuma API externa substitui transcrição, frames ou OCR locais.
- `Local Business Data` é uma integração distinta para presença local; não pertence ao
  coletor de Instagram nem pode ser usado como fallback dele.

Esta rota não cria contas, não troca credenciais por chat e não deve ser usada para
contornar limites ou controles da RapidAPI/Instagram.

## Gates obrigatórios

1. **Escopo:** a URL veio do Carlos e aponta para um perfil. Não descobrir ou
   coletar perfis adicionais por conta própria.
2. **API primeiro:** chamar somente os dois hosts Instagram allowlisted com pool ativo;
   conferir no manifesto provider, Requests e cobertura. Não presumir que a API tem
   Stories, Destaques, binários ou dados privados.
3. **Acesso complementar:** só pelo `collect_instagram.py`, que fixa o Chrome
   **Profile 5 (Tavir, `empresatavir@gmail.com`)**. Proibido qualquer outro caminho de
   navegador (Claude-in-Chrome, Playwright/Chrome DevTools MCP, computer-use, `webbrowser`,
   Chrome na mão) — eles caem no perfil errado. Usar somente o que essa conta pode
   visualizar; não contornar perfil privado, bloqueio, CAPTCHA ou limitação. Sem sessão,
   o script abre a página oficial nesse perfil e o Carlos faz o login direto; nunca pedir
   credenciais no chat.
4. **Preflight Chrome:** executar a coleta com `--dry-run` e validar autenticação e destino
   antes do complemento. `LOGIN_REQUIRED` pausa essa etapa; depois da confirmação do Carlos,
   repetir o preflight.
4. **Coleta:** conferir o manifesto e os logs por categoria. `ok` não significa
   que havia Stories/Destaques disponíveis.
5. **Processamento:** inventariar todo o corpus; fazer transcrição/frames em
   amostra profunda configurável, ampliando somente se necessário.
6. **Análise:** toda conclusão importante cita evidência. Separar observado,
   inferido e indisponível.
7. **Entrega:** gerar e abrir completo + resumo, cada um em `.md` e `.html`;
   declarar cobertura, período, amostra, Requests RapidAPI usados e limitações.
8. **Handoff:** gerar `inteligencia-marketing.json` e promover somente conhecimento
   sanitizado conforme `../marketing/inteligencia-nichos/README.md`. Fonte pública
   pode seguir após QA; conta privada, cliente ou PII exigem aprovação e anonimização.

Íris continua responsável apenas pela análise e pelo diagnóstico. Ela não cria
calendário, peças ou publicações; Sami consome o aprendizado promovido.

## Estratégia de custo

1. Metadados, bio e legendas de todo o corpus.
2. `faster-whisper` local para fala, sem custo de API.
3. Cinco frames por vídeo e contact sheets para leitura visual rápida.
4. OCR local quando Tesseract estiver disponível.
5. Modelo multimodal apenas para peças-chave ou ambiguidades.

O primeiro passe profundo usa até 40 vídeos recentes e 120 imagens. Não baixar
menos conteúdo por economia: a limitação vale ao processamento pesado; o
inventário e os metadados cobrem tudo que foi coletado.

Coleta integral usa lock por perfil em `controle/.collection.lock`. Timeout do
invólucro não autoriza segunda instância: verificar PIDs, aguardar ou retomar pelo
archive. O runner deve reservar até 2 horas e preservar os heartbeats de 30 segundos.

## Dados e segurança

- `perfis/` é local e ignorado pelo Git. Nunca forçar commit de mídia, cookies,
  transcrições ou dados pessoais.
- O script restringe a leitura de cookies ao domínio `instagram.com` e não os
  exporta. Logs não podem conter cabeçalhos/cookies.
- Não redistribuir conteúdo coletado. Relatório para cliente deve usar apenas as
  evidências necessárias e o escopo autorizado.
- Evitar inferências sobre atributos sensíveis, saúde, orientação, religião,
  etnia, idade ou personalidade de pessoas retratadas.

## Formato do `_LOG.md`

```markdown
## [AAAA-MM-DD] auditoria | @perfil | <resumo>
- Escopo: <URL, período e limites>
- Coleta: <contagens e categorias; falhas>
- Processamento: <transcrições/frames/OCR>
- Requests: <RapidAPI total; tráfego Chrome/gallery-dl não mensurado>
- Entregas: <completo/resumo em .md/.html e inteligencia-marketing.json>
- Próximo passo: <ação/gate>
```
