# Direitos do titular — procedimento do piloto (rascunho)

G-PR1 controle 8. Rascunho operacional: o Carlos define o canal e o advogado revisa prazos e
texto de resposta. Sem dado de cliente neste arquivo.

## Canal

- Canal permanente: o canal de privacidade do aviso (`/privacidade`, seção 2). Hoje está como
  `[A PREENCHER]`.
- Também vale pedido que chegue pelo canal do convite (WhatsApp, telefone, presencial,
  videochamada ou e-mail). Quem recebe registra no Escritório no mesmo dia.
- Prazo de resposta: até 15 dias. A revogação é registrada no mesmo dia útil em que chega.

## Antes de atender: confirmar quem pede

Responder só para o e-mail do caso ou pelo mesmo canal do opt-in registrado. Pedido de outro
contato: pedir que escreva do e-mail do caso. Não enviar dado do caso para endereço novo.

## Acesso

1. Abrir o caso no Escritório (busca pela empresa).
2. Montar a resposta com: dados de convite (empresa, contato, e-mail, opt-in), respostas do
   formulário, autorizações com versão do aviso, fontes públicas consultadas, fornecedores que
   tocaram o caso (cartão "Serviços que tocaram este caso" na aba Devolutiva) e documentos
   entregues.
3. Enviar só para o e-mail do caso. Anotar data do pedido e da resposta na nota do caso.

## Correção

1. Dado do convite ou do caso: "Editar caso" no Escritório.
2. E-mail do caso mudou: a confirmação de e-mail cai sozinha (controle 4) e o titular confirma o
   endereço novo antes de qualquer análise ou entrega.
3. Documento já entregue com erro: gerar nova versão, aprovar e entregar de novo; a versão antiga
   fica registrada.

## Revogação

1. No Escritório: caso → **Registrar revogação** → canal, quando o titular pediu e nota curta.
2. O efeito é imediato e não volta:
   - análise, redação, PDF, Google, anexos, exportação, entrega e execução ficam travadas;
   - análise ou redação em andamento é parada e o resultado é descartado;
   - nova autorização exige caso novo, com opt-in novo.
3. Caso com formulário remoto: a revogação no Supabase (`revoke_raiox_case`) fecha o link do
   formulário e a confirmação de e-mail e faz as funções recusarem com `case_revoked`. Com a
   escrita liberada ("liberado CP-10"), o botão já leva a revogação ao Supabase; se o Supabase não
   confirmar, o caso mostra "Levar ao Supabase" para tentar de novo. Sem a liberação, rodar a
   função junto do Carlos no painel. Um sync traz a revogação do Supabase para o caso local, que
   trava do mesmo jeito.
4. Responder ao titular confirmando a revogação e dizendo se ele quer também a exclusão.

## Exclusão

1. Revogar primeiro (passo acima), para nada novo rodar.
2. No Escritório: caso → **Expurgar caso** → conferir a prévia, motivo «Pedido do titular» e
   digitar o código do caso. "Excluir" não serve aqui: só apaga a pasta e não deixa prova.
3. Fechar os itens que o relatório marcar como Pendente ou Conferir (Supabase com
   `purge_raiox_case`, Telegram, Resend, arquivos compartilhados dos motores).
4. Guardar só o relatório de ausência (`expurgos/`, sem PII) e responder ao titular com a data.

## Pendências

- Carlos: e-mail do canal de privacidade.
- Advogado: prazo de resposta, o que guardar como prova do atendimento e por quanto tempo, texto
  das respostas ao titular.
