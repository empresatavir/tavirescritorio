# Fluxo Telegram — Dora / Raio X

## Limite de canais

Há somente um interlocutor no Telegram: **Carlos, no bot privado da TAVIR**. O cliente não usa
Telegram, não recebe comandos, não escolhe IA e não vê aprovações internas. Ele interage apenas com
o formulário web hospedado na Vercel, pelo link que Carlos encaminhar no canal comercial adequado.

O bot privado usa o controle já existente da TAVIR e conserva o allowlist atual. O formulário não
compartilha token, sessão ou credencial com Telegram.

## Início do case no bot

Carlos seleciona `Novo Raio X`. Dora pergunta, uma por vez:

1. “Como se chama a pessoa de contato?” → `contato_nome`.
2. “Qual é o nome da empresa?” → `empresa_nome`.
3. “Em qual nicho ela atua?” → `nicho`.
4. “Hoje ela vende ou atende de que forma?” → botões `Física`, `Online`, `Física e online`.
5. “Como você entende que ela deseja atuar nos próximos 6–12 meses?” → mesmos botões.
6. “Quer incluir alguma observação antes de enviar o formulário?” → opcional.

O bot cria o `case_id` e apresenta um link de uso único. Carlos confere e encaminha o link ao
cliente. O Telegram não envia mensagem ao cliente por conta própria.

## Formulário e consentimento

Formato operacional atual (exemplo estrutural; a Dora gera o valor real):

```text
https://raiox.tavir.com.br/form/<token-opaco>?exp=<unix>&sig=<assinatura-hmac>
```

`raiox.tavir.com.br` é o endereço público canônico desta implantação. O alias
`agenciaia-one.vercel.app` permanece somente para operação técnica e não deve ser encaminhado ao
cliente. O subdomínio está vinculado ao mesmo projeto Vercel, configurado em `RAIOX_APP_URL` e
revalidado nos controles de origem, headers e links assinados.

O backend valida assinatura, expiração e uso único. A URL identifica uma sessão, não contém nome,
e-mail, endereço ou links de redes sociais. O formulário confirma a conclusão apenas na própria
página e apresenta a política de privacidade.

O formulário pergunta, separadamente:

- autorização para verificar **fontes públicas** informadas;
- autorização para solicitar acesso a ativos privados, se análise aprofundada for necessária;
- autorização para entregar os documentos pelo e-mail informado;
- canal preferido para o contato comercial posterior.

Recusar uma autorização não encerra o case: a esteira segue com o que é público e marca a lacuna
como `indisponível`.

## Pedido de autorização no Telegram

Antes de qualquer operação externa, Dora cria um envelope canônico de aprovação para Carlos:

```text
case_id | ação | motivo | dados envolvidos | escopo | expiração | solicitante | estado
```

Mensagem:

> Raio X `RX-024`: autorizar **[ação]** para **[empresa]**? Fonte: [URL]. Escopo: [público ou
> acesso concedido]. Dados: [categoria]. Expira em [data].

Botões: `Autorizar uma vez`, `Negar`, `Pedir ajuste`. A escolha, usuário, horário e justificativa
viram registro imutável. Aprovação expirada ou negada bloqueia o job.

## Seleção de IA no Telegram

No cartão de revisão, antes de “Executar”, Carlos seleciona “⚙️ Configurar IA” e escolhe:

1. provedor permitido;
2. modelo listado naquele provedor;
3. esforço: `baixo`, `médio`, `alto` (e `máximo` apenas se o catálogo permitir);
4. confirmação de custo/escopo resumidos.

O job recebe seleção validada pelo catálogo server-side; o callback carrega apenas o identificador
do rascunho e índice do modelo, nunca prompt ou dados de cliente. Sem escolha explícita, usa o
padrão da fila e registra isso no relatório. A escolha vale somente para aquele job e não altera a
configuração geral do Escritório.

## Estados e exceções

`iniciado_no_telegram → formulário_gerado → formulário_enviado → formulário_recebido →
aguardando_autorização → autorizado → analisando → revisão_humana → pronto_para_envio → enviado →
encerrado`.

- Link vencido: Dora gera outro link e invalida o anterior.
- Endereço incompleto: o formulário pede correção; não tenta adivinhar o local no Maps.
- Falha em fonte pública: registra fonte, horário e erro; não supõe que a empresa não existe.
- Pedido de acesso a WhatsApp, painel, Ads ou Google Business Profile: fica em
  `aguardando_autorização`; o formulário e o bot nunca coletam credenciais.
