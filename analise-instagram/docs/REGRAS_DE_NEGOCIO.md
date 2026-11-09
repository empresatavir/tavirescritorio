# Regras de negócio — RapidAPI da Íris

## RN-IG-001 — Segredo fora do Git

Keys só podem ser lidas de `config/api_keys.env`, que deve ser ignorado pelo Git. O
exemplo não contém valores reais.

## RN-IG-002 — Host allowlisted

Uma requisição só pode usar um provedor cadastrado em `rapidapi/providers.json` e
HTTPS. URL absoluta, host arbitrário e redirecionamento escolhido por entrada externa
são inválidos.

## RN-IG-003 — Pool por provedor

Cada provedor possui seu próprio pool de Keys. A variável específica restringe o pool
às contas que realmente têm assinatura naquele provedor.

## RN-IG-004 — Quota real prevalece

Quando a resposta traz limite/restante, esses valores substituem o limite preventivo
local. O roteador deve parar antes de chamar uma Key com restante zero.

## RN-IG-005 — Fallback controlado

A próxima Key do mesmo provedor pode ser tentada uma vez após indisponibilidade. Outro
provedor só pode ser tentado quando o adaptador tiver mapeado rota e schema equivalentes.

## RN-IG-006 — Sem duplicação silenciosa

Uma consulta não é repetida integralmente em todos os provedores. Tentativas, provedor,
Key label e cobertura devem aparecer no log sanitizado/manifesto, sem valores secretos.

## RN-IG-007 — Relatório honesto

Campos ausentes, Stories, Destaques e métricas não retornados permanecem `Indisponível`;
nenhum fallback autoriza estimativa.

## RN-IG-008 — Escopo e autorização

Somente a URL fornecida e o conteúdo autorizado podem ser consultados. O sistema não
faz login, publica, segue, curte, comenta ou contorna bloqueios.

## RN-IG-009 — Uma coleta por perfil

Somente uma coleta real pode operar por perfil. Timeout do invólucro não autoriza
retry enquanto o PID do lock estiver vivo; depois, a retomada usa o archive.

## RN-IG-010 — Requests verificáveis

O relatório declara o total de Requests RapidAPI do manifesto. Requests do
gallery-dl não são estimados e permanecem explicitamente não mensurados.

## RN-IG-011 — Completo e resumo

Toda entrega possui versão completa e resumo executivo em Markdown e HTML. O resumo
é derivado da versão completa e não pode retirar evidência da fonte de verdade.
