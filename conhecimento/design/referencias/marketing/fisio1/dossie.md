# Dossiê — fisio1.com.br

Fonte: `absorcao.json` (capturadoEm 2026-11-22T11:35:35.189Z) · prints em `telas/` · vídeo `video/sessao.webm` (37,88 s, VP9 1280×800; conteúdo visual da sessão cruzado com prints e `movimento` / `interacoes`).

## Resumo

Landing page de clínica de fisioterapia e pilates (WordPress 7.1.5 + Elementor + jQuery; `bibliotecas`). Ideia que organiza a página: hero de impacto (atleta + hotspots de articulação) → faixa de promessa em ciano → três blocos serviço foto/texto alternados → formulário de contato em bloco cheio → rodapé denso com unidades e newsletter. Funciona porque a hierarquia é óbvia (uma promessa, CTAs de telefone/WhatsApp repetidos, prova visual clínica) e o contraste branco / `#00afec` / `#002431` marca cada etapa sem depender de animação de rolagem (`movimento.aoRolar` vazio).

Serve sobretudo ao modo **Padrão**: estrutura de oferta local previsível (hero, serviços, contato, footer), tipografia sans-serif em caixa alta nos títulos, botões sólidos, formulário underline. Há um toque de conceito no hero (silhueta + círculos magenta `#e1146b @70%`, `cores.fundo`), mas o restante é template de clínica — não justifica modo Conceito sozinho.

Modo sugerido: padrao

## Estrutura

Janela de medição: 1440×900; altura da página 6025 px; sem rolagem horizontal (`janela`).

Ordem canônica das seções medidas (`secoes[0]`–`secoes[3]`). Dentro de `div.home` os blocos internos foram lidos nos prints de rolagem (não vieram como seções separadas no JSON).

### 1. Cabeçalho — `secoes[0]` / `navegacao`

| Campo | Valor | Fonte |
|---|---|---|
| alvo | `header` | `secoes[0].alvo` |
| y / altura | 0 / 99 px | `secoes[0]` |
| fundo | vazio (transparente sobre o hero branco) | `secoes[0].fundo`; leitura do print `telas/desktop-dobra.jpg` |
| padding | `0 0 0 0` | `secoes[0].padding` |
| largura conteúdo | 1440 px | `secoes[0].larguraConteudo` |
| layout | block · 0 filhos em 0 colunas · gap 0/0 | `secoes[0].layout` |
| posição | `absolute` | `navegacao.posicao` |
| dentro | logo (2 imagens), link «IR PARA PROFISSIONAL», botão hambúrguer ciano, menu com 7 rótulos | `secoes[0].conteudo`; `navegacao.links` |
| papel | identidade + acesso a área profissional + abertura do menu overlay | — |

Links do menu (`navegacao.links`): IR PARA PROFISSIONAL · TRATAMENTOS · LESÕES · CURSOS · SOBRE NÓS · NOTÍCIAS · CONTATO.

`cabecalhoAoRolar`: `{}` — sem mudança medida ao rolar. `fixos`: `[]`. O botão hambúrguer aparece em todos os prints de rolagem no canto superior direito (leitura do print `telas/rolagem-01.jpg` … `rolagem-10.jpg`); se está fixed ou só overlaid pelo absolute do header não foi confirmado em chave própria — ver Lacunas.

### 2. Corpo home — `secoes[1]` (`div.home`)

| Campo | Valor | Fonte |
|---|---|---|
| y / altura | 0 / 4996 px | `secoes[1]` |
| fundo | vazio (blocos internos definem) | `secoes[1].fundo` |
| padding | `0 0 0 0` | `secoes[1].padding` |
| largura conteúdo | 1440 px | `secoes[1].larguraConteudo` |
| layout | block · 3 filhos · 1 coluna · gap 0/0 | `secoes[1].layout` |
| conteúdo agregado | 3 h2, 21 p, 5 botões-CTA, 15 links, 4 imagens | `secoes[1].conteudo` |
| papel | narrativa principal da landing | — |

#### 2a. Hero (dobra) — leitura dos prints

Fonte visual: `telas/desktop-dobra.jpg`, `telas/rolagem-01.jpg`.

- Fundo branco; faixa ciano na base da dobra (leitura do print).
- Esquerda/centro: título em caixa alta «reabilite-se…» (`escalaTipografica` Open Sans 56px/800 linha 45px, sample do parágrafo do hero).
- Centro: foto cutout da atleta com círculos `div.tl2.circle` — fundo `#e1146b @70%`, raio `50%` (`cores.fundo`, `raios`).
- Direita inferior: parágrafo de apoio + dois botões empilhados `a.btn-gray` / `a.btn-grayBlack` (223×47, raio 3px; `componentes[id=5,6]`).
- Topo: logo + «IR PARA PROFISSIONAL» + hambúrguer ciano (`cores.fundo` `#00afec` no sample `div.collapsed.btn-burguer`).

#### 2b. Faixa promessa ciano — leitura dos prints

Fonte: `telas/rolagem-01.jpg`, `telas/rolagem-02.jpg`.

- Fundo `#00afec` (mesma família do contato; leitura do print + `cores.fundo`).
- Centro: linha fina «TRATAMENTO EXCLUSIVO…» (Open Sans 40px/300 linha 46px) + título grosso «ALTAMENTE EFICAZ» (Open Sans 80px/800 linha 114px) — `escalaTipografica`.
- Corpo branco (Open Sans 18px/400 linha 35px).
- Cartão branco de telefones `a.agenda.anchorBtn` 470×79, fundo `#ffffff`, raio 5px, texto `#3e4e58` (`componentes[id=7]`).
- Botão ghost `a.estrutura` 470×79, borda `1px solid #ffffff`, raio 5px (`componentes[id=8]`, `cores.borda`).

#### 2c. Técnicas e tratamentos — leitura dos prints

Fonte: `telas/rolagem-03.jpg`, `telas/rolagem-04.jpg`. Título medido: h2 «técnicas e tratamentos» (Open Sans 54px/800 linha 54px uppercase).

- Grade 2 colunas ~50/50 (leitura do print): foto vertical à esquerda; texto à direita em fundo branco.
- Subtítulo «Como funciona?» — GothamLight 28px/300 linha 40px, cor `#39464e` (`escalaTipografica`, `cores.texto`).
- Corpo Calibri 17px/400 linha 32px, cor `#4c5f6a` (`escalaTipografica`, `cores.texto`).
- CTA `a.btn-trat.bg_blue` «CONHEÇA TODOS OS TRATAMENTOS» 342×66, fundo `#00afec`, raio 5px (`componentes[id=9]`).

#### 2d. Avaliação baropodométrica — leitura dos prints

Fonte: `telas/rolagem-05.jpg`, `telas/rolagem-06.jpg`. Título h2 medido no JSON.

- Grade invertida: texto à esquerda, foto (pés na plataforma) à direita.
- CTA azul maior «MARQUE SUA AVALIAÇÃO…» 342×92 (`componentes[id=10]`).

#### 2e. Método Pilates — leitura dos prints

Fonte: `telas/rolagem-07.jpg`, `telas/rolagem-08.jpg`. Título h2 medido.

- Foto estúdio à esquerda; texto + CTA «MARQUE SUA 1º AULA…» (mesmo padrão `a.btn-trat.bg_blue` 342×92) à direita.

### 3. Contato — `secoes[2]` (`div#contato.faleConosco.bg_blue`)

| Campo | Valor | Fonte |
|---|---|---|
| y / altura | 4995 / 616 px | `secoes[2]` |
| fundo | `#00afec` | `secoes[2].fundo` |
| padding | `30 0 30 0` | `secoes[2].padding` |
| largura conteúdo | 992 px | `secoes[2].larguraConteudo` |
| layout | table · 2 filhos · 2 colunas · gap 0/0 | `secoes[2].layout` |
| dentro | h3 «FALE COM A GENTE», ícone/logo, formulário CF7 (14 campos contados), 2 imagens | `secoes[2].conteudo`; `formularios[0]` |
| papel | captura de lead | — |

Formulário (`formularios[0]`): nome, e-mail, telefone, select assunto, mensagem, submit «Enviar»; placeholders medidos. Campos underline brancos sobre ciano (leitura do print `telas/rolagem-09.jpg`).

### 4. Rodapé — `secoes[3]` (`footer`)

| Campo | Valor | Fonte |
|---|---|---|
| y / altura | 5611 / 414 px | `secoes[3]` |
| fundo | `#002431` | `secoes[3].fundo` |
| padding | `0 0 0 0` | `secoes[3].padding` |
| largura conteúdo | 1296 px | `secoes[3].larguraConteudo` |
| layout | block · 2 filhos · 2 colunas · gap 0/0 | `secoes[3].layout` |
| dentro | logo, links, horários, 3 endereços, newsletter (`formularios[1]`), redes, iframe mapa Google | `secoes[3].conteudo`; `midia.iframes`; `telas/rolagem-10.jpg` |
| papel | navegação secundária, unidades, prova de presença | — |

Barra de copyright abaixo: fundo `#001922` (`cores.fundo` sample `div.cop`). Tipografia legal Open Sans 10px/400 linha 14px (`escalaTipografica`).

## Tokens

### Cores por papel

| Papel | Valor | Onde | Fonte |
|---|---|---|---|
| fundo página / hero | `#ffffff` (leitura do print; não aparece como amostra dominante em `cores.fundo` porque o hero é imagem/branco implícito) | hero, colunas texto | `telas/desktop-dobra.jpg` |
| fundo acento / CTA bloco | `#00afec` | hambúrguer, faixa promessa, contato, botões `bg_blue` | `cores.fundo` |
| fundo rodapé | `#002431` | `footer` | `cores.fundo`; `secoes[3].fundo` |
| fundo barra copyright | `#001922` | `div.cop` | `cores.fundo` |
| superfície cartão / botão claro | `#ffffff` | `a.agenda.anchorBtn`, submit contato | `cores.fundo` |
| superfície botão secundário | `#3d4e59` | `a.btn-gray` | `cores.fundo` |
| superfície botão terciário | `#263036` | `a.btn-grayBlack` | `cores.fundo` |
| hotspot hero | `#e1146b @70%` | `div.tl2.circle` | `cores.fundo` |
| texto corpo | `#4c5f6a` | parágrafos (n=1230) | `cores.texto` |
| texto sobre fundo escuro/ciano | `#ffffff` | nav, títulos sobre ciano, links footer | `cores.texto` |
| texto secundário / botão claro | `#3e4e58` | parágrafo apoio, texto agenda | `cores.texto` |
| texto hero título | `#333333` | «reabilite-se…» | `cores.texto` |
| texto link profissional | `#263036` | `a.ch_site` | `cores.texto` |
| texto subtítulo seção | `#39464e` | «Como funciona?» | `cores.texto` |
| borda botão ghost | `1px solid #ffffff` | `a.estrutura` | `cores.borda` |
| borda campo newsletter | `1px solid #335059` | `input#field_v37rv` | `cores.borda` |
| degradê subtítulo | `linear-gradient(to right, rgb(102,105,107) 0%, rgb(156,164,169) 39%, rgb(136,141,145) 70%, rgb(172,176,179) 100%)` | `h2.tx-gradientSubtitle` | `cores.degrades` |

Variáveis WordPress em `variaveisCss` (presets de editor: `--wp--preset--color--*`, espaçamentos `--wp--preset--spacing--20`…`80`, sombras preset) existem no documento, mas as cores de marca usadas na UI pública são as de `cores.*` acima, não o roxo `--wp-block-synced-color: #7a00df`.

### Raios (`raios`)

| Valor | Uso |
|---|---|
| `50%` | círculos hotspot (`div.tl2.circle`) |
| `5px` | botões agenda, ghost, CTA tratamento, campo newsletter |
| `3px` | `a.btn-gray`, `a.btn-grayBlack` |
| `4px` | submit CF7 |

### Sombras (`sombras`)

Lista vazia — nenhuma sombra CSS medida. Qualquer elevação no cartão de telefones ou botões é lacuna / leitura do print sem valor.

### Espaçamento (`espacamento.valores`)

Escala observada (valor · ocorrências): 10px (25) · 20px (13) · 1px (10) · 15px (8) · 2px (8) · 30px (7) · 45px (6) · 13px (5) · 40px (5) · 22px (4) · 6px (4) · 25px (4) · 100px (3) · 60px (3) · 28px (3) · 130px (2) · 8px (2) · 42px (1).

`espacamento.gaps`: `[]` — gaps de flex/grid não medidos; colunas usam table/block.

Presets WP (`variaveisCss`): spacing 20=0.44rem … 80=5.06rem — não amarrados aos paddings das seções medidas (que usam px).

### Camadas (`camadas`)

z-index medidos: `999` · `9999` · `99999` · `999999`. Atribuição por elemento não veio no JSON — ver Lacunas. Em `interacoes[0].abriu[0].z` o `nav.active` aparece como `"auto"`.

### Bloco de variáveis por papel (pronto para outra marca)

```css
:root {
  /* fundos */
  --fundo-pagina: #ffffff;
  --fundo-acento: #00afec;
  --fundo-rodape: #002431;
  --fundo-copyright: #001922;
  --superficie-clara: #ffffff;
  --superficie-botao-secundario: #3d4e59;
  --superficie-botao-terciario: #263036;
  --superficie-hotspot: rgba(225, 20, 107, 0.7); /* #e1146b @70% */

  /* texto */
  --texto: #4c5f6a;
  --texto-sobre-acento: #ffffff;
  --texto-secundario: #3e4e58;
  --texto-titulo: #333333;
  --texto-link-escuro: #263036;
  --texto-subtitulo: #39464e;

  /* borda */
  --borda-ghost: #ffffff;
  --borda-campo-escuro: #335059;

  /* raio */
  --raio-circulo: 50%;
  --raio-botao: 5px;
  --raio-botao-compacto: 3px;
  --raio-submit: 4px;

  /* espaço (escala observada) */
  --espaco-1: 10px;
  --espaco-2: 15px;
  --espaco-3: 20px;
  --espaco-4: 30px;
  --espaco-5: 40px;
  --espaco-6: 45px;
  --espaco-7: 60px;
  --espaco-8: 100px;

  /* camadas (valores presentes; papéis a mapear) */
  --z-1: 999;
  --z-2: 9999;
  --z-3: 99999;
  --z-4: 999999;
}
```


## Tipografia

### Famílias (`fontes.uso` · `fontes.arquivos`)

| Família | Pesos medidos | Parte do uso | Arquivo | Licença |
|---|---|---|---|---|
| Calibri | 400 | 48% | `Calibri.woff` | Conferir — fonte Microsoft; uso web via WOFF próprio exige licença |
| Open Sans | 300, 400, 600, 700, 800 | 28%+12%+5%+1%+1% | (não listado em `fontes.arquivos`; provavelmente Google Fonts) | SIL OFL — conferir origem no projeto |
| GothamMedium | 300, 400 (arquivo weight 500) | 2%+2% | `GothamMedium.woff` | Paga (Hoefler/comercial) — **não copiar**; substituir |
| GothamLight | 300 | 1% | `GothamLight.woff` | Paga — **não copiar**; substituir |
| Glyphicons Halflings / Genericons | — | ícones | woff2/eot | Bootstrap/WordPress — conferir |
| Helvetica Neue | 14px/400, 36px/500 | só em 2 componentes residual | — | Sistema; fallback |

Folha Google Merriweather/Montserrat/Inconsolata está em `naoLidos.folhasBloqueadas` — não entrou na medição de uso.

### Escala (`escalaTipografica`)

| Uso | Família · tamanho · peso · linha · tracking · caixa | Sample / onde | Fonte |
|---|---|---|---|
| Link rodapé / miúdo | Open Sans 14px/400 · 21px · 0 | «Fisio1» | escala |
| CTA link uppercase | Open Sans 15px/600 · 24px · 0 · uppercase | «conheça todos os tratamentos» | escala |
| Nav menu | GothamMedium 15px/400 · 21px · 0 · uppercase | «Tratamentos» | escala |
| Link profissional / botões cinza | Open Sans 14px/400 · 20px · 0 | «IR PARA PROFISSIONAL» | escala |
| H2 seção serviço | Open Sans 54px/800 · 54px · 0 · uppercase | «técnicas e tratamentos» | escala |
| Corpo serviço | Calibri 17px/400 · 32px · 0 | parágrafo avaliação | escala |
| Botão cinza texto | GothamMedium 12px/300 · 17px · 0 · uppercase | «Saiba Mais Sobre a FISIO1» | escala |
| Telefones no cartão | Open Sans 16px/600 · 24px · 0 · uppercase | números Barra Square | escala |
| Título hero | Open Sans 56px/800 · 45px · 0 · uppercase | «reabilite-se…» | escala |
| Apoio hero | Open Sans 16px/400 · 27px · 0 | parágrafo sob CTAs | escala |
| Marca no texto | Open Sans 16px/700 · 27px · 0 | strong FISIO1 | escala |
| Linha fina faixa ciano | Open Sans 40px/300 · 46px · 0 | «TRATAMENTO EXCLUSIVO…» | escala |
| Título faixa ciano | Open Sans 80px/800 · 114px · 0 | «ALTAMENTE EFICAZ» | escala |
| Corpo faixa ciano | Open Sans 18px/400 · 35px · 0 | «Conheça nossas técnicas…» | escala |
| CTA ghost texto | Open Sans 16px/600 · 57px · 0 · uppercase | «Saiba Mais…» (altura de linha larga) | escala |
| Subtítulo «Como funciona?» | GothamLight 28px/300 · 40px · 0 | span | escala |
| Título contato | Open Sans 83px/800 · 66px · 0 · uppercase | h3 «Fale com a gente» | escala |
| Redes | Open Sans 14px/400 · 20px · 0 · uppercase | «NAS REDES SOCIAIS» | escala |
| Legal | Open Sans 10px/400 · 14px · 0 | CREFITO / copyright | escala |

Campos de formulário: Open Sans 18px/400 (contato) e 13px/400 (newsletter) — `componentes[id=13,14,15]`.

## Componentes e estados

Transições CSS genéricas medidas: `all · 0.3s · ease · atraso 0s` em 3 alvos, sample `span.icon-bar.top-bar` (`movimento.transicoes`). A maior parte dos hovers de link **não tem duração citada no componente** — só a mudança de propriedade. Onde a duração não foi medida, está marcado abaixo e entra em Lacunas para hover de conteúdo.

### Link de navegação menu — `componentes[id=4]`

- Alvo: `a` · texto «TRATAMENTOS» · 121×16 · qtd 6
- Normal: GothamMedium 15px/400 · cor `#ffffff` · uppercase · padding 0 · cursor pointer · transição vazia
- Hover (`componentes[id=4].hover` / `estados`):
  - `color`: `rgb(255,255,255)` → `rgb(35,82,124)`
  - `borderColor`: branco → `rgb(35,82,124)`
  - `textDecorationLine`: none → underline
  - `outlineColor`: branco → `rgb(35,82,124)`
  - duração/curva do hover: **não medidas** no componente
- Foco: mesmas cores do hover + `outlineStyle` none → auto · `outlineColor` → `rgb(16,16,16)` · `outlineWidth` 0 → 5px · `outlineOffset` 0 → −2px

### Link «IR PARA PROFISSIONAL» — `componentes[id=3]`

- `a.ch_site` · 151×20 · Open Sans 14px/400 · `#263036`
- Hover: underline only (`textDecorationLine` none → underline)
- Foco: underline + outline auto 5px offset −2px (`outlineColor` de `rgb(38,48,54)` → `rgb(16,16,16)`)

### Logo / link nav residual — `componentes[id=2]`

- 151×41 · Helvetica Neue 36px/500 · `#337ab7`
- Hover: color/border/outline `rgb(51,122,183)` → `rgb(35,82,124)` + underline
- Foco: idem + outline 5px

### Botão cinza «SAIBA MAIS» — `componentes[id=5]`

- `a.btn-gray` · 223×47 · GothamMedium 12px/300 · `#ffffff` em `#3d4e59` · raio 3px · uppercase
- Hover: **sem mudança medida**
- Foco: color/border → `rgb(35,82,124)` + underline + outline 5px

### Botão cinza-preto «VER LESÕES» — `componentes[id=6]`

- `a.btn-grayBlack` · 223×47 · mesmo tipo · fundo `#263036` · raio 3px
- Hover: sem mudança medida
- Foco: igual ao btn-gray

### Botão agenda branco — `componentes[id=7]`

- `a.agenda.anchorBtn` · 470×79 · Open Sans 16px/600 · `#3e4e58` em `#ffffff` · raio 5px · uppercase
- Hover: underline
- Foco: underline + outline 5px (`outlineColor` de `rgb(62,78,88)` → `rgb(16,16,16)`)

### Botão ghost — `componentes[id=8]`

- `a.estrutura` · 470×79 · Open Sans 16px/600 · `#ffffff` · borda `1px solid #ffffff` · raio 5px
- Hover: underline
- Foco: underline + outline 5px

### Botão CTA tratamento — `componentes[id=9]` e `[id=10]`

- `a.btn-trat.bg_blue` · 342×66 (lista) ou 342×92 (avaliação/aula) · Open Sans 15px/600 · `#ffffff` em `#00afec` · raio 5px · padding `10 0 10 0` no maior
- Hover: underline
- Foco: underline + outline 5px

### Link de rodapé — `componentes[id=11]`

- `a` · 37×19 · Open Sans 14px/400 · `#ffffff` · qtd 8
- Hover: underline
- Foco: underline + outline 5px (`outlineColor` → `rgb(16,16,16)`)

### Ícone social / link estreito — `componentes[id=12]`

- 9×22 · Open Sans 16px/400 · `#ffffff`
- Hover/foco: underline + outline no foco

### Campo texto contato — `componentes[id=13]`

- `input.wpcf7-form-control.wpcf7-text` · 452×41 · Open Sans 18px/400 · cor `#ffffff` · padding `1 2 13 2` · cursor text
- Foco: `outlineWidth` 3px → 0px (outline removido)
- Hover: não medido

### Select assunto — `componentes[id=14]`

- 452×40 · Open Sans 18px/400 · `#ffffff` · padding `0 0 13 0` · cursor default
- Foco: outlineWidth 3px → 0px

### Submit «Enviar» — `componentes[id=0]`

- `input.wpcf7-form-control.wpcf7-submit` · 212×65 · Open Sans 15px/600 · `#3e4e58` em `#ffffff` · raio 4px · uppercase · padding `1 6 1 6`
- Hover: sem mudança medida
- Foco: outlineWidth 3px → 0px

### Campo newsletter — `componentes[id=15]`

- `input#field_v37rv` · 200×43 · Open Sans 13px/400 · `#ffffff` · borda `1px solid #335059` · raio 5px · padding `1 40 1 16`
- Foco: outlineWidth 3px → 0px

### Submit residual / botão 52×46 — `componentes[id=1]`

- `input` · 52×46 · Helvetica Neue 14px/400 · `#333333`
- Hover: sem mudança medida · Foco: outline 3px → 0

### Hambúrguer — `gatilhos[t0]` + `movimento.transicoes`

- Alvo: `div.collapsed.btn-burguer` · controla `navbar` · fundo `#00afec` (`cores.fundo`)
- Barras: transição `all · 0.3s · ease` (`movimento.transicoes`)
- Estados abertos detalhados em Interações

### Hotspot círculo — `raios` / `cores.fundo`

- `div.tl2.circle` · raio 50% · `#e1146b @70%`
- Hover/clique: **não medidos** (ver Lacunas)

## Movimento

### Keyframes registrados (`movimento.keyframes`)

| Nome | Quadros |
|---|---|
| `progress-bar-stripes` | 0% `background-position: 40px 0` → 100% `0 0` |
| `fadeOut` | 0% opacity 1 → 100% opacity 0 |
| `spin` | 0% rotate(0) → 100% rotate(360deg) |
| `fadeIn` | 0% opacity 0 → 100% opacity 1 |
| `show-content-image` | 0–99% visibility hidden → 100% visible |
| `turn-on-visibility` | 0% opacity 0 → 100% opacity 1 |
| `turn-off-visibility` | 0% opacity 1 visible → 99% opacity 0 visible → 100% opacity 0 hidden |
| `lightbox-zoom-in` / `out` | translate+scale WP lightbox (presets editor) |
| `overlay-menu__fade-in-animation` | 0% opacity 0 + translateY(0.5em) → 100% opacity 1 + translateY(0) |
| `blink` | 0% opacity 0 → 50% 1 → 100% 0 |

### Linhas atômicas observadas

| Gatilho | Alvo | Propriedade | De → para | Duração | Atraso | Curva | Repetições | Ordem | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| ao carregar / sozinho | `span.wpcf7-spinner` | transform (spin) | rotate(0) → rotate(360deg) | 1000 ms | 0 | linear | infinito | início ~1072 ms | `movimento.animacoesVivas[0]`, `aoCarregar`, `sozinho` |
| transição idle | `span.icon-bar.*` | all | — | 300 ms | 0 | ease | — | prepara ícone menu | `movimento.transicoes` |
| clique menu | `nav.active` | left | (valores de/para não capturados) | 600 ms | início 96 ms | ease (da transição `all · 0.6s · ease` em `abriu`) | 1 | com bg/opacity | `interacoes[0].movimento` |
| clique menu | `nav.active` | background-color | → `rgb(0,175,236)` (estado aberto) | 600 ms | 96 ms | ease | 1 | paralelo | idem |
| clique menu | `nav.active` | opacity | (de/para não capturados) | 600 ms | 96 ms | ease | 1 | paralelo | idem |
| clique menu | `ul#menu-menu-paciente.tlm` | margin-right, margin-bottom, opacity | (de/para não capturados) | 800 ms | 96 ms | **curva não citada** | 1 | após/com nav | idem |
| clique menu | `span.icon-bar.bottom-bar` | top, transform | (de/para não capturados) | 300 ms | 96 ms | ease (transições 0.3s) | 1 | ícone → X | idem |
| clique menu | `span.icon-bar.middle-bar` | background-color | (de/para não capturados) | 300 ms | 96 ms | ease | 1 | paralelo | idem |
| clique menu | `span.icon-bar.top-bar` | transform | (de/para não capturados) | 300 ms | 96 ms | ease | 1 | paralelo | idem |

`movimento.aoRolar`: `[]` — sem reveal ao entrar na tela.

`movimento.aoPassarMouse`: `[]` — nenhum hover com animação timed além das mudanças de estilo em Componentes.

`movimento.animadosAgora`: `[]` no instante da captura (só o spinner aparece em `animacoesVivas`).

Keyframes `fadeIn`/`fadeOut`/`blink`/`overlay-menu__fade-in-animation`/`lightbox-*` estão no CSS mas **não foram vistos aplicados** em `animacoesVivas`, `aoCarregar`, `aoRolar` ou `interacoes` — tratamento: disponíveis na folha; uso na home não comprovado (Lacunas).


## Interações

Única interação capturada: clique no hambúrguer (`interacoes[0]`, print `telas/interacao-01.jpg`).

### Menu overlay / nav ativa

| Item | Valor | Fonte |
|---|---|---|
| Gatilho | `div.collapsed.btn-burguer` (`gatilhos[t0]`, controla `navbar`, `expandido: false` no HTML) | `gatilhos`, `interacoes[0]` |
| O que abre | `nav.active` | `interacoes[0].abriu[0]` |
| De onde / posição | `absolute` · caixa reportada `0,0 1440×99` · `cobreTela: false` | `abriu[0]` |
| Observação de caixa | A caixa 1440×99 é a altura do header; no print `telas/interacao-01.jpg` o menu aparece como faixa ciano no topo com links em linha e X à direita (leitura do print). Altura visual do overlay expandido **não bate** com 99 px só — ver Lacunas |
| Fundo | `rgb(0, 175, 236)` (`#00afec`) | `abriu[0].fundo` |
| Raio / sombra / desfoque | `0px` / vazio / vazio | `abriu[0]` |
| z-index | `auto` | `abriu[0].z` |
| Itens | 7: TRATAMENTOS · LESÕES · CURSOS · SOBRE NÓS · NOTÍCIAS · CONTATO (+ X fechar, leitura do print) | `abriu[0].itens` / `.texto`; print |
| Animação de entrada | `transicao: all · 0.6s · ease` no nav; propriedades animadas: left, background-color, opacity (600 ms); lista do menu: margin-right/bottom/opacity (800 ms); barras do ícone (300 ms) — ver Movimento | `interacoes[0].movimento` |
| Animação de saída | **não medida** (só abertura capturada) | Lacunas |
| Fecha com Esc | `false` | `interacoes[0].fechaComEsc` |
| Fecha com clique fora | **não medido** | Lacunas |
| Fecha com botão | X no canto (leitura do print `telas/interacao-01.jpg`); retorno ao hambúrguer esperado mas não cronometrado | leitura do print |
| Foco | trap/retorno de foco **não medidos** | Lacunas |

Não há modal, sanfona, aba ou gaveta lateral medida além deste menu. Formulários não foram enviados (fronteira da absorção).

Hotspots magenta do hero: presentes visualmente; clique/hover **não capturados** em `interacoes` nem `aoPassarMouse`.

## Tempos automáticos

| Item | Intervalo | O que muda | Fonte |
|---|---|---|---|
| Spinner CF7 `span.wpcf7-spinner` | 1000 ms por volta (`sozinho.intervaloMs`); 8 voltas contadas na sessão | `transform` rotate 0→360°, curva linear, infinito | `movimento.sozinho`, `animacoesVivas[0]` |

`movimento.semTocar`: `[]`.

Não há carrossel, letreiro, texto rotativo, contador ou cursor piscante medido. Keyframe `blink` existe no CSS mas não aparece em `sozinho` / `animacoesVivas`.

Conclusão: **só o spinner de formulário** roda sozinho; a landing em si é estática no tempo.

## Responsivo

### Quebras (`quebras` / `mediaQueries`)

Pontos listados: 480, 500, 559, 590, 600, 667, 750, 767, 768, 781, 782, 800, 850, 950, 960, 991, 992, 1024, 1199, 1200, 1440, 1441, 1600.

Queries relevantes de layout (amostra): `(max-width: 767px)`, `(min-width: 768px)`, `(min-width: 992px)`, `(min-width: 1200px)`, `(max-width: 1024px)`, `(max-width: 1440px) and (min-width: 992px)`, `(min-width: 1441px)`, `(min-width: 1600px)`, além de Bootstrap-like 768/992/1200.

### Por largura (`responsivo`)

#### 1440 — desktop (`responsivo[0]` · `telas/desktop-dobra.jpg` · `desktop-inteira.jpg`)

| Item | Valor |
|---|---|
| altura página | 6025 px |
| h1 / h2 / «corpo» medido | 36px/500 linha 39.6 · 54px/800 linha 54 · 56px/800 linha 45 |
| nav | 8 links visíveis · sem botãoDeMenu flag · altura 99 (hambúrguer existe visualmente; flag `botaoDeMenu: false`) |
| seções | header 99 · home 4996 (1 col wrapper) · contato 616 (2 col, pad 30 0) · footer 414 (2 col) |
| layout visual | hero com título à esquerda e CTAs à direita da atleta; serviços em 50/50; contato 2 col | 

#### 1024 — notebook (`responsivo[1]` · `telas/notebook-*.jpg`)

| Item | Valor |
|---|---|
| altura página | 6240 px |
| h2 | **44px**/800 linha 54 (cai de 54) |
| corpo medido | 56px/800 linha 45 (igual) |
| nav | 9 links · botaoDeMenu false · altura 99 |
| home | 4864 px |
| contato | 616 · ainda 2 colunas |
| footer | **761** px (cresce) · ainda 2 colunas |
| visual | dobra ainda com atleta + título + CTAs lado a lado (leitura do print notebook-dobra) |

#### 768 — tablet (`responsivo[2]` · `telas/tablet-*.jpg`)

| Item | Valor |
|---|---|
| altura página | 4924 px |
| h2 | **32px**/800 linha 36 |
| corpo | **32px**/800 linha 38 |
| nav | 9 links · altura 99 |
| home | 3054 (encurta — tipografia menor / imagens) |
| contato | 616 · JSON ainda marca 2 colunas |
| footer | **1106** · **1 coluna** |
| visual dobra | empilha: título → imagem atleta → texto → botões centrados (leitura do print `tablet-dobra.jpg`) |

#### 390 — celular (`responsivo[3]` · `telas/celular-*.jpg`)

| Item | Valor |
|---|---|
| altura página | 6574 px |
| h2 / corpo | 32px/800 linha 36 / 32px/800 linha 38 |
| nav | 8 links · altura 99 · hambúrguer dominante; «IR PARA PROFISSIONAL» some da dobra (leitura do print `celular-dobra.jpg` — só logo + menu) |
| home | 4511 · 1 col |
| contato | **778** · **1 coluna** (form abaixo do título) |
| footer | **1137** · **1 coluna** |
| visual | coluna única; seções serviço viram imagem em cima + texto/CTA embaixo (leitura do print `celular-inteira.jpg`); hotspots magenta **não** aparecem na dobra celular lida (possível crop/omissão — Lacunas) |

### O que some / empilha (síntese)

- 1440→1024: h2 reduz; footer alonga; estrutura mantém.
- 1024→768: hero empilha ao centro; h2/corpo 32px; footer 1 coluna.
- 768→390: contato vira 1 coluna; link profissional some da barra; página alonga para ~6574 px.


## Receita de reprodução

Construir nesta ordem. Valores no passo. Não abrir o site.

### 1. Base e tokens

1. Criar página única (landing) com reset mínimo.
2. Declarar as variáveis do bloco em Tokens (`--fundo-acento: #00afec`, `--fundo-rodape: #002431`, `--fundo-copyright: #001922`, textos `#4c5f6a` / `#333333` / `#3e4e58` / `#ffffff`, raios 3/4/5px e 50%).
3. Largura de referência desktop 1440; conteúdo do contato centrado em ~992 px; footer ~1296 px (`secoes`).
4. Técnica: CSS puro (custom properties). Sem Elementor/jQuery.

### 2. Tipografia

1. Corpo de seções: família gratuita equivalente a Calibri (ex.: Carlito / Source Sans) 17px/400 linha 32px cor `#4c5f6a`.
2. UI e títulos: Open Sans (ou Inter/libre) nos pesos 300–800 conforme escala.
3. Substituir GothamMedium/GothamLight por uma grotesca geométrica licenciada (ex.: Montserrat/Outfit) nos papéis: nav 15px/400 uppercase; botões cinza 12px/300 uppercase; «Como funciona?» 28px/300 linha 40px.
4. Mapear degraus: hero 56px/800 linha 45 uppercase; h2 serviço 54px/800 linha 54; faixa 40/300 + 80/800; contato h3 83px/800 linha 66; legal 10px/400.

### 3. Estrutura (de cima para baixo)

1. **Header** 99 px, `position: absolute`, largura 1440: logo esq. · link «área profissional» · botão  ciano hambúrguer dir.
2. **Hero** fundo branco, altura ~viewport: título esq. · cutout atleta centro · parágrafo + 2 botões 223×47 empilhados dir. · círculos hotspot `border-radius: 50%` com `--superficie-hotspot`.
3. **Faixa ciano** full-bleed `#00afec`, texto branco centrado, cartão branco 470×79 (`--raio-botao`), ghost 470×79 borda branca 1px.
4. **Bloco A** 2 col 50/50: imagem | h2 + subtítulo + corpo + CTA 342×66 `#00afec`.
5. **Bloco B** invertido: texto + CTA 342×92 | imagem.
6. **Bloco C** imagem | texto + CTA 342×92.
7. **Contato** fundo `#00afec`, padding `30 0`, 2 col (título+ícone | form underline), submit 212×65 branco raio 4px.
8. **Footer** `#002431`: colunas links / horários / 3 unidades / newsletter+redes+mapa · barra `#001922`.

### 4. Componentes

1. Botões cinza: fundo `#3d4e59` / `#263036`, texto branco, raio 3px, chevron `>` à direita (leitura do print).
2. CTAs azuis: fundo `#00afec`, texto branco, raio 5px, uppercase 15px/600.
3. Links brancos: hover underline; nav: hover color → `rgb(35,82,124)` + underline (`componentes[id=4].hover`).
4. Campos contato: texto branco 18px, só linha inferior (leitura do print); foco remove outline (`outlineWidth` 3→0).
5. Newsletter: 200×43, borda `#335059`, raio 5px, padding direito 40px para ícone seta.

### 5. Movimento

1. **Não** implementar scroll-reveal (`movimento.aoRolar` vazio).
2. Hambúrguer: `transition: all 0.3s ease` nas barras (`movimento.transicoes`).
3. Abertura do menu: no nav, `transition: all 0.6s ease` animando left + background-color + opacity (600 ms); na `ul` do menu, margin-right/bottom + opacity em 800 ms; início ~96 ms após o clique (`interacoes[0].movimento`). Valores de/para de left/opacity: **inventar não** — se o projeto precisar, medir de novo ou aproximar só com nota de lacuna (receita segura: nav desliza da direita ou expande em faixa full-width ciano com fade 600 ms ease; lista fade 800 ms).
4. Spinner de envio: `@keyframes spin` 1000 ms linear infinite em um elemento só depois do submit (opcional; o original gira mesmo idle no CF7).
5. Alternativa sem jQuery/Elementor: CSS + um listener de clique no hambúrguer; sem IntersectionObserver (não há aoRolar).

### 6. Interações

1. Clique no hambúrguer → adiciona classe `active` em `nav`: fundo `#00afec`, links uppercase brancos em linha (desktop) + X.
2. Esc **não** fecha no original (`fechaComEsc: false`) — no projeto do cliente pode melhorar a11y, mas a referência não o faz.
3. Não construir lightbox WP nem overlay-menu keyframes não usados.

### 7. Responsivo

1. Breakpoints iguais aos usados na medição útil: 1024, 768, 390 (e grade Bootstrap 992/1200 se útil).
2. ≤1024: h2 44px/800 linha 54.
3. ≤768: h2 e título forte 32px; hero empilhado centro; footer 1 coluna.
4. ≤390: contato 1 coluna; esconder link profissional da barra; CTAs full-width na coluna.

## Com a marca do cliente

### O que fica (estrutura e comportamento)

- Ordem: header absoluto → hero impacto → faixa promessa → 3 blocos foto/texto alternados → form contato full-bleed → footer multi-coluna.
- Hambúrguer que abre nav em overlay/faixa com transição ~600/800 ms.
- CTAs de contato repetidos (telefone/WhatsApp) nos blocos de serviço.
- Formulário underline sobre fundo de acento.
- Sem animação ao rolar.
- Empilhamento mobile do hero e footer 1 coluna.

### O que troca (tokens)

- Todas as variáveis de cor por papel.
- Famílias tipográficas (especialmente Gotham → fonte do cliente).
- Raios se a marca for mais suave/aguda.
- Conteúdo dos CTAs e número de unidades no footer.

### Ajustes quando a marca muda

| Mudança | O que adaptar |
|---|---|
| Paleta clara em vez do contraste ciano/navy | Manter hierarquia fundo-página / acento / rodapé escuro; se o acento for pastel, reforçar contraste do texto branco (`--texto-sobre-acento`) ou inverter botões; hotspots precisam de cor de destaque própria |
| Paleta escura no hero | Título `#333333` e botões escuros deixam de funcionar: inverter para texto claro e botões outline/claros |
| Fonte mais larga | Hero 56px/linha 45 e h3 83px/linha 66 estouram: reduzir tamanho ou aumentar line-height; botões 223×47 podem precisar de min-width maior |
| Fonte mais estreita | Pode subir um degrau no hero sem quebrar a dobra |
| Cliente sem foto de atleta | Substituir cutout por foto própria ou ilustração; **manter** a ideia de âncora visual dominante na dobra; hotspots só fazem sentido com figura humana/corpo — se não houver, remover círculos e não inventar outra gimmick |
| Sem vídeo | Original não usa vídeo de hero (`midia.videos: []`) — nada a adaptar |
| Texto mais longo em português | Calibri 17/32 e Open Sans 16/27 aguentam 2–3 linhas a mais; na faixa ciano o título 80px quebra cedo — preferir 2 linhas curtas; botões com telefone (342×92) já são multilinha — limitar a 3 linhas |

## Não copiar

| Ativo do dono | Por quê | Usar no lugar |
|---|---|---|
| Logo FISIO1 + ícone figura | Marca registrada visual | Logo do cliente |
| Foto da atleta / hotspots sobre o corpo | Imagem própria do site | Ensaio fotográfico do cliente ou banco licenciado |
| Fotos do terapeuta, pés na plataforma, estúdio Pilates | Ativos de conteúdo | Fotos reais da clínica do cliente |
| Textos, slogans, nomes de unidades, telefones, CREFITO | Copy e dados do negócio | Redação Marina / dados do cliente |
| `GothamMedium.woff` / `GothamLight.woff` | Fonte paga | Equivalente licenciado da marca |
| `Calibri.woff` embutido | Licença Microsoft duvidosa na web | Carlito / fonte da marca |
| Ícones Font Awesome via CSS bloqueado / Glyphicons | Conferir licença; não extrair do site | Lucide/Heroicons ou set da marca |
| Mapa iframe / pin da unidade | Localização deles | Mapa da unidade do cliente |
| Código WordPress/Elementor/CF7 | Implementação dona | HTML/CSS/JS do projeto; form do stack do cliente |
| Frases inteiras da home | Copyright de texto | Só rótulos curtos de seção no dossiê; copy nova |

## Lacunas

### Do `absorcao.json` · chave `lacunas`

- Conteúdo em iframe (`www.google.com`) não medido — mapa do footer sem estilo interno reproduzível.
- Só a home foi lida: páginas internas (tratamentos, lesões, cursos, sobre, notícias, contato dedicado), área logada e pós-envio de formulário ficaram de fora.
- Aviso de cookies, se havia, não foi fechado — pode aparecer nos prints.

### Medição / movimento

- `sombras: []` — nenhuma sombra com valor; elevação eventual é só leitura do print.
- `movimento.aoRolar` / `aoPassarMouse` / `semTocar` vazios; `cabecalhoAoRolar: {}`; `fixos: []`.
- Valores **de → para** de `left`, `opacity`, `margin-*`, `transform` do menu na abertura não foram capturados — só duração/curva/propriedade (`interacoes[0].movimento`).
- Animação de **fechamento** do menu não medida.
- `fechaComEsc: false`; clique fora e foco não documentados.
- Caixa de `nav.active` reportada como 1440×99 enquanto o print mostra faixa de menu — altura real do overlay ambígua.
- Hover com duração: só as barras do hambúrguer têm `0.3s ease`; hovers de link/botão mudam estilo sem ms medido no componente.
- Keyframes `fadeIn`, `fadeOut`, `blink`, `overlay-menu__fade-in-animation`, lightbox: presentes no CSS, **uso na home não comprovado**.
- Hotspots `div.tl2.circle`: estilo sim; interação não.
- z-index: valores 999…999999 sem mapa elemento→camada.
- `espacamento.gaps: []`; paddings internos finos de colunas texto/imagem não quebrados por bloco (só o wrapper `div.home`).
- Subdivisões do home (hero, faixa, 3 serviços) não são `secoes[]` separadas — alturas individuais desses blocos **não medidas**.
- `responsivo[].navegacao.botaoDeMenu: false` em todas as larguras, mas o hambúrguer existe nos prints — flag inconsistente com o visual.
- Folhas bloqueadas (`naoLidos.folhasBloqueadas`): normalize, Font Awesome, Google Fonts Merriweather/Montserrat/Inconsolata — regras dessas folhas não entraram na medição.
- Vídeo `video/sessao.webm`: metadados lidos (37,88 s, 1280×800 VP9); revisão quadro a quadro da sessão não foi o método principal — movimento e cliques baseados em `movimento` / `interacoes` / prints. Se algum microgesto só aparece no vídeo e não no JSON, está fora deste dossiê.

### O que isso impede de reproduzir com fidelidade total

- Overlay do menu com geometria e chave de fechamento idênticas.
- Qualquer microinteração dos hotspots.
- Páginas internas e estados pós-submit.
- Sombras e gaps de grade pixel-perfect.
- Tipografia exata Gotham/Calibri sem licença (deve ser substituída de propósito).

Status: rascunho — validação (`validado`) é do Carlos.
