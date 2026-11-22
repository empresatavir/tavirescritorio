# Dossiê — Fisioterapia · página de serviço (referência OrtoCenter)

Fonte: `absorcao.json` · capturadoEm `2026-11-22T11:28:12.571Z` · urlFinal `https://www.ortocenter.com.br/servicos/Fisioterapia` · resposta 200 · janela 1440×900 · alturaPagina 3026 (`janela`). Status: rascunho (não validado).

## Resumo

Landing de **oferta de serviço** (fisioterapia) dentro de um site institucional de clínica. A página organiza a conversão em três camadas fixas: (1) faixa promocional + cabeçalho sticky com CTA «Agendar consulta»; (2) hero de serviço (rótulo de categoria + H1 + lead + foto do ambiente); (3) corpo em grade de duas colunas — texto/recursos à esquerda e coluna sticky de agendamento/horário/local/próximos passos à direita — com widget flutuante de assistente e aviso de cookies. Fonte: `secoes`, `fixos`, `telas/desktop-dobra.jpg`, `telas/desktop-inteira.jpg`.

A ideia que organiza a página é **serviço → prova → ação**: o visitante identifica o serviço no hero, lê o porquê e a grade de técnicas, e a qualquer momento a coluna sticky e o CTA do header oferecem o mesmo destino de agendamento. Funciona porque o contraste da coluna escura «Agendar este serviço» e o CTA verde-escuro com pulso contínuo (`movimento.animadosAgora` / `ctaPulse`) mantêm a conversão visível enquanto o conteúdo rola (`fixos` · `aside.svc-side` sticky topo 96px).

Serve ao modo **Padrão**: é um molde reutilizável de página de serviço clínico (hero + conteúdo + sidebar de conversão + navegação anterior/próximo + rodapé institucional), com movimento e estados bem medidos, sem depender de conceito experimental único.

Modo sugerido: padrao

## Estrutura

Ordem vertical observada em 1440 px (`secoes`, `telas/desktop-inteira.jpg`, `telas/rolagem-01`–`04`). Acima das seções de conteúdo há três faixas de chrome (utilbar + topbar + header), medidas em `navegacao`, `fixos` e prints.

| # | Bloco | Alvo / fonte | y | Altura | Fundo | Padding | Largura conteúdo | Layout | Papel |
|---|-------|--------------|---|--------|-------|---------|------------------|--------|-------|
| 0a | Utilbar | `div.utilbar` · `cores.fundo` | — | — | `#eef0ed` | — | — | linha: rótulo esq. + links dir. (`navegacao`) | Acesso B2B / institucional |
| 0b | Topbar promo | `div.topbar` · `cores.degrades` | — | — | `linear-gradient(90deg, rgb(11,115,52), rgb(11,115,52) 60%, rgb(110,159,131))` | — | — | mensagem + CTA «Agendar agora» + fechar | Anúncio rotativo de conversão |
| 0c | Header | `header.header` · `fixos[0]` | sticky 0 | 101 | `#f8f8f6 @92%` + `saturate(1.4) blur(8px)` · z 50 | — | 1440 | logo + medalha + nav + CTA | Navegação principal sticky |
| 1 | Hero de serviço | `section.page-hero` · `secoes[0]` | 178 | 400 | `#bfd3c7` | `56 0 56 0` | 1280 | block · 4 filhos · 1 col · gap 0 | Identidade do serviço (breadcrumb, rótulo, H1, lead) |
| 2 | Mídia do hero | `div.svc-hero-media` · `secoes[1]` | 626 | 480 | (vazio medido) | `0 0 0 0` | 1280 | block · 1 imagem | Prova visual do ambiente |
| 3 | Corpo + sidebar | `section.section` · `secoes[2]` | 1106 | 1233 | (vazio; leitura do print: fundo página `--bg`/`#F8F8F6`) | `40 0 130 0` | 1280 | **grid 2 col** · gap `56/56` | Conteúdo editorial + conversão sticky |
| 4 | Rodapé | leitura do print `telas/rolagem-04.jpg` · `telas/desktop-inteira.jpg` | após §3 | — | `#0b7334` (`--ink-footer` / `--green-900`) | — | — | colunas de links + marca + social | Fechamento institucional |

### Seção 1 — Hero (`secoes[0]`)

- Dentro: breadcrumb (Home / Serviços / Fisioterapia), rótulo uppercase «Reabilitação», H1 «Fisioterapia», 1 parágrafo lead (`conteudo.paragrafos: 1`, 247 caracteres, 2 links).
- Papel: posicionar o serviço e a capacidade do departamento antes da prova visual.

### Seção 2 — Foto (`secoes[1]`)

- 1 imagem; raio da foto `24px` (`raios` · `div.svc-hero-photo`); sombra `rgba(0,0,0,0.14) 0px 24px 60px 0px` (`sombras`).
- Papel: âncora visual real (sala/equipamentos), não decoração abstrata.

### Seção 3 — Corpo em 2 colunas (`secoes[2]`, `telas/rolagem-01`–`03`)

**Coluna esquerda (leitura do print):**

1. Bloco «Por que fisioterapia» (h2 32px/700 · `escalaTipografica`).
2. Bloco «Avaliação fisioterapêutica».
3. Grade «O que você encontra aqui» — 6 itens numerados 01–06 (técnicas), tipografia título `17px/700`, descrição `16px/400` (`escalaTipografica`).
4. Navegação de serviços: `a.svc-nav-link.prev` (+ next) · `371×85` · fundo `#bfd3c7` · raio `18px` · padding `18 22` (`componentes` id 11).

**Coluna direita — sticky (`fixos` · `aside.svc-side`):**

- Posição sticky · topo `96px` · largura `380` · altura medida `1064`.
- Cartões (`componentes` · `div.side-card` · 380×204 · raio 18 · padding 22):
  - Card primário escuro (`cores.fundo` · `div.side-card.primary` = `#202422`): rótulo «Agendar este serviço», claim, CTA «Agendar Fisioterapia» (`componentes` id 12 · 336×56 · fundo `#ffffff` · texto `#0b7334` · raio 999px).
  - Card «Horário de atendimento».
  - Card «Onde acontece».
  - Card «Próximos passos» com degrade `linear-gradient(135deg, rgb(191,211,199), rgb(255,255,255))` (`cores.degrades` · `div.side-card`) e links `a.side-link` (334×44).

### Fixos sobre a página (`fixos`)

| Alvo | Posição | Medida | z | Fundo / efeito |
|------|---------|--------|---|----------------|
| `header.header` | sticky · topo 0 | 101×1440 | 50 | `#f8f8f6 @92%` · blur 8px saturate 1.4 |
| `aside.svc-side` | sticky · topo 96px | 1064×380 | auto | — |
| `a.cilene` | fixed · base 24px · topo 756px | 120×402 | 60 | widget assistente |
| `div.cookie-aviso` | fixed · base 16px | 142×640 | 70 | `#ffffff` |

`cabecalhoAoRolar`: `{}` — nenhuma mudança de estilo do header ao rolar foi registrada.

## Tokens

### Cores por papel (`variaveisCss`, `cores`)

| Papel | Token / origem | Valor |
|-------|----------------|-------|
| Fundo de página | `--bg` | `#F8F8F6` |
| Superfície | `--surface` | `#FFFFFF` |
| Texto principal | `--ink` · `cores.texto` | `#202422` |
| Texto secundário / mute | `--ink-mute` · `--green-500` | `#6E9F83` |
| Texto em rodapé / acento forte | `--ink-footer` · `--green-900` · `--green-700` | `#0B7334` |
| Acento (CTA, links ativos) | `--green-900` / `#0b7334` | `#0B7334` |
| Acento suave / hero | `--green-100` · `--green-50` · fundo hero | `#BFD3C7` |
| Utilbar | `cores.fundo` · `div.utilbar` | `#eef0ed` |
| Superfície escura (card CTA) | `div.side-card.primary` | `#202422` |
| Texto sobre verde/escuro | `cores.texto` | `#ffffff`, `#ffffff @82%`–`@88%` |
| Borda suave | `--border` | `rgba(32, 36, 34, .08)` |
| Borda forte | `--border-strong` | `rgba(32, 36, 34, .15)` |
| Borda medalha | `cores.borda` · `button.header-medal-link` | `1px solid #bfd3c7` |
| Borda botão secundário | `button.btn.btn-secondary` | `1px solid #0b7334` |
| Topbar (degrade) | `cores.degrades` · `div.topbar` | `linear-gradient(90deg, #0B7334, #0B7334 60%, #6E9F83)` |
| Avatar Cilene (degrade) | `cores.degrades` · `div.cilene-avatar` | `radial-gradient(circle at 30% 30%, #BFD3C7, #6E9F83 70%, #0B7334)` |

### Raios (`variaveisCss`, `raios`)

| Token | Valor | Uso medido |
|-------|-------|------------|
| `--radius-sm` | `8px` | `a.nav-link`, ícones sociais rodapé |
| `--radius-md` | `12px` | itens de lista/cartão leve |
| (medalha) | `14px` | `button.header-medal-link` |
| `--radius-lg` | `18px` | `a.svc-nav-link`, `div.side-card` |
| `--radius-xl` | `24px` | `div.svc-hero-photo` |
| `--radius-2xl` | `32px` | escala disponível |
| pílula | `999px` | CTAs `btn-primary` / `btn-secondary`, `span.topbar-link` |
| círculo | `50%` | `div.cilene-avatar` |

### Sombras (`variaveisCss`, `sombras`)

| Papel | Valor |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(32,36,34,.03)` |
| `--shadow-md` | `0 6px 22px rgba(32,36,34,.05)` |
| `--shadow-lg` | `0 18px 50px rgba(32,36,34,.08)` |
| Avatar / elevação | `rgba(32,36,34,0.08) 0px 18px 50px 0px` (`div.cilene-avatar`) |
| CTA primary | inset `rgba(255,255,255,0.28) 0 1px 0` + `rgba(11,115,52,0.32) 0 8px 18px` + `rgba(11,115,52,0.22) 0 14px 34px` |
| CTA + anel de pulso | sombra base + `rgba(11,115,52,0.02) 0 0 0 8.56695px` (`a.btn.btn-primary` header) |
| Medalha | `rgba(11,115,52,0.08) 0 2px 8px` |
| Foto hero | `rgba(0,0,0,0.14) 0 24px 60px` |

### Espaçamento (`variaveisCss`, `espacamento`)

- `--pad-x`: `clamp(20px, 4vw, 44px)`
- `--section-y`: `clamp(72px, 9vw, 132px)`
- `--section-y-compact`: `clamp(52px, 7vw, 96px)`
- Escala frequente: `10, 12, 14, 16, 18, 20, 22, 24, 32, 40, 44, 56` px (`espacamento.valores`).
- Gaps medidos: `5–22px` (`espacamento.gaps`); gap da grade do corpo: `56/56` (`secoes[2]`).

### Camadas (`camadas`, `fixos`)

| z | Uso |
|---|-----|
| 50 | `header.header` |
| 60 | `a.cilene` |
| 70 | `div.cookie-aviso` |

### Bloco de variáveis (pronto para outra marca)

```css
:root {
  --bg: #F8F8F6;                 /* fundo página */
  --surface: #FFFFFF;            /* superfície / cartão */
  --ink: #202422;                /* texto principal */
  --ink-mute: #6E9F83;           /* texto secundário / acento suave */
  --ink-footer: #0B7334;         /* texto/fundo rodapé = acento forte */
  --accent: #0B7334;             /* CTA, links ativos, foco */
  --accent-soft: #BFD3C7;        /* hero, nav serviços, bordas suaves */
  --accent-mid: #6E9F83;         /* mute / degrade topbar */
  --surface-dark: #202422;       /* card de conversão */
  --utilbar: #eef0ed;            /* faixa utilitária */
  --border: rgba(32, 36, 34, .08);
  --border-strong: rgba(32, 36, 34, .15);
  --shadow-sm: 0 1px 2px rgba(32,36,34,.03);
  --shadow-md: 0 6px 22px rgba(32,36,34,.05);
  --shadow-lg: 0 18px 50px rgba(32,36,34,.08);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-pill: 999px;
  --pad-x: clamp(20px, 4vw, 44px);
  --section-y: clamp(72px, 9vw, 132px);
  --section-y-compact: clamp(52px, 7vw, 96px);
  --z-header: 50;
  --z-assistant: 60;
  --z-cookie: 70;
  --font-display: "Montserrat", system-ui, sans-serif;
  --font-body: "Montserrat", system-ui, sans-serif;
}
```


## Tipografia

Família única medida: **Montserrat** (`fontes.uso`, `variaveisCss` · `--mono` e `--display` ambos Montserrat). Pesos observados: 400 (69%), 500 (7%), 600 (13%), 700 (8%), 800 (3%). Arquivos locais: nenhum (`fontes.arquivos: []`). Folha Google Fonts listada em `naoLidos.folhasBloqueadas` — licença: **SIL Open Font License** (conferir no Google Fonts / repositório oficial; não embutir binário do site).

### Escala (`escalaTipografica`, `responsivo`)

| Degrau | Tamanho / peso / linha / tracking / caixa | Onde |
|--------|-------------------------------------------|------|
| Display H1 | 81px / 800 / 85px / −1.6128px | `h1` serviço · desktop 1440 (`responsivo.desktop.h1`: 81px/800 linha 84.672px) |
| H1 notebook | 57px / 800 / 60.2112px | `responsivo.notebook` |
| H1 tablet | 46px / 800 / 48.3px | `responsivo.tablet` |
| H1 celular | 43px / 800 / 45.045px | `responsivo.celular` |
| H2 seção | 32px / 700 / 48px / −0.322px | «Por que fisioterapia» etc. (estável nas 4 larguras) |
| Lead hero | 22px / 400 / 35px | parágrafo do hero · desktop (`responsivo.desktop.corpo`); tablet/celular: 18px/400 linha 28.48px |
| Corpo / nav util | 16–17px / 400–500 / 23–26px | links, textos |
| Nav principal | 17px / 500 / 26px | `a.nav-link` |
| CTA header | 16px / 800 / 24px / −0.081px | «Agendar consulta» |
| CTA sidebar | 18px / 800 | «Agendar Fisioterapia» (`componentes` id 12) |
| Card técnica título | 17px / 700 / 23px | ex.: Cinesioterapia |
| Card técnica desc | 16px / 400 / 22px | ex.: Movimento terapêutico |
| Label uppercase seção | 15–16px / 600 / ~23px / 1.5–3.43px · **uppercase** | «Agendar este serviço», «Atendimento», «Reabilitação» |
| Micro / breadcrumb-ish | 13px / 600 / 18–19px / 0.5–1px · por vezes uppercase | «Serviço anterior», chips |
| Rodapé legal | 15px / 400 / 23px / 0.6px | copyright |
| Link política | 14px / 600 / 22px | Política de Privacidade |
| Topbar «Não é paciente?» | 14px / 600 / 21px / 0.69px · uppercase | utilbar |

Caixa: labels de seção e utilbar em **uppercase** com letter-spacing positivo; H1/H2 em title case sem uppercase forçado.

## Componentes e estados

Foco padrão recorrente (quase todos os interativos): `outlineStyle none → solid`, `outlineColor → rgb(11, 115, 52)`, `outlineOffset 0 → 3px` (cookies Aceitar/Recusar: offset **4px**). Fonte: `componentes[*].foco`, `estados`.

### 1. Link nav principal — `a.nav-link` (`componentes` id 8)

- Medida: 102×46 · Montserrat 17px/500 · cor `#202422` · raio 8px · padding `10 13`
- Transição: `background, color · 0.15s · ease`
- **Hover:** color `#202422` → `#0b7334`; background transparente → `rgba(11,115,52,0.06)`
- **Foco:** outline solid verde · offset 3px
- Ao passar mouse também registrou `transform` 300 ms (`movimento.aoPassarMouse`) — valor de/para do transform **não** veio no objeto hover (ver Lacunas)

### 2. Trigger dropdown — `button.nav-link.nav-trigger` (`componentes` id 2 · gatilhos t0/t1)

- Medida: 129×46 · mesmos tokens do nav-link · transição `background, color · 0.15s · ease`
- **Hover:** color → `#0b7334`; background → `rgba(11,115,52,0.06)`; borderColor → `#0b7334`
- SVG chevron: transição `transform · 0.25s · ease` (`movimento.transicoes` / aoPassarMouse 250 ms)
- Painel: ver Interações

### 3. Link utilbar — `a.utilbar-link` (`componentes` id 5)

- 108×23 · 16px/500 · `#202422`
- Transição: `color · 0.15s · ease`
- **Hover:** color → `#0b7334`

### 4. CTA primary header — `a.btn.btn-primary` «Agendar consulta» (`componentes` id 9)

- 204×42 · 16px/800 · texto `#ffffff` · fundo `#0b7334` · raio 999px · padding `9 14`
- Sombra: `rgba(11,115,52,0.32) 0 8px 18px` + anel `rgba(11,115,52,0.02) 0 0 0 8.56695px`
- Transição: `background, color, transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s, border-color 0.15s, filter 0.2s · ease`
- Hover dedicado **não** capturado neste alvo (objeto hover ausente) — padrão espelhado no botão cookies Aceitar (id 4): scale ≈1.025 + translateY −2px · `brightness(0.94)` · sombra intensifica
- Animações contínuas: `ctaPulse` 2.8s infinite · `ctaShine` 3.6s infinite (`movimento`)

### 5. CTA primary cookies — `button.btn.btn-primary` «Aceitar» (`componentes` id 4)

- 90×44 · 16px/800 · fundo `#0b7334` · raio 999px · padding `9 14`
- **Hover:** transform `none → matrix(1.025,0,0,1.025,0,-2)`; filter → `brightness(0.94)`; box-shadow intensifica (string truncada na medição)
- **Foco:** outline solid verde · offset 4px

### 6. Botão secundário — `button.btn.btn-secondary` «Recusar» (`componentes` id 3)

- 97×44 · 16px/600 · cor `#0b7334` · borda `1px solid #0b7334` · raio 999px · padding `9 14`
- Mesma família de transição do primary
- **Hover:** background transparente → `#bfd3c7`
- **Foco:** outline offset 4px

### 7. CTA sidebar invertido — `a.btn.btn-primary` «Agendar Fisioterapia» (`componentes` id 12)

- 336×56 · 18px/800 · **texto `#0b7334` · fundo `#ffffff`** · raio 999px · padding `14 26`
- Sombra: inset branco + sombras verdes (string truncada)
- Mesma transição multi-propriedade do primary; hover específico não listado no objeto

### 8. Nav serviço ant/próx — `a.svc-nav-link.prev` (`componentes` id 11)

- 371×85 · fundo `#bfd3c7` · raio 18px · padding `18 22` · 16px/400
- Transição: `background, transform · 0.2s · ease`
- **Hover:** transform `none → matrix(1,0,0,1,-2,-2)` (desloca −2,−2)

### 9. Side link — `a.side-link` (`componentes` id 13)

- 334×44 · 16px/600 · `#0b7334` · padding `10 0`
- Transição: `padding · 0.18s · ease`
- Hover no objeto: «sem mudança medida»; em `movimento.aoPassarMouse`: `padding-left` 180 ms — delta em px **não** registrado (Lacunas)

### 10. Cartão lateral — `div.side-card` (`componentes` id 19)

- 380×204 · fundo `#ffffff` · raio 18px · padding 22 · borda 1px (cor da borda vazia na string medida)
- Hover/foco: sem mudança medida

### 11. Logo — `a.logo` (`componentes` id 7)

- 112×50 · transição `transform · 0.2s · ease`
- **Hover:** transform → `matrix(1,0,0,1,-1,0)` (1px à esquerda)

### 12. Medalha header — `button.header-medal-link` (`componentes` id 1)

- 70×64 · fundo `#ffffff` · borda `#bfd3c7` · raio 14px · padding `5 9` · sombra verde suave
- Transição: `transform, box-shadow · 0.2s · ease`
- **Hover:** sombra `0.08/2px/8px` → `0.16/6px/16px`; transform → `translateY(-1px)` (`matrix(...,0,-1)`)

### 13. Fechar topbar — `button.topbar-close` (`componentes` id 0)

- 32×32 · 21px · cor `#ffffff @70%` · raio 6px
- Transição: `background, color · 0.15s · ease`
- **Hover:** color → `#ffffff`; background → `rgba(255,255,255,0.14)`

### 14. Ícones sociais rodapé (`componentes` id 15 · botão/link 44×44)

- Fundo `#ffffff @14%` · cor `#ffffff @92%` · raio 8px
- Transição: `background, color, transform · 0.2s · ease`
- **Hover:** color → `#0b7334`; background → `#ffffff`; transform → `translateY(-2px)`

### 15. Links de rodapé (`componentes` id 16)

- Cor `#ffffff @88%` · transição `color · 0.15s · ease`
- **Hover:** → `#ffffff` sólido

### 16. Link topbar mensagem — `a.topbar-msg` (`componentes` id 6)

- 1144×31 · 16px/500 · `#ffffff` · hover sem mudança medida

### 17. Widget Cilene — `a.cilene` / `div.cilene-avatar` / `div.cilene-bubble` (`fixos`, `movimento`)

- Fixed 402×120 · z 60 · base 24px
- Avatar: círculo 50% · borda `3px solid #ffffff` · sombra `--shadow-lg` · animação `cilenePulse` 2.4s infinite
- Bubble: entrada `cilenePop` 600 ms · delay 400 ms · ease-out
- Avatar transição transform: `0.25s · cubic-bezier(0.22,1,0.36,1)` (`movimento.transicoes`)

### 18. Aviso de cookies — `div.cookie-aviso` (`fixos`)

- Fixed · 640×142 · z 70 · fundo `#ffffff` · base 16px
- Entrada: `cookieSobe` 280 ms ease-out
- Contém texto + Recusar + Aceitar (componentes id 3 e 4)

## Movimento

Curva recorrente de entrada: `cubic-bezier(0.22, 1, 0.36, 1)`. Bibliotecas: nenhuma (`bibliotecas: []`) — tudo CSS.

### Keyframes observados em uso nesta página

| Nome | Quadros (`movimento.keyframes` + `animacoesVivas`) |
|------|-----------------------------------------------------|
| `ctaShine` | 0%, 8%: `left: -80%` → 36%, 100%: `left: 175%` |
| `ctaBreath` | 0%/100%: `scale: 1` · 50%: `scale: 1.035` — **definido; não listado em animadosAgora desta captura** |
| `ctaPulse` | 0%/100%: box-shadow base + anel opaco · 50%: anel `0 0 0 9px` com alpha 0 (string truncada nos vivos; keyframes completos em `keyframes`) |
| `pageEnter` | 0%: opacity 0 · translateY(8px) → 100%: opacity 1 · translateY(0) |
| `cilenePop` | 0%: opacity 0 · translateY(8px) scale(0.95) → 100%: opacity 1 · translateY(0) scale(1) |
| `cilenePulse` | 0%/100%: `box-shadow: rgba(110,159,131,0.6) 0 0 0 0, #fff 0 0 0 2px` · 50%: anel 8px alpha 0 |
| `ctaFade` | 0%: opacity 0 · translateY(3px) → 100%: opacity 1 · translateY(0) |
| `cookieSobe` | 0%: opacity 0 · translateY(12px) → 100%: opacity 1 · translateY(0) |

Keyframes presentes no CSS do site mas **não** vistos rodando nesta página: `heroEnter`, `heroEnterRight`, `marquee`, `convModalIn`, `testiFill`, `kenburns`, `hbRise`, `hbFill`, `skShimmer`, `videoModalIn` (`movimento.keyframes` vs `animadosAgora`).

### Linha a linha (gatilho → propriedade)

| # | Gatilho | Alvo | Prop. | De → Para | Duração | Atraso | Curva | Rep. | Ordem |
|---|---------|------|-------|-----------|---------|--------|-------|------|-------|
| 1 | ao carregar (~428 ms) | `main.page-tx` | opacity, transform | 0 + Y8px → 1 + Y0 | 600 ms | 0 | cubic-bezier(0.22,1,0.36,1) | 1 | com o lote inicial |
| 2 | ao carregar (~428 ms) | `span.topbar-text` | opacity, transform | 0 + Y3px → 1 + Y0 | 450 ms | 0 | ease | 1 | paralelo |
| 3 | ao carregar (~428 ms) | `a.btn.btn-primary` (header) | box-shadow | ciclo `ctaPulse` | 2800 ms | 0 | ease-in-out | ∞ | contínuo |
| 4 | ao carregar (~428 ms) | `span.topbar-dot` / `div.cilene-avatar` | box-shadow | ciclo `cilenePulse` | 2400 ms | 0 | ease-in-out | ∞ | contínuo |
| 5 | ao carregar (~465 ms) | `div.cookie-aviso` | opacity, transform | 0 + Y12px → 1 + Y0 | 280 ms | 0 | ease-out | 1 | logo após lote |
| 6 | ao carregar (~647 ms) | `a.btn.btn-primary` | left (pseudo shine) | −80% → 175% | 3600 ms | 0 | ease-in-out | ∞ | após pulse |
| 7 | ao carregar (~889 ms) | `div.cilene-bubble` | opacity, transform | 0 + Y8px scale.95 → 1 + Y0 scale1 | 600 ms | 400 ms (decl. CSS) | ease-out | 1 | depois do cookie |
| 8 | ao carregar / msg | `div.msg` | opacity, transform | ctaFade | 450 ms | 0 | ease | 1 | com bubble |
| 9 | ao rolar | `div.reveal.is-in` | transform | (partida não medida) → estado visível | 700 ms | — | — (transição) | 3× na sessão | ao entrar na viewport |
| 10 | ao rolar | `div.reveal.is-in` | opacity | (partida não medida) → visível | 700 ms | — | — | 3× | paralelo ao #9 |
| 11 | ao passar mouse | `a.nav-link` | color, background | ver Componentes | 150 ms | 0 | ease | — | — |
| 12 | ao passar mouse | `a.nav-link` | transform | valor não medido | 300 ms | 0 | — | — | — |
| 13 | ao passar mouse | painel dropdown | opacity, visibility, transform | abrir/fechar | 200 ms | 0 | — | — | com chevron 250 ms |
| 14 | ao passar mouse | `a.svc-nav-link.prev` | transform | 0 → (−2,−2) | 200 ms | 0 | ease | — | — |
| 15 | ao passar mouse | `a.side-link` | padding-left | delta não medido | 180 ms | 0 | ease | — | — |
| 16 | ao passar mouse | medalha | transform, box-shadow | Y−1 + sombra ↑ | 200 ms | 0 | ease | — | — |
| 17 | ao passar mouse | cookies Aceitar | transform, filter, box-shadow | scale 1.025 / Y−2 / brightness .94 | 180–250 ms | 0 | cubic-bezier(0.22,1,0.36,1) no transform | — | — |
| 18 | sozinho | pulse CTA / Cilene | box-shadow | ciclos | 2810 / 2400 ms | — | ease-in-out | ∞ | `movimento.sozinho` |


## Interações

Formulários nesta página: nenhum (`formularios: []`). Só a URL informada foi lida — destinos de agendamento/links internos ficam de fora.

### 1. Dropdown «Imprensa» (`gatilhos` t0 · `interacoes[0]` · `telas/interacao-01.jpg` · quadro vídeo `video/frames/f-07.jpg`)

- **Gatilho:** `button.nav-link.nav-trigger` texto «Imprensa» · `popup: true` · `expandido` medido como `"false"` depois do clique (inconsistência com o painel aberto — ver Lacunas).
- **O que abre:** `div.nav-dropdown-panel.open` — leitura do print/vídeo: painel branco sob o item, links curtos (rótulos vistos: Artigos, Blogs, Cirurgias, Eventos).
- **De onde:** sob o trigger na nav do header.
- **Tamanho / posição / fundo atrás:** caixa do painel, cor de fundo, sombra e scrim **não** medidos numericamente (`interacoes[0].abriu: []`). Leitura do print: superfície branca, sombra suave, sem overlay de página.
- **Entrada (movimento medido ~220 ms após o clique):** painel `transform`, `visibility`, `opacity` — duração nos eventos de clique veio `null`; em hover genérico a transição do painel é **200 ms** (`movimento.aoPassarMouse`). Chevron SVG `transform` ~250 ms.
- **Saída:** mesmas propriedades em `div.nav-dropdown-panel` (sem `.open`) ~200 ms (`aoPassarMouse` início 7173 ms).
- **Fecha com Esc:** `fechaComEsc: false`. Clique fora / hover-out: não instrumentados além da transição de fechamento.
- **Foco:** não há trapa de foco medida; outline padrão do botão (verde, offset 3px).

### 2. Dropdown «Loja» (`gatilhos` t1 · `interacoes[1]` · `telas/interacao-02.jpg`)

- **Gatilho:** `button.nav-link.nav-trigger` «Loja».
- **Painel:** mesmas transições `nav-dropdown-panel.open` (transform / visibility / opacity); conteúdo do menu **não** listado em `abriu` nem legível com certeza no print de interação.
- **Efeito colateral medido em `abriu`:** troca do texto da topbar (`span.topbar-text`) com animação `ctaFade · 0.45s · ease` — mensagem rotativa (rótulo curto: programa FLS / avaliação online). Não é o dropdown em si.
- **Esc:** `fechaComEsc: false`.
- Leitura do print: item «Loja» com destaque de borda/fundo verde suave (estado hover/ativo do trigger).

### 3. Widget Cilene (`fixos` · `a.cilene`)

- Sempre visível (fixed). Clique / destino do link **não** instrumentados (área pós-clique fora do escopo).
- Mensagens do bubble trocam com `ctaFade` 450 ms (`movimento.semTocar` / `aoRolar` em `div.msg`).

### 4. Aviso de cookies (`fixos` · `div.cookie-aviso`)

- Presente nos prints (não foi fechado na sessão — `lacunas`).
- Ações Aceitar / Recusar: botões medidos; resultado após clique **não** capturado.
- Sem backdrop/desfoque de página — o aviso é card fixed branco z 70.

### 5. Topbar fechar (`button.topbar-close`)

- Hover medido; efeito de dismiss da barra **não** capturado em `interacoes`.

### 6. Sticky sidebar e header

- Comportamento passivo ao rolar: sidebar gruda em `top: 96px`; header sticky `top: 0` com blur. Sem mudança de estilo adicional (`cabecalhoAoRolar: {}`).

## Tempos automáticos

| O quê | Alvo | Intervalo / duração | O que muda | Fonte |
|-------|------|---------------------|------------|-------|
| Pulso do CTA header | `a.btn.btn-primary` | ciclo **2800–2810 ms** | `box-shadow` (anel expande/some) — `ctaPulse` | `movimento.sozinho`, `animadosAgora` |
| Brilho no CTA | mesmo botão (camada shine) | ciclo **3600 ms** | `left` −80% → 175% — `ctaShine` | `animacoesVivas`, `aoCarregar` |
| Pulso online Cilene | `span.topbar-dot`, `div.cilene-avatar` | ciclo **2400 ms** | `box-shadow` anel verde | `movimento.sozinho` |
| Rotação de copy na topbar | `span.topbar-text` | fade **450 ms** por troca; **intervalo entre mensagens não medido** | texto do anúncio + `ctaFade` | `semTocar`, prints distintos, `interacoes[1].abriu` |
| Rotação de copy no bubble | `div.msg` | fade **450 ms**; intervalo entre frases **não medido** | texto do assistente | `semTocar`, `aoRolar` |
| Entrada única cookie | `div.cookie-aviso` | **280 ms** uma vez | sobe + fade-in | `aoCarregar` |
| Entrada única página | `main.page-tx` | **600 ms** uma vez | pageEnter | `aoCarregar` |

Não há carrossel de imagens, letreiro `marquee` ativo, contador numérico nem cursor piscando medidos nesta página. O keyframe `marquee` existe no CSS global mas não rodou aqui.

## Responsivo

### Quebras declaradas (`quebras`, `mediaQueries`)

Principais larguras: 400, 480, 540, 560, 640, 767/768, 860, 1000, 1024, 1280, 1440, 1536, 1620. Queries Tailwind-like `min-width: 640/768/1024/1280/1536` + várias `max-width` em rem + `prefers-reduced-motion: reduce`.

### Por largura (`responsivo`)

| | **1440 desktop** | **1024 notebook** | **768 tablet** | **390 celular** |
|--|------------------|-------------------|----------------|-----------------|
| Altura página | 3026 | 3272 | 4301 | 5408 |
| H1 | 81px/800 · lh 84.67 | 57px/800 · lh 60.21 | 46px/800 · lh 48.3 | 43px/800 · lh 45.05 |
| H2 | 32px/700 · lh 48.3 | igual | igual | igual |
| Corpo (lead) | 22px/400 · lh 34.88 | 22px/400 | 18px/400 · lh 28.48 | 18px/400 |
| Nav links visíveis | 4 (`navegacao` utilbar) | 4 | 4 | 4 |
| Botão menu (hambúrguer) | false | false* | false* | false* |
| §1 hero alt / pad / col | 400 · `56 0 56 0` · 1 | 376 · `56 0 56 0` · 1 | 329 · `56 0 40 0` · 1 | 411 · `56 0 40 0` · 1 |
| §2 mídia alt | 480 | 480 | 397 | 263 |
| §3 corpo alt / pad / col | 1233 · `40 0 130 0` · **2** | 1360 · `40 0 92 0` · **2** | 2493 · `31 0 72 0` · **1** | 2967 · `24 0 72 0` · **1** |

\* `responsivo.*.navegacao.botaoDeMenu` veio `false` em todas as larguras, mas **leitura do print** `telas/notebook-dobra.jpg`, `tablet-dobra.jpg`, `celular-dobra.jpg`: nav completa some e aparece ícone hambúrguer + CTA curto «Agendar». Tratar a flag JSON como lacuna/erro de medição; o comportamento visual é menu colapsado ≤1024.

### O que muda (síntese)

- **1440:** nav completa no header; corpo 2 colunas gap 56; sidebar sticky 380px; cookies 640px e Cilene lado a lado (`fixos`).
- **1024:** ainda 2 colunas no §3; H1 cai para 57px; padding inferior do §3 92; header compacto com hambúrguer (print).
- **768:** §3 vira **1 coluna** (conteúdo empilha; cards de conversão sobem/descem no fluxo — leitura `telas/tablet-inteira.jpg`); H1 46px; lead 18px; foto 397px.
- **390:** mesma coluna única; página mais alta (5408); foto 263px; padding §3 `24 0 72 0`; cookies e Cilene sobrepõem a dobra (`telas/celular-dobra.jpg`); utilbar/topbar podem comprimir ou rolar (leitura do print: utilbar ainda mostra links).

`prefers-reduced-motion: reduce` está em `mediaQueries` — regras exatas de redução **não** foram extraídas (Lacunas).


## Receita de reprodução

Construir na ordem abaixo. Valores já estão nos passos. Técnica base: **HTML/CSS puro + Intersection Observer** para `.reveal`. Sem biblioteca de animação (`bibliotecas: []`). Alternativa se o projeto já usa Framer Motion / GSAP: mapear as mesmas durações/curvas; não é necessário para equivalência.

### 1. Base e tokens

1. Viewport de referência 1440×900; container de conteúdo **1280px** centrado; `--pad-x: clamp(20px, 4vw, 44px)`.
2. Colar o bloco `:root` da seção Tokens (cores por papel, raios, sombras, z-index, fontes).
3. Fundo da página `--bg`; superfícies `--surface`.
4. Camadas: header 50, assistente 60, cookie 70.

### 2. Tipografia

1. Carregar Montserrat 400–800 via licença própria/Google Fonts (não copiar arquivos do site).
2. Mapear degraus: H1 81/800/−1.61px (fluidizar com as medidas notebook/tablet/celular), H2 32/700, lead 22/400 (18 abaixo de ~768), labels uppercase 15–16/600 com tracking 1.5–3.4px, CTA 16–18/800.

### 3. Estrutura (chrome → hero → corpo → rodapé)

1. **Utilbar** fundo `#eef0ed`: rótulo uppercase esq. + links 16/500 dir. gap ~22px.
2. **Topbar** degrade 90deg `#0B7334` → `#0B7334` 60% → `#6E9F83`: texto 16/500 branco + pill «Agendar agora» + botão fechar 32×32.
3. **Header sticky** altura ~101, fundo `#F8F8F6` @92% + `saturate(1.4) blur(8px)`: logo · medalha 70×64 raio 14 · nav links padding 10×13 raio 8 · CTA pill 204×42 verde.
4. **Hero** fundo `#BFD3C7`, padding `56 0 56 0`: breadcrumb · label · H1 · lead.
5. **Foto** largura do container, altura ~480 desktop, raio 24, sombra `0 24px 60px rgba(0,0,0,.14)`.
6. **Section** grid 2 col gap 56, padding `40 0 130 0`:
   - Esq.: blocos texto + grade 2×3 de técnicas (número verde + título 17/700 + desc 16/400) + dois `svc-nav-link` 18px raio fundo `#BFD3C7`.
   - Dir.: `aside` sticky `top: 96px` largura 380 — card escuro `#202422` + CTA branco/verde 336×56 + cards horário/local + card próximos passos (degrade 135deg `#BFD3C7`→`#fff`) com `side-link`.
7. **Rodapé** fundo `#0B7334`, colunas de links claros, social 44×44 raio 8 fundo branco @14%.

### 4. Componentes e estados

1. Links nav: hover 150ms ease → cor `#0B7334` + bg `rgba(11,115,52,.06)`.
2. CTA primary: transição multi (transform 180ms `cubic-bezier(0.22,1,0.36,1)`, shadow 250ms, filter 200ms); hover scale 1.025 + translateY −2 + brightness 0.94.
3. Secondary: hover bg `#BFD3C7`.
4. svc-nav: hover translate(−2px,−2px) 200ms.
5. Logo: hover translateX(−1px) 200ms; medalha: translateY(−1) + shadow up 200ms.
6. Foco: outline solid `#0B7334` offset 3px (4px nos botões do cookie).

### 5. Movimento

1. No load: `pageEnter` 600ms no main; `ctaFade` 450ms no texto da topbar; `cookieSobe` 280ms; `cilenePop` 600ms delay 400ms no bubble.
2. Loop: `ctaPulse` 2.8s infinite ease-in-out no CTA header; `ctaShine` 3.6s infinite (pseudo-elemento left −80%→175%); `cilenePulse` 2.4s no avatar/dot.
3. Scroll: classe `.reveal` → transição **700ms** em opacity + transform; observar com `IntersectionObserver` (threshold a critério; valor de partida não medido — usar translateY(18px) opacity 0 como hipótese alinhada a `hbRise`, documentada como lacuna se quiser paridade absoluta).
4. Respeitar `prefers-reduced-motion: reduce`: desligar loops e entradas (query existe; CSS exato não medido).

### 6. Interações

1. Dropdowns Imprensa/Loja: painel `opacity/visibility/transform` 200ms; chevron 250ms; sem Esc (`fechaComEsc: false`).
2. Topbar: opcional fechar via `topbar-close`.
3. Cookie fixed bottom; Cilene fixed bottom-left z 60.
4. Não implementar fluxo pós-agendamento nesta receita (fora da absorção).

### 7. Responsivo

1. ≥1024: grid 2 col no corpo.
2. ≤768: 1 col; lead 18px; H1 46→43; padding section inferior 72; foto encolhe 397→263.
3. ≤1024 (print): trocar nav por hambúrguer + CTA «Agendar» curto, mesmo com flag JSON `botaoDeMenu: false`.
4. Testar 1440 / 1024 / 768 / 390 contra alturas de página do `responsivo`.

## Com a marca do cliente

### O que fica (estrutura e comportamento)

- Pilha utilbar → topbar promo → header sticky blur → hero serviço → foto → grid conteúdo+sidebar sticky → nav ant/próx → rodapé.
- Sidebar de conversão com card escuro + cards info + links «próximos passos».
- Widget assistente fixed + aviso de cookies.
- Estados de hover/foco e loops de pulso/shine/pulse online.
- Reveal 700ms ao entrar na viewport.
- Quebra de 2→1 coluna no corpo.

### O que troca (tokens)

- Todas as variáveis de cor por papel (`--bg`, `--surface`, `--ink`, `--accent`, `--accent-soft`, `--surface-dark`, degrade da topbar, fundo do hero).
- Tipografia: família display/body (manter escala e pesos relativos).
- Raios e sombras se a marca for mais seca ou mais suave.
- Conteúdo: rótulos de seção, 6 técnicas, horários, endereço, CTAs.

### Ajustes quando a marca muda

| Mudança | Ajuste |
|---------|--------|
| Paleta **clara → escura** | Hero `--accent-soft` precisa contraste com `--ink`; card `--surface-dark` pode virar superfície clara com texto escuro (inverter o contraste do CTA sidebar); topbar degrade e rodapé usam `--accent` — validar AA em links brancos. |
| Paleta **escura → clara** (já é clara) | Manter card de conversão com contraste alto (escuro ou acento saturado) para não perder o ímã visual. |
| Fonte **mais larga** | H1 81px pode estourar linha — reduzir tracking negativo ou tamanho fluid; labels uppercase com tracking alto (3.4px) podem precisar de menos letter-spacing. |
| Fonte **mais estreita** | Aumentar um pouco o tracking dos labels; CTA pill pode parecer vazia — conferir padding `9 14` / `14 26`. |
| Cliente **sem foto** | Substituir `svc-hero-photo` por ilustração própria, vídeo poster ou bloco tipográfico; manter raio 24 e sombra para não perder o peso da seção 2. |
| Cliente **sem vídeo / sem assistente humana** | Remover Cilene ou trocar avatar por ícone/marca; manter posição fixed e um CTA de contato; desligar `cilenePulse`/`cilenePop` se não houver bubble. |
| Texto **mais longo em PT** | Lead 22px com lh 35 tolera 2–3 linhas; grade de técnicas: títulos curtos — se alongar, permitir wrap e altura variável nos cards; sidebar 380px fixa — claims longos quebram linha no card escuro. |

## Não copiar

Ativos e textos do dono do site (OrtoCenter). Registrar existência; substituir pelos do cliente.

| Tipo | O que existe na referência | Usar no lugar |
|------|----------------------------|---------------|
| Logo | Marca Orto Center no header e rodapé (`a.logo`, `a.footer-logo`) | Logo do cliente |
| Selo / medalha | Imagem `header-medal` (certificação) | Selo próprio ou omitir |
| Foto hero | JPG da sala de fisioterapia (`midia.imagens`, `svc-hero-photo`) | Foto/vídeo do cliente ou stock licenciado |
| Avatar assistente | Foto da «Cilene» + nome | Assistente/marca do cliente ou só botão WhatsApp |
| Ícones | 17 SVGs inline (`midia.svgsEmLinha`) — forma própria do site | Ícones do design system do cliente |
| Tipografia paga | Nenhuma além de Montserrat OFL; não copiar WOFF do CDN do site | Licenciar/fonte própria |
| Textos | Frases de claim, descrições clínicas, horários, endereço, CNPJ, rodapé, cookies, mensagens da topbar/bubble | Redigir com Marina/Yuri + dados do cliente |
| Código | HTML/CSS/JS do site | Reimplementar do dossiê |
| Destinos | URLs de agendamento, redes, páginas internas | URLs do cliente |

## Lacunas

### Da chave `lacunas` / avisos da absorção

- Só a página do endereço informado foi lida: páginas internas, área logada e fluxo depois de enviar formulário ficaram de fora.
- Aviso de cookies não foi fechado: aparece nos prints e no vídeo.

### Medição / instrumentação

- `cabecalhoAoRolar: {}` — sem dados de compactação do header ao rolar.
- `interacoes[*].expandidoDepois: "false"` mesmo com `nav-dropdown-panel.open` animando; conteúdo completo dos menus Imprensa/Loja pouco estruturado em `abriu` (Imprensa: lista vista no vídeo; Loja: painel sem inventário).
- Durações `null` em parte das transições do painel no clique (usar 200 ms do `aoPassarMouse`).
- Hover do CTA header (`componentes` id 9) e do CTA sidebar (id 12) sem objeto hover completo; inferir pelo Aceitar (id 4) e pelas transições declaradas.
- `a.side-link`: transição de `padding-left` 180 ms sem valores de/para.
- `a.nav-link`: transform 300 ms ao hover sem matriz medida.
- Valores iniciais de `.reveal` (opacity/transform de partida) não medidos — só duração 700 ms em `movimento.aoRolar`.
- Intervalo entre trocas de mensagem da topbar e do bubble Cilene não medido (só fade 450 ms).
- Strings de `box-shadow` truncadas em vários pontos (`ctaPulse`, hover Aceitar).
- `responsivo.*.navegacao.botaoDeMenu: false` em notebook/tablet/celular contradiz os prints (hambúrguer visível).
- Dimensões exatas, sombra e itens do `nav-dropdown-panel` não na tabela de componentes.
- CSS exato sob `prefers-reduced-motion: reduce` não extraído.
- `naoLidos.folhasBloqueadas`: CSS do Google Fonts não lido pelo medidor (família ainda aparece computada como Montserrat).
- Keyframes globais não usados nesta página (`marquee`, `kenburns`, `heroEnter`, etc.) — não reproduzir «por precaução».
- Destino do clique em Cilene, Aceitar cookies, Agendar e links de serviço: fora do escopo.

### O que isso impede

- Paridade pixel-perfect do dropdown Loja e do estado expandido ARIA.
- Paridade do reveal sem assumir translateY de partida.
- Cronômetro fiel do carrossel de copies da topbar/assistente.
- Validar se o header muda visualmente após dismiss da topbar ou ao rolar além do sticky básico.
- Reproduzir o fluxo completo de agendamento pós-CTA.

### Vídeo

- `video/sessao.webm` lido via metadados e quadros extraídos (duração **38.72 s**, 1280×800, VP9, 25 fps). Confirma dropdown Imprensa aberto e rotação de copies. Áudio: inexistente (só vídeo).

