# Gate do piloto real assistido — Raio-X TAVIR

> Decisão de 2026-08-22 · operador único: Carlos · escopo futuro: 3–5 convidados conhecidos,
> um case por vez · operação comercial e self-service continuam fora do escopo.

## Estados distintos

| Estado | Dados | Situação |
|---|---|---|
| Teste interno controlado | fictícios ou dados da própria TAVIR | liberado |
| Piloto real assistido | pessoa real convidada, sem cobrança e com Carlos operando | bloqueado até G-PR1 |
| Operação comercial | clientes recorrentes, cobrança, escala ou automação | bloqueada; gate posterior |

`Carlos ser o único operador` reduz a superfície, mas não transforma dados de outra pessoa em dados
internos. O piloto real só é liberado quando todos os controles de G-PR1 tiverem evidência e o auditor
independente alterar o veredito.

## G-PR1 — controles bloqueantes

1. **Opt-in pré-case:** registrar resposta afirmativa antes de armazenar nome/empresa ou emitir link,
   com canal, horário, versão do aviso e operador; `create-case` falha fechado sem esse registro.
2. **Aviso permanente e versionado:** URL sem token contendo controlador, canal de privacidade,
   finalidades, dados, fornecedores, transferência internacional, retenção, direitos e revisão humana.
3. **Três decisões separadas:** ciência do aviso, solicitação de consulta às fontes empresariais
   públicas e autorização de entrega ao e-mail. Nada pré-marcado; versão e timestamp persistidos.
4. **E-mail confirmado:** token opaco, expirável e de uso único; análise e entrega bloqueadas enquanto
   `email_verified_at` estiver ausente.
5. **Minimização e entrada segura:** cidade/UF ou endereço comercial público somente quando necessário;
   proibir perfis pessoais, credenciais, documentos, dados sensíveis, conversas e PII de terceiros;
   validar protocolo, destino, DNS/IP e redirects dos links antes de acessá-los.
6. **Fornecedores por case:** registrar Vercel, Supabase, Resend, Telegram e provedor/modelo de IA
   efetivamente usados, com finalidade, dados, região, retenção e exclusão.
7. **Expurgo provado:** concluir primeiro a exclusão do case sintético em Supabase, diretório/PDFs,
   Telegram, Resend, logs e temporários, registrando ausências sem preservar PII.
8. **Direitos do titular:** canal permanente e procedimento ensaiado para acesso, correção, revogação
   e exclusão; revogação interrompe as etapas futuras compatíveis.
9. **Runbook:** ensaiar e-mail incorreto, link vazado, Telegram comprometido, rotação de segredos,
   incidente em fornecedor, contenção, evidência e acionamento jurídico.

## Procedimento pré-convite aprovado como minuta operacional

> Quero convidar você para um piloto assistido do Raio-X TAVIR. Antes de participar, leia o Aviso de
> Privacidade: {{URL_PRIVACIDADE}}. A participação é voluntária. Se concordar em receber o link
> individual e permitir a criação do seu case, responda “QUERO PARTICIPAR”. O convite expira em
> 48 horas e pode ser usado uma vez.

O texto é minuta de trabalho e precisa de validação profissional antes do primeiro convidado real.
Dados formais do controlador, base legal, prazo/marco de retenção, transferências internacionais e
termo simplificado do piloto permanecem pontos para advogado inscrito na OAB.

## O que continua proibido

- convite aberto, self-service, captação em massa, cobrança recorrente ou multi-tenant;
- áreas privadas, mensagens, listas de clientes, seguidores/comentários individualizados;
- dados sensíveis, menores, documentos, credenciais ou endereço residencial;
- envio sem aprovação dos documentos, autorização de entrega e destinatário confirmado;
- case público, marketing ou memória por nicho identificável sem autorização separada;
- novo fornecedor ou modelo de IA sem inventário e revisão;
- retenção indefinida ou expurgo declarado sem prova.

## Critério de saída

G-PR1 termina somente com os nove itens testados, revisão jurídica profissional dos textos aplicáveis
e novo parecer técnico independente contendo `liberado_para_piloto_real_assistido: true`. Isso não
altera automaticamente `liberado_para_deploy: false` da operação comercial.
