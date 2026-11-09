Redija os dois documentos do caso `{{CASE_ID}}`, versão {{N}}.

Leia só o que está em `_contexto/`: o prompt, `_contexto/modelos/`, `_contexto/evidencias-aprovadas.json`, `_contexto/decisao.json` e `_contexto/playbook.md`. Não use evidência pendente, rejeitada ou de fora desses arquivos. Não invente preço, promoção, estoque, depoimento, capacidade, faturamento, ranking ou prazo.

Grave exatamente:

- `documentos/v{{N}}/relatorio-raio-x.md`
- `documentos/v{{N}}/plano-crescimento.md`

Siga a estrutura dos modelos, inclusive o bloco formal inicial. Na parte pública, abra cada conclusão com a frase da classe:

- observado: "Foi observado que…"
- informado: "A empresa informou que…"
- inferido: "Uma hipótese a validar é…"
- indisponivel: "Não foi possível verificar…"

Antes do anexo interno, grave o marcador `<!-- CORTAR-PUBLICO -->`. Detalhe técnico (navegador, login, biblioteca, comando, infraestrutura) fica só depois desse marcador. Na parte pública não use: garantido, garantimos, vai aumentar, com certeza, primeira posição, primeiro lugar no google, R1, G5, hash, gate, sha256, Chrome, login, token, gallery-dl, RapidAPI, Supabase, Telegram.

A seção "Oportunidades priorizadas" começa pelo gap da prioridade gravada em `_contexto/decisao.json`, usando o rótulo desse gap. O plano 30/60/90 repete o texto da devolutiva, sem resumir o passo de 30 dias a ponto de ele sumir. Se a profundidade for `piloto`, inclua a frase "Esta é uma aplicação piloto: o método está em validação e o preço reflete isso." Se o caso for loja física, inclua "Presença local no Google" no relatório e "Presença Local no Google" no plano.

Não envie e-mail e não aprove os documentos. Quem aprova é o Carlos, na tela do Raio-X.
