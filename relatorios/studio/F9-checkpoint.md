# F9 — checkpoint parcial

A F9 não fecha. Falta a jornada dos 7 itens, a resposta de D1 e a frase «GOAL STUDIO aceito».

## Comandos em 9 de novembro de 2026

`npm run typecheck` saiu com código 0.

`npx vitest run` nos 15 arquivos `tests/unit/studio.*.spec.ts`: 15 arquivos, 54 testes, todos passaram. O ffprobe imprimiu «moov atom not found» e «Invalid PNG signature» em arquivos de teste que não são mídia de verdade. Isso não derrubou o teste.

Não rodei `npm test` inteiro. Três testes de `tests/backend.spec.ts` já falham na master, fora do Studio.

`npm run build` em 9 de novembro de 2026 saiu com código 0. O HTML empacotado ficou em 691,9 KB, com Studio, Social, Flow e Edição injetados. O build avisou alterações locais, que já existiam fora do Studio.

`npm run test:studio:render` em 9 de novembro de 2026 saiu com código 0. O still ficou 1080×1350 e o clipe de prova 1080×1920, 30 fps, 3,00 s.

`npm run test:studio:reel` saiu com código 0. Narração das duas cenas, MP4 1080×1920, 30 fps, 2,00 s, pacote −14,0 LUFS, pico −2,6 dBTP, gancho com diferença 48,71.

`npm run test:motores:motion` não foi repetido. A prova anterior continua em `relatorios/motores/motion-2026-11-09T07-25-20.md`.

Em Configurações › Sistema, a seção Sistemas ligados mostra DarkFlow e Docuflow, os dois «no ar» (`17-sistemas.png`). Os botões iniciar e parar não foram usados.

## D1

A página [License FAQ](https://www.remotion.dev/docs/license/faq) diz que a licença gratuita vale para uma pessoa, para uma organização de até 3 pessoas e para certas entidades sem fins lucrativos. Fora isso, a Company License é paga. Não decidi em qual caso a TAVIR entra. Sem essa resposta, o GOAL não fecha.

## O que os 7 itens ainda não têm

| Item | Estado |
| --- | --- |
| Três perfis cadastrados na tela | ✅ na janela isolada: Multiverso Paranoico (Instagram e YouTube), TAVIR Oficial (Instagram) e TAVIR B2B (LinkedIn). O chip do Multiverso mostra `instagram, youtube · @multiverso` (`07-redes.png`). |
| Carrossel do Multiverso com imagens do Flow na pasta | parcial: prompts `MP-0001-S01` e `MP-0001-S02`, stills 1080×1350, e a tela mostra 2 de 2 frames. A revisão não abre porque os slots estão sem ativo. |
| Reel 1080×1920 com narração e −14 LUFS | parcial: na janela, a peça «A porta do arquivo» chegou ao pacote. Duas cenas, narração edge-tts, MP4 1080×1920, 30 fps, 2,00 s. O pacote mede −14,02 LUFS e pico −2,62 dBTP. O quadro do arquivo mostra «A porta abre.» (`reel-frame.png`). ❌ assistido no celular; ❌ whisper.cpp. O fundo é o quadro do motion, sem imagem do Flow. |
| Prévia igual ao arquivo | ✅ o telefone do carrossel mostra o still 1080×1350 (`08-previa.png`). O telefone do reel carrega o MP4 1080×1920 (`11-reel-previa.png`). A comparação com o celular ficou nos valores iniciais. |
| Preset novo aprovado na tela | ✅ um kit, no perfil de conformidade, não nos três perfis reais |
| Reel na agenda do DarkFlow | ✅ clique em «Aprovar publicação» na peça «A porta do arquivo» (`15-publicado.png`). Agenda `eea09b49-a0fd-4829-919a-dee2debe5857`, 2 dez 2026 às 10:00, status `agendado`, `editorial_attested` true. A sessão segue em simulação, sem publicação real. As métricas na tela ficam «—». |
| Roteiro longo no Docuflow | ✅ projeto `o-arquivo-de-1974-1794222367` parado em `research`. A tela Edição lista as composições que a API devolve: «Projeto vazio» e «Candidata aceite — M0 três cenas», com jobs vazios (`16-edicao.png`). Esse projeto de pesquisa não entra nessa lista. |
