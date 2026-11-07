# Como o Raio-X usa este vault

Esta pasta é o wiki compilado da Empresa Cognitiva, trazido de `AgenciaIA/knowledge` em 26/10/2026. São as páginas que a agência escreveu a partir das ingestões: 150 conceitos e o índice das 19 fontes.

O texto integral dos livros, artigos e vídeos ficou em `AgenciaIA/knowledge/raw`. Não foi copiado. O Raio-X consulta a compilação, não a obra.

## Fontes que alimentaram o wiki

Livros: $100M Offers e $100M Leads (Alex Hormozi), Influence e Pre-Suasion (Robert Cialdini), Thinking, Fast and Slow (Daniel Kahneman), Zero to One (Peter Thiel), Execution (Larry Bossidy e Ram Charan), Getting Things Done e Ready for Anything (David Allen), Hooked (Nir Eyal), Obviously Awesome (April Dunford), Predictably Irrational (Dan Ariely), The Mom Test (Rob Fitzpatrick), mais o capítulo perdido de $100M Offers.

Também entraram o canal do Alfredo Soares e três skills de design. A lista fechada está em `_INDEX.md`.

## Onde cada leitura puxa método

O módulo lê a definição da página em `/api/v1/raiox/metodo/{domínio}/{página}` e só entrega caminhos citados no catálogo.

- Estudo rápido: Mom Test, jornada da loja física, avaliações no ponto de venda.
- Diagnóstico: pre-mortem, framework Mom Test, distribuição.
- Leitura completa: posicionamento Dunford, alternativas competitivas, preço.
- Deep scan: alternativas, avaliações no Google, prova social.
- Ofertas seguintes (presença, atendimento, página, landing, oferta, catálogo, marca, automação, comércio, crescimento, conteúdo): a página correspondente no catálogo do módulo.

A devolutiva continua escolhendo uma oferta. O wiki ajuda a formular essa oferta. Não autoriza vender o pacote inteiro.
