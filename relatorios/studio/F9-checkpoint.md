# F9 — checkpoint parcial

A F9 não fecha. Falta a jornada dos 7 itens, a resposta de D1 e a frase «GOAL STUDIO aceito».

## Comandos em 9 de novembro de 2026

`npm run typecheck` saiu com código 0.

`npx vitest run` nos 15 arquivos `tests/unit/studio.*.spec.ts`: 15 arquivos, 53 testes, todos passaram. O ffprobe imprimiu «moov atom not found» e «Invalid PNG signature» em arquivos de teste que não são mídia de verdade. Isso não derrubou o teste.

Não rodei `npm test` inteiro. Três testes de `tests/backend.spec.ts` já falham na master, fora do Studio.

`npm run build` em 9 de novembro de 2026 saiu com código 0. O HTML empacotado ficou em 691,9 KB, com Studio, Social, Flow e Edição injetados. O build avisou alterações locais, que já existiam fora do Studio.

`npm run test:studio:render`, `npm run test:studio:reel` e `npm run test:motores:motion` não foram repetidos neste passo. As provas anteriores continuam em `relatorios/studio/F2`, `F7` e `relatorios/motores/motion-2026-11-09T07-25-20.md`.

## D1

A página [License FAQ](https://www.remotion.dev/docs/license/faq) diz que a licença gratuita vale para uma pessoa, para uma organização de até 3 pessoas e para certas entidades sem fins lucrativos. Fora isso, a Company License é paga. Não decidi em qual caso a TAVIR entra. Sem essa resposta, o GOAL não fecha.

## O que os 7 itens ainda não têm

| Item | Estado |
| --- | --- |
| Três perfis cadastrados na tela | ✅ na janela isolada: Multiverso Paranoico (Instagram e YouTube), TAVIR Oficial (Instagram) e TAVIR B2B (LinkedIn). O chip do Multiverso mostra `instagram, youtube · @multiverso` (`07-redes.png`). |
| Carrossel do Multiverso com imagens do Flow na pasta | parcial: prompts `MP-0001-S01` e `MP-0001-S02`, stills 1080×1350, e a tela agora mostra 2 de 2 frames (`06-frames.png`). A revisão não abre porque os slots estão sem ativo. Falta a imagem do Flow. |
| Reel 1080×1920 com narração e −14 LUFS | ✅ o arquivo `relatorios/studio/F7/reel-2cenas.mp4`; ❌ assistido no celular; ❌ whisper.cpp |
| Prévia igual ao arquivo | ✅ o telefone do carrossel mostra o still 1080×1350 (`08-previa.png`), com o título «O arquivo de 1974» e `@multiverso`. A comparação com o celular ficou nos valores iniciais. |
| Preset novo aprovado na tela | ✅ um kit, no perfil de conformidade, não nos três perfis reais |
| Reel na agenda do DarkFlow | ✅ simulação, agenda `b187a77d-a262-4a52-b72f-860c425037c0`; o clique foi um script, não o botão do app |
| Roteiro longo no Docuflow | ✅ projeto `o-arquivo-de-1974-1794222367` parado em `research`; a tela do Studio web não lista esse projeto |
