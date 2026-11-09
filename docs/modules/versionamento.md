# Versionamento do Escritório

O app mostra qual código está rodando em dois lugares:

- **Rodapé da barra lateral**: `v2.0.0 · 6cdce97 · local`. Passe o mouse para ver branch e data do build.
- **Configurações › Sistema › Versão em uso**: versão, commit com a mensagem, branch, data do build, data do commit e o botão "Copiar dados da versão". Use esse botão ao reportar um problema.

## O que cada informação significa

| Campo | Origem | Para que serve |
|---|---|---|
| Versão (`v2.0.0`) | `package.json` | Marco combinado: o que foi liberado e está no CHANGELOG |
| Commit (`6cdce97`) | `git rev-parse HEAD` | Identifica o código exato; some do rodapé quando o build está na tag da versão |
| `local` / "alterações locais" | `git status` | O build tem código sem commit, então o commit sozinho não descreve o que roda |
| Branch e data do build | git e relógio na hora do build | Diferencia builds do mesmo commit |

A ficha é gravada em `dist/build-info.json` por `scripts/versioning.js info`, que roda no início de `npm run build`. O app só lê essa ficha (`src/main/buildInfo.ts`, IPC `app:buildInfo`); não consulta o git com o app aberto, então mostra o que de fato foi compilado.

Mudanças em `db/`, `dist/` e `backend/tavir.db` não contam como alteração local: são dados de uso. Rascunhos em `scripts/_*` também não.

## Como lançar uma versão

A `master` é protegida, então a release tem dois passos.

1. Numa branch, com tudo commitado:

   ```bash
   npm run release -- patch
   ```

   Use `minor` para novidade e `major` para mudança que quebra algo. O comando sobe a versão no `package.json`, escreve a seção no `CHANGELOG.md` (commits agrupados por tipo: feat, fix, style…) e cria o commit `chore(release): vX.Y.Z`. Abra a PR com ele.

2. Depois do merge, na `master` atualizada:

   ```bash
   npm run release:tag
   git push origin vX.Y.Z
   ```

   A tag anotada fecha a versão. Builds feitos nesse commit mostram só `vX.Y.Z` no rodapé.

A primeira release (sem tag anterior) leva ao CHANGELOG os 60 commits mais recentes.

Testes: `tests/unit/versioning.spec.ts`.
