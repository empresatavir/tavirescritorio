# F8 — checkpoint parcial

A F6 continua sem as 3 imagens do Flow. A F7 continua sem o whisper e sem o reel visto no celular. A F8 começou mesmo assim.

## O que este commit cobre

- **8.1** `src/main/sidecars.ts` lê `db/sidecars.json` e, se ele não existir, `db/sidecars.example.json`. O arquivo real fica fora do git. DarkFlow: `http://127.0.0.1:8765/api/health`. Docuflow: `http://127.0.0.1:5000/docs`.
- Antes de subir, a porta ocupada gera recusa com o nome do processo. Se um dos dois já está no ar, o outro não sobe: a mensagem diz que a porta 8765 é dos dois.
- O comando configurado com `--enable-meta-publish` é recusado. O Escritório não acrescenta essa flag.
- **8.2** A produção do Studio mostra "Sistemas ligados", com iniciar e parar. A página de Configurações ainda não ganhou a seção; o controle está na tela do Studio.
- **8.3 / 8.4** Cliente HTTP do DarkFlow com `X-CSRF-Token`, cópia do MP4 mais manifesto no formato que `storage/output` varre, e mapeamento do perfil para canal e brand kit do Docuflow. A voz não entra no JSON do brand kit porque esse modelo recusa campo desconhecido; ela volta ao lado.

## Comandos

`npx vitest run tests/unit/studio.sidecars.spec.ts` — 8 testes, saída 0.

`npm run typecheck` — saída 0.

`npm run build` — `dist/renderer/index.html` 699.9 KB.

## Portão

| Item | Resultado |
| --- | --- |
| Testes do sidecar, do CSRF e do mapeamento | ✅ |
| Reel agendado no DarkFlow em simulação | ❌ não rodei os dois sistemas |
| Projeto criado no Docuflow | ❌ |
| Prints dos dois fluxos | ❌ |
| `git status` limpo no DarkFlow e no Docuflow | ❌ os dois repositórios já tinham alterações antes desta sessão; nenhum arquivo deles foi escrito agora |

A F8 não fecha.
