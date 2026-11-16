/**
 * Chamados da Fábrica (Parte B do PLANO_CHAMADOS): tipos, rótulos e a tabela de transições.
 *
 * Regra que não muda: resposta de motor nunca move chamado. Agente só cria;
 * `aguardando_validacao` só o Escritório põe, depois dos portões; fechar é gate do Carlos.
 */

export type TipoChamado = 'bug' | 'melhoria' | 'duvida';
export type Prioridade = 'urgente' | 'alta' | 'media' | 'baixa';
export type Situacao = 'aberto' | 'em_refinamento' | 'pronto' | 'em_execucao' | 'aguardando_validacao' | 'concluido' | 'recusado';
export type Quem = 'ceo' | 'escritorio' | 'agente';
export type OrigemChamado = 'formulario' | 'conversa' | 'varredura' | 'absorcao' | 'trilho';

export interface AnexoChamado { name: string; rel: string; kind: string; size: number }

export interface Chamado {
  id: string;
  tipo: TipoChamado;
  titulo: string;
  descricao: { a: string; b: string; c: string };
  prioridade: Prioridade;
  situacao: Situacao;
  autor: { tipo: 'ceo' | 'agente'; nome: string; motor?: string; runId?: string; origem?: OrigemChamado };
  anexos: AnexoChamado[];
  refinamento: { criterios: string[]; notas: string; perguntas: string[] };
  ciclo?: { n: number; branch?: string; pr?: string };
  resposta?: string;
  /** Evidência citada pelo agente que não existe no projeto. */
  evidenciaNaoConferida?: string;
  historico: Array<{ at: string; quem: string; acao: string; de?: Situacao; para?: Situacao; nota?: string }>;
  criado_em: string;
  atualizado_em: string;
}

export const TIPOS: TipoChamado[] = ['bug', 'melhoria', 'duvida'];
export const PRIORIDADES: Prioridade[] = ['urgente', 'alta', 'media', 'baixa'];
export const SITUACOES: Situacao[] = ['aberto', 'em_refinamento', 'pronto', 'em_execucao', 'aguardando_validacao', 'concluido', 'recusado'];

export const TIPO_ROTULO: Record<TipoChamado, string> = { bug: 'Bug', melhoria: 'Melhoria', duvida: 'Dúvida' };
export const PRIORIDADE_ROTULO: Record<Prioridade, string> = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
export const SITUACAO_ROTULO: Record<Situacao, string> = {
  aberto: 'Aberto',
  em_refinamento: 'Em refinamento',
  pronto: 'Pronto',
  em_execucao: 'Em execução',
  aguardando_validacao: 'Aguardando validação',
  concluido: 'Concluído',
  recusado: 'Recusado',
};

/** Rótulos dos três campos da descrição por tipo. Em dúvida o terceiro fica oculto (vazio). */
export const ROTULOS_DESCRICAO: Record<TipoChamado, [string, string, string]> = {
  bug: ['O que acontece', 'O que era esperado', 'Como reproduzir'],
  melhoria: ['O que mudar', 'Por quê', 'Como saber que ficou pronto'],
  duvida: ['Pergunta', 'Contexto', ''],
};

export const FECHADAS: Situacao[] = ['concluido', 'recusado'];

/** Dados que a transição olha (estado do chamado depois da edição e o que veio no pedido). */
export interface ContextoMover {
  titulo: string;
  descricao: { a: string; b: string; c: string };
  criterios: string[];
  tipo: TipoChamado;
  resposta?: string;
  nota?: string;
}

/**
 * Tabela de transições. Devolve `true` ou o motivo da recusa.
 * Criação (`aberto`) não passa por aqui: é `criarChamado`.
 */
export function podeMover(de: Situacao, para: Situacao, quem: Quem, ctx: ContextoMover): true | string {
  if (quem === 'agente') return 'Agente só abre chamado; não move.';
  if (de === para) return 'O chamado já está nessa situação.';
  const nota = String(ctx.nota || '').trim();
  const temDescricao = !!(String(ctx.descricao?.a || '').trim());
  switch (para) {
    case 'em_refinamento':
      if (quem !== 'ceo') return 'Só o Carlos põe em refinamento.';
      return de === 'aberto' ? true : 'Só um chamado aberto vai para refinamento.';
    case 'pronto':
      if (quem !== 'ceo') return 'Só o Carlos marca como pronto.';
      if (!['aberto', 'em_refinamento', 'aguardando_validacao'].includes(de)) return 'Só aberto, em refinamento ou aguardando validação vira pronto.';
      if (!String(ctx.titulo || '').trim()) return 'Falta o título.';
      if (!temDescricao) return 'Falta a descrição.';
      if (!(ctx.criterios || []).some((c) => String(c).trim())) return 'Falta ao menos um critério de aceite.';
      if (de === 'aguardando_validacao' && !nota) return 'Reprovar exige uma nota dizendo o que falta.';
      return true;
    case 'em_execucao':
      if (quem !== 'ceo') return 'Só o Carlos manda executar.';
      return de === 'pronto' ? true : 'Só um chamado pronto vai para execução.';
    case 'aguardando_validacao':
      if (quem !== 'escritorio') return 'Aguardando validação só pelo Escritório, depois dos portões.';
      return de === 'em_execucao' ? true : 'Só um chamado em execução vai para validação.';
    case 'concluido':
      if (quem !== 'ceo') return 'Só o Carlos conclui (gate).';
      if (de === 'aguardando_validacao') return true;
      if (ctx.tipo === 'duvida' && (de === 'aberto' || de === 'em_refinamento')) return String(ctx.resposta || '').trim() ? true : 'Dúvida só conclui com a resposta preenchida.';
      return 'Só um chamado aguardando validação é concluído.';
    case 'recusado':
      if (quem !== 'ceo') return 'Só o Carlos recusa.';
      if (!['aberto', 'em_refinamento', 'pronto'].includes(de)) return 'Só dá para recusar antes de executar.';
      return nota ? true : 'Recusar exige o motivo.';
    case 'aberto':
      return 'Um chamado não volta para aberto.';
    default:
      return 'Situação desconhecida.';
  }
}

/** Igual ignorando caixa, acento e espaços repetidos. */
export function normTitulo(t: string): string {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
