# Dossiê — vita.org.br (fisioterapia / ortopedia)

> Status: rascunho · captura parcial · `absorcao.json` → `resposta: 504` · validação: Carlos  
> Fontes usadas: `absorcao.json`, `telas/notebook-*`, `telas/tablet-*`, `telas/desktop-*` (504), `telas/celular-*` (504), `video/sessao.webm` (branco → 504).  
> Aviso: as chaves de medida automática (`cores`, `fontes`, `secoes`, `componentes`, `movimento`, `mediaQueries`, `quebras`) descrevem a **página Cloudflare 504**, não o site Vita. O site real aparece só em notebook (1024) e tablet (768). Tudo que veio de olhar print está marcado «leitura do print».

## Resumo

Landing institucional de clínica de ortopedia e fisioterapia (marca Vita / Grupo Fleury). A página organiza a oferta em faixa vertical clara: cabeçalho com agenda e telefone → hero de campanha com foto e CTA → grade de serviços → especialidades em cards de imagem → carrossel de corpo clínico em fundo escuro → diferenciais em grade 2×2 → lista de posts do blog → rodapé denso com CTA e mapa de links (`telas/notebook-inteira.jpg`, `telas/tablet-inteira.jpg`).

A ideia que organiza a página é **confiança clínica + primeiro passo**: foto de cuidado humano no hero, CTA de agendamento repetido no topo e no rodapé, prova social pelo corpo clínico e diferenciais, e conteúdo (blog) para autoridade. Funciona porque a hierarquia é simples (uma seção, um propósito), os fundos alternam claro/sage/escuro para marcar ritmo, e a conversão («Agendar agora» / «Dê o primeiro passo») fica sempre à mão — leitura do print.

Serve sobretudo como **Padrão**: estrutura de landing de saúde com header utilitário, hero campanha, grades de serviço/especialidade, carrossel de profissionais, diferenciais e blog. O lado Conceito (movimento, microinterações, tipografia de marca) **não foi medido** — a sessão automática caiu em 504 (`absorcao.json` → `resposta`, `titulo`, `lacunas[0]`; `video/sessao.webm`; `telas/desktop-*`, `telas/celular-*`).

**Modo sugerido: padrao**

## Estrutura

Ordem lida em `telas/notebook-inteira.jpg` (1024×4186; `responsivo[1].alturaPagina: 4186`) e confirmada em `telas/tablet-inteira.jpg` (768×4885; `responsivo[2].alturaPagina: 4885`). Faixas de fundo no gutter esquerdo do notebook (amostra de pixel, leitura do print):

| # | Seção (rótulo) | y approx. (notebook) | Altura approx. | Fundo (pixel) | Papel |
|---|----------------|----------------------|----------------|---------------|--------|
| 0 | Cabeçalho / nav | 0–148 | 148 (`responsivo[1].navegacao.altura`) | claro (obscurecido pelo overlay de cookies no print) | Identidade, busca, telefone, CTA agenda, links |
| 1 | Hero campanha | ~148–768 | ~620 (leitura do print; inclui faixa sob cookies) | claro / sage claro | Proposta + foto + CTA principal |
| 2 | Serviços | 768–1285 | ~518 | `#94A289` | 3 cards serviço (imagem + título + texto) |
| 3 | Especialidades | 1286–1820 | ~535 | `#F5F5F5` | Título + 4 cards imagem+rótulo |
| 4 | Corpo clínico | 1821–2732 | ~912 | `#1D3825` | Título + carrossel de profissionais + CTA |
| 5 | Diferenciais | 2733–3295 | ~563 | `#728370` | Título + grade 2×2 de cards brancos |
| 6 | Blog | 3296–3792 | ~497 | `#F5F5F5` | Título + grade 2×2 de cards-título |
| 7 | Rodapé | 3793–4185 | ~393 (`responsivo[1].secoes[2].altura: 393`) | `#1D3825` | Telefone, agenda, redes, links, legal |

`responsivo[*].secoes` no JSON lista só 3 blocos DOM em desktop/notebook/tablet (provável agregação grosseira) e 4 blocos no celular — estes 4 batem com a página 504 (`secoes[0..3]`). **Não usar `secoes` do JSON como mapa do site Vita.**

### 0 — Cabeçalho

- Posição aparente: topo da página; se fica sticky/fixed **não foi medido** (`fixos: []`, `cabecalhoAoRolar: {}`).
- Conteúdo (leitura do print, `telas/notebook-dobra.jpg`, `telas/tablet-dobra.jpg`):
  - Esquerda: logo «VITA» + subtítulo de especialidade; selo Grupo Fleury / anos.
  - Direita (utilitários): ícone busca · botão telefone · botão «Agendar agora» (fundo `#0F1C13`, amostra em `telas/notebook-dobra.jpg`).
  - Abaixo: fila de links — Sobre Nós, Unidades, Especialidades (chevron), Performance Esportiva, Serviços (chevron), Profissionais, Convênios, Blog.
- Links visíveis: 11 em 1440/1024/768 (`responsivo[0..2].navegacao.linksVisiveis`); botão de menu: `false` nessas larguras.
- Largura de conteúdo / padding interno: **não medidos** no site real (`secoes` = 504).

### 1 — Hero

- Layout (leitura do print): **2 colunas** em notebook e tablet — texto à esquerda, foto à direita.
- Esquerda: título de campanha · parágrafo curto · CTA pill «Dê o primeiro passo» (verde muito escuro) · em tablet-dobra, setas circulares de carrossel + trilha sob o CTA.
- Direita: foto vertical com cantos arredondados; em notebook, cartão/bloco de texto sobreposto à foto (mensagem de autonomia).
- Fundo: faixa clara; cor exata do hero **não confiável** no print por overlay de cookies (gutter `#7A7A7A`–`#7F7F7F` sob dimming).
- Banner «Sua Privacidade» sobrepõe a dobra (cookies não fechados — `lacunas[2]`).

### 2 — Serviços

- Fundo sage `#94A289` (pixel `telas/notebook-inteira.jpg` y≈1000).
- Grade: **3 colunas** em notebook e também em tablet (leitura do print, `telas/crops/tb-01.jpg` / nb-01).
- Cada coluna: imagem retangular com raio médio · título · parágrafo.
- Rótulos vistos: Vita até Você · Preparação Física · Pilates.
- Padding/gap numéricos: **não medidos**.

### 3 — Especialidades

- Fundo `#F5F5F5` (pixel y≈1550 notebook).
- Título de seção à esquerda.
- Grade: **4 colunas** em notebook (`telas/crops/nb-02.jpg`); **2×2** em tablet (`telas/crops/tb-01.jpg`).
- Card: foto alta, cantos arredondados, rótulo abaixo (Ortopedia, Reabilitação, Cirurgias, Outras especialidades).

### 4 — Corpo clínico

- Fundo `#1D3825` (pixel y≈2000–2500).
- Título branco longo à esquerda; **setas circulares** de carrossel à direita (leitura do print).
- Cards: foto do profissional + nome + CRM + especialidades + unidades; contorno claro, cantos arredondados; ~3 cards visíveis por vez em notebook.
- CTA central pill claro «Conheça nossos especialistas».
- Comportamento do carrossel (passo, loop, autoplay, duração): **não medido**.

### 5 — Diferenciais

- Fundo `#728370` (pixel y≈2900–3100).
- Título branco centralizado.
- Grade **2×2** de cards brancos (notebook e tablet).
- Card: ícone line-art à esquerda/topo · título · texto curto.
- Rótulos vistos: Profissionais Renomados · Inovação e Ciência · Referência no Esporte · Excelência do Grupo Fleury.

### 6 — Blog

- Fundo `#F5F5F5`.
- Título «Blog».
- Grade **2×2** de cards com borda fina, fundo claro, só título do post (leitura do print, `telas/crops/nb-04.jpg`, `nb-05.jpg`).

### 7 — Rodapé

- Fundo `#1D3825`; altura ~393 px em notebook (`responsivo[1].secoes[2].altura`).
- Faixa superior: botões claros telefone + Agendar · ícones sociais em quadrados claros · seta «topo».
- Faixa de links brancos em duas linhas.
- Faixa legal: copyright, endereço, RT · links privacidade / canal de confiança.

**Desktop 1440 e celular 390:** prints são página Cloudflare 504 (`telas/desktop-dobra.jpg` = `desktop-inteira.jpg` 1440×900; `telas/celular-*`). Estrutura Vita nessas larguras = lacuna (ver Responsivo / Lacunas). `responsivo[0]` alega `alturaPagina: 4383` e nav com 11 links, mas o print desktop não confirma.

## Tokens

### O que o JSON mediu (página 504 — não usar como marca Vita)

Fonte: `cores`, `raios`, `sombras`, `espacamento`, `camadas`, `variaveisCss`.

| Papel | Valor medido | Amostra JSON | Uso real |
|-------|--------------|--------------|----------|
| Texto | `#404040`, `#313131`, `#999999` | `cores.texto` | UI Cloudflare |
| Acento link | `#2f7bbf`, `#0051c3` | `cores.texto` | Links CF |
| Status ok / erro | `#9bca3e`, `#bd2426` | `cores.texto` | Diagrama 504 |
| Fundo | `#d9d9d9` | `cores.fundo` | Label código CF |
| Borda | `1px solid #ebebeb` | `cores.borda` | Footer CF |
| Degradê | linear cinza 222→235 | `cores.degrades[0]` | Faixa status CF |
| Raio | `20px` | `raios[0]` | `span.code-label` CF |
| Sombras | `[]` | `sombras` | — |
| Camadas | `[]` | `camadas` | — |
| CSS vars | `--text-opacity: 1` | `variaveisCss` | irrelevante |

Espaçamentos medidos (`espacamento.valores`): 40, 60, 32, 12, 4, 8, 24, 16 px — todos da página 504.

### Tokens do site Vita (leitura do print + amostra de pixel)

Valores hex abaixo vêm de `GetPixel` em `telas/notebook-inteira.jpg` / `notebook-dobra.jpg`. Não há chave `absorcao.json` equivalente. Tratar como **aproximação de print**, não como token CSS declarado.

| Papel | Valor (print) | Onde |
|-------|---------------|------|
| Fundo página / especialidades / blog | `#F5F5F5` | gutter y≈1550, 3400 |
| Fundo sage — serviços | `#94A289` | gutter y≈1000 |
| Fundo sage — diferenciais | `#728370` | gutter y≈2900–3100 |
| Fundo escuro — corpo clínico / rodapé | `#1D3825` | gutter y≈2000–2500, 3900–4100 |
| Superfície (cards, cookie) | `#FFFFFF` / `#FBFFFB` | cards diferenciais; painel cookies |
| Acento / botão primário escuro | `#0F1C13` … `#101D14` | «Agendar agora» em `notebook-dobra` |
| Texto em fundo escuro | branco (não amostrado como hex estável no texto) | títulos corpo clínico, diferenciais, footer |
| Texto em fundo claro | verde-escuro / cinza-escuro (leitura do print) | títulos e corpo |
| Borda card blog | fina cinza (leitura do print; hex não isolado) | cards blog |
| Overlay cookies | escurece a página sob o banner (leitura do print; opacidade **não medida**) | dobra notebook/tablet |

Raios: imagens e botões pill com canto arredondado — **sem px medido** no site real (`raios` = 504).  
Sombras / z-index: **não medidos** (`sombras: []`, `camadas: []`).

### Bloco de variáveis (papéis — pronto para outra marca)

```css
:root {
  /* fundos */
  --fundo-pagina: #F5F5F5;      /* print notebook-inteira */
  --fundo-sage-a: #94A289;      /* serviços · print */
  --fundo-sage-b: #728370;      /* diferenciais · print */
  --fundo-escuro: #1D3825;      /* corpo clínico + rodapé · print */
  --superficie: #FFFFFF;        /* cards / cookie · print */

  /* texto (papéis; hex de texto não amostrado com precisão) */
  --texto-em-claro: /* verde/cinza escuro — lacuna de hex */;
  --texto-secundario-em-claro: /* cinza médio — lacuna */;
  --texto-em-escuro: #FFFFFF;   /* leitura do print */
  --texto-em-escuro-suave: /* off-white — lacuna */;

  /* acento / ação */
  --acao-primaria: #0F1C13;     /* Agendar agora · print notebook-dobra */
  --acao-primaria-texto: #FFFFFF;

  /* borda / foco */
  --borda-suave: /* cinza claro cards blog — lacuna */;
  --foco-anel: /* não medido no site real */;

  /* raio / sombra / camada — lacunas de medida */
  --raio-imagem: /* lacuna */;
  --raio-pill: /* lacuna */;
  --sombra-card: /* lacuna */;
  --z-header: /* lacuna */;
  --z-cookie: /* lacuna */;
}
```

## Tipografia

### Famílias

- **Site Vita:** família **não identificada**. `fontes.arquivos: []`. `fontes.uso` e `escalaTipografica` descrevem `system-ui` da página Cloudflare 504, não a marca Vita.
- Leitura do print (`telas/notebook-dobra.jpg`, `telas/notebook-inteira.jpg`): sans-serif geométrica nos títulos e UI; logo «VITA» com desenho próprio (possível display/serif custom — não confirmado por arquivo).
- **Licença:** conferir no projeto do cliente (não há `@font-face` capturado). Não assumir fonte paga da Vita.

### Escala medida no JSON (página 504 — referência só da falha)

Fonte: `escalaTipografica`.

| Valor | Peso | Linha | Uso na 504 |
|-------|------|-------|------------|
| 60px | 300 | 75px | «Gateway time-out» |
| 30px | 400 | 39px | h2 explicação |
| 24px | 300 / 400 | 31px | h3 Browser / Working |
| 16px | 400 | normal / 26px | corpo |
| 13px | 400 / 600 | normal | footer / Ray ID |
| 12px | 500 | 72px | badge «Error code 504» |

### Escala do site Vita (só o que `responsivo` registrou com a página carregada)

Fonte: `responsivo[0..2]` (desktop/notebook/tablet). Celular (`responsivo[3]`) é tipografia da 504 — descartar para Vita.

| Degrau | 1440 (`responsivo[0]`) | 1024 (`responsivo[1]`) | 768 (`responsivo[2]`) | Onde (leitura do print) |
|--------|------------------------|------------------------|------------------------|-------------------------|
| h1 | 48px / 700 / linha 57.6px | igual | 48px / 700 / 57.6px | Título do hero |
| h2 | 36px / 700 / 43.2px | igual | **32px** / 700 / 38.4px | Títulos de seção (ex.: Especialidades, Blog) |
| corpo | 18px / 400 / 27px | igual | igual | Parágrafos de cards / hero |

Não medido no site real: letter-spacing, text-transform, tamanhos de nav, botões, CRM, labels «Especialidades:», tipografia do logo, pesos intermediários (500/600).

## Componentes e estados

### Medidos no JSON (página 504)

Fonte: `componentes[]`, `estados[]`, `movimento.transicoes`, `movimento.aoPassarMouse`.

#### Botão «Click to reveal» (`componentes[0]`)

| Campo | Valor |
|-------|-------|
| Tamanho | 80×17 |
| Fonte | system-ui 13px/400 |
| Cor | `#0051c3` |
| Fundo / borda / raio / padding / sombra | vazios / `0px` |
| Transição | `color · 0.15s · ease` (`componentes[0].transicao`) |
| Hover | `color` `rgb(0,81,195)` → `rgb(238,115,10)`; idem border/outline (`componentes[0].hover`) |
| Foco | `outlineStyle` none→auto; `outlineColor` → `rgb(16,16,16)`; `outlineWidth` 3px→1px (`componentes[0].foco`) |
| Cursor | pointer |

#### Links Cloudflare (`componentes[1..4]`)

| Campo | Valor comum |
|-------|-------------|
| Cor | `#2f7bbf` |
| Transição | `all · 0.15s · cubic-bezier(0, 0, 0.2, 1)` |
| Hover | `color` `rgb(47,123,191)` → `rgb(246,139,31)` |
| Foco | `outlineStyle` none→auto (larguras variam; ver cada `foco`) |

Estes componentes **não existem** na UI Vita. Servem só para documentar o que a captura mediu.

### Componentes Vita (leitura do print — estados sem duração medida)

#### Botão primário escuro («Agendar agora», «Dê o primeiro passo»)

- Forma: retângulo / pill, ícone à esquerda no de agenda (leitura do print).
- Fundo amostrado: `#0F1C13` (`telas/notebook-dobra.jpg`).
- Texto: branco.
- Hover / foco / ativo: **não medidos** (`movimento.aoPassarMouse` só viu controles da 504).

#### Botão telefone (header)

- Contorno / fundo mais claro que o CTA agenda (leitura do print); hex do miolo sob overlay ≈ `#4E4F49` em x≈780 (`notebook-dobra`) — valor contaminável pelo dimming.
- Hover/foco: não medidos.

#### Botão secundário claro («Conheça nossos especialistas»)

- Pill claro sobre `#1D3825`; texto escuro (leitura do print, `telas/crops/nb-03.jpg`).
- Hover/foco: não medidos.

#### Botões do banner de cookies

- «Definições de cookies»: fantasma (borda + fundo branco).
- «Rejeitar Todos»: preenchido cinza/escuro.
- «Aceitar todos os cookies»: preenchido escuro/verde-escuro.
- Ordem e empilhamento variam entre notebook (coluna à direita) e tablet (fila) — leitura do print.
- Hover/foco/animação de entrada: não medidos.

#### Links de navegação

- Fila horizontal, peso médio/bold, chevron em Especialidades e Serviços (`telas/notebook-dobra.jpg`).
- Hover (underline/cor), abertura de mega-menu/dropdown: **não capturados** (`interacoes: []`).

#### Cards de serviço / especialidade / blog / diferencial

- Serviço: imagem + título + texto em coluna, fundo sage da seção.
- Especialidade: só imagem + rótulo.
- Diferencial: superfície branca + ícone + título + texto.
- Blog: superfície clara + borda + título.
- Hover (elevação, zoom de imagem, troca de borda): **não medidos**.

#### Card de profissional (carrossel)

- Foto + tipografia de identificação; moldura clara em fundo `#1D3825`.
- Setas circulares do carrossel: controle à direita do título (leitura do print).
- Hover do card / da seta: não medidos.

#### Campo de busca

- Só ícone de lupa no header (leitura do print). Painel/campo aberto: não há `formularios` nem `interacoes`.

#### Rodapé — botões e ícones sociais

- Botões claros (telefone, agenda); ícones em tiles claros; seta «voltar ao topo» (leitura do print, `telas/crops/nb-05.jpg`).
- Estados: não medidos.

## Movimento

### Medido (`movimento.*`) — só página 504

**Keyframes / animados / ao carregar / ao rolar / sozinho / sem tocar:** todos `[]` (`movimento.keyframes`, `animadosAgora`, `animacoesVivas`, `aoCarregar`, `aoRolar`, `sozinho`, `semTocar`).

**Transições declaradas** (`movimento.transicoes`):

| # | Valor | Alvo amostra | n |
|---|-------|--------------|---|
| 1 | `all · 0.15s · cubic-bezier(0, 0, 0.2, 1) · atraso 0s` | `a` | 4 |
| 2 | `color · 0.15s · ease · atraso 0s` | `button#cf-footer-ip-reveal...` | 1 |

**Ao passar o mouse** (`movimento.aoPassarMouse`) — eventos observados na 504:

| Alvo | Propriedade | inicioMs | duracaoMs | vezes |
|------|-------------|----------|-----------|-------|
| botão reveal | color | 114 | 150 | 2 |
| `a` | color | 1005 | 150 | 6 |
| `a` | outline-color | 1825 | 49 | 6 |
| `a` | outline-offset | 1826 | 49 | 5 |
| `a` | outline-width | 1826 | 49 | 5 |
| `a#brand_link` | color | 3692 | 150 | 2 |
| `a#brand_link` | outline-* | 4510 | `null` | 1 |

Curva dos links CF: `cubic-bezier(0, 0, 0.2, 1)` · 150 ms · atraso 0 (`movimento.transicoes[0]`).  
Curva do botão reveal: `ease` · 150 ms (`movimento.transicoes[1]`).

### Movimento Vita visível no print — sem medida de tempo

| Gatilho aparente | Alvo | Propriedade | De→Para | Duração | Atraso | Curva | Repete | Fonte |
|------------------|------|-------------|---------|---------|--------|-------|--------|-------|
| clique seta (hero) | slide hero | posição/slide | ? | ? | ? | ? | ? | leitura do print `telas/tablet-dobra.jpg` (setas + trilha) |
| clique seta (corpo clínico) | fila de cards | translate/scroll | ? | ? | ? | ? | ? | leitura do print `telas/crops/nb-02.jpg` |
| carga da página | banner cookies | aparece overlay + painel | ? | ? | ? | ? | 1× | leitura do print; cookies não fechados (`lacunas[2]`) |
| hover genérico | botões/links/cards | ? | ? | ? | ? | ? | — | **lacuna** — não há `aoPassarMouse` do site real |
| ao rolar | header / reveals | ? | ? | ? | ? | ? | — | **lacuna** — `aoRolar: []`; sem `telas/rolagem-NN` |

Não há keyframes Vita para transcrever. Qualquer «animação suave» inventada aqui seria fraude de ofício — vai para Lacunas.


## Interações

`interacoes: []` · `gatilhos: []` · `formularios: []`. Nenhum clique do Escritório abriu menu, modal Vita, busca ou dropdown medido. O que segue é inventário visual + o que a ausência de captura impede.

### Banner de cookies («Sua Privacidade»)

| Campo | Valor | Fonte |
|-------|-------|-------|
| O que abre | Painel de consentimento + escurecimento do site | leitura do print `telas/notebook-dobra.jpg`, `telas/tablet-dobra.jpg` |
| De onde sai | Sobre a dobra, ancorado na parte inferior da viewport (notebook: bloco largo; tablet: modal mais centralizado) | leitura do print |
| Tamanho / posição | Não medidos em px | lacuna |
| Fundo atrás | Overlay escuro semitransparente; **opacidade e blur não medidos** | leitura do print; gutter dimmed `#7A7A7A`/`#7F7F7F` |
| Entrada / saída | Não medidas | lacuna |
| Como fecha | Botões Aceitar / Rejeitar / Definições — comportamento pós-clique **não observado** (cookies não foram fechados, `lacunas[2]`) | `lacunas` + ausência em `interacoes` |
| Foco | Não medido (trap de foco, Tab, Esc) | lacuna |

### Dropdowns da navegação (Especialidades, Serviços)

- Chevron nos rótulos indica submenu (leitura do print).
- Painel: tamanho, animação, clique fora, Esc, foco — **não capturados**.

### Busca (ícone lupa)

- Só o ícone é visível. Campo/overlay de busca: não aberto (`interacoes: []`).

### Carrossel do hero

- Controles: setas circulares + trilha (leitura do print, `telas/tablet-dobra.jpg`).
- Troca de slide por clique/arraste/autoplay: não medida.

### Carrossel do corpo clínico

- Setas à direita do título (leitura do print).
- Quantos cards avançam por clique, loop, drag, foco nos controles: lacuna.

### Links e CTAs

- Navegação interna / páginas internas **fora de escopo** (`lacunas[1]` — só a URL informada).
- Envio de formulário / área logada: não aplicável na home capturada; `formularios: []`.

### Página 504 — única interação instrumentada

- Hover/foco do botão «Click to reveal» e links Cloudflare: ver Componentes / Movimento (`componentes[0..4]`, `estados`).
- Não faz parte da experiência Vita a reproduzir.

## Tempos automáticos

- `movimento.sozinho: []`
- `movimento.semTocar: []`
- `movimento.aoCarregar: []`
- `movimento.animacoesVivas: []`

**Não há evidência medida de carrossel automático, letreiro, contador ou texto que troca sozinho.**

Leitura do print: hero e corpo clínico *podem* ter autoplay — a trilha sob o hero em tablet sugere progresso — mas **intervalo em ms e o que muda a cada ciclo não foram medidos**. Tratar autoplay como lacuna até nova captura; na reprodução, implementar só avanço manual por setas até validação.

## Responsivo

### Quebras no JSON

`quebras: [639, 720, 1023]` e `mediaQueries` listam breakpoints da **folha Cloudflare 504**, não do Vita. **Não usar como grade do site.**

Quebras reais do Vita: **lacuna** (não extraídas do CSS do site).

### Matriz por largura

#### 1440 — `responsivo[0]` vs print

| Item | `responsivo[0]` | Print `telas/desktop-*` |
|------|-----------------|-------------------------|
| Página | alturaPagina 4383, sem scroll horizontal | 1440×900, página 504 |
| Tipo | h1 48/700/57.6 · h2 36/700/43.2 · corpo 18/400/27 | tipografia Cloudflare |
| Nav | 11 links, sem botão menu, altura 148 | header da 504 |
| Seções JSON | 3 blocos (148 / 3842 / 393) | 4 blocos da 504 em `secoes` |

**Conclusão:** números de `responsivo[0]` *parecem* de uma home Vita, mas o print oficial da pasta é 504. Usar tipografia/nav só como hipótese marcada; estrutura visual 1440 = lacuna.

#### 1024 — notebook (`responsivo[1]` + `telas/notebook-*`) — **fonte principal**

| Item | Medida |
|------|--------|
| Página | 1024×4186 (`responsivo[1].alturaPagina`, print inteira) |
| Tipo | h1 48/700/57.6 · h2 36/700/43.2 · corpo 18/400/27 |
| Nav | 11 links, sem hamburger, altura 148; padding seção 1 `0 16 0 16` (`responsivo[1].secoes[0].padding`) |
| Layout | Hero 2 colunas · Serviços 3 col · Especialidades 4 col · Corpo ~3 cards · Diferenciais 2×2 · Blog 2×2 (leitura do print) |

#### 768 — tablet (`responsivo[2]` + `telas/tablet-*`)

| Item | Medida |
|------|--------|
| Página | 768×4885 |
| Tipo | h1 48/700/57.6 · **h2 32**/700/38.4 · corpo 18/400/27 |
| Nav | ainda 11 links visíveis, **sem** botão de menu (`botaoDeMenu: false`), altura 148 |
| Layout | Hero ainda 2 colunas (mais estreito) · Serviços ainda 3 col · **Especialidades 2×2** · Diferenciais 2×2 · Blog 2×2 · página mais alta (leitura do print) |

#### 390 — celular (`responsivo[3]` + `telas/celular-*`)

| Item | Valor | Nota |
|------|-------|------|
| Print | 390×844 dobra / 390×999 inteira | Página **504** |
| `responsivo[3]` | alturaPagina 999 · h1 36/300/45 · h2 30/400/39 · corpo 16/400/26 · 1 link nav · 4 seções | Métricas da Cloudflare |
| Layout Vita mobile | — | **lacuna total** (empilhamento do hero, hamburger, colunas 1, etc.) |

### O que muda (só o comprovado)

| Largura | Nav | Colunas marcantes | Título |
|---------|-----|-------------------|--------|
| 1024 | 11 links | serviços 3 · especialidades 4 | h2 36 |
| 768 | 11 links (ainda sem menu) | serviços 3 · especialidades **2** | h2 **32** |
| 1440 / 390 | não confiável / 504 | lacuna | lacuna |

Sem `telas/rolagem-NN`: não há registro de elementos que entram na viewport ao rolar em nenhuma largura.


## Receita de reprodução

Construa **sem abrir** vita.org.br. Use só este dossiê. Onde a medida falta, implemente o comportamento estrutural e deixe o token/tempo como variável nomeada para o Carlos validar depois.

### 1. Base e tokens

1. Crie `:root` com os papéis da seção Tokens (fundos `#F5F5F5`, `#94A289`, `#728370`, `#1D3825`, superfície `#FFFFFF`, ação `#0F1C13`).
2. Não copie os valores de `cores` / `espacamento` / `raios` do JSON — são da 504.
3. Defina container central com gutter lateral; em 1024 o JSON registra padding horizontal `16` na primeira seção DOM (`responsivo[1].secoes[0].padding: "0 16 0 16"`). Largura máxima exata: lacuna — use container fluido com padding lateral até nova medida.
4. Técnica: CSS variables + layout em sections empilhadas. Sem dependência de biblioteca obrigatória (`bibliotecas` no JSON cita Tailwind da página 504 — ignore).

### 2. Tipografia

1. Escolha uma sans do cliente (licença ok). Não use a família da Vita.
2. Aplique degraus medidos onde existem:
   - Hero h1: **48px / peso 700 / line-height 57.6px** (1024 e 768 — `responsivo[1].h1`, `responsivo[2].h1`).
   - Seção h2: **36px / 700 / 43.2px** em ≥1024; **32px / 700 / 38.4px** em 768 (`responsivo[1].h2`, `responsivo[2].h2`).
   - Corpo: **18px / 400 / 27px** (`responsivo[*].corpo`).
3. Nav, botões, legendas: sem medida — derive por hierarquia (menor que corpo ou igual a 14–16px) e marque para validação.

### 3. Estrutura (ordem de montagem)

1. **Header** altura alvo **148px** em 768–1024 (`responsivo[1..2].navegacao.altura`): logo · utilitários (busca, telefone, Agendar) · fila de ~8–11 links com chevron nos que têm submenu.
2. **Hero** 2 colunas: texto (título, apoio, CTA pill escuro) | foto com canto arredondado; opcional cartão de mensagem sobre a foto; controles de slide se houver mais de um painel.
3. **Serviços** fundo `#94A289`, heading opcional, **3 colunas** de card (imagem + título + texto).
4. **Especialidades** fundo `#F5F5F5`, título, grade de 4 fotos+rótulo (4 col em desktop/notebook; 2 col em tablet).
5. **Corpo clínico** fundo `#1D3825`, título claro, setas de carrossel, trilha horizontal de cards de profissional, CTA pill claro central.
6. **Diferenciais** fundo `#728370`, título claro, **2×2** cards brancos ícone+texto.
7. **Blog** fundo `#F5F5F5`, título, **2×2** cards só com título + borda.
8. **Footer** fundo `#1D3825`, altura da ordem de **~393px** em 1024 (`responsivo[1].secoes[2].altura`): CTAs + sociais · links · legal.

Alturas de faixa intermediárias (serviços ~518, especialidades ~535, corpo ~912, diferenciais ~563, blog ~497 no notebook) são **leitura de banda de cor no print**, não chaves JSON — use como ordem de grandeza, não como spec rígida.

### 4. Componentes

1. Botão primário: fundo `--acao-primaria` `#0F1C13`, texto branco, forma pill/rounded. Hover: defina transição curta local (ex. clarear 5–8%) — **não há duração Vita medida**; não invente como se viesse da captura.
2. Botão telefone: variante outline ou superfície clara.
3. Cards: sem sombra medida — comece flat; acrescente sombra só se o design do cliente pedir.
4. Não implemente os hovers da Cloudflare (azul→laranja, 150ms) como se fossem da clínica.

### 5. Movimento

1. Carrosséis (hero, corpo clínico): **só controle manual por setas** até existir medida de autoplay (`movimento.sozinho` vazio).
2. Técnica sugerida: CSS `scroll-snap` ou transform + botões; alternativa a libs de slider (Swiper etc.) se o projeto já as tiver — a captura não mostrou biblioteca de animação do Vita.
3. Intersection Observer / ao-rolar: **não há receita medida** (`aoRolar: []`, sem `rolagem-NN`). Evite inventar fades de entrada; se o cliente quiser, use padrão do projeto e documente como acréscimo, não como cópia.

### 6. Interações

1. Cookie banner: se o cliente tiver CMP, use o deles. O da Vita não deve ser clonado; estrutura de referência = painel inferior/central + overlay + 3 ações (definições / rejeitar / aceitar). Opacidade do overlay: lacuna.
2. Dropdowns Especialidades/Serviços: prepare slot de submenu; animação e dimensões = lacuna.
3. Busca: ícone que abre painel — comportamento exacto lacuna.

### 7. Responsivo

1. Monte primeiro em **1024** (melhor evidência), depois ajuste **768** (h2 32px; especialidades 2 colunas; nav ainda sem hamburger segundo `responsivo[2]`).
2. **Mobile 390** e **desktop 1440**: sem print Vita confiável — derive empilhamento (hero 1 col, serviços 1 col, etc.) pelas regras do cliente e marque para reabsorção.
3. Ignore `quebras` / `mediaQueries` do JSON (são da 504).

### 8. Checagem mínima antes de entregar ao Yuri/Marina

- [ ] Alternância de fundos claro → sage → claro → escuro → sage → claro → escuro
- [ ] CTA de agenda no header e eco no footer
- [ ] Uma seção = um propósito
- [ ] Nenhum asset, frase longa ou logo da Vita no build
- [ ] Tempos de hover/carrossel listados como «a validar» se não medidos

## Com a marca do cliente

### O que fica (estrutura e comportamento)

- Sequência de seções da landing institucional de saúde.
- Header utilitário (contato + agenda + nav).
- Hero bipartido texto|imagem com CTA único.
- Grades de oferta (3 serviços, especialidades em cards foto, diferenciais 2×2, blog 2×2).
- Faixa escura de profissionais com carrossel e CTA.
- Rodapé com CTAs + mapa de links + legal.
- Tipografia de escala (48 / 36→32 / 18) como ponto de partida.

### O que troca (tokens)

- Todos os hex de fundo/ação pelos da marca do cliente.
- Família tipográfica e pesos de marca.
- Ícones de diferencial (line-art genérico ou do cliente — não os da Vita).
- Conteúdo: nomes de serviços, especialidades, posts, profissionais.

### Ajustes quando a marca muda

| Situação | O que adaptar |
|----------|----------------|
| Paleta **clara** no lugar do bloco escuro `#1D3825` | Inverter texto do corpo clínico/footer para escuro; CTA «especialistas» vira outline escuro ou preenchido na cor de ação; manter contraste ≥ AA. |
| Paleta **só escura** | Serviços/diferenciais sage viram superfícies elevadas (`--superficie`) com borda; hero precisa de contraste forte no título. |
| Fonte **mais larga** | Reduzir tracking negativo; pode precisar baixar h1 de 48px ou estreitar a coluna de texto do hero para não quebrar em 2 linhas a mais. |
| Fonte **mais estreita** | Aumentar um pouco o max-width da coluna de texto; nav com 11 links cabe melhor. |
| Cliente **sem foto** de campanha | Hero vira ilustração/gradiente de marca ou vídeo curto do cliente; manter proporção vertical do slot direito e cantos arredondados. |
| Cliente **sem vídeo** | Irrelevante aqui — a home capturada não mostrou vídeo de fundo (`midia.videos: []` na 504; prints Vita = foto estática). |
| Texto **mais longo em PT** | Cards de serviço e diferenciais: limitar a 3–4 linhas ou subir min-height do card; hero: subtítulo com `clamp` / max-width. |
| Cliente **sem corpo clínico para carrossel** | Trocar a faixa escura por depoimentos ou números (mesma moldura: título + trilha + CTA). |

## Não copiar

| Ativo da Vita / dono | O que usar no lugar |
|----------------------|---------------------|
| Logo VITA e selo Grupo Fleury / anos | Logo e selos do cliente |
| Fotos de pacientes, profissionais, cirurgia, pilates | Banco próprio ou stock licenciado do cliente |
| Retratos e nomes/CRM dos médicos | Profissionais do cliente (com autorização) |
| Textos de campanha, descrições de serviço, posts do blog, diferenciais | Copy nova (Marina / redator) — no dossiê só rótulos curtos |
| Ícones proprietários dos diferenciais | Set de ícones do design system do cliente |
| Tipografia proprietária (se houver) | Fonte licenciada do cliente — conferir; captura não trouxe arquivos |
| Número de telefone, endereço, Ray/IDs, URLs internas | Dados do cliente |
| Código, classes e CMP da Vita | Implementação própria |
| Qualquer frame da pasta `telas/` ou `video/` no produto final | Apenas referência interna do Escritório |

## Lacunas

### Da chave `lacunas` do absorcao.json

1. Site respondeu **504** — leitura automática barrada; prints precisam validar medidas (`lacunas[0]`, `resposta: 504`, `titulo`).
2. Só a URL informada foi lida — internas, login, pós-formulario fora (`lacunas[1]`).
3. Aviso de cookies **não fechado** — aparece nos prints e dimming contamina cores do topo (`lacunas[2]`).

### Da pasta / da leitura Kakashi

| Lacuna | O que impede |
|--------|--------------|
| `telas/desktop-*` e `telas/celular-*` = 504 | Reproduzir 1440 e 390 com fidelidade |
| Sem `telas/rolagem-NN` | Receita de reveals ao scroll, parallax, sticky header |
| Sem `telas/interacao-NN` | Menus, busca, dropdowns, estados abertos |
| `video/sessao.webm` (~46s): ~28s brancos + resto 504 (frames extraídos) | Conferir movimento real da sessão |
| `cores` / `fontes` / `escalaTipografica` / `secoes` / `componentes` / `movimento` / `mediaQueries` / `quebras` / `bibliotecas` medem a Cloudflare | Qualquer cópia cega do JSON gera a página de erro, não a clínica |
| `responsivo[0]` (1440) conflita com print 504 | Tipografia/nav desktop só hipotéticas |
| `responsivo[3]` (390) = tipografia 504 | Mobile Vita desconhecido |
| Família tipográfica Vita | Troca de fonte sem saber métricas reais do face |
| Hex de texto, raios px, sombras, z-index, gaps, paddings de seção | Spec visual completa de componentes |
| Durações/curvas de hover, carrossel, cookie, dropdown | Movimento atômico da marca |
| Autoplay sim/não e intervalo | Tempos automáticos |
| Header fixed/sticky e `cabecalhoAoRolar` | Comportamento ao rolar |
| Opacidade/blur do overlay de cookies | Camada de modal |
| Breakpoints CSS reais do Vita | Grade responsiva além de 1024/768 observados |

### Reabsorção sugerida (para o Escritório, não para o agente de build)

1. Recapturar quando o origin responder 200.
2. Fechar cookies e repetir desktop-dobra/inteira, rolagem-NN, interacao (dropdowns, busca, setas dos carrosséis).
3. Medir mobile real (hamburger? 1 coluna?).
4. Só então promover o card de rascunho para `validado`.

---

*Fim do dossiê · Kakashi · pasta `vita` · 2026-11-22 · rascunho*

