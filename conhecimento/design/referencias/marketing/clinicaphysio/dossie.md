# Dossiê de Absorção — Clínica Physio (`clinicaphysio.com.br`)

## Resumo

- **O que é o site:** Landing page institucional e catálogo de serviços de uma clínica de fisioterapia e reabilitação multidisciplinar (`titulo: "Home - PHYSIO SAÚDE"`, `idioma: "pt-BR"`, `url: "https://clinicaphysio.com.br/"`).
- **Ideia que organiza a página:** A estrutura divide a apresentação da clínica em quatro blocos funcionais claros dentro de uma página vertical (`janela.alturaPagina: 6403` em `janela.largura: 1440`):
  1. Cabeçalho institucional em duas faixas (barra de contatos rápida no topo + barra principal com marca, navegação com submenus e redes sociais) (`secoes[0]`, `telas/desktop-dobra.jpg`).
  2. Dobra principal com carrossel de 4 slides em largura total (`1440px`), apresentando os pilares de posicionamento da clínica com efeito Ken Burns de fundo, animações de entrada (`fadeInUp`) e divisor inferior curvo (shape divider em arco côncavo) (`secoes[1]`, `movimento.animacoesVivas`, `movimento.transicoes[6]`, `video/sessao.webm`).
  3. Catálogo visual dividido em dois formatos complementares: primeiro uma grade de 3 colunas (`ESPECIALIDADES`, 9 itens com foto, título, resumo e CTA em pílula sobre fundo azul-claro `#d3e6eb` delimitado por divisores curvos no topo e na base) e, abaixo, uma vitrine editorial alternada em zigue-zague (`SERVIÇOS`, cartões horizontais 50/50 intercalando bloco de texto em `#d3e6eb` e fotografia, entrando com `fadeInLeft` e `fadeInRight`) (`secoes[1]`, `cores.fundo`, `movimento.aoPassarMouse`, `telas/desktop-inteira.jpg`, `telas/notebook-inteira.jpg`).
  4. Rodapé institucional em duas faixas (bloco de 3 colunas com endereço, redes e horário sobre fundo `#238ca4` com topo curvo, seguido de barra de créditos em `#253b59`), acompanhado de botão flutuante de WhatsApp (`joinchat`) no canto inferior direito (`secoes[2]`, `cores.fundo`, `movimento.animacoesVivas`, `telas/desktop-inteira.jpg`).
- **Por que funciona:** A página equilibra autoridade clínica e acolhimento ao combinar uma paleta fria e calma (azul-petróleo `#218197` / `#238ca4`, marinho `#253b59` e gelo `#d3e6eb` em `cores.fundo`) com transições orgânicas entre seções (recortes curvos SVG do Elementor visíveis em `telas/desktop-inteira.jpg`) e hierarquia escaneável. A diferenciação entre a grade de 3 colunas (para especialidades rápidas) e as faixas horizontais 50/50 (para serviços e infraestrutura) evita a monotonia de um catálogo extenso.
- **Para qual modo de design serve e por quê:** Serve para o modo **Padrão**. A arquitetura utiliza padrões consolidados de mercado (cabeçalho utilitário + hero slider + grade 3x3 de cartões + seções zigue-zague 50/50 + rodapé de 3 colunas + botão flutuante de WhatsApp), construídos sobre WordPress, Elementor e Swiper (`bibliotecas`), com tipografia geométrica única (`Montserrat` em `fontes.uso`) e animações de entrada clássicas (`fadeIn`, `fadeInUp`, `fadeInLeft`, `fadeInRight` em `movimento.keyframes`), sem experimentação conceitual de layout, WebGL dramático ou navegação disruptiva.

Modo sugerido: padrao

---

## Estrutura

A medição de topo em `secoes` registra 4 contêineres de primeiro nível no DOM (`div.elementor.elementor-11`, `div.elementor.elementor-8`, `div.elementor.elementor-29` e o backdrop do modal de cookies `div.cli-modal-backdrop.cli-fade`). Como o conteúdo principal (`secoes[1]`, `div.elementor.elementor-8`, altura `5736px`) agrupa o carrossel hero, a seção de Especialidades e a seção de Serviços, as tabelas abaixo detalham tanto as macro-seções medidas em `secoes` quanto as subseções internas identificadas pelos seletores de `cores.fundo`, `movimento` e leitura dos prints (`telas/desktop-inteira.jpg`, `telas/notebook-inteira.jpg`).

> [!NOTE]
> Em toda a captura (`telas/desktop-dobra.jpg` a `telas/celular-inteira.jpg`), o modal de consentimento de cookies (`fixos[0]`, `z: 9999`) e seu backdrop escuro (`secoes[3]` / `fixos[1]`, `fundo: "#000000"`, `z: 1040`) permaneceram abertos sobre a página (`lacunas[2]`), escurecendo visualmente os prints acima do rodapé.

### Visão Geral das Macro-Seções (`secoes`)

| Ordem (`secoes[n]`) | Alvo (`alvo`) | Posição Y (`y`) | Altura (`altura`) | Largura (`larguraConteudo`) | Fundo (`fundo`) | Padding (`padding`) | Layout e Grade (`layout`) | Papel na página |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** (`secoes[0]`) | `div.elementor.elementor-11` | `0px` | `151px` | `1440px` | `""` (leitura do print e `cores.fundo`: faixa superior `#218197` e faixa principal `#238ca4`) | `0 0 0 0` | `flex · row · 2 filho(s) em 1 coluna(s) · gap 0/0` | Cabeçalho institucional completo (barra de telefones + barra de logo, menu e redes). |
| **2** (`secoes[1]`) | `div.elementor.elementor-8` | `151px` | `5736px` | `1440px` | `""` (subseções com `#7c8c87 @55%`, `#833ca3`, `#253b59`, `#d3e6eb` e `#ffffff` em `cores.fundo`) | `0 0 0 0` | `block · 3 filho(s) em 1 coluna(s) · gap 0/0` | Corpo principal da landing page: agrupa os 3 filhos principais (1. Carrossel Hero, 2. Grade de Especialidades, 3. Vitrine de Serviços). |
| **3** (`secoes[2]`) | `div.elementor.elementor-29` | `5888px` | `515px` | `1440px` | `""` (subseções com `#238ca4` e `#253b59` em `cores.fundo` e leitura do print `telas/desktop-inteira.jpg`) | `0 0 0 0` | `block · 2 filho(s) em 1 coluna(s) · gap 0/0` | Rodapé institucional em 2 faixas: informações de contato/horários e barra de copyright/créditos. |
| **4** (`secoes[3]`) | `div.cli-modal-backdrop.cli-fade` | `0px` | `900px` | `1440px` | `#000000` (opacidade visual no print; transição `opacity 0.5s ease-in-out` em `movimento.transicoes[7]`) | `0 0 0 0` | `block · 0 filho(s) em 0 coluna(s) · gap 0/0` | Camada de fundo (`fixos[1]`, `z: 1040`) do aviso de cookies que cobriu a viewport durante a captura. |

---

### Detalhamento por Seção e Subseção (em ordem vertical)

#### 1. Cabeçalho (`secoes[0]` — `div.elementor.elementor-11`)

| Propriedade | Valor Medido / Leitura | Fonte |
| :--- | :--- | :--- |
| **Posição e Dimensões** | `y: 0`, `altura: 151px` (1440px), `109px` (1024px), `86px` (768px), `99px` (390px); `larguraConteudo: 1440px` | `secoes[0]`, `responsivo` |
| **Fundo** | Container com `fundo: ""`; composto por barra de topo mais escura (`#218197`, `cores.fundo[8]`) e barra principal azul-petróleo (`#238ca4`, `cores.fundo[6]`) | `secoes[0]`, `cores.fundo`, leitura do print `telas/desktop-dobra.jpg` |
| **Padding** | `0 0 0 0` no wrapper externo; links de navegação com `padding: 13px 20px 13px 20px` | `secoes[0].padding`, `componentes[2].estilo.padding` |
| **Layout / Grade** | `flex · row · 2 filho(s) em 1 coluna(s) · gap 0/0` (2 seções internas empilhadas: top bar de contatos e main bar de navegação) | `secoes[0].layout`, leitura do print `telas/desktop-dobra.jpg` |
| **Conteúdo Medido** | `titulos: []`, `paragrafos: 0`, `botoes: []`, `links: 57` (inclui itens de menu, submenus ocultos, telefones e redes), `imagens: 1` (logo Physio), `caracteres: 77` | `secoes[0].conteudo` |
| **O que tem dentro** | **Faixa 1 (Topo):** alinhada à direita, exibe ícone de WhatsApp + `(47) 98870 3007` (`escalaTipografica[7]`: `Montserrat 14px/500`) e ícone de telefone + `(47) 3525 4471` (`escalaTipografica[9]`: `Montserrat 15px/300`, cor `#ffffff`).<br>**Faixa 2 (Principal):** à esquerda, logotipo vertical da clínica (`componentes[11]`, `83x98px` em desktop); à direita, menu horizontal (`navegacao`, altura `46px`) com 5 links (`HOME`, `SOBRE NÓS`, `ESPECIALIDADES` com seta de submenu, `SERVIÇOS` com seta de submenu, `CONTATO`) seguido por 2 ícones de redes sociais (Instagram e Facebook em branco `#ffffff`). | `secoes[0]`, `navegacao`, `componentes[2]`, `componentes[11]`, `gatilhos`, leitura do print `telas/desktop-dobra.jpg` |
| **Papel na página** | Identificação imediata da marca, acesso rápido aos telefones de agendamento e navegação global para páginas internas e catálogos. | Leitura do print `telas/desktop-dobra.jpg` |

#### 2. Corpo Principal — Filho 1: Carrossel Hero (`secoes[1]` — `div.elementor.elementor-8` > `div.swiper-wrapper.elementor-slides`)

| Propriedade | Valor Medido / Leitura | Fonte |
| :--- | :--- | :--- |
| **Posição e Dimensões** | Inicia em `y: 151px`; largura `1440px` (`quadros: "100% width: 1440px"` em `movimento.animacoesVivas`); altura aproximada de `580px` a `600px` até o divisor curvo inferior (leitura do print `telas/desktop-dobra.jpg`, ocupando do pixel `151` até ~`740` da viewport de `900px`) | `secoes[1]`, `janela`, `movimento.animacoesVivas`, leitura do print `telas/desktop-dobra.jpg` |
| **Fundo** | Sobreposição escura `div.elementor-background-overlay` com `#000000 @27%` (`cores.fundo[0]`, área acumulada `10609920`) sobre os fundos de slide `div.swiper-slide-bg`:<br>- Slide 1 e 2: `#7c8c87 @55%` (`cores.fundo[1]`, visível em `telas/desktop-dobra.jpg` e `video/sessao.webm` `00:08`)<br>- Slide 3: `#833ca3` (`cores.fundo[3]`, roxo, visível em `telas/rolagem-01.jpg` e `video/sessao.webm` `00:13`)<br>- Slide 4: `#253b59` (`cores.fundo[2]`, azul-marinho escuro, visível em `telas/rolagem-06.jpg` e `video/sessao.webm` `00:19`) | `cores.fundo[0..3]`, `telas/desktop-dobra.jpg`, `telas/rolagem-01.jpg`, `telas/rolagem-06.jpg`, `video/sessao.webm` |
| **Layout / Grade** | Carrossel Swiper de 1 coluna em largura total (`1440px`), conteúdo centralizado vertical e horizontalmente (`div.swiper-slide-contents.animated`), com paginação de 4 pontos (`span.swiper-pagination-bullet`) na base central e divisor de forma (shape divider) curvo côncavo na borda inferior | `componentes[4]`, `componentes[8]`, `movimento.animacoesVivas`, leitura do print `telas/desktop-dobra.jpg` |
| **O que tem dentro** | 4 slides (`div.elementor-repeater-item-66e7e92`, `a3fa065`, `fa2599d`, `1f82751` em `movimento.animacoesVivas`), cada um contendo título em caixa-alta `Montserrat 40px · peso 600 · linha 66px` (`escalaTipografica[0]`) na cor `#ffffff`, com palavras-chave destacadas por fundo `<mark>` cinza-esverdeado `#7b8c86` (`cores.fundo[7]`):<br>1. `ATENDIMENTO EXCLUSIVO E` / `<mark>PERSONALIZADO</mark>` (`video/sessao.webm` `00:02`–`00:07`, `telas/tablet-dobra.jpg`)<br>2. `FISIOTERAPIA DE RESULTADOS` (`video/sessao.webm` `00:08`–`00:12`, `00:33`)<br>3. `REFERÊNCIA EM REABILITAÇÃO` / `<mark>NEUROLÓGICA INFANTIL</mark>` (`video/sessao.webm` `00:13`–`00:17`, `telas/rolagem-01.jpg`)<br>4. `ESTUDO, INOVAÇÃO E` `<mark>EXCELÊNCIA</mark>` / `<mark>TERAPÊUTICA</mark>` (`video/sessao.webm` `00:19`–`00:23`, `telas/rolagem-07.jpg`)<br>Na base do carrossel: 4 bullets de paginação (`8x8px`, raio `50%`, inativo `#666666`, ativo `#253b59` em `componentes[4]` e `componentes[8]`). | `descricao`, `escalaTipografica[0]`, `cores.fundo[7]`, `componentes[4]`, `componentes[8]`, `movimento.animacoesVivas`, `video/sessao.webm`, leitura dos prints |
| **Papel na página** | Sintetizar os quatro pilares de valor da clínica logo na primeira dobra com movimento contínuo (troca automática de slides e efeito Ken Burns de `20s`). | `movimento.transicoes[6]`, `movimento.semTocar` |

#### 3. Corpo Principal — Filho 2: Seção Especialidades (`secoes[1]` — `section.elementor-section.elementor-top-section`)

| Propriedade | Valor Medido / Leitura | Fonte |
| :--- | :--- | :--- |
| **Dimensões e Fundo** | Largura total `1440px`; fundo azul-gelo `#d3e6eb` (`cores.fundo[4]`, `section.elementor-section.elementor-top-section`, área `2329200`). Delimitada no topo pela curva côncava do Hero e na base por uma curva convexa suave para o fundo branco da seção seguinte | `secoes[1]`, `cores.fundo[4]`, leitura do print `telas/desktop-inteira.jpg` |
| **Espaçamentos e Grade** | Container centralizado (~`1140px`, padrão Elementor — leitura do print `telas/desktop-inteira.jpg`). Cabeçalho de seção centralizado (1 coluna) seguido por grade de **3 colunas × 3 linhas** (9 cartões de especialidades) e rodapé da seção centralizado (1 botão `VEJA MAIS`). Espaçamentos da escala (`espacamento.valores`): `50px`, `40px`, `30px`, `20px`, `10px`. | `espacamento.valores`, leitura do print `telas/desktop-inteira.jpg` |
| **O que tem dentro** | - **Título da seção:** `ESPECIALIDADES` em `Montserrat 27px · peso 500 · linha 41px` (`escalaTipografica[8]`), cor `#253b59` (`cores.texto[3]`), centralizado, com sublinhado decorativo fino na cor `#218197` abaixo.<br>- **9 blocos de especialidades (3×3):**<br>  1. *Fisioterapia*<br>  2. *Palmilhas e Podoposturologia*<br>  3. *Pilates*<br>  4. *Acupuntura*<br>  5. *Welness* (grafado com um "l")<br>  6. *Natação Terapêutica*<br>  7. *Natação Bebês e Infantil*<br>  8. *Psicopedagogia*<br>  9. *Psicomotricidade*<br>  Cada bloco contém: fotografia retangular horizontal no topo, título em `Montserrat 16px · peso 700 · linha 24px` cor `#253b59` (`escalaTipografica[1]`, `cores.texto[3]`), parágrafo descritivo em `Montserrat 16px · peso 400 · linha 20px` ou `24px` cor `#666666` (`escalaTipografica[4..5]`, `cores.texto[1]`) e botão primário `SAIBA MAIS` (`107x31px`, fundo `#218197`, texto `#ffffff`, raio `40px` em `componentes[0]`).<br>- **CTA de fechamento:** botão contornado `VEJA MAIS` (`144x37px`, texto `#218197`, borda `1px solid #218197`, fundo transparente, raio `40px`, padding `10 30 10 30` em `componentes[5]`). | `escalaTipografica[1..5, 8]`, `cores.texto[1, 3, 6]`, `componentes[0, 1, 5, 7]`, leitura do print `telas/desktop-inteira.jpg` |
| **Papel na página** | Apresentar o portfólio completo de especialidades terapêuticas em formato de grade rápida, permitindo ao paciente identificar sua necessidade e clicar em `SAIBA MAIS`. | Leitura do print `telas/desktop-inteira.jpg` |

#### 4. Corpo Principal — Filho 3: Seção Serviços (`secoes[1]` — `section.elementor-section.elementor-top-section` e `elementor-inner-section`)

| Propriedade | Valor Medido / Leitura | Fonte |
| :--- | :--- | :--- |
| **Dimensões e Fundo** | Largura total `1440px`; fundo da seção em branco `#ffffff` (leitura do print `telas/desktop-inteira.jpg` e `telas/notebook-inteira.jpg`). Cada cartão horizontal (`section.elementor-section.elementor-inner-section`) usa fundo azul-gelo `#d3e6eb` no bloco de texto (leitura do print `telas/notebook-inteira.jpg` e `video/sessao.webm` `00:38`). | `movimento.transicoes[3]`, `movimento.aoPassarMouse[12, 16]`, leitura dos prints `telas/desktop-inteira.jpg` e `telas/notebook-inteira.jpg` |
| **Layout / Grade** | Cabeçalho centralizado (`SERVIÇOS` com divisor curto abaixo) seguido por lista vertical de seções internas (`section.elementor-section.elementor-inner-section`, `n: 8` em `movimento.transicoes[3]`), cada uma dividida em **2 colunas (50% / 50%) sem gap** entre o bloco de texto (`#d3e6eb`) e a fotografia lateral, alternando o lado da imagem a cada linha, e fechando com um segundo botão contornado `VEJA MAIS` (`componentes[5]`, `quantidade: 2`) centralizado na base. | `movimento.transicoes[3]`, `componentes[5]`, leitura dos prints `telas/desktop-inteira.jpg` e `telas/notebook-inteira.jpg` |
| **O que tem dentro** | - **Título da seção:** `SERVIÇOS` em `Montserrat 27px · peso 500 · linha 41px` (`escalaTipografica[8]`), cor `#253b59` (`cores.texto[3]`), com traço horizontal `#218197` abaixo.<br>- **Blocos horizontais 50/50 (`elementor-inner-section`):** como as imagens têm carregamento preguiçoso (`midia.preguicosas: 20` de `22` imagens) e têm animação de entrada ao rolar (`fadeInLeft` e `fadeInRight` em `movimento.aoPassarMouse`), nos prints de página inteira apenas o último bloco ativado aparece renderizado (`TREINO DE MARCHA` com texto à esquerda em fundo `#d3e6eb`, botão `SAIBA MAIS` `#218197` e foto de paciente na esteira ergométrica com suspensão parcial de peso à direita — visível em `telas/notebook-inteira.jpg`, `telas/tablet-inteira.jpg` e `video/sessao.webm` `00:38`). A contagem de `movimento.transicoes[3]` (`n: 8` para `section.elementor-section.elementor-inner-section`) e a altura da seção (`5736px` no total de `secoes[1]`) indicam 6 blocos de serviços empilhados nessa área (~`3000px` verticais entre o título `SERVIÇOS` e o botão `VEJA MAIS` inferior).<br>- **CTA de fechamento:** botão contornado `VEJA MAIS` (`144x37px`, `borda: 1px solid #218197`, `raio: 40px` em `componentes[5]`). | `escalaTipografica[8]`, `midia.preguicosas`, `movimento.transicoes[3]`, `movimento.aoPassarMouse[12, 16]`, `componentes[5]`, leitura dos prints `telas/desktop-inteira.jpg` e `telas/notebook-inteira.jpg` |
| **Papel na página** | Destacar diferenciais tecnológicos e programas específicos de reabilitação (como o Treino de Marcha) com maior peso visual (layout 50/50) do que a grade 3×3 superior. | Leitura do print `telas/notebook-inteira.jpg` |

#### 5. Rodapé Institucional (`secoes[2]` — `div.elementor.elementor-29`)

| Propriedade | Valor Medido / Leitura | Fonte |
| :--- | :--- | :--- |
| **Posição e Dimensões** | `y: 5888px`, `altura: 515px` (1440px), `596px` (1024px), `689px` (768px), `1365px` (390px); `larguraConteudo: 1440px` | `secoes[2]`, `responsivo` |
| **Fundo** | Composto por 2 filhos empilhados (`layout: "block · 2 filho(s) em 1 coluna(s)"`):<br>- **Filho 1 (Rodapé principal):** fundo azul-petróleo `#238ca4` (`cores.fundo[6]`) com divisor superior em arco convexo suave sobre o fundo branco da seção Serviços.<br>- **Filho 2 (Barra de copyright):** fundo azul-marinho `#253b59` (`cores.fundo[2]`). | `secoes[2]`, `cores.fundo[2, 6]`, leitura do print `telas/desktop-inteira.jpg` |
| **Layout / Grade** | - **Filho 1:** grade de **3 colunas** centralizadas (~`1140px`) em desktop/notebook/tablet, empilhando em **1 coluna** no celular (`390px`).<br>- **Filho 2:** faixa horizontal de **3 colunas** (logo à esquerda, crédito da agência ao centro, copyright à direita). | `secoes[2]`, leitura dos prints `telas/desktop-inteira.jpg` e `telas/celular-inteira.jpg` |
| **Conteúdo Medido** | `titulos: []`, `paragrafos: 13`, `botoes: []`, `links: 3`, `imagens: 2` (logo Physio branco e logo agência Tatticas), `caracteres: 497` | `secoes[2].conteudo` |
| **O que tem dentro** | **Faixa 1 (`#238ca4`):**<br>- *Coluna 1 (`CLINICA PHYSIO`):* título em `Montserrat` escuro (`#253b59`), endereço em `Montserrat 14px/400 linha 21px` cor `#ffffff` (`escalaTipografica[13]`), e-mail em `Montserrat 15px/100 linha 23px` (`escalaTipografica[14]`) e telefones em `Montserrat 14px` cor `#ffffff`.<br>- *Coluna 2 (`SIGA NOSSAS REDES`):* título `#253b59`, texto explicativo em `Montserrat 14px/400 linha 16px` cor `#ffffff` (`escalaTipografica[6]`) e 2 ícones (Instagram e Facebook em `#253b59`).<br>- *Coluna 3 (`HORÁRIO DE ATENDIMENTO`):* título `#253b59`, horários com dias em negrito `Montserrat 14px/700 linha 16px` (`escalaTipografica[10]`, `strong: Segunda a Quinta`, `Sexta`) em `#ffffff`, e link `POLÍTICA DE PRIVACIDADE` em `Montserrat 16px/700` na cor magenta `#cc3366` (`componentes[13]`, `230x19px`).<br>**Faixa 2 (`#253b59`):**<br>- Logotipo tipográfico `Physio` em branco à esquerda; `Desenvolvimento por` (`Montserrat 11px/400 linha 17px`, `escalaTipografica[15]`) + logo `Tatticas` ao centro; `© Physio 2022. todos os direitos reservados.` (`Montserrat 10px/400 linha 15px`, `escalaTipografica[16]`) à direita. | `secoes[2]`, `escalaTipografica[6, 10, 13..16]`, `componentes[13]`, leitura do print `telas/desktop-inteira.jpg` |
| **Papel na página** | Encerramento institucional com dados de localização física, canais de contato, horários de funcionamento, link jurídico e créditos. | Leitura do print `telas/desktop-inteira.jpg` |

#### 6. Elementos Fixos e Flutuantes (`fixos`, `secoes[3]`, `raios`, `sombras`)

| Elemento | Alvo (`alvo`) | Posição e Dimensões | Camada (`z`) | Fundo e Sombra | Papel |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Botão Flutuante WhatsApp (Join.chat)** | `div.joinchat.joinchat--right` / `div.joinchat__button` | Fixo no canto inferior direito (leitura do print `telas/desktop-dobra.jpg`); botão circular/pílula com raio `30px` (`raios[2]`) e ícone interno `50%` (`raios[3]`), acompanhado de tooltip branco `"Podemos te ajudar?"` (`video/sessao.webm` `00:10`) | Camada superior de widget flutuante (abaixo ou fora do modal de cookies; visível sem escurecimento no canto inferior direito em `telas/desktop-dobra.jpg`) | Verde WhatsApp (leitura do print `telas/desktop-dobra.jpg`); sombra `rgba(7, 94, 84, 0.24) 1px 6px 24px 0px` (`sombras[1]`) | Canal de conversão rápida via WhatsApp presente durante toda a rolagem. |
| **Modal de Aviso de Cookies** | `div#cookie-law-info-bar.cli-bar-popup.cli-modal-content` (`fixos[0]`) | `posicao: "fixed"`, `topo: "450px"`, `base: "337.5px"`, `largura: 500px`, `altura: 221px` (em tablet e celular aparece também como seção 4 com `padding: 25 25 25 25`, `altura: 189px` e `225px` em `responsivo`) | `9999` (`fixos[0].z`, `camadas[5]`) | Fundo `#ffffff` (`fixos[0].fundo`), raio `3.2px` (`raios[1]`), sombra `rgba(172, 171, 171, 0.3) 0px -1px 10px 0px` (`sombras[0]`) | Consentimento LGPD/cookies com link para política (`#139900`) e botões `Configurações de cookies` (`#dedfe0`) e `Aceitar Todos` (`#61a229`). |
| **Backdrop do Modal de Cookies** | `div.cli-modal-backdrop.cli-fade` (`fixos[1]`, `secoes[3]`) | `posicao: "fixed"`, `topo: "0px"`, `base: "0px"`, `largura: 1440px`, `altura: 900px` | `1040` (`fixos[1].z`, `camadas[4]`) | Fundo `#000000` (`fixos[1].fundo`) com opacidade translúcida sobre a página | Bloqueio visual do fundo enquanto o aviso de cookies não é fechado. |

---

## Tokens

### 1. Cores por Papel (`cores`)

| Papel Semântico | Valor Medido | Ocorrências / Área (`n`) | Alvo de Origem (`sample`) | Fonte |
| :--- | :--- | :--- | :--- | :--- |
| **Fundo Primário (Página / Seção Serviços)** | `#ffffff` | `110500` (e fundo padrão do body) | `div#cookie-law-info-bar` e seção `SERVIÇOS` | `cores.fundo[9]`, leitura do print `telas/desktop-inteira.jpg` |
| **Fundo Secundário (Superfície de Seção e Cartões)** | `#d3e6eb` | `2329200` | `section.elementor-section.elementor-top-section` (Especialidades e blocos de Serviços) | `cores.fundo[4]`, leitura do print `telas/notebook-inteira.jpg` |
| **Fundo Institucional (Cabeçalho e Rodapé)** | `#238ca4` | `651690` | `section.elementor-section.elementor-top-section` (Header principal e Rodapé principal) | `cores.fundo[6]`, leitura do print `telas/desktop-inteira.jpg` |
| **Fundo Institucional Escuro (Topbar e Sub- seções)** | `#218197` | `200348` | `section.elementor-section.elementor-inner-section` (Topbar e botões primários) | `cores.fundo[8]`, `componentes[0].estilo.fundo` |
| **Fundo Marinho Escuro (Slide 4 e Barra Copyright)** | `#253b59` | `2818676` | `div.swiper-slide-bg` (Slide 4 e faixa inferior do rodapé) | `cores.fundo[2]`, leitura do print `telas/desktop-inteira.jpg` |
| **Fundo de Slide Alternativo 1 (Cinza-Esverdeado)** | `#7c8c87 @55%` | `5304960` | `div.swiper-slide-bg` (Slides 1 e 2 do Hero) | `cores.fundo[1]` |
| **Fundo de Slide Alternativo 2 (Roxo)** | `#833ca3` | `2652480` | `div.swiper-slide-bg` (Slide 3 do Hero) | `cores.fundo[3]` |
| **Fundo de Destaque de Texto (`<mark>` no Hero)** | `#7b8c86` | `459955` | `mark` (grifo atrás das palavras do título do Hero) | `cores.fundo[7]` |
| **Sobreposição de Imagem (Hero Overlay)** | `#000000 @27%` | `10609920` | `div.elementor-background-overlay` | `cores.fundo[0]` |
| **Backdrop de Modal** | `#000000` | `1296000` | `div.cli-modal-backdrop.cli-fade` | `cores.fundo[5]` |
| **Texto sobre Fundo Escuro / Acento** | `#ffffff` | `1018` | `(47) 98870 3007`, links do menu, títulos do Hero, texto do rodapé, botões primários | `cores.texto[0]` |
| **Texto Primário / Títulos de Seção e Cartão** | `#253b59` | `212` | `ESPECIALIDADES`, `SERVIÇOS`, títulos de cartões e títulos de colunas do rodapé | `cores.texto[3]` |
| **Texto de Item Ativo na Navegação** | `#253f5d` | `4` | `HOME` (`a.elementor-item.elementor-item-active`) | `cores.texto[7]`, `componentes[12].estilo.cor` |
| **Texto Secundário (Corpo dos Cartões)** | `#666666` | `923` | `A fisioterapia trata e previne...` (descrições de especialidades e serviços) | `cores.texto[1]` |
| **Texto Neutro Escuro (Modal / Sistema)** | `#333333` | `314` | `Nós usamos cookies para entreg...` | `cores.texto[2]` |
| **Acento Primário (Botões, Bordas e Traços)** | `#218197` | `18` (texto) / `200348` (fundo) | Botões `SAIBA MAIS` (fundo), botões `VEJA MAIS` (texto e borda) | `cores.texto[6]`, `cores.fundo[8]`, `cores.borda[0]` |
| **Acento Secundário / Link de Destaque** | `#cc3366` | `23` | `POLÍTICA DE PRIVACIDADE` e links genéricos `a` | `cores.texto[4]`, `componentes[3, 6, 11, 13]` |
| **Acento de Plugin de Cookies (Link e Botão)** | `#139900` / `#61a229` | `23` / `1` | `política de privacidade` (`#139900`) e botão `Aceitar Todos` (`#61a229`, hover `rgb(78, 130, 33)`) | `cores.texto[5]`, `componentes[10, 14]` |
| **Borda Primária (Botão Contornado)** | `1px solid #218197` | `2` | `a.elementor-button-link.elementor-button` (`VEJA MAIS`) | `cores.borda[0]` |
| **Degradês Aplicados** | Nenhum (`[]`) | `0` | Embora `variaveisCss` liste 12 presets `--wp--preset--gradient--*` do WordPress, nenhum degradê é utilizado na página (`cores.degrades: []`). | `cores.degrades`, `variaveisCss` |

### 2. Raios de Borda (`raios`)

| Papel | Valor Medido | Ocorrências (`n`) | Alvo (`sample`) | Fonte |
| :--- | :--- | :--- | :--- | :--- |
| **Botão Pílula (CTAs Primários e Secundários)** | `40px` | `11` | `a.elementor-button-link.elementor-button` (`SAIBA MAIS` e `VEJA MAIS`) | `raios[0]` |
| **Botão Flutuante WhatsApp (Container)** | `30px` | `1` | `div.joinchat__button` | `raios[2]` |
| **Elemento Circular (Bullets do Swiper e Ícone Joinchat)** | `50%` | `1` (em `raios`) + `4` bullets | `div.joinchat__button__open`, `span.swiper-pagination-bullet` | `raios[3]`, `componentes[4, 8].estilo.raio` |
| **Caixa de Modal (Cookies)** | `3.2px` | `1` | `div#cookie-law-info-bar.cli-bar-popup.cli-modal-content` | `raios[1]` |
| **Links, Imagens de Cartão e Botões do Modal** | `0px` | — | `a.elementor-item`, `a.medium.cli-plugin-button`, fotos das especialidades | `componentes[2, 9, 10].estilo.raio`, leitura do print `telas/desktop-inteira.jpg` |

### 3. Sombras (`sombras`)

| Papel | Valor Medido | Ocorrências (`n`) | Alvo (`sample`) | Fonte |
| :--- | :--- | :--- | :--- | :--- |
| **Sombra de Elevação de Botão Flutuante (WhatsApp)** | `rgba(7, 94, 84, 0.24) 1px 6px 24px 0px` | `1` | `div.joinchat__button` | `sombras[1]` |
| **Sombra de Modal / Popup** | `rgba(172, 171, 171, 0.3) 0px -1px 10px 0px` | `1` | `div#cookie-law-info-bar.cli-bar-popup.cli-modal-content` | `sombras[0]` |

*(Nota: os cartões de Especialidades e Serviços não utilizam `box-shadow`, apoiando-se apenas no contraste de cor e espaçamento — `componentes[0..14].estilo.sombra: ""` e leitura do print `telas/desktop-inteira.jpg`).*

### 4. Escala de Espaçamento (`espacamento`)

- **Gaps de Grid/Flex (`espacamento.gaps`):** `[]` (o Elementor constrói os espaçamentos via `padding` e `margin` nas colunas e widgets internos, não por `gap` CSS).
- **Valores medidos em `espacamento.valores` (ordenados da menor para a maior medida, com frequência `n`):**
  - Micro espaçamentos (paddings internos de botões, ícones e textos): `5px` (`n: 8`), `6px` (`n: 4`), `8px` (`n: 37`, ex.: padding `8 8 8 8` do botão `SAIBA MAIS`), `9px` (`n: 4`, ex.: padding vertical dos botões de cookie), `10px` (`n: 62`, padding padrão de widgets Elementor e padding vertical do botão `VEJA MAIS`), `11px` (`n: 1`), `12px` (`n: 4`, padding horizontal dos botões de cookie), `13px` (`n: 11`, padding vertical dos links do menu), `14px` (`n: 28`), `15px` (`n: 4`).
  - Médios (respiro entre elementos de cartão e links): `20px` (`n: 57`, padding horizontal dos links de menu e margens entre elementos), `30px` (`n: 9`, padding horizontal do botão `VEJA MAIS`), `32px` (`n: 2`), `40px` (`n: 6`), `45px` (`n: 2`).
  - Macro espaçamentos (respiro interno de seções e colunas): `50px` (`n: 48`, padding principal de seções/blocos), `80px` (`n: 4`), `100px` (`n: 1`).

### 5. Camadas / Z-Index (`camadas` e `fixos`)

| Valor (`camadas`) | Onde é usado / Papel | Fonte |
| :--- | :--- | :--- |
| `-1` | Camada de fundo recuada (elementos decorativos/backgrounds do Elementor) | `camadas[0]` |
| `1` | Conteúdo posicionado sobre backgrounds e overlays de seção | `camadas[1]` |
| `2` | Controles e camadas intermediárias de carrossel / divisores de forma | `camadas[2]` |
| `10` | Paginação do Swiper / menus dropdown sobrepostos ao Hero | `camadas[3]` |
| `1040` | Backdrop escuro do modal (`div.cli-modal-backdrop.cli-fade`) | `camadas[4]`, `fixos[1].z` |
| `9999` | Modal de aviso de cookies no topo da pilha (`div#cookie-law-info-bar`) | `camadas[5]`, `fixos[0].z` |

### 6. Bloco de Variáveis CSS por Papel (Pronto para Rebranding)

```css
:root {
  /* Cores - Superfícies e Fundos */
  --cor-fundo-pagina: #ffffff;               /* cores.fundo[9] */
  --cor-superficie-suave: #d3e6eb;           /* cores.fundo[4] - Especialidades e cards Serviços */
  --cor-superficie-marca: #238ca4;           /* cores.fundo[6] - Header principal e Rodapé */
  --cor-superficie-marca-escura: #218197;    /* cores.fundo[8] - Topbar e CTAs */
  --cor-superficie-profunda: #253b59;        /* cores.fundo[2] - Barra copyright e Slide 4 */
  --cor-destaque-grifo: #7b8c86;             /* cores.fundo[7] - Tag <mark> no Hero */
  --cor-overlay-hero: rgba(0, 0, 0, 0.27);   /* cores.fundo[0] - #000000 @27% */
  --cor-backdrop-modal: #000000;             /* cores.fundo[5] */

  /* Cores - Fundos de Slides Hero */
  --cor-slide-neutro: rgba(124, 140, 135, 0.55); /* cores.fundo[1] - #7c8c87 @55% */
  --cor-slide-acento: #833ca3;               /* cores.fundo[3] */
  --cor-slide-escuro: #253b59;               /* cores.fundo[2] */

  /* Cores - Texto */
  --cor-texto-inverso: #ffffff;              /* cores.texto[0] */
  --cor-texto-titulo: #253b59;               /* cores.texto[3] */
  --cor-texto-nav-ativo: #253f5d;            /* cores.texto[7] */
  --cor-texto-corpo: #666666;                /* cores.texto[1] */
  --cor-texto-neutro-escuro: #333333;        /* cores.texto[2] */

  /* Cores - Acentos e Bordas */
  --cor-acento-primario: #218197;            /* cores.texto[6], cores.fundo[8] */
  --cor-acento-link: #cc3366;                /* cores.texto[4] */
  --borda-botao-secundario: 1px solid var(--cor-acento-primario); /* cores.borda[0] */

  /* Raios de Borda */
  --raio-botao-pilula: 40px;                 /* raios[0] */
  --raio-flutuante: 30px;                    /* raios[2] */
  --raio-modal: 3.2px;                       /* raios[1] */
  --raio-circular: 50%;                      /* raios[3] */

  /* Sombras */
  --sombra-modal: rgba(172, 171, 171, 0.3) 0px -1px 10px 0px; /* sombras[0] */
  --sombra-flutuante: rgba(7, 94, 84, 0.24) 1px 6px 24px 0px; /* sombras[1] */

  /* Escala de Espaçamento Principal */
  --espaco-xs: 5px;                          /* espacamento.valores[7] */
  --espaco-sm: 8px;                          /* espacamento.valores[3] */
  --espaco-md: 10px;                         /* espacamento.valores[0] */
  --espaco-nav-y: 13px;                      /* espacamento.valores[5] */
  --espaco-lg: 20px;                         /* espacamento.valores[1] */
  --espaco-xl: 30px;                         /* espacamento.valores[6] */
  --espaco-2xl: 40px;                        /* espacamento.valores[8] */
  --espaco-secao: 50px;                      /* espacamento.valores[2] */
  --espaco-macro: 80px;                      /* espacamento.valores[11] */
  --espaco-hero: 100px;                      /* espacamento.valores[17] */

  /* Camadas (z-index) */
  --z-fundo: -1;                             /* camadas[0] */
  --z-base: 1;                               /* camadas[1] */
  --z-sobreposto: 2;                         /* camadas[2] */
  --z-controle: 10;                          /* camadas[3] */
  --z-backdrop: 1040;                        /* camadas[4] */
  --z-modal: 9999;                           /* camadas[5] */
}
```

---

## Tipografia

### 1. Famílias e Licenciamento (`fontes`, `naoLidos`, `variaveisCss`)

| Família | Pesos Medidos (`fontes.uso`) | Participação (`parte` / `n`) | Arquivos Carregados / Origem | Licença |
| :--- | :--- | :--- | :--- | :--- |
| **Montserrat** | `400` (`49%`, `n: 1251`), `600` (`17%`, `n: 441`), `700` (`9%`, `n: 234`), `500` (`8%`, `n: 201`), `300` (`1%`, `n: 30`), `100` (`1%`, `n: 28`) | **85%** de todo o texto medido na página (`n: 2185` combinados) | Solicitada via Google Fonts (`https://fonts.googleapis.com/css?family=Montserrat:100,100italic...900italic&display=auto&ver=6.0`, listada em `naoLidos.folhasBloqueadas[0]`) | **OFL (SIL Open Font License 1.1)** — gratuita para uso comercial e web via Google Fonts (conferir ao hospedar localmente). |
| **-apple-system** (Pilha do sistema / Join.chat / Cookie Law Info) | `400` (`14%`, `n: 350`) | **14%** (`n: 350`), usada no aviso de cookies, bullets do Swiper e variável `--joinchat-font: -apple-system,blinkmacsystemfont,"Segoe UI",roboto,oxygen-sans,ubuntu,cantarell,` (`variaveisCss`) | Fonte nativa do sistema operacional | Nativa do sistema (sem custo/licença de embarque). |
| **Font Awesome 5 Free** | `900` (Solid) | Ícones de interface (telefone, setas de submenu) | `fa-solid-900.woff2` (`display: "block"`, `fontes.arquivos[2]`) | Font Awesome Free License (CC BY 4.0 para ícones / SIL OFL para fontes). Conferir versão ao substituir por SVGs. |
| **Font Awesome 5 Brands** | `400` (Regular) | Ícones de marcas (WhatsApp na topbar, Instagram e Facebook no topo e rodapé) | `fa-brands-400.woff2` (`display: "block"`, `fontes.arquivos[1]`) | Font Awesome Free License (SIL OFL 1.1). |
| **eicons** | `400` (Normal) | Ícones internos do construtor Elementor (hambúrguer mobile, UI) | `eicons.woff2` (`display: ""`, `fontes.arquivos[0]`) | GPLv3 (distribuída com o plugin Elementor). |

### 2. Escala Tipográfica Completa (`escalaTipografica`)

Todos os 17 degraus medidos em `escalaTipografica` têm espaçamento entre letras `0` (`espaço 0`). A caixa (maiúsculas/minúsculas) é indicada a partir do `sample` medido e da leitura dos prints:

| Degrau / Papel | Família | Tamanho | Peso | Altura de Linha | Espaço entre Letras | Caixa | Ocorrências (`n`) | Onde é usado (`sample` e leitura do print) | Fonte |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero (Slides 1 a 4)** | `Montserrat` | `40px` | `600` | `66px` (`1.65`) | `0` | Caixa-alta (`UPPERCASE`) | `24` | `div: ATENDIMENTO` — Títulos principais dos 4 slides do carrossel Hero (com trechos grifados em `<mark>`). | `escalaTipografica[0]`, `telas/tablet-dobra.jpg` |
| **Título de Seção (H2 visual)** | `Montserrat` | `27px` | `500` | `41px` (`1.52`, ou `40.5px` em `responsivo[0].corpo`) | `0` | Caixa-alta (`UPPERCASE`) | `2` | `p: ESPECIALIDADES` e título `SERVIÇOS` no topo de cada seção de catálogo. | `escalaTipografica[8]`, `responsivo[0].corpo` |
| **Título de Cartão & Link Jurídico** | `Montserrat` | `16px` | `700` | `24px` (`1.5`) | `0` | Caixa-alta (`UPPERCASE`) | `13` | `p: FISIOTERAPIA` — Títulos dos 9 cartões de Especialidades, títulos dos blocos de Serviços (`TREINO DE MARCHA`), títulos das colunas do rodapé e link `POLÍTICA DE PRIVACIDADE` (`componentes[13]`, `230x19px`). | `escalaTipografica[1]`, `componentes[13]` |
| **Corpo de Cartão (Linha Compacta)** | `Montserrat` | `16px` | `400` | `20px` (`1.25`) | `0` | Normal (Sentence case) | `5` | `p: A Podoposturologia é uma área da ciência` — Descrições de especialidades com texto mais longo. | `escalaTipografica[4]` |
| **Corpo de Cartão (Linha Padrão)** | `Montserrat` | `16px` | `400` | `24px` (`1.5`) | `0` | Normal (Sentence case) | `4` | `p: A fisioterapia trata e previne doenças e` — Descrições de especialidades e serviços (`TREINO DE MARCHA`). | `escalaTipografica[5]` |
| **Rótulo de Botão CTA (Primário e Secundário)** | `Montserrat` | `15px` | `500` | `15px` (`1.0`) | `0` | Caixa-alta (`UPPERCASE`) | `11` | `span: SAIBA MAIS` (9 botões preenchidos) e `VEJA MAIS` (2 botões contornados). | `escalaTipografica[2]`, `componentes[0, 5]` |
| **Telefone Fixo (Topbar)** | `Montserrat` | `15px` | `300` | `7px` (`0.47`) | `0` | Numérico | `2` | `p: (47) 3525 4471` — Telefone fixo no canto superior direito do cabeçalho. | `escalaTipografica[9]` |
| **E-mail Institucional (Rodapé)** | `Montserrat` | `15px` | `100` | `23px` (`1.53`) | `0` | Minúsculas (`lowercase`) | `1` | `p: contato@clinicaphysio.com.br` — E-mail na coluna 1 do rodapé (`#238ca4`). | `escalaTipografica[14]` |
| **Texto do Modal de Cookies** | `-apple-system` | `15px` | `400` | `18px` (`1.2`) | `0` | Normal | `2` | `div: Nós usamos cookies para entregar a melho` e link `política de privacidade` (`componentes[14]`). | `escalaTipografica[11]`, `componentes[14]` |
| **Destaque de Horário (Rodapé)** | `Montserrat` | `14px` | `700` | `16px` (`1.14`) | `0` | Normal | `2` | `strong: Segunda a Quinta` e `Sexta` na coluna 3 do rodapé. | `escalaTipografica[10]` |
| **WhatsApp (Topbar)** | `Montserrat` | `14px` | `500` | `21px` (`1.5`) | `0` | Numérico | `2` | `span: (47) 98870 3007` — Link de WhatsApp na barra superior (`componentes[6]`). | `escalaTipografica[7]`, `componentes[6]` |
| **Texto de Rodapé (Redes e Horários)** | `Montserrat` | `14px` | `400` | `16px` (`1.14`) | `0` | Normal | `3` | `p: Estamos nas redes socias. Nos acompanhe ` e texto das faixas de horário no rodapé. | `escalaTipografica[6]` |
| **Endereço e Telefones (Rodapé)** | `Montserrat` | `14px` | `400` | `21px` (`1.5`) | `0` | Normal | `1` | `p: Rua Duque de Caxias| 54 | Jardim América` na coluna 1 do rodapé. | `escalaTipografica[13]` |
| **Botões do Modal de Cookies** | `-apple-system` | `13px` | `400` | `13px` (`1.0`) | `0` | Normal | `2` | `a: Configurações de cookies` (`componentes[9]`) e `Aceitar Todos` (`componentes[10]`). | `escalaTipografica[12]`, `componentes[9, 10]` |
| **Link de Navegação Principal** | `Montserrat` | `12px` | `500` | `20px` (`1.67`) | `0` | Caixa-alta (`UPPERCASE`) | `5` | `a: HOME`, `SOBRE NÓS`, `ESPECIALIDADES`, `SERVIÇOS`, `CONTATO` no cabeçalho (`navegacao.links`). | `escalaTipografica[3]`, `componentes[2, 12]` |
| **Crédito de Desenvolvimento (Rodapé)** | `Montserrat` | `11px` | `400` | `17px` (`1.55`) | `0` | Normal | `1` | `p: Desenvolvimento por` ao centro da faixa inferior do rodapé (`#253b59`). | `escalaTipografica[15]` |
| **Aviso de Copyright (Rodapé)** | `Montserrat` | `10px` | `400` | `15px` (`1.5`) | `0` | Normal | `1` | `p: © Physio 2022. todos os direitos reserva` à direita da faixa inferior do rodapé. | `escalaTipografica[16]` |

---

## Componentes e estados

Todas as medidas, propriedades e transições abaixo vêm diretamente de `componentes` (`[0]` a `[14]`), `estados` (`[0]` a `[12]`), `navegacao`, `fixos` e `movimento.transicoes`.

### 1. Botão Primário Pílula — `SAIBA MAIS` (`componentes[0]`, `componentes[1]`, `estados[0]`)

- **Alvo:** `a.elementor-button-link.elementor-button`
- **Quantidade na página:** `9` (nos 9 cartões de Especialidades; também aparece nos blocos de Serviços quando visíveis, como `TREINO DE MARCHA` em `telas/notebook-inteira.jpg`).
- **Dimensões e Estilo Normal:**
  - Tamanho: `107x31px` (`componentes[0].tamanho`)
  - Fonte: `Montserrat 15px/500`, altura de linha `15px`, espaço entre letras `0` (`componentes[0].estilo.fonte`, `escalaTipografica[2]`)
  - Cor do texto: `#ffffff` (`componentes[0].estilo.cor`)
  - Fundo: `#218197` (`componentes[0].estilo.fundo`)
  - Borda: nenhuma (`""`)
  - Raio: `40px` (`componentes[0].estilo.raio`)
  - Padding: `8px 8px 8px 8px` (`"8 8 8 8"` em `componentes[0].estilo.padding`)
  - Sombra: nenhuma (`""`)
  - Cursor: `pointer`
- **Transição Declarada:** `all · 0.3s · ease` (`300ms`, atraso `0s`) (`componentes[0].transicao`). Ao carregar e ao rolar, registra também transição na propriedade `visibility` com duração de `300ms` (`movimento.aoCarregar[0]`, `movimento.aoPassarMouse[11]`).
- **Estado Hover:** `"sem mudança medida"` em `componentes[1].hover` / `estados[0].hover` (e `"não deu para alcançar"` em `componentes[0].hover` devido à sobreposição do backdrop de cookies).
- **Estado Foco:** `outlineStyle` muda de `none` para `auto` (`componentes[1].foco`, `estados[0].foco`), acompanhado de transições em `outline-color`, `outline-offset` e `outline-width` disparadas em `2904ms` (`movimento.aoPassarMouse[1..3]`).
- **Estado Ativo:** não possui estilo ativo distinto medido.

### 2. Botão Secundário Contornado — `VEJA MAIS` (`componentes[5]`, `componentes[7]`, `estados[5]`)

- **Alvo:** `a.elementor-button-link.elementor-button`
- **Quantidade na página:** `2` (fechamento da seção `ESPECIALIDADES` e fechamento da seção `SERVIÇOS`).
- **Dimensões e Estilo Normal:**
  - Tamanho: `144x37px` (`componentes[5].tamanho`)
  - Fonte: `Montserrat 15px/500`, altura de linha `15px` (`componentes[5].estilo.fonte`, `escalaTipografica[2]`)
  - Cor do texto: `#218197` (`componentes[5].estilo.cor`)
  - Fundo: transparente (`""`)
  - Borda: `1px solid #218197` (`componentes[5].estilo.borda`, `cores.borda[0]`)
  - Raio: `40px` (`componentes[5].estilo.raio`)
  - Padding: `10px 30px 10px 30px` (`"10 30 10 30"` em `componentes[5].estilo.padding`)
  - Sombra: nenhuma (`""`)
  - Cursor: `pointer`
- **Transição Declarada:** `all · 0.3s · ease` (`300ms`, atraso `0s`) (`componentes[5].transicao`).
- **Estado Hover:** `"sem mudança medida"` (`componentes[7].hover`, `estados[5].hover`).
- **Estado Foco:** `outlineStyle` muda de `none` para `auto` (`componentes[7].foco`, `estados[5].foco`).
- **Estado Ativo:** sem mudança medida.

### 3. Barra de Navegação e Links de Menu (`navegacao`, `componentes[2]`, `componentes[12]`, `gatilhos`)

- **Container (`navegacao`):**
  - Alvo: `nav.elementor-nav-menu--main.elementor-nav-menu__container`
  - Posição: `static` (`cabecalhoAoRolar: {}` — o cabeçalho não acompanha a rolagem).
  - Altura: `46px` em desktop (`1440px`), `0px` em `1024px`, `768px` e `390px` (onde o menu horizontal é ocultado e substituído pelo ícone hambúrguer — `responsivo[1..3].navegacao`, leitura dos prints `telas/notebook-dobra.jpg`, `telas/tablet-dobra.jpg`, `telas/celular-dobra.jpg`).
  - Links (`5`): `HOME`, `SOBRE NÓS`, `ESPECIALIDADES`, `SERVIÇOS`, `CONTATO`.
- **Link de Navegação Inativo (`componentes[2]`, `estados[1]`):**
  - Alvo: `a.elementor-item` (ex.: `"SOBRE NÓS"`, `quantidade: 4`)
  - Tamanho: `114x46px` (varia conforme largura da palavra, mantendo altura `46px`)
  - Fonte: `Montserrat 12px/500`, linha `20px` (`escalaTipografica[3]`)
  - Cor do texto: `#ffffff`
  - Fundo: transparente (`""`), raio `0px`, padding `13px 20px 13px 20px` (`"13 20 13 20"`)
  - Transição: `all · 0.4s · ease` (`400ms`, atraso `0s`) (`componentes[2].transicao`, `movimento.transicoes[4]`)
  - Hover: `"sem mudança medida"` em `estados[1]`, porém `movimento.aoPassarMouse[4..10]` registra transições disparadas em `a.elementor-item` para as propriedades `outline-color`, `outline-offset`, `outline-width`, `fill`, `color`, `transform` e `opacity` (com curva `ease` de `400ms` herdada de `all 0.4s ease`).
  - Foco: `outlineStyle: "none → auto"` (`estados[1].foco`).
- **Link de Navegação Ativo (`componentes[12]`, `estados[10]`):**
  - Alvo: `a.elementor-item.elementor-item-active` (`"HOME"`, `quantidade: 1`)
  - Tamanho: `79x46px`
  - Fonte: `Montserrat 12px/500`, linha `20px`
  - Cor do texto: `#253f5d` (azul-marinho escuro sobre o fundo `#238ca4` do cabeçalho)
  - Padding: `13px 20px 13px 20px`
  - Transição: `all · 0.4s · ease` (`400ms`)
  - Foco: `outlineStyle: "none → auto"` (com transições de `outline-color`, `outline-offset` e `outline-width` registradas em `movimento.aoPassarMouse[13..15]`).

### 4. Paginação do Carrossel Hero — Bullets (`componentes[4]`, `componentes[8]`, `estados[3]`, `estados[6]`)

- **Container:** `div.swiper-pagination.swiper-pagination-clickable`, com transição `all · 0.3s · ease · atraso 0s` (`movimento.transicoes[2]`, `n: 12`).
- **Bullet Inativo (`componentes[4]`, `estados[3]`):**
  - Alvo: `span.swiper-pagination-bullet` (`quantidade: 3`)
  - Tamanho: `8x8px`, raio `50%`, padding `0 0 0 0`, cursor `pointer`
  - Fundo: `#666666` (`cor: "#333333"`)
  - Hover: `"sem mudança medida"`
  - Foco: `outlineStyle: "none → auto"`, `outlineColor: "rgb(51, 51, 51) → rgb(16, 16, 16)"`, `outlineWidth: "3px → 1px"`
- **Bullet Ativo (`componentes[8]`, `estados[6]`):**
  - Alvo: `span.swiper-pagination-bullet.swiper-pagination-bullet-active` (`quantidade: 1`)
  - Tamanho: `8x8px`, raio `50%`, padding `0 0 0 0`, cursor `pointer`
  - Fundo: `#253b59` (muda de `#666666` para `#253b59` quando o slide está ativo)
  - Foco: `outlineStyle: "none → auto"`, `outlineColor: "rgb(51, 51, 51) → rgb(16, 16, 16)"`, `outlineWidth: "3px → 1px"`

### 5. Cartões de Especialidades (Grade 3×3) e Blocos de Serviços (50/50)

- **Cartão de Especialidade (leitura do print `telas/desktop-inteira.jpg` + `movimento.transicoes[0]`):**
  - Estrutura vertical sem borda e sem sombra própria, direto sobre o fundo `#d3e6eb` da seção.
  - Imagem superior retangular (proporção aproximada `16:10`, leitura do print), canto reto (`raio: 0px`).
  - Título centralizado em `Montserrat 16px/700` linha `24px`, caixa-alta, cor `#253b59`, margem superior ~`15px`–`20px`.
  - Descrição alinhada à esquerda (ou justificada/centralizada conforme o bloco — leitura do print mostra alinhamento à esquerda) em `Montserrat 16px/400` linha `20px` ou `24px`, cor `#666666`.
  - Botão `SAIBA MAIS` (`107x31px`, `#218197`, raio `40px`) centralizado na base do cartão.
  - Transição dos contêineres de widget (`div.elementor-widget-container`, `n: 64` em `movimento.transicoes[0]`): `background, border, border-radius, box-shadow, -webkit-box-shadow · 0.3s · ease · atraso 0s`.
- **Cartão Horizontal de Serviço (`section.elementor-section.elementor-inner-section`, `n: 8` em `movimento.transicoes[3]`):**
  - Estrutura de 2 colunas (`50%` bloco de texto sobre fundo `#d3e6eb` com padding interno de `40px` a `50px`; `50%` fotografia preenchendo toda a altura do bloco — leitura do print `telas/notebook-inteira.jpg`).
  - Título alinhado à esquerda (`Montserrat 16px/700`, `#253b59`), texto justificado (`Montserrat 16px/400`, `#666666`) e botão `SAIBA MAIS` (`107x31px`, `#218197`) alinhado à esquerda.
  - Transição declarada: `background, border, border-radius, box-shadow · 0.3s, 0.3s, 0.3s, 0.3s · ease, ease, ease, ease · atraso 0s` (`movimento.transicoes[3]`).

### 6. Links de Contato, Marca e Política (`componentes[3, 6, 11, 13]`)

| Componente | Alvo | Texto / Papel | Tamanho | Fonte e Cor Normal | Transição / Hover | Estado Foco (`estados`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Link do Logotipo (`componentes[11]`, `estados[9]`)** | `a` | `""` (envolve a imagem do logo Physio no cabeçalho) | `83x98px` | `-apple-system 16px/400`, cor `#cc3366`, padding `0` | Transição `""`, hover sem mudança | `outlineStyle: none → auto`, `outlineColor: rgb(204, 51, 102) → rgb(16, 16, 16)`, `outlineWidth: 3px → 1px`, `outlineOffset: 0px → 1px` |
| **Links de Ícones Sociais (`componentes[3]`, `estados[2]`)** | `a` (`quantidade: 4`) | `""` (Instagram e Facebook no header e no rodapé) | `25x20px` | `Montserrat 16px/400`, cor herdada `#cc3366` (ícones renderizados em `#ffffff` no header e `#253b59` no rodapé — leitura do print) | Transição `""`, hover sem mudança | `outlineStyle: none → auto`, `outlineColor: rgb(204, 51, 102) → rgb(16, 16, 16)`, `outlineWidth: 3px → 1px`, `outlineOffset: 0px → 1px` |
| **Link de Telefone / WhatsApp (`componentes[6]`, `estados[4]`)** | `a` (`quantidade: 2`) | `(47) 98870 3007` | `135x21px` | `Montserrat 14px/500`, cor de link base `#cc3366` (span interno em `#ffffff`, `cores.texto[0]`) | Transição `""`, hover sem mudança | `outlineStyle: none → auto`, `outlineColor: rgb(204, 51, 102) → rgb(16, 16, 16)`, `outlineWidth: 3px → 1px`, `outlineOffset: 0px → 1px` |
| **Link Política no Rodapé (`componentes[13]`, `estados[11]`)** | `a` (`quantidade: 1`) | `POLÍTICA DE PRIVACIDADE` | `230x19px` | `Montserrat 16px/700`, cor `#cc3366`, caixa-alta | Transição `""`, hover sem mudança | `outlineStyle: none → auto`, `outlineColor: rgb(204, 51, 102) → rgb(16, 16, 16)`, `outlineWidth: 3px → 1px`, `outlineOffset: 0px → 1px` |

### 7. Componentes de Plugins Terceiros (Join.chat WhatsApp e Modal de Cookies)

- **Botão Flutuante WhatsApp (`div.joinchat__button`):**
  - Raio: `30px` (`raios[2]`); botão interno `.joinchat__button__open` com raio `50%` (`raios[3]`).
  - Sombra: `rgba(7, 94, 84, 0.24) 1px 6px 24px 0px` (`sombras[1]`).
  - Transição: `background-color · 0.2s · linear · atraso 0s` (`200ms`) (`movimento.transicoes[8]`).
- **Botão `Configurações de cookies` (`componentes[9]`, `estados[7]`):**
  - Alvo: `a.medium.cli-plugin-button`, tamanho `171x31px`, fonte `-apple-system 13px/400`, cor `#333333`, fundo `#dedfe0`, raio `0px`, padding `9px 12px 9px 12px`.
  - Hover: `backgroundColor` muda de `rgb(222, 223, 224)` (`#dedfe0`) para `rgb(178, 178, 179)` (`#b2b2b3`), sem transição declarada (`transicao: ""`).
- **Botão `Aceitar Todos` (`componentes[10]`, `estados[8]`):**
  - Alvo: `a#wt-cli-accept-all-btn.wt-cli-element.medium`, tamanho `101x31px`, fonte `-apple-system 13px/400`, cor `#ffffff`, fundo `#61a229`, raio `0px`, padding `9px 12px 9px 12px`.
  - Hover: `backgroundColor` muda de `rgb(97, 162, 41)` (`#61a229`) para `rgb(78, 130, 33)` (`#4e8221`), sem transição declarada (`transicao: ""`).
- **Link `política de privacidade` no Modal (`componentes[14]`, `estados[12]`):**
  - Alvo: `a`, tamanho `146x20px`, fonte `-apple-system 15px/400`, cor `#139900`, foco com `outlineColor: rgb(19, 153, 0) → rgb(16, 16, 16)`, `outlineWidth: 3px → 1px`, `outlineOffset: 0px → 1px`.

---

## Movimento

### 1. Tabela Atômica de Animações e Transições Ativas (`movimento`)

Cada linha abaixo documenta uma animação ou transição efetivamente medida em `movimento.animadosAgora`, `movimento.animacoesVivas`, `movimento.transicoes`, `movimento.aoCarregar`, `movimento.aoRolar`, `movimento.semTocar` e `movimento.aoPassarMouse`:

| # | Gatilho | Alvo (`alvo`) | Tipo e Nome | Propriedade(s) | Partida → Chegada | Duração (ms) | Atraso (ms) | Curva | Repetições | Ordem / Escalonamento | Fonte |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Ao carregar** (`inicioMs: 828`) e **Ao rolar/interagir** (`inicioMs: 8605`) | `a.elementor-button-link.elementor-button` (`SAIBA MAIS` / `VEJA MAIS`) | Transição (`visibility`) | `visibility` (e `all` declarado) | Oculto → visível (`all 0.3s ease`) | `300ms` (`0.3s`) | `0ms` | `ease` | `1` (`vezes: 10` ao carregar, `2` ao rolar) | 1º evento ao carregar (`828ms`) | `movimento.aoCarregar[0]`, `movimento.aoPassarMouse[11]`, `componentes[0].transicao` |
| **2** | **Ao carregar** (`inicioMs: 925`) | `section.elementor-section.elementor-top-section` (`"ESPECIALIDADES FISIOTERAPIA A "`) | CSSAnimation `fadeIn` | `opacity` | `0` → `1` | `1250ms` (`1.25s`) | `0ms` (`0s`) | `ease` | `1` (`normal`, `fill: none`) | 2º evento ao carregar (`925ms`), simultâneo ao ajuste de largura dos slides | `movimento.animadosAgora[0]`, `movimento.aoCarregar[5]`, `movimento.keyframes[34]` |
| **3** | **Ao carregar** (`inicioMs: 925`) / **Contínua no carrossel** | `div.elementor-repeater-item-66e7e92.swiper-slide`, `a3fa065`, `fa2599d`, `1f82751` (os 4 slides) | CSSTransition (`width` / `all`) | `width` | `0% width: 100%` → `100% width: 1440px` | `6000ms` (`6s`) | `0ms` | `ease` | `1` por ciclo (`n: 12` para os 4 slides × 3 instâncias com clones de loop do Swiper) | Inicia em `925ms` junto com a montagem do Swiper | `movimento.animacoesVivas[0..11]`, `movimento.transicoes[1]`, `movimento.aoCarregar[1..4]` |
| **4** | **Contínua / Sem tocar** (`inicioMs: 1003`), **Ao rolar** (`inicioMs: 4022`) e **Ao passar mouse** (`inicioMs: 5515`) | `div.swiper-wrapper.elementor-slides` | CSSTransition (`transform`) | `transform` (`translate3d` horizontal do carrossel) | Deslocamento horizontal de `-1440px` por slide (leitura de `video/sessao.webm` e `largura: 1440`) | `500ms` | `0ms` | `ease` (padrão Swiper; não isolado em `transicoes`) | A cada troca de slide (`vezes: 2` em `semTocar`, `1` em `aoRolar`, `2` em `aoPassarMouse`) | Dispara a transição de slide; `505ms` a `520ms` depois inicia o `fadeInUp` do texto | `movimento.semTocar[0]`, `movimento.aoRolar[0]`, `movimento.aoPassarMouse[10]`, `movimento.sozinho[0]` |
| **5** | **Após troca de slide** (`semTocar` em `1508ms`, `aoRolar` em `4542ms`, `aoPassarMouse` em `506ms`) | `div.swiper-slide-contents.animated` | CSSAnimation `fadeInUp` | `opacity`, `transform` | `0% { opacity: 0; transform: translate3d(0px, 100%, 0px); }` → `100% { opacity: 1; transform: none; }` | `1250ms` (`1.25s`) | `0ms` | `ease` (padrão Elementor `.animated`) | `1` por entrada de slide (`vezes: 12`) | Escalonado ~`505ms`–`520ms` após o início do `transform` de `div.swiper-wrapper.elementor-slides` | `movimento.semTocar[1]`, `movimento.aoRolar[1]`, `movimento.aoPassarMouse[0]`, `movimento.keyframes[38]` |
| **6** | **Contínua no slide ativo** | `div.swiper-slide-bg.elementor-ken-burns--active` | CSSTransition (`all`) | `all` (efeito Ken Burns de zoom lento no fundo do slide) | Escala normal → zoom do Ken Burns (valores exatos de `scale` não isolados em `quadros`; ver `Lacunas`) | `20000ms` (`20s`) | `0ms` (`0s`) | `ease` | Contínua enquanto o slide está ativo (`n: 1`) | Roda em paralelo durante toda a exibição do slide | `movimento.transicoes[6]` |
| **7** | **Ao carregar** (`inicioMs: 3624`) | `div.joinchat.joinchat--right` (botão flutuante WhatsApp) | CSSAnimation `joinchat_show` | `transform` | `0% transform: scale3d(0, 0, 0)` → `100% transform: scaleX(1)` | `500ms` | `10ms` | `linear` (com timing de quadro `cubic-bezier(0.18, 0.89, 0.32, 1.28)`) | `1` (`estado: "finished"`) | Entra em `3624ms` após o carregamento da página (~`2,7s` após o Hero) | `movimento.animacoesVivas[12]`, `movimento.aoCarregar[6]`, `movimento.keyframes[13]` |
| **8** | **Sem tocar / Ao carregar** (`inicioMs: 3657`, com `atraso: 5000`) | `div.joinchat__tooltip` (balão `"Podemos te ajudar?"`) | CSSAnimation `joinchat_tootlip` | `transform`, `opacity` | `0%: scaleY(0), opacity 0` → `1%–20%: scaleX(1), opacity 1` → `25%–100%: scaleX(1), opacity 0` | `20000ms` (`20s`) | `5000ms` (`5s`) | `linear` | `1` (`estado: "running"`) | Agendada em `3657ms` (`33ms` após `joinchat_show`), aparece na tela após `5000ms` de atraso (visível em `video/sessao.webm` `00:10`–`00:13`) | `movimento.animacoesVivas[13]`, `movimento.semTocar[2]`, `movimento.aoPassarMouse[17]`, `movimento.keyframes[16]` |
| **9** | **Ao entrar na tela / rolar durante interação** (`inicioMs: 8605`) | `section.elementor-section.elementor-inner-section` (bloco de Serviço 50/50) | CSSAnimation `fadeInLeft` | `opacity`, `transform` | `0% { opacity: 0; transform: translate3d(-100%, 0px, 0px); }` → `100% { opacity: 1; transform: none; }` | `1250ms` (`1.25s`) | `0ms` | `ease` | `1` (`vezes: 1`) | Dispara ao revelar o cartão de serviço par/esquerdo na rolagem (`8605ms`) | `movimento.aoPassarMouse[12]`, `movimento.keyframes[36]` |
| **10** | **Ao entrar na tela / rolar durante interação** (`inicioMs: 14034`) | `section.elementor-section.elementor-inner-section` (bloco de Serviço 50/50 seguinte, ex.: `TREINO DE MARCHA`) | CSSAnimation `fadeInRight` | `opacity`, `transform` | `0% { opacity: 0; transform: translate3d(100%, 0px, 0px); }` → `100% { opacity: 1; transform: none; }` | `1250ms` (`1.25s`) | `0ms` | `ease` | `1` (`vezes: 1`) | Dispara ao revelar o cartão de serviço ímpar/direito na rolagem (`14034ms`) | `movimento.aoPassarMouse[16]`, `movimento.keyframes[37]` |
| **11** | **Ao passar o mouse / focar** (`inicioMs: 3838` e `13874`) | `a.elementor-item` e `a.elementor-item.elementor-item-active` (links do menu) | CSSTransition (`all`) | `outline-color`, `outline-offset`, `outline-width`, `fill`, `color`, `transform`, `opacity` | Valores normais (`#ffffff` / `#253f5d`, `outline: none`) → estado de foco/hover | `400ms` (`0.4s`) | `0ms` (`0s`) | `ease` | A cada interação (`n: 5`) | Resposta imediata à interação no menu | `movimento.transicoes[4]`, `movimento.aoPassarMouse[4..10, 13..15]` |
| **12** | **Declarada em CSS (Containers e Paginação)** | `div.elementor-widget-container` (`n: 64`), `section.elementor-inner-section` (`n: 8`), `div.swiper-pagination` (`n: 12`), `div.elementor-background-overlay` (`n: 2`) | CSSTransition | `background, border, border-radius, box-shadow` (e `opacity` no overlay) | Estado base → hover (sem mudança visual medida) | `300ms` (`0.3s`) | `0ms` (`0s`) | `ease` | — | Transições preventivas padrões do Elementor | `movimento.transicoes[0, 2, 3, 5]` |
| **13** | **Declarada em CSS (Modal de Cookies)** | `div.cli-modal-backdrop.cli-fade` (`n: 1`) | CSSTransition | `opacity` | `0` → opacidade do backdrop | `500ms` (`0.5s`) | `0ms` (`0s`) | `ease-in-out` | `1` | Ao abrir/fechar o modal de cookies | `movimento.transicoes[7]` |
| **14** | **Declarada em CSS (Botão Join.chat)** | `div.joinchat__button` (`n: 1`) | CSSTransition | `background-color` | Cor base → cor hover | `200ms` (`0.2s`) | `0ms` (`0s`) | `linear` | A cada hover | Resposta imediata ao passar o mouse no botão flutuante | `movimento.transicoes[8]` |

---

### 2. Transcrição Completa dos Quadros (`movimento.keyframes`)

Abaixo estão transcritos todos os `@keyframes` medidos em `movimento.keyframes` (`[0]` a `[62]`), agrupados entre os que são **executados ativamente na página** e os **presentes nas folhas de estilo carregadas** (Animate.css / Elementor / Swiper / Join.chat):

#### A. Keyframes Executados na Sessão (`animadosAgora`, `animacoesVivas`, `aoCarregar`, `aoRolar`, `semTocar`, `aoPassarMouse`)

```css
/* 1. Entrada da seção Especialidades ao carregar (movimento.keyframes[34]) */
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* 2. Entrada dos títulos de cada slide do Hero (movimento.keyframes[38]) */
@keyframes fadeInUp {
  0% { opacity: 0; transform: translate3d(0px, 100%, 0px); }
  100% { opacity: 1; transform: none; }
}

/* 3. Entrada dos cartões horizontais de Serviços vindos da esquerda (movimento.keyframes[36]) */
@keyframes fadeInLeft {
  0% { opacity: 0; transform: translate3d(-100%, 0px, 0px); }
  100% { opacity: 1; transform: none; }
}

/* 4. Entrada dos cartões horizontais de Serviços vindos da direita (movimento.keyframes[37]) */
@keyframes fadeInRight {
  0% { opacity: 0; transform: translate3d(100%, 0px, 0px); }
  100% { opacity: 1; transform: none; }
}

/* 5. Entrada do botão flutuante de WhatsApp Join.chat (movimento.keyframes[13]) */
/* Nota: em animacoesVivas[12], os quadros computados aplicam cubic-bezier(0.18, 0.89, 0.32, 1.28) */
@keyframes joinchat_show {
  0% { transform: scale3d(0, 0, 0); }
  100% { transform: scaleX(1); }
}

/* 6. Exibição temporizada e ocultação do balão "Podemos te ajudar?" (movimento.keyframes[16]) */
@keyframes joinchat_tootlip {
  0% { opacity: 0; transform: scaleY(0); }
  1%, 20% { opacity: 1; transform: scaleX(1); }
  25%, 100% { opacity: 0; transform: scaleX(1); }
}
```

#### B. Demais Keyframes Carregados nas Folhas de Estilo (`movimento.keyframes`)

```css
/* Modal / Cookie Law Info (movimento.keyframes[0..3]) */
@keyframes blowUpContent { 0% { transform: scale(1); opacity: 1; } 99.9% { transform: scale(2); opacity: 0; } 100% { transform: scale(0); } }
@keyframes blowUpContentTwo { 0% { transform: scale(2); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes blowUpModal { 0% { transform: scale(0); } 100% { transform: scale(1); } }
@keyframes blowUpModalTwo { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(0); opacity: 0; } }

/* Spinners e Placeholders de UI — Elementor, Swiper, FontAwesome (movimento.keyframes[4..12, 17..18]) */
@keyframes eicon-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(359deg); } }
@keyframes dnd-placeholder-widget-vertical { 0% { transform-origin: 0px 50%; transform: translateX(50%) scaleX(0); opacity: 0; } 100% { transform-origin: 0px 50%; transform: translateX(50%) scaleX(1); opacity: 0.9; } }
@keyframes dnd-placeholder-widget-horizontal { 0% { transform-origin: 50% 0px; transform: scaleY(0); opacity: 0; } 100% { transform-origin: 50% 0px; transform: scaleY(1); opacity: 0.9; } }
@keyframes swiper-preloader-spin { 100% { transform: rotate(1turn); } }
@keyframes a { 0% { transform: rotate(0deg); } 100% { transform: rotate(359deg); } }
@keyframes fa-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(1turn); } }

/* Join.chat Auxiliares (movimento.keyframes[14..15]) */
@keyframes joinchat_badge_in { 0% { opacity: 0; transform: translate3d(0px, 50px, 0px); } 100% { opacity: 1; transform: translateZ(0px); } }
@keyframes joinchat_image_loop { 0% { opacity: 0; } 3%, 20% { opacity: 1; } 25%, 100% { opacity: 0; } }

/* Biblioteca Animate.css / Elementor Animations (movimento.keyframes[19..33, 35, 39..62]) */
@keyframes bounce { 20%, 53%, 80%, 0%, 100% { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); transform: translate3d(0px, 0px, 0px); } 40%, 43% { animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06); transform: translate3d(0px, -30px, 0px); } 70% { animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06); transform: translate3d(0px, -15px, 0px); } 90% { transform: translate3d(0px, -4px, 0px); } }
@keyframes flash { 50%, 0%, 100% { opacity: 1; } 25%, 75% { opacity: 0; } }
@keyframes pulse { 0%, 100% { transform: scale3d(1, 1, 1); } 50% { transform: scale3d(1.05, 1.05, 1.05); } }
@keyframes rubberBand { 0%, 100% { transform: scale3d(1, 1, 1); } 30% { transform: scale3d(1.25, 0.75, 1); } 40% { transform: scale3d(0.75, 1.25, 1); } 50% { transform: scale3d(1.15, 0.85, 1); } 65% { transform: scale3d(0.95, 1.05, 1); } 75% { transform: scale3d(1.05, 0.95, 1); } }
@keyframes shake { 0%, 100% { transform: translate3d(0px, 0px, 0px); } 10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0px, 0px); } 20%, 40%, 60%, 80% { transform: translate3d(10px, 0px, 0px); } }
@keyframes headShake { 0% { transform: translateX(0px); } 6.5% { transform: translateX(-6px) rotateY(-9deg); } 18.5% { transform: translateX(5px) rotateY(7deg); } 31.5% { transform: translateX(-3px) rotateY(-5deg); } 43.5% { transform: translateX(2px) rotateY(3deg); } 50% { transform: translateX(0px); } }
@keyframes swing { 20% { transform: rotate3d(0, 0, 1, 15deg); } 40% { transform: rotate3d(0, 0, 1, -10deg); } 60% { transform: rotate3d(0, 0, 1, 5deg); } 80% { transform: rotate3d(0, 0, 1, -5deg); } 100% { transform: rotate3d(0, 0, 1, 0deg); } }
@keyframes tada { 0%, 100% { transform: scale3d(1, 1, 1); } 10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); } 30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); } 40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); } }
@keyframes wobble { 0%, 100% { transform: none; } 15% { transform: translate3d(-25%, 0px, 0px) rotate3d(0, 0, 1, -5deg); } 30% { transform: translate3d(20%, 0px, 0px) rotate3d(0, 0, 1, 3deg); } 45% { transform: translate3d(-15%, 0px, 0px) rotate3d(0, 0, 1, -3deg); } 60% { transform: translate3d(10%, 0px, 0px) rotate3d(0, 0, 1, 2deg); } 75% { transform: translate3d(-5%, 0px, 0px) rotate3d(0, 0, 1, -1deg); } }
@keyframes jello { 11.1%, 0%, 100% { transform: none; } 22.2% { transform: skewX(-12.5deg) skewY(-12.5deg); } 33.3% { transform: skewX(6.25deg) skewY(6.25deg); } 44.4% { transform: skewX(-3.125deg) skewY(-3.125deg); } 55.5% { transform: skewX(1.5625deg) skewY(1.5625deg); } 66.6% { transform: skewX(-0.78125deg) skewY(-0.78125deg); } 77.7% { transform: skewX(0.390625deg) skewY(0.390625deg); } 88.8% { transform: skewX(-0.195312deg) skewY(-0.195312deg); } }
@keyframes bounceIn { 20%, 40%, 60%, 80%, 0%, 100% { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); } 20% { transform: scale3d(1.1, 1.1, 1.1); } 40% { transform: scale3d(0.9, 0.9, 0.9); } 60% { opacity: 1; transform: scale3d(1.03, 1.03, 1.03); } 80% { transform: scale3d(0.97, 0.97, 0.97); } 100% { opacity: 1; transform: scale3d(1, 1, 1); } }
@keyframes bounceInDown { 60%, 75%, 90%, 0%, 100% { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: translate3d(0px, -3000px, 0px); } 60% { opacity: 1; transform: translate3d(0px, 25px, 0px); } 75% { transform: translate3d(0px, -10px, 0px); } 90% { transform: translate3d(0px, 5px, 0px); } 100% { transform: none; } }
@keyframes bounceInLeft { 60%, 75%, 90%, 0%, 100% { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: translate3d(-3000px, 0px, 0px); } 60% { opacity: 1; transform: translate3d(25px, 0px, 0px); } 75% { transform: translate3d(-10px, 0px, 0px); } 90% { transform: translate3d(5px, 0px, 0px); } 100% { transform: none; } }
@keyframes bounceInRight { 60%, 75%, 90%, 0%, 100% { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: translate3d(3000px, 0px, 0px); } 60% { opacity: 1; transform: translate3d(-25px, 0px, 0px); } 75% { transform: translate3d(10px, 0px, 0px); } 90% { transform: translate3d(-5px, 0px, 0px); } 100% { transform: none; } }
@keyframes bounceInUp { 60%, 75%, 90%, 0%, 100% { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: translate3d(0px, 3000px, 0px); } 60% { opacity: 1; transform: translate3d(0px, -20px, 0px); } 75% { transform: translate3d(0px, 10px, 0px); } 90% { transform: translate3d(0px, -5px, 0px); } 100% { transform: translate3d(0px, 0px, 0px); } }
@keyframes fadeInDown { 0% { opacity: 0; transform: translate3d(0px, -100%, 0px); } 100% { opacity: 1; transform: none; } }
@keyframes lightSpeedIn { 0% { transform: translate3d(100%, 0px, 0px) skewX(-30deg); opacity: 0; } 60% { transform: skewX(20deg); opacity: 1; } 80% { transform: skewX(-5deg); opacity: 1; } 100% { transform: none; opacity: 1; } }
@keyframes rotateIn { 0% { transform-origin: center center; transform: rotate3d(0, 0, 1, -200deg); opacity: 0; } 100% { transform-origin: center center; transform: none; opacity: 1; } }
@keyframes rotateInDownLeft { 0% { transform-origin: left bottom; transform: rotate3d(0, 0, 1, -45deg); opacity: 0; } 100% { transform-origin: left bottom; transform: none; opacity: 1; } }
@keyframes rotateInDownRight { 0% { transform-origin: right bottom; transform: rotate3d(0, 0, 1, 45deg); opacity: 0; } 100% { transform-origin: right bottom; transform: none; opacity: 1; } }
@keyframes rotateInUpLeft { 0% { transform-origin: left bottom; transform: rotate3d(0, 0, 1, 45deg); opacity: 0; } 100% { transform-origin: left bottom; transform: none; opacity: 1; } }
@keyframes rotateInUpRight { 0% { transform-origin: right bottom; transform: rotate3d(0, 0, 1, -90deg); opacity: 0; } 100% { transform-origin: right bottom; transform: none; opacity: 1; } }
@keyframes rollIn { 0% { opacity: 0; transform: translate3d(-100%, 0px, 0px) rotate3d(0, 0, 1, -120deg); } 100% { opacity: 1; transform: none; } }
@keyframes zoomIn { 0% { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); } 50% { opacity: 1; } }
@keyframes zoomInDown { 0% { opacity: 0; transform: scale3d(0.1, 0.1, 0.1) translate3d(0px, -1000px, 0px); animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19); } 60% { opacity: 1; transform: scale3d(0.475, 0.475, 0.475) translate3d(0px, 60px, 0px); animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1); } }
@keyframes zoomInLeft { 0% { opacity: 0; transform: scale3d(0.1, 0.1, 0.1) translate3d(-1000px, 0px, 0px); animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19); } 60% { opacity: 1; transform: scale3d(0.475, 0.475, 0.475) translate3d(10px, 0px, 0px); animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1); } }
@keyframes zoomInRight { 0% { opacity: 0; transform: scale3d(0.1, 0.1, 0.1) translate3d(1000px, 0px, 0px); animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19); } 60% { opacity: 1; transform: scale3d(0.475, 0.475, 0.475) translate3d(-10px, 0px, 0px); animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1); } }
@keyframes zoomInUp { 0% { opacity: 0; transform: scale3d(0.1, 0.1, 0.1) translate3d(0px, 1000px, 0px); animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19); } 60% { opacity: 1; transform: scale3d(0.475, 0.475, 0.475) translate3d(0px, -60px, 0px); animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1); } }
@keyframes slideInDown { 0% { transform: translate3d(0px, -100%, 0px); visibility: visible; } 100% { transform: translate3d(0px, 0px, 0px); } }
@keyframes slideInLeft { 0% { transform: translate3d(-100%, 0px, 0px); visibility: visible; } 100% { transform: translate3d(0px, 0px, 0px); } }
@keyframes slideInRight { 0% { transform: translate3d(100%, 0px, 0px); visibility: visible; } 100% { transform: translate3d(0px, 0px, 0px); } }
@keyframes slideInUp { 0% { transform: translate3d(0px, 100%, 0px); visibility: visible; } 100% { transform: translate3d(0px, 0px, 0px); } }
@keyframes elementor-animation-pulse { 25% { transform: scale(1.1); } 75% { transform: scale(0.9); } }
@keyframes elementor-animation-pulse-grow { 100% { transform: scale(1.1); } }
@keyframes elementor-animation-pulse-shrink { 100% { transform: scale(0.9); } }
@keyframes elementor-animation-push { 50% { transform: scale(0.8); } 100% { transform: scale(1); } }
@keyframes elementor-animation-pop { 50% { transform: scale(1.2); } }
@keyframes elementor-animation-bob { 0% { transform: translateY(-8px); } 50% { transform: translateY(-4px); } 100% { transform: translateY(-8px); } }
@keyframes elementor-animation-bob-float { 100% { transform: translateY(-8px); } }
@keyframes elementor-animation-hang { 0% { transform: translateY(8px); } 50% { transform: translateY(4px); } 100% { transform: translateY(8px); } }
@keyframes elementor-animation-hang-sink { 100% { transform: translateY(8px); } }
@keyframes elementor-animation-wobble-vertical { 16.65% { transform: translateY(8px); } 33.3% { transform: translateY(-6px); } 49.95% { transform: translateY(4px); } 66.6% { transform: translateY(-2px); } 83.25% { transform: translateY(1px); } 100% { transform: translateY(0px); } }
@keyframes elementor-animation-wobble-horizontal { 16.65% { transform: translateX(8px); } 33.3% { transform: translateX(-6px); } 49.95% { transform: translateX(4px); } 66.6% { transform: translateX(-2px); } 83.25% { transform: translateX(1px); } 100% { transform: translateX(0px); } }
@keyframes elementor-animation-wobble-to-bottom-right { 16.65% { transform: translate(8px, 8px); } 33.3% { transform: translate(-6px, -6px); } 49.95% { transform: translate(4px, 4px); } 66.6% { transform: translate(-2px, -2px); } 83.25% { transform: translate(1px, 1px); } 100% { transform: translate(0px, 0px); } }
@keyframes elementor-animation-wobble-to-top-right { 16.65% { transform: translate(8px, -8px); } 33.3% { transform: translate(-6px, 6px); } 49.95% { transform: translate(4px, -4px); } 66.6% { transform: translate(-2px, 2px); } 83.25% { transform: translate(1px, -1px); } 100% { transform: translate(0px, 0px); } }
@keyframes elementor-animation-wobble-top { 16.65% { transform: skew(-12deg); } 33.3% { transform: skew(10deg); } 49.95% { transform: skew(-6deg); } 66.6% { transform: skew(4deg); } 83.25% { transform: skew(-2deg); } 100% { transform: skew(0deg); } }
@keyframes elementor-animation-wobble-bottom { 16.65% { transform: skew(-12deg); } 33.3% { transform: skew(10deg); } 49.95% { transform: skew(-6deg); } 66.6% { transform: skew(4deg); } 83.25% { transform: skew(-2deg); } 100% { transform: skew(0deg); } }
@keyframes elementor-animation-wobble-skew { 16.65% { transform: skew(-12deg); } 33.3% { transform: skew(10deg); } 49.95% { transform: skew(-6deg); } 66.6% { transform: skew(4deg); } 83.25% { transform: skew(-2deg); } 100% { transform: skew(0deg); } }
@keyframes elementor-animation-buzz { 50% { transform: translateX(3px) rotate(2deg); } 100% { transform: translateX(-3px) rotate(-2deg); } }
@keyframes elementor-animation-buzz-out { 10% { transform: translateX(3px) rotate(2deg); } 20% { transform: translateX(-3px) rotate(-2deg); } 30% { transform: translateX(3px) rotate(2deg); } 40% { transform: translateX(-3px) rotate(-2deg); } 50% { transform: translateX(2px) rotate(1deg); } 60% { transform: translateX(-2px) rotate(-1deg); } 70% { transform: translateX(2px) rotate(1deg); } 80% { transform: translateX(-2px) rotate(-1deg); } 90% { transform: translateX(1px) rotate(0deg); } 100% { transform: translateX(-1px) rotate(0deg); } }
```

---

## Interações

> [!IMPORTANT]
> A chave `interacoes` do `absorcao.json` retornou vazia (`interacoes: []`) e não foram gerados prints `interacao-NN.jpg` em `arquivos.prints` porque o modal de consentimento de cookies (`fixos[0]`, `z: 9999`) e seu backdrop em tela cheia (`fixos[1]`, `div.cli-modal-backdrop.cli-fade`, `z: 1040`) permaneceram abertos durante toda a sessão (`lacunas[2]`). Abaixo estão documentados todos os mecanismos interativos medidos em `gatilhos`, `fixos`, `movimento` e observados nos prints/vídeo, apontando explicitamente o que ficou bloqueado pelo modal.

### 1. Submenus Dropdown da Navegação Principal (`gatilhos[0]`, `gatilhos[1]`)

| Propriedade | Submenu 1 — Especialidades (`gatilhos[0]`) | Submenu 2 — Serviços (`gatilhos[1]`) | Fonte |
| :--- | :--- | :--- | :--- |
| **Gatilho (`alvo`)** | `a#sm-17953161519301572-1.elementor-item.has-submenu` (`texto: "ESPECIALIDADES"`) | `a#sm-17953161519301572-3.elementor-item.has-submenu` (`texto: "SERVIÇOS"`) | `gatilhos[0..1]` |
| **Atributos ARIA Medidos** | `papel: "a"`, `expandido: "false"`, `popup: "true"`, `controla: "sm-17953161519301572-2"`, `naNavegacao: true` | `papel: "a"`, `expandido: "false"`, `popup: "true"`, `controla: "sm-17953161519301572-4"`, `naNavegacao: true` | `gatilhos[0..1]` |
| **O que abre e de onde sai** | Lista dropdown (`ul#sm-17953161519301572-2`) posicionada imediatamente abaixo do item `ESPECIALIDADES` no cabeçalho (indicada pela seta `▼` ao lado do texto em `telas/desktop-dobra.jpg`). Os links internos fazem parte dos `57` links contabilizados em `secoes[0].conteudo.links`. | Lista dropdown (`ul#sm-17953161519301572-4`) posicionada abaixo do item `SERVIÇOS` no cabeçalho. | `gatilhos[0..1]`, `secoes[0].conteudo.links`, leitura do print `telas/desktop-dobra.jpg` |
| **Tamanho, Posição, Fundo e Animação** | **Não medidos** (o menu não foi aberto na sessão; `interacoes: []`). Registrado em `Lacunas`. | **Não medidos** (`interacoes: []`). Registrado em `Lacunas`. | `interacoes`, `Lacunas` |
| **Comportamento de Foco no Gatilho** | `outlineStyle: "none → auto"` (`estados[1].foco`), com transição `all · 0.4s · ease` (`componentes[2].transicao`). | `outlineStyle: "none → auto"` (`estados[1].foco`), com transição `all · 0.4s · ease`. | `componentes[2]`, `estados[1]` |

### 2. Menu Hambúrguer Mobile / Tablet / Notebook (`responsivo[1..3]`, `telas/notebook-dobra.jpg`)

- **Onde aparece:** Em `1024px` (`notebook`), `768px` (`tablet`) e `390px` (`celular`), os 5 links de `nav.elementor-nav-menu--main` desaparecem (`linksVisiveis: 0`, `altura: 0` em `responsivo[1..3].navegacao`) e surge à direita do cabeçalho um botão com ícone de 3 barras horizontais brancas (`telas/notebook-dobra.jpg`, `telas/tablet-dobra.jpg`, `telas/celular-dobra.jpg`).
- **Observação da medição:** O detector automático registrou `botaoDeMenu: false` em `responsivo[1..3].navegacao` porque o Elementor renderiza o gatilho do menu mobile como `<div class="elementor-menu-toggle" role="button">` em vez de `<button>`. Por isso, a gaveta/dropdown mobile não foi acionada (`interacoes: []`); suas medidas abertas estão listadas em `Lacunas`.

### 3. Modal de Consentimento de Cookies — Aberto ao Carregar (`fixos[0]`, `fixos[1]`, `secoes[3]`, `componentes[9, 10, 14]`)

- **O que abre e de onde sai:** Modal centralizado (`div#cookie-law-info-bar.cli-bar-popup.cli-modal-content`), exibido automaticamente no carregamento da página (`comSessao: false`).
- **Tamanho e Posição:**
  - Em Desktop (`1440x900`): `posicao: "fixed"`, `largura: 500px`, `altura: 221px`, `topo: "450px"`, `base: "337.5px"` (centralizado com `transform: translate(-50%, -50%)` na viewport — leitura do print `telas/desktop-dobra.jpg`), `z: "9999"` (`fixos[0]`).
  - Em Tablet (`768px`) e Celular (`390px`): aparece também mapeado em `responsivo[2].secoes[3]` (`altura: 189px`, `padding: "25 25 25 25"`) e `responsivo[3].secoes[3]` (`altura: 225px`, `padding: "25 25 25 25"`).
- **Estilo da Caixa do Modal:** Fundo `#ffffff` (`fixos[0].fundo`), raio de borda `3.2px` (`raios[1]`), sombra `rgba(172, 171, 171, 0.3) 0px -1px 10px 0px` (`sombras[0]`).
- **Fundo Atrás (Backdrop):** `div.cli-modal-backdrop.cli-fade` (`fixos[1]`, `secoes[3]`), `posicao: "fixed"`, `topo: "0px"`, `base: "0px"`, `largura: 1440px`, `altura: 900px` (`768px` em notebook, `1024px` em tablet, `844px` em celular conforme `responsivo`), `z: "1040"`, cor `#000000`, `desfoque: ""` (sem `backdrop-filter`; escurecimento por opacidade sobre a página).
- **Animação de Entrada e Saída:**
  - Backdrop: transição `opacity · 0.5s · ease-in-out · atraso 0s` (`500ms`) (`movimento.transicoes[7]`).
  - Modal: keyframes `blowUpModal` (`0% { transform: scale(0); } 100% { transform: scale(1); }`) e `blowUpModalTwo` (`0% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(0); opacity: 0; }`) presentes na folha do plugin (`movimento.keyframes[2..3]`).
- **Como fecha e Controles Internos:**
  - Botão primário `Aceitar Todos` (`a#wt-cli-accept-all-btn.wt-cli-element.medium`, `101x31px`, fundo `#61a229` → hover `rgb(78, 130, 33)`, texto `#ffffff`, padding `9 12 9 12` em `componentes[10]`).
  - Botão secundário `Configurações de cookies` (`a.medium.cli-plugin-button`, `171x31px`, fundo `#dedfe0` → hover `rgb(178, 178, 179)`, texto `#333333`, padding `9 12 9 12` em `componentes[9]`).
  - Link `política de privacidade` (`146x20px`, cor `#139900` em `componentes[14]`).
- **O que acontece com o foco:** Os botões do modal têm `foco: "sem mudança medida"` (`estados[7..8]`), enquanto o link `política de privacidade` aplica `outlineStyle: "none → auto"`, `outlineColor: "rgb(19, 153, 0) → rgb(16, 16, 16)"`, `outlineWidth: "3px → 1px"`, `outlineOffset: "0px → 1px"` (`estados[12]`). O modal não trava o foco do teclado (focus trap ausente), pois os links e botões da página atrás do backdrop receberam foco durante a varredura (`estados[0..6, 9..11]`).

### 4. Widget Flutuante de WhatsApp — Join.chat (`div.joinchat.joinchat--right`)

- **Posição e Tamanho:** Fixo no canto inferior direito (`telas/desktop-dobra.jpg`), botão circular verde com raio `30px` (`div.joinchat__button`, `raios[2]`) / `50%` (`div.joinchat__button__open`, `raios[3]`) e sombra `rgba(7, 94, 84, 0.24) 1px 6px 24px 0px` (`sombras[1]`).
- **Animação de Entrada:** Entra em `3624ms` após o carregamento com `joinchat_show` (`scale3d(0, 0, 0)` → `scaleX(1)`, duração `500ms`, atraso `10ms`, curva `cubic-bezier(0.18, 0.89, 0.32, 1.28)` em `movimento.animacoesVivas[12]`).
- **Interação de Tooltip e Hover:** Exibe o balão `"Podemos te ajudar?"` à esquerda do botão (`div.joinchat__tooltip`) via animação `joinchat_tootlip` (`duracao: 20000ms`, `atraso: 5000ms` em `movimento.animacoesVivas[13]`) e também ao passar o mouse (`movimento.aoPassarMouse[17]`). O botão possui transição de hover `background-color · 0.2s · linear · atraso 0s` (`movimento.transicoes[8]`).

---

## Tempos automáticos

Há **três comportamentos automáticos** que acontecem sem o usuário tocar na página, medidos em `movimento.sozinho`, `movimento.semTocar`, `movimento.animacoesVivas`, `movimento.transicoes` e confirmados quadro a quadro em `video/sessao.webm`:

| # | Componente / Alvo | O que acontece sozinho | Intervalo / Ciclo (ms) | Duração da Transição / Animação (ms) | O que muda a cada ciclo | Fonte |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Carrossel Hero (Troca de Slide)**<br>`div.swiper-wrapper.elementor-slides` + `div.swiper-slide-contents.animated` + `div.elementor-repeater-item-*.swiper-slide` | O carrossel avança automaticamente pelos 4 slides em loop contínuo:<br>- Slide 1 (`00:02`–`00:07`): `ATENDIMENTO EXCLUSIVO E PERSONALIZADO`<br>- Slide 2 (`00:08`–`00:12`): `FISIOTERAPIA DE RESULTADOS`<br>- Slide 3 (`00:13`–`00:17`): `REFERÊNCIA EM REABILITAÇÃO NEUROLÓGICA INFANTIL`<br>- Slide 4 (`00:18`–`00:23`): `ESTUDO, INOVAÇÃO E EXCELÊNCIA TERAPÊUTICA`<br>- Retorno ao Slide 1 (`00:24`). | **`5000ms` a `6000ms` por slide** (`duracao: 6000` em `animacoesVivas[0..11]` e `semTocar[3..6]`; no vídeo `video/sessao.webm` as trocas ocorrem exatamente nos segundos `00:08`, `00:13`, `00:18` e `00:24`, ou seja, a cada ~`5000ms`–`6000ms`), com **escalonamento interno de `520ms`** (`movimento.sozinho[0].intervaloMs: 520`, `vezes: 4`) entre a mutação de `style` do wrapper e a entrada do conteúdo. | - Deslizamento do wrapper (`transform`): **`500ms`** (`semTocar[0]` em `inicioMs: 1003`)<br>- Entrada do título (`fadeInUp`): **`1250ms`** (`semTocar[1]` em `inicioMs: 1508`, iniciando `505ms`–`520ms` após o início do deslizamento). | 1. `div.swiper-wrapper.elementor-slides` muda `style` (`transform: translate3d(...)`) deslizando `1440px` para a esquerda em `500ms`.<br>2. O bullet ativo (`span.swiper-pagination-bullet-active`) muda o fundo de `#666666` para `#253b59` (`componentes[4, 8]`).<br>3. `505ms`–`520ms` depois, o bloco de texto `div.swiper-slide-contents.animated` executa `fadeInUp` (`opacity: 0 → 1`, `translate3d(0, 100%, 0) → none`) durante `1250ms`. | `movimento.sozinho[0]`, `movimento.semTocar[0..1, 3..6]`, `movimento.animacoesVivas[0..11]`, `video/sessao.webm` (`00:02`–`00:25`) |
| **2** | **Fundo do Slide Ativo (Efeito Ken Burns)**<br>`div.swiper-slide-bg.elementor-ken-burns--active` | Zoom contínuo lento na camada de fundo do slide enquanto ele está visível. | Contínuo durante a exibição do slide | **`20000ms` (`20s`)**, curva `ease`, atraso `0s` | A propriedade `all` (`transform: scale(...)`) da `div.swiper-slide-bg.elementor-ken-burns--active` interpola continuamente ao longo de `20s`. | `movimento.transicoes[6]` |
| **3** | **Entrada e Balão Automático do WhatsApp**<br>`div.joinchat.joinchat--right` e `div.joinchat__tooltip` | O botão flutuante surge após o carregamento e, segundos depois, abre e fecha sozinho o balão `"Podemos te ajudar?"`. | Disparo único temporizado após o load: botão entra em **`3624ms`**; animação do balão inicia em **`3657ms`** com **`atraso: 5000ms`** (aparece em ~`8657ms` / `00:10` do vídeo e recolhe após `20%` de `20000ms`, ou seja, fica visível por **`4000ms`** até `00:14` do vídeo). | - Entrada do botão (`joinchat_show`): **`500ms`** (`atraso: 10ms`)<br>- Ciclo do balão (`joinchat_tootlip`): **`20000ms`** (`atraso: 5000ms`, curva `linear`). | - Em `3624ms`: o botão cresce de `scale3d(0,0,0)` para `scaleX(1)` em `500ms`.<br>- Após `5000ms` de atraso: o tooltip passa de `opacity: 0; scaleY(0)` (`0%`) para `opacity: 1; scaleX(1)` (`1%` a `20%` = `4s` visível) e desaparece para `opacity: 0; scaleX(1)` (`25%` a `100%`). | `movimento.aoCarregar[6]`, `movimento.semTocar[2]`, `movimento.animacoesVivas[12..13]`, `video/sessao.webm` (`00:05`, `00:10`–`00:14`) |

---

## Responsivo

### 1. Pontos de Quebra Medidos (`quebras` e `mediaQueries`)

- **Vetor de quebras (`quebras`):** `320`, `479`, `480`, `481`, `575`, `576`, `600`, `767`, `768`, `781`, `782`, `800`, `985`, `991`, `992`, `1024`, `1025`, `1200`, `1439`, `1440`, `99999` (px).
- **Principais Media Queries estruturais (`mediaQueries`):**
  - **Elementor Desktop / Notebook:** `(min-width: 1025px)` vs. `(max-width: 1024px)` e `screen and (max-width: 1024px)` — ponto exato onde a navegação horizontal é substituída pelo menu hambúrguer (`responsivo[1].navegacao`).
  - **Elementor Tablet / Mobile:** `(min-width: 768px) and (max-width: 1024px)` vs. `(max-width: 767px)` e `screen and (max-width: 767px)` — ponto onde as grades de 3 colunas (`ESPECIALIDADES` e `Rodapé`) e de 2 colunas (`SERVIÇOS`) empilham em 1 coluna única.
  - **Sub-quebras de ajuste fino e plugins (Bootstrap / WordPress / Join.chat / Cookie Law Info):** `(min-width: 1440px)`, `(max-width: 1439px)`, `(min-width: 1200px)`, `(max-width: 992px)`, `(max-width: 991px)`, `(max-width: 985px)`, `(max-width: 800px)`, `(min-width: 782px)`, `(max-width: 781px)`, `(min-width: 600px)`, `(max-width: 600px)`, `(min-width: 576px)`, `(max-width: 575px)`, `(max-width: 480px)`, `(max-width: 479px)`, `only screen and (max-width: 479px) and (min-width: 320px)`.
  - **Queries de interação e acessibilidade:** `(hover: hover)`, `(prefers-reduced-motion: reduce)`, `(prefers-reduced-motion)`.

### 2. Comparativo das 4 Larguras Medidas (`responsivo[0..3]` e Leitura dos Prints)

| Aspecto | Desktop (`1440px`) | Notebook (`1024px`) | Tablet (`768px`) | Celular (`390px`) | Fonte |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Altura Total da Página (`alturaPagina`)** | `6403px` | `6197px` | `6866px` | `11991px` | `responsivo[0..3].alturaPagina` |
| **Rolagem Horizontal** | `false` | `false` | `false` | `false` | `responsivo[0..3].rolagemHorizontal` |
| **Tipografia de Corpo / Título Seção (`corpo`)** | `27px/500 linha 40.5px` (`h1: ""`, `h2: ""`) | `27px/500 linha 40.5px` | `27px/500 linha 40.5px` | `27px/500 linha 40.5px` (título Hero `40px` transborda à direita no celular: `"ATENDIMENT..."` cortado em `telas/celular-dobra.jpg`) | `responsivo[0..3]`, leitura do print `telas/celular-dobra.jpg` |
| **Navegação (`navegacao`)** | `linksVisiveis: 5`, `altura: 46px`, menu horizontal completo + 2 ícones sociais à direita | `linksVisiveis: 0`, `altura: 0px`; menu horizontal e ícones sociais do header somem, entra ícone hambúrguer (`3 barras`) à direita | `linksVisiveis: 0`, `altura: 0px`; ícone hambúrguer à direita, logo reduzido à esquerda | `linksVisiveis: 0`, `altura: 0px`; topbar centraliza os 2 telefones e main bar exibe logo à esquerda e hambúrguer à direita | `responsivo[0..3].navegacao`, leitura dos prints `telas/*-dobra.jpg` |
| **Seção 1 — Cabeçalho (`secoes[0]`)** | `altura: 151px`, `colunas: 1`, `padding: 0` | `altura: 109px`, `colunas: 1`, `padding: 0` | `altura: 86px`, `colunas: 1`, `padding: 0` | `altura: 99px`, `colunas: 1`, `padding: 0` | `responsivo[0..3].secoes[0]` |
| **Seção 2 — Corpo Principal (`secoes[1]`)** | `altura: 5736px`, `colunas: 1`, `padding: 0` | `altura: 5491px`, `colunas: 1`, `padding: 0` | `altura: 6091px`, `colunas: 1`, `padding: 0` | `altura: 10527px`, `colunas: 1`, `padding: 0` | `responsivo[0..3].secoes[1]` |
| **Grade de Especialidades (Interna à Seção 2)** | **3 colunas × 3 linhas** | **3 colunas × 3 linhas** (cartões mais estreitos, texto quebra em mais linhas) | **3 colunas × 3 linhas** (colunas bem estreitas, títulos quebram em 2 linhas, ex.: `PALMILHAS E / PODOPOSTUROLOGIA`) | **1 coluna × 9 linhas** (todos os 9 cartões empilham verticalmente ocupando 100% da largura útil) | Leitura dos prints `telas/desktop-inteira.jpg`, `telas/notebook-inteira.jpg`, `telas/tablet-inteira.jpg`, `telas/celular-inteira.jpg` |
| **Blocos de Serviços (Internos à Seção 2)** | **2 colunas (50% / 50%)** lado a lado | **2 colunas (50% / 50%)** lado a lado (`TREINO DE MARCHA` visível) | **2 colunas (50% / 50%)** lado a lado (`TREINO DE MARCHA` visível) | **1 coluna** empilhada (área vertical aumenta para `10527px`) | Leitura dos prints `telas/notebook-inteira.jpg`, `telas/tablet-inteira.jpg`, `telas/celular-inteira.jpg` |
| **Seção 3 — Rodapé (`secoes[2]`)** | `altura: 515px`: 3 colunas na faixa principal (`#238ca4`) + 3 colunas na barra inferior (`#253b59`) | `altura: 596px`: mantém **3 colunas** nas duas faixas | `altura: 689px`: mantém **3 colunas** nas duas faixas (textos mais verticais) | `altura: 1365px`: faixa principal (`#238ca4`) **empilha em 1 coluna** (Clínica → Redes → Horário); barra inferior (`#253b59`) mantém logo/crédito/copyright compactados | `responsivo[0..3].secoes[2]`, leitura dos prints `telas/*-inteira.jpg` |
| **Modal de Cookies e Backdrop (`secoes[3..4]`)** | Backdrop `altura: 900px`; modal fixo `500x221px` ao centro | Backdrop `altura: 768px`; modal fixo ao centro | Modal mapeado em `secoes[3]` com `altura: 189px`, `padding: "25 25 25 25"`; backdrop em `secoes[4]` com `altura: 1024px` | Modal mapeado em `secoes[3]` com `altura: 225px`, `padding: "25 25 25 25"` ocupando quase toda a largura de `390px`; backdrop em `secoes[4]` com `altura: 844px` | `responsivo[0..3].secoes[3..4]`, leitura dos prints `telas/tablet-dobra.jpg`, `telas/celular-dobra.jpg` |

---

## Receita de reprodução

Siga os 7 passos abaixo na ordem para reconstruir a experiência completa do zero, sem abrir o site de referência e sem depender do WordPress ou do Elementor (`bibliotecas`).

### Passo 1 — Base, Reset e Tokens CSS

1. Configure o documento com `lang="pt-BR"`, `margin: 0`, `box-sizing: border-box` e `overflow-x: hidden` para garantir `rolagemHorizontal: false` (`janela.rolagemHorizontal`, `responsivo[0..3].rolagemHorizontal`).
2. Declare no `:root` o bloco de variáveis da seção **Tokens** deste dossiê:
   - Superfícies: `--cor-fundo-pagina: #ffffff`, `--cor-superficie-suave: #d3e6eb`, `--cor-superficie-marca: #238ca4`, `--cor-superficie-marca-escura: #218197`, `--cor-superficie-profunda: #253b59`, `--cor-destaque-grifo: #7b8c86`, `--cor-overlay-hero: rgba(0, 0, 0, 0.27)`.
   - Textos e acentos: `--cor-texto-inverso: #ffffff`, `--cor-texto-titulo: #253b59`, `--cor-texto-nav-ativo: #253f5d`, `--cor-texto-corpo: #666666`, `--cor-acento-primario: #218197`, `--cor-acento-link: #cc3366`.
   - Raios e sombras: `--raio-botao-pilula: 40px`, `--raio-flutuante: 30px`, `--raio-circular: 50%`, `--sombra-flutuante: rgba(7, 94, 84, 0.24) 1px 6px 24px 0px`.

### Passo 2 — Tipografia e Ícones

1. Importe a família **Montserrat** (Google Fonts, licença SIL OFL) com os pesos `100`, `300`, `400`, `500`, `600` e `700` (`fontes.uso`).
2. Aplique `font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` no `body`, com `letter-spacing: 0` em toda a escala (`escalaTipografica`).
3. Configure as classes tipográficas exatas (`escalaTipografica[0..16]`):
   - `.t-hero`: `font-size: 40px; font-weight: 600; line-height: 66px; text-transform: uppercase; color: #ffffff;` (com `mark { background-color: #7b8c86; color: #ffffff; padding: 0 8px; }`).
   - `.t-secao`: `font-size: 27px; font-weight: 500; line-height: 41px; text-transform: uppercase; color: #253b59;`.
   - `.t-card-titulo`: `font-size: 16px; font-weight: 700; line-height: 24px; text-transform: uppercase; color: #253b59;`.
   - `.t-card-corpo`: `font-size: 16px; font-weight: 400; line-height: 24px; color: #666666;` (ou `line-height: 20px` em textos densos).
   - `.t-botao`: `font-size: 15px; font-weight: 500; line-height: 15px; text-transform: uppercase;`.
   - `.t-nav`: `font-size: 12px; font-weight: 500; line-height: 20px; text-transform: uppercase;`.
   - `.t-rodape`: `font-size: 14px; font-weight: 400; line-height: 21px; color: #ffffff;` (com `strong { font-weight: 700; line-height: 16px; }`, e-mail em `15px/100 linha 23px`, créditos em `11px/400 linha 17px` e copyright em `10px/400 linha 15px`).
4. Para os ícones (WhatsApp, telefone, Instagram, Facebook, setas de submenu e hambúrguer), use SVGs inline (`midia.svgsEmLinha: 14`) no lugar de carregar `fa-solid-900.woff2`, `fa-brands-400.woff2` e `eicons.woff2` (`fontes.arquivos`).

### Passo 3 — Estrutura e Divisores Curvos (Shape Dividers)

1. **Cabeçalho (`header`, altura total `151px` em `1440px`, `posicao: static`):**
   - **Faixa 1 (Topbar):** fundo `#218197`, altura ~`33px`, container centralizado (`max-width: 1140px`), `display: flex; justify-content: flex-end; align-items: center; gap: 20px;`. Insira o link de WhatsApp (`Montserrat 14px/500 linha 21px`, `#ffffff`) e o telefone fixo (`Montserrat 15px/300`, `#ffffff`).
   - **Faixa 2 (Main Bar):** fundo `#238ca4`, altura ~`118px`, container centralizado (`max-width: 1140px`), `display: flex; justify-content: space-between; align-items: center;`. À esquerda, link do logotipo (`83x98px`, `componentes[11]`); à direita, `<nav>` (`altura: 46px`) + 2 links de ícones sociais (`25x20px`, `#ffffff`).
2. **Hero Carrossel (`section.hero`, largura `100%`, altura ~`590px`, `position: relative; overflow: hidden;`):**
   - Crie a faixa de slides e sobreponha `div.hero-overlay` com `background: rgba(0, 0, 0, 0.27)` (`cores.fundo[0]`) e `transition: background 0.3s ease, border-radius 0.3s ease, opacity 0.3s ease` (`movimento.transicoes[5]`).
   - Na base do Hero (`z-index: 2`), insira um SVG de divisor de forma curvo côncavo (arco suave descendente no centro e ascendente nas bordas, preenchido com `#d3e6eb`, cor da seção Especialidades abaixo — leitura do print `telas/desktop-dobra.jpg`).
3. **Seção Especialidades (`section.especialidades`, fundo `#d3e6eb`, padding vertical `50px` a `80px`):**
   - Container centralizado (`max-width: 1140px`).
   - Título `ESPECIALIDADES` centralizado (`.t-secao`) com um divisor horizontal curto (`width: 60px; height: 2px; background: #218197; margin: 10px auto 40px;`).
   - Grade CSS de **3 colunas × 3 linhas** (`display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 30px; row-gap: 40px;`) contendo os 9 cartões.
   - Abaixo da grade (`margin-top: 40px`), centralize o botão secundário `VEJA MAIS`.
   - Na base da seção, adicione um SVG divisor curvo convexo suave fazendo a transição de `#d3e6eb` para `#ffffff` (`telas/desktop-inteira.jpg`).
4. **Seção Serviços (`section.servicos`, fundo `#ffffff`, padding vertical `50px` a `80px`):**
   - Container centralizado (`max-width: 1140px`).
   - Título `SERVIÇOS` centralizado (`.t-secao`) + traço `#218197` abaixo.
   - Lista vertical de 6 blocos horizontais (`display: flex; flex-direction: column; gap: 40px;`). Cada bloco (`section.servico-card`) é uma grade de **2 colunas (50% / 50%) sem gap** (`display: grid; grid-template-columns: 1fr 1fr;`):
     - Nos blocos ímpares: coluna esquerda com fundo `#d3e6eb`, `padding: 45px 40px`, título `.t-card-titulo`, descrição `.t-card-corpo` justificada e botão `SAIBA MAIS`; coluna direita com imagem `width: 100%; height: 100%; object-fit: cover;`.
     - Nos blocos pares: inverta a ordem (imagem à esquerda, bloco `#d3e6eb` à direita).
   - Feche a seção com o segundo botão contornado `VEJA MAIS` centralizado (`margin-top: 50px`).
5. **Rodapé (`footer`, altura total `515px` em `1440px`):**
   - **Faixa 1 (`#238ca4`):** precedida por divisor SVG curvo convexo no topo (`#238ca4` sobre `#ffffff`). Container centralizado (`max-width: 1140px`, `padding: 60px 20px`), grade de **3 colunas** (`grid-template-columns: repeat(3, 1fr); gap: 30px;`):
     - Coluna 1: título, endereço, e-mail (`15px/100`) e telefones.
     - Coluna 2: título, chamada de redes sociais e 2 ícones (`Instagram` e `Facebook` em `#253b59`).
     - Coluna 3: título, horários com dias em `<strong>` (`14px/700`) e link `POLÍTICA DE PRIVACIDADE` (`Montserrat 16px/700`, cor `#cc3366`).
   - **Faixa 2 (`#253b59`):** container centralizado, `display: flex; justify-content: space-between; align-items: center; padding: 15px 20px;`, com logo branco à esquerda, crédito ao centro (`11px/400`) e copyright à direita (`10px/400`).

### Passo 4 — Componentes e Estados

1. **Botão Primário (`.btn-primario`, `107x31px`):**
   ```css
   .btn-primario {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     min-width: 107px;
     height: 31px;
     padding: 8px;
     background-color: var(--cor-acento-primario); /* #218197 */
     color: var(--cor-texto-inverso); /* #ffffff */
     font: 500 15px/15px 'Montserrat', sans-serif;
     text-transform: uppercase;
     text-decoration: none;
     border: none;
     border-radius: var(--raio-botao-pilula); /* 40px */
     cursor: pointer;
     transition: all 0.3s ease;
   }
   .btn-primario:focus-visible { outline: auto; }
   ```
2. **Botão Secundário Contornado (`.btn-secundario`, `144x37px`):**
   ```css
   .btn-secundario {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     min-width: 144px;
     height: 37px;
     padding: 10px 30px;
     background-color: transparent;
     color: var(--cor-acento-primario); /* #218197 */
     font: 500 15px/15px 'Montserrat', sans-serif;
     text-transform: uppercase;
     text-decoration: none;
     border: 1px solid var(--cor-acento-primario);
     border-radius: var(--raio-botao-pilula); /* 40px */
     cursor: pointer;
     transition: all 0.3s ease;
   }
   .btn-secundario:focus-visible { outline: auto; }
   ```
3. **Links da Navegação Principal (`.nav-link`, altura `46px`):**
   ```css
   .nav-link {
     display: inline-flex;
     align-items: center;
     height: 46px;
     padding: 13px 20px;
     color: var(--cor-texto-inverso); /* #ffffff */
     font: 500 12px/20px 'Montserrat', sans-serif;
     text-transform: uppercase;
     text-decoration: none;
     transition: all 0.4s ease;
   }
   .nav-link.is-active {
     color: var(--cor-texto-nav-ativo); /* #253f5d */
   }
   ```
4. **Bullets de Paginação do Carrossel (`.bullet`, `8x8px`):**
   ```css
   .bullet {
     width: 8px;
     height: 8px;
     border-radius: 50%;
     background-color: #666666;
     border: none;
     padding: 0;
     cursor: pointer;
     transition: all 0.3s ease;
   }
   .bullet.is-active {
     background-color: #253b59;
   }
   ```

### Passo 5 — Movimento e Tempos Automáticos (CSS Puro + IntersectionObserver + JS Leve)

- **Técnica original vs. Alternativa recomendada:** O site original carrega `Swiper`, `jQuery`, `WordPress` e `Elementor` (`bibliotecas`). Para reproduzir sem dependências pesadas:
  1. **Carrossel Hero (Alternativa sem Swiper/jQuery):**
     - Use um container flexível `.slides-track` com `display: flex; transition: transform 500ms ease;` (`movimento.semTocar[0]`).
     - Configure um `setInterval` de **`5500ms`** (dentro da janela medida de `5000ms`–`6000ms` em `animacoesVivas[0..11]` e `video/sessao.webm`) que atualiza `transform: translate3d(-${index * 100}%, 0, 0)`.
     - Ao iniciar a troca do slide (`t = 0ms`), aguarde **`520ms`** (`movimento.sozinho[0].intervaloMs: 520`) e adicione a classe `.is-entering` no `.slide-contents`, disparando `@keyframes fadeInUp` com `animation: fadeInUp 1250ms ease forwards` (`movimento.semTocar[1]`).
     - Na camada de fundo do slide ativo (`.slide-bg.is-active`), aplique o efeito Ken Burns com `transition: all 20s ease` (`movimento.transicoes[6]`), alternando de `transform: scale(1)` para `transform: scale(1.15)` enquanto o slide estiver ativo.
  2. **Revelação ao Carregar e ao Rolar (Alternativa sem Elementor Waypoints):**
     - Ao carregar a página (`925ms`), dispare `animation: fadeIn 1250ms ease 0s 1 normal none` na seção `ESPECIALIDADES` (`movimento.animadosAgora[0]`).
     - Use `IntersectionObserver` (`threshold: 0.15`) nos blocos horizontais de `SERVIÇOS` (`section.servico-card`): ao entrar na tela, aplique `animation: fadeInLeft 1250ms ease forwards` nos cartões que entram pela esquerda e `animation: fadeInRight 1250ms ease forwards` nos cartões que entram pela direita (`movimento.aoPassarMouse[12, 16]`).
  3. **Botão Flutuante de WhatsApp e Balão Temporizado (CSS Puro):**
     - Agende a entrada do botão flutuante para `3624ms` após o carregamento com `animation: joinchat_show 500ms cubic-bezier(0.18, 0.89, 0.32, 1.28) 10ms forwards` (`movimento.animacoesVivas[12]`, `movimento.aoCarregar[6]`).
     - No balão `.joinchat__tooltip`, aplique `animation: joinchat_tootlip 20000ms linear 5000ms 1 forwards` (`movimento.animacoesVivas[13]`), fazendo-o surgir `5s` após o botão, permanecer visível por `4s` (`1%` a `20%` de `20s`) e desaparecer suavemente.

### Passo 6 — Interações (Dropdowns, Menu Mobile e Banner LGPD)

1. **Submenus de Navegação (`ESPECIALIDADES` e `SERVIÇOS`):**
   - Construa os gatilhos com `aria-haspopup="true"` e `aria-expanded="false"`, controlando a lista `<ul>` subordinada (`gatilhos[0..1]`). Abra o submenu no `:hover` / `:focus-within` em desktop (`>= 1025px`) e por clique em telas menores, fechando com `Escape` ou clique fora.
2. **Menu Hambúrguer (`<= 1024px`):**
   - Exiba um `<button aria-label="Abrir menu" aria-expanded="false">` com ícone de 3 barras brancas à direita do cabeçalho (`telas/notebook-dobra.jpg`). Ao clicar, abra a lista vertical com os 5 itens de navegação abaixo da barra principal (`#238ca4`).
3. **Banner de Cookies (Opcional / Recomendação de UX):**
   - Se o projeto exigir aviso LGPD, prefira uma barra inferior não-bloqueante em vez do modal central com backdrop escuro (`fixos[0..1]`), ou garanta que o fechamento salve o consentimento imediatamente, evitando bloquear a leitura do Hero como ocorreu na referência.

### Passo 7 — Responsivo (`mediaQueries` e `responsivo`)

1. **`@media (max-width: 1024px)` (Notebook e Tablet):**
   - Oculte `.nav-main` e os ícones sociais do cabeçalho (`linksVisiveis: 0`, `altura: 0`); exiba o botão hambúrguer (`responsivo[1..2].navegacao`).
   - Reduza a altura do cabeçalho de `151px` para `109px` (em `1024px`) e `86px` (em `768px`) (`responsivo[1..2].secoes[0]`).
   - Mantenha a grade de `ESPECIALIDADES` em **3 colunas**, os blocos de `SERVIÇOS` em **2 colunas (50/50)** e o `Rodapé` em **3 colunas** (`telas/notebook-inteira.jpg`, `telas/tablet-inteira.jpg`).
2. **`@media (max-width: 767px)` (Celular — `390px`):**
   - Empilhe a grade de `ESPECIALIDADES` em **1 coluna** (`grid-template-columns: 1fr;`), os cartões 50/50 de `SERVIÇOS` em **1 coluna** (imagem acima, texto abaixo) e as 3 colunas do `Rodapé` principal (`#238ca4`) em **1 coluna** (`telas/celular-inteira.jpg`).
   - **Correção obrigatória sobre a referência:** em `390px`, o título `.t-hero` de `40px` corta palavras longas como `"ATENDIMENTO"` (`telas/celular-dobra.jpg`). Reduza `.t-hero` para `clamp(24px, 6.5vw, 32px)` com `line-height: 1.4` no mobile para eliminar o truncamento horizontal.

---

## Com a marca do cliente

### 1. O que é estrutura e comportamento (Fica igual)

- A divisão arquitetônica em **4 zonas**: Cabeçalho utilitário/institucional em duas faixas → Carrossel Hero full-width com curva côncava inferior → Catálogo duplo (Grade 3×3 para visão geral rápida + Blocos horizontais 50/50 alternados para serviços de destaque) → Rodapé em duas faixas (3 colunas informativas + barra de assinatura) com botão flutuante de conversão rápida (WhatsApp).
- Os **divisores curvos (shape dividers)** nas transições entre seções (Hero → Especialidades → Serviços → Rodapé), que quebram a rigidez dos blocos retangulares.
- O **ritmo de movimento**: transição de slide em `500ms` seguida de entrada do título `fadeInUp` (`1250ms`) com atraso escalonado de `520ms`, zoom Ken Burns lento de `20s` no fundo, entrada alternada `fadeInLeft` / `fadeInRight` (`1250ms`) nos blocos 50/50 ao rolar, e botões pílula (`raio: 40px`) com transição de `300ms ease`.

### 2. O que é token (Troca pela marca do cliente)

- **Paleta cromática:**
  - `--cor-superficie-marca` (`#238ca4`) e `--cor-superficie-marca-escura` (`#218197`) → cor institucional primária do cliente e sua variação 10% mais escura.
  - `--cor-superficie-profunda` (`#253b59`) e `--cor-texto-titulo` (`#253b59`) → cor escura de contraste da marca do cliente.
  - `--cor-superficie-suave` (`#d3e6eb`) → tom pastel/superfície suave derivado da cor primária do cliente (85%–92% de luminosidade).
  - `--cor-destaque-grifo` (`#7b8c86`) → cor de grifo (`<mark>`) que mantenha contraste mínimo de `4.5:1` com o texto do Hero.
  - `--cor-acento-link` (`#cc3366`) → cor de apoio/destaque para links utilitários.
- **Tipografia:**
  - Substituir `Montserrat` pela família tipográfica da marca do cliente, preservando a relação de escala (`40px` display / `27px` seção / `16px` título de card e corpo / `15px` botão / `14px` rodapé / `12px` menu).

### 3. Ajustes necessários quando a marca ou o conteúdo mudam

- **Quando a paleta muda de escura/saturada para clara (ex.: cabeçalho e rodapé claros):**
  - Na referência, o cabeçalho (`#238ca4` / `#218197`) e o rodapé (`#238ca4` / `#253b59`) usam fundo escuro/médio com texto branco (`#ffffff`) e títulos internos em marinho (`#253b59`). Se o cliente usar cabeçalho branco ou creme claro, inverta `--cor-texto-inverso` no cabeçalho para `--cor-texto-titulo`, adicione uma borda inferior sutil (`1px solid rgba(0,0,0,0.08)`) e mantenha o botão de WhatsApp da topbar destacado com a cor de acento.
  - No Hero, se os slides tiverem fundo claro, troque o overlay `--cor-overlay-hero` de preto `rgba(0,0,0,0.27)` para um gradiente ou véu claro, ou mantenha o texto em `--cor-texto-titulo` com `<mark>` no acento da marca.
- **Quando a fonte do cliente é mais larga ou mais estreita que a Montserrat:**
  - A `Montserrat` é uma geométrica de largura generosa (o que causou o corte de `"ATENDIMENTO"` em `40px` na tela de `390px` — `telas/celular-dobra.jpg`).
  - Se a nova fonte for **ainda mais larga** (ex.: * Syne*, *Plus Jakarta Sans* bold/extended), reduza o degrau do Hero de `40px` para `34px`–`36px` em desktop e os links do menu de `12px` com `padding: 13px 20px` para `padding: 13px 14px`.
  - Se a nova fonte for **mais estreita/condensada** (ex.: *Inter*, *DM Sans*, *Roboto*), aumente levemente o `letter-spacing` dos títulos em caixa-alta para `0.04em`–`0.06em` (na referência é `0`), compensando a perda de presença horizontal.
- **Quando o cliente não tem foto nem vídeo:**
  - O site original não usa vídeos (`midia.videos: []`), mas depende de `19` fotografias clínicas no corpo (`secoes[1].conteudo.imagens: 19`) para dar calor humano à grade 3×3 e aos blocos 50/50.
  - Se o cliente não tiver fotos próprias de atendimento/infraestrutura:
    1. **Na grade 3×3 (Especialidades):** substitua a foto retangular superior por cartões com fundo branco `#ffffff` sobre a seção `--cor-superficie-suave` (`#d3e6eb`), adicionando um ícone vetorial grande (`48x48px`) na cor `--cor-acento-primario` dentro de um círculo suave no topo do cartão e `border-radius: 16px`.
    2. **Nos blocos 50/50 (Serviços):** converta a metade fotográfica em um painel tipográfico/numérico (`01`, `02`, `03` em `--cor-superficie-profunda` com lista de benefícios ou diagrama SVG técnico), ou substitua o zigue-zague 50/50 por uma grade de 2 colunas de cartões detalhados.
- **Quando o texto em português é mais longo:**
  - Nos cartões da grade 3×3, descrições com comprimentos diferentes desalinharam a altura dos botões `SAIBA MAIS` na referência (visível em `telas/desktop-inteira.jpg`, onde o botão de *Fisioterapia* fica mais baixo que os de *Palmilhas* e *Pilates*). Ao reconstruir, aplique `display: flex; flex-direction: column; height: 100%;` no cartão e `margin-top: auto;` no botão `SAIBA MAIS` para alinhar todos os 3 botões da mesma linha na base.
  - Nos botões `SAIBA MAIS` (`107x31px`, `padding: 8px`), use `min-width: 107px; padding: 8px 18px; width: auto;` para que rótulos mais longos (ex.: `"AGENDAR CONSULTA"`) não fiquem espremidos nas bordas laterais da pílula.

---

## Não copiar

Estes elementos pertencem exclusivamente à Clínica Physio (`clinicaphysio.com.br`) ou aos seus fornecedores e **não devem ser copiados**:

| Item Proibido | O que existe na referência | O que usar no lugar | Fonte |
| :--- | :--- | :--- | :--- |
| **Logotipo e Marca** | Logotipo vertical e horizontal `Physio` (símbolo antropomórfico/folha + tipografia) no cabeçalho (`83x98px`, `componentes[11]`), nas toucas/marca-d'água das fotos e no rodapé (`secoes[0, 2]`), bem como o logotipo da agência `Tatticas` no rodapé (`telas/desktop-inteira.jpg`). | Logotipo oficial em SVG/PNG do novo cliente e assinatura do próprio estúdio/projeto. | `secoes[0, 2]`, `componentes[11]`, `telas/desktop-inteira.jpg` |
| **Fotografias Clínicas e de Pacientes (`22` imagens)** | As 9 fotos das especialidades (sessões reais com fisioterapeutas, pacientes adultos, idosos, bebês e crianças na piscina e salas da clínica) e as fotos dos serviços (como a criança na esteira de `TREINO DE MARCHA` com órtese em `telas/notebook-inteira.jpg`). | Fotografias autorais do novo cliente (com termo de uso de imagem) ou banco de imagens licenciado coerente com o nicho do cliente; na ausência de fotos, usar os cartões com ícones/ilustrações descritos em *Com a marca do cliente*. | `midia.imagens: 22`, `secoes[1].conteudo.imagens: 19`, `telas/desktop-inteira.jpg`, `telas/notebook-inteira.jpg` |
| **Textos, Slogans e Dados de Contato** | As 4 frases do Hero (`descricao`), os textos descritivos das 9 especialidades e dos serviços (`TREINO DE MARCHA`), os telefones `(47) 98870 3007` e `(47) 3525 4471`, o e-mail `contato@clinicaphysio.com.br` e o endereço físico em Rio do Sul/SC (`escalaTipografica[6..7, 9, 13..16]`). | Copywriting original redigido para a proposta de valor, serviços, endereço e canais de atendimento do novo cliente. | `descricao`, `escalaTipografica` |
| **Código Legado e Plugins WordPress / Elementor** | Marcação DOM inchada de `div.elementor-*`, folhas de estilo inteiras da biblioteca `Animate.css` com dezenas de keyframes não utilizados (`bounce`, `rubberBand`, `tada`, `jello`, `wobble` em `movimento.keyframes`), e o modal de cookies bloqueante (`cookie-law-info-bar` + `cli-modal-backdrop`). | HTML5 semântico limpo (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`), CSS modular contendo apenas os 6 `@keyframes` utilizados e JavaScript nativo leve. | `bibliotecas`, `movimento.keyframes`, `fixos` |

---

## Lacunas

1. **Modal de cookies não fechado durante a captura (`lacunas[2]`, `fixos[0..1]`, `secoes[3]`):**
   - *O que aconteceu:* O popup `div#cookie-law-info-bar` (`500x221px`, `z: 9999`) e seu backdrop preto `div.cli-modal-backdrop.cli-fade` (`1440x900px`, `z: 1040`) permaneceram abertos em todos os prints (`telas/desktop-dobra.jpg` a `telas/celular-inteira.jpg`) e durante todo o vídeo (`video/sessao.webm`).
   - *O que isso impediu de medir/ver:*
     - O centro exato dos 4 títulos do carrossel Hero ficou encoberto pela caixa branca do modal (embora o texto completo tenha sido recuperado via `descricao`, `video/sessao.webm` e `telas/tablet-dobra.jpg`).
     - Os estados de `:hover` dos botões `SAIBA MAIS` (`componentes[0, 1]`), `VEJA MAIS` (`componentes[5, 7]`) e dos links de navegação (`componentes[2, 12]`) retornaram `"não deu para alcançar"` ou `"sem mudança medida"` porque o backdrop interceptou o ponteiro.
     - Nenhum clique de abertura de menu ou modal da página pôde ser efetivado (`interacoes: []`).
2. **Submenus de `ESPECIALIDADES` e `SERVIÇOS` e Gaveta Mobile fechados (`gatilhos[0..1]`, `interacoes: []`, `responsivo[1..3].navegacao`):**
   - *O que não foi medido:* Embora os dois gatilhos de submenu (`a#sm-17953161519301572-1` e `a#sm-17953161519301572-3`) e a contagem de `57` links no cabeçalho (`secoes[0].conteudo.links`) confirmem a existência dos dropdowns, e os prints de `1024px`, `768px` e `390px` mostrem o ícone hambúrguer, esses menus não foram abertos.
   - *O que isso impede de reproduzir com medida exata:* Cor de fundo, largura, padding, sombra, lista exata de itens e animação de abertura/fechamento dos dropdowns de `ESPECIALIDADES` / `SERVIÇOS` e da gaveta de navegação mobile.
3. **Blocos intermediários da seção `SERVIÇOS` não renderizados nos prints (`midia.preguicosas: 20`, `telas/desktop-inteira.jpg`, `telas/notebook-inteira.jpg`):**
   - *O que aconteceu:* Das `22` imagens da página, `20` têm lazy-loading (`midia.preguicosas: 20`) e os cartões `section.elementor-section.elementor-inner-section` (`n: 8` em `movimento.transicoes[3]`) dependem do gatilho de rolagem do Elementor (`fadeInLeft` / `fadeInRight`) para sair de `opacity: 0`. Em `telas/desktop-inteira.jpg` toda a faixa entre o título `SERVIÇOS` e o botão `VEJA MAIS` aparece em branco; em `telas/notebook-inteira.jpg`, `telas/tablet-inteira.jpg` e `video/sessao.webm` (`00:38`) apenas o último bloco (`TREINO DE MARCHA`) foi revelado.
   - *O que isso impede de reproduzir:* Os títulos e textos dos outros ~5 blocos horizontais de `SERVIÇOS` que ficam acima de `TREINO DE MARCHA` (a estrutura visual e animações `fadeInLeft` / `fadeInRight` de `1250ms`, contudo, são idênticas às do bloco `TREINO DE MARCHA` medido).
4. **1 elemento `<canvas>` na página (`lacunas[0]`, `midia.canvas: 1`, `naoLidos.canvas: 1`):**
   - *O que não foi medido:* O conteúdo interno do único `<canvas>` presente no DOM não foi inspecionado pelo coletor (`lacunas[0]`). Visualmente, nos prints e em `video/sessao.webm`, não há cena 3D, partículas ou WebGL visível (tratando-se provavelmente de um canvas utilitário oculto de script/detecção de emoji do WordPress).
5. **Valores inicial e final de escala do efeito Ken Burns e imagens de fundo do Hero (`movimento.transicoes[6]`):**
   - *O que não foi medido:* A transição `all · 20s · ease · atraso 0s` em `div.swiper-slide-bg.elementor-ken-burns--active` foi registrada em `movimento.transicoes[6]`, mas os fatores exatos de `transform: scale(...)` (padrão Elementor `scale(1)` → `scale(1.2)`) e eventuais URLs de `background-image` das `div.swiper-slide-bg` (além das cores de fundo `#7c8c87 @55%`, `#833ca3` e `#253b59` em `cores.fundo[1..3]`) não vieram detalhados no JSON.
6. **Folha do Google Fonts bloqueada na leitura estática (`naoLidos.folhasBloqueadas[0]`):**
   - *O que aconteceu:* A folha externa `https://fonts.googleapis.com/css?family=Montserrat...` foi listada em `naoLidos.folhasBloqueadas`, mas todas as regras computadas de família, peso, tamanho e altura de linha foram capturadas normalmente em `fontes.uso` e `escalaTipografica`.
7. **Páginas internas e fluxos secundários (`lacunas[1]`, `formularios: []`):**
   - *O que ficou de fora:* Apenas a Home (`https://clinicaphysio.com.br/`) foi absorvida; não há formulários na Home (`formularios: []`), e as páginas internas de cada especialidade/serviço, Sobre Nós e Contato não fazem parte desta medição.
