/**
 * Equipe da agência (os 58 agentes reais de backend/tavir.db, tabela agents, vindos de AgenciaIA/escritorio/equipe).
 * Aqui fica só o que a lista do app mostra: nome, papel em uma linha, setor e as opções prontas.
 * A ficha de cada agente (como trabalha) é lida do banco na hora do pedido (src/main/officeSoul.ts), fora do git.
 * `id` é o slug do banco e não muda; `name` é o que o app mostra e manda de volta no pedido.
 */
import type { OfficeAgentAction } from './officeAgents';

export interface RosterAgent {
  id: string;
  name: string;
  role: string;
  sector: string;
  actions: OfficeAgentAction[];
}

/** Ordem dos grupos na tela do app. */
export const SECTOR_ORDER = [
  'Análise e conhecimento',
  'Engenharia',
  'Qualidade e segurança',
  'Design',
  'Marketing e redes',
  'Conteúdo e vídeo',
  'Livros',
  'Comercial',
  'Finanças e jurídico',
  'Operação',
  'Escritório',
];

const a = (id: string, label: string, hint: string): OfficeAgentAction => ({ id, label, hint });

export const ROSTER: RosterAgent[] = [
  // Análise e conhecimento
  { id: 'analista-instagram', name: 'Íris Instagram', role: 'Analista de Instagram: perfis, conteúdo e vídeos', sector: 'Análise e conhecimento', actions: [] },
  { id: 'analista-youtube', name: 'Yuri YouTube', role: 'Inteligência de negócios em vídeos, aulas e podcasts', sector: 'Análise e conhecimento', actions: [] },
  { id: 'maicon', name: 'Maicon', role: 'Arquiteto de integrações: estuda vídeos e ferramentas para o Escritório', sector: 'Análise e conhecimento', actions: [] },
  { id: 'victor-videolens', name: 'Victor VideoLens', role: 'Analisa canais e vídeos de referência: transcrição e padrões', sector: 'Análise e conhecimento', actions: [a('canal', 'Analisar canal ou vídeo de referência', 'Cole o link do canal ou do vídeo')] },
  { id: 'jano-nexlev', name: 'Jano NexLev', role: 'Inteligência de mercado de canais: nichos e canais em alta', sector: 'Análise e conhecimento', actions: [a('nicho', 'Descobrir nichos em crescimento', 'Diga o tema ou o público'), a('canal', 'Raio-X de um canal', 'Cole o link do canal')] },
  { id: 'analista-web', name: 'Atlas Web', role: 'Analista de sites, portais e plataformas', sector: 'Análise e conhecimento', actions: [] },
  { id: 'curador', name: 'Cléo Curadora', role: 'Curadoria: guia de estilo e sinopse a partir de um rascunho', sector: 'Análise e conhecimento', actions: [a('guia', 'Montar guia de estilo do autor', 'Diga onde está o rascunho')] },
  { id: 'descoberta', name: 'Dora Descoberta', role: 'Levantamento de requisitos de um projeto novo', sector: 'Análise e conhecimento', actions: [] },

  // Engenharia
  { id: 'cto', name: 'CTO', role: 'Stack, infraestrutura e viabilidade técnica', sector: 'Engenharia', actions: [] },
  { id: 'tech-lead', name: 'Théo Tech Lead', role: 'Revisa a abordagem antes de construir: padrões, reuso e riscos', sector: 'Engenharia', actions: [a('revisar', 'Revisar abordagem técnica', 'Descreva o que se pretende construir')] },
  { id: 'arquiteto', name: 'Arquiteto de Nicho', role: 'Arquitetura de soluções: do dossiê do nicho ao blueprint', sector: 'Engenharia', actions: [a('blueprint', 'Montar blueprint da solução', 'Descreva o nicho e o objetivo')] },
  { id: 'construtor-react', name: 'Rafa Construtor', role: 'Desenvolvedor Next.js e React', sector: 'Engenharia', actions: [] },
  { id: 'construtor', name: 'Vitor Construtor', role: 'Desenvolvedor front-end Nuxt e Vue', sector: 'Engenharia', actions: [a('implementar', 'Implementar tela ou ajuste', 'Descreva o que construir e onde')] },
  { id: 'construtor-dotnet', name: 'Nando Construtor', role: 'Engenharia enterprise .NET e Angular', sector: 'Engenharia', actions: [a('implementar', 'Implementar funcionalidade', 'Descreva o que construir e onde')] },
  { id: 'construtor-flutter', name: 'Ícaro Construtor', role: 'Engenharia mobile Flutter e Dart', sector: 'Engenharia', actions: [a('implementar', 'Implementar tela ou ajuste no app', 'Descreva o que construir e onde')] },
  { id: 'dba-dados', name: 'Dora Dados', role: 'Modelagem de dados, consultas lentas e migrações', sector: 'Engenharia', actions: [a('modelagem', 'Revisar modelagem ou migração', 'Diga a tabela, o schema ou a consulta')] },
  { id: 'devops', name: 'Davi DevOps', role: 'Deploy, ambientes, domínios, backup e rollback', sector: 'Engenharia', actions: [a('infra', 'Planejar mudança de infraestrutura', 'Descreva o projeto e o que mudar')] },
  { id: 'ecommerce', name: 'Lia Loja', role: 'Especialista em e-commerce', sector: 'Engenharia', actions: [] },

  // Qualidade e segurança
  { id: 'auditor', name: 'Auditor Seg/LGPD', role: 'Auditoria de segurança e LGPD de aplicações web', sector: 'Qualidade e segurança', actions: [a('auditar', 'Auditar segurança e LGPD', 'Diga o projeto ou a URL')] },
  { id: 'qa-e2e', name: 'Edna E2E', role: 'Testes ponta a ponta dos fluxos críticos', sector: 'Qualidade e segurança', actions: [a('roteiro', 'Montar roteiro de testes E2E', 'Diga o app e os fluxos')] },

  // Design
  { id: 'marca', name: 'Marina Marca', role: 'Identidade visual, tom e design system', sector: 'Design', actions: [a('marca', 'Definir ou revisar a marca', 'Diga o projeto e o público')] },
  { id: 'ux-ui', name: 'Yuri UX', role: 'UX e prova visual', sector: 'Design', actions: [] },

  // Marketing e redes
  { id: 'social-media', name: 'Sami Social', role: 'Direção editorial multicanal: tese, pautas e calendário', sector: 'Marketing e redes', actions: [a('pauta', 'Planejar pauta editorial', 'Diga a marca, o período e o objetivo')] },
  { id: 'conteudo-instagram', name: 'Iara Instagram', role: 'Cria conteúdo nativo para Instagram', sector: 'Marketing e redes', actions: [a('post', 'Criar post ou carrossel', 'Diga o tema, o público e o objetivo')] },
  { id: 'conteudo-linkedin', name: 'Ciro LinkedIn', role: 'Cria conteúdo nativo para LinkedIn', sector: 'Marketing e redes', actions: [a('post', 'Escrever post para LinkedIn', 'Diga o tema e a tese')] },
  { id: 'conteudo-youtube', name: 'Bento YouTube', role: 'Vídeos e Shorts para YouTube: título, roteiro e SEO', sector: 'Marketing e redes', actions: [a('video', 'Planejar vídeo ou Short', 'Diga o tema e o público')] },
  { id: 'seo', name: 'Nina SEO', role: 'SEO técnico e editorial, presença no Google', sector: 'Marketing e redes', actions: [a('seo', 'Diagnóstico de SEO', 'Cole a URL')] },
  { id: 'gestor-trafego', name: 'Tainá Tráfego', role: 'Tráfego pago: Meta e Google Ads, verba e ROAS', sector: 'Marketing e redes', actions: [a('campanha', 'Planejar campanha paga', 'Diga o produto, a verba e o objetivo')] },
  { id: 'growth', name: 'Gael Growth', role: 'Funil, experimentos e conversão', sector: 'Marketing e redes', actions: [a('experimento', 'Propor experimentos de funil', 'Descreva o funil e o número que quer mexer')] },
  { id: 'email-marketing', name: 'Ema E-mail', role: 'Sequências de e-mail e newsletters', sector: 'Marketing e redes', actions: [a('sequencia', 'Escrever sequência de e-mails', 'Diga o objetivo e o público')] },

  // Conteúdo e vídeo
  { id: 'oraculo', name: 'Oráculo Diretor', role: 'Direção editorial da Fábrica de Canais: do pedido ao briefing', sector: 'Conteúdo e vídeo', actions: [a('episodio', 'Briefing de novo episódio', 'Diga o tema ou peça sugestões')] },
  { id: 'rafael-roteiro', name: 'Rafael Roteiro', role: 'Roteiro completo de episódio, com pesquisa e títulos', sector: 'Conteúdo e vídeo', actions: [a('roteiro', 'Escrever roteiro de episódio', 'Diga o tema travado e o canal')] },
  { id: 'roteirista-yt', name: 'Renato Roteirista', role: 'Roteiros e pautas de vídeo com base no conhecimento guardado', sector: 'Conteúdo e vídeo', actions: [a('roteiro', 'Escrever roteiro de vídeo', 'Diga o tema e o formato')] },
  { id: 'nara-narracao', name: 'Nara Narração', role: 'Texto de narração pronto para voz sintética', sector: 'Conteúdo e vídeo', actions: [a('narracao', 'Preparar narração do roteiro', 'Diga onde está o roteiro')] },
  { id: 'sofia-storyboard', name: 'Sofia Storyboard', role: 'Storyboard cena a cena: narração e direção de arte', sector: 'Conteúdo e vídeo', actions: [a('storyboard', 'Montar storyboard', 'Diga onde estão o roteiro e a narração')] },
  { id: 'adriano-arte', name: 'Adriano Arte', role: 'Direção de arte: prompts de imagem e vídeo por cena', sector: 'Conteúdo e vídeo', actions: [a('arte', 'Prompts de arte por cena', 'Diga onde está o storyboard')] },
  { id: 'diego-flow', name: 'Diego Flow', role: 'Direção de arte pelo Google Flow e ComfyUI', sector: 'Conteúdo e vídeo', actions: [a('arte', 'Plano de arte no Flow', 'Diga onde está o storyboard')] },
  { id: 'editor-video', name: 'Vini Vídeo', role: 'Cortes, descrições e thumbnails', sector: 'Conteúdo e vídeo', actions: [a('cortes', 'Propor cortes e thumbnail', 'Cole o link ou diga o vídeo')] },
  { id: 'marcos-marketing', name: 'Marcos Marketing', role: 'Título, thumbnail, SEO e Short derivado de cada episódio', sector: 'Conteúdo e vídeo', actions: [a('lancamento', 'Pacote de lançamento do episódio', 'Diga o episódio')] },
  { id: 'atena-compliance', name: 'Atena Compliance', role: 'Política do YouTube: monetização e conteúdo sintético', sector: 'Conteúdo e vídeo', actions: [a('politica', 'Checar episódio contra a política', 'Diga o episódio ou cole o roteiro')] },

  // Livros
  { id: 'estruturador', name: 'Otto Estruturador', role: 'Estrutura de livro: títulos, eventos e capítulos', sector: 'Livros', actions: [a('estrutura', 'Estruturar capítulos', 'Diga onde está o rascunho')] },
  { id: 'escritor', name: 'Elisa Escritora', role: 'Ghostwriter: prefácio, introdução, conclusão e descrição', sector: 'Livros', actions: [a('texto', 'Escrever texto do livro', 'Diga a parte e onde está o rascunho')] },
  { id: 'estilista', name: 'Sofia Estilo', role: 'Métricas de estilo e tom de voz de referência', sector: 'Livros', actions: [a('estilo', 'Medir estilo de referência', 'Diga o livro ou autor de referência')] },
  { id: 'lapidador', name: 'Lucas Lapidador', role: 'Reescrita fina dos capítulos na voz do autor', sector: 'Livros', actions: [a('lapidar', 'Lapidar capítulo', 'Diga o capítulo')] },
  { id: 'revisor', name: 'Rita Revisora', role: 'Revisão final: consistência, formatação e anti-plágio', sector: 'Livros', actions: [a('revisar', 'Revisar texto final', 'Diga o arquivo ou cole o texto')] },

  // Comercial
  { id: 'diretor-comercial', name: 'Dario Diretor Comercial', role: 'Meta comercial, funil e distribuição do time', sector: 'Comercial', actions: [a('plano', 'Plano comercial do ciclo', 'Diga a meta e o período')] },
  { id: 'closer', name: 'Cléber Closer', role: 'Fechamento: proposta, objeções e follow-up', sector: 'Comercial', actions: [a('proposta', 'Montar proposta', 'Diga o cliente, o escopo e o prazo')] },
  { id: 'cs-onboarding', name: 'Cissa CS', role: 'Onboarding de cliente e risco de churn', sector: 'Comercial', actions: [a('onboarding', 'Plano de onboarding', 'Diga o cliente e o produto')] },
  { id: 'bruno-socio', name: 'Bruno Sócio', role: 'Co-decisor comercial: propostas grandes e relacionamento', sector: 'Comercial', actions: [a('parecer', 'Parecer sobre proposta', 'Diga a proposta e o valor')] },

  // Finanças e jurídico
  { id: 'precificacao', name: 'Priscila Preços', role: 'Orçamento, preço e margem', sector: 'Finanças e jurídico', actions: [a('orcamento', 'Montar orçamento', 'Descreva o escopo do trabalho')] },
  { id: 'financeiro-cobranca', name: 'Fábio Finanças', role: 'Faturamento, cobrança e fluxo de caixa', sector: 'Finanças e jurídico', actions: [a('caixa', 'Projeção de caixa ou cobrança', 'Diga o período ou o cliente')] },
  { id: 'consultor-juridico', name: 'Jussara Jurídico', role: 'Contratos, LGPD e pareceres', sector: 'Finanças e jurídico', actions: [a('contrato', 'Revisar ou redigir contrato', 'Diga o tipo de contrato e as partes')] },

  // Operação
  { id: 'pm-projetos', name: 'Paula PM', role: 'Gerente de produto: transforma pedido em trabalho priorizado', sector: 'Operação', actions: [] },
  { id: 'recepcionista', name: 'Rebeca Recepção', role: 'Recebe pedido genérico e encaminha para o braço certo', sector: 'Operação', actions: [a('encaminhar', 'Encaminhar pedido', 'Descreva o que precisa')] },
  { id: 'suporte', name: 'Sônia Suporte', role: 'Suporte: reproduz problema, classifica e abre card', sector: 'Operação', actions: [a('chamado', 'Triar problema de cliente', 'Descreva o problema relatado')] },
  { id: 'documentacao', name: 'Dante Documentação', role: 'Documentação de sistemas: uso, suporte e técnica', sector: 'Operação', actions: [a('documentar', 'Documentar sistema', 'Diga o sistema e o público')] },
  { id: 'publicador', name: 'Paulo Publicador', role: 'Publica documento aprovado em HTML e PDF', sector: 'Operação', actions: [a('publicar', 'Gerar HTML e PDF de documento', 'Diga o arquivo .md')] },
  { id: 'jane', name: 'Jane', role: 'Analista comportamental do Carlos: confronta procrastinação e fuga', sector: 'Operação', actions: [a('conversa', 'Conversar sobre o que está travando', 'Conte o que está acontecendo')] },
];
