# Padrão de Prova Visual — o cliente vê antes de comprar

> Regra pétrea da TAVIR: **prova visual é peça de venda, não troféu de entrega.**
> Ela nasce depois dos requisitos aprovados e ANTES do orçamento fechar — nunca
> depois da construção. Fontes irmãs: `.agents/SITE_DELIVERY_STANDARD.md` (gate de
> saída: SEO + segurança), `.agents/WEB_REFERENCE_STANDARD.md` (extração de
> referências), `.agents/PROJECT_STANDARD.md` (contexto vivo).

## 1. Por que este padrão existe

O cliente não compra um documento de requisitos. Ele compra **o que consegue
enxergar**. Um protótipo que ele navega no próprio celular fecha mais que qualquer
tabela de escopo — e reduz o risco percebido, que é o que trava assinatura.

E nada aqui é retrabalho: o **design system** e o **esqueleto** que vendem o projeto
são exatamente a **spec que a fábrica constrói depois**. Desenha-se uma vez.

Contrapartida honesta, e o motivo do gate da seção 4: produzir prova visual completa
para todo lead é o jeito mais elegante de passar semanas sem falar com ninguém. A
métrica-mãe continua sendo **conversas/semana**. Prova visual serve a ela ou não roda.

## 2. Os sete entregáveis, na ordem de dependência

A ordem não é estética — cada item consome a saída do anterior. Pular ou inverter
produz retrabalho garantido.

| # | Entregável | Dono | Consome | Produz |
|---|-----------|------|---------|--------|
| 1 | **Cor e fonte consistentes** | Marina Marca | `brand-context`, requisitos | `tokens.md` — paleta, escala tipográfica, contraste |
| 2 | **Design system** | Yuri UX | tokens (1) | `design-system.md` + amostra viva HTML |
| 3 | **Esqueleto do site** | Yuri UX | requisitos, intenção→URL (SEO) | `esqueleto.md` — sitemap + wireframe por página |
| 4 | **Protótipo clicável** | Yuri UX | (2) + (3) | `prototipo/` — HTML estático navegável |
| 5 | **Cabeçalho animado** | Yuri UX | protótipo aprovado (4) | hero em movimento na home do protótipo |
| 6 | **Apresentação com fotos** | Marina Marca | (1)–(5) | `apresentacao/` — deck para a conversa de fechamento |
| 7 | **Infográfico** | Marina Marca | requisitos + (1) | a jornada/resultado em uma imagem |

Notas de dependência que importam:

- **(1) antes de (2).** Design system sem token de marca definido vira paleta genérica
  que a marca depois contradiz. Cor e fonte são decisão de marca, não de UI.
- **(3) antes de (4).** Esqueleto é arquitetura de informação; protótipo é o esqueleto
  vestido. Prototipar sem esqueleto é decorar antes de saber quantos cômodos a casa tem.
- **(5) por último e só se aprovado.** O cabeçalho animado (skill `scroll-world` ou
  equivalente) **gasta crédito real**. Não roda antes do cliente aprovar o protótipo
  estático, e nunca sem aprovação de custo do CEO.
- **(6) e (7) empacotam, não inventam.** Se a apresentação afirma algo que não está
  em (1)–(5) nem nos requisitos, é promessa — corte.

## 3. Quem faz o quê — fronteira Marina × Yuri

A divisão é por natureza da decisão, não por ferramenta:

- **Marina Marca decide QUEM a marca é.** Paleta, tipografia, tom, narrativa. Ela
  entrega os tokens (1) e empacota a história (6, 7). Não desenha componente nem tela.
- **Yuri UX decide COMO isso vira interface.** Componentes, estados, hierarquia,
  arquitetura de informação, navegação, movimento. Ele entrega (2)–(5). Não redefine
  paleta nem tipografia — se o token da Marina não funciona na tela, ele **devolve com
  o problema descrito**, não substitui em silêncio.

Conflito entre marca e usabilidade (ex.: cor da marca reprova contraste WCAG AA) sobe
ao CEO com as duas posições escritas. Nenhum dos dois decide sozinho contra o outro.

## 4. Dois níveis e o gate que impede desperdício

Nem todo lead merece o pacote inteiro. São dois níveis, e a passagem entre eles é um
gate humano explícito.

### Nível 1 — Esboço (todo projeto, barato, rápido)

Entregáveis **1, 3 e 7**: tokens de marca, esqueleto do site e infográfico.

Custo baixo, roda logo após os requisitos aprovados. Já é material suficiente para o
`/orcar` ilustrar a proposta e para o cliente entender o que vai receber.

### Nível 2 — Prova completa (sob gate)

Acrescenta **2, 4, 5 e 6**: design system, protótipo clicável, cabeçalho animado e
apresentação.

**Só roda quando as três condições forem verdadeiras:**

1. houve **conversa real** com o cliente (não e-mail frio, não suposição);
2. o cliente demonstrou **intenção concreta** — pediu proposta, discutiu prazo ou preço;
3. o **CEO autorizou** no gate (`office.py pedir ... chefe`), com o custo estimado à vista.

Falhou qualquer uma? Fica no Nível 1. Registrar o motivo no `PROJECT.md`.

O cabeçalho animado (5) tem gate próprio **dentro** do Nível 2, porque consome crédito
pago: só depois do protótipo estático aprovado pelo cliente.

## 5. Onde os artefatos vivem

Etapa `NN-prova-visual/` do workspace do projeto (criada por `tools/empresa.py`):

```
empresas/<empresa>/projetos/<tipo>/<projeto>/NN-prova-visual/
├── tokens.md            ← (1) Marina — cor, fonte, contraste
├── design-system.md     ← (2) Yuri — componentes, estados, espaçamento
├── design-system.html   ← (2) Yuri — amostra viva, abre no navegador
├── esqueleto.md         ← (3) Yuri — sitemap + wireframe por página
├── prototipo/           ← (4)(5) Yuri — HTML estático navegável
│   └── index.html
├── apresentacao/        ← (6) Marina — deck de fechamento
├── infografico.*        ← (7) Marina
└── NIVEL.md             ← nível rodado, gate, autorização e motivo
```

`NIVEL.md` é obrigatório mesmo no Nível 1 — é ele que prova que o gate foi respeitado.

## 6. Como alimenta o resto da esteira

- **→ Comercial (`/orcar`):** infográfico e apresentação entram na versão-CLIENTE da
  proposta; o link do protótipo entra como prova navegável. O escopo continua vindo do
  documento de requisitos — prova visual **ilustra** o escopo, não o amplia. O que
  aparece no protótipo e não está nos requisitos precisa entrar na spec ou sair do
  protótipo, antes da proposta sair.
- **→ Fábrica (`/lp-construir`, `/ec-construir`, `/crm-construir`):** design system e
  esqueleto são **spec de construção**, não inspiração. O construtor implementa os
  tokens e componentes aprovados; divergência vira decisão registrada, não improviso.
- **→ Nina SEO:** o esqueleto (3) tem de refletir o mapa intenção→URL do
  `.agents/SEO_GROWTH_STANDARD.md`. Estrutura de páginas inventada no wireframe e
  contradita pelo SEO depois é retrabalho caro.
- **→ Auditor Seg/LGPD:** protótipo é estático e **nunca** recebe dado real de cliente,
  formulário funcional, credencial ou integração viva. É maquete. Se precisar simular
  formulário, o envio é inerte.

## 7. Regras invioláveis

1. **Protótipo não promete o que a fábrica não constrói.** Em dúvida de viabilidade,
   confirme com o CTO antes de mostrar ao cliente. Maquete que vende o impossível vira
   aditivo hostil ou prejuízo.
2. **Nada de foto, ícone ou fonte sem licença de uso comercial.** Registre a origem e a
   licença de cada asset em `tokens.md`. Placeholder é marcado como placeholder.
3. **Não inventar conteúdo do cliente.** Texto e número que aparecem no protótipo saem
   dos requisitos ou vêm marcados `[EXEMPLO]`. Cliente que vê o próprio faturamento
   errado num deck perde a confiança na entrega inteira.
4. **Acessibilidade é parte do design system, não polimento posterior.** Contraste
   mínimo AA, foco visível, alvo de toque ≥ 44px, hierarquia de heading real.
5. **Prova visual não substitui requisitos aprovados.** `[PRECISA ESCLARECER]` pendente
   trava a prova visual pelo mesmo motivo que trava o orçamento — não se desenha em
   cima de ambiguidade que muda arquitetura.
6. **Quem desenha não aprova o próprio trabalho.** O gate é do CEO; no que for site
   público, SEO e segurança seguem com seus donos independentes.
7. **Toda execução termina com registro** no `PROJECT.md` do projeto e no `_LOG.md` do
   braço de origem.
