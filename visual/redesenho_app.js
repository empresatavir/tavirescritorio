
const IC = {
  gauge: 'M3 17a9 9 0 0 1 18 0M12 17l4.5-5M7 17h.01M17 17h.01',
  zap: 'M13 3 5 14h6l-1 7 8-11h-6z',
  play: 'M7 5v14l11-7z',
  kanban: 'M4 4h6v16H4zM14 4h6v10h-6z',
  shield: 'M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6zM9 12l2 2 4-4',
  bot: 'M6 8h12v11H6zM12 8V4M9.5 12.5h.01M14.5 12.5h.01M9.5 16h5',
  msg: 'M5 5h14v11H9l-4 3z',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13M20 20l-4.8-4.8',
  spark: 'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z',
  factory: 'M3 20V10l6 3v-3l6 3V7l6 3v10zM7 16h2M12 16h2M17 16h2',
  flow: 'M4 5h5v5H4zM15 14h5v5h-5zM9 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 0 1 1.7',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4',
  case: 'M8 7V5h8v2M4 7h16v12H4zM4 12h16',
  filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4',
  wallet: 'M4 7h15v12H4zM4 7l11-3v3M15 13h2',
  user: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8M5 20a7 7 0 0 1 14 0',
  share: 'M7 10a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M17 4a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M17 15a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M9.2 11.3l5.6-3M9.2 13.7l5.6 3',
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z',
  brain: 'M9 4a3 3 0 0 0-3 3a3 3 0 0 0-2 5a3 3 0 0 0 3 5h2V4zM15 4a3 3 0 0 1 3 3a3 3 0 0 1 2 5a3 3 0 0 1-3 5h-2V4z',
  db: 'M5 6c0-2.7 14-2.7 14 0s-14 2.7-14 0M5 6v12c0 2.7 14 2.7 14 0V6M5 12c0 2.7 14 2.7 14 0',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 11.5h.01',
  mile: 'M4 6h9M8 12h12M6 18h8',
  chart: 'M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6',
  pulse: 'M3 12h4l2-6 4 12 2-6h6',
  net: 'M10 3h4v4h-4zM4 17h4v4H4zM16 17h4v4h-4zM12 7v5M6 17v-2.5h12V17',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v5M12 8h.01',
  pause: 'M8 5v14M16 5v14',
  retry: 'M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5',
  send: 'M4 12 20 4l-6 16-3-7z',
  clip: 'M20 11.5l-8.5 8.5a5 5 0 0 1-7-7L13 4.5a3.5 3.5 0 0 1 5 5L9.5 18a2 2 0 0 1-3-3L14 7.5',
  compass: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M15.5 8.5l-2 5-5 2 2-5z',
  diagram: 'M3 4h6v5H3zM15 4h6v5h-6zM9 15h6v5H9zM6 9v3h12V9M12 12v3',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'
};

const DOMAINS = [
  { id: 'op', label: 'Operação', icon: 'gauge', items: [['room', 'Sala de Operação', 'gauge'], ['exec', 'Execuções', 'zap', 'jobs'], ['tasks', 'Tasks', 'kanban', 'tasks'], ['decisions', 'Decisões', 'shield', 'aps'], ['agents', 'Agentes', 'bot'], ['chat', 'Chat', 'msg']] },
  { id: 'mod', label: 'Módulos', icon: 'layers', items: [['modhub', 'Visão dos módulos', 'layers'], ['raiox', 'Raio-X', 'search'], ['studio', 'Studio', 'spark'], ['fabrica', 'Fábrica', 'factory', 'gate'], ['flow', 'Flow', 'flow', 'beta'], ['edicao', 'Edição', 'film', 'beta']] },
  { id: 'com', label: 'Comercial', icon: 'case', items: [['funil', 'Funil', 'filter'], ['propostas', 'Propostas', 'file', 'prop'], ['financas', 'Finanças', 'wallet'], ['personas', 'Personas', 'user']] },
  { id: 'soc', label: 'Social', icon: 'share', items: [['social', 'Perfis e calendário', 'share'], ['comms', 'Comunicações', 'inbox', 'comms']] },
  { id: 'kn', label: 'Conhecimento', icon: 'brain', items: [['cerebro', 'Cérebro', 'brain'], ['memoria', 'Memória e biblioteca', 'db'], ['ideias', 'Ideias', 'bulb']] },
  { id: 'est', label: 'Estratégia', icon: 'map', items: [['mission', 'Mission Control', 'target'], ['roadmap', 'Roadmap', 'mile'], ['mapa', 'Mapa operacional', 'map']] },
  { id: 'sys', label: 'Sistema', icon: 'pulse', items: [['analytics', 'Analytics', 'chart'], ['doctor', 'Doctor', 'pulse', 'doctor'], ['skills', 'Skills', 'spark'], ['org', 'Org Chart', 'net'], ['config', 'Configurações', 'sliders']] }
];
const CHILD = { modhub: 'Modulos', raiox: 'RaioX', studio: 'Studio', fabrica: 'Fabrica', flow: 'Flow', edicao: 'Edicao', agents: 'Agentes', funil: 'Comercial', propostas: 'Comercial', financas: 'Comercial', personas: 'Comercial', social: 'Social', comms: 'Social', cerebro: 'Conhecimento', memoria: 'Conhecimento', ideias: 'Conhecimento', mission: 'Estrategia', roadmap: 'Estrategia', mapa: 'Estrategia', analytics: 'Sistema', doctor: 'Sistema', skills: 'Sistema', org: 'Sistema', config: 'Config', fluxo: 'Fluxo' };

const STATUS = {
  running: ['Rodando', 'flow', '#1BC5BD', 'run'],
  queued: ['Na fila', '', '#aeb7c4', ''],
  failed: ['Falhou', 'danger', 'oklch(.635 .185 27)', 'danger'],
  completed: ['Concluído', 'flow', '#1BC5BD', ''],
  paused: ['Pausado', 'warn', 'oklch(.80 .155 78)', 'warn']
};

const JOBS = [
  { id: 'job-014', title: 'SEO da landing principal', who: 'Nina SEO', ini: 'NS', status: 'running', progress: 62, model: 'claude-sonnet-4', motor: 'Cursor', effort: 'equilibrado', task: '#30', cost: 1.84, ceiling: 8, started: '13:41', tokens: '412k' },
  { id: 'job-011', title: 'Carrossel Multiverso ep. 14', who: 'Adriano Arte', ini: 'AA', status: 'running', progress: 41, model: 'claude-sonnet-4', motor: 'Cursor', effort: 'equilibrado', task: '#27', cost: 0.92, ceiling: 5, started: '13:55', tokens: '188k' },
  { id: 'job-009', title: 'Detalhar roadmap Q4', who: 'Arquiteto de Nicho', ini: 'AN', status: 'queued', progress: 0, model: 'claude-opus-4', motor: 'Claude', effort: 'profundo', task: '#21', cost: 0, ceiling: 12, started: '—', tokens: '0' },
  { id: 'job-007', title: 'Deploy landing Meridian', who: 'Davi DevOps', ini: 'DD', status: 'failed', progress: 70, model: 'claude-sonnet-4', motor: 'Cursor', effort: 'rápido', task: '#18', cost: 2.10, ceiling: 6, started: '12:20', tokens: '530k' },
  { id: 'job-006', title: 'Auditoria API — hardening', who: 'Atlas Web', ini: 'AW', status: 'completed', progress: 100, model: 'gpt-4o', motor: 'Codex', effort: 'profundo', task: '#9', cost: 3.40, ceiling: 10, started: '09:12', tokens: '1,1M' },
  { id: 'job-003', title: 'Revisão headline LP advocacia', who: 'Rita Revisora', ini: 'RR', status: 'paused', progress: 80, model: 'claude-sonnet-4', motor: 'Cursor', effort: 'rápido', task: '#12', cost: 0.44, ceiling: 2, started: '11:05', tokens: '96k' }
];

const TASKS = [
  { id: 't1', seq: 12, title: 'Headline da LP de advocacia passou de 60 caracteres', status: 'in_progress', who: 'Rita Revisora', ini: 'RR', prio: 'Alta', sector: 'Conteúdo', gate: true, job: 'job-003' },
  { id: 't2', seq: 18, title: 'Deploy landing Meridian — SUPABASE_URL ausente', status: 'in_progress', who: 'Davi DevOps', ini: 'DD', prio: 'Crítica', sector: 'Engenharia', gate: true, job: 'job-007' },
  { id: 't3', seq: 21, title: 'Roadmap Q4 IA Livros — priorizar 3 frentes', status: 'to_plan', who: 'Paula PM', ini: 'PP', prio: 'Alta', sector: 'Estratégia', planning: true, job: 'job-009' },
  { id: 't4', seq: 9, title: 'Auditoria de segurança da API', status: 'done', who: 'Atlas Web', ini: 'AW', prio: 'Normal', sector: 'Qualidade', job: 'job-006' },
  { id: 't5', seq: 24, title: 'Proposta Atlas — contra-assinatura local', status: 'planned', who: 'Cléber Closer', ini: 'CC', prio: 'Alta', sector: 'Comercial' },
  { id: 't6', seq: 27, title: 'Carrossel Multiverso — 7 frames do episódio 14', status: 'in_progress', who: 'Adriano Arte', ini: 'AA', prio: 'Normal', sector: 'Conteúdo', job: 'job-011' },
  { id: 't7', seq: 30, title: 'SEO da landing principal', status: 'planned', who: 'Nina SEO', ini: 'NS', prio: 'Normal', sector: 'Social', job: 'job-014' },
  { id: 't8', seq: 31, title: 'Oferta de presença local — claims e preço', status: 'to_plan', who: 'Dora Descoberta', ini: 'DD', prio: 'Normal', sector: 'Comercial' }
];

const APS = [
  { id: 'ap-02', group: 'block', kind: 'deploy', title: 'Deploy landing Meridian — variável ausente', who: 'Davi DevOps', ini: 'DD', type: 'Checkpoint', status: 'pending', impact: 'alto', task: '#18', age: 'há 2 h', ageH: 2, reason: 'O build da landing passou, mas o deploy parou porque SUPABASE_URL não existe na conta da Meridian. Nada foi publicado e o site atual continua no ar.', question: 'Registrar SUPABASE_URL no cofre local e refazer o deploy da Meridian?', yes: ['A variável é gravada no cofre local', 'O job-007 refaz o deploy a partir do passo 4', 'Edna roda a regressão antes de publicar'], no: ['O deploy continua parado', 'O card #18 volta para Planejado', 'Davi recebe o seu motivo no chat do card'], more: ['Davi responde no chat do card', 'A decisão continua na caixa', 'O SLA não é reiniciado'], cost: 'US$ 0,40', scope: '1 variável', time: '+15 min', block: true, link: ['Ver job-007 rodando', 'exec', 'job-007'] },
  { id: 'ap-01', group: 'scope', kind: 'roadmap', title: 'Roadmap Q4 IA Livros — aprovar priorização', who: 'Arquiteto de Nicho', ini: 'AN', type: 'Autorização', status: 'pending', impact: 'alto', task: '#21', age: 'há 3 h', ageH: 3, reason: 'O livro guia do método sobe para a primeira frente, porque 3 de cada 4 comentários do canal pedem o método por escrito. Muda a ordem de trabalho de Elisa Escritora e Otto Estruturador no trimestre.', question: 'Aprovar a nova ordem das três frentes de IA Livros para o Q4?', yes: ['Paula reordena as frentes no Roadmap', 'O job-009 sai da fila e detalha o livro', 'Elisa e Otto recebem a nova pauta'], no: ['A ordem atual continua valendo', 'O card #21 volta para A planejar', 'O Arquiteto revê com o seu motivo'], more: ['O Arquiteto responde com números de audiência', 'A decisão continua na caixa', 'O SLA não é reiniciado'], cost: 'US$ 12 de teto', scope: '3 frentes', time: 'Q4', scopeChange: true, link: ['Ver o Roadmap', 'roadmap'] },
  { id: 'ap-04', group: 'scope', kind: 'ceiling', title: 'Gasto mensal acima do teto — modelo opus-4', who: 'Paula PM', ini: 'PP', type: 'Autorização', status: 'pending', impact: 'médio', task: '#30', age: 'há 40 min', ageH: 0.7, reason: 'O job de SEO usa claude-opus-4. Mantido assim, outubro fecha em US$ 338, acima do teto de US$ 300. Trocando para claude-sonnet-4, a projeção cai para US$ 268.', question: 'Subir o teto de outubro de US$ 300 para US$ 340?', yes: ['O teto de outubro passa a US$ 340', 'O job-014 segue com claude-opus-4', 'Em novembro o teto volta a US$ 300'], no: ['O teto continua em US$ 300', 'O job-014 troca para claude-sonnet-4 no próximo passo', 'A projeção do mês cai para US$ 268'], more: ['Paula responde com o custo por passo', 'A decisão continua na caixa', 'O job segue até o teto atual'], cost: '+US$ 40', scope: '1 job', time: 'outubro', scopeChange: true, link: ['Ver Finanças', 'financas'] },
  { id: 'ap-05', group: 'scope', kind: 'contract', title: 'Proposta Atlas — contra-assinatura', who: 'Cléber Closer', ini: 'CC', type: 'Checkpoint', status: 'pending', impact: 'médio', task: '#24', age: 'ontem', ageH: 20, reason: 'A Atlas Holdings aceitou a PRO-001 pela ponte em 27/10. O contrato só passa a valer com a contra-assinatura da TAVIR.', question: 'Contra-assinar a PRO-001 da Atlas Holdings?', yes: ['A PRO-001 vira contrato', 'O projeto Atlas abre na Fábrica com a esteira de landing', 'Fábio Finanças emite a primeira cobrança'], no: ['A proposta volta para negociação', 'Cléber recebe o seu motivo', 'A Atlas é avisada por e-mail'], more: ['Cléber responde com o histórico da negociação', 'A decisão continua na caixa', 'A Atlas não é avisada'], cost: 'R$ 48.500', scope: '1 contrato', time: 'hoje', link: ['Abrir a Fábrica', 'fabrica'] },
  { id: 'ap-03', group: 'review', kind: 'text', title: 'Headline LP acima do limite — manter ou cortar?', who: 'Rita Revisora', ini: 'RR', type: 'Revisão', status: 'pending', impact: 'baixo', task: '#12', age: 'há 5 h', ageH: 5, reason: 'A headline da LP de advocacia tem 68 caracteres. O limite editorial é 60. A Rita propõe uma versão curta com a mesma promessa.', question: 'Trocar a headline pela versão curta da Rita?', yes: ['A headline curta entra na LP', 'O card #12 sai do gate', 'O job-003 retoma a revisão'], no: ['A headline de 68 caracteres fica', 'A exceção ao limite vai para o canon', 'O job-003 retoma sem mudança'], more: ['Rita responde com mais duas opções', 'A decisão continua na caixa', 'O job-003 segue pausado'], cost: '—', scope: '1 texto', time: 'imediato', link: ['Ver Tasks', 'tasks'] },
  { id: 'ap-06', group: 'review', kind: 'hardening', title: '2 recomendações de hardening — API', who: 'Rita Revisora', ini: 'RR', type: 'Revisão', status: 'approved', impact: 'baixo', task: '#9', age: 'ontem', ageH: 26, reason: 'Rate limiting e headers de segurança na API local. Recomendação da auditoria do Atlas Web.', question: 'Aplicar rate limiting e headers de segurança no próximo deploy?', yes: ['Entram no próximo deploy'], no: ['Ficam registradas como risco aceito'], more: ['Atlas Web detalha o risco'], cost: '—', scope: '2 itens', time: 'próximo deploy', decidedAt: 'ontem, 18:10' }
];
const HEAD_CUR = 'Advocacia empresarial que resolve antes de o problema virar processo';
const HEAD_NEW = 'Advocacia que resolve antes do problema virar processo';

const CHATS = {
  'cv-paula': { agent: 'Paula PM', ini: 'PP', role: 'Orquestradora & Planejamento', model: 'claude-opus-4', title: 'Planejar o Q4', time: '14:12', busy: true, messages: [
    { role: 'user', text: 'Paula, o que está travado agora na sala?' },
    { role: 'agent', text: 'Dois gates humanos: o deploy da Meridian (variável ausente) e a priorização do roadmap de IA Livros. O carrossel do Multiverso segue sem bloqueio.' }
  ] },
  'cv-yuri': { agent: 'Yuri UX', ini: 'YU', role: 'UX Research & Prova Visual', model: 'claude-sonnet-4', title: 'Prova visual da LP', time: '11:40', busy: true, messages: [
    { role: 'agent', text: 'A hero da landing ainda compete com o menu. Sugiro uma prova em 1440 e 390 antes de liberar a construção.' }
  ] },
  'cv-dora': { agent: 'Dora Descoberta', ini: 'DD', role: 'Gate 0 & Intake Descoberta', model: 'claude-sonnet-4', title: 'Intake da oferta local', time: 'ontem', busy: false, messages: [
    { role: 'user', text: 'Abre um raio-x de presença local para a loja da rua.' },
    { role: 'agent', text: 'Caso aberto em Fronteira. Próximo passo é a coleta: site, Instagram, Google e opinião de cliente.' }
  ] }
};

const ROSTER = [
  ['Paula PM', 'Orquestradora & Planejamento', 'Operação', 'PP', true], ['Jane', 'Coordenação Operacional', 'Operação', 'JA', false],
  ['Rebeca Recepção', 'Triagem & Recepção', 'Operação', 'RR', false], ['Vitor Construtor', 'Dev Frontend Sênior (Nuxt/Vue)', 'Engenharia', 'VC', true],
  ['Davi DevOps', 'CI/CD & Infraestrutura', 'Engenharia', 'DD', false], ['Théo Tech Lead', 'Liderança Técnica & Padrões', 'Engenharia', 'TT', false],
  ['Yuri UX', 'UX Research & Prova Visual', 'Design', 'YU', true], ['Marina Marca', 'Identidade Visual & Design System', 'Design', 'MM', false],
  ['Nina SEO', 'SEO Técnico & Distribuição', 'Social', 'NS', false], ['Iara Instagram', 'Produção de Conteúdo Instagram', 'Social', 'II', false],
  ['Adriano Arte', 'Direção de Arte & Assets', 'Conteúdo', 'AA', false], ['Oráculo Diretor', 'Diretor Editorial & Produção', 'Conteúdo', 'OD', false],
  ['Rita Revisora', 'QA Editorial & Gramatical', 'Conteúdo', 'RR', false], ['Dora Descoberta', 'Gate 0 & Intake Descoberta', 'Comercial', 'DD', true],
  ['Cléber Closer', 'Fechamento Comercial', 'Comercial', 'CC', false], ['Edna E2E', 'QA End-to-End & Regressão', 'Qualidade', 'EE', false],
  ['Jussara Jurídico', 'Assessoria Jurídica & Contratos', 'Qualidade', 'JJ', false], ['Fábio Finanças', 'Controle Financeiro & Cobrança', 'Finanças', 'FF', false]
];

const ONB = [
  { e: 'Fundação local-first', t: 'Bem-vindo ao TAVIR Escritório', x: 'Um painel para orquestrar agentes, tasks e entregas a partir da sua máquina, com registro auditável em SQLite.', p: ['Tudo roda em 127.0.0.1', 'Cada passo vira linha no livro-razão', 'Ação irreversível sempre para em gate humano'] },
  { e: 'Arquitetura de 3 colunas', t: 'Rail, menu e miolo', x: 'O rail escolhe o domínio. O menu mostra as telas daquele domínio. O miolo é onde o trabalho acontece.', p: ['Sete domínios no rail', 'Busca global em Ctrl K', 'Tema claro mantém rail e menu em tinta'] },
  { e: 'Orquestração', t: 'O ciclo de um job', x: 'A Paula PM planeja. O job roda com motor, modelo e teto definidos. Antes de algo irreversível, ele para e pede você.', p: ['Teto de gasto obrigatório', 'Log ao vivo por SSE', 'Decisões reúne aprovações, bloqueios e alterações'] },
  { e: 'Produção', t: 'Cinco módulos', x: 'Raio-X lê o cliente, Studio produz conteúdo, Fábrica constrói software, Flow liga as esteiras e Edição finaliza vídeo.', p: ['Cada módulo tem esteira e gate', 'Prévia no dispositivo antes de publicar', 'Flow e Edição em beta'] },
  { e: 'Inteligência', t: 'Cérebro, Doctor e Analytics', x: 'O Cérebro guarda o grafo operacional e as lições. Doctor e Analytics leem a telemetria local de saúde e custo.', p: ['Lições voltam para o ofício do agente', 'Custo por modelo, dia e projeto', 'Checagem de saúde em um clique'] }
];

const TOURS = {
  exec: { name: 'Ciclo de execução', steps: [
    { screen: 'login', title: 'Entrada local', body: 'O escritório roda em 127.0.0.1. A chave do operador fica só nesta máquina e abre a sessão.', why: 'Nada sai da máquina sem você. É a primeira garantia do sistema.', spot: 'login', where: 'Login' },
    { screen: 'onboarding', title: 'O mapa em cinco passos', body: 'Na primeira entrada, o onboarding explica a arquitetura: domínios no rail, telas no menu e o miolo de trabalho.', why: 'Quem entende o mapa encontra o que precisa sem perguntar.', spot: 'onb', where: 'Onboarding' },
    { screen: 'room', title: 'Leia o dia pela Sala', body: 'A Sala junta jobs rodando, cards ativos e o que depende de você. O bloco O que pede você vem antes de qualquer métrica.', why: 'Decisão humana é o gargalo da operação. Ela aparece primeiro.', spot: 'ask', where: 'Operação / Sala' },
    { screen: 'room', modal: 'job', title: 'Inicie um job', body: 'Motor, modelo, esforço e teto de gasto. A estimativa aparece antes de rodar e o teto é obrigatório.', why: 'Custo previsível antes de rodar, não depois.', spot: 'wizard', where: 'Iniciar job' },
    { screen: 'exec', job: 'job-014', title: 'Acompanhe ao vivo', body: 'O log chega por SSE. Cada passo vira linha no livro-razão, com custo acumulado contra o teto.', why: 'Você vê o que a IA fez, em que ordem e quanto custou.', spot: 'log', where: 'Operação / Execuções' },
    { screen: 'decisions', sel: 'ap-02', title: 'Gate humano', body: 'O deploy da Meridian parou antes de publicar. Aprovar libera o próximo passo. Recusar devolve o card com o seu comentário.', why: 'A automação cuida do repetitivo. O humano decide o que importa.', spot: 'decide', where: 'Operação / Decisões' },
    { screen: 'fabrica', title: 'A esteira avança', body: 'Na Fábrica, a topologia mostra em que etapa cada projeto está e o que ainda bloqueia o Completion Guard.', why: 'Entrega com critério de pronto, não por impressão.', spot: 'topology', where: 'Módulos / Fábrica' },
    { screen: 'analytics', title: 'Meça o resultado', body: 'Analytics lê a telemetria local: custo por dia e por modelo, contra o teto do mês.', why: 'Resultado definido antes da promessa, e conferido depois.', spot: 'cost', where: 'Sistema / Analytics' }
  ] },
  client: { name: 'Jornada do cliente', steps: [
    { screen: 'raiox', title: 'Encontrar · abra um caso', body: 'Todo cliente entra pelo Raio-X: origem, segmento e modo de leitura. Nada é vendido antes da leitura.', why: 'Vender sem diagnóstico é prometer sem prova.', spot: 'cases', where: 'Módulos / Raio-X' },
    { screen: 'raiox', title: 'Leia a presença', body: 'Evidências ficam separadas em observado, informado, inferido e indisponível. A nota por etapa da jornada mostra onde o cliente perde gente.', why: 'Cada afirmação carrega fonte e grau de confiança.', spot: 'evidence', where: 'Raio-X / Loja da Rua' },
    { screen: 'propostas', title: 'Vender · proposta com link', body: 'A oferta vira proposta com link público. A linha do tempo mostra envio, abertura e aceite.', why: 'Meta, condição e responsabilidade claras antes da implantação.', spot: 'proposal', where: 'Comercial / Propostas' },
    { screen: 'decisions', sel: 'ap-05', title: 'Contra-assinatura', body: 'O aceite do cliente volta como checkpoint. A contra-assinatura abre o projeto e a esteira certa.', why: 'Contrato só existe com as duas pontas registradas.', spot: 'decide', where: 'Operação / Decisões' },
    { screen: 'funil', title: 'Acompanhe o funil', body: 'Do caso aberto à proposta assinada, com conversão por etapa e valor em aberto.', why: 'O funil mostra onde a venda trava, não só quanto entrou.', spot: 'funnel', where: 'Comercial / Funil' },
    { screen: 'financas', title: 'Medir · margem real', body: 'Receita do contrato contra o custo de motor e horas de agente. Margem por projeto, mês a mês.', why: 'Automação boa é a que se paga e mostra o número.', spot: 'margin', where: 'Comercial / Finanças' }
  ] }
};

const LOGPOOL = [
  ['info', 'info', 'Lendo meta tags de 12 páginas'],
  ['ok', 'ok', 'Passo registrado no livro-razão'],
  ['info', 'info', 'Comparando com 3 concorrentes do nicho'],
  ['ok', 'ok', 'Sugestão gravada em workspace/seo.md'],
  ['info', 'info', 'Custo parcial atualizado'],
  ['ok', 'ok', 'Checagem de links internos concluída'],
  ['plan', 'ac', 'Paula ajustou a ordem dos próximos 2 passos']
];

function money(n) { return n.toFixed(2).replace('.', ','); }
function baseLog(j) {
  const L = [
    { ts: j.started, lvl: 'info', cls: 'info', text: 'Job aceito no motor ' + j.motor + ' · ' + j.model },
    { ts: j.started, lvl: 'info', cls: 'info', text: 'Contexto da task ' + j.task + ' carregado · 14 arquivos' },
    { ts: j.started, lvl: 'plan', cls: 'ac', text: 'Plano em 5 passos aprovado pela Paula PM' }
  ];
  if (j.status === 'queued') return [{ ts: '—', lvl: 'fila', cls: 'wn', text: 'Aguardando motor livre · posição 1 na fila' }];
  if (j.status === 'failed') return L.concat([
    { ts: '12:28', lvl: 'ok', cls: 'ok', text: 'Build gerado · 4,2 MB' },
    { ts: '12:31', lvl: 'erro', cls: 'er', text: 'Variável obrigatória ausente: SUPABASE_URL' },
    { ts: '12:31', lvl: 'gate', cls: 'wn', text: 'Job parado antes de publicar · gate ap-02 aberto em Decisões' }
  ]);
  if (j.status === 'completed') return L.concat([
    { ts: '09:40', lvl: 'ok', cls: 'ok', text: '2 recomendações de hardening geradas' },
    { ts: '09:52', lvl: 'ok', cls: 'ok', text: 'Revisão aprovada · entregue' }
  ]);
  if (j.status === 'paused') return L.concat([{ ts: '11:20', lvl: 'pausa', cls: 'wn', text: 'Pausado pelo operador · aguardando decisão da headline' }]);
  return L.concat([{ ts: '13:49', lvl: 'ok', cls: 'ok', text: 'Passo 1/5 registrado no livro-razão' }, { ts: '13:58', lvl: 'ok', cls: 'ok', text: 'Passo 2/5 registrado no livro-razão' }]);
}
function nowHM() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function spark(vals) { const max = Math.max.apply(null, vals), min = Math.min.apply(null, vals); return vals.map((v, i) => (i * 88 / (vals.length - 1)).toFixed(1) + ',' + (24 - ((v - min) / ((max - min) || 1)) * 20).toFixed(1)).join(' '); }

class Component extends DCLogic {
  constructor(props) {
    super(props);
    const logs = {};
    JOBS.forEach((j) => { logs[j.id] = baseLog(j); });
    this.state = {
      screen: 'room', theme: props.theme || 'dark', session: true, secret: '', showPw: false, loginErr: false, onb: 0,
      jobs: JOBS.map((j) => Object.assign({}, j)), tasks: TASKS.map((t) => Object.assign({}, t)), approvals: APS.map((a) => Object.assign({}, a)),
      chats: JSON.parse(JSON.stringify(CHATS)), chatId: 'cv-paula', chatDraft: '', typing: false,
      logs: logs, jobId: 'job-014', jobFilter: 'all', taskFilter: 'all', approvalId: 'ap-02', decFilter: 'all', decNote: '', decChoice: null, decErr: false, justDecided: null, secretVal: '',
      modal: null, mdata: null, form: {}, formErr: {}, wz: 0, wzMotor: 'Cursor', wzModel: 'claude-sonnet-4', wzEffort: 'balanced', jobTitle: '', jobCeiling: '5,00',
      palQ: '', palI: 0, pickQ: '', soulTab: 0, soulText: '', notifOpen: false, toast: null,
      tour: null, activity: [
        { t: '14:22', who: 'Yuri UX', text: 'pediu ajuste na hero da Meridian pelo chat do projeto', color: '#1BC5BD' },
        { t: '14:18', who: 'Fábrica', text: 'parou Meridian no gate de QA · prova visual em 390 px aberta', color: 'oklch(.80 .155 78)' },
        { t: '13:55', who: 'Adriano Arte', text: 'iniciou job-011 · carrossel ep. 14', color: '#1BC5BD' },
        { t: '13:41', who: 'Nina SEO', text: 'iniciou job-014 · SEO da landing principal', color: '#1BC5BD' },
        { t: '12:31', who: 'Davi DevOps', text: 'teve job-007 parado · SUPABASE_URL ausente', color: 'oklch(.635 .185 27)' },
        { t: '09:52', who: 'Atlas Web', text: 'entregou a auditoria da API · 2 recomendações', color: '#aeb7c4' }
      ]
    };
  }
  componentDidMount() { this.timer = setInterval(() => this.tick(), 1800); }
  componentWillUnmount() { clearInterval(this.timer); clearTimeout(this.tt); clearTimeout(this.rt); }

  tick() {
    this.setState((s) => {
      const logs = Object.assign({}, s.logs);
      const jobs = s.jobs.map((j) => {
        if (j.status !== 'running') return j;
        const inc = 1 + Math.floor(Math.random() * 2);
        const progress = Math.min(97, j.progress + inc);
        const cost = Math.min(j.ceiling, j.cost + 0.02 + Math.random() * 0.04);
        if (Math.random() < 0.55) {
          const p = LOGPOOL[Math.floor(Math.random() * LOGPOOL.length)];
          logs[j.id] = (logs[j.id] || []).concat([{ ts: nowHM(), lvl: p[0], cls: p[1], text: p[2] }]).slice(-40);
        }
        return Object.assign({}, j, { progress: progress, cost: cost });
      });
      return { jobs: jobs, logs: logs };
    });
  }

  say(t, m) { clearTimeout(this.tt); this.setState({ toast: { t: t, m: m } }); this.tt = setTimeout(() => this.setState({ toast: null }), 3200); }
  log(who, text, color) { this.setState((s) => ({ activity: [{ t: nowHM(), who: who, text: text, color: color || '#1BC5BD' }].concat(s.activity).slice(0, 8) })); }
  go(screen, extra) {
    const base = { screen: screen, modal: null, notifOpen: false, justDecided: null, decChoice: null, decErr: false };
    if (extra && extra.approvalId) base.decFilter = 'all';
    this.setState(Object.assign(base, extra || {}));
  }
  open(id, data) { this.setState({ modal: id, mdata: data || null, form: {}, formErr: {}, wz: 0, palQ: '', palI: 0, pickQ: '', soulTab: 0, notifOpen: false, soulText: id === 'soul' ? this.soulDefault(data) : this.state.soulText }); }
  close() { this.setState({ modal: null, mdata: null }); }
  soulDefault(a) { a = a || { role: 'Orquestradora & Planejamento', sector: 'Operação' }; return '# Lugar\nAtuar como ' + a.role + ' no setor ' + a.sector + '.\n\n# Critério\nEntregar só o que tem prova. Dizer o que falta.\n\n# Conflito\nNa dúvida entre prazo e qualidade, abrir gate.\n\n# Voz\nDireta, calma, comprovável.\n\n# Limite\nNão publicar, pagar nem apagar sem decisão humana.'; }

  metaOf(screen) {
    for (const d of DOMAINS) { const it = d.items.find((x) => x[0] === screen); if (it) return { dom: d, item: it }; }
    if (screen === 'fluxo') return { dom: { id: 'op', label: 'Escritório', items: DOMAINS[0].items }, item: ['fluxo', 'Como funciona'] };
    return { dom: DOMAINS[0], item: DOMAINS[0].items[0] };
  }

  applyStep(k, i) {
    const st = TOURS[k].steps[i];
    const patch = { tour: { k: k, i: i }, screen: st.screen, modal: st.modal || null, mdata: null, wz: 0, notifOpen: false };
    patch.justDecided = null; patch.decChoice = null; patch.decErr = false;
    if (st.sel) { patch.approvalId = st.sel; patch.decFilter = 'all'; }
    if (st.job) { patch.jobId = st.job; patch.jobFilter = 'all'; }
    if (st.screen === 'login') patch.session = false;
    else patch.session = true;
    if (st.screen === 'onboarding') patch.onb = 0;
    if (st.sel) {
      const a = this.state.approvals.find((x) => x.id === st.sel);
      if (a && a.status !== 'pending') patch.approvals = this.state.approvals.map((x) => x.id === st.sel ? Object.assign({}, x, { status: 'pending' }) : x);
    }
    this.setState(patch);
  }

  decide(status) {
    const s = this.state;
    const a = s.approvals.find((x) => x.id === s.approvalId);
    if (!a || a.status !== 'pending') return;
    const approvals = s.approvals.map((x) => x.id === a.id ? Object.assign({}, x, { status: status, decidedAt: 'hoje, ' + nowHM(), note: s.decNote }) : x);
    const patch = { approvals: approvals, decNote: '', decChoice: null, decErr: false, justDecided: { id: a.id, status: status, time: nowHM(), note: s.decNote.trim() } };
    if (a.id === 'ap-02' && status === 'approved') {
      patch.jobs = s.jobs.map((j) => j.id === 'job-007' ? Object.assign({}, j, { status: 'running', progress: 72 }) : j);
      patch.tasks = s.tasks.map((t) => t.id === 't2' ? Object.assign({}, t, { gate: false }) : t);
      patch.logs = Object.assign({}, s.logs, { 'job-007': (s.logs['job-007'] || []).concat([{ ts: nowHM(), lvl: 'gate', cls: 'ac', text: 'Gate ap-02 aprovado por Carlos · variável registrada no cofre local' }, { ts: nowHM(), lvl: 'info', cls: 'info', text: 'Refazendo deploy a partir do passo 4' }]) });
    }
    if (a.id === 'ap-03') patch.tasks = (patch.tasks || s.tasks).map((t) => t.id === 't1' ? Object.assign({}, t, { gate: false }) : t);
    this.setState(patch);
    this.log('Carlos', (status === 'approved' ? 'aprovou ' : 'recusou ') + a.id + ' · ' + a.title, status === 'approved' ? '#B7F34A' : 'oklch(.635 .185 27)');
    this.say(status === 'approved' ? 'Aprovado' : 'Recusado', a.id === 'ap-02' && status === 'approved' ? 'job-007 voltou a rodar. A decisão está no livro-razão.' : 'Decisão registrada no livro-razão.');
  }

  sendChat(text) {
    const t = (text || '').trim();
    if (!t) return;
    const id = this.state.chatId;
    const chats = Object.assign({}, this.state.chats);
    chats[id] = Object.assign({}, chats[id], { messages: chats[id].messages.concat([{ role: 'user', text: t }]), time: nowHM() });
    this.setState({ chats: chats, chatDraft: '', typing: true });
    const low = t.toLowerCase();
    const pending = this.state.approvals.filter((a) => a.status === 'pending').length;
    const running = this.state.jobs.filter((j) => j.status === 'running').length;
    let reply = 'Anotei. Vou cruzar com o livro-razão e devolvo com fonte e custo estimado.';
    if (low.indexOf('trav') >= 0 || low.indexOf('bloq') >= 0) reply = 'Hoje ' + pending + ' decisões seguram a sala. A mais urgente é o deploy da Meridian: a variável SUPABASE_URL não existe na conta. O carrossel do Multiverso segue sem bloqueio.';
    else if (low.indexOf('resumo') >= 0 || low.indexOf('dia') >= 0) reply = 'Resumo: ' + running + ' jobs rodando, ' + pending + ' decisões pendentes, custo do dia em US$ 8,40 contra teto diário de US$ 12. Nenhuma entrega publicada hoje.';
    else if (low.indexOf('gate') >= 0 || low.indexOf('próximo') >= 0 || low.indexOf('proximo') >= 0) reply = 'O próximo gate é o QA da Meridian: prova visual em 390 px e SEO ainda sem assinatura. Edna E2E termina a regressão em cerca de 20 minutos.';
    clearTimeout(this.rt);
    this.rt = setTimeout(() => {
      const c2 = Object.assign({}, this.state.chats);
      c2[id] = Object.assign({}, c2[id], { messages: c2[id].messages.concat([{ role: 'agent', text: reply }]) });
      this.setState({ chats: c2, typing: false });
    }, 1300);
  }

  spec(id, d) {
    const S = {
      project: { title: 'Novo projeto', lead: 'Nome, trilho e onde o workspace mora.', primary: 'Criar projeto', done: ['Projeto criado', 'Paula abre o primeiro planejamento.'], fields: [
        { k: 'name', type: 'text', label: 'Nome do projeto', ph: 'Ex.: Landing Atlas', req: 'Dê um nome ao projeto.' },
        { k: 'track', type: 'choice', label: 'Trilho', opts: [['Landing', 'Prova visual, construção, QA, SEO e handoff', 'até 16 etapas'], ['Oferta', 'Evidência de público, viabilidade e claims', '6–8 etapas'], ['Sistema', 'Especificação, construção e manutenção', '12–15 etapas']] },
        { k: 'path', type: 'text', label: 'Pasta do workspace', val: '~/tavir/workspaces/', help: 'Fica nesta máquina. O escritório só lê e escreve aqui dentro.' }] },
      task: { title: 'Nova task', lead: 'Entra na coluna A planejar. A Paula sugere o plano.', primary: 'Criar task', fields: [
        { k: 'title', type: 'text', label: 'Título', ph: 'O que precisa acontecer', req: 'Dê um título à task.' },
        { k: 'desc', type: 'area', label: 'Contexto', ph: 'Critério de pronto, links, restrições', rows: 3 },
        { k: 'prio', type: 'segs', label: 'Prioridade', opts: ['Normal', 'Alta', 'Crítica'] },
        { k: 'sector', type: 'segs', label: 'Setor', opts: ['Estratégia', 'Engenharia', 'Comercial', 'Conteúdo'] }] },
      plan: { title: 'Planejar com Paula', lead: 'A Paula abre um job de planejamento e devolve o plano em Planejado.', primary: 'Pedir plano', fields: [
        { k: 'n', type: 'note', text: 'O gate humano continua valendo antes de executar. O plano chega com passos, agentes e estimativa de custo.' },
        { k: 'hist', type: 'toggle', label: 'Incluir histórico do card', sub: 'Comentários e decisões anteriores entram no contexto.', def: true },
        { k: 'cap', type: 'segs', label: 'Teto do planejamento', opts: ['US$ 1', 'US$ 2', 'US$ 5'] }] },
      evidence: { title: 'Evidência', lead: 'Leitura do artefato, sem executar o job de novo.', size: 'lg', primary: 'Fechar', cancel: 'Copiar caminho', fields: [
        { k: 'c', type: 'code', text: 'status: observed\nsource: workspace/meridian/qa.md\nchecked_by: Edna E2E · 14:16\n\n- [x] Build sem erro\n- [x] Links internos\n- [ ] Prova visual em 390 px\n- [ ] SEO assinado por Nina SEO' },
        { k: 'n', type: 'note', tone: 'info', text: 'Classificação: observado. Fonte local, verificável no workspace.' }] },
      'raiox-new': { title: 'Novo caso', eyebrow: 'Raio-X · Fronteira', lead: 'Quem é, de onde veio e quanto ler antes de vender.', primary: 'Abrir caso', go: 'raiox', done: ['Caso aberto', 'Dora começa a coleta em Fronteira.'], fields: [
        { k: 'emp', type: 'text', label: 'Empresa', ph: 'Nome do negócio', req: 'Informe a empresa.' },
        { k: 'orig', type: 'segs', label: 'Origem', opts: ['Amigo', 'Rua', 'Formulário', 'Indicação'] },
        { k: 'seg', type: 'segs', label: 'Segmento', opts: ['Negócio local', 'Loja online', 'Serviço', 'Clínica'] },
        { k: 'mode', type: 'choice', label: 'Modo de leitura', opts: [['Estudo rápido', 'Presença e primeira impressão', '1 dia'], ['Diagnóstico', 'Jornada completa com evidências', '3 dias'], ['Completo', 'Diagnóstico + concorrentes + oferta', '7 dias']] },
        { k: 'goal', type: 'area', label: 'Objetivo', ph: 'O que o cliente quer resolver', rows: 2 }] },
      'raiox-offer': { title: 'Oferta possível', eyebrow: 'Raio-X · Loja da Rua', lead: 'O que cabe vender agora e o que espera a devolutiva.', primary: 'Registrar oferta', done: ['Oferta registrada', 'Vai para a devolutiva do caso.'], fields: [
        { k: 'of', type: 'choice', label: 'Oferta', opts: [['Presença local', 'Google, Instagram e WhatsApp organizados', 'cabe agora'], ['Atendimento WhatsApp com IA', 'Precisa de volume medido primeiro', 'após 30 dias'], ['Página de vendas', 'Depois da devolutiva', 'depois']] },
        { k: 'n', type: 'note', text: 'Confiança da rodada: média. Duas evidências ainda são inferidas.' }] },
      profile: { title: 'Novo perfil', eyebrow: 'Studio', lead: 'Rede, nome e squad responsável.', primary: 'Criar perfil', done: ['Perfil criado', 'O squad recebe o canon vazio para preencher.'], fields: [
        { k: 'name', type: 'text', label: 'Nome do perfil', ph: 'Ex.: Canal Tavir', req: 'Dê um nome ao perfil.' },
        { k: 'net', type: 'segs', label: 'Rede', opts: ['Instagram', 'YouTube', 'LinkedIn', 'TikTok'] },
        { k: 'sq', type: 'segs', label: 'Squad', opts: ['ig-studio', 'yt-studio', 'b2b-editorial'] }] },
      production: { title: 'Nova produção', eyebrow: 'Studio · Multiverso Paranoico', lead: 'Peça dentro do perfil ativo. Entra em Pauta.', primary: 'Criar produção', done: ['Produção na esteira', 'O Oráculo propõe 3 ângulos.'], fields: [
        { k: 'fmt', type: 'choice', label: 'Formato', opts: [['Carrossel', '4:5 · até 10 slides', '~18 min'], ['Reel', '9:16 · 30 a 60 s', '~40 min'], ['Story', '9:16 · sequência de 3 a 5', '~10 min']] },
        { k: 'pauta', type: 'text', label: 'Pauta', ph: 'Tema ou gancho', req: 'Escreva a pauta.' }] },
      angulo: { title: 'Novo ângulo', eyebrow: 'Studio · Centro de Decisões', lead: 'Um ângulo novo entra ao lado dos três do Oráculo.', primary: 'Guardar ângulo', done: ['Ângulo guardado', 'Aparece no Centro de Decisões.'], fields: [{ k: 'a', type: 'area', label: 'Ângulo', ph: 'Gancho, promessa e prova', rows: 4, req: 'Descreva o ângulo.' }] },
      ajuste: { title: 'Ajuste fino', eyebrow: 'Studio · Centro de Decisões', lead: 'O ajuste volta para a etapa certa sem reabrir a esteira.', primary: 'Pedir ajuste', done: ['Ajuste pedido', 'Volta como checkpoint.'], fields: [{ k: 'kind', type: 'segs', label: 'Tipo', opts: ['Tom', 'Corte', 'Frame', 'Legenda'] }, { k: 'a', type: 'area', label: 'O que ajustar', ph: 'Ex.: slide 3 mais curto', rows: 3, req: 'Descreva o ajuste.' }] },
      instructions: { title: 'Editar instruções', eyebrow: 'Studio · Mesa do Oráculo', lead: 'O canon do canal prevalece sobre qualquer pedido avulso.', primary: 'Salvar instruções', done: ['Instruções salvas', 'Valem para a próxima peça.'], fields: [{ k: 'i', type: 'area', label: 'Instruções do squad', val: 'Squad ig-studio. Não publicar sem checkpoint.\nTom: investigativo, sem sensacionalismo.\nToda afirmação histórica cita fonte no último slide.', rows: 6 }] },
      'factory-new': { title: 'Nova esteira', eyebrow: 'Fábrica', lead: 'Landing, oferta ou sistema. Criação ou manutenção.', primary: 'Abrir console', go: 'fabrica', done: ['Esteira criada', 'Etapa 1 · Entender já está com Paula.'], fields: [
        { k: 'name', type: 'text', label: 'Nome do projeto', ph: 'Ex.: Landing Atlas', req: 'Dê um nome à esteira.' },
        { k: 'tpl', type: 'choice', label: 'Template', opts: [['Landing Pages', 'Prova visual, comercial, construção, QA, SEO e handoff', 'até 16'], ['Ofertas', 'Evidência de público, viabilidade e claims', '6–8'], ['Sistemas', 'Do zero, com especificação, ou manutenção', '12–15']] },
        { k: 'mode', type: 'segs', label: 'Modo', opts: ['Criação', 'Manutenção'] }] },
      ai: { title: 'Pedir alteração', eyebrow: 'Fábrica · Meridian', lead: 'O pedido fica no chat do projeto. A esteira não recomeça sozinha.', primary: 'Mandar para o chat', done: ['Pedido registrado', 'Está no fio do projeto.'], fields: [{ k: 'a', type: 'area', label: 'O que mudar', ph: 'Ex.: hero mais curta em 390 px', rows: 4, req: 'Descreva a alteração.' }] },
      redo: { title: 'Refazer etapa', eyebrow: 'Fábrica · Meridian', lead: 'Reabre ' + ((d && d.stage) || 'a etapa') + ' e registra no livro-razão.', primary: 'Reabrir etapa', primaryCls: 'danger', done: ['Etapa reaberta', 'O que passou do gate não é apagado.'], fields: [{ k: 'n', type: 'note', tone: 'warn', text: 'A etapa volta a esperar conclusão. Etapas seguintes ficam em espera.' }, { k: 'why', type: 'area', label: 'Motivo', ph: 'Por que refazer', rows: 2, req: 'Explique o motivo.' }] },
      control: { title: 'Controle do projeto', eyebrow: (d && d.name) || 'Meridian', lead: 'Automação, SLA e o que fica manual.', size: 'lg', primary: 'Salvar', done: ['Projeto salvo', 'As regras valem a partir do próximo card.'], fields: [
        { k: 't1', type: 'toggle', label: 'Entender sozinho', sub: 'A demanda sai do rascunho sem clique.', def: false },
        { k: 't2', type: 'toggle', label: 'Entregar sozinho', sub: 'Desligado, o pacote espera em Decisões.', def: false },
        { k: 't3', type: 'toggle', label: 'Demandas novas entram manuais', sub: 'Toda demanda passa por você primeiro.', def: true },
        { k: 'sla', type: 'segs', label: 'SLA de resposta do gate', opts: ['4 h', '24 h', '72 h'] }] },
      motor: { title: 'Motor ' + ((d && d.name) || ''), eyebrow: 'Integrações', lead: 'A chave fica só nesta máquina. Login abre o fluxo do próprio motor.', primary: 'Salvar motor', secondary: 'Entrar com login', done: ['Motor salvo', 'Disponível para novos jobs.'], fields: [{ k: 'key', type: 'text', itype: 'password', label: 'Chave de API', ph: 'Cole a chave', help: 'Guardada no cofre local. Nunca vai para o livro-razão.' }, { k: 'def', type: 'toggle', label: 'Tornar padrão do chat', sub: 'Novas conversas usam este motor.', def: false }] },
      'chat-settings': { title: 'Ajustes da conversa', lead: 'Modelo, esforço e o que a conversa pode lembrar.', primary: 'Salvar ajustes', done: ['Ajustes salvos', 'Valem para as próximas mensagens.'], fields: [
        { k: 'm', type: 'segs', label: 'Modelo', opts: ['claude-sonnet-4', 'claude-opus-4', 'gpt-4o'] },
        { k: 'e', type: 'segs', label: 'Esforço', opts: ['Rápido', 'Equilibrado', 'Profundo'] },
        { k: 'mem', type: 'toggle', label: 'Memória', sub: 'Lembra decisões desta conversa.', def: true },
        { k: 'vault', type: 'toggle', label: 'Vault do Cérebro', sub: 'Pode consultar notas e páginas indexadas.', def: true }] },
      'delete-chat': { title: 'Apagar conversa', lead: 'As mensagens somem desta lista. O livro-razão mantém o registro de que existiram.', primary: 'Apagar', primaryCls: 'danger', fields: [{ k: 'n', type: 'note', tone: 'warn', text: 'Não dá para desfazer.' }] },
      attach: { title: 'Anexar imagem', lead: 'PNG, JPEG, WEBP ou GIF. Até 4 imagens de 4 MB.', primary: 'Anexar', fields: [{ k: 'img', type: 'choice', label: 'Arquivos recentes', opts: [['referencia-hero.png', 'Captura da hero em 390 px', '1,2 MB'], ['moodboard-ep14.jpg', 'Referências do episódio 14', '3,1 MB']] }] },
      restart: { title: 'Reiniciar ' + ((d && d.svc) || 'serviço'), lead: 'Derruba o processo e espera a porta voltar.', primary: 'Reiniciar', done: ['Reinício pedido', 'A porta volta em cerca de 8 s.'], fields: [{ k: 'n', type: 'note', tone: 'warn', text: 'Jobs rodando continuam no backend. O frontend perde a conexão SSE por alguns segundos.' }] },
      ailink: { title: 'Motor padrão sem resposta', lead: 'O chat espera você escolher outro motor.', primary: 'Abrir motores', go: 'config', fields: [{ k: 'n', type: 'note', tone: 'warn', text: 'Cursor não respondeu nas últimas 3 tentativas. Claude e Codex estão conectados.' }] },
      'proposal-send': { title: 'Enviar proposta', eyebrow: (d && d.num) || 'PRO-003', lead: 'Gera o link público e registra o destinatário.', primary: 'Enviar versão', done: ['Proposta enviada', 'O link vive em propostas.tavir.com.br.'], fields: [
        { k: 'mail', type: 'text', label: 'E-mail do cliente', val: (d && d.mail) || 'contato@northwind.com.br', req: 'Informe o e-mail.' },
        { k: 'msg', type: 'area', label: 'Mensagem', val: 'Segue a versão revisada com meta, condição e responsabilidade de cada parte.', rows: 3 },
        { k: 'notify', type: 'toggle', label: 'Avisar quando abrir', sub: 'Gera checkpoint na abertura e no aceite.', def: true }] }
    };
    return S[id];
  }

  submitForm() {
    const s = this.state;
    const id = s.modal, sp = this.spec(id, s.mdata);
    if (!sp) return;
    const errs = {};
    sp.fields.forEach((f) => { if (f.req && !String(s.form[f.k] != null ? s.form[f.k] : (f.val || '')).trim()) errs[f.k] = true; });
    if (Object.keys(errs).length) { this.setState({ formErr: errs }); return; }
    const v = (k, def) => (s.form[k] != null ? s.form[k] : def);
    if (id === 'task') {
      const t = { id: 't' + Date.now(), seq: 40 + s.tasks.length, title: v('title', ''), status: 'to_plan', who: 'Paula PM', ini: 'PP', prio: v('prio', 'Normal'), sector: v('sector', 'Estratégia'), planning: true };
      this.setState({ tasks: [t].concat(s.tasks), modal: null, screen: 'tasks' });
      this.log('Carlos', 'criou a task #' + t.seq + ' · ' + t.title);
      this.say('Task criada', '#' + t.seq + ' entrou em A planejar.');
      return;
    }
    if (id === 'plan') {
      const tasks = s.tasks.map((t) => t.id === (s.mdata && s.mdata.id) ? Object.assign({}, t, { planning: true, status: t.status === 'done' ? t.status : 'to_plan' }) : t);
      this.setState({ tasks: tasks, modal: null });
      this.say('Planejamento pedido', 'Paula devolve o plano em Planejado.');
      return;
    }
    if (id === 'delete-chat') {
      const chats = Object.assign({}, s.chats); chats[s.chatId] = Object.assign({}, chats[s.chatId], { messages: [] });
      this.setState({ chats: chats, modal: null }); this.say('Conversa apagada', 'O registro de existência fica no livro-razão.'); return;
    }
    if (id === 'attach') {
      const chats = Object.assign({}, s.chats); const f = v('img', 'referencia-hero.png');
      chats[s.chatId] = Object.assign({}, chats[s.chatId], { messages: chats[s.chatId].messages.concat([{ role: 'user', text: '[imagem anexada · ' + f + ']' }]) });
      this.setState({ chats: chats, modal: null }); return;
    }
    if (id === 'evidence') { this.close(); return; }
    if (id === 'project') this.log('Carlos', 'criou o projeto ' + v('name', '') + ' · trilho ' + v('track', 'Landing'));
    if (sp.done) this.say(sp.done[0], sp.done[1]);
    if (sp.go) this.go(sp.go); else this.close();
  }

  renderVals() {
    const s = this.state;
    const self = this;
    const ic = IC;
    const meta = this.metaOf(s.screen);
    const tourStep = s.tour && s.tour.i != null ? TOURS[s.tour.k].steps[s.tour.i] : null;
    const spotKey = tourStep ? tourStep.spot : '';
    const spKeys = ['login', 'onb', 'ask', 'wizard', 'log', 'decide', 'tourcta', 'jobbtn'];
    const sp = {}; spKeys.forEach((k) => { sp[k] = spotKey === k ? 'spot' : ''; });
    const pending = s.approvals.filter((a) => a.status === 'pending');
    const running = s.jobs.filter((j) => j.status === 'running');
    const active = s.tasks.filter((t) => t.status !== 'done');
    const gates = active.filter((t) => t.gate);
    const full = s.screen === 'login' || s.screen === 'onboarding';

    const is = { login: s.screen === 'login', onboarding: s.screen === 'onboarding', shell: !full };
    ['room', 'exec', 'tasks', 'decisions', 'chat'].forEach((k) => { is[k] = s.screen === k; });
    ['Modulos', 'RaioX', 'Studio', 'Fabrica', 'Flow', 'Edicao', 'Agentes', 'Comercial', 'Social', 'Conhecimento', 'Estrategia', 'Sistema', 'Config', 'Fluxo'].forEach((k) => { is[k] = CHILD[s.screen] === k; });

    const badgeOf = (key) => {
      if (key === 'jobs') return [String(running.length), ''];
      if (key === 'tasks') return [String(active.length), ''];
      if (key === 'aps') return [String(pending.length), pending.length ? 'hot' : ''];
      if (key === 'gate') return ['1', ''];
      if (key === 'prop') return ['2', ''];
      if (key === 'comms') return ['4', ''];
      if (key === 'doctor') return ['1', ''];
      return null;
    };
    const rail = DOMAINS.map((d) => ({ label: d.label, d: IC[d.icon], on: d.id === meta.dom.id ? 'on' : '', dot: d.id === 'op' && pending.length > 0, pick: () => self.go(d.items[0][0]) }));
    const subItems = meta.dom.items.map((it) => {
      const b = it[3] && it[3] !== 'beta' ? badgeOf(it[3]) : null;
      return { label: it[1], d: IC[it[2]], on: it[0] === s.screen ? 'on' : '', hasBadge: !!b, badge: b ? b[0] : '', hot: b ? b[1] : '', hasTag: it[3] === 'beta', tag: 'beta', pick: () => self.go(it[0]) };
    });

    const app = {
      go: (sc, extra) => self.go(sc, extra),
      modal: (id, data) => self.open(id, data),
      toast: (t, m) => self.say(t, m),
      log: (w, t, c) => self.log(w, t, c),
      theme: s.theme,
      setTheme: (t) => self.setState({ theme: t }),
      pending: pending.length,
      running: running.length
    };

    // ---------- Sala ----------
    const impCls = { alto: 'danger', 'médio': 'warn', baixo: '' };
    const room = {
      summary: running.length + ' jobs rodando, ' + pending.length + ' decisões esperando você, ' + gates.length + ' cards em gate. O resto segue sem bloqueio.',
      pendingN: pending.length, noAsk: pending.length === 0, runN: running.length,
      asks: pending.slice(0, 3).map((a, i) => ({ title: a.title, who: a.who, ini: a.ini, type: a.type, age: a.age, impact: 'impacto ' + a.impact, impCls: impCls[a.impact], btn: i === 0 ? 'onink' : 'onink-sec', open: () => self.go('decisions', { approvalId: a.id, decTab: 'pending' }) })),
      spend: [6.2, 7.1, 5.4, 9.8, 9.1, 4.2, 3.1, 6.8, 6.1, 10.2, 8.4, 9.6, 3.9, 8.4].map((v, i, arr) => ({ h: Math.round(v / 10.2 * 100), cls: i === arr.length - 1 ? 'hi' : '', delay: i * 30, tip: 'US$ ' + money(v) })),
      kpis: [
        { label: 'Jobs rodando', v: String(running.length), note: '1 na fila · 1 com falha', color: '#1BC5BD', vcolor: 'var(--text-primary)', spark: spark([1, 2, 2, 3, 2, 3, running.length]), go: () => self.go('exec', { jobFilter: 'running' }) },
        { label: 'Cards ativos', v: String(active.length), note: (s.tasks.filter((t) => t.status === 'in_progress').length) + ' em execução', color: '#aeb7c4', vcolor: 'var(--text-primary)', spark: spark([5, 6, 6, 8, 7, 7, active.length]), go: () => self.go('tasks') },
        { label: 'Gates abertos', v: String(pending.length), note: 'mais antigo há 5 h', color: 'oklch(.635 .185 27)', vcolor: 'var(--danger)', spark: spark([2, 3, 4, 3, 5, 6, pending.length]), go: () => self.go('decisions') },
        { label: 'Custo hoje', v: 'US$ 8,40', note: 'teto diário US$ 12', color: '#B7F34A', vcolor: 'var(--text-primary)', spark: spark([6.8, 6.1, 10.2, 8.4, 9.6, 3.9, 8.4]), go: () => self.go('analytics') }
      ],
      jobs: running.map((j) => ({ title: j.title, who: j.who, ini: j.ini, model: j.model, progress: j.progress, costTxt: money(j.cost), ceiling: j.ceiling, open: () => self.go('exec', { jobId: j.id, jobFilter: 'all' }) })),
      lines: [
        { title: 'Meridian — landing institucional', mod: 'Fábrica', stage: 'etapa 6 de 9 · QA', d: IC.factory, cls: 'warn', state: 'gate', segs: [1, 1, 1, 1, 1, 2, 0, 0, 0], go: () => self.go('fabrica') },
        { title: 'Multiverso · carrossel ep. 14', mod: 'Studio', stage: 'etapa 3 de 5 · Arte', d: IC.spark, cls: 'flow', state: 'rodando', segs: [1, 1, 2, 0, 0], go: () => self.go('studio') },
        { title: 'Loja da Rua · presença local', mod: 'Raio-X', stage: 'etapa 2 de 6 · Coleta', d: IC.search, cls: 'flow', state: 'coleta', segs: [1, 2, 0, 0, 0, 0], go: () => self.go('raiox') }
      ].map((l) => Object.assign(l, { segs: l.segs.map((g) => ({ bg: g === 1 ? 'var(--flow)' : g === 2 ? 'var(--warning)' : 'var(--line)' })) })),
      activity: s.activity
    };

    // ---------- Execuções ----------
    const jf = s.jobFilter;
    const jlist = jf === 'all' ? s.jobs : s.jobs.filter((j) => j.status === jf);
    const jcur = s.jobs.find((j) => j.id === s.jobId) || jlist[0] || s.jobs[0];
    const ST = STATUS[jcur.status];
    const stepsN = ['Aceito', 'Contexto', 'Plano', 'Execução', 'Verificação', 'Entrega'];
    const doneIdx = jcur.status === 'completed' ? 6 : Math.min(5, Math.floor(jcur.progress / 100 * 6));
    const costPct = Math.min(100, Math.round(jcur.cost / jcur.ceiling * 100));
    const exec = {
      total: s.jobs.length, empty: jlist.length === 0,
      filters: [['all', 'Todos'], ['running', 'Rodando'], ['queued', 'Fila'], ['failed', 'Falha'], ['paused', 'Pausados'], ['completed', 'Concluídos']].map((f) => ({ label: f[1], n: f[0] === 'all' ? s.jobs.length : s.jobs.filter((j) => j.status === f[0]).length, on: jf === f[0] ? 'on' : '', pick: () => self.setState({ jobFilter: f[0] }) })),
      list: jlist.map((j) => ({ id: j.id, title: j.title, who: j.who, progress: j.progress, label: STATUS[j.status][0], color: STATUS[j.status][2], fillCls: STATUS[j.status][3], on: j.id === jcur.id ? 'on' : '', pick: () => self.setState({ jobId: j.id }) }))
    };
    const job = Object.assign({}, jcur, {
      label: ST[0], cls: ST[1], fillCls: ST[3], costTxt: money(jcur.cost), costPct: costPct, costCls: costPct > 85 ? 'warn' : 'lime',
      isRunning: jcur.status === 'running', isPaused: jcur.status === 'paused', isQueued: jcur.status === 'queued', isFailed: jcur.status === 'failed',
      steps: stepsN.map((n, i) => ({ n: '0' + (i + 1), label: n, cls: i < doneIdx ? 'done' : (i === doneIdx && jcur.status !== 'completed' ? 'now' : '') })),
      log: s.logs[jcur.id] || [], logN: (s.logs[jcur.id] || []).length
    });
    const setJob = (status, msg) => () => {
      self.setState({ jobs: s.jobs.map((j) => j.id === jcur.id ? Object.assign({}, j, { status: status, progress: status === 'running' && j.progress === 0 ? 3 : j.progress }) : j), logs: Object.assign({}, s.logs, { [jcur.id]: (s.logs[jcur.id] || []).concat([{ ts: nowHM(), lvl: 'op', cls: 'ac', text: msg }]) }) });
      self.say(jcur.id, msg);
    };

    // ---------- Tasks ----------
    const COLS = [['to_plan', 'A planejar', 'Novas demandas e planejamento em curso', 'oklch(.80 .155 78)', 'sem limite'], ['planned', 'Planejado', 'Plano da Paula pronto · aguarda início', '#1BC5BD', 'wip 6'], ['in_progress', 'Em execução', 'Jobs ativos · gate em vermelho', '#B7F34A', 'wip 4'], ['done', 'Concluído', 'Entregue e validado', '#aeb7c4', '7 dias']];
    const tf = s.taskFilter;
    const tvis = s.tasks.filter((t) => tf === 'all' || (tf === 'gate' && t.gate) || (tf === 'eng' && t.sector === 'Engenharia'));
    const prioCls = { 'Crítica': 'danger', Alta: 'warn', Normal: '', Baixa: '' };
    const tk = {
      filters: [['all', 'Todos', s.tasks.length], ['gate', 'Com gate', s.tasks.filter((t) => t.gate).length], ['eng', 'Engenharia', s.tasks.filter((t) => t.sector === 'Engenharia').length]].map((f) => ({ label: f[1], n: f[2], on: tf === f[0] ? 'on' : '', pick: () => self.setState({ taskFilter: f[0] }) })),
      cols: COLS.map((c) => {
        const cards = tvis.filter((t) => t.status === c[0]).map((t) => {
          const j = t.job ? s.jobs.find((x) => x.id === t.job) : null;
          return { seq: t.seq, title: t.title, who: t.who, ini: t.ini, sector: t.sector, prio: t.prio, prioCls: prioCls[t.prio] || '', gate: !!t.gate, gateCls: t.gate ? 'gate' : '', planning: !!t.planning, hasJob: !!j && t.status === 'in_progress', jobPct: j ? j.progress : 0, fillCls: j ? STATUS[j.status][3] : '', open: () => self.open('taskdetail', { id: t.id }) };
        });
        return { label: c[1], hint: c[2], color: c[3], wip: c[4], n: cards.length, cards: cards, empty: cards.length === 0 };
      })
    };
    const tdT = s.modal === 'taskdetail' ? (s.tasks.find((t) => t.id === (s.mdata && s.mdata.id)) || s.tasks[0]) : s.tasks[0];
    const td = {
      seq: tdT.seq, title: tdT.title, who: tdT.who, sector: tdT.sector, prio: tdT.prio, prioCls: prioCls[tdT.prio] || '', gate: !!tdT.gate, hasJob: !!tdT.job,
      moveHint: tdT.gate ? 'Com gate aberto, o card não sai de Em execução.' : 'Planejado → Em execução inicia o job ligado.',
      moves: COLS.map((c) => ({ label: c[1], on: tdT.status === c[0] ? 'on' : '', pick: () => {
        if (tdT.gate && c[0] !== 'in_progress') { self.say('Gate aberto', 'Decida em Decisões antes de mover o card.'); return; }
        self.setState({ tasks: s.tasks.map((t) => t.id === tdT.id ? Object.assign({}, t, { status: c[0], planning: c[0] === 'to_plan' ? t.planning : false }) : t) });
        self.log('Carlos', 'moveu #' + tdT.seq + ' para ' + c[1]);
        if (c[0] === 'in_progress' && tdT.job) { self.setState((st) => ({ jobs: st.jobs.map((j) => j.id === tdT.job && j.status !== 'running' ? Object.assign({}, j, { status: 'running', progress: Math.max(3, j.progress) }) : j) })); self.say('Job iniciado', tdT.job + ' começou a rodar.'); }
      } })),
      hist: [{ t: '09:10', text: 'Card criado por Paula PM' }, { t: '10:42', text: 'Plano aprovado · 5 passos' }, { t: '12:31', text: tdT.gate ? 'Gate aberto · aguardando decisão' : 'Job em execução' }]
    };

    // ---------- Decisões ----------
    const KIND = { deploy: IC.zap, roadmap: IC.mile, ceiling: IC.wallet, contract: IC.file, text: 'M4 20h4l11-11-4-4L4 16z', hardening: IC.shield };
    const GRP = { block: ['Bloqueiam entrega', 'var(--danger)', 'var(--danger-subtle)'], scope: ['Escopo, custo ou contrato', 'var(--warning)', 'var(--warning-subtle)'], review: ['Revisões', 'var(--flow)', 'var(--flow-subtle)'] };
    const df = s.decFilter;
    const FIL = { all: (a) => a.status === 'pending', block: (a) => a.status === 'pending' && a.group === 'block', scope: (a) => a.status === 'pending' && a.group === 'scope', review: (a) => a.status === 'pending' && a.group === 'review', done: (a) => a.status !== 'pending' };
    const dlist = s.approvals.filter(FIL[df]);
    const jd = s.justDecided;
    const dcur = dlist.find((a) => a.id === s.approvalId) || dlist[0] || null;
    const stLabel = (a) => a.status === 'pending' ? 'pendente' : a.status === 'approved' ? 'aprovado' : 'recusado';
    const slaOf = (a) => { const left = Math.max(0, 24 - a.ageH); const r = a.ageH / 24; return { pct: Math.min(100, Math.round(r * 100)), left: left < 1 ? 'restam ' + Math.round(left * 60) + ' min' : 'restam ' + Math.round(left) + ' h', color: r > 0.75 ? 'var(--danger)' : r > 0.4 ? 'var(--warning)' : 'var(--flow)', ink: r > 0.75 ? 'oklch(.72 .16 27)' : r > 0.4 ? 'oklch(.80 .155 78)' : '#1BC5BD' }; };
    const pickDec = (id) => self.setState({ approvalId: id, justDecided: null, decChoice: null, decNote: '', decErr: false });
    const groupKeys = df === 'done' ? ['done'] : ['block', 'scope', 'review'];
    const dayDone = 3 + s.approvals.filter((a) => a.status !== 'pending' && a.id !== 'ap-06').length;
    const maxAge = pending.reduce((m, a) => Math.max(m, a.ageH), 0);
    const oldestA = pending.find((a) => a.ageH === maxAge);
    const dc = {
      summary: pending.length ? pending.length + (pending.length > 1 ? ' decisões esperam' : ' decisão espera') + ' você. ' + (function (n) { return n === 0 ? 'Nenhuma bloqueia entrega.' : n === 1 ? 'Uma bloqueia a entrega.' : n + ' bloqueiam entrega.'; })(pending.filter((a) => a.block).length) + ' Cada uma mostra a pergunta, a evidência e o que acontece em cada resposta.' : 'Nenhuma decisão pendente. A operação segue sozinha.',
      dayDone: dayDone, dayTotal: dayDone + pending.length, dayPct: Math.round(dayDone / (dayDone + pending.length) * 100),
      oldest: oldestA ? oldestA.age + ' · ' + oldestA.id : 'nenhuma', oldColor: oldestA ? slaOf(oldestA).color : 'var(--flow)',
      filters: [['all', 'Pendentes'], ['block', 'Bloqueiam entrega'], ['scope', 'Escopo e custo'], ['review', 'Revisões'], ['done', 'Decididas']].map((f) => ({ label: f[1], n: s.approvals.filter(FIL[f[0]]).length, on: df === f[0] ? 'on' : '', pick: () => self.setState({ decFilter: f[0], justDecided: null, decChoice: null }) })),
      groups: groupKeys.map((k) => {
        const items = dlist.filter((a) => k === 'done' || a.group === k);
        return { label: k === 'done' ? 'Decididas' : GRP[k][0], color: k === 'done' ? 'var(--text-muted)' : GRP[k][1], n: items.length, items: items.map((a) => {
          const sl = slaOf(a), g = GRP[a.group], on = !!dcur && a.id === dcur.id && !jd;
          return { id: a.id, type: a.type, title: a.title, who: a.who, ini: a.ini, age: a.age, icon: KIND[a.kind], tbg: g[2], tfg: g[1], pending: a.status === 'pending', bcls: a.status === 'pending' ? impCls[a.impact] : (a.status === 'approved' ? 'flow' : 'danger'), blabel: a.status === 'pending' ? a.impact : stLabel(a), slaPct: sl.pct, slaColor: sl.color, slaLeft: sl.left, bd: on ? 'var(--flow)' : 'var(--line)', sh: on ? '0 0 0 3px var(--flow-subtle)' : 'none', pick: () => pickDec(a.id) };
        }) };
      }).filter((g) => g.n > 0),
      listEmpty: dlist.length === 0,
      showDone: !!jd, showDossier: !jd && !!dcur, showEmpty: !jd && !dcur
    };
    const curSla = dcur ? slaOf(dcur) : { left: '', ink: '' };
    const cur = dcur ? Object.assign({}, dcur, {
      impCls: impCls[dcur.impact], pending: dcur.status === 'pending', decided: dcur.status !== 'pending', stLabel: stLabel(dcur), block: !!dcur.block, scopeChange: !!dcur.scopeChange,
      slaLeft: curSla.left, slaInk: curSla.ink,
      impacts: [['Escopo', dcur.scope], ['Custo', dcur.cost], ['Prazo', dcur.time]].map((m, i) => ({ k: m[0], v: m[1], bl: i ? '1px solid var(--line)' : '0' })),
      recBg: dcur.status === 'approved' ? 'var(--flow-subtle)' : 'var(--danger-subtle)', recFg: dcur.status === 'approved' ? 'var(--flow)' : 'var(--danger)', recIcon: dcur.status === 'approved' ? IC.check : IC.x,
      people: [[dcur.ini, dcur.who, 'pediu a decisão', true], ['CH', 'Carlos', 'decide · CEO', false]].concat(({ deploy: [['EE', 'Edna E2E', 'roda a regressão depois', false]], roadmap: [['EE', 'Elisa Escritora', 'muda de pauta se aprovar', false]], ceiling: [['NS', 'Nina SEO', 'dona do job-014', true]], contract: [['FF', 'Fábio Finanças', 'emite a cobrança', false]], text: [['NS', 'Nina SEO', 'ajusta o SEO da LP', false]], hardening: [['AW', 'Atlas Web', 'fez a auditoria', false]] })[dcur.kind] || []).map((p) => ({ ini: p[0], n: p[1], r: p[2], busy: p[3] ? 'busy' : '' })),
      tl: [[dcur.age, 'Pedido aberto por ' + dcur.who, 'var(--warning)'], [dcur.age, 'Evidência anexada ao pedido', 'var(--flow)']].concat(dcur.status === 'pending' ? [['agora', 'Esperando a sua decisão', 'var(--text-muted)']] : [[dcur.decidedAt || '', (dcur.status === 'approved' ? 'Aprovado' : 'Recusado') + ' por Carlos', dcur.status === 'approved' ? 'var(--flow)' : 'var(--danger)']]).map((t) => ({ t: t[0], x: t[1], c: t[2] }))
    }) : { pending: false, decided: false, impacts: [], people: [], tl: [] };
    const k = dcur ? dcur.kind : '';
    const lenC = HEAD_CUR.length, lenN = HEAD_NEW.length;
    const ev = {
      deploy: k === 'deploy', roadmap: k === 'roadmap', ceiling: k === 'ceiling', contract: k === 'contract', text: k === 'text',
      log: [['12:24', 'ok', 'ok', 'Build gerado · 4,2 MB', ''], ['12:28', 'info', 'info', 'Lendo variáveis da conta Meridian', ''], ['12:31', 'erro', 'er', 'Variável obrigatória ausente: SUPABASE_URL', 'rgba(225,91,74,.14)'], ['12:31', 'gate', 'wn', 'Deploy parado antes de publicar · gate ap-02 aberto', '']].map((l) => ({ ts: l[0], lvl: l[1], cls: l[2], text: l[3], bg: l[4] || 'transparent' })),
      env: [['NUXT_PUBLIC_SITE=meridian.com.br', 'var(--text-secondary)'], ['SUPABASE_ANON_KEY=••••••••••••', 'var(--text-secondary)'], ['SUPABASE_URL=            ← ausente', 'var(--danger)']].map((x) => ({ t: x[0], c: x[1] })),
      rows: [['Temporada 2 do canal', 'Livro guia do método', 'sobe', 'flow'], ['Livro guia do método', 'Temporada 2 do canal', 'desce', ''], ['Curso pago', 'Curso pago', '', '']].map((r, i) => ({ n: '0' + (i + 1), a: r[0], b: r[1], moved: !!r[2], mv: r[2], mcls: r[3], bd: r[2] === 'sobe' ? 'var(--flow-subtle-line)' : 'var(--line)', ac: r[2] ? 'var(--flow)' : 'var(--text-muted)' })),
      bars: [['Gasto até hoje', 212, 'var(--flow)'], ['Projeção mantendo opus-4', 338, 'var(--warning)'], ['Projeção trocando p/ sonnet-4', 268, 'var(--flow)']].map((b) => ({ k: b[0], v: 'US$ ' + b[1], w: (b[1] / 360 * 100).toFixed(1), c: b[2] })),
      m300: (300 / 360 * 100).toFixed(1), m340: (340 / 360 * 100).toFixed(1),
      facts: [['Valor', 'R$ 48.500'], ['Pagamento', '3 parcelas'], ['Meta', '3% de conversão em 60 dias'], ['Início', 'após a contra-assinatura']].map((x) => ({ k: x[0], v: x[1] })),
      signs: [['Atlas Holdings', 'assinou pela ponte · 27/10', true], ['TAVIR · Carlos', 'aguarda a sua assinatura', false]].map((x) => ({ who: x[0], st: x[1], bd: x[2] ? 'var(--flow-subtle-line)' : 'var(--warning)', bg: x[2] ? 'var(--flow-subtle)' : 'var(--warning-subtle)', fg: x[2] ? 'var(--flow)' : 'var(--warning)', icon: x[2] ? IC.check : 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2' })),
      texts: [['Atual', HEAD_CUR, lenC], ['Proposta da Rita', HEAD_NEW, lenN]].map((x) => ({ k: x[0], t: x[1], len: x[2], c: x[2] > 60 ? 'var(--danger)' : 'var(--flow)', w: Math.min(100, Math.round(x[2] / 72 * 100)), bd: x[2] > 60 ? 'var(--line)' : 'var(--flow-subtle-line)' }))
    };
    const CHO = [['approved', 'Aprovar', 'A', IC.check, 'var(--flow)', 'var(--flow-subtle)'], ['rejected', 'Recusar', 'R', IC.x, 'var(--danger)', 'var(--danger-subtle)'], ['more', 'Pedir contexto', 'C', IC.msg, 'var(--text-secondary)', 'var(--surface-3)']];
    const chs = dcur && dcur.status === 'pending' ? CHO.map((c) => {
      const on = s.decChoice === c[0];
      const steps = c[0] === 'approved' ? dcur.yes : c[0] === 'rejected' ? dcur.no : dcur.more;
      return { label: c[1], key: c[2], icon: c[3], tone: c[4], pressed: on ? 'true' : 'false', bd: on ? c[4] : 'var(--line)', bg: on ? c[5] : 'var(--surface-2)', ibg: on ? c[4] : c[5], ifg: on ? 'var(--surface-1)' : c[4], steps: steps.map((t, i) => ({ n: '0' + (i + 1), t: t })), pick: () => self.setState({ decChoice: c[0], decErr: false }) };
    }) : [];
    const dch = s.decChoice;
    const dcConfirm = {
      show: !!dch && !!dcur && dcur.status === 'pending',
      head: dch === 'approved' ? 'Você aprova.' : dch === 'rejected' ? 'Você recusa.' : 'Você pede mais contexto.',
      text: dcur && dch ? (dch === 'approved' ? dcur.yes : dch === 'rejected' ? dcur.no : dcur.more).join(' · ') + '.' : '',
      ph: dch === 'rejected' ? 'Motivo da recusa (obrigatório)' : dch === 'more' ? 'O que falta para você decidir?' : 'Comentário opcional para o livro-razão',
      label: dch === 'approved' ? 'Confirmar aprovação' : dch === 'rejected' ? 'Confirmar recusa' : 'Enviar pergunta a ' + (dcur ? dcur.who : ''),
      cls: dch === 'approved' ? 'primary' : dch === 'rejected' ? 'danger' : 'secondary',
      bd: dch === 'approved' ? 'var(--flow)' : dch === 'rejected' ? 'var(--danger)' : 'var(--line-strong)'
    };
    let done = { steps: [] };
    if (jd) {
      const a = s.approvals.find((x) => x.id === jd.id);
      const ok = jd.status === 'approved';
      const nextP = pending[0];
      done = {
        verb: (ok ? 'Aprovado' : 'Recusado') + ' · ' + a.id, title: a.title, time: jd.time,
        icon: ok ? IC.check : IC.x, bg: ok ? 'var(--action-bg)' : 'var(--danger-subtle)', fg: ok ? 'var(--action-fg)' : 'var(--danger)',
        steps: (ok ? a.yes : a.no).map((t, i) => ({ t: t, d: 250 + i * 280, when: i === 0 ? 'agora' : 'em seguida' })),
        hasNote: !!jd.note, note: jd.note,
        linkLabel: ok && a.link ? a.link[0] : 'Ver task ' + a.task,
        link: () => { if (ok && a.link) self.go(a.link[1], a.link[2] ? { jobId: a.link[2], jobFilter: 'all' } : {}); else self.go('tasks'); },
        nextLabel: nextP ? 'Próxima decisão · ' + pending.length + (pending.length > 1 ? ' restantes' : ' restante') : 'Voltar para a Sala',
        next: () => { if (nextP) self.setState({ approvalId: nextP.id, justDecided: null, decFilter: 'all', decChoice: null }); else self.go('room'); }
      };
    }
    const decMove = (dir) => { if (!dlist.length) return; const i = dcur ? dlist.indexOf(dcur) : -1; const n = dlist[Math.max(0, Math.min(dlist.length - 1, i + dir))]; pickDec(n.id); };

    // ---------- Chat ----------
    const conv = s.chats[s.chatId];
    const ch = {
      agent: conv.agent, ini: conv.ini, role: conv.role, model: conv.model, empty: conv.messages.length === 0,
      convs: Object.keys(s.chats).map((id) => { const c = s.chats[id]; const last = c.messages.length ? c.messages[c.messages.length - 1].text : 'Sem mensagens'; return { title: c.title, agent: c.agent, ini: c.ini, time: c.time, last: last, busy: c.busy ? 'busy' : '', on: id === s.chatId ? 'on' : '', pick: () => self.setState({ chatId: id, typing: false }) }; }),
      msgs: conv.messages.map((m) => ({ text: m.text, cls: m.role === 'user' ? 'me' : 'ag', who: m.role === 'user' ? 'Carlos' : conv.agent })),
      sugs: ['O que está travado?', 'Resumo do dia', 'Qual o próximo gate?'].map((t) => ({ t: t, pick: () => self.sendChat(t) }))
    };

    // ---------- Wizard ----------
    const MOTORS = [['Cursor', 'Padrão do chat · login feito', 'padrão', 'flow', false], ['Claude', 'Chave nesta máquina', 'conectado', '', false], ['Codex', 'Login feito', 'conectado', '', false], ['Antigravity', 'Instalação ausente', 'sem conexão', 'danger', true]];
    const MODELS = [['claude-sonnet-4', 'Equilíbrio entre custo e qualidade', '$$', 1], ['claude-opus-4', 'Raciocínio longo e planejamento', '$$$$', 3.2], ['gpt-4o', 'Leitura rápida e auditoria', '$$', 0.9]];
    const EFF = [['fast', 'Rápido', 'Menos passos, sem revisão interna', '×0,6', 0.6], ['balanced', 'Equilibrado', 'Plano, execução e uma verificação', '×1', 1], ['deep', 'Profundo', 'Plano detalhado e verificação dupla', '×1,8', 1.8]];
    const mm = MODELS.find((x) => x[0] === s.wzModel), ee = EFF.find((x) => x[0] === s.wzEffort);
    const est = 1.2 * mm[3] * ee[4];
    const ceil = parseFloat(String(s.jobCeiling).replace(',', '.'));
    const ceilBad = !(ceil > 0);
    const ceilLow = !ceilBad && ceil < est;
    const wz = {
      pos: (s.wz + 1) + ' de 4', s0: s.wz === 0, s1: s.wz === 1, s2: s.wz === 2, s3: s.wz === 3,
      lead: ['Qual motor executa este job.', 'Qual modelo o motor usa.', 'Quanto o job pensa antes de agir.', 'Título, teto de gasto e estimativa.'][s.wz],
      steps: [['Motor', s.wzMotor], ['Modelo', s.wzModel], ['Esforço', ee[1]], ['Teto', 'US$ ' + s.jobCeiling]].map((x, i) => ({ n: '0' + (i + 1), label: x[0], val: x[1], on: i === s.wz ? 'on' : '', color: i < s.wz ? 'var(--flow)' : 'var(--text-muted)', pick: () => self.setState({ wz: i }) })),
      motors: MOTORS.map((o) => ({ label: o[0], sub: o[1], meta: o[2], bcls: o[3], off: o[4], on: s.wzMotor === o[0] ? 'on' : '', pick: () => self.setState({ wzMotor: o[0] }) })),
      models: MODELS.map((o) => ({ label: o[0], sub: o[1], meta: o[2], on: s.wzModel === o[0] ? 'on' : '', pick: () => self.setState({ wzModel: o[0] }) })),
      efforts: EFF.map((o) => ({ label: o[1], sub: o[2], meta: o[3], on: s.wzEffort === o[0] ? 'on' : '', pick: () => self.setState({ wzEffort: o[0] }) })),
      est: money(est * 0.8) + '–' + money(est * 1.6), estPct: ceilBad ? 0 : Math.min(100, Math.round(est * 1.6 / ceil * 100)),
      ceilErr: s.wz === 3 && (ceilBad || ceilLow), ceilErrText: ceilBad ? 'Informe um teto maior que zero.' : 'O teto está abaixo da estimativa mínima. O job tende a parar no meio.',
      summary: s.wzMotor + ' · ' + s.wzModel + ' · ' + ee[1] + ' · teto US$ ' + s.jobCeiling,
      backLabel: s.wz === 0 ? 'Cancelar' : 'Voltar', nextLabel: s.wz === 3 ? 'Iniciar job' : 'Continuar'
    };

    // ---------- Form genérico ----------
    const isForm = !!(s.modal && this.spec(s.modal, s.mdata));
    let fm = { fields: [] };
    if (isForm) {
      const sp2 = this.spec(s.modal, s.mdata);
      fm = {
        title: sp2.title, lead: sp2.lead, eyebrow: sp2.eyebrow || '', hasEyebrow: !!sp2.eyebrow, size: sp2.size || '', primary: sp2.primary, primaryCls: sp2.primaryCls || 'primary',
        cancel: sp2.cancel || 'Cancelar', hasSecondary: !!sp2.secondary, secondary: sp2.secondary || '',
        fields: sp2.fields.map((f) => {
          const val = s.form[f.k] != null ? s.form[f.k] : (f.val != null ? f.val : (f.type === 'segs' ? f.opts[0] : f.type === 'choice' ? f.opts[0][0] : f.type === 'toggle' ? !!f.def : ''));
          const setv = (x) => self.setState((st) => ({ form: Object.assign({}, st.form, { [f.k]: x }), formErr: Object.assign({}, st.formErr, { [f.k]: false }) }));
          return {
            isText: f.type === 'text', isArea: f.type === 'area', isSegs: f.type === 'segs', isChoice: f.type === 'choice', isToggle: f.type === 'toggle', isNote: f.type === 'note', isCode: f.type === 'code',
            label: f.label || '', ph: f.ph || '', itype: f.itype || 'text', rows: f.rows || 3, val: typeof val === 'string' ? val : '', sub: f.sub || '', text: f.text || '',
            hasHelp: !!f.help, help: f.help || '', err: !!s.formErr[f.k], errText: f.req || '',
            color: f.tone === 'warn' ? 'var(--warning)' : 'var(--flow)', icon: f.tone === 'warn' ? IC.alert : IC.info,
            on: val === true ? 'on' : '', pressed: val === true ? 'true' : 'false', flip: () => setv(!val),
            onInput: (e) => setv(e.target.value),
            opts: f.type === 'segs' ? f.opts.map((o) => ({ label: o, on: val === o ? 'on' : '', pick: () => setv(o) })) : f.type === 'choice' ? f.opts.map((o) => ({ label: o[0], sub: o[1], meta: o[2] || '', hasMeta: !!o[2], on: val === o[0] ? 'on' : '', pick: () => setv(o[0]) })) : []
          };
        })
      };
    }

    // ---------- Paleta ----------
    const q = s.palQ.toLowerCase();
    const hits = [];
    hits.push({ k: 'Ação', t: 'Iniciar job', m: 'motor, modelo e teto', fn: () => self.open('job') });
    hits.push({ k: 'Ação', t: 'Nova task', m: 'entra em A planejar', fn: () => self.open('task') });
    hits.push({ k: 'Ação', t: 'Começar fluxo guiado', m: 'dois percursos explicados', fn: () => self.setState({ modal: null, tour: { k: null, i: null } }) });
    hits.push({ k: 'Ação', t: 'Alternar tema', m: s.theme === 'dark' ? 'para claro' : 'para escuro', fn: () => self.setState({ theme: s.theme === 'dark' ? 'light' : 'dark', modal: null }) });
    DOMAINS.forEach((d) => d.items.forEach((it) => hits.push({ k: 'Tela', t: it[1], m: d.label, fn: () => self.go(it[0]) })));
    s.tasks.forEach((t) => hits.push({ k: 'Task', t: '#' + t.seq + ' ' + t.title, m: t.who, fn: () => self.open('taskdetail', { id: t.id }) }));
    pending.forEach((a) => hits.push({ k: 'Decisão', t: a.title, m: a.who, fn: () => self.go('decisions', { approvalId: a.id, decTab: 'pending' }) }));
    ROSTER.forEach((a) => hits.push({ k: 'Agente', t: a[0], m: a[1], fn: () => self.open('soul', { name: a[0], role: a[1], sector: a[2], ini: a[3], busy: a[4], model: 'claude-sonnet-4' }) }));
    const shown = hits.filter((h) => !q || (h.t + ' ' + h.m + ' ' + h.k).toLowerCase().indexOf(q) >= 0).slice(0, 10);
    const pi = Math.min(s.palI, Math.max(0, shown.length - 1));
    const pal = { empty: shown.length === 0, hits: shown.map((h, i) => ({ k: h.k, t: h.t, m: h.m, bg: i === pi ? 'var(--flow-subtle)' : 'transparent', go: h.fn })) };

    // ---------- Agente (ofício) ----------
    const A = s.mdata || {};
    const ag = {
      name: A.name || 'Paula PM', role: A.role || 'Orquestradora & Planejamento', sector: A.sector || 'Operação', ini: A.ini || 'PP', model: A.model || 'claude-opus-4', busy: A.busy ? 'busy' : '', statusLabel: A.busy ? 'ocupado agora' : 'ocioso',
      t0: s.soulTab === 0, t1: s.soulTab === 1, t2: s.soulTab === 2,
      tabs: ['Ofício', 'Lições', 'Métricas'].map((l, i) => ({ label: l, on: s.soulTab === i ? 'on' : '', pick: () => self.setState({ soulTab: i }) })),
      lessons: [{ when: '27/10', src: 'job revisado', text: 'Confirmar o limite editorial antes de propor headline. Três revisões voltaram por tamanho.' }, { when: '21/10', src: 'gate recusado', text: 'Não assumir variável de ambiente pela conta anterior. Perguntar no plano.' }, { when: '14/10', src: 'chat', text: 'Carlos prefere o resumo em 3 linhas antes do detalhe.' }],
      jobs: A.busy ? '34' : '12', first: A.busy ? '82%' : '91%', avg: A.busy ? 'US$ 1,90' : 'US$ 0,70'
    };
    const pq = s.pickQ.toLowerCase();
    const pk = ROSTER.filter((a) => !pq || (a[0] + a[2]).toLowerCase().indexOf(pq) >= 0).map((a) => ({ name: a[0], role: a[1], sector: a[2], ini: a[3], busy: a[4] ? 'busy' : '', pick: () => {
      const id = 'cv-' + Date.now();
      const chats = Object.assign({}, s.chats);
      chats[id] = { agent: a[0], ini: a[3], role: a[1], model: 'claude-sonnet-4', title: 'Nova conversa', time: nowHM(), busy: a[4], messages: [] };
      self.setState({ chats: chats, chatId: id, modal: null, screen: 'chat' });
    } }));

    // ---------- Onboarding ----------
    const O = ONB[s.onb];
    const onb = {
      eyebrow: O.e, title: O.t, text: O.x, points: O.p.map((t) => ({ t: t })), pos: (s.onb + 1) + ' de ' + ONB.length,
      v0: s.onb === 0, v1: s.onb === 1, v2: s.onb === 2, v3: s.onb === 3, v4: s.onb === 4, notFirst: s.onb > 0,
      next: s.onb === ONB.length - 1 ? 'Ir para a Sala' : 'Continuar',
      dots: ONB.map((_, i) => ({ cls: '', bg: i < s.onb ? 'var(--flow)' : i === s.onb ? 'var(--text-primary)' : 'var(--line)' }))
    };

    // ---------- Tour ----------
    let tour = { on: false };
    if (s.tour) {
      if (s.tour.i == null) tour = { on: true, picking: true, running: false, left: full ? '24px' : '316px' };
      else {
        const T = TOURS[s.tour.k], n = T.steps.length, i = s.tour.i;
        tour = { on: true, picking: false, running: true, left: full ? '24px' : '316px', name: T.name, pos: (i + 1) + ' de ' + n, title: tourStep.title, body: tourStep.body, why: tourStep.why, where: tourStep.where, first: i === 0, nextLabel: i === n - 1 ? 'Concluir' : 'Próximo',
          dots: T.steps.map((_, j) => ({ cls: j < i ? 'on' : j === i ? 'cur' : '' })) };
      }
    }

    const notifs = [
      { t: 'Gate aberto: deploy da Meridian', m: 'Davi DevOps · há 2 h', color: 'var(--danger)', go: () => self.go('decisions', { approvalId: 'ap-02', decTab: 'pending' }) },
      { t: 'job-007 falhou antes de publicar', m: 'SUPABASE_URL ausente', color: 'var(--warning)', go: () => self.go('exec', { jobId: 'job-007', jobFilter: 'all' }) },
      { t: 'PRO-003 aberta 2 vezes', m: 'Northwind Digital · hoje 10:14', color: 'var(--flow)', go: () => self.go('propostas') }
    ];

    return {
      ic: ic, theme: s.theme, screen: s.screen, is: is, sp: sp, spotKey: spotKey, app: app,
      rail: rail, subItems: subItems, dom: meta.dom, crumb: meta.item[1],
      themeIcon: s.theme === 'dark' ? IC.sun : IC.moon, themeTip: s.theme === 'dark' ? 'Tema claro' : 'Tema escuro',
      toggleTheme: () => self.setState({ theme: s.theme === 'dark' ? 'light' : 'dark' }),
      notifOpen: s.notifOpen, notifs: notifs, toggleNotif: () => self.setState({ notifOpen: !s.notifOpen }),
      goRoom: () => self.go('room'), goExec: () => self.go('exec'), goDecisions: () => self.go('decisions'), goModhub: () => self.go('modhub'), goFinancas: () => self.go('financas'),
      goFluxo: () => self.go('fluxo'), goLogin: () => self.go('login'), goGate: () => self.go('decisions', { approvalId: 'ap-02', decTab: 'pending' }),
      openJob: () => self.open('job'), openProject: () => self.open('project'), openTask: () => self.open('task'), openPalette: () => self.open('palette'),
      openEvidence: () => self.open('evidence'), openPick: () => self.open('pick'), openChatSettings: () => self.open('chat-settings'), openDeleteChat: () => self.open('delete-chat'), openAttach: () => self.open('attach'),
      openPlan: () => self.open('plan', s.mdata), tdGoJob: () => self.go('exec', { jobId: tdT.job, jobFilter: 'all' }),
      closeModal: () => self.close(), closeBack: (e) => { if (e.target === e.currentTarget) self.close(); },
      onKey: (e) => {
        if (e.key === 'Escape' && s.modal) { self.close(); return; }
        if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') { e.preventDefault(); if (s.modal === 'palette') self.close(); else self.open('palette'); return; }
        const tag = String((e.target && e.target.tagName) || '').toLowerCase();
        if (s.screen === 'decisions' && !s.modal && tag !== 'input' && tag !== 'textarea' && !e.ctrlKey && !e.metaKey) {
          const key = String(e.key).toLowerCase();
          if (key === 'j') decMove(1);
          else if (key === 'k') decMove(-1);
          else if (dcur && dcur.status === 'pending' && !jd && (key === 'a' || key === 'r' || key === 'c')) self.setState({ decChoice: key === 'a' ? 'approved' : key === 'r' ? 'rejected' : 'more', decErr: false });
        }
      },
      // login & onboarding
      noSession: !s.session, session: s.session, secret: s.secret, loginErr: s.loginErr, pwType: s.showPw ? 'text' : 'password', pwLabel: s.showPw ? 'Ocultar' : 'Mostrar',
      onSecret: (e) => self.setState({ secret: e.target.value, loginErr: false }), togglePw: () => self.setState({ showPw: !s.showPw }),
      doLogin: (e) => { e.preventDefault(); if (!String(s.secret).trim() && !s.tour) { self.setState({ loginErr: true }); return; } self.setState({ session: true, secret: '', screen: 'onboarding', onb: 0 }); self.say('Sessão aberta', 'Operador autenticado nesta máquina.'); },
      logout: () => { self.setState({ session: false }); self.say('Sessão encerrada', 'A chave continua só nesta máquina.'); },
      onb: onb, onbNext: () => { if (s.onb < ONB.length - 1) self.setState({ onb: s.onb + 1 }); else self.go('room'); }, onbPrev: () => self.setState({ onb: Math.max(0, s.onb - 1) }),
      // screens
      room: room, exec: exec, job: job, tk: tk, td: td, dc: dc, cur: cur, ch: ch,
      jobPause: setJob('paused', 'Pausado pelo operador'), jobResume: setJob('running', 'Retomado pelo operador'), jobCancel: setJob('failed', 'Cancelado pelo operador · nada publicado'), jobRetry: setJob('running', 'Refeito a partir do último passo válido'),
      decNote: s.decNote, onDecNote: (e) => self.setState({ decNote: e.target.value, decErr: false }), decErr: s.decErr,
      ev: ev, chs: chs, dcConfirm: dcConfirm, done: done,
      secretVal: s.secretVal, onSecretVal: (e) => self.setState({ secretVal: e.target.value }),
      decCancel: () => self.setState({ decChoice: null, decErr: false }),
      dcSeeDone: () => self.setState({ decFilter: 'done', justDecided: null }),
      chatWithReq: () => {
        if (!dcur) return;
        const ex = Object.keys(s.chats).find((k2) => s.chats[k2].agent === dcur.who);
        if (ex) { self.go('chat', { chatId: ex }); return; }
        const id = 'cv-' + Date.now(); const chats = Object.assign({}, s.chats);
        chats[id] = { agent: dcur.who, ini: dcur.ini, role: dcur.type + ' · ' + dcur.id, model: 'claude-sonnet-4', title: dcur.id + ' · ' + dcur.title.split(' — ')[0], time: nowHM(), busy: false, messages: [{ role: 'agent', text: 'Sobre o ' + dcur.id + ': ' + dcur.reason + ' Posso detalhar o que você precisar antes de decidir.' }] };
        self.setState({ chats: chats }); self.go('chat', { chatId: id });
      },
      decConfirm: () => {
        if (!dcur || !s.decChoice) return;
        if (s.decChoice === 'rejected' && !s.decNote.trim()) { self.setState({ decErr: true }); return; }
        if (s.decChoice === 'more') { self.say('Pergunta enviada', dcur.who + ' responde no chat do card. A decisão continua na caixa.'); self.log('Carlos', 'pediu mais contexto em ' + dcur.id, '#aeb7c4'); self.setState({ decChoice: null, decNote: '' }); return; }
        self.decide(s.decChoice);
      },
      typing: s.typing, chatDraft: s.chatDraft, onDraft: (e) => self.setState({ chatDraft: e.target.value }), sendChat: (e) => { e.preventDefault(); self.sendChat(s.chatDraft); },
      // modals
      m: { job: s.modal === 'job', form: isForm, palette: s.modal === 'palette', taskdetail: s.modal === 'taskdetail', soul: s.modal === 'soul', pick: s.modal === 'pick' },
      wz: wz, jobTitle: s.jobTitle, jobCeiling: s.jobCeiling,
      onJobTitle: (e) => self.setState({ jobTitle: e.target.value }), onJobCeiling: (e) => self.setState({ jobCeiling: e.target.value }),
      wzBack: () => { if (s.wz === 0) self.close(); else self.setState({ wz: s.wz - 1 }); },
      wzNext: () => {
        if (s.wz < 3) { self.setState({ wz: s.wz + 1 }); return; }
        if (ceilBad || ceilLow) return;
        const id = 'job-0' + (15 + s.jobs.length);
        const nj = { id: id, title: s.jobTitle || 'Novo job da Sala', who: 'Paula PM', ini: 'PP', status: 'running', progress: 4, model: s.wzModel, motor: s.wzMotor, effort: ee[1].toLowerCase(), task: '—', cost: 0.08, ceiling: ceil, started: nowHM(), tokens: '12k' };
        const logs = Object.assign({}, s.logs, { [id]: [{ ts: nowHM(), lvl: 'info', cls: 'info', text: 'Job aceito no motor ' + s.wzMotor + ' · ' + s.wzModel }, { ts: nowHM(), lvl: 'teto', cls: 'ac', text: 'Teto de US$ ' + money(ceil) + ' registrado' }] });
        const patch = { jobs: [nj].concat(s.jobs), logs: logs, jobId: id, jobFilter: 'all', modal: null, jobTitle: '' };
        if (!s.tour) patch.screen = 'exec';
        self.setState(patch);
        self.log('Carlos', 'iniciou ' + id + ' · ' + nj.title);
        self.say('Job em execução', id + ' iniciado com teto de US$ ' + money(ceil) + '.');
      },
      fm: fm, fmSubmit: (e) => { e.preventDefault(); self.submitForm(); }, fmSecondary: () => { self.say('Login do motor', 'O fluxo do motor abriria no navegador.'); self.close(); },
      palQ: s.palQ, pal: pal, onPalQ: (e) => self.setState({ palQ: e.target.value, palI: 0 }),
      onPalKey: (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); self.setState({ palI: Math.min(shown.length - 1, pi + 1) }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); self.setState({ palI: Math.max(0, pi - 1) }); }
        else if (e.key === 'Enter' && shown[pi]) { e.preventDefault(); shown[pi].fn(); }
      },
      ag: ag, soulText: s.soulText, onSoul: (e) => self.setState({ soulText: e.target.value }),
      soulSave: () => { self.say('Ofício salvo', ag.name + ' usa a nova versão no próximo job.'); self.close(); },
      soulChat: () => { const ex = Object.keys(s.chats).find((k) => s.chats[k].agent === ag.name); if (ex) self.go('chat', { chatId: ex }); else { const id = 'cv-' + Date.now(); const chats = Object.assign({}, s.chats); chats[id] = { agent: ag.name, ini: ag.ini, role: ag.role, model: ag.model, title: 'Nova conversa', time: nowHM(), busy: !!A.busy, messages: [] }; self.setState({ chats: chats }); self.go('chat', { chatId: id }); } },
      pk: pk, pickQ: s.pickQ, onPickQ: (e) => self.setState({ pickQ: e.target.value }),
      hasToast: !!s.toast, toast: s.toast || { t: '', m: '' },
      tour: tour,
      startTour: () => self.setState({ tour: { k: null, i: null }, notifOpen: false }),
      tourExec: () => self.applyStep('exec', 0), tourClient: () => self.applyStep('client', 0),
      endTour: () => self.setState({ tour: null, modal: null }),
      tourPrev: () => { if (s.tour && s.tour.i > 0) self.applyStep(s.tour.k, s.tour.i - 1); },
      tourNext: () => {
        if (!s.tour) return;
        const n = TOURS[s.tour.k].steps.length;
        if (s.tour.i < n - 1) self.applyStep(s.tour.k, s.tour.i + 1);
        else { self.setState({ tour: null, modal: null, screen: 'room', session: true }); self.say('Percurso concluído', 'Tudo que você viu é clicável. Explore à vontade.'); }
      }
    };
  }
}
