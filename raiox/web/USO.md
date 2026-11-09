# Uso — Raio X TAVIR controlado

## Finalidade e limite atual

Este é um piloto assistido para convidados conhecidos. Ele coleta contexto, produz um diagnóstico e
um plano de crescimento e mantém revisão humana antes da entrega. Ainda não inclui geração de conteúdo,
publicação em redes sociais, cobrança ou portal self-service.

## Primeiro uso

1. Confirme que o servidor do Escritório e o poller do Telegram estão saudáveis.
2. No Telegram privado da TAVIR, use `/raiox` e informe três linhas: empresa, contato e e-mail.
3. A Dora cria o case e envia automaticamente um convite TAVIR para esse e-mail. O link individual
   não aparece no Telegram e não deve ser copiado ou recriado manualmente.
4. No mesmo link, o cliente percorre duas telas: contexto e objetivo; depois operação e capacidade.
   A primeira tela apenas avança no navegador. Existe um único envio ao final, sem aprovação
   intermediária e sem segundo link.
5. A segunda tela coleta oferta, capacidade, jornada, mensuração, conteúdo e restrições. Se houver
   local físico ou atendimento presencial, endereço e situação do Perfil da Empresa no Google são
   obrigatórios; o bloco fica oculto para operação exclusivamente online.
6. Revise o cartão da IA e clique em `Executar`; nenhum job começa antes disso.
7. Ao término, leia os dois documentos enviados pela Dora.
8. Use `Aprovar os 2`, `Solicitar ajustes` ou `Manter bloqueado`.
9. Depois de aprovar, use `Enviar por e-mail`. Este segundo clique é o único que autoriza a entrega.

Para smoke test em produção, use apenas empresa/persona/respostas fictícias, nenhum link de terceiro
e `empresatavir@gmail.com`. Identifique o case como `TESTE INTERNO — DADOS FICTÍCIOS` e expurgue-o
integralmente ao final. Isso não autoriza convidado real.

## Saída

O cliente recebe dois PDFs: `relatorio-raio-x.pdf` e `plano-crescimento.pdf`. O e-mail esclarece que
as ações são recomendações e experimentos, sem promessa de resultado. O formato usa o template
publicado `raiox-entrega-v1`, identidade visual TAVIR e logo oficial embutido, além de versão em texto.
Os PDFs são gerados por Markdown → HTML seguro → Chromium, com paleta e tipografia TAVIR, cabeçalho
formal, ficha de empresa, rodapé e paginação. O cabeçalho usa o lockup oficial da TAVIR; a primeira
página apresenta empresa, responsável pela análise, segmento, localidade, atuação, data, horizonte
quando aplicável e referência curta. Quando a auditoria autorizada do Instagram tiver produzido um avatar, o operador
deve convertê-lo localmente em `client-logo.png` sanitizado no diretório privado do case; o arquivo
entra apenas como co-branding e nunca é carregado por URL durante a geração.

Na versão pública, a seção é `Fontes analisadas e limites`. HTTPS, Chrome, login, bibliotecas,
comandos, hashes, R1/G5 e botões de entrega ficam somente no anexo interno cortado pelo publicador.

Quando o intake contiver Instagram, a análise é uma fase especialista da Íris. Ela gera, no
diretório privado do case, auditoria completa e resumo executivo em Markdown e HTML, registra o
contador exato de Requests RapidAPI e leva os achados relevantes para o `relatorio-raio-x.md`.
As quatro variantes servem à revisão e ao arquivo interno; o canal aprovado de entrega ao cliente
continua sendo o e-mail com os dois PDFs depois dos gates.

O app Vercel atual hospeda intake e APIs, não uma área de relatórios. Portanto o HTML não recebe URL
externa automaticamente. Publicá-lo com segurança requer storage privado, URL assinada e expirada,
revogação, controle de acesso por case, logs sem PII e nova auditoria independente; jamais colocar o
relatório em `public/` ou em uma URL previsível.
Negócio físico recebe Presença Local no Google e, se houver fit, explicação sem promessa da oferta
TAVIR Presença Local. Recomendações de conteúdo usam termo técnico, explicação comum, exemplo, CTA,
métrica e limite de veracidade; calendário e roteiros completos são execução separada.

## Controles que o operador não deve contornar

- Nunca reutilizar ou editar manualmente uma URL assinada.
- Nunca analisar área privada sem autorização específica.
- Nunca enviar arquivos diferentes dos hashes aprovados.
- Nunca contornar a persistência do gate R1; sem `review_id`, o case não está aprovado para entrega.
- Nunca tentar novamente quando o estado disser `delivery_uncertain`; primeiro conferir a Resend.
- Nunca colocar e-mail, respostas, chave ou token em issue, commit ou log.

## Retenção e direitos

O aviso do piloto define retenção máxima de 90 dias para cases concluídos. Até a rotina de expurgo
automatizada ser auditada, o responsável operacional deve revisar mensalmente os cases `sent/closed`,
eliminar banco e diretório privado ao completar o prazo e registrar apenas evidência sem PII. Pedidos
de correção ou exclusão têm prioridade e devem ser executados também nas cópias do Telegram/Resend.

## Troubleshooting

- **Deploy Git não encontra `package.json`:** no projeto Vercel `agenciaia`, confirme que o Root
  Directory é `empresas/tavir/projetos/custom/raio-x-de-prospeccao/04-execucao/raiox-web` e refaça
  o deployment. Não mova nem duplique o app para a raiz do repositório.
- **Link inválido:** gere novo convite; não alongue expiração nem revele a causa ao visitante.
- **Convite recusado:** o case já existe. Corrija remetente, destinatário ou configuração e reconcilie
  a entrega registrada; não abra outro case para a mesma tentativa.
- **Convite incerto:** não reenvie. Confira a chave de idempotência e o destinatário no painel da
  Resend antes de reconciliar o estado no Supabase.
- **Supabase indisponível:** restaure o projeto e valide o cron antes de pedir reenvio.
- **PDF não gerado:** rode `python tools/publicar.py <arquivo.md> --tipo relatorio` localmente e
  confirme antes `python -m pip install -r tools/requirements-publicar.txt`; nada foi enviado.
- **Aprovação não persistida:** confira `review-case`, migration do gate e
  `RAIOX_REVIEW_GATE_SECRET`. O gate deve permanecer pendente.
- **Entrega não preparada:** confira correspondência de rodada/hashes e
  `RAIOX_DELIVERY_GATE_SECRET`; não altere o banco manualmente.
- **Remetente não configurado:** defina `RESEND_API_KEY` e `RAIOX_EMAIL_FROM` no `.env` privado.
- **Template não configurado:** defina `RAIOX_RESEND_TEMPLATE_ID=raiox-entrega-v1` e confirme que a
  versão está publicada no Resend; não substitua por HTML improvisado no runtime.
- **Logo ausente:** restaure `TAVIR/brand-kit/logo/tavir-primary-transparent.png`; o envio falha
  fechado para não entregar uma mensagem sem identidade.
- **Logo do cliente ausente:** o PDF continua com identidade TAVIR e exibe o fallback “Diagnóstico
  sob medida”. Não use URL remota; gere `client-logo.png` a partir do avatar público autorizado,
  removendo metadados e mantendo o arquivo no diretório privado ignorado pelo Git.
- **Provedor recusou:** confira domínio, remetente e painel da Resend; o botão poderá ser tentado após correção.
- **Resposta incerta:** não reenvie. Localize a chave/id do case no painel do provedor e reconcilie o estado.

## Encerramento seguro

Pare o Escritório normalmente. Não apague arquivos de um case em análise ou revisão. Para remover um
case concluído, confirme UUID, status e idade no banco e no diretório privado antes da exclusão.
