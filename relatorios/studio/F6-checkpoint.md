# F6 — checkpoint

O Carlos respondeu «feito, tudo certo» sobre os PNG da F5. A zona segura continua nos valores iniciais da seção 4.3, agora confirmados por essa resposta. Não houve número novo.

## Portão

| Item | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npx vitest run tests/unit/studio.flow.spec.ts` e os testes de pacote, regras, store, prévia e render | ✅ 6 arquivos, 25 testes |
| `npm run build` | ✅ `dist/renderer/index.html` 698.8 KB |
| `npm test` completo | ❌ não rodei. Os 3 casos de `tests/backend.spec.ts` já falhavam na master |
| 3 imagens geradas no Flow e encaixadas sozinhas | ❌ ainda não. Esse passo é do Carlos |

## O que entrou

- O compilador em `promptCompiler.ts` é função pura. A saída em inglês segue as 11 camadas. O resumo em português pede, no vídeo, gerar a imagem antes de animar.
- Personagem fixo entra com a descrição da bíblia copiada e o lembrete das imagens de referência.
- O validador reprova camada faltando e prompt que pede texto. Acima de 900 caracteres, só avisa. Lapidar com motor reescreve as camadas 1–3 e 6; se o validador reprova, a resposta é descartada.
- A bíblia do perfil (estilo, negativos, personagens) fica na aba do canon e no formulário do perfil.
- A arte lista os prompts, com copiar, versão, nota «funcionou / não funcionou» e histórico por versão nova.
- `exportShotList` grava `pecas/<id>/prompts.md`.
- O nome do arquivo segue `SIGLA-NNNN-S03.png` ou `...-v2.png`. A pasta é `entrada-flow` dentro dos dados do Studio. A versão maior fica no slot; as anteriores ficam na pasta da peça. Arquivo fora do padrão aparece como «sem dono», com «atribuir a slot».
- A busca na bíblia lista prompts do perfil marcados como «funcionou».

## Desvio

O teste de versão usa arquivos de texto com extensão `.png`, então o ffprobe avisa assinatura inválida. O encaixe e o sha256 acontecem mesmo assim. Dimensão real entra quando o arquivo é uma imagem de verdade.

## Parado aqui

Falta o Carlos gerar ao menos 3 imagens no Flow com os prompts de uma peça, nomear no padrão e soltar em `%USERPROFILE%\TAVIR\Studio\entrada-flow`. A F7 não começa antes disso.
