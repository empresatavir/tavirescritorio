# Padrão TAVIR de runtime local para desenvolvimento web

> **Versão 1.0 · 2026-08-29 · proprietário: Engenharia TAVIR**

Este padrão governa como agentes iniciam e apresentam servidores web locais. O objetivo é dar a
humanos e agentes uma URL previsível, sem transformar o runtime de desenvolvimento em serviço
permanente nem ampliar a exposição da máquina.

## Decisão

Portless é o runtime **preferencial** para aplicações web Node.js executadas localmente quando a
máquina satisfaz os requisitos e a navegação pelo browser faz parte da tarefa. A URL canônica de
desenvolvimento assume a forma `https://<slug>.localhost`.

Portless não substitui:

- a porta real do processo, que continua registrada para diagnóstico e health check;
- previews/deploys de homologação ou produção;
- execução direta em CI, containers, serviços não-Node ou ferramentas que exigem porta explícita;
- o comando original do projeto, que permanece como fallback operável.

## Aplicabilidade

Use por padrão em Next.js, Nuxt, Vite, Astro, Express e outros servidores Node compatíveis. A regra
alcança os Desenvolvedores/Construtores da Fábrica de LPs, e-commerce headless, CRM web, produtos
internos e o papel geral de Desenvolvimento; o CTO registra a aplicabilidade no parecer técnico.

Não force Portless em trilha Nuvemshop/Shopify sem servidor local, Flutter/mobile puro, .NET/Python,
testes automatizados que controlam a porta, Docker-to-host ou integração que exija a origem bruta.
Nesses casos, documente `NÃO SE APLICA` ou use `portless alias` somente com justificativa técnica.

## Versão e instalação

- Versão auditada e aprovada: `portless@0.15.6`, tag Git `v0.15.6`, Node.js `>=24`.
- Não usar `latest` em instalação automatizada. Verifique `node --version` e
  `portless --version` antes de iniciar.
- A ausência da CLI não autoriza instalação global silenciosa. Registre a dependência e obtenha
  autorização antes de `npm install -g portless@0.15.6`; um projeto pode preferir dependência de
  desenvolvimento fixada no lockfile.
- A skill ativa é a curadoria interna `.agents/skills/portless-tavir/`, não a skill upstream
  irrestrita.

## Fluxo padrão

1. Leia o `PROJECT.md`, o comando de desenvolvimento e a documentação do projeto.
2. Escolha um slug DNS estável, curto e sem dados de cliente: `<projeto>` ou
   `<servico>.<projeto>`. Não reutilize nome de rota ativa de outro projeto.
3. Mantenha o proxy somente em loopback e desative escrita automática no arquivo `hosts` com
   `PORTLESS_SYNC_HOSTS=0` no ambiente do processo.
4. Inicie com `portless <slug> <comando-original>` ou configuração equivalente, sem alterar o
   script original apenas para esconder o fallback. Exemplos: `portless loja npm run dev` e
   `portless api.crm pnpm dev`.
5. Registre a URL estável, a porta real atribuída, o comando original e o modo de retorno direto.
6. Valide rota principal, health check quando existir, assets, HMR/WebSocket e os viewports
   necessários. `portless doctor` é o primeiro diagnóstico e é somente leitura.
7. Ao encerrar a atividade, termine o processo da aplicação. Se não houver rotas em uso, pare o
   proxy; não deixe runtime ocioso ou janela reaparecendo no desktop.

Se Portless falhar, execute o comando original diretamente e prossiga. A indisponibilidade do
proxy não bloqueia build, testes, QA nem auditoria. Quando um script já chama Portless, use a
variável `PORTLESS=0` apenas durante o fallback e remova-a em seguida.

## Gates de autorização e segurança

O primeiro uso HTTPS pode gerar uma CA local e adicioná-la ao repositório `Root` do usuário do
Windows. Isso altera a confiança da máquina e exige autorização humana imediatamente antes da
ação. Sem autorização, use o servidor direto por porta.

Também exigem autorização explícita do Carlos, com finalidade e rollback registrados:

- `portless trust` ou qualquer alteração/remoção de certificado;
- `portless service install|uninstall` ou qualquer tarefa de inicialização do Windows;
- `portless hosts sync|clean`, TLD customizado ou edição do arquivo `hosts`;
- `--lan`, `--tailscale`, `--funnel`, `--ngrok`, domínio real ou qualquer exposição fora de
  `127.0.0.1`/`::1`;
- `--wildcard`, `--force`, limpeza destrutiva, prune forçado ou tomada de rota/processo alheio.

O padrão TAVIR nunca ativa serviço no boot. A execução normal não abre LAN, VPN ou internet, não
usa credencial de produção, não carrega PII real e não transforma `.localhost` em URL pública.

## Evidência mínima de entrega

O handoff de uma aplicação local informa:

- URL Portless e porta real, ou justificativa `NÃO SE APLICA`/fallback;
- versão de Node e Portless efetivamente usadas;
- resultado de `portless doctor` quando o proxy foi usado;
- comandos para iniciar, diagnosticar, retornar à porta direta e encerrar;
- confirmação de que serviço de boot, LAN e túnel público estão desativados.
