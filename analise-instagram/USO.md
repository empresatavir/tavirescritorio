# Uso — Auditoria Instagram

## Propósito

A Íris coleta e analisa, dentro do escopo autorizado, perfil, publicações, Reels,
Stories, Destaques e metadados do Instagram. A saída é um diagnóstico verificável,
não uma ferramenta de publicação ou interação com contas.

## Primeiro uso da rota RapidAPI

1. Copie `config/api_keys.env.example` para `config/api_keys.env` ou confirme que a
   cópia local das Keys já existe.
2. Assine cada API no e-mail correspondente antes de colocar sua Key no pool daquele
   provedor. O pool permanece bloqueado se a variável correspondente estiver ausente
   ou vazia.
3. Preencha os pools em `config/instagram_rapidapi.env` e configure limites reais por
   provedor/Key nesse arquivo, conforme o painel da
   RapidAPI. O default de 150 é apenas um freio preventivo.
4. Use `python -m rapidapi.router` a partir de `analise-instagram` para consultar o
   status sem revelar valores de Keys.
5. O adaptador ativo é `rapidapi/instagram_adapter.py`; ele faz preflight do contrato,
   coleta perfil/feed quando a Key está configurada e grava a cobertura retornada.
6. No Telegram, use `/instagram https://www.instagram.com/perfil/`, revise o rascunho e
   toque em **Executar**. Também é possível usar `/agentes` → **Íris Instagram**.

As assinaturas vinculadas à Íris são **Instagram Best Experience** (~100 chamadas/mês,
rota padrão) e **Instagram Scraper AI1** (~25 chamadas/mês, só fallback). São consultadas
nessa ordem para perfil/feed; os contratos foram validados com chamada real em 2026-08-31.
A API **Local Business Data** não é uma API de Instagram (é presença local — Google
Maps/listagens) e não tem uso em nenhuma rotina da Íris.

## Saídas obrigatórias

Cada auditoria concluída entrega cinco artefatos: relatório completo em Markdown e
HTML, resumo executivo em Markdown e HTML e `inteligencia-marketing.json`. O HTML é
autocontido, imprimível e marcado `noindex`; não depende de CDN ou recurso remoto.

O relatório mostra `Requests RapidAPI usados` com o total exato do manifesto. Coleta
via Chrome/gallery-dl consome `0` Requests RapidAPI; o tráfego HTTP interno feito pelo
extrator é declarado como não mensurado, nunca estimado.

RapidAPI é a rota preferencial de metadados; não garante Stories, Destaques, métricas,
arquivos de mídia ou compatibilidade total em toda conta. A Íris sempre declara o que
foi observado e o que ficou indisponível. A coleta autenticada autorizada continua
disponível como complemento quando houver sessão legítima no navegador.

## Perfil Chrome da TAVIR

O coletor usa por padrão o diretório Chrome `Profile 5`, que corresponde ao perfil
visível como **Tavir** (`empresatavir@gmail.com`). Tanto a leitura segura dos cookies
quanto a página oficial de login usam esse mesmo diretório. Para uma exceção explícita,
informe `--browser-profile "<diretório Chrome>"`; não basta o nome exibido no seletor.

O `collect_instagram.py` é o **único** meio de navegador autorizado neste braço.
Ferramentas de navegador genéricas (Claude-in-Chrome, Playwright, computer-use, Chrome
aberto na mão) caem no perfil errado e não devem ser usadas para ver o Instagram.
Se a coleta pelo script falhar com `Permission denied` no banco de cookies, é o Chrome
aberto travando o arquivo: feche o Chrome e rode de novo — não troque de perfil.

## Onde ficam os dados

- Keys: `analise-instagram/config/api_keys.env` — local, ignorado pelo Git.
- Pools e limites: `analise-instagram/config/instagram_rapidapi.env` — local, ignorado pelo Git.
- Quotas: `analise-instagram/config/.rapidapi-usage.json` — local, ignorado pelo Git.
- Provedores e capacidades: `analise-instagram/rapidapi/providers.json` — versionado,
  sem segredo.
- Corpus e relatórios: `analise-instagram/perfis/<slug>/` — local e ignorado.

## Limites e recuperação

Cada provedor tem um pool de **13 Keys**, uma por conta RapidAPI, com assinatura própria
— capacidade agregada ~1300 chamadas/mês no Best Experience e ~325/mês no Scraper AI1.
O roteador escolhe a Key **menos usada** do pool, sincroniza os headers de quota e passa
para a próxima só quando a atual falha, entra em cooldown ou fica sem capacidade. Uma
auditoria consome ~2 chamadas (perfil + feed). Se todas as Keys de um provedor falharem,
o adaptador cai para o outro provedor. Não repetir a auditoria inteira em todos.

Se houver `401`/`403`, confira assinatura, host e associação daquela Key (as outras
seguem no rodízio). Se houver `429`, o roteador já espera o cooldown e usa a próxima Key.
Não crie contas novas só para furar limite — o rodízio é entre contas que já têm direito.

Uma coleta integral pode levar mais de uma hora. O script emite heartbeat a cada 30
segundos e cria `controle/.collection.lock` com os PIDs do invólucro e do gallery-dl.
Se o executor atingir timeout, não repita o comando: confira o lock. Instância ativa
continua; lock sem PID vivo é removido automaticamente e o archive retoma sem baixar
de novo o que já foi concluído.

O Escritório usa o Scheduled Task `TAVIR Escritorio Watchdog`: inicia no logon e
verifica painel + worker a cada cinco minutos. Reinstale de modo idempotente com
`powershell -File tools/install_office_watchdog.ps1`.

## Privacidade e segurança

Não envie senha, 2FA ou cookies pelo chat. Não copie o `api_keys.env` para Git, issue,
backup público ou log. Se uma Key aparecer fora do ambiente local, revogue-a e gere
outra no painel RapidAPI.

## Onboarding

NÃO SE APLICA: esta é uma rotina operacional de linha de comando, sem uma interface
de primeiro uso. A documentação fornece o primeiro valor e a recuperação segura.
