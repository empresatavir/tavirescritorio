---
name: youtube-business-intelligence
description: Extrai, organiza e analisa vídeos, podcasts e aulas públicas do YouTube com foco em inteligência de negócios para a TAVIR. Use quando Carlos fornecer uma URL do YouTube e pedir resumo profundo, insights, modelos de negócio, operação, produtos, monetização, aquisição, processos, oportunidades, ideias ou testes aplicáveis à empresa.
---

# YouTube Business Intelligence

Transforme conteúdo audiovisual em inteligência rastreável. O resultado não é uma
sinopse: é um relatório de decisão com timestamps, níveis de evidência, oportunidades
para a TAVIR e experimentos pequenos.

## Fluxo obrigatório

1. Leia `analise-youtube/AGENTS.md` e a ficha do agente.
2. Confirme que a URL foi fornecida pelo Carlos e é pública ou autorizada.
3. Crie `analise-youtube/projetos/<slug>/PROJECT.md` antes de qualquer coleta.
4. Rode `scripts/collect_youtube.py` para metadados e legendas.
5. Se não houver legenda, use `--audio-fallback` somente com transcrição local
   configurada. Não use API paga sem autorização.
6. Leia a transcrição e aplique o schema de `references/analysis-schema.md`.
7. Gere `relatorios/inteligencia-negocios.md`, `relatorios/insights.json` e
   `controle/manifesto.json`.
8. Verifique cobertura, timestamps e consistência entre Markdown e JSON.
9. Se houver aprendizado de conteúdo, marca, aquisição, distribuição ou redes
   sociais, classifique o JSON por nicho e promova somente o recorte sanitizado de
   insights, decisões e experimentos para `marketing/inteligencia-nichos/`, após QA.
10. Atualize `PROJECT.md` e `analise-youtube/_LOG.md`.
11. Mostre ao Carlos os principais insights e pergunte quais devem ser promovidos
    ao vault destilado. Nunca ingira automaticamente transcrição ou relatório inteiro.

## Hierarquia da análise

- Tese central, contexto e mapa temático.
- Modelo de negócio, proposta, produtos, monetização e economia.
- Aquisição, distribuição, mídia, marca e parcerias.
- Operação, equipe, processos, tecnologia e indicadores.
- Decisões, heurísticas, modelos mentais e alegações a verificar.
- Riscos, limitações e o que não deve ser copiado.
- Oportunidades para a TAVIR e experimentos de 7, 30 e 90 dias.

## Evidência e inferência

- `OBSERVADO`: o conteúdo afirma ou demonstra, com timestamp.
- `ALEGACAO_DO_CONVIDADO`: número, resultado ou fato não verificado externamente.
- `INFERENCIA`: interpretação do analista, explicando a ligação lógica.
- `OPORTUNIDADE_TAVIR`: hipótese aplicável, nunca apresentada como fato.
- `INDISPONIVEL`: informação necessária que o vídeo não fornece.

Use paráfrases. Citações literais devem ser curtas e indispensáveis. Não reproduza
a transcrição em entregas públicas.

## Coleta

```powershell
python .agents/skills/youtube-business-intelligence/scripts/collect_youtube.py `
  "https://www.youtube.com/watch?v=VIDEO_ID" `
  --output "analise-youtube/projetos/meu-slug"
```

Com fallback de áudio local:

```powershell
python .agents/skills/youtube-business-intelligence/scripts/setup_environment.py --with-transcription
analise-youtube/.venv/Scripts/python.exe `
  .agents/skills/youtube-business-intelligence/scripts/collect_youtube.py `
  "<url>" --output "analise-youtube/projetos/<slug>" --audio-fallback
```

Por padrão, o áudio temporário é apagado após a transcrição. Use `--keep-audio`
somente quando houver necessidade explícita.

## Limites

- Não contorne login, paywall, bloqueio regional, CAPTCHA ou proteção técnica.
- Não baixe playlists inteiras quando a solicitação for sobre um vídeo.
- Não publique nem redistribua mídia, legendas ou transcrições.
- Não transforme a opinião do convidado em recomendação sem análise crítica.
- Não copie um negócio: extraia princípios, condições e testes.
- Se o vídeo mencionar dados atuais relevantes à decisão, verifique-os em fontes
  primárias antes de recomendá-los.
