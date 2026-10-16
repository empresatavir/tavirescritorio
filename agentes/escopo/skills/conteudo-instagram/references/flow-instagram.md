# Google Flow para Instagram

> Revisado em 2026-08-30. Recursos e créditos mudam; confirme o modelo e o custo no seletor antes
> de gerar. Fontes oficiais: [modelos do Flow](https://support.google.com/flow/answer/16352836),
> [imagens](https://support.google.com/flow/answer/16729550) e
> [vídeos/referências](https://support.google.com/flow/answer/16353334).

## Projeto e ingredientes

- um projeto Flow por ciclo: `<MARCA>-<CICLO>-<AAAA-MM>`;
- importar logo oficial, paleta/tokens, 1–3 referências de composição e, se houver, personagem ou
  produto autorizado;
- referências de pessoa/produto em fundo simples; imagens de estilo sem assuntos extras;
- texto do prompt complementa as referências, sem contradizê-las.

## Formato do prompt

```text
FINALIDADE: <Reel cover | carousel slide | Story | static>
PROPORÇÃO: <selecionar no Flow; ex. vertical ou retrato conforme a peça>
ASSUNTO: <quem/o quê aparece e o que está fazendo>
AMBIENTE: <contexto operacional específico>
COMPOSIÇÃO: <enquadramento, hierarquia e espaço negativo>
LUZ/CÂMERA: <luz, lente/movimento quando relevante>
IDENTIDADE: <cores, tipografia como referência, tratamento e logo fornecido como ingrediente>
TEXTO NA ARTE: <texto exato ou "sem texto gerado; aplicar na edição">
CONSISTÊNCIA: <ingredientes e elementos que não podem mudar>
EVITAR: <clichês, objetos, erros, texto extra, marca inventada>
SAÍDA: <número de variações e intenção de cada uma>
```

Para vídeo, acrescente duração escolhida no Flow, ação por beat, movimento de câmera, início/fim,
áudio desejado e o que deve permanecer estável. Use frames inicial/final ou ingredientes quando a
continuidade importar. O Flow oferece recursos diferentes por modelo; não peça recurso que o
modelo ativo não suporta.

## Negativos padrão TAVIR

Sem robô humanoide, cérebro luminoso, holograma, neon roxo-azul, call center genérico, aperto de
mãos, código aleatório, dashboard com número inventado, texto adicional, logo redesenhado, pele
tingida, ruído futurista, excesso de brilho ou estética de curso de IA.

## QA de exportação

- usar somente logo de `TAVIR/brand-kit/logo/` como ingrediente/overlay oficial;
- conferir palavra por palavra; texto gerado com erro é reprovado;
- conferir contraste, área segura, leitura em tela pequena e frame de capa;
- conferir coerência de pessoa, ambiente, objeto e cor entre cenas/slides;
- registrar modelo escolhido e versão final do prompt;
- manter o original e versões no Stack do Flow;
- aplicar disclosure/rotulagem quando exigido pela plataforma ou pelo conteúdo;
- exportar com nome `<variant_id>-<asset>-vNN.ext>`.

## Instagram como fonte viva

O [Best Practices no Professional Dashboard](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/)
é a fonte prioritária para recomendações personalizadas de frequência, atenção, duração, alcance,
Reels, hashtags e tendências. Registre o que a conta mostrar; não cristalize isso como regra global.
