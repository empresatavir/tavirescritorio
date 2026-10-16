# Notas operacionais do gallery-dl — verificado em 2026-07-15

Fontes oficiais:

- https://github.com/mikf/gallery-dl
- https://github.com/mikf/gallery-dl/blob/master/docs/options.md
- https://github.com/mikf/gallery-dl/blob/master/docs/configuration.rst
- https://github.com/mikf/gallery-dl/blob/master/docs/supportedsites.md

## Capacidades usadas

- `--cookies-from-browser chrome/instagram.com` lê apenas cookies do domínio na
  sessão local; o script não exporta nem registra cookies.
- `extractor.instagram.include` aceita `posts`, `reels`, `stories`, `highlights`,
  `info`, `avatar`, `tagged` e `all`.
- `--write-metadata` grava JSON por arquivo; `--write-info-json` grava metadados
  da galeria/perfil.
- `extractor.instagram.audio=true` solicita música/áudio quando o extrator a expõe.
- O intervalo oficial padrão atual para requisições do Instagram é conservador;
  esta skill usa `6.0-12.0` segundos.

## Limites que o relatório deve declarar

- Stories são efêmeros; conteúdo expirado não pode ser recuperado pela coleta.
- Destaques, Stories e perfis privados dependem do que a conta autenticada pode ver.
- `status=ok` do processo não significa que havia itens na categoria.
- Legenda escrita costuma aparecer nos metadados; texto queimado no vídeo/imagem
  exige OCR ou leitura visual. Fala exige extração de áudio e transcrição.
- Instagram pode alterar endpoints e impor rate limits. Conferir logs e atualizar
  este snapshot quando a documentação oficial divergir.
