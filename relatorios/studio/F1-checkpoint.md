# F1 — checkpoint

Branch `studio`. A F0 já está em `origin/studio` (`4092b1c`). A F1 fica local até o “ok F1”.

## Portão

| Item | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ exit 0 |
| `npm run build` | ✅ `dist/renderer/index.html`, Studio e Social injetados |
| Teste de fixtures | ✅ `tests/unit/studio.bind.spec.ts` decodifica os dois uuids e não acha `Episódio 14`, `42k seguidores`, `dall-e-3`, `US$ 1,20`, `428k`, `US$ 0,08` |
| Testes do Studio | ✅ 14 testes em 4 arquivos (`studio.rules`, `studio.store`, `studio.suggest`, `studio.bind`) |
| `npm test` completo | ❌ não rodei de novo. Na F0, 3 casos de `tests/backend.spec.ts` já falhavam na master e o suite grava no `db/` do usuário |
| Jornada | ✅ no banco temporário; a tela empacotada foi aberta no navegador com esses mesmos registros |
| Carlos confere no app | ❌ aguardando “ok F1” |

## Jornada

Pasta temporária, fora do git. Criar perfil Multiverso Paranoico, redes Instagram e YouTube, peça carrossel, 3 ângulos, avançar da pauta e aprovar o ângulo. Reabrir o banco: etapa `roteiro`, 3 ângulos, redes `instagram` e `youtube`. Registro em `relatorios/studio/F1/jornada.json`.

A página empacotada (`npm run build`) foi aberta em `Módulos → Studio`. A peça aparece na esteira, o stepper marca Roteiro e os KPIs são 1 / 1 / 0. Prints: `relatorios/studio/F1/studio-roteiro.png` e `relatorios/studio/F1/social-perfis.png`. No Social, seguidores, engajamento e melhor horário ficam “—”; as duas redes e a contagem de posts vêm do cadastro. A aba de mensagens da página é o estado “Em breve”.

O Electron chegou a abrir, na outra tela. O print acima é a página que o build injeta, não um clique dentro da janela do Electron.

## Desvios

- O botão “Aprovar ângulo” só passa no gate quando a peça já está na etapa ângulo. Da pauta, o caminho é “Seguir para o ângulo”.
- “Pedir ângulos ao motor” e “Pedir roteiro ao motor” usam `runMotor` com `access: 'read'`, motor padrão, e gravam a execução no livro. Nada é escolhido sozinho. O custo sai do livro ou fica “—”.
- A sugestão do motor preenche vagas até 3 e não apaga ângulo digitado pelo Carlos.
- Séries ganharam `studio.series.list` e `studio.series.save`, porque o modal de produção pede série e a F0 não expunha isso.
- `npm test` inteiro continua fora deste portão pelo motivo já registrado na F0.

## Em aberto

D1 a D4 e D6 seguem para as fases posteriores. A F2 não começou.
