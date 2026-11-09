# F9 — checkpoint parcial

O Carlos respondeu em 9 de novembro de 2026. A D1 está fechada: a TAVIR entra na licença gratuita do Remotion. Ele escreveu «GOAL STUDIO aceito». O whisper.cpp 1.5.5 e o modelo `small` foram instalados em `motion/whisper.cpp`. A narração da peça «A porta do arquivo» virou 9 palavras. O pacote foi refeito: 1080×1920, 30 fps, 2,00 s, −14,0 LUFS, pico −2,6 dBTP.

## Comandos em 9 de novembro de 2026

`npm run typecheck` saiu com código 0.

`npx vitest run` nos 15 arquivos `tests/unit/studio.*.spec.ts`: 15 arquivos, 54 testes, todos passaram. O ffprobe imprimiu «moov atom not found» e «Invalid PNG signature» em arquivos de teste que não são mídia de verdade. Isso não derrubou o teste.

Não rodei `npm test` inteiro. Três testes de `tests/backend.spec.ts` já falham na master, fora do Studio.

`npm run build` em 9 de novembro de 2026 saiu com código 0. O HTML empacotado ficou em 691,9 KB, com Studio, Social, Flow e Edição injetados. O build avisou alterações locais, que já existiam fora do Studio.

`npm run test:studio:render` em 9 de novembro de 2026 saiu com código 0. O still ficou 1080×1350 e o clipe de prova 1080×1920, 30 fps, 3,00 s.

`npm run test:studio:reel` saiu com código 0. Narração das duas cenas, MP4 1080×1920, 30 fps, 2,00 s, pacote −14,0 LUFS, pico −2,6 dBTP, gancho com diferença 48,71.

`npm run test:motores:motion` não foi repetido. A prova anterior continua em `relatorios/motores/motion-2026-11-09T07-25-20.md`.

Em Configurações › Sistema, a seção Sistemas ligados mostra DarkFlow e Docuflow, os dois «no ar» (`17-sistemas.png`). Os botões iniciar e parar não foram usados.

O Social mostra o scorecard do DarkFlow como «—» (`19-social.png`). Seguidores, tendência, engajamento e melhor horário também ficam «—».

## D1

A página [License FAQ](https://www.remotion.dev/docs/license/faq) diz que a licença gratuita vale para uma pessoa, para uma organização de até 3 pessoas e para certas entidades sem fins lucrativos. O Carlos respondeu que a TAVIR entra na licença gratuita.

## O que os 7 itens ainda não têm

| Item | Estado |
| --- | --- |
| Três perfis cadastrados na tela | ✅ na janela isolada: Multiverso Paranoico (Instagram e YouTube), TAVIR Oficial (Instagram) e TAVIR B2B (LinkedIn). O chip do Multiverso mostra `instagram, youtube · @multiverso` (`07-redes.png`). |
| Carrossel do Multiverso com imagens do Flow na pasta | parcial: o Carlos aprovou a revisão. O pacote tem `01.png`, `02.png` e `capa.png` em 1080×1350, feitos das fotos 9:16 (`24-pacote.png`). `legenda.txt` e `hashtags.txt` estão vazios. A publicação de carrossel fica fora deste GOAL. São 2 imagens; a saída da F6 pede 3. |
| Reel 1080×1920 com narração e −14 LUFS | ✅ o Carlos assistiu no celular: tela vermelha e o áudio «a porta abre / o arquivo fica». O vermelho é o `vazio.png` de 1×1, porque as cenas não têm imagem do Flow. Depois do sim, o whisper.cpp gerou 9 palavras e o pacote foi refeito: 1080×1920, 30 fps, 2,00 s, −14,0 LUFS, pico −2,6 dBTP, gancho 48,62. |
| Prévia igual ao arquivo | ✅ o telefone do carrossel mostra o still 1080×1350 (`08-previa.png`). O telefone do reel carrega o MP4 1080×1920 (`11-reel-previa.png`). A comparação com o celular ficou nos valores iniciais. |
| Preset novo aprovado na tela | ✅ um kit, no perfil de conformidade, não nos três perfis reais |
| Reel na agenda do DarkFlow | ✅ clique em «Aprovar publicação» na peça «A porta do arquivo». A tela Flow lista essa agenda como `agendado`, junto com o `final.mp4` 1080×1920 na biblioteca (`18-flow.png`). A sessão segue em simulação. |
| Roteiro longo no Docuflow | ✅ o botão «Enviar para Edição» da peça «O arquivo longo» criou `o-arquivo-longo-o-arquivo-abre-a-pagina-fica-1794229792`, status `stopped:research`. «Abrir no Docuflow Studio» abriu `http://127.0.0.1:3000` e a página diz «Nenhum projeto» (`21-docuflow-janela.png`). |
