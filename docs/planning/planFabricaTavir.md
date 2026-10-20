# Plano v2 — Console operacional integrado

**Motivo da revisão:** o usuário indicou que o HTML de referência enviado parece mais interessante que o v0 claro.  
**Modo:** redesign-overhaul visual do nosso v0; preserva o escopo do produto e as restrições aprovadas.  
**Versão anterior preservada:** [`index_v0_claro.html`](./index_v0_claro.html) e [`plan_v1_claro.md`](./plan_v1_claro.md).  
**Entrega em andamento:** protótipo autônomo em `index.html`, sem backend e sem credenciais reais.

## Comparação e decisão

O HTML de referência é mais convincente como ferramenta porque usa um cabeçalho compacto com as três visões de topo, um canvas amplo para a topologia, um painel contextual de atividade/evidências e subnavegação para os módulos do projeto. Os nós ativos, ramificações, estados e artefatos dão sensação de sistema em operação; o v0 claro, embora legível, ficou com aparência de amostra de telas e cards, não de console único.

A referência serve como **direção estrutural e de densidade**, não como código a copiar. O nosso redesenho manterá uma identidade própria, componentes sem bibliotecas externas, conteúdo marcadamente demonstrativo, navegação de retorno global e operação local. Não será copiado o nome “Pipeline OS”, o conteúdo de demandas, a marca, os tokens de acesso ou a implementação Tailwind/Phosphor.

### Preservar

- As três visões integradas: **Topologia**, **Livro-razão** e **Workspace**, sobre o mesmo projeto e a mesma demanda selecionada.
- Os módulos do anexo: Documentos Gerados, Arquivos Importados, Acessos, QA, Chat do projeto, Agentes e Roadmap.
- **Voltar** e **Retornar ao inicial** em todas as views e subtelas.
- Operação local demonstrativa, sem conectores, chamadas a agentes ou publicação.

### Melhorar

- Tornar a topologia a primeira leitura: canvas de execução à esquerda e inspector contextual à direita.
- Dar ao Livro-razão uma árvore/hierarquia à esquerda e detalhe de evento/evidência à direita.
- Reunir os módulos em um Workspace com subnavegação coesa; suas telas terão conteúdo e interações demonstrativas concretas, em vez de apenas placeholders.
- Dar aos estados, gates, bloqueios, exceções e artefatos uma hierarquia visual mais forte, com legendas textuais além das cores.
- Usar layout responsivo: navegação de workspace recolhível/rolável, painéis empilhados em telas menores e topologia com rolagem horizontal deliberada.

### Remover

- A direção clara/editorial, que o usuário considerou menos interessante.
- Cópia de nome, código, scripts, dependências, dados ou credenciais presentes na referência.
- Dependências externas como Tailwind CDN, fontes remotas e bibliotecas de ícones via CDN.
- Números, hashes, commits, mensagens, conectores, status de produção ou resultados de testes que possam parecer dados reais; exemplos serão explicitamente rotulados.
- Qualquer aparência de cofre criptografado real: a tela Acessos continuará estritamente demonstrativa, sem campo para segredo real.

## Design Read

- **Artefato:** protótipo interativo de console operacional para uma esteira de software com agentes.
- **Público:** Product/Project Owner, Tech Lead, QA e desenvolvimento.
- **Linguagem visual:** sala de controle técnica — canvas escuro pontilhado, topologia espacial, painéis de inspeção e feed de eventos, com contraste e acentos controlados.
- **Modo:** redesign-overhaul da composição, preservando fluxo, conteúdo e limites aprovados.
- **Variância visual:** 7/10; novidade concentrada no mapa e na relação entre trilha/inspector.
- **Movimento:** 3/10; movimento apenas em seleção/feedback, nunca em loop contínuo; respeitar `prefers-reduced-motion`.
- **Densidade:** 8/10; dados operacionais bem agrupados, detalhes em painéis progressivos.
- **Dependência de assets:** 1/10; dados, CSS e ícones de interface inline; sem ilustração decorativa.
- **Fidelidade de marca:** 1/10; não foi fornecida identidade de marca.

## Sistema visual

- **Fundo/canvas:** `#0B1118` e canvas de execução `#0A0F16` com malha pontilhada discreta.
- **Superfícies:** `#111A25` para painéis e `#182332` para áreas elevadas; bordas `#263547`.
- **Texto:** `#E6EDF5` primário e `#94A3B5` secundário.
- **Acentos semânticos:** azul `#6D96FF` para seleção/fluxo atual; verde-menta `#45D6A0` para concluído; âmbar `#F2BC59` para gate/atenção; coral `#F17369` para falha. Estado nunca depende só da cor.
- **Tipografia:** Noto Sans (fallback local sans-serif) para interface; `ui-monospace` para IDs, tempos e dados técnicos. Sem fontes ou scripts externos.
- **Ritmo:** base 4 px, com múltiplos de 8 px nos agrupamentos; painéis 12 px de raio; controles 7–9 px; borda fina antes de sombra.
- **Ícones:** glifos de texto e SVGs inline de interface; sem emoji nem carregamento remoto.
- **Movimento:** transições de 150–200 ms em hover, seleção e abertura de painel; nenhuma animação permanente em estado ativo.

## Estrutura integrada e comportamento

### Cabeçalho global

Marca temporária “Fábrica · local”, botões globais **Voltar**/**Retornar ao inicial**, seletor de visão Topologia/Livro-razão/Workspace, busca local e selo **DEMONSTRAÇÃO**. Sem identidade final ou notificação falsa.

### Topologia

Canvas principal com percurso Intake → Pregame → Especificação → Gate humano → Planejamento → Arquitetura condicional → Execução local → Revisão local → QA local → Pacote/Handoff. Selecionar uma etapa atualiza o inspector. O painel mostra papel do agente, gate, workspace local demonstrativo, artefatos e eventos correlatos. Sem PR, CI hospedada, deploy ou conexão remota.

### Livro-razão

Árvore de eventos/agentes à esquerda; detalhe à direita com timestamp demonstrativo, entrada/saída estruturada, artefatos e evidências vinculadas. Os dados ficam marcados como exemplos; hash de conteúdo não será inventado como se tivesse sido calculado.

### Workspace e submódulos

- **Quadro:** colunas de trabalho locais, limites WIP ilustrativos e feed de atividade; itens demonstrativos.
- **Documentos Gerados:** lista com agente, motivo e data/hora; leitor na mesma tela; download de arquivo demonstrativo.
- **Arquivos Importados:** seleção local, lista, preview suportado e remoção; arquivo mantido apenas em memória durante a sessão.
- **Acessos:** valores totalmente sintéticos, com botão de revelar somente `DEMO-NOT-A-SECRET`. Não aceitará tokens ou senhas reais, nem alegará criptografia, banco ou segurança de produção.
- **QA:** cenários e falhas demonstrativos, com **O que falhou**, **Como falhou** e **Detalhamento técnico de correção para o Agente Dev**; anexos/preview ficam locais e a estrutura não é consumida por um agente real.
- **Chat:** seletor de papel, transcrição local e aviso persistente de que nenhuma mensagem é enviada a um agente/modelo.
- **Agentes:** papéis, responsabilidades e limites demonstrativos.
- **Roadmap:** Quarter, objetivos e milestone de 14 dias marcados como dados de exemplo.

### Limites de segurança

O HTML de referência contém valores hardcoded com aparência de tokens em atributos de dados, revelados diretamente no navegador, e texto que declara criptografia sem demonstrar backend. Esses valores não serão copiados nem expostos nesta revisão. Se representarem credenciais reais, devem ser revogados/rotacionados. O novo protótipo não inclui autenticação, persistência de segredo, criptografia de produção, API, agente real, upload remoto ou integração externa.

## Critério de conclusão da revisão

Ao abrir `index.html`, a topologia precisa ocupar o primeiro plano; trocar as três visões deve manter o contexto; o usuário deve entrar e voltar de cada módulo com os controles globais; e as ações locais demonstrativas precisam responder sem dependências externas. Os conteúdos de Acessos, Chat e QA devem continuar inequivocamente fictícios e não podem ser confundidos com execução ou armazenamento real.
