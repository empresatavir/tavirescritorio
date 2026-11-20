# Plano mestre — Raio-X → Operação de Crescimento e Conteúdo

> Versão de planejamento: 2026-08-22 · Nome de trabalho, não nome comercial aprovado
>
> Escopo deste documento: transformar a ideia bruta em produto, processo, arquitetura evolutiva,
> gates e experimento comercial. Não autoriza construção, contratação de infraestrutura, uso de
> imagem de terceiros nem publicação em conta real.

> Validação operacional: `validacao-esteira-conteudo-moda.md` — desenho aprovado somente para
> descoberta e spikes controlados; operação real, automação, SaaS e GPU permanecem bloqueados.
>
> Vínculo atualizado em 2026-08-30: o Motor Editorial Multicanal existente passa a ser o motor
> concreto da operação downstream; registro em
> `Ideias/ideias-pendentes/motor-editorial-vinculado-raio-x.md`.
>
> Atualização de produto em 2026-08-31: a entrega é apresentada como uma tríade de leitura clara —
> Raio-X Institucional 360°, Plano de Crescimento e Dossiê Editorial Executável. O terceiro artefato
> é a ponte entre estratégia e produção: descreve cada postagem, roteiro/slides, prompt, legenda,
> Stories, QA e medição, mas não autoriza publicação.

## 1. Decisão executiva

A oportunidade é válida, mas não deve nascer como um SaaS monolítico. A forma recomendada é uma
oferta em camadas, conectada pelo `case_id` do Raio-X:

```text
RAIO-X TAVIR
diagnostica a jornada e escolhe a prioridade
        ↓ gate de proposta/contrato
ATIVAÇÃO DE CRESCIMENTO
transforma o plano 30/60/90 em operação, marca, catálogo e calendário
        ↓ gate editorial por lote
OPERAÇÃO CRIATIVA ASSISTIDA
gera imagens/vídeos, faz QA, edita em lote e prepara legendas
        ↓ aprovação explícita
DISTRIBUIÇÃO
agenda, publica pela API oficial e reconcilia o resultado
        ↓ métricas reais
CICLO DE APRENDIZADO
mede gargalo, escolhe um experimento e atualiza o próximo ciclo
```

O Raio-X continua sendo uma porta de entrada paga, independente e de escopo fixo. Ele não inclui
execução criativa gratuita. A operação posterior é uma implantação/retentor separado, indicada
somente quando conteúdo e distribuição forem de fato a prioridade diagnosticada.

### 1.1 Concretização interna: Motor Editorial Multicanal

O projeto `empresas/tavir/operacao/marketing/motor-editorial-multicanal/` concretiza a camada entre
o plano do Raio-X e a produção/distribuição. A divisão de responsabilidades é:

- **Raio-X:** prioridade, objetivo, horizonte, métrica-mãe, público, oferta, evidências, restrições,
  capacidade, canais candidatos e referência/status do Brand Context Pack do cliente;
- **Motor Editorial:** tese, pilares, cadência, dossiers, variantes nativas, prompts, contratos de
  mídia, manifesto e retrospectiva;
- **Flow/fornecedores:** produção assistida dos assets aprovados;
- **DarkFlow:** edição em massa, agendamento, publicação e reconciliação quando liberado;
- **Growth:** leitura do scorecard e escolha de um experimento para o ciclo seguinte.

O `TAVIR-C01` é o dogfooding interno dessa ponte. Ele valida operação e custo, mas não substitui
as cinco conversas Mom Test nem o piloto externo pago exigidos antes de produtizar.

## 2. Problema e público inicial

### Problema

Pequenos e médios lojistas frequentemente concentram estratégia, catálogo, criação, postagem e
atendimento em uma pessoa. O bloqueio não é apenas “falta de conteúdo”: é falta de uma rotina que
conecte objetivo comercial, produção, aprovação, publicação e medição.

### ICP inicial confirmado

Começar por **lojas de moda feminina com catálogo próprio e responsável decisor acessível**, porque a ideia
de modelo/personagem vestindo peças cria um caso de uso nítido e testável. Critérios:

- 20–200 SKUs ativos, ou lançamentos recorrentes;
- Instagram profissional e canal de pedido já existentes;
- fotos das peças e direitos sobre marca/conteúdo organizáveis;
- dor real de produção e constância, confirmada por comportamento passado;
- capacidade de atender a demanda gerada;
- disponibilidade para aprovar lotes e fornecer dados agregados de resultado.

Lojas de outros nichos podem usar a mesma espinha dorsal, mas trocam o módulo `virtual_try_on` por
`product_scene`, `product_demo` ou produção editorial convencional. Não generalizar o provador antes
de provar moda.

O card `provinha` continua separado: ele trata um provador virtual infantil como produto técnico.
Esta esteira trata a operação comercial de conteúdo e começa com uma personagem virtual de aparência
adulta. Se o subnicho futuro
for moda infantil, direitos de imagem de menores, representação legal e controles adicionais exigem
uma descoberta jurídica própria antes de reaproveitar qualquer implementação.

## 3. Produto em três ofertas, não uma caixa infinita

| Oferta | Resultado comprado | Entregáveis principais | Limite |
|---|---|---|---|
| Raio-X Institucional 360° | saber o que a empresa é, como opera e onde agir primeiro | diagnóstico, oferta, marca, presença, prova, prioridades | não executa |
| Plano de Crescimento | decidir como crescer e aprender | objetivos, plano 30/60/90, canais, hipóteses e telemetria | consultivo; não produz |
| Dossiê Editorial Executável | saber exatamente o que produzir/publicar | calendário, peças, roteiros/slides, prompts, legendas, Stories, QA e métricas | ativação; não publica |
| Ativação de Crescimento | deixar a operação pronta | Brand Pack, perfil, templates, primeiro ciclo e baseline | implantação finita / combo |
| Operação de Conteúdo | manter a rotina funcionando | lotes aprovados, edição, legendas, agenda, publicação e scorecard | retentor/capacidade |

O software é infraestrutura da entrega, não a promessa. A promessa funcional é reduzir o ciclo
entre “produto disponível” e “conteúdo aprovado/publicado”, mantendo coerência de marca e aprendendo
com o que gera conversa, pedido ou venda.

## 4. Handoff obrigatório do Raio-X

O Plano de Crescimento só abre esta esteira quando registrar:

- gargalo priorizado: `conteudo`, `catalogo`, `distribuicao` ou combinação explícita;
- objetivo de 90 dias e uma métrica-mãe;
- baseline disponível ou lacuna a medir;
- estado atual do perfil/canal: BIO, link, fixados, frequência recente e baseline observável;
- público, oferta, canais e capacidade operacional;
- frequência sustentável, nunca escolhida apenas para “postar mais”;
- riscos, dependências e recomendação de próxima oferta TAVIR;
- classificação de evidência: observado, informado, inferido ou indisponível.
- referência e status do Brand Context Pack: fontes/versionamento, ativos autorizados, direitos,
  voz, proibições e responsável; `approved`, `pending` ou `blocked`.

Artefato futuro de integração: `growth_handoff.json`, versionado por schema e ligado ao `case_id`.
Ele não deve carregar PII desnecessária, senha, token, conversa de cliente ou mídia binária.
Pack `pending` ou `blocked` permite apenas discovery/copy interna: bloqueia prompt visual,
geração, produção, agenda e publicação.

O Raio-X registra o estado observado; o Motor entrega e testa as opções de BIO, perfil, calendário
e formatos. A execução não volta a ser escopo gratuito do diagnóstico.

## 5. Esteira operacional alvo

### E0 — elegibilidade e contratação

1. Raio-X indica conteúdo como prioridade.
2. TAVIR confirma que atendimento, pedido/checkout e oferta não impedirão o ganho.
3. Cliente escolhe implantação, piloto ou retentor em proposta separada.
4. Contrato define escopo, capacidade, SLA, direitos sobre materiais, DPA/LGPD, suboperadores e
   ausência de garantia de faturamento, alcance ou fidelidade perfeita de IA.

**Gate C0:** não iniciar produção sem escopo, responsável por aprovação, direitos documentados e
Brand Context Pack aprovado.

### E1 — onboarding de marca, catálogo e direitos

Entradas mínimas:

- logo mestre e regras de aplicação;
- cores, fontes, tom de voz, mensagens e palavras proibidas;
- catálogo/SKU, nome, preço quando aplicável, características e estoque editorial;
- fotos limpas da peça/produto e referências aprovadas;
- ficha canônica e pacote de referência da personagem virtual, com proveniência, direitos comerciais,
  fornecedores/modelos usados, aparência adulta, proibição de imitar pessoa real e versão aprovada;
- licença/autoria de música, voz, foto, vídeo e qualquer asset de terceiro;
- conta profissional do Instagram e autorização revogável para publicar.

**Regra:** logo, preço e texto exato são compostos na pós-produção. Não pedir ao modelo generativo
que “desenhe” logotipo, etiqueta ou informação comercial crítica.

**Decisão do piloto:** não haverá modelo humana. A loja aprovará uma personagem virtual original,
tratada como ativo de marca. Isso remove a dependência de autorização de uma pessoa específica, mas
não remove os gates de propriedade intelectual, termos dos fornecedores, transparência de IA e risco
de semelhança acidental com pessoa real.

### E2 — planejamento do ciclo

O plano de crescimento vira um `content_batch` com:

- hipótese comercial;
- etapa do funil e CTA;
- SKUs priorizados;
- formatos e quantidade máxima;
- roteiro/ângulo por peça;
- canais e janela editorial;
- métrica de decisão;
- orçamento máximo de geração;
- prazo e aprovador.

O lote é pequeno o suficiente para aprender. No piloto, uma hipótese por semana e nenhuma geração
em massa antes de aprovar amostras.

### E3 — ingestão e controle de qualidade da entrada

Cada asset recebe hash, proprietário, finalidade, licença/consentimento, prazo de retenção e vínculo
com SKU/personagem. O preflight bloqueia:

- foto insuficiente ou peça parcialmente oculta;
- divergência entre SKU e referência;
- ausência de direito/consentimento;
- menor de idade sem fluxo jurídico específico — fora do piloto;
- logos/textos já queimados na imagem de referência quando prejudicarem a geração;
- conteúdo sensível, proibido ou incompatível com a plataforma.

### E4 — geração de imagens

Três rotas de job, por adaptadores substituíveis:

1. `virtual_try_on`: pessoa aprovada + peça → variações vestindo o produto;
2. `product_to_model`: produto → cena/modelo editorial sem identidade fixa obrigatória;
3. `product_scene`: produto preservado → cenário/lifestyle sem pessoa.

Cada job é assíncrono e passa por estados explícitos:

```text
draft → input_review → queued → running → qa_pending
      → approved | correction_requested | rejected | failed | cancelled | expired
```

Não prometer identidade ou produto “100% idênticos”. O QA compara peça, cor, textura, modelagem,
anatomia, mãos, rosto, marca e artefatos. Resultado que possa induzir o comprador a erro é rejeitado
ou rotulado como imagem ilustrativa conforme decisão jurídica/comercial.

### E5 — geração de vídeos

Somente imagens aprovadas podem alimentar vídeo. Rotas possíveis:

- imagem→vídeo com direção de câmera/movimento;
- motion control quando o fornecedor e o modelo demonstrarem consistência suficiente;
- vídeo de produto sem pessoa;
- UGC com personagem/produto, apenas com direitos e roteiro aprovados.

O sistema registra fornecedor, modelo/versão, parâmetros, seed quando houver, custo, duração e
proveniência. A escolha de Runway, Kling, Veo, fluxo local ou outro provedor é decisão do adaptador,
não do domínio da esteira.

### E6 — pós-produção em massa

O DarkFlow é o motor candidato para:

- normalização de formato, resolução, duração e áudio;
- cortes e variações;
- transcrição/legendas queimadas quando aprovadas;
- composição determinística de logo, CTA e textos;
- manifesto de saída com hash e metadados;
- entrega ao Publicador sem pasta arbitrária ou mídia não rastreada.

Não duplicar o editor nem o scheduler do DarkFlow dentro do Raio-X.

### E7 — copy, calendário e aprovação

Legenda nasce do plano do lote, dos dados aprovados do SKU e da voz da marca. Deve conter:

- objetivo/ângulo;
- corpo e CTA;
- hashtags somente quando úteis;
- avisos ou condições necessários;
- vínculo com o asset final e sua versão.

Um aprovador humano vê mídia, legenda, data, conta e CTA juntos. Alterar qualquer um invalida o
hash de aprovação. A geração automática de legenda não equivale a autorização de publicação.

### E8 — agendamento e publicação

Reusar o Portão 2 do DarkFlow. Requisitos já conhecidos:

- Instagram profissional pela API oficial;
- OAuth e token cifrado, com refresh e reconexão;
- mídia temporariamente acessível à Meta, com expurgo;
- container criado perto da publicação, nunca dias antes;
- poll de processamento de vídeo antes de `media_publish`;
- checagem do limite real da conta;
- idempotência, atraso, retry limitado e reconciliação por ID/permalink;
- consentimento registrado e revogável para agir em nome do cliente.

**Gate P1:** publicação real continua bloqueada enquanto o adaptador Meta, R2/cofre, canário,
auditoria final e handoff do DarkFlow estiverem pendentes.

### E9 — medição e próximo ciclo

O scorecard separa produção de resultado:

- produção: tempo de ciclo, custo, falha, retrabalho e aprovação;
- distribuição: sucesso, atraso, reconexão e publicação reconciliada;
- atenção: alcance/reprodução e retenção quando autorizados;
- ação: visitas ao perfil/link, conversas, pedidos e vendas agregadas quando disponíveis;
- aprendizado: hipótese, resultado, decisão `continuar | ajustar | parar`.

O sistema escolhe a pior taxa do funil e propõe **um** experimento para o próximo ciclo. Volume de
posts, curtidas ou seguidores isolados não são métrica-mãe.

## 6. Arquitetura evolutiva

### Estágio A — concierge assistido

Sem plataforma nova para o cliente. O operador TAVIR usa Raio-X, storage privado, fornecedores de
geração, DarkFlow e aprovação documentada. Planilha/manifesto controlado pode coordenar o lote.

Objetivo: provar valor, qualidade e custo. Este é o MVP comercial recomendado.

### Estágio B — cockpit interno single-tenant

Adicionar orquestrador interno quando a operação manual demonstrar repetição:

```text
Raio-X/Supabase ── growth_handoff ──> Orquestrador interno
                                         │
                ┌────────────────────────┼───────────────────────┐
                ▼                        ▼                       ▼
          Storage privado          Fila de jobs          Metadados/auditoria
                │                        │
                │             ┌──────────┴──────────┐
                │             ▼                     ▼
                │       APIs gerenciadas       RunPod/worker GPU
                │             └──────────┬──────────┘
                ▼                        ▼
          galeria de QA ── aprovação ── DarkFlow ── Publicador Meta
                                                     │
                                                     ▼
                                                scorecard
```

### Estágio C — portal de cliente multi-tenant

Só após validação paga e operacional. Exige autenticação madura, isolamento por tenant/RLS,
autorização por objeto, cotas/custos, MFA administrativo, storage por cliente, exclusão/exportação,
auditoria e Tech Provider/App Review da Meta.

O portal deve surgir do processo provado; não é pré-requisito para o primeiro piloto.

## 7. Estratégia de fornecedores

O domínio usa contratos `ImageProvider`, `VideoProvider`, `StorageProvider` e `PublisherProvider`.
Cada job grava provedor, versão, custo, latência, direitos/termos aplicáveis e resultado do QA.
O comparativo de fornecedor avalia qualidade aprovada — não geração bruta —, custo, latência,
disponibilidade, retenção/uso dos inputs, região de processamento, direitos comerciais da saída,
moderação, suporte e mecanismo de exclusão. Termos incompatíveis com o DPA eliminam o fornecedor,
mesmo que a imagem seja melhor.

### Imagem/virtual try-on

- **Managed API primeiro:** menor tempo de integração e melhor para comparar qualidade/custo.
- **Google Vertex AI:** possui Virtual Try-On GA no endpoint `virtual-try-on-001` desde 2026-01-23;
  deve entrar em spike, não ser adotado por reputação.
- **FASHN:** API especializada em moda/try-on; candidata a comparação controlada.
- **Fluxo próprio/ComfyUI:** só depois, se volume, controle ou custo justificarem a complexidade.

### Vídeo

- Provar duas rotas em material real: uma API gerenciada e um fluxo controlável.
- Runway já oferece API assíncrona e receitas de vídeo de produto/UGC; é candidato, não padrão.
- Motion Control deve passar por teste de identidade, fidelidade da roupa, anatomia e repetibilidade.

### GPU/RunPod

RunPod faz sentido quando existir workflow próprio empacotável. Serverless oferece worker em container,
fila e escala a zero; cold start e tamanho do modelo entram no SLA. A ordem correta é:

1. provar o workflow localmente;
2. empacotar imagem imutável e versionada;
3. testar com lote sintético/licenciado;
4. medir cold start, tempo GPU, erro e custo por aprovado;
5. só então integrar à fila principal.

Não manter GPU 24/7 para um piloto de demanda esporádica sem dados que justifiquem.

## 8. Spikes de viabilidade obrigatórios

### S0 — fundação da personagem virtual

- preencher `ficha-personagem-virtual.md` sem usar foto, nome ou traços de uma pessoa real;
- gerar uma prancha-base com rosto, corpo inteiro, perfil e três expressões neutras;
- aparência inequivocamente adulta e adequada ao posicionamento da loja-piloto;
- registrar provedor, modelo/versão, prompt, seed quando houver e termos comerciais aplicáveis;
- executar busca visual e revisão humana razoável para reduzir semelhança evidente com celebridade
  ou pessoa identificável, sem prometer inexistência absoluta de semelhança;
- obter aprovação da loja sobre a identidade e o aviso “modelo virtual” antes do try-on;
- congelar a versão `character_id + character_version` usada em todos os jobs do piloto.

**Passa:** a personagem é consistente nas vistas-base, possui proveniência e direitos comerciais
documentados, não apresenta semelhança evidente conhecida e foi aprovada pela loja-piloto.

### S1 — fidelidade de moda

- 1 personagem virtual aprovada em S0;
- 5 peças representativas: lisa, estampada, textura, sobreposição e modelagem difícil;
- 3 poses e 2 fornecedores;
- avaliação cega de fidelidade da peça e identidade;
- medir taxa aprovada, tentativas e custo por imagem aprovada.

**Passa:** critério de fidelidade definido pelo piloto e nenhuma distorção comercial crítica nas
imagens aprovadas. O percentual final será decidido antes de executar, não inventado neste plano.

### S2 — consistência de vídeo

- 5 imagens aprovadas;
- 2 movimentos curtos por imagem;
- comparar API gerenciada e motion control;
- medir identidade, roupa, mãos/corpo, flicker, tempo e custo por vídeo aprovado.

### S3 — composição determinística

- aplicar logo, preço/CTA e legenda via pós-produção;
- provar safe areas nos formatos escolhidos;
- confirmar que nenhum texto/logotipo depende do gerador visual.

### S4 — publicação oficial

- concluir os insumos e o adaptador real já planejados no DarkFlow;
- publicar uma mídia própria/licenciada em conta testadora;
- reconciliar container, publicação, ID/permalink, atraso, expurgo e log;
- Auditor Seg/LGPD decide `liberado_para_deploy`.

## 9. Piloto comercial recomendado

### Formato

- uma loja de moda;
- quatro semanas;
- uma conta profissional;
- uma personagem virtual feminina, original e de aparência adulta, aprovada em S0;
- até 5 SKUs representativos;
- 1 lote-amostra antes da produção;
- até 12 peças estáticas e 4 vídeos curtos no ciclo, sujeitos à capacidade e qualidade;
- aprovação humana de toda mídia e legenda;
- publicação assistida ou manual enquanto P1 estiver bloqueado;
- scorecard semanal e debrief final.

Os números são **limite de desenho do experimento**, não pacote comercial ou promessa pública.

### Critérios para avançar ao cockpit interno

Antes do piloto, Carlos define os limiares. O scorecard deve ao menos responder:

- o cliente pagou e concluiu o ciclo;
- tempo manual por lote e por peça aprovada;
- custo de IA por peça aprovada;
- taxa de aprovação na primeira rodada;
- retrabalho por causa;
- publicações no prazo e falhas reconciliadas;
- cliente aprovou com cadência sustentável;
- houve ganho operacional percebido e intenção de renovar;
- a métrica comercial escolhida pôde ser observada sem promessa causal.

### Critérios para considerar SaaS/multi-tenant

- pelo menos 3 pilotos pagos concluídos;
- processo repetível em mais de um cliente;
- unit economics e capacidade conhecidos;
- uso recorrente que justifique portal;
- App Review/Tech Provider e DPA operacionalmente viáveis;
- segurança e suporte compatíveis com um produto multi-cliente.

## 10. Métricas

| Camada | Métrica | Interpretação |
|---|---|---|
| Comercial | Raio-X → proposta → piloto → renovação | valida a oferta |
| Operação | tempo pedido→aprovado | mede o ciclo real |
| Qualidade | aprovação na primeira rodada | mede adequação do pipeline |
| Custo | custo IA por asset aprovado | evita otimizar geração bruta |
| Confiabilidade | falha/retry/retrabalho por causa | indica gargalo técnico |
| Publicação | sucesso no horário + reconciliação | prova a automação |
| Funil | alcance→ação→conversa→pedido, conforme dados | liga conteúdo ao negócio |
| Retenção | renovação e capacidade consumida | prova valor sustentável |

Todo benchmark externo fica `[PREMISSA]` até haver dado da conta. Métrica de vaidade não substitui
conversas, pedidos ou vendas agregadas.

## 11. Segurança, LGPD, direitos e plataforma

### Perfil por estágio

- Concierge: `INTERNA`, com `dados_pessoais`, `upload`, `ia_externa`, `webhook` e integrações.
- Cockpit interno: `INTERNA`, somando `admin`, storage e APIs.
- Portal: `SAAS`, somando `autenticacao`, `multi_tenant`, `api_publica` e rigor máximo.

### Ameaças principais

- vazamento ou uso cruzado de fotos/modelos/produtos entre clientes;
- uso de imagem sem consentimento válido ou além do prazo/finalidade;
- personagem sintética reproduzir semelhança evidente de pessoa real ou ser reutilizada por outro
  cliente sem direito contratual;
- prompt/input malicioso alcançando storage, fetch ou worker GPU;
- custo explosivo por job duplicado, abuso ou retry sem teto;
- publicação na conta errada ou sem aprovação da versão final;
- token Meta exposto, não renovado ou impossível de revogar;
- URL pública de mídia com validade excessiva;
- conteúdo enganoso por alteração do produto, corpo ou condição comercial.

### Controles mínimos

- consentimento e licença vinculados ao asset e revogáveis;
- `character_id`, versão, proveniência, direitos comerciais e cliente autorizado vinculados a cada
  saída; personagem não é compartilhada entre marcas por padrão;
- retenção/expurgo por classe de dado e suboperador;
- bucket privado, URL assinada curta apenas quando o fornecedor precisar baixar;
- allowlist de tipo/tamanho, varredura e nomes gerados no upload;
- idempotência, cotas e orçamento por tenant/lote/job;
- segregação por cliente e autorização server-side;
- aprovação versionada por hash antes da agenda;
- segredos em cofre, nunca no front-end/log/repositório;
- inventário de suboperadores e transferência internacional no DPA;
- proveniência e identificação de conteúdo gerado/alterado por IA quando lei, plataforma ou risco de
  engano exigirem; metadados de origem não devem ser removidos sem decisão documentada;
- política de privacidade, exclusão de dados e callbacks Meta funcionais;
- auditoria independente antes de qualquer deploy/conta real.

O piloto não usa pessoa real. Se isso mudar, será exigida autorização compatível com geração por IA,
edição, canais, território, prazo, revogação e eventual uso comercial. Mesmo com personagem
sintética, propriedade intelectual, licença dos fornecedores, transparência e risco de semelhança
entram na minuta; contrato e DPA precisam de revisão por advogado OAB.

## 12. Escopo negativo do primeiro ciclo

- dashboard mobile próprio;
- SaaS multi-tenant ou self-service;
- geração ilimitada ou SLA de “tudo em uma hora”;
- menor de idade;
- clonagem de voz ou rosto sem consentimento específico;
- personagem de celebridade ou terceiro sem direitos;
- garantia de fidelidade perfeita, alcance, venda ou faturamento;
- publicação sem aprovação editorial;
- DM automática, compra de seguidores/engajamento ou scraping de sessão;
- live falsa, conteúdo em massa inautêntico ou automação fora da API oficial;
- treinamento/fine-tuning com conteúdo do cliente sem autorização específica;
- construir editor, scheduler ou publicador duplicado;
- GPU dedicada permanente antes de medir demanda.

## 13. Roadmap e gates

| Fase | Entrega | Gate para avançar |
|---|---|---|
| A — descoberta comercial | 5 conversas Mom Test + ficha do piloto | dor passada, orçamento e aprovador confirmados |
| B — desenho do piloto | escopo, ficha da personagem, DPA, scorecard e amostras | C0 aprovado |
| C — spikes | S0–S4 com custos e falhas | qualidade/viabilidade decididas, P1 aprovado ou publicação manual |
| D — piloto concierge | 4 semanas, debrief e unit economics | piloto pago concluído e decisão renovar/ajustar/parar |
| E — cockpit interno | fila, adapters, QA e handoff automatizados | repetição provada; auditoria antes de operação real |
| F — produto multi-cliente | portal, Tech Provider, suporte e operação | 3 pilotos pagos + gates jurídico/Meta/segurança |

### Ordem imediata recomendada

1. Validar a oferta em 5 conversas, sem vender “plataforma”.
2. Formalizar a empresa em mente apenas como `Loja Piloto A` até o intake privado e escolher cinco SKUs.
3. Criar e aprovar a ficha da personagem virtual original e os critérios objetivos de fidelidade.
4. Executar S0, S1 e S2 antes de construir orquestrador.
5. Concluir o gate externo Meta do DarkFlow em paralelo, sem bloquear o piloto manual.
6. Orçar e propor o piloto somente depois de conhecer custo por asset aprovado.

## 14. Decisões do gate

### Confirmadas em 2026-08-22

1. infraestrutura própria candidata: **RunPod**;
2. primeiro subnicho: **moda feminina**;
3. existe uma loja em mente, preservada no repositório como **Loja Piloto A** até intake privado;
4. o piloto usará **personagem virtual original de aparência adulta**, não modelo humana.

### Ainda necessárias antes da execução

Não bloqueiam o registro deste plano, mas bloqueiam execução:

1. decidir se a TAVIR opera tudo no piloto ou se o lojista também usa o cockpit;
2. definir a métrica-mãe do piloto: tempo economizado, conversas, pedidos ou outra;
3. aprovar a ficha visual da personagem, seus direitos de uso e o aviso “modelo virtual”;
4. definir os limiares de aprovação de S0/S1/S2 e o orçamento máximo dos spikes;
5. decidir se a publicação no piloto será manual enquanto o gate Meta estiver aberto;
6. decidir se o nome futuro será extensão de “Raio-X TAVIR” ou uma oferta própria.

## 15. Fontes técnicas verificadas

Consultadas em 2026-08-22; requisitos voláteis devem ser reverificados antes da implementação:

- Meta Instagram Platform — publicação oficial por container e `media_publish`:
  https://developers.facebook.com/docs/instagram-platform/content-publishing
- RunPod Serverless — workers em containers, fila, flex/active workers e versionamento:
  https://docs.runpod.io/serverless/workers/overview
- Google Vertex AI — Virtual Try-On GA e endpoint `virtual-try-on-001`:
  https://docs.cloud.google.com/vertex-ai/generative-ai/docs/release-notes
- FASHN API — plataforma especializada em virtual try-on:
  https://docs.fashn.ai/getting-started/api-setup
- Runway API — tarefas assíncronas, vídeo e receitas de produto/UGC:
  https://docs.dev.runwayml.com/guides/using-the-api/
