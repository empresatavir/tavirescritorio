# Técnico — Roteamento RapidAPI da auditoria Instagram

## Escopo e perfil de risco

Perfil `INTERNA`, com modificadores `api_publica`, `dados_pessoais`, `ia_externa` e
`conteudo_rico`. O ativo principal é a capacidade de consultar conteúdo público ou
autorizado; Keys RapidAPI são segredos de integração. A mudança não publica dados nem
abre uma API da TAVIR.

## Arquitetura

`rapidapi/providers.json` é a allowlist de hosts, capacidades e prioridade. Hoje tem
dois provedores com assinatura confirmada: `best_experience` (prioridade 1, ~100/mês) e
`social_premium`/Instagram Scraper AI1 (prioridade 2, ~25/mês).
`rapidapi/router.py` carrega Keys do arquivo local, seleciona uma Key por provedor,
faz a chamada HTTPS, registra somente telemetria sanitizada e sincroniza limites dos
headers RapidAPI. Envia um `User-Agent` de navegador em toda chamada: o upstream do
Scraper AI1 fica atrás de Cloudflare e devolve `403 Error 1010` sem esse header (não é
falha de auth/plano). `request_with_fallback` recebe requisições já mapeadas por um
adaptador de provedor; não presume que endpoints homônimos tenham o mesmo contrato.
`rapidapi/instagram_adapter.py` implementa os contratos de perfil/feed dos dois
provedores (validados com chamada real em 2026-08-31) e grava um pacote local de
metadados com a cobertura real:

- `best_experience`: `GET /profile?username=` → `GET /feed?user_id=`
- `social_premium`: `GET /user/info_v2/?username=` → `GET /user/feed_v2/?username=`

Cada instância do roteador mantém telemetria efêmera por request iniciado: provedor,
método, rota relativa, status e resultado. Query, corpo, resposta e valor da Key não
entram nessa telemetria. O manifesto expõe `requests.total`, por provedor e resultado.

Na rota Chrome, `collect_instagram.py` usa lock atômico por perfil, registra PID do
subprocesso e emite heartbeat. O lock sobrevive a timeout abrupto para impedir a
segunda instância enquanto o `gallery-dl` continua vivo. `finalize_report.py` valida
o relatório completo, deriva o resumo e renderiza os dois HTML autocontidos.
O diretório padrão do Chrome é `Profile 5` (perfil Tavir); ele é passado tanto para
`gallery-dl` quanto para o processo que abre a tela oficial de login.

O estado local é JSON atômico, separado por mês, provedor e label (`KEY_N`). Não há
valor de Key, e-mail ou resposta bruta no estado. O módulo não usa o host genérico da
API de futebol.

## Configuração

Variáveis e finalidade, sem valores:

- `RAPIDAPI_KEY_N`: valor da Key local, de 1 a 100 suportadas.
- `RAPIDAPI_INSTAGRAM_KEYS_<PROVEDOR>`: pool explícito de labels já assinadas; ausente
  ou vazio significa bloqueado (fail-closed).
- `RAPIDAPI_INSTAGRAM_DEFAULT_LIMIT`: limite preventivo quando o painel ainda não foi
  conferido.
- `RAPIDAPI_LIMIT_<PROVEDOR>_<KEY_N>`: limite preventivo específico.

Assinaturas confirmadas para a Íris: `Instagram Best Experience` (100/mês por Key) e
`Instagram Scraper AI1` (25/mês por Key). São **13 Keys**, cada uma de uma conta RapidAPI
distinta com assinatura própria nos dois provedores, então a capacidade agregada é
~1300/mês no Best Experience e ~325/mês no Scraper AI1. Os dois pools em
`config/instagram_rapidapi.env` listam `KEY_1..KEY_13`; o limite por Key vem de
`RAPIDAPI_LIMIT_<PROVEDOR>_DEFAULT` (100 e 25), com `RAPIDAPI_LIMIT_<PROVEDOR>_KEY_N`
sobrepondo casos pontuais. `_choose_key` seleciona a Key **menos usada** do pool a cada
chamada; 429 põe a Key em cooldown de 60s, 401/403 em 1h, e a chamada segue para a
próxima Key disponível — só depois de esgotar o pool o adaptador cai para o outro provedor.

`Local Business Data` é uma integração distinta para pesquisa de presença local
(Google Maps/listagens) e **não tem uso em nenhum ponto do código** — não pertence ao
coletor de perfil do Instagram.

O arquivo real de Keys é `config/api_keys.env`; pools e quotas ficam em
`config/instagram_rapidapi.env`. Os exemplos versionados são
`config/api_keys.env.example` e `config/instagram_rapidapi.env.example`.

## Contrato de falhas

O roteador trata 429 como cooldown de quota/rate limit, 401/403 como indisponibilidade
de autenticação/plano e erros de rede como falha transitória. Ele não registra corpo
bruto, cabeçalhos sensíveis ou URL com segredo. O adaptador deve fornecer código de
erro, correlação segura e cobertura parcial no relatório final.

## Testes e operação

Executar a suíte offline:

```powershell
python -m unittest discover -s rapidapi -p "test_*.py"
python -m unittest discover -s ../.agents/skills/instagram-profile-audit/scripts -p "test_*.py"
python -m rapidapi.router
python rapidapi/instagram_adapter.py "https://www.instagram.com/perfil/" --max-posts 20
```

O segundo comando exibe somente hosts, labels, limites e status. O terceiro comando
consome quota apenas quando houver pool preenchido. Testes reais devem
ser feitos apenas após as assinaturas e com uma URL autorizada; não fazem parte deste
commit para evitar consumo de quota e exposição de conteúdo.

## Decisões e limites

- Keys de aplicações diferentes da mesma conta RapidAPI não multiplicam a quota da
  conta; assinaturas de APIs diferentes têm quotas próprias.
- As 13 Keys da Íris são de contas RapidAPI **distintas**, cada uma com assinatura
  própria — por isso a quota soma e a rotação é legítima. Se em algum momento passarem a
  ser apps de uma conta só, reduzir o pool: rotacionar Keys da mesma conta não aumenta a
  quota e o roteador não deve mascarar isso.
- O roteador nunca deve ser usado para contornar um limite de conta; o que ele faz é
  distribuir carga entre contas que já têm direito de uso.
- A Graph API oficial continua sendo a rota preferencial para dados da própria conta
  Business/Creator quando aplicável. RapidAPI permanece dependência externa, sujeita a
  mudanças de contrato, disponibilidade e termos.
- `Requests` no relatório significa tentativas HTTP iniciadas contra a RapidAPI. Não
  significa tokens/turnos da IA nem requests internos do gallery-dl.
