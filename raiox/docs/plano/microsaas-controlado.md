# Plano — Raio X online como MicroSaaS controlado

> Decisão de 2026-08-22: operar primeiro como serviço produtizado assistido, por convite, sem portal
> multi-tenant e sem geração automática irreversível.

## Jornada do piloto

`Dora recebe empresa + contato + e-mail → cria case → envia convite automaticamente → duas telas no mesmo link → um envio final → autorização da análise → dois documentos → revisão por hash → autorização de envio → e-mail com PDFs`

O cliente percebe uma experiência online completa; por trás, a TAVIR conserva os gates humanos onde
erro, custo e reputação ainda são relevantes.

## Entrega de hoje

- LP de convite responsiva e personalizada pelo nome da empresa.
- Consentimentos explícitos, aviso de privacidade e superfície inteira `noindex`.
- Limite de tentativas previsto na migration e revogação da sessão abusada.
- Registro de entrega idempotente ligado à rodada e aos SHA-256 dos documentos.
- Botão de envio separado da aprovação; PDFs gerados apenas a partir das versões aprovadas.
- Tratamento de falha confirmada e estado incerto sem retry cego.
- Guia operacional, ambiente verificado e relatórios de segurança/SEO atualizados.

## Simplificação do intake — 2026-08-23

- O operador autoriza o convite ao enviar as três linhas no `/raiox`; o destinatário recebe o e-mail
  sem o operador copiar links.
- As antigas etapas 1 e 2 viraram telas de um único assistente. Avançar para a tela 2 não grava nem
  notifica; o servidor recebe o conjunto completo uma vez.
- O gate intermediário foi removido. Permanecem o gate para iniciar a análise e o gate separado para
  entregar os PDFs aprovados.
- Convite e entrega final possuem registros, segredos e chaves de idempotência distintos.

## Fases de liberação

1. **Código e testes locais:** release unificado concluído; reauditoria pendente.
2. **Infraestrutura de teste:** aplicar a migration do intake unificado e publicar `create-case`,
   `invite-case`, `continue-case`, `notify-dora` e o frontend atualizados.
3. **Gate independente:** segurança/LGPD e noindex.
4. **Piloto concierge:** 3–5 convidados, um por vez, com observação e registro de tempo/qualidade.
5. **Automação seletiva:** somente tarefas repetíveis que não removam aprovação humana.
6. **MicroSaaS real:** autenticação, painel, cobrança e multi-tenant apenas após demanda e repetição.

## Critérios para o piloto

- Nenhum dado ou documento em URL pública/log.
- 100% das entregas com consentimento e dois gates.
- Zero duplicidade de e-mail.
- Tempo de entrega e retrabalho medidos por case.
- Plano entendido pelo convidado e pelo menos uma prioridade considerada executável.

## Pendências que bloqueiam convidados reais

- Migration e funções do intake unificado ainda não aplicadas no Supabase.
- Segredo exclusivo `RAIOX_INVITE_GATE_SECRET` ainda precisa ser cadastrado nos dois ambientes.
- Expurgo de 90 dias ainda operacional/manual.
- Auditor independente ainda não emitiu `liberado_para_deploy: true`.
- Deploy automático de `main` está desligado no `vercel.json` até a liberação desses gates.

## DOCUMENTAÇÃO E ENTREGA

O setup técnico está em `04-execucao/raiox-web/SETUP.md`; a rotina do operador está em
`04-execucao/raiox-web/USO.md`; os gates ficam em `05-validacao/`.
